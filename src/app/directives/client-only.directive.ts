import { Directive } from '@angular/core';
import { HasRoleDirective } from './has-role.directive';

/** Raccourci: *appClientOnly ≡ *appHasRole="'CLIENT'" */
@Directive({
  selector: '[appClientOnly]',
  standalone: true,
  hostDirectives: [
    {
      directive: HasRoleDirective,
      inputs: ['appHasRole: appClientOnly'], // redirige l’input
    }
  ]
})
export class ClientOnlyDirective {}
