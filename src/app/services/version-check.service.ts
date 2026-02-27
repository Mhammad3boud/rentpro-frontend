import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { App } from '@capacitor/app';
import { environment } from '../../environments/environment';

export type AppPlatform = 'android' | 'ios' | 'web';

export interface VersionConfigResponse {
  platform: AppPlatform;
  latestVersion: string;
  minSupportedVersion: string;
  updateUrl: string;
  message?: string;
}

export interface VersionCheckResult {
  currentVersion: string;
  config: VersionConfigResponse | null;
  mustUpdate: boolean;
  shouldUpdate: boolean;
}

@Injectable({ providedIn: 'root' })
export class VersionCheckService {
  private readonly baseUrl = environment.apiBaseUrl;
  private readonly fallbackVersion = environment.appVersion || '0.0.0';

  constructor(private http: HttpClient) {}

  async checkVersion(): Promise<VersionCheckResult> {
    const platform = this.getPlatform();
    const currentVersion = await this.getCurrentAppVersion();

    // Avoid blocking local browser development unless explicitly enabled.
    if (platform === 'web' && !environment.enforceVersionGateOnWeb) {
      return {
        currentVersion,
        config: null,
        mustUpdate: false,
        shouldUpdate: false
      };
    }

    const config = await this.getVersionConfig(platform);

    if (!config) {
      return {
        currentVersion,
        config: null,
        mustUpdate: false,
        shouldUpdate: false
      };
    }

    return {
      currentVersion,
      config,
      mustUpdate: this.compareSemver(currentVersion, config.minSupportedVersion) < 0,
      shouldUpdate: this.compareSemver(currentVersion, config.latestVersion) < 0
    };
  }

  async getCurrentAppVersion(): Promise<string> {
    try {
      const info = await App.getInfo();
      return info.version || this.fallbackVersion;
    } catch {
      return this.fallbackVersion;
    }
  }

  getPlatform(): AppPlatform {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('android')) return 'android';
    if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ios')) return 'ios';
    return 'web';
  }

  openUpdateUrl(url: string) {
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  private async getVersionConfig(platform: AppPlatform): Promise<VersionConfigResponse | null> {
    try {
      const response = await firstValueFrom(
        this.http.get<VersionConfigResponse>(`${this.baseUrl}/api/app-config/version`, {
          params: { platform }
        })
      );
      if (!response?.latestVersion || !response?.minSupportedVersion) {
        return null;
      }
      if (!response.updateUrl) {
        response.updateUrl = environment.updateUrls[platform];
      }
      return response;
    } catch {
      return null;
    }
  }

  private compareSemver(a: string, b: string): number {
    const normalize = (v: string) =>
      (v || this.fallbackVersion)
        .split('.')
        .map((part) => Number(part.replace(/[^0-9]/g, '')) || 0)
        .slice(0, 3);

    const va = normalize(a);
    const vb = normalize(b);

    while (va.length < 3) va.push(0);
    while (vb.length < 3) vb.push(0);

    for (let i = 0; i < 3; i++) {
      if (va[i] > vb[i]) return 1;
      if (va[i] < vb[i]) return -1;
    }
    return 0;
  }
}
