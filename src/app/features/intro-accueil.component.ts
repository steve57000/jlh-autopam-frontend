import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { NgOptimizedImage } from '@angular/common';
import { InViewportDirective } from '../directives/in-viewport.directive';
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
    InViewportDirective,
    RouterLink,
    // ← on importe la directive
  ],
  templateUrl: './intro-accueil.component.html',
  styleUrls: ['./intro-accueil.component.scss']
})
export class IntroAccueilComponent implements OnInit {
  annualHours: Array<{ dayLabel: string; schedule: string }> = [];
  exceptionalHours: Array<{ label: string; schedule: string }> = [];
  loadingHours = false;
  hoursError = '';

  private readonly hoursApi = inject(GarageHoursService);

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

  private buildExceptionalHours(list: GarageHourDto[]): Array<{ label: string; schedule: string }> {
    const exceptional = list.filter(hour => hour.scope === 'EXCEPTIONAL');
    const sorted = [...exceptional].sort((a, b) => {
      const aKey = a.exceptionalStartDate ?? a.exceptionalDate ?? '';
      const bKey = b.exceptionalStartDate ?? b.exceptionalDate ?? '';
      return aKey.localeCompare(bKey);
    });

    return sorted.map(hour => ({
      label: this.formatExceptionalLabel(hour),
      schedule: this.formatSchedule(hour)
    }));
  }

  private formatExceptionalLabel(hour: GarageHourDto): string {
    if (hour.exceptionalType === 'SINGLE_DAY') {
      const dateLabel = hour.exceptionalDate ? this.formatDayMonth(hour.exceptionalDate) : '';
      return dateLabel ? `Exception ${dateLabel}` : 'Exception ponctuelle';
    }

    if (hour.exceptionalType === 'PERIOD') {
      const start = hour.exceptionalStartDate ?? '??';
      const end = hour.exceptionalEndDate ?? '??';
      const label = hour.label ? ` (${hour.label})` : '';
      return `Période ${start} → ${end}${label}`;
    }

    return 'Exception';
  }

  private formatDayMonth(value: string): string {
    const [year, month, day] = value.split('-');
    if (!month || !day) return value;
    return `${day}/${month}`;
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
