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
  constructor(
    private readonly calendar: MatCalendar<Date>,
    private readonly dateAdapter: DateAdapter<Date>,
    @Inject(MAT_DATE_FORMATS) private readonly dateFormats: any,
    private readonly headerService: CalendarHeaderService
  ) {}

  get periodLabel(): string {
    return this.dateAdapter.format(this.calendar.activeDate, this.dateFormats.display.monthYearLabel);
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
