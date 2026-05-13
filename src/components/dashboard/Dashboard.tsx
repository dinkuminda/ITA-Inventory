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
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col gap-1">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Overview</h2>
        <p className="text-muted-foreground">Monitoring organizational resources and performance analytics.</p>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <ShadCard className="border-none shadow-md shadow-primary/5 bg-card/50 backdrop-blur-sm rounded-[2rem] hover:bg-card transition-colors duration-300">
          <ShadCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <ShadCardTitle className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Total Assets
            </ShadCardTitle>
            <div className="p-2 bg-primary/10 text-primary rounded-xl">
              <Laptop size={18} />
            </div>
          </ShadCardHeader>
          <ShadCardContent>
            <div className="text-4xl font-bold tracking-tight">{totalAssets}</div>
            <p className="text-[10px] text-muted-foreground mt-3 flex items-center gap-1 font-bold uppercase tracking-widest">
              <span className="text-emerald-600 flex items-center gap-0.5">
                <ArrowUpRight size={12} /> Live
              </span>
              units in registry
            </p>
          </ShadCardContent>
        </ShadCard>

        <ShadCard className="border-none shadow-md shadow-primary/5 bg-secondary/50 backdrop-blur-sm rounded-[2rem] hover:bg-secondary transition-colors duration-300">
          <ShadCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <ShadCardTitle className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Software Keys
            </ShadCardTitle>
            <div className="p-2 bg-primary/10 text-primary rounded-xl">
              <Key size={18} />
            </div>
          </ShadCardHeader>
          <ShadCardContent>
            <div className="text-4xl font-bold tracking-tight">{activeLicenses}</div>
            <p className="text-[10px] text-muted-foreground mt-3 font-bold uppercase tracking-widest">
              Active subscriptions
            </p>
          </ShadCardContent>
        </ShadCard>

        <ShadCard className={`border-none shadow-md shadow-primary/5 rounded-[2rem] transition-colors duration-300 ${pendingMaintenance > 0 ? 'bg-destructive/10' : 'bg-card/50'}`}>
          <ShadCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <ShadCardTitle className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Maintenance
            </ShadCardTitle>
            <div className={`p-2 rounded-xl ${pendingMaintenance > 0 ? 'bg-destructive text-destructive-foreground' : 'bg-muted text-muted-foreground'}`}>
              <ShieldAlert size={18} />
            </div>
          </ShadCardHeader>
          <ShadCardContent>
            <div className={`text-4xl font-bold tracking-tight ${pendingMaintenance > 0 ? 'text-destructive' : ''}`}>
              {pendingMaintenance}
            </div>
            <p className="text-[10px] text-muted-foreground mt-3 font-bold uppercase tracking-widest">
              Open service tickets
            </p>
          </ShadCardContent>
        </ShadCard>

        <ShadCard className="border-none shadow-md shadow-primary/5 bg-accent/30 backdrop-blur-sm rounded-[2rem] hover:bg-accent/40 transition-colors duration-300">
          <ShadCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <ShadCardTitle className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
              {isStaff ? 'Join Date' : 'Staff Count'}
            </ShadCardTitle>
            <div className="p-2 bg-primary/10 text-primary rounded-xl">
              <Users size={18} />
            </div>
          </ShadCardHeader>
          <ShadCardContent>
            <div className="text-4xl font-bold tracking-tight">
              {isStaff ? (employees.find(e => e.email === userEmail)?.joinDate ? format(new Date(employees.find(e => e.email === userEmail).joinDate), 'MMM yy') : 'N/A') : assignedUsers}
            </div>
            <p className="text-[10px] text-muted-foreground mt-3 font-bold uppercase tracking-widest">
               {isStaff ? 'Operational since' : 'Registered personnel'}
            </p>
          </ShadCardContent>
        </ShadCard>
      </div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-7">
        <ShadCard className="col-span-4 border-none shadow-xl shadow-primary/5 bg-card/30 rounded-[2.5rem]">
          <ShadCardHeader>
            <ShadCardTitle className="text-xl font-bold tracking-tight">Resource Pulse</ShadCardTitle>
            <ShadCardDescription className="text-xs font-bold uppercase tracking-widest">Distribution across categories</ShadCardDescription>
          </ShadCardHeader>
          <ShadCardContent>
            <div className="h-[300px] mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={assetChartData.length > 0 ? assetChartData : [{ name: 'None', count: 0, fill: '#64748b' }]}>
                  <XAxis 
                    dataKey="name" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false} 
                    tick={{ fill: 'var(--muted-foreground)', fontWeight: 'bold' }}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--card)', border: 'none', borderRadius: '16px', fontSize: '10px', fontWeight: 'bold', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                    cursor={{ fill: 'var(--muted)', opacity: 0.1 }}
                  />
                  <Bar dataKey="count" radius={[12, 12, 0, 0]} barSize={40}>
                    {assetChartData.map((entry, index) => (
                      <Cell key={`bar-cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ShadCardContent>
        </ShadCard>

        <ShadCard className="col-span-3 border-none shadow-xl shadow-primary/5 bg-card/30 rounded-[2.5rem] overflow-hidden">
          <ShadCardHeader>
            <ShadCardTitle className="text-xl font-bold tracking-tight">System Health</ShadCardTitle>
            <ShadCardDescription className="text-xs font-bold uppercase tracking-widest">Operational status overview</ShadCardDescription>
          </ShadCardHeader>
          <ShadCardContent>
            <div className="h-[220px] relative mt-4">
              {statusChartData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={95}
                        paddingAngle={8}
                        dataKey="value"
                        stroke="none"
                        cornerRadius={12}
                        animationDuration={1500}
                      >
                        {statusChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 'bold' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-4xl font-black text-foreground tracking-tighter">{totalAssets}</span>
                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em] mt-1">Units</span>
                  </div>
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm gap-2">
                  <AlertCircle size={32} className="opacity-20" />
                  <span className="text-xs font-bold uppercase tracking-widest italic opacity-50">Telemetry Lost</span>
                </div>
              )}
            </div>
            <div className="mt-8 grid grid-cols-2 gap-3">
              {statusChartData.map((item) => (
                <div key={item.name} className="flex items-center gap-3 px-4 py-2.5 rounded-2xl border border-border/50 bg-background/50 backdrop-blur-sm">
                  <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider truncate flex-1">{item.name}</span>
                  <span className="text-sm font-black text-foreground">{item.value}</span>
                </div>
              ))}
            </div>
          </ShadCardContent>
        </ShadCard>
      </div>
    </div>
  );
}
