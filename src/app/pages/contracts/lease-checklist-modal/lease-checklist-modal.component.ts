import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { LeaseChecklistItem } from '../../../models';

type ChecklistMode = 'check-in' | 'check-out';

@Component({
  selector: 'app-lease-checklist-modal',
  templateUrl: './lease-checklist-modal.component.html',
  styleUrls: ['./lease-checklist-modal.component.scss'],
  standalone: false,
})
export class LeaseChecklistModalComponent implements OnInit {
  @Input() mode: ChecklistMode = 'check-in';
  @Input() initialChecklist: LeaseChecklistItem[] = [];

  readonly today = new Date().toISOString().slice(0, 10);
  actionDate = this.today;
  reason = '';
  notes = '';
  checklist: LeaseChecklistItem[] = [];

  readonly conditionOptions = [
    { label: 'Good', value: 'GOOD' },
    { label: 'Needs Attention', value: 'NEEDS_ATTENTION' },
    { label: 'Repair Required', value: 'REPAIR_REQUIRED' },
    { label: 'Needs Cleaning', value: 'NEEDS_CLEANING' },
    { label: 'Other', value: 'OTHER' },
  ];

  constructor(private modalCtrl: ModalController) {}

  ngOnInit(): void {
    this.checklist = (this.initialChecklist || []).map((x) => ({ ...x }));
    if (!this.checklist.length) {
      this.addItem();
    }
  }

  get title(): string {
    return this.mode === 'check-in' ? 'Check-In Checklist' : 'Check-Out Checklist';
  }

  addItem(): void {
    this.checklist.push({
      item: '',
      condition: 'GOOD',
      checked: false,
      notes: '',
    });
  }

  removeItem(index: number): void {
    this.checklist.splice(index, 1);
    if (!this.checklist.length) {
      this.addItem();
    }
  }

  dismiss(): void {
    this.modalCtrl.dismiss();
  }

  save(): void {
    if (this.mode === 'check-out' && !this.reason.trim()) {
      return;
    }

    const cleaned = this.checklist
      .map((x) => ({
        item: (x.item || '').trim(),
        condition: x.condition || 'GOOD',
        checked: !!x.checked,
        notes: (x.notes || '').trim() || undefined,
      }))
      .filter((x) => x.item.length > 0);

    this.modalCtrl.dismiss({
      actionDate: this.actionDate || this.today,
      reason: this.reason.trim() || undefined,
      notes: this.notes.trim() || undefined,
      checklist: cleaned,
    });
  }
}
