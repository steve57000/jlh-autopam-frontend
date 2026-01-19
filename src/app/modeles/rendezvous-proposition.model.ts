export type RendezVousPropositionStatut = 'PROPOSE' | 'ACCEPTE' | 'REFUSE' | 'EXPIRE';

export interface RendezVousProposition {
  idProposition: number;
  dateDebut: string;
  dateFin: string;
  statut: RendezVousPropositionStatut;
  createdAt: string;
  expiresAt: string;
  administrateurId?: number | null;
  administrateurNom?: string | null;
}

export interface RendezVousPropositionSlotPayload {
  dateDebut: string;
  dateFin: string;
}

export interface RendezVousPropositionBatchPayload {
  propositions: RendezVousPropositionSlotPayload[];
}
