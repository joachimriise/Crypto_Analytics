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

    for (const crypto of cryptos) {
      console.log(`Fetching historical data for ${crypto.symbol}...`);

      try {
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
          console.error(`Failed to fetch ${crypto.symbol}: ${response.status}`);
          continue;
        }

        const data = await response.json();
        const history: HistoricalDataPoint[] = data.history || [];

        const dailyPrices = [];
        for (let i = 0; i < history.length; i++) {
          const current = history[i];
          const date = new Date(current.date);

          const dayData = {
            symbol: crypto.symbol,
            coin_id: crypto.coin_id,
            date: date.toISOString().split("T")[0],
            open: current.rate,
            high: current.rate,
            low: current.rate,
            close: current.rate,
            volume: current.volume || 0,
            market_cap: current.cap || 0,
          };

          dailyPrices.push(dayData);
        }

        const batchSize = 500;
        for (let i = 0; i < dailyPrices.length; i += batchSize) {
          const batch = dailyPrices.slice(i, i + batchSize);
          const { error: insertError } = await supabaseClient
            .from("crypto_daily_prices")
            .upsert(batch, {
              onConflict: "symbol,date",
              ignoreDuplicates: false,
            });

          if (insertError) {
            console.error(`Error inserting batch for ${crypto.symbol}:`, insertError);
          }
        }

        results.push({
          symbol: crypto.symbol,
          recordsProcessed: dailyPrices.length,
          status: "success",
        });

        await supabaseClient.from("api_usage_logs").insert({
          api_name: "LiveCoinWatch",
          endpoint: "/coins/single/history",
          success: true,
        });

        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`Error processing ${crypto.symbol}:`, error);
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

    return new Response(
      JSON.stringify({
        success: true,
        message: "Historical data fetched successfully",
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Error:", error);
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