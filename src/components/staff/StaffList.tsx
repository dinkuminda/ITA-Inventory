/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from "react";
import { useState, useEffect } from 'react';
import { PlusCircle } from "lucide-react";
import { Asset, AssetStatus, ApprovalStatus, UserRole, Employee } from '@/src/types';
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
import Papa from 'papaparse';
import { format } from 'date-fns';

export function StaffList({ userRole }: { userRole?: UserRole }) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  const isAdmin = userRole === UserRole.ADMIN;

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
      // Basic validation
      const cleanEmail = formData.email.trim().toLowerCase();
      if (!cleanEmail || !cleanEmail.includes('@')) {
        toast.error("Please enter a valid email address");
        return;
      }

      if (editingEmployee) {
        await supabaseService.updateDocument('employees', editingEmployee.id, {
          ...formData,
          email: cleanEmail,
          updatedAt: new Date().toISOString(),
        });
        toast.success("Employee updated successfully");
      } else {
        // Check for duplicate email before adding
        const existing = employees.find(emp => emp.email.toLowerCase() === cleanEmail);
        if (existing) {
          toast.error(`Employee with email ${cleanEmail} already exists in the system.`);
          return;
        }

        const finalEmployeeId = formData.employeeId.trim() || `EMP-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        await supabaseService.addDocument('employees', {
          ...formData,
          email: cleanEmail,
          employeeId: finalEmployeeId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        toast.success("Employee added successfully");
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (error: any) {
      console.error("Save employee error:", error);
      if (error.message?.includes('employees_email_key')) {
        toast.error("This email is already registered to another employee.");
      } else {
        toast.error(error.message || "Failed to save employee");
      }
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

  const handleExport = () => {
    const exportData = employees.map(({ id, createdAt, updatedAt, ...rest }: any) => rest);
    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `staff_export_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Staff list exported");
  };

  const handleImport = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const importedData = results.data as any[];
          const formatted = importedData.map(item => ({
            employeeId: item.employeeId || item['Emp ID'] || item.ID || '',
            fullName: item.fullName || item.Name || item['Full Name'] || 'Unknown',
            email: item.email || item.Email || '',
            department: item.department || item.Dept || '',
            position: item.position || item.Position || '',
            status: item.status || item.Status || 'Active',
            joinDate: item.joinDate || item['Join Date'] || new Date().toISOString().split('T')[0],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }));

          if (formatted.length > 0) {
            // Filter out existing emails from the import list
            const existingEmails = new Set(employees.map(e => e.email.toLowerCase()));
            const toImport = formatted.filter(item => !existingEmails.has(item.email.toLowerCase()));
            const duplicates = formatted.length - toImport.length;

            if (toImport.length > 0) {
              await supabaseService.addDocuments('employees', toImport);
              toast.success(`Successfully imported ${toImport.length} employees.${duplicates > 0 ? ` Skipped ${duplicates} duplicates.` : ''}`);
            } else if (duplicates > 0) {
              toast.info(`All ${duplicates} employees already exist in the system.`);
            }
          }
        } catch (error: any) {
          console.error("Import failed:", error);
          toast.error(error.message || "Import failed");
        }
      }
    });
  };

  const columns = [
    { header: 'ID', accessorKey: 'employeeId' as keyof Employee },
    { header: 'Name', accessorKey: 'fullName' as keyof Employee },
    { header: 'Email', accessorKey: 'email' as keyof Employee },
    { header: 'Department', accessorKey: 'department' as keyof Employee },
    { header: 'Position', accessorKey: 'position' as keyof Employee },
    {
      header: 'Account',
      accessorKey: 'profileId' as keyof Employee,
      cell: (item: Employee) => (
        <Badge variant={item.profileId ? 'outline' : 'secondary'} className={item.profileId ? "bg-blue-50 text-blue-700 border-blue-200" : ""}>
          {item.profileId ? 'Signed Up' : 'Pending'}
        </Badge>
      )
    },
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

  const [quickEmail, setQuickEmail] = useState('');

  const handleQuickRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = quickEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      toast.error("Please enter a valid email");
      return;
    }

    try {
      // Check for duplicate email before adding
      const existing = employees.find(emp => emp.email.toLowerCase() === cleanEmail);
      if (existing) {
        toast.error(`Employee with email ${cleanEmail} already exists.`);
        return;
      }

      const emailPrefix = cleanEmail.split('@')[0];
      const newEmployee = {
        employeeId: `EMP-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        fullName: emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1).replace(/[._]/g, ' '),
        email: cleanEmail,
        department: 'TBD',
        position: 'Registered by Email',
        status: 'Active',
        joinDate: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await supabaseService.addDocument('employees', newEmployee);
      setQuickEmail('');
      toast.success(`Successfully registered ${quickEmail}`);
    } catch (error: any) {
      console.error("Quick registration error:", error);
      if (error.message?.includes('employees_email_key')) {
        toast.error("This email is already registered to another employee.");
      } else {
        toast.error(error.message || "Registration failed. Email might already exist.");
      }
    }
  };

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Staff Management</h2>
        <div className="flex items-center gap-4">
          <form onSubmit={handleQuickRegister} className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Enter email to authorize employee..."
                value={quickEmail}
                onChange={(e) => setQuickEmail(e.target.value)}
                className="w-[280px]"
              />
              <Button type="submit" variant="secondary">Authorize</Button>
            </div>
            <p className="text-[10px] text-muted-foreground px-1">Employees must sign up with this email to view/add/import/export assets.</p>
          </form>
          <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200 transition-all">
            <PlusCircle className="h-5 w-5" />
            Add Employee
          </Button>
        </div>
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
          onAdd={undefined}
          onExport={handleExport}
          onImport={isAdmin ? handleImport : undefined}
          onEdit={isAdmin ? (employee) => {
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
          } : undefined}
          onDelete={isAdmin ? handleDelete : undefined}
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
