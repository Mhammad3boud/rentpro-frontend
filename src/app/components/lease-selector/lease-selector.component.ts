import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

import {
  IonLabel,
  IonSelect,
  IonSelectOption
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-lease-selector',
  standalone: true,
  imports: [CommonModule, IonLabel, IonSelect, IonSelectOption],
  templateUrl: './lease-selector.component.html',
  styleUrls: ['./lease-selector.component.scss']
})
export class LeaseSelectorComponent {
  @Input() leases: any[] = [];
  @Input() selectedLeaseId: string | null = null;
  @Output() leaseSelected = new EventEmitter<string>();

  selectLease(leaseId: string) {
    this.leaseSelected.emit(leaseId);
  }
}