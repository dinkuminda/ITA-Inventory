/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from './supabase';

export const supabaseService = {
  async getCollection<T>(table: string): Promise<T[]> {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order('updatedAt', { ascending: false });
      
    if (error) {
      console.error(`Supabase Error (list ${table}):`, error);
      return [];
    }
    return data as T[];
  },

  subscribeCollection<T>(table: string, callback: (data: T[]) => void) {
    // Initial fetch
    this.getCollection<T>(table).then(callback);

    // Subscribe to changes
    const channel = supabase
      .channel(`${table}_changes`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        this.getCollection<T>(table).then(callback);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  async addDocument<T extends object>(table: string, data: T): Promise<T | null> {
    const { data: result, error } = await supabase
      .from(table)
      .insert([data])
      .select()
      .single();
      
    if (error) {
      console.error(`Supabase Error (add ${table}):`, error);
      return null;
    }
    return result as T;
  },

  async updateDocument<T extends object>(table: string, id: string, data: Partial<T>): Promise<void> {
    const { error } = await supabase
      .from(table)
      .update(data)
      .eq('id', id);
      
    if (error) {
      console.error(`Supabase Error (update ${table}):`, error);
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
