import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // ✅ nécessaire pour [(ngModel)]
import { DemandeResponse } from '../../services/client-dashboard.service';

export type TypeCode = 'Devis' | 'RendezVous';

@Component({
  standalone: true,
  selector: 'app-current-quote',
  imports: [CommonModule, FormsModule],
  templateUrl: './current-quote.component.html',
  styleUrls: ['./current-quote.component.scss']
})
export class CurrentQuoteComponent {
  @Input() demande?: DemandeResponse | null;

  @Output() remove = new EventEmitter<{ idDemande: number; idService: number }>();
  @Output() submit = new EventEmitter<{ type: TypeCode; immatriculation?: string | null }>(); // ✅

  // champs du formulaire local (brouillon)
  type: TypeCode = 'Devis';
  immatOverride: string | null = null;

  total(): number {
    const s = this.demande?.services ?? [];
    return s.reduce((sum, line) => sum + (line.prixUnitaire || 0) * (line.quantite || 0), 0);
  }

  onRemove(idService: number) {
    if (!this.demande?.idDemande) return;
    this.remove.emit({ idDemande: this.demande.idDemande, idService });
  }

  onSubmitForm() {
    // émet vers la page services (type + immat éventuelle)
    this.submit.emit({
      type: this.type,
      immatriculation: (this.immatOverride && this.immatOverride.trim()) || null
    });
  }
}
