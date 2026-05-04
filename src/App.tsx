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
import { Laptop, Lock, Users as UsersIcon, Settings as SettingsIcon, UserPlus, ShieldAlert } from 'lucide-react';
import { authService } from './lib/authService';
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
        const userProfile = await authService.getUserProfile(authUser.uid);
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
    try {
      if (isSignUp) {
        await authService.signup(email, password, displayName);
        toast.success("Account created successfully!");
      } else {
        await authService.login(email, password);
        toast.success("Welcome back!");
      }
    } catch (error: any) {
      if (!isSignUp && (error.message === "Invalid login credentials" || error.status === 400)) {
        toast.error("Invalid username and password");
      } else {
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <div className="w-full max-w-md space-y-8 bg-card p-8 rounded-xl border shadow-lg">
          <div className="text-center space-y-2">
            <div className="mx-auto bg-primary text-primary-foreground w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <Laptop size={28} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">ICS IT Admin Directorate Inventory Mgt System</h1>
            <p className="text-muted-foreground">
              {isSignUp ? "Create an administrator account" : ""}
            </p>
          </div>
          <form onSubmit={handleAuth} className="space-y-4">
            {isSignUp && (
              <div className="space-y-1">
                <label className="text-sm font-medium">Full Name</label>
                <Input
                  type="text"
                  placeholder="IT Manager"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                />
              </div>
            )}
            <div className="space-y-1">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                placeholder="admin@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Password</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full gap-2" disabled={loading}>
              {isSignUp ? <UserPlus size={16} /> : <Lock size={16} />}
              {isSignUp ? "Create Account" : "Sign In"}
            </Button>
          </form>
          <div className="text-center">
            <Button 
              variant="link" 
              size="sm" 
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-muted-foreground"
            >
              {isSignUp ? "Already have an account? Sign In" : "Need an account? Sign Up"}
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
            displayName: profile?.displayName || user.displayName || 'User',
            role: user.email === 'dinkuh12@gmail.com' ? UserRole.ADMIN : (profile?.role || UserRole.STAFF)
          }}
          onLogout={handleLogout}
        />
        <main className="flex-1 overflow-auto">
          <div className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-6 lg:h-[60px]">
            <SidebarTrigger />
            <div className="flex-1">
              <span className="text-sm font-medium text-muted-foreground uppercase tracking-widest px-2">
                {user.email === 'dinkuh12@gmail.com' ? UserRole.ADMIN : (profile?.role || 'Guest')}
              </span>
            </div>
          </div>
          <div className="p-4 md:p-8">
            {activeTab === 'dashboard' && <Dashboard />}
            {activeTab === 'assets' && <AssetsList userRole={user.email === 'dinkuh12@gmail.com' ? UserRole.ADMIN : profile?.role} />}
            {activeTab === 'licenses' && <LicensesList userRole={user.email === 'dinkuh12@gmail.com' ? UserRole.ADMIN : profile?.role} />}
            {activeTab === 'maintenance' && <MaintenanceList userRole={user.email === 'dinkuh12@gmail.com' ? UserRole.ADMIN : profile?.role} />}
            {activeTab === 'staff' && (
              (profile?.role === UserRole.ADMIN || user.email === 'dinkuh12@gmail.com') ? (
                <StaffList userRole={user.email === 'dinkuh12@gmail.com' ? UserRole.ADMIN : profile?.role} />
              ) : (
                <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
                  <ShieldAlert size={48} className="text-destructive" />
                  <h3 className="text-xl font-semibold">Access Denied</h3>
                  <p className="text-muted-foreground max-w-xs">You do not have permission to view staff management.</p>
                </div>
              )
            )}
            {activeTab === 'settings' && (
              (profile?.role === UserRole.ADMIN || user.email === 'dinkuh12@gmail.com') ? (
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
