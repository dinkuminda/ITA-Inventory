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
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-1 items-center space-x-2">
          <div className="relative w-[250px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
          {onExport && (
            <Button variant="outline" size="sm" onClick={onExport} className="gap-1 h-9">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
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
                variant="outline" 
                size="sm" 
                className="gap-1 h-9"
                onClick={() => document.getElementById(`import-csv-${title}`)?.click()}
              >
                <Upload className="h-4 w-4" />
                <span className="hidden sm:inline">Import</span>
              </Button>
            </div>
          )}
        </div>
        {onAdd && (
          <Button onClick={onAdd} className="gap-1">
            <PlusCircle className="h-4 w-4" />
            <span>Add {title}</span>
          </Button>
        )}
      </div>
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col, i) => (
                <TableHead key={i}>{col.header}</TableHead>
              ))}
              <TableHead className={useDirectActions ? "w-[120px]" : "w-[80px]"}>{actionsLabel}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length > 0 ? (
              filteredData.map((item) => (
                <TableRow key={item.id}>
                  {columns.map((col, i) => (
                    <TableCell key={i}>
                      {col.cell ? col.cell(item) : (item[col.accessorKey] as React.ReactNode)}
                    </TableCell>
                  ))}
                  <TableCell>
                    {useDirectActions ? (
                      <div className="flex items-center gap-1">
                        <TooltipProvider>
                          {onViewQR && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onViewQR(item)}>
                                  <QrCode className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>View QR</TooltipContent>
                            </Tooltip>
                          )}
                          {onEdit && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(item)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Edit</TooltipContent>
                            </Tooltip>
                          )}
                          {onDelete && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" 
                                  onClick={() => onDelete(item)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Delete</TooltipContent>
                            </Tooltip>
                          )}
                        </TooltipProvider>
                      </div>
                    ) : (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0" id={`actions-trigger-${item.id}`}>
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          {onViewQR && (
                            <DropdownMenuItem onSelect={() => onViewQR(item)}>
                              View QR Code
                            </DropdownMenuItem>
                          )}
                          {onEdit && (
                            <DropdownMenuItem onSelect={() => onEdit(item)}>
                              Edit
                            </DropdownMenuItem>
                          )}
                          {onDelete && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onSelect={() => onDelete(item)}
                                className="text-destructive focus:text-destructive"
                              >
                                Delete
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
                <TableCell colSpan={columns.length + 1} className="h-24 text-center">
                  No results found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
