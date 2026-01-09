import { Component, DestroyRef, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgOptimizedImage } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-footer',
  imports: [
    RouterLink,
    NgOptimizedImage
  ],
  templateUrl: './footer.component.html',
  standalone: true,
  styleUrl: './footer.component.scss'
})

export class FooterComponent {
  currentYear = new Date().getFullYear();
  loggedIn = false;

  private readonly destroyRef = inject(DestroyRef);

  constructor(private auth: AuthService, private router: Router) {
    this.auth.authState().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(isAuth => {
      this.loggedIn = isAuth;
    });
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/']);
  }
}
