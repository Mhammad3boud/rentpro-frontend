import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { AuthService } from '../../services/auth.service'; 

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false
})
export class LoginPage implements OnInit {
  username = '';
  password = '';
  rememberMe = false;

  constructor(
    private router: Router,
    private alertController: AlertController,
    private authService: AuthService
  ) {}

  ngOnInit() {}

  async login() {
    this.authService.login(this.username, this.password, this.rememberMe).subscribe({
      next: async () => {
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
}
