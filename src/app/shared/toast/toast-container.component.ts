import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from './toast.service';
import { Toast } from './toast.model';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast-container.component.html',
  styleUrls: ['./toast-container.component.scss']
})
export class ToastContainerComponent {
  private toast = inject(ToastService);
  list = computed(() => this.toast.toasts());

  close(id: string) {
    this.toast.dismiss(id);
  }

  kindClass(t: Toast) {
    return {
      success: t.kind === 'success',
      error:   t.kind === 'error',
      info:    t.kind === 'info',
      warning: t.kind === 'warning',
    };
  }

  /** variable CSS pour la durée (progress bar) */
  durStyle(t: Toast) {
    return { '--dur': `${t.duration}ms` } as any;
  }
}
