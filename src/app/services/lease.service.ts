import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Lease, LeaseChecklistItem, LeaseWithDetails, CreateLeaseRequest, LeaseStatus } from '../models';

export interface TerminateLeaseRequest {
  reason: string;
  notes?: string;
  terminationDate?: string;
}

export interface CheckInLeaseRequest {
  checkInDate?: string;
  notes?: string;
  checklist?: LeaseChecklistItem[];
}

export interface CheckOutLeaseRequest {
  checkOutDate?: string;
  reason: string;
  notes?: string;
  checklist?: LeaseChecklistItem[];
}

@Injectable({
  providedIn: 'root'
})
export class LeaseService {
  private readonly baseUrl = 'http://localhost:8083';

  constructor(private http: HttpClient) {}

  // Create new lease
  createLease(request: CreateLeaseRequest): Observable<Lease> {
    return this.http.post<Lease>(`${this.baseUrl}/api/leases`, request);
  }

  // Get current user's leases (for owners)
  getMyLeases(): Observable<Lease[]> {
    return this.http.get<Lease[]>(`${this.baseUrl}/api/leases/my-leases`);
  }

  // Get tenant's leases
  getTenantLeases(): Observable<Lease[]> {
    return this.http.get<Lease[]>(`${this.baseUrl}/api/leases/tenant-leases`);
  }

  // Get specific lease by ID
  getLeaseById(leaseId: string): Observable<Lease> {
    return this.http.get<Lease>(`${this.baseUrl}/api/leases/${leaseId}`);
  }

  // Get available leases for assignment
  getAvailableLeases(): Observable<LeaseWithDetails[]> {
    return this.http.get<LeaseWithDetails[]>(`${this.baseUrl}/api/leases/available`);
  }

  // Update lease status
  updateLeaseStatus(leaseId: string, status: LeaseStatus): Observable<Lease> {
    return this.http.put<Lease>(`${this.baseUrl}/api/leases/${leaseId}/status`, { status });
  }

  // Update lease details (rent, dates)
  updateLease(leaseId: string, data: { monthlyRent?: number; securityDeposit?: number; startDate?: string; endDate?: string }): Observable<Lease> {
    return this.http.put<Lease>(`${this.baseUrl}/api/leases/${leaseId}`, data);
  }

  // Get lease by tenant ID
  getLeaseByTenantId(tenantId: string): Observable<Lease> {
    return this.http.get<Lease>(`${this.baseUrl}/api/leases/tenant/${tenantId}`);
  }

  // Terminate lease
  terminateLease(leaseId: string, payload: TerminateLeaseRequest): Observable<Lease> {
    return this.http.put<Lease>(`${this.baseUrl}/api/leases/${leaseId}/terminate`, payload);
  }

  checkInLease(leaseId: string, payload: CheckInLeaseRequest): Observable<Lease> {
    return this.http.put<Lease>(`${this.baseUrl}/api/leases/${leaseId}/check-in`, payload);
  }

  checkOutLease(leaseId: string, payload: CheckOutLeaseRequest): Observable<Lease> {
    return this.http.put<Lease>(`${this.baseUrl}/api/leases/${leaseId}/check-out`, payload);
  }

  // Delete lease permanently
  deleteLease(leaseId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/api/leases/${leaseId}`);
  }

  // Update expired leases to EXPIRED status
  updateExpiredLeases(): Observable<string> {
    return this.http.post<string>(`${this.baseUrl}/api/leases/update-expired`, {});
  }
}
