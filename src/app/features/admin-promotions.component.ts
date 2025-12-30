import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule
} from '@angular/forms';
import { DatePipe, NgOptimizedImage } from '@angular/common';
import { AdminPromotionsService } from '../services/admin-promotions.service';
import {
  PromotionResponse,
  PromotionRequest
} from '../modeles/promotion.model';
import { ToastService } from '../shared/toast/toast.service';

@Component({
  selector: 'admin-promotions',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DatePipe,
    NgOptimizedImage
  ],
  templateUrl: './admin-promotions.component.html',
  styleUrls: ['./admin-promotions.component.scss']
})
export class AdminPromotionsComponent implements OnInit {
  promotions: PromotionResponse[] = [];
  loading = false;
  errorMsg = '';

  // modal création/édition
  showModal = false;
  editingPromo: PromotionResponse | null = null;

  // modal suppression
  showDeleteModal = false;
  promoToDelete: PromotionResponse | null = null;

  // formulaire dates (on gère le fichier à part)
  form: FormGroup;
  selectedFile: File | null = null;

  private readonly toast = inject(ToastService);

  constructor(
    private fb: FormBuilder,
    private promoSrv: AdminPromotionsService
  ) {
    this.form = this.fb.group({
      validFrom: ['', Validators.required],
      validTo:   ['', Validators.required],
      description: ['', Validators.required]
    });
  }

  ngOnInit() {
    this.loadAll();
  }

  private loadAll() {
    this.loading = true;
    this.promoSrv.list().subscribe({
      next: list => {
        this.promotions = list;
        this.loading = false;
      },
      error: err => {
        this.errorMsg = 'Erreur chargement : ' + (err.error?.message || err.message);
        this.loading = false;
        this.toast.error('Impossible de charger les promotions.', err.error?.message || err.message);
      }
    });
  }

  // création / édition
  openNew() {
    this.editingPromo   = null;
    this.selectedFile   = null;
    this.form.reset();
    this.showModal      = true;
  }

  openEdit(p: PromotionResponse) {
    this.editingPromo   = p;
    this.selectedFile   = null;
    this.form.patchValue({
      validFrom: p.validFrom.slice(0,10),
      validTo:   p.validTo  .slice(0,10),
      description: p.description
    });
    this.showModal = true;
  }

  onFileSelected(ev: Event) {
    const inp = ev.target as HTMLInputElement;
    this.selectedFile = inp.files?.[0] || null;
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const data: PromotionRequest = {
      administrateurId: 1,
      validFrom: this.form.value.validFrom + 'T00:00:00Z',
      validTo:   this.form.value.validTo   + 'T00:00:00Z',
      description: this.form.value.description,
      imageUrl: ''
    };

    const obs$ = this.editingPromo
      ? this.promoSrv.updatePromo(this.editingPromo.idPromotion, data, this.selectedFile!)
      : this.promoSrv.createPromo(data, this.selectedFile!);

    obs$.subscribe({
      next: _ => {
        this.toast.success(this.editingPromo ? 'Promotion mise à jour.' : 'Promotion créée.');
        this.closeModal();
        this.loadAll();
      },
      error: _ => {
        this.toast.error(
          `Erreur ${this.editingPromo ? 'lors de la modification' : 'lors de la création'} de la promotion.`
        );
      }
    });
  }

  // ouverture de la modale de suppression
  confirmDelete(p: PromotionResponse) {
    this.promoToDelete   = p;
    this.showDeleteModal = true;
  }

  // suppression effective
  doDelete() {
    if (!this.promoToDelete) return;
    this.promoSrv.deletePromo(this.promoToDelete.idPromotion).subscribe({
      next: () => {
        this.toast.success('Promotion supprimée.');
        this.promotions = this.promotions.filter(x => x.idPromotion !== this.promoToDelete!.idPromotion);
        this.cancelDelete();
      },
      error: () => {
        this.toast.error('Erreur lors de la suppression de la promotion.');
        this.cancelDelete();
      }
    });
  }

  // annuler suppression
  cancelDelete() {
    this.promoToDelete   = null;
    this.showDeleteModal = false;
  }

  closeModal() {
    this.showModal      = false;
    this.editingPromo   = null;
    this.selectedFile   = null;
    this.form.reset();
  }

  getImageUrl(imageUrl: string): string {
    if (!imageUrl) {
      return '';
    }

    if (/^(data:|blob:)/i.test(imageUrl)) {
      return imageUrl;
    }

    if (/^https?:/i.test(imageUrl)) {
      try {
        const parsed = new URL(imageUrl);
        if (parsed.pathname.startsWith('/promotions/images/')) {
          return imageUrl;
        }

        const normalizedPath = parsed.pathname.startsWith('/')
          ? parsed.pathname.slice(1)
          : parsed.pathname;
        return `${parsed.origin}/promotions/images/${normalizedPath}`;
      } catch {
        return imageUrl;
      }
    }

    const normalizedPath = imageUrl.startsWith('/') ? imageUrl.slice(1) : imageUrl;
    return `/promotions/images/${normalizedPath}`;
  }

}
