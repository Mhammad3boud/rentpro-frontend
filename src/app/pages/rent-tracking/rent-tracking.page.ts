import { Component, OnInit } from '@angular/core';
import { ModalController, AlertController, ToastController, LoadingController } from '@ionic/angular';
import { RecordPaymentModalComponent } from './record-payment-modal/record-payment-modal.component';
import { RentSimpleService, RentRecord, CreatePaymentRequest } from '../../../api/rent-simple.service';

@Component({
  selector: 'app-rent-tracking',
  templateUrl: './rent-tracking.page.html',
  styleUrls: ['./rent-tracking.page.scss'],
  standalone: false,
})
export class RentTrackingPage implements OnInit {
  records: RentRecord[] = [];

  filteredRecords: RentRecord[] = [];
  searchTerm = '';
  selectedStatus = 'all';
  selectedMonth = 'all';

  // Summary stats
  totalRevenue = 0;
  pendingAmount = 0;
  overdueAmount = 0;
  activeLeases = 0;

  // Dynamic month options
  monthOptions: { value: string; label: string }[] = [];

  constructor(
    private modalCtrl: ModalController,
    private alertController: AlertController,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private rentService: RentSimpleService,
  ) {}

  async ngOnInit() {
    await this.loadRentRecords();
  }

  async doRefresh(event: any) {
    // Reset filters to defaults
    this.searchTerm = '';
    this.selectedStatus = 'all';
    this.selectedMonth = 'all';
    
    try {
      await this.loadRentRecords();
    } catch (error) {
      console.error('Error refreshing rent records:', error);
      this.presentToast('Failed to refresh data', 'danger');
    } finally {
      event.target.complete();
    }
  }

  async loadRentRecords() {
    const loading = await this.loadingController.create({
      message: 'Loading rent records...'
    });
    await loading.present();

    try {
      this.records = await this.rentService.getRentRecords();
      this.filteredRecords = [...this.records];
      this.calculateSummary();
      this.generateMonthOptions();
      this.filterRecords();
    } catch (error) {
      console.error('Error loading rent records:', error);
      this.presentToast('Failed to load rent records', 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  calculateSummary() {
    // Calculate total revenue (paid amounts)
    this.totalRevenue = this.records
      .filter(r => r.status === 'Paid' || r.status === 'Partial')
      .reduce((sum, r) => sum + (r.amountPaid || 0), 0);

    // Calculate pending amount (including partial remaining)
    this.pendingAmount = this.records
      .filter(r => r.status === 'Pending' || r.status === 'Partial')
      .reduce((sum, r) => sum + (r.amount - (r.amountPaid || 0)), 0);

    // Calculate overdue amount
    this.overdueAmount = this.records
      .filter(r => r.status === 'Overdue')
      .reduce((sum, r) => sum + (r.amount - (r.amountPaid || 0)), 0);

    // Count unique active leases
    const uniqueLeases = new Set(this.records.map(r => r.leaseId));
    this.activeLeases = uniqueLeases.size;
  }

  generateMonthOptions() {
    // Get unique months from records
    const uniqueMonths = [...new Set(this.records.map(r => r.month))].sort().reverse();
    
    this.monthOptions = uniqueMonths.map(month => {
      const [year, monthNum] = month.split('-');
      const date = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
      const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      return { value: month, label };
    });
  }

  filterRecords() {
    const term = this.searchTerm.toLowerCase();

    this.filteredRecords = this.records.filter((r) => {
      const matchesSearch =
        r.tenant.toLowerCase().includes(term) ||
        r.property.toLowerCase().includes(term);

      const matchesStatus =
        this.selectedStatus === 'all' || r.status === this.selectedStatus;

      const matchesMonth =
        this.selectedMonth === 'all' || r.month === this.selectedMonth;

      return matchesSearch && matchesStatus && matchesMonth;
    });
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'Paid': return 'success';
      case 'Pending': return 'warning';
      case 'Partial': return 'tertiary';
      case 'Overdue': return 'danger';
      default: return 'medium';
    }
  }

  // ✅ New function: Open Record Payment Modal
  async openRecordPaymentModal() {
    const modal = await this.modalCtrl.create({
      component: RecordPaymentModalComponent,
      cssClass: 'centered-modal',
      backdropDismiss: false,
    });
    await modal.present();

    const { data } = await modal.onWillDismiss();
    if (data) {
      // Create payment via backend service
      try {
        const monthYear = data.month || new Date().toISOString().slice(0, 7);
        const paymentRequest: CreatePaymentRequest = {
          leaseId: data.leaseId,
          monthYear: monthYear,
          amountExpected: parseFloat(data.amount),
          amountPaid: parseFloat(data.amount),
          dueDate: data.dueDate || `${monthYear}-01`,
          paidDate: data.paidDate || new Date().toISOString().slice(0, 10),
          paymentMethod: data.paymentMethod || 'CASH'
        };
        
        await this.rentService.createPayment(paymentRequest);
        await this.loadRentRecords(); // Refresh the records
        this.presentToast('Payment recorded successfully', 'success');
      } catch (error) {
        console.error('Error creating payment:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to record payment';
        this.presentToast(errorMessage, 'danger');
      }
    }
  }

  async markPaid(record: RentRecord) {
    // Prompt user for payment amount
    const alert = await this.alertController.create({
      header: 'Record Payment',
      message: `Enter payment amount for ${record.tenant}`,
      inputs: [
        {
          name: 'amount',
          type: 'number',
          placeholder: 'Amount paid',
          value: record.amount.toString(),
          min: 0
        },
        {
          name: 'paymentMethod',
          type: 'text',
          placeholder: 'Payment method (e.g., CASH, BANK_TRANSFER)',
          value: 'CASH'
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Full Payment',
          handler: () => {
            this.processPayment(record, record.amount, 'CASH');
            return true;
          }
        },
        {
          text: 'Record',
          handler: (data) => {
            const amount = parseFloat(data.amount) || 0;
            const method = data.paymentMethod?.toUpperCase() || 'CASH';
            if (amount <= 0) {
              this.presentToast('Please enter a valid amount', 'danger');
              return false;
            }
            this.processPayment(record, amount, method);
            return true;
          }
        }
      ]
    });
    await alert.present();
  }

  private async processPayment(record: RentRecord, amount: number, method: string) {
    try {
      const paymentRequest: CreatePaymentRequest = {
        leaseId: record.leaseId,
        monthYear: record.month,
        amountExpected: record.amount,
        amountPaid: amount,
        dueDate: record.dueDate,
        paidDate: new Date().toISOString().slice(0, 10),
        paymentMethod: method as any
      };
      
      await this.rentService.createPayment(paymentRequest);
      await this.loadRentRecords();
      
      if (amount >= record.amount) {
        this.presentToast('Full payment recorded', 'success');
      } else {
        this.presentToast(`Partial payment of TZS ${amount} recorded`, 'success');
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to record payment';
      this.presentToast(errorMessage, 'danger');
    }
  }

  async markUnpaid(record: RentRecord) {
    try {
      // Call delete payment API (once implemented)
      // For now, just show a message
      this.presentToast('Delete functionality not yet available in backend', 'medium');
    } catch (error) {
      console.error('Error marking payment as unpaid:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to mark payment as unpaid';
      this.presentToast(errorMessage, 'danger');
    }
  }

  async editPayment(record: RentRecord) {
    const { propertyNumber, unitNumber } = this.parseProperty(record.property);
    const modal = await this.modalCtrl.create({
      component: RecordPaymentModalComponent,
      componentProps: {
        preset: {
          leaseId: record.leaseId,
          tenantName: record.tenant,
          propertyNumber,
          unitNumber,
          month: record.month,
          amount: String(record.amount ?? ''),
          dueDate: record.dueDate,
          paidDate: record.paidDate ?? '',
          paymentMethod: record.method ?? '',
        },
      },
      cssClass: 'centered-modal',
      backdropDismiss: false,
    });
    await modal.present();

    const { data } = await modal.onWillDismiss();
    if (data) {
      try {
        const monthYear = data.month || record.month;
        const paymentRequest: CreatePaymentRequest = {
          leaseId: data.leaseId || record.leaseId,
          monthYear: monthYear,
          amountExpected: parseFloat(data.amount || String(record.amount)),
          amountPaid: parseFloat(data.amount || String(record.amount)),
          dueDate: data.dueDate || record.dueDate || `${monthYear}-01`,
          paidDate: data.paidDate || new Date().toISOString().slice(0, 10),
          paymentMethod: data.paymentMethod || record.method || 'CASH'
        };
        
        await this.rentService.createPayment(paymentRequest);
        await this.loadRentRecords(); // Refresh the records
        this.presentToast('Payment updated', 'success');
      } catch (error) {
        console.error('Error updating payment:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to update payment';
        this.presentToast(errorMessage, 'danger');
      }
    }
  }

  async confirmDelete(record: RentRecord) {
    const alert = await this.alertController.create({
      header: 'Delete Payment',
      message: `Remove payment record for ${record.tenant} (${record.month})?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Delete', role: 'destructive', handler: () => this.deleteRecord(record) },
      ],
    });
    await alert.present();
  }

  private async deleteRecord(record: RentRecord) {
    // For now, we'll just show a message since the backend doesn't have a delete payment endpoint
    // In a real implementation, you would call a delete payment API
    this.presentToast('Delete functionality not yet available in backend', 'medium');
  }

  private parseProperty(prop: string): { propertyNumber: string; unitNumber: string } {
    if (!prop) return { propertyNumber: '', unitNumber: '' };
    const [propertyNumber = '', unitNumber = ''] = prop.split('/');
    return { propertyNumber, unitNumber };
  }

  private async presentToast(message: string, color: 'success' | 'danger' | 'primary' | 'medium') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: 'top',
    });
    await toast.present();
  }
}
