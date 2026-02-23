import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-lease-selector',
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
