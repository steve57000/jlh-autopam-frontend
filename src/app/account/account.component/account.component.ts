import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import {RouterLink} from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-account',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './account.component.html',
  styleUrls: ['./account.component.scss']
})
export class AccountComponent {
  // ✅ inject() évite l’erreur d’ordre d’initialisation
  private fb   = inject(FormBuilder);
  private auth = inject(AuthService);

  loading = false;
  msg = '';
  err = '';

  form = this.fb.group({
    oldPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', Validators.required]
  });

  submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.value;
    if (v.newPassword !== v.confirmPassword) {
      this.err = 'La confirmation ne correspond pas.';
      return;
    }
    this.loading = true; this.err = ''; this.msg = '';
    this.auth.changePassword({
      oldPassword: v.oldPassword!, newPassword: v.newPassword!, confirmPassword: v.confirmPassword!
    }).subscribe({
      next: () => this.msg = 'Mot de passe mis à jour.',
      error: (err: any) => this.err = err?.error?.message || 'Échec de la mise à jour.',
      complete: () => this.loading = false
    });
  }
}
