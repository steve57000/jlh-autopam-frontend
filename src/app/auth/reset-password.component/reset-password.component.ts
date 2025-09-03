import { Component, computed, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service'; // ✅ chemin corrigé

@Component({
  standalone: true,
  selector: 'app-reset-password',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss']
})
export class ResetPasswordComponent {
  // ✅ inject() pour éviter l’erreur d’ordre
  private fb     = inject(FormBuilder);
  private auth   = inject(AuthService);
  private route  = inject(ActivatedRoute);
  private router = inject(Router);

  loading = false;
  message = signal<string | null>(null);
  error   = signal<string | null>(null);

  // ✅ token lu à la demande pour éviter l’accès avant init
  get token(): string | null {
    return this.route.snapshot.queryParamMap.get('token');
  }

  emailForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]]
  });

  passwordForm = this.fb.group({
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]]
  });

  matchError = computed(() =>
    this.passwordForm.value.newPassword !== this.passwordForm.value.confirmPassword
      ? 'La confirmation ne correspond pas.' : null
  );

  submitEmail() {
    if (this.emailForm.invalid) { this.emailForm.markAllAsTouched(); return; }
    this.loading = true; this.error.set(null); this.message.set(null);
    this.auth.forgotPassword(this.emailForm.value.email!).subscribe({
      next: () => this.message.set('Si un compte existe, un lien a été envoyé par e-mail.'),
      error: (err: any) => this.error.set(err?.error?.message || 'Impossible d’envoyer l’e-mail.'),
      complete: () => this.loading = false
    });
  }

  submitNewPassword() {
    if (this.passwordForm.invalid || this.matchError()) { this.passwordForm.markAllAsTouched(); return; }
    this.loading = true; this.error.set(null); this.message.set(null);
    this.auth.resetPassword(
      this.token!, this.passwordForm.value.newPassword!, this.passwordForm.value.confirmPassword!
    ).subscribe({
      next: () => {
        this.message.set('Mot de passe réinitialisé. Vous pouvez vous connecter.');
        setTimeout(() => this.router.navigate(['/login']), 1200);
      },
      error: (err: any) => this.error.set(err?.error?.message || 'Réinitialisation impossible.'),
      complete: () => this.loading = false
    });
  }
}
