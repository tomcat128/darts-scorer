import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

export interface MatchWonDialogData {
  winnerName: string;
}

export type MatchWonDialogResult = 'new-match' | 'done';

@Component({
  selector: 'app-match-won-dialog',
  imports: [MatDialogModule, MatButtonModule],
  templateUrl: './match-won-dialog.html',
  styleUrl: './match-won-dialog.scss',
})
export class MatchWonDialog {
  protected readonly data = inject<MatchWonDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<MatchWonDialog, MatchWonDialogResult>);

  close(result: MatchWonDialogResult): void {
    this.dialogRef.close(result);
  }
}
