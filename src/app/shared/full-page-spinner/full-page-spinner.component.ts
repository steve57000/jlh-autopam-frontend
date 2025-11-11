import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-full-page-spinner',
  standalone: true,
  template: `
    <div class="fps-wrap" role="status" aria-live="polite" aria-busy="true">
      <div class="fps"></div>
      <p>Chargement…</p>
    </div>
  `,
  styles: [`
    .fps-wrap{
      position:fixed; inset:0; display:flex; flex-direction:column;
      align-items:center; justify-content:center; gap:.75rem;
      background:rgba(255,255,255,.85); backdrop-filter:saturate(120%) blur(2px);
      z-index:9999; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
    }
    .fps{
      width:48px; height:48px; border-radius:50%;
      border:4px solid #e9ecef; border-top-color:#0d6efd;
      animation:spin 1s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg) } }
    p{ margin:0; color:#495057; font-size:.95rem; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FullPageSpinnerComponent {}
