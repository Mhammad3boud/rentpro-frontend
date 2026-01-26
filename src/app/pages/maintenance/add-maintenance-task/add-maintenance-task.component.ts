import { Component, OnInit, Input } from '@angular/core';
import { ModalController } from '@ionic/angular';

interface MaintenanceTaskData {
  id?: string;
  title: string;
  description: string;
  assetId: string;
  assetName: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in-progress' | 'completed' | 'overdue';
  scheduledDate: string;
  completedDate?: string;
  assignedTo?: string;
  estimatedCost?: number;
  actualCost?: number;
  recurring?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
  };
  category: 'plumbing' | 'electrical' | 'hvac' | 'general' | 'landscaping' | 'pest-control' | 'cleaning' | 'other';
}

@Component({
  selector: 'app-add-maintenance-task',
  templateUrl: './add-maintenance-task.component.html',
  styleUrls: ['./add-maintenance-task.component.scss'],
  standalone: false
})
export class AddMaintenanceTaskComponent implements OnInit {
  @Input() taskData: MaintenanceTaskData = {
    title: '',
    description: '',
    assetId: '',
    assetName: '',
    priority: 'medium',
    status: 'pending',
    scheduledDate: '',
    category: 'general',
    recurring: {
      frequency: 'monthly',
      interval: 1
    }
  };

  isEditMode = false;

  availableAssets = [
    { id: 'P-456', name: 'Business District, Downtown' },
    { id: 'P-789', name: 'Agricultural Zone, Countryside' },
    { id: 'P-811', name: 'Agricultural Zone, Countryside' }
  ];

  categories = [
    { value: 'plumbing', label: 'Plumbing', icon: 'water-outline' },
    { value: 'electrical', label: 'Electrical', icon: 'flash-outline' },
    { value: 'hvac', label: 'HVAC', icon: 'snow-outline' },
    { value: 'general', label: 'General', icon: 'build-outline' },
    { value: 'landscaping', label: 'Landscaping', icon: 'leaf-outline' },
    { value: 'pest-control', label: 'Pest Control', icon: 'bug-outline' },
    { value: 'cleaning', label: 'Cleaning', icon: 'sparkles-outline' },
    { value: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline' }
  ];

  constructor(private modalCtrl: ModalController) {}

  ngOnInit() {
    console.log('AddMaintenanceTaskComponent initialized');
    console.log('Task data on init:', this.taskData);
    
    if (this.taskData.id) {
      this.isEditMode = true;
      console.log('Edit mode enabled for task:', this.taskData.id);
    } else {
      console.log('Add mode - new task');
    }
  }

  close() {
    this.modalCtrl.dismiss();
  }

  saveTask() {
    if (!this.taskData.title || !this.taskData.assetId) {
      this.showError('Please fill in all required fields');
      return;
    }

    if (!this.taskData.scheduledDate) {
      this.showError('Please select a scheduled date');
      return;
    }

    console.log('Maintenance Task:', this.taskData);
    this.modalCtrl.dismiss(this.taskData);
  }

  toggleRecurring() {
    if (this.taskData.recurring) {
      delete this.taskData.recurring;
    } else {
      this.taskData.recurring = {
        frequency: 'monthly',
        interval: 1
      };
    }
  }

  onAssetChange(assetId: string) {
    console.log('Asset changed to:', assetId);
    const asset = this.availableAssets.find(a => a.id === assetId);
    if (asset) {
      this.taskData.assetName = asset.name;
      console.log('Asset name set to:', asset.name);
    }
  }

  private async showError(message: string) {
    console.error(message);
  }
}
