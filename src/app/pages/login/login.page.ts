import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service'; 

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false
})
export class LoginPage implements OnInit {
  email = '';
  password = '';
  rememberMe = true; // Default to true for better UX - token persists across page reloads

  constructor(
    private router: Router,
    private alertController: AlertController,
    private authService: AuthService,
    private userService: UserService
  ) {}

  ngOnInit() {}

  async login() {
    this.authService.login(this.email, this.password, this.rememberMe).subscribe({
      next: async () => {
        // Load user profile after successful login
        await this.userService.loadUserProfile();
        this.router.navigate(['/tabs/dashboard']);
      },
      error: async (err: any) => { // ✅ fixes TS7006
        const alert = await this.alertController.create({
          header: 'Login Failed',
          message: err?.error?.message ?? 'Invalid email or password.',
          buttons: ['OK'],
        });
        await alert.present();
      },
    });
  }

  goToRegister() {
    this.router.navigate(['/register']);
  }
}
