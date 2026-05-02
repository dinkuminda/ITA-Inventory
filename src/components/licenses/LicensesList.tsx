/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from "react";
import { useState, useEffect } from 'react';
import { License, LicenseStatus } from '@/src/types';
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

export function LicensesList() {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLicense, setEditingLicense] = useState<License | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    vendor: '',
    seats: 1,
    usedSeats: 0,
    status: LicenseStatus.ACTIVE,
    expiryDate: '',
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
      if (editingLicense) {
        await supabaseService.updateDocument('licenses', editingLicense.id, {
          ...formData,
          updatedAt: new Date().toISOString(),
        });
        toast.success("License updated successfully");
      } else {
        await supabaseService.addDocument('licenses', {
          ...formData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        toast.success("License added successfully");
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error("Failed to save license");
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
    });
    setEditingLicense(null);
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
      </div>
      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-muted rounded w-1/4"></div>
          <div className="h-48 bg-muted rounded"></div>
        </div>
      ) : (
        <DataTable
          title="License"
          data={licenses}
          columns={columns}
          onAdd={() => { resetForm(); setIsDialogOpen(true); }}
          onEdit={(license) => { 
            setEditingLicense(license);
            setFormData({
              name: license.name,
              vendor: license.vendor || '',
              seats: license.seats,
              usedSeats: license.usedSeats,
              status: license.status,
              expiryDate: license.expiryDate || '',
            });
            setIsDialogOpen(true);
          }}
          onDelete={handleDelete}
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
