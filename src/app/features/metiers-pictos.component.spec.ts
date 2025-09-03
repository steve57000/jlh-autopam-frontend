import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MetiersPictosComponent } from './metiers-pictos.component';

describe('MetiersPictosComponent', () => {
  let component: MetiersPictosComponent;
  let fixture: ComponentFixture<MetiersPictosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MetiersPictosComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MetiersPictosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
