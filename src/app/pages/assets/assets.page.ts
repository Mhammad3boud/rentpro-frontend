import { Component, OnInit } from '@angular/core';
import { ModalController, AlertController, ToastController } from '@ionic/angular';
import { AddAssetComponent } from './add-asset/add-asset.component';
import { Location } from '@angular/common';
import { Router } from '@angular/router';

interface Asset {
  type: string;
  id: string;
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
  assets: Asset[] = [
    { 
      type: 'Property',
      id: 'P-456',
      location: 'Business District, Downtown',
      owner: 'John Watson',
      phone: '+1-555-0123',
      usage: 'Rented',
      block: 'A-12/P-456',
    },
    {
      type: 'Farm',
      id: 'P-789',
      location: 'Agricultural Zone, Countryside',
      owner: 'Sarah Johnson',
      phone: '+1-555-0456',
      usage: 'Personal Use',
      block: 'F-08/P-789',
    },
    {
      type: 'Farm',
      id: 'P-811',
      location: 'Agricultural Zone, Countryside',
      owner: 'Mohammed Aboud',
      phone: '+1-555-0456',
      usage: 'Business',
      block: 'F-10/P-811',
    },
  ];

  filteredAssets: Asset[] = [];
  searchTerm = '';
  selectedType = 'all';

  constructor(
    private modalCtrl: ModalController,
    private location: Location,
    private router: Router,
    private modalController: ModalController,
    private alertController: AlertController,
    private toastController: ToastController,
  ) {}

  ngOnInit() {
    this.filteredAssets = [...this.assets];
  }

  async editAsset(asset: Asset) {
    const componentProps = {
      asset: {
        assetType: asset.type,
        ownerName: asset.owner,
        ownerPhone: asset.phone,
        usage: asset.usage,
        // naive parsing for block/plot like "A-12/P-456"
        ...this.parseBlockToForm(asset.block),
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
    if (data) {
      const updated: Asset = {
        ...asset,
        type: data.assetType || asset.type,
        location: this.composeLocation(data) || asset.location,
        owner: data.ownerName ?? asset.owner,
        phone: data.ownerPhone ?? asset.phone,
        usage: data.usage ?? asset.usage,
        block: this.composeBlock(data) || asset.block,
      };
      this.assets = this.assets.map(a => (a.id === asset.id ? updated : a));
      this.filterAssets();
      this.presentToast('Asset updated', 'success');
    }
  }

  async confirmDelete(asset: Asset) {
    const alert = await this.alertController.create({
      header: 'Delete Asset',
      message: `Are you sure you want to delete asset ${asset.id}?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Delete', role: 'destructive', handler: () => this.deleteAsset(asset) },
      ],
    });
    await alert.present();
  }

  private deleteAsset(asset: Asset) {
    this.assets = this.assets.filter(a => a.id !== asset.id);
    this.filterAssets();
    this.presentToast('Asset deleted', 'danger');
  }

  private parseBlockToForm(block: string): { blockNo?: string; plotNo?: string } {
    if (!block) return {};
    const parts = block.split('/');
    if (parts.length === 2) {
      return { blockNo: parts[0], plotNo: parts[1] };
    }
    return { blockNo: block };
  }

  filterAssets() {
    const term = this.searchTerm.toLowerCase();
    this.filteredAssets = this.assets.filter((asset) => {
      const matchesSearch =
        asset.owner.toLowerCase().includes(term) ||
        asset.location.toLowerCase().includes(term) ||
        asset.id.toLowerCase().includes(term);

      const matchesType =
        this.selectedType === 'all' || asset.type === this.selectedType;

      return matchesSearch && matchesType;
    });
  }

  async openAddAssetModal() {
    const modal = await this.modalController.create({
      component: AddAssetComponent,
      cssClass: 'custom-asset-modal',
      breakpoints: [0, 0.5, 0.9, 1],
      initialBreakpoint: 0.9
    });
    await modal.present();

    const { data } = await modal.onDidDismiss();
    if (data) {
      const newAsset: Asset = {
        type: data.assetType || 'Property',
        id: this.generateAssetId(data),
        location: this.composeLocation(data),
        owner: data.ownerName || '',
        phone: data.ownerPhone || '',
        usage: data.usage || 'Rented',
        block: this.composeBlock(data),
      };
      this.assets = [newAsset, ...this.assets];
      this.filterAssets();
    }
  }

  doRefresh(event: any) {
    this.searchTerm = '';
    this.selectedType = 'all';
    this.filteredAssets = [...this.assets];
    setTimeout(() => {
      this.filterAssets();
      event.target.complete();
    }, 400);
  }

  goBack() {
    if (window.history.length > 1) {
      this.location.back();
    } else {
      this.router.navigate(['/dashboard']);
    }
  }

  private generateAssetId(data: any): string {
    const prefix = (data.assetType || 'Property').startsWith('F') ? 'F' : 'P';
    const plot = (data.plotNo || '').toString().trim();
    if (plot) {
      return `${prefix}-${plot}`;
    }
    const tail = Date.now().toString().slice(-3);
    return `${prefix}-${tail}`;
  }

  private composeLocation(data: any): string {
    const parts = [data.areaName, data.street, data.district, data.region]
      .filter((x: string) => !!x && `${x}`.trim().length)
      .map((x: string) => `${x}`.trim());
    return parts.join(', ');
  }

  private composeBlock(data: any): string {
    const block = (data.blockNo || '').toString().trim();
    const plot = (data.plotNo || '').toString().trim();
    if (block && plot) return `${block}/${plot}`;
    return block || plot || '';
  }

  private async presentToast(message: string, color: 'success' | 'danger' | 'primary' | 'medium') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: 'bottom',
    });
    await toast.present();
  }
}
