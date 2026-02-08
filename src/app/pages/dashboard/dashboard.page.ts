import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AlertController, IonicModule, ModalController, ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ProfileImageModalComponent } from '../../components/profile-image-modal/profile-image-modal.component';
import { DashboardService, OwnerDashboardResponse } from '../../services/dashboard.service';
import { NotificationsService, NotificationItem } from '../../services/notification.service';

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
  userName: string = 'MOHAMMED ABOUD HUSSEIN';
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

  totalProperties: number = 0; // backend dashboard doesn't provide this (keep 0 or add endpoint later)
  totalTenants: number = 0;    // backend dashboard doesn't provide this (keep 0 or add endpoint later)

  monthlyRevenue: string = 'TZS 0';
  pendingMaintenance: number = 0;
  activeContracts: number = 2; // backend dashboard doesn't provide this (keep 0 or add endpoint later)

  // date range for backend dashboard
  from = '2026-02';
  to = '2026-06';

  private dashboard?: OwnerDashboardResponse;

  constructor(
    private router: Router,
    private alertController: AlertController,
    private modalController: ModalController,
    private toastController: ToastController,
    private dashboardService: DashboardService,
    private notificationsService: NotificationsService
  ) { }

  ngOnInit() {
    this.loadDashboard();
    this.loadUnreadCount();
  }

  loadDashboard() {
    this.dashboardService.getOwnerDashboard(this.from, this.to).subscribe({
      next: (res) => {
        this.dashboard = res;

        // 1) Monthly Revenue card (use average paid per month)
        const monthsCount = Math.max(res.summary.months?.length ?? 0, 1);
        const avgPaid = Number(res.summary.totalPaid ?? 0) / monthsCount;
        this.monthlyRevenue = `TZS ${Math.round(avgPaid).toLocaleString()}`;

        // 2) Pending Tasks card (open + inProgress)
        this.pendingMaintenance =
          Number(res.maintenance?.open ?? 0) + Number(res.maintenance?.inProgress ?? 0);

        // 3) Recent Activities list (from attentionInvoices + maintenance status summary)
        const invoiceActivities: RecentActivity[] = (res.attentionInvoices ?? []).map(inv => ({
          id: `inv-${inv.invoiceId}`,
          type: 'overdue',
          title: `Invoice ${inv.period} (${inv.status})`,
          description: `Remaining TZS ${Number(inv.remaining ?? 0).toLocaleString()} • Due ${inv.dueDate}`,
          timestamp: new Date(inv.dueDate),
          icon: 'alert-circle-outline',
          iconColor: inv.status === 'OVERDUE' ? 'danger' : 'warning'
        }));

        const maintenanceActivity: RecentActivity[] = [{
          id: 'maint-summary',
          type: 'maintenance',
          title: 'Maintenance status',
          description: `Open ${res.maintenance.open}, In-Progress ${res.maintenance.inProgress}, High Priority ${res.maintenance.highPriorityOpen}`,
          timestamp: new Date(),
          icon: 'build-outline',
          iconColor: (res.maintenance.highPriorityOpen ?? 0) > 0 ? 'danger' : 'primary'
        }];

        this.recentActivities = [...invoiceActivities, ...maintenanceActivity]
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
          .slice(0, 10);

        // 4) Upcoming Reminders (next due dates from attention invoices)
        const reminders: UpcomingReminder[] = (res.attentionInvoices ?? [])
          .map((inv) => ({
            id: `rem-inv-${inv.invoiceId}`,
            type: 'rent' as const, 
            title: `Rent due (${inv.period})`,
            description: `Remaining TZS ${Number(inv.remaining ?? 0).toLocaleString()} • ${inv.status}`,
            date: new Date(inv.dueDate),
            icon: 'calendar-outline',
            iconColor: (inv.status === 'OVERDUE' ? 'danger' : 'warning') as ('danger' | 'warning'),
          }))
          .sort((a, b) => a.date.getTime() - b.date.getTime())
          .slice(0, 8);

        this.upcomingReminders = reminders;

      },
      error: async (err: any) => {
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

  loadUnreadCount() {
    this.notificationsService.getUnread().subscribe({
      next: (list: NotificationItem[]) => (this.notificationCount = list.length),
      error: () => (this.notificationCount = 0)
    });
  }

  // your existing helpers still work
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
    setTimeout(() => event.target.complete(), 600);
  }

  // keep your existing nav actions
  openSettings() { this.router.navigate(['/settings']); }
  openNotifications() { this.router.navigate(['/notifications']); }
  openAddProperty() { this.router.navigate(['/tabs/assets']); }
  openAddTenant() { this.router.navigate(['/tabs/tenants']); }
  openRecordPayment() { this.router.navigate(['/tabs/contracts']); }

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

  async openProfile() {
    const modal = await this.modalController.create({
      component: ProfileImageModalComponent,
      cssClass: 'profile-image-modal',
      componentProps: { imageUrl: 'https://ionicframework.com/docs/img/demos/avatar.svg' }
    });
    return await modal.present();
  }
}
