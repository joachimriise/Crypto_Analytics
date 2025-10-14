import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

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
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split("T")[0];

    for (const crypto of cryptos) {
      const { data: existing } = await supabaseClient
        .from("crypto_daily_prices")
        .select("date")
        .eq("symbol", crypto.symbol)
        .eq("date", todayStr)
        .maybeSingle();

      if (existing) {
        console.log(`Today's data for ${crypto.symbol} already exists, skipping...`);
        continue;
      }

      console.log(`Updating daily price for ${crypto.symbol}...`);

      try {
        const startDate = today.getTime() - (24 * 60 * 60 * 1000);
        const endDate = Date.now();

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
        const history = data.history || [];

        if (history.length === 0) {
          console.log(`No data available for ${crypto.symbol}`);
          continue;
        }

        const rates = history.map((h: any) => h.rate);
        const volumes = history.map((h: any) => h.volume || 0);
        const caps = history.map((h: any) => h.cap || 0);

        const dailyData = {
          symbol: crypto.symbol,
          coin_id: crypto.coin_id,
          date: todayStr,
          open: rates[0],
          high: Math.max(...rates),
          low: Math.min(...rates),
          close: rates[rates.length - 1],
          volume: volumes.reduce((a: number, b: number) => a + b, 0) / volumes.length,
          market_cap: caps[caps.length - 1],
        };

        const { error: insertError } = await supabaseClient
          .from("crypto_daily_prices")
          .upsert([dailyData], {
            onConflict: "symbol,date",
            ignoreDuplicates: false,
          });

        if (insertError) {
          console.error(`Error inserting ${crypto.symbol}:`, insertError);
          results.push({
            symbol: crypto.symbol,
            status: "error",
            error: insertError.message,
          });
        } else {
          results.push({
            symbol: crypto.symbol,
            date: todayStr,
            status: "success",
          });
        }

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
        message: "Daily prices updated successfully",
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