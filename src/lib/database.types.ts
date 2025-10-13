export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      crypto_prices: {
        Row: {
          id: string
          symbol: string
          name: string
          price_usd: number
          open: number
          high: number
          low: number
          volume: number
          market_cap: number
          timestamp: string
          created_at: string | null
        }
        Insert: {
          id?: string
          symbol: string
          name: string
          price_usd: number
          open: number
          high: number
          low: number
          volume: number
          market_cap: number
          timestamp: string
          created_at?: string | null
        }
        Update: {
          id?: string
          symbol?: string
          name?: string
          price_usd?: number
          open?: number
          high?: number
          low?: number
          volume?: number
          market_cap?: number
          timestamp?: string
          created_at?: string | null
        }
      }
      news_events: {
        Row: {
          id: string
          title: string
          description: string | null
          source: string
          url: string | null
          category: string
          sentiment_score: number | null
          impact_level: string | null
          published_at: string
          created_at: string | null
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          source: string
          url?: string | null
          category: string
          sentiment_score?: number | null
          impact_level?: string | null
          published_at: string
          created_at?: string | null
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          source?: string
          url?: string | null
          category?: string
          sentiment_score?: number | null
          impact_level?: string | null
          published_at?: string
          created_at?: string | null
        }
      }
      market_indices: {
        Row: {
          id: string
          index_name: string
          value: number
          change_percent: number | null
          timestamp: string
          created_at: string | null
        }
        Insert: {
          id?: string
          index_name: string
          value: number
          change_percent?: number | null
          timestamp: string
          created_at?: string | null
        }
        Update: {
          id?: string
          index_name?: string
          value?: number
          change_percent?: number | null
          timestamp?: string
          created_at?: string | null
        }
      }
      social_media_events: {
        Row: {
          id: string
          author: string
          platform: string
          content: string
          url: string | null
          sentiment_score: number | null
          engagement_score: number | null
          posted_at: string
          created_at: string | null
        }
        Insert: {
          id?: string
          author: string
          platform: string
          content: string
          url?: string | null
          sentiment_score?: number | null
          engagement_score?: number | null
          posted_at: string
          created_at?: string | null
        }
        Update: {
          id?: string
          author?: string
          platform?: string
          content?: string
          url?: string | null
          sentiment_score?: number | null
          engagement_score?: number | null
          posted_at?: string
          created_at?: string | null
        }
      }
      correlation_patterns: {
        Row: {
          id: string
          event_type: string
          event_id: string
          crypto_symbol: string
          price_change_percent: number
          time_lag_hours: number | null
          confidence_score: number | null
          occurrence_count: number | null
          event_timestamp: string
          created_at: string | null
        }
        Insert: {
          id?: string
          event_type: string
          event_id: string
          crypto_symbol: string
          price_change_percent: number
          time_lag_hours?: number | null
          confidence_score?: number | null
          occurrence_count?: number | null
          event_timestamp: string
          created_at?: string | null
        }
        Update: {
          id?: string
          event_type?: string
          event_id?: string
          crypto_symbol?: string
          price_change_percent?: number
          time_lag_hours?: number | null
          confidence_score?: number | null
          occurrence_count?: number | null
          event_timestamp?: string
          created_at?: string | null
        }
      }
      recommendations: {
        Row: {
          id: string
          crypto_symbol: string
          action: string
          confidence_percent: number
          reasoning: string
          trigger_event_ids: Json | null
          target_price: number | null
          stop_loss: number | null
          is_active: boolean | null
          generated_at: string | null
          expires_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          crypto_symbol: string
          action: string
          confidence_percent: number
          reasoning: string
          trigger_event_ids?: Json | null
          target_price?: number | null
          stop_loss?: number | null
          is_active?: boolean | null
          generated_at?: string | null
          expires_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          crypto_symbol?: string
          action?: string
          confidence_percent?: number
          reasoning?: string
          trigger_event_ids?: Json | null
          target_price?: number | null
          stop_loss?: number | null
          is_active?: boolean | null
          generated_at?: string | null
          expires_at?: string | null
          created_at?: string | null
        }
      }
      recommendation_outcomes: {
        Row: {
          id: string
          recommendation_id: string
          actual_price_change_percent: number
          was_accurate: boolean
          measured_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          recommendation_id: string
          actual_price_change_percent: number
          was_accurate: boolean
          measured_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          recommendation_id?: string
          actual_price_change_percent?: number
          was_accurate?: boolean
          measured_at?: string | null
          created_at?: string | null
        }
      }
      user_portfolios: {
        Row: {
          id: string
          user_id: string
          crypto_symbol: string
          quantity: number
          average_buy_price: number
          last_updated: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          crypto_symbol: string
          quantity?: number
          average_buy_price: number
          last_updated?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          crypto_symbol?: string
          quantity?: number
          average_buy_price?: number
          last_updated?: string | null
          created_at?: string | null
        }
      }
      api_usage_logs: {
        Row: {
          id: string
          api_name: string
          endpoint: string
          calls_count: number | null
          success: boolean | null
          response_time_ms: number | null
          error_message: string | null
          called_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          api_name: string
          endpoint: string
          calls_count?: number | null
          success?: boolean | null
          response_time_ms?: number | null
          error_message?: string | null
          called_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          api_name?: string
          endpoint?: string
          calls_count?: number | null
          success?: boolean | null
          response_time_ms?: number | null
          error_message?: string | null
          called_at?: string | null
          created_at?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
