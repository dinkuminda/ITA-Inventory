/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from './supabase';
import { UserRole, UserProfile } from '../types';
import { convertToCamelCase, convertToSnakeCase } from './supabaseService';

// NOTE TO DEVELOPER: To ensure profiles are created automatically upon signup 
// (even before the user logs in for the first time), it is highly recommended 
// to add a trigger in your Supabase SQL editor:
/*
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, new.raw_user_meta_data->>'display_name');
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
*/

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
    
    if (error) {
      if (error.message.toLowerCase().includes('email not confirmed')) {
        throw new Error("Login failed: Your email address has not been verified yet. Please check your inbox for the confirmation link and click it to activate your account.");
      }
      if (error.message.toLowerCase().includes('invalid login credentials')) {
        throw new Error("Login failed: Incorrect email or password. Please try again.");
      }
      throw error;
    }
    
    return data.user;
  },

  async signup(email: string, password: string, displayName: string) {
    try {
      console.log('[Supabase Auth] signup() initiates. target:', email);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
            full_name: displayName, // Compatibility with some triggers
          },
          emailRedirectTo: window.location.origin
        },
      });
      
      if (error) {
        console.error('[Supabase Auth] API Error during signup:', error);
        
        // Handle specific error cases
        const msg = error.message.toLowerCase();
        if (msg.includes('user already registered') || error.status === 422) {
          throw new Error("This email is already registered. If you haven't received your verification email, check your spam or try logging in.");
        }
        if (msg.includes('weak_password')) {
          throw new Error("Password is too weak. Please use at least 6 characters.");
        }
        if (msg.includes('database error') || msg.includes('server error')) {
          throw new Error("The authentication server had a temporary issue. Please try again soon.");
        }
        
        throw error;
      }

      console.log('[Supabase Auth] API Success. Response detail:', {
        userId: data.user?.id,
        identities: data.user?.identities?.length,
        isConfirmed: !!data.user?.confirmed_at,
        hasSession: !!data.session
      });

      if (!data.user) {
        throw new Error("Technical error: Auth response contained no user data.");
      }

      let isExistingUnconfirmed = false;
      // If identities is empty, it means the user already exists (Supabase security feature)
      if (data.user && (!data.user.identities || data.user.identities.length === 0)) {
        console.warn('[Supabase Auth] Note: Identities list is empty. User exists but needs verification.');
        isExistingUnconfirmed = true;
      }

      return {
        ...data,
        isExistingUnconfirmed
      };
    } catch (err: any) {
      console.error('[Supabase Auth] Signup failed at service level:', err.message);
      throw err;
    }
  },

  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async sendPasswordResetEmail(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  },

  async ensureProfile(user: any): Promise<UserProfile | null> {
    if (!user) return null;

    try {
      // 1. Fetch current profile
      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (fetchError) {
          console.warn('[Auth] Error fetching profile, will attempt upsert:', fetchError);
      }

      if (profile) {
        console.log('[Auth] Profile already exists for user:', user.id);
        return {
          id: profile.id,
          email: profile.email,
          displayName: profile.display_name,
          role: profile.role as UserRole
        };
      }

      // 2. Not found, determine role and create
      const cleanEmail = user.email.toLowerCase().trim();
      const isSuperAdmin = cleanEmail === 'dinkuh12@gmail.com';

      // Check for employee record
      const { data: employeeData } = await supabase
        .from('employees')
        .select('*')
        .ilike('email', cleanEmail)
        .maybeSingle();

      const role = isSuperAdmin ? UserRole.ADMIN : (employeeData?.role || UserRole.STAFF);
      const displayName = user.user_metadata?.display_name || employeeData?.full_name || cleanEmail.split('@')[0];

      // Upsert profile for robustness
      const { data: newProfile, error: upsertError } = await supabase
        .from('profiles')
        .upsert([{
          id: user.id,
          email: cleanEmail,
          display_name: displayName,
          role: role
        }])
        .select()
        .single();

      if (upsertError) {
        console.error('Profile creation failed:', upsertError);
        // Maybe it exists now? (Race condition)
        const { data: retry } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
        if (retry) {
            return {
                id: retry.id,
                email: retry.email,
                displayName: retry.display_name,
                role: retry.role as UserRole
            };
        }
        return null;
      }

      // 3. Update employee record if matched
      if (employeeData && !employeeData.profile_id) {
        await supabase.from('employees').update({ profile_id: user.id }).eq('id', employeeData.id);
      }

      // 4. Auto-authorize Super Admin if no employee record exists
      if (isSuperAdmin && !employeeData) {
        try {
            await supabase.from('employees').insert([{
                employee_id: 'SYSTEM-ROOT-001',
                full_name: 'System Administrator',
                email: cleanEmail,
                department: 'IT Directorate',
                position: 'Chief Administrator',
                role: UserRole.ADMIN,
                profile_id: user.id
            }]);
        } catch (adminErr) {
            console.error('Superadmin employee creation failed (likely already exists):', adminErr);
        }
      }

      return {
        id: newProfile.id,
        email: newProfile.email,
        displayName: newProfile.display_name,
        role: newProfile.role as UserRole
      };
    } catch (e) {
      console.error('ensureProfile panic:', e);
      return null;
    }
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
    
    const profile = convertToCamelCase(data);
    return {
      id: profile.id,
      email: profile.email,
      displayName: profile.displayName,
      role: profile.email === 'dinkuh12@gmail.com' ? UserRole.ADMIN : profile.role
    } as UserProfile;
  }
};
