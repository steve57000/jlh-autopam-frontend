import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { DemandesServiceService } from '../services/demandes-services.service';
import { CreneauxCalendarService, CreneauCalendarEntryDto } from '../services/creneaux-calendar.service';
import { RendezVousService } from '../services/rendezvous.service';
import type { DemandeWithServices, RendezVousSummary } from '../modeles/demande.model';
import { GarageHoursService } from '../services/garage-hours.service';
import { GarageHourDto } from '../modeles/garage-hours.model';

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

interface SchedulerEntry {
  id: string;
  label: string;
  startMinutes: number;
  endMinutes: number;
  type: 'slot' | 'rdv';
  status: string;
  payload?: CalendarRendezVousItem;
}

@Component({
  selector: 'app-admin-calendar',
  templateUrl: './admin-calendar.component.html',
  styleUrls: ['./admin-calendar.component.scss'],
  imports: [CommonModule, DatePipe, FormsModule, RouterModule],
  standalone: true
})
export class AdminCalendarComponent implements OnInit {
  private readonly demandesApi = inject(DemandesServiceService);
  private readonly calendarApi = inject(CreneauxCalendarService);
  private readonly rendezVousApi = inject(RendezVousService);
  private readonly router = inject(Router);
  private readonly hoursApi = inject(GarageHoursService);

  loading = signal(false);
  error = signal<string | null>(null);
  slotMinutes = signal(30);
  customSlotMinutes = signal<number | null>(null);
  rangeStart = signal<Date | null>(null);
  rangeEnd = signal<Date | null>(null);
  activeDate = signal(new Date());
  typeFilter = signal<'Tous' | 'Libre' | 'Reserve' | 'Indisponible'>('Tous');
  dateFilterStart = signal<string | null>(null);
  dateFilterEnd = signal<string | null>(null);

  rangeSlots = signal<CreneauCalendarEntryDto[]>([]);
  rangeRendezVous = signal<CalendarRendezVousItem[]>([]);
  demandes = signal<DemandeWithServices[]>([]);
  garageHours = signal<GarageHourDto[]>([]);

  selectedRdv = signal<CalendarRendezVousItem | null>(null);
  rdvDraft = signal<{ dateDebut: string; dateFin: string; commentaire: string; codeStatut: string } | null>(null);
  rdvSaving = signal(false);
  rdvFeedback = signal<string | null>(null);
  showDemandeModal = signal(false);
  showDetailsModal = signal(false);
  isDragging = signal(false);

  readonly slotOptions = [30, 45, 60, 90, 120, 180];
  readonly minuteHeight = 1.2;
  private dragState: { startX: number; startY: number; scrollLeft: number; scrollTop: number } | null = null;
  private suppressClickUntil = 0;

  private readonly dayMap = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] as const;

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
        slots: day.slots.filter(slot => type === 'Tous' || slot.codeStatut === type)
      }))
      .filter(day => this.hasVisibleEntries(day));
  });
  schedulerBounds = computed(() => {
    const defaultStart = 8 * 60;
    const defaultEnd = 18 * 60;
    const days = this.filteredRangeDays();
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    days.forEach(day => {
      const intervals = this.getDayIntervals(new Date(day.date + 'T00:00:00'));
      intervals.forEach(interval => {
        min = Math.min(min, interval.start);
        max = Math.max(max, interval.end);
      });
    });
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      return { start: defaultStart, end: defaultEnd };
    }
    const paddedStart = Math.max(0, min - 60);
    const paddedEnd = Math.min(24 * 60, max + 60);
    const span = paddedEnd - paddedStart;
    if (span < 240) {
      return { start: paddedStart, end: Math.min(24 * 60, paddedStart + 240) };
    }
    return { start: paddedStart, end: paddedEnd };
  });
  schedulerTimes = computed(() => {
    const bounds = this.schedulerBounds();
    const step = this.slotMinutes();
    const times: number[] = [];
    for (let minutes = bounds.start; minutes <= bounds.end; minutes += step) {
      times.push(minutes);
    }
    return times;
  });
  schedulerBodyHeight = computed(() => {
    const bounds = this.schedulerBounds();
    return (bounds.end - bounds.start) * this.minuteHeight;
  });
  schedulerBounds = computed(() => {
    const days = this.filteredRangeDays();
    const defaultStart = 8 * 60;
    const defaultEnd = 18 * 60;
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    days.forEach(day => {
      day.slots.forEach(slot => {
        min = Math.min(min, this.getMinutes(slot.dateDebut));
        max = Math.max(max, this.getMinutes(slot.dateFin));
      });
      day.rendezVous.forEach(item => {
        min = Math.min(min, this.getMinutes(item.rendezVous.dateDebut));
        max = Math.max(max, this.getMinutes(item.rendezVous.dateFin));
      });
    });
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      return { start: defaultStart, end: defaultEnd };
    }
    const paddedStart = Math.max(0, min - 60);
    const paddedEnd = Math.min(24 * 60, max + 60);
    const span = paddedEnd - paddedStart;
    if (span < 240) {
      return { start: paddedStart, end: Math.min(24 * 60, paddedStart + 240) };
    }
    return { start: paddedStart, end: paddedEnd };
  });
  schedulerTimes = computed(() => {
    const bounds = this.schedulerBounds();
    const step = this.slotMinutes();
    const times: number[] = [];
    for (let minutes = bounds.start; minutes <= bounds.end; minutes += step) {
      times.push(minutes);
    }
    return times;
  });
  schedulerBodyHeight = computed(() => {
    const bounds = this.schedulerBounds();
    return (bounds.end - bounds.start) * this.minuteHeight;
  });

  ngOnInit() {
    const today = new Date();
    const end = this.addDays(today, 4);
    this.rangeStart.set(today);
    this.rangeEnd.set(end);
    this.activeDate.set(today);
    this.dateFilterStart.set(this.formatDateInput(today));
    this.dateFilterEnd.set(this.formatDateInput(end));
    this.loadGarageHours();
    this.refreshForDate(today);
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
    this.calendarApi.getCalendar({ start: rangeStartIso, end: rangeEndIso, slotMinutes: this.slotMinutes() }).subscribe({
      next: slots => this.rangeSlots.set(slots ?? []),
      error: () => this.rangeSlots.set([])
    });
    this.demandesApi.getAll({ silentError: true }).subscribe({
      next: demandes => {
        this.demandes.set(demandes ?? []);
        this.rangeRendezVous.set(this.extractRendezVous(demandes, rangeStartIso, rangeEndIso));
        this.loading.set(false);
      },
      error: () => {
        this.demandes.set([]);
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
      const parsed = this.parseDateOnly(value);
      if (parsed) {
        this.rangeStart.set(parsed);
        const currentEnd = this.rangeEnd();
        if (currentEnd && parsed > currentEnd) {
          this.rangeEnd.set(parsed);
          this.dateFilterEnd.set(this.formatDateInput(parsed));
        }
        this.activeDate.set(parsed);
        this.refreshForDate(parsed);
      }
    } else {
      this.dateFilterEnd.set(value || null);
      const parsed = this.parseDateOnly(value);
      if (parsed) {
        const currentStart = this.rangeStart();
        if (currentStart && parsed < currentStart) {
          this.rangeStart.set(parsed);
          this.dateFilterStart.set(this.formatDateInput(parsed));
          this.activeDate.set(parsed);
          this.refreshForDate(parsed);
        } else {
          this.rangeEnd.set(parsed);
          this.refresh();
        }
      }
    }
  }

  setTypeFilter(value: string) {
    if (value === 'Libre' || value === 'Reserve' || value === 'Indisponible') {
      this.typeFilter.set(value);
    } else {
      this.typeFilter.set('Tous');
    }
  }

  onSchedulerPointerDown(event: PointerEvent) {
    if (event.button !== 0) return;
    const target = event.currentTarget as HTMLElement | null;
    if (!target) return;
    target.setPointerCapture(event.pointerId);
    this.dragState = {
      startX: event.clientX,
      startY: event.clientY,
      scrollLeft: target.scrollLeft,
      scrollTop: target.scrollTop
    };
    this.isDragging.set(true);
  }

  onSchedulerPointerMove(event: PointerEvent) {
    if (!this.dragState) return;
    event.preventDefault();
    const target = event.currentTarget as HTMLElement | null;
    if (!target) return;
    const dx = event.clientX - this.dragState.startX;
    const dy = event.clientY - this.dragState.startY;
    target.scrollLeft = this.dragState.scrollLeft - dx;
    target.scrollTop = this.dragState.scrollTop - dy;
  }

  onSchedulerPointerUp(event: PointerEvent) {
    const target = event.currentTarget as HTMLElement | null;
    if (target && this.dragState) {
      const moved = Math.abs(event.clientX - this.dragState.startX) + Math.abs(event.clientY - this.dragState.startY);
      if (moved > 6) {
        this.suppressClickUntil = Date.now() + 250;
      }
      target.releasePointerCapture(event.pointerId);
    }
    this.dragState = null;
    this.isDragging.set(false);
  }

  onEntryClick(entry: SchedulerEntry) {
    if (Date.now() < this.suppressClickUntil) return;
    if (entry.type !== 'rdv' || !entry.payload) return;
    this.selectRdv(entry.payload);
    this.openDetailsModal();
  }

  isDayClosed(day: { date: string }) {
    return this.getDayIntervals(new Date(day.date + 'T00:00:00')).length === 0;
  }

  private hasVisibleEntries(day: { date: string; slots: CreneauCalendarEntryDto[]; rendezVous: CalendarRendezVousItem[] }) {
    const intervals = this.getDayIntervals(new Date(day.date + 'T00:00:00'));
    if (!intervals.length) return false;
    const slotVisible = day.slots.some(slot =>
      this.hasOverlap(this.getMinutes(slot.dateDebut), this.getMinutes(slot.dateFin), intervals)
    );
    const rdvVisible = day.rendezVous.some(item =>
      this.hasOverlap(this.getMinutes(item.rendezVous.dateDebut), this.getMinutes(item.rendezVous.dateFin), intervals)
    );
    return slotVisible || rdvVisible;
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
        this.rangeRendezVous.update(items =>
          items.map(item => item.rendezVous.idRdv === updated.idRdv
            ? { ...item, rendezVous: { ...item.rendezVous, ...updated } }
            : item
          )
        );
        const current = this.selectedRdv();
        if (current) {
          const updatedItem = this.rangeRendezVous().find(item => item.rendezVous.idRdv === current.rendezVous.idRdv);
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

  buildDayEntries(day: { date: string; slots: CreneauCalendarEntryDto[]; rendezVous: CalendarRendezVousItem[] }) {
    const intervals = this.getDayIntervals(new Date(day.date + 'T00:00:00'));
    if (!intervals.length) return [];
    const entries: SchedulerEntry[] = [];
    day.slots.forEach(slot => {
      const ranges = this.clampToIntervals(this.getMinutes(slot.dateDebut), this.getMinutes(slot.dateFin), intervals);
      ranges.forEach((range, index) => {
        entries.push({
          id: `slot-${slot.dateDebut}-${slot.codeStatut}-${index}`,
          label: slot.libelleStatut || slot.codeStatut,
          startMinutes: range.start,
          endMinutes: range.end,
          type: 'slot',
          status: slot.codeStatut
        });
      });
    });
    day.rendezVous.forEach(item => {
      const ranges = this.clampToIntervals(
        this.getMinutes(item.rendezVous.dateDebut),
        this.getMinutes(item.rendezVous.dateFin),
        intervals
      );
      ranges.forEach((range, index) => {
        entries.push({
          id: `rdv-${item.rendezVous.idRdv}-${index}`,
          label: item.clientLabel,
          startMinutes: range.start,
          endMinutes: range.end,
          type: 'rdv',
          status: item.rendezVous.codeStatut,
          payload: item
        });
      });
    });
    return entries.sort((a, b) => a.startMinutes - b.startMinutes);
  }

  entryTop(entry: SchedulerEntry) {
    const bounds = this.schedulerBounds();
    return (entry.startMinutes - bounds.start) * this.minuteHeight;
  }

  entryHeight(entry: SchedulerEntry) {
    return Math.max(28, (entry.endMinutes - entry.startMinutes) * this.minuteHeight);
  }

  formatTimeLabel(minutes: number) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  slotEntryStatusLabel(code: string) {
    switch (code) {
      case 'Libre':
        return 'Disponible';
      case 'Reserve':
        return 'Réservé';
      case 'Indisponible':
        return 'Indisponible';
      default:
        return code;
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

  private parseDateOnly(value: string | null) {
    if (!value) return null;
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
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

  private getRangeBounds() {
    const start = this.rangeStart();
    if (!start) return null;
    const end = this.rangeEnd() ?? start;
    return { start, end };
  }

  private getRangeSlots() {
    return this.rangeSlots().filter(slot => slot.codeStatut !== 'Indisponible');
  }

  private getRangeRendezVous() {
    return this.rangeRendezVous();
  }

  private formatDateLabel(date: Date) {
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  private formatDateInput(date: Date) {
    return date.toISOString().slice(0, 10);
  }

  private formatDateKey(date: Date) {
    return date.toISOString().slice(0, 10);
  }

  private lockBodyScroll(lock: boolean) {
    if (typeof document === 'undefined') return;
    document.body.style.overflow = lock ? 'hidden' : '';
  }

  private getMinutes(value: string) {
    const date = new Date(value);
    return date.getHours() * 60 + date.getMinutes();
  }

  private addDays(date: Date, days: number) {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  }

  private isSameDay(a: Date, b: Date) {
    return a.getFullYear() === b.getFullYear()
      && a.getMonth() === b.getMonth()
      && a.getDate() === b.getDate();
  }

  private loadGarageHours() {
    this.hoursApi.listPublic().subscribe({
      next: list => {
        this.garageHours.set(list ?? []);
      },
      error: () => {
        this.garageHours.set([]);
      }
    });
  }

  private getDayIntervals(date: Date): Array<{ start: number; end: number }> {
    const dateKey = this.formatDateKey(date);
    const hours = this.garageHours();
    const exceptional = this.resolveExceptional(hours, dateKey);
    if (exceptional) {
      if (exceptional.status === 'CLOSED') return [];
      return this.buildIntervals(exceptional);
    }
    const dayKey = this.dayMap[date.getDay()];
    const annual = hours.find(hour => hour.scope === 'ANNUAL' && hour.dayOfWeek === dayKey);
    if (annual) {
      if (annual.status === 'CLOSED') return [];
      return this.buildIntervals(annual);
    }
    return [{ start: 8 * 60, end: 18 * 60 }];
  }

  private resolveExceptional(list: GarageHourDto[], dateKey: string) {
    const singleDay = list.find(
      hour => hour.scope === 'EXCEPTIONAL' && hour.exceptionalType === 'SINGLE_DAY' && hour.exceptionalDate === dateKey
    );
    if (singleDay) return singleDay;
    return list.find(hour => {
      if (hour.scope !== 'EXCEPTIONAL' || hour.exceptionalType !== 'PERIOD') return false;
      if (!hour.exceptionalStartDate || !hour.exceptionalEndDate) return false;
      return hour.exceptionalStartDate <= dateKey && dateKey <= hour.exceptionalEndDate;
    });
  }

  private buildIntervals(hour: GarageHourDto) {
    const intervals: Array<{ start: number; end: number }> = [];
    const start = this.timeToMinutes(hour.startTime);
    const end = this.timeToMinutes(hour.endTime);
    if (start !== null && end !== null && end > start) {
      intervals.push({ start, end });
    }
    if (hour.openingType === 'SPLIT') {
      const start2 = this.timeToMinutes(hour.startTime2);
      const end2 = this.timeToMinutes(hour.endTime2);
      if (start2 !== null && end2 !== null && end2 > start2) {
        intervals.push({ start: start2, end: end2 });
      }
    }
    return intervals.sort((a, b) => a.start - b.start);
  }

  private timeToMinutes(value?: string | null): number | null {
    if (!value) return null;
    const [hours, minutes] = value.split(':').map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    return (hours || 0) * 60 + (minutes || 0);
  }

  private clampToIntervals(start: number, end: number, intervals: Array<{ start: number; end: number }>) {
    return intervals
      .map(interval => ({
        start: Math.max(start, interval.start),
        end: Math.min(end, interval.end)
      }))
      .filter(range => range.end > range.start);
  }

  private hasOverlap(start: number, end: number, intervals: Array<{ start: number; end: number }>) {
    return intervals.some(interval => end > interval.start && start < interval.end);
  }
}
