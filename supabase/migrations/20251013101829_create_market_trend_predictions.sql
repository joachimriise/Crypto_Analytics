/*
  # Market Trend Predictions Table

  1. New Tables
    - `market_trend_predictions`
      - `id` (uuid, primary key)
      - `prediction_type` (text) - 'positive', 'neutral', 'negative'
      - `confidence_percent` (numeric) - 0-100
      - `reasoning` (text) - Why this prediction was made
      - `average_price_change` (numeric) - Average % change across top cryptos
      - `bullish_count` (integer) - Number of cryptos trending up
      - `bearish_count` (integer) - Number of cryptos trending down
      - `neutral_count` (integer) - Number of cryptos flat
      - `news_sentiment_score` (numeric) - Aggregated news sentiment
      - `macro_events_summary` (text) - Summary of macro events considered
      - `predicted_at` (timestamptz) - When prediction was made
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `market_trend_predictions` table
    - Add policies for public read and insert access
*/

CREATE TABLE IF NOT EXISTS market_trend_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prediction_type text NOT NULL CHECK (prediction_type IN ('positive', 'neutral', 'negative')),
  confidence_percent numeric NOT NULL CHECK (confidence_percent >= 0 AND confidence_percent <= 100),
  reasoning text NOT NULL,
  average_price_change numeric NOT NULL DEFAULT 0,
  bullish_count integer NOT NULL DEFAULT 0,
  bearish_count integer NOT NULL DEFAULT 0,
  neutral_count integer NOT NULL DEFAULT 0,
  news_sentiment_score numeric DEFAULT 0,
  macro_events_summary text DEFAULT '',
  predicted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE market_trend_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access"
  ON market_trend_predictions FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert access"
  ON market_trend_predictions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_market_predictions_predicted_at 
  ON market_trend_predictions(predicted_at DESC);
