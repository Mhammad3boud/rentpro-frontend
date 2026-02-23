import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Tenant, TenantWithLease } from '../models';

/**
 * @deprecated Use TenantWithLease from models instead
 */
export interface TenantDto {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  propertyRef: string;
  unitNo: string;
  monthlyRent: number;
  leaseStart: string;
  leaseEnd: string;
  renewalReminder: string;
  emergencyName: string;
  emergencyPhone: string;
  address: string;
  status: string;
}

@Injectable({
  providedIn: 'root'
})
export class TenantService {
  private readonly baseUrl = 'http://localhost:8083/api';

  constructor(private http: HttpClient) {}

  getTenantsByProperty(propertyId: string): Observable<Tenant[]> {
    return this.http.get<Tenant[]>(`${this.baseUrl}/tenants/property/${propertyId}`);
  }

  getAllTenants(): Observable<Tenant[]> {
    return this.http.get<Tenant[]>(`${this.baseUrl}/tenants`);
  }

  getTenantById(tenantId: string): Observable<Tenant> {
    return this.http.get<Tenant>(`${this.baseUrl}/tenants/${tenantId}`);
  }
}
