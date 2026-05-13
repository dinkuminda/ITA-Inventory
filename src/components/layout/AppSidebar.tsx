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
  Menu
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
    <Sidebar collapsible="icon" className="border-r border-border bg-sidebar h-full text-foreground">
      <SidebarHeader className={`transition-all ${isCollapsed ? 'items-center px-2 py-4' : 'p-8'}`}>
        <div className="flex items-center gap-4">
          <div className="bg-primary text-primary-foreground p-3 rounded-2xl shadow-lg shadow-primary/20 shrink-0">
            <Boxes size={28} />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col animate-in fade-in slide-in-from-left-4 duration-500">
              <span className="font-black text-2xl tracking-tighter text-foreground italic">ITA</span>
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">Directory</span>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent className="py-2 px-2">
        <SidebarMenu className="gap-2">
          {filteredNavItems.map((item) => (
            <SidebarMenuItem key={item.path}>
              <NavLink to={item.path} className="w-full">
                {({ isActive }) => (
                  <SidebarMenuButton
                    isActive={isActive}
                    tooltip={item.label}
                    className={`h-14 px-4 rounded-[2rem] transition-all relative group ${
                      isActive 
                        ? 'bg-secondary text-secondary-foreground font-black' 
                        : 'text-muted-foreground hover:bg-accent'
                    }`}
                  >
                    <div className={`flex items-center gap-3 w-full ${isActive ? 'translate-x-1' : ''} transition-transform`}>
                      <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-primary' : ''} />
                      {!isCollapsed && <span className="text-sm tracking-tight">{item.label}</span>}
                    </div>
                  </SidebarMenuButton>
                )}
              </NavLink>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className={`p-4 mt-auto transition-all ${isCollapsed ? 'px-2' : ''}`}>
        <SidebarMenu className="gap-2">
          <SidebarMenuItem>
            <div className={`flex items-center gap-3 py-4 bg-card rounded-[2rem] border border-border shadow-sm transition-all ${isCollapsed ? 'justify-center p-2' : 'px-4'}`}>
              <Avatar className="h-12 w-12 border-2 border-background/50 shrink-0">
                <AvatarFallback className="bg-primary text-primary-foreground font-black text-lg">
                  {user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              {!isCollapsed && (
                <div className="flex flex-col overflow-hidden animate-in fade-in duration-300">
                  <span className="text-sm font-black text-foreground truncate italic">
                    {user?.displayName || 'User'}
                  </span>
                  <span className="text-[10px] text-muted-foreground truncate font-bold tracking-tight">
                    {user?.email}
                  </span>
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
                    className={`h-14 px-4 rounded-[2rem] transition-all ${
                      isActive 
                        ? 'bg-secondary text-secondary-foreground font-black' 
                        : 'text-muted-foreground hover:bg-accent'
                    }`}
                  >
                    <div className={`flex items-center gap-3 w-full ${isActive ? 'translate-x-1' : ''} transition-transform`}>
                      <Settings size={22} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-primary' : ''} />
                      {!isCollapsed && <span className="text-sm tracking-tight font-medium">Settings</span>}
                    </div>
                  </SidebarMenuButton>
                )}
              </NavLink>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton 
              onClick={onLogout} 
              tooltip="Logout Session"
              className={`h-14 px-4 rounded-[2rem] text-destructive hover:bg-destructive/10 transition-all font-black ${isCollapsed ? 'justify-center' : ''}`}
            >
              <div className="flex items-center gap-3 w-full">
                <LogOut size={22} strokeWidth={2.5} />
                {!isCollapsed && <span className="text-sm tracking-tight font-medium">Sign Out</span>}
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
