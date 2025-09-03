import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IntroAccueilComponent } from './intro-accueil.component';

describe('IntroAccueilComponent', () => {
  let component: IntroAccueilComponent;
  let fixture: ComponentFixture<IntroAccueilComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IntroAccueilComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IntroAccueilComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
