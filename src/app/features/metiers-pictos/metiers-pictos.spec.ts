import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MetiersPictos } from './metiers-pictos';

describe('MetiersPictos', () => {
  let component: MetiersPictos;
  let fixture: ComponentFixture<MetiersPictos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MetiersPictos]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MetiersPictos);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
