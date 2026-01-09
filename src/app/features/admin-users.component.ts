import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminUsersService } from '../services/admin-users.service';
import { AdminClientsService } from '../services/admin-clients.service';
import { ToastService } from '../shared/toast/toast.service';

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
      vehiculeModele: ['', Validators.required],
      adresseLigne1: ['', Validators.required],
      adresseLigne2: [''],
      codePostal: ['', Validators.required],
      ville: ['', Validators.required]
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
    this.adminClients.create(payload).subscribe({
      next: () => {
        this.toast.success('Client créé.');
        this.clientForm.reset();
        this.clientSubmitting.set(false);
      },
      error: (err) => {
        const msg = err?.error?.message || 'Création impossible.';
        this.toast.error('Échec de création', msg);
        this.clientSubmitting.set(false);
      }
    });
  }
}
