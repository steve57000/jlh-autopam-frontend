import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ServicesService } from '../services/services.service';
import { ServiceDto } from '../modeles/service.model';
import { ToastService } from '../shared/toast/toast.service';

@Component({
  selector: 'admin-services',
  templateUrl: './admin-services.component.html',
  styleUrls: ['./admin-services.component.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
  ],
  standalone: true
})
export class AdminServicesComponent implements OnInit {
  services: ServiceDto[] = [];
  editingService: ServiceDto | null = null;
  form: FormGroup;
  showModal = false;

  loading = false;
  errorMsg = '';

  // États pour la modale de confirmation
  showDeleteConfirm = false;
  serviceToDelete: ServiceDto | null = null;

  private readonly toast = inject(ToastService);

  constructor(private srv: ServicesService, private fb: FormBuilder) {
    this.form = this.fb.group({
      libelle: ['', [Validators.required, Validators.maxLength(100)]],
      description: ['', [Validators.maxLength(2000)]],
      prixUnitaire: ['', [Validators.required, Validators.pattern(/^\d+(\.\d{1,2})?$/)]],
    });
  }

  ngOnInit() {
    this.fetchServices();
  }

  fetchServices() {
    this.loading = true;
    this.srv.getAll().subscribe({
      next: data => {
        this.services = data;
        this.loading = false;
      },
      error: err => {
        this.errorMsg = 'Erreur de chargement : ' + (err.error?.message || err.message);
        this.loading = false;
        this.toast.error('Impossible de charger les services.', err.error?.message || err.message);
      }
    });
  }

  openAjoutService() {
    this.editingService = null;
    this.form.reset();
    this.showModal = true;
  }

  openEditService(service: ServiceDto) {
    this.editingService = service;
    this.form.patchValue({
      libelle: service.libelle,
      description: service.description,
      prixUnitaire: service.prixUnitaire,
    });
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.editingService = null;
    this.form.reset();
  }

  submitForm() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { libelle, description, prixUnitaire } = this.form.value;
    const prixValue = typeof prixUnitaire === 'number' ? prixUnitaire : Number(prixUnitaire);
    const body = {
      libelle,
      description,
      prixUnitaire: prixValue
    };

    if (this.editingService?.idService) {
      this.srv.update(this.editingService.idService, body).subscribe({
        next: updated => {
          const idx = this.services.findIndex(s => s.idService === updated.idService);
          if (idx !== -1) this.services[idx] = updated;
          this.toast.success('Service modifié avec succès !');
          this.closeModal();
        },
        error: err => this.toast.error('Erreur lors de la modification.', err.error?.message || err.message)
      });
    } else {
      this.srv.create(body).subscribe({
        next: created => {
          this.services.push(created);
          this.toast.success('Service ajouté avec succès !');
          this.closeModal();
        },
        error: err => this.toast.error("Erreur lors de l'ajout.", err.error?.message || err.message)
      });
    }
  }

  // Ouvre la modale de confirmation
  confirmDeletion(service: ServiceDto) {
    this.serviceToDelete = service;
    this.showDeleteConfirm = true;
  }

  // Annule la suppression
  cancelDeletion() {
    this.serviceToDelete = null;
    this.showDeleteConfirm = false;
  }

  // Supprime réellement
  deleteConfirmed() {
    if (!this.serviceToDelete?.idService) return;
    const id = this.serviceToDelete.idService;
    this.srv.delete(id).subscribe({
      next: () => {
        this.services = this.services.filter(s => s.idService !== id);
        this.toast.success('Service supprimé.');
        this.cancelDeletion();
      },
      error: err => this.toast.error('Erreur lors de la suppression.', err.error?.message || err.message)
    });
  }
}
