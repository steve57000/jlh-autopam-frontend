import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable()
export class CalendarHeaderService {
  private readonly activeDateSubject = new BehaviorSubject<Date | null>(null);
  readonly activeDate$ = this.activeDateSubject.asObservable();

  setActiveDate(date: Date) {
    this.activeDateSubject.next(date);
  }
}
