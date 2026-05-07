import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AccountsService, Account, AccountSummary } from '../../core/services/accounts.service';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';

@Component({
  selector: 'app-accounts',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NavbarComponent],
  templateUrl: './accounts.component.html',
  styleUrls: ['./accounts.component.css'],
})
export class AccountsComponent implements OnInit, OnDestroy {
  accounts: Account[] = [];
  selectedAccount: Account | null = null;
  summary: AccountSummary | null = null;

  loading = false;
  error: string | null = null;

  showAddDialog = false;
  showEditDialog = false;

  accountForm!: FormGroup;
  editForm!: FormGroup;

  private destroy$ = new Subject<void>();

  constructor(
    private accountsService: AccountsService,
    private fb: FormBuilder,
  ) {
    this.initializeForms();
  }

  ngOnInit() {
    this.loadAccounts();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForms() {
    this.accountForm = this.fb.group({
      alias: ['', Validators.required],
      institution: [''],
      type: ['checking', Validators.required],
      currentBalanceCents: [0, [Validators.min(0)]],
    });

    this.editForm = this.fb.group({
      alias: ['', Validators.required],
      institution: [''],
      type: ['checking'],
    });
  }

  loadAccounts() {
    this.loading = true;
    this.error = null;

    this.accountsService
      .getAccounts()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.accounts = response.accounts;
          this.summary = response.summary;
          this.loading = false;

          if (this.selectedAccount) {
            const updated = this.accounts.find((a) => a._id === this.selectedAccount!._id);
            this.selectedAccount = updated || null;
          }
        },
        error: () => {
          this.error = 'Error al cargar cuentas';
          this.loading = false;
        },
      });
  }

  selectAccount(account: Account) {
    this.selectedAccount = account;
    this.error = null;
  }

  // ============================================
  // Add Account
  // ============================================

  openAddDialog() {
    this.accountForm.reset({ type: 'checking', currentBalanceCents: 0 });
    this.showAddDialog = true;
    this.error = null;
  }

  closeAddDialog() {
    this.showAddDialog = false;
    this.accountForm.reset();
  }

  createAccount() {
    if (!this.accountForm.valid) {
      this.error = 'Completa los campos requeridos';
      return;
    }

    const formData = { ...this.accountForm.value };
    formData.currentBalanceCents = this.accountsService.toCents(Number(formData.currentBalanceCents || 0));

    this.loading = true;
    this.accountsService
      .createAccount(formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.closeAddDialog();
          this.loadAccounts();
        },
        error: (err) => {
          this.error = err.error?.message || 'Error al crear la cuenta';
          this.loading = false;
        },
      });
  }

  // ============================================
  // Edit Account
  // ============================================

  openEditDialog() {
    if (!this.selectedAccount) return;

    this.editForm.patchValue({
      alias: this.selectedAccount.alias,
      institution: this.selectedAccount.institution || '',
      type: this.selectedAccount.type,
    });
    this.showEditDialog = true;
    this.error = null;
  }

  closeEditDialog() {
    this.showEditDialog = false;
    this.editForm.reset();
  }

  updateAccount() {
    if (!this.selectedAccount || !this.editForm.valid) return;

    this.loading = true;
    this.accountsService
      .updateAccount(this.selectedAccount._id, this.editForm.value)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.closeEditDialog();
          this.loadAccounts();
        },
        error: (err) => {
          this.error = err.error?.message || 'Error al actualizar la cuenta';
          this.loading = false;
        },
      });
  }

  deleteAccount() {
    if (!this.selectedAccount) return;
    if (!confirm(`¿Eliminar la cuenta "${this.selectedAccount.alias}"?`)) return;

    this.accountsService
      .deleteAccount(this.selectedAccount._id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.selectedAccount = null;
          this.loadAccounts();
        },
        error: (err) => {
          this.error = err.error?.message || 'Error al eliminar la cuenta';
        },
      });
  }

  // ============================================
  // Helpers
  // ============================================

  formatCurrency(cents: number): string {
    return this.accountsService.formatCurrency(cents);
  }

  getTypeLabel(type: string): string {
    return this.accountsService.getTypeLabel(type);
  }

  getTypeColor(type: string): string {
    return this.accountsService.getTypeColor(type);
  }

  getTypeIcon(type: string): string {
    return this.accountsService.getTypeIcon(type);
  }

  /**
   * Helper para iterar el byType del summary en el template
   */
  getSummaryTypes(): Array<{ type: string; label: string; count: number; totalFormatted: string }> {
    if (!this.summary?.byType) return [];
    return Object.entries(this.summary.byType).map(([type, data]) => ({
      type,
      label: this.getTypeLabel(type),
      count: data.count,
      totalFormatted: data.totalFormatted,
    }));
  }
}
