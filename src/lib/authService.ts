/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from './supabase';
import { UserRole, UserProfile } from '../types';

export const authService = {
  subscribeAuth(callback: (user: any | null) => void) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      callback(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  },

  async login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data.user;
  },

  async signup(email: string, password: string, displayName: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
        }
      }
    });
    
    if (error) throw error;
    
    if (data.user) {
      // Profiles are often handled via triggers in Supabase, but we can do it manually too
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([
          { 
            id: data.user.id, 
            email: email, 
            display_name: displayName,
            role: email === 'dinkuh12@gmail.com' ? UserRole.ADMIN : UserRole.STAFF 
          }
        ]);
      if (profileError) console.error('Profile creation error:', profileError);
    }
    
    return data.user;
  },

  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getUserProfile(uid: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .single();
      
    if (error) {
      console.error('Get profile error:', error);
      return null;
    }
    
    return {
      id: data.id,
      email: data.email,
      displayName: data.display_name,
      role: data.role
    } as UserProfile;
  }
};
