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
    <div className="flex-1 space-y-4 p-8 pt-6 bg-slate-50/50 min-h-screen">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent italic">
          System Overview
        </h2>
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-white px-3 py-1 rounded-full border shadow-sm">
          <Activity size={14} className="text-green-500 animate-pulse" />
          Live Monitoring Active
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <ShadCard className="overflow-hidden border-none shadow-md ring-1 ring-blue-100 bg-white group hover:shadow-lg transition-all duration-300">
          <div className="h-1 w-full bg-blue-500" />
          <ShadCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <ShadCardTitle className="text-sm font-semibold text-blue-900">{isStaff ? 'My Assets' : 'Total Assets'}</ShadCardTitle>
            <div className="p-2 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
              <Laptop className="h-4 w-4 text-blue-600" />
            </div>
          </ShadCardHeader>
          <ShadCardContent>
            <div className="text-3xl font-bold text-blue-950">{totalAssets}</div>
            <p className="text-xs text-blue-600 font-medium flex items-center gap-1 mt-1">
              {isStaff ? 'Assets assigned to you' : 'Inventory units tracked'} <ArrowUpRight size={12} />
            </p>
          </ShadCardContent>
        </ShadCard>

        <ShadCard className="overflow-hidden border-none shadow-md ring-1 ring-purple-100 bg-white group hover:shadow-lg transition-all duration-300">
          <div className="h-1 w-full bg-purple-500" />
          <ShadCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <ShadCardTitle className="text-sm font-semibold text-purple-900">{isStaff ? 'My Licenses' : 'Software Licenses'}</ShadCardTitle>
            <div className="p-2 bg-purple-50 rounded-lg group-hover:bg-purple-100 transition-colors">
              <Key className="h-4 w-4 text-purple-600" />
            </div>
          </ShadCardHeader>
          <ShadCardContent>
            <div className="text-3xl font-bold text-purple-950">{activeLicenses}</div>
            <p className="text-xs text-purple-600 font-medium mt-1">
              {isStaff ? 'Your assigned licenses' : 'Active subscriptions'}
            </p>
          </ShadCardContent>
        </ShadCard>

        <ShadCard className="overflow-hidden border-none shadow-md ring-1 ring-amber-100 bg-white group hover:shadow-lg transition-all duration-300">
          <div className="h-1 w-full bg-amber-500" />
          <ShadCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <ShadCardTitle className="text-sm font-semibold text-amber-900">{isStaff ? 'My Pending Repairs' : 'Pending Repairs'}</ShadCardTitle>
            <div className={`p-2 rounded-lg transition-colors ${pendingMaintenance > 0 ? 'bg-red-50 group-hover:bg-red-100' : 'bg-amber-50 group-hover:bg-amber-100'}`}>
              <ShieldAlert className={`h-4 w-4 ${pendingMaintenance > 0 ? 'text-red-500' : 'text-amber-600'}`} />
            </div>
          </ShadCardHeader>
          <ShadCardContent>
            <div className={`text-3xl font-bold ${pendingMaintenance > 0 ? 'text-red-600' : 'text-amber-950'}`}>
              {pendingMaintenance}
            </div>
            <p className="text-xs text-amber-600 font-medium mt-1">
              {isStaff ? 'Tickets for your assets' : 'Active service tickets'}
            </p>
          </ShadCardContent>
        </ShadCard>

        <ShadCard className="overflow-hidden border-none shadow-md ring-1 ring-emerald-100 bg-white group hover:shadow-lg transition-all duration-300">
          <div className="h-1 w-full bg-emerald-500" />
          <ShadCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <ShadCardTitle className="text-sm font-semibold text-emerald-900">{isStaff ? 'Member Since' : 'Staff Count'}</ShadCardTitle>
            <div className="p-2 bg-emerald-50 rounded-lg group-hover:bg-emerald-100 transition-colors">
              <Users className="h-4 w-4 text-emerald-600" />
            </div>
          </ShadCardHeader>
          <ShadCardContent>
            <div className="text-3xl font-bold text-emerald-950">
              {isStaff ? (employees.find(e => e.email === userEmail)?.joinDate ? format(new Date(employees.find(e => e.email === userEmail).joinDate), 'MMM yyyy') : 'N/A') : assignedUsers}
            </div>
            <div className="flex items-center gap-1">
              {!isStaff && (
                <div className="w-full bg-emerald-50 h-1.5 rounded-full mt-2">
                  <div 
                    className="bg-emerald-500 h-full rounded-full" 
                    style={{ width: `${assignedUsers > 0 ? Math.min((assignedUsers / 50) * 100, 100) : 0}%` }}
                  />
                </div>
              )}
              {isStaff && <p className="text-xs text-emerald-600 font-medium mt-1">Employee verified</p>}
            </div>
          </ShadCardContent>
        </ShadCard>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <ShadCard className="col-span-4 border-none shadow-sm ring-1 ring-slate-200">
          <ShadCardHeader className="flex flex-row items-center justify-between">
            <div className="space-y-1">
              <ShadCardTitle className="text-lg">Category Distribution</ShadCardTitle>
              <ShadCardDescription>Asset units by their primary type</ShadCardDescription>
            </div>
            <div className="p-2 bg-slate-50 rounded-full">
              <History size={16} className="text-slate-400" />
            </div>
          </ShadCardHeader>
          <ShadCardContent className="pl-2">
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={assetChartData.length > 0 ? assetChartData : [{ name: 'None', count: 0, fill: '#64748b' }]}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                    tick={{ fill: '#64748b' }}
                  />
                  <YAxis 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(value) => `${value}`}
                    tick={{ fill: '#64748b' }}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: 'none', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    cursor={{ fill: '#f8fafc' }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={40}>
                    {assetChartData.map((entry, index) => (
                      <Cell key={`bar-cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ShadCardContent>
        </ShadCard>

        <ShadCard className="col-span-3 border-none shadow-sm ring-1 ring-slate-200 overflow-hidden">
          <ShadCardHeader className="bg-slate-50/50 pb-4">
            <ShadCardTitle className="text-lg">Inventory Health</ShadCardTitle>
            <ShadCardDescription>Operational status distribution</ShadCardDescription>
          </ShadCardHeader>
          <ShadCardContent className="pt-6">
            <div className="h-[250px] relative">
              {statusChartData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={75}
                        outerRadius={95}
                        paddingAngle={8}
                        dataKey="value"
                        animationDuration={1000}
                        stroke="none"
                      >
                        {statusChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-3xl font-bold text-slate-800">{totalAssets}</span>
                    <span className="text-xs text-slate-400 font-medium">Assets</span>
                  </div>
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm gap-2">
                  <AlertCircle size={32} className="text-slate-200" />
                  No data points available
                </div>
              )}
            </div>
            <div className="mt-8 grid grid-cols-2 gap-4">
              {statusChartData.map((item) => (
                <div key={item.name} className="flex flex-col gap-1 p-2 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-1.5">
                    <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{item.name}</span>
                  </div>
                  <span className="text-xl font-bold text-slate-800 ml-3">{item.value}</span>
                </div>
              ))}
            </div>
          </ShadCardContent>
        </ShadCard>
      </div>
    </div>
  );
}
