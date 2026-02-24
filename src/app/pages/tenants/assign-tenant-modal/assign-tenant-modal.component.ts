import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { TenantAssignmentService, AvailableUnit, TenantAssignmentRequest } from '../../../services/tenant-assignment.service';
import { TenantsService, TenantDto } from '../../../services/tenants.service';

@Component({
  selector: 'app-assign-tenant-modal',
  templateUrl: './assign-tenant-modal.component.html',
  styleUrls: ['./assign-tenant-modal.component.scss'],
  standalone: false,
})
export class AssignTenantModalComponent implements OnInit {
  tenants: TenantDto[] = [];
  availableUnits: AvailableUnit[] = [];
  selectedTenant?: TenantDto;
  selectedUnit?: AvailableUnit;
  isLoading = false;
  searchTerm = '';
  unitSearchTerm = '';
  assignmentData = {
    startDate: '',
    endDate: ''
  };

  get filteredTenants(): TenantDto[] {
    if (!this.searchTerm) return this.tenants;
    
    const term = this.searchTerm.toLowerCase();
    return this.tenants.filter(tenant => 
      tenant.fullName.toLowerCase().includes(term) ||
      tenant.email.toLowerCase().includes(term) ||
      tenant.phone.toLowerCase().includes(term) ||
      tenant.propertyRef.toLowerCase().includes(term) ||
      tenant.unitNo.toLowerCase().includes(term)
    );
  }

  get filteredUnits(): AvailableUnit[] {
    if (!this.unitSearchTerm) return this.availableUnits;
    
    const term = this.unitSearchTerm.toLowerCase();
    return this.availableUnits.filter(unit => 
      unit.propertyName.toLowerCase().includes(term) ||
      unit.unitName.toLowerCase().includes(term) ||
      unit.propertyAddress.toLowerCase().includes(term) ||
      unit.leaseName.toLowerCase().includes(term)
    );
  }

  constructor(
    private modalCtrl: ModalController,
    private tenantsService: TenantsService,
    private assignmentService: TenantAssignmentService
  ) {}

  async ngOnInit() {
    await this.loadData();
  }

  private async loadData() {
    this.isLoading = true;
    try {
      const [tenants, units] = await Promise.all([
        this.tenantsService.list().toPromise(),
        this.assignmentService.getAvailableUnitsForAssignment()
      ]);
      
      this.tenants = tenants || [];
      this.availableUnits = units;
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      this.isLoading = false;
    }
  }

  getUnitStatusLabel(unit: AvailableUnit): string {
    if (unit.isAvailable) {
      if (unit.leaseStatus === 'EXPIRED') {
        return 'Lease Expired';
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

  async assignTenant() {
    if (!this.validateAssignment()) {
      return;
    }

    this.isLoading = true;
    try {
      const request: TenantAssignmentRequest = {
        tenantId: String(this.selectedTenant!.id || this.selectedTenant!.tenantId),
        propertyId: this.selectedUnit!.propertyId,
        unitId: this.selectedUnit!.unitId,
        monthlyRent: 0, // Will need to be set by user
        startDate: this.assignmentData.startDate,
        endDate: this.assignmentData.endDate || undefined
      };

      const result = await this.assignmentService.assignTenantToLease(request).toPromise();
      
      this.modalCtrl.dismiss({
        success: true,
        assignment: result,
        tenant: this.selectedTenant,
        unit: this.selectedUnit
      });

    } catch (error) {
      console.error('Failed to assign tenant:', error);
      // Handle error appropriately
    } finally {
      this.isLoading = false;
    }
  }

  private validateAssignment(): boolean {
    if (!this.selectedTenant) {
      return false;
    }
    if (!this.selectedUnit) {
      return false;
    }
    if (!this.assignmentData.startDate) {
      return false;
    }
    return true;
  }

  onTenantSelected(tenant: TenantDto) {
    this.selectedTenant = tenant;
    // Reload available units to account for this tenant's current assignment
    this.reloadUnitsForTenant(tenant);
  }

  private async reloadUnitsForTenant(tenant: TenantDto) {
    try {
      // Pass tenant ID so their current unit shows as available for reassignment
      const currentTenantId = tenant.tenantId || tenant.id;
      this.availableUnits = await this.assignmentService.getAvailableUnitsForAssignment(currentTenantId);
    } catch (error) {
      console.error('Failed to reload units:', error);
    }
  }

  onUnitSelected(unit: AvailableUnit) {
    if (!unit.isAvailable) {
      return; // Don't allow selection of occupied units
    }
    this.selectedUnit = unit;
  }

  getTenantStatus(tenant: TenantDto): string {
    return tenant.status === 'ACTIVE' ? 'Active' : 'Inactive';
  }

  getTenantStatusColor(tenant: TenantDto): string {
    return tenant.status === 'ACTIVE' ? 'success' : 'medium';
  }
}
