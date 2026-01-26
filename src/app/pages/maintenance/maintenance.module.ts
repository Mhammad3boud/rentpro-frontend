import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { MaintenancePageRoutingModule } from './maintenance-routing.module';
import { MaintenancePage } from './maintenance.page';
import { AddMaintenanceTaskComponent } from './add-maintenance-task/add-maintenance-task.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    MaintenancePageRoutingModule
  ],
  declarations: [MaintenancePage, AddMaintenanceTaskComponent]
})
export class MaintenancePageModule {}
