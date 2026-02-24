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
      console.log('Calling getUserProfile API...');
      const profile = await firstValueFrom(this.userProfileService.getUserProfile());
      console.log('API response:', profile);
      this.userProfile = profile ?? null;

      const storage = localStorage.getItem('token') ? localStorage : sessionStorage;
      if (this.userProfile) {
        console.log('Setting profile data to storage:', this.userProfile);
        storage.setItem('userId', this.userProfile.userId);
        storage.setItem('email', this.userProfile.email);
        storage.setItem('role', this.userProfile.role);
        if (this.userProfile.fullName) storage.setItem('userName', this.userProfile.fullName);
        if (this.userProfile.phone) storage.setItem('userPhone', this.userProfile.phone);
      } else {
        console.log('No profile data from API');
      }
    } catch (e) {
      console.error('Failed to load user profile', e);
    }
  }

  getCurrentUser(): CurrentUser | null {
    console.log('getCurrentUser called, userProfile:', this.userProfile);
    
    if (this.userProfile) {
      const result = { ...this.userProfile };
      console.log('Returning from userProfile:', result);
      return result;
    }

    const email = localStorage.getItem('email') || sessionStorage.getItem('email');
    const userId = localStorage.getItem('userId') || sessionStorage.getItem('userId');
    const role = (localStorage.getItem('role') || sessionStorage.getItem('role')) as Role;
    const fullName = localStorage.getItem('userName') || sessionStorage.getItem('userName') || '';
    const phone = localStorage.getItem('userPhone') || sessionStorage.getItem('userPhone') || '';

    console.log('Storage data - email:', email, 'userId:', userId, 'role:', role, 'fullName:', fullName);

    if (!email || !userId || !role) {
      console.log('Missing required storage data, returning null');
      return null;
    }
    
    const result = { userId, email, role, fullName, phone };
    console.log('Returning from storage:', result);
    return result;
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
