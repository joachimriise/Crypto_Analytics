import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const liveCoinWatchApiKey = Deno.env.get('LIVECOINWATCH_API_KEY')
    if (!liveCoinWatchApiKey) {
      throw new Error('LIVECOINWATCH_API_KEY not configured')
    }

    // Get all active cryptocurrencies
    const { data: cryptos, error: cryptoError } = await supabaseClient
      .from('crypto_metadata')
      .select('*')
      .eq('is_active', true)
      .order('rank')

    if (cryptoError) throw cryptoError

    // Clean up old 5-minute data (older than 24 hours)
    await supabaseClient.rpc('cleanup_old_5min_prices')

    const results = []
    const codes = cryptos.map(c => c.coin_id)

    // Fetch current prices for all coins in one request
    console.log('Fetching current prices for all cryptocurrencies...')

    const response = await fetch('https://api.livecoinwatch.com/coins/map', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': liveCoinWatchApiKey,
      },
      body: JSON.stringify({
        codes: codes,
        currency: 'USD',
        sort: 'rank',
        order: 'ascending',
        offset: 0,
        limit: 10,
        meta: true,
      }),
    })

    if (!response.ok) {
      throw new Error(`LiveCoinWatch API error: ${response.status}`)
    }

    const data = await response.json()
    const timestamp = new Date().toISOString()

    // Process and insert prices
    const priceRecords = []
    
    for (const coin of data) {
      const crypto = cryptos.find(c => c.coin_id === coin.code)
      if (!crypto) continue

      priceRecords.push({
        symbol: crypto.symbol,
        coin_id: crypto.coin_id,
        timestamp: timestamp,
        price: coin.rate || 0,
        volume: coin.volume || 0,
        market_cap: coin.cap || 0,
      })
    }

    // Insert all price records
    const { error: insertError } = await supabaseClient
      .from('crypto_5min_prices')
      .upsert(priceRecords, {
        onConflict: 'symbol,timestamp',
        ignoreDuplicates: false,
      })

    if (insertError) {
      throw insertError
    }

    // Also update crypto_prices table for real-time display
    for (const record of priceRecords) {
      await supabaseClient.from('crypto_prices').insert({
        symbol: record.symbol,
        name: cryptos.find(c => c.symbol === record.symbol)?.name || '',
        price_usd: record.price,
        open: record.price,
        high: record.price,
        low: record.price,
        volume: record.volume,
        market_cap: record.market_cap,
        timestamp: timestamp,
      })
    }

    results.push({
      recordsInserted: priceRecords.length,
      timestamp,
      status: 'success',
    })

    // Log API usage
    await supabaseClient.from('api_usage_logs').insert({
      api_name: 'LiveCoinWatch',
      endpoint: '/coins/map',
      success: true,
    })

    return new Response(
      JSON.stringify({
        success: true,
        message: '5-minute prices fetched successfully',
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error:', error)
    
    // Log API usage error
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    await supabaseClient.from('api_usage_logs').insert({
      api_name: 'LiveCoinWatch',
      endpoint: '/coins/map',
      success: false,
      error_message: error.message,
    })

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
