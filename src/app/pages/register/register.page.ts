import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: false
})
export class RegisterPage implements OnInit {
  fullName = '';
  email = '';
  phone = '';
  password = '';
  confirmPassword = '';

  constructor(
    private router: Router,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private authService: AuthService
  ) {}

  ngOnInit() {}

  async register() {
    // Trim whitespace from inputs
    this.fullName = this.fullName.trim();
    this.email = this.email.trim().toLowerCase();
    this.phone = this.phone ? this.phone.trim() : '';

    // Client-side validation
    if (!this.validateForm()) {
      return;
    }

    // Log the data being sent for debugging
    const registrationData = {
      fullName: this.fullName,
      email: this.email,
      phone: this.phone || null, // Send null if empty string
      password: this.password
    };
    console.log('Sending registration data:', registrationData);

    const loading = await this.loadingController.create({
      message: 'Creating account...',
    });
    await loading.present();

    this.authService.registerOwner(this.fullName, this.email, this.phone,this.password).subscribe({
      next: async () => {
        await loading.dismiss();
        const alert = await this.alertController.create({
          header: 'Registration Successful',
          message: 'Your account has been created successfully!',
          buttons: ['OK'],
        });
        await alert.present();
        this.router.navigate(['/login']);
      },
      error: async (err: any) => {
        await loading.dismiss();
        console.error('Registration error:', err);
        
        // Handle validation errors with field-specific details
        if (err?.status === 400 && err?.error?.details) {
          await this.showValidationErrors(err.error.details);
          return;
        }
        
        let errorMessage = 'Registration failed. Please try again.';
        
        if (err?.error) {
          if (typeof err.error === 'string') {
            errorMessage = err.error;
          } else if (err.error.message) {
            errorMessage = err.error.message;
          } else if (Array.isArray(err.error.errors)) {
            errorMessage = err.error.errors.map((e: any) => e.defaultMessage || e.message).join(', ');
          } else if (err.error.errors && typeof err.error.errors === 'object') {
            const errorMessages: string[] = [];
            Object.values(err.error.errors).forEach((val: any) => {
              if (Array.isArray(val)) {
                errorMessages.push(...val.map(String));
              } else {
                errorMessages.push(String(val));
              }
            });
            errorMessage = errorMessages.join(', ');
          }
        } else if (err?.status === 0) {
          errorMessage = 'Cannot connect to server. Please check if the backend is running on port 8083.';
        } else if (err?.status === 409) {
          errorMessage = 'Email already exists. Please use a different email.';
        } else if (err?.message) {
          errorMessage = err.message;
        }
        
        const alert = await this.alertController.create({
          header: 'Registration Failed',
          message: errorMessage,
          buttons: ['OK'],
        });
        await alert.present();
      },
    });
  }

  validateForm(): boolean {
    // Check required fields
    if (!this.fullName || !this.email || !this.password || !this.confirmPassword) {
      this.showValidationError('Please fill in all required fields.');
      return false;
    }

    // Check full name length
    if (this.fullName.length > 120) {
      this.showValidationError('Full name must be less than 120 characters.');
      return false;
    }

    // Check email format and length
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email)) {
      this.showValidationError('Please enter a valid email address.');
      return false;
    }
    if (this.email.length > 150) {
      this.showValidationError('Email must be less than 150 characters.');
      return false;
    }

    // Check phone format (optional field)
    if (this.phone) {
      // Allow only digits, spaces, +, -, (, )
      const phoneRegex = /^[\d\s\-\(\)]+$/;
      if (!phoneRegex.test(this.phone)) {
        this.showValidationError('Phone number can only contain digits, spaces, and basic phone symbols (+, -, (, )).');
        return false;
      }
      if (this.phone.length > 40) {
        this.showValidationError('Phone number must be less than 40 characters.');
        return false;
      }
    }

    // Check password
    if (this.password.length < 6) {
      this.showValidationError('Password must be at least 6 characters long.');
      return false;
    }

    // Check password confirmation
    if (this.password !== this.confirmPassword) {
      this.showValidationError('Passwords do not match.');
      return false;
    }

    return true;
  }

  isFormValid(): boolean {
    const phoneRegex = /^[\d\s\-\(\)]*$/; // Allow empty for optional field
    
    return this.fullName.trim().length > 0 &&
           this.email.trim().length > 0 &&
           this.password.length >= 6 &&
           this.confirmPassword.length >= 6 &&
           this.password === this.confirmPassword &&
           this.fullName.length <= 120 &&
           this.email.length <= 150 &&
           (!this.phone || (phoneRegex.test(this.phone) && this.phone.length <= 40));
  }

  async showValidationError(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 4000,
      position: 'top',
      color: 'danger',
      buttons: [{ icon: 'close', role: 'cancel' }]
    });
    await toast.present();
  }

  async showValidationErrors(details: Record<string, string>) {
    // Show each validation error as a separate toast with field name
    const fieldLabels: Record<string, string> = {
      fullName: 'Full Name',
      email: 'Email',
      phone: 'Phone',
      password: 'Password'
    };

    const messages: string[] = [];
    for (const [field, error] of Object.entries(details)) {
      const label = fieldLabels[field] || field;
      messages.push(`${label}: ${error}`);
    }

    // Show all errors in one toast for better UX
    const toast = await this.toastController.create({
      header: 'Please fix the following:',
      message: messages.join('\n'),
      duration: 6000,
      position: 'top',
      color: 'warning',
      cssClass: 'validation-toast',
      buttons: [{ icon: 'close', role: 'cancel' }]
    });
    await toast.present();
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}
