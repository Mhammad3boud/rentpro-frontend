import { Component, OnInit } from '@angular/core';
import { ModalController, AlertController, ToastController } from '@ionic/angular';
import { Location } from '@angular/common';
import { Router } from '@angular/router';

import { AddAssetComponent } from './add-asset/add-asset.component';
import { PropertiesService, PropertyDto } from '../../services/properties.service';

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
  private propertyById = new Map<number, PropertyDto>();

  constructor(
    private location: Location,
    private router: Router,
    private modalController: ModalController,
    private alertController: AlertController,
    private toastController: ToastController,
    private propertiesService: PropertiesService
  ) { }

  ngOnInit() {
    this.loadAssets();
  }

  // ---------------- backend loading ----------------
  private loadAssets() {
    this.propertiesService.list().subscribe({
      next: (rows) => {
        this.propertyById = new Map(rows.map(r => [r.id, r]));
        this.assets = rows.map((p) => this.mapPropertyToAsset(p));
        this.filterAssets();
      },
      error: () => this.presentToast('Failed to load properties', 'danger'),
    });
  }

  // ---------------- mapping: backend dto -> card ----------------
private mapPropertyToAsset(p: PropertyDto): Asset {
  const m = (p.meta ?? {}) as Record<string, any>;

  const blockNo = (m['blockNo'] ?? '').toString().trim();
  const plotNo = (m['plotNo'] ?? '').toString().trim();

  const block = blockNo && plotNo
    ? `${blockNo}/${plotNo}`
    : blockNo || plotNo || '';

  return {
    id: String(p.id),

    name: p.title || block || `Property #${p.id}`,
    type: (m['assetType'] ?? p.category ?? 'Property').toString(),
    location: p.address ?? '-',
    owner: (m['ownerName'] ?? '-').toString(),
    phone: (m['ownerPhone'] ?? '-').toString(),
    usage: (m['usage'] ?? '-').toString(),
    block,
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

  // ---------------- edit ----------------
  async editAsset(asset: Asset) {
    const dto = this.propertyById.get(Number(asset.id));
    if (!dto) {
      this.presentToast('Property not found. Pull to refresh and try again.', 'danger');
      return;
    }

    const m = (dto.meta ?? {}) as Record<string, any>;

    const componentProps = {
      asset: {
        assetType: String(m['assetType'] ?? 'Property'),

        region: String(m['region'] ?? ''),
        district: String(m['district'] ?? ''),
        ward: String(m['ward'] ?? ''),

        blockNo: String(m['blockNo'] ?? ''),
        plotNo: String(m['plotNo'] ?? ''),
        houseNo: String(m['houseNo'] ?? ''),
        street: String(m['street'] ?? ''),
        postcode: String(m['postcode'] ?? ''),
        areaName: String(m['areaName'] ?? ''),

        ownerName: String(m['ownerName'] ?? ''),
        ownerPhone: String(m['ownerPhone'] ?? ''),
        ownerEmail: String(m['ownerEmail'] ?? ''),

        usage: String(m['usage'] ?? 'Rented'),
        waterMeter: String(m['waterMeter'] ?? ''),
        electricityMeter: String(m['electricityMeter'] ?? ''),

        gpsLatitude: String(m['gpsLatitude'] ?? dto.latitude ?? ''),
        gpsLongitude: String(m['gpsLongitude'] ?? dto.longitude ?? ''),

        notes: String(dto.notes ?? ''),
        structureType: String(dto.structureType ?? 'STANDALONE'),
        unitCount: dto.unitCount ?? 1,

        address: String(dto.address ?? ''),
      },
    } as any;

    const modal = await this.modalController.create({
      component: AddAssetComponent,
      componentProps,
      cssClass: 'custom-asset-modal',
      breakpoints: [0, 0.5, 0.9, 1],
      initialBreakpoint: 0.9,
    });

    await modal.present();
    const { data } = await modal.onDidDismiss();
    if (!data) return;

    this.propertiesService.update(Number(asset.id), data).subscribe({
      next: () => {
        this.presentToast('Updated', 'success');
        this.loadAssets(); // ✅ refresh cards from backend
      },
      error: (err) => {
        console.log(err);
        this.presentToast(err?.error?.message ?? 'Update failed', 'danger');
      },
    });
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
    const id = Number(asset.id);
    this.propertiesService.remove(id).subscribe({
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
      cssClass: 'custom-asset-modal',
      breakpoints: [0, 0.5, 0.9, 1],
      initialBreakpoint: 0.9,
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

  // ---------------- filtering ----------------
  filterAssets() {
    const term = this.searchTerm.toLowerCase();

    this.filteredAssets = this.assets.filter((asset) => {
      const matchesSearch =
        asset.owner.toLowerCase().includes(term) ||
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
        this.propertyById = new Map(rows.map(r => [r.id, r]));
        this.assets = rows.map((p) => this.mapPropertyToAsset(p));
        this.filterAssets();
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
}
