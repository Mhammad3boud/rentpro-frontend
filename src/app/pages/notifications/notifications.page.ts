import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { NotificationsService, NotificationItem } from '../../services/notification.service';

@Component({
  selector: 'app-notifications',
  templateUrl: './notifications.page.html',
  styleUrls: ['./notifications.page.scss'],
  standalone: false
})
export class NotificationsPage implements OnInit {
  notifications: NotificationItem[] = [];
  isLoading = false;

  constructor(
    private location: Location,
    private router: Router,
    private toastController: ToastController,
    private notificationsService: NotificationsService
  ) {}

  ngOnInit() {
    this.loadNotifications();
  }

  loadNotifications() {
    this.isLoading = true;
    this.notificationsService.getAll().subscribe({
      next: (notifications) => {
        this.notifications = notifications;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading notifications:', error);
        this.isLoading = false;
        this.presentToast('Error loading notifications', 'danger');
      }
    });
  }

  doRefresh(event: any) {
    this.notificationsService.getAll().subscribe({
      next: (notifications) => {
        this.notifications = notifications;
        event.target.complete();
      },
      error: () => {
        event.target.complete();
        this.presentToast('Error refreshing notifications', 'danger');
      }
    });
  }

  goBack() {
    if (window.history.length > 1) {
      this.location.back();
    } else {
      this.router.navigate(['/dashboard']);
    }
  }

  markAllAsRead() {
    this.notificationsService.markAllAsRead().subscribe({
      next: () => {
        this.notifications = this.notifications.map(n => ({ ...n, isRead: true }));
        this.presentToast('All notifications marked as read', 'success');
      },
      error: (error) => {
        console.error('Error marking all as read:', error);
        this.presentToast('Error marking notifications as read', 'danger');
      }
    });
  }

  toggleRead(notif: NotificationItem) {
    if (!notif.isRead) {
      this.notificationsService.markAsRead(notif.id).subscribe({
        next: () => {
          notif.isRead = true;
        },
        error: (error) => {
          console.error('Error marking as read:', error);
        }
      });
    }
  }

  getTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
    return date.toLocaleDateString();
  }

  async presentToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }
}
