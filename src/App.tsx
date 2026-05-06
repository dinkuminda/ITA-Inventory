/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from "react";
import { useState, useEffect } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/src/components/layout/AppSidebar';
import { Dashboard } from '@/src/components/dashboard/Dashboard';
import { AssetsList } from '@/src/components/assets/AssetsList';
import { LicensesList } from '@/src/components/licenses/LicensesList';
import { MaintenanceList } from '@/src/components/maintenance/MaintenanceList';
import { StaffList } from '@/src/components/staff/StaffList';
import { Toaster } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Boxes, Lock, Users as UsersIcon, Settings as SettingsIcon, UserPlus, ShieldAlert } from 'lucide-react';
import { authService } from './lib/authService';
import { supabase } from './lib/supabase';
import { UserProfile, UserRole } from './types';
import { toast } from 'sonner';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Auth Form State
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  useEffect(() => {
    const unsubscribe = authService.subscribeAuth(async (authUser) => {
      setUser(authUser);
      if (authUser) {
        setLoading(true);
        const userProfile = await authService.ensureProfile(authUser);
        setProfile(userProfile);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const cleanEmail = email.trim().toLowerCase();
    
    try {
      if (isSignUp) {
        await authService.signup(cleanEmail, password, displayName);
        toast.success("Registration initiated! Please check your email for a confirmation link (if enabled) and then try logging in.", { duration: 6000 });
        setIsSignUp(false);
        setPassword('');
      } else {
        try {
          await authService.login(cleanEmail, password);
          toast.success("Welcome back!");
        } catch (loginError: any) {
          // If login fails, check if they are in the employee roster but haven't signed up
          const { data: employee } = await supabase
            .from('employees')
            .select('id')
            .ilike('email', cleanEmail)
            .maybeSingle();
          
          if (employee) {
            toast.error("Account not found. Please click 'New Employee? Activate Here' to set your password for the first time.", { duration: 5000 });
          } else {
            toast.error("Invalid credentials or unauthorized email. Please contact an administrator.");
          }
          throw loginError; // Rethrow to stop execution
        }
      }
    } catch (error: any) {
      console.error('Auth handler error:', error);
      // Only toast if we haven't already toasted in the catch block above
      if (error.message && !error.message.includes("Account not found")) {
        toast.error(error.message || "Authentication failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      toast.success("Logged out successfully");
    } catch (error) {
      toast.error("Logout failed");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-primary">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground animate-pulse">Establishing secure session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <div className="w-full max-w-md space-y-8 bg-card p-8 rounded-xl border shadow-lg border-primary/10">
          <div className="text-center space-y-2">
            <div className="mx-auto bg-primary text-primary-foreground w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-primary/20 rotate-3">
              <Boxes size={32} />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-primary">ICS IT Admin</h1>
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest px-2">
              Directorate Inventory System
            </p>
          </div>

          <div className="bg-primary/5 border border-primary/10 rounded-lg p-4 text-sm text-primary mb-2">
            <div className="flex items-start gap-3">
              <ShieldAlert size={18} className="shrink-0 mt-0.5 text-primary" />
              <div>
                <p className="font-bold mb-1">
                  {isSignUp ? "Account Activation" : "Secure Access"}
                </p>
                <p className="text-xs opacity-80 leading-relaxed">
                  {isSignUp 
                    ? "Welcome! To activate your account, ensure your email has already been added to the Employee Directory by an administrator." 
                    : "Enter your registered organizational credentials to access your inventory dashboard."}
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleAuth} className="space-y-5">
            {isSignUp && (
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-foreground/80">Full Name</label>
                <Input
                  type="text"
                  placeholder="Employee Full Name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="rounded-lg h-11"
                  required
                />
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-foreground/80">Email Address</label>
              <Input
                type="email"
                placeholder="email@ics.gov.et"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-lg h-11"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-foreground/80">Password</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-lg h-11"
                required
              />
            </div>
            <Button type="submit" className="w-full h-11 gap-2 font-bold shadow-md transition-all active:scale-95" disabled={loading}>
              {isSignUp ? <UserPlus size={18} /> : <Lock size={18} />}
              {isSignUp ? "Activate Employee Account" : "Access System"}
            </Button>
          </form>
          
          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground font-medium">Or</span>
            </div>
          </div>

          <div className="text-center">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-primary hover:text-primary-foreground font-semibold rounded-lg w-full border-primary/20"
            >
              {isSignUp ? "Back to Sign In" : "New Employee? Activate Here"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          user={{ 
            email: user.email || '', 
            displayName: profile?.displayName || user.displayName || 'Admin',
            role: profile?.role || UserRole.STAFF
          }}
          onLogout={handleLogout}
        />
        <main className="flex-1 overflow-auto">
          <div className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-6 lg:h-[60px]">
            <SidebarTrigger />
            <div className="flex-1">
              <span className="text-sm font-medium text-muted-foreground uppercase tracking-widest px-2">
                {profile?.role || 'Guest'}
              </span>
            </div>
          </div>
          <div className="p-4 md:p-8">
            {activeTab === 'dashboard' && <Dashboard userRole={profile?.role} userEmail={profile?.email || user?.email} />}
            {activeTab === 'assets' && <AssetsList userRole={profile?.role} userEmail={profile?.email || user?.email} />}
            {activeTab === 'licenses' && <LicensesList userRole={profile?.role} userEmail={profile?.email || user?.email} />}
            {activeTab === 'maintenance' && <MaintenanceList userRole={profile?.role} userEmail={profile?.email || user?.email} />}
            {activeTab === 'staff' && (
              profile?.role === UserRole.ADMIN ? (
                <StaffList userRole={profile?.role} />
              ) : (
                <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
                  <ShieldAlert size={48} className="text-destructive" />
                  <h3 className="text-xl font-semibold">Access Denied</h3>
                  <p className="text-muted-foreground max-w-xs">You do not have permission to view staff management.</p>
                </div>
              )
            )}
            {activeTab === 'settings' && (
              profile?.role === UserRole.ADMIN ? (
                <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
                  <SettingsIcon size={48} className="text-muted-foreground" />
                  <h2 className="text-xl font-semibold">System Settings</h2>
                  <p className="text-muted-foreground max-w-xs">Configure notification thresholds, asset categories, and user roles.</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
                  <ShieldAlert size={48} className="text-destructive" />
                  <h3 className="text-xl font-semibold">Access Denied</h3>
                  <p className="text-muted-foreground max-w-xs">You do not have permission to view settings.</p>
                </div>
              )
            )}
          </div>
        </main>
      </div>
      <Toaster />
    </SidebarProvider>
  );
}
