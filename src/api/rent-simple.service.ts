import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { PaymentMethod, PaymentStatus } from '../app/models';

@Injectable({
  providedIn: 'root'
})
export class RentSimpleService {
  private baseUrl = 'http://localhost:8083';

  constructor(private http: HttpClient) {}

  // Real API calls to backend
  async getRentRecords() {
    try {
      // Get all leases for the owner
      const leasesResponse = await this.http.get(`${this.baseUrl}/api/leases/my-leases`).toPromise();
      const leases: any[] = (leasesResponse as any[]) || [];

      const rentRecords: RentRecord[] = [];

      if (leases.length === 0) {
        console.log('No leases found in backend');
        return rentRecords;
      }

      // For each lease, get payment records
      for (const lease of leases) {
        const leaseId = lease.leaseId;
        
        if (!leaseId) {
          console.log(`Skipping lease - no lease ID`);
          continue;
        }

        // Get tenant and property info from the lease
        const tenantName = lease.tenant?.fullName || lease.leaseName || 'Unassigned';
        const propertyName = lease.property?.propertyName || lease.propertyName || 'Unknown';
        const unitName = lease.unit?.unitNumber || lease.unitName || 'N/A';
        const monthlyRent = lease.monthlyRent || 0;

        try {
          const payments = await this.fetchLeasePayments(leaseId);

          if (payments.length > 0) {
            // Convert each payment to a rent record  
            payments.forEach((payment: any) => {
              const record: RentRecord = {
                id: payment.paymentId || `${leaseId}-${payment.monthYear?.replace('-', '')}`,
                tenant: tenantName,
                property: `${propertyName} - ${unitName}`,
                unit: unitName,
                month: payment.monthYear || '',
                dueDate: payment.dueDate || `${payment.monthYear}-01`,
                amount: payment.amountExpected || monthlyRent,
                status: this.mapStatus(payment.paymentStatus),
                paidDate: payment.paidDate || undefined,
                method: payment.paymentMethod || undefined,
                leaseId: leaseId,
                amountPaid: payment.amountPaid || 0,
                isAdvance: this.isAdvancePayment(payment.monthYear, payment.paidDate)
              };
              rentRecords.push(record);
            });
          } else {
            // No payment records - create one for current month
            const currentMonth = new Date().toISOString().slice(0, 7);
            const record: RentRecord = {
              id: `${leaseId}-${currentMonth.replace('-', '')}`,
              tenant: tenantName,
              property: `${propertyName} - ${unitName}`,
              unit: unitName,
              month: currentMonth,
              dueDate: `${currentMonth}-07`,
              amount: monthlyRent,
              status: 'Pending',
              leaseId: leaseId,
              amountPaid: 0
            };
            rentRecords.push(record);
          }
        } catch (error: any) {
          console.error(`Error fetching payments for lease ${leaseId}:`, error);
          
          // Create a basic record for current month on error
          const currentMonth = new Date().toISOString().slice(0, 7);
          const record: RentRecord = {
            id: `${leaseId}-${currentMonth.replace('-', '')}`,
            tenant: tenantName,
            property: `${propertyName} - ${unitName}`,
            unit: unitName,
            month: currentMonth,
            dueDate: `${currentMonth}-07`,
            amount: monthlyRent,
            status: 'Pending',
            leaseId: leaseId,
            amountPaid: 0
          };
          rentRecords.push(record);
        }
      }

      return rentRecords;
    } catch (error) {
      console.error('Error fetching rent records:', error);
      return [];
    }
  }

  private async fetchLeasePayments(leaseId: string): Promise<any[]> {
    // Preferred endpoint: returns flat payment rows
    try {
      const allResponse = await this.http
        .get(`${this.baseUrl}/payments/leases/${leaseId}/all`)
        .toPromise();
      if (Array.isArray(allResponse)) {
        return allResponse as any[];
      }
    } catch (error) {
      console.warn(`Fallback to lease payment status endpoint for lease ${leaseId}`, error);
    }

    // Fallback endpoint: can return either RentPayment[] or LeasePaymentStatus
    const response = await this.http
      .get(`${this.baseUrl}/payments/leases/${leaseId}`)
      .toPromise();

    if (Array.isArray(response)) {
      return response as any[];
    }

    const months = (response as any)?.months;
    if (!Array.isArray(months)) {
      return [];
    }

    const flattened: any[] = [];
    months.forEach((month: any) => {
      if (Array.isArray(month?.payments) && month.payments.length > 0) {
        month.payments.forEach((p: any) => {
          flattened.push({
            paymentId: p.paymentId || `${leaseId}-${month.month}`,
            monthYear: p.monthYear || month.month,
            dueDate: p.dueDate || month.dueDate,
            amountExpected: p.amountExpected ?? month.amount ?? 0,
            amountPaid: p.amountPaid ?? month.paidAmount ?? 0,
            paymentStatus: p.paymentStatus || month.status || 'PENDING',
            paidDate: p.paidDate,
            paymentMethod: p.paymentMethod
          });
        });
        return;
      }

      flattened.push({
        paymentId: `${leaseId}-${month.month}`,
        monthYear: month.month,
        dueDate: month.dueDate,
        amountExpected: month.amount ?? 0,
        amountPaid: month.paidAmount ?? 0,
        paymentStatus: month.status || 'PENDING'
      });
    });

    return flattened;
  }

  async createPayment(paymentData: CreatePaymentRequest) {
    try {
      console.log('Creating payment:', paymentData);
      
      // Format dates as YYYY-MM-DD for backend LocalDate
      const formatDate = (dateStr?: string): string | null => {
        if (!dateStr) return null;
        // If already in YYYY-MM-DD format, return as is
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
        // Otherwise parse and format
        const date = new Date(dateStr);
        return date.toISOString().slice(0, 10);
      };

      // Due date is always the 7th of the payment month
      const calculateDueDate = (monthYear: string): string => {
        return `${monthYear}-07`;
      };
      
      const response = await this.http.post(`${this.baseUrl}/payments`, {
        leaseId: paymentData.leaseId,
        monthYear: paymentData.monthYear,
        amountExpected: paymentData.amountExpected,
        amountPaid: paymentData.amountPaid,
        dueDate: calculateDueDate(paymentData.monthYear),
        paidDate: formatDate(paymentData.paidDate),
        paymentMethod: paymentData.paymentMethod || 'CASH'
      }).toPromise();
      
      console.log('Payment created successfully:', response);
      return response;
    } catch (error: any) {
      console.error('Error creating payment:', error);
      
      if (error.status === 400) {
        throw new Error('Invalid payment data. Please check all fields.');
      } else if (error.status === 403) {
        throw new Error('You do not have permission to create payments.');
      } else if (error.status === 404) {
        throw new Error('Lease not found. Please check the lease ID.');
      } else if (error.status === 500) {
        throw new Error('Server error. Please try again later.');
      } else {
        throw new Error('Failed to create payment. Please try again.');
      }
    }
  }

  async getTenants() {
    try {
      const response = await this.http.get(`${this.baseUrl}/api/tenants`).toPromise();
      return response as any[];
    } catch (error) {
      console.error('Error fetching tenants:', error);
      throw error;
    }
  }

  async getActiveLeases() {
    try {
      // Get available units which includes lease information
      const response = await this.http.get(`${this.baseUrl}/api/leases/my-leases`).toPromise();
      return response as any[];
    } catch (error) {
      console.error('Error fetching active leases:', error);
      throw error;
    }
  }

  private mapStatus(status: string): 'Paid' | 'Pending' | 'Overdue' | 'Partial' {
    switch (status) {
      case 'PAID': return 'Paid';
      case 'PARTIAL': return 'Partial';
      case 'UNPAID': return 'Overdue';
      case 'OVERDUE': return 'Overdue';
      case 'PENDING': return 'Pending';
      default: return 'Pending';
    }
  }

  private isAdvancePayment(monthYear?: string, paidDate?: string): boolean {
    if (!monthYear || !paidDate) {
      return false;
    }
    const monthStart = `${monthYear.slice(0, 7)}-01`;
    return paidDate.slice(0, 10) < monthStart;
  }
}

export interface RentRecord {
  id: string;
  tenant: string;
  property: string;
  unit: string;
  month: string;
  dueDate: string;
  amount: number;
  status: 'Paid' | 'Pending' | 'Overdue' | 'Partial';
  paidDate?: string;
  method?: string;
  leaseId: string;
  amountPaid?: number;
  isAdvance?: boolean;
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
