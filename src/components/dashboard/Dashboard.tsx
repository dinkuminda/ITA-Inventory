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
  ArrowUpRight,
  Activity,
  History,
  AlertCircle
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
import { Asset, AssetStatus, License, MaintenanceRecord, UserRole } from '@/src/types';
import { supabaseService } from '@/src/lib/supabaseService';
import { format } from 'date-fns';

import { 
  Card as ShadCard, 
  CardContent as ShadCardContent, 
  CardHeader as ShadCardHeader, 
  CardTitle as ShadCardTitle, 
  CardDescription as ShadCardDescription 
} from '@/components/ui/card';

export function Dashboard({ userRole, userEmail }: { userRole?: UserRole, userEmail?: string }) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRecord[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

  const isAdmin = userRole === UserRole.ADMIN;
  const isStaff = userRole === UserRole.STAFF;

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

  const filteredAssets = isAdmin ? assets : assets.filter(a => a.assignedTo === userEmail);
  const filteredLicenses = isAdmin ? licenses : licenses.filter(l => l.assignedTo === userEmail);
  const filteredMaintenance = isAdmin ? maintenance : maintenance.filter(m => {
    const asset = assets.find(a => a.id === m.assetId);
    return asset && asset.assignedTo === userEmail;
  });

  const totalAssets = filteredAssets.length;
  const activeLicenses = filteredLicenses.length;
  const pendingMaintenance = filteredMaintenance.filter(m => m.status !== 'Completed').length;
  const assignedUsers = isAdmin ? employees.length : employees.filter(e => e.email === userEmail).length;

  // Chart Logic
  const assetTypeCounts: Record<string, number> = {};
  filteredAssets.forEach(a => {
    assetTypeCounts[a.type] = (assetTypeCounts[a.type] || 0) + 1;
  });
  
  const assetChartData = Object.entries(assetTypeCounts).map(([name, count], index) => ({ 
    name, 
    count, 
    fill: [`#3b82f6`, `#a855f7`, `#ec4899`, `#f59e0b`, `#10b981`][index % 5] 
  }));

  const statusCounts: Record<string, number> = {
    [AssetStatus.IN_STOCK]: 0,
    [AssetStatus.ASSIGNED]: 0,
    [AssetStatus.MAINTENANCE]: 0,
    [AssetStatus.RETIRED]: 0,
  };
  filteredAssets.forEach(a => {
    if (statusCounts[a.status] !== undefined) {
      statusCounts[a.status] += 1;
    }
  });

  const statusChartData = [
    { name: 'In Stock', value: statusCounts[AssetStatus.IN_STOCK], color: '#10b981' },
    { name: 'Assigned', value: statusCounts[AssetStatus.ASSIGNED], color: '#3b82f6' },
    { name: 'Repair', value: statusCounts[AssetStatus.MAINTENANCE], color: '#f59e0b' },
    { name: 'Retired', value: statusCounts[AssetStatus.RETIRED], color: '#ef4444' },
  ].filter(d => d.value > 0);

  return (
    <div className="flex-1 space-y-6 p-8 pt-6 bg-background min-h-screen">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-4xl font-black tracking-tight text-foreground italic flex items-center gap-3">
            System Overview
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse mt-2" />
          </h2>
          <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest opacity-70">
            Next-Gen Monitoring Solutions
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs font-black bg-secondary text-secondary-foreground px-4 py-2 rounded-full border border-border shadow-sm tracking-widest uppercase">
          <Activity size={14} className="text-emerald-500" />
          Live Status
        </div>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <ShadCard className="overflow-hidden border-none shadow-xl shadow-primary/5 bg-card group hover:scale-[1.02] transition-all duration-500 rounded-[2.5rem]">
          <div className="h-2 w-full bg-primary" />
          <ShadCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <ShadCardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">
              {isStaff ? 'My Assets' : 'Inventory'}
            </ShadCardTitle>
            <div className="p-3 bg-primary/10 text-primary rounded-2xl group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-500">
              <Laptop size={20} />
            </div>
          </ShadCardHeader>
          <ShadCardContent className="pt-2">
            <div className="text-4xl font-black text-foreground italic">{totalAssets}</div>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-2 flex items-center gap-1">
              Active Units <ArrowUpRight size={10} />
            </p>
          </ShadCardContent>
        </ShadCard>

        <ShadCard className="overflow-hidden border-none shadow-xl shadow-primary/5 bg-card group hover:scale-[1.02] transition-all duration-500 rounded-[2.5rem]">
          <div className="h-2 w-full bg-chart-1" />
          <ShadCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <ShadCardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">
              {isStaff ? 'My Licenses' : 'Software'}
            </ShadCardTitle>
            <div className="p-3 bg-chart-1/10 text-chart-1 rounded-2xl group-hover:bg-chart-1 group-hover:text-primary-foreground transition-all duration-500">
              <Key size={20} />
            </div>
          </ShadCardHeader>
          <ShadCardContent className="pt-2">
            <div className="text-4xl font-black text-foreground italic">{activeLicenses}</div>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-2">
              Valid Keys
            </p>
          </ShadCardContent>
        </ShadCard>

        <ShadCard className="overflow-hidden border-none shadow-xl shadow-primary/5 bg-card group hover:scale-[1.02] transition-all duration-500 rounded-[2.5rem]">
          <div className="h-2 w-full bg-destructive" />
          <ShadCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <ShadCardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">
              Maintenance
            </ShadCardTitle>
            <div className={`p-3 rounded-2xl transition-all duration-500 ${pendingMaintenance > 0 ? 'bg-destructive/10 text-destructive group-hover:bg-destructive group-hover:text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              <ShieldAlert size={20} />
            </div>
          </ShadCardHeader>
          <ShadCardContent className="pt-2">
            <div className={`text-4xl font-black italic ${pendingMaintenance > 0 ? 'text-destructive' : 'text-foreground'}`}>
              {pendingMaintenance}
            </div>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-2">
              Pending Tickets
            </p>
          </ShadCardContent>
        </ShadCard>

        <ShadCard className="overflow-hidden border-none shadow-xl shadow-primary/5 bg-card group hover:scale-[1.02] transition-all duration-500 rounded-[2.5rem]">
          <div className="h-2 w-full bg-emerald-500" />
          <ShadCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <ShadCardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">
              {isStaff ? 'Verify' : 'Staff'}
            </ShadCardTitle>
            <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-2xl group-hover:bg-emerald-500 group-hover:text-primary-foreground transition-all duration-500">
              <Users size={20} />
            </div>
          </ShadCardHeader>
          <ShadCardContent className="pt-2">
            <div className="text-4xl font-black text-foreground italic">
              {isStaff ? (employees.find(e => e.email === userEmail)?.joinDate ? format(new Date(employees.find(e => e.email === userEmail).joinDate), 'MMM yy') : 'N/A') : assignedUsers}
            </div>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-2 italic">
               {isStaff ? 'Operational status' : 'Total Personnel'}
            </p>
          </ShadCardContent>
        </ShadCard>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <ShadCard className="col-span-4 border-none shadow-xl shadow-primary/5 bg-card rounded-[3rem]">
          <ShadCardHeader className="flex flex-row items-center justify-between p-8 pb-4">
            <div className="space-y-1">
              <ShadCardTitle className="text-2xl font-black tracking-tight italic">Category Pulse</ShadCardTitle>
              <ShadCardDescription className="text-xs font-bold uppercase tracking-widest">Asset distribution hierarchy</ShadCardDescription>
            </div>
            <div className="p-3 bg-secondary rounded-2xl">
              <History size={20} className="text-muted-foreground" />
            </div>
          </ShadCardHeader>
          <ShadCardContent className="p-8 pt-0">
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={assetChartData.length > 0 ? assetChartData : [{ name: 'None', count: 0, fill: '#64748b' }]}>
                  <XAxis 
                    dataKey="name" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false} 
                    tick={{ fill: 'var(--muted-foreground)', fontWeight: '800' }}
                    textAnchor="middle"
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '24px', padding: '16px', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                    cursor={{ fill: 'var(--secondary)', radius: 12 }}
                  />
                  <Bar dataKey="count" radius={[12, 12, 12, 12]} barSize={32}>
                    {assetChartData.map((entry, index) => (
                      <Cell key={`bar-cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ShadCardContent>
        </ShadCard>

        <ShadCard className="col-span-3 border-none shadow-xl shadow-primary/5 bg-card rounded-[3rem] overflow-hidden">
          <ShadCardHeader className="p-8 pb-4">
            <ShadCardTitle className="text-2xl font-black tracking-tight italic">Inventory Health</ShadCardTitle>
            <ShadCardDescription className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Live operational metrics</ShadCardDescription>
          </ShadCardHeader>
          <ShadCardContent className="p-8 pt-0">
            <div className="h-[250px] relative">
              {statusChartData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={90}
                        outerRadius={110}
                        paddingAngle={12}
                        dataKey="value"
                        animationDuration={1500}
                        stroke="none"
                        cornerRadius={12}
                      >
                        {statusChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-5xl font-black text-foreground italic">{totalAssets}</span>
                    <span className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] mt-1">Units</span>
                  </div>
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm gap-4">
                  <AlertCircle size={48} className="opacity-20 translate-y-2" />
                  <span className="font-bold uppercase tracking-widest italic opacity-50">Data Outage</span>
                </div>
              )}
            </div>
            <div className="mt-8 flex flex-wrap gap-3 justify-center">
              {statusChartData.map((item) => (
                <div key={item.name} className="flex items-center gap-3 px-4 py-2 rounded-full border border-border bg-secondary/50">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{item.name}</span>
                  <span className="text-sm font-black text-foreground ml-1">{item.value}</span>
                </div>
              ))}
            </div>
          </ShadCardContent>
        </ShadCard>
      </div>
    </div>
  );
}
