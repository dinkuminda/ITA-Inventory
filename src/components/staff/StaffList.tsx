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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UsersList } from "./UsersList";

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
    if (!isAdmin) {
      toast.error("Unauthorized: Only admins can delete employees.");
      return;
    }

    if (employee.email.toLowerCase() === 'dinkuh12@gmail.com') {
      toast.error("Cannot delete the root administrator account.");
      return;
    }

    if (confirm(`Are you sure you want to delete ${employee.fullName}? This will also remove their system access.`)) {
      try {
        setLoading(true);
        // 1. Delete associated profile if it exists
        if (employee.profileId) {
          await supabaseService.deleteDocument('profiles', employee.profileId);
        }
        
        // 2. Delete employee record
        await supabaseService.deleteDocument('employees', employee.id);
        
        toast.success(`Employee ${employee.fullName} removed successfully`);
      } catch (error: any) {
        console.error("Delete employee error:", error);
        toast.error(error.message || "Failed to delete employee");
      } finally {
        setLoading(false);
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
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-3xl font-black tracking-tight text-slate-900 italic uppercase">Staff Control</h2>
          <p className="text-sm font-medium text-slate-500">Coordinate access and authorized equipment holders.</p>
        </div>
        <div className="flex flex-col md:flex-row items-center gap-4">
          <form onSubmit={handleQuickRegister} className="flex flex-col gap-1 w-full md:w-auto">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Authorize employee email..."
                value={quickEmail}
                onChange={(e) => setQuickEmail(e.target.value)}
                className="w-full md:w-[280px] h-12 rounded-xl bg-white border-slate-200 shadow-sm focus:ring-emerald-500"
              />
              <Button type="submit" variant="secondary" className="h-12 px-6 rounded-xl font-bold bg-slate-100 hover:bg-slate-200 text-slate-900">Authorize</Button>
            </div>
            <p className="text-[10px] text-slate-400 px-1 font-bold uppercase tracking-wider">Manual authorization portal</p>
          </form>
          <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} className="h-12 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl shadow-emerald-500/20 transition-all font-bold gap-2 w-full md:w-auto">
            <PlusCircle className="h-5 w-5" />
            Add Staff
          </Button>
        </div>
      </div>
      <Tabs defaultValue="employees" className="w-full">
        <div className="flex items-center justify-between mb-6">
          <TabsList className="bg-slate-100 p-1 border border-slate-200">
            <TabsTrigger value="employees" className="px-6 py-2 data-active:bg-white data-active:shadow-sm">Employee Directory</TabsTrigger>
            <TabsTrigger value="users" className="px-6 py-2 data-active:bg-white data-active:shadow-sm">System Users (Accounts)</TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="employees" className="mt-0">
          <div className="space-y-4">
            {loading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-64 bg-muted rounded-xl"></div>
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
          </div>
        </TabsContent>
        <TabsContent value="users" className="mt-0">
          <UsersList />
        </TabsContent>
      </Tabs>

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
