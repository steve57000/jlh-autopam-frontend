import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IntroAccueil } from './intro-accueil';

describe('IntroAccueil', () => {
  let component: IntroAccueil;
  let fixture: ComponentFixture<IntroAccueil>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IntroAccueil]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IntroAccueil);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
