import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { UserProfileService } from './user-profile.service';
import { UserProfile, Role } from '../models';

export type CurrentUser = UserProfile;

@Injectable({ providedIn: 'root' })
export class UserService {
  private userProfile: UserProfile | null = null;

  constructor(private userProfileService: UserProfileService) {}

  async loadUserProfile(): Promise<void> {
    try {
      const profile = await firstValueFrom(this.userProfileService.getUserProfile());
      if (profile) {
        this.setCurrentUserProfile(profile);
      } else {
        this.userProfile = null;
      }
    } catch (e) {
      console.error('Failed to load user profile', e);
    }
  }

  setCurrentUserProfile(profile: UserProfile): void {
    this.userProfile = profile;

    const storage = localStorage.getItem('token') ? localStorage : sessionStorage;
    storage.setItem('userId', profile.userId);
    storage.setItem('email', profile.email);
    storage.setItem('role', profile.role);
    if (profile.fullName) storage.setItem('userName', profile.fullName);
    if (profile.phone) storage.setItem('userPhone', profile.phone);
  }

  getCurrentUser(): CurrentUser | null {
    if (this.userProfile) {
      return { ...this.userProfile };
    }

    const email = localStorage.getItem('email') || sessionStorage.getItem('email');
    const userId = localStorage.getItem('userId') || sessionStorage.getItem('userId');
    const role = (localStorage.getItem('role') || sessionStorage.getItem('role')) as Role;
    const fullName = localStorage.getItem('userName') || sessionStorage.getItem('userName') || '';
    const phone = localStorage.getItem('userPhone') || sessionStorage.getItem('userPhone') || '';

    if (!email || !userId || !role) {
      return null;
    }
    
    return { userId, email, role, fullName, phone };
  }

  getCurrentUserName(): string {
    return this.userProfile?.fullName
      ?? localStorage.getItem('userName')
      ?? sessionStorage.getItem('userName')
      ?? 'User';
  }

  getCurrentUserEmail(): string {
    return this.userProfile?.email
      ?? localStorage.getItem('email')
      ?? sessionStorage.getItem('email')
      ?? '';
  }

  getCurrentUserPhone(): string {
    return this.userProfile?.phone
      ?? localStorage.getItem('userPhone')
      ?? sessionStorage.getItem('userPhone')
      ?? '';
  }

  isOwner(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'OWNER';
  }

  isTenant(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'TENANT';
  }
}
