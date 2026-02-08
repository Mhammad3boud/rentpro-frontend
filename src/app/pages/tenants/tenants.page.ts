import { Component, OnInit } from '@angular/core';
import { ModalController, AlertController, ToastController } from '@ionic/angular';
import { AddTenantModalComponent } from './add-tenant-modal/add-tenant-modal.component';

interface Tenant {
  name: string;
  unit: string;
  email: string;
  phone: string;
  property: string;
  rent: number;
  leaseEnd: string;
  emergency: string;
  status: string;
}

@Component({
  selector: 'app-tenants',
  templateUrl: './tenants.page.html',
  styleUrls: ['./tenants.page.scss'],
  standalone: false,
})
export class TenantsPage implements OnInit {
  tenants: Tenant[] = [
    {
      name: 'Alice Johnson',
      unit: 'Unit 2A',
      email: 'alice.johnson@email.com',
      phone: '+1-555-0789',
      property: 'Property P-456',
      rent: 1200,
      leaseEnd: '2024-12-31',
      emergency: 'Bob Johnson (+1-555-0790)',
      status: 'Active',
    },
    {
      name: 'Michael Chen',
      unit: 'Unit 5B',
      email: 'michael.chen@email.com',
      phone: '+1-555-0456',
      property: 'Property P-789',
      rent: 1500,
      leaseEnd: '2025-02-28',
      emergency: 'Lisa Chen (+1-555-0457)',
      status: 'Active',
    },
    {
      name: 'Emma Wilson',
      unit: 'Unit 3C',
      email: 'emma.wilson@email.com',
      phone: '+1-555-0321',
      property: 'Property P-123',
      rent: 1100,
      leaseEnd: '2024-10-15',
      emergency: 'Tom Wilson (+1-555-0322)',
      status: 'Expiring Soon',
    },
    {
      name: 'Emma Wilson',
      unit: 'Unit 3C',
      email: 'emma.wilson@email.com',
      phone: '+1-555-0321',
      property: 'Property P-123',
      rent: 1100,
      leaseEnd: '2024-10-15',
      emergency: 'Tom Wilson (+1-555-0322)',
      status: 'Expired',
    },
  ];

  filteredTenants: Tenant[] = [];
  searchTerm = '';
  selectedStatus = 'all';

  constructor(
    private modalCtrl: ModalController,
    private alertController: AlertController,
    private toastController: ToastController,
  ) {}

  ngOnInit() {
    this.filteredTenants = [...this.tenants];
  }

  doRefresh(event: any) {
    // Reset filters to defaults
    this.searchTerm = '';
    this.selectedStatus = 'all';
    // Recompute list (simulate fetching latest data)
    this.filteredTenants = [...this.tenants];
    setTimeout(() => {
      this.filterTenants();
      event.target.complete();
    }, 400);
  }

  filterTenants() {
    const term = this.searchTerm.toLowerCase();
    this.filteredTenants = this.tenants.filter((t) => {
      const matchesSearch =
        t.name.toLowerCase().includes(term) ||
        t.email.toLowerCase().includes(term) ||
        t.property.toLowerCase().includes(term);

      const matchesStatus =
        this.selectedStatus === 'all' || t.status === this.selectedStatus;

      return matchesSearch && matchesStatus;
    });
  }

  // 🔹 Function to open Add Tenant Modal
  async openAddTenantModal() {
    const modal = await this.modalCtrl.create({
      component: AddTenantModalComponent,
      cssClass: 'centered-modal', // optional - for desktop style center popup
      backdropDismiss: false,
    });
    await modal.present();

    const { data } = await modal.onWillDismiss();
    if (data) {
      // Add new tenant to the list dynamically
      const newTenant: Tenant = {
        name: data.fullName,
        unit: data.unitNumber,
        email: data.email,
        phone: data.phoneNumber,
        property: data.propertyNumber,
        rent: parseFloat(data.monthlyRent),
        leaseEnd: data.leaseEnd,
        emergency: data.emergencyContact,
        status: 'Active',
      };
      this.tenants.push(newTenant);
      this.filteredTenants = [...this.tenants];
    }
  }

  async editTenant(tenant: Tenant) {
    const componentProps = {
      tenant: {
        fullName: tenant.name,
        email: tenant.email,
        phoneNumber: tenant.phone,
        propertyNumber: tenant.property,
        unitNumber: tenant.unit,
        monthlyRent: tenant.rent?.toString?.() ?? `${tenant.rent}`,
        leaseStart: '',
        leaseEnd: tenant.leaseEnd,
        renewalReminder: '',
        emergencyContact: tenant.emergency,
        address: ''
      }
    } as any;

    const modal = await this.modalCtrl.create({
      component: AddTenantModalComponent,
      componentProps,
      cssClass: 'centered-modal',
      backdropDismiss: false,
    });
    await modal.present();

    const { data } = await modal.onWillDismiss();
    if (data) {
      const updated: Tenant = {
        ...tenant,
        name: data.fullName ?? tenant.name,
        unit: data.unitNumber ?? tenant.unit,
        email: data.email ?? tenant.email,
        phone: data.phoneNumber ?? tenant.phone,
        property: data.propertyNumber ?? tenant.property,
        rent: parseFloat(data.monthlyRent ?? tenant.rent),
        leaseEnd: data.leaseEnd ?? tenant.leaseEnd,
        emergency: data.emergencyContact ?? tenant.emergency,
        status: tenant.status,
      };
      this.tenants = this.tenants.map(t => (t === tenant ? updated : t));
      this.filteredTenants = [...this.tenants];
      this.presentToast('Tenant updated', 'success');
    }
  }

  async confirmDeleteTenant(tenant: Tenant) {
    const alert = await this.alertController.create({
      header: 'Remove Tenant',
      message: `Are you sure you want to remove ${tenant.name}?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Remove', role: 'destructive', handler: () => this.deleteTenant(tenant) },
      ],
    });
    await alert.present();
  }

  private deleteTenant(tenant: Tenant) {
    this.tenants = this.tenants.filter(t => t !== tenant);
    this.filteredTenants = [...this.tenants];
    this.presentToast('Tenant removed', 'danger');
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
