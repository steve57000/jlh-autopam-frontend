import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastService } from '../shared/toast/toast.service';
import { ServiceIconsService } from '../services/service-icons.service';
import { ServiceIconDto } from '../modeles/service-icon.model';

@Component({
  selector: 'admin-service-icons',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin-service-icons.component.html',
  styleUrls: ['./admin-service-icons.component.scss']
})
export class AdminServiceIconsComponent implements OnInit {
  icons: ServiceIconDto[] = [];
  form: FormGroup;
  previewUrl: string | null = null;
  loading = false;
  errorMsg = '';

  showDeleteConfirm = false;
  iconToDelete: ServiceIconDto | null = null;
  showEditModal = false;
  showEditLibrary = false;
  editingIcon: ServiceIconDto | null = null;
  editForm: FormGroup;

  private readonly toast = inject(ToastService);

  constructor(private iconsService: ServiceIconsService, private fb: FormBuilder) {
    this.form = this.fb.group({
      label: ['', [Validators.maxLength(150)]],
      url: ['', [Validators.maxLength(50000), Validators.required]]
    });
    this.editForm = this.fb.group({
      label: ['', [Validators.maxLength(150)]],
      url: ['', [Validators.maxLength(50000), Validators.required]]
    });
  }

  ngOnInit() {
    this.fetchIcons();
  }

  fetchIcons() {
    this.loading = true;
    this.iconsService.getAll().subscribe({
      next: icons => {
        this.icons = Array.isArray(icons) ? icons : [];
        this.loading = false;
      },
      error: err => {
        this.errorMsg = err.error?.message || err.message || 'Erreur lors du chargement.';
        this.loading = false;
      }
    });
  }

  onFileSelected(event: Event) {
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
      const result = typeof reader.result === 'string' ? reader.result : null;
      this.previewUrl = result;
      this.form.patchValue({ url: result || '' });
    };
    reader.readAsDataURL(file);
  }

  onIconSelected(event: Event) {
    this.onFileSelected(event);
  }

  selectIcon(icon: ServiceIconDto) {
    this.previewUrl = icon.url;
    this.form.patchValue({
      url: icon.url,
      label: icon.label ?? ''
    });
  }

  openEditModal(icon: ServiceIconDto) {
    this.editingIcon = icon;
    this.editForm.reset({
      label: icon.label ?? '',
      url: icon.url
    });
    this.showEditModal = true;
    this.showEditLibrary = false;
    this.showDeleteConfirm = false;
    this.iconToDelete = null;
  }

  closeEditModal() {
    this.showEditModal = false;
    this.editingIcon = null;
    this.showEditLibrary = false;
  }

  onEditFileSelected(event: Event) {
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
      const result = typeof reader.result === 'string' ? reader.result : null;
      this.editForm.patchValue({ url: result || '' });
    };
    reader.readAsDataURL(file);
  }

  toggleEditLibrary() {
    this.showEditLibrary = !this.showEditLibrary;
  }

  selectEditIcon(icon: ServiceIconDto) {
    this.editForm.patchValue({
      url: icon.url,
      label: icon.label ?? this.editForm.value.label ?? ''
    });
  }

  clearSelection() {
    this.previewUrl = null;
    this.form.reset();
  }

  submitForm() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const payload = {
      url: String(this.form.value.url || '').trim(),
      label: String(this.form.value.label || '').trim() || null
    };
    this.iconsService.create(payload).subscribe({
      next: created => {
        this.icons = [...this.icons.filter(icon => icon.idIcon !== created.idIcon), created];
        this.toast.success('Icône ajoutée avec succès.');
        this.previewUrl = created.url;
        this.form.patchValue({ url: created.url, label: created.label ?? '' });
      },
      error: err => {
        this.toast.error("Erreur lors de l'ajout.", err.error?.message || err.message);
      }
    });
  }

  updateIcon() {
    if (!this.editingIcon?.idIcon) {
      return;
    }
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }
    const payload = {
      url: String(this.editForm.value.url || '').trim(),
      label: String(this.editForm.value.label || '').trim() || null
    };
    this.iconsService.create(payload).subscribe({
      next: created => {
        this.icons = this.icons.map(icon => {
          if (icon.idIcon === this.editingIcon?.idIcon) {
            return { ...created, idIcon: this.editingIcon?.idIcon };
          }
          return icon;
        });
        this.toast.success('Icône mise à jour.');
        this.closeEditModal();
      },
      error: err => {
        this.toast.error('Erreur lors de la modification.', err.error?.message || err.message);
      }
    });
  }

  confirmDeletion(icon: ServiceIconDto) {
    this.iconToDelete = icon;
    this.showDeleteConfirm = true;
  }

  cancelDeletion() {
    this.iconToDelete = null;
    this.showDeleteConfirm = false;
  }

  deleteConfirmed() {
    if (!this.iconToDelete?.idIcon) {
      return;
    }
    const id = this.iconToDelete.idIcon;
    this.iconsService.delete(id).subscribe({
      next: () => {
        this.icons = this.icons.filter(icon => icon.idIcon !== id);
        this.toast.success('Icône supprimée définitivement.');
        if (this.previewUrl === this.iconToDelete?.url) {
          this.clearSelection();
        }
        this.cancelDeletion();
        this.closeEditModal();
      },
      error: err => {
        this.toast.error('Erreur lors de la suppression.', err.error?.message || err.message);
      }
    });
  }
}
