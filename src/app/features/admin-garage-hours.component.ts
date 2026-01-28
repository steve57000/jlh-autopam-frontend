import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { GarageHoursService } from '../services/garage-hours.service';
import { GarageHourDto, GarageHourPayload } from '../modeles/garage-hours.model';
import { ToastService } from '../shared/toast/toast.service';

@Component({
  selector: 'admin-garage-hours',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin-garage-hours.component.html',
  styleUrls: ['./admin-garage-hours.component.scss']
})
export class AdminGarageHoursComponent implements OnInit {
  hours: GarageHourDto[] = [];
  loading = false;
  errorMsg = '';

  showModal = false;
  editingHour: GarageHourDto | null = null;

  showDeleteModal = false;
  hourToDelete: GarageHourDto | null = null;

  form: FormGroup;

  readonly dayLabels: Record<string, string> = {
    MONDAY: 'Lundi',
    TUESDAY: 'Mardi',
    WEDNESDAY: 'Mercredi',
    THURSDAY: 'Jeudi',
    FRIDAY: 'Vendredi',
    SATURDAY: 'Samedi',
    SUNDAY: 'Dimanche',
  };

  readonly dayOrder = [
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
    'SATURDAY',
    'SUNDAY',
  ];

  constructor(
    private fb: FormBuilder,
    private hoursApi: GarageHoursService,
    private toast: ToastService,
    private auth: AuthService
  ) {
    this.form = this.fb.group(
      {
        scope: ['ANNUAL', Validators.required],
        status: ['OPEN', Validators.required],
        openingType: ['SPLIT'],
        dayOfWeek: ['MONDAY'],
        exceptionalType: ['SINGLE_DAY'],
        exceptionalDate: [''],
        exceptionalStartDate: [''],
        exceptionalEndDate: [''],
        label: [''],
        startTime: [''],
        endTime: [''],
        startTime2: [''],
        endTime2: [''],
      },
      {
        validators: [
          this.validatePeriodDates.bind(this),
          this.validateTimeRanges.bind(this)
        ]
      }
    );
  }

  ngOnInit() {
    this.form.valueChanges.subscribe(() => this.updateConditionalValidators());
    this.updateConditionalValidators();
    this.loadAll();
  }

  get isAdminPrincipal(): boolean {
    return this.auth.isAdminPrincipal();
  }

  loadAll() {
    this.loading = true;
    this.errorMsg = '';
    this.hoursApi.listPublic().subscribe({
      next: list => {
        this.hours = (list ?? [])
          .map(hour => ({ ...hour, id: this.resolveId(hour) }))
          .sort((a, b) => {
            if (a.scope === 'ANNUAL' && b.scope === 'ANNUAL') {
              return this.dayOrder.indexOf(a.dayOfWeek ?? '') - this.dayOrder.indexOf(b.dayOfWeek ?? '');
            }
            if (a.scope === 'ANNUAL') return -1;
            if (b.scope === 'ANNUAL') return 1;
            return 0;
          });
        this.loading = false;
      },
      error: err => {
        this.errorMsg = err?.error?.message || err.message || 'Impossible de charger les horaires.';
        this.loading = false;
        this.toast.error('Erreur', this.errorMsg);
      }
    });
  }

  openNew() {
    this.editingHour = null;
    this.form.reset({
      scope: 'ANNUAL',
      status: 'OPEN',
      openingType: 'SPLIT',
      dayOfWeek: 'MONDAY',
      exceptionalType: 'SINGLE_DAY',
      exceptionalDate: '',
      exceptionalStartDate: '',
      exceptionalEndDate: '',
      label: '',
      startTime: '',
      endTime: '',
      startTime2: '',
      endTime2: '',
    });
    this.updateConditionalValidators();
    this.showModal = true;
  }

  openEdit(hour: GarageHourDto) {
    this.editingHour = hour;
    this.form.reset({
      scope: hour.scope ?? 'ANNUAL',
      status: hour.status ?? 'OPEN',
      openingType: hour.openingType ?? 'CONTINUOUS',
      dayOfWeek: hour.dayOfWeek ?? 'MONDAY',
      exceptionalType: hour.exceptionalType ?? 'SINGLE_DAY',
      exceptionalDate: hour.exceptionalDate ?? '',
      exceptionalStartDate: hour.exceptionalStartDate ?? '',
      exceptionalEndDate: hour.exceptionalEndDate ?? '',
      label: hour.label ?? '',
      startTime: this.toInputTime(hour.startTime),
      endTime: this.toInputTime(hour.endTime),
      startTime2: this.toInputTime(hour.startTime2),
      endTime2: this.toInputTime(hour.endTime2),
    });
    this.updateConditionalValidators();
    this.showModal = true;
  }

  submit() {
    if (!this.isAdminPrincipal) {
      this.toast.error('Action interdite', 'Seul un administrateur principal peut modifier les horaires.');
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.buildPayload();
    const obs$ = this.editingHour
      ? this.hoursApi.update(this.getGarageHourId(this.editingHour)!, payload)
      : this.hoursApi.create(payload);

    obs$.subscribe({
      next: () => {
        this.toast.success(this.editingHour ? 'Horaire mis à jour.' : 'Horaire créé.');
        this.closeModal();
        this.loadAll();
      },
      error: err => {
        const msg = err?.error?.message || err.message || 'Échec de la sauvegarde.';
        this.toast.error('Erreur', msg);
      }
    });
  }

  confirmDelete(hour: GarageHourDto) {
    this.hourToDelete = hour;
    this.showDeleteModal = true;
  }

  doDelete() {
    if (!this.isAdminPrincipal) {
      this.toast.error('Action interdite', 'Seul un administrateur principal peut supprimer des horaires.');
      return;
    }

    if (!this.hourToDelete) return;

    const id = this.getGarageHourId(this.hourToDelete);
    if (!id) {
      this.toast.error('Erreur', 'Identifiant introuvable.');
      return;
    }

    this.hoursApi.delete(id).subscribe({
      next: () => {
        this.toast.success('Horaire supprimé.');
        this.hours = this.hours.filter(item => this.getGarageHourId(item) !== id);
        this.cancelDelete();
      },
      error: err => {
        const msg = err?.error?.message || err.message || 'Suppression impossible.';
        this.toast.error('Erreur', msg);
      }
    });
  }

  cancelDelete() {
    this.hourToDelete = null;
    this.showDeleteModal = false;
  }

  closeModal() {
    this.showModal = false;
    this.editingHour = null;
    this.form.markAsPristine();
  }

  getGarageHourId(hour: GarageHourDto): number | null {
    return this.resolveId(hour) ?? null;
  }

  formatHourLabel(hour: GarageHourDto): string {
    if (hour.scope === 'ANNUAL') {
      return this.dayLabels[hour.dayOfWeek ?? ''] ?? hour.dayOfWeek ?? 'Jour annuel';
    }

    if (hour.exceptionalType === 'SINGLE_DAY') {
      return hour.exceptionalDate ? `Exception ${hour.exceptionalDate}` : 'Exception ponctuelle';
    }

    if (hour.exceptionalType === 'PERIOD') {
      const start = hour.exceptionalStartDate ?? '??';
      const end = hour.exceptionalEndDate ?? '??';
      const label = hour.label ? ` (${hour.label})` : '';
      return `Période ${start} → ${end}${label}`;
    }

    return 'Exception';
  }

  formatSchedule(hour: GarageHourDto): string {
    if (hour.status === 'CLOSED') {
      return 'Fermé';
    }

    const start = this.formatTime(hour.startTime);
    const end = this.formatTime(hour.endTime);
    const start2 = this.formatTime(hour.startTime2);
    const end2 = this.formatTime(hour.endTime2);

    if (hour.openingType === 'SPLIT' && start && end && start2 && end2) {
      return `${start}-${end} et ${start2}-${end2}`;
    }

    if (start && end) {
      return `${start}-${end}`;
    }

    return 'Ouvert';
  }

  private updateConditionalValidators() {
    const scope = this.form.get('scope')?.value;
    const status = this.form.get('status')?.value;
    const openingType = this.form.get('openingType')?.value;
    const exceptionalType = this.form.get('exceptionalType')?.value;

    const dayOfWeek = this.form.get('dayOfWeek');
    const exceptionalTypeCtrl = this.form.get('exceptionalType');
    const exceptionalDate = this.form.get('exceptionalDate');
    const exceptionalStartDate = this.form.get('exceptionalStartDate');
    const exceptionalEndDate = this.form.get('exceptionalEndDate');
    const label = this.form.get('label');
    const openingTypeCtrl = this.form.get('openingType');
    const startTime = this.form.get('startTime');
    const endTime = this.form.get('endTime');
    const startTime2 = this.form.get('startTime2');
    const endTime2 = this.form.get('endTime2');

    if (scope === 'ANNUAL') {
      dayOfWeek?.setValidators([Validators.required]);
      exceptionalTypeCtrl?.clearValidators();
      exceptionalDate?.clearValidators();
      exceptionalStartDate?.clearValidators();
      exceptionalEndDate?.clearValidators();
      label?.clearValidators();
    } else {
      dayOfWeek?.clearValidators();
      exceptionalTypeCtrl?.setValidators([Validators.required]);

      if (exceptionalType === 'SINGLE_DAY') {
        exceptionalDate?.setValidators([Validators.required]);
        exceptionalStartDate?.clearValidators();
        exceptionalEndDate?.clearValidators();
        label?.clearValidators();
      } else {
        exceptionalDate?.clearValidators();
        exceptionalStartDate?.setValidators([Validators.required]);
        exceptionalEndDate?.setValidators([Validators.required]);
        label?.setValidators([Validators.required]);
      }
    }

    if (status === 'OPEN') {
      openingTypeCtrl?.setValidators([Validators.required]);
      startTime?.setValidators([Validators.required]);
      endTime?.setValidators([Validators.required]);

      if (openingType === 'SPLIT') {
        startTime2?.setValidators([Validators.required]);
        endTime2?.setValidators([Validators.required]);
      } else {
        startTime2?.clearValidators();
        endTime2?.clearValidators();
      }
    } else {
      openingTypeCtrl?.clearValidators();
      startTime?.clearValidators();
      endTime?.clearValidators();
      startTime2?.clearValidators();
      endTime2?.clearValidators();
    }

    dayOfWeek?.updateValueAndValidity({ emitEvent: false });
    exceptionalTypeCtrl?.updateValueAndValidity({ emitEvent: false });
    exceptionalDate?.updateValueAndValidity({ emitEvent: false });
    exceptionalStartDate?.updateValueAndValidity({ emitEvent: false });
    exceptionalEndDate?.updateValueAndValidity({ emitEvent: false });
    label?.updateValueAndValidity({ emitEvent: false });
    openingTypeCtrl?.updateValueAndValidity({ emitEvent: false });
    startTime?.updateValueAndValidity({ emitEvent: false });
    endTime?.updateValueAndValidity({ emitEvent: false });
    startTime2?.updateValueAndValidity({ emitEvent: false });
    endTime2?.updateValueAndValidity({ emitEvent: false });

    this.form.updateValueAndValidity({ emitEvent: false });
  }

  private validatePeriodDates(group: FormGroup) {
    const scope = group.get('scope')?.value;
    const exceptionalType = group.get('exceptionalType')?.value;
    const start = group.get('exceptionalStartDate')?.value;
    const end = group.get('exceptionalEndDate')?.value;

    if (scope === 'EXCEPTIONAL' && exceptionalType === 'PERIOD' && start && end) {
      return start <= end ? null : { periodOrder: true };
    }

    return null;
  }

  private validateTimeRanges(group: FormGroup) {
    const status = group.get('status')?.value;
    const openingType = group.get('openingType')?.value;
    const start = group.get('startTime')?.value;
    const end = group.get('endTime')?.value;
    const start2 = group.get('startTime2')?.value;
    const end2 = group.get('endTime2')?.value;

    if (status === 'CLOSED') {
      if (start || end || start2 || end2) {
        return { closedHasTimes: true };
      }
      return null;
    }

    if (start && end && this.toMinutes(start) >= this.toMinutes(end)) {
      return { timeOrder: true };
    }

    if (openingType === 'SPLIT' && start2 && end2 && this.toMinutes(start2) >= this.toMinutes(end2)) {
      return { timeOrderSplit: true };
    }

    return null;
  }

  private buildPayload(): GarageHourPayload {
    const value = this.form.getRawValue();

    const payload: GarageHourPayload = {
      scope: value.scope,
      status: value.status,
    };

    if (value.scope === 'ANNUAL') {
      payload.dayOfWeek = value.dayOfWeek;
    } else {
      payload.exceptionalType = value.exceptionalType;
      if (value.exceptionalType === 'SINGLE_DAY') {
        payload.exceptionalDate = value.exceptionalDate || null;
      } else {
        payload.exceptionalStartDate = value.exceptionalStartDate || null;
        payload.exceptionalEndDate = value.exceptionalEndDate || null;
        payload.label = value.label || null;
      }
    }

    if (value.status === 'OPEN') {
      payload.openingType = value.openingType;
      payload.startTime = this.toApiTime(value.startTime);
      payload.endTime = this.toApiTime(value.endTime);

      if (value.openingType === 'SPLIT') {
        payload.startTime2 = this.toApiTime(value.startTime2);
        payload.endTime2 = this.toApiTime(value.endTime2);
      }
    }

    return payload;
  }

  private formatTime(value?: string | null): string {
    if (!value) return '';
    const [hours, minutes] = value.split(':');
    if (!hours || !minutes) return value;
    return `${hours.padStart(2, '0')}h${minutes.padStart(2, '0')}`;
  }

  private toApiTime(value?: string | null): string | null {
    if (!value) return null;
    return value.includes(':') && value.length === 5 ? `${value}:00` : value;
  }

  private toInputTime(value?: string | null): string {
    if (!value) return '';
    return value.length >= 5 ? value.slice(0, 5) : value;
  }

  private toMinutes(value?: string | null): number {
    if (!value) return 0;
    const [hours, minutes] = value.split(':').map(Number);
    return (hours || 0) * 60 + (minutes || 0);
  }

  private resolveId(hour: GarageHourDto): number | undefined {
    return hour.id ?? hour.idGarageHour ?? hour.id_garage_hour ?? undefined;
  }
}
