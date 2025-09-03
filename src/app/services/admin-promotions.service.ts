import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  PromotionRequest,
  PromotionResponse
} from '../modeles/promotion.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AdminPromotionsService {
  private apiUrl = `${environment.apiBaseUrl}/promotions`;

  constructor(private http: HttpClient) {}

  list(): Observable<PromotionResponse[]> {
    return this.http.get<PromotionResponse[]>(this.apiUrl);
  }

  createPromo(
    data: PromotionRequest,
    file: File
  ): Observable<PromotionResponse> {
    const form = new FormData();
    form.append('data', new Blob([JSON.stringify(data)], {
      type: 'application/json'
    }));
    form.append('file', file, file.name);
    // Ne PAS fixer Content-Type
    return this.http.post<PromotionResponse>(this.apiUrl, form);
  }

  updatePromo(
    id: number,
    data: PromotionRequest,
    file?: File
  ): Observable<PromotionResponse> {
    const form = new FormData();
    form.append('data', new Blob([JSON.stringify(data)], {
      type: 'application/json'
    }));
    if (file) {
      form.append('file', file, file.name);
    }
    return this.http.put<PromotionResponse>(
      `${this.apiUrl}/${id}`,
      form
    );
  }

  deletePromo(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
