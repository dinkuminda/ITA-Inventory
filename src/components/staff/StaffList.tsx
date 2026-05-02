/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from "react";
import { useState, useEffect } from 'react';
import { DataTable } from '@/src/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { supabaseService } from '@/src/lib/supabaseService';
import { toast } from "sonner";

interface Employee {
  id: string;
  employeeId: string;
  fullName: string;
  email: string;
  department: string;
  position: string;
  status: string;
  joinDate: string;
}

export function StaffList() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = supabaseService.subscribeCollection<Employee>('employees', (data) => {
      setEmployees(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const columns = [
    { header: 'ID', accessorKey: 'employeeId' as keyof Employee },
    { header: 'Name', accessorKey: 'fullName' as keyof Employee },
    { header: 'Email', accessorKey: 'email' as keyof Employee },
    { header: 'Department', accessorKey: 'department' as keyof Employee },
    { header: 'Position', accessorKey: 'position' as keyof Employee },
    {
      header: 'Status',
      accessorKey: 'status' as keyof Employee,
      cell: (item: Employee) => (
        <Badge variant={item.status === 'Active' ? 'default' : 'secondary'}>
          {item.status}
        </Badge>
      )
    },
  ];

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Staff Management</h2>
      </div>
      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-64 bg-muted rounded"></div>
        </div>
      ) : (
        <DataTable
          title="Employee"
          data={employees}
          columns={columns}
          onAdd={() => toast.info("Add Employee dialog coming soon")}
          searchPlaceholder="Search staff..."
        />
      )}
    </div>
  );
}
