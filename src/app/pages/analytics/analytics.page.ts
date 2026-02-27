import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AiPrediction, RiskLevel } from '../../models';
import { AiPredictionService, PredictionDashboardSummary } from '../../services/ai-prediction.service';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-analytics',
  templateUrl: './analytics.page.html',
  styleUrls: ['./analytics.page.scss'],
  standalone: false
})
export class AnalyticsPage implements OnInit {
  isLoading = false;
  isTenant = false;
  summary: PredictionDashboardSummary | null = null;
  predictions: AiPrediction[] = [];
  filtered: AiPrediction[] = [];
  selectedRisk: 'ALL' | RiskLevel = 'ALL';

  constructor(
    private predictionService: AiPredictionService,
    private userService: UserService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.isTenant = this.userService.isTenant();
    if (this.isTenant) {
      this.router.navigate(['/tabs/dashboard']);
      return;
    }
    this.loadAnalytics();
  }

  doRefresh(event: CustomEvent): void {
    this.loadAnalytics(true, () => event.detail.complete());
  }

  filterByRisk(risk: 'ALL' | RiskLevel | string | null | undefined): void {
    const normalized: 'ALL' | RiskLevel =
      risk === 'LOW' || risk === 'MEDIUM' || risk === 'HIGH' ? risk : 'ALL';
    this.selectedRisk = normalized;
    if (normalized === 'ALL') {
      this.filtered = [...this.predictions];
      return;
    }
    this.filtered = this.predictions.filter(p => this.normalizeRiskLevel(p.riskLevel, p.riskScore) === normalized);
  }

  riskBadgeColor(level: RiskLevel): 'success' | 'warning' | 'danger' {
    if (level === 'HIGH') {
      return 'danger';
    }
    if (level === 'MEDIUM') {
      return 'warning';
    }
    return 'success';
  }

  displayRiskScore(score: number): string {
    const normalized = Number.isFinite(Number(score)) ? Number(score) : 0;
    const percent = normalized > 1 ? normalized : normalized * 100;
    return `${Math.round(Math.max(0, Math.min(100, percent)))}%`;
  }

  formatTime(value?: string): string {
    if (!value) {
      return 'N/A';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return 'N/A';
    }
    return date.toLocaleString();
  }

  private loadAnalytics(forceRefresh = false, onDone?: () => void): void {
    this.isLoading = true;

    const role: 'OWNER' | 'TENANT' = this.isTenant ? 'TENANT' : 'OWNER';

    this.predictionService.getDashboardSummary(role, forceRefresh).subscribe({
      next: (summary) => {
        this.summary = summary;
      },
      error: () => {
        this.summary = null;
      }
    });

    this.predictionService.getOwnerPredictions().subscribe({
      next: (list) => {
        this.predictions = (list || []).slice().sort((a, b) => {
          const left = new Date(b.predictedAt).getTime();
          const right = new Date(a.predictedAt).getTime();
          return left - right;
        });
        this.filterByRisk(this.selectedRisk);
        this.isLoading = false;
        if (onDone) {
          onDone();
        }
      },
      error: () => {
        this.predictions = [];
        this.filtered = [];
        this.isLoading = false;
        if (onDone) {
          onDone();
        }
      }
    });
  }

  private normalizeRiskLevel(level: RiskLevel, score: number): RiskLevel {
    if (level === 'LOW' || level === 'MEDIUM' || level === 'HIGH') {
      return level;
    }
    const normalizedScore = Number(score) > 1 ? Number(score) / 100 : Number(score);
    if (normalizedScore >= 0.65) {
      return 'HIGH';
    }
    if (normalizedScore >= 0.35) {
      return 'MEDIUM';
    }
    return 'LOW';
  }
}
