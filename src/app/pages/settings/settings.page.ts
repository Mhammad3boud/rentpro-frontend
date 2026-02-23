import { Component, OnInit } from '@angular/core';
import { AlertController, LoadingController, ToastController, ActionSheetController, Platform, ModalController } from '@ionic/angular';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { UserProfileService } from '../../services/user-profile.service';
import { UserProfile } from '../../models';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
  standalone: false
})
export class SettingsPage implements OnInit {
  darkMode = false;
  userProfile: UserProfile | null = null;
  isLoading = true;

  // Notification settings
  notificationEmail = true;
  notificationPush = true;

  constructor(
    private alertController: AlertController,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private actionSheetCtrl: ActionSheetController,
    private modalController: ModalController,
    private router: Router,
    private location: Location,
    private platform: Platform,
    private userProfileService: UserProfileService
  ) {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      this.darkMode = savedTheme === 'dark';
      document.body.classList.toggle('dark', this.darkMode);
    } else {
      this.darkMode = document.body.classList.contains('dark');
    }
  }

  async ngOnInit() {
    await this.loadUserProfile();
  }

  async loadUserProfile() {
    this.isLoading = true;
    try {
      this.userProfile = await firstValueFrom(this.userProfileService.getUserProfile());
      this.notificationEmail = this.userProfile?.notificationEmail ?? true;
      this.notificationPush = this.userProfile?.notificationPush ?? true;
    } catch (error) {
      console.error('Failed to load user profile:', error);
      this.showToast('Failed to load profile');
    } finally {
      this.isLoading = false;
    }
  }

  getProfilePictureUrl(): string {
    return this.userProfileService.getProfilePictureUrl(this.userProfile?.profilePicture);
  }

  toggleDarkMode() {
    document.body.classList.toggle('dark', this.darkMode);
    localStorage.setItem('theme', this.darkMode ? 'dark' : 'light');
  }

  async toggleNotificationEmail() {
    await this.updateNotificationSettings();
  }

  async toggleNotificationPush() {
    await this.updateNotificationSettings();
  }

  async updateNotificationSettings() {
    try {
      await firstValueFrom(this.userProfileService.updateProfile({
        notificationEmail: this.notificationEmail,
        notificationPush: this.notificationPush
      }));
    } catch (error) {
      console.error('Failed to update notification settings:', error);
      this.showToast('Failed to update settings');
    }
  }

  goBack() {
    if (window.history.length > 1) {
      this.location.back();
    } else {
      this.router.navigate(['/dashboard']);
    }
  }

  async changePassword() {
    const alert = await this.alertController.create({
      header: 'Change Password',
      inputs: [
        {
          name: 'currentPassword',
          type: 'password',
          placeholder: 'Current Password',
        },
        {
          name: 'newPassword',
          type: 'password',
          placeholder: 'New Password',
        },
        {
          name: 'confirmPassword',
          type: 'password',
          placeholder: 'Confirm New Password',
        },
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'Save',
          handler: async (data) => {
            if (!data.currentPassword || !data.newPassword || !data.confirmPassword) {
              this.showToast('Please fill in all fields');
              return false;
            }
            
            if (data.newPassword !== data.confirmPassword) {
              this.showToast('New passwords do not match');
              return false;
            }
            
            // Here you would typically call your authentication service
            // to update the password
            const loading = await this.loadingController.create({
              message: 'Updating password...',
            });
            await loading.present();
            
            try {
              await firstValueFrom(this.userProfileService.changePassword({
                currentPassword: data.currentPassword,
                newPassword: data.newPassword
              }));
              
              this.showToast('Password updated successfully', 'success');
              return true;
            } catch (error: any) {
              const errorMsg = error?.error?.error || 'Failed to update password. Please try again.';
              this.showToast(errorMsg);
              return false;
            } finally {
              await loading.dismiss();
            }
          },
        },
      ],
    });

    await alert.present();
  }

  async changeProfilePicture() {
    if (this.platform.is('mobile')) {
      const actionSheet = await this.actionSheetCtrl.create({
        header: 'Select Image Source',
        buttons: [
          {
            text: 'Take Photo',
            icon: 'camera',
            handler: () => this.triggerFileInput('camera')
          },
          {
            text: 'Choose from Gallery',
            icon: 'image',
            handler: () => this.triggerFileInput('gallery')
          },
          {
            text: 'Remove Photo',
            icon: 'trash',
            role: 'destructive',
            handler: () => this.removeProfilePicture()
          },
          {
            text: 'Cancel',
            icon: 'close',
            role: 'cancel'
          }
        ]
      });
      
      await actionSheet.present();
    } else {
      // For web, show action sheet with options
      const actionSheet = await this.actionSheetCtrl.create({
        header: 'Profile Picture',
        buttons: [
          {
            text: 'Choose from Gallery',
            icon: 'image',
            handler: () => this.triggerFileInput('gallery')
          },
          {
            text: 'Remove Photo',
            icon: 'trash',
            role: 'destructive',
            handler: () => this.removeProfilePicture()
          },
          {
            text: 'Cancel',
            icon: 'close',
            role: 'cancel'
          }
        ]
      });
      await actionSheet.present();
    }
  }

  triggerFileInput(source: 'camera' | 'gallery') {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    if (source === 'camera') {
      input.capture = 'camera';
    }
    
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file) {
        this.uploadProfilePicture(file);
      }
    };
    
    input.click();
  }

  private async uploadProfilePicture(file: File) {
    const loading = await this.loadingController.create({
      message: 'Uploading picture...',
    });
    await loading.present();

    try {
      const response = await firstValueFrom(this.userProfileService.uploadProfilePicture(file));
      if (this.userProfile) {
        this.userProfile.profilePicture = response.profilePicture;
      }
      this.showToast('Profile picture updated', 'success');
    } catch (error: any) {
      console.error('Failed to upload profile picture:', error);
      const errorMsg = error?.error?.error || 'Failed to upload picture';
      this.showToast(errorMsg);
    } finally {
      await loading.dismiss();
    }
  }

  private async removeProfilePicture() {
    const loading = await this.loadingController.create({
      message: 'Removing picture...',
    });
    await loading.present();

    try {
      await firstValueFrom(this.userProfileService.deleteProfilePicture());
      if (this.userProfile) {
        this.userProfile.profilePicture = undefined;
      }
      this.showToast('Profile picture removed', 'success');
    } catch (error: any) {
      console.error('Failed to remove profile picture:', error);
      this.showToast('Failed to remove picture');
    } finally {
      await loading.dismiss();
    }
  }

  async editProfile() {
    const alert = await this.alertController.create({
      header: 'Edit Profile',
      inputs: [
        {
          name: 'fullName',
          type: 'text',
          placeholder: 'Full Name',
          value: this.userProfile?.fullName || '',
        },
        {
          name: 'phone',
          type: 'tel',
          placeholder: 'Phone Number',
          value: this.userProfile?.phone || '',
        },
        {
          name: 'address',
          type: 'text',
          placeholder: 'Address',
          value: this.userProfile?.address || '',
        },
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'Save',
          handler: async (data) => {
            const loading = await this.loadingController.create({
              message: 'Saving...',
            });
            await loading.present();

            try {
              const updated = await firstValueFrom(this.userProfileService.updateProfile({
                fullName: data.fullName,
                phone: data.phone,
                address: data.address
              }));
              this.userProfile = updated;
              this.showToast('Profile updated', 'success');
              return true;
            } catch (error) {
              this.showToast('Failed to update profile');
              return false;
            } finally {
              await loading.dismiss();
            }
          },
        },
      ],
    });

    await alert.present();
  }

  private async showToast(message: string, color: string = 'danger') {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      color: color,
      position: 'top'
    });
    await toast.present();
  }

  async logout() {
    const alert = await this.alertController.create({
      header: 'Logout',
      message: 'Are you sure you want to log out?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Logout',
          handler: () => {
            const theme = localStorage.getItem('theme');
            localStorage.clear();
            sessionStorage.clear();
            if (theme) {
              localStorage.setItem('theme', theme);
            }
            this.router.navigate(['/login']);
          }
        }
      ]
    });

    await alert.present();
  }
}
