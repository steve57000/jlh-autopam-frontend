import { Directive, Input, OnDestroy, OnInit, TemplateRef, ViewContainerRef } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Subscription } from 'rxjs';

@Directive({
  selector: '[appHasRole]',
  standalone: true
})
export class HasRoleDirective implements OnInit, OnDestroy {
  /** Rôles autorisés: 'CLIENT', 'ADMIN' ou tableau de rôles */
  @Input('appHasRole') set allowedRoles(value: string | string[]) {
    this.roles = Array.isArray(value) ? value : [value].filter(Boolean);
    this.render();
  }

  private sub?: Subscription;
  private roles: string[] = [];

  constructor(
    private tpl: TemplateRef<unknown>,
    private vcr: ViewContainerRef,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    // rendu initial
    this.render();
    // re-render sur changement d’auth
    this.sub = this.auth.authState().subscribe(() => this.render());
  }

  private render(): void {
    this.vcr.clear();
    const isAuth = this.auth.isAuthenticated();
    const role   = this.auth.getUserRole(); // 'ADMIN' | 'CLIENT' | null
    const match  = isAuth && !!role && (this.roles.length === 0 || this.roles.includes(role));
    if (match) {
      this.vcr.createEmbeddedView(this.tpl);
    }
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
