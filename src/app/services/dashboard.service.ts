import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { OwnerDashboardResponse, TenantDashboardResponse } from '../models';

// Re-export for backwards compatibility
export type { OwnerDashboardResponse, TenantDashboardResponse };

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly baseUrl = 'http://localhost:8083';

  constructor(private http: HttpClient, private auth: AuthService) { }

  getOwnerDashboard(): Observable<OwnerDashboardResponse> {
    return this.http.get<OwnerDashboardResponse>(`${this.baseUrl}/dashboard/owner`);
  }

  getTenantDashboard(): Observable<TenantDashboardResponse> {
    return this.http.get<TenantDashboardResponse>(`${this.baseUrl}/dashboard/tenant`);
  }
}