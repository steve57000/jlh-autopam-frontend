import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, Validators, ReactiveFormsModule, FormGroup, FormControl } from '@angular/forms';
import {Router, ActivatedRoute, RouterLink} from '@angular/router';
import { AuthService } from '../services/auth.service';
import {SubmitButtonComponent} from '../shared/submit-button/submit-button.component'; // ✅ ajuste l'import vers le bon chemin

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.component.html',
  imports: [CommonModule, ReactiveFormsModule, SubmitButtonComponent, RouterLink],
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  loading = false;
  error = '';
  form: FormGroup;

  // bandeau d’info si on arrive depuis l’inscription
  notice = signal<string | null>(null);

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });

    const registered = this.route.snapshot.queryParamMap.get('registered');
    if (registered === '1') {
      this.notice.set('Compte créé ! Vérifie ta boîte e‑mail pour valider ton adresse.');
    }
  }

  // Getters typés (pratiques pour le template)
  get emailCtrl(): FormControl<string> {
    return this.form.get('email') as FormControl<string>;
  }
  get passwordCtrl(): FormControl<string> {
    return this.form.get('password') as FormControl<string>;
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { email, password } = this.form.value as { email: string; password: string };

    this.loading = true;
    this.error = '';

    this.auth.login(email, password).subscribe({
      next: () => {
        const role = this.auth.getUserRole();
        if (role === 'ADMIN') this.router.navigate(['/admin']);
        else this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        // On cherche un message lisible côté API
        this.error =
          err?.error?.message ||
          (typeof err?.error === 'string' ? err.error : '') ||
          'Identifiants invalides';
        this.loading = false;
      },
      complete: () => (this.loading = false)
    });
  }
}
