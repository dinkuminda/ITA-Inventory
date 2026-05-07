/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from './supabase';
import { UserRole, UserProfile } from '../types';
import { convertToCamelCase, convertToSnakeCase } from './supabaseService';

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
    // Proceed with signup directly - anyone can sign up but they must verify email
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
        }
      }
    });
    
    if (error) {
      console.error('Signup error:', error);
      if (error.message.includes('Database error')) {
        throw new Error("Account creation failed on the server. If you recently deleted your account, it might take a few minutes to clear. Otherwise, contact an admin.");
      }
      throw error;
    }
    
    return data.user;
  },

  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async ensureProfile(user: any): Promise<UserProfile | null> {
    if (!user) return null;

    try {
      console.log('Ensuring profile for user:', user.email, 'ID:', user.id);
      
      // 1. Check if profile exists
      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching existing profile:', fetchError);
      }

      if (profile) {
        console.log('Found existing profile for:', user.email);
        const p = convertToCamelCase(profile);
        return {
          id: p.id,
          email: p.email,
          displayName: p.displayName,
          role: p.role as UserRole
        };
      }

      console.log('No profile found, checking employee registration...');
      const cleanEmail = user.email.trim().toLowerCase();

      // 2. Create profile if missing
      // 2.1 Check if they are in employees table to get initial data
      const { data: employeeData, error: empQueryError } = await supabase
        .from('employees')
        .select('*')
        .ilike('email', cleanEmail)
        .maybeSingle();

      const employee = employeeData ? convertToCamelCase(employeeData) : null;
      if (employee) {
        console.log('Matched with employee record:', employee.fullName);
      } else {
        console.warn('No matching employee record found for:', user.email);
      }

      const displayName = user.user_metadata?.display_name || employee?.fullName || user.email?.split('@')[0] || 'Unknown User';
      const isSuperAdmin = user.email.toLowerCase() === 'dinkuh12@gmail.com';
      const role = isSuperAdmin ? UserRole.ADMIN : (employee?.role || UserRole.STAFF);

      // AUTO-AUTHORIZE SUPER ADMIN: If super admin logs in and isn't in employees, add them
      if (isSuperAdmin && !employee) {
        console.log('Auto-authorizing root administrator...');
        try {
          await supabase.from('employees').insert([{
            employee_id: 'ADMIN-001',
            full_name: 'System Administrator',
            email: user.email.toLowerCase(),
            department: 'IT Directorate',
            position: 'Chief Administrator',
            status: 'Active',
            role: UserRole.ADMIN,
            profile_id: user.id
          }]);
        } catch (e) {
          console.error('Failed to auto-authorize admin in employees table:', e);
        }
      }

      console.log('Creating new profile for:', user.email, 'with role:', role);

      const profileData = convertToSnakeCase({
        id: user.id,
        email: user.email,
        displayName: displayName,
        role: role
      });

      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert([profileData])
        .select()
        .single();

      if (insertError) {
        console.error('Lazy profile creation error:', insertError);
        // If profile creation fails, we might still want to return a basic profile if we're in admin mode
        // but generally we shouldn't continue without a DB record
        return null;
      }

      console.log('New profile created successfully');

      // 3. Link employee to profile if they match
      if (employee && !employee.profileId) {
        try {
          console.log(`Linking employee ${employee.id} to new profile ${user.id}`);
          await supabase
            .from('employees')
            .update({ profile_id: user.id })
            .eq('id', employee.id);
        } catch (linkErr) {
          console.error('Failed to link employee to profile:', linkErr);
          // Non-blocking error
        }
      }

      const p = convertToCamelCase(newProfile);
      return {
        id: p.id,
        email: p.email,
        displayName: p.displayName,
        role: p.role as UserRole
      };
    } catch (err) {
      console.error('CRITICAL: Error in ensureProfile:', err);
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
