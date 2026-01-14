import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../services/auth.service';
import { ClientAccountService, ClientMeDto } from '../../services/client-account.service';
import { ToastService } from '../../shared/toast/toast.service';
import { VEHICLE_BRAND_OPTIONS, VEHICLE_MODEL_OPTIONS, VehicleBrandValue, VehicleModelValue } from '../../shared/vehicle-brand-model-options';
import { VEHICLE_ENERGY_OPTIONS, VehicleEnergyValue } from '../../shared/vehicle-energy-options';

@Component({
  standalone: true,
  selector: 'app-account',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './account.component.html',
  styleUrls: ['./account.component.scss']
})
export class AccountComponent implements OnInit {
  private fb     = inject(FormBuilder);
  private auth   = inject(AuthService);
  private api    = inject(ClientAccountService);
  private toast  = inject(ToastService);

  loading   = signal<boolean>(false);
  saving    = signal<boolean>(false);
  pwdSaving = signal<boolean>(false);
  showOldPassword = signal<boolean>(false);
  showNewPassword = signal<boolean>(false);
  showConfirmPassword = signal<boolean>(false);

  me: ClientMeDto | null = null;
  err = signal<string>('');
  msg = signal<string>('');

  // Regex strictes (alignées avec le back)
  private readonly reTel  = /^0[1-9](\s?\d{2}){4}$/;            // 0X XX XX XX XX (espaces optionnels)
  private readonly reSiv  = /^[A-Z]{2}-\d{3}-[A-Z]{2}$/i;       // AA-123-AA
  private readonly reCp   = /^\d{5}$/;                          // 5 chiffres
  vehicleBrandOptions = VEHICLE_BRAND_OPTIONS;
  vehicleModelOptions = signal<{ value: VehicleModelValue; label: string }[]>([]);
  vehicleEnergyOptions = VEHICLE_ENERGY_OPTIONS;

  profileForm = this.fb.group({
    nom:   [{ value: '', disabled: true }],
    prenom:[{ value: '', disabled: true }],
    email: [{ value: '', disabled: true }],

    telephone: ['', [Validators.pattern(this.reTel)]],
    immatriculation: ['', [Validators.pattern(this.reSiv)]],
    vehiculeMarque: this.fb.control<VehicleBrandValue | ''>(''),
    vehiculeModele: this.fb.control<VehicleModelValue | ''>(''),
    vehiculeEnergie: this.fb.control<VehicleEnergyValue | ''>(''),

    adresse_ligne1: [''],
    adresse_ligne2: [''],
    adresse_codePostal: ['', [Validators.pattern(this.reCp)]],
    adresse_ville: [''],
  });

  pwdForm = this.fb.group({
    oldPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', Validators.required]
  });

  async ngOnInit() {
    this.profileForm.get('vehiculeMarque')?.valueChanges.subscribe(value => {
      this.updateVehicleModelOptions(value as VehicleBrandValue | '' | null);
    });
    await this.loadMe();
  }

  private async loadMe() {
    try {
      this.loading.set(true);
      this.err.set('');
      const me = await this.api.getMe();
      this.me = me;

      const vehiculeMarqueValue = this.resolveBrandValue(me.vehiculeMarque);
      const vehiculeModeleValue = this.resolveModelValue(vehiculeMarqueValue, me.vehiculeModele);

      this.profileForm.reset({
        nom: me.nom || '',
        prenom: me.prenom || '',
        email: me.email || '',
        telephone: me.telephone || '',
        immatriculation: me.immatriculation || '',
        vehiculeMarque: vehiculeMarqueValue,
        vehiculeModele: vehiculeModeleValue,
        vehiculeEnergie: (me.vehiculeEnergie as VehicleEnergyValue) || '',
        adresse_ligne1: me.adresse?.ligne1 || '',
        adresse_ligne2: me.adresse?.ligne2 || '',
        adresse_codePostal: me.adresse?.codePostal || '',
        adresse_ville: me.adresse?.ville || '',
      });
      this.updateVehicleModelOptions(this.profileForm.get('vehiculeMarque')?.value as VehicleBrandValue | '' | null);
    } catch (e: any) {
      this.err.set(e?.error?.message || e?.message || 'Impossible de charger votre profil.');
    } finally {
      this.loading.set(false);
    }
  }

  // ————— Helpers erreurs serveur —————
  private clearServerFieldErrors() {
    ([
      'telephone',
      'immatriculation',
      'vehiculeMarque',
      'vehiculeModele',
      'vehiculeEnergie',
      'adresse_codePostal'
    ] as const).forEach(name => {
      const c = this.profileForm.get(name);
      if (!c) return;
      const current = c.errors || {};
      if (current['server']) {
        const next = { ...current };
        delete next['server'];
        Object.keys(next).length ? c.setErrors(next) : c.setErrors(null);
      }
    });
  }

  private applyServerFieldErrors(err: any) {
    const bag = err?.error?.errors || err?.errors;
    if (!bag || typeof bag !== 'object') return;

    // Map des clés back -> noms des controls front
    const map: Record<string, keyof typeof this.profileForm.controls> = {
      telephone: 'telephone',
      immatriculation: 'immatriculation',
      vehiculeMarque: 'vehiculeMarque',
      vehiculeModele: 'vehiculeModele',
      vehiculeEnergie: 'vehiculeEnergie',
      codePostal: 'adresse_codePostal',
      'addr.codePostal': 'adresse_codePostal',
      'adresse.codePostal': 'adresse_codePostal',
    };

    Object.entries(bag).forEach(([rawKey, message]) => {
      const ctrlName = map[rawKey] as string | undefined;
      if (!ctrlName) return;
      const c = this.profileForm.get(ctrlName);
      if (!c) return;
      // On REMPLACE les erreurs locales par celles du serveur (priorité back)
      c.setErrors({ server: String(message ?? 'Valeur invalide') });
      c.markAsTouched();
    });

    this.profileForm.updateValueAndValidity({ emitEvent: false });
  }

  // ————— Submit Profil —————
  async submitProfile() {
    // 1) On marque tout comme touché pour afficher les erreurs “live”
    this.profileForm.markAllAsTouched();

    // 2) On tente quand même l’appel back pour récupérer les messages serveur “source d’autorité”
    try {
      this.saving.set(true);
      this.err.set('');
      this.clearServerFieldErrors();

      const v = this.profileForm.getRawValue();

      // Normalisation avant envoi
      const immat = (v.immatriculation ?? '').toUpperCase().trim();

      this.me = await this.api.updateMe({
        telephone: (v.telephone ?? '').trim() || null,
        immatriculation: immat || null,
        vehiculeMarque: this.resolveBrandLabel(v.vehiculeMarque),
        vehiculeModele: this.resolveModelLabel(v.vehiculeMarque, v.vehiculeModele),
        vehiculeEnergie: (v.vehiculeEnergie as VehicleEnergyValue) || null,
        adresse: {
          ligne1: (v.adresse_ligne1 ?? '').trim() || null,
          ligne2: (v.adresse_ligne2 ?? '').trim() || null,
          codePostal: (v.adresse_codePostal ?? '').trim() || null,
          ville: (v.adresse_ville ?? '').trim() || null,
        }
      });

      this.toast.success('Informations enregistrées.');
      // Si succès, on efface toutes les erreurs résiduelles
      this.profileForm.setErrors(null);
      Object.values(this.profileForm.controls).forEach(c => c.setErrors(null));
    } catch (e: any) {
      const msg = e?.error?.message || e?.message || 'Échec de la sauvegarde.';
      this.err.set(msg);
      this.toast.error('Erreur', msg);
      this.applyServerFieldErrors(e);
    } finally {
      this.saving.set(false);
    }
  }

  // ————— Password —————
  submitPassword() {
    if (this.pwdForm.invalid) { this.pwdForm.markAllAsTouched(); return; }
    const v = this.pwdForm.value;
    if (v.newPassword !== v.confirmPassword) {
      this.err.set('La confirmation ne correspond pas.');
      return;
    }
    this.pwdSaving.set(true); this.err.set(''); this.msg.set('');
    this.auth.changePassword({
      oldPassword: v.oldPassword!, newPassword: v.newPassword!, confirmPassword: v.confirmPassword!
    }).subscribe({
      next: () => {
        this.msg.set('Mot de passe mis à jour.');
        this.toast.success('Mot de passe mis à jour.');
        this.pwdForm.reset();
      },
      error: (err: any) => {
        const m = err?.error?.message || 'Échec de la mise à jour.';
        this.err.set(m);
        this.toast.error('Erreur', m);
      },
      complete: () => this.pwdSaving.set(false)
    });
  }

  // Helpers UI
  get f() { return this.profileForm.controls; }
  get fp() { return this.pwdForm.controls; }

  private updateVehicleModelOptions(brand: VehicleBrandValue | '' | null) {
    const options = brand ? VEHICLE_MODEL_OPTIONS[brand] ?? [] : [];
    this.vehicleModelOptions.set([...options]);
    const currentModel = this.profileForm.get('vehiculeModele')?.value;
    if (currentModel && !options.some(option => option.value === currentModel)) {
      this.profileForm.get('vehiculeModele')?.setValue('');
    }
  }

  private resolveBrandValue(value?: string | null): VehicleBrandValue | '' {
    const raw = (value ?? '').trim();
    if (!raw) return '';
    const match = VEHICLE_BRAND_OPTIONS.find(option => option.value === raw)
      || VEHICLE_BRAND_OPTIONS.find(option => option.label.toLowerCase() === raw.toLowerCase());
    return (match?.value as VehicleBrandValue) ?? '';
  }

  private resolveModelValue(brand: VehicleBrandValue | '', value?: string | null): VehicleModelValue | '' {
    const raw = (value ?? '').trim();
    if (!raw || !brand) return '';
    const options = VEHICLE_MODEL_OPTIONS[brand] ?? [];
    const match = options.find(option => option.value === raw)
      || options.find(option => option.label.toLowerCase() === raw.toLowerCase());
    return (match?.value as VehicleModelValue) ?? '';
  }

  private resolveBrandLabel(value?: VehicleBrandValue | '' | null): string | null {
    const raw = (value ?? '').trim();
    if (!raw) return null;
    const match = VEHICLE_BRAND_OPTIONS.find(option => option.value === raw);
    return match?.label ?? raw;
  }

  private resolveModelLabel(brand?: VehicleBrandValue | '' | null, value?: VehicleModelValue | '' | null): string | null {
    const raw = (value ?? '').trim();
    if (!raw) return null;
    if (!brand) return raw;
    const options = VEHICLE_MODEL_OPTIONS[brand] ?? [];
    const match = options.find(option => option.value === raw);
    return match?.label ?? raw;
  }

  togglePassword(field: 'old' | 'new' | 'confirm') {
    switch (field) {
      case 'old':
        this.showOldPassword.update(value => !value);
        break;
      case 'new':
        this.showNewPassword.update(value => !value);
        break;
      case 'confirm':
        this.showConfirmPassword.update(value => !value);
        break;
    }
  }
}
