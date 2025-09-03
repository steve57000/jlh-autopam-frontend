import { TestBed } from '@angular/core/testing';

import { DemandesStateService } from './demandes-state.service';

describe('DemandesStateService', () => {
  let service: DemandesStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DemandesStateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
