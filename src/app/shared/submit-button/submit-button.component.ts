import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup } from '@angular/forms';

@Component({
  selector: 'app-submit-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './submit-button.component.html',
  styleUrls: ['./submit-button.component.scss'],
})
export class SubmitButtonComponent {
  @Input() label = 'Valider';
  @Input() loadingLabel?: string;

  private _loading = signal<boolean>(false);
  @Input() set loading(v: boolean) { this._loading.set(!!v); }
  isLoading = computed(() => this._loading());

  @Input() form?: FormGroup;

  private _manualDisabled = signal<boolean>(false);
  @Input() set disabled(v: boolean) { this._manualDisabled.set(!!v); }
  isManuallyDisabled = computed(() => this._manualDisabled());

  @Input() type: 'button' | 'submit' | 'reset' = 'submit';

  // ✅ Getter : se réévalue à chaque CD, donc suit bien l’état du FormGroup
  get isDisabled(): boolean {
    return this.isManuallyDisabled() || this.isLoading() || !!this.form?.invalid || !!this.form?.pending;
  }
}
