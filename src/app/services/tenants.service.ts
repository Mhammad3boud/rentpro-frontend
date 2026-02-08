import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type TenantStatus = 'ACTIVE' | 'INACTIVE';

export interface TenantDto {
    id: number;
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

export interface TenantCreateRequest extends Omit<TenantDto, 'id' | 'status'> {
    status?: TenantStatus; // optional, backend can default ACTIVE
}

@Injectable({ providedIn: 'root' })
export class TenantsService {
    private readonly baseUrl = 'http://localhost:8082';

    constructor(private http: HttpClient) { }

    list(): Observable<TenantDto[]> {
        return this.http.get<TenantDto[]>(`${this.baseUrl}/tenants`);
    }

    create(body: TenantCreateRequest): Observable<TenantDto> {
        return this.http.post<TenantDto>(`${this.baseUrl}/tenants`, body);
    }

    update(id: number, body: TenantCreateRequest): Observable<TenantDto> {
        return this.http.put<TenantDto>(`${this.baseUrl}/tenants/${id}`, body);
    }

    remove(id: number): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/tenants/${id}`);
    }
}
