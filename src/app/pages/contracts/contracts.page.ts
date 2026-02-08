import { Component, OnInit } from '@angular/core';
import { ModalController, AlertController, ToastController } from '@ionic/angular';
import { GenerateContractModalComponent } from './generate-contract-modal/generate-contract-modal.component';

interface Contract {
  id: string;
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
  contracts: Contract[] = [
    {
      id: 'CNT-2024-001',
      tenant: 'Alice Johnson',
      property: 'P-456/2A',
      startDate: '2024-01-15',
      endDate: '2024-12-31',
      rent: 1200,
      deposit: 2400,
      generated: '2024-01-10',
      status: 'Active',
    },
    {
      id: 'CNT-2024-002',
      tenant: 'Michael Chen',
      property: 'P-789/5B',
      startDate: '2024-03-01',
      endDate: '2025-02-28',
      rent: 1500,
      deposit: 3000,
      generated: '2024-02-25',
      status: 'Active',
    },
    {
      id: 'CNT-2024-003',
      tenant: 'Emma Wilson',
      property: 'P-123/3C',
      startDate: '2023-06-01',
      endDate: '2024-10-15',
      rent: 1100,
      deposit: 2200,
      generated: '2023-05-25',
      status: 'Expiring Soon',
    },
  ];

  filteredContracts: Contract[] = [];
  searchTerm = '';

  constructor(
  private modalCtrl: ModalController,
  private alertController: AlertController,
  private toastController: ToastController,
) {}

  ngOnInit() {
    // Ensure statuses reflect dates on load
    this.contracts = this.contracts.map((c) => ({
      ...c,
      status: this.computeStatus(c.startDate, c.endDate),
    }));
    this.filteredContracts = [...this.contracts];
  }

  filterContracts() {
    const term = this.searchTerm.toLowerCase();
    this.filteredContracts = this.contracts.filter(
      (c) =>
        c.tenant.toLowerCase().includes(term) ||
        c.id.toLowerCase().includes(term) ||
        c.property.toLowerCase().includes(term)
    );
  }

  // 🆕 Open Generate Contract Modal
  async openGenerateContractModal() {
    const modal = await this.modalCtrl.create({
      component: GenerateContractModalComponent,
      cssClass: 'generate-contract-modal'
    });

    await modal.present();

    // Handle returned data and add a new contract card
    const { data } = await modal.onWillDismiss();
    if (data) {
      const today = new Date().toISOString().slice(0, 10);
      const seq = (Date.now() % 1000).toString().padStart(3, '0');
      const year = new Date().getFullYear();
      const newContract: Contract = {
        id: `CNT-${year}-${seq}`,
        tenant: data.tenantName || 'Unnamed Tenant',
        property: `${data.propertyNumber || ''}/${data.unitNumber || ''}`,
        startDate: data.leaseStartDate || today,
        endDate: data.leaseEndDate || today,
        rent: Number(data.monthlyRent) || 0,
        deposit: Number(data.securityDeposit) || 0,
        generated: today,
        status: this.computeStatus(data.leaseStartDate || today, data.leaseEndDate || today),
      };
      this.contracts = [newContract, ...this.contracts];
      this.filterContracts();
    }
  }

  async editContract(contract: Contract) {
    const [propertyNumber = '', unitNumber = ''] = (contract.property || '').split('/');
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
      },
      cssClass: 'generate-contract-modal',
    });
    await modal.present();

    const { data } = await modal.onWillDismiss();
    if (data) {
      contract.tenant = data.tenantName ?? contract.tenant;
      contract.property = `${data.propertyNumber || propertyNumber}/${data.unitNumber || unitNumber}`;
      contract.startDate = data.leaseStartDate || contract.startDate;
      contract.endDate = data.leaseEndDate || contract.endDate;
      contract.rent = Number(data.monthlyRent ?? contract.rent);
      contract.deposit = Number(data.securityDeposit ?? contract.deposit);
      contract.status = this.computeStatus(contract.startDate, contract.endDate);
      this.filterContracts();
    }
  }

  downloadPdf(contract: Contract) {
    this.generatePdf(contract);
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
    this.contracts = this.contracts.filter(c => c !== contract);
    this.filterContracts();
    this.presentToast('Contract deleted', 'danger');
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
