/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from './supabase';
import { UserRole, UserProfile } from '../types';
import { convertToCamelCase, convertToSnakeCase } from './supabaseService';

// NOTE TO DEVELOPER: To ensure profiles are created automatically upon signup 
// (even before the user logs in for the first time), it is highly recommended 
// to add a trigger in your Supabase SQL editor. 
// If you get "Database error creating new user", verify that the role column 
// allows 'staff' or has a default value.
/*
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, role)
  values (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'display_name', 
    case when new.email = 'dinkuh12@gmail.com' then 'admin' else 'staff' end
  );
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
        throw new Error("Activation Required: Your account is not verified. Please click the confirmation link in the email sent by Supabase. Don't forget to check your Spam folder!");
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
            full_name: displayName,
          },
          emailRedirectTo: window.location.origin
        },
      });
      
      if (error) {
        console.error('[Supabase Auth] Signup failed. Error details:', {
          message: error.message,
          status: error.status,
          name: error.name
        });
        
        // Handle specific error cases
        const msg = error.message.toLowerCase();
        if (msg.includes('user already registered') || error.status === 422) {
          throw new Error("This email is already registered. If you haven't received your verification email, check your spam or try logging in.");
        }
        if (msg.includes('weak_password')) {
          throw new Error("Password is too weak. Please use at least 6 characters.");
        }
        if (msg.includes('database error') || msg.includes('server error')) {
          throw new Error("Signup Failed: This usually happens if a database trigger (on_auth_user_created) failed to create your profile. Ensure your SQL trigger includes the 'role' field.");
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

    const cleanEmail = user.email?.toLowerCase().trim() || "";
    const isSuperAdmin = cleanEmail === 'dinkuh12@gmail.com';
    const fallbackDisplayName = user.user_metadata?.display_name || cleanEmail.split('@')[0] || 'User';

    try {
      // 1. Fetch current profile
      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (fetchError) {
          console.warn('[Auth] Error fetching profile:', fetchError);
      }

      if (profile) {
        console.log('[Auth] Profile found for user:', user.id);
        return {
          id: profile.id,
          email: profile.email,
          displayName: profile.display_name,
          role: profile.role as UserRole
        };
      }

      // 2. Not found, determine role and attempt creation
      // Check for employee record
      const { data: employeeData } = await supabase
        .from('employees')
        .select('*')
        .ilike('email', cleanEmail)
        .maybeSingle();

      const role = isSuperAdmin ? UserRole.ADMIN : (employeeData?.role || UserRole.STAFF);
      const displayName = user.user_metadata?.display_name || employeeData?.full_name || fallbackDisplayName;

      // Upsert profile
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
        console.warn('[Auth] Profile creation failed, providing ephemeral session profile:', upsertError);
        // If upsert fails (likely RLS or connection), we still allow them in with a calculated role
        return {
          id: user.id,
          email: cleanEmail,
          displayName: displayName,
          role: role as UserRole
        };
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
            console.error('Superadmin employee creation failed:', adminErr);
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
      // Absolute fallback so user is never locked out of the frontend
      return {
        id: user.id,
        email: cleanEmail,
        displayName: fallbackDisplayName,
        role: isSuperAdmin ? UserRole.ADMIN : UserRole.STAFF
      };
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
