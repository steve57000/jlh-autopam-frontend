import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ServicesService } from '../services/services.service';
import { ServiceDto } from '../modeles/service.model';
import { ToastService } from '../shared/toast/toast.service';
import { ServiceIconsService } from '../services/service-icons.service';
import { ServiceIconDto } from '../modeles/service-icon.model';
import { MediaUrlService } from '../services/media-url.service';

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
  showIconLibrary = false;
  private iconLabelMap = new Map<string, string>();

  loading = false;
  errorMsg = '';

  // États pour la modale de confirmation
  showDeleteConfirm = false;
  serviceToDelete: ServiceDto | null = null;

  private readonly toast = inject(ToastService);
  private readonly mediaUrl = inject(MediaUrlService);

  constructor(
    private srv: ServicesService,
    private iconsService: ServiceIconsService,
    private fb: FormBuilder
  ) {
    this.form = this.fb.group({
      libelle: ['', [Validators.required, Validators.maxLength(100)]],
      description: ['', [Validators.maxLength(2000)]],
      descriptionLongue: ['', [Validators.maxLength(4000)]],
      iconId: [null],
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
        this.buildIconLabelMap();
      },
      error: () => {
        this.serviceIcons = [];
        this.iconLabelMap.clear();
      }
    });
  }

  openAjoutService() {
    this.editingService = null;
    this.form.reset();
    this.iconPreview = null;
    this.showIconLibrary = false;
    this.showModal = true;
  }

  openEditService(service: ServiceDto) {
    this.editingService = service;
    this.form.patchValue({
      libelle: service.libelle,
      description: service.description,
      descriptionLongue: service.descriptionLongue,
      iconId: service.iconId ?? null,
      prixUnitaire: service.prixUnitaire,
      quantiteMax: service.quantiteMax ?? 1,
    });
    this.iconPreview = this.resolveIconUrl(service.iconUrl);
    this.showIconLibrary = false;
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.editingService = null;
    this.form.reset();
    this.iconPreview = null;
    this.showIconLibrary = false;
  }

  selectIcon(icon: ServiceIconDto) {
    this.iconPreview = this.resolveIconUrl(icon.url);
    this.form.patchValue({ iconId: icon.idIcon });
  }

  getServiceIcon(service: ServiceDto): string | null {
    if (service.iconUrl) {
      return this.resolveIconUrl(service.iconUrl);
    }
    const lookupKey = this.normalizeLabel(service.libelle);
    const matched = this.iconLabelMap.get(lookupKey) ?? null;
    return this.resolveIconUrl(matched);
  }

  clearIcon() {
    this.iconPreview = null;
    this.form.patchValue({ iconId: null });
  }

  toggleIconLibrary() {
    this.showIconLibrary = !this.showIconLibrary;
  }

  submitForm() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { libelle, description, descriptionLongue, prixUnitaire, quantiteMax } = this.form.value;
    const prixValue = typeof prixUnitaire === 'number' ? prixUnitaire : Number(prixUnitaire);
    const quantiteValue = typeof quantiteMax === 'number' ? quantiteMax : Number(quantiteMax);
    const body = {
      libelle,
      description,
      descriptionLongue,
      iconId: this.form.value.iconId ?? null,
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

  private buildIconLabelMap() {
    this.iconLabelMap.clear();
    for (const icon of this.serviceIcons) {
      if (icon.label) {
        this.iconLabelMap.set(this.normalizeLabel(icon.label), icon.url);
      }
    }
  }

  private normalizeLabel(label: string) {
    return label.trim().toLowerCase();
  }

  resolveIconUrl(url?: string | null): string | null {
    return this.mediaUrl.resolve(url);
  }
}
