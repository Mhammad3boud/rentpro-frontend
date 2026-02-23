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
    this.isResidentialProperty = ['STANDALONE', 'MULTI_UNIT'].includes(this.asset.propertyType);
    
    // Initialize status from existing asset meta if in edit mode
    if (this.isEditMode && this.asset.meta) {
      this.asset.status = (this.asset.meta.status || 'ACTIVE') as AssetStatus;
    }
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
    
    // Update residential property flag
    this.isResidentialProperty = ['STANDALONE', 'MULTI_UNIT'].includes(this.asset.propertyType);
    
    // Smart property usage defaults - only update if not already set
    if (!this.asset.propertyUsage) {
      if (this.asset.propertyType === 'FARM') {
        this.asset.propertyUsage = 'AGRICULTURAL';
      } else if (['WAREHOUSE', 'INDUSTRIAL'].includes(this.asset.propertyType)) {
        this.asset.propertyUsage = 'INDUSTRIAL';
      } else if (['OFFICE', 'COMMERCIAL'].includes(this.asset.propertyType)) {
        this.asset.propertyUsage = 'COMMERCIAL';
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

  private clean(v: any) {
    return (v ?? '').toString().trim();
  }

  private buildRequest(): CreatePropertyRequest {
    // Map property usage to backend category
    const categoryMap: Record<string, string> = {
      'RESIDENTIAL': 'RENTAL',
      'COMMERCIAL': 'OFFICE',
      'MIXED': 'RENTAL',
      'AGRICULTURAL': 'FARM',
      'INDUSTRIAL': 'WAREHOUSE'
    };

    const meta: Record<string, unknown> = {
      propertyType: this.asset.propertyType,
      propertyUsage: this.asset.propertyUsage,
      region: this.clean(this.asset.region),
      postcode: this.clean(this.asset.postcode),
      waterMeterNumber: this.clean(this.asset.waterMeterNumber),
      electricityMeterNumber: this.clean(this.asset.electricityMeterNumber),
      status: this.asset.status
    };

    return {
      title: this.clean(this.asset.title),
      category: categoryMap[this.asset.propertyUsage] || 'RENTAL',
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

  getLeasePreview(): UnitInfo[] {
    if (!this.asset.title) return [];
    
    // Cache the result to avoid recomputation
    if (!this._cachedLeasePreview) {
      this._cachedLeasePreview = this.propertiesService.generateLeaseNames(
        this.asset.title,
        this.asset.propertyType,
        this.asset.units
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
      this.asset.units
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
