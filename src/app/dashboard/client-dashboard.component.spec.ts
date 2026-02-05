import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClientDashboardComponent } from './client-dashboard.component';

describe('ClientDashboardComponent', () => {
  let component: ClientDashboardComponent;
  let fixture: ComponentFixture<ClientDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClientDashboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClientDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });


  it('canRequestRendezVous should allow Traitee quote without linked rendez-vous', () => {
    const demande: any = {
      statutDemande: { codeStatut: 'Traitee' },
      devis: { idDevis: 10 },
      timeline: []
    };

    expect(component.canRequestRendezVous(demande)).toBeTrue();
  });

  it('canRequestRendezVous should reject Annulee quote', () => {
    const demande: any = {
      statutDemande: { codeStatut: 'Annulee' },
      devis: { idDevis: 10 },
      timeline: []
    };

    expect(component.canRequestRendezVous(demande)).toBeFalse();
  });
});
