import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AvisServicesService } from '../services/avis-services.service';
import type { AvisServiceDto } from '../modeles/avis-service.model';
import { RatingStarsComponent } from '../shared/rating-stars/rating-stars.component';

@Component({
  selector: 'app-avis-page',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterLink, RatingStarsComponent],
  templateUrl: './avis.component.html',
  styleUrls: ['./avis.component.scss']
})
export class AvisComponent implements OnInit {
  private readonly avisApi = inject(AvisServicesService);

  avis: AvisServiceDto[] = [];
  loading = false;
  error = false;

  page = 0;
  readonly size = 12;
  hasMore = true;

  ngOnInit(): void {
    this.loadNextPage(true);
  }

  loadNextPage(reset = false): void {
    if (this.loading) return;

    if (reset) {
      this.page = 0;
      this.avis = [];
      this.hasMore = true;
    }

    this.loading = true;
    this.error = false;

    this.avisApi.getApprovedAvisPage({ page: this.page, size: this.size, sort: 'creeLe,desc' }).subscribe({
      next: res => {
        const content = res.content ?? [];
        this.avis = [...this.avis, ...content];
        this.page += 1;
        this.hasMore = this.page < (res.totalPages ?? 0);
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.error = true;
      }
    });
  }
}
