import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface HistoricalDataPoint {
  date: number;
  rate: number;
  volume: number;
  cap: number;
}

interface DailyOHLC {
  [date: string]: {
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    market_cap: number;
  };
}

/**
 * Smart Historical Data Fetcher
 * 
 * This function adapts to whatever granularity LiveCoinWatch API returns:
 * - Detects interval (5-min, hourly, or daily)
 * - Populates crypto_daily_prices with daily OHLC candles
 * - Populates crypto_5min_prices with:
 *   * Hourly data for historical period (2020 to ~30 days ago)
 *   * 5-minute data for recent period (last 30 days)
 * 
 * API Usage: 1 call per cryptocurrency (very efficient!)
 */

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const liveCoinWatchApiKey = Deno.env.get("LIVECOINWATCH_API_KEY");
    if (!liveCoinWatchApiKey) {
      throw new Error("LIVECOINWATCH_API_KEY not configured");
    }

    const { data: cryptos, error: cryptoError } = await supabaseClient
      .from("crypto_metadata")
      .select("*")
      .eq("is_active", true)
      .order("rank");

    if (cryptoError) throw cryptoError;

    const results = [];
    const startDate = new Date("2020-01-01").getTime();
    const endDate = Date.now();
    const recentThreshold = Date.now() - (30 * 24 * 60 * 60 * 1000); // 30 days ago

    console.log(`Starting historical data fetch for ${cryptos.length} cryptocurrencies...`);
    console.log(`Date range: 2020-01-01 to ${new Date().toISOString().split('T')[0]}`);

    for (const crypto of cryptos) {
      console.log(`\n📊 Fetching historical data for ${crypto.symbol}...`);

      try {
        // ONE API CALL gets ALL history for this crypto
        const response = await fetch("https://api.livecoinwatch.com/coins/single/history", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-api-key": liveCoinWatchApiKey,
          },
          body: JSON.stringify({
            currency: "USD",
            code: crypto.coin_id,
            start: startDate,
            end: endDate,
            meta: true,
          }),
        });

        if (!response.ok) {
          console.error(`❌ Failed to fetch ${crypto.symbol}: HTTP ${response.status}`);
          continue;
        }

        const data = await response.json();
        const history: HistoricalDataPoint[] = data.history || [];

        if (history.length === 0) {
          console.log(`⚠️  No history data returned for ${crypto.symbol}`);
          continue;
        }

        // Detect the interval between data points
        const intervalMs = history.length > 1 ? history[1].date - history[0].date : 0;
        const intervalMinutes = intervalMs / 1000 / 60;
        
        console.log(`   Total data points: ${history.length}`);
        console.log(`   Detected interval: ~${Math.round(intervalMinutes)} minutes`);
        console.log(`   First point: ${new Date(history[0].date).toISOString()}`);
        console.log(`   Last point: ${new Date(history[history.length - 1].date).toISOString()}`);

        // Process based on detected granularity
        let intradayData = [];
        let dailyData = [];

        if (intervalMinutes <= 10) {
          // 5-minute or finer data detected
          console.log(`   Processing as 5-minute data...`);
          
          // Split into historical (hourly) and recent (5-min)
          const historicalPoints = [];
          const recentPoints = [];
          
          for (let i = 0; i < history.length; i++) {
            const point = history[i];
            
            if (point.date < recentThreshold) {
              // Historical: Keep only hourly (every ~12th point)
              if (i % 12 === 0) {
                historicalPoints.push(point);
              }
            } else {
              // Recent: Keep all 5-minute data
              recentPoints.push(point);
            }
          }

          intradayData = [...historicalPoints, ...recentPoints].map(h => ({
            symbol: crypto.symbol,
            coin_id: crypto.coin_id,
            timestamp: new Date(h.date).toISOString(),
            price: h.rate,
            volume: h.volume || 0,
            market_cap: h.cap || 0,
          }));

          console.log(`   Historical hourly points: ${historicalPoints.length}`);
          console.log(`   Recent 5-min points: ${recentPoints.length}`);

          // Create daily OHLC from 5-min data
          dailyData = createDailyOHLC(history, crypto);

        } else if (intervalMinutes <= 90) {
          // Hourly data - perfect!
          console.log(`   Processing as hourly data (perfect for our use case!)`);
          
          intradayData = history.map(h => ({
            symbol: crypto.symbol,
            coin_id: crypto.coin_id,
            timestamp: new Date(h.date).toISOString(),
            price: h.rate,
            volume: h.volume || 0,
            market_cap: h.cap || 0,
          }));

          // Create daily OHLC from hourly data
          dailyData = createDailyOHLC(history, crypto);

        } else {
          // Daily data
          console.log(`   Processing as daily data...`);
          
          dailyData = history.map(h => ({
            symbol: crypto.symbol,
            coin_id: crypto.coin_id,
            date: new Date(h.date).toISOString().split("T")[0],
            open: h.rate,
            high: h.rate,
            low: h.rate,
            close: h.rate,
            volume: h.volume || 0,
            market_cap: h.cap || 0,
          }));

          // For daily data, also store as intraday (one point per day)
          intradayData = history.map(h => ({
            symbol: crypto.symbol,
            coin_id: crypto.coin_id,
            timestamp: new Date(h.date).toISOString(),
            price: h.rate,
            volume: h.volume || 0,
            market_cap: h.cap || 0,
          }));
        }

        // Insert intraday data in batches
        if (intradayData.length > 0) {
          console.log(`   💾 Inserting ${intradayData.length} intraday records...`);
          await insertBatches(
            supabaseClient,
            "crypto_5min_prices",
            intradayData,
            "symbol,timestamp"
          );
        }

        // Insert daily data in batches
        if (dailyData.length > 0) {
          console.log(`   💾 Inserting ${dailyData.length} daily records...`);
          await insertBatches(
            supabaseClient,
            "crypto_daily_prices",
            dailyData,
            "symbol,date"
          );
        }

        results.push({
          symbol: crypto.symbol,
          interval: `${Math.round(intervalMinutes)} minutes`,
          totalPoints: history.length,
          intradayRecords: intradayData.length,
          dailyRecords: dailyData.length,
          status: "success",
        });

        // Log API usage
        await supabaseClient.from("api_usage_logs").insert({
          api_name: "LiveCoinWatch",
          endpoint: "/coins/single/history",
          success: true,
        });

        console.log(`   ✅ ${crypto.symbol} completed successfully`);

        // Rate limiting: 1 second between requests
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`❌ Error processing ${crypto.symbol}:`, error);
        results.push({
          symbol: crypto.symbol,
          status: "error",
          error: error.message,
        });

        await supabaseClient.from("api_usage_logs").insert({
          api_name: "LiveCoinWatch",
          endpoint: "/coins/single/history",
          success: false,
          error_message: error.message,
        });
      }
    }

    console.log(`\n✅ Historical data fetch completed!`);
    console.log(`   Successful: ${results.filter(r => r.status === 'success').length}`);
    console.log(`   Failed: ${results.filter(r => r.status === 'error').length}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Historical data fetched successfully",
        summary: {
          total: results.length,
          successful: results.filter(r => r.status === 'success').length,
          failed: results.filter(r => r.status === 'error').length,
        },
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("💥 Fatal error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

/**
 * Insert data in batches to avoid overwhelming the database
 */
async function insertBatches(
  client: any,
  table: string,
  data: any[],
  conflictColumns: string,
  batchSize = 500
) {
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    const { error } = await client
      .from(table)
      .upsert(batch, {
        onConflict: conflictColumns,
        ignoreDuplicates: false,
      });

    if (error) {
      console.error(`   ⚠️  Error inserting batch ${i / batchSize + 1}:`, error.message);
    }
  }
}

/**
 * Create daily OHLC candles from intraday data
 */
function createDailyOHLC(history: HistoricalDataPoint[], crypto: any) {
  const days: DailyOHLC = {};

  // Group by day and calculate OHLC
  for (const point of history) {
    const date = new Date(point.date).toISOString().split("T")[0];

    if (!days[date]) {
      days[date] = {
        open: point.rate,
        high: point.rate,
        low: point.rate,
        close: point.rate,
        volume: point.volume || 0,
        market_cap: point.cap || 0,
      };
    } else {
      // Update high/low
      days[date].high = Math.max(days[date].high, point.rate);
      days[date].low = Math.min(days[date].low, point.rate);
      days[date].close = point.rate; // Last price of the day
      days[date].volume += point.volume || 0;
      days[date].market_cap = point.cap || 0; // Use latest market cap
    }
  }

  // Convert to array format
  return Object.entries(days).map(([date, ohlc]) => ({
    symbol: crypto.symbol,
    coin_id: crypto.coin_id,
    date: date,
    ...ohlc,
  }));
}
