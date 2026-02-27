import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ContractsPageRoutingModule } from './contracts-routing.module';

import { ContractsPage } from './contracts.page';
import { LeaseChecklistModalComponent } from './lease-checklist-modal/lease-checklist-modal.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ContractsPageRoutingModule
  ],
  declarations: [ContractsPage, LeaseChecklistModalComponent]
})
export class ContractsPageModule {}
