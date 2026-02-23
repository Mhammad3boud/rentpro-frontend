import { Component, Input, OnInit } from '@angular/core';
import { IonicModule, ModalController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LeaseService } from '../../../services/lease.service';
import { ContractTemplateService, ContractTemplate } from '../../../services/contract-template.service';
import { Lease } from '../../../models';

interface LeaseOption {
  leaseId: string;
  displayName: string;
  tenantName: string;
  propertyName: string;
  unitNumber?: string;
  monthlyRent: number;
  startDate: string;
  endDate: string;
}

@Component({
  selector: 'app-generate-contract-modal',
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
  templateUrl: './generate-contract-modal.component.html',
  styleUrls: ['./generate-contract-modal.component.scss'],
})
export class GenerateContractModalComponent implements OnInit {
  @Input() preset?: Partial<{
    tenantName: string;
    propertyNumber: string;
    unitNumber: string;
    propertyAddress: string;
    leaseStartDate: string;
    leaseEndDate: string;
    monthlyRent: number;
    securityDeposit: number;
    ownerName: string;
    ownerAddress: string;
    specialTerms: string;
  }>;
  @Input() isEditMode = false;

  // Lease selection
  leases: LeaseOption[] = [];
  selectedLeaseId = '';
  isLoadingLeases = true;

  // Template selection
  templates: ContractTemplate[] = [];
  selectedTemplateId = '';
  isLoadingTemplates = true;

  tenantName = '';
  propertyNumber = '';
  unitNumber = '';
  propertyAddress = '';
  leaseStartDate: string = '';
  leaseEndDate: string = '';
  monthlyRent = 0;
  securityDeposit = 0;
  ownerName = 'Property Owner';
  ownerAddress = '';
  specialTerms = '';

  today = new Date().toISOString().split('T')[0];

  constructor(
    private modalCtrl: ModalController,
    private leaseService: LeaseService,
    private templateService: ContractTemplateService,
  ) {}

  ngOnInit() {
    this.loadTemplates();
    
    if (this.preset) {
      this.tenantName = this.preset.tenantName ?? this.tenantName;
      this.propertyNumber = this.preset.propertyNumber ?? this.propertyNumber;
      this.unitNumber = this.preset.unitNumber ?? this.unitNumber;
      this.propertyAddress = this.preset.propertyAddress ?? this.propertyAddress;
      this.leaseStartDate = this.preset.leaseStartDate ?? this.leaseStartDate;
      this.leaseEndDate = this.preset.leaseEndDate ?? this.leaseEndDate;
      this.monthlyRent = this.preset.monthlyRent ?? this.monthlyRent;
      this.securityDeposit = this.preset.securityDeposit ?? this.securityDeposit;
      this.ownerName = this.preset.ownerName ?? this.ownerName;
      this.ownerAddress = this.preset.ownerAddress ?? this.ownerAddress;
      this.specialTerms = this.preset.specialTerms ?? this.specialTerms;
      this.isLoadingLeases = false;
    } else {
      this.loadLeases();
    }
  }

  loadTemplates() {
    this.isLoadingTemplates = true;
    this.templateService.getTemplates().subscribe({
      next: (templates) => {
        this.templates = templates;
        // Auto-select default template
        const defaultTemplate = templates.find(t => t.isDefault);
        if (defaultTemplate) {
          this.selectedTemplateId = defaultTemplate.templateId;
        } else if (templates.length > 0) {
          this.selectedTemplateId = templates[0].templateId;
        }
        this.isLoadingTemplates = false;
      },
      error: (err) => {
        console.error('Failed to load templates:', err);
        this.isLoadingTemplates = false;
      },
    });
  }

  loadLeases() {
    this.isLoadingLeases = true;
    this.leaseService.getMyLeases().subscribe({
      next: (leases) => {
        this.leases = leases
          .filter(l => l.leaseStatus === 'ACTIVE')
          .map((lease) => this.mapLeaseToOption(lease));
        this.isLoadingLeases = false;
      },
      error: (err) => {
        console.error('Failed to load leases:', err);
        this.isLoadingLeases = false;
      },
    });
  }

  private mapLeaseToOption(lease: Lease): LeaseOption {
    const propertyName = lease.property?.propertyName || lease.property?.address || 'Unknown';
    const tenantName = lease.tenant?.fullName || 'Unknown';
    const unitNumber = lease.unit?.unitNumber;
    const displayName = unitNumber 
      ? `${tenantName} - ${propertyName} / Unit ${unitNumber}`
      : `${tenantName} - ${propertyName}`;
    
    return {
      leaseId: lease.leaseId,
      displayName,
      tenantName,
      propertyName,
      unitNumber,
      monthlyRent: lease.monthlyRent,
      startDate: lease.startDate || '',
      endDate: lease.endDate || '',
    };
  }

  onLeaseSelected() {
    const selected = this.leases.find(l => l.leaseId === this.selectedLeaseId);
    if (selected) {
      this.tenantName = selected.tenantName;
      this.propertyNumber = selected.propertyName;
      this.unitNumber = selected.unitNumber || '';
      this.leaseStartDate = selected.startDate;
      this.leaseEndDate = selected.endDate;
      this.monthlyRent = selected.monthlyRent;
      this.securityDeposit = selected.monthlyRent * 2;
    }
  }

  dismiss() {
    this.modalCtrl.dismiss();
  }

  generateContract() {
    this.modalCtrl.dismiss({
      tenantName: this.tenantName,
      propertyNumber: this.propertyNumber,
      unitNumber: this.unitNumber,
      leaseStartDate: this.leaseStartDate,
      leaseEndDate: this.leaseEndDate,
      monthlyRent: this.monthlyRent,
      securityDeposit: this.securityDeposit,
      templateId: this.selectedTemplateId,
    });
  }
}
