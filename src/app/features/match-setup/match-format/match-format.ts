import { Component, input, output } from '@angular/core';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonToggleModule } from '@angular/material/button-toggle';

export type LegsCountMode = 'bestOf' | 'firstTo';

export interface MatchFormatSelection {
  legsMode: LegsCountMode;
  legsCount: number;
  useSets: boolean;
  setsMode: LegsCountMode;
  setsCount: number;
}

@Component({
  selector: 'app-match-format',
  imports: [MatSlideToggleModule, MatFormFieldModule, MatInputModule, MatButtonToggleModule],
  templateUrl: './match-format.html',
  styleUrl: './match-format.scss',
})
export class MatchFormatPicker {
  readonly selection = input.required<MatchFormatSelection>();
  readonly selectionChange = output<MatchFormatSelection>();

  setLegsMode(legsMode: LegsCountMode): void {
    const legsCount = this.sanitizeCount(legsMode, String(this.selection().legsCount), this.selection().legsCount);
    this.selectionChange.emit({ ...this.selection(), legsMode, legsCount });
  }

  setLegsCount(value: string): void {
    const legsCount = this.sanitizeCount(this.selection().legsMode, value, this.selection().legsCount);
    this.selectionChange.emit({ ...this.selection(), legsCount });
  }

  setUseSets(useSets: boolean): void {
    this.selectionChange.emit({ ...this.selection(), useSets });
  }

  setSetsMode(setsMode: LegsCountMode): void {
    const setsCount = this.sanitizeCount(setsMode, String(this.selection().setsCount), this.selection().setsCount);
    this.selectionChange.emit({ ...this.selection(), setsMode, setsCount });
  }

  setSetsCount(value: string): void {
    const setsCount = this.sanitizeCount(this.selection().setsMode, value, this.selection().setsCount);
    this.selectionChange.emit({ ...this.selection(), setsCount });
  }

  private sanitizeCount(mode: LegsCountMode, value: string, fallback: number): number {
    const parsed = Math.round(Number(value));
    if (!Number.isFinite(parsed) || parsed < 1) {
      return fallback;
    }
    return mode === 'bestOf' && parsed % 2 === 0 ? parsed + 1 : parsed;
  }
}
