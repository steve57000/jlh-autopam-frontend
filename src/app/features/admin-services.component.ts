import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ServicesService } from '../services/services.service';
import { ServiceDto } from '../modeles/service.model';
import { ToastService } from '../shared/toast/toast.service';
import { ServiceIconsService } from '../services/service-icons.service';
import { ServiceIconDto } from '../modeles/service-icon.model';

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
  serviceIcons: ServiceIconDto[] = [];
  form: FormGroup;
  showModal = false;
  iconPreview: string | null = null;

  loading = false;
  errorMsg = '';

  // États pour la modale de confirmation
  showDeleteConfirm = false;
  serviceToDelete: ServiceDto | null = null;

  private readonly toast = inject(ToastService);

  constructor(
    private srv: ServicesService,
    private iconsService: ServiceIconsService,
    private fb: FormBuilder
  ) {
    this.form = this.fb.group({
      libelle: ['', [Validators.required, Validators.maxLength(100)]],
      description: ['', [Validators.maxLength(2000)]],
      icon: [''],
      prixUnitaire: ['', [Validators.required, Validators.pattern(/^\d+(\.\d{1,2})?$/)]],
      quantiteMax: [1, [Validators.required, Validators.min(1)]],
    });
  }

  ngOnInit() {
    this.fetchServices();
    this.fetchIcons();
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

  fetchIcons() {
    this.iconsService.getAll().subscribe({
      next: icons => {
        this.serviceIcons = Array.isArray(icons) ? icons : [];
      },
      error: () => {
        this.serviceIcons = [];
      }
    });
  }

  openAjoutService() {
    this.editingService = null;
    this.form.reset();
    this.iconPreview = null;
    this.showModal = true;
  }

  openEditService(service: ServiceDto) {
    this.editingService = service;
    this.form.patchValue({
      libelle: service.libelle,
      description: service.description,
      icon: service.icon ?? '',
      prixUnitaire: service.prixUnitaire,
      quantiteMax: service.quantiteMax ?? 1,
    });
    this.iconPreview = service.icon ?? null;
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.editingService = null;
    this.form.reset();
    this.iconPreview = null;
  }

  onIconSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    if (!file.type.startsWith('image/')) {
      this.toast.error('Le fichier doit être une image.');
      input.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      this.iconPreview = typeof reader.result === 'string' ? reader.result : null;
      this.form.patchValue({ icon: this.iconPreview || '' });
    };
    reader.readAsDataURL(file);
  }

  selectIcon(icon: ServiceIconDto) {
    this.iconPreview = icon.url;
    this.form.patchValue({ icon: icon.url });
  }

  clearIcon() {
    this.iconPreview = null;
    this.form.patchValue({ icon: '' });
  }

  submitForm() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { libelle, description, prixUnitaire, quantiteMax } = this.form.value;
    const prixValue = typeof prixUnitaire === 'number' ? prixUnitaire : Number(prixUnitaire);
    const quantiteValue = typeof quantiteMax === 'number' ? quantiteMax : Number(quantiteMax);
    const body = {
      libelle,
      description,
      icon: this.iconPreview ? this.iconPreview.trim() : null,
      prixUnitaire: prixValue,
      quantiteMax: quantiteValue
    };

    if (this.editingService?.idService) {
      this.srv.update(this.editingService.idService, body).subscribe({
        next: updated => {
          const idx = this.services.findIndex(s => s.idService === updated.idService);
          if (idx !== -1) this.services[idx] = updated;
          this.toast.success('Service modifié avec succès !');
          this.fetchIcons();
          this.closeModal();
        },
        error: err => this.toast.error('Erreur lors de la modification.', err.error?.message || err.message)
      });
    } else {
      this.srv.create(body).subscribe({
        next: created => {
          this.services.push(created);
          this.toast.success('Service ajouté avec succès !');
          this.fetchIcons();
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
