import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AlertController, IonicModule, ModalController } from '@ionic/angular';
import { ProfileImageModalComponent } from '../../components/profile-image-modal/profile-image-modal.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';

interface RecentActivity {
  id: string;
  type: 'payment' | 'maintenance' | 'lease' | 'overdue';
  title: string;
  description: string;
  timestamp: Date;
  icon: string;
  iconColor: 'success' | 'primary' | 'warning' | 'danger';
}

interface UpcomingReminder {
  id: string;
  type: 'lease' | 'maintenance' | 'rent' | 'inspection';
  title: string;
  description: string;
  date: Date;
  icon: string;
  iconColor: 'warning' | 'primary' | 'success' | 'danger';
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, RouterModule, ProfileImageModalComponent]
})
export class DashboardPage implements OnInit {
  userName: string = 'MOHAMMED ABOUD HUSSEIN';
  role: string = 'Property Owner';
  notificationCount: number = 2;

  recentActivities: RecentActivity[] = [];
  upcomingReminders: UpcomingReminder[] = [];

  // Profile and stats data
  userProfile: any = {
    imageUrl: null,
    email: 'mohammed.aboud@rentpro.com',
    phone: '+255 123 456 789',
    joinDate: '2024-01-15'
  };

  totalProperties: number = 0;
  totalTenants: number = 0;
  monthlyRevenue: string = 'TZS 0';
  pendingMaintenance: number = 0;
  activeContracts: number = 0;

  constructor(
    private router: Router,
    private alertController: AlertController,
    private modalController: ModalController,
    private dataService: DataService
  ) {}

  ngOnInit() {
    this.loadRecentActivities();
    this.loadUpcomingReminders();
    this.loadDashboardStats();
  }

  loadDashboardStats() {
    const assets = this.dataService.getAssets();
    const contracts = this.dataService.getContracts();
    const maintenanceTasks = this.dataService.getMaintenanceTasks();

    // Calculate stats
    this.totalProperties = assets.length;
    this.totalTenants = contracts.length;
    this.activeContracts = contracts.filter(c => c.status === 'Active').length;
    this.pendingMaintenance = maintenanceTasks.filter(t => t.status === 'pending').length;

    // Calculate monthly revenue from active contracts
    const monthlyRevenue = contracts
      .filter(c => c.status === 'Active')
      .reduce((total, contract) => total + contract.rent, 0);
    
    this.monthlyRevenue = `TZS ${monthlyRevenue.toLocaleString()}`;

    console.log('Dashboard stats loaded:', {
      properties: this.totalProperties,
      tenants: this.totalTenants,
      revenue: this.monthlyRevenue,
      maintenance: this.pendingMaintenance,
      contracts: this.activeContracts
    });
  }

  loadRecentActivities() {
    this.recentActivities = this.dataService.getRecentActivities();
    console.log('Recent activities loaded:', this.recentActivities);
  }

  loadUpcomingReminders() {
    this.upcomingReminders = this.dataService.getUpcomingReminders();
    console.log('Upcoming reminders loaded:', this.upcomingReminders);
  }

  getTimeAgo(timestamp: Date): string {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  }

  getDaysUntil(date: Date): string {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    return `${days} days`;
  }

  formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  async openAddProperty() {
    this.router.navigate(['/tabs/assets']);
  }

  async openAddTenant() {
    this.router.navigate(['/tabs/tenants']);
  }

  async openRecordPayment() {
    this.router.navigate(['/tabs/contracts']);
  }

  onActivityClick(activity: RecentActivity) {
    console.log('Activity clicked:', activity);
    switch (activity.type) {
      case 'payment':
      case 'overdue':
        this.router.navigate(['/tabs/rent-tracking']);
        break;
      case 'maintenance':
        this.router.navigate(['/tabs/maintenance']);
        break;
      case 'lease':
        this.router.navigate(['/tabs/contracts']);
        break;
    }
  }

  onReminderClick(reminder: UpcomingReminder) {
    console.log('Reminder clicked:', reminder);
    switch (reminder.type) {
      case 'lease':
        this.router.navigate(['/tabs/contracts']);
        break;
      case 'maintenance':
        this.router.navigate(['/tabs/maintenance']);
        break;
      case 'rent':
        this.router.navigate(['/tabs/rent-tracking']);
        break;
      case 'inspection':
        this.router.navigate(['/tabs/assets']);
        break;
    }
  }

  async logout() {
    const alert = await this.alertController.create({
      header: 'Logout',
      message: 'Are you sure you want to log out?',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Logout',
          handler: () => {
            localStorage.clear();
            this.router.navigate(['/login']);
          }
        }
      ]
    });
    await alert.present();
  }

  openSettings() {
    this.router.navigate(['/settings']);
  }

  openNotifications() {
    this.router.navigate(['/notifications']);
  }

  doRefresh(event: any) {     
    setTimeout(() => {
      this.loadRecentActivities();
      this.loadUpcomingReminders();
      this.loadDashboardStats();
      console.log('Dashboard data refreshed');
      event.target.complete();
    }, 1000);
  }

  async openProfile() {
    const modal = await this.modalController.create({
      component: ProfileImageModalComponent,
      cssClass: 'profile-image-modal',
      componentProps: {
        imageUrl: 'https://ionicframework.com/docs/img/demos/avatar.svg'
      }
    });
    return await modal.present();
  }
}

