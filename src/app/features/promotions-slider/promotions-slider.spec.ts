import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PromotionsSlider } from './promotions-slider';

describe('PromotionsSlider', () => {
  let component: PromotionsSlider;
  let fixture: ComponentFixture<PromotionsSlider>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PromotionsSlider]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PromotionsSlider);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
