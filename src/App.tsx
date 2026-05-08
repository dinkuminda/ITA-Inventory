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
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
  }, [navigate, location.pathname]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isForgotPassword) {
      setLoading(true);
      try {
        await authService.sendPasswordResetEmail(email.trim().toLowerCase());
        toast.success("Password reset link sent! Please check your email.");
        setIsForgotPassword(false);
      } catch (error: any) {
        toast.error(error.message || "Failed to send reset email");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    const cleanEmail = email.trim().toLowerCase();
    
    try {
      if (isSignUp) {
        await authService.signup(cleanEmail, password, displayName);
        toast.success("Registration successful! Please check your email inbox for a confirmation link.", { duration: 10000 });
        setIsSignUp(false);
        setPassword('');
        setConfirmPassword('');
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
              {isForgotPassword ? (
                <div className="space-y-6">
                  <div className="text-center">
                    <h2 className="text-xl font-bold text-slate-800">Reset Password</h2>
                    <p className="text-sm text-slate-500 mt-2">Enter your email and we'll send you a link to reset your password.</p>
                  </div>
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
                  <div className="pt-2">
                    <Button 
                      type="submit" 
                      className="w-full h-16 rounded-[1.25rem] bg-[#0066FF] hover:bg-[#0052CC] text-white text-lg font-bold shadow-xl shadow-blue-500/20 transition-all active:scale-[0.98] border-none" 
                      disabled={loading}
                    >
                      Send Reset Link
                    </Button>
                  </div>
                  <div className="text-center">
                    <button 
                      type="button" 
                      onClick={() => setIsForgotPassword(false)}
                      className="text-sm font-bold text-slate-500 hover:text-slate-700 underline"
                    >
                      Back to Login
                    </button>
                  </div>
                </div>
              ) : (
                <>
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
                        placeholder={isSignUp ? "Create Password *" : "Password *"}
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

                  {isSignUp && (
                    <div className="space-y-1">
                      <div className="relative">
                        <Input
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Confirm Password *"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="rounded-2xl h-14 bg-slate-50 border-slate-100 focus:bg-white focus:ring-primary focus:border-primary transition-all text-base px-6 pr-14 placeholder:text-slate-400 shadow-sm"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors focus:outline-none"
                        >
                          {showConfirmPassword ? <EyeOff size={22} strokeWidth={2.5} /> : <Eye size={22} strokeWidth={2.5} />}
                        </button>
                      </div>
                    </div>
                  )}

                  {!isSignUp && (
                    <div className="text-right px-2">
                      <button 
                        type="button" 
                        onClick={() => setIsForgotPassword(true)}
                        className="text-sm font-bold text-[#0066FF] hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>
                  )}
                  
                  <div className="pt-2">
                    <Button 
                      type="submit" 
                      className="w-full h-16 rounded-[1.25rem] bg-[#0066FF] hover:bg-[#0052CC] text-white text-lg font-bold shadow-xl shadow-blue-500/20 transition-all active:scale-[0.98] border-none" 
                      disabled={loading}
                    >
                      {isSignUp ? "Sign Up" : "Log In"}
                    </Button>
                  </div>
                </>
              )}
            </form>
            
            {!isForgotPassword && (
              <>
                <div className="text-center pt-2">
                  <button 
                    type="button"
                    onClick={() => {
                      setIsSignUp(!isSignUp);
                      setPassword('');
                      setConfirmPassword('');
                    }}
                    className="text-[#0066FF] hover:underline font-bold text-lg transition-all"
                  >
                    {isSignUp ? "Already have an account? Log In" : "Don't have an account? Sign Up"}
                  </button>
                </div>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-slate-100" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase px-4">
                    <span className="bg-white px-2 text-slate-400 font-bold italic tracking-widest">Or</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <Button 
                    variant="outline" 
                    className="w-full h-14 rounded-2xl border-slate-100 bg-[#F8FAFC] hover:bg-slate-50 gap-3 text-slate-600 font-bold transition-all"
                    onClick={() => authService.signInWithOAuth('facebook').catch(err => toast.error(err.message))}
                    disabled={loading}
                  >
                    <svg className="w-6 h-6 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                    Continue with Facebook
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full h-14 rounded-2xl border-slate-100 bg-[#F8FAFC] hover:bg-slate-50 gap-3 text-slate-600 font-bold transition-all"
                    onClick={() => authService.signInWithOAuth('google').catch(err => toast.error(err.message))}
                    disabled={loading}
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#EA4335" d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.273 0 3.191 2.727 1.173 6.691l4.093 3.074z"/><path fill="#34A853" d="M12 24c3.155 0 5.8-1.045 7.736-2.836l-3.927-3.045c-1.045.7-2.382 1.127-3.809 1.127-2.927 0-5.418-1.973-6.3-4.627L1.645 17.69C3.655 21.327 7.536 24 12 24z"/><path fill="#4285F4" d="M23.491 12.273c0-.782-.064-1.545-.191-2.273H12v4.545h6.455c-.282 1.482-1.118 2.736-2.373 3.582l3.927 3.045c2.291-2.118 3.482-5.145 3.482-8.9z"/><path fill="#FBBC05" d="M5.7 14.655a6.83 6.83 0 0 1-.364-2.182c0-.764.127-1.5.364-2.182L1.609 7.218C.582 9.273 0 11.582 0 14c0 2.418.582 4.727 1.609 6.782l4.091-3.127z"/></svg>
                    Continue with Google
                  </Button>
                </div>
              </>
            )}

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
