/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from "react";
import { useState, useEffect } from 'react';
import { PlusCircle } from "lucide-react";
import { License, LicenseStatus, UserRole } from '@/src/types';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import Papa from 'papaparse';
import { format } from 'date-fns';

export function LicensesList({ userRole, userEmail }: { userRole?: UserRole, userEmail?: string }) {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLicense, setEditingLicense] = useState<License | null>(null);

  const isAdmin = userRole === UserRole.ADMIN;
  const isStaff = userRole === UserRole.STAFF;
  const hasEditPermission = isAdmin || isStaff;

  const displayedLicenses = isAdmin ? licenses : licenses.filter(l => l.assignedTo === userEmail);

  const [formData, setFormData] = useState({
    name: '',
    vendor: '',
    seats: 1,
    usedSeats: 0,
    status: LicenseStatus.ACTIVE,
    expiryDate: '',
    key: '',
  });

  useEffect(() => {
    const unsubscribe = supabaseService.subscribeCollection<License>('licenses', (data) => {
      setLicenses(data);
      setLoading(false);
    }, 'createdAt');
    return () => unsubscribe();
  }, []);

  const handleSave = async () => {
    try {
      const dataToSave = {
        ...formData,
        assignedTo: isStaff ? (userEmail || '') : '',
        key: formData.key.trim() || null,
        updatedAt: new Date().toISOString(),
      };

      if (editingLicense) {
        await supabaseService.updateDocument('licenses', editingLicense.id, dataToSave);
        toast.success("License updated successfully");
      } else {
        await supabaseService.addDocument('licenses', {
          ...dataToSave,
          createdAt: new Date().toISOString(),
        });
        toast.success("License added successfully");
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (error: any) {
      console.error("License save error:", error);
      toast.error(error.message || "Failed to save license");
    }
  };

  const handleDelete = async (license: License) => {
    if (confirm(`Are you sure you want to delete ${license.name}?`)) {
      try {
        await supabaseService.deleteDocument('licenses', license.id);
        toast.success("License deleted");
      } catch (error) {
        toast.error("Failed to delete license");
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      vendor: '',
      seats: 1,
      usedSeats: 0,
      status: LicenseStatus.ACTIVE,
      expiryDate: '',
      key: '',
    });
    setEditingLicense(null);
  };

  const handleExport = () => {
    const exportData = displayedLicenses.map(({ id, updatedAt, ...rest }: any) => rest);
    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `licenses_export_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Licenses exported");
  };

  const handleImport = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const importedData = results.data as any[];
          const formatted = importedData.map(item => ({
            name: item.name || item.Name || 'Unknown License',
            vendor: item.vendor || item.Vendor || '',
            seats: parseInt(item.seats || item.Seats || '1') || 1,
            usedSeats: parseInt(item.usedSeats || item['Used Seats'] || '0') || 0,
            status: (item.status || item.Status || LicenseStatus.ACTIVE) as LicenseStatus,
            assignedTo: isStaff ? (userEmail || '') : (item.assignedTo || item.AssignedTo || ''),
            expiryDate: item.expiryDate || item.Expiry || item['Expiry Date'] || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }));

          if (formatted.length > 0) {
            await supabaseService.addDocuments('licenses', formatted);
            toast.success(`Successfully imported ${formatted.length} licenses`);
          }
        } catch (error: any) {
          console.error("Import failed:", error);
          toast.error(error.message || "Import failed");
        }
      }
    });
  };

  const columns = [
    { header: 'Name', accessorKey: 'name' as keyof License },
    { header: 'Vendor', accessorKey: 'vendor' as keyof License },
    {
      header: 'Usage',
      accessorKey: 'usedSeats' as keyof License,
      cell: (item: License) => (
        <span className="font-medium">
          {item.usedSeats} / {item.seats}
        </span>
      )
    },
    {
      header: 'Status',
      accessorKey: 'status' as keyof License,
      cell: (item: License) => {
        const variants: Record<LicenseStatus, string> = {
          [LicenseStatus.ACTIVE]: 'bg-green-500/10 text-green-500 border-green-500/20',
          [LicenseStatus.EXPIRED]: 'bg-red-500/10 text-red-500 border-red-500/20',
          [LicenseStatus.SUSPENDED]: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
        };
        return (
          <Badge variant="outline" className={variants[item.status]}>
            {item.status}
          </Badge>
        );
      }
    },
    { header: 'Expiry', accessorKey: 'expiryDate' as keyof License },
  ];

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Licenses</h2>
        <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} className="gap-2 bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-200 transition-all">
          <PlusCircle className="h-5 w-5" />
          Add License
        </Button>
      </div>
      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-muted rounded w-1/4"></div>
          <div className="h-48 bg-muted rounded"></div>
        </div>
      ) : (
        <DataTable
          title="License"
          data={displayedLicenses}
          columns={columns}
          onAdd={undefined}
          onExport={handleExport}
          onImport={hasEditPermission ? handleImport : undefined}
          onEdit={hasEditPermission ? (license) => { 
            setEditingLicense(license);
            setFormData({
              name: license.name,
              vendor: license.vendor || '',
              seats: license.seats,
              usedSeats: license.usedSeats,
              status: license.status,
              expiryDate: license.expiryDate || '',
              key: license.key || '',
            });
            setIsDialogOpen(true);
          } : undefined}
          onDelete={isAdmin ? handleDelete : undefined}
          useDirectActions={true}
          searchPlaceholder="Search licenses..."
        />
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingLicense ? 'Edit License' : 'Add New License'}</DialogTitle>
            <DialogDescription>
              Enter the software license details below.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Name</Label>
              <Input
                id="name"
                className="col-span-3"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="vendor" className="text-right">Vendor</Label>
              <Input
                id="vendor"
                className="col-span-3"
                value={formData.vendor}
                onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="key" className="text-right">License Key</Label>
              <Input
                id="key"
                className="col-span-3"
                value={formData.key}
                onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                placeholder="XXXX-XXXX-XXXX-XXXX"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="seats" className="text-right">Seats</Label>
              <Input
                id="seats"
                type="number"
                className="col-span-3"
                value={formData.seats}
                onChange={(e) => setFormData({ ...formData, seats: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">Status</Label>
              <div className="col-span-3">
                <Select 
                  value={formData.status} 
                  onValueChange={(val: LicenseStatus) => setFormData({ ...formData, status: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(LicenseStatus).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="expiry" className="text-right">Expiry</Label>
              <Input
                id="expiry"
                type="date"
                className="col-span-3"
                value={formData.expiryDate}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save License</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
