import { Injectable } from '@angular/core';
import { environment } from 'environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MediaUrlService {
  private readonly baseUrl = (environment.mediaBaseUrl || '').replace(/\/+$/, '');

  resolve(url?: string | null): string | null {
    if (!url) {
      return null;
    }
    const trimmed = url.trim();
    if (!trimmed) {
      return null;
    }
    if (this.isAbsolute(trimmed) || this.isInlineResource(trimmed)) {
      return trimmed;
    }
    const normalized = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    return this.baseUrl ? `${this.baseUrl}${normalized}` : normalized;
  }

  private isAbsolute(value: string): boolean {
    return /^https?:\/\//i.test(value);
  }

  private isInlineResource(value: string): boolean {
    return value.startsWith('data:') || value.startsWith('blob:') || value.startsWith('assets/');
  }
}
