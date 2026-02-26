import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Notification, NotificationType } from '../models';

/**
 * @deprecated Use Notification from models instead
 */
export interface NotificationItem {
  id: string;
  notificationId?: string;
  type: string;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  isRead: boolean;
  createdAt: string;
}

// Re-export for backward compat
export { NotificationType };

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly baseUrl = 'http://localhost:8083/api';

  constructor(private http: HttpClient) {}

  /**
   * Maps Notification to NotificationItem for backward compatibility
   */
  private mapToNotificationItem(n: Notification): NotificationItem {
    return {
      id: n.notificationId,
      notificationId: n.notificationId,
      type: n.type,
      title: n.title || '',
      message: n.message || '',
      entityType: n.entityType,
      entityId: n.entityId,
      isRead: n.isRead,
      createdAt: n.createdAt
    };
  }

  getAll(): Observable<NotificationItem[]> {
    return this.http.get<Notification[]>(`${this.baseUrl}/notifications`).pipe(
      map(notifications => notifications.map(n => this.mapToNotificationItem(n)))
    );
  }

  getUnread(): Observable<NotificationItem[]> {
    return this.http.get<Notification[]>(`${this.baseUrl}/notifications/unread`).pipe(
      map(notifications => notifications.map(n => this.mapToNotificationItem(n)))
    );
  }

  /**
   * Returns raw Notification[] from backend (new format)
   */
  getAllRaw(): Observable<Notification[]> {
    return this.http.get<Notification[]>(`${this.baseUrl}/notifications`);
  }

  getUnreadCount(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.baseUrl}/notifications/unread/count`);
  }

  markAsRead(notificationId: string): Observable<Notification> {
    return this.http.put<Notification>(`${this.baseUrl}/notifications/${notificationId}/read`, {});
  }

  markAllAsRead(): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/notifications/read-all`, {});
  }
}
