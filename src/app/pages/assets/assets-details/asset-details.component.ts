import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { PropertyDto } from '../../../services/properties.service';
import { UserService } from '../../../services/user.service';
import { TenantsService, TenantDto } from '../../../services/tenants.service';

@Component({
  selector: 'app-asset-details',
  templateUrl: './asset-details.component.html',
  styleUrls: ['./asset-details.component.scss'],
  standalone: false,
})
export class AssetDetailsComponent implements OnInit {
  @Input() asset!: PropertyDto;
  tenants: TenantDto[] = [];

  constructor(private modalController: ModalController, private userService: UserService, private tenantsService: TenantsService) {}

  ngOnInit() {
    this.loadTenants();
  }

  loadTenants() {
    // Use property ID as the reference to find tenants
    const propertyRef = this.asset.id.toString();
    console.log('Loading tenants for property:', propertyRef);
    console.log('Full asset object:', this.asset);

    // Load all tenants and filter locally since TenantsService doesn't have property-specific endpoint
    this.tenantsService.list().subscribe({
      next: (allTenants: TenantDto[]) => {
        console.log('All tenants loaded:', allTenants);
        // Filter tenants that match this property using multiple possible references
        this.tenants = allTenants.filter((tenant: TenantDto) => 
          tenant.propertyRef === propertyRef || 
          tenant.propertyRef === this.asset.title ||
          tenant.propertyRef === `P${this.asset.id}` ||
          tenant.propertyRef.includes(propertyRef) ||
          tenant.propertyRef.includes(this.asset.title || '') ||
          (this.asset.title && tenant.propertyRef.includes(this.asset.title))
        );
        console.log('Filtered tenants for this property:', this.tenants);
      },
      error: (error: any) => {
        console.error('Failed to load tenants:', error);
        this.tenants = [];
      }
    });
  }

  close() {
    this.modalController.dismiss();
  }

  getPropertyIcon(propertyType: string): string {
    const iconMap: Record<string, string> = {
      'House': 'home-outline',
      'Apartment': 'business-outline',
      'Farm': 'leaf-outline',
      'Land': 'map-outline',
      'Warehouse': 'archive-outline',
      'Office': 'business-outline',
      'Shop': 'storefront-outline',
      'Other Property': 'cube-outline'
    };
    return iconMap[propertyType] || 'home-outline';
  }

  getDisplayPropertyType(): string {
    const assetCategory = (this.asset as any).assetCategory || (this.asset.meta as any)?.['propertyType'];
    const typeMap: Record<string, string> = {
      'HOUSE': 'House',
      'APARTMENT': 'Apartment',
      'FARM': 'Farm',
      'LAND': 'Land',
      'WAREHOUSE': 'Warehouse',
      'OFFICE': 'Office',
      'SHOP': 'Shop',
      'OTHER': 'Other Property'
    };
    return typeMap[assetCategory] || (this.asset.structureType === 'MULTI_UNIT' ? 'Apartment' : 'House');
  }

  formatCoordinates(lat?: number, lng?: number): string {
    if (lat && lng) {
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
    return 'Not specified';
  }

  getUnits(): string[] {
    return (this.asset.meta as any)?.['units'] || [];
  }

  getPropertyUsage(): string {
    return (this.asset.meta as any)?.['propertyUsage'] || 'RESIDENTIAL';
  }

  getRegion(): string {
    return (this.asset.meta as any)?.['region'] || 'Not specified';
  }

  getPostcode(): string {
    return (this.asset.meta as any)?.['postcode'] || 'Not specified';
  }

  getOwnerName(): string {
    const storedOwnerName = (this.asset.meta as any)?.['ownerName'];
    if (storedOwnerName && storedOwnerName.trim() !== '') {
      return storedOwnerName;
    }
    // Return current logged-in user's name if no owner is specified
    return this.userService.getCurrentUserName();
  }

  getOwnerPhone(): string {
    const storedOwnerPhone = (this.asset.meta as any)?.['ownerPhone'];
    if (storedOwnerPhone && storedOwnerPhone.trim() !== '') {
      return storedOwnerPhone;
    }
    // Return current logged-in user's phone if no phone is specified
    return this.userService.getCurrentUserPhone();
  }

  getWaterMeterNumber(): string {
    return (this.asset.meta as any)?.['waterMeterNumber'] || 'Not specified';
  }

  getElectricityMeterNumber(): string {
    return (this.asset.meta as any)?.['electricityMeterNumber'] || 'Not specified';
  }

  getCreatedDate(): string {
    return this.asset.createdAt ? new Date(this.asset.createdAt).toLocaleDateString() : 'Unknown';
  }

  getTenantsByUnit(unitNo: string): TenantDto[] {
    return this.tenants.filter(tenant => tenant.unitNo === unitNo);
  }

  formatLeaseDate(dateString: string): string {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleDateString();
  }

  getTenantStatusColor(status: string): string {
    switch (status?.toLowerCase()) {
      case 'active': return 'success';
      case 'expired': return 'danger';
      case 'pending': return 'warning';
      default: return 'medium';
    }
  }

  getAssetStatus(): string {
    return (this.asset.meta as any)?.['status'] || 'ACTIVE';
  }

  getAssetStatusColor(): string {
    const status = this.getAssetStatus();
    const colorMap: Record<string, string> = {
      'ACTIVE': 'success',
      'INACTIVE': 'medium',
      'MAINTENANCE': 'warning',
      'VACANT': 'tertiary'
    };
    return colorMap[status] || 'medium';
  }

  getAssetStatusText(): string {
    const status = this.getAssetStatus();
    const textMap: Record<string, string> = {
      'ACTIVE': 'Active',
      'INACTIVE': 'Inactive',
      'MAINTENANCE': 'Maintenance',
      'VACANT': 'Vacant'
    };
    return textMap[status] || 'Unknown';
  }
}
