import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AlertController, IonicModule, ModalController, ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ProfileImageModalComponent } from '../../components/profile-image-modal/profile-image-modal.component';
import { DashboardService, OwnerDashboardResponse } from '../../services/dashboard.service';
import { NotificationsService, NotificationItem } from '../../services/notification.service';
import { ActivityService, ActivityItem } from '../../services/activity.service';
import { UserService } from '../../services/user.service';
import { UserProfileService } from 'src/app/services/user-profile.service';

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
  imports: [IonicModule, CommonModule, FormsModule, RouterModule]
})
export class DashboardPage implements OnInit {
  userName: string = 'User';
  role: string = 'Property Owner';
  notificationCount: number = 0;

  recentActivities: RecentActivity[] = [];
  upcomingReminders: UpcomingReminder[] = [];

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
  activeContracts: number = 2;

  from = '2026-02';
  to = '2026-06';

  private dashboard?: OwnerDashboardResponse;

  constructor(
    private router: Router,
    private modalController: ModalController,
    private alertController: AlertController,
    private toastController: ToastController,
    private dashboardService: DashboardService,
    private notificationsService: NotificationsService,
    private activityService: ActivityService,
    private userService: UserService,
    private userProfileService: UserProfileService

  ) {
  }

  async loadUserProfile() {
    console.log('Loading user profile...');
    try {
      await this.userService.loadUserProfile();
      // Update local variables with loaded profile
      const profile = this.userService.getCurrentUser();
      console.log('Profile loaded:', profile);
      console.log('Profile fullName:', profile?.fullName);
      console.log('Profile role:', profile?.role);
      console.log('Profile email:', profile?.email);

      if (profile) {
        this.userName = profile.fullName || 'User';
        this.role = profile.role === 'OWNER' ? 'Property Owner' : 'Tenant';
        this.userProfile.email = profile.email || 'mohammed.aboud@rentpro.com';
        this.userProfile.phone = profile.phone || '+255 123 456 789';
        this.userProfile.profilePicture = profile.profilePicture || null;
        console.log('Updated userName:', this.userName);
        console.log('Updated role:', this.role);
        console.log('Updated profilePicture:', this.userProfile.profilePicture);
      } else {
        console.log('No profile found, using fallback values');
        this.userName = 'User';
        this.role = 'Property Owner';
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      // Fallback values
      this.userName = 'User';
      this.role = 'Property Owner';
    }
  }

  async ngOnInit() {
    await this.loadUserProfile();
    this.loadDashboard();
    this.loadUnreadCount();
    this.loadRecentActivities();
  }

  loadDashboard() {
    this.dashboardService.getOwnerDashboard().subscribe({
      next: (res) => {
        this.dashboard = res;

        // Update dashboard metrics with new response structure
        this.monthlyRevenue = `TZS ${Math.round(Number(res.monthlyRevenue ?? 0)).toLocaleString()}`;
        this.pendingMaintenance = Number(res.maintenancePending ?? 0);
        this.activeContracts = Number(res.activeLeases ?? 0);

        // Use real counts from backend instead of separate API calls
        this.totalProperties = Number(res.totalProperties ?? 0);
        this.totalTenants = Number(res.totalTenants ?? 0);

        // Build reminders from dashboard data
        this.buildReminders(res);

        console.log('Dashboard data loaded:', res);
      },
      error: async (err: any) => {
        console.error('Dashboard loading error:', err);
        // Set fallback values
        this.monthlyRevenue = 'TZS 0';
        this.pendingMaintenance = 0;
        this.activeContracts = 0;
        this.totalProperties = 0;
        this.totalTenants = 0;

        const toast = await this.toastController.create({
          message: err?.error?.message ?? 'Failed to load dashboard.',
          duration: 4000,
          position: 'top',
          color: 'danger'
        });
        await toast.present();
      }
    });
  }

  getProfilePictureUrl(): string {
    return this.userProfileService.getProfilePictureUrl(this.userProfile?.profilePicture);
  }

  loadRecentActivities() {
    this.activityService.getRecentActivities().subscribe({
      next: (activities: ActivityItem[]) => {
        // Convert activities to recent activities format
        this.recentActivities = activities.map(a => this.activityToRecentActivity(a));
      },
      error: () => {
        this.recentActivities = [];
      }
    });
  }

  private activityToRecentActivity(a: ActivityItem): RecentActivity {
    // Map activity type to display type and colors
    let type: 'payment' | 'maintenance' | 'lease' | 'overdue' = 'lease';
    let icon = 'notifications-outline';
    let iconColor: 'success' | 'primary' | 'warning' | 'danger' = 'primary';

    const actType = a.type?.toUpperCase() || '';
    if (actType.includes('PAYMENT')) {
      type = 'payment';
      icon = 'cash-outline';
      iconColor = 'success';
    } else if (actType.includes('MAINTENANCE')) {
      type = 'maintenance';
      icon = 'construct-outline';
      iconColor = 'warning';
    } else if (actType.includes('LEASE') || actType.includes('TENANT')) {
      type = 'lease';
      icon = 'document-text-outline';
      iconColor = 'primary';
    } else if (actType.includes('OVERDUE')) {
      type = 'overdue';
      icon = 'alert-circle-outline';
      iconColor = 'danger';
    } else if (actType.includes('PROPERTY')) {
      type = 'lease';
      icon = 'home-outline';
      iconColor = 'primary';
    }

    return {
      id: a.activityId,
      type,
      title: a.title,
      description: a.description,
      timestamp: new Date(a.createdAt),
      icon,
      iconColor
    };
  }

  private buildReminders(dashboard: OwnerDashboardResponse) {
    const reminders: UpcomingReminder[] = [];

    // Add reminder for pending maintenance
    if (dashboard.maintenancePending && Number(dashboard.maintenancePending) > 0) {
      reminders.push({
        id: 'maintenance-pending',
        type: 'maintenance',
        title: 'Pending Maintenance',
        description: `${dashboard.maintenancePending} maintenance request(s) need attention`,
        date: new Date(),
        icon: 'construct-outline',
        iconColor: 'warning'
      });
    }

    // Add reminder for overdue payments
    if (dashboard.overdueCount && Number(dashboard.overdueCount) > 0) {
      reminders.push({
        id: 'payments-overdue',
        type: 'rent',
        title: 'Overdue Payments',
        description: `${dashboard.overdueCount} payment(s) are overdue`,
        date: new Date(),
        icon: 'alert-circle-outline',
        iconColor: 'danger'
      });
    }

    // Add reminder for partial payments
    if (dashboard.partialCount && Number(dashboard.partialCount) > 0) {
      reminders.push({
        id: 'payments-partial',
        type: 'rent',
        title: 'Partial Payments',
        description: `${dashboard.partialCount} payment(s) are partially paid`,
        date: new Date(),
        icon: 'cash-outline',
        iconColor: 'warning'
      });
    }

    // Add reminder for pending payments
    if (dashboard.pendingCount && Number(dashboard.pendingCount) > 0) {
      reminders.push({
        id: 'payments-pending',
        type: 'rent',
        title: 'Pending Payments',
        description: `${dashboard.pendingCount} payment(s) awaiting collection`,
        date: new Date(),
        icon: 'time-outline',
        iconColor: 'primary'
      });
    }

    this.upcomingReminders = reminders;
  }

  loadUnreadCount() {
    this.notificationsService.getUnread().subscribe({
      next: (list: NotificationItem[]) => (this.notificationCount = list.length),
      error: () => (this.notificationCount = 0)
    });
  }

  getTimeAgo(timestamp: Date): string {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return 'Just now';
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

  doRefresh(event: any) {
    this.loadDashboard();
    this.loadUnreadCount();
    this.loadRecentActivities();
    setTimeout(() => event.target.complete(), 600);
  }

  openSettings() { this.router.navigate(['/settings']); }
  openNotifications() { this.router.navigate(['/notifications']); }
  openAddProperty() { this.router.navigate(['/tabs/assets']); }
  openAddTenant() { this.router.navigate(['/tabs/tenants']); }
  openRecordPayment() { this.router.navigate(['/tabs/rent-tracking']); }

  onActivityClick(activity: RecentActivity) {
    switch (activity.type) {
      case 'payment':
      case 'overdue':
        this.router.navigate(['/tabs/rent-tracking']); break;
      case 'maintenance':
        this.router.navigate(['/tabs/maintenance']); break;
      case 'lease':
        this.router.navigate(['/tabs/contracts']); break;
    }
  }

  onReminderClick(reminder: UpcomingReminder) {
    switch (reminder.type) {
      case 'lease': this.router.navigate(['/tabs/contracts']); break;
      case 'maintenance': this.router.navigate(['/tabs/maintenance']); break;
      case 'rent': this.router.navigate(['/tabs/rent-tracking']); break;
      case 'inspection': this.router.navigate(['/tabs/assets']); break;
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
            sessionStorage.clear();
            this.router.navigate(['/login']);
          }
        }
      ]
    });
    await alert.present();
  }

}
