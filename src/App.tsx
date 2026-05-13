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
      <div className="min-h-screen flex items-center justify-center bg-background text-primary">
        <div className="flex flex-col items-center gap-8">
          <div className="relative">
             <div className="animate-spin rounded-full h-20 w-20 border-[4px] border-secondary border-t-primary"></div>
             <Boxes className="absolute inset-0 m-auto h-8 w-8 text-primary" />
          </div>
          <div className="text-center space-y-2">
            <p className="text-2xl font-black tracking-tight text-foreground">ITA Directorate</p>
            <p className="text-sm text-muted-foreground font-medium animate-pulse">Establishing secure session...</p>
          </div>
        </div>
      </div>
    );
  }

  // Authentication Routes
  if (!user) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-background p-4 sm:p-8">
          <div className="w-full max-w-lg space-y-12 bg-card p-8 sm:p-12 rounded-[2.5rem] shadow-xl shadow-primary/5 border border-border mt-[-10vh]">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-primary/10 text-primary rounded-3xl flex items-center justify-center mb-6">
                <Boxes size={32} />
              </div>
              <h1 className="text-4xl font-black tracking-tight text-foreground italic">ITA Directorate</h1>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.25em] opacity-80">
                Next-Gen Inventory Control
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
                    variant="secondary" 
                    className="w-full h-16 rounded-3xl font-bold text-secondary-foreground text-lg shadow-sm"
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
                    <h2 className="text-xl font-bold text-foreground">Reset Password</h2>
                    <p className="text-sm text-muted-foreground mt-2">Enter your email and we'll send you a link to reset your password.</p>
                  </div>
                  <div className="space-y-1">
                    <Input
                      type="email"
                      placeholder="Email Address *"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="rounded-2xl h-14 bg-muted border-none focus:ring-2 focus:ring-primary transition-all text-base px-6 placeholder:text-muted-foreground shadow-sm"
                      required
                    />
                  </div>
                  <div className="pt-2">
                    <Button 
                      type="submit" 
                      className="w-full h-16 rounded-3xl bg-primary hover:opacity-90 text-primary-foreground text-lg font-bold shadow-lg shadow-primary/20 transition-all active:scale-[0.98] border-none" 
                      disabled={loading}
                    >
                      Send Reset Link
                    </Button>
                  </div>
                  <div className="text-center">
                    <button 
                      type="button" 
                      onClick={() => setIsForgotPassword(false)}
                      className="text-sm font-bold text-muted-foreground hover:text-foreground underline"
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
                        className="rounded-2xl h-14 bg-muted border-none focus:ring-2 focus:ring-primary transition-all text-base px-6 placeholder:text-muted-foreground shadow-sm"
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
                      className="rounded-2xl h-14 bg-muted border-none focus:ring-2 focus:ring-primary transition-all text-base px-6 placeholder:text-muted-foreground shadow-sm"
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
                        className="rounded-2xl h-14 bg-muted border-none focus:ring-2 focus:ring-primary transition-all text-base px-6 pr-14 placeholder:text-muted-foreground shadow-sm"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors focus:outline-none"
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
                          className="rounded-2xl h-14 bg-muted border-none focus:ring-2 focus:ring-primary transition-all text-base px-6 pr-14 placeholder:text-muted-foreground shadow-sm"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors focus:outline-none"
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
                        className="text-sm font-bold text-primary hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>
                  )}
                  
                  <div className="pt-2">
                    <Button 
                      type="submit" 
                      className="w-full h-16 rounded-3xl bg-primary hover:opacity-90 text-primary-foreground text-lg font-bold shadow-lg shadow-primary/20 transition-all active:scale-[0.98] border-none" 
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
                    className="text-primary hover:underline font-bold text-lg transition-all"
                  >
                    {isSignUp ? "Already have an account? Log In" : "Don't have an account? Sign Up"}
                  </button>
                </div>
              </>
            )}

            <div className="text-center pt-6 border-t border-border flex flex-col items-center gap-3">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.25em]">
                Authorized Personnel Only
              </p>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-secondary rounded-full border border-border">
                <div className={`h-1.5 w-1.5 rounded-full ${import.meta.env.VITE_SUPABASE_URL ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">
                  {import.meta.env.VITE_SUPABASE_URL ? 'Supabase Active' : 'Supabase Not Configured'}
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
      <div className="flex min-h-screen w-full bg-background text-foreground font-sans">
        <AppSidebar
          user={{ 
            email: user.email || '', 
            displayName: effectiveProfile?.displayName || user.displayName || 'Admin',
            role: effectiveProfile?.role || UserRole.STAFF
          }}
          onLogout={handleLogout}
        />
        <main className="flex-1 overflow-auto flex flex-col">
          <header className="sticky top-0 z-10 flex h-24 items-center justify-between border-b bg-background/95 backdrop-blur-md px-10 border-border/10">
            <div className="flex items-center gap-6">
              <SidebarTrigger className="hover:bg-secondary rounded-[2rem] h-14 w-14 shadow-sm border border-border/5" />
              <div className="h-10 w-[2px] bg-border rounded-full" />
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-primary uppercase tracking-[0.4em] leading-none mb-1.5">
                  Authority Hub
                </span>
                <span className="text-sm font-bold text-foreground">
                  {effectiveProfile?.role === UserRole.ADMIN ? 'Architect Strategy Console' : 'Operator Logistics Console'}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
                <div className="mr-4 hidden lg:block">
                  <p className="text-right text-[10px] font-bold text-muted-foreground uppercase opacity-60 tracking-widest">Protocol Status: Secure</p>
                  <p className="text-right text-xs font-bold text-foreground">{effectiveProfile?.email}</p>
                </div>
                <Button variant="secondary" size="icon" className="h-14 w-14 rounded-[2rem] shadow-sm border border-border/5 group">
                  <SettingsIcon size={24} className="text-muted-foreground group-hover:text-primary transition-colors" />
                </Button>
            </div>
          </header>
          
          <div className="p-10 max-w-7xl mx-auto w-full animate-in fade-in slide-in-from-bottom-6 duration-1000">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard userRole={effectiveProfile?.role} userEmail={effectiveProfile?.email || user?.email} />} />
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
                  <div className="flex flex-col items-center justify-center min-h-[500px] text-center space-y-12 animate-in zoom-in duration-1000">
                    <div className="p-12 bg-secondary text-primary rounded-[4rem] shadow-2xl shadow-primary/5">
                      <SettingsIcon size={100} strokeWidth={1} />
                    </div>
                    <div className="space-y-4 max-w-md">
                       <h2 className="text-4xl font-extrabold tracking-tight text-foreground">Infrastructure Control</h2>
                       <p className="text-muted-foreground font-medium italic">Execute core systemic modifications, protocol overrides, and security inheritance mapping.</p>
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
