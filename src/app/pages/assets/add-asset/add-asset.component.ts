import { Component, Input } from '@angular/core';
import { ModalController } from '@ionic/angular';

export interface CreatePropertyRequest {
  title: string;
  category: 'RENTAL' | 'FARM' | 'LAND' | 'WAREHOUSE' | 'OFFICE' | 'OTHER';
  notes?: string | null;
  structureType: 'STANDALONE' | 'MULTI_UNIT';
  unitCount: number;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  meta?: Record<string, any>;
}

@Component({
  selector: 'app-add-asset',
  templateUrl: './add-asset.component.html',
  styleUrls: ['./add-asset.component.scss'],
  standalone: false
})
export class AddAssetComponent {
  @Input() asset: any = {
    assetType: 'Property',
    region: '',
    district: '',
    ward: '',
    blockNo: '',
    plotNo: '',
    houseNo: '',
    street: '',
    postcode: '',
    areaName: '',
    ownerName: '',
    ownerPhone: '',
    ownerEmail: '',
    usage: 'Rented',
    waterMeter: '',
    electricityMeter: '',
    gpsLatitude: '',
    gpsLongitude: '',
    notes: '',
    unitCount: 1,          // add this in your form later if you want multi-unit
    structureType: 'STANDALONE' // add this later if you want a dropdown
  };

  locating = false;

  constructor(private modalCtrl: ModalController) {}

  close() {
    this.modalCtrl.dismiss(null);
  }

  private clean(v: any) {
    return (v ?? '').toString().trim();
  }

  private buildAddress(): string {
    const parts = [
      this.clean(this.asset.houseNo),
      this.clean(this.asset.street),
      this.clean(this.asset.areaName),
      this.clean(this.asset.ward),
      this.clean(this.asset.district),
      this.clean(this.asset.region),
      this.clean(this.asset.postcode),
    ].filter(Boolean);
    return parts.join(', ');
  }

  private mapCategory(assetType: string): CreatePropertyRequest['category'] {
    const t = this.clean(assetType).toUpperCase();
    if (t === 'FARM') return 'FARM';
    // your backend default is RENTAL, so Property -> RENTAL
    return 'RENTAL';
  }

  private mapStructureType(raw: any): CreatePropertyRequest['structureType'] {
    const s = this.clean(raw).toUpperCase();
    return s === 'MULTI_UNIT' ? 'MULTI_UNIT' : 'STANDALONE';
  }

  private buildRequest(): CreatePropertyRequest {
    const latRaw = this.clean(this.asset.gpsLatitude);
    const lngRaw = this.clean(this.asset.gpsLongitude);

    const structureType = this.mapStructureType(this.asset.structureType);
    const unitCountNum = Number(this.asset.unitCount ?? 1);

    // title must be NOT BLANK in backend
    const title = this.clean(this.asset.areaName)
      || `${this.clean(this.asset.blockNo)} ${this.clean(this.asset.plotNo)}`.trim()
      || 'Untitled Property';

    return {
      title,
      category: this.mapCategory(this.asset.assetType),
      notes: this.clean(this.asset.notes) || null,
      structureType,
      unitCount: structureType === 'STANDALONE' ? 1 : Math.max(1, unitCountNum),
      address: this.buildAddress() || null,
      latitude: latRaw ? Number(latRaw) : null,
      longitude: lngRaw ? Number(lngRaw) : null,

      // EVERYTHING from your big form goes into meta (jsonb)
      meta: {
        // raw form fields (keep exactly as you want)
        assetType: this.clean(this.asset.assetType),
        region: this.clean(this.asset.region),
        district: this.clean(this.asset.district),
        ward: this.clean(this.asset.ward),
        blockNo: this.clean(this.asset.blockNo),
        plotNo: this.clean(this.asset.plotNo),
        houseNo: this.clean(this.asset.houseNo),
        street: this.clean(this.asset.street),
        postcode: this.clean(this.asset.postcode),
        areaName: this.clean(this.asset.areaName),

        ownerName: this.clean(this.asset.ownerName),
        ownerPhone: this.clean(this.asset.ownerPhone),
        ownerEmail: this.clean(this.asset.ownerEmail),

        usage: this.clean(this.asset.usage),
        waterMeter: this.clean(this.asset.waterMeter),
        electricityMeter: this.clean(this.asset.electricityMeter),

        gpsLatitude: this.clean(this.asset.gpsLatitude),
        gpsLongitude: this.clean(this.asset.gpsLongitude),
      }
    };
  }

  // keep your HTML button (click)="addAsset()"
  addAsset() {
    const body = this.buildRequest();
    this.modalCtrl.dismiss(body);
  }

  async useCurrentLocation() {
    if (!('geolocation' in navigator)) return;

    this.locating = true;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        this.asset.gpsLatitude = latitude.toString();
        this.asset.gpsLongitude = longitude.toString();
        this.locating = false;
      },
      () => { this.locating = false; },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }
}
