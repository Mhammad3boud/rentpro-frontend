import { Component, OnInit, Input } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular';
import { LeaseService } from '../../../services/lease.service';

interface LeaseOption {
  leaseId: string;
  propertyId: string;
  propertyName: string;
  unitId?: string;
  unitNumber?: string;
  tenantName?: string;
}

interface MaintenanceTaskData {
  leaseId: string;
  propertyId: string;
  unitId?: string;
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  assignedTechnician?: string;
  maintenanceCost?: number;
  status?: string;
}

@Component({
  selector: 'app-add-maintenance-task',
  templateUrl: './add-maintenance-task.component.html',
  styleUrls: ['./add-maintenance-task.component.scss'],
  standalone: false
})
export class AddMaintenanceTaskComponent implements OnInit {
  @Input() taskData: MaintenanceTaskData = {
    leaseId: '',
    propertyId: '',
    title: '',
    description: '',
    priority: 'MEDIUM'
  };

  isEditMode = false;
  isLoading = false;
  availableLeases: LeaseOption[] = [];

  constructor(
    private modalCtrl: ModalController,
    private toastController: ToastController,
    private leaseService: LeaseService
  ) {}

  ngOnInit() {
    this.loadLeases();
    
    if (this.taskData.leaseId) {
      this.isEditMode = true;
    }
  }

  loadLeases() {
    this.isLoading = true;
    this.leaseService.getMyLeases().subscribe({
      next: (leases: any[]) => {
        this.availableLeases = leases.map((lease: any) => ({
          leaseId: lease.leaseId,
          propertyId: lease.propertyId || lease.property?.propertyId || '',
          propertyName: lease.propertyName || lease.property?.propertyName || 'Unknown Property',
          unitId: lease.unitId || lease.unit?.unitId,
          unitNumber: lease.unitNumber || lease.unit?.unitNumber,
          tenantName: lease.tenantName || lease.tenant?.fullName
        }));
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Error loading leases:', error);
        this.isLoading = false;
        this.presentToast('Error loading leases', 'danger');
      }
    });
  }

  close() {
    this.modalCtrl.dismiss();
  }

  saveTask() {
    if (!this.taskData.title) {
      this.presentToast('Please enter a task title', 'warning');
      return;
    }

    if (!this.taskData.leaseId) {
      this.presentToast('Please select a property/lease', 'warning');
      return;
    }

    this.modalCtrl.dismiss(this.taskData);
  }

  onLeaseChange(leaseId: string) {
    const lease = this.availableLeases.find(l => l.leaseId === leaseId);
    if (lease) {
      this.taskData.propertyId = lease.propertyId;
      this.taskData.unitId = lease.unitId;
    }
  }

  private async presentToast(message: string, color: 'success' | 'danger' | 'warning') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: 'top'
    });
    await toast.present();
  }
}
