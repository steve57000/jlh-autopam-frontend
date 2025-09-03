import { Component, computed, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder, Validators, ReactiveFormsModule,
  AbstractControl, ValidationErrors, FormGroup, FormControl
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService, RegisterPayload, ApiResponse } from '../services/auth.service';
import {SubmitButtonComponent} from '../shared/submit-button/submit-button.component';

function passwordStrength(c: AbstractControl): ValidationErrors | null {
  const v = (c.value ?? '') as string;
  if (!v) return null; // ✅ ne rien dire si vide -> 'required' s'affichera
  const ok = v.length >= 8 && /[A-Z]/.test(v) && /[a-z]/.test(v) && /\d/.test(v);
  return ok ? null : { weak: true };
}

function match(otherCtrlName: string) {
  return (c: AbstractControl): ValidationErrors | null => {
    const parent = c.parent;
    if (!parent) return null;
    const other = parent.get(otherCtrlName);
    return other && c.value === other.value ? null : { mismatch: true };
  };
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, SubmitButtonComponent],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {
  submitting = signal(false);
  apiError = signal<string | null>(null);
  apiFieldErrors = signal<Record<string, string | string[]> | null>(null);

  form!: FormGroup;

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router) {}

  ngOnInit() {
    this.form = this.fb.group({
      nom: ['', [Validators.required, Validators.minLength(2)]],
      prenom: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      telephone: ['', [
        Validators.required,
        Validators.pattern(/^0[1-9](\d{2}){4}$/) // 0X XX XX XX XX
      ]],
      immatriculation: ['', [
        Validators.required,
        Validators.pattern(/^[A-Z]{2}-\d{3}-[A-Z]{2}$/) // format SIV: AA-123-AA
      ]],
      adresse: [''],
      motDePasse: ['', [Validators.required, passwordStrength]],
      confirmPassword: ['', [Validators.required, match('motDePasse')]],
      consentRgpd: [false, [Validators.requiredTrue]]
    });
  }

  // ===== Getters typés pour le template =====
  get nomCtrl(): FormControl<string>               { return this.form.get('nom') as FormControl<string>; }
  get prenomCtrl(): FormControl<string>            { return this.form.get('prenom') as FormControl<string>; }
  get emailCtrl(): FormControl<string>             { return this.form.get('email') as FormControl<string>; }
  get telephoneCtrl(): FormControl<string>         { return this.form.get('telephone') as FormControl<string>; }
  get adresseCtrl(): FormControl<string>           { return this.form.get('adresse') as FormControl<string>; }
  get immatriculationCtrl(): FormControl<string>   { return this.form.get('immatriculation') as FormControl<string>; }
  get motDePasseCtrl(): FormControl<string>        { return this.form.get('motDePasse') as FormControl<string>; }
  get confirmPasswordCtrl(): FormControl<string>   { return this.form.get('confirmPassword') as FormControl<string>; }
  get consentRgpdCtrl(): FormControl<boolean>      { return this.form.get('consentRgpd') as FormControl<boolean>; }

  // Aides d’affichage
  passwordWeak = computed(
    () => this.motDePasseCtrl.hasError('weak') && this.motDePasseCtrl.touched
  );
  passwordMismatch = computed(
    () => this.confirmPasswordCtrl.hasError('mismatch') && this.confirmPasswordCtrl.touched
  );

  // helpers pour le template
  isArray(v: unknown): v is string[] {
    return Array.isArray(v);
  }

  toText(value: unknown): string {
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'string') return value;
    if (value == null) return '';
    return String(value); // fallback propre
  }

  showError(ctrl: AbstractControl | null, err?: string) {
    if (!ctrl) return false;
    return err
      ? ctrl.hasError(err) && (ctrl.dirty || ctrl.touched)
      : ctrl.invalid && (ctrl.dirty || ctrl.touched);
  }

  submit() {
    this.apiError.set(null);
    this.apiFieldErrors.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);

    const { confirmPassword, ...raw } = this.form.getRawValue();
    const payload: RegisterPayload = {
      nom: raw.nom!,
      prenom: raw.prenom!,
      email: raw.email!,
      motDePasse: raw.motDePasse!,
      telephone: raw.telephone,
      adresse: raw.adresse || undefined,
      immatriculation: raw.immatriculation,
      consentRgpd: !!raw.consentRgpd
    };

    this.auth.register(payload).subscribe({
      next: (res: ApiResponse) => {
        this.submitting.set(false);
        if (res.success) {
          this.router.navigate(['/login'], { queryParams: { registered: '1' } });
        } else {
          this.apiError.set(res.message ?? 'Inscription échouée.');
          this.apiFieldErrors.set(res.errors ?? null);
        }
      },
      error: (err) => {
        this.submitting.set(false);
        this.apiError.set(err?.error?.message || 'Une erreur est survenue.');
        this.apiFieldErrors.set(err?.error?.errors || null);
      }
    });
  }
}
