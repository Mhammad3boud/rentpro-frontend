import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PropertiesService } from './properties.service';
import { TenantsService } from './tenants.service';
import { Lease, LeaseWithDetails, CreateLeaseRequest, LeaseStatus } from '../models';

export interface LeaseInfo {
  id: string;
  propertyId: string;
  unitName: string;
  leaseName: string;
  tenantId?: string;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
}

export interface TenantAssignmentRequest {
  tenantId: string;
  propertyId: string;
  unitId?: string;
  monthlyRent: number;
  startDate: string;
  endDate?: string;
}

export interface AvailableUnit {
  propertyId: string;
  propertyName: string;
  propertyAddress: string;
  unitId?: string;
  unitName: string;
  leaseId?: string;
  leaseName: string;
  isAvailable: boolean;
  leaseStatus?: 'ACTIVE' | 'EXPIRED' | 'TERMINATED' | null;
  currentTenantId?: string;
  currentTenantName?: string;
  leaseEndDate?: string;
}

@Injectable({ providedIn: 'root' })
export class TenantAssignmentService {
  private readonly baseUrl = 'http://localhost:8083/api';

  constructor(
    private http: HttpClient,
    private propertiesService: PropertiesService,
    private tenantsService: TenantsService
  ) {}

  getAvailableUnits(): Observable<AvailableUnit[]> {
    return this.http.get<AvailableUnit[]>(`${this.baseUrl}/leases/available`);
  }

  assignTenantToLease(request: TenantAssignmentRequest): Observable<Lease> {
    return this.http.post<Lease>(`${this.baseUrl}/leases/assign`, request);
  }

  removeTenantFromLease(leaseId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/leases/${leaseId}/tenant`);
  }

  getLeasesByProperty(propertyId: string): Observable<Lease[]> {
    return this.http.get<Lease[]>(`${this.baseUrl}/properties/${propertyId}/leases`);
  }

  getLeasesByTenant(tenantId: string): Observable<Lease[]> {
    return this.http.get<Lease[]>(`${this.baseUrl}/tenants/${tenantId}/leases`);
  }

  createLease(request: CreateLeaseRequest): Observable<Lease> {
    return this.http.post<Lease>(`${this.baseUrl}/leases`, request);
  }

  getOwnerLeases(): Observable<Lease[]> {
    return this.http.get<Lease[]>(`${this.baseUrl}/leases/my-leases`);
  }

  async getAvailableUnitsForAssignment(currentTenantId?: string): Promise<AvailableUnit[]> {
    const [properties, leases, tenants] = await Promise.all([
      this.propertiesService.list().toPromise(),
      this.getOwnerLeases().toPromise().catch(() => []),
      this.tenantsService.list().toPromise().catch(() => [])
    ]);
    
    if (!properties) return [];

    // Create a map of property/unit to lease info for quick lookup
    const leaseMap = new Map<string, Lease>();
    (leases || []).forEach(lease => {
      // Extract IDs from nested objects or direct fields
      const propertyId = lease.propertyId || lease.property?.propertyId;
      const unitId = lease.unitId || lease.unit?.unitId;
      
      // Key by propertyId + unitId (or just propertyId for standalone)
      const key = unitId 
        ? `${propertyId}_${unitId}`
        : propertyId || '';
      
      if (!key) return;
      
      // Keep the most relevant lease (ACTIVE takes priority, then most recent)
      const existingLease = leaseMap.get(key);
      if (!existingLease || 
          lease.leaseStatus === 'ACTIVE' || 
          (existingLease.leaseStatus !== 'ACTIVE' && lease.createdAt > existingLease.createdAt)) {
        leaseMap.set(key, lease);
      }
    });

    // Create a map of tenantId to tenant name
    const tenantMap = new Map<string, string>();
    (tenants || []).forEach(t => {
      tenantMap.set(t.tenantId || t.id, t.fullName);
    });

    const availableUnits: AvailableUnit[] = [];

    properties.forEach(property => {
      if (property.propertyType === 'MULTI_UNIT' && property.units) {
        property.units.forEach((unit) => {
          const key = `${property.propertyId}_${unit.unitId}`;
          const lease = leaseMap.get(key);
          
          // Extract tenantId from nested tenant object or direct field
          const leaseTenantId = lease?.tenantId || lease?.tenant?.tenantId;
          
          // A unit is available if:
          // - No lease exists, OR
          // - Lease is EXPIRED or TERMINATED, OR
          // - The current tenant being edited already occupies it
          const isOccupied = lease && lease.leaseStatus === 'ACTIVE' && leaseTenantId !== currentTenantId;
          const isExpired = lease && lease.leaseStatus === 'EXPIRED';
          
          availableUnits.push({
            propertyId: property.propertyId,
            propertyName: property.propertyName,
            propertyAddress: property.address || '',
            unitId: unit.unitId,
            unitName: unit.unitNumber,
            leaseId: lease?.leaseId,
            leaseName: `${property.propertyName} - ${unit.unitNumber}`,
            isAvailable: !isOccupied,
            leaseStatus: lease?.leaseStatus || null,
            currentTenantId: leaseTenantId,
            currentTenantName: leaseTenantId ? tenantMap.get(leaseTenantId) : undefined,
            leaseEndDate: lease?.endDate
          });
        });
      } else {
        // Standalone property
        const key = property.propertyId;
        const lease = leaseMap.get(key);
        
        // Extract tenantId from nested tenant object or direct field
        const leaseTenantId = lease?.tenantId || lease?.tenant?.tenantId;
        
        const isOccupied = lease && lease.leaseStatus === 'ACTIVE' && leaseTenantId !== currentTenantId;
        
        availableUnits.push({
          propertyId: property.propertyId,
          propertyName: property.propertyName,
          propertyAddress: property.address || '',
          unitName: property.propertyName,
          leaseId: lease?.leaseId,
          leaseName: `${property.propertyName} Lease`,
          isAvailable: !isOccupied,
          leaseStatus: lease?.leaseStatus || null,
          currentTenantId: leaseTenantId,
          currentTenantName: leaseTenantId ? tenantMap.get(leaseTenantId) : undefined,
          leaseEndDate: lease?.endDate
        });
      }
    });

    return availableUnits;
  }
}
