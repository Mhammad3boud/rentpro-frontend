import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface PropertyDto {
    id: number;
    title: string;
    category: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    structureType: string;
    unitCount: number;
    notes?: string;
    meta?: Record<string, unknown>;
    createdAt: string;
}


@Injectable({ providedIn: 'root' })
export class PropertiesService {
    private readonly baseUrl = 'http://localhost:8082';

    constructor(private http: HttpClient) { }

    list(): Observable<PropertyDto[]> {
        return this.http.get<PropertyDto[]>(`${this.baseUrl}/properties`);
    }

    create(body: any): Observable<PropertyDto> {
        return this.http.post<PropertyDto>(`${this.baseUrl}/properties`, body);
    }

    update(id: number, body: any): Observable<PropertyDto> {
        return this.http.put<PropertyDto>(`${this.baseUrl}/properties/${id}`, body);
    }

    remove(id: number): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/properties/${id}`);
    }
}
