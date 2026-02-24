import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ActivityItem {
  activityId: string;
  type: string;
  title: string;
  description: string;
  entityType?: string;
  entityId?: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class ActivityService {
  private readonly baseUrl = 'http://localhost:8083/api';

  constructor(private http: HttpClient) {}

  getRecentActivities(): Observable<ActivityItem[]> {
    return this.http.get<ActivityItem[]>(`${this.baseUrl}/activities`);
  }

  getAllActivities(): Observable<ActivityItem[]> {
    return this.http.get<ActivityItem[]>(`${this.baseUrl}/activities/all`);
  }
}