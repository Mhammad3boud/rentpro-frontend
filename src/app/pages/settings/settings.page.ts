import { Component, ViewChild, ElementRef } from '@angular/core';
import { AlertController, LoadingController, ToastController, ActionSheetController, Platform } from '@ionic/angular';
import { Router } from '@angular/router';
import { Location } from '@angular/common';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
  standalone: false
})
export class SettingsPage {
  darkMode = false;
  profilePicture: string | null = null;
  userName: string | null = null;

  @ViewChild('fileInput') fileInput!: ElementRef;
  
  constructor(
    private alertController: AlertController,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private actionSheetCtrl: ActionSheetController,
    private router: Router,
    private location: Location,
    private platform: Platform
  ) {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      this.darkMode = savedTheme === 'dark';
      document.body.classList.toggle('dark', this.darkMode);
    } else {
      this.darkMode = document.body.classList.contains('dark');
    }
  }

  toggleDarkMode() {
    document.body.classList.toggle('dark', this.darkMode);
    localStorage.setItem('theme', this.darkMode ? 'dark' : 'light');
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
              // Simulate API call
              await new Promise(resolve => setTimeout(resolve, 1000));
              // Replace with actual API call:
              // await this.authService.changePassword(data.currentPassword, data.newPassword);
              
              this.showToast('Password updated successfully', 'success');
              return true;
            } catch (error) {
              this.showToast('Failed to update password. Please try again.');
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
            text: 'Cancel',
            icon: 'close',
            role: 'cancel'
          }
        ]
      });
      
      await actionSheet.present();
    } else {
      // For web, just trigger file input directly
      this.triggerFileInput('gallery');
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
        this.handleImageFile(file);
      }
    };
    
    input.click();
  }

  private handleImageFile(file: File) {
    const reader = new FileReader();
    
    reader.onload = (e: ProgressEvent<FileReader>) => {
      if (e.target?.result) {
        this.profilePicture = e.target.result as string;
        if (this.profilePicture) {
          localStorage.setItem('profilePicture', this.profilePicture);
          this.showToast('Profile picture updated', 'success');
        } else {
          this.showToast('Failed to process image');
        }
      }
    };
    
    reader.onerror = (error) => {
      console.error('Error reading file:', error);
      this.showToast('Error processing image');
    };
    
    reader.readAsDataURL(file);
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
