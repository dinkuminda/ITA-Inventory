/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from "react";
import { useState, useEffect } from 'react';
import { UserRole, UserProfile, Employee } from '@/src/types';
import { DataTable } from '@/src/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabaseService } from '@/src/lib/supabaseService';
import { toast } from "sonner";
import { Shield, Mail, User as UserIcon, UserPlus, CheckCircle2 } from 'lucide-react';

export function UsersList() {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let profilesLoaded = false;
    let employeesLoaded = false;

    const checkLoading = () => {
      if (profilesLoaded && employeesLoaded) {
        setLoading(false);
      }
    };

    const unsubscribeProfiles = supabaseService.subscribeCollection<UserProfile>('profiles', (data) => {
      setProfiles(data);
      profilesLoaded = true;
      checkLoading();
    }, 'email');
    
    const unsubscribeEmployees = supabaseService.subscribeCollection<Employee>('employees', (data) => {
      setEmployees(data);
      employeesLoaded = true;
      checkLoading();
    }, 'email');

    // Safe fallback if subscriptions hang
    const timer = setTimeout(() => setLoading(false), 2000);

    return () => {
      unsubscribeProfiles();
      unsubscribeEmployees();
      clearTimeout(timer);
    };
  }, []);

  const isUserAuthorized = (email: string) => {
    return employees.some(emp => emp.email.toLowerCase() === email.toLowerCase());
  };

  const handleDelete = async (profile: UserProfile) => {
    if (profile.email.toLowerCase() === 'dinkuh12@gmail.com') {
      toast.error("Cannot delete the root administrator account.");
      return;
    }

    if (confirm(`Are you sure you want to remove access for ${profile.displayName}? This only deletes their system profile, not their employee record.`)) {
      try {
        await supabaseService.deleteDocument('profiles', profile.id);
        toast.success("User access removed. They can still sign up again if they are in the employee roster.");
      } catch (error: any) {
        toast.error("Failed to delete user profile");
      }
    }
  };

  const handleAuthorize = async (profile: UserProfile) => {
    if (!profile.email) return;
    
    try {
      console.log('Authorizing user:', profile.email);
      // 1. Check if they are already an employee - use ilike for case insensitivity
      const { data: existingEmp, error: queryError } = await supabaseService.queryDocuments<Employee>('employees', [
        { field: 'email', operator: 'ilike', value: profile.email.toLowerCase() }
      ]);

      if (queryError) {
        console.error("Query employees error:", queryError);
        throw queryError;
      }

      if (existingEmp && existingEmp.length > 0) {
        console.log('Found existing employee for email:', profile.email);
        toast.info("User is already in the employee directory.");
        // Ensure linked
        if (!existingEmp[0].profileId) {
          console.log('Linking existing employee to profile ID:', profile.id);
          await supabaseService.updateDocument('employees', existingEmp[0].id, {
            profileId: profile.id
          });
        }
        return;
      }

      console.log('Adding new employee for email:', profile.email);
      // 2. Add as new employee
      const emailPrefix = profile.email.split('@')[0];
      await supabaseService.addDocument('employees', {
        employeeId: `EMP-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        fullName: profile.displayName || emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1).replace(/[._]/g, ' '),
        email: profile.email.toLowerCase(),
        department: 'TBD',
        position: 'System Registered User',
        status: 'Active',
        role: profile.role,
        profileId: profile.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      toast.success(`${profile.displayName} has been authorized as an employee.`);
    } catch (error: any) {
      console.error("Authorize user error:", error);
      toast.error("Failed to authorize user: " + (error.message || "Unknown error"));
    }
  };

  const columns = [
    { 
      header: 'UID', 
      accessorKey: 'id' as keyof UserProfile,
      cell: (item: UserProfile) => (
        <span className="font-mono text-[10px] text-muted-foreground">{item.id}</span>
      )
    },
    { 
      header: 'Display Name', 
      accessorKey: 'displayName' as keyof UserProfile,
      cell: (item: UserProfile) => (
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <UserIcon size={14} />
          </div>
          <span className="font-medium">{item.displayName}</span>
        </div>
      )
    },
    { 
      header: 'Email', 
      accessorKey: 'email' as keyof UserProfile,
      cell: (item: UserProfile) => (
        <div className="flex items-center gap-1.5">
          <Mail size={12} className="text-muted-foreground" />
          <span>{item.email}</span>
        </div>
      )
    },
    {
      header: 'Role',
      accessorKey: 'role' as keyof UserProfile,
      cell: (item: UserProfile) => (
        <Badge variant={item.role === UserRole.ADMIN ? 'default' : 'secondary'} className={item.role === UserRole.ADMIN ? "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100" : ""}>
          {item.role === UserRole.ADMIN && <Shield size={10} className="mr-1" />}
          {item.role}
        </Badge>
      )
    },
    {
      header: 'Authorization',
      accessorKey: 'email' as keyof UserProfile,
      cell: (item: UserProfile) => {
        const authorized = isUserAuthorized(item.email);
        return (
          <div className="flex items-center gap-2">
            {authorized ? (
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1 capitalize">
                <CheckCircle2 size={12} /> Authorized
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 gap-1 capitalize">
                <Shield size={12} /> Not Authorized
              </Badge>
            )}
            {!authorized && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 px-2 text-[10px] bg-blue-50 text-blue-600 hover:bg-blue-100 gap-1"
                onClick={() => handleAuthorize(item)}
              >
                <UserPlus size={10} /> Authorize Now
              </Button>
            )}
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold">System Users</h3>
          <p className="text-xs text-muted-foreground">Accounts that have completed the registration process.</p>
        </div>
      </div>
      
      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-64 bg-muted rounded"></div>
        </div>
      ) : (
        <DataTable
          title="User"
          data={profiles}
          columns={columns}
          onDelete={handleDelete}
          useDirectActions={true}
          searchPlaceholder="Search users..."
        />
      )}
    </div>
  );
}
