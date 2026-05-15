/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from "react";
import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation, Link } from 'react-router-dom';
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
import { Boxes, Key, ShieldAlert, Settings as SettingsIcon, Eye, EyeOff, LayoutDashboard, Users, UserCircle, Fingerprint } from 'lucide-react';
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

  const BottomNav = ({ profile }: { profile: any }) => {
    const isAdmin = profile?.role === UserRole.ADMIN;
    
    const navItems = [
      { path: '/dashboard', label: 'Home', icon: LayoutDashboard },
      { path: '/assets', label: 'Assets', icon: Boxes },
      ...(isAdmin ? [
        { path: '/staff', label: 'Staff', icon: Users },
        { path: '/settings', label: 'System', icon: SettingsIcon },
      ] : [
        { path: '/licenses', label: 'Keys', icon: Key },
        { path: '/maintenance', label: 'Service', icon: ShieldAlert },
      ])
    ];

    return (
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-xl border-t border-border z-40 px-2 h-16 safe-area-bottom shadow-[0_-4px_12px_-4px_rgba(0,0,0,0.1)]">
        <div className="flex items-center justify-around h-full">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center gap-1 min-w-[60px] flex-1 transition-all duration-300 ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <div className={`p-1.5 rounded-xl transition-all duration-300 transform ${isActive ? 'bg-primary/10 scale-110' : 'bg-transparent'}`}>
                  <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className={`text-[9px] font-bold uppercase tracking-widest transition-all duration-300 ${isActive ? 'opacity-100 translate-y-0' : 'opacity-60 -translate-y-0.5'}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d2a4a] text-primary">
        <div className="flex flex-col items-center gap-8">
          <div className="relative">
             <div className="animate-spin rounded-full h-24 w-24 border-[4px] border-white/5 border-t-primary"></div>
             <Fingerprint className="absolute inset-0 m-auto h-10 w-10 text-primary animate-pulse" />
          </div>
          <div className="text-center space-y-2">
            <p className="text-3xl font-black tracking-tighter text-white uppercase">ICS Directorate</p>
            <p className="text-[10px] text-white/40 font-bold uppercase tracking-[0.3em] animate-pulse">Initializing Security Protocol</p>
          </div>
        </div>
      </div>
    );
  }

  // Authentication Routes
  if (!user) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-[#0d2a4a] p-4 relative overflow-hidden">
          {/* Decorative background elements */}
          <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px]" />
          
          <div className="w-full max-w-md space-y-8 bg-card/95 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-2xl border border-white/10 z-10">
            <div className="text-center space-y-3">
              <div className="mx-auto w-24 h-24 bg-primary/15 text-primary rounded-[2rem] flex items-center justify-center mb-6 shadow-inner border border-primary/10">
                <Fingerprint size={48} strokeWidth={1.2} className="animate-pulse" />
              </div>
              <div className="space-y-2">
                <h1 className="text-5xl font-black tracking-tighter text-foreground uppercase">ICS</h1>
                <div className="flex flex-col gap-1">
                  <p className="text-[11px] font-black text-foreground uppercase tracking-[0.1em]">የኢሚግሬሽንና የዜግነት አገልግሎት</p>
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-tight">
                    Immigration and Citizenship Service
                  </p>
                </div>
              </div>
              <div className="h-px w-12 bg-primary/20 mx-auto mt-4" />
              <p className="text-xs text-muted-foreground font-bold uppercase tracking-[0.2em] pt-2">
                Inventory Management System
              </p>
            </div>

            {signupSuccess ? (
              <div className="space-y-6 animate-in fade-in zoom-in duration-300">
                <div className="mx-auto w-16 h-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center">
                  <ShieldAlert size={32} />
                </div>
                <div className="text-center space-y-3">
                  <h2 className="text-xl font-semibold text-foreground">
                    {isResendMode ? "Verify your email" : "Check your inbox"}
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {isResendMode 
                      ? <>Verification for <span className="text-primary font-semibold">{lastRegisteredEmail}</span> is pending.</>
                      : <>An activation link has been sent to <span className="text-primary font-semibold">{lastRegisteredEmail}</span>.</>
                    }
                  </p>
                  <div className="p-4 bg-muted rounded-lg text-left border border-border text-xs space-y-2">
                    <p className="font-bold text-foreground">Next Steps:</p>
                    <ul className="space-y-1 list-disc pl-4 text-muted-foreground">
                      <li>Click the verification link in your email.</li>
                      <li>Check your spam folder if you don't see it.</li>
                      <li className="text-amber-600">Verification is required before log in.</li>
                    </ul>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  className="w-full h-11"
                  onClick={() => {
                    setSignupSuccess(false);
                    setIsSignUp(false);
                  }}
                >
                  Back to Login
                </Button>
              </div>
            ) : (
              <form onSubmit={handleAuth} className="space-y-4">
                {isForgotPassword ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <h2 className="text-lg font-semibold text-foreground">Reset Password</h2>
                    <p className="text-xs text-muted-foreground mt-1">We'll send a recovery link to your registered email.</p>
                  </div>
                  <Input
                    type="email"
                    placeholder="Email Address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11"
                    required
                  />
                  <Button type="submit" className="w-full h-11 transition-all" disabled={loading}>
                    Send Reset Link
                  </Button>
                  <div className="text-center">
                    <button 
                      type="button" 
                      onClick={() => setIsForgotPassword(false)}
                      className="text-xs font-medium text-muted-foreground hover:text-primary underline"
                    >
                      Back to Login
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {isSignUp && (
                    <Input
                      type="text"
                      placeholder="Full Name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="h-11"
                      required
                    />
                  )}
                  <Input
                    type="email"
                    placeholder="Email Address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11"
                    required
                  />
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-11 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  {isSignUp && (
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm Password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="h-11 pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      >
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  )}

                  {!isSignUp && (
                    <div className="text-right">
                      <button 
                        type="button" 
                        onClick={() => setIsForgotPassword(true)}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>
                  )}
                  
                  <Button type="submit" className="w-full h-11" disabled={loading}>
                    {loading ? "Processing..." : (isSignUp ? "Create Account" : "Sign In")}
                  </Button>
                </>
              )}
            </form>
            )}
            
            {!isForgotPassword && !signupSuccess && (
              <div className="text-center">
                <button 
                  type="button"
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-primary hover:underline text-sm font-medium"
                >
                  {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
                </button>
              </div>
            )}

            <div className="text-center pt-6 border-t border-border mt-4">
              <div className="flex items-center justify-center gap-2">
                <div className={`h-2 w-2 rounded-full ${import.meta.env.VITE_SUPABASE_URL ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                  System Status: {import.meta.env.VITE_SUPABASE_URL ? 'Online' : 'Offline'}
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
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-background text-foreground font-sans">
        <AppSidebar
          user={{ 
            email: user.email || '', 
            displayName: effectiveProfile?.displayName || user.displayName || 'Admin',
            role: effectiveProfile?.role || UserRole.STAFF
          }}
          onLogout={handleLogout}
        />
        <main className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/80 backdrop-blur-md px-6">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="h-9 w-9" />
              <div className="h-4 w-px bg-border" />
              <h1 className="text-sm font-semibold text-foreground">
                Dashboard
              </h1>
            </div>
            
            <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-semibold text-foreground">{effectiveProfile?.displayName}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{effectiveProfile?.role?.toLowerCase()}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-md">
                  <SettingsIcon size={18} className="text-muted-foreground" />
                </Button>
            </div>
          </header>
          
          <div className="p-4 md:p-8 max-w-7xl mx-auto w-full pb-24 md:pb-8">
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
                  <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-6">
                    <div className="p-6 bg-muted text-muted-foreground rounded-full">
                      <SettingsIcon size={48} strokeWidth={1.5} />
                    </div>
                    <div className="space-y-2">
                       <h2 className="text-2xl font-bold tracking-tight text-foreground">System Settings</h2>
                       <p className="text-sm text-muted-foreground max-w-sm mx-auto">Configure core infrastructure parameters and user access policies.</p>
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
        <BottomNav profile={effectiveProfile} />
      </div>
      <Toaster position="top-right" richColors closeButton />
    </SidebarProvider>
  );
}
