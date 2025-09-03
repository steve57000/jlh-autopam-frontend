import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminPromotionsComponent } from './admin-promotions.component';

describe('AdminPromotionsComponent', () => {
  let component: AdminPromotionsComponent;
  let fixture: ComponentFixture<AdminPromotionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminPromotionsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminPromotionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
