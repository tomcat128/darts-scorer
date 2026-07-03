import { Component, input, output } from '@angular/core';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

export interface MatchFormatSelection {
  bestOfLegs: number;
  useSets: boolean;
  bestOfSets: number;
}

@Component({
  selector: 'app-match-format',
  imports: [MatSlideToggleModule, MatFormFieldModule, MatInputModule],
  templateUrl: './match-format.html',
  styleUrl: './match-format.scss',
})
export class MatchFormatPicker {
  readonly selection = input.required<MatchFormatSelection>();
  readonly selectionChange = output<MatchFormatSelection>();

  setBestOfLegs(value: string): void {
    const bestOfLegs = this.sanitizeOdd(value, this.selection().bestOfLegs);
    this.selectionChange.emit({ ...this.selection(), bestOfLegs });
  }

  setUseSets(useSets: boolean): void {
    this.selectionChange.emit({ ...this.selection(), useSets });
  }

  setBestOfSets(value: string): void {
    const bestOfSets = this.sanitizeOdd(value, this.selection().bestOfSets);
    this.selectionChange.emit({ ...this.selection(), bestOfSets });
  }

  private sanitizeOdd(value: string, fallback: number): number {
    const parsed = Math.round(Number(value));
    if (!Number.isFinite(parsed) || parsed < 1) {
      return fallback;
    }
    return parsed % 2 === 0 ? parsed + 1 : parsed;
  }
}
