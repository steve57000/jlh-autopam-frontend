import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoginRedirectGuard } from './login-redirect.guard';

describe('LoginRedirectGuard', () => {
  let component: LoginRedirectGuard;
  let fixture: ComponentFixture<LoginRedirectGuard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginRedirectGuard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoginRedirectGuard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
