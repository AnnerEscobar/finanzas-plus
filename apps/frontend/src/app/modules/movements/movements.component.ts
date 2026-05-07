import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  MovementsService,
  Movement,
  Category,
  MonthlySummary,
} from '../../core/services/movements.service';
import { AccountsService, Account } from '../../core/services/accounts.service';
import { CreditCardsService, CreditCard } from '../../core/services/creditCards.service';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';

type DialogType = 'income' | 'expense' | 'transfer' | 'adjustment' | null;

@Component({
  selector: 'app-movements',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NavbarComponent],
  templateUrl: './movements.component.html',
  styleUrls: ['./movements.component.css'],
})
export class MovementsComponent implements OnInit, OnDestroy {
  // State
  movements: Movement[] = [];
  accounts: Account[] = [];
  creditCards: CreditCard[] = [];
  categoriesIncome: Category[] = [];
  categoriesExpense: Category[] = [];
  monthlySummary: MonthlySummary | null = null;

  // Filters
  filterType = '';
  filterAccountId = '';
  filterCategoryId = '';
  filterFromDate = '';
  filterToDate = '';

  // Period for summary
  selectedYear: number = new Date().getFullYear();
  selectedMonth: number = new Date().getMonth() + 1;

  // UI
  loading = false;
  error: string | null = null;
  success: string | null = null;
  activeDialog: DialogType = null;

  // Forms
  incomeForm!: FormGroup;
  expenseForm!: FormGroup;
  transferForm!: FormGroup;
  adjustmentForm!: FormGroup;

  private destroy$ = new Subject<void>();

  constructor(
    private movementsService: MovementsService,
    private accountsService: AccountsService,
    private creditCardsService: CreditCardsService,
    private fb: FormBuilder,
  ) {
    this.initializeForms();
  }

  ngOnInit() {
    this.loadAll();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForms() {
    const today = new Date().toISOString().split('T')[0];

    this.incomeForm = this.fb.group({
      amountCents: ['', [Validators.required, Validators.min(0.01)]],
      date: [today, Validators.required],
      accountId: ['', Validators.required],
      categoryId: [''],
      note: [''],
    });

    this.expenseForm = this.fb.group({
      amountCents: ['', [Validators.required, Validators.min(0.01)]],
      date: [today, Validators.required],
      paymentMethod: ['debit', Validators.required],
      // Para efectivo/débito:
      accountId: [''],
      // Para tarjeta de crédito:
      cardId: [''],
      description: [''],   // descripción del cargo en tarjeta
      categoryId: [''],
      note: [''],
    });

    this.transferForm = this.fb.group({
      amountCents: ['', [Validators.required, Validators.min(0.01)]],
      date: [today, Validators.required],
      sourceAccountId: ['', Validators.required],
      targetAccountId: ['', Validators.required],
      note: [''],
    });

    this.adjustmentForm = this.fb.group({
      amountCents: ['', Validators.required],
      date: [today, Validators.required],
      accountId: ['', Validators.required],
      note: [''],
    });
  }

  /**
   * Cargar todo: cuentas, categorías, movimientos, resumen
   */
  loadAll() {
    this.loadAccounts();
    this.loadCards();
    this.loadCategories();
    this.loadMovements();
    this.loadSummary();
  }

  loadAccounts() {
    this.accountsService
      .getAccounts()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.accounts = response.accounts || [];
        },
        error: () => {},
      });
  }

  loadCards() {
    this.creditCardsService
      .getCards()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          // Solo tarjetas activas con corte abierto
          this.creditCards = response.cards.filter((c) =>
            c.statementCycles?.some((s) => s.status === 'open'),
          );
        },
        error: () => {},
      });
  }

  loadCategories() {
    this.movementsService
      .getCategories('expense')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.categoriesExpense = response.categories;
        },
      });

    this.movementsService
      .getCategories('income')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.categoriesIncome = response.categories;
        },
      });
  }

  loadMovements() {
    this.loading = true;
    const filters: any = { limit: 100 };
    if (this.filterType) filters.type = this.filterType;
    if (this.filterAccountId) filters.accountId = this.filterAccountId;
    if (this.filterCategoryId) filters.categoryId = this.filterCategoryId;
    if (this.filterFromDate) filters.fromDate = this.filterFromDate;
    if (this.filterToDate) filters.toDate = this.filterToDate;

    this.movementsService
      .getMovements(filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.movements = response.movements;
          this.loading = false;
        },
        error: () => {
          this.error = 'Error al cargar movimientos';
          this.loading = false;
        },
      });
  }

  loadSummary() {
    this.movementsService
      .getMonthlySummary(this.selectedYear, this.selectedMonth)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.monthlySummary = response;
        },
        error: () => {},
      });
  }

  applyFilters() {
    this.loadMovements();
  }

  clearFilters() {
    this.filterType = '';
    this.filterAccountId = '';
    this.filterCategoryId = '';
    this.filterFromDate = '';
    this.filterToDate = '';
    this.loadMovements();
  }

  changePeriod(delta: number) {
    let m = this.selectedMonth + delta;
    let y = this.selectedYear;
    if (m > 12) {
      m = 1;
      y += 1;
    } else if (m < 1) {
      m = 12;
      y -= 1;
    }
    this.selectedMonth = m;
    this.selectedYear = y;
    this.loadSummary();
  }

  getMonthLabel(): string {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
    ];
    return `${months[this.selectedMonth - 1]} ${this.selectedYear}`;
  }

  // ============================================
  // Dialogs
  // ============================================

  openDialog(type: DialogType) {
    if (this.accounts.length === 0) {
      this.error = 'Primero crea una cuenta antes de registrar movimientos';
      return;
    }
    this.activeDialog = type;
    this.error = null;
    this.success = null;

    const today = new Date().toISOString().split('T')[0];
    if (type === 'income') {
      this.incomeForm.reset({ date: today, accountId: '', categoryId: '' });
    } else if (type === 'expense') {
      this.expenseForm.reset({ date: today, accountId: '', categoryId: '', paymentMethod: 'debit' });
    } else if (type === 'transfer') {
      this.transferForm.reset({ date: today, sourceAccountId: '', targetAccountId: '' });
    } else if (type === 'adjustment') {
      this.adjustmentForm.reset({ date: today, accountId: '' });
    }
  }

  closeDialog() {
    this.activeDialog = null;
  }

  // ============================================
  // Submit
  // ============================================

  submitIncome() {
    if (!this.incomeForm.valid) return;
    const formData = { ...this.incomeForm.value };
    formData.amountCents = this.movementsService.toCents(Number(formData.amountCents));
    if (!formData.categoryId) delete formData.categoryId;

    this.loading = true;
    this.movementsService
      .createIncome(formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.success = 'Ingreso registrado correctamente';
          this.closeDialog();
          this.loadAll();
        },
        error: (err) => {
          this.error = err.error?.message || 'Error al registrar el ingreso';
          this.loading = false;
        },
      });
  }

  // Getter to read current paymentMethod value from the form (used in template)
  get expensePaymentMethod(): string {
    return this.expenseForm.get('paymentMethod')?.value || 'debit';
  }

  submitExpense() {
    const formData = { ...this.expenseForm.value };
    const paymentMethod: string = formData.paymentMethod;

    if (!formData.amountCents || Number(formData.amountCents) <= 0) {
      this.error = 'Ingresa un monto válido';
      return;
    }

    formData.amountCents = this.movementsService.toCents(Number(formData.amountCents));
    if (!formData.categoryId) delete formData.categoryId;

    // ── Tarjeta de crédito: registrar cargo en el corte abierto ──
    if (paymentMethod === 'credit_card') {
      const cardId = formData.cardId;
      if (!cardId) {
        this.error = 'Selecciona una tarjeta de crédito';
        return;
      }
      if (!formData.description) {
        this.error = 'Ingresa una descripción del cargo';
        return;
      }
      const card = this.creditCards.find((c) => c._id === cardId);
      if (!card) {
        this.error = 'Tarjeta no encontrada';
        return;
      }
      const openCorte = card.statementCycles?.find((s) => s.status === 'open');
      if (!openCorte) {
        this.error = 'La tarjeta seleccionada no tiene un corte abierto';
        return;
      }

      const chargeData: any = {
        description: formData.description,
        amountCents: formData.amountCents,
        date: formData.date,
        note: formData.note || undefined,
      };
      if (formData.categoryId) chargeData.categoryId = formData.categoryId;

      this.loading = true;
      this.error = null;
      this.creditCardsService
        .recordCharge(cardId, openCorte._id, chargeData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.success = 'Cargo registrado en tarjeta correctamente';
            this.closeDialog();
            this.loadAll();
          },
          error: (err) => {
            this.error = err.error?.message || 'Error al registrar el cargo en tarjeta';
            this.loading = false;
          },
        });
      return;
    }

    // ── Efectivo / Débito: movimiento normal ──
    if (!formData.accountId) {
      this.error = 'Selecciona una cuenta';
      return;
    }

    this.loading = true;
    this.error = null;
    this.movementsService
      .createExpense(formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.success = 'Gasto registrado correctamente';
          this.closeDialog();
          this.loadAll();
        },
        error: (err) => {
          this.error = err.error?.message || 'Error al registrar el gasto';
          this.loading = false;
        },
      });
  }

  submitTransfer() {
    if (!this.transferForm.valid) return;
    const formData = { ...this.transferForm.value };
    formData.amountCents = this.movementsService.toCents(Number(formData.amountCents));

    if (formData.sourceAccountId === formData.targetAccountId) {
      this.error = 'No puede transferir a la misma cuenta';
      return;
    }

    this.loading = true;
    this.movementsService
      .createTransfer(formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.success = 'Transferencia registrada correctamente';
          this.closeDialog();
          this.loadAll();
        },
        error: (err) => {
          this.error = err.error?.message || 'Error al registrar la transferencia';
          this.loading = false;
        },
      });
  }

  submitAdjustment() {
    if (!this.adjustmentForm.valid) return;
    const formData = { ...this.adjustmentForm.value };
    formData.amountCents = this.movementsService.toCents(Number(formData.amountCents));

    this.loading = true;
    this.movementsService
      .createAdjustment(formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.success = 'Ajuste registrado correctamente';
          this.closeDialog();
          this.loadAll();
        },
        error: (err) => {
          this.error = err.error?.message || 'Error al registrar el ajuste';
          this.loading = false;
        },
      });
  }

  deleteMovement(movement: Movement) {
    const typeLabel = this.movementsService.getTypeLabel(movement.type);
    if (!confirm(`¿Eliminar ${typeLabel} de ${this.formatCurrency(movement.amountCents)}? Se revertirá el saldo de la cuenta.`)) {
      return;
    }

    this.movementsService
      .deleteMovement(movement._id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.success = 'Movimiento eliminado';
          this.loadAll();
        },
        error: (err) => {
          this.error = err.error?.message || 'Error al eliminar el movimiento';
        },
      });
  }

  // ============================================
  // Helpers
  // ============================================

  formatCurrency(cents: number): string {
    return this.movementsService.formatCurrency(cents);
  }

  getTypeLabel(type: string): string {
    return this.movementsService.getTypeLabel(type);
  }

  getTypeColor(type: string): string {
    return this.movementsService.getTypeColor(type);
  }

  getTypeIcon(type: string): string {
    return this.movementsService.getTypeIcon(type);
  }

  getPaymentMethodLabel(method: string): string {
    return this.movementsService.getPaymentMethodLabel(method);
  }

  getAccountAlias(accountId: any): string {
    if (typeof accountId === 'object' && accountId?.alias) {
      return accountId.alias;
    }
    const acc = this.accounts.find((a) => a._id === accountId);
    return acc?.alias || '—';
  }

  getCategoryName(categoryId: any): string {
    if (!categoryId) return '—';
    if (typeof categoryId === 'object' && categoryId?.name) {
      return categoryId.name;
    }
    const all = [...this.categoriesExpense, ...this.categoriesIncome];
    const cat = all.find((c) => c._id === categoryId);
    return cat?.name || '—';
  }
}
