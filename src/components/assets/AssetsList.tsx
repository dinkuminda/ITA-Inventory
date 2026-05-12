/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from "react";
import { useState, useEffect } from 'react';
import { PlusCircle, Upload, Printer } from "lucide-react";
import { Asset, AssetStatus, ApprovalStatus, UserRole, Employee } from '@/src/types';
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
import { useReactToPrint } from 'react-to-print';

export function AssetsList({ userRole, userEmail }: { userRole?: UserRole, userEmail?: string }) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isQRDialogOpen, setIsQRDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [qrAsset, setQRAsset] = useState<Asset | null>(null);

  const qrRef = React.useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: qrRef,
    documentTitle: `Asset_QR_${qrAsset?.serialNumber || 'Label'}`,
  });

  const isAdminEmail = userEmail?.toLowerCase().trim() === 'dinkuh12@gmail.com';
  const isAdmin = userRole === UserRole.ADMIN || isAdminEmail;
  const isStaff = userRole === UserRole.STAFF;
  const hasEditPermission = isAdmin || isStaff;

  const displayedAssets = isAdmin ? assets : assets.filter(a => a.assignedTo === userEmail);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    type: ASSET_TYPES[0],
    serialNumber: '',
    status: AssetStatus.IN_STOCK,
    location: LOCATIONS[0],
    specificLocation: '',
    assignedTo: '',
    roles: '',
    date: new Date().toISOString().split('T')[0],
    remark: '',
  });

  const [locationDetails, setLocationDetails] = useState({
    floor: '',
    side: ''
  });

  useEffect(() => {
    if (formData.location === 'Gotera HQ office') {
      const { floor, side } = locationDetails;
      if (floor || side) {
        const parts = [];
        if (floor) parts.push(floor);
        if (side) parts.push(side);
        setFormData(prev => ({
          ...prev,
          specificLocation: parts.join(' - ')
        }));
      }
    }
  }, [locationDetails, formData.location]);

  useEffect(() => {
    const unsubscribeAssets = supabaseService.subscribeCollection<Asset>('assets', (data) => {
      setAssets(data);
      setLoading(false);
    }, 'createdAt');

    const unsubscribeEmployees = supabaseService.subscribeCollection<Employee>('employees', (data) => {
      setEmployees(data);
    }, 'fullName');

    return () => {
      unsubscribeAssets();
      unsubscribeEmployees();
    };
  }, []);

  const handleSave = async () => {
    try {
      const dataToSave = {
        ...formData,
        assignedTo: isStaff ? (userEmail || formData.assignedTo) : formData.assignedTo,
        serialNumber: formData.serialNumber.trim() || null,
        approvalStatus: ApprovalStatus.APPROVED,
        updatedAt: new Date().toISOString(),
      };

      if (editingAsset) {
        await supabaseService.updateDocument('assets', editingAsset.id, dataToSave);
        toast.success("Asset updated successfully");
      } else {
        await supabaseService.addDocument('assets', {
          ...dataToSave,
          createdAt: new Date().toISOString(),
        });
        toast.success("Asset added successfully");
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (error: any) {
      console.error("Save error:", error);
      toast.error(error?.message || error?.details || "Failed to save asset");
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
      assignedTo: isStaff ? (userEmail || '') : '',
      roles: '',
      date: new Date().toISOString().split('T')[0],
      remark: '',
    });
    setLocationDetails({ floor: '', side: '' });
    setEditingAsset(null);
  };

  const handleExport = () => {
    const exportData = displayedAssets.map(({ id, createdAt, updatedAt, approvalStatus, ...rest }) => rest);
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
            serialNumber: (item.serialNumber || item.SerialNumber || item['Serial No.'] || "").trim() || null,
            status: (item.status || item.Status || AssetStatus.IN_STOCK) as AssetStatus,
            location: item.location || item.Location || LOCATIONS[0],
            specificLocation: item.specificLocation || item.SpecificLocation || item['Specific Location'] || "",
            assignedTo: isStaff ? (userEmail || "") : (item.assignedTo || item.AssignedTo || item['Assigned To'] || ""),
            roles: item.roles || item.Roles || "",
            date: item.date || item.Date || item['Acquisition Date'] || new Date().toISOString().split('T')[0],
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
    { header: 'Roles', accessorKey: 'roles' as keyof Asset },
    { header: 'Acquisition Date', accessorKey: 'date' as keyof Asset },
    { header: 'Remark', accessorKey: 'remark' as keyof Asset },
    {
      header: 'Last Updated',
      accessorKey: 'updatedAt' as keyof Asset,
      cell: (item: Asset) => item.updatedAt ? format(new Date(item.updatedAt), 'MMM d, yyyy') : 'N/A'
    }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-black tracking-tight text-slate-900 italic">Assets</h2>
          <p className="text-sm font-medium text-slate-500">Manage and track physical equipment across all locations.</p>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          {hasEditPermission && (
            <>
              <Input
                type="file"
                accept=".csv"
                className="hidden"
                id="assets-bulk-import"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImport(file);
                }}
              />
              <Button 
                variant="outline" 
                onClick={() => handleExport()}
                className="h-12 px-6 rounded-2xl border-slate-200 hover:bg-slate-50 text-slate-600 transition-all font-bold gap-2 flex-1 md:flex-none"
              >
                <Upload className="h-5 w-5" />
                Export
              </Button>
              <Button 
                variant="outline" 
                onClick={() => document.getElementById('assets-bulk-import')?.click()}
                className="h-12 px-6 rounded-2xl border-slate-200 hover:bg-slate-50 text-slate-600 transition-all font-bold gap-2 flex-1 md:flex-none"
              >
                <Upload className="h-5 w-5" />
                Import
              </Button>
            </>
          )}
          <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} className="h-12 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-500/20 transition-all font-bold gap-2 flex-1 md:flex-none">
            <PlusCircle className="h-5 w-5" />
            Add Asset
          </Button>
        </div>
      </div>
      
      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-muted rounded w-1/3"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      ) : (
        <DataTable
          title="Asset"
          data={displayedAssets}
          columns={columns}
          onAdd={undefined}
          onExport={handleExport}
          onImport={hasEditPermission ? handleImport : undefined}
          onEdit={hasEditPermission ? (asset) => { 
            setEditingAsset(asset);
            const isGotera = asset.location === 'Gotera HQ office';
            let floor = '';
            let side = '';
            
            if (isGotera && asset.specificLocation) {
              const parts = asset.specificLocation.split(' - ');
              floor = parts[0] || '';
              side = parts[1] || '';
            }

            setLocationDetails({ floor, side });
            setFormData({
              name: asset.name,
              type: asset.type,
              serialNumber: asset.serialNumber || '',
              status: asset.status,
              location: asset.location || LOCATIONS[0],
              specificLocation: asset.specificLocation || '',
              assignedTo: asset.assignedTo || '',
              roles: asset.roles || '',
              date: asset.date || new Date().toISOString().split('T')[0],
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
          <div ref={qrRef} className="flex flex-col items-center justify-center space-y-6 pt-6 print:p-8 print:bg-white">
            {qrAsset && (
              <>
                <div className="p-4 bg-white rounded-lg shadow-sm border print:border-0 print:shadow-none">
                  <QRCodeSVG 
                    value={`Asset: ${qrAsset.name}\nS/N: ${qrAsset.serialNumber || 'N/A'}\nLoc: ${qrAsset.location || 'N/A'}`}
                    size={200}
                    level="H"
                    includeMargin={true}
                  />
                </div>
                <div className="text-center space-y-1">
                  <h4 className="font-bold text-lg print:text-xl">{qrAsset.name}</h4>
                  <p className="text-sm text-muted-foreground print:text-base print:text-black">S/N: {qrAsset.serialNumber || 'N/A'}</p>
                  <p className="text-xs font-bold text-blue-600 uppercase tracking-wider print:text-blue-800">{qrAsset.location}</p>
                  {qrAsset.assignedTo && <p className="text-xs text-slate-500 print:text-slate-700">Assigned: {qrAsset.assignedTo}</p>}
                </div>
              </>
            )}
          </div>
          <DialogFooter className="print:hidden">
            <Button onClick={() => handlePrint()} variant="outline" className="gap-2">
              <Printer className="h-4 w-4" />
              Print Code
            </Button>
            <Button onClick={() => setIsQRDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingAsset ? 'Edit Asset' : 'Add New Asset'}</DialogTitle>
            <DialogDescription></DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto px-1">
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
              <Label htmlFor="specificLocation" className="text-right whitespace-nowrap text-xs">Specific Location</Label>
              <div className="col-span-3 space-y-2">
                {formData.location === 'Gotera HQ office' ? (
                  <div className="grid grid-cols-2 gap-2">
                    <Select 
                      value={locationDetails.floor} 
                      onValueChange={(val) => setLocationDetails({ ...locationDetails, floor: val })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Floor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Ground Floor">Ground Floor</SelectItem>
                        {[...Array(13)].map((_, i) => (
                          <SelectItem key={i + 1} value={`${i + 1}th Floor`}>{i + 1}th Floor</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select 
                      value={locationDetails.side} 
                      onValueChange={(val) => setLocationDetails({ ...locationDetails, side: val })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Side" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Left Side">Left Side</SelectItem>
                        <SelectItem value="Right Side">Right Side</SelectItem>
                        <SelectItem value="Center">Center</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <Input
                    id="specificLocation"
                    value={formData.specificLocation}
                    onChange={(e) => setFormData({ ...formData, specificLocation: e.target.value })}
                    placeholder="Room #, Desk ID, etc."
                  />
                )}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="assignedTo" className="text-right">Assigned</Label>
              <div className="col-span-3 space-y-2">
                <div className="flex gap-2">
                  <Input
                    id="assignedTo"
                    list="employee-list"
                    value={formData.assignedTo}
                    onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                    placeholder="Search name or enter email..."
                    disabled={isStaff}
                  />
                  {!isStaff && (
                    <>
                      <datalist id="employee-list">
                        {employees.map(emp => (
                          <option key={emp.id} value={emp.email}>
                            {emp.fullName} ({emp.department})
                          </option>
                        ))}
                      </datalist>
                      {formData.assignedTo.includes('@') && !employees.find(e => e.email === formData.assignedTo) && (
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={async () => {
                            try {
                              const emailPrefix = formData.assignedTo.split('@')[0];
                              const newEmp = {
                                employeeId: `EMP-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
                                fullName: emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1).replace(/[._]/g, ' '),
                                email: formData.assignedTo,
                                department: 'Auto-Registered',
                                position: 'Asset Holder',
                                status: 'Active',
                                joinDate: new Date().toISOString().split('T')[0],
                                createdAt: new Date().toISOString(),
                                updatedAt: new Date().toISOString(),
                              };
                              await supabaseService.addDocument('employees', newEmp);
                              toast.success("Employee registered successfully");
                            } catch (error: any) {
                              console.error("Auto-registration error:", error);
                              toast.error(error.message || "Registration failed");
                            }
                          }}
                        >
                          Register
                        </Button>
                      )}
                    </>
                  )}
                </div>
                {!isStaff && <p className="text-[10px] text-muted-foreground">Select an employee by email or enter a new email to register. Registered employees can sign up with this email to access the system.</p>}
                {isStaff && <p className="text-[10px] text-muted-foreground text-blue-600 font-medium">Assets you add will be automatically assigned to you ({userEmail}).</p>}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="roles" className="text-right">Roles</Label>
              <Input
                id="roles"
                className="col-span-3"
                value={formData.roles}
                onChange={(e) => setFormData({ ...formData, roles: e.target.value })}
                placeholder="User departments/roles"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="date" className="text-right whitespace-nowrap text-xs">Acquisition Date</Label>
              <Input
                id="date"
                type="date"
                className="col-span-3"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4 pb-2">
              <Label htmlFor="remark" className="text-right">Remark</Label>
              <Input
                id="remark"
                className="col-span-3"
                value={formData.remark}
                onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                placeholder="Short remark..."
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
