import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  templateUrl: './confirm-dialog.component.html',
  styleUrls: ['./confirm-dialog.component.scss']
})
export class ConfirmDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData
  ) {
    // تعيين قيم افتراضية
    this.data.confirmText = data.confirmText || 'تأكيد';
    this.data.cancelText = data.cancelText || 'إلغاء';
  }

  onConfirm(): void {
    // إغلاق الحوار وإرجاع true (تأكيد)
    this.dialogRef.close(true);
  }

  onCancel(): void {
    // إغلاق الحوار وإرجاع false (إلغاء)
    this.dialogRef.close(false);
  }
}