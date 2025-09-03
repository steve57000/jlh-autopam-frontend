import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SectionCarousselComponent } from './section-caroussel.component';

describe('SectionCarousselComponent', () => {
  let component: SectionCarousselComponent;
  let fixture: ComponentFixture<SectionCarousselComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SectionCarousselComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SectionCarousselComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
