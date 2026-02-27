import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { PropertiesService, CreatePropertyRequest, UnitInfo } from '../../../services/properties.service';

export type AssetStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'VACANT';

@Component({
  selector: 'app-add-asset',
  templateUrl: './add-asset.component.html',
  styleUrls: ['./add-asset.component.scss'],
  standalone: false
})
export class AddAssetComponent implements OnInit {
  @Input() asset: any = {
    title: '',
    propertyType: 'STANDALONE',
    assetCategory: 'HOUSE',
    propertyUsage: 'RESIDENTIAL',
    address: '',
    region: '',
    postcode: '',
    latitude: '',
    longitude: '',
    waterMeterNumber: '',
    electricityMeterNumber: '',
    notes: '',
    units: ['Unit 1'], // For multi-unit properties
    status: 'ACTIVE' as AssetStatus
  };

  locating = false;
  showUnits = false;
  isResidentialProperty = true;
  private _cachedLeasePreview: UnitInfo[] | null = null;

  constructor(private modalCtrl: ModalController, private propertiesService: PropertiesService) {}

  ngOnInit() {
    // Initialize showUnits based on the current property type (for edit mode)
    this.showUnits = this.asset.propertyType === 'MULTI_UNIT';
    
    // Initialize residential property flag
    this.isResidentialProperty = ['HOUSE', 'APARTMENT'].includes(this.asset.assetCategory);
    
    // Initialize status from existing asset meta if in edit mode
    if (this.isEditMode && this.asset.meta) {
      this.asset.status = (this.asset.meta.status || 'ACTIVE') as AssetStatus;
    }
    if (!this.asset.assetCategory) {
      this.asset.assetCategory = (this.asset.meta as any)?.['propertyType'] || 'HOUSE';
    }
    this.onAssetCategoryChange();
  }

  get isEditMode(): boolean {
    return !!this.asset.id;
  }

  close() {
    this.modalCtrl.dismiss(null);
  }

  onPropertyTypeChange() {
    const newShowUnits = this.asset.propertyType === 'MULTI_UNIT';
    
    // Only update if the value actually changed
    if (this.showUnits !== newShowUnits) {
      this.showUnits = newShowUnits;
      
      // Initialize units for multi-unit properties
      if (newShowUnits && this.asset.units.length === 0) {
        this.asset.units = ['Unit 1', 'Unit 2'];
      }
    }
    
    // Keep structure logic only; category logic handled separately.
    this.onAssetCategoryChange();
  }

  onAssetCategoryChange() {
    this.isResidentialProperty = ['HOUSE', 'APARTMENT'].includes(this.asset.assetCategory);

    // Smart usage defaults - only when usage is empty
    if (!this.asset.propertyUsage) {
      if (['LAND', 'FARM', 'SHOP', 'OFFICE', 'WAREHOUSE'].includes(this.asset.assetCategory)) {
        this.asset.propertyUsage = 'COMMERCIAL';
      } else {
        this.asset.propertyUsage = 'RESIDENTIAL';
      }
    }
  }

  addUnit() {
    const unitNumber = this.asset.units.length + 1;
    this.asset.units.push(`Unit ${unitNumber}`);
  }

  removeUnit(index: number) {
    if (this.asset.units.length > 1) {
      this.asset.units.splice(index, 1);
    }
  }

  trackByIndex(index: number): number {
    return index;
  }

  private clean(v: any) {
    return (v ?? '').toString().trim();
  }

  private buildRequest(): CreatePropertyRequest {
    const fallbackUsage: 'RESIDENTIAL' | 'COMMERCIAL' = ['LAND', 'FARM', 'SHOP', 'OFFICE', 'WAREHOUSE'].includes(this.asset.assetCategory)
      ? 'COMMERCIAL'
      : 'RESIDENTIAL';
    const resolvedUsage = this.mapUsageTypeForBackend(this.asset.propertyUsage) || fallbackUsage;

    const meta: Record<string, unknown> = {
      propertyType: this.asset.assetCategory,
      propertyUsage: resolvedUsage,
      region: this.clean(this.asset.region),
      postcode: this.clean(this.asset.postcode),
      waterMeterNumber: this.clean(this.asset.waterMeterNumber),
      electricityMeterNumber: this.clean(this.asset.electricityMeterNumber),
      status: this.asset.status
    };

    return {
      propertyName: this.clean(this.asset.title),
      propertyType: this.asset.propertyType,
      assetCategory: this.asset.assetCategory,
      usageType: resolvedUsage,
      region: this.clean(this.asset.region) || undefined,
      postcode: this.clean(this.asset.postcode) || undefined,
      waterMeterNo: this.clean(this.asset.waterMeterNumber) || undefined,
      electricityMeterNo: this.clean(this.asset.electricityMeterNumber) || undefined,
      unitNumbers: this.asset.propertyType === 'MULTI_UNIT' ? this.asset.units : undefined,
      title: this.clean(this.asset.title),
      category: this.asset.assetCategory || 'OTHER',
      structureType: this.asset.propertyType,
      unitCount: this.asset.propertyType === 'MULTI_UNIT' ? this.asset.units.length : 1,
      units: this.asset.propertyType === 'MULTI_UNIT' ? this.asset.units : undefined,
      address: this.clean(this.asset.address) || undefined,
      latitude: this.clean(this.asset.latitude) ? Number(this.asset.latitude) : undefined,
      longitude: this.clean(this.asset.longitude) ? Number(this.asset.longitude) : undefined,
      notes: this.clean(this.asset.notes) || undefined,
      meta: Object.keys(meta).some(key => meta[key] !== undefined && meta[key] !== '') ? meta : undefined
    };
  }

  private mapUsageTypeForBackend(value: string): 'RESIDENTIAL' | 'COMMERCIAL' | 'MIXED' | undefined {
    const normalized = (value || '').trim().toUpperCase();
    if (normalized === 'RESIDENTIAL' || normalized === 'COMMERCIAL' || normalized === 'MIXED') {
      return normalized as 'RESIDENTIAL' | 'COMMERCIAL' | 'MIXED';
    }
    if (normalized === 'AGRICULTURAL' || normalized === 'INDUSTRIAL') {
      return 'COMMERCIAL';
    }
    return undefined;
  }

  getLeasePreview(): UnitInfo[] {
    if (!this.asset.title) return [];
    
    // Cache the result to avoid recomputation
    if (!this._cachedLeasePreview) {
      this._cachedLeasePreview = this.propertiesService.generateLeaseNames(
        this.asset.title,
        this.asset.propertyType,
        this.asset.units,
        this.asset.assetCategory
      );
    }
    return this._cachedLeasePreview;
  }

  addAsset() {
    const body = this.buildRequest();
    
    // Generate lease names for preview and cache the result
    this._cachedLeasePreview = this.propertiesService.generateLeaseNames(
      this.asset.title,
      this.asset.propertyType,
      this.asset.units,
      this.asset.assetCategory
    );
    console.log('Generated lease names:', this._cachedLeasePreview);
    
    this.modalCtrl.dismiss(body);
  }

  async useCurrentLocation() {
    if (!('geolocation' in navigator)) return;

    this.locating = true;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        this.asset.latitude = latitude.toString();
        this.asset.longitude = longitude.toString();
        this.locating = false;
      },
      () => { this.locating = false; },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }
}
