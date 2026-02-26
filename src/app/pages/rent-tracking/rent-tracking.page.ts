import { Component, OnInit } from '@angular/core';
import { ModalController, AlertController, ToastController, LoadingController } from '@ionic/angular';
import { RecordPaymentModalComponent } from './record-payment-modal/record-payment-modal.component';
import { RentSimpleService, RentRecord, CreatePaymentRequest } from '../../../api/rent-simple.service';
import { UserService } from '../../services/user.service';
import { PaymentService } from '../../services/payments.service';
import { LeaseService } from '../../services/lease.service';
import { firstValueFrom } from 'rxjs';
import { Lease, RentPayment } from '../../models';

@Component({
  selector: 'app-rent-tracking',
  templateUrl: './rent-tracking.page.html',
  styleUrls: ['./rent-tracking.page.scss'],
  standalone: false,
})
export class RentTrackingPage implements OnInit {
  records: RentRecord[] = [];
  isTenant = false;

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
  private tenantLeasesById = new Map<string, Lease>();

  constructor(
    private modalCtrl: ModalController,
    private alertController: AlertController,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private rentService: RentSimpleService,
    private userService: UserService,
    private paymentService: PaymentService,
    private leaseService: LeaseService
  ) {}

  async ngOnInit() {
    this.isTenant = this.userService.isTenant();
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
      if (this.isTenant) {
        await this.loadTenantRentRecords();
      } else {
        this.records = await this.rentService.getRentRecords();
      }

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

  private async loadTenantRentRecords() {
    const [payments, leases] = await Promise.all([
      firstValueFrom(this.paymentService.getTenantPayments()),
      firstValueFrom(this.leaseService.getTenantLeases())
    ]);

    this.tenantLeasesById.clear();
    (leases || []).forEach(lease => this.tenantLeasesById.set(lease.leaseId, lease));

    this.records = this.mapTenantPaymentsToRecords(payments || []);
  }

  private mapTenantPaymentsToRecords(payments: RentPayment[]): RentRecord[] {
    return payments.map(payment => {
      const paymentAny = payment as any;
      const nestedLease = paymentAny?.lease as any;
      const leaseId = payment.leaseId || nestedLease?.leaseId || '';
      const lease = this.tenantLeasesById.get(leaseId);
      const propertyName =
        lease?.property?.propertyName ||
        nestedLease?.property?.propertyName ||
        lease?.leaseName ||
        nestedLease?.leaseName ||
        'My Property';
      const unitName =
        lease?.unit?.unitNumber ||
        nestedLease?.unit?.unitNumber ||
        (nestedLease?.unitId ? String(nestedLease.unitId) : 'N/A');

      return {
        id: payment.paymentId,
        tenant: 'My Rent',
        property: `${propertyName} - ${unitName}`,
        unit: unitName,
        month: this.normalizeMonthYear(payment.monthYear),
        dueDate: payment.dueDate || `${this.normalizeMonthYear(payment.monthYear)}-07`,
        amount: payment.amountExpected || lease?.monthlyRent || 0,
        status: this.mapPaymentStatus(payment.paymentStatus),
        paidDate: payment.paidDate || undefined,
        method: payment.paymentMethod || undefined,
        leaseId,
        amountPaid: payment.amountPaid || 0,
        isAdvance: this.isAdvancePayment(payment.monthYear, payment.paidDate)
      };
    });
  }

  private normalizeMonthYear(monthYear: string): string {
    if (!monthYear) return new Date().toISOString().slice(0, 7);
    if (monthYear.length >= 7) return monthYear.slice(0, 7);
    return monthYear;
  }

  private mapPaymentStatus(status: string): 'Paid' | 'Pending' | 'Overdue' | 'Partial' {
    switch ((status || '').toUpperCase()) {
      case 'PAID':
        return 'Paid';
      case 'PARTIAL':
        return 'Partial';
      case 'OVERDUE':
      case 'UNPAID':
        return 'Overdue';
      default:
        return 'Pending';
    }
  }

  private isAdvancePayment(monthYear?: string, paidDate?: string): boolean {
    if (!monthYear || !paidDate) {
      return false;
    }
    const monthStart = `${monthYear.slice(0, 7)}-01`;
    return paidDate.slice(0, 10) < monthStart;
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
      const matchesSearch = this.isTenant
        ? r.property.toLowerCase().includes(term) || r.month.toLowerCase().includes(term)
        : r.tenant.toLowerCase().includes(term) || r.property.toLowerCase().includes(term);

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

  async downloadPaymentsPdf() {
    const rows = this.getReportRows();
    if (rows.length === 0) {
      this.presentToast('No payment records to export', 'medium');
      return;
    }

    const sdk = await this.loadJsPDF();
    if (!sdk || !sdk.jsPDF) {
      this.presentToast('PDF library failed to load', 'danger');
      return;
    }

    const { jsPDF } = sdk;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const marginX = 40;
    const pageHeight = doc.internal.pageSize.getHeight();
    const title = this.isTenant ? 'Tenant Payment Statement' : 'Owner Payment Statement';
    const generatedAt = new Date().toLocaleString();
    let y = 50;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(title, marginX, y);
    y += 18;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Generated: ${generatedAt}`, marginX, y);
    y += 18;
    doc.text(`Records: ${rows.length}`, marginX, y);
    y += 24;

    const columns = this.isTenant
      ? ['Property/Unit', 'Month', 'Amount', 'Status', 'Paid Date', 'Method']
      : ['Tenant', 'Property/Unit', 'Month', 'Amount', 'Status', 'Paid Date', 'Method'];

    const colWidths = this.isTenant
      ? [150, 60, 70, 70, 80, 70]
      : [90, 120, 60, 65, 60, 75, 60];

    const drawHeader = () => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      let x = marginX;
      columns.forEach((col, idx) => {
        doc.text(col, x, y);
        x += colWidths[idx];
      });
      y += 14;
      doc.setDrawColor(180);
      doc.line(marginX, y, marginX + colWidths.reduce((a, b) => a + b, 0), y);
      y += 12;
      doc.setFont('helvetica', 'normal');
    };

    drawHeader();
    for (const row of rows) {
      if (y > pageHeight - 40) {
        doc.addPage();
        y = 50;
        drawHeader();
      }
      const cells = this.isTenant
        ? [row.property, row.month, row.amount, row.status, row.paidDate, row.method]
        : [row.tenant, row.property, row.month, row.amount, row.status, row.paidDate, row.method];

      let x = marginX;
      cells.forEach((cell, idx) => {
        doc.text(String(cell || '-').slice(0, 28), x, y);
        x += colWidths[idx];
      });
      y += 14;
    }

    const filename = this.isTenant ? 'tenant-payments.pdf' : 'owner-payments.pdf';
    doc.save(filename);
  }

  printPayments() {
    const rows = this.getReportRows();
    if (rows.length === 0) {
      this.presentToast('No payment records to print', 'medium');
      return;
    }

    const title = this.isTenant ? 'Tenant Payment Statement' : 'Owner Payment Statement';
    const generatedAt = new Date().toLocaleString();
    const headerColumns = this.isTenant
      ? ['Property/Unit', 'Month', 'Amount', 'Status', 'Paid Date', 'Method']
      : ['Tenant', 'Property/Unit', 'Month', 'Amount', 'Status', 'Paid Date', 'Method'];

    const bodyRows = rows
      .map((row) => {
        const cells = this.isTenant
          ? [row.property, row.month, row.amount, row.status, row.paidDate, row.method]
          : [row.tenant, row.property, row.month, row.amount, row.status, row.paidDate, row.method];
        return `<tr>${cells.map((cell) => `<td>${this.escapeHtml(cell)}</td>`).join('')}</tr>`;
      })
      .join('');

    const html = `
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #111; }
            h2 { margin: 0 0 8px; }
            .meta { margin: 0 0 16px; color: #444; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
            th { background: #f3f3f3; }
          </style>
        </head>
        <body>
          <h2>${title}</h2>
          <p class="meta">Generated: ${generatedAt} | Records: ${rows.length}</p>
          <table>
            <thead>
              <tr>${headerColumns.map((h) => `<th>${h}</th>`).join('')}</tr>
            </thead>
            <tbody>${bodyRows}</tbody>
          </table>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=1024,height=768');
    if (!printWindow) {
      this.presentToast('Popup blocked. Please allow popups to print.', 'danger');
      return;
    }
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 300);
  }

  private getReportRows() {
    const source = this.filteredRecords.length > 0 ? this.filteredRecords : this.records;
    return source.map((record) => ({
      tenant: record.tenant || '-',
      property: record.property || '-',
      month: record.month || '-',
      amount: `TZS ${Number(record.amount || 0).toLocaleString()}`,
      status: record.isAdvance ? `${record.status} (Advance)` : record.status,
      paidDate: record.paidDate || '-',
      method: record.method || '-'
    }));
  }

  private async loadJsPDF(): Promise<any | null> {
    const w = window as any;
    if (w.jspdf || w.jsPDF) return w.jspdf || w.jsPDF;
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js';
      script.async = true;
      script.onload = () => resolve((window as any).jspdf || (window as any).jsPDF || null);
      script.onerror = () => resolve(null);
      document.head.appendChild(script);
    });
  }

  private escapeHtml(value: string): string {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
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
        const startMonth = (data.month || new Date().toISOString().slice(0, 7)).slice(0, 7);
        const monthlyAmount = parseFloat(data.amount);
        const monthsCovered = Math.max(1, Math.floor(Number(data.monthsCovered || 1)));

        if (!Number.isFinite(monthlyAmount) || monthlyAmount <= 0) {
          this.presentToast('Please enter a valid monthly amount', 'danger');
          return;
        }

        const paidDate = data.paidDate || new Date().toISOString().slice(0, 10);
        const paymentMethod = data.paymentMethod || 'CASH';

        for (let i = 0; i < monthsCovered; i++) {
          const monthYear = this.addMonths(startMonth, i);
          const paymentRequest: CreatePaymentRequest = {
            leaseId: data.leaseId,
            monthYear,
            amountExpected: monthlyAmount,
            amountPaid: monthlyAmount,
            dueDate: `${monthYear}-01`,
            paidDate,
            paymentMethod
          };
          await this.rentService.createPayment(paymentRequest);
        }

        await this.loadRentRecords(); // Refresh the records
        this.presentToast(
          monthsCovered > 1
            ? `Advance payment recorded for ${monthsCovered} months`
            : 'Payment recorded successfully',
          'success'
        );
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

  private addMonths(monthYear: string, offset: number): string {
    const [yearStr, monthStr] = monthYear.split('-');
    const base = new Date(Number(yearStr), Number(monthStr) - 1, 1);
    base.setMonth(base.getMonth() + offset);
    const year = base.getFullYear();
    const month = String(base.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
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
