/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from './supabase';

async function getCollection<T>(table: string, orderBy: string = 'updatedAt'): Promise<T[]> {
  let query = supabase.from(table).select('*');
  
  // Try to order by the specified column, fallback if it fails
  const { data, error } = await query.order(orderBy as any, { ascending: false } as any);
      
  if (error) {
    // If ordering failed (e.g. column doesn't exist), try without ordering
    console.warn(`Supabase Order Warning (list ${table}):`, error.message);
    const { data: unorderedData, error: unorderedError } = await supabase.from(table).select('*');
    if (unorderedError) {
      console.error(`Supabase Error (list ${table}):`, unorderedError);
      return [];
    }
    return (unorderedData || []) as T[];
  }
  return (data || []) as T[];
}

export const supabaseService = {
  getCollection,

  subscribeCollection<T>(table: string, callback: (data: T[]) => void, orderBy: string = 'updatedAt') {
    // Initial fetch
    void getCollection<T>(table, orderBy).then(callback);

    // Subscribe to changes
    const channel = supabase
      .channel(`${table}_changes`)
      .on('postgres_changes' as any, { event: '*', schema: 'public', table } as any, () => {
        void getCollection<T>(table, orderBy).then(callback);
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  },

  async addDocument<T extends object>(table: string, data: T): Promise<T | null> {
    const { data: result, error } = await (supabase
      .from(table)
      .insert([data] as any)
      .select()
      .single() as any);
      
    if (error) {
      console.error(`Supabase Error (add ${table}):`, error);
      throw error;
    }
    return result as T;
  },

  async addDocuments<T extends object>(table: string, data: T[]): Promise<void> {
    const { error } = await supabase.from(table).insert(data as any);
    if (error) {
      console.error(`Supabase Error (add multiple ${table}):`, error);
      throw error;
    }
  },

  async updateDocument<T extends object>(table: string, id: string, data: Partial<T>): Promise<void> {
    const { error } = await supabase
      .from(table)
      .update(data as any)
      .eq('id', id);
      
    if (error) {
      console.error(`Supabase Error (update ${table}):`, error);
      throw error;
    }
  },

  async deleteDocument(table: string, id: string): Promise<void> {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id);
      
    if (error) {
      console.error(`Supabase Error (delete ${table}):`, error);
    }
  }
};
