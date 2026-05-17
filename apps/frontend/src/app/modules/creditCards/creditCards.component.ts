import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  CreditCardsService,
  CreditCard,
  CreditCardCorte,
  ExtraFinanciamiento,
} from '../../core/services/creditCards.service';
import { AccountsService } from '../../core/services/accounts.service';
import { MovementsService, Category } from '../../core/services/movements.service';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';

@Component({
  selector: 'app-credit-cards',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NavbarComponent],
  templateUrl: './creditCards.component.html',
  styleUrls: ['./creditCards.component.css'],
})
export class CreditCardsComponent implements OnInit, OnDestroy {
  // State
  cards: CreditCard[] = [];
  selectedCard: CreditCard | null = null;
  selectedCorte: CreditCardCorte | null = null;
  totalBalance: string = 'Q0.00';

  // Migration
  needsMigration = false;
  migrating = false;
  showMigrationForm = false;

  // Migration overrides per card: { cardId: { cutoffDay, paymentDueDay } }
  migrationOverrides: Record<string, { cutoffDay: number; paymentDueDay: number }> = {};

  // Loading/Error
  loading = false;
  error: string | null = null;
  success: string | null = null;

  // Dialogs
  showAddCardDialog = false;
  showAddChargeDialog = false;
  showPaymentDialog = false;
  showExtraFinanciamientoDialog = false;
  showPayCorteDialog = false;
  showAbonarDialog = false;

  // Forms
  cardForm!: FormGroup;
  chargeForm!: FormGroup;
  paymentForm!: FormGroup;
  efForm!: FormGroup;
  payCorteForm!: FormGroup;
  abonarForm!: FormGroup;

  // Lookup data
  accounts: any[] = [];
  categories: Category[] = [];

  // RxJS
  private destroy$ = new Subject<void>();

  constructor(
    public creditCardsService: CreditCardsService,
    private accountsService: AccountsService,
    private movementsService: MovementsService,
    private fb: FormBuilder,
  ) {
    this.initializeForms();
  }

  ngOnInit() {
    this.loadCards();
    this.loadAccounts();
    this.loadCategories();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============================================
  // Forms initialization
  // ============================================

  private initializeForms() {
    this.cardForm = this.fb.group({
      alias: ['', Validators.required],
      issuer: ['', Validators.required],
      maskedNumber: ['', Validators.required],
      holderName: ['', Validators.required],
      creditLimitCents: ['', [Validators.required, Validators.min(1)]],
      cutoffDay: [15, [Validators.required, Validators.min(1), Validators.max(31)]],
      paymentDueDay: [10, [Validators.required, Validators.min(1), Validators.max(31)]],
    });

    this.chargeForm = this.fb.group({
      description: ['', Validators.required],
      amountCents: ['', [Validators.required, Validators.min(1)]],
      categoryId: ['', Validators.required],
      date: [new Date().toISOString().split('T')[0]],
      note: [''],
    });

    this.paymentForm = this.fb.group({
      amountCents: ['', [Validators.required, Validators.min(1)]],
      date: [new Date().toISOString().split('T')[0]],
      accountId: ['', Validators.required],
      note: [''],
    });

    this.efForm = this.fb.group({
      description: ['', Validators.required],
      totalAmountCents: ['', [Validators.required, Validators.min(1)]],
      totalInstallments: ['', [Validators.required, Validators.min(1)]],
      paidInstallments: [0, [Validators.required, Validators.min(0)]],
      categoryId: ['', Validators.required],
      note: [''],
    });

    this.payCorteForm = this.fb.group({
      accountId: ['', Validators.required],
    });

    this.abonarForm = this.fb.group({
      amountCents: ['', [Validators.required, Validators.min(0.01)]],
      accountId: ['', Validators.required],
      date: [new Date().toISOString().split('T')[0]],
      note: [''],
    });
  }

  // ============================================
  // Data loading
  // ============================================

  private loadCards() {
    this.loading = true;
    this.error = null;

    this.creditCardsService
      .getCards()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.cards = response.cards;
          this.totalBalance = response.totalBalanceFormatted;
          this.loading = false;

          // Detect if migration is needed (cards without cutoffDay set properly)
          this.needsMigration = this.cards.some((c) => !c.cutoffDay || c.cutoffDay === 0);
          if (this.needsMigration) {
            // Pre-populate migration overrides with defaults
            this.cards.forEach((c) => {
              if (!this.migrationOverrides[c._id]) {
                this.migrationOverrides[c._id] = {
                  cutoffDay: c.cutoffDay || 15,
                  paymentDueDay: c.paymentDueDay || 10,
                };
              }
            });
          }

          // Refresh selected card if it exists
          if (this.selectedCard) {
            const refreshed = this.cards.find((c) => c._id === this.selectedCard!._id);
            if (refreshed) {
              this.selectedCard = refreshed;
              // Refresh selected corte
              if (this.selectedCorte) {
                const refreshedCorte = refreshed.statementCycles.find(
                  (c) => c._id === this.selectedCorte!._id,
                );
                this.selectedCorte = refreshedCorte || null;
              }
            }
          }
        },
        error: () => {
          this.error = 'Error cargando tarjetas';
          this.loading = false;
        },
      });
  }

  private loadAccounts() {
    this.accountsService
      .getAccounts()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.accounts = response.accounts;
        },
        error: () => {},
      });
  }

  private loadCategories() {
    this.movementsService
      .getCategories('expense')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.categories = response.categories;
        },
        error: () => {},
      });
  }

  // ============================================
  // Migration Sprint 5
  // ============================================

  runMigration() {
    this.migrating = true;
    this.error = null;
    this.creditCardsService
      .migrateSpring5(this.migrationOverrides)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.migrating = false;
          this.showMigrationForm = false;
          this.success = result.message;
          this.loadCards();
        },
        error: (err) => {
          this.error = err.error?.message || 'Error en la migración';
          this.migrating = false;
        },
      });
  }

  getMigrationKeys(): string[] {
    return Object.keys(this.migrationOverrides);
  }

  getCardName(cardId: string): string {
    return this.cards.find((c) => c._id === cardId)?.alias || cardId;
  }

  // ============================================
  // Card selection
  // ============================================

  selectCard(card: CreditCard) {
    this.selectedCard = card;
    this.selectedCorte = null;
    this.error = null;
    this.success = null;
  }

  selectCorte(corte: CreditCardCorte) {
    this.selectedCorte = corte;
    this.error = null;
    this.success = null;
  }

  // ============================================
  // Dialog open/close
  // ============================================

  openAddCardDialog() {
    this.showAddCardDialog = true;
    this.error = null;
  }

  closeAddCardDialog() {
    this.showAddCardDialog = false;
    this.cardForm.reset({ cutoffDay: 15, paymentDueDay: 10 });
  }

  openAddChargeDialog() {
    if (!this.selectedCard || !this.selectedCorte) return;
    if (this.selectedCorte.status !== 'open') {
      this.error = 'Solo se pueden agregar cargos a un corte abierto';
      return;
    }
    this.showAddChargeDialog = true;
    this.error = null;
  }

  closeAddChargeDialog() {
    this.showAddChargeDialog = false;
    this.chargeForm.reset({ date: new Date().toISOString().split('T')[0] });
  }

  openPaymentDialog() {
    if (!this.selectedCard || !this.selectedCorte) return;
    if (this.selectedCorte.status === 'paid') {
      this.error = 'Este corte ya está pagado';
      return;
    }
    this.showPaymentDialog = true;
    this.error = null;
  }

  closePaymentDialog() {
    this.showPaymentDialog = false;
    this.paymentForm.reset({ date: new Date().toISOString().split('T')[0] });
  }

  openExtraFinanciamientoDialog() {
    if (!this.selectedCard) return;
    this.showExtraFinanciamientoDialog = true;
    this.error = null;
  }

  closeExtraFinanciamientoDialog() {
    this.showExtraFinanciamientoDialog = false;
    this.efForm.reset();
  }

  openPayCorteDialog() {
    if (!this.selectedCard || !this.selectedCorte) return;
    if (this.selectedCorte.status === 'paid') {
      this.error = 'Este corte ya está pagado';
      return;
    }
    if (this.selectedCorte.balanceCents <= 0) {
      this.error = 'No hay saldo a pagar en este corte';
      return;
    }
    this.showPayCorteDialog = true;
    this.error = null;
  }

  closePayCorteDialog() {
    this.showPayCorteDialog = false;
    this.payCorteForm.reset();
  }

  openAbonarDialog() {
    if (!this.selectedCard || !this.selectedCorte) return;
    if (this.selectedCorte.status !== 'closed_unpaid') {
      this.error = 'Solo se pueden registrar abonos en cortes cerrados pendientes de pago';
      return;
    }
    this.showAbonarDialog = true;
    this.error = null;
    this.abonarForm.reset({ date: new Date().toISOString().split('T')[0], note: '' });
  }

  closeAbonarDialog() {
    this.showAbonarDialog = false;
    this.abonarForm.reset();
  }

  // ============================================
  // CRUD Operations
  // ============================================

  createCard() {
    if (!this.cardForm.valid) {
      this.error = 'Por favor completa todos los campos requeridos';
      return;
    }

    this.loading = true;
    const formData = { ...this.cardForm.value };
    formData.creditLimitCents = this.creditCardsService.toCents(formData.creditLimitCents);

    this.creditCardsService
      .createCard(formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.closeAddCardDialog();
          this.loadCards();
        },
        error: (err) => {
          this.error = err.error?.message || 'Error creando tarjeta';
          this.loading = false;
        },
      });
  }

  addCharge() {
    if (!this.selectedCard || !this.selectedCorte) return;
    if (!this.chargeForm.valid) {
      this.error = 'Por favor completa los datos requeridos';
      return;
    }

    this.loading = true;
    const formData = { ...this.chargeForm.value };
    formData.amountCents = this.creditCardsService.toCents(formData.amountCents);

    this.creditCardsService
      .recordCharge(this.selectedCard._id, this.selectedCorte._id, formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedCard) => {
          this.selectedCard = updatedCard;
          this.selectedCorte =
            updatedCard.statementCycles.find((c) => c._id === this.selectedCorte!._id) || null;
          this.closeAddChargeDialog();
          this.loadCards();
        },
        error: (err) => {
          this.error = err.error?.message || 'Error registrando cargo';
          this.loading = false;
        },
      });
  }

  recordPayment() {
    if (!this.selectedCard || !this.selectedCorte) return;
    if (!this.paymentForm.valid) {
      this.error = 'Por favor completa los datos requeridos';
      return;
    }

    this.loading = true;
    const formData = { ...this.paymentForm.value };
    formData.amountCents = this.creditCardsService.toCents(formData.amountCents);

    this.creditCardsService
      .recordPayment(this.selectedCard._id, this.selectedCorte._id, formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedCard) => {
          this.selectedCard = updatedCard;
          this.selectedCorte =
            updatedCard.statementCycles.find((c) => c._id === this.selectedCorte!._id) || null;
          this.closePaymentDialog();
          this.loadCards();
        },
        error: (err) => {
          this.error = err.error?.message || 'Error registrando pago';
          this.loading = false;
        },
      });
  }

  deleteCharge(chargeId: string) {
    if (!this.selectedCard || !this.selectedCorte) return;
    if (!confirm('¿Estás seguro de que deseas eliminar este cargo?')) return;

    this.loading = true;
    this.creditCardsService
      .deleteCharge(this.selectedCard._id, this.selectedCorte._id, chargeId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedCard) => {
          this.selectedCard = updatedCard;
          this.selectedCorte =
            updatedCard.statementCycles.find((c) => c._id === this.selectedCorte!._id) || null;
          this.loadCards();
        },
        error: (err) => {
          this.error = err.error?.message || 'Error eliminando cargo';
          this.loading = false;
        },
      });
  }

  deleteCard() {
    if (!this.selectedCard) return;

    const hasBalance = this.selectedCard.totalBalanceCents > 0;
    let confirmMsg = `¿Eliminar la tarjeta "${this.selectedCard.alias}"?`;
    if (hasBalance) {
      confirmMsg += `\n\n⚠️ Esta tarjeta tiene un saldo de ${this.formatCurrency(this.selectedCard.totalBalanceCents)}`;
    }

    if (!confirm(confirmMsg)) return;

    this.loading = true;
    this.creditCardsService
      .deleteCard(this.selectedCard._id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.selectedCard = null;
          this.selectedCorte = null;
          this.loadCards();
        },
        error: (err) => {
          this.error = err.error?.message || 'Error al eliminar la tarjeta';
          this.loading = false;
        },
      });
  }

  // ============================================
  // Corte lifecycle
  // ============================================

  closeCorte() {
    if (!this.selectedCard) return;
    const openCorte = this.selectedCard.statementCycles.find((c) => c.status === 'open');
    if (!openCorte) {
      this.error = 'No hay corte abierto';
      return;
    }

    if (
      !confirm(
        `¿Cerrar el Corte #${openCorte.cycleNumber}?\n\nSe creará automáticamente el siguiente corte y se aplicarán las cuotas de extrafinanciamientos pendientes.`,
      )
    )
      return;

    this.loading = true;
    this.creditCardsService
      .closeCorte(this.selectedCard._id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedCard) => {
          this.selectedCard = updatedCard;
          this.selectedCorte = null;
          this.success = 'Corte cerrado correctamente. Se creó el siguiente corte.';
          this.loadCards();
        },
        error: (err) => {
          this.error = err.error?.message || 'Error cerrando corte';
          this.loading = false;
        },
      });
  }

  repairInstallments() {
    if (!this.selectedCard) return;
    if (!confirm('¿Corregir las cuotas del corte abierto?\n\nEsto eliminará y re-aplicará los cargos de extrafinanciamientos con los números de cuota correctos.')) return;

    this.loading = true;
    this.creditCardsService
      .repairInstallments(this.selectedCard._id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedCard) => {
          this.selectedCard = updatedCard;
          if (this.selectedCorte) {
            this.selectedCorte =
              updatedCard.statementCycles.find((c) => c._id === this.selectedCorte!._id) || null;
          }
          this.success = '✅ Cuotas corregidas correctamente.';
          this.loading = false;
          this.loadCards();
        },
        error: (err) => {
          this.error = err.error?.message || 'Error al corregir cuotas';
          this.loading = false;
        },
      });
  }

  payCorte() {
    if (!this.selectedCard || !this.selectedCorte) return;
    if (!this.payCorteForm.valid) {
      this.error = 'Selecciona una cuenta';
      return;
    }

    const accountId = this.payCorteForm.value.accountId;
    const account = this.accounts.find((a) => a._id === accountId);
    const balance = this.selectedCorte.balanceCents;

    if (!confirm(
      `¿Pagar el Corte #${this.selectedCorte.cycleNumber} por ${this.formatCurrency(balance)}` +
      `${account ? ` desde "${account.alias}"` : ''}?\n\n` +
      `Se generarán movimientos de gasto por categoría.`,
    ))
      return;

    this.loading = true;
    this.creditCardsService
      .payCorte(this.selectedCard._id, this.selectedCorte._id, accountId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedCard) => {
          this.selectedCard = updatedCard;
          this.selectedCorte =
            updatedCard.statementCycles.find((c) => c._id === this.selectedCorte!._id) || null;
          this.closePayCorteDialog();
          this.success = `Corte pagado correctamente. Se generaron los movimientos de gasto.`;
          this.loadCards();
        },
        error: (err) => {
          this.error = err.error?.message || 'Error pagando corte';
          this.loading = false;
        },
      });
  }

  // ============================================
  // Abono parcial
  // ============================================

  submitAbono() {
    if (!this.selectedCard || !this.selectedCorte) return;
    if (!this.abonarForm.valid) {
      this.error = 'Por favor completa los datos requeridos';
      return;
    }

    const formData = { ...this.abonarForm.value };
    formData.amountCents = this.creditCardsService.toCents(formData.amountCents);

    const account = this.accounts.find((a) => a._id === formData.accountId);
    const balancePendiente = this.selectedCorte.balanceCents;

    if (formData.amountCents > balancePendiente) {
      this.error = `El abono supera el saldo pendiente del corte (${this.formatCurrency(balancePendiente)})`;
      return;
    }

    if (!confirm(
      `¿Registrar abono de ${this.formatCurrency(formData.amountCents)} al Corte #${this.selectedCorte.cycleNumber}` +
      `${account ? ` desde "${account.alias}"` : ''}?\n\n` +
      `Saldo pendiente después del abono: ${this.formatCurrency(balancePendiente - formData.amountCents)}`
    )) return;

    this.loading = true;
    this.creditCardsService
      .abonarCorte(this.selectedCard._id, this.selectedCorte._id, formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedCard) => {
          this.selectedCard = updatedCard;
          this.selectedCorte =
            updatedCard.statementCycles.find((c) => c._id === this.selectedCorte!._id) || null;
          this.closeAbonarDialog();
          this.success = `Abono registrado. Saldo pendiente: ${this.formatCurrency(this.selectedCorte?.balanceCents ?? 0)}`;
          this.loadCards();
        },
        error: (err) => {
          this.error = err.error?.message || 'Error registrando abono';
          this.loading = false;
        },
      });
  }

  // ============================================
  // ExtraFinanciamientos
  // ============================================

  createExtraFinanciamiento() {
    if (!this.selectedCard) return;
    if (!this.efForm.valid) {
      this.error = 'Por favor completa todos los campos requeridos';
      return;
    }

    this.loading = true;
    const formData = { ...this.efForm.value };
    formData.totalAmountCents = this.creditCardsService.toCents(formData.totalAmountCents);

    this.creditCardsService
      .createExtraFinanciamiento(this.selectedCard._id, formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedCard) => {
          this.selectedCard = updatedCard;
          if (this.selectedCorte) {
            this.selectedCorte =
              updatedCard.statementCycles.find((c) => c._id === this.selectedCorte!._id) || null;
          }
          this.closeExtraFinanciamientoDialog();
          this.success = 'Extrafinanciamiento creado. La primera cuota se aplicó al corte abierto.';
          this.loadCards();
        },
        error: (err) => {
          this.error = err.error?.message || 'Error creando extrafinanciamiento';
          this.loading = false;
        },
      });
  }

  // ============================================
  // Computed helpers for EF preview
  // ============================================

  get efMonthlyPreview(): string {
    const total = parseFloat(this.efForm.value.totalAmountCents || 0);
    const installments = parseInt(this.efForm.value.totalInstallments || 0, 10);
    if (total > 0 && installments > 0) {
      return this.formatCurrency(this.creditCardsService.toCents(total / installments));
    }
    return '—';
  }

  get efNextInstallmentNumber(): number {
    const paid = parseInt(this.efForm.value.paidInstallments || 0, 10);
    return paid + 1;
  }

  get efRemainingInstallments(): number {
    const total = parseInt(this.efForm.value.totalInstallments || 0, 10);
    const paid = parseInt(this.efForm.value.paidInstallments || 0, 10);
    return Math.max(0, total - paid);
  }

  get efRemainingAmount(): string {
    const total = parseFloat(this.efForm.value.totalAmountCents || 0);
    const totalInst = parseInt(this.efForm.value.totalInstallments || 0, 10);
    const paid = parseInt(this.efForm.value.paidInstallments || 0, 10);
    if (total > 0 && totalInst > 0) {
      const remaining = (total / totalInst) * Math.max(0, totalInst - paid);
      return this.formatCurrency(this.creditCardsService.toCents(remaining));
    }
    return '—';
  }

  // ============================================
  // Corte helpers
  // ============================================

  getOpenCorte(): CreditCardCorte | undefined {
    return this.selectedCard?.statementCycles.find((c) => c.status === 'open');
  }

  getSortedCortes(): CreditCardCorte[] {
    if (!this.selectedCard) return [];
    return [...this.selectedCard.statementCycles].sort(
      (a, b) => b.cycleNumber - a.cycleNumber,
    );
  }

  getActiveEFs(): ExtraFinanciamiento[] {
    return this.selectedCard?.extraFinancings?.filter((e) => e.status === 'active') || [];
  }

  getAllEFs(): ExtraFinanciamiento[] {
    return this.selectedCard?.extraFinancings || [];
  }

  /**
   * Cuotas "facturadas": pagadas + las que están en cortes closed_unpaid (pendientes de pago).
   * Para Cremallera: paidInstallments(8) + 1 cargo en Corte#1 closed_unpaid = 9.
   * Esto refleja el avance real visible para el usuario (cuota a la que llegamos).
   */
  getEFBilledInstallments(ef: ExtraFinanciamiento): number {
    if (!this.selectedCard) return ef.paidInstallments;
    const efId = ef._id;
    const closedUnpaidCount = this.selectedCard.statementCycles
      .filter((c) => c.status === 'closed_unpaid')
      .reduce(
        (count, c) =>
          count + c.charges.filter((ch) => ch.extraFinancingId === efId).length,
        0,
      );
    return ef.paidInstallments + closedUnpaidCount;
  }

  getEFProgress(ef: ExtraFinanciamiento): number {
    if (ef.totalInstallments === 0) return 0;
    if (ef.status === 'completed') return 100;
    const billed = this.getEFBilledInstallments(ef);
    return Math.round((billed / ef.totalInstallments) * 100);
  }

  getEFRemaining(ef: ExtraFinanciamiento): number {
    return ef.totalInstallments - ef.paidInstallments;
  }

  getCategoryName(categoryId: any): string {
    if (!categoryId) return 'Sin categoría';
    if (typeof categoryId === 'object' && categoryId.name) return categoryId.name;
    const cat = this.categories.find((c) => c._id === categoryId?.toString());
    return cat?.name || 'Sin categoría';
  }

  // ============================================
  // Formatting helpers
  // ============================================

  formatCurrency(cents: number): string {
    return this.creditCardsService.formatCurrency(cents);
  }

  getStatusLabel(status: string): string {
    return this.creditCardsService.getStatusLabel(status);
  }

  getStatusColor(status: string): string {
    return this.creditCardsService.getStatusColor(status);
  }

  getStatusBadge(status: string): string {
    return this.creditCardsService.getStatusBadge(status);
  }

  formatDate(date: Date | string | undefined): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('es-GT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }
}
