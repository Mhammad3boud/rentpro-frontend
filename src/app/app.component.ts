import { Component } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './services/auth.service';
import { UserProfileService } from './services/user-profile.service';
import { ThemePreference } from './models';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  constructor(
    private authService: AuthService,
    private userProfileService: UserProfileService
  ) {
    this.applyThemeFromSession();
  }

  private async applyThemeFromSession() {
    const token = this.authService.getToken();
    if (!token) {
      this.applyThemeClass(this.getSystemPrefersDark() ? 'dark' : 'light');
      return;
    }

    try {
      const profile = await firstValueFrom(this.userProfileService.getUserProfile());
      const pref = profile?.themePreference || 'SYSTEM';
      this.applyThemeByPreference(pref);
    } catch {
      this.applyThemeClass(this.getSystemPrefersDark() ? 'dark' : 'light');
    }
  }

  private applyThemeByPreference(preference: ThemePreference | string) {
    switch (preference) {
      case 'DARK':
        this.applyThemeClass('dark');
        break;
      case 'LIGHT':
        this.applyThemeClass('light');
        break;
      default:
        this.applyThemeClass(this.getSystemPrefersDark() ? 'dark' : 'light');
        break;
    }
  }

  private applyThemeClass(theme: 'light' | 'dark') {
    document.body.classList.remove('dark', 'light');
    document.body.classList.add(theme);
  }

  private getSystemPrefersDark(): boolean {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
}
