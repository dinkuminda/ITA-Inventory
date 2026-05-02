/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from "react";
import { useState, useEffect } from 'react';
import { License, LicenseStatus } from '@/src/types';
import { DataTable } from '@/src/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { supabaseService } from '@/src/lib/supabaseService';
import { toast } from "sonner";

export function LicensesList() {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = supabaseService.subscribeCollection<License>('licenses', (data) => {
      setLicenses(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

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
          onAdd={() => toast.info("Add License dialog coming in next update")}
          searchPlaceholder="Search licenses..."
        />
      )}
    </div>
  );
}
