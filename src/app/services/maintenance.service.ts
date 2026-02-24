import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  MaintenanceRequest as MaintenanceRequestModel,
  MaintenanceRequestWithDetails,
  CreateMaintenanceRequest,
  UpdateMaintenanceStatusRequest,
  MaintenancePriority,
  MaintenanceStatus
} from '../models';

/**
 * Photo associated with a maintenance request
 */
export interface MaintenancePhoto {
  photoId: string;
  imageUrl: string;
}

/**
 * Extended MaintenanceRequest with backwards compatible field names
 */
export interface MaintenanceRequest extends MaintenanceRequestModel {
  // Legacy field names for backward compatibility
  id?: string;
  createdAt?: string;
  updatedAt?: string;
  propertyName?: string;
  photos?: MaintenancePhoto[];
}

// Re-export for backwards compatibility
export type { CreateMaintenanceRequest, UpdateMaintenanceStatusRequest };

/**
 * Maps backend MaintenanceRequest to include legacy field names
 */
function mapToLegacy(r: MaintenanceRequestModel): MaintenanceRequest {
  return {
    ...r,
    id: r.requestId,
    createdAt: r.reportedAt,
    updatedAt: r.resolvedAt,
    propertyName: '' // Would need to be populated from related data
  } as MaintenanceRequest;
}

@Injectable({
  providedIn: 'root'
})
export class MaintenanceService {
  private readonly baseUrl = 'http://localhost:8083';

  constructor(private http: HttpClient) {}

  // Create maintenance request
  createRequest(request: CreateMaintenanceRequest): Observable<MaintenanceRequest> {
    return this.http.post<MaintenanceRequestModel>(`${this.baseUrl}/maintenance/requests`, request).pipe(
      map(mapToLegacy)
    );
  }

  // Get current user's maintenance requests (for tenants)
  getMyRequests(): Observable<MaintenanceRequest[]> {
    return this.http.get<MaintenanceRequestModel[]>(`${this.baseUrl}/maintenance/my-requests`).pipe(
      map(requests => requests.map(mapToLegacy))
    );
  }

  // Get all maintenance requests for properties owned by current user (for owners)
  getPropertyRequests(): Observable<MaintenanceRequest[]> {
    return this.http.get<MaintenanceRequestModel[]>(`${this.baseUrl}/maintenance/property-requests`).pipe(
      map(requests => requests.map(mapToLegacy))
    );
  }

  // Update maintenance request status
  updateRequestStatus(requestId: string, request: UpdateMaintenanceStatusRequest): Observable<MaintenanceRequest> {
    return this.http.put<MaintenanceRequestModel>(`${this.baseUrl}/maintenance/requests/${requestId}/status`, request).pipe(
      map(mapToLegacy)
    );
  }

  // Get specific maintenance request by ID
  getRequestById(requestId: string): Observable<MaintenanceRequest> {
    return this.http.get<MaintenanceRequestModel>(`${this.baseUrl}/maintenance/requests/${requestId}`).pipe(
      map(mapToLegacy)
    );
  }

  // Delete maintenance request
  deleteRequest(requestId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/maintenance/requests/${requestId}`);
  }

  // Upload photo for maintenance request
  uploadPhoto(requestId: string, file: File): Observable<MaintenancePhoto> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<MaintenancePhoto>(`${this.baseUrl}/maintenance/requests/${requestId}/photos`, formData);
  }

  // Get photos for maintenance request
  getPhotos(requestId: string): Observable<MaintenancePhoto[]> {
    return this.http.get<MaintenancePhoto[]>(`${this.baseUrl}/maintenance/requests/${requestId}/photos`);
  }

  // Delete photo
  deletePhoto(photoId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/maintenance/photos/${photoId}`);
  }

  // Get photo URL with full path
  getPhotoUrl(imageUrl: string): string {
    if (imageUrl.startsWith('http')) {
      return imageUrl;
    }
    return `${this.baseUrl}${imageUrl}`;
  }
}