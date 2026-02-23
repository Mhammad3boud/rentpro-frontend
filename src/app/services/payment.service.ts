import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  RentPayment,
  PaymentStatus,
  PaymentMethod,
  LeasePaymentStatus,
  CreatePaymentRequest
} from '../models';

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private readonly baseUrl = 'http://localhost:8083';

  constructor(private http: HttpClient) {}

  // Get payment status for a lease
  getLeasePaymentStatus(leaseId: string): Observable<LeasePaymentStatus> {
    return this.http.get<LeasePaymentStatus>(`${this.baseUrl}/payments/leases/${leaseId}`);
  }

  // Create or update payment record
  createPayment(payment: CreatePaymentRequest): Observable<RentPayment> {
    return this.http.post<RentPayment>(`${this.baseUrl}/payments`, payment);
  }

  // Record a payment with amount paid
  recordPayment(leaseId: string, monthYear: string, amountPaid: number, paymentMethod?: PaymentMethod): Observable<RentPayment> {
    return this.http.post<RentPayment>(`${this.baseUrl}/payments`, {
      leaseId,
      monthYear,
      amountPaid,
      paidDate: new Date().toISOString().slice(0, 10),
      paymentMethod
    });
  }

  // Get all payments for a lease
  getPaymentsByLease(leaseId: string): Observable<RentPayment[]> {
    return this.http.get<RentPayment[]>(`${this.baseUrl}/payments/leases/${leaseId}/all`);
  }

  // Get tenant payment history
  getTenantPayments(): Observable<RentPayment[]> {
    return this.http.get<RentPayment[]>(`${this.baseUrl}/payments/my-payments`);
  }

  // Get owner's payment overview
  getOwnerPayments(): Observable<RentPayment[]> {
    return this.http.get<RentPayment[]>(`${this.baseUrl}/payments/owner-payments`);
  }
}
