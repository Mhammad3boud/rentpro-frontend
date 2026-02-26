import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ModalController, AlertController, ToastController } from '@ionic/angular';
import { GenerateContractModalComponent } from './generate-contract-modal/generate-contract-modal.component';
import { LeaseService } from '../../services/lease.service';
import { Lease } from '../../models';
import { UserService } from '../../services/user.service';


interface Contract {
  id: string;
  leaseId: string;
  tenant: string;
  property: string;
  startDate: string;
  endDate: string;
  rent: number;
  deposit: number;
  generated: string;
  status: string;
}

@Component({
  selector: 'app-contracts',
  templateUrl: './contracts.page.html',
  styleUrls: ['./contracts.page.scss'],
  standalone: false,
})
export class ContractsPage implements OnInit {
  contracts: Contract[] = [];
  filteredContracts: Contract[] = [];
  searchTerm = '';
  isLoading = true;
  isTenant = false;
  private readonly baseUrl = 'http://localhost:8083';

  constructor(
    private modalCtrl: ModalController,
    private alertController: AlertController,
    private toastController: ToastController,
    private leaseService: LeaseService,
    private userService: UserService,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.isTenant = this.userService.isTenant();
    this.loadContracts();
  }

  doRefresh(event: any) {
    this.getLeasesForCurrentRole().subscribe({
      next: (leases) => {
        this.contracts = leases.map((lease) => this.mapLeaseToContract(lease));
        this.filterContracts();
        this.cdr.detectChanges();
        event.target.complete();
      },
      error: (err) => {
        console.error('Failed to load contracts:', err);
        this.presentToast('Failed to load contracts', 'danger');
        event.target.complete();
      },
    });
  }

  loadContracts() {
    this.isLoading = true;
    this.getLeasesForCurrentRole().subscribe({
      next: (leases) => {
        console.log('Loaded leases:', leases);
        this.contracts = leases.map((lease) => this.mapLeaseToContract(lease));
        console.log('Mapped contracts:', this.contracts);
        this.filterContracts();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load contracts:', err);
        this.presentToast('Failed to load contracts', 'danger');
        this.isLoading = false;
      },
    });
  }

  private getLeasesForCurrentRole() {
    return this.isTenant
      ? this.leaseService.getTenantLeases()
      : this.leaseService.getMyLeases();
  }

  private mapLeaseToContract(lease: Lease): Contract {
    const propertyName = lease.property?.propertyName || lease.property?.address || 'Unknown Property';
    const unitNumber = lease.unit?.unitNumber;
    const propertyDisplay = unitNumber ? `${propertyName} / Unit ${unitNumber}` : propertyName;
    
    return {
      id: `CNT-${lease.leaseId.slice(0, 8).toUpperCase()}`,
      leaseId: lease.leaseId,
      tenant: this.isTenant ? (lease.tenant?.fullName || 'Me') : (lease.tenant?.fullName || 'Unknown Tenant'),
      property: propertyDisplay,
      startDate: lease.startDate || '',
      endDate: lease.endDate || '',
      rent: lease.monthlyRent || 0,
      deposit: lease.securityDeposit != null ? lease.securityDeposit : (lease.monthlyRent || 0) * 2,
      generated: lease.createdAt?.slice(0, 10) || '',
      status: this.computeStatus(lease.startDate || '', lease.endDate || ''),
    };
  }

  filterContracts() {
    const term = this.searchTerm.toLowerCase();
    this.filteredContracts = [...this.contracts.filter(
      (c) =>
        c.tenant.toLowerCase().includes(term) ||
        c.id.toLowerCase().includes(term) ||
        c.property.toLowerCase().includes(term)
    )];
  }

  trackByContract(index: number, contract: Contract): string {
    // Include deposit in tracking to detect changes
    return `${contract.leaseId}-${contract.rent}-${contract.deposit}`;
  }

  // 🆕 Open Generate Contract Modal
  async openGenerateContractModal() {
    const modal = await this.modalCtrl.create({
      component: GenerateContractModalComponent,
      cssClass: 'generate-contract-modal'
    });

    await modal.present();

    // Handle returned data - generate PDF
    const { data } = await modal.onWillDismiss();
    if (data) {
      const today = new Date().toISOString().slice(0, 10);
      const seq = (Date.now() % 1000).toString().padStart(3, '0');
      const year = new Date().getFullYear();
      const contractId = `CNT-${year}-${seq}`;
      
      // Create a temporary contract object for PDF generation
      const pdfContract: Contract = {
        id: contractId,
        leaseId: '',
        tenant: data.tenantName || 'Unnamed Tenant',
        property: data.unitNumber 
          ? `${data.propertyNumber || ''} / Unit ${data.unitNumber}`
          : (data.propertyNumber || ''),
        startDate: data.leaseStartDate || today,
        endDate: data.leaseEndDate || today,
        rent: Number(data.monthlyRent) || 0,
        deposit: Number(data.securityDeposit) || 0,
        generated: today,
        status: this.computeStatus(data.leaseStartDate || today, data.leaseEndDate || today),
      };
      
      // Generate and download the PDF
      this.generatePdf(pdfContract);
      this.presentToast('Contract PDF generated', 'success');
    }
  }

  async editContract(contract: Contract) {
    // Parse property display format: "Property Name / Unit X" or "Property Name"
    const parts = (contract.property || '').split(' / Unit ');
    const propertyNumber = parts[0]?.trim() || '';
    const unitNumber = parts[1]?.trim() || '';
    
    const modal = await this.modalCtrl.create({
      component: GenerateContractModalComponent,
      componentProps: {
        preset: {
          tenantName: contract.tenant,
          propertyNumber,
          unitNumber,
          leaseStartDate: contract.startDate,
          leaseEndDate: contract.endDate,
          monthlyRent: contract.rent,
          securityDeposit: contract.deposit,
        },
        isEditMode: true,
      },
      cssClass: 'generate-contract-modal',
    });
    await modal.present();

    const { data } = await modal.onWillDismiss();
    if (data) {
      // Call backend to update lease
      this.leaseService.updateLease(contract.leaseId, {
        monthlyRent: Number(data.monthlyRent),
        securityDeposit: Number(data.securityDeposit),
        startDate: data.leaseStartDate,
        endDate: data.leaseEndDate,
      }).subscribe({
        next: () => {
          // Reload contracts to get fresh data
          this.loadContracts();
          this.presentToast('Contract updated', 'success');
        },
        error: (err) => {
          console.error('Failed to update contract:', err);
          this.presentToast('Failed to update contract', 'danger');
        },
      });
    }
  }

  downloadPdf(contract: Contract) {
    // If contract has a real leaseId, try backend PDF first
    if (contract.leaseId) {
      this.http.get(`${this.baseUrl}/api/contracts/${contract.leaseId}/pdf`, { 
        responseType: 'blob' 
      }).subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${contract.id}.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        },
        error: () => {
          // Fallback to frontend PDF generation
          this.generatePdf(contract);
        },
      });
    } else {
      this.generatePdf(contract);
    }
  }

  async confirmDelete(contract: Contract) {
    const alert = await this.alertController.create({
      header: 'Delete Contract',
      message: `Delete ${contract.id} for ${contract.tenant}?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Delete', role: 'destructive', handler: () => this.deleteContract(contract) },
      ],
    });
    await alert.present();
  }

  private deleteContract(contract: Contract) {
    this.leaseService.deleteLease(contract.leaseId).subscribe({
      next: () => {
        this.contracts = this.contracts.filter(c => c !== contract);
        this.filterContracts();
        this.presentToast('Contract deleted', 'success');
      },
      error: (err) => {
        console.error('Failed to delete contract:', err);
        this.presentToast('Failed to delete contract', 'danger');
      },
    });
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

  private computeStatus(startDate: string, endDate: string): string {
    const today = new Date();
    const end = new Date(endDate);
    // Expired if end date is before today
    if (end.getTime() < new Date(today.toDateString()).getTime()) {
      return 'Expired';
    }
    // Expiring soon if within 30 days from today
    const diffDays = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 30) return 'Expiring Soon';
    return 'Active';
  }

  // Lazy-load jsPDF from CDN; fallback to .txt if unavailable
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

  private async generatePdf(contract: Contract) {
    const sdk = await this.loadJsPDF();
    try {
      if (sdk && sdk.jsPDF) {
        const { jsPDF } = sdk;
        const doc = new jsPDF({ unit: 'pt', format: 'a4' });
        let y = 60;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text('RESIDENTIAL LEASE AGREEMENT', 50, y);
        y += 24;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        const lines = [
          `Contract Number: ${contract.id}`,
          `Generated Date: ${contract.generated}`,
          '',
          `LANDLORD: Property Owner`,
          `TENANT: ${contract.tenant}`,
          '',
          `PROPERTY: ${contract.property}`,
          '',
          'LEASE TERMS:',
          `- Lease Start Date: ${contract.startDate}`,
          `- Lease End Date: ${contract.endDate}`,
          `- Monthly Rent: $${contract.rent}`,
          `- Security Deposit: $${contract.deposit}`,
          '',
          'ADDITIONAL TERMS:',
          'Standard lease terms and conditions apply.',
          '',
          '___________________________           ___________________________',
          'Landlord Signature                    Tenant Signature',
          '',
          'Date: ____________                      Date: ____________',
        ];
        for (const line of lines) {
          doc.text(line, 50, y);
          y += 18;
        }
        doc.save(`${contract.id}.pdf`);
        return;
      }
    } catch (e) {
      // fall through to txt fallback
    }
    const content = `RESIDENTIAL LEASE AGREEMENT\n\nContract: ${contract.id}\nGenerated: ${contract.generated}\n\nLANDLORD: Property Owner\nTENANT: ${contract.tenant}\nPROPERTY: ${contract.property}\n\nLEASE TERMS:\n- Start: ${contract.startDate}\n- End: ${contract.endDate}\n- Monthly Rent: $${contract.rent}\n- Security Deposit: $${contract.deposit}`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${contract.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
