import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DebtsService, Debt, DebtSummary } from '../../core/services/debts.service';
import { AccountsService } from '../../core/services/accounts.service';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';

@Component({
  selector: 'app-debts',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NavbarComponent],
  templateUrl: './debts.component.html',
  styleUrls: ['./debts.component.css'],
})
export class DebtsComponent implements OnInit, OnDestroy {
  // State
  debts: Debt[] = [];
  selectedDebt: Debt | null = null;
  summary: DebtSummary | null = null;
  accounts: any[] = [];
  debtStatusFilter: 'active' | 'paid' = 'active';

  // Loading/Error
  loading = false;
  error: string | null = null;

  // Dialogs
  showAddDebtDialog = false;
  showEditDebtDialog = false;
  showPaymentDialog = false;

  // Forms
  debtForm!: FormGroup;
  editForm!: FormGroup;
  paymentForm!: FormGroup;

  // RxJS cleanup
  private destroy$ = new Subject<void>();

  constructor(
    private debtsService: DebtsService,
    private accountsService: AccountsService,
    private fb: FormBuilder,
  ) {
    this.initializeForms();
  }

  ngOnInit() {
    this.loadDebts();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Initialize all reactive forms
   */
  private initializeForms() {
    this.debtForm = this.fb.group({
      alias: ['', Validators.required],
      creditorName: ['', Validators.required],
      debtType: ['loan', Validators.required],
      originalAmountCents: ['', [Validators.required, Validators.min(0.01)]],
      remainingCents: [null], // opcional - si se deja vacío se calcula auto
      interestRate: [0, [Validators.min(0)]],
      monthlyPaymentCents: [0, [Validators.min(0)]],
      totalInstallments: [0, [Validators.min(0)]],
      paidInstallments: [0, [Validators.min(0)]],
      startDate: [new Date().toISOString().split('T')[0]],
      dueDate: [''],
      note: [''],
    });

    this.editForm = this.fb.group({
      alias: ['', Validators.required],
      creditorName: ['', Validators.required],
      debtType: ['loan'],
      remainingCents: [0, [Validators.min(0)]],
      interestRate: [0],
      monthlyPaymentCents: [0],
      totalInstallments: [0],
      paidInstallments: [0],
      dueDate: [''],
      note: [''],
    });

    this.paymentForm = this.fb.group({
      amountCents: ['', [Validators.required, Validators.min(0.01)]],
      date: [new Date().toISOString().split('T')[0]],
      accountId: ['', Validators.required],
      principalCents: [0],
      interestCents: [0],
      note: [''],
    });
  }

  /**
   * Load all debts and summary
   */
  loadDebts() {
    this.loading = true;
    this.error = null;

    this.debtsService
      .getDebts(this.debtStatusFilter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.debts = response.debts;
          this.summary = response.summary;
          this.loading = false;

          // Re-select if had a selection
          if (this.selectedDebt) {
            const updated = this.debts.find((d) => d._id === this.selectedDebt!._id);
            this.selectedDebt = updated || null;
          }
        },
        error: () => {
          this.error = 'Error al cargar deudas';
          this.loading = false;
        },
      });

    // Cargar cuentas para selector de pago
    this.accountsService
      .getAccounts()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.accounts = response.accounts || [];
        },
        error: () => {
          // Silent fail
        },
      });
  }

  setDebtStatusFilter(status: 'active' | 'paid') {
    if (this.debtStatusFilter === status) return;
    this.debtStatusFilter = status;
    this.selectedDebt = null;
    this.loadDebts();
  }

  /**
   * Select a debt to view details
   */
  selectDebt(debt: Debt) {
    this.selectedDebt = debt;
    this.error = null;
  }

  // ============================================
  // Add Debt Dialog
  // ============================================

  openAddDebtDialog() {
    this.debtForm.reset({
      debtType: 'loan',
      remainingCents: null,
      interestRate: 0,
      monthlyPaymentCents: 0,
      totalInstallments: 0,
      paidInstallments: 0,
      startDate: new Date().toISOString().split('T')[0],
    });
    this.showAddDebtDialog = true;
    this.error = null;
  }

  closeAddDebtDialog() {
    this.showAddDebtDialog = false;
    this.debtForm.reset();
  }

  /**
   * Create new debt
   */
  createDebt() {
    if (!this.debtForm.valid) {
      this.error = 'Por favor completa todos los campos requeridos';
      return;
    }

    const formData = { ...this.debtForm.value };

    // Convertir Q a centavos
    formData.originalAmountCents = this.debtsService.toCents(Number(formData.originalAmountCents));
    formData.monthlyPaymentCents = this.debtsService.toCents(Number(formData.monthlyPaymentCents || 0));

    // Saldo restante: si se ingresó, convertir a centavos; si no, eliminar para que backend calcule
    if (formData.remainingCents !== null && formData.remainingCents !== '' && !isNaN(Number(formData.remainingCents))) {
      formData.remainingCents = this.debtsService.toCents(Number(formData.remainingCents));
    } else {
      delete formData.remainingCents;
    }

    this.loading = true;
    this.debtsService
      .createDebt(formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.closeAddDebtDialog();
          this.loadDebts();
        },
        error: (err) => {
          this.error = err.error?.message || 'Error al crear la deuda';
          this.loading = false;
        },
      });
  }

  // ============================================
  // Edit Debt Dialog
  // ============================================

  openEditDebtDialog() {
    if (!this.selectedDebt) return;

    this.editForm.patchValue({
      alias: this.selectedDebt.alias,
      creditorName: this.selectedDebt.creditorName,
      debtType: this.selectedDebt.debtType,
      remainingCents: this.selectedDebt.remainingCents / 100,
      interestRate: this.selectedDebt.interestRate,
      monthlyPaymentCents: this.selectedDebt.monthlyPaymentCents / 100,
      totalInstallments: this.selectedDebt.totalInstallments,
      paidInstallments: this.selectedDebt.paidInstallments,
      dueDate: this.selectedDebt.dueDate
        ? new Date(this.selectedDebt.dueDate).toISOString().split('T')[0]
        : '',
      note: this.selectedDebt.note || '',
    });
    this.showEditDebtDialog = true;
    this.error = null;
  }

  closeEditDebtDialog() {
    this.showEditDebtDialog = false;
    this.editForm.reset();
  }

  updateDebt() {
    if (!this.selectedDebt || !this.editForm.valid) {
      this.error = 'Por favor completa los campos requeridos';
      return;
    }

    const formData = { ...this.editForm.value };
    formData.monthlyPaymentCents = this.debtsService.toCents(Number(formData.monthlyPaymentCents || 0));
    formData.remainingCents = this.debtsService.toCents(Number(formData.remainingCents || 0));

    this.loading = true;
    this.debtsService
      .updateDebt(this.selectedDebt._id, formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.closeEditDebtDialog();
          this.loadDebts();
        },
        error: (err) => {
          this.error = err.error?.message || 'Error al actualizar la deuda';
          this.loading = false;
        },
      });
  }

  // ============================================
  // Delete Debt
  // ============================================

  deleteDebt() {
    if (!this.selectedDebt) return;
    if (!confirm(`¿Estás seguro de eliminar la deuda "${this.selectedDebt.alias}"?`)) return;

    this.debtsService
      .deleteDebt(this.selectedDebt._id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.selectedDebt = null;
          this.loadDebts();
        },
        error: (err) => {
          this.error = err.error?.message || 'Error al eliminar la deuda';
        },
      });
  }

  // ============================================
  // Payment Dialog
  // ============================================

  openPaymentDialog() {
    if (!this.selectedDebt) return;
    if (this.selectedDebt.status !== 'active') {
      this.error = 'Solo se pueden registrar pagos en deudas activas';
      return;
    }

    // Pre-llenar con cuota mensual si está disponible
    const defaultAmount = this.selectedDebt.monthlyPaymentCents > 0
      ? this.selectedDebt.monthlyPaymentCents / 100
      : '';

    this.paymentForm.reset({
      amountCents: defaultAmount,
      date: new Date().toISOString().split('T')[0],
      accountId: this.accounts.length === 1 ? this.accounts[0]._id : '',
      principalCents: 0,
      interestCents: 0,
    });

    this.showPaymentDialog = true;
    this.error = null;
  }

  closePaymentDialog() {
    this.showPaymentDialog = false;
    this.paymentForm.reset();
  }

  recordPayment() {
    if (!this.selectedDebt || !this.paymentForm.valid) {
      this.error = 'Completa los datos del pago';
      return;
    }

    const formData = { ...this.paymentForm.value };
    formData.amountCents = this.debtsService.toCents(Number(formData.amountCents));

    if (formData.principalCents) {
      formData.principalCents = this.debtsService.toCents(Number(formData.principalCents));
    }
    if (formData.interestCents) {
      formData.interestCents = this.debtsService.toCents(Number(formData.interestCents));
    }

    this.loading = true;
    this.debtsService
      .recordPayment(this.selectedDebt._id, formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          this.selectedDebt = updated;
          this.closePaymentDialog();
          this.loadDebts();
          this.loading = false;
        },
        error: (err) => {
          this.error = err.error?.message || 'Error al registrar el pago';
          this.loading = false;
        },
      });
  }

  /**
   * Delete a payment
   */
  deletePayment(paymentId: string) {
    if (!this.selectedDebt) return;
    if (!confirm('¿Eliminar este pago? El saldo se restaurará.')) return;

    this.debtsService
      .deletePayment(this.selectedDebt._id, paymentId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          this.selectedDebt = updated;
          this.loadDebts();
        },
        error: (err) => {
          this.error = err.error?.message || 'Error al eliminar el pago';
        },
      });
  }

  // ============================================
  // Helpers
  // ============================================

  formatCurrency(cents: number): string {
    return this.debtsService.formatCurrency(cents);
  }

  getDebtTypeLabel(type: string): string {
    return this.debtsService.getDebtTypeLabel(type);
  }

  getStatusLabel(status: string): string {
    return this.debtsService.getStatusLabel(status);
  }

  getStatusColor(status: string): string {
    return this.debtsService.getStatusColor(status);
  }

  calculateProgress(debt: Debt): number {
    return this.debtsService.calculateProgress(debt);
  }

  /**
   * Próxima cuota: cuotas pagadas + 1 (si hay esquema de cuotas)
   */
  getNextInstallment(debt: Debt): number {
    if (debt.totalInstallments === 0) return 0;
    if (debt.paidInstallments >= debt.totalInstallments) return debt.totalInstallments;
    return debt.paidInstallments + 1;
  }

  /**
   * Cuotas restantes
   */
  getRemainingInstallments(debt: Debt): number {
    if (debt.totalInstallments === 0) return 0;
    return Math.max(0, debt.totalInstallments - debt.paidInstallments);
  }

  /**
   * Preview de saldo restante calculado a partir del formulario
   * (para mostrar en tiempo real al usuario)
   */
  getCalculatedRemainingPreview(): string | null {
    const original = Number(this.debtForm.value.originalAmountCents) || 0;
    const monthly = Number(this.debtForm.value.monthlyPaymentCents) || 0;
    const paid = Number(this.debtForm.value.paidInstallments) || 0;
    const manualRemaining = this.debtForm.value.remainingCents;

    // Si el usuario ingresó saldo manualmente, mostrar ese valor
    if (manualRemaining !== null && manualRemaining !== '' && !isNaN(Number(manualRemaining))) {
      return this.debtsService.formatCurrency(this.debtsService.toCents(Number(manualRemaining)));
    }

    // Si hay cuotas pagadas, calcular automáticamente
    if (paid > 0 && monthly > 0 && original > 0) {
      const remaining = Math.max(0, original - (paid * monthly));
      return this.debtsService.formatCurrency(this.debtsService.toCents(remaining));
    }

    // Por defecto = monto original
    if (original > 0) {
      return this.debtsService.formatCurrency(this.debtsService.toCents(original));
    }

    return null;
  }
}
