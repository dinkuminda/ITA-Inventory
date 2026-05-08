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
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [lastRegisteredEmail, setLastRegisteredEmail] = useState('');
  const [isResendMode, setIsResendMode] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const unsubscribe = authService.subscribeAuth(async (authUser) => {
      if (!isMounted) return;
      
      setUser(authUser);
      if (authUser) {
        setLoading(true);
        try {
          // Add a small delay for Supabase to finish database setup on first signup
          const userProfile = await authService.ensureProfile(authUser);
          
          if (isMounted) {
            setProfile(userProfile);
            
            // If they are on root or login, send them to dashboard
            if (location.pathname === '/' || location.pathname === '/login') {
              navigate('/dashboard');
            }
          }
        } catch (err) {
          console.error('Initial profile load failed:', err);
          if (isMounted) toast.error("Account synchronization issues detected. Please log out and back in.");
        }
      } else {
        if (isMounted) setProfile(null);
      }
      if (isMounted) setLoading(false);
    });
    
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isForgotPassword) {
      if (!email.trim()) {
        toast.error("Please enter your email address");
        return;
      }
      setLoading(true);
      try {
        await authService.sendPasswordResetEmail(email.trim().toLowerCase());
        toast.success("Reset link sent! Please check your inbox.");
        setIsForgotPassword(false);
      } catch (error: any) {
        toast.error(error.message || "Failed to send reset email");
      } finally {
        setLoading(false);
      }
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    setLoading(true);
    
    try {
      if (isSignUp) {
        console.log('[App] Beginning Signup process for:', cleanEmail);
        
        if (!displayName.trim()) {
          throw new Error("Please enter your full name.");
        }
        if (password.length < 6) {
          throw new Error("Password must be at least 6 characters long.");
        }
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match. Please verify them.");
        }
        
        const result = await authService.signup(cleanEmail, password, displayName);
        
        console.log('[App] Signup service call completed:', result);

        setLastRegisteredEmail(cleanEmail);
        setIsResendMode(result.isExistingUnconfirmed || false);
        setSignupSuccess(true);
        
        // Success feedback
        toast.success(result.isExistingUnconfirmed ? "Resending activation info..." : "Account created successfully!");
        
        // Reset local state
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setDisplayName('');
      } else {
        console.log('[App] Beginning Login process for:', cleanEmail);
        try {
          await authService.login(cleanEmail, password);
          toast.success("Signed in successfully");
        } catch (loginError: any) {
          console.error('[App] Login Error:', loginError);
          const msg = loginError.message || "";
          
          if (msg.includes("Activation Required")) {
            toast.error("Verify your email", {
              description: "Supabase requires email activation before you can log in.",
              duration: 8000
            });
            // Helpfully toggle to a "resend" or "check email" view if we had one, 
            // but for now just showing the error is better than silence.
          } else if (msg.includes("Invalid login credentials")) {
            toast.error("Login Failed", { description: "Invalid email or password combination." });
          } else {
            toast.error("Login Failed", { description: msg });
          }
        }
      }
    } catch (error: any) {
      console.error('[App] Auth Operation Error:', error.message);
      toast.error(error.message || "Authentication failed. Please try again.");
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
            <p className="text-lg font-bold text-slate-800">ITA Directorate</p>
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
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">ITA Directorate</h1>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-[0.2em] opacity-60">
                Inventory System
              </p>
            </div>

            {signupSuccess ? (
              <div className="space-y-8 animate-in fade-in zoom-in duration-500">
                <div className="mx-auto w-20 h-20 bg-amber-50 text-amber-600 rounded-[2rem] flex items-center justify-center shadow-lg shadow-amber-500/10">
                  <ShieldAlert size={40} strokeWidth={2.5} />
                </div>
                <div className="text-center space-y-4">
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                    {isResendMode ? "Verify your account" : "Activation Required"}
                  </h2>
                  <p className="text-sm text-slate-500 leading-relaxed font-medium">
                    {isResendMode 
                      ? <>Registration for <span className="text-blue-600 font-bold">{lastRegisteredEmail}</span> was previously initiated but not verified.</>
                      : <>Account created for <span className="text-blue-600 font-bold">{lastRegisteredEmail}</span> on ITA Inventory System.</>
                    }
                  </p>
                  <div className="p-5 bg-blue-50/50 rounded-2xl text-left border border-blue-100 space-y-3">
                    <p className="text-xs text-blue-700 font-bold uppercase tracking-wider">
                       Activation Steps:
                    </p>
                    <ul className="text-xs text-blue-600/90 space-y-3 list-disc pl-4 font-medium leading-relaxed">
                      <li>Check your inbox for a verification email from Supabase.</li>
                      <li>Click the <span className="font-bold underline text-blue-700">Confirm Email</span> button in the email.</li>
                      <li>Check your <span className="font-bold text-slate-800">Spam/Junk</span> folder if missing.</li>
                      <li className="text-slate-600 italic">Once verified, return here to log in with your credentials.</li>
                      <li className="text-amber-600 font-bold">Important: You cannot log in without verifying your email first.</li>
                    </ul>
                  </div>
                </div>
                <div className="pt-4">
                  <Button 
                    variant="outline" 
                    className="w-full h-16 rounded-2xl border-slate-200 font-bold text-slate-600 hover:bg-slate-50 text-lg shadow-sm"
                    onClick={() => {
                      setSignupSuccess(false);
                      setIsSignUp(false);
                      setIsResendMode(false);
                      setEmail('');
                      setPassword('');
                      setConfirmPassword('');
                      setDisplayName('');
                    }}
                  >
                    Return to Login
                  </Button>
                </div>
              </div>
            ) : (
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
                      {loading ? (
                        <div className="flex items-center gap-3">
                          <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Processing...</span>
                        </div>
                      ) : (
                        isSignUp ? "Sign Up" : "Log In"
                      )}
                    </Button>
                  </div>
                </>
              )}
            </form>
            )}
            
            {!isForgotPassword && !signupSuccess && (
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
              </>
            )}

            <div className="text-center pt-6 border-t border-slate-50 flex flex-col items-center gap-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.25em]">
                Authorized Personnel Only
              </p>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 rounded-full border border-slate-100">
                <div className={`h-1.5 w-1.5 rounded-full ${!supabase.supabaseUrl.includes('placeholder') ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                  {(!supabase.supabaseUrl.includes('placeholder')) ? 'Supabase Active' : 'Supabase Not Configured'}
                </span>
              </div>
            </div>
          </div>
        </div>
        <Toaster position="top-right" richColors closeButton />
      </>
    );
  }


  // Fallback for authenticated users without profile
  const effectiveProfile = profile || (user ? {
    id: user.id,
    email: user.email || '',
    displayName: user.user_metadata?.display_name || user.email?.split('@')[0] || 'User',
    role: (user.email?.toLowerCase().trim() === 'dinkuh12@gmail.com') ? UserRole.ADMIN : UserRole.STAFF
  } : null);

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="flex min-h-screen w-full bg-[#fdfdfd] text-slate-600">
        <AppSidebar
          user={{ 
            email: user.email || '', 
            displayName: effectiveProfile?.displayName || user.displayName || 'Admin',
            role: effectiveProfile?.role || UserRole.STAFF
          }}
          onLogout={handleLogout}
        />
        <main className="flex-1 overflow-auto">
          <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-white/80 backdrop-blur-md px-8">
            <SidebarTrigger className="hover:bg-slate-100 rounded-xl" />
            <div className="flex-1 flex items-center gap-4">
               <div className="h-6 w-px bg-slate-200" />
               <span className="text-xs font-black text-blue-600 uppercase tracking-[0.2em]">
                 {effectiveProfile?.role || 'Guest Access'}
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
              <Route path="/dashboard" element={<Dashboard userRole={effectiveProfile?.role} userEmail={effectiveProfile?.email || user?.email} systemName="ITA Directorate Inventory" />} />
              <Route path="/assets" element={<AssetsList userRole={effectiveProfile?.role} userEmail={effectiveProfile?.email || user?.email} />} />
              <Route path="/licenses" element={<LicensesList userRole={effectiveProfile?.role} userEmail={effectiveProfile?.email || user?.email} />} />
              <Route path="/maintenance" element={<MaintenanceList userRole={effectiveProfile?.role} userEmail={effectiveProfile?.email || user?.email} />} />
              <Route path="/staff" element={
                effectiveProfile?.role === UserRole.ADMIN ? (
                  <StaffList userRole={effectiveProfile?.role} userEmail={effectiveProfile?.email || user?.email} />
                ) : (
                  <Navigate to="/dashboard" replace />
                )
              } />
              <Route path="/settings" element={
                effectiveProfile?.role === UserRole.ADMIN ? (
                  <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-6">
                    <div className="p-6 bg-slate-50 text-slate-400 rounded-[2rem] shadow-sm">
                      <SettingsIcon size={64} strokeWidth={1.5} />
                    </div>
                    <div className="space-y-2">
                       <h2 className="text-2xl font-black text-slate-900 tracking-tight">System Settings</h2>
                       <p className="text-slate-500 max-w-sm mx-auto font-medium">ICS Evidence configurations, log thresholds, and global security policies.</p>
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
