import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {
  RentPayment,
  PaymentStatus,
  PaymentMethod,
  LeasePaymentStatus,
  MonthlyPaymentStatus,
  Lease,
  LeaseStatus,
  Tenant
} from '../app/models';

export interface RentRecord {
  id: string;
  tenant: string;
  property: string;
  unit: string;
  month: string;
  dueDate: string;
  amount: number;
  status: 'Paid' | 'Pending' | 'Overdue';
  paidDate?: string;
  method?: string;
  leaseId: string;
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

// Re-export from models for compatibility
export type { LeasePaymentStatus, MonthlyPaymentStatus, RentPayment };

@Injectable({
  providedIn: 'root'
})
export class RentService {
  private baseUrl = 'http://localhost:8083';

  constructor(private http: HttpClient) {}

  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async getRentRecords(): Promise<RentRecord[]> {
    try {
      // Get all available units with active leases
      const unitsResponse = await this.http.get(`${this.baseUrl}/leases/my-leases`).toPromise();
      const units: any[] = (unitsResponse as any[]) || [];

      const rentRecords: RentRecord[] = [];

      // For each unit, get payment status for the last 6 months
      for (const unit of units) {
        try {
          // Generate a lease ID from the unit data (this matches the backend logic)
          const leaseId = unit.propertyId * 1000 + (unit.unitNumber ? parseInt(unit.unitNumber.replace(/\D/g, '')) || 0 : 0);
          
          const from = new Date();
          from.setMonth(from.getMonth() - 6);
          const to = new Date();

          const statusResponse = await this.http.get(`${this.baseUrl}/payments/leases/${leaseId}`).toPromise();

          const status: any = statusResponse as any;

          // Convert monthly status to rent records
          status.months.forEach((month: any) => {
            const record: RentRecord = {
              id: `${leaseId}-${month.month.replace('-', '')}`, // Composite ID
              tenant: unit.tenantName || 'Unassigned',
              property: unit.propertyTitle || unit.propertyRef || 'Unknown',
              unit: unit.unitName || unit.unitNo || 'N/A',
              month: month.month,
              dueDate: month.dueDate,
              amount: month.amount,
              status: this.mapStatus(month.status),
              paidDate: month.payments && month.payments.length > 0 
                ? month.payments[0].paidAt.slice(0, 10) 
                : undefined,
              method: month.payments && month.payments.length > 0 
                ? month.payments[0].method 
                : undefined,
              leaseId: `${leaseId}`
            };

            rentRecords.push(record);
          });
        } catch (error) {
          console.error(`Error fetching payment status for unit ${unit.id}:`, error);
          // If no payment status exists, create a basic record
          const currentMonth = new Date().toISOString().slice(0, 7);
          const leaseId = unit.propertyId * 1000 + (unit.unitNumber ? parseInt(unit.unitNumber.replace(/\D/g, '')) || 0 : 0);
          
          const record: RentRecord = {
            id: `${leaseId}-${currentMonth.replace('-', '')}`,
            tenant: unit.tenantName || 'Unassigned',
            property: unit.propertyTitle || unit.propertyRef || 'Unknown',
            unit: unit.unitName || unit.unitNo || 'N/A',
            month: currentMonth,
            dueDate: `${currentMonth}-01`,
            amount: unit.expectedRent || 0,
            status: 'Pending',
            leaseId: `${leaseId}`
          };
          
          rentRecords.push(record);
        }
      }

      return rentRecords;
    } catch (error) {
      console.error('Error fetching rent records:', error);
      throw error;
    }
  }

  async createPayment(request: CreatePaymentRequest): Promise<RentPayment> {
    try {
      const response = await this.http.post(`${this.baseUrl}/payments`, {
        leaseId: request.leaseId,
        monthYear: request.monthYear,
        amountExpected: request.amountExpected,
        amountPaid: request.amountPaid,
        dueDate: request.dueDate,
        paidDate: request.paidDate,
        paymentMethod: request.paymentMethod
      }).toPromise();

      return response as RentPayment;
    } catch (error) {
      console.error('Error creating payment:', error);
      throw error;
    }
  }

  async getTenants(): Promise<Tenant[]> {
    try {
      const response = await this.http.get(`${this.baseUrl}/tenants`).toPromise();
      return response as Tenant[];
    } catch (error) {
      console.error('Error fetching tenants:', error);
      throw error;
    }
  }

  async getActiveLeases(): Promise<any[]> {
    try {
      // Get available units which includes lease information
      const response = await this.http.get(`${this.baseUrl}/leases/my-leases`).toPromise();
      return response as any[];
    } catch (error) {
      console.error('Error fetching active leases:', error);
      throw error;
    }
  }

  private mapStatus(status: string): 'Paid' | 'Pending' | 'Overdue' {
    switch (status) {
      case 'PAID': return 'Paid';
      case 'PARTIAL': return 'Pending';
      case 'UNPAID': return 'Overdue';
      default: return 'Pending';
    }
  }

  // Helper method to determine if a payment is overdue
  private isOverdue(dueDate: string, status: string): boolean {
    if (status === 'PAID') return false;
    const due = new Date(dueDate);
    const today = new Date();
    return due < today;
  }
}
