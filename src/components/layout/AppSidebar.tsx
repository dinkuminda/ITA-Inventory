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
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  SidebarProvider,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { UserRole } from '@/src/types';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', value: 'dashboard' },
  { icon: Laptop, label: 'Assets', value: 'assets' },
  { icon: Key, label: 'Licenses', value: 'licenses' },
  { icon: ShieldAlert, label: 'Maintenance', value: 'maintenance' },
  { icon: Users, label: 'Staff', value: 'staff' },
];

interface AppSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user?: { email: string; displayName: string; role: UserRole };
  onLogout: () => void;
}

export function AppSidebar({ activeTab, setActiveTab, user, onLogout }: AppSidebarProps) {
  const filteredNavItems = navItems.filter(item => {
    if (item.value === 'staff' && user?.role !== UserRole.ADMIN) return false;
    return true;
  });

  return (
    <Sidebar className="border-r">
      <SidebarHeader className="p-4 border-b">
        <div className="flex items-center gap-2 px-2">
          <div className="bg-primary text-primary-foreground p-1.5 rounded-lg">
            <Boxes size={20} />
          </div>
          <span className="font-bold text-lg tracking-tight">ICS IT Inventory</span>
        </div>
      </SidebarHeader>
      <SidebarContent className="py-4">
        <SidebarMenu>
          {filteredNavItems.map((item) => (
            <SidebarMenuItem key={item.value}>
              <SidebarMenuButton
                onClick={() => setActiveTab(item.value)}
                isActive={activeTab === item.value}
                tooltip={item.label}
              >
                <item.icon size={18} />
                <span>{item.label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-4 mt-auto border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-3 px-2 py-2 mb-2">
              <Avatar className="h-9 w-9">
                <AvatarImage src="" />
                <AvatarFallback className="bg-muted text-muted-foreground">
                  {user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-medium truncate">
                  {user?.displayName || 'User'}
                </span>
                <span className="text-xs text-muted-foreground truncate flex items-center gap-1">
                  {user?.email}
                  {user?.role === UserRole.ADMIN && (
                    <span className="text-[10px] bg-primary/10 text-primary px-1 rounded uppercase font-bold">Admin</span>
                  )}
                </span>
              </div>
            </div>
          </SidebarMenuItem>
          {user?.role === UserRole.ADMIN && (
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => setActiveTab('settings')} isActive={activeTab === 'settings'}>
                <Settings size={18} />
                <span>Settings</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton onClick={onLogout} className="text-destructive hover:text-destructive hover:bg-destructive/10">
              <LogOut size={18} />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
