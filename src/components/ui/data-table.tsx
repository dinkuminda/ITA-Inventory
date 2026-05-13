/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoreHorizontal, Search, PlusCircle, Filter, Pencil, Trash2, QrCode, Download, Upload } from "lucide-react";
import { useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface DataTableProps<T> {
  data: T[];
  columns: {
    header: string;
    accessorKey: keyof T;
    cell?: (item: T) => React.ReactNode;
  }[];
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  onViewQR?: (item: T) => void;
  title: string;
  onAdd?: () => void;
  onExport?: () => void;
  onImport?: (file: File) => void;
  searchPlaceholder?: string;
  actionsLabel?: string;
  useDirectActions?: boolean;
}

export function DataTable<T extends { id: string }>({
  data,
  columns,
  onEdit,
  onDelete,
  onViewQR,
  title,
  onAdd,
  onExport,
  onImport,
  searchPlaceholder = "Search...",
  actionsLabel = "Actions",
  useDirectActions = false
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredData = data.filter((item) =>
    Object.values(item).some(
      (val) =>
        val &&
        val.toString().toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground opacity-50" />
            <Input
              placeholder={searchPlaceholder}
              className="pl-12 h-14 rounded-full bg-secondary/50 border-border/5 focus:bg-background transition-all shadow-sm font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon" className="h-14 w-14 rounded-full border-border/5 shadow-sm hover:bg-secondary">
            <Filter className="h-5 w-5" />
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          {onExport && (
            <Button variant="ghost" onClick={onExport} className="gap-2 h-14 px-6 rounded-full font-bold text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all">
              <Download className="h-5 w-5" />
              <span className="hidden lg:inline">Export CSV</span>
            </Button>
          )}
          {onImport && (
            <div className="relative">
              <Input
                type="file"
                accept=".csv"
                className="hidden"
                id={`import-csv-${title}`}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onImport(file);
                }}
              />
              <Button 
                variant="ghost" 
                className="gap-2 h-14 px-6 rounded-full font-bold text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all"
                onClick={() => document.getElementById(`import-csv-${title}`)?.click()}
              >
                <Upload className="h-5 w-5" />
                <span className="hidden lg:inline">Import Records</span>
              </Button>
            </div>
          )}
          {onAdd && (
            <Button onClick={onAdd} className="gap-2 h-14 px-8 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-black shadow-lg shadow-primary/20">
              <PlusCircle className="h-5 w-5" />
              <span>Add {title}</span>
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-[2.5rem] border border-border/5 bg-card overflow-hidden shadow-2xl shadow-primary/5">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-secondary/30">
              <TableRow className="hover:bg-transparent border-none">
                {columns.map((col, i) => (
                  <TableHead key={i} className="h-16 px-6 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                    {col.header}
                  </TableHead>
                ))}
                <TableHead className={`h-16 px-6 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] text-right ${useDirectActions ? "w-[160px]" : "w-[100px]"}`}>
                  {actionsLabel}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length > 0 ? (
                filteredData.map((item, index) => (
                  <TableRow 
                    key={item.id} 
                    className={`hover:bg-secondary/50 border-border/5 transition-colors group ${index === filteredData.length - 1 ? 'border-none' : ''}`}
                  >
                    {columns.map((col, i) => (
                      <TableCell key={i} className="px-6 h-16 text-sm font-medium text-foreground">
                        {col.cell ? col.cell(item) : (item[col.accessorKey] as React.ReactNode)}
                      </TableCell>
                    ))}
                    <TableCell className="px-6 h-16 text-right">
                      {useDirectActions ? (
                        <div className="flex items-center justify-end gap-1">
                          <TooltipProvider>
                            {onViewQR && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl hover:bg-primary/10 hover:text-primary transition-all" onClick={() => onViewQR(item)}>
                                    <QrCode className="h-5 w-5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>View QR Protocol</TooltipContent>
                              </Tooltip>
                            )}
                            {onEdit && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl hover:bg-primary/10 hover:text-primary transition-all" onClick={() => onEdit(item)}>
                                    <Pencil className="h-5 w-5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Modify Entry</TooltipContent>
                              </Tooltip>
                            )}
                            {onDelete && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-10 w-10 rounded-2xl text-destructive hover:bg-destructive/10 transition-all" 
                                    onClick={() => onDelete(item)}
                                  >
                                    <Trash2 className="h-5 w-5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Purge Data</TooltipContent>
                              </Tooltip>
                            )}
                          </TooltipProvider>
                        </div>
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-10 w-10 p-0 rounded-2xl hover:bg-secondary" id={`actions-trigger-${item.id}`}>
                              <MoreHorizontal className="h-5 w-5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-[1.5rem] p-2 border-border/10 shadow-2xl">
                            <DropdownMenuLabel className="px-3 py-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Protocol Actions</DropdownMenuLabel>
                            {onViewQR && (
                              <DropdownMenuItem onSelect={() => onViewQR(item)} className="rounded-xl px-3 py-2 cursor-pointer focus:bg-primary focus:text-primary-foreground font-bold text-sm">
                                <QrCode className="mr-2 h-4 w-4" />
                                View QR Code
                              </DropdownMenuItem>
                            )}
                            {onEdit && (
                              <DropdownMenuItem onSelect={() => onEdit(item)} className="rounded-xl px-3 py-2 cursor-pointer focus:bg-primary focus:text-primary-foreground font-bold text-sm">
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit Record
                              </DropdownMenuItem>
                            )}
                            {onDelete && (
                              <>
                                <DropdownMenuSeparator className="my-1 bg-border/10" />
                                <DropdownMenuItem
                                  onSelect={() => onDelete(item)}
                                  className="text-destructive focus:text-destructive-foreground focus:bg-destructive rounded-xl px-3 py-2 cursor-pointer font-bold text-sm"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete Entry
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length + 1} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground">
                      <Search className="h-12 w-12 opacity-20" />
                      <p className="text-lg font-bold italic opacity-40">No matching protocols found.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
