import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MatCalendar } from '@angular/material/datepicker';
import { DateAdapter, MAT_DATE_FORMATS } from '@angular/material/core';
import { CalendarHeaderService } from './calendar-header.service';

@Component({
  selector: 'app-admin-calendar-header',
  templateUrl: './admin-calendar-header.component.html',
  styleUrls: ['./admin-calendar-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true
})
export class AdminCalendarHeaderComponent {
  readonly months: string[];

  constructor(
    private readonly calendar: MatCalendar<Date>,
    private readonly dateAdapter: DateAdapter<Date>,
    @Inject(MAT_DATE_FORMATS) private readonly dateFormats: any,
    private readonly headerService: CalendarHeaderService
  ) {
    this.months = this.dateAdapter.getMonthNames('short');
  }

  get periodLabel(): string {
    return this.dateAdapter.format(this.calendar.activeDate, this.dateFormats.display.monthYearLabel);
  }

  get activeYear(): number {
    return this.calendar.activeDate.getFullYear();
  }

  get activeMonthIndex(): number {
    return this.calendar.activeDate.getMonth();
  }

  selectMonth(value: string) {
    const monthIndex = Number(value);
    if (!Number.isFinite(monthIndex)) return;
    const next = this.dateAdapter.createDate(this.activeYear, monthIndex, 1);
    this.calendar.activeDate = next;
    this.headerService.setActiveDate(this.calendar.activeDate);
  }

  previousClicked() {
    this.calendar.activeDate = this.dateAdapter.addCalendarMonths(this.calendar.activeDate, -1);
    this.headerService.setActiveDate(this.calendar.activeDate);
  }

  nextClicked() {
    this.calendar.activeDate = this.dateAdapter.addCalendarMonths(this.calendar.activeDate, 1);
    this.headerService.setActiveDate(this.calendar.activeDate);
  }
}
