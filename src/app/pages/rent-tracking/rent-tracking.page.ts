import { Component, OnInit } from '@angular/core';
import { ModalController, AlertController, ToastController } from '@ionic/angular';
import { RecordPaymentModalComponent } from './record-payment-modal/record-payment-modal.component';

interface RentRecord {
  tenant: string;
  property: string;
  month: string;
  dueDate: string;
  amount: number;
  status: string;
  paidDate?: string;
  method?: string;
}

@Component({
  selector: 'app-rent-tracking',
  templateUrl: './rent-tracking.page.html',
  styleUrls: ['./rent-tracking.page.scss'],
  standalone: false,
})
export class RentTrackingPage implements OnInit {
  records: RentRecord[] = [
    {
      tenant: 'Alice Johnson',
      property: 'P-456/2A',
      month: '2024-09',
      dueDate: '2024-09-01',
      amount: 1200,
      status: 'Paid',
      paidDate: '2024-09-01',
      method: 'Bank Transfer',
    },
    {
      tenant: 'Michael Chen',
      property: 'P-789/5B',
      month: '2024-09',
      dueDate: '2024-09-01',
      amount: 1500,
      status: 'Paid',
      paidDate: '2024-09-03',
      method: 'Check',
    },
    {
      tenant: 'Emma Wilson',
      property: 'P-123/3C',
      month: '2024-09',
      dueDate: '2024-09-01',
      amount: 1100,
      status: 'Overdue',
    },
    {
      tenant: 'Alice Johnson',
      property: 'P-456/2A',
      month: '2024-10',
      dueDate: '2024-10-01',
      amount: 1200,
      status: 'Pending',
    },
  ];

  filteredRecords: RentRecord[] = [];
  searchTerm = '';
  selectedStatus = 'all';
  selectedMonth = 'all';

  constructor(
    private modalCtrl: ModalController,
    private alertController: AlertController,
    private toastController: ToastController,
  ) {}

  ngOnInit() {
    this.filteredRecords = [...this.records];
  }

  doRefresh(event: any) {
    // Reset filters to defaults
    this.searchTerm = '';
    this.selectedStatus = 'all';
    this.selectedMonth = 'all';
    // Simulate fetch and recompute
    this.filteredRecords = [...this.records];
    setTimeout(() => {
      this.filterRecords();
      event.target.complete();
    }, 400);
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
      const newRecord: RentRecord = {
        tenant: data.tenantName,
        property: `${data.propertyNumber}/${data.unitNumber}`,
        month: data.month,
        dueDate: data.dueDate,
        amount: parseFloat(data.amount),
        paidDate: data.paidDate,
        method: data.paymentMethod,
        status: data.paidDate ? 'Paid' : 'Pending',
      };

      this.records.push(newRecord);
      this.filteredRecords = [...this.records];
    }
  }

  markPaid(record: RentRecord) {
    const today = new Date().toISOString().slice(0, 10);
    record.status = 'Paid';
    record.paidDate = today;
    if (!record.method || record.method === '-') {
      record.method = 'Manual';
    }
    // Refresh the filtered view to reflect changes and status filters
    this.filterRecords();
  }

  markUnpaid(record: RentRecord) {
    record.status = 'Pending';
    record.paidDate = '';
    if (!record.method || record.method === 'Manual') {
      record.method = '-';
    }
    this.filterRecords();
    this.presentToast('Marked as unpaid', 'medium');
  }

  async editPayment(record: RentRecord) {
    const { propertyNumber, unitNumber } = this.parseProperty(record.property);
    const modal = await this.modalCtrl.create({
      component: RecordPaymentModalComponent,
      componentProps: {
        preset: {
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
      record.tenant = data.tenantName || record.tenant;
      record.property = `${data.propertyNumber}/${data.unitNumber}`;
      record.month = data.month || record.month;
      record.dueDate = data.dueDate || record.dueDate;
      record.amount = parseFloat(data.amount || record.amount);
      record.paidDate = data.paidDate || '';
      record.method = data.paymentMethod || '';
      record.status = data.paidDate ? 'Paid' : record.status; // keep existing unless paid now
      this.filterRecords();
      this.presentToast('Payment updated', 'success');
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

  private deleteRecord(record: RentRecord) {
    this.records = this.records.filter(r => r !== record);
    this.filterRecords();
    this.presentToast('Payment deleted', 'danger');
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
