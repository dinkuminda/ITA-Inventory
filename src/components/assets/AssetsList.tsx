/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from "react";
import { useState, useEffect } from 'react';
import { Asset, AssetStatus, ApprovalStatus, UserRole } from '@/src/types';
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
import { QRCodeSVG } from 'qrcode.react';
import Papa from 'papaparse';

export function AssetsList({ userRole }: { userRole?: UserRole }) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isQRDialogOpen, setIsQRDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [qrAsset, setQRAsset] = useState<Asset | null>(null);

  const isAdmin = userRole === UserRole.ADMIN;

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    type: ASSET_TYPES[0],
    serialNumber: '',
    status: AssetStatus.IN_STOCK,
    location: LOCATIONS[0],
    specificLocation: '',
    assignedTo: '',
    remark: '',
  });

  useEffect(() => {
    const unsubscribe = supabaseService.subscribeCollection<Asset>('assets', (data) => {
      setAssets(data);
      setLoading(false);
    }, 'createdAt');
    return () => unsubscribe();
  }, []);

  const handleSave = async () => {
    try {
      if (editingAsset) {
        await supabaseService.updateDocument('assets', editingAsset.id, {
          ...formData,
          updatedAt: new Date().toISOString(),
        });
        toast.success("Asset updated successfully");
      } else {
        await supabaseService.addDocument('assets', {
          ...formData,
          approvalStatus: ApprovalStatus.APPROVED,
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
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
      specificLocation: '',
      assignedTo: '',
      remark: '',
    });
    setEditingAsset(null);
  };

  const handleExport = () => {
    const exportData = assets.map(({ id, createdAt, updatedAt, approvalStatus, ...rest }) => rest);
    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `assets_export_${format(new Date(), "yyyy-MM-dd")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Assets exported to CSV");
  };

  const handleImport = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const importedData = results.data as any[];
          const formattedAssets = importedData.map(item => ({
            name: item.name || item.Name || "Unnamed Asset",
            type: item.type || item.Type || ASSET_TYPES[0],
            serialNumber: item.serialNumber || item.SerialNumber || item['Serial No.'] || "",
            status: (item.status || item.Status || AssetStatus.IN_STOCK) as AssetStatus,
            location: item.location || item.Location || LOCATIONS[0],
            specificLocation: item.specificLocation || item.SpecificLocation || item['Specific Location'] || "",
            assignedTo: item.assignedTo || item.AssignedTo || item['Assigned To'] || "",
            remark: item.remark || item.Remark || item.Notes || "",
            approvalStatus: ApprovalStatus.APPROVED,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }));

          if (formattedAssets.length > 0) {
            await supabaseService.addDocuments('assets', formattedAssets);
            toast.success(`Successfully imported ${formattedAssets.length} assets`);
          } else {
            toast.info("No valid assets found in CSV");
          }
        } catch (error) {
          console.error("Import error:", error);
          toast.error("Failed to import CSV. Please check the file format.");
        }
      },
      error: (error) => {
        console.error("CSV Parsing error:", error);
        toast.error("Error parsing CSV file");
      }
    });
  };

  const columns = [
    { header: 'Name', accessorKey: 'name' as keyof Asset },
    { header: 'Type', accessorKey: 'type' as keyof Asset },
    { header: 'Location', accessorKey: 'location' as keyof Asset },
    { header: 'Specific Location', accessorKey: 'specificLocation' as keyof Asset },
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
          onAdd={isAdmin ? () => { resetForm(); setIsDialogOpen(true); } : undefined}
          onExport={handleExport}
          onImport={isAdmin ? handleImport : undefined}
          onEdit={isAdmin ? (asset) => { 
            setEditingAsset(asset);
            setFormData({
              name: asset.name,
              type: asset.type,
              serialNumber: asset.serialNumber || '',
              status: asset.status,
              location: asset.location || LOCATIONS[0],
              specificLocation: asset.specificLocation || '',
              assignedTo: asset.assignedTo || '',
              remark: asset.remark || '',
            });
            setIsDialogOpen(true); 
          } : undefined}
          onDelete={isAdmin ? handleDelete : undefined}
          onViewQR={(asset) => {
            setQRAsset(asset);
            setIsQRDialogOpen(true);
          }}
          useDirectActions={true}
          searchPlaceholder="Search assets..."
        />
      )}

      {/* QR Code Dialog */}
      <Dialog open={isQRDialogOpen} onOpenChange={setIsQRDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Asset QR Code</DialogTitle>
            <DialogDescription>
              Scan this code to see asset details.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center space-y-6 pt-6">
            {qrAsset && (
              <>
                <div className="p-4 bg-white rounded-lg shadow-sm border">
                  <QRCodeSVG 
                    value={`Name: ${qrAsset.name}\nSerial: ${qrAsset.serialNumber || 'N/A'}\nAssigned: ${qrAsset.assignedTo || 'Unassigned'}`}
                    size={200}
                    level="H"
                    includeMargin={true}
                  />
                </div>
                <div className="text-center space-y-1">
                  <h4 className="font-bold text-lg">{qrAsset.name}</h4>
                  <p className="text-sm text-muted-foreground">S/N: {qrAsset.serialNumber || 'N/A'}</p>
                  <p className="text-sm font-medium">Assigned to: {qrAsset.assignedTo || 'None'}</p>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => window.print()} variant="outline">Print Code</Button>
            <Button onClick={() => setIsQRDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="location" className="text-right">Location</Label>
              <div className="col-span-3">
                <Select 
                  value={formData.location} 
                  onValueChange={(val) => setFormData({ ...formData, location: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {LOCATIONS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="specificLocation" className="text-right whitespace-nowrap">Specific Location</Label>
              <Input
                id="specificLocation"
                className="col-span-3"
                value={formData.specificLocation}
                onChange={(e) => setFormData({ ...formData, specificLocation: e.target.value })}
                placeholder="Room #, Desk ID, etc."
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="assignedTo" className="text-right">Assigned</Label>
              <Input
                id="assignedTo"
                className="col-span-3"
                value={formData.assignedTo}
                onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                placeholder="Employee Name"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="remark" className="text-right">Notes</Label>
              <Input
                id="remark"
                className="col-span-3"
                value={formData.remark}
                onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                placeholder="Additional details..."
              />
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
