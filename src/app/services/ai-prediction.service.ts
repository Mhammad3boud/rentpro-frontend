import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { AiPrediction, PredictionType, RiskLevel } from '../models';
import { environment } from '../../environments/environment';

export interface PredictionDashboardSummary {
  paymentRiskLevel: RiskLevel;
  paymentRiskScore: number; // 0..1
  highRiskCount: number;
  maintenanceRiskCount: number;
  totalPredictions: number;
  updatedAt?: string;
  source: 'api' | 'legacy' | 'unavailable';
}

@Injectable({
  providedIn: 'root'
})
export class AiPredictionService {
  private readonly baseUrl = `${environment.apiBaseUrl}/api`;
  private readonly cacheTtlMs = 5 * 60 * 1000;
  private summaryCache = new Map<'OWNER' | 'TENANT', { at: number; value: PredictionDashboardSummary }>();

  constructor(private http: HttpClient) {}

  // Get predictions for a lease
  getPredictionsByLease(leaseId: string): Observable<AiPrediction[]> {
    return this.http.get<AiPrediction[]>(`${this.baseUrl}/ai/predictions/lease/${leaseId}`);
  }

  // Get all predictions for owner's leases
  getOwnerPredictions(): Observable<AiPrediction[]> {
    return this.http.get<AiPrediction[]>(`${this.baseUrl}/ai/predictions`);
  }

  // Get high-risk predictions
  getHighRiskPredictions(): Observable<AiPrediction[]> {
    return this.http.get<AiPrediction[]>(`${this.baseUrl}/ai/predictions/high-risk`);
  }

  // Trigger prediction generation for a lease
  generatePrediction(leaseId: string, predictionType: PredictionType): Observable<AiPrediction> {
    return this.http.post<AiPrediction>(`${this.baseUrl}/ai/predictions/generate`, {
      leaseId,
      predictionType
    });
  }

  // Get prediction by ID
  getPredictionById(predictionId: string): Observable<AiPrediction> {
    return this.http.get<AiPrediction>(`${this.baseUrl}/ai/predictions/${predictionId}`);
  }

  // Preferred source for dashboard/analytics widgets.
  getDashboardSummary(role: 'OWNER' | 'TENANT', forceRefresh = false): Observable<PredictionDashboardSummary> {
    const cached = this.summaryCache.get(role);
    const isFresh = !!cached && (Date.now() - cached.at) < this.cacheTtlMs;

    if (!forceRefresh && isFresh && cached) {
      return of(cached.value);
    }

    return this.http.get<unknown>(`${this.baseUrl}/predictions/dashboard`).pipe(
      map(raw => this.normalizeDashboardSummary(raw)),
      tap(summary => this.summaryCache.set(role, { at: Date.now(), value: summary })),
      catchError(() => this.getLegacySummary(role, forceRefresh))
    );
  }

  private getLegacySummary(role: 'OWNER' | 'TENANT', forceRefresh: boolean): Observable<PredictionDashboardSummary> {
    return this.getOwnerPredictions().pipe(
      map(list => this.deriveSummaryFromList(list)),
      tap(summary => this.summaryCache.set(role, { at: Date.now(), value: summary })),
      catchError(() => of(this.getUnavailableSummary(forceRefresh)))
    );
  }

  private normalizeDashboardSummary(raw: unknown): PredictionDashboardSummary {
    const data = (raw ?? {}) as Record<string, unknown>;
    const score = this.coerceScore(data['paymentRiskScore'] ?? data['riskScore']);
    const level = this.coerceRiskLevel(data['paymentRiskLevel'] ?? data['riskLevel'], score);

    return {
      paymentRiskLevel: level,
      paymentRiskScore: score,
      highRiskCount: this.toNumber(data['highRiskCount']),
      maintenanceRiskCount: this.toNumber(data['maintenanceRiskCount']),
      totalPredictions: this.toNumber(data['totalPredictions']),
      updatedAt: this.toStringOrUndefined(data['updatedAt'] ?? data['generatedAt']),
      source: 'api'
    };
  }

  private deriveSummaryFromList(predictions: AiPrediction[]): PredictionDashboardSummary {
    const safeList = Array.isArray(predictions) ? predictions : [];
    const paymentPredictions = safeList.filter(p => p.predictionType === 'LATE_PAYMENT');
    const maintenancePredictions = safeList.filter(p => p.predictionType === 'MAINTENANCE_RISK');

    const highestPaymentScore = paymentPredictions.length
      ? Math.max(...paymentPredictions.map(p => this.coerceScore(p.riskScore)))
      : 0;

    const highestPaymentLevel = paymentPredictions.length
      ? paymentPredictions.reduce(
          (acc, p) => (this.riskOrder(this.coerceRiskLevel(p.riskLevel, p.riskScore)) > this.riskOrder(acc)
            ? this.coerceRiskLevel(p.riskLevel, p.riskScore)
            : acc),
          'LOW' as RiskLevel
        )
      : 'LOW';

    const highRiskCount = safeList.filter(p => this.coerceRiskLevel(p.riskLevel, p.riskScore) === 'HIGH').length;
    const maintenanceRiskCount = maintenancePredictions.filter(p => this.coerceRiskLevel(p.riskLevel, p.riskScore) !== 'LOW').length;
    const latestPrediction = safeList
      .map(p => p.predictedAt)
      .filter((v): v is string => !!v)
      .sort();
    const updatedAt = latestPrediction.length > 0 ? latestPrediction[latestPrediction.length - 1] : undefined;

    return {
      paymentRiskLevel: highestPaymentLevel,
      paymentRiskScore: highestPaymentScore,
      highRiskCount,
      maintenanceRiskCount,
      totalPredictions: safeList.length,
      updatedAt,
      source: 'legacy'
    };
  }

  private getUnavailableSummary(forceRefresh: boolean): PredictionDashboardSummary {
    return {
      paymentRiskLevel: 'LOW',
      paymentRiskScore: 0,
      highRiskCount: 0,
      maintenanceRiskCount: 0,
      totalPredictions: 0,
      updatedAt: forceRefresh ? new Date().toISOString() : undefined,
      source: 'unavailable'
    };
  }

  private toNumber(value: unknown): number {
    const n = Number(value ?? 0);
    return Number.isFinite(n) ? n : 0;
  }

  private toStringOrUndefined(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
  }

  private coerceScore(value: unknown): number {
    const raw = Number(value ?? 0);
    if (!Number.isFinite(raw)) {
      return 0;
    }
    if (raw > 1) {
      return Math.max(0, Math.min(1, raw / 100));
    }
    return Math.max(0, Math.min(1, raw));
  }

  private coerceRiskLevel(value: unknown, score: number): RiskLevel {
    const normalized = String(value ?? '').toUpperCase();
    if (normalized === 'LOW' || normalized === 'MEDIUM' || normalized === 'HIGH') {
      return normalized;
    }
    if (score >= 0.65) {
      return 'HIGH';
    }
    if (score >= 0.35) {
      return 'MEDIUM';
    }
    return 'LOW';
  }

  private riskOrder(level: RiskLevel): number {
    switch (level) {
      case 'HIGH':
        return 3;
      case 'MEDIUM':
        return 2;
      default:
        return 1;
    }
  }
}
