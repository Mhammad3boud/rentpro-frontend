import { Component, OnInit, Input } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular';
import { TenantsService, TenantCreateRequest, TenantStatus } from '../../../services/tenants.service';
import { TenantAssignmentService, AvailableUnit } from '../../../services/tenant-assignment.service';
import { LeaseService } from '../../../services/lease.service';

@Component({
  selector: 'app-add-tenant-modal',
  templateUrl: './add-tenant-modal.component.html',
  styleUrls: ['./add-tenant-modal.component.scss'],
  standalone: false,
})
export class AddTenantModalComponent implements OnInit {
  tenant = {
    fullName: '',
    email: '',
    phoneNumber: '',
    emergencyName: '',
    emergencyPhone: '',
    address: '',
    monthlyRent: '',
    leaseStart: '',
    leaseEnd: '',
    renewalReminder: '',
    status: 'ACTIVE' as TenantStatus
  };

  availableUnits: AvailableUnit[] = [];
  selectedUnit?: AvailableUnit;
  currentAssignment?: {
    propertyName: string;
    unitName: string;
    propertyAddress: string;
  };
  isLoading = false;

  @Input() existingTenant?: any;
  @Input() tenantId?: string;
  isEditMode = false;
  existingLeaseId?: string;

  constructor(
    private modalCtrl: ModalController,
    private toastController: ToastController,
    private tenantsService: TenantsService,
    private assignmentService: TenantAssignmentService,
    private leaseService: LeaseService
  ) {}

  async ngOnInit() {
    // Check if we're in edit mode
    if (this.existingTenant) {
      this.isEditMode = true;
      // Populate form with existing tenant data
      this.tenant = {
        fullName: this.existingTenant.fullName || '',
        email: this.existingTenant.email || '',
        phoneNumber: this.existingTenant.phoneNumber || this.existingTenant.phone || '',
        emergencyName: this.existingTenant.emergencyName || this.existingTenant.emergencyContact || '',
        emergencyPhone: this.existingTenant.emergencyPhone || '',
        address: this.existingTenant.address || '',
        monthlyRent: this.existingTenant.monthlyRent?.toString() || '',
        leaseStart: this.existingTenant.leaseStart || '',
        leaseEnd: this.existingTenant.leaseEnd || '',
        renewalReminder: this.existingTenant.renewalReminder || '',
        status: (this.existingTenant.status || 'ACTIVE') as TenantStatus
      };
      
      console.log('Edit mode - existing tenant:', this.existingTenant);
      console.log('Edit mode - tenantId:', this.tenantId);
      console.log('Edit mode - populated form:', this.tenant);

      // Fetch existing lease for this tenant
      const existingTenantId = this.existingTenant.tenantId || this.existingTenant.id;
      if (existingTenantId) {
        try {
          const lease = await this.leaseService.getLeaseByTenantId(existingTenantId).toPromise();
          if (lease) {
            this.existingLeaseId = lease.leaseId;
            console.log('Found existing lease:', lease, 'ID:', this.existingLeaseId);
          }
        } catch (err) {
          console.log('No existing lease found for tenant');
        }
      }

      // Set the current assigned unit for display
      if (this.existingTenant.propertyRef && this.existingTenant.unitNo) {
        this.currentAssignment = {
          propertyName: this.existingTenant.propertyRef,
          unitName: this.existingTenant.unitNo,
          propertyAddress: this.existingTenant.address || ''
        };
      }
    }
    
    await this.loadAvailableUnits();
  }

  private async loadAvailableUnits() {
    this.isLoading = true;
    try {
      // Pass tenant ID in edit mode so their current unit shows as available
      const currentTenantId = this.isEditMode ? (this.existingTenant?.tenantId || this.existingTenant?.id) : undefined;
      this.availableUnits = await this.assignmentService.getAvailableUnitsForAssignment(currentTenantId);
    } catch (error) {
      console.error('Failed to load available units:', error);
    } finally {
      this.isLoading = false;
    }
  }

  getUnitStatusLabel(unit: AvailableUnit): string {
    if (unit.isAvailable) {
      if (unit.leaseStatus === 'EXPIRED') {
        return 'Expired Lease';
      }
      return 'Available';
    }
    return `Occupied by ${unit.currentTenantName || 'tenant'}`;
  }

  getUnitStatusColor(unit: AvailableUnit): string {
    if (unit.isAvailable) {
      return unit.leaseStatus === 'EXPIRED' ? 'warning' : 'success';
    }
    return 'danger';
  }

  cancel() {
    this.modalCtrl.dismiss();
  }

  async saveTenant() {
    if (!this.validateForm()) {
      return;
    }

    this.isLoading = true;
    try {
      const tenantData: TenantCreateRequest = {
        fullName: this.tenant.fullName,
        email: this.tenant.email,
        phone: this.tenant.phoneNumber,
        emergencyName: this.tenant.emergencyName,
        emergencyPhone: this.tenant.emergencyPhone,
        address: this.tenant.address,
        monthlyRent: parseFloat(this.tenant.monthlyRent),
        leaseStart: this.tenant.leaseStart,
        leaseEnd: this.tenant.leaseEnd,
        renewalReminder: this.tenant.renewalReminder,
        status: this.tenant.status,
        propertyRef: this.selectedUnit?.propertyName || this.existingTenant?.propertyRef || '',
        unitNo: this.selectedUnit?.unitName || this.existingTenant?.unitNo || ''
      };

      console.log('Sending tenant data:', tenantData);
      console.log('Monthly rent being sent:', tenantData.monthlyRent);

      if (this.isEditMode && this.tenantId) {
        // Update existing tenant
        console.log('Updating tenant with ID:', this.tenantId);
        console.log('Tenant data being sent:', tenantData);
        
        const result = await this.tenantsService.update(String(this.tenantId), tenantData).toPromise();
        console.log('Update result:', result);
        
        // Update lease data if we have an existing lease
        const hasLeaseChanges = this.tenant.monthlyRent || this.tenant.leaseStart || this.tenant.leaseEnd;
        
        if (hasLeaseChanges && this.existingLeaseId) {
          // Update existing lease
          console.log('Updating existing lease:', this.existingLeaseId);
          await this.leaseService.updateLease(this.existingLeaseId, {
            monthlyRent: parseFloat(this.tenant.monthlyRent) || 0,
            startDate: this.tenant.leaseStart,
            endDate: this.tenant.leaseEnd
          }).toPromise();
          console.log('Lease updated successfully');
        } else if (hasLeaseChanges && this.selectedUnit) {
          // New unit selected, create new lease assignment
          console.log('Creating new lease assignment...');
          await this.assignmentService.assignTenantToLease({
            tenantId: this.tenantId,
            propertyId: this.selectedUnit.propertyId,
            unitId: this.selectedUnit.unitId,
            monthlyRent: parseFloat(this.tenant.monthlyRent) || 0,
            startDate: this.tenant.leaseStart,
            endDate: this.tenant.leaseEnd
          }).toPromise();
        }
        
        this.presentToast('Tenant updated successfully', 'success');
        this.modalCtrl.dismiss({
          ...tenantData,
          id: this.tenantId,
          tenantId: this.tenantId,
          status: this.tenant.status
        });
      } else {
        // Create new tenant
        const createdTenant = await this.tenantsService.create(tenantData).toPromise();

        // If unit is selected, assign tenant to lease
        if (this.selectedUnit && createdTenant) {
          await this.assignmentService.assignTenantToLease({
            tenantId: createdTenant.id || createdTenant.tenantId || '',
            propertyId: this.selectedUnit.propertyId,
            unitId: this.selectedUnit.unitId,
            monthlyRent: parseFloat(this.tenant.monthlyRent) || 0,
            startDate: this.tenant.leaseStart,
            endDate: this.tenant.leaseEnd
          }).toPromise();
        }

        this.modalCtrl.dismiss({
          ...tenantData,
          id: createdTenant?.id || createdTenant?.tenantId,
          status: 'ACTIVE'
        });
      }

    } catch (error: any) {
      console.error('Failed to save tenant:', error);
      // Extract error message from backend response
      let errorMsg = 'Unknown error';
      if (error?.error?.message) {
        errorMsg = error.error.message;
      } else if (error?.message) {
        errorMsg = error.message;
      }
      this.presentToast('Failed to save tenant: ' + errorMsg, 'danger');
    } finally {
      this.isLoading = false;
    }
  }

  private validateForm(): boolean {
    if (!this.tenant.fullName || !this.tenant.email || !this.tenant.phoneNumber) {
      this.presentToast('Please fill in all required fields', 'warning');
      return false;
    }
    if (!this.tenant.leaseStart || !this.tenant.leaseEnd) {
      this.presentToast('Please provide lease dates', 'warning');
      return false;
    }
    if (!this.tenant.monthlyRent || parseFloat(this.tenant.monthlyRent) <= 0) {
      this.presentToast('Please provide a valid monthly rent', 'warning');
      return false;
    }
    // Unit selection is required for new tenants but optional for existing ones
    if (!this.isEditMode && !this.selectedUnit) {
      this.presentToast('Please select a property and unit', 'warning');
      return false;
    }
    return true;
  }

  private async presentToast(message: string, color: 'success' | 'danger' | 'primary' | 'medium' | 'warning') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: 'top',
    });
    await toast.present();
  }

  onUnitSelected(unit: AvailableUnit) {
    if (!unit.isAvailable) {
      // Clear selection if occupied unit is somehow selected
      this.selectedUnit = undefined;
      return;
    }
    this.selectedUnit = unit;
  }
}
