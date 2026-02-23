import { Component } from '@angular/core';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  constructor(private authService: AuthService) {
    // Apply theme on app start
    const savedTheme = localStorage.getItem('theme');
    const isDark = savedTheme === 'dark';
    document.body.classList.remove('dark', 'light');
    if (savedTheme) {
      document.body.classList.add(isDark ? 'dark' : 'light');
    } else {
      document.body.classList.add('light');
    }
  }

}
