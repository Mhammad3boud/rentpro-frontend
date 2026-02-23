import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ContractTemplate {
  templateId: string;
  templateName: string;
  templateContent: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateTemplateRequest {
  name: string;
  content: string;
}

export interface UpdateTemplateRequest {
  name: string;
  content: string;
}

@Injectable({
  providedIn: 'root'
})
export class ContractTemplateService {
  private readonly baseUrl = 'http://localhost:8083';

  constructor(private http: HttpClient) {}

  // Get all templates for current user
  getTemplates(): Observable<ContractTemplate[]> {
    return this.http.get<ContractTemplate[]>(`${this.baseUrl}/api/contracts/templates`);
  }

  // Get a specific template by ID
  getTemplate(templateId: string): Observable<ContractTemplate> {
    return this.http.get<ContractTemplate>(`${this.baseUrl}/api/contracts/templates/${templateId}`);
  }

  // Create a new template
  createTemplate(request: CreateTemplateRequest): Observable<ContractTemplate> {
    return this.http.post<ContractTemplate>(`${this.baseUrl}/api/contracts/templates`, request);
  }

  // Update an existing template
  updateTemplate(templateId: string, request: UpdateTemplateRequest): Observable<ContractTemplate> {
    return this.http.put<ContractTemplate>(`${this.baseUrl}/api/contracts/templates/${templateId}`, request);
  }

  // Delete a template
  deleteTemplate(templateId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/api/contracts/templates/${templateId}`);
  }

  // Set a template as default
  setDefaultTemplate(templateId: string): Observable<ContractTemplate> {
    return this.http.put<ContractTemplate>(`${this.baseUrl}/api/contracts/templates/${templateId}/default`, {});
  }

  // Download PDF for a lease
  downloadContractPdf(leaseId: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/api/contracts/${leaseId}/pdf`, {
      responseType: 'blob'
    });
  }
}
