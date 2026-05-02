/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from "react";
import { useState, useEffect } from 'react';
import { Asset, AssetStatus, ApprovalStatus } from '@/src/types';
import { DataTable } from '@/src/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
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
import { ASSET_TYPES, LOCATIONS } from '@/src/constants';
import { toast } from "sonner";

export function AssetsList() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    type: ASSET_TYPES[0],
    serialNumber: '',
    status: AssetStatus.IN_STOCK,
    location: LOCATIONS[0],
    assignedTo: '',
  });

  useEffect(() => {
    const unsubscribe = supabaseService.subscribeCollection<Asset>('assets', (data) => {
      setAssets(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSave = async () => {
    try {
      if (editingAsset) {
        await supabaseService.updateDocument('assets', editingAsset.id, formData);
        toast.success("Asset updated successfully");
      } else {
        await supabaseService.addDocument('assets', {
          ...formData,
          approvalStatus: ApprovalStatus.APPROVED,
        });
        toast.success("Asset added successfully");
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error("Failed to save asset");
    }
  };

  const handleDelete = async (asset: Asset) => {
    if (confirm(`Are you sure you want to delete ${asset.name}?`)) {
      try {
        await supabaseService.deleteDocument('assets', asset.id);
        toast.success("Asset deleted");
      } catch (error) {
        toast.error("Failed to delete asset");
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: ASSET_TYPES[0],
      serialNumber: '',
      status: AssetStatus.IN_STOCK,
      location: LOCATIONS[0],
      assignedTo: '',
    });
    setEditingAsset(null);
  };

  const columns = [
    { header: 'Name', accessorKey: 'name' as keyof Asset },
    { header: 'Type', accessorKey: 'type' as keyof Asset },
    { header: 'Serial No.', accessorKey: 'serialNumber' as keyof Asset },
    {
      header: 'Status',
      accessorKey: 'status' as keyof Asset,
      cell: (item: Asset) => {
        const variants: Record<AssetStatus, string> = {
          [AssetStatus.IN_STOCK]: 'bg-green-500/10 text-green-500 border-green-500/20',
          [AssetStatus.ASSIGNED]: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
          [AssetStatus.MAINTENANCE]: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
          [AssetStatus.RETIRED]: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
        };
        return (
          <Badge variant="outline" className={variants[item.status]}>
            {item.status}
          </Badge>
        );
      }
    },
    { header: 'Assigned To', accessorKey: 'assignedTo' as keyof Asset },
    {
      header: 'Last Updated',
      accessorKey: 'updatedAt' as keyof Asset,
      cell: (item: Asset) => item.updatedAt ? format(new Date(item.updatedAt), 'MMM d, yyyy') : 'N/A'
    }
  ];

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Assets</h2>
      </div>
      
      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-muted rounded w-1/3"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      ) : (
        <DataTable
          title="Asset"
          data={assets}
          columns={columns}
          onAdd={() => { resetForm(); setIsDialogOpen(true); }}
          onEdit={(asset) => { 
            setEditingAsset(asset);
            setFormData({
              name: asset.name,
              type: asset.type,
              serialNumber: asset.serialNumber || '',
              status: asset.status,
              location: asset.location || LOCATIONS[0],
              assignedTo: asset.assignedTo || '',
            });
            setIsDialogOpen(true); 
          }}
          onDelete={handleDelete}
          searchPlaceholder="Search assets..."
        />
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingAsset ? 'Edit Asset' : 'Add New Asset'}</DialogTitle>
            <DialogDescription>
              Enter the hardware details below to keep your inventory accurate.
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
              <Label htmlFor="type" className="text-right">Type</Label>
              <div className="col-span-3">
                <Select 
                  value={formData.type} 
                  onValueChange={(val) => setFormData({ ...formData, type: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ASSET_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="serial" className="text-right">Serial #</Label>
              <Input
                id="serial"
                className="col-span-3"
                value={formData.serialNumber}
                onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">Status</Label>
              <div className="col-span-3">
                <Select 
                  value={formData.status} 
                  onValueChange={(val: AssetStatus) => setFormData({ ...formData, status: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(AssetStatus).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save Asset</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
