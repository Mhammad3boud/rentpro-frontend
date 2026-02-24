import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { RentTrackingPageRoutingModule } from './rent-tracking-routing.module';

import { RentTrackingPage } from './rent-tracking.page';
import { RecordPaymentModalComponent } from './record-payment-modal/record-payment-modal.component';
import { RentSimpleService } from '../../../api/rent-simple.service';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RentTrackingPageRoutingModule,
    RecordPaymentModalComponent
  ],
  declarations: [RentTrackingPage],
  providers: [RentSimpleService]
})
export class RentTrackingPageModule {}
