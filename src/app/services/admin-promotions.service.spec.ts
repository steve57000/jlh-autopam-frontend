import { TestBed } from '@angular/core/testing';

import { AdminPromotionsService } from './admin-promotions.service';

describe('AdminPromotionsService', () => {
  let service: AdminPromotionsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AdminPromotionsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
