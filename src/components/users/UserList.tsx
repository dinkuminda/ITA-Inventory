/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from "react";
import { useState, useEffect } from 'react';
import { ShieldCheck, UserCog, UserMinus, UserPlus, CheckCircle, XCircle } from "lucide-react";
import { UserProfile, UserRole } from '@/src/types';
import { DataTable } from '@/src/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabaseService } from '@/src/lib/supabaseService';
import { toast } from "sonner";

interface UserListProps {
  currentUserRole?: UserRole;
  currentUserEmail?: string;
}

export function UserList({ currentUserRole, currentUserEmail }: UserListProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const isAdmin = currentUserRole === UserRole.ADMIN;

  useEffect(() => {
    return supabaseService.subscribeCollection<UserProfile>('profiles', (data) => {
      setUsers(data);
    }, 'email');
  }, []);

  const handleRoleChange = async (user: UserProfile, newRole: UserRole) => {
    if (user.email === currentUserEmail) {
      toast.error("You cannot change your own role.");
      return;
    }

    try {
      await supabaseService.updateDocument('profiles', user.id, { role: newRole });
      toast.success(`Role updated for ${user.displayName || user.email}`);
    } catch (error) {
      toast.error("Failed to update role");
    }
  };

  const columns: { header: string; accessorKey: keyof UserProfile; cell?: (item: UserProfile) => React.ReactNode }[] = [
    {
      header: 'Name',
      accessorKey: 'displayName',
      cell: (user: UserProfile) => (
        <div className="flex flex-col">
          <span className="font-bold text-foreground">{user.displayName || 'No Name'}</span>
          <span className="text-xs text-muted-foreground">{user.email}</span>
        </div>
      )
    },
    {
      header: 'Role',
      accessorKey: 'role',
      cell: (user: UserProfile) => (
        <Badge 
          className={`font-black uppercase tracking-widest text-[10px] ${
            user.role === UserRole.ADMIN 
              ? 'bg-primary/10 text-primary border-primary/20' 
              : 'bg-muted text-muted-foreground border-border'
          }`}
        >
          {user.role}
        </Badge>
      )
    },
    {
      header: 'Access Level',
      accessorKey: 'id',
      cell: (user: UserProfile) => (
        <div className="flex items-center gap-2">
          {user.role === UserRole.ADMIN ? (
             <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
               <CheckCircle size={14} className="fill-emerald-600 text-white" />
               <span className="text-[10px] font-black uppercase tracking-wider">Full Admin</span>
             </div>
          ) : (
            <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-100">
               <ShieldCheck size={14} />
               <span className="text-[10px] font-black uppercase tracking-wider">Standard Access</span>
             </div>
          )}
        </div>
      )
    },
    {
      header: 'Management',
      accessorKey: 'id',
      cell: (user: UserProfile) => actions(user)
    }
  ];

  const actions = (user: UserProfile) => {
    if (!isAdmin || user.email === currentUserEmail) return null;

    return (
      <div className="flex items-center gap-2">
        {user.role === UserRole.STAFF ? (
          <Button 
            size="sm" 
            variant="outline" 
            className="h-8 px-3 text-[10px] font-bold uppercase tracking-widest border-primary/20 text-primary hover:bg-primary/5 gap-2"
            onClick={() => handleRoleChange(user, UserRole.ADMIN)}
          >
            <UserPlus size={14} />
            Promote to Admin
          </Button>
        ) : (
          <Button 
            size="sm" 
            variant="outline" 
            className="h-8 px-3 text-[10px] font-bold uppercase tracking-widest border-destructive/20 text-destructive hover:bg-destructive/5 gap-2"
            onClick={() => handleRoleChange(user, UserRole.STAFF)}
          >
            <UserMinus size={14} />
            Demote to Staff
          </Button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-6 rounded-[2rem] border border-border/50 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-primary/10 p-3 rounded-2xl text-primary ring-4 ring-primary/5">
            <UserCog size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight text-foreground uppercase">User Management</h2>
            <p className="text-xs text-muted-foreground font-medium">Control system access and assign administrative privileges.</p>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-[2rem] border border-border shadow-sm overflow-hidden">
        <DataTable 
          title="Profiles"
          data={users}
          columns={columns}
          searchPlaceholder="Search users by name or email..."
          useDirectActions={true}
        />
      </div>
    </div>
  );
}
