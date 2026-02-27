import { Component } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './services/auth.service';
import { UserProfileService } from './services/user-profile.service';
import { ThemePreference } from './models';
import { App } from '@capacitor/app';
import { VersionCheckService } from './services/version-check.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  forceUpdateRequired = false;
  updateMessage = 'A new version is required to continue using this app.';
  updateUrl = '';

  constructor(
    private authService: AuthService,
    private userProfileService: UserProfileService,
    private versionCheckService: VersionCheckService
  ) {
    this.enforceVersionPolicy();
    this.applyThemeFromSession();
    this.registerResumeVersionCheck();
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

  openUpdatePage() {
    if (!this.updateUrl) return;
    this.versionCheckService.openUpdateUrl(this.updateUrl);
  }

  private async enforceVersionPolicy() {
    const result = await this.versionCheckService.checkVersion();
    this.forceUpdateRequired = result.mustUpdate;
    if (!result.config) {
      return;
    }
    this.updateUrl = result.config.updateUrl;
    this.updateMessage = result.config.message || this.updateMessage;
  }

  private registerResumeVersionCheck() {
    try {
      App.addListener('resume', async () => {
        await this.enforceVersionPolicy();
      });
    } catch {
      // No-op on platforms where App listeners are unavailable
    }
  }
}
