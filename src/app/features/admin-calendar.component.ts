import { CommonModule, DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatDatepickerModule, MatCalendarCellClassFunction } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { DemandesServiceService } from '../services/demandes-services.service';
import { CreneauxCalendarService, CreneauCalendarEntryDto } from '../services/creneaux-calendar.service';
import { RendezVousService } from '../services/rendezvous.service';
import type { DemandeWithServices, RendezVousSummary } from '../modeles/demande.model';
import { AdminCalendarHeaderComponent } from './admin-calendar-header.component';
import { CalendarHeaderService } from './calendar-header.service';
import { filter } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

interface CalendarRendezVousItem {
  demandeId: number;
  demandeType: string;
  clientLabel: string;
  rendezVous: RendezVousSummary;
}

interface CalendarGroup<T> {
  date: string;
  items: T[];
}

@Component({
  selector: 'app-admin-calendar',
  templateUrl: './admin-calendar.component.html',
  styleUrls: ['./admin-calendar.component.scss'],
  imports: [CommonModule, DatePipe, FormsModule, RouterModule, MatDatepickerModule, MatNativeDateModule],
  standalone: true,
  providers: [CalendarHeaderService]
})
export class AdminCalendarComponent implements OnInit {
  private readonly demandesApi = inject(DemandesServiceService);
  private readonly calendarApi = inject(CreneauxCalendarService);
  private readonly rendezVousApi = inject(RendezVousService);
  private readonly router = inject(Router);
  private readonly headerService = inject(CalendarHeaderService);
  private readonly destroyRef = inject(DestroyRef);

  loading = signal(false);
  error = signal<string | null>(null);
  slotMinutes = signal(30);
  customSlotMinutes = signal<number | null>(null);
  selectedDate = signal(new Date());
  rangeStart = signal<Date | null>(null);
  rangeEnd = signal<Date | null>(null);
  activeDate = signal(new Date());
  calendarHeader = AdminCalendarHeaderComponent;
  typeFilter = signal<'Tous' | 'Libre' | 'Reserve' | 'Indisponible'>('Tous');
  dateFilterStart = signal<string | null>(null);
  dateFilterEnd = signal<string | null>(null);

  calendarSlots = signal<CreneauCalendarEntryDto[]>([]);
  rangeSlots = signal<CreneauCalendarEntryDto[]>([]);
  rendezVousItems = signal<CalendarRendezVousItem[]>([]);
  rangeRendezVous = signal<CalendarRendezVousItem[]>([]);
  demandes = signal<DemandeWithServices[]>([]);

  selectedRdv = signal<CalendarRendezVousItem | null>(null);
  rdvDraft = signal<{ dateDebut: string; dateFin: string; commentaire: string; codeStatut: string } | null>(null);
  rdvSaving = signal(false);
  rdvFeedback = signal<string | null>(null);
  showDemandeModal = signal(false);
  showDetailsModal = signal(false);

  readonly slotOptions = [30, 45, 60, 90, 120, 180];

  rangeLabel = computed(() => {
    const start = this.rangeStart();
    const end = this.rangeEnd();
    if (!start) return 'Sélectionnez une date';
    if (!end || this.isSameDay(start, end)) {
      return this.formatDateLabel(start);
    }
    return `du ${this.formatDateLabel(start)} au ${this.formatDateLabel(end)}`;
  });
  rangeSlotsGrouped = computed(() => this.groupByDate(this.getRangeSlots(), slot => slot.dateDebut));
  rangeRendezVousGrouped = computed(() => this.groupByDate(this.getRangeRendezVous(), item => item.rendezVous.dateDebut));
  rangeDays = computed(() => {
    const map = new Map<string, { date: string; slots: CreneauCalendarEntryDto[]; rendezVous: CalendarRendezVousItem[] }>();
    this.rangeSlotsGrouped().forEach(group => {
      map.set(group.date, { date: group.date, slots: group.items, rendezVous: [] });
    });
    this.rangeRendezVousGrouped().forEach(group => {
      if (!map.has(group.date)) {
        map.set(group.date, { date: group.date, slots: [], rendezVous: group.items });
      } else {
        map.get(group.date)!.rendezVous = group.items;
      }
    });
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  });
  filteredRangeDays = computed(() => {
    const from = this.dateFilterStart() ? new Date(this.dateFilterStart() + 'T00:00:00') : null;
    const to = this.dateFilterEnd() ? new Date(this.dateFilterEnd() + 'T23:59:59') : null;
    const type = this.typeFilter();
    return this.rangeDays()
      .filter(day => {
        const date = new Date(day.date + 'T00:00:00');
        if (from && date < from) return false;
        if (to && date > to) return false;
        return true;
      })
      .map(day => ({
        ...day,
        slots: day.slots.filter(slot => type === 'Tous' || this.normalizeStatus(slot.codeStatut) === type)
      }))
      .filter(day => day.slots.length || day.rendezVous.length);
  });

  ngOnInit() {
    this.rangeStart.set(this.selectedDate());
    this.activeDate.set(this.selectedDate());
    this.refreshForDate(this.selectedDate());
    this.headerService.activeDate$
      .pipe(
        filter((date): date is Date => date instanceof Date),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(date => {
        this.activeDate.set(date);
        this.refreshForDate(date);
      });
  }

  refresh() {
    this.refreshForDate(this.activeDate());
  }

  refreshForDate(date: Date) {
    this.loading.set(true);
    this.error.set(null);
    const monthStart = this.toIsoStart(this.startOfMonth(date));
    const monthEnd = this.toIsoEnd(this.endOfMonth(date));
    const range = this.getRangeBounds();
    const rangeStartIso = range ? this.toIsoStart(range.start) : monthStart;
    const rangeEndIso = range ? this.toIsoEnd(range.end) : monthEnd;
    this.calendarApi.getCalendar({ start: monthStart, end: monthEnd, slotMinutes: this.slotMinutes() }).subscribe({
      next: slots => this.calendarSlots.set(slots ?? []),
      error: () => this.calendarSlots.set([])
    });
    this.calendarApi.getCalendar({ start: rangeStartIso, end: rangeEndIso, slotMinutes: this.slotMinutes() }).subscribe({
      next: slots => this.rangeSlots.set(slots ?? []),
      error: () => this.rangeSlots.set([])
    });
    this.demandesApi.getAll({ silentError: true }).subscribe({
      next: demandes => {
        this.demandes.set(demandes ?? []);
        this.rendezVousItems.set(this.extractRendezVous(demandes, monthStart, monthEnd));
        this.rangeRendezVous.set(this.extractRendezVous(demandes, rangeStartIso, rangeEndIso));
        this.loading.set(false);
      },
      error: () => {
        this.demandes.set([]);
        this.rendezVousItems.set([]);
        this.rangeRendezVous.set([]);
        this.error.set('Impossible de charger le calendrier.');
        this.loading.set(false);
      }
    });
  }

  setSlotMinutes(value: string) {
    const parsed = Number(value);
    this.slotMinutes.set(Number.isFinite(parsed) && parsed > 0 ? parsed : 30);
    this.customSlotMinutes.set(null);
    this.refresh();
  }

  setCustomSlotMinutes(value: string) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      this.customSlotMinutes.set(parsed);
      this.slotMinutes.set(parsed);
      this.refresh();
    }
  }

  setDateFilter(field: 'start' | 'end', value: string) {
    if (field === 'start') {
      this.dateFilterStart.set(value || null);
    } else {
      this.dateFilterEnd.set(value || null);
    }
  }

  setTypeFilter(value: string) {
    if (value === 'Libre' || value === 'Reserve' || value === 'Indisponible') {
      this.typeFilter.set(value);
    } else {
      this.typeFilter.set('Tous');
    }
  }

  onDateSelected(date: Date | null) {
    if (!date) return;
    this.activeDate.set(date);
    const start = this.rangeStart();
    const end = this.rangeEnd();
    if (!start || (start && end)) {
      this.rangeStart.set(date);
      this.rangeEnd.set(null);
    } else {
      if (date < start) {
        this.rangeEnd.set(start);
        this.rangeStart.set(date);
      } else {
        this.rangeEnd.set(date);
      }
    }
    this.selectedDate.set(date);
    this.refreshForDate(date);
  }

  selectRdv(item: CalendarRendezVousItem) {
    this.selectedRdv.set(item);
    this.rdvFeedback.set(null);
    this.rdvDraft.set({
      dateDebut: this.formatDateTimeLocal(item.rendezVous.dateDebut),
      dateFin: this.formatDateTimeLocal(item.rendezVous.dateFin),
      commentaire: item.rendezVous.commentaire ?? '',
      codeStatut: item.rendezVous.codeStatut
    });
  }

  closeRdvDetails() {
    this.selectedRdv.set(null);
    this.rdvDraft.set(null);
    this.rdvFeedback.set(null);
  }

  openDetailsModal() {
    this.showDetailsModal.set(true);
    this.lockBodyScroll(true);
  }

  closeDetailsModal() {
    this.showDetailsModal.set(false);
    this.lockBodyScroll(false);
  }

  openDemandeModal() {
    this.showDemandeModal.set(true);
    this.lockBodyScroll(true);
  }

  closeDemandeModal() {
    this.showDemandeModal.set(false);
    this.lockBodyScroll(false);
  }

  selectedDemande() {
    const selected = this.selectedRdv();
    if (!selected) return null;
    return this.demandes().find(demande => demande.id_demande === selected.demandeId) ?? null;
  }

  updateDraftField(field: 'dateDebut' | 'dateFin' | 'commentaire', value: string) {
    const draft = this.rdvDraft();
    if (!draft) return;
    this.rdvDraft.set({ ...draft, [field]: value });
  }

  saveNote() {
    const selected = this.selectedRdv();
    const draft = this.rdvDraft();
    if (!selected || !draft) return;
    this.saveRdvUpdate({ codeStatut: draft.codeStatut });
  }

  updateStatus(status: string) {
    const draft = this.rdvDraft();
    if (!draft) return;
    this.rdvDraft.set({ ...draft, codeStatut: status });
    this.saveRdvUpdate({ codeStatut: status });
  }

  private saveRdvUpdate(payload: { codeStatut: string }) {
    const selected = this.selectedRdv();
    const draft = this.rdvDraft();
    if (!selected || !draft) return;
    const dateDebutIso = this.parseDateInput(draft.dateDebut);
    const dateFinIso = this.parseDateInput(draft.dateFin);
    if (!dateDebutIso || !dateFinIso) {
      this.rdvFeedback.set('Les dates sont invalides.');
      return;
    }
    this.rdvSaving.set(true);
    this.rdvFeedback.set(null);
    this.rendezVousApi.update(selected.rendezVous.idRdv, {
      dateDebut: dateDebutIso,
      dateFin: dateFinIso,
      commentaire: draft.commentaire || null,
      codeStatut: payload.codeStatut
    }).subscribe({
      next: updated => {
        this.rdvSaving.set(false);
        this.rdvFeedback.set('Rendez-vous mis à jour.');
        this.rendezVousItems.update(items =>
          items.map(item => item.rendezVous.idRdv === updated.idRdv
            ? { ...item, rendezVous: { ...item.rendezVous, ...updated } }
            : item
          )
        );
        const current = this.selectedRdv();
        if (current) {
          const updatedItem = this.rendezVousItems().find(item => item.rendezVous.idRdv === current.rendezVous.idRdv);
          if (updatedItem) {
            this.selectRdv(updatedItem);
          }
        }
      },
      error: () => {
        this.rdvSaving.set(false);
        this.rdvFeedback.set('Impossible de mettre à jour le rendez-vous.');
      }
    });
  }

  navigateToDemande(item: CalendarRendezVousItem) {
    const base = this.router.url.startsWith('/manager') ? '/manager/demandes' : '/admin/demandes';
    this.router.navigate([base], { queryParams: { focus: item.demandeId } });
  }

  statusBadgeClass(code: string) {
    switch (code) {
      case 'Confirme':
        return 'badge--success';
      case 'Annule':
        return 'badge--danger';
      case 'Reporte':
        return 'badge--warning';
      default:
        return 'badge--neutral';
    }
  }

  availabilityBadgeClass(code: string) {
    switch (this.normalizeStatus(code)) {
      case 'Libre':
        return 'badge--available';
      case 'Reserve':
        return 'badge--reserved';
      case 'Indisponible':
        return 'badge--blocked';
      default:
        return 'badge--neutral';
    }
  }

  private extractRendezVous(demandes: DemandeWithServices[], start: string, end: string) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return (demandes ?? [])
      .filter(demande => demande.rendezVous?.dateDebut && demande.rendezVous?.dateFin)
      .map(demande => ({
        demandeId: demande.id_demande,
        demandeType: demande.code_type,
        clientLabel: [demande.client?.prenom, demande.client?.nom].filter(Boolean).join(' ') || 'Client',
        rendezVous: demande.rendezVous as RendezVousSummary
      }))
      .filter(item => {
        const date = new Date(item.rendezVous.dateDebut);
        return date >= startDate && date <= endDate;
      })
      .sort((a, b) => new Date(a.rendezVous.dateDebut).getTime() - new Date(b.rendezVous.dateDebut).getTime());
  }

  private groupByDate<T>(items: T[], dateSelector: (item: T) => string): CalendarGroup<T>[] {
    const map = new Map<string, T[]>();
    items.forEach(item => {
      const key = this.formatDateKey(new Date(dateSelector(item)));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    });
    return Array.from(map.entries()).map(([date, groupedItems]) => ({ date, items: groupedItems }));
  }

  dayHighlight: MatCalendarCellClassFunction<Date> = (date, view) => {
    if (view !== 'month') return '';
    const status = this.dayStatus(date);
    const classes = [];
    if (status === 'Libre') classes.push('calendar-day--free');
    if (status === 'Reserve') classes.push('calendar-day--reserved');
    if (status === 'Indisponible') classes.push('calendar-day--blocked');
    if (this.isInSelectedRange(date)) classes.push('calendar-day--range');
    return classes.join(' ');
  }

  private formatDateTimeLocal(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  private parseDateInput(value: string | null) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  private toIsoStart(date: Date) {
    const base = new Date(date);
    base.setHours(0, 0, 0, 0);
    return base.toISOString();
  }

  private toIsoEnd(date: Date) {
    const base = new Date(date);
    base.setHours(23, 59, 59, 999);
    return base.toISOString();
  }

  private startOfMonth(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  private endOfMonth(date: Date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
  }

  private isSameDay(a: Date, b: Date) {
    return a.getFullYear() === b.getFullYear()
      && a.getMonth() === b.getMonth()
      && a.getDate() === b.getDate();
  }

  private getRangeBounds() {
    const start = this.rangeStart();
    if (!start) return null;
    const end = this.rangeEnd() ?? start;
    return { start, end };
  }

  private getRangeSlots() {
    return this.rangeSlots().filter(slot => this.normalizeStatus(slot.codeStatut) !== 'Indisponible');
  }

  private getRangeRendezVous() {
    return this.rangeRendezVous();
  }

  private dayStatus(date: Date) {
    const slots = this.calendarSlots().filter(slot => this.isSameDay(new Date(slot.dateDebut), date));
    if (!slots.length) return null;
    const normalizedStatuses = slots.map(slot => this.normalizeStatus(slot.codeStatut));
    const hasLibre = normalizedStatuses.some(status => status === 'Libre');
    const hasReserve = normalizedStatuses.some(status => status === 'Reserve');
    const allIndispo = normalizedStatuses.every(status => status === 'Indisponible');
    if (allIndispo) return 'Indisponible';
    if (hasReserve) return 'Reserve';
    if (hasLibre) return 'Libre';
    return null;
  }

  private normalizeStatus(status?: string | null) {
    if (!status) return null;
    const cleaned = status.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    if (cleaned.startsWith('libre')) return 'Libre';
    if (cleaned.startsWith('reserv')) return 'Reserve';
    if (cleaned.startsWith('indispo')) return 'Indisponible';
    return status;
  }

  private formatDateLabel(date: Date) {
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  private formatDateKey(date: Date) {
    return date.toISOString().slice(0, 10);
  }

  private isInSelectedRange(date: Date) {
    const start = this.rangeStart();
    if (!start) return false;
    const end = this.rangeEnd();
    const rangeEnd = end ?? start;
    const target = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    const startTime = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
    const endTime = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), rangeEnd.getDate()).getTime();
    return target >= Math.min(startTime, endTime) && target <= Math.max(startTime, endTime);
  }

  private lockBodyScroll(lock: boolean) {
    if (typeof document === 'undefined') return;
    document.body.style.overflow = lock ? 'hidden' : '';
  }
}
