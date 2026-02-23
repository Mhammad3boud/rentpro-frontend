import { Component, OnInit } from '@angular/core';

import { ModalController, AlertController, ToastController } from '@ionic/angular';

import { Location } from '@angular/common';

import { Router } from '@angular/router';



import { AddAssetComponent } from './add-asset/add-asset.component';

import { AssetDetailsComponent } from './asset-details/asset-details.component';

import { PropertiesService, PropertyDto, PropertyWithUnits } from '../../services/properties.service';

import { UserService } from '../../services/user.service';



interface Asset {

  type: string;

  id: string;

  name: string;

  location: string;

  owner: string;

  phone: string;

  usage: string;

  block: string;

}



@Component({

  selector: 'app-assets',

  templateUrl: './assets.page.html',

  styleUrls: ['./assets.page.scss'],

  standalone: false,

})

export class AssetsPage implements OnInit {



  assets: Asset[] = [];

  filteredAssets: Asset[] = [];

  searchTerm = '';

  selectedType = 'all';



  // ✅ Keep latest backend rows so edit uses REAL data (meta, notes, etc.)

  private propertyById: Map<string, PropertyDto> = new Map();



  constructor(

    private location: Location,

    private router: Router,

    private modalController: ModalController,

    private alertController: AlertController,

    private toastController: ToastController,

    private propertiesService: PropertiesService,

    private userService: UserService

  ) { }



  ngOnInit() {

    this.loadAssets();

  }



  // ---------------- backend loading ----------------

  private loadAssets() {

    this.propertiesService.list().subscribe({

      next: (rows) => {

        // Convert PropertyWithUnits to PropertyDto with both field name formats
        const dtos = rows.map(r => this.mapToPropertyDto(r));
        // Use string keys for consistent ID mapping
        this.propertyById = new Map(dtos.map(r => [String(r.id), r]));

        this.assets = dtos.map((p) => this.mapPropertyToAsset(p));

        this.filterAssets();

        console.log('Loaded properties:', rows.length);
        console.log('PropertyById map size:', this.propertyById.size);

      },

      error: () => this.presentToast('Failed to load properties', 'danger'),

    });

  }

  
  // Map PropertyWithUnits (new format) to PropertyDto (backward compat)
  private mapToPropertyDto(p: PropertyWithUnits): PropertyDto {
    return {
      // New fields
      propertyId: p.propertyId,
      propertyName: p.propertyName,
      propertyType: p.propertyType,
      usageType: p.usageType,
      region: p.region,
      postcode: p.postcode,
      waterMeterNo: p.waterMeterNo,
      electricityMeterNo: p.electricityMeterNo,
      units: p.units,
      unitCount: p.unitCount,
      
      // Legacy field mappings
      id: p.propertyId,
      title: p.propertyName,
      category: p.usageType || 'RESIDENTIAL',
      address: p.address,
      latitude: p.latitude,
      longitude: p.longitude,
      structureType: p.propertyType as 'STANDALONE' | 'MULTI_UNIT',
      notes: undefined,
      meta: {
        propertyType: p.propertyType,
        propertyUsage: p.usageType,
        region: p.region,
        postcode: p.postcode,
        waterMeterNumber: p.waterMeterNo,
        electricityMeterNumber: p.electricityMeterNo,
        units: (p.units || []).map(u => u.unitNumber)
      },
      createdAt: p.createdAt
    };
  }


  // ---------------- mapping: backend dto -> card ----------------

private mapPropertyToAsset(p: PropertyDto): Asset {

  const m = (p.meta ?? {}) as Record<string, any>;



  // Determine property type display name

  let propertyType = 'Property';

  if (p.structureType === 'MULTI_UNIT') {

    propertyType = 'Multi-Unit Property';

  } else if ((p.meta as any)?.['propertyType']) {

    const typeMap: Record<string, string> = {

      'FARM': 'Farm',

      'LAND': 'Land',

      'WAREHOUSE': 'Warehouse',

      'OFFICE': 'Office Building',

      'COMMERCIAL': 'Commercial Property',

      'INDUSTRIAL': 'Industrial Property',

      'OTHER': 'Other Property'

    };

    propertyType = typeMap[(p.meta as any)['propertyType']] || 'Property';

  }



  return {

    id: String(p.id),

    name: p.title || `Property #${p.id}`,

    type: propertyType,

    location: p.address || '-',

    owner: (m['ownerName'] ?? this.userService.getCurrentUserName()).toString(),

    phone: (m['ownerPhone'] ?? this.userService.getCurrentUserPhone()).toString(),

    usage: m['propertyUsage'] || 'RESIDENTIAL',

    block: `${m['region'] || ''} ${m['postcode'] || ''}`.trim() || '-',

  };

}

  // optional helper (if you still use it anywhere)

  private composeBlockFromDto(p: PropertyDto): string {

    const m = (p.meta ?? {}) as Record<string, any>;

    const block = String(m['blockNo'] ?? '').trim();

    const plot = String(m['plotNo'] ?? '').trim();

    if (block && plot) return `${block}/${plot}`;

    return block || plot || '';

  }



  // ---------------- view details ----------------

  async viewAsset(asset: Asset) {

    try {

      const dto = this.propertyById.get(asset.id);

      if (!dto) {

        this.presentToast('Property not found. Pull to refresh and try again.', 'danger');

        return;

      }

      console.log('Opening asset details for:', dto);



      const modal = await this.modalController.create({

        component: AssetDetailsComponent,

        componentProps: {

          asset: dto

        },

        cssClass: 'custom-asset-modal'

      });



      await modal.present();

    } catch (error) {

      console.error('Error opening asset details:', error);

      this.presentToast('Failed to open asset details', 'danger');

    }

  }



  // ---------------- edit ----------------

  async editAsset(asset: Asset) {

    try {

      const dto = this.propertyById.get(asset.id);

      if (!dto) {

        this.presentToast('Property not found. Pull to refresh and try again.', 'danger');

        return;

      }

      console.log('Opening asset edit for:', dto);



      const m = (dto.meta ?? {}) as Record<string, any>;



      const componentProps = {

        asset: {

          id: dto.id,

          title: dto.title || '',

          propertyType: dto.structureType || 'STANDALONE',

          propertyUsage: (dto.meta as any)?.['propertyUsage'] || 'RESIDENTIAL',

          address: dto.address || '',

          region: (dto.meta as any)?.['region'] || '',

          postcode: (dto.meta as any)?.['postcode'] || '',

          latitude: dto.latitude?.toString() || '',

          longitude: dto.longitude?.toString() || '',

          waterMeterNumber: (dto.meta as any)?.['waterMeterNumber'] || '',

          electricityMeterNumber: (dto.meta as any)?.['electricityMeterNumber'] || '',

          notes: dto.notes || '',

          units: (dto.meta as any)?.['units'] || ['Unit 1']

        },

      } as any;



      const modal = await this.modalController.create({

        component: AddAssetComponent,

        componentProps,

        cssClass: 'custom-asset-modal'

      });



      await modal.present();

      const { data } = await modal.onDidDismiss();

      if (!data) return;



      this.propertiesService.update(asset.id, data).subscribe({

        next: () => {

          this.presentToast('Updated', 'success');

          this.loadAssets(); // ✅ refresh cards from backend

        },

        error: (err) => {

          console.log(err);

          this.presentToast(err?.error?.message ?? 'Update failed', 'danger');

        },

      });

    } catch (error) {

      console.error('Error opening asset edit:', error);

      this.presentToast('Failed to open asset edit', 'danger');

    }

  }



  // ---------------- delete ----------------

  async confirmDelete(asset: Asset) {

    const alert = await this.alertController.create({

      header: 'Delete Property',

      message: `Are you sure you want to delete property ${asset.id}?`,

      buttons: [

        { text: 'Cancel', role: 'cancel' },

        { text: 'Delete', role: 'destructive', handler: () => this.deleteAsset(asset) },

      ],

    });

    await alert.present();

  }



  private deleteAsset(asset: Asset) {

    this.propertiesService.remove(asset.id).subscribe({

      next: () => {

        this.presentToast('Property deleted', 'danger');

        this.loadAssets();

      },

      error: () => this.presentToast('Delete failed', 'danger'),

    });

  }



  // ---------------- create ----------------

  async openAddAssetModal() {

    const modal = await this.modalController.create({

      component: AddAssetComponent,

      cssClass: 'custom-asset-modal'

    });



    await modal.present();

    const { data } = await modal.onDidDismiss();

    if (!data) return;



    this.propertiesService.create(data).subscribe({

      next: () => {

        this.presentToast('Property created', 'success');

        this.loadAssets();

      },

      error: () => this.presentToast('Create failed', 'danger'),

    });

  }



  filterAssets() {

    const term = this.searchTerm.toLowerCase();



    this.filteredAssets = this.assets.filter((asset) => {

      const matchesSearch =

        asset.name.toLowerCase().includes(term) ||

        asset.location.toLowerCase().includes(term) ||

        asset.id.toLowerCase().includes(term);



      const matchesType = this.selectedType === 'all' || asset.type === this.selectedType;

      return matchesSearch && matchesType;

    });

  }



  doRefresh(event: any) {

    this.searchTerm = '';

    this.selectedType = 'all';



    this.propertiesService.list().subscribe({

      next: (rows) => {

        // Convert PropertyWithUnits to PropertyDto with both field name formats
        const dtos = rows.map(r => this.mapToPropertyDto(r));
        // Use string keys for consistent ID mapping
        this.propertyById = new Map(dtos.map(r => [String(r.id), r]));

        this.assets = dtos.map((p) => this.mapPropertyToAsset(p));

        this.filterAssets();

        console.log('Refreshed properties:', rows.length);

        event.target.complete();

      },

      error: () => {

        this.presentToast('Refresh failed', 'danger');

        event.target.complete();

      },

    });

  }



  // ---------------- navigation ----------------

  goBack() {

    if (window.history.length > 1) this.location.back();

    else this.router.navigate(['/dashboard']);

  }



  // ---------------- ui helpers ----------------

  private parseBlockToForm(block: string): { blockNo?: string; plotNo?: string } {

    if (!block) return {};

    const parts = block.split('/');

    if (parts.length === 2) return { blockNo: parts[0], plotNo: parts[1] };

    return { blockNo: block };

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



  getPropertyIcon(propertyType: string): string {

    const iconMap: Record<string, string> = {

      'Standalone Property': 'home-outline',

      'Multi-Unit Property': 'business-outline',

      'Farm': 'leaf-outline',

      'Land': 'map-outline',

      'Warehouse': 'archive-outline',

      'Office Building': 'business-outline',

      'Commercial Property': 'storefront-outline',

      'Industrial Property': 'factory-outline',

      'Other Property': 'cube-outline'

    };

    return iconMap[propertyType] || 'home-outline';

  }

}

