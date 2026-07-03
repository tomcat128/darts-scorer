import { Component, computed, input, output } from '@angular/core';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { CheckinMode, CheckoutMode, X01Config } from '../../../core/models/match-config.model';

@Component({
  selector: 'app-x01-options',
  imports: [MatButtonToggleModule, MatFormFieldModule, MatInputModule],
  templateUrl: './x01-options.html',
  styleUrl: './x01-options.scss',
})
export class X01Options {
  readonly config = input.required<X01Config>();
  readonly configChange = output<X01Config>();

  protected readonly preset = computed<'501' | '301' | 'custom'>(() => {
    const score = this.config().startingScore;
    return score === 501 ? '501' : score === 301 ? '301' : 'custom';
  });

  selectPreset(preset: '501' | '301' | 'custom'): void {
    const startingScore = preset === '501' ? 501 : preset === '301' ? 301 : 101;
    this.configChange.emit({ ...this.config(), startingScore });
  }

  setCustomScore(value: string): void {
    const startingScore = Math.max(2, Math.min(999, Number(value) || 101));
    this.configChange.emit({ ...this.config(), startingScore });
  }

  setCheckoutMode(checkoutMode: CheckoutMode): void {
    this.configChange.emit({ ...this.config(), checkoutMode });
  }

  setCheckinMode(checkinMode: CheckinMode): void {
    this.configChange.emit({ ...this.config(), checkinMode });
  }
}
