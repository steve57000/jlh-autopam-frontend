import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // ✅ nécessaire pour [(ngModel)]
import { DemandeResponse } from '../../services/client-dashboard.service';
import type { DemandeTypeCode } from '../../modeles/demande.model';

export type TypeCode = DemandeTypeCode;

@Component({
  standalone: true,
  selector: 'app-current-quote',
  imports: [CommonModule, FormsModule],
  templateUrl: './current-quote.component.html',
  styleUrls: ['./current-quote.component.scss']
})
export class CurrentQuoteComponent implements OnChanges {
  @Input() demande?: DemandeResponse | null;
  @Input() locked = false;

  @Output() remove = new EventEmitter<{ idDemande: number; idService: number }>();
  @Output() submit = new EventEmitter<{
    type: TypeCode;
    immatriculation?: string | null;
    telephone?: string | null;
    rendezVousCommentaire?: string | null;
    validationPrix?: boolean;
  }>();

  // champs du formulaire local (brouillon)
  type: TypeCode = 'Devis';
  immatOverride: string | null = null;
  telephoneOverride: string | null = null;
  rendezVousCommentaire: string | null = null;
  validationPrix = false;

  requiresValidation(): boolean {
    return this.type === 'Service' || this.type === 'Devis';
  }

  statusLabel(): string {
    if (!this.demande) {
      return 'Brouillon';
    }
    if (!this.locked) {
      return 'Brouillon';
    }
    return this.demande.statutDemande?.libelle
      || this.demande.statutDemande?.codeStatut
      || 'Confirmée';
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['demande'] && this.demande?.client) {
      this.immatOverride = this.demande.client.immatriculation ?? null;
      this.telephoneOverride = this.demande.client.telephone ?? null;
    }
  }

  total(): number {
    const s = this.demande?.services ?? [];
    return s.reduce((sum, line) => sum + (line.prixUnitaire || 0) * (line.quantite || 0), 0);
  }

  onRemove(idService: number) {
    if (this.locked) return;
    if (!this.demande?.idDemande) return;
    this.remove.emit({ idDemande: this.demande.idDemande, idService });
  }

  onSubmitForm() {
    if (this.locked) return;
    // émet vers la page services (type + immat éventuelle)
    this.submit.emit({
      type: this.type,
      immatriculation: (this.immatOverride && this.immatOverride.trim()) || null,
      telephone: (this.telephoneOverride && this.telephoneOverride.trim()) || null,
      rendezVousCommentaire: this.rendezVousCommentaire?.trim() || null,
      validationPrix: this.validationPrix
    });
  }
}
