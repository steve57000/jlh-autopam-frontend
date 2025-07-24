import { TestBed } from '@angular/core/testing';

import { Promotion } from './promotion';

describe('Promotion', () => {
  let service: Promotion;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Promotion);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
