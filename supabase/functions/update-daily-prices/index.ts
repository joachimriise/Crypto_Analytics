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

    const results = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = today.toISOString().split('T')[0]

    // Check which coins need updating
    for (const crypto of cryptos) {
      // Check if today's data already exists
      const { data: existing } = await supabaseClient
        .from('crypto_daily_prices')
        .select('date')
        .eq('symbol', crypto.symbol)
        .eq('date', todayStr)
        .single()

      if (existing) {
        console.log(`Today's data for ${crypto.symbol} already exists, skipping...`)
        continue
      }

      console.log(`Updating daily price for ${crypto.symbol}...`)

      try {
        // Fetch last 24 hours of data to calculate OHLC
        const startDate = today.getTime() - (24 * 60 * 60 * 1000)
        const endDate = Date.now()

        const response = await fetch('https://api.livecoinwatch.com/coins/single/history', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-api-key': liveCoinWatchApiKey,
          },
          body: JSON.stringify({
            currency: 'USD',
            code: crypto.coin_id,
            start: startDate,
            end: endDate,
            meta: true,
          }),
        })

        if (!response.ok) {
          console.error(`Failed to fetch ${crypto.symbol}: ${response.status}`)
          continue
        }

        const data = await response.json()
        const history = data.history || []

        if (history.length === 0) {
          console.log(`No data available for ${crypto.symbol}`)
          continue
        }

        // Calculate OHLC from history
        const rates = history.map(h => h.rate)
        const volumes = history.map(h => h.volume || 0)
        const caps = history.map(h => h.cap || 0)

        const dailyData = {
          symbol: crypto.symbol,
          coin_id: crypto.coin_id,
          date: todayStr,
          open: rates[0],
          high: Math.max(...rates),
          low: Math.min(...rates),
          close: rates[rates.length - 1],
          volume: volumes.reduce((a, b) => a + b, 0) / volumes.length,
          market_cap: caps[caps.length - 1],
        }

        // Insert the daily data
        const { error: insertError } = await supabaseClient
          .from('crypto_daily_prices')
          .upsert([dailyData], {
            onConflict: 'symbol,date',
            ignoreDuplicates: false,
          })

        if (insertError) {
          console.error(`Error inserting ${crypto.symbol}:`, insertError)
          results.push({
            symbol: crypto.symbol,
            status: 'error',
            error: insertError.message,
          })
        } else {
          results.push({
            symbol: crypto.symbol,
            date: todayStr,
            status: 'success',
          })
        }

        // Log API usage
        await supabaseClient.from('api_usage_logs').insert({
          api_name: 'LiveCoinWatch',
          endpoint: '/coins/single/history',
          success: true,
        })

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000))

      } catch (error) {
        console.error(`Error processing ${crypto.symbol}:`, error)
        results.push({
          symbol: crypto.symbol,
          status: 'error',
          error: error.message,
        })

        // Log API usage error
        await supabaseClient.from('api_usage_logs').insert({
          api_name: 'LiveCoinWatch',
          endpoint: '/coins/single/history',
          success: false,
          error_message: error.message,
        })
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Daily prices updated successfully',
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error:', error)
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
