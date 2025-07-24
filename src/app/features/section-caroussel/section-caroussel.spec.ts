import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SectionCaroussel } from './section-caroussel';

describe('SectionCaroussel', () => {
  let component: SectionCaroussel;
  let fixture: ComponentFixture<SectionCaroussel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SectionCaroussel]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SectionCaroussel);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
