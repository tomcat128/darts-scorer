import { Component, inject } from '@angular/core';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

export type EndMatchDialogResult = 'confirm' | 'cancel';

@Component({
  selector: 'app-end-match-dialog',
  imports: [MatDialogModule, MatButtonModule],
  templateUrl: './end-match-dialog.html',
  styleUrl: './end-match-dialog.scss',
})
export class EndMatchDialog {
  private readonly dialogRef = inject(MatDialogRef<EndMatchDialog, EndMatchDialogResult>);

  close(result: EndMatchDialogResult): void {
    this.dialogRef.close(result);
  }
}
