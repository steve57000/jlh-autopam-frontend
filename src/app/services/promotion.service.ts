import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { PromotionModel } from '../modeles/promotion.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PromotionService {
  private apiUrl = `${environment.apiBaseUrl}/promotions`;

  constructor(private http: HttpClient) {}

  // lecture publique (front non-auth)
  getPromotions(): Observable<PromotionModel[]> {
    return this.http.get<PromotionModel[]>(this.apiUrl, {
      headers: new HttpHeaders({ 'X-Skip-Error-Toast': '1' })
    }).pipe(
      catchError(err => {
        console.warn('Impossible de charger les promotions.', err);
        return of([]);
      })
    );
  }
}
