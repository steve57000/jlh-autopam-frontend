import { Component, OnInit } from '@angular/core';
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

@Component({
  selector: 'admin-promotions',
  standalone: true,
  imports: [
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

  // toast
  toastMsg = '';
  toastType: 'success' | 'error' = 'success';

  // modal création/édition
  showModal = false;
  editingPromo: PromotionResponse | null = null;

  // modal suppression
  showDeleteModal = false;
  promoToDelete: PromotionResponse | null = null;

  // formulaire dates (on gère le fichier à part)
  form: FormGroup;
  selectedFile: File | null = null;

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
        this.showToast(this.errorMsg, 'error');
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
        this.showToast(
          this.editingPromo ? 'Promo modifiée !' : 'Promo créée !',
          'success'
        );
        this.closeModal();
        this.loadAll();
      },
      error: _ => {
        this.showToast(
          'Erreur ' + (this.editingPromo ? 'modification' : 'création'),
          'error'
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
        this.showToast('Promo supprimée !', 'success');
        this.promotions = this.promotions.filter(x => x.idPromotion !== this.promoToDelete!.idPromotion);
        this.cancelDelete();
      },
      error: () => {
        this.showToast('Erreur suppression', 'error');
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

  private showToast(msg: string, type: 'success'|'error') {
    this.toastMsg  = msg;
    this.toastType = type;
    setTimeout(() => this.toastMsg = '', 3000);
  }
}
