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
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className={`p-4 border-b bg-slate-50/50 transition-all ${isCollapsed ? 'items-center px-2' : 'p-6'}`}>
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 text-white p-2 rounded-xl shadow-lg shadow-blue-500/20 shrink-0">
            <Boxes size={24} />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col animate-in fade-in duration-300">
              <span className="font-extrabold text-xl tracking-tight text-slate-900 truncate">ITA Directorate</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">Inventory System</span>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent className="py-6 px-3">
        <SidebarMenu className="gap-1">
          {filteredNavItems.map((item) => (
            <SidebarMenuItem key={item.path}>
              <NavLink to={item.path} className="w-full">
                {({ isActive }) => (
                  <SidebarMenuButton
                    isActive={isActive}
                    tooltip={item.label}
                    className={`h-11 px-4 rounded-xl transition-all ${
                      isActive 
                        ? 'bg-blue-50 text-blue-700 font-bold border-r-4 border-blue-600 shadow-sm' 
                        : 'text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    <item.icon size={20} className={isActive ? 'text-blue-600' : ''} />
                    {!isCollapsed && <span className="text-sm ml-2">{item.label}</span>}
                  </SidebarMenuButton>
                )}
              </NavLink>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className={`p-4 mt-auto border-t bg-slate-50/30 transition-all ${isCollapsed ? 'px-2' : ''}`}>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className={`flex items-center gap-3 py-3 mb-4 bg-white rounded-2xl border border-slate-100 shadow-sm transition-all ${isCollapsed ? 'justify-center p-2' : 'px-3'}`}>
              <Avatar className="h-10 w-10 border border-slate-200 shrink-0">
                <AvatarFallback className="bg-blue-100 text-blue-700 font-bold">
                  {user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              {!isCollapsed && (
                <div className="flex flex-col overflow-hidden animate-in fade-in duration-300">
                  <span className="text-sm font-bold text-slate-900 truncate">
                    {user?.displayName || 'User'}
                  </span>
                  <span className="text-[10px] text-slate-500 truncate flex items-center gap-1 font-medium">
                    {user?.email}
                  </span>
                  {user?.role === UserRole.ADMIN && (
                     <span className="mt-1 w-fit text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-md uppercase font-black">Admin Access</span>
                  )}
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
                    className={`h-11 px-4 rounded-xl transition-all ${
                      isActive 
                        ? 'bg-blue-50 text-blue-700 font-bold border-r-4 border-blue-600 shadow-sm' 
                        : 'text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    <Settings size={20} className={isActive ? 'text-blue-600' : ''} />
                    {!isCollapsed && <span className="text-sm ml-2">Settings</span>}
                  </SidebarMenuButton>
                )}
              </NavLink>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem className="mt-2">
            <SidebarMenuButton 
              onClick={onLogout} 
              tooltip="Logout Session"
              className={`h-11 px-4 rounded-xl text-rose-500 hover:text-rose-600 hover:bg-rose-50 transition-all font-semibold ${isCollapsed ? 'justify-center' : ''}`}
            >
              <LogOut size={20} />
              {!isCollapsed && <span className="text-sm ml-2">Logout Session</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
