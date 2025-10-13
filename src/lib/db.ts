/**
 * Database Abstraction Layer
 * 
 * This file provides a unified interface for database operations,
 * making it easy to switch between different database providers.
 */

import { supabase } from './supabase';

// Database provider type
type DatabaseProvider = 'supabase' | 'postgres' | 'mysql' | 'mongodb';

// Get the active database provider from environment
const DB_PROVIDER = (import.meta.env.VITE_DB_PROVIDER || 'supabase') as DatabaseProvider;

/**
 * Generic database query interface
 */
interface DatabaseClient {
  query<T = any>(sql: string, params?: any[]): Promise<T[]>;
  insert<T = any>(table: string, data: any): Promise<T>;
  update<T = any>(table: string, id: string | number, data: any): Promise<T>;
  delete(table: string, id: string | number): Promise<void>;
  findOne<T = any>(table: string, id: string | number): Promise<T | null>;
  findMany<T = any>(table: string, filters?: Record<string, any>): Promise<T[]>;
}

/**
 * Supabase implementation
 */
class SupabaseClient implements DatabaseClient {
  async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    // For Supabase, use RPC or direct table queries
    throw new Error('Raw SQL queries not supported in Supabase browser client');
  }

  async insert<T = any>(table: string, data: any): Promise<T> {
    const { data: result, error } = await supabase
      .from(table)
      .insert(data)
      .select()
      .single();
    
    if (error) throw error;
    return result as T;
  }

  async update<T = any>(table: string, id: string | number, data: any): Promise<T> {
    const { data: result, error } = await supabase
      .from(table)
      .update(data)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return result as T;
  }

  async delete(table: string, id: string | number): Promise<void> {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  async findOne<T = any>(table: string, id: string | number): Promise<T | null> {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    return data as T;
  }

  async findMany<T = any>(table: string, filters?: Record<string, any>): Promise<T[]> {
    let query = supabase.from(table).select('*');
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data as T[];
  }
}

/**
 * PostgreSQL implementation (for direct connections)
 * Note: This would typically run on the server side, not in the browser
 */
class PostgresClient implements DatabaseClient {
  private pool: any; // Would be pg.Pool

  constructor() {
    // This is a placeholder - actual implementation would use 'pg' package
    // and should run server-side
    throw new Error('PostgreSQL client must be configured server-side');
  }

  async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    const result = await this.pool.query(sql, params);
    return result.rows;
  }

  async insert<T = any>(table: string, data: any): Promise<T> {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    
    const sql = `
      INSERT INTO ${table} (${keys.join(', ')})
      VALUES (${placeholders})
      RETURNING *
    `;
    
    const result = await this.query<T>(sql, values);
    return result[0];
  }

  async update<T = any>(table: string, id: string | number, data: any): Promise<T> {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
    
    const sql = `
      UPDATE ${table}
      SET ${setClause}
      WHERE id = $${keys.length + 1}
      RETURNING *
    `;
    
    const result = await this.query<T>(sql, [...values, id]);
    return result[0];
  }

  async delete(table: string, id: string | number): Promise<void> {
    await this.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
  }

  async findOne<T = any>(table: string, id: string | number): Promise<T | null> {
    const result = await this.query<T>(
      `SELECT * FROM ${table} WHERE id = $1`,
      [id]
    );
    return result[0] || null;
  }

  async findMany<T = any>(table: string, filters?: Record<string, any>): Promise<T[]> {
    if (!filters || Object.keys(filters).length === 0) {
      return this.query<T>(`SELECT * FROM ${table}`);
    }
    
    const keys = Object.keys(filters);
    const values = Object.values(filters);
    const whereClause = keys.map((key, i) => `${key} = $${i + 1}`).join(' AND ');
    
    return this.query<T>(`SELECT * FROM ${table} WHERE ${whereClause}`, values);
  }
}

/**
 * Factory function to get the appropriate database client
 */
function getDatabaseClient(): DatabaseClient {
  switch (DB_PROVIDER) {
    case 'supabase':
      return new SupabaseClient();
    case 'postgres':
      return new PostgresClient();
    default:
      throw new Error(`Unsupported database provider: ${DB_PROVIDER}`);
  }
}

// Export singleton instance
export const db = getDatabaseClient();

// Export types
export type { DatabaseClient, DatabaseProvider };

/**
 * Usage examples:
 * 
 * // Insert
 * const newCoin = await db.insert('coins', {
 *   symbol: 'BTC',
 *   name: 'Bitcoin',
 *   price: 50000
 * });
 * 
 * // Update
 * const updated = await db.update('coins', 1, { price: 51000 });
 * 
 * // Find one
 * const coin = await db.findOne('coins', 1);
 * 
 * // Find many
 * const btcCoins = await db.findMany('coins', { symbol: 'BTC' });
 * 
 * // Delete
 * await db.delete('coins', 1);
 */
