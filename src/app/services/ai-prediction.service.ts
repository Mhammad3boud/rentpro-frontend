import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AiPrediction, PredictionType, RiskLevel } from '../models';

@Injectable({
  providedIn: 'root'
})
export class AiPredictionService {
  private readonly baseUrl = 'http://localhost:8083/api';

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
}