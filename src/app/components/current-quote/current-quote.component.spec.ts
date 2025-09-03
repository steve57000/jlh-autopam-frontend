import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CurrentQuoteComponent } from './current-quote.component';

describe('CurrentQuoteComponent', () => {
  let component: CurrentQuoteComponent;
  let fixture: ComponentFixture<CurrentQuoteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CurrentQuoteComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CurrentQuoteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
