import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface NotificationItem {
  id: number;
  type: string;
  title: string;
  message: string;
  entityType?: string;
  entityId?: number;
  isRead: boolean;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly baseUrl = 'http://localhost:8082';

  constructor(private http: HttpClient) {}

  getUnread(): Observable<NotificationItem[]> {
    return this.http.get<NotificationItem[]>(`${this.baseUrl}/notifications/unread`);
  }
}
