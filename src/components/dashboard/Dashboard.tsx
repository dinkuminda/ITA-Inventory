/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from "react";
import { useState, useEffect } from 'react';
import {
  Laptop,
  Key,
  ShieldAlert,
  Users,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Asset, AssetStatus, License, MaintenanceRecord } from '@/src/types';
import { supabaseService } from '@/src/lib/supabaseService';

import { Card as ShadCard, CardContent as ShadCardContent, CardHeader as ShadCardHeader, CardTitle as ShadCardTitle, CardDescription as ShadCardDescription } from '@/components/ui/card';

export function Dashboard() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRecord[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

  useEffect(() => {
    const unsubAssets = supabaseService.subscribeCollection<Asset>('assets', setAssets);
    const unsubLicenses = supabaseService.subscribeCollection<License>('licenses', setLicenses);
    const unsubMaintenance = supabaseService.subscribeCollection<MaintenanceRecord>('maintenance', setMaintenance);
    const unsubEmployees = supabaseService.subscribeCollection<any>('employees', setEmployees);
    
    return () => {
      unsubAssets();
      unsubLicenses();
      unsubMaintenance();
      unsubEmployees();
    };
  }, []);

  const totalAssets = assets.length;
  const activeLicenses = licenses.length;
  const pendingMaintenance = maintenance.filter(m => m.status !== 'Completed').length;
  const assignedUsers = employees.length;

  // Chart Logic
  const assetTypeCounts: Record<string, number> = {};
  assets.forEach(a => {
    assetTypeCounts[a.type] = (assetTypeCounts[a.type] || 0) + 1;
  });
  
  const assetChartData = Object.entries(assetTypeCounts).map(([name, count]) => ({ name, count }));

  const statusCounts: Record<string, number> = {
    [AssetStatus.IN_STOCK]: 0,
    [AssetStatus.ASSIGNED]: 0,
    [AssetStatus.MAINTENANCE]: 0,
    [AssetStatus.RETIRED]: 0,
  };
  assets.forEach(a => {
    if (statusCounts[a.status] !== undefined) {
      statusCounts[a.status] += 1;
    }
  });

  const statusChartData = [
    { name: 'In Stock', value: statusCounts[AssetStatus.IN_STOCK], color: '#10b981' },
    { name: 'Assigned', value: statusCounts[AssetStatus.ASSIGNED], color: '#3b82f6' },
    { name: 'Repair', value: statusCounts[AssetStatus.MAINTENANCE], color: '#f59e0b' },
    { name: 'Retired', value: statusCounts[AssetStatus.RETIRED], color: '#6b7280' },
  ].filter(d => d.value > 0);

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <ShadCard>
          <ShadCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <ShadCardTitle className="text-sm font-medium">Total Assets</ShadCardTitle>
            <Laptop className="h-4 w-4 text-muted-foreground" />
          </ShadCardHeader>
          <ShadCardContent>
            <div className="text-2xl font-bold">{totalAssets}</div>
            <p className="text-xs text-muted-foreground">Across all categories</p>
          </ShadCardContent>
        </ShadCard>
        <ShadCard>
          <ShadCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <ShadCardTitle className="text-sm font-medium">Active Licenses</ShadCardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </ShadCardHeader>
          <ShadCardContent>
            <div className="text-2xl font-bold">{activeLicenses}</div>
            <p className="text-xs text-muted-foreground">Software entitlements</p>
          </ShadCardContent>
        </ShadCard>
        <ShadCard>
          <ShadCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <ShadCardTitle className="text-sm font-medium">Maintenance Pending</ShadCardTitle>
            <ShieldAlert className="h-4 w-4 text-muted-foreground" />
          </ShadCardHeader>
          <ShadCardContent>
            <div className={`text-2xl font-bold ${pendingMaintenance > 0 ? 'text-orange-500' : ''}`}>
              {pendingMaintenance}
            </div>
            <p className="text-xs text-muted-foreground">Open service records</p>
          </ShadCardContent>
        </ShadCard>
        <ShadCard>
          <ShadCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <ShadCardTitle className="text-sm font-medium">Assigned Users</ShadCardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </ShadCardHeader>
          <ShadCardContent>
            <div className="text-2xl font-bold">{assignedUsers}</div>
            <div className="flex items-center gap-1">
              <div className="w-full bg-muted h-1.5 rounded-full mt-2">
                <div 
                  className="bg-primary h-full rounded-full" 
                  style={{ width: `${assignedUsers > 0 ? (assignedUsers / 100) * 100 : 0}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground mt-1.5">
                Staff Directory
              </span>
            </div>
          </ShadCardContent>
        </ShadCard>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <ShadCard className="col-span-4">
          <ShadCardHeader>
            <ShadCardTitle>Asset Distribution</ShadCardTitle>
          </ShadCardHeader>
          <ShadCardContent className="pl-2">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={assetChartData.length > 0 ? assetChartData : [{ name: 'None', count: 0 }]}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                    cursor={{ fill: '#f1f5f9' }}
                  />
                  <Bar dataKey="count" fill="currentColor" radius={[4, 4, 0, 0]} className="fill-primary" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ShadCardContent>
        </ShadCard>
        <ShadCard className="col-span-3">
          <ShadCardHeader>
            <ShadCardTitle>Inventory Status</ShadCardTitle>
            <ShadCardDescription>Overview of hardware availability</ShadCardDescription>
          </ShadCardHeader>
          <ShadCardContent>
            <div className="h-[300px]">
              {statusChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {statusChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  Add assets to see status distribution
                </div>
              )}
            </div>
            <div className="mt-4 space-y-2">
              {statusChartData.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-muted-foreground">{item.name}</span>
                  </div>
                  <span className="font-medium">{item.value}</span>
                </div>
              ))}
            </div>
          </ShadCardContent>
        </ShadCard>
      </div>
    </div>
  );
}
