import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UserService } from './user.service';
import {
    Property,
    PropertyWithUnits,
    CreatePropertyRequest,
    PropertyType,
    UsageType,
    Unit
} from '../models';

// Re-export for backward compatibility
export { CreatePropertyRequest };
export type { PropertyWithUnits, Property, Unit };

/**
 * @deprecated Use PropertyWithUnits from models instead
 * This includes both old field names and new field names for backward compatibility
 */
export interface PropertyDto {
    // New field names (from backend)
    propertyId?: string;
    propertyName?: string;
    propertyType?: string;
    usageType?: string;
    region?: string;
    postcode?: string;
    waterMeterNo?: string;
    electricityMeterNo?: string;
    units?: any[];
    unitCount?: number;
    
    // Legacy field names (for backward compatibility)
    id: string;
    title: string;
    category: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    structureType: 'STANDALONE' | 'MULTI_UNIT';
    notes?: string;
    meta?: Record<string, unknown>;
    createdAt: string;
}

/**
 * @deprecated Use CreatePropertyRequest from models instead
 */
export interface CreatePropertyRequestLegacy {
    title: string;
    category: string;
    structureType: string;
    unitCount: number;
    address?: string;
    latitude?: number;
    longitude?: number;
    notes?: string;
    meta?: Record<string, unknown>;
}

export interface UnitInfo {
    unitName: string;
    leaseName: string;
}


@Injectable({ providedIn: 'root' })
export class PropertiesService {
    private readonly baseUrl = 'http://localhost:8083/api';

    constructor(private http: HttpClient, private userService: UserService) { }

    list(): Observable<PropertyWithUnits[]> {
        const user = this.userService.getCurrentUser();
        if (!user) throw new Error('User not authenticated');
        return this.http.get<PropertyWithUnits[]>(`${this.baseUrl}/properties/${user.userId}`);
    }

    create(body: CreatePropertyRequest): Observable<Property> {
        const user = this.userService.getCurrentUser();
        if (!user) throw new Error('User not authenticated');
        return this.http.post<Property>(`${this.baseUrl}/properties/${user.userId}`, body);
    }

    update(id: string, body: CreatePropertyRequest): Observable<Property> {
        return this.http.put<Property>(`${this.baseUrl}/properties/${id}`, body);
    }

    generateLeaseNames(propertyTitle: string, propertyType: string, units?: string[]): UnitInfo[] {
        // Non-residential properties might not need leases
        if (['FARM', 'LAND', 'WAREHOUSE', 'OFFICE', 'INDUSTRIAL'].includes(propertyType)) {
            return [{
                unitName: propertyTitle,
                leaseName: `${propertyTitle} Agreement`
            }];
        }
        
        if (propertyType === 'STANDALONE') {
            return [{
                unitName: propertyTitle,
                leaseName: `${propertyTitle} Lease`
            }];
        } else if (propertyType === 'MULTI_UNIT') {
            // Multi-unit property
            return (units || ['Unit 1', 'Unit 2']).map(unit => ({
                unitName: unit,
                leaseName: `${propertyTitle} - ${unit}`
            }));
        } else {
            // Other property types
            return [{
                unitName: propertyTitle,
                leaseName: `${propertyTitle} Contract`
            }];
        }
    }

    remove(id: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/properties/${id}`);
    }
}
