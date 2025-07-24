import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PromotionModel } from '../modeles/promotion.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class Promotion {

  private apiUrl = `${environment.apiBaseUrl}/promotions`;

  constructor(private http: HttpClient) {}

  getPromotions(): Observable<PromotionModel[]> {
    return this.http.get<PromotionModel[]>(this.apiUrl);
  }
}
