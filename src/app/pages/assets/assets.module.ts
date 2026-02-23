import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { AssetsPageRoutingModule } from './assets-routing.module';
import { AssetsPage } from './assets.page';
import { AddAssetComponent } from './add-asset/add-asset.component';
import { AssetDetailsComponent } from './asset-details/asset-details.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AssetsPageRoutingModule
  ],
  declarations: [
    AssetsPage,
    AddAssetComponent,
    AssetDetailsComponent
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AssetsPageModule {}
