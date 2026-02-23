import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Unit, CreateUnitRequest } from '../models';

@Injectable({
  providedIn: 'root'
})
export class UnitService {
  private readonly baseUrl = 'http://localhost:8083/api';

  constructor(private http: HttpClient) {}

  // Get units for a property
  getUnitsByProperty(propertyId: string): Observable<Unit[]> {
    return this.http.get<Unit[]>(`${this.baseUrl}/properties/${propertyId}/units`);
  }

  // Create a single unit
  createUnit(request: CreateUnitRequest): Observable<Unit> {
    return this.http.post<Unit>(`${this.baseUrl}/units`, request);
  }

  // Create multiple units for a property
  createBulkUnits(propertyId: string, unitNumbers: string[]): Observable<Unit[]> {
    return this.http.post<Unit[]>(`${this.baseUrl}/properties/${propertyId}/units/bulk`, { unitNumbers });
  }

  // Get unit by ID
  getUnitById(unitId: string): Observable<Unit> {
    return this.http.get<Unit>(`${this.baseUrl}/units/${unitId}`);
  }

  // Delete unit
  deleteUnit(unitId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/units/${unitId}`);
  }
}
