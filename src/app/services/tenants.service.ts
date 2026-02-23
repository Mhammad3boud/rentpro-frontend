import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { UserService } from './user.service';
import { Tenant, TenantWithLease, CreateTenantRequest, Lease, Property } from '../models';

/**
 * @deprecated Use TenantWithLease from models instead - this combines tenant and lease info
 */
export type TenantStatus = 'ACTIVE' | 'INACTIVE';

/**
 * @deprecated Use TenantWithLease from models instead
 * This interface combines old field names with new ones for backward compatibility
 */
export interface TenantDto {
    // New field names (from backend)
    tenantId?: string;
    userId?: string;
    ownerId?: string;
    emergencyContact?: string;
    createdAt?: string;
    
    // Legacy field names (for backward compatibility)
    id: string;
    fullName: string;
    email: string;
    phone: string;

    propertyRef: string; // display string like "Property P-456" OR propertyId if you later change
    unitNo: string;

    monthlyRent: number;

    leaseStart: string;
    leaseEnd: string;
    renewalReminder?: string;

    emergencyName?: string;
    emergencyPhone?: string;

    address?: string;

    status: TenantStatus;
}

/**
 * @deprecated Use CreateTenantRequest from models instead
 * Extended to include both legacy and new fields for backward compatibility
 */
export interface TenantCreateRequest {
    fullName: string;
    email: string;
    phone?: string;
    emergencyContact?: string;
    address?: string;
    password?: string;
    
    // Legacy fields for backward compatibility
    propertyRef?: string;
    unitNo?: string;
    monthlyRent?: number;
    leaseStart?: string;
    leaseEnd?: string;
    renewalReminder?: string;
    emergencyName?: string;
    emergencyPhone?: string;
    status?: TenantStatus;
}

@Injectable({ providedIn: 'root' })
export class TenantsService {
    private readonly baseUrl = 'http://localhost:8083/api';

    constructor(private http: HttpClient, private userService: UserService) { }

    /**
     * Returns TenantDto[] for backward compatibility with existing components.
     * Maps Tenant from backend to TenantDto with both old and new field names.
     * Now also fetches lease data to populate monthlyRent, leaseStart, leaseEnd, etc.
     */
    list(): Observable<TenantDto[]> {
        const user = this.userService.getCurrentUser();
        if (!user) throw new Error('User not authenticated');
        
        // Fetch tenants, leases, and properties in parallel, then merge data
        return forkJoin({
            tenants: this.http.get<Tenant[]>(`${this.baseUrl}/tenants/owner/${user.userId}`),
            leases: this.http.get<Lease[]>(`${this.baseUrl}/leases/my-leases`).pipe(
                catchError(() => of([] as Lease[]))
            ),
            properties: this.http.get<Property[]>(`${this.baseUrl}/properties/${user.userId}`).pipe(
                catchError(() => of([] as Property[]))
            )
        }).pipe(
            map(({ tenants, leases, properties }) => {
                // Create lookup maps for faster access
                const leaseByTenantId = new Map<string, Lease>();
                leases.forEach(lease => {
                    // Extract tenantId from nested tenant object or direct field
                    const tenantId = lease.tenantId || lease.tenant?.tenantId;
                    // Only consider active leases, or the most recent one
                    if (tenantId && (!leaseByTenantId.has(tenantId) || lease.leaseStatus === 'ACTIVE')) {
                        leaseByTenantId.set(tenantId, lease);
                    }
                });
                
                const propertyById = new Map<string, Property>();
                properties.forEach(prop => propertyById.set(prop.propertyId, prop));
                
                return tenants.map(t => this.mapToTenantDto(t, leaseByTenantId.get(t.tenantId), propertyById));
            })
        );
    }

    /**
     * Returns raw Tenant[] from backend without mapping (new format).
     */
    listRaw(): Observable<Tenant[]> {
        const user = this.userService.getCurrentUser();
        if (!user) throw new Error('User not authenticated');
        return this.http.get<Tenant[]>(`${this.baseUrl}/tenants/owner/${user.userId}`);
    }

    private mapToTenantDto(t: Tenant, lease?: Lease, propertyById?: Map<string, Property>): TenantDto {
        // Extract propertyId from nested property object or direct field
        const leasePropertyId = lease?.propertyId || lease?.property?.propertyId;
        const property = lease && propertyById && leasePropertyId ? propertyById.get(leasePropertyId) : undefined;
        // Fallback to property info from lease if not in map
        const propertyName = property?.propertyName || lease?.property?.propertyName || '';
        const propertyAddress = property?.address || lease?.property?.address || '';
        
        return {
            // New fields
            tenantId: t.tenantId,
            userId: t.userId,
            ownerId: t.ownerId,
            emergencyContact: t.emergencyContact,
            createdAt: t.createdAt,
            
            // Legacy fields (mapped from lease/property data when available)
            id: t.tenantId,
            fullName: t.fullName,
            email: t.user?.email || '',
            phone: t.phone || '',
            address: t.address || propertyAddress,
            propertyRef: propertyName,
            unitNo: lease?.unit?.unitNumber || lease?.leaseName || '',
            monthlyRent: lease?.monthlyRent || 0,
            leaseStart: lease?.startDate || '',
            leaseEnd: lease?.endDate || '',
            renewalReminder: '', // Can be calculated from leaseEnd if needed
            emergencyName: t.emergencyContact || '',
            status: lease?.leaseStatus === 'ACTIVE' ? 'ACTIVE' : (lease ? 'INACTIVE' : 'ACTIVE') as TenantStatus
        };
    }

    /**
     * Creates a tenant. Accepts TenantCreateRequest (legacy) and maps to backend format.
     * Returns TenantDto for backward compatibility.
     */
    create(body: TenantCreateRequest): Observable<TenantDto> {
        const user = this.userService.getCurrentUser();
        if (!user) throw new Error('User not authenticated');
        
        // Map legacy TenantCreateRequest to backend CreateTenantRequest
        const backendRequest: CreateTenantRequest = {
            fullName: body.fullName,
            email: body.email,
            phone: body.phone,
            emergencyContact: body.emergencyContact || body.emergencyName,
            address: body.address,
            password: body.password || 'TempPassword123!' // Default password if not provided
        };
        
        return this.http.post<Tenant>(`${this.baseUrl}/tenants/owner/${user.userId}`, backendRequest).pipe(
            map(t => this.mapToTenantDto(t))
        );
    }

    /**
     * Creates a tenant using the new model format
     */
    createNew(body: CreateTenantRequest): Observable<Tenant> {
        const user = this.userService.getCurrentUser();
        if (!user) throw new Error('User not authenticated');
        return this.http.post<Tenant>(`${this.baseUrl}/tenants/owner/${user.userId}`, body);
    }

    update(id: string, body: Partial<TenantCreateRequest>): Observable<TenantDto> {
        // Map to backend UpdateTenantRequest format
        // Combine emergencyName and emergencyPhone into emergencyContact if needed
        let emergencyContact = body.emergencyContact;
        if (!emergencyContact && (body.emergencyName || body.emergencyPhone)) {
            emergencyContact = body.emergencyName || '';
            if (body.emergencyPhone) {
                emergencyContact += emergencyContact ? ` (${body.emergencyPhone})` : body.emergencyPhone;
            }
        }
        
        const backendBody = {
            fullName: body.fullName,
            phone: body.phone,
            emergencyContact: emergencyContact,
            address: body.address
        };
        
        console.log('Updating tenant with ID:', id);
        console.log('Backend body:', backendBody);
        
        return this.http.put<Tenant>(`${this.baseUrl}/tenants/${id}`, backendBody).pipe(
            map(t => this.mapToTenantDto(t))
        );
    }

    remove(id: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/tenants/${id}`);
    }

    updateExpiredLeases(): Observable<string> {
        return this.http.post<string>(`${this.baseUrl}/leases/update-expired`, {});
    }
}
