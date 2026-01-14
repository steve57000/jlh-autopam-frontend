import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminUsersService } from '../services/admin-users.service';
import { AdminClientsService } from '../services/admin-clients.service';
import { ToastService } from '../shared/toast/toast.service';
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
export class AdminUsersComponent {
  adminSubmitting = signal(false);
  clientSubmitting = signal(false);

  adminForm!: FormGroup;
  clientForm!: FormGroup;
  vehicleBrandOptions = signal<{ value: string; label: string }[]>([...VEHICLE_BRAND_OPTIONS]);
  vehicleModelOptions = signal<{ value: string; label: string }[]>([]);
  private vehicleModelOptionsByBrand = signal<Record<string, { value: string; label: string }[]>>(
    structuredClone(VEHICLE_MODEL_OPTIONS) as unknown as Record<string, { value: string; label: string }[]>
  );
  vehicleEnergyOptions = VEHICLE_ENERGY_OPTIONS;
  isBrandCustom = signal(false);
  isModelCustom = signal(false);

  constructor(
    private fb: FormBuilder,
    private adminUsers: AdminUsersService,
    private adminClients: AdminClientsService,
    private toast: ToastService
  ) {
    this.adminForm = this.fb.nonNullable.group({
      email: ['', [Validators.required, Validators.email]],
      username: [''],
      motDePasse: ['', [Validators.required, Validators.minLength(6)]],
      nom: [''],
      prenom: [''],
      niveauAcces: ['ADMIN', Validators.required]
    });

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

  submitAdmin() {
    if (this.adminForm.invalid) {
      this.adminForm.markAllAsTouched();
      return;
    }
    this.adminSubmitting.set(true);
    const payload = this.adminForm.getRawValue();
    this.adminUsers.createAdmin(payload).subscribe({
      next: () => {
        this.toast.success('Compte administrateur créé.');
        this.adminForm.reset({ niveauAcces: 'ADMIN' });
        this.adminSubmitting.set(false);
      },
      error: (err) => {
        const msg = err?.error?.message || 'Création impossible.';
        this.toast.error('Échec de création', msg);
        this.adminSubmitting.set(false);
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
}
