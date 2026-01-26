import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false
})
export class LoginPage implements OnInit {

  username: string = '';
  password: string = '';
  rememberMe: boolean = false;

  constructor(
    private router: Router,
    private alertController: AlertController
  ) {}

  ngOnInit() {}

  async login() {
    if (this.username === 'admin' && this.password === '12345') {
      if (this.rememberMe) {
        localStorage.setItem('rememberUser', this.username);
      }
      this.router.navigate(['/tabs/dashboard']);
    } else {
      const alert = await this.alertController.create({
        header: 'Login Failed',
        message: 'Invalid username or password.',
        buttons: ['OK']
      });
      await alert.present();
    }
  }
}
