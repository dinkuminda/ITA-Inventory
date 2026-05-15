/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  LayoutDashboard,
  Boxes,
  Laptop,
  Key,
  ShieldAlert,
  Users,
  Settings,
  LogOut,
  Menu,
  Fingerprint
} from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserRole } from '@/src/types';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: Laptop, label: 'Assets', path: '/assets' },
  { icon: Key, label: 'Licenses', path: '/licenses' },
  { icon: ShieldAlert, label: 'Maintenance', path: '/maintenance' },
  { icon: Users, label: 'Staff', path: '/staff' },
];

interface AppSidebarProps {
  user?: { email: string; displayName: string; role: UserRole };
  onLogout: () => void;
}

export function AppSidebar({ user, onLogout }: AppSidebarProps) {
  const navigate = useNavigate();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  const filteredNavItems = navItems.filter(item => {
    if (item.path === '/staff' && user?.role !== UserRole.ADMIN) return false;
    return true;
  });

  return (
    <Sidebar collapsible="icon" className="border-r border-border bg-sidebar h-full text-foreground shadow-none">
      <SidebarHeader className={`transition-all ${isCollapsed ? 'items-center px-2 py-4' : 'p-6'}`}>
        <div className="flex items-center gap-3">
          <div className="bg-primary text-primary-foreground p-2 rounded-xl shadow-lg shadow-primary/20">
            <Fingerprint size={22} />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="font-black text-base tracking-tighter text-foreground uppercase leading-none">ICS</span>
              <span className="text-[8px] font-black text-muted-foreground uppercase tracking-[0.1em] mt-1">Immigration Service</span>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent className="py-4 px-3">
        <SidebarMenu className="gap-2">
          {filteredNavItems.map((item) => (
            <SidebarMenuItem key={item.path}>
              <NavLink to={item.path} className="w-full">
                {({ isActive }) => (
                  <SidebarMenuButton
                    isActive={isActive}
                    tooltip={item.label}
                    className={`h-12 px-4 rounded-2xl transition-all duration-300 ${
                      isActive 
                        ? 'bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/20 scale-[1.02]' 
                        : 'text-muted-foreground hover:bg-muted font-bold'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                      {!isCollapsed && <span className="text-sm tracking-tight">{item.label}</span>}
                    </div>
                  </SidebarMenuButton>
                )}
              </NavLink>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className={`p-4 mt-auto border-t border-border/50 bg-muted/20 ${isCollapsed ? 'px-2' : ''}`}>
        <SidebarMenu className="gap-2">
          <SidebarMenuItem>
            <div className={`flex items-center gap-3 py-3 ${isCollapsed ? 'justify-center transition-all' : 'px-2'}`}>
              <Avatar className="h-10 w-10 shrink-0 border-2 border-background shadow-md">
                <AvatarFallback className="bg-primary text-primary-foreground font-black text-xs">
                  {user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              {!isCollapsed && (
                <div className="flex flex-col min-w-0 transition-opacity duration-300">
                  <span className="text-sm font-bold truncate text-foreground leading-none mb-1">{user?.displayName || 'User'}</span>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">{user?.role?.toLowerCase()}</span>
                </div>
              )}
            </div>
          </SidebarMenuItem>
          {user?.role === UserRole.ADMIN && (
            <SidebarMenuItem>
              <NavLink to="/settings" className="w-full">
                {({ isActive }) => (
                  <SidebarMenuButton 
                    isActive={isActive}
                    tooltip="Settings"
                    className={`h-12 px-4 rounded-2xl transition-all duration-300 ${
                      isActive 
                        ? 'bg-accent text-accent-foreground font-bold shadow-sm' 
                        : 'text-muted-foreground hover:bg-muted font-bold'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <Settings size={20} strokeWidth={isActive ? 2.5 : 2} />
                      {!isCollapsed && <span className="text-sm font-bold tracking-tight">Settings</span>}
                    </div>
                  </SidebarMenuButton>
                )}
              </NavLink>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton 
              onClick={onLogout} 
              tooltip="Logout"
              className={`h-12 px-4 rounded-2xl text-destructive hover:bg-destructive/10 transition-all font-bold ${isCollapsed ? 'justify-center' : ''}`}
            >
              <div className="flex items-center gap-4">
                <LogOut size={20} strokeWidth={2.5} />
                {!isCollapsed && <span className="text-sm font-bold tracking-tight">Log Out</span>}
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
