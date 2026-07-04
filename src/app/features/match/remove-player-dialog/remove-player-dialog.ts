import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

export type RemovePlayerDialogResult = 'confirm' | 'cancel';

export interface RemovePlayerDialogData {
  playerName: string;
}

@Component({
  selector: 'app-remove-player-dialog',
  imports: [MatDialogModule, MatButtonModule],
  templateUrl: './remove-player-dialog.html',
  styleUrl: './remove-player-dialog.scss',
})
export class RemovePlayerDialog {
  protected readonly data = inject<RemovePlayerDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<RemovePlayerDialog, RemovePlayerDialogResult>);

  close(result: RemovePlayerDialogResult): void {
    this.dialogRef.close(result);
  }
}
