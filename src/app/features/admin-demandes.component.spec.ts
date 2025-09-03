import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminDemandesComponent } from './admin-demandes.component';

describe('AdminDemandesComponent', () => {
  let component: AdminDemandesComponent;
  let fixture: ComponentFixture<AdminDemandesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminDemandesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminDemandesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
