/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from "react";
import { useState, useEffect } from 'react';
import { MaintenanceRecord, MaintenanceStatus } from '@/src/types';
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

export function MaintenanceList() {
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MaintenanceRecord | null>(null);

  const [formData, setFormData] = useState({
    assetId: '',
    issueDescription: '',
    performedBy: '',
    status: MaintenanceStatus.PENDING,
    cost: 0,
    date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    const unsubscribe = supabaseService.subscribeCollection<MaintenanceRecord>('maintenance', (data) => {
      setRecords(data);
      setLoading(false);
    }, 'createdAt');
    return () => unsubscribe();
  }, []);

  const handleSave = async () => {
    try {
      if (editingRecord) {
        await supabaseService.updateDocument('maintenance', editingRecord.id, {
          ...formData,
          updatedAt: new Date().toISOString(),
        });
        toast.success("Maintenance record updated");
      } else {
        await supabaseService.addDocument('maintenance', {
          ...formData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        toast.success("Maintenance record added");
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error("Failed to save record");
    }
  };

  const handleDelete = async (record: MaintenanceRecord) => {
    if (confirm(`Are you sure you want to delete this record?`)) {
      try {
        await supabaseService.deleteDocument('maintenance', record.id);
        toast.success("Record deleted");
      } catch (error) {
        toast.error("Failed to delete record");
      }
    }
  };

  const resetForm = () => {
    setFormData({
      assetId: '',
      issueDescription: '',
      performedBy: '',
      status: MaintenanceStatus.PENDING,
      cost: 0,
      date: new Date().toISOString().split('T')[0],
    });
    setEditingRecord(null);
  };

  const handleExport = () => {
    const exportData = records.map(({ id, createdAt, updatedAt, ...rest }: any) => rest);
    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `maintenance_export_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Maintenance records exported");
  };

  const handleImport = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const importedData = results.data as any[];
          const formatted = importedData.map(item => ({
            assetId: item.assetId || item['Asset ID'] || '',
            issueDescription: item.issueDescription || item.Issue || '',
            performedBy: item.performedBy || item['Performed By'] || '',
            status: (item.status || item.Status || MaintenanceStatus.PENDING) as MaintenanceStatus,
            cost: parseFloat(item.cost || item.Cost || '0') || 0,
            date: item.date || item.Date || new Date().toISOString().split('T')[0],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }));

          if (formatted.length > 0) {
            await supabaseService.addDocuments('maintenance', formatted);
            toast.success(`Successfully imported ${formatted.length} records`);
          }
        } catch (error) {
          toast.error("Import failed");
        }
      }
    });
  };

  const columns = [
    { header: 'Date', accessorKey: 'date' as keyof MaintenanceRecord },
    { header: 'Issue', accessorKey: 'issueDescription' as keyof MaintenanceRecord },
    {
      header: 'Status',
      accessorKey: 'status' as keyof MaintenanceRecord,
      cell: (item: MaintenanceRecord) => {
        const variants: Record<MaintenanceStatus, string> = {
          [MaintenanceStatus.COMPLETED]: 'bg-green-500/10 text-green-500 border-green-500/20',
          [MaintenanceStatus.IN_PROGRESS]: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
          [MaintenanceStatus.PENDING]: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
        };
        return (
          <Badge variant="outline" className={variants[item.status]}>
            {item.status}
          </Badge>
        );
      }
    },
    {
      header: 'Cost',
      accessorKey: 'cost' as keyof MaintenanceRecord,
      cell: (item: MaintenanceRecord) => `$${Number(item.cost).toFixed(2)}`
    },
    { header: 'Performed By', accessorKey: 'performedBy' as keyof MaintenanceRecord },
  ];

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Maintenance</h2>
      </div>
      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-64 bg-muted rounded"></div>
        </div>
      ) : (
        <DataTable
          title="Record"
          data={records}
          columns={columns}
          onAdd={() => { resetForm(); setIsDialogOpen(true); }}
          onExport={handleExport}
          onImport={handleImport}
          onEdit={(record) => {
            setEditingRecord(record);
            setFormData({
              assetId: record.assetId,
              issueDescription: record.issueDescription,
              performedBy: record.performedBy || '',
              status: record.status,
              cost: record.cost,
              date: record.date,
            });
            setIsDialogOpen(true);
          }}
          onDelete={handleDelete}
          useDirectActions={true}
          searchPlaceholder="Search records..."
        />
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingRecord ? 'Edit Record' : 'Add Maintenance Record'}</DialogTitle>
            <DialogDescription>
              Log maintenance activities for equipment tracking.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="issue" className="text-right">Issue</Label>
              <Input
                id="issue"
                className="col-span-3"
                value={formData.issueDescription}
                onChange={(e) => setFormData({ ...formData, issueDescription: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="performedBy" className="text-right">By</Label>
              <Input
                id="performedBy"
                className="col-span-3"
                value={formData.performedBy}
                onChange={(e) => setFormData({ ...formData, performedBy: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="cost" className="text-right">Cost ($)</Label>
              <Input
                id="cost"
                type="number"
                className="col-span-3"
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">Status</Label>
              <div className="col-span-3">
                <Select 
                  value={formData.status} 
                  onValueChange={(val: MaintenanceStatus) => setFormData({ ...formData, status: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(MaintenanceStatus).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="date" className="text-right">Date</Label>
              <Input
                id="date"
                type="date"
                className="col-span-3"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save Record</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
