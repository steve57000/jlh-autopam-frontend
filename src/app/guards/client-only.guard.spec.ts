import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClientOnlyGuard } from './client-only.guard';

describe('ClientOnlyGuard', () => {
  let component: ClientOnlyGuard;
  let fixture: ComponentFixture<ClientOnlyGuard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClientOnlyGuard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClientOnlyGuard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
