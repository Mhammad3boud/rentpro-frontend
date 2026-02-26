import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController } from '@ionic/angular';
import { HttpClient, HttpClientModule } from '@angular/common/http';

interface LeaseOption {
  leaseId: string;
  tenantName: string;
  propertyName: string;
  unitName: string | null;
  monthlyRent: number;
  displayLabel: string;
}

@Component({
  selector: 'app-record-payment-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, HttpClientModule],
  templateUrl: './record-payment-modal.component.html',
  styleUrls: ['./record-payment-modal.component.scss'],
})
export class RecordPaymentModalComponent implements OnInit {
  @Input() preset?: Partial<typeof this.payment>;
  
  leases: LeaseOption[] = [];
  selectedLeaseId: string = '';
  isLoading = true;

  payment = {
    leaseId: '',
    tenantName: '',
    propertyNumber: '',
    month: '',
    amount: '',
    monthsCovered: 1,
    paidDate: '',
    paymentMethod: '',
    reference: '',
    notes: ''
  };

  private baseUrl = 'http://localhost:8083';

  constructor(
    private modalCtrl: ModalController,
    private http: HttpClient
  ) {}

  async ngOnInit() {
    await this.loadLeases();
    
    if (this.preset) {
      this.payment = {
        ...this.payment,
        ...this.preset,
      } as any;
      
      // If preset has leaseId, select it
      if (this.preset.leaseId) {
        this.selectedLeaseId = String(this.preset.leaseId);
      }
    }
  }

  async loadLeases() {
    this.isLoading = true;
    try {
      const response = await this.http.get<any[]>(`${this.baseUrl}/api/leases/my-leases`).toPromise();
      this.leases = (response || []).map(lease => {
        const tenantName = lease.tenant?.fullName || lease.leaseName || 'Unknown Tenant';
        const propertyName = lease.property?.propertyName || 'Unknown Property';
        const unitName = lease.unit?.unitNumber || null;
        const monthlyRent = lease.monthlyRent || 0;
        
        // Build display label with unit if available
        let displayLabel = `${tenantName} - ${propertyName}`;
        if (unitName) {
          displayLabel += ` (Unit ${unitName})`;
        }
        
        return {
          leaseId: lease.leaseId,
          tenantName,
          propertyName,
          unitName,
          monthlyRent,
          displayLabel
        };
      });
    } catch (error) {
      console.error('Failed to load leases:', error);
      this.leases = [];
    } finally {
      this.isLoading = false;
    }
  }

  onLeaseSelected() {
    const selected = this.leases.find(l => l.leaseId === this.selectedLeaseId);
    if (selected) {
      this.payment.leaseId = selected.leaseId;
      this.payment.tenantName = selected.tenantName;
      // Include unit in property display if available
      this.payment.propertyNumber = selected.unitName 
        ? `${selected.propertyName} - Unit ${selected.unitName}`
        : selected.propertyName;
      this.payment.amount = selected.monthlyRent.toString();
    }
  }

  onMonthsChanged() {
    const parsed = Number(this.payment.monthsCovered);
    if (!Number.isFinite(parsed) || parsed < 1) {
      this.payment.monthsCovered = 1;
      return;
    }
    this.payment.monthsCovered = Math.floor(parsed);
  }

  getTotalAmount(): number {
    const monthlyAmount = Number(this.payment.amount || 0);
    const monthsCovered = Number(this.payment.monthsCovered || 1);
    if (!Number.isFinite(monthlyAmount) || !Number.isFinite(monthsCovered)) {
      return 0;
    }
    return monthlyAmount * monthsCovered;
  }

  cancel() {
    this.modalCtrl.dismiss();
  }

  addPayment() {
    // Ensure leaseId is set
    if (!this.payment.leaseId && this.selectedLeaseId) {
      this.payment.leaseId = this.selectedLeaseId;
    }
    this.onMonthsChanged();
    console.log('Payment recorded:', this.payment);
    this.modalCtrl.dismiss(this.payment);
  }
}
