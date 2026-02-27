import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AlertController, IonicModule, ModalController, ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ProfileImageModalComponent } from '../../components/profile-image-modal/profile-image-modal.component';
import { DashboardService, OwnerDashboardResponse, TenantDashboardResponse } from '../../services/dashboard.service';
import { NotificationsService, NotificationItem } from '../../services/notification.service';
import { ActivityService, ActivityItem } from '../../services/activity.service';
import { UserService } from '../../services/user.service';
import { UserProfileService } from 'src/app/services/user-profile.service';
import { LeaseService } from '../../services/lease.service';
import { Lease, RiskLevel } from '../../models';
import { AiPredictionService, PredictionDashboardSummary } from '../../services/ai-prediction.service';

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
  private readonly listLimit = 5;
  userName: string = 'User';
  role: string = 'Property Owner';
  isTenant = false;
  notificationCount: number = 0;
  showAllRecentActivities = false;
  showAllUpcomingReminders = false;

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
  tenantDashboard?: TenantDashboardResponse;
  tenantLeases: Lease[] = [];
  predictionSummary: PredictionDashboardSummary | null = null;

  constructor(
    private router: Router,
    private modalController: ModalController,
    private alertController: AlertController,
    private toastController: ToastController,
    private dashboardService: DashboardService,
    private notificationsService: NotificationsService,
    private activityService: ActivityService,
    private userService: UserService,
    private userProfileService: UserProfileService,
    private leaseService: LeaseService,
    private aiPredictionService: AiPredictionService

  ) {
  }

  async loadUserProfile() {
    try {
      await this.userService.loadUserProfile();
      // Update local variables with loaded profile
      const profile = this.userService.getCurrentUser();

      if (profile) {
        this.userName = profile.fullName || 'User';
        this.role = profile.role === 'OWNER' ? 'Property Owner' : 'Tenant';
        this.isTenant = profile.role === 'TENANT';
        this.userProfile.email = profile.email || 'mohammed.aboud@rentpro.com';
        this.userProfile.phone = profile.phone || '+255 123 456 789';
        this.userProfile.profilePicture = profile.profilePicture || null;
      } else {
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
    this.loadTenantLeaseDetails();
    this.loadUnreadCount();
    this.loadRecentActivities();
    this.loadPredictionSummary();
  }

  ionViewWillEnter() {
    const profile = this.userService.getCurrentUser();
    if (profile) {
      this.userName = profile.fullName || this.userName || 'User';
      this.role = profile.role === 'OWNER' ? 'Property Owner' : 'Tenant';
      this.isTenant = profile.role === 'TENANT';
    }
  }

  loadDashboard() {
    if (this.isTenant) {
      this.dashboardService.getTenantDashboard().subscribe({
        next: (res) => {
          this.tenantDashboard = res;
          this.monthlyRevenue = `TZS ${Math.round(Number(res.totalOutstanding ?? 0)).toLocaleString()}`;
          this.pendingMaintenance = Number(res.maintenanceCount ?? 0);
          this.totalTenants = 0;
          this.buildTenantReminders(res);
        },
        error: async (err: any) => {
          console.error('Tenant dashboard loading error:', err);
          const toast = await this.toastController.create({
            message: err?.error?.message ?? 'Failed to load dashboard.',
            duration: 4000,
            position: 'top',
            color: 'danger'
          });
          await toast.present();
        }
      });
      return;
    }

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
      },
      error: async (err: any) => {
        console.error('Dashboard loading error:', err);
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

  loadTenantLeaseDetails() {
    if (!this.isTenant) {
      return;
    }

    this.leaseService.getTenantLeases().subscribe({
      next: (leases) => {
        this.tenantLeases = leases || [];
        if ((!this.userName || this.userName === 'User') && this.tenantLeases.length > 0) {
          const leaseTenantName = this.tenantLeases.find(l => l.tenant?.fullName)?.tenant?.fullName;
          if (leaseTenantName) {
            this.userName = leaseTenantName;
          }
        }
        this.activeContracts = this.activeTenantLeases.length;
        const propertyIds = this.tenantLeases
          .map(lease => lease.property?.propertyId || lease.propertyId)
          .filter((id): id is string => !!id);
        this.totalProperties = new Set(propertyIds).size;
        if (this.tenantDashboard) {
          this.buildTenantReminders(this.tenantDashboard);
        }
      },
      error: () => {
        this.tenantLeases = [];
        this.activeContracts = 0;
        this.totalProperties = 0;
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
        this.showAllRecentActivities = false;
      },
      error: () => {
        this.recentActivities = [];
        this.showAllRecentActivities = false;
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
    this.showAllUpcomingReminders = false;
  }

  private buildTenantReminders(dashboard: TenantDashboardResponse) {
    const reminders: UpcomingReminder[] = [];
    if (!this.hasActiveTenantLease) {
      this.upcomingReminders = reminders;
      this.showAllUpcomingReminders = false;
      return;
    }

    if (dashboard.overdueCount && Number(dashboard.overdueCount) > 0) {
      reminders.push({
        id: 'tenant-overdue',
        type: 'rent',
        title: 'Overdue Rent',
        description: `${dashboard.overdueCount} month(s) are overdue`,
        date: new Date(),
        icon: 'alert-circle-outline',
        iconColor: 'danger'
      });
    }

    if (dashboard.nextDueDate) {
      reminders.push({
        id: 'tenant-next-due',
        type: 'rent',
        title: 'Next Rent Due',
        description: `Next due date: ${dashboard.nextDueDate}`,
        date: new Date(dashboard.nextDueDate),
        icon: 'calendar-outline',
        iconColor: 'primary'
      });
    }

    this.upcomingReminders = reminders;
    this.showAllUpcomingReminders = false;
  }

  get visibleRecentActivities(): RecentActivity[] {
    return this.showAllRecentActivities
      ? this.recentActivities
      : this.recentActivities.slice(0, this.listLimit);
  }

  get visibleUpcomingReminders(): UpcomingReminder[] {
    return this.showAllUpcomingReminders
      ? this.upcomingReminders
      : this.upcomingReminders.slice(0, this.listLimit);
  }

  get canShowMoreRecentActivities(): boolean {
    return this.recentActivities.length > this.listLimit;
  }

  get canShowMoreUpcomingReminders(): boolean {
    return this.upcomingReminders.length > this.listLimit;
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
    this.loadPredictionSummary(true);
    setTimeout(() => event.target.complete(), 600);
  }

  loadPredictionSummary(forceRefresh = false) {
    const role: 'OWNER' | 'TENANT' = this.isTenant ? 'TENANT' : 'OWNER';
    this.aiPredictionService.getDashboardSummary(role, forceRefresh).subscribe({
      next: (summary) => {
        this.predictionSummary = summary;
      },
      error: () => {
        this.predictionSummary = null;
      }
    });
  }

  openAnalytics() {
    this.router.navigate(['/tabs/analytics']);
  }

  predictionRiskColor(level: RiskLevel): 'success' | 'warning' | 'danger' {
    if (level === 'HIGH') {
      return 'danger';
    }
    if (level === 'MEDIUM') {
      return 'warning';
    }
    return 'success';
  }

  predictionScorePercent(score: number): number {
    const raw = Number(score ?? 0);
    const normalized = raw > 1 ? raw / 100 : raw;
    return Math.max(0, Math.min(100, Math.round(normalized * 100)));
  }

  openSettings() { this.router.navigate(['/settings']); }
  openNotifications() { this.router.navigate(['/notifications']); }
  openAddProperty() { this.router.navigate([this.isTenant ? '/tabs/contracts' : '/tabs/assets']); }
  async openAddTenant() {
    if (this.isTenant && !this.hasActiveTenantLease) {
      const toast = await this.toastController.create({
        message: 'Your lease is terminated or expired. New maintenance requests are disabled.',
        duration: 2800,
        position: 'top',
        color: 'warning'
      });
      await toast.present();
      return;
    }
    this.router.navigate([this.isTenant ? '/tabs/maintenance' : '/tabs/tenants']);
  }
  openRecordPayment() { this.router.navigate(['/tabs/rent-tracking']); }

  get activeTenantLeases(): Lease[] {
    return this.tenantLeases.filter(lease => (lease.leaseStatus || '').toUpperCase() === 'ACTIVE');
  }

  get formerTenantLeases(): Lease[] {
    return this.tenantLeases.filter(lease => {
      const status = (lease.leaseStatus || '').toUpperCase();
      return status === 'TERMINATED' || status === 'EXPIRED';
    });
  }

  get hasActiveTenantLease(): boolean {
    return this.activeTenantLeases.length > 0;
  }

  leaseStatusColor(status?: string): 'success' | 'warning' | 'medium' {
    const normalized = (status || '').toUpperCase();
    if (normalized === 'ACTIVE') {
      return 'success';
    }
    if (normalized === 'EXPIRED') {
      return 'warning';
    }
    return 'medium';
  }

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
