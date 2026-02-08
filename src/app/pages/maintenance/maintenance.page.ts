import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ModalController, AlertController, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { AddMaintenanceTaskComponent } from './add-maintenance-task/add-maintenance-task.component';

interface MaintenanceTask {
  id: string;
  title: string;
  description: string;
  assetId: string;
  assetName: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in-progress' | 'completed' | 'overdue';
  scheduledDate: Date;
  completedDate?: Date;
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
  selector: 'app-maintenance',
  templateUrl: './maintenance.page.html',
  styleUrls: ['./maintenance.page.scss'],
  standalone: false
})
export class MaintenancePage implements OnInit {
  maintenanceTasks: MaintenanceTask[] = [
    {
      id: 'M-001',
      title: 'HVAC System Inspection',
      description: 'Quarterly HVAC system check and filter replacement',
      assetId: 'P-456',
      assetName: 'Business District, Downtown',
      priority: 'high',
      status: 'pending',
      scheduledDate: new Date('2024-02-01'),
      category: 'hvac',
      recurring: {
        frequency: 'monthly',
        interval: 3
      },
      estimatedCost: 150
    },
    {
      id: 'M-002',
      title: 'Plumbing Leak Repair',
      description: 'Fix leaking pipe in bathroom',
      assetId: 'P-456',
      assetName: 'Business District, Downtown',
      priority: 'critical',
      status: 'in-progress',
      scheduledDate: new Date('2024-01-25'),
      assignedTo: 'John Plumbing Services',
      estimatedCost: 300,
      category: 'plumbing'
    },
    {
      id: 'M-003',
      title: 'Landscaping Maintenance',
      description: 'Monthly lawn care and garden maintenance',
      assetId: 'P-789',
      assetName: 'Agricultural Zone, Countryside',
      priority: 'medium',
      status: 'completed',
      scheduledDate: new Date('2024-01-20'),
      completedDate: new Date('2024-01-22'),
      actualCost: 75,
      category: 'landscaping',
      recurring: {
        frequency: 'monthly',
        interval: 1
      }
    }
  ];

  filteredTasks: MaintenanceTask[] = [];
  searchTerm = '';
  selectedStatus = 'all';
  selectedPriority = 'all';
  selectedCategory = 'all';

  constructor(
    private router: Router,
    private modalController: ModalController,
    private alertController: AlertController,
    private toastController: ToastController,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.filteredTasks = [...this.maintenanceTasks];
    this.checkOverdueTasks();
  }

  checkOverdueTasks() {
    const today = new Date();
    this.maintenanceTasks.forEach(task => {
      if (task.status === 'pending' && task.scheduledDate < today) {
        task.status = 'overdue';
      }
    });
    this.filterTasks();
  }

  filterTasks() {
    let filtered = [...this.maintenanceTasks];

    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(task =>
        task.title.toLowerCase().includes(term) ||
        task.description.toLowerCase().includes(term) ||
        task.assetName.toLowerCase().includes(term) ||
        task.assignedTo?.toLowerCase().includes(term)
      );
    }

    if (this.selectedStatus !== 'all') {
      filtered = filtered.filter(task => task.status === this.selectedStatus);
    }

    if (this.selectedPriority !== 'all') {
      filtered = filtered.filter(task => task.priority === this.selectedPriority);
    }

    if (this.selectedCategory !== 'all') {
      filtered = filtered.filter(task => task.category === this.selectedCategory);
    }

    this.filteredTasks = filtered;
  }

  async addMaintenanceTask() {
    console.log('Add maintenance task button clicked'); 
    
    try {
      const modal = await this.modalController.create({
        component: AddMaintenanceTaskComponent,
        cssClass: 'custom-maintenance-modal',
        breakpoints: [0, 0.5, 0.9, 1],
        initialBreakpoint: 0.9
      });
      
      console.log('Modal created successfully'); 
      
      await modal.present();
      console.log('Modal presented successfully'); 
      
      const { data } = await modal.onDidDismiss();
      console.log('Modal dismissed with data:', data); 
      
      if (data) {
        const newTask: MaintenanceTask = {
          ...data,
          id: this.generateTaskId(),
          scheduledDate: new Date(data.scheduledDate),
          completedDate: data.completedDate ? new Date(data.completedDate) : undefined
        };
        
        console.log('New task created:', newTask); 
        
        this.maintenanceTasks = [newTask, ...this.maintenanceTasks];
        this.filterTasks();
        this.cdr.detectChanges();
        this.presentToast('Maintenance task added successfully', 'success');
        console.log('Task added successfully'); 
      }
    } catch (error) {
      console.error('Error in addMaintenanceTask:', error); 
      this.presentToast('Error adding maintenance task', 'danger');
    }
  }

  async editTask(task: MaintenanceTask) {
    const modal = await this.modalController.create({
      component: AddMaintenanceTaskComponent,
      componentProps: {
        taskData: {
          ...task,
          scheduledDate: this.formatDateForInput(task.scheduledDate),
          completedDate: task.completedDate ? this.formatDateForInput(task.completedDate) : ''
        }
      },
      cssClass: 'custom-maintenance-modal',
      breakpoints: [0, 0.5, 0.9, 1],
      initialBreakpoint: 0.9
    });
    
    await modal.present();
    
    const { data } = await modal.onDidDismiss();
    if (data) {
      const updatedTask: MaintenanceTask = {
        ...data,
        id: task.id,
        scheduledDate: new Date(data.scheduledDate),
        completedDate: data.completedDate ? new Date(data.completedDate) : undefined
      };
      
      const index = this.maintenanceTasks.findIndex(t => t.id === task.id);
      if (index !== -1) {
        this.maintenanceTasks[index] = updatedTask;
        this.filterTasks();
        this.cdr.detectChanges();
        this.presentToast('Maintenance task updated successfully', 'success');
      }
    }
  }

  private generateTaskId(): string {
    const timestamp = Date.now().toString().slice(-4);
    return `M-${timestamp}`;
  }

  private formatDateForInput(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  async updateTaskStatus(task: MaintenanceTask) {
    const alert = await this.alertController.create({
      header: 'Update Task Status',
      inputs: [
        {
          name: 'status',
          type: 'radio',
          label: 'Pending',
          value: 'pending',
          checked: task.status === 'pending'
        },
        {
          name: 'status',
          type: 'radio',
          label: 'In Progress',
          value: 'in-progress',
          checked: task.status === 'in-progress'
        },
        {
          name: 'status',
          type: 'radio',
          label: 'Completed',
          value: 'completed',
          checked: task.status === 'completed'
        },
        {
          name: 'status',
          type: 'radio',
          label: 'Overdue',
          value: 'overdue',
          checked: task.status === 'overdue'
        }
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Update',
          handler: async (data) => {
            console.log('Alert handler data:', data); 
            
            const selectedStatus = data.status || data;
            console.log('Selected status:', selectedStatus); 
            
            if (selectedStatus) {
              const oldStatus = task.status;
              task.status = selectedStatus;
              
              if (selectedStatus === 'completed') {
                task.completedDate = new Date();
              } else {
                task.completedDate = undefined;
              }
              
              if (selectedStatus === 'pending') {
                this.checkOverdueTasks();
              }
              
              this.maintenanceTasks = [...this.maintenanceTasks];
              this.filterTasks();
              
              this.cdr.detectChanges();
              
              console.log('Status updated from', oldStatus, 'to', task.status);
              this.presentToast(`Task status updated to ${selectedStatus.replace('-', ' ')}`, 'success');
              return true;
            } else {
              console.log('No status selected');
              this.presentToast('Please select a status', 'primary');
              return false;
            }
          }
        }
      ]
    });
    
    await alert.present();
    
    const { data } = await alert.onDidDismiss();
    console.log('Alert dismissed with data:', data);
  }

  quickUpdateStatus(task: MaintenanceTask, newStatus: 'pending' | 'in-progress' | 'completed' | 'overdue') {
    console.log('Quick update status called');
    console.log('Task:', task);
    console.log('New status:', newStatus);
    
    const oldStatus = task.status;
    task.status = newStatus;
    
    console.log('Status changed from', oldStatus, 'to', task.status);
    
    if (newStatus === 'completed') {
      task.completedDate = new Date();
      console.log('Set completed date to:', task.completedDate);
    } else {
      task.completedDate = undefined;
      console.log('Cleared completed date');
    }
    
    if (newStatus === 'pending') {
      this.checkOverdueTasks();
    }
    
    this.maintenanceTasks = [...this.maintenanceTasks];
    this.filterTasks();
    
    this.cdr.detectChanges();
    
    console.log('Quick status update completed');
    this.presentToast(`Task status updated to ${newStatus.replace('-', ' ')}`, 'success');
  }

  async deleteTask(task: MaintenanceTask) {
    const alert = await this.alertController.create({
      header: 'Delete Task',
      message: `Are you sure you want to delete "${task.title}"?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          role: 'destructive',
          handler: () => {
            this.maintenanceTasks = this.maintenanceTasks.filter(t => t.id !== task.id);
            this.filterTasks();
            this.presentToast('Task deleted', 'danger');
          }
        }
      ]
    });
    await alert.present();
  }

  getPriorityColor(priority: string): string {
    switch (priority) {
      case 'critical': return 'danger';
      case 'high': return 'warning';
      case 'medium': return 'primary';
      case 'low': return 'success';
      default: return 'medium';
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'completed': return 'success';
      case 'in-progress': return 'warning';
      case 'overdue': return 'danger';
      case 'pending': return 'medium';
      default: return 'medium';
    }
  }

  getCategoryIcon(category: string): string {
    switch (category) {
      case 'plumbing': return 'water-outline';
      case 'electrical': return 'flash-outline';
      case 'hvac': return 'snow-outline';
      case 'landscaping': return 'leaf-outline';
      case 'pest-control': return 'bug-outline';
      case 'cleaning': return 'sparkles-outline';
      default: return 'build-outline';
    }
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  isOverdue(task: MaintenanceTask): boolean {
    return task.status === 'overdue' || 
           (task.status === 'pending' && task.scheduledDate < new Date());
  }

  private async presentToast(message: string, color: 'success' | 'danger' | 'primary' | 'medium') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: 'top',
    });
    await toast.present();
  }
}
