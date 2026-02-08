import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface OwnerDashboardResponse {
  summary: {
    from: string;
    to: string;
    totalExpected: number;
    totalPaid: number;
    outstanding: number;
    collectionRate: number;
    months: Array<{
      month: string;
      expected: number;
      paid: number;
      outstanding: number;
      collectionRate: number;
    }>;
  };
  attentionInvoices: Array<{
    invoiceId: number;
    leaseId: number;
    period: string;
    dueDate: string;
    amount: number;
    paidTotal: number;
    remaining: number;
    status: 'PARTIAL' | 'OVERDUE';
  }>;
  maintenance: {
    open: number;
    inProgress: number;
    resolved: number;
    highPriorityOpen: number;
  };
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly baseUrl = 'http://localhost:8082';

  constructor(private http: HttpClient) {}

  getOwnerDashboard(from: string, to: string): Observable<OwnerDashboardResponse> {
    return this.http.get<OwnerDashboardResponse>(`${this.baseUrl}/dashboard/owner`, {
      params: { from, to },
    });
  }
}
