import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UserProfile, UpdateProfileRequest, ChangePasswordRequest } from '../models';

@Injectable({ providedIn: 'root' })
export class UserProfileService {
  private readonly baseUrl = 'http://localhost:8083/api';

  constructor(private http: HttpClient) {}

  getUserProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.baseUrl}/users/me`);
  }

  updateProfile(profile: UpdateProfileRequest): Observable<UserProfile> {
    return this.http.put<UserProfile>(`${this.baseUrl}/users/me`, profile);
  }

  changePassword(request: ChangePasswordRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/users/me/password`, request);
  }

  uploadProfilePicture(file: File): Observable<{ message: string; profilePicture: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ message: string; profilePicture: string }>(
      `${this.baseUrl}/users/me/profile-picture`,
      formData
    );
  }

  deleteProfilePicture(): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/users/me/profile-picture`);
  }

  getProfilePictureUrl(path: string | null | undefined): string {
    if (!path) {
      return 'assets/img/no_avatar.png';
    }
    if (path.startsWith('http')) {
      return path;
    }
    return `http://localhost:8083${path}`;
  }
}
