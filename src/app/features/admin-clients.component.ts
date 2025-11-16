import { Component, OnInit, computed, signal, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminClientsService } from '../services/admin-clients.service';
import { ClientResponse, UpdateClientPayload } from '../modeles/client.model';
import { ToastService } from '../shared/toast/toast.service';

@Component({
  selector: 'admin-clients',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './admin-clients.component.html',
  styleUrls: ['./admin-clients.component.scss']
})
export class AdminClientsComponent implements OnInit {
  private api = inject(AdminClientsService);
  private toast = inject(ToastService);

  loading = signal(true);
  error = signal<string | null>(null);
  clients = signal<ClientResponse[]>([]);

  search = signal('');
  verification = signal<'all' | 'verified' | 'unverified'>('all');

  selectedId = signal<number | null>(null);
  private draft = signal<ClientResponse | null>(null);
  private original = signal<ClientResponse | null>(null);
  saving = signal(false);

  readonly filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    const v = this.verification();

    return this.clients()
      .filter(client => {
        if (v === 'verified' && !client.emailVerified) return false;
        if (v === 'unverified' && client.emailVerified) return false;
        if (!q) return true;
        const hay = [
          client.nom,
          client.prenom,
          client.email,
          client.telephone,
          client.immatriculation,
          client.vehiculeMarque,
          client.vehiculeModele,
          client.ville,
          client.codePostal
        ].filter(Boolean).join(' ').toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => a.nom.localeCompare(b.nom));
  });

  readonly selectedClient = computed(() => this.draft());

  readonly hasChanges = computed(() => {
    const a = this.original();
    const b = this.draft();
    if (!a || !b) return false;
    return JSON.stringify(this.normalizeClient(a)) !== JSON.stringify(this.normalizeClient(b));
  });

  ngOnInit() {
    this.loadClients();
  }

  loadClients() {
    this.loading.set(true);
    this.error.set(null);
    this.api.getAll({ silentError: true }).subscribe({
      next: rows => {
        this.clients.set(Array.isArray(rows) ? rows : []);
        this.loading.set(false);
      },
      error: err => {
        this.loading.set(false);
        const msg = err?.error?.message || err.message || 'Impossible de charger les clients.';
        this.error.set(msg);
        this.toast.error('Erreur', msg);
      }
    });
  }

  trackById(_index: number, item: ClientResponse) {
    return item.idClient;
  }

  select(client: ClientResponse) {
    const copy = this.clone(client);
    this.selectedId.set(client.idClient);
    this.draft.set(copy);
    this.original.set(this.clone(client));
  }

  closeDetails() {
    this.selectedId.set(null);
    this.draft.set(null);
    this.original.set(null);
  }

  updateField(field: keyof UpdateClientPayload, value: string | null) {
    const current = this.draft();
    if (!current) return;
    const next = this.clone(current);
    if (field === 'nom' || field === 'email') {
      (next as any)[field] = value ?? '';
    } else {
      const normalized = value == null ? null : value;
      (next as any)[field] = normalized;
    }
    this.draft.set(next);
  }

  saveChanges() {
    const draft = this.draft();
    const id = this.selectedId();
    if (!draft || id == null || this.saving()) {
      return;
    }

    const payload = this.buildPayload(draft);
    this.saving.set(true);
    this.api.update(id, payload).subscribe({
      next: updated => {
        this.clients.update(list => list.map(item => item.idClient === updated.idClient ? updated : item));
        this.draft.set(this.clone(updated));
        this.original.set(this.clone(updated));
        this.saving.set(false);
        this.toast.success('Client mis à jour.');
      },
      error: err => {
        this.saving.set(false);
        const msg = err?.error?.message || err.message || 'Échec de la mise à jour du client.';
        this.toast.error('Erreur', msg);
      }
    });
  }

  resetDraft() {
    const snapshot = this.original();
    if (!snapshot) return;
    this.draft.set(this.clone(snapshot));
  }

  setSearch(value: string) {
    this.search.set(value);
  }

  setVerification(value: 'all' | 'verified' | 'unverified') {
    this.verification.set(value);
  }

  private buildPayload(client: ClientResponse): UpdateClientPayload {
    const trim = (v?: string | null) => {
      if (v == null) return null;
      const s = String(v).trim();
      return s.length ? s : null;
    };

    return {
      nom: (client.nom || '').trim(),
      prenom: trim(client.prenom) ?? undefined,
      email: (client.email || '').trim(),
      telephone: trim(client.telephone),
      immatriculation: trim(client.immatriculation),
      vehiculeMarque: trim(client.vehiculeMarque),
      vehiculeModele: trim(client.vehiculeModele),
      adresseLigne1: trim(client.adresseLigne1),
      adresseLigne2: trim(client.adresseLigne2),
      codePostal: trim(client.codePostal),
      ville: trim(client.ville)
    } satisfies UpdateClientPayload;
  }

  private normalizeClient(client: ClientResponse) {
    return {
      ...client,
      nom: (client.nom || '').trim(),
      prenom: client.prenom?.trim() ?? null,
      email: (client.email || '').trim(),
      telephone: client.telephone?.trim() ?? null,
      immatriculation: client.immatriculation?.trim() ?? null,
      vehiculeMarque: client.vehiculeMarque?.trim() ?? null,
      vehiculeModele: client.vehiculeModele?.trim() ?? null,
      adresseLigne1: client.adresseLigne1?.trim() ?? null,
      adresseLigne2: client.adresseLigne2?.trim() ?? null,
      codePostal: client.codePostal?.trim() ?? null,
      ville: client.ville?.trim() ?? null
    };
  }

  private clone<T>(value: T): T {
    return structuredClone(value);
  }
}
