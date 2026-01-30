import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { DemandesServiceService } from '../services/demandes-services.service';
import { CreneauxCalendarService, CreneauCalendarEntryDto } from '../services/creneaux-calendar.service';
import { RendezVousService } from '../services/rendezvous.service';
import type { DemandeWithServices, RendezVousSummary } from '../modeles/demande.model';

interface CalendarGroup<T> {
  date: string;
  items: T[];
}

interface CalendarRendezVousItem {
  demandeId: number;
  demandeType: string;
  clientLabel: string;
  rendezVous: RendezVousSummary;
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

  loading = signal(false);
  error = signal<string | null>(null);
  slotMinutes = signal(30);
  startDate = signal(this.formatDateOnly(new Date()));
  endDate = signal(this.formatDateOnly(this.addDays(new Date(), 14)));

  calendarSlots = signal<CreneauCalendarEntryDto[]>([]);
  rendezVousItems = signal<CalendarRendezVousItem[]>([]);

  selectedRdv = signal<CalendarRendezVousItem | null>(null);
  rdvDraft = signal<{ dateDebut: string; dateFin: string; commentaire: string; codeStatut: string } | null>(null);
  rdvSaving = signal(false);
  rdvFeedback = signal<string | null>(null);

  slotsByDate = computed(() => this.groupByDate(this.calendarSlots(), slot => slot.dateDebut));
  rendezVousByDate = computed(() => this.groupByDate(this.rendezVousItems(), item => item.rendezVous.dateDebut));

  ngOnInit() {
    this.refresh();
  }

  refresh() {
    this.loading.set(true);
    this.error.set(null);
    const start = this.toIsoStart(this.startDate());
    const end = this.toIsoEnd(this.endDate());
    this.calendarApi.getCalendar({ start, end, slotMinutes: this.slotMinutes() }).subscribe({
      next: slots => this.calendarSlots.set(slots ?? []),
      error: () => this.calendarSlots.set([])
    });
    this.demandesApi.getAll({ silentError: true }).subscribe({
      next: demandes => {
        this.rendezVousItems.set(this.extractRendezVous(demandes, start, end));
        this.loading.set(false);
      },
      error: () => {
        this.rendezVousItems.set([]);
        this.error.set('Impossible de charger le calendrier.');
        this.loading.set(false);
      }
    });
  }

  setSlotMinutes(value: string) {
    const parsed = Number(value);
    this.slotMinutes.set(Number.isFinite(parsed) && parsed > 0 ? parsed : 30);
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
    switch (code) {
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
      const key = this.formatDateOnly(new Date(dateSelector(item)));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    });
    return Array.from(map.entries()).map(([date, groupedItems]) => ({ date, items: groupedItems }));
  }

  private formatDateOnly(date: Date) {
    const pad = (value: number) => value.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
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

  private toIsoStart(date: string) {
    const base = new Date(`${date}T00:00:00`);
    return base.toISOString();
  }

  private toIsoEnd(date: string) {
    const base = new Date(`${date}T23:59:59`);
    return base.toISOString();
  }

  private addDays(date: Date, days: number) {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  }
}
