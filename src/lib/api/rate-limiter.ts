import { supabase } from '../supabase';

interface RateLimitConfig {
  callsPerMinute?: number;
  callsPerHour?: number;
  callsPerDay?: number;
  callsPerMonth?: number;
}

class RateLimiter {
  private lastCallTimes: Map<string, number[]> = new Map();

  async canMakeCall(apiName: string, config: RateLimitConfig): Promise<boolean> {
    const now = Date.now();
    const calls = this.lastCallTimes.get(apiName) || [];

    const oneMinuteAgo = now - 60 * 1000;
    const oneHourAgo = now - 60 * 60 * 1000;
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000;

    const recentCalls = calls.filter(time => time > oneMinuteAgo);

    if (config.callsPerMinute && recentCalls.length >= config.callsPerMinute) {
      return false;
    }

    if (config.callsPerHour) {
      const hourCalls = calls.filter(time => time > oneHourAgo);
      if (hourCalls.length >= config.callsPerHour) {
        return false;
      }
    }

    if (config.callsPerDay) {
      const { count } = await supabase
        .from('api_usage_logs')
        .select('*', { count: 'exact', head: true })
        .eq('api_name', apiName)
        .gte('called_at', new Date(oneDayAgo).toISOString());

      if (count && count >= config.callsPerDay) {
        return false;
      }
    }

    if (config.callsPerMonth) {
      const { count } = await supabase
        .from('api_usage_logs')
        .select('*', { count: 'exact', head: true })
        .eq('api_name', apiName)
        .gte('called_at', new Date(oneMonthAgo).toISOString());

      if (count && count >= config.callsPerMonth) {
        return false;
      }
    }

    return true;
  }

  recordCall(apiName: string): void {
    const now = Date.now();
    const calls = this.lastCallTimes.get(apiName) || [];

    const oneMinuteAgo = now - 60 * 1000;
    const recentCalls = calls.filter(time => time > oneMinuteAgo);
    recentCalls.push(now);

    this.lastCallTimes.set(apiName, recentCalls);
  }

  async logApiCall(
    apiName: string,
    endpoint: string,
    success: boolean,
    responseTimeMs?: number,
    errorMessage?: string
  ): Promise<void> {
    await supabase.from('api_usage_logs').insert({
      api_name: apiName,
      endpoint,
      success,
      response_time_ms: responseTimeMs,
      error_message: errorMessage,
    });
  }
}

export const rateLimiter = new RateLimiter();
