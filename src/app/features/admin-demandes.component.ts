import { Component, DestroyRef, HostListener, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { DemandesServiceService } from '../services/demandes-services.service';
import { DemandeWithServices, ServiceItem, DemandeDocumentDto, RendezVousSummary } from '../modeles/demande.model';
import {FormsModule} from '@angular/forms';
import { ToastService } from '../shared/toast/toast.service';
import { LookupsService } from '../services/lookups.service';
import { ServicesService } from '../services/services.service';
import { ServiceDto } from '../modeles/service.model';
import { RendezVousService, RendezVousUpsertPayload } from '../services/rendezvous.service';
import { RendezVousPropositionsService } from '../services/rendezvous-propositions.service';
import { CreneauxCalendarService, CreneauCalendarEntryDto } from '../services/creneaux-calendar.service';
import {
  RendezVousProposition,
  RendezVousPropositionBatchPayload
} from '../modeles/rendezvous-proposition.model';
import { AuthService } from '../services/auth.service';
import { VEHICLE_ENERGY_OPTIONS } from '../shared/vehicle-energy-options';
import { forkJoin } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GarageHoursService } from '../services/garage-hours.service';
import { GarageHourDto } from '../modeles/garage-hours.model';

type TypeFilterValue = 'Tous' | DemandeWithServices['code_type'] | string;
type StatutFilterValue = 'Tous' | DemandeWithServices['code_statut'] | string;

interface FilterOption<T extends string> {
  value: T;
  label: string;
}

interface NewServiceSelection {
  serviceId: number | null;
  quantite: number;
  prix: number | null;
}

interface RendezVousFormState {
  idRdv: number | null;
  creneauId: number | null;
  dateDebut: string;
  dateFin: string;
  codeStatut: string;
  commentaire: string | null;
}

interface RdvStatusOption {
  value: string;
  label: string;
  disabled?: boolean;
}

@Component({
  selector: 'admin-demandes',
  templateUrl: './admin-demandes.component.html',
  styleUrls: ['./admin-demandes.component.scss'],
  imports: [CommonModule, DatePipe, FormsModule],
  standalone: true
})
export class AdminDemandesComponent implements OnInit, OnDestroy {
  private api = inject(DemandesServiceService);
  private readonly toast = inject(ToastService);
  private readonly lookups = inject(LookupsService);
  private readonly servicesApi = inject(ServicesService);
  private readonly rendezVousApi = inject(RendezVousService);
  private readonly rdvPropositionsApi = inject(RendezVousPropositionsService);
  private readonly calendarApi = inject(CreneauxCalendarService);
  private readonly garageHoursApi = inject(GarageHoursService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  // Données
  loading = signal(true);
  error = signal<string | null>(null);
  demandes = signal<DemandeWithServices[]>([]);
  saving = signal(false);
  feedback = signal<string | null>(null);
  feedbackType = signal<'success' | 'error' | null>(null);

  // Filtres
  type = signal<TypeFilterValue>('Tous');
  statut = signal<StatutFilterValue>('Tous');
  q = signal('');
  dateFrom = signal<string | null>(null); // 'YYYY-MM-DD'
  dateTo = signal<string | null>(null);

  // Détails / édition
  selectedId = signal<number | null>(null);
  private draft = signal<DemandeWithServices | null>(null);
  private original = signal<DemandeWithServices | null>(null);

  private readonly fallbackTypeOptions: Array<FilterOption<TypeFilterValue>> = [
    { value: 'Devis', label: 'Devis' },
    { value: 'Service', label: 'Service' },
    { value: 'RendezVous', label: 'Rendez-vous' }
  ];

  private readonly fallbackStatutOptions: Array<FilterOption<StatutFilterValue>> = [
    { value: 'Brouillon', label: 'Brouillon' },
    { value: 'En_attente', label: 'En attente' },
    { value: 'Traitee', label: 'Confirmée' },
    { value: 'Annulee', label: 'Annulée' }
  ];

  private readonly fallbackRdvStatuses: Array<FilterOption<string>> = [
    { value: 'Confirme', label: 'Confirmé' },
    { value: 'Reporte', label: 'Reporté' },
    { value: 'Annule', label: 'Annulé' }
  ];

  readonly typeOptions = signal<Array<FilterOption<TypeFilterValue>>>([
    { value: 'Tous', label: 'Tous' },
    ...this.fallbackTypeOptions
  ]);

  readonly statutOptions = signal<Array<FilterOption<StatutFilterValue>>>([
    { value: 'Tous', label: 'Tous' },
    ...this.fallbackStatutOptions
  ]);

  readonly rdvStatusOptions = signal<Array<FilterOption<string>>>([...this.fallbackRdvStatuses]);

  serviceCatalog = signal<ServiceDto[]>([]);
  newServiceSelection = signal<NewServiceSelection>({ serviceId: null, quantite: 1, prix: null });

  documentUploading = signal(false);
  documentError = signal<string | null>(null);

  devisValidationComment = signal('');
  devisValidationFeedback = signal<string | null>(null);
  devisValidationFeedbackType = signal<'success' | 'error' | null>(null);
  devisValidationSaving = signal(false);

  rdvForm = signal<RendezVousFormState | null>(null);
  rdvSaving = signal(false);
  rdvFeedback = signal<string | null>(null);
  rdvFeedbackType = signal<'success' | 'error' | null>(null);
  rdvProposals = signal<RendezVousProposition[]>([]);
  rdvProposalDraft = signal<Array<{ dateDebut: string; dateFin: string }>>([
    { dateDebut: '', dateFin: '' }
  ]);
  rdvProposalFeedback = signal<string | null>(null);
  rdvProposalFeedbackType = signal<'success' | 'error' | null>(null);
  vehicleEnergyOptions = VEHICLE_ENERGY_OPTIONS;

  calendarStart = signal(this.formatDateOnly(new Date()));
  calendarEnd = signal(this.formatDateOnly(this.addDays(new Date(), 7)));
  calendarSlotMinutes = signal(30);
  calendarLoading = signal(false);
  calendarError = signal<string | null>(null);
  calendarSlotsRaw = signal<CreneauCalendarEntryDto[]>([]);
  selectedCalendarDay = signal<string | null>(null);
  garageHours = signal<GarageHourDto[]>([]);
  private focusDemandeId = signal<number | null>(null);

  filtered = computed(() => {
    const t = this.type();
    const s = this.statut();
    const term = this.q().toLowerCase().trim();
    const from = this.dateFrom() ? new Date(this.dateFrom()! + 'T00:00:00') : null;
    const to = this.dateTo() ? new Date(this.dateTo()! + 'T23:59:59') : null;

    return this.demandes().filter(d => {
      if (t !== 'Tous' && d.code_type !== t) return false;
      if (s !== 'Tous' && d.code_statut !== s) return false;
      if (from && new Date(d.date_demande) < from) return false;
      if (to && new Date(d.date_demande) > to) return false;
      if (term) {
        const hay = [
          d.client?.nom,
          d.client?.prenom,
          d.client?.email,
          d.code_type,
          d.type_libelle, // 👈 ajouté
          d.code_statut,
          d.statut_libelle, // 👈 ajouté
          ...d.services.map(sv => sv.libelle)
        ].join(' ').toLowerCase();

        if (!hay.includes(term)) return false;
      }
      return true;
    }).sort((a,b) => new Date(b.date_demande).getTime() - new Date(a.date_demande).getTime());
  });

  readonly selectedDemande = computed<DemandeWithServices | null>(() => {
    const id = this.selectedId();
    if (id == null) return null;
    return this.demandes().find(d => this.getDemandeId(d) === id) ?? null;
  });

  readonly calendarDays = computed(() => {
    const start = this.calendarStart();
    const end = this.calendarEnd();
    const slots = this.calendarSlotsRaw();
    if (!start || !end) {
      return [];
    }
    const startDate = new Date(`${start}T00:00:00`);
    const endDate = new Date(`${end}T00:00:00`);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return [];
    }
    const days: Array<{
      date: string;
      label: string;
      status: 'available' | 'limited' | 'full' | 'closed';
      slots: CreneauCalendarEntryDto[];
    }> = [];
    for (let cursor = new Date(startDate); cursor <= endDate; cursor.setDate(cursor.getDate() + 1)) {
      const date = this.formatDateOnly(cursor);
      const daySlots = slots.filter(slot => this.formatDateOnly(new Date(slot.dateDebut)) === date);
      const openSlots = daySlots.filter(slot => !this.isClosedSlot(slot));
      const hasAvailable = openSlots.some(slot => slot.codeStatut === 'Libre');
      const hasLimited = openSlots.some(slot => slot.codeStatut === 'Reserve');
      const hasUnavailable = openSlots.some(
        slot => slot.codeStatut === 'Indisponible' && (slot.totalCount ?? 0) > 0
      );
      let status: 'available' | 'limited' | 'full' | 'closed' = 'closed';
      if (openSlots.length === 0) {
        status = 'closed';
      } else if (hasAvailable) {
        status = 'available';
      } else if (hasLimited) {
        status = 'limited';
      } else if (hasUnavailable) {
        status = 'full';
      }
      days.push({
        date,
        label: cursor.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' }),
        status,
        slots: openSlots
      });
    }
    return days;
  });

  readonly calendarSlots = computed(() => {
    const selected = this.selectedCalendarDay();
    const days = this.calendarDays();
    if (!selected) {
      return [];
    }
    return (days.find(day => day.date === selected)?.slots ?? [])
      .filter(slot => !this.isClosedSlot(slot))
      .sort((a, b) => new Date(a.dateDebut).getTime() - new Date(b.dateDebut).getTime());
  });

  stepLabels(draft: DemandeWithServices) {
    const type = draft.code_type;
    if (type === 'Devis') {
      return {
        step1: 'Demande devis',
        step2: 'Validation du devis',
        step3: 'Prise de rendez-vous',
        guide1: '1. Vérifier la demande : services, quantités, prix et pièces jointes.',
        guide2: '2. Valider le devis : ajustez les services et confirmez le montant.',
        guide3: '3. Fixer le rendez-vous : appelez le client ou proposez 1 à 3 créneaux via le site.'
      };
    }
    if (type === 'RendezVous') {
      return {
        step1: 'Demande rendez-vous',
        step2: 'Prise de rendez-vous',
        step3: 'Confirmation',
        guide1: '1. Vérifier la demande : coordonnées et commentaire du client.',
        guide2: '2. Fixer le rendez-vous : choisissez un créneau disponible.',
        guide3: '3. Confirmer : le statut passe automatiquement en confirmé dès que le rendez-vous est validé.'
      };
    }
    return {
      step1: 'Demande service',
      step2: 'Prise de rendez-vous',
      step3: 'Confirmation',
      guide1: '1. Vérifier la demande : services, quantités, prix et pièces jointes.',
      guide2: '2. Fixer le rendez-vous : appelez le client ou proposez 1 à 3 créneaux via le site.',
      guide3: '3. Confirmer : le statut passe automatiquement en confirmé dès que le rendez-vous est validé.'
    };
  }

  isStep2Done(draft: DemandeWithServices): boolean {
    if (draft.code_type === 'Devis') {
      return this.hasPriceValidation(draft);
    }
    return Boolean(draft.rendezVous?.dateDebut);
  }

  hasPriceValidation(draft: DemandeWithServices): boolean {
    return (draft.timeline ?? []).some(entry => entry?.type === 'MONTANT' && entry.montantValide != null);
  }

  canManageRendezVous(draft: DemandeWithServices | null | undefined): boolean {
    if (!draft) {
      return false;
    }
    if (draft.code_type === 'Devis') {
      return this.hasPriceValidation(draft)
        || this.hasSavedQuotePrices(draft)
        || this.hasClientRendezVousRequest(draft);
    }
    return draft.code_type === 'Service' || draft.code_type === 'RendezVous';
  }

  private hasSavedQuotePrices(draft: DemandeWithServices): boolean {
    const services = draft.services ?? [];
    if (!services.length) {
      return false;
    }
    return services.some(service => service?.prix_unitaire != null && Number.isFinite(Number(service.prix_unitaire)));
  }

  private hasClientRendezVousRequest(draft: DemandeWithServices): boolean {
    return (draft.timeline ?? []).some(entry => {
      const role = (entry?.createdByRole ?? '').toUpperCase();
      const isClient = role.includes('CLIENT');
      return isClient && entry?.type === 'COMMENTAIRE';
    });
  }

  devisTotal(draft: DemandeWithServices): number {
    return (draft.services ?? []).reduce((sum, service) => {
      const unit = Number(service?.prix_unitaire ?? 0);
      const qty = Number(service?.quantite ?? 0);
      if (!Number.isFinite(unit) || !Number.isFinite(qty)) {
        return sum;
      }
      return sum + unit * qty;
    }, 0);
  }

  readonly editDraft = computed(() => this.draft());

  readonly hasChanges = computed(() => {
    const current = this.draft();
    const baseline = this.original();
    if (!current || !baseline) return false;
    return JSON.stringify(this.normalize(baseline)) !== JSON.stringify(this.normalize(current));
  });

  readonly isDemandLockedForEdit = computed(() => {
    const draft = this.draft();
    if (!draft) {
      return false;
    }
    const rdvStatut = draft.rendezVous?.codeStatut;
    return draft.code_statut === 'Traitee'
      || draft.code_statut === 'Annulee'
      || rdvStatut === 'Confirme';
  });

  readonly isRdvLockedForEdit = computed(() => {
    const draft = this.draft();
    if (!draft) {
      return false;
    }
    const rdvStatut = draft.rendezVous?.codeStatut;
    return draft.code_statut === 'Annulee' || rdvStatut === 'Annule';
  });

  ngOnInit() {
    this.loadLookups();
    this.loadServicesCatalog();
    this.loadGarageHours();
    this.reload();
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        const focus = Number(params.get('focus'));
        if (Number.isFinite(focus)) {
          this.focusDemandeId.set(focus);
          this.openFocusDemande();
        }
      });
  }

  private loadGarageHours() {
    this.garageHoursApi.listPublic().subscribe({
      next: rows => this.garageHours.set(Array.isArray(rows) ? rows : []),
      error: () => this.garageHours.set([])
    });
  }

  get canDeleteDemandes(): boolean {
    return this.auth.getUserRole() !== 'MANAGER';
  }

  private loadLookups() {
    this.lookups.getTypeDemandes().subscribe({
      next: rows => {
        const mapped = Array.isArray(rows)
          ? rows.map(row => ({
            value: (row.codeType as TypeFilterValue) ?? 'Devis',
            label: row.libelle || row.codeType
          }))
          : [];
        const combined = [...this.fallbackTypeOptions, ...mapped];
        this.typeOptions.set([
          { value: 'Tous', label: 'Tous' },
          ...this.dedupeOptions(combined, 'Tous')
        ]);
      },
      error: () => {
        // default options kept
      }
    });

    this.lookups.getStatutDemandes().subscribe({
      next: rows => {
        const mapped = Array.isArray(rows)
          ? rows.map(row => ({
            value: (row.codeStatut as StatutFilterValue) ?? 'En_attente',
            label: row.libelle || row.codeStatut
          }))
          : [];
        const combined = [...this.fallbackStatutOptions, ...mapped];
        this.statutOptions.set([
          { value: 'Tous', label: 'Tous' },
          ...this.dedupeOptions(combined, 'Tous')
        ]);
      },
      error: () => {
        // default options kept
      }
    });

    this.lookups.getStatutRendezVous().subscribe({
      next: rows => {
        const mapped = Array.isArray(rows)
          ? rows.map(row => ({
            value: String(row.codeStatut ?? ''),
            label: row.libelle || row.codeStatut
          }))
          : [];
        const combined = [...this.fallbackRdvStatuses, ...mapped];
        this.rdvStatusOptions.set(this.dedupeOptions(combined, ''));
      },
      error: () => {
        // default RDV options kept
      }
    });
  }

  private loadServicesCatalog() {
    this.servicesApi.getAll().subscribe({
      next: rows => this.serviceCatalog.set(Array.isArray(rows) ? rows : []),
      error: () => this.serviceCatalog.set([])
    });
  }

  private dedupeOptions<T extends string>(items: Array<FilterOption<T>>, skip: string) {
    const seen = new Set<string>([skip]);
    return items.filter(item => {
      if (!item.value || seen.has(item.value)) return false;
      seen.add(item.value);
      return true;
    });
  }

  reload() {
    this.loading.set(true); this.error.set(null);
    this.api.getAll({ silentError: true }).subscribe({
      next: (rows: DemandeWithServices[]) => {
        this.demandes.set(rows);
        this.loading.set(false);
        this.openFocusDemande();
      },
      error: (e: unknown) => {
        this.error.set('Impossible de charger les demandes');
        this.loading.set(false);
        this.toast.error('Échec du chargement des demandes.', e instanceof Error ? e.message : undefined);
      }
    });
  }

  getDemandeId(d: any): number | null {
    const n = Number(d?.id_demande ?? d?.idDemande ?? d?.id ?? d?.demandeId);
    return Number.isFinite(n) ? n : null;
  }

  getServiceKey(s: any): string {
    const did = s?.idDemande ?? s?.id?.idDemande ?? 'd?';
    const sid = s?.id_service ?? s?.idService ?? s?.id?.idService ?? 's?';
    return `${did}-${sid}`;
  }

  formatServiceQuantity(service: { quantite: number; quantiteMode?: 'UNIQUE' | 'LOT'; tailleLot?: number | null }): string {
    const qty = service.quantite ?? 0;
    if (service.quantiteMode === 'LOT' && service.tailleLot) {
      if (qty === service.tailleLot) {
        return `Lot de ${service.tailleLot}`;
      }
      return `${qty} (lot de ${service.tailleLot})`;
    }
    return `x${qty}`;
  }

  openDetails(d: DemandeWithServices) {
    const id = this.getDemandeId(d);
    if (id == null) return;
    const selected = this.demandes().find(item => this.getDemandeId(item) === id);
    if (!selected) return;
    const clone = this.clone(selected);
    this.selectedId.set(id);
    this.draft.set(clone);
    this.original.set(this.clone(selected));
    this.feedback.set(null);
    this.feedbackType.set(null);
    this.documentError.set(null);
    this.newServiceSelection.set({ serviceId: null, quantite: 1, prix: null });
    this.syncRendezVousForm(clone.rendezVous ?? null);
    this.loadRendezVousProposals(id);
    this.resetProposalDraft();
    this.refreshCalendar();
    this.setBodyScrollLock(true);
  }

  private openFocusDemande() {
    const focusId = this.focusDemandeId();
    if (!focusId) return;
    const selected = this.demandes().find(item => this.getDemandeId(item) === focusId);
    if (!selected) return;
    this.focusDemandeId.set(null);
    this.openDetails(selected);
  }

  closeDetails() {
    if (this.selectedId() == null) {
      return;
    }

    this.selectedId.set(null);
    this.draft.set(null);
    this.original.set(null);
    this.feedback.set(null);
    this.feedbackType.set(null);
    this.rdvForm.set(null);
    this.rdvFeedback.set(null);
    this.rdvProposals.set([]);
    this.rdvProposalDraft.set([{ dateDebut: '', dateFin: '' }]);
    this.rdvProposalFeedback.set(null);
    this.rdvProposalFeedbackType.set(null);
    this.calendarSlotsRaw.set([]);
    this.selectedCalendarDay.set(null);
    this.calendarError.set(null);
    this.setBodyScrollLock(false);
  }

  private loadRendezVousProposals(demandeId: number) {
    this.rdvPropositionsApi.listByDemande(demandeId).subscribe({
      next: proposals => this.rdvProposals.set(proposals ?? []),
      error: () => this.rdvProposals.set([])
    });
  }

  private resetProposalDraft() {
    this.rdvProposalDraft.set([{ dateDebut: '', dateFin: '' }]);
    this.rdvProposalFeedback.set(null);
    this.rdvProposalFeedbackType.set(null);
  }

  refreshCalendar() {
    const start = this.calendarStart();
    const end = this.calendarEnd();
    if (!start || !end) return;
    this.calendarLoading.set(true);
    this.calendarError.set(null);
    this.calendarApi.getCalendar({
      start: this.toIsoStart(start),
      end: this.toIsoEnd(end),
      slotMinutes: this.calendarSlotMinutes()
    }).subscribe({
      next: slots => {
        this.calendarSlotsRaw.set(slots ?? []);
        this.ensureCalendarSelection();
        this.calendarLoading.set(false);
      },
      error: () => {
        this.calendarSlotsRaw.set([]);
        this.selectedCalendarDay.set(null);
        this.calendarLoading.set(false);
        this.calendarError.set('Impossible de charger les disponibilités.');
      }
    });
  }

  updateCalendarRange(field: 'start' | 'end', value: string) {
    if (field === 'start') {
      this.calendarStart.set(value);
    } else {
      this.calendarEnd.set(value);
    }
    this.refreshCalendar();
  }

  updateCalendarSlotMinutes(value: string) {
    const parsed = Number(value);
    const normalized = Number.isFinite(parsed) && parsed > 0 ? parsed : 30;
    this.calendarSlotMinutes.set(Math.min(Math.max(normalized, 30), 720));
    this.refreshCalendar();
  }

  applyCalendarSlot(slot: CreneauCalendarEntryDto) {
    if (!this.isSlotProposable(slot)) return;
    const draft = this.rdvProposalDraft();
    const targetIndex = draft.findIndex(item => !item.dateDebut && !item.dateFin);
    const index = targetIndex === -1 ? draft.length : targetIndex;
    if (index >= 3) {
      this.rdvProposalFeedback.set('Vous avez atteint le maximum de créneaux.');
      this.rdvProposalFeedbackType.set('error');
      return;
    }
    const nextDraft = [...draft];
    if (index === draft.length) {
      nextDraft.push({ dateDebut: '', dateFin: '' });
    }
    nextDraft[index] = {
      dateDebut: this.formatDateInput(slot.dateDebut),
      dateFin: this.formatDateInput(slot.dateFin)
    };
    this.rdvProposalDraft.set(nextDraft);
    this.rdvProposalFeedback.set('Créneau ajouté à la proposition.');
    this.rdvProposalFeedbackType.set('success');
  }

  getCalendarSlotLabel(slot: CreneauCalendarEntryDto) {
    const base = this.calendarSlotBaseLabel(slot.codeStatut);
    const total = slot.totalCount ?? null;
    const available = slot.availableCount ?? null;
    const reserved = slot.reservedCount ?? null;
    const unavailable = slot.unavailableCount ?? null;
    if (!total || total <= 0) {
      return slot.libelleStatut || base;
    }
    if (slot.codeStatut === 'Libre' && available !== null) {
      return `${base} (${available}/${total})`;
    }
    if (slot.codeStatut === 'Reserve' && reserved !== null) {
      return `${base} (${reserved}/${total})`;
    }
    if (slot.codeStatut === 'Indisponible' && unavailable !== null) {
      return `${base} (${unavailable}/${total})`;
    }
    return `${base} (0/${total})`;
  }

  private calendarSlotBaseLabel(code: string) {
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

  selectCalendarDay(date: string) {
    this.selectedCalendarDay.set(this.selectedCalendarDay() === date ? null : date);
  }

  private ensureCalendarSelection() {
    const days = this.calendarDays();
    if (!days.length) {
      this.selectedCalendarDay.set(null);
      return;
    }
    const current = this.selectedCalendarDay();
    if (current && !days.some(day => day.date === current)) {
      this.selectedCalendarDay.set(null);
    }
  }

  isSlotProposable(slot: CreneauCalendarEntryDto): boolean {
    return slot.codeStatut === 'Libre' && this.isSlotWithinOpeningHours(slot);
  }

  private isSlotWithinOpeningHours(slot: CreneauCalendarEntryDto): boolean {
    const start = new Date(slot.dateDebut);
    const end = new Date(slot.dateFin);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return false;
    }

    const openings = this.resolveOpeningRangesForDate(start);
    if (!openings.length) {
      return false;
    }

    const startMinutes = start.getHours() * 60 + start.getMinutes();
    const endMinutes = end.getHours() * 60 + end.getMinutes();
    return openings.some(range => startMinutes >= range.start && endMinutes <= range.end);
  }

  private resolveOpeningRangesForDate(date: Date): Array<{ start: number; end: number }> {
    const dayIso = this.formatDateOnly(date);
    const dayKey = this.dayOfWeekToApiKey(date);
    const allHours = this.garageHours();

    const exceptional = allHours.filter(hour => hour.scope === 'EXCEPTIONAL' && this.isDateInExceptionalRange(dayIso, hour));
    const relevant = exceptional.length
      ? exceptional
      : allHours.filter(hour => hour.scope === 'ANNUAL' && hour.dayOfWeek === dayKey);

    if (!relevant.length || relevant.some(hour => hour.status === 'CLOSED')) {
      return [];
    }

    return relevant
      .flatMap(hour => this.toMinuteRanges(hour))
      .filter((range): range is { start: number; end: number } => range !== null);
  }

  private isDateInExceptionalRange(dayIso: string, hour: GarageHourDto): boolean {
    if (hour.exceptionalType === 'SINGLE_DAY') {
      return !!hour.exceptionalDate && hour.exceptionalDate === dayIso;
    }
    if (hour.exceptionalType === 'PERIOD') {
      if (!hour.exceptionalStartDate || !hour.exceptionalEndDate) {
        return false;
      }
      return dayIso >= hour.exceptionalStartDate && dayIso <= hour.exceptionalEndDate;
    }
    return false;
  }

  private toMinuteRanges(hour: GarageHourDto): Array<{ start: number; end: number } | null> {
    if (hour.status !== 'OPEN') {
      return [];
    }
    const first = this.toMinuteRange(hour.startTime, hour.endTime);
    if (hour.openingType === 'SPLIT') {
      return [first, this.toMinuteRange(hour.startTime2, hour.endTime2)];
    }
    return [first];
  }

  private toMinuteRange(start?: string | null, end?: string | null): { start: number; end: number } | null {
    const startMinutes = this.parseMinutes(start);
    const endMinutes = this.parseMinutes(end);
    if (startMinutes === null || endMinutes === null || startMinutes >= endMinutes) {
      return null;
    }
    return { start: startMinutes, end: endMinutes };
  }

  private parseMinutes(value?: string | null): number | null {
    if (!value) {
      return null;
    }
    const [hoursRaw, minutesRaw] = value.split(':');
    const hours = Number(hoursRaw);
    const minutes = Number(minutesRaw);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
      return null;
    }
    return hours * 60 + minutes;
  }

  private dayOfWeekToApiKey(date: Date): string {
    const day = date.getDay();
    const mapping = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    return mapping[day] ?? 'MONDAY';
  }

  private isClosedSlot(slot: CreneauCalendarEntryDto): boolean {
    return slot.codeStatut === 'Indisponible' && (slot.totalCount ?? 0) === 0;
  }

  calendarStatusStyle(status: 'available' | 'limited' | 'full' | 'closed') {
    switch (status) {
      case 'available':
        return { '--status-bg': 'rgba(34, 197, 94, 0.08)', '--status-border': 'rgba(34, 197, 94, 0.6)', '--status-color': '#15803d' };
      case 'limited':
        return { '--status-bg': 'rgba(249, 115, 22, 0.08)', '--status-border': 'rgba(249, 115, 22, 0.6)', '--status-color': '#c2410c' };
      case 'full':
        return { '--status-bg': 'rgba(239, 68, 68, 0.08)', '--status-border': 'rgba(239, 68, 68, 0.5)', '--status-color': '#b91c1c' };
      case 'closed':
      default:
        return { '--status-bg': 'rgba(148, 163, 184, 0.12)', '--status-border': 'rgba(148, 163, 184, 0.5)', '--status-color': '#475569' };
    }
  }

  addProposalSlot() {
    const current = this.rdvProposalDraft();
    if (current.length >= 3) {
      this.rdvProposalFeedback.set('Vous pouvez proposer jusqu’à 3 créneaux.');
      this.rdvProposalFeedbackType.set('error');
      return;
    }
    this.rdvProposalDraft.set([...current, { dateDebut: '', dateFin: '' }]);
  }

  removeProposalSlot(index: number) {
    const current = this.rdvProposalDraft();
    if (current.length <= 1) return;
    this.rdvProposalDraft.set(current.filter((_, i) => i !== index));
  }

  setProposalSlot(index: number, field: 'dateDebut' | 'dateFin', value: string) {
    const current = this.rdvProposalDraft();
    const next = current.map((slot, i) => i === index ? { ...slot, [field]: value } : slot);
    this.rdvProposalDraft.set(next);
  }

  submitProposalSlots() {
    const demandeId = this.selectedId();
    const draft = this.draft();
    if (demandeId == null || !this.canManageRendezVous(draft)) return;
    const payload = this.buildProposalPayload();
    if (!payload) {
      return;
    }
    this.rdvProposalFeedback.set(null);
    this.rdvProposalFeedbackType.set(null);
    this.rdvPropositionsApi.create(demandeId, payload).subscribe({
      next: proposals => {
        this.rdvProposals.set(proposals ?? []);
        this.resetProposalDraft();
        this.rdvProposalFeedback.set('Créneaux envoyés au client. Il dispose de 24h pour répondre.');
        this.rdvProposalFeedbackType.set('success');
      },
      error: err => {
        const msg = err?.error?.message || 'Impossible d’envoyer les créneaux.';
        this.rdvProposalFeedback.set(msg);
        this.rdvProposalFeedbackType.set('error');
      }
    });
  }

  acceptProposal(propositionId: number) {
    const demandeId = this.selectedId();
    if (demandeId == null) return;
    this.rdvPropositionsApi.accept(demandeId, propositionId).subscribe({
      next: () => {
        this.loadRendezVousProposals(demandeId);
        this.reload();
      },
      error: err => {
        const msg = err?.error?.message || 'Impossible de valider ce créneau.';
        this.rdvProposalFeedback.set(msg);
        this.rdvProposalFeedbackType.set('error');
      }
    });
  }

  declineProposal(propositionId: number) {
    const demandeId = this.selectedId();
    if (demandeId == null) return;
    this.rdvPropositionsApi.decline(demandeId, propositionId).subscribe({
      next: () => this.loadRendezVousProposals(demandeId),
      error: err => {
        const msg = err?.error?.message || 'Impossible de refuser ce créneau.';
        this.rdvProposalFeedback.set(msg);
        this.rdvProposalFeedbackType.set('error');
      }
    });
  }

  proposalStatusLabel(statut: RendezVousProposition['statut']) {
    switch (statut) {
      case 'PROPOSE':
        return 'Proposé';
      case 'ACCEPTE':
        return 'Accepté';
      case 'REFUSE':
        return 'Refusé';
      case 'EXPIRE':
        return 'Expiré';
      default:
        return statut;
    }
  }

  private buildProposalPayload(): RendezVousPropositionBatchPayload | null {
    const draftSlots = this.rdvProposalDraft()
      .map(slot => ({
        dateDebut: this.parseDateInput(slot.dateDebut),
        dateFin: this.parseDateInput(slot.dateFin)
      }))
      .filter(slot => slot.dateDebut && slot.dateFin) as { dateDebut: string; dateFin: string }[];

    const slots = [...draftSlots].reduce((acc, slot) => {
      const key = `${slot.dateDebut}|${slot.dateFin}`;
      if (!acc.some(item => `${item.dateDebut}|${item.dateFin}` === key)) {
        acc.push(slot);
      }
      return acc;
    }, [] as { dateDebut: string; dateFin: string }[]);

    if (!slots.length) {
      this.rdvProposalFeedback.set('Ajoutez au moins un créneau complet.');
      this.rdvProposalFeedbackType.set('error');
      return null;
    }

    if (slots.length > 3) {
      this.rdvProposalFeedback.set('Supprimez un créneau existant avant d’en ajouter un nouveau (max 3).');
      this.rdvProposalFeedbackType.set('error');
      return null;
    }

    return { propositions: slots };
  }

  updateDraft(mutator: (draft: DemandeWithServices) => void) {
    const current = this.draft();
    if (!current) return;
    const copy = this.clone(current);
    mutator(copy);
    this.draft.set(copy);
  }

  setDraftType(value: DemandeWithServices['code_type']) {
    this.updateDraft(d => { d.code_type = value; });
  }

  setDraftStatut(value: DemandeWithServices['code_statut']) {
    this.updateDraft(d => { d.code_statut = value; });
  }

  updateClientField(
    field: 'telephone'
      | 'immatriculation'
      | 'vehiculeMarque'
      | 'vehiculeModele'
      | 'vehiculeEnergie'
      | 'adresseLigne1'
      | 'adresseLigne2'
      | 'adresseCodePostal'
      | 'adresseVille',
    value: string | null
  ) {
    this.updateDraft(d => {
      if (!d.client) return;
      const normalized = value == null ? null : String(value);
      (d.client as any)[field] = normalized && normalized.trim().length > 0 ? normalized.trim() : null;
    });
  }

  updateServiceField(index: number, field: 'quantite'|'prix_unitaire', value: string | number | null) {
    this.updateDraft(d => {
      const svc = d.services[index];
      if (!svc) return;
      if (field === 'quantite') {
        const num = Number(value);
        let qty = Number.isFinite(num) && num > 0 ? Math.round(num) : 1;
        if (svc.quantite_max && qty > svc.quantite_max) {
          qty = svc.quantite_max;
        }
        svc.quantite = qty;
      } else {
        const rawValue = value === '' || value == null ? null : Number(value);
        if (typeof rawValue === 'number' && Number.isFinite(rawValue)) {
          svc.prix_unitaire = Number(rawValue.toFixed(2));
        } else {
          svc.prix_unitaire = undefined;
        }
      }
    });
  }

  removeService(index: number) {
    this.updateDraft(d => {
      d.services = d.services.filter((_, i) => i !== index);
    });
  }

  setNewServiceField(field: keyof NewServiceSelection, value: string | number | null) {
    const current = this.newServiceSelection();
    const next: NewServiceSelection = { ...current };
    if (field === 'serviceId') {
      next.serviceId = value == null ? null : Number(value);
    } else if (field === 'quantite') {
      const num = Number(value);
      next.quantite = Number.isFinite(num) && num > 0 ? Math.round(num) : 1;
    } else if (field === 'prix') {
      const num = value == null || value === '' ? null : Number(value);
      next.prix = Number.isFinite(num as number) ? Number((num as number).toFixed(2)) : null;
    }
    this.newServiceSelection.set(next);
  }

  addServiceLineFromSelection() {
    const selection = this.newServiceSelection();
    const catalog = this.serviceCatalog();
    const svc = catalog.find(item => item.idService === selection.serviceId);
    if (!svc || !svc.idService) {
      this.toast.error('Sélectionnez un service à ajouter.');
      return;
    }

    const prixValue = selection.prix ?? Number(svc.prixUnitaire ?? 0);
    this.updateDraft(d => {
      d.services = [
        ...d.services,
        {
          id_service: svc.idService!,
          libelle: svc.libelle,
          quantite: selection.quantite || 1,
          prix_unitaire: Number.isFinite(prixValue) ? Number(prixValue.toFixed(2)) : undefined
        }
      ];
    });

    this.newServiceSelection.set({ serviceId: null, quantite: 1, prix: null });
  }

  onDocumentSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0] ?? null;
    if (input) {
      input.value = '';
    }
    const id = this.selectedId();
    if (!file || id == null) {
      return;
    }

    this.documentUploading.set(true);
    this.documentError.set(null);

    this.api.uploadDocument(id, file, { visibleClient: true }).subscribe({
      next: doc => {
        this.updateDraft(d => {
          const docs = Array.isArray(d.documents) ? d.documents : [];
          d.documents = [...docs, doc];
        });
        this.demandes.update(list =>
          list.map(item => this.getDemandeId(item) === id
            ? { ...item, documents: [...(item.documents ?? []), doc] }
            : item
          )
        );
        this.documentError.set(null);
        this.toast.success('Document ajouté à la demande.');
      },
      error: err => {
        const msg = err?.error?.message || err.message || 'Téléversement impossible.';
        this.documentError.set(msg);
        this.toast.error('Erreur', msg);
        this.documentUploading.set(false);
      },
      complete: () => this.documentUploading.set(false)
    });
  }

  removeDocument(doc: DemandeDocumentDto) {
    const id = this.selectedId();
    if (!doc?.idDocument || id == null) {
      return;
    }
    this.api.deleteDocument(id, doc.idDocument).subscribe({
      next: () => {
        this.updateDraft(d => {
          d.documents = (d.documents ?? []).filter(item => item.idDocument !== doc.idDocument);
        });
        this.demandes.update(list =>
          list.map(item => this.getDemandeId(item) === id
            ? { ...item, documents: (item.documents ?? []).filter(existing => existing.idDocument !== doc.idDocument) }
            : item
          )
        );
        this.toast.info('Document supprimé.');
      },
      error: err => {
        const msg = err?.error?.message || err.message || 'Suppression impossible.';
        this.toast.error('Erreur', msg);
      }
    });
  }

  resetDraft() {
    const original = this.original();
    if (!original) return;
    this.draft.set(this.clone(original));
    this.feedback.set(null);
    this.feedbackType.set(null);
    this.documentError.set(null);
    this.devisValidationComment.set('');
    this.devisValidationFeedback.set(null);
    this.devisValidationFeedbackType.set(null);
    this.syncRendezVousForm(original.rendezVous ?? null);
  }

  saveChanges() {
    const id = this.selectedId();
    const draft = this.draft();
    const original = this.original();
    if (id == null || !draft || this.saving()) return;

    this.saving.set(true);
    this.feedback.set(null);
    this.feedbackType.set(null);

    if (!original) {
      this.saving.set(false);
      this.toast.error('Impossible de comparer les modifications.');
      return;
    }

    const client = this.buildClientPayload(draft.client);

    const originalClient = this.buildClientPayload(original.client);
    const clientChanged = JSON.stringify(client ?? {}) !== JSON.stringify(originalClient ?? {});
    const immatriculationChanged =
      (draft.client?.immatriculation ?? null) !== (original.client?.immatriculation ?? null);
    const typeChanged = draft.code_type !== original.code_type;
    const statutChanged = draft.code_statut !== original.code_statut;
    const unsupportedStatut =
      statutChanged && !['En_attente', 'Annulee'].includes(draft.code_statut);
    if (unsupportedStatut) {
      this.toast.info('Changement de statut non pris en charge via l’API.');
      this.updateDraft(d => { d.code_statut = original.code_statut; });
    }

    const serviceDiff = this.computeServiceChanges(original.services, draft.services);

    const ops = [
      typeChanged ? this.api.updateType(id, draft.code_type) : null,
      immatriculationChanged ? this.api.updateImmatriculation(id, draft.client?.immatriculation ?? null) : null,
      clientChanged && client ? this.api.updateClient(id, client) : null,
      ...(statutChanged && !unsupportedStatut && draft.code_statut === 'En_attente'
        ? [this.api.submitDemande(id)]
        : []),
      ...(statutChanged && !unsupportedStatut && draft.code_statut === 'Annulee'
        ? [this.api.archiveDemande(id)]
        : []),
      ...serviceDiff.toAdd.map(service => this.api.addUnique({
        demandeId: id,
        serviceId: service.id_service,
        quantite: service.quantite,
        prixUnitaire: service.prix_unitaire ?? null
      })),
      ...serviceDiff.toUpdate.map(service => this.api.updateServiceLine({
        demandeId: id,
        serviceId: service.id_service,
        quantite: service.quantite,
        prixUnitaire: service.prix_unitaire ?? null
      })),
      ...serviceDiff.toRemove.map(service => this.api.deleteLine(id, service.id_service))
    ].filter(Boolean);

    if (!ops.length) {
      this.saving.set(false);
      this.feedback.set('Aucune modification détectée.');
      this.feedbackType.set('success');
      this.toast.info('Aucune modification détectée.');
      return;
    }

    forkJoin(ops).subscribe({
      next: () => {
        this.api.getById(id, { silentError: true }).subscribe({
          next: updated => {
            if (!updated) {
              this.saving.set(false);
              this.feedback.set('Mise à jour terminée.');
              this.feedbackType.set('success');
              return;
            }
            const merged = this.mergeDraftWithResponse(draft, updated);
            this.demandes.update(list =>
              list.map(item => this.getDemandeId(item) === id ? merged : item)
            );
            this.original.set(this.clone(merged));
            this.draft.set(this.clone(merged));
            this.saving.set(false);
            this.feedback.set('Demande mise à jour avec succès.');
            this.feedbackType.set('success');
            this.toast.success('Demande mise à jour avec succès.');
          },
          error: () => {
            this.saving.set(false);
            this.feedback.set('Demande mise à jour avec succès.');
            this.feedbackType.set('success');
            this.toast.success('Demande mise à jour avec succès.');
          }
        });
      },
      error: () => {
        this.saving.set(false);
        this.feedback.set('Échec de la mise à jour de la demande.');
        this.feedbackType.set('error');
        this.toast.error('Échec de la mise à jour de la demande.');
      }
    });
  }

  validateDevis() {
    const draft = this.draft();
    const demandeId = this.selectedId();
    if (!draft || demandeId == null) {
      return;
    }
    if (this.devisValidationSaving()) {
      return;
    }
    const montant = this.devisTotal(draft);
    if (!Number.isFinite(montant) || montant <= 0) {
      this.devisValidationFeedback.set('Renseignez des prix valides pour valider le devis.');
      this.devisValidationFeedbackType.set('error');
      return;
    }

    this.devisValidationSaving.set(true);
    this.devisValidationFeedback.set(null);
    this.devisValidationFeedbackType.set(null);

    const commentaire = this.devisValidationComment().trim();
    this.api.validatePrice(demandeId, montant, commentaire.length ? commentaire : null).subscribe({
      next: () => {
        const entry = {
          type: 'MONTANT',
          montantValide: montant,
          commentaire: commentaire.length ? commentaire : null,
          createdAt: new Date().toISOString(),
          createdByRole: 'ADMIN'
        };
        this.updateDraft(d => {
          const timeline = Array.isArray(d.timeline) ? d.timeline : [];
          d.timeline = [entry as any, ...timeline];
        });
        this.demandes.update(list =>
          list.map(item => this.getDemandeId(item) === demandeId
            ? {
              ...item,
              timeline: [entry as any, ...(item.timeline ?? [])]
            }
            : item
          )
        );
        this.api.getById(demandeId, { silentError: true }).subscribe({
          next: refreshed => {
            if (!refreshed) {
              return;
            }
            const merged = this.mergeDraftWithResponse(draft, refreshed);
            this.updateDraft(d => Object.assign(d, merged));
            this.demandes.update(list =>
              list.map(item => this.getDemandeId(item) === demandeId ? merged : item)
            );
            const original = this.original();
            if (original) {
              this.original.set(this.clone(merged));
            }
          }
        });
        this.devisValidationFeedback.set('Devis validé et transmis au client.');
        this.devisValidationFeedbackType.set('success');
        this.devisValidationSaving.set(false);
      },
      error: err => {
        const msg = err?.error?.message || 'Impossible de valider le devis.';
        this.devisValidationFeedback.set(msg);
        this.devisValidationFeedbackType.set('error');
        this.devisValidationSaving.set(false);
      }
    });
  }

  supprimer(d: any) {
    const id = this.getDemandeId(d);
    if (id == null) {
      this.toast.error('Demande introuvable.', 'Identifiant manquant.');
      return;
    }
    if (!confirm('Supprimer définitivement cette demande ?')) return;

    this.api.delete(id).subscribe({
      next: () => this.demandes.update(list =>
        list.filter(x => this.getDemandeId(x) !== id)
      ),
      complete: () => {
        this.toast.success('Demande supprimée.');
      },
      error: () => {
        this.toast.error('Échec de la suppression de la demande.');
      }
    });
  }

  private clone(d: DemandeWithServices): DemandeWithServices {
    const trimmedClient = this.trimClientStrings(d.client);

    return {
      ...d,
      client: trimmedClient ? { ...trimmedClient } : undefined,
      services: d.services.map(s => ({ ...s }))
    };
  }

  private mergeDraftWithResponse(
    base: DemandeWithServices,
    response?: DemandeWithServices | null
  ): DemandeWithServices {
    if (!response) {
      return this.clone(base);
    }

    const services = response.services?.length
      ? this.normalizeServicesFromApi(response.services as any[])
      : base.services;

    const client = this.mergeClient(base.client, (response as any)?.client);
    const documents = Array.isArray((response as any)?.documents)
      ? (response as any).documents as DemandeDocumentDto[]
      : base.documents;
    const rendezVous = 'rendezVous' in (response as any)
      ? (response as any).rendezVous ?? null
      : base.rendezVous ?? null;

    return this.clone({
      ...base,
      ...response,
      client: client ?? undefined,
      services,
      documents,
      rendezVous
    } as DemandeWithServices);
  }

  private normalize(d: DemandeWithServices) {
    const sorted = [...d.services].sort((a, b) => a.id_service - b.id_service);
    const trimmedClient = this.trimClientStrings(d.client);

    return {
      ...d,
      client: trimmedClient,
      services: sorted.map(s => ({
        id_service: s.id_service,
        libelle: s.libelle,
        quantite: s.quantite,
        prix_unitaire: s.prix_unitaire ?? null,
        quantite_max: s.quantite_max ?? null
      }))
    };
  }

  private normalizeServicesFromApi(rows: any[]): ServiceItem[] {
    if (!Array.isArray(rows)) {
      return [];
    }
    return rows.map((raw: any) => {
      const toNumber = (value: any, fallback: number) => {
        const n = Number(value);
        return Number.isFinite(n) ? n : fallback;
      };

      const id = toNumber(raw?.id_service ?? raw?.idService ?? raw?.id?.idService, -1);
      const quantity = Math.max(1, toNumber(raw?.quantite, 1));
      const priceValue = raw?.prix_unitaire ?? raw?.prixUnitaire ?? null;
      const priceRaw = priceValue === null || priceValue === '' || priceValue === undefined
        ? undefined
        : Number(priceValue);
      const maxValue = raw?.quantite_max ?? raw?.quantiteMax ?? null;
      const maxQty = maxValue === null || maxValue === undefined ? undefined : toNumber(maxValue, NaN);

      return {
        id_service: id,
        libelle: String(raw?.libelle ?? ''),
        quantite: quantity,
        prix_unitaire: typeof priceRaw === 'number' && Number.isFinite(priceRaw)
          ? Number(priceRaw.toFixed(2))
          : undefined,
        quantite_max: Number.isFinite(maxQty) ? Math.max(1, Math.round(<number>maxQty)) : undefined
      } satisfies ServiceItem;
    });
  }

  private computeServiceChanges(
    original: ServiceItem[],
    draft: ServiceItem[]
  ): { toAdd: ServiceItem[]; toUpdate: ServiceItem[]; toRemove: ServiceItem[] } {
    const originalMap = new Map<number, ServiceItem>();
    original.forEach(service => {
      originalMap.set(service.id_service, service);
    });

    const draftMap = new Map<number, ServiceItem>();
    draft.forEach(service => {
      draftMap.set(service.id_service, service);
    });

    const toAdd = draft.filter(service => !originalMap.has(service.id_service));
    const toRemove = original.filter(service => !draftMap.has(service.id_service));
    const toUpdate = draft.filter(service => {
      const base = originalMap.get(service.id_service);
      if (!base) {
        return false;
      }
      const quantityChanged = service.quantite !== base.quantite;
      const priceChanged =
        Number(service.prix_unitaire ?? 0) !== Number(base.prix_unitaire ?? 0);
      return quantityChanged || priceChanged;
    });

    return { toAdd, toUpdate, toRemove };
  }

  private trimClientStrings(
    client: DemandeWithServices['client'] | undefined
  ): NonNullable<DemandeWithServices['client']> | undefined {
    if (!client) {
      return undefined;
    }

    const base = { ...client } as NonNullable<DemandeWithServices['client']>;

    return {
      ...base,
      telephone: this.trimOrNull(base.telephone),
      immatriculation: this.trimOrNull(base.immatriculation),
      vehiculeMarque: this.trimOrNull(base.vehiculeMarque),
      vehiculeModele: this.trimOrNull(base.vehiculeModele),
      vehiculeEnergie: this.trimOrNull(base.vehiculeEnergie),
      adresseLigne1: this.trimOrNull(base.adresseLigne1),
      adresseLigne2: this.trimOrNull(base.adresseLigne2),
      adresseCodePostal: this.trimOrNull(base.adresseCodePostal),
      adresseVille: this.trimOrNull(base.adresseVille)
    };
  }

  private buildClientPayload(
    client: DemandeWithServices['client'] | undefined
  ): {
    telephone?: string | null;
    vehiculeMarque?: string | null;
    vehiculeModele?: string | null;
    vehiculeEnergie?: string | null;
    adresseLigne1?: string | null;
    adresseLigne2?: string | null;
    adresseCodePostal?: string | null;
    adresseVille?: string | null;
  } | undefined {
    const trimmed = this.trimClientStrings(client);
    if (!trimmed) {
      return undefined;
    }

    const payload = {
      telephone: this.trimOrNull(trimmed.telephone),
      vehiculeMarque: this.trimOrNull(trimmed.vehiculeMarque),
      vehiculeModele: this.trimOrNull(trimmed.vehiculeModele),
      vehiculeEnergie: this.trimOrNull(trimmed.vehiculeEnergie),
      adresseLigne1: this.trimOrNull(trimmed.adresseLigne1),
      adresseLigne2: this.trimOrNull(trimmed.adresseLigne2),
      adresseCodePostal: this.trimOrNull(trimmed.adresseCodePostal),
      adresseVille: this.trimOrNull(trimmed.adresseVille)
    };

    const hasData = Object.values(payload).some(value => value != null);
    return hasData ? payload : undefined;
  }

  private trimOrNull(value: string | null | undefined): string | null {
    if (value == null) {
      return null;
    }

    const trimmed = String(value).trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  trimOrEmpty(value: string | null | undefined): string {
    return this.trimOrNull(value) ?? '';
  }

  // Compatibilité : certaines sections du template utilisent encore mergeClient pour combiner
  // les informations du client. On conserve une implémentation sûre ici pour éviter les erreurs
  // lors de la compilation stricte.
  mergeClient(
    current: DemandeWithServices['client'] | undefined,
    updates: Partial<NonNullable<DemandeWithServices['client']>>
  ): NonNullable<DemandeWithServices['client']> {
    const base = this.trimClientStrings(current) ?? ({} as NonNullable<DemandeWithServices['client']>);
    const merged = { ...base, ...updates };
    return this.trimClientStrings(merged) ?? merged;
  }

  private syncRendezVousForm(rdv: RendezVousSummary | null) {
    const template: RendezVousFormState = {
      idRdv: rdv?.idRdv ?? null,
      creneauId: rdv?.creneau?.idCreneau ?? null,
      dateDebut: this.formatDateInput(rdv?.dateDebut ?? null),
      dateFin: this.formatDateInput(rdv?.dateFin ?? null),
      codeStatut: rdv?.codeStatut ?? (this.rdvStatusOptions()[0]?.value ?? 'Confirme'),
      commentaire: rdv?.commentaire ?? null
    };
    this.rdvForm.set(template);
  }

  rdvStatusOptionsFor(rdv: RendezVousFormState): RdvStatusOption[] {
    const options = this.rdvStatusOptions();
    const existing = this.draft()?.rendezVous;
    if (!existing?.idRdv || existing.codeStatut !== 'Confirme') {
      return options;
    }
    return options.map(opt => opt.value === 'Confirme' ? { ...opt, disabled: true } : opt);
  }

  setRdvField(field: keyof RendezVousFormState, value: string) {
    const current = this.rdvForm();
    if (!current) return;
    const next = { ...current };
    if (field === 'commentaire') {
      next.commentaire = value?.trim().length ? value : null;
    } else {
      (next as any)[field] = value;
      if (field === 'dateDebut' || field === 'dateFin') {
        next.creneauId = null;
      }
    }
    this.rdvForm.set(next);
  }

  saveRendezVous() {
    const form = this.rdvForm();
    const demandeId = this.selectedId();
    if (!form || demandeId == null || this.rdvSaving()) {
      return;
    }

    if (!form.dateDebut || !form.dateFin) {
      this.rdvFeedback.set('Veuillez renseigner les dates de début et de fin.');
      this.rdvFeedbackType.set('error');
      this.toast.error('Erreur', 'Dates de rendez-vous incomplètes.');
      return;
    }

    const dateDebutIso = this.parseDateInput(form.dateDebut);
    const dateFinIso = this.parseDateInput(form.dateFin);

    if (!dateDebutIso || !dateFinIso) {
      this.rdvFeedback.set('Format de date invalide.');
      this.rdvFeedbackType.set('error');
      this.toast.error('Erreur', 'Format de date invalide.');
      return;
    }

    const draft = this.draft();
    if (!this.canManageRendezVous(draft)) {
      this.rdvFeedback.set('Validez le devis avant de planifier un rendez-vous.');
      this.rdvFeedbackType.set('error');
      this.toast.error('Erreur', "Validez d'abord le devis.");
      return;
    }
    const existingRdv = draft?.rendezVous ?? null;
    const existingStart = existingRdv?.dateDebut ? this.parseDateInput(this.formatDateInput(existingRdv.dateDebut)) : null;
    const existingEnd = existingRdv?.dateFin ? this.parseDateInput(this.formatDateInput(existingRdv.dateFin)) : null;

    if (existingRdv?.idRdv && existingRdv.codeStatut === 'Confirme' && form.codeStatut === 'Confirme') {
      const msg = 'Un rendez-vous déjà confirmé doit être annulé ou reporté pour être modifié.';
      this.rdvFeedback.set(msg);
      this.rdvFeedbackType.set('error');
      this.toast.error('Erreur', msg);
      return;
    }

    if (
      form.codeStatut === 'Reporte' &&
      existingRdv?.idRdv &&
      existingStart === dateDebutIso &&
      existingEnd === dateFinIso
    ) {
      const msg = 'Pour reporter un rendez-vous, modifiez les dates avant de confirmer.';
      this.rdvFeedback.set(msg);
      this.rdvFeedbackType.set('error');
      this.toast.error('Erreur', msg);
      return;
    }

    const payloadBase = {
      dateDebut: dateDebutIso,
      dateFin: dateFinIso,
      codeStatut: form.codeStatut || 'Confirme',
      commentaire: form.commentaire,
      creneauId: form.creneauId
    };
    const createPayload: RendezVousUpsertPayload = {
      demandeId,
      ...payloadBase
    };

    if (!form.idRdv && draft?.code_type === 'Service' && !draft?.services?.[0]?.id_service) {
      this.rdvFeedback.set('Aucun service associé pour planifier le rendez-vous.');
      this.rdvFeedbackType.set('error');
      this.toast.error('Erreur', 'Aucun service associé pour planifier le rendez-vous.');
      return;
    }

    this.rdvSaving.set(true);
    this.rdvFeedback.set(null);
    this.rdvFeedbackType.set(null);

    const request = form.idRdv
      ? this.rendezVousApi.update(form.idRdv, payloadBase)
      : this.createRendezVousFromDraft(
        createPayload,
        draft?.code_type,
        draft?.services?.[0]?.id_service ?? null,
        draft?.devis?.id_devis ?? null
      );

    request.subscribe({
      next: rdv => {
        this.rdvSaving.set(false);
        const rendezVous = rdv ?? null;
        this.syncRendezVousForm(rendezVous);
        this.updateDraft(d => { d.rendezVous = rendezVous ?? undefined; });
        this.demandes.update(list =>
          list.map(item => this.getDemandeId(item) === demandeId
            ? { ...item, rendezVous }
            : item
          )
        );
        this.applyAutoStatutFromRdv(rendezVous);
        this.rdvFeedback.set('Rendez-vous mis à jour et client informé.');
        this.rdvFeedbackType.set('success');
        this.toast.success('Rendez-vous confirmé.');
      },
      error: err => {
        this.rdvSaving.set(false);
        let msg = err?.error?.message || err.message || 'Impossible de mettre à jour le rendez-vous.';
        if (err?.status === 409) {
          msg = 'Conflit sur le créneau : choisissez un autre horaire ou modifiez les dates.';
        }
        this.rdvFeedback.set(msg);
        this.rdvFeedbackType.set('error');
        this.toast.error('Erreur', msg);
      }
    });
  }

  private createRendezVousFromDraft(
    payload: RendezVousUpsertPayload,
    type: DemandeWithServices['code_type'] | null | undefined,
    serviceId: number | null,
    devisId: number | null
  ) {
    if (type === 'Devis' && devisId) {
      return this.rendezVousApi.createForDevis(devisId, payload);
    }
    if (type === 'Service' && serviceId) {
      return this.rendezVousApi.createForService(serviceId, payload);
    }
    return this.rendezVousApi.create(payload);
  }

  private applyAutoStatutFromRdv(rdv: RendezVousSummary | null) {
    const draft = this.draft();
    if (!draft || !rdv) {
      return;
    }
    if (draft.code_statut === 'Annulee') {
      return;
    }
    const nextStatut: DemandeWithServices['code_statut'] =
      rdv.codeStatut === 'Annule' ? 'Annulee'
        : rdv.codeStatut === 'Confirme' ? 'Traitee'
          : 'En_attente';
    if (draft.code_statut === nextStatut) {
      return;
    }
    this.updateDraft(d => { d.code_statut = nextStatut; });
    const demandeId = this.selectedId();
    if (demandeId == null) {
      return;
    }
    this.demandes.update(list =>
      list.map(item => this.getDemandeId(item) === demandeId
        ? { ...item, code_statut: nextStatut }
        : item
      )
    );
    const original = this.original();
    if (original) {
      this.original.set({ ...original, code_statut: nextStatut });
    }
  }

  private formatDateInput(value: string | null): string {
    if (!value) {
      return '';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  private parseDateInput(value: string | null): string | null {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  private formatDateOnly(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  private toIsoStart(value: string): string {
    return new Date(`${value}T00:00:00`).toISOString();
  }

  private toIsoEnd(value: string): string {
    return new Date(`${value}T23:59:59`).toISOString();
  }

  private addDays(date: Date, days: number): Date {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  }

  // ⚠️ ADAPTÉ : utilise maintenant tailleOctets (backend) pour déduire la taille en Ko / Mo
  documentSize(doc: DemandeDocumentDto | undefined): string | null {
    if (!doc) return null;

    const bytes = Number((doc as any).tailleOctets ?? 0);
    if (!Number.isFinite(bytes) || bytes <= 0) {
      return null;
    }

    const ko = bytes / 1024;
    if (ko >= 1024) {
      const mo = ko / 1024;
      return `${mo.toFixed(1)} Mo`;
    }
    return `${ko.toFixed(0)} Ko`;
  }

  openAdminDocument(doc: DemandeDocumentDto, d: DemandeWithServices) {
    const id = this.getDemandeId(d);
    if (!id || !doc.idDocument) return;

    this.api.downloadDocumentResponse(id, doc.idDocument).subscribe({
      next: res => {
        const blob = res.body!;
        const blobUrl = window.URL.createObjectURL(blob);

        window.open(blobUrl, "_blank");

        setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
      },
      error: err => {
        this.toast.error('Impossible de lire le document', err?.error?.message);
      }
    });
  }


  @HostListener('document:keydown.escape')
  onEscape() {
    this.closeDetails();
  }

  ngOnDestroy() {
    this.setBodyScrollLock(false);
  }

  private setBodyScrollLock(lock: boolean) {
    if (typeof document === 'undefined') {
      return;
    }

    const className = 'admin-modal-open';
    document.body.classList[lock ? 'add' : 'remove'](className);
  }
}
