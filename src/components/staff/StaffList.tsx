/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from "react";
import { useState, useEffect } from 'react';
import { DataTable } from '@/src/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { supabaseService } from '@/src/lib/supabaseService';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  const [formData, setFormData] = useState({
    employeeId: '',
    fullName: '',
    email: '',
    department: '',
    position: '',
    status: 'Active',
    joinDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    const unsubscribe = supabaseService.subscribeCollection<Employee>('employees', (data) => {
      setEmployees(data);
      setLoading(false);
    }, 'createdAt');
    return () => unsubscribe();
  }, []);

  const handleSave = async () => {
    try {
      if (editingEmployee) {
        await supabaseService.updateDocument('employees', editingEmployee.id, {
          ...formData,
          updatedAt: new Date().toISOString(),
        });
        toast.success("Employee updated successfully");
      } else {
        await supabaseService.addDocument('employees', {
          ...formData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        toast.success("Employee added successfully");
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error("Failed to save employee");
    }
  };

  const handleDelete = async (employee: Employee) => {
    if (confirm(`Are you sure you want to delete ${employee.fullName}?`)) {
      try {
        await supabaseService.deleteDocument('employees', employee.id);
        toast.success("Employee removed");
      } catch (error) {
        toast.error("Failed to delete employee");
      }
    }
  };

  const resetForm = () => {
    setFormData({
      employeeId: '',
      fullName: '',
      email: '',
      department: '',
      position: '',
      status: 'Active',
      joinDate: new Date().toISOString().split('T')[0],
    });
    setEditingEmployee(null);
  };

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
          onAdd={() => { resetForm(); setIsDialogOpen(true); }}
          onEdit={(employee) => {
            setEditingEmployee(employee);
            setFormData({
              employeeId: employee.employeeId,
              fullName: employee.fullName,
              email: employee.email,
              department: employee.department || '',
              position: employee.position || '',
              status: employee.status,
              joinDate: employee.joinDate,
            });
            setIsDialogOpen(true);
          }}
          onDelete={handleDelete}
          useDirectActions={true}
          searchPlaceholder="Search staff..."
        />
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingEmployee ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
            <DialogDescription>
              Enter employee details for the staff directory.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="employeeId" className="text-right">Emp ID</Label>
              <Input
                id="employeeId"
                className="col-span-3"
                value={formData.employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="fullName" className="text-right">Name</Label>
              <Input
                id="fullName"
                className="col-span-3"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">Email</Label>
              <Input
                id="email"
                type="email"
                className="col-span-3"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="department" className="text-right">Dept</Label>
              <Input
                id="department"
                className="col-span-3"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="position" className="text-right">Position</Label>
              <Input
                id="position"
                className="col-span-3"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save Employee</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
