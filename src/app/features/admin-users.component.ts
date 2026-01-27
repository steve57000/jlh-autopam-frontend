import { Component, computed, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminUserSummary, AdminUsersService } from '../services/admin-users.service';
import { AdminClientsService } from '../services/admin-clients.service';
import { ToastService } from '../shared/toast/toast.service';
import { AuthService } from '../services/auth.service';
import {
  VEHICLE_BRAND_OPTIONS,
  VEHICLE_MODEL_OPTIONS,
  VehicleBrandValue
} from '../shared/vehicle-brand-model-options';
import { VEHICLE_ENERGY_OPTIONS } from '../shared/vehicle-energy-options';

@Component({
  selector: 'admin-users',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin-users.component.html',
  styleUrls: ['./admin-users.component.scss']
})
export class AdminUsersComponent implements OnInit {
  adminSubmitting = signal(false);
  clientSubmitting = signal(false);
  adminListLoading = signal(false);
  adminListError = signal<string | null>(null);
  editingId = signal<number | null>(null);
  editSubmitting = signal(false);
  deleteSubmitting = signal<number | null>(null);

  adminForm!: FormGroup;
  clientForm!: FormGroup;
  editForm!: FormGroup;
  vehicleBrandOptions = signal<{ value: string; label: string }[]>([...VEHICLE_BRAND_OPTIONS]);
  vehicleModelOptions = signal<{ value: string; label: string }[]>([]);
  private vehicleModelOptionsByBrand = signal<Record<string, { value: string; label: string }[]>>(
    structuredClone(VEHICLE_MODEL_OPTIONS) as unknown as Record<string, { value: string; label: string }[]>
  );
  vehicleEnergyOptions = VEHICLE_ENERGY_OPTIONS;
  isBrandCustom = signal(false);
  isModelCustom = signal(false);
  readonly isAdminPrincipal: boolean;
  readonly adminUsersList = signal<AdminUserSummary[]>([]);
  readonly visibleAdmins = computed(() => {
    const admins = this.adminUsersList();
    if (this.isAdminPrincipal) return admins;
    return admins.filter(admin => admin.niveauAcces === 'GESTIONNAIRE');
  });

  constructor(
    private fb: FormBuilder,
    private adminUsers: AdminUsersService,
    private adminClients: AdminClientsService,
    private toast: ToastService,
    private auth: AuthService
  ) {
    this.isAdminPrincipal = this.auth.isAdminPrincipal();
    this.adminForm = this.fb.nonNullable.group({
      email: ['', [Validators.required, Validators.email]],
      username: [''],
      motDePasse: ['', [Validators.required, Validators.minLength(6)]],
      nom: [''],
      prenom: [''],
      niveauAcces: ['ADMIN', Validators.required]
    });

    if (!this.isAdminPrincipal) {
      this.adminForm.get('niveauAcces')?.setValue('GESTIONNAIRE');
      this.adminForm.get('niveauAcces')?.disable({ emitEvent: false });
    }

    this.clientForm = this.fb.nonNullable.group({
      nom: ['', Validators.required],
      prenom: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      motDePasse: ['', [Validators.required, Validators.minLength(6)]],
      telephone: ['', Validators.required],
      immatriculation: ['', Validators.required],
      vehiculeMarque: ['', Validators.required],
      vehiculeMarqueCustom: [''],
      vehiculeModele: ['', Validators.required],
      vehiculeModeleCustom: [''],
      vehiculeEnergie: [''],
      adresseLigne1: ['', Validators.required],
      adresseLigne2: [''],
      codePostal: ['', Validators.required],
      ville: ['', Validators.required]
    });

    this.editForm = this.fb.nonNullable.group({
      email: ['', [Validators.required, Validators.email]],
      username: [''],
      nom: [''],
      prenom: [''],
      niveauAcces: ['GESTIONNAIRE', Validators.required]
    });

    if (!this.isAdminPrincipal) {
      this.editForm.get('niveauAcces')?.disable({ emitEvent: false });
    }

    this.clientForm.get('vehiculeMarque')?.valueChanges.subscribe(value => {
      const isCustom = value === '__custom__';
      this.isBrandCustom.set(isCustom);
      if (isCustom) {
        this.vehicleModelOptions.set([]);
        this.clientForm.get('vehiculeModele')?.setValue('__custom__');
        this.isModelCustom.set(true);
        return;
      }
      this.isModelCustom.set(false);
      const options = value ? this.getModelOptions(value) : [];
      this.vehicleModelOptions.set([...options]);
      const current = this.clientForm.get('vehiculeModele')?.value;
      if (current && !options.some(option => option.value === current)) {
        this.clientForm.get('vehiculeModele')?.setValue('');
      }
    });

    this.clientForm.get('vehiculeModele')?.valueChanges.subscribe(value => {
      const isCustom = value === '__custom__';
      this.isModelCustom.set(isCustom);
    });
  }

  ngOnInit() {
    this.loadAdmins();
  }

  submitAdmin() {
    if (this.adminForm.invalid) {
      this.adminForm.markAllAsTouched();
      return;
    }
    this.adminSubmitting.set(true);
    const payload = this.adminForm.getRawValue();
    if (!this.isAdminPrincipal) {
      payload.niveauAcces = 'GESTIONNAIRE';
    }
    this.adminUsers.createAdmin(payload).subscribe({
      next: () => {
        this.toast.success('Compte administrateur créé.');
        this.adminForm.reset({ niveauAcces: 'ADMIN' });
        if (!this.isAdminPrincipal) {
          this.adminForm.get('niveauAcces')?.setValue('GESTIONNAIRE');
        }
        this.loadAdmins();
        this.adminSubmitting.set(false);
      },
      error: (err) => {
        const msg = err?.error?.message || 'Création impossible.';
        this.toast.error('Échec de création', msg);
        this.adminSubmitting.set(false);
      }
    });
  }

  startEdit(admin: AdminUserSummary) {
    const adminId = this.getAdminId(admin);
    if (!adminId) {
      this.toast.error('Échec de modification', 'Identifiant du compte introuvable.');
      return;
    }
    if (!this.isAdminPrincipal && admin.niveauAcces !== 'GESTIONNAIRE') {
      return;
    }
    this.editingId.set(adminId);
    this.editForm.reset({
      email: admin.email ?? '',
      username: admin.username ?? '',
      nom: admin.nom ?? '',
      prenom: admin.prenom ?? '',
      niveauAcces: admin.niveauAcces
    });
    if (!this.isAdminPrincipal) {
      this.editForm.get('niveauAcces')?.setValue('GESTIONNAIRE');
    }
  }

  cancelEdit() {
    this.editingId.set(null);
  }

  submitEdit() {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }
    const id = this.editingId();
    if (!id) {
      this.toast.error('Échec de modification', 'Identifiant du compte introuvable.');
      return;
    }
    this.editSubmitting.set(true);
    const payload = this.editForm.getRawValue();
    if (!this.isAdminPrincipal) {
      payload.niveauAcces = 'GESTIONNAIRE';
    }
    this.adminUsers.updateAdmin(id, payload).subscribe({
      next: () => {
        this.toast.success('Compte mis à jour.');
        this.editSubmitting.set(false);
        this.editingId.set(null);
        this.loadAdmins();
      },
      error: (err) => {
        const msg = err?.error?.message || 'Mise à jour impossible.';
        this.toast.error('Échec de mise à jour', msg);
        this.editSubmitting.set(false);
      }
    });
  }

  deleteAdmin(admin: AdminUserSummary) {
    const adminId = this.getAdminId(admin);
    if (!adminId) {
      this.toast.error('Échec de suppression', 'Identifiant du compte introuvable.');
      return;
    }
    if (!this.isAdminPrincipal && admin.niveauAcces !== 'GESTIONNAIRE') {
      return;
    }
    const confirmDelete = typeof window !== 'undefined'
      ? window.confirm('Supprimer ce compte ? Cette action est irréversible.')
      : true;
    if (!confirmDelete) return;
    this.deleteSubmitting.set(adminId);
    this.adminUsers.deleteAdmin(adminId).subscribe({
      next: () => {
        this.toast.success('Compte supprimé.');
        this.deleteSubmitting.set(null);
        this.loadAdmins();
      },
      error: (err) => {
        const msg = err?.error?.message || 'Suppression impossible.';
        this.toast.error('Échec de suppression', msg);
        this.deleteSubmitting.set(null);
      }
    });
  }

  submitClient() {
    if (this.clientForm.invalid) {
      this.clientForm.markAllAsTouched();
      return;
    }
    this.clientSubmitting.set(true);
    const payload = this.clientForm.getRawValue();
    const customMarque = (payload.vehiculeMarqueCustom ?? '').trim();
    const customModele = (payload.vehiculeModeleCustom ?? '').trim();
    const marque =
      payload.vehiculeMarque === '__custom__'
        ? customMarque
        : this.resolveBrandLabel(payload.vehiculeMarque);
    const modele =
      payload.vehiculeModele === '__custom__'
        ? customModele
        : this.resolveModelLabel(payload.vehiculeMarque, payload.vehiculeModele);

    if (!marque) {
      this.clientForm.get('vehiculeMarqueCustom')?.setErrors({ required: true });
      this.clientSubmitting.set(false);
      return;
    }
    if (!modele) {
      this.clientForm.get('vehiculeModeleCustom')?.setErrors({ required: true });
      this.clientSubmitting.set(false);
      return;
    }

    this.addCustomBrandOption(marque);
    this.addCustomModelOption(marque, modele);
    const normalized = {
      nom: payload.nom,
      prenom: payload.prenom,
      email: payload.email,
      motDePasse: payload.motDePasse,
      telephone: payload.telephone,
      immatriculation: payload.immatriculation,
      vehiculeMarque: marque,
      vehiculeModele: modele,
      vehiculeEnergie: payload.vehiculeEnergie?.trim() ? payload.vehiculeEnergie : null,
      adresseLigne1: payload.adresseLigne1,
      adresseLigne2: payload.adresseLigne2,
      codePostal: payload.codePostal,
      ville: payload.ville
    };
    this.adminClients.create(normalized).subscribe({
      next: () => {
        this.toast.success('Client créé.');
        this.clientForm.reset();
        this.isBrandCustom.set(false);
        this.isModelCustom.set(false);
        this.clientSubmitting.set(false);
      },
      error: (err) => {
        const msg = err?.error?.message || 'Création impossible.';
        this.toast.error('Échec de création', msg);
        this.clientSubmitting.set(false);
      }
    });
  }

  private addCustomBrandOption(label: string) {
    const existing = this.vehicleBrandOptions().some(option => option.label.toLowerCase() === label.toLowerCase());
    if (existing) return;
    this.vehicleBrandOptions.update(options => [...options, { value: label, label }]);
    this.vehicleModelOptionsByBrand.update(map => ({
      ...map,
      [label]: map[label] ?? []
    }));
  }

  private addCustomModelOption(brand: string, label: string) {
    const base = this.getModelOptions(brand);
    const existing = base.some(option => option.label.toLowerCase() === label.toLowerCase());
    if (existing) return;
    this.vehicleModelOptionsByBrand.update(map => ({
      ...map,
      [brand]: [...(map[brand] ?? []), { value: label, label }]
    }));
    this.vehicleModelOptions.set(this.getModelOptions(brand));
  }

  private resolveBrandLabel(value?: string | null): string {
    const raw = (value ?? '').trim();
    if (!raw) return '';
    const match = this.vehicleBrandOptions().find(option => option.value === raw);
    return match?.label ?? raw;
  }

  private resolveModelLabel(brand?: string | null, value?: string | null): string {
    const raw = (value ?? '').trim();
    if (!raw) return '';
    if (!brand || brand === '__custom__') return raw;
    const match = this.getModelOptions(brand).find(option => option.value === raw);
    return match?.label ?? raw;
  }

  private getModelOptions(brand: string) {
    return this.vehicleModelOptionsByBrand()[brand as VehicleBrandValue] ?? [];
  }

  private loadAdmins() {
    this.adminListLoading.set(true);
    this.adminListError.set(null);
    this.adminUsers.listAdmins().subscribe({
      next: (admins) => {
        const normalized = (admins ?? []).reduce<AdminUserSummary[]>((acc, admin) => {
          const id = this.getAdminId(admin);
          if (!id) return acc;
          const accessLevel = this.normalizeAccessLevel(
            admin.niveauAcces ?? (admin as { niveau_acces?: string | null }).niveau_acces
          );
          acc.push({
            ...admin,
            id,
            niveauAcces: accessLevel
          });
          return acc;
        }, []);
        this.adminUsersList.set(normalized);
        this.adminListLoading.set(false);
      },
      error: (err) => {
        const msg = err?.error?.message || 'Impossible de charger les comptes.';
        this.adminListError.set(msg);
        this.adminListLoading.set(false);
      }
    });
  }

  private getAdminId(admin: AdminUserSummary): number | null {
    return admin.id ?? admin.idAdministrateur ?? admin.idAdmin ?? admin.id_admin ?? null;
  }

  private normalizeAccessLevel(level?: string | null): 'ADMIN' | 'GESTIONNAIRE' {
    const raw = (level ?? '').toUpperCase();
    if (['GESTIONNAIRE', 'MANAGER', 'ROLE_MANAGER'].includes(raw)) {
      return 'GESTIONNAIRE';
    }
    if (['PRINCIPAL', 'ADMIN_PRINCIPAL', 'ROLE_ADMIN_PRINCIPAL'].includes(raw)) {
      return 'ADMIN';
    }
    return 'ADMIN';
  }
}
