import { Injectable, signal } from '@angular/core';
import { Toast, ToastKind } from './toast.model';

@Injectable({ providedIn: 'root' })
export class ToastService {
  private _toasts = signal<Toast[]>([]);
  toasts = this._toasts.asReadonly();

  private push(kind: ToastKind, message: string, detail?: string, duration = 3500, closable = true) {
    const id = crypto.randomUUID();
    const t: Toast = { id, kind, message, detail, duration, closable };
    this._toasts.update(arr => [...arr, t]);

    // auto-dismiss si duration > 0
    if (duration > 0) {
      setTimeout(() => this.dismiss(id), duration);
    }
    return id;
  }

  success(msg: string, detail?: string, duration = 3500) { return this.push('success', msg, detail, duration); }
  info(msg: string, detail?: string, duration = 3500)    { return this.push('info',    msg, detail, duration); }
  warning(msg: string, detail?: string, duration = 4500) { return this.push('warning', msg, detail, duration); }
  error(msg: string, detail?: string, duration = 5500)   { return this.push('error',   msg, detail, duration); }

  dismiss(id: string) { this._toasts.update(arr => arr.filter(t => t.id !== id)); }
  clear() { this._toasts.set([]); }
}
