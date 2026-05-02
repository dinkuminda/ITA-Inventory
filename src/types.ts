/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum AssetStatus {
  IN_STOCK = 'In Stock',
  ASSIGNED = 'Assigned',
  MAINTENANCE = 'Under Maintenance',
  RETIRED = 'Retired'
}

export enum ApprovalStatus {
  PENDING = 'Pending',
  APPROVED = 'Approved',
  REJECTED = 'Rejected'
}

export interface Asset {
  id: string;
  name: string;
  type: string;
  serialNumber?: string;
  status: AssetStatus;
  assignedTo?: string;
  roles?: string;
  location?: string;
  specificLocation?: string;
  date?: string;
  remark?: string;
  notes?: string;
  approvalStatus: ApprovalStatus;
  updatedAt: string;
}

export enum LicenseStatus {
  ACTIVE = 'Active',
  EXPIRED = 'Expired',
  SUSPENDED = 'Suspended'
}

export interface License {
  id: string;
  name: string;
  vendor?: string;
  type?: string;
  key?: string;
  seats: number;
  usedSeats: number;
  status: LicenseStatus;
  assignedTo?: string;
  department?: string;
  expiryDate?: string;
  notes?: string;
  updatedAt: string;
}

export enum MaintenanceStatus {
  PENDING = 'Pending',
  IN_PROGRESS = 'In Progress',
  COMPLETED = 'Completed'
}

export interface MaintenanceRecord {
  id: string;
  assetId: string;
  issueDescription: string;
  actionTaken?: string;
  performedBy?: string;
  cost: number;
  status: MaintenanceStatus;
  date: string;
  createdAt: string;
}

export enum UserRole {
  ADMIN = 'Admin',
  STAFF = 'Staff'
}

export interface UserProfile {
  id: string;
  role: UserRole;
  email: string;
  displayName: string;
}
