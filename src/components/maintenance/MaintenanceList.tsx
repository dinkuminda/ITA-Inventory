/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from "react";
import { useState, useEffect } from 'react';
import { MaintenanceRecord, MaintenanceStatus } from '@/src/types';
import { DataTable } from '@/src/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { supabaseService } from '@/src/lib/supabaseService';
import { toast } from "sonner";

export function MaintenanceList() {
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = supabaseService.subscribeCollection<MaintenanceRecord>('maintenance', (data) => {
      setRecords(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

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
          onAdd={() => toast.info("Add Maintenance dialog coming in next update")}
          searchPlaceholder="Search records..."
        />
      )}
    </div>
  );
}
