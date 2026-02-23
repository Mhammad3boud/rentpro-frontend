import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { TenantsPageRoutingModule } from './tenants-routing.module';
import { TenantsPage } from './tenants.page';
import { AddTenantModalComponent } from './add-tenant-modal/add-tenant-modal.component';
import { AssignTenantModalComponent } from './assign-tenant-modal/assign-tenant-modal.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TenantsPageRoutingModule
  ],
  declarations: [
    TenantsPage,
    AddTenantModalComponent,
    AssignTenantModalComponent
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class TenantsPageModule {}
