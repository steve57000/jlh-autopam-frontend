import { CommonModule, isPlatformBrowser } from '@angular/common';
import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, PLATFORM_ID, ViewChild, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';
import { GarageHoursService } from '../services/garage-hours.service';
import { GarageHourDto } from '../modeles/garage-hours.model';

@Component({
  selector: 'app-intro-accueil',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    NgOptimizedImage,
    RouterLink,
    // ← on importe la directive
  ],
  templateUrl: './intro-accueil.component.html',
  styleUrls: ['./intro-accueil.component.scss']
})
export class IntroAccueilComponent implements OnInit, AfterViewInit, OnDestroy {
  annualHours: Array<{ dayLabel: string; schedule: string }> = [];
  exceptionalHours: Array<{ label: string; schedule: string; description?: string }> = [];
  loadingHours = false;
  hoursError = '';
  showMap = false;

  private mapObserver?: IntersectionObserver;
  @ViewChild('mapContainer', { static: false }) mapContainer?: ElementRef<HTMLDivElement>;

  private readonly hoursApi = inject(GarageHoursService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly cdr = inject(ChangeDetectorRef);

  private readonly dayLabels: Record<string, string> = {
    MONDAY: 'Lundi',
    TUESDAY: 'Mardi',
    WEDNESDAY: 'Mercredi',
    THURSDAY: 'Jeudi',
    FRIDAY: 'Vendredi',
    SATURDAY: 'Samedi',
    SUNDAY: 'Dimanche',
  };

  private readonly dayOrder = [
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
    'SATURDAY',
    'SUNDAY',
  ];

  ngOnInit() {
    this.loadHours();
  }

  ngAfterViewInit() {
    if (!isPlatformBrowser(this.platformId)) {
      this.showMap = true;
      this.cdr.markForCheck();
      return;
    }

    if (typeof IntersectionObserver === 'undefined') {
      this.showMap = true;
      this.cdr.markForCheck();
      return;
    }

    if (this.mapContainer?.nativeElement) {
      this.mapObserver = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            this.showMap = true;
            this.cdr.markForCheck();
            this.mapObserver?.disconnect();
          }
        },
        { threshold: 0.1 }
      );
      this.mapObserver.observe(this.mapContainer.nativeElement);
    } else {
      this.showMap = true;
      this.cdr.markForCheck();
    }
  }

  ngOnDestroy() {
    this.mapObserver?.disconnect();
  }

  private loadHours() {
    this.loadingHours = true;
    this.hoursError = '';
    this.hoursApi.listPublic().subscribe({
      next: list => {
        const hours = list ?? [];
        this.annualHours = this.buildAnnualHours(hours);
        this.exceptionalHours = this.buildExceptionalHours(hours);
        this.loadingHours = false;
      },
      error: err => {
        this.loadingHours = false;
        this.hoursError = 'Impossible de charger les horaires.';
        console.error('Erreur chargement horaires', err);
      }
    });
  }

  private buildAnnualHours(list: GarageHourDto[]): Array<{ dayLabel: string; schedule: string }> {
    const annual = list
      .filter(hour => hour.scope === 'ANNUAL' && hour.dayOfWeek)
      .sort((a, b) => this.dayOrder.indexOf(a.dayOfWeek!) - this.dayOrder.indexOf(b.dayOfWeek!));

    return annual.map(hour => ({
      dayLabel: this.dayLabels[hour.dayOfWeek!] ?? hour.dayOfWeek!,
      schedule: this.formatSchedule(hour)
    }));
  }

  private buildExceptionalHours(list: GarageHourDto[]): Array<{ label: string; schedule: string; description?: string }> {
    const exceptional = list.filter(hour => hour.scope === 'EXCEPTIONAL');
    const sorted = [...exceptional].sort((a, b) => {
      const aKey = a.exceptionalStartDate ?? a.exceptionalDate ?? '';
      const bKey = b.exceptionalStartDate ?? b.exceptionalDate ?? '';
      return aKey.localeCompare(bKey);
    });

    return sorted.map(hour => ({
      label: this.formatExceptionalLabel(hour),
      schedule: this.formatExceptionalSchedule(hour),
      description: hour.description ?? undefined
    }));
  }

  private formatExceptionalLabel(hour: GarageHourDto): string {
    if (hour.exceptionalType === 'SINGLE_DAY') {
      const dateLabel = hour.exceptionalDate ? this.formatExceptionalDate(hour.exceptionalDate) : '';
      return dateLabel || 'Date exceptionnelle';
    }

    if (hour.exceptionalType === 'PERIOD') {
      const start = hour.exceptionalStartDate
        ? this.formatExceptionalDate(hour.exceptionalStartDate)
        : '??';
      const end = hour.exceptionalEndDate ? this.formatExceptionalDate(hour.exceptionalEndDate) : '??';
      return `Du ${start} au ${end}`;
    }

    return 'Exception';
  }

  private formatExceptionalSchedule(hour: GarageHourDto): string {
    return hour.status === 'CLOSED' ? 'Fermé' : 'Ouvert';
  }

  private formatExceptionalDate(value: string): string {
    const [year, month, day] = value.split('-');
    if (!month || !day) return value;
    const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    const formatter = new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
    });
    const formatted = formatter.format(date);
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }

  private formatSchedule(hour: GarageHourDto): string {
    if (hour.status === 'CLOSED') {
      return 'Fermé';
    }

    const start = this.formatTime(hour.startTime);
    const end = this.formatTime(hour.endTime);
    const start2 = this.formatTime(hour.startTime2);
    const end2 = this.formatTime(hour.endTime2);

    if (hour.openingType === 'SPLIT' && start && end && start2 && end2) {
      return `${start}-${end} et ${start2}-${end2}`;
    }

    if (start && end) {
      return `${start}-${end}`;
    }

    return 'Ouvert';
  }

  private formatTime(value?: string | null): string {
    if (!value) return '';
    const [hours, minutes] = value.split(':');
    if (!hours || !minutes) return value;
    return `${hours.padStart(2, '0')}h${minutes.padStart(2, '0')}`;
  }
}
