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
import { MoreHorizontal, Search, PlusCircle, Filter } from "lucide-react";
import { useState } from "react";

interface DataTableProps<T> {
  data: T[];
  columns: {
    header: string;
    accessorKey: keyof T;
    cell?: (item: T) => React.ReactNode;
  }[];
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  title: string;
  onAdd?: () => void;
  searchPlaceholder?: string;
  actionsLabel?: string;
}

export function DataTable<T extends { id: string }>({
  data,
  columns,
  onEdit,
  onDelete,
  title,
  onAdd,
  searchPlaceholder = "Search...",
  actionsLabel = "Actions"
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
              <TableHead className="w-[80px]">{actionsLabel}</TableHead>
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
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => onEdit?.(item)}>Edit</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => onDelete?.(item)}
                          className="text-destructive focus:text-destructive"
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
