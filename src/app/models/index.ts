/**
 * RentPro Core Models
 * These interfaces match the backend database schema exactly.
 */
export type Role = 'OWNER' | 'TENANT';
export type PropertyType = 'STANDALONE' | 'MULTI_UNIT';
export type AssetCategory = 'HOUSE' | 'APARTMENT' | 'LAND' | 'FARM' | 'SHOP' | 'OFFICE' | 'WAREHOUSE' | 'OTHER';
export type UsageType = 'RESIDENTIAL' | 'COMMERCIAL' | 'MIXED';
export type LeaseStatus = 'ACTIVE' | 'EXPIRED' | 'TERMINATED';
export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'CHECK';
export type PaymentStatus = 'PAID' | 'PENDING' | 'OVERDUE' | 'PARTIAL';
export type MaintenancePriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type MaintenanceStatus = 'PENDING' | 'IN_PROGRESS' | 'RESOLVED';
export type PredictionType = 'LATE_PAYMENT' | 'MAINTENANCE_RISK';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type NotificationType = 'RENT_DUE' | 'RENT_OVERDUE' | 'MAINTENANCE_UPDATE' | 'LEASE_EXPIRY';
export type ThemePreference = 'LIGHT' | 'DARK' | 'SYSTEM';

/**
 * User entity (Authentication)
 */
export interface User {
  userId: string;
  email: string;
  role: Role;
  status: boolean;
  fullName?: string;
  phone?: string;
  createdAt: string;
}

/**
 * Tenant profile (created by owner)
 */
export interface Tenant {
  tenantId: string;
  userId: string;
  ownerId: string;
  fullName: string;
  phone?: string;
  emergencyContact?: string;
  address?: string;
  createdAt: string;
  // Nested user object from backend (optional, included in list responses)
  user?: {
    userId: string;
    email: string;
    role: Role;
    status: boolean;
    fullName?: string;
    phone?: string;
    createdAt: string;
  };
}

/**
 * Property entity
 */
export interface Property {
  propertyId: string;
  ownerId: string;
  propertyName: string;
  propertyType: PropertyType;
  assetCategory?: AssetCategory;
  usageType?: UsageType;
  address?: string;
  region?: string;
  postcode?: string;
  latitude?: number;
  longitude?: number;
  waterMeterNo?: string;
  electricityMeterNo?: string;
  createdAt: string;
}

/**
 * Unit entity (for multi-unit properties)
 */
export interface Unit {
  unitId: string;
  propertyId: string;
  unitNumber: string;
  createdAt: string;
}

/**
 * Lease entity
 */
export interface Lease {
  leaseId: string;
  propertyId?: string;
  property?: {
    propertyId: string;
    propertyName?: string;
    address?: string;
  };
  unitId?: string;
  unit?: {
    unitId: string;
    unitNumber?: string;
  };
  tenantId?: string;
  tenant?: {
    tenantId: string;
    fullName?: string;
  };
  leaseName?: string;
  monthlyRent: number;
  securityDeposit?: number;
  startDate?: string;
  endDate?: string;
  leaseStatus: LeaseStatus;
  terminationReason?: string;
  terminationNotes?: string;
  terminationDate?: string;
  terminatedAt?: string;
  checkInDate?: string;
  checkedInAt?: string;
  checkInNotes?: string;
  checkOutDate?: string;
  checkedOutAt?: string;
  checkOutReason?: string;
  checkOutNotes?: string;
  checkInChecklist?: LeaseChecklistItem[];
  checkOutChecklist?: LeaseChecklistItem[];
  createdAt: string;
}

export interface LeaseChecklistItem {
  item: string;
  condition?: string;
  checked?: boolean;
  notes?: string;
}

/**
 * Rent Payment entity
 */
export interface RentPayment {
  paymentId: string;
  leaseId: string;
  monthYear: string;
  amountExpected: number;
  amountPaid: number;
  dueDate?: string;
  paidDate?: string;
  paymentMethod?: PaymentMethod;
  paymentStatus: PaymentStatus;
  createdAt: string;
}

/**
 * Maintenance Request entity
 */
export interface MaintenanceRequest {
  requestId: string;
  leaseId?: string;
  propertyId: string;
  unitId?: string;
  tenantId?: string;
  title: string;
  description: string;
  priority: MaintenancePriority;
  imageUrl?: string;
  status: MaintenanceStatus;
  assignedTechnician?: string;
  maintenanceCost?: number;
  reportedAt: string;
  resolvedAt?: string;
}

/**
 * AI Prediction entity
 */
export interface AiPrediction {
  predictionId: string;
  leaseId: string;
  predictionType: PredictionType;
  riskScore: number;
  riskLevel: RiskLevel;
  predictedAt: string;
}

/**
 * Notification entity
 */
export interface Notification {
  notificationId: string;
  userId: string;
  type: NotificationType;
  title?: string;
  message?: string;
  entityType?: string;
  entityId?: string;
  isRead: boolean;
  createdAt: string;
}

// ============ DTOs (Data Transfer Objects) ============

/**
 * Login response
 */
export interface LoginResponse {
  token: string;
  tokenType?: string;
}

/**
 * User profile response
 */
export interface UserProfile {
  userId: string;
  email: string;
  role: Role;
  fullName?: string;
  phone?: string;
  address?: string;
  profilePicture?: string;
  notificationEmail?: boolean;
  notificationPush?: boolean;
  themePreference?: ThemePreference;
}

/**
 * Update profile request
 */
export interface UpdateProfileRequest {
  fullName?: string;
  phone?: string;
  address?: string;
  notificationEmail?: boolean;
  notificationPush?: boolean;
  themePreference?: ThemePreference;
}

/**
 * Change password request
 */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

/**
 * Owner dashboard response
 */
export interface OwnerDashboardResponse {
  totalExpected: number;
  totalCollected: number;
  totalOutstanding: number;
  monthlyRevenue: number;
  overdueCount: number;
  partialCount: number;
  pendingCount: number;
  maintenancePending: number;
  maintenanceInProgress: number;
  maintenanceResolved: number;
  maintenanceRejected: number; // kept for backwards compat, always 0
  totalProperties: number;
  totalTenants: number;
  activeLeases: number;
}

/**
 * Tenant dashboard response
 */
export interface TenantDashboardResponse {
  totalOutstanding: number;
  overdueCount: number;
  nextDueDate?: string;
  maintenanceCount: number;
}

// ============ CREATE REQUESTS ============

export interface CreatePropertyRequest {
  // New format fields (matching database schema)
  propertyName?: string;
  propertyType?: PropertyType;
  assetCategory?: AssetCategory;
  usageType?: UsageType;
  address?: string;
  region?: string;
  postcode?: string;
  latitude?: number;
  longitude?: number;
  waterMeterNo?: string;
  electricityMeterNo?: string;
  unitCount?: number;
  unitNumbers?: string[];
  units?: string[];  // Legacy format for unit names
  
  // Legacy format fields (for backwards compatibility)
  title?: string;
  category?: string;
  structureType?: string;
  notes?: string;
  meta?: Record<string, unknown>;
}

export interface CreateTenantRequest {
  fullName: string;
  email: string;
  phone?: string;
  emergencyContact?: string;
  address?: string;
  password: string;
}

export interface CreateLeaseRequest {
  propertyId: string;
  unitId?: string;
  tenantId: string;
  monthlyRent: number;
  startDate?: string;
  endDate?: string;
}

export interface CreateUnitRequest {
  propertyId: string;
  unitNumber: string;
}

export interface CreatePaymentRequest {
  leaseId: string;
  monthYear: string;
  amountExpected: number;
  amountPaid: number;
  dueDate?: string;
  paidDate?: string;
  paymentMethod?: PaymentMethod;
}

export interface CreateMaintenanceRequest {
  leaseId?: string;
  propertyId?: string;
  unitId?: string;
  title: string;
  description: string;
  priority: MaintenancePriority;
  imageUrl?: string;
  assignedTechnician?: string;
  maintenanceCost?: number;
}

export interface UpdateMaintenanceStatusRequest {
  status: MaintenanceStatus;
  assignedTechnician?: string;
  maintenanceCost?: number;
}

// ============ EXTENDED DTOs (with related data) ============

/**
 * Tenant with lease information
 */
export interface TenantWithLease extends Tenant {
  lease?: Lease;
  property?: Property;
  unit?: Unit;
}

/**
 * Lease with related entities
 */
export interface LeaseWithDetails extends Lease {
  tenant?: Tenant;
  property?: Property;
  unit?: Unit;
}

/**
 * Property with units
 */
export interface PropertyWithUnits extends Property {
  units?: Unit[];
  unitCount?: number;
}

/**
 * Maintenance request with details
 */
export interface MaintenanceRequestWithDetails extends MaintenanceRequest {
  tenantName?: string;
  propertyName?: string;
  unitNumber?: string;
}

/**
 * Payment status for a lease
 */
export interface LeasePaymentStatus {
  leaseId: string;
  expectedRent: number;
  months: MonthlyPaymentStatus[];
  totalExpected: number;
  totalPaid: number;
  outstanding: number;
  paidMonthsCount: number;
  partialMonthsCount: number;
  unpaidMonthsCount: number;
}

export interface MonthlyPaymentStatus {
  month: string;
  dueDate: string;
  amount: number;
  paidAmount: number;
  status: PaymentStatus;
  payments?: RentPayment[];
}
