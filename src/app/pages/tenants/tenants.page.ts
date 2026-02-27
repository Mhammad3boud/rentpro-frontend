import { Component, OnInit } from '@angular/core';
import { ModalController, AlertController, ToastController } from '@ionic/angular';
import { AddTenantModalComponent } from './add-tenant-modal/add-tenant-modal.component';
import { AssignTenantModalComponent } from './assign-tenant-modal/assign-tenant-modal.component';
import { TenantsService, TenantDto } from '../../services/tenants.service';
import { TenantAssignmentService } from '../../services/tenant-assignment.service';

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
  tenants: TenantDto[] = [];
  filteredTenants: TenantDto[] = [];
  searchTerm = '';
  selectedStatus = 'all';
  isLoading = false;

  constructor(
    private modalCtrl: ModalController,
    private alertController: AlertController,
    private toastController: ToastController,
    private tenantsService: TenantsService,
    private assignmentService: TenantAssignmentService
  ) {}

  ngOnInit() {
    this.loadTenants();
  }

  private loadTenants() {
    console.log('Loading tenants from backend...');
    this.isLoading = true;
    this.tenantsService.list().subscribe({
      next: (tenants) => {
        console.log('Loaded tenants:', tenants);
        console.log('Number of tenants loaded:', tenants.length);
        this.tenants = tenants;
        this.filteredTenants = [...this.tenants];
        console.log('Updated tenant list:', this.tenants);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Failed to load tenants:', error);
        this.presentToast('Failed to load tenants', 'danger');
        this.isLoading = false;
      }
    });
  }

  doRefresh(event: any) {
    // Reset filters to defaults
    this.searchTerm = '';
    this.selectedStatus = 'all';
    
    this.loadTenants();
    setTimeout(() => {
      this.filterTenants();
      event.target.complete();
    }, 400);
  }

  // 🔹 Function to open Assign Tenant Modal
  async openAssignTenantModal() {
    const modal = await this.modalCtrl.create({
      component: AssignTenantModalComponent,
      cssClass: 'centered-modal',
      backdropDismiss: false,
    });
    await modal.present();

    const { data } = await modal.onWillDismiss();
    if (data && data.success) {
      this.presentToast('Tenant assigned successfully', 'success');
      this.loadTenants(); // Refresh from backend
    }
  }

  filterTenants() {
    const term = this.searchTerm.toLowerCase();
    this.filteredTenants = this.tenants.filter((t) => {
      const matchesSearch =
        t.fullName.toLowerCase().includes(term) ||
        t.email.toLowerCase().includes(term) ||
        t.propertyRef.toLowerCase().includes(term) ||
        t.unitNo.toLowerCase().includes(term);

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
      this.presentToast('Tenant created successfully', 'success');
      this.loadTenants(); // Refresh from backend
    }
  }

  async editTenant(tenant: TenantDto) {
    const componentProps = {
      existingTenant: tenant,
      tenantId: tenant.tenantId || tenant.id
    };

    const modal = await this.modalCtrl.create({
      component: AddTenantModalComponent,
      componentProps,
      cssClass: 'centered-modal',
      backdropDismiss: false,
    });
    await modal.present();

    const { data } = await modal.onWillDismiss();
    if (data) {
      this.presentToast('Tenant updated', 'success');
      this.loadTenants(); // Refresh from backend
    }
  }

  async confirmDeleteTenant(tenant: TenantDto) {
    const alert = await this.alertController.create({
      header: 'Remove Tenant',
      message: `Are you sure you want to remove ${tenant.fullName}?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Remove', role: 'destructive', handler: () => this.deleteTenant(tenant) },
      ],
    });
    await alert.present();
  }

  private deleteTenant(tenant: TenantDto) {
    const tenantId = tenant.tenantId || tenant.id;
    console.log('Attempting to delete tenant:', tenantId);
    this.tenantsService.remove(tenantId).subscribe({
      next: () => {
        console.log('Tenant deleted successfully');
        this.presentToast('Tenant removed', 'success');
        this.loadTenants(); // Refresh from backend
      },
      error: (error) => {
        console.error('Failed to delete tenant:', error);
        // Extract error message from backend response
        let errorMsg = 'Unknown error';
        if (error?.error?.message) {
          errorMsg = error.error.message;
        } else if (error?.message) {
          errorMsg = error.message;
        }
        this.presentToast('Failed to remove tenant: ' + errorMsg, 'danger');
      }
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

  getTenantStatusColor(status: string): string {
    return (status || '').toUpperCase() === 'ACTIVE' ? 'success' : 'medium';
  }

  getTenantStatusLabel(status: string): string {
    const normalized = (status || '').toUpperCase();
    if (!normalized) return 'Unknown';
    return normalized.charAt(0) + normalized.slice(1).toLowerCase();
  }

  getEmergencyDisplay(tenant: TenantDto): string {
    const name = (tenant.emergencyName || '').trim();
    const phone = (tenant.emergencyPhone || '').trim();

    if (name && phone) {
      return `${name} - ${phone}`;
    }
    if (name) {
      return name;
    }
    if (phone) {
      return phone;
    }
    return 'Not provided';
  }
}
