import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FullPageSpinnerComponent } from './full-page-spinner.component';

describe('FullPageSpinnerComponent', () => {
  let component: FullPageSpinnerComponent;
  let fixture: ComponentFixture<FullPageSpinnerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FullPageSpinnerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FullPageSpinnerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
