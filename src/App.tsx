/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from "react";
import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
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
import { Boxes, Key, ShieldAlert, Settings as SettingsIcon, Eye, EyeOff } from 'lucide-react';
import { authService } from './lib/authService';
import { supabase } from './lib/supabase';
import { UserProfile, UserRole } from './types';
import { toast } from 'sonner';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Auth Form State
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const unsubscribe = authService.subscribeAuth(async (authUser) => {
      setUser(authUser);
      if (authUser) {
        setLoading(true);
        const userProfile = await authService.ensureProfile(authUser);
        setProfile(userProfile);
        
        // If they are on root or login, send them to dashboard
        if (location.pathname === '/' || location.pathname === '/login') {
          navigate('/dashboard');
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const cleanEmail = email.trim().toLowerCase();
    
    try {
      if (isSignUp) {
        await authService.signup(cleanEmail, password, displayName);
        toast.success("Registration successful! Please check your email inbox for a confirmation link.", { duration: 10000 });
        setIsSignUp(false);
        setPassword('');
      } else {
        try {
          await authService.login(cleanEmail, password);
          toast.success("Welcome back!");
        } catch (loginError: any) {
          if (loginError.message.includes("Login failed:")) {
            toast.error(loginError.message, { duration: 6000 });
            throw loginError;
          }

          const { data: employee } = await supabase
            .from('employees')
            .select('id')
            .ilike('email', cleanEmail)
            .maybeSingle();
          
          if (employee) {
            toast.error("Account not found. Please click the 'Don't have an account? Sign Up' link to activate your profile.", { duration: 5000 });
          } else {
            toast.error("Invalid credentials or unauthorized email. Please contact an administrator.");
          }
          throw loginError;
        }
      }
    } catch (error: any) {
      console.error('Auth handler error:', error);
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
      navigate('/');
    } catch (error) {
      toast.error("Logout failed");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-blue-600">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
             <div className="animate-spin rounded-full h-16 w-16 border-[3px] border-slate-200 border-t-blue-600"></div>
             <Boxes className="absolute inset-0 m-auto h-6 w-6 text-blue-600" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-lg font-bold text-slate-800">ITA Inventory</p>
            <p className="text-sm text-slate-400 font-medium animate-pulse">Establishing secure session...</p>
          </div>
        </div>
      </div>
    );
  }

  // Authentication Routes
  if (!user) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4 font-sans text-[#475569]">
          <div className="w-full max-w-md space-y-10 bg-white p-10 rounded-[2.5rem] shadow-2xl shadow-blue-500/5 border border-slate-100">
            <div className="text-center space-y-3">
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">ITA Inventory</h1>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-[0.2em] opacity-60">
                Directorate Inventory System
              </p>
            </div>

            <form onSubmit={handleAuth} className="space-y-6">
              {isSignUp && (
                <div className="space-y-1">
                  <Input
                    type="text"
                    placeholder="Full Name *"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="rounded-2xl h-14 bg-slate-50 border-slate-100 focus:bg-white focus:ring-primary focus:border-primary transition-all text-base px-6 placeholder:text-slate-400 shadow-sm"
                    required
                  />
                </div>
              )}
              <div className="space-y-1">
                <Input
                  type="email"
                  placeholder="Email Address *"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-2xl h-14 bg-slate-50 border-slate-100 focus:bg-white focus:ring-primary focus:border-primary transition-all text-base px-6 placeholder:text-slate-400 shadow-sm"
                  required
                />
              </div>
              <div className="space-y-1">
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password *"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="rounded-2xl h-14 bg-slate-50 border-slate-100 focus:bg-white focus:ring-primary focus:border-primary transition-all text-base px-6 pr-14 placeholder:text-slate-400 shadow-sm"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors focus:outline-none"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={22} strokeWidth={2.5} /> : <Eye size={22} strokeWidth={2.5} />}
                  </button>
                </div>
              </div>
              
              <div className="pt-4">
                <Button 
                  type="submit" 
                  className="w-full h-16 rounded-[1.25rem] bg-[#0066FF] hover:bg-[#0052CC] text-white text-lg font-bold shadow-xl shadow-blue-500/20 transition-all active:scale-[0.98] border-none" 
                  disabled={loading}
                >
                  {isSignUp ? "Create Account" : "Log In"}
                </Button>
              </div>
            </form>
            
            <div className="text-center pt-4">
              <button 
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-[#0066FF] hover:underline font-bold text-lg transition-all"
              >
                {isSignUp ? "Already have an account? Log In" : "Don't have an account? Sign Up"}
              </button>
            </div>

            <div className="text-center pt-6 border-t border-slate-50">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.25em]">
                Authorized Personnel Only
              </p>
            </div>
          </div>
        </div>
        <Toaster />
      </>
    );
  }

  // Denied Access Screen
  if (user && !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-sm p-10 bg-white border border-slate-100 rounded-[2.5rem] shadow-2xl shadow-rose-500/5 text-center space-y-8">
          <div className="mx-auto w-20 h-20 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center shadow-lg shadow-rose-500/10 rotate-3">
            <ShieldAlert size={40} strokeWidth={2.5} />
          </div>
          <div className="space-y-3">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Access Denied</h2>
            <p className="text-sm text-slate-500 leading-relaxed font-medium">
              Your account (<span className="text-slate-900 font-bold">{user.email}</span>) is authenticated but not yet authorized by the Directorate.
            </p>
          </div>
          <Button variant="outline" className="w-full h-14 rounded-2xl border-slate-200 font-bold text-slate-600 hover:bg-slate-50" onClick={handleLogout}>
            Return to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-[#fdfdfd] text-slate-600">
        <AppSidebar
          user={{ 
            email: user.email || '', 
            displayName: profile?.displayName || user.displayName || 'Admin',
            role: profile?.role || UserRole.STAFF
          }}
          onLogout={handleLogout}
        />
        <main className="flex-1 overflow-auto">
          <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-white/80 backdrop-blur-md px-8">
            <SidebarTrigger className="hover:bg-slate-100 rounded-xl" />
            <div className="flex-1 flex items-center gap-4">
               <div className="h-6 w-px bg-slate-200" />
               <span className="text-xs font-black text-blue-600 uppercase tracking-[0.2em]">
                 {profile?.role || 'Guest Access'}
               </span>
            </div>
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-600 rounded-xl">
                  <SettingsIcon size={20} />
                </Button>
            </div>
          </header>
          
          <div className="p-8 max-w-7xl mx-auto w-full">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard userRole={profile?.role} userEmail={profile?.email || user?.email} />} />
              <Route path="/assets" element={<AssetsList userRole={profile?.role} userEmail={profile?.email || user?.email} />} />
              <Route path="/licenses" element={<LicensesList userRole={profile?.role} userEmail={profile?.email || user?.email} />} />
              <Route path="/maintenance" element={<MaintenanceList userRole={profile?.role} userEmail={profile?.email || user?.email} />} />
              <Route path="/staff" element={
                profile?.role === UserRole.ADMIN ? (
                  <StaffList userRole={profile?.role} />
                ) : (
                  <Navigate to="/dashboard" replace />
                )
              } />
              <Route path="/settings" element={
                profile?.role === UserRole.ADMIN ? (
                  <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-6">
                    <div className="p-6 bg-slate-50 text-slate-400 rounded-[2rem] shadow-sm">
                      <SettingsIcon size={64} strokeWidth={1.5} />
                    </div>
                    <div className="space-y-2">
                       <h2 className="text-2xl font-black text-slate-900 tracking-tight">System Settings</h2>
                       <p className="text-slate-500 max-w-sm mx-auto font-medium">Configure notification thresholds, asset categories, and global user policies.</p>
                    </div>
                  </div>
                ) : (
                  <Navigate to="/dashboard" replace />
                )
              } />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </div>
        </main>
      </div>
      <Toaster position="top-right" richColors closeButton />
    </SidebarProvider>
  );
}
