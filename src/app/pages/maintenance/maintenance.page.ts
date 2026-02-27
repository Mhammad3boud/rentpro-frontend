import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ModalController, AlertController, ToastController, ActionSheetController } from '@ionic/angular';
import { Router, ActivatedRoute } from '@angular/router';
import { AddMaintenanceTaskComponent } from './add-maintenance-task/add-maintenance-task.component';
import { PhotoViewerComponent } from './photo-viewer/photo-viewer.component';
import { MaintenanceService, MaintenanceRequest, MaintenancePhoto, CreateMaintenanceRequest, UpdateMaintenanceStatusRequest } from '../../services/maintenance.service';
import { UserService } from '../../services/user.service';
import { LeaseService } from '../../services/lease.service';

@Component({
  selector: 'app-maintenance',
  templateUrl: './maintenance.page.html',
  styleUrls: ['./maintenance.page.scss'],
  standalone: false
})
export class MaintenancePage implements OnInit {
  maintenanceTasks: MaintenanceRequest[] = [];
  filteredTasks: MaintenanceRequest[] = [];
  searchTerm = '';
  selectedStatus = 'all';
  selectedPriority = 'all';
  selectedCategory = 'all';
  isLoading = false;
  isTenant = false;
  highlightedRequestId: string | null = null;
  canCreateTenantRequest = true;
  totalMaintenanceSpent = 0;
  resolvedMaintenanceSpent = 0;
  openMaintenanceEstimated = 0;
  filteredMaintenanceSpent = 0;

  constructor(
    private router: Router,
    private modalController: ModalController,
    private alertController: AlertController,
    private toastController: ToastController,
    private actionSheetController: ActionSheetController,
    private cdr: ChangeDetectorRef,
    private maintenanceService: MaintenanceService,
    private userService: UserService,
    private route: ActivatedRoute,
    private leaseService: LeaseService
  ) {}

  ngOnInit() {
    this.isTenant = this.userService.isTenant();
    this.route.queryParamMap.subscribe(params => {
      this.highlightedRequestId = params.get('requestId');
    });
    if (this.isTenant) {
      this.leaseService.getTenantLeases().subscribe({
        next: (leases) => {
          this.canCreateTenantRequest = (leases || []).some(lease => (lease.leaseStatus || '').toUpperCase() === 'ACTIVE');
          this.cdr.detectChanges();
        },
        error: () => {
          this.canCreateTenantRequest = false;
          this.cdr.detectChanges();
        }
      });
    }
    this.loadMaintenanceTasks();
  }

  loadMaintenanceTasks() {
    this.isLoading = true;
    const request$ = this.isTenant
      ? this.maintenanceService.getMyRequests()
      : this.maintenanceService.getPropertyRequests();

    request$.subscribe({
      next: (tasks) => {
        this.maintenanceTasks = this.prioritizeHighlightedTask(tasks);
        this.filterTasks();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading maintenance tasks:', error);
        this.isLoading = false;
        this.presentToast('Error loading maintenance tasks', 'danger');
      }
    });
  }

  checkOverdueTasks() {
    // Note: 'overdue' status doesn't exist in the backend - it's just 'PENDING'
    // Overdue is a UI-only state based on time since reportedAt
    this.filterTasks();
  }

  filterTasks() {
    this.calculateMaintenanceSpendSummary(this.maintenanceTasks);
    let filtered = [...this.maintenanceTasks];

    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(task =>
        task.title.toLowerCase().includes(term) ||
        task.description.toLowerCase().includes(term) ||
        (task.propertyName || '').toLowerCase().includes(term)
      );
    }

    if (this.selectedStatus !== 'all') {
      // Map lowercase UI values to uppercase backend values
      const statusMap: Record<string, string> = {
        'pending': 'PENDING',
        'in-progress': 'IN_PROGRESS',
        'completed': 'RESOLVED'
      };
      const mappedStatus = statusMap[this.selectedStatus] || this.selectedStatus.toUpperCase();
      filtered = filtered.filter(task => task.status === mappedStatus);
    }

    if (this.selectedPriority !== 'all') {
      const mappedPriority = this.selectedPriority.toUpperCase();
      filtered = filtered.filter(task => task.priority === mappedPriority);
    }

    this.filteredTasks = this.prioritizeHighlightedTask(filtered);
    this.filteredMaintenanceSpent = this.sumMaintenanceCost(this.filteredTasks);
  }

  async addMaintenanceTask() {
    if (this.isTenant && !this.canCreateTenantRequest) {
      this.presentToast('Your lease is terminated or expired. New maintenance requests are disabled.', 'primary');
      return;
    }
    console.log('Add maintenance task button clicked'); 
    
    try {
      const modal = await this.modalController.create({
        component: AddMaintenanceTaskComponent,
        cssClass: 'centered-modal',
        backdropDismiss: false
      });
      
      console.log('Modal created successfully'); 
      
      await modal.present();
      console.log('Modal presented successfully'); 
      
      const { data } = await modal.onDidDismiss();
      console.log('Modal dismissed with data:', data); 
      
      if (data) {
        const createRequest: CreateMaintenanceRequest = {
          leaseId: data.leaseId || undefined,
          propertyId: data.propertyId || undefined,
          unitId: data.unitId || undefined,
          title: data.title,
          description: data.description || '',
          priority: data.priority,
          assignedTechnician: data.assignedTechnician || undefined,
          maintenanceCost: data.maintenanceCost || undefined
        };
        
        console.log('Creating maintenance request:', createRequest); 
        
        this.maintenanceService.createRequest(createRequest).subscribe({
          next: (newTask) => {
            console.log('Maintenance request created successfully:', newTask);
            const attachedFile: File | undefined = data.attachmentFile;
            if (attachedFile) {
              const requestId = newTask.requestId || newTask.id || '';
              this.maintenanceService.uploadPhoto(requestId, attachedFile).subscribe({
                next: () => {
                  this.maintenanceTasks = [newTask, ...this.maintenanceTasks];
                  this.filterTasks();
                  this.cdr.detectChanges();
                  this.presentToast('Maintenance request added successfully', 'success');
                },
                error: () => {
                  this.maintenanceTasks = [newTask, ...this.maintenanceTasks];
                  this.filterTasks();
                  this.cdr.detectChanges();
                  this.presentToast('Request submitted but image upload failed', 'danger');
                }
              });
              return;
            }

            this.maintenanceTasks = [newTask, ...this.maintenanceTasks];
            this.filterTasks();
            this.cdr.detectChanges();
            this.presentToast('Maintenance request added successfully', 'success');
          },
          error: (error) => {
            console.error('Error creating maintenance request:', error); 
            this.presentToast('Error adding maintenance request', 'danger');
          }
        });
      }
    } catch (error) {
      console.error('Error in addMaintenanceTask:', error); 
      this.presentToast('Error adding maintenance task', 'danger');
    }
  }

  async editTask(task: MaintenanceRequest) {
    if (this.isTenant) {
      return;
    }

    const modal = await this.modalController.create({
      component: AddMaintenanceTaskComponent,
      componentProps: {
        taskData: {
          requestId: task.requestId || task.id || '',
          leaseId: task.leaseId || '',
          propertyId: task.propertyId || '',
          unitId: task.unitId,
          title: task.title,
          description: task.description,
          priority: task.priority,
          assignedTechnician: task.assignedTechnician,
          maintenanceCost: task.maintenanceCost,
          status: task.status
        }
      },
      cssClass: 'centered-modal',
      backdropDismiss: false
    });
    
    await modal.present();
    
    const { data } = await modal.onDidDismiss();
    if (data) {
      const updateRequest = {
        leaseId: data.leaseId || undefined,
        propertyId: data.propertyId || undefined,
        unitId: data.unitId || undefined,
        title: data.title,
        description: data.description,
        priority: data.priority,
        assignedTechnician: data.assignedTechnician,
        maintenanceCost: data.maintenanceCost,
        status: data.status || task.status
      };
      
      this.maintenanceService.updateRequest(task.requestId || task.id || '', updateRequest).subscribe({
        next: (updatedTask) => {
          const index = this.maintenanceTasks.findIndex(t => (t.requestId || t.id) === (task.requestId || task.id));
          if (index !== -1) {
            this.maintenanceTasks[index] = updatedTask;
            this.filterTasks();
            this.cdr.detectChanges();
            this.presentToast('Maintenance task updated successfully', 'success');
          }
        },
        error: (error) => {
          console.error('Error updating maintenance task:', error);
          this.presentToast('Error updating maintenance task', 'danger');
        }
      });
    }
  }

  private generateTaskId(): string {
    const timestamp = Date.now().toString().slice(-4);
    return `M-${timestamp}`;
  }

  private formatDateForInput(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  async updateTaskStatus(task: MaintenanceRequest) {
    if (this.isTenant) {
      return;
    }

    const alert = await this.alertController.create({
      header: 'Update Task Status',
      inputs: [
        {
          name: 'status',
          type: 'radio',
          label: 'Pending',
          value: 'PENDING',
          checked: task.status === 'PENDING'
        },
        {
          name: 'status',
          type: 'radio',
          label: 'In Progress',
          value: 'IN_PROGRESS',
          checked: task.status === 'IN_PROGRESS'
        },
        {
          name: 'status',
          type: 'radio',
          label: 'Resolved',
          value: 'RESOLVED',
          checked: task.status === 'RESOLVED'
        }
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Update',
          handler: (data) => {
            const selectedStatus = data.status || data;
            
            if (selectedStatus) {
              // Use quickUpdateStatus to sync with backend
              this.quickUpdateStatus(task, selectedStatus);
              return true;
            } else {
              this.presentToast('Please select a status', 'primary');
              return false;
            }
          }
        }
      ]
    });
    
    await alert.present();
  }

  quickUpdateStatus(task: MaintenanceRequest, newStatus: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED') {
    if (this.isTenant) {
      return;
    }

    const oldStatus = task.status;
    const requestId = task.requestId || task.id || '';
    
    const updateRequest: UpdateMaintenanceStatusRequest = {
      status: newStatus as any,
      assignedTechnician: task.assignedTechnician,
      maintenanceCost: task.maintenanceCost
    };
    
    this.maintenanceService.updateRequestStatus(requestId, updateRequest).subscribe({
      next: (updatedTask) => {
        const index = this.maintenanceTasks.findIndex(t => (t.requestId || t.id) === requestId);
        if (index !== -1) {
          this.maintenanceTasks[index] = updatedTask;
          this.maintenanceTasks = [...this.maintenanceTasks];
          this.filterTasks();
          this.cdr.detectChanges();
        }
        const statusLabel = newStatus.replace('_', ' ').toLowerCase();
        this.presentToast(`Task status updated to ${statusLabel}`, 'success');
      },
      error: (error) => {
        console.error('Error updating status:', error);
        this.presentToast('Error updating task status', 'danger');
      }
    });
  }

  async deleteTask(task: MaintenanceRequest) {
    if (this.isTenant) {
      return;
    }

    const alert = await this.alertController.create({
      header: 'Delete Task',
      message: `Are you sure you want to delete "${task.title}"?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          role: 'destructive',
          handler: () => {
            const requestId = task.requestId || task.id || '';
            this.maintenanceService.deleteRequest(requestId).subscribe({
              next: () => {
                this.maintenanceTasks = this.maintenanceTasks.filter(t => (t.requestId || t.id) !== requestId);
                this.filterTasks();
                this.cdr.detectChanges();
                this.presentToast('Task deleted', 'success');
              },
              error: (error) => {
                console.error('Error deleting task:', error);
                this.presentToast('Error deleting task', 'danger');
              }
            });
          }
        }
      ]
    });
    await alert.present();
  }

  getPriorityColor(priority: string): string {
    switch (priority?.toUpperCase()) {
      case 'HIGH': return 'danger';
      case 'MEDIUM': return 'warning';
      case 'LOW': return 'success';
      default: return 'medium';
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'RESOLVED': return 'success';
      case 'IN_PROGRESS': return 'warning';
      case 'PENDING': return 'medium';
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

  isOverdue(task: MaintenanceRequest): boolean {
    // A task is considered overdue if it's PENDING and was reported more than 7 days ago
    if (task.status !== 'PENDING') return false;
    const reportedDate = new Date(task.reportedAt || task.createdAt || '');
    const daysSinceReported = (Date.now() - reportedDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceReported > 7;
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

  // Pull-to-refresh
  doRefresh(event: any) {
    const request$ = this.isTenant
      ? this.maintenanceService.getMyRequests()
      : this.maintenanceService.getPropertyRequests();

    request$.subscribe({
      next: (tasks) => {
        this.maintenanceTasks = tasks;
        this.filterTasks();
        this.cdr.detectChanges();
        event.target.complete();
      },
      error: () => {
        event.target.complete();
        this.presentToast('Error refreshing tasks', 'danger');
      }
    });
  }

  // Track by function for ngFor
  trackByTaskId(index: number, task: MaintenanceRequest): string {
    return task.requestId || task.id || index.toString();
  }

  private prioritizeHighlightedTask(tasks: MaintenanceRequest[]): MaintenanceRequest[] {
    if (!this.highlightedRequestId) {
      return tasks;
    }

    const highlighted = tasks.find(t => (t.requestId || t.id) === this.highlightedRequestId);
    if (!highlighted) {
      return tasks;
    }

    const rest = tasks.filter(t => (t.requestId || t.id) !== this.highlightedRequestId);
    return [highlighted, ...rest];
  }

  // View photos for a task
  async viewPhotos(task: MaintenanceRequest) {
    const requestId = task.requestId || task.id || '';
    
    this.maintenanceService.getPhotos(requestId).subscribe({
      next: async (photos) => {
        if (photos.length === 0) {
          this.presentToast('No photos attached to this task', 'medium');
          return;
        }

        const photoUrls = photos.map(p => this.maintenanceService.getPhotoUrl(p.imageUrl));
        
        const modal = await this.modalController.create({
          component: PhotoViewerComponent,
          componentProps: { photoUrls },
          cssClass: 'centered-modal',
          backdropDismiss: false
        });

        await modal.present();
      },
      error: (error) => {
        console.error('Error loading photos:', error);
        this.presentToast('Error loading photos', 'danger');
      }
    });
  }

  // Upload media (photos/videos) for a task
  async uploadPhoto(task: MaintenanceRequest) {
    const actionSheet = await this.actionSheetController.create({
      header: 'Add Media',
      buttons: [
        {
          text: 'Take Photo',
          icon: 'camera-outline',
          handler: () => {
            this.captureFromCamera(task, 'image');
          }
        },
        {
          text: 'Record Video',
          icon: 'videocam-outline',
          handler: () => {
            this.captureFromCamera(task, 'video');
          }
        },
        {
          text: 'Choose from Gallery',
          icon: 'images-outline',
          handler: () => {
            this.pickFromGallery(task);
          }
        },
        {
          text: 'Cancel',
          icon: 'close-outline',
          role: 'cancel'
        }
      ]
    });
    await actionSheet.present();
  }

  private captureFromCamera(task: MaintenanceRequest, type: 'image' | 'video') {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = type === 'image' ? 'image/*' : 'video/*';
    input.capture = 'environment'; // Use rear camera
    
    input.onchange = (event: any) => {
      const file = event.target.files[0];
      if (file) {
        this.uploadSingleFile(task, file);
      }
    };
    
    input.click();
  }

  private pickFromGallery(task: MaintenanceRequest) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,video/*';
    input.multiple = true;
    
    input.onchange = (event: any) => {
      const files = Array.from(event.target.files) as File[];
      if (files.length > 0) {
        this.uploadMultipleFiles(task, files);
      }
    };
    
    input.click();
  }

  private uploadSingleFile(task: MaintenanceRequest, file: File) {
    const requestId = task.requestId || task.id || '';
    this.maintenanceService.uploadPhoto(requestId, file).subscribe({
      next: () => {
        this.presentToast('Media uploaded successfully', 'success');
      },
      error: (error) => {
        console.error('Error uploading media:', error);
        this.presentToast('Error uploading media', 'danger');
      }
    });
  }

  private uploadMultipleFiles(task: MaintenanceRequest, files: File[]) {
    const requestId = task.requestId || task.id || '';
    let uploaded = 0;
    const total = files.length;

    files.forEach(file => {
      this.maintenanceService.uploadPhoto(requestId, file).subscribe({
        next: () => {
          uploaded++;
          if (uploaded === total) {
            this.presentToast(`${total} file(s) uploaded successfully`, 'success');
          }
        },
        error: (error) => {
          console.error('Error uploading file:', error);
          this.presentToast(`Error uploading ${file.name}`, 'danger');
        }
      });
    });
  }

  private calculateMaintenanceSpendSummary(tasks: MaintenanceRequest[]) {
    this.totalMaintenanceSpent = 0;
    this.resolvedMaintenanceSpent = 0;
    this.openMaintenanceEstimated = 0;

    (tasks || []).forEach(task => {
      const cost = this.toCost(task.maintenanceCost);
      if (cost <= 0) {
        return;
      }

      this.totalMaintenanceSpent += cost;
      if (task.status === 'RESOLVED') {
        this.resolvedMaintenanceSpent += cost;
      } else {
        this.openMaintenanceEstimated += cost;
      }
    });
  }

  private sumMaintenanceCost(tasks: MaintenanceRequest[]): number {
    return (tasks || []).reduce((sum, task) => sum + this.toCost(task.maintenanceCost), 0);
  }

  private toCost(value: unknown): number {
    const cost = Number(value || 0);
    return Number.isFinite(cost) && cost > 0 ? cost : 0;
  }
}
