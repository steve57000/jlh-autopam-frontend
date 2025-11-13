import { Component, HostListener, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { DemandesServiceService } from '../services/demandes-services.service';
import { DemandeWithServices, ServiceItem } from '../modeles/demande.model';
import {FormsModule} from '@angular/forms';
import { ToastService } from '../shared/toast/toast.service';

@Component({
  selector: 'admin-demandes',
  templateUrl: './admin-demandes.component.html',
  styleUrls: ['./admin-demandes.component.scss'],
  imports: [DatePipe, FormsModule],
  standalone: true
})
export class AdminDemandesComponent implements OnInit, OnDestroy {
  private api = inject(DemandesServiceService);
  private readonly toast = inject(ToastService);

  // Données
  loading = signal(true);
  error = signal<string | null>(null);
  demandes = signal<DemandeWithServices[]>([]);
  saving = signal(false);
  feedback = signal<string | null>(null);
  feedbackType = signal<'success' | 'error' | null>(null);

  // Filtres
  type = signal<'Tous'|'Devis'|'Service'|'RendezVous'>('Tous');
  statut = signal<'Tous'|'En_attente'|'Traitee'|'Annulee'>('Tous');
  q = signal('');
  dateFrom = signal<string | null>(null); // 'YYYY-MM-DD'
  dateTo = signal<string | null>(null);

  // Détails / édition
  selectedId = signal<number | null>(null);
  private draft = signal<DemandeWithServices | null>(null);
  private original = signal<DemandeWithServices | null>(null);

  // Liste des types/statuts pour le template
  readonly types = ['Tous','Devis','Service','RendezVous'] as const;
  readonly statuts = ['Tous','En_attente','Traitee','Annulee'] as const;

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

  readonly editDraft = computed(() => this.draft());

  readonly hasChanges = computed(() => {
    const current = this.draft();
    const baseline = this.original();
    if (!current || !baseline) return false;
    return JSON.stringify(this.normalize(baseline)) !== JSON.stringify(this.normalize(current));
  });

  ngOnInit() {
    this.reload();
  }

  reload() {
    this.loading.set(true); this.error.set(null);
    this.api.getAll().subscribe({
      next: (rows: DemandeWithServices[]) => {
        this.demandes.set(rows);
        this.loading.set(false);
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
    this.setBodyScrollLock(true);
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
    this.setBodyScrollLock(false);
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
    field: 'telephone' | 'immatriculation' | 'adresseLigne1' | 'adresseLigne2' | 'adresseCodePostal' | 'adresseVille',
    value: string | null
  ) {
    this.updateDraft(d => {
      if (!d.client) return;
      const normalized = value == null ? null : String(value);
      (d.client as any)[field] = normalized && normalized.trim().length > 0 ? normalized.trim() : null;
    });
  }

  updateServiceField(index: number, field: 'quantite'|'prix_unitaire'|'libelle', value: string | number | null) {
    this.updateDraft(d => {
      const svc = d.services[index];
      if (!svc) return;
      if (field === 'libelle') {
        svc.libelle = String(value ?? '');
      } else if (field === 'quantite') {
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

  resetDraft() {
    const original = this.original();
    if (!original) return;
    this.draft.set(this.clone(original));
    this.feedback.set(null);
    this.feedbackType.set(null);
  }

  saveChanges() {
    const id = this.selectedId();
    const draft = this.draft();
    if (id == null || !draft || this.saving()) return;

    this.saving.set(true);
    this.feedback.set(null);
    this.feedbackType.set(null);

    const client = this.normalizeClientForUpdate(draft.client);

    const payload = {
      codeType: draft.code_type,
      codeStatut: draft.code_statut,
      immatriculation: client?.immatriculation ?? null,
      telephone: this.trimOrEmpty(client?.telephone),
      adresseLigne1: this.trimOrEmpty(client?.adresseLigne1),
      adresseLigne2: this.trimOrEmpty(client?.adresseLigne2),
      adresseCodePostal: this.trimOrEmpty(client?.adresseCodePostal),
      adresseVille: this.trimOrEmpty(client?.adresseVille),
      services: draft.services.map(s => ({
        libelle: s.libelle,
        idService: s.id_service,
        quantite: s.quantite,
        prixUnitaire: s.prix_unitaire ?? null
      })),
      ...(client ? { client } : {})
    };

    this.api.updateDemande(id, payload).subscribe({
      next: updated => {
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
        this.feedback.set('Échec de la mise à jour de la demande.');
        this.feedbackType.set('error');
        this.toast.error('Échec de la mise à jour de la demande.');
      }
    });
  }

  marquerTraitee(d: any) {
    if (d.code_statut === 'Traitee') return;
    const id = this.getDemandeId(d);
    if (id == null) {
      this.toast.error('Demande introuvable.', 'Identifiant manquant.');
      return;
    }

    this.api.setStatut(id, 'Traitee').subscribe({
      next: () => {
        this.demandes.update(list =>
          list.map(x => this.getDemandeId(x) === id ? { ...x, code_statut: 'Traitee' } : x)
        );
        this.toast.success('Demande marquée comme traitée.');
      },
      error: () => {
        this.toast.error('Échec de la mise à jour du statut.');
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

    return this.clone({
      ...base,
      ...response,
      client: client ?? undefined,
      services
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
      adresseLigne1: this.trimOrNull(base.adresseLigne1),
      adresseLigne2: this.trimOrNull(base.adresseLigne2),
      adresseCodePostal: this.trimOrNull(base.adresseCodePostal),
      adresseVille: this.trimOrNull(base.adresseVille)
    };
  }

  private normalizeClientForUpdate(
    client: DemandeWithServices['client'] | undefined
  ): {
    telephone?: string | null;
    immatriculation?: string | null;
    adresseLigne1?: string | null;
    adresseLigne2?: string | null;
    adresseCodePostal?: string | null;
    adresseVille?: string | null;
  } | undefined {
    const trimmed = this.trimClientStrings(client);
    if (!trimmed) {
      return undefined;
    }

    return {
      telephone: trimmed.telephone ?? null,
      immatriculation: trimmed.immatriculation ?? null,
      adresseLigne1: trimmed.adresseLigne1 ?? null,
      adresseLigne2: trimmed.adresseLigne2 ?? null,
      adresseCodePostal: trimmed.adresseCodePostal ?? null,
      adresseVille: trimmed.adresseVille ?? null
    };
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
