import { TestBed } from '@angular/core/testing';

import { ClientDashboardService } from './client-dashboard.service';

describe('ClientDashboardService', () => {
  let service: ClientDashboardService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ClientDashboardService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
