import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CreditCardsService, CreditCard, CreditCardCorte } from '../../core/services/creditCards.service';
import { AccountsService } from '../../core/services/accounts.service';

@Component({
  selector: 'app-credit-cards',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './creditCards.component.html',
  styleUrls: ['./creditCards.component.css'],
})
export class CreditCardsComponent implements OnInit, OnDestroy {
  // State
  cards: CreditCard[] = [];
  selectedCard: CreditCard | null = null;
  selectedCorte: CreditCardCorte | null = null;
  totalBalance: string = 'Q0.00';

  // Loading/Error
  loading = false;
  error: string | null = null;

  // Dialogs
  showAddCardDialog = false;
  showAddChargeDialog = false;
  showPaymentDialog = false;

  // Forms
  cardForm!: FormGroup;
  chargeForm!: FormGroup;
  paymentForm!: FormGroup;

  // RxJS
  private destroy$ = new Subject<void>();
  accounts: any[] = [];

  constructor(
    private creditCardsService: CreditCardsService,
    private accountsService: AccountsService,
    private fb: FormBuilder,
  ) {
    this.initializeForms();
  }

  ngOnInit() {
    this.loadCards();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Initialize forms with validation
   */
  private initializeForms() {
    this.cardForm = this.fb.group({
      alias: ['', Validators.required],
      cardType: ['credit'],
      issuer: ['', Validators.required],
      maskedNumber: ['', Validators.required],
      holderName: ['', Validators.required],
      creditLimitCents: ['', [Validators.required, Validators.min(1000)]],
    });

    this.chargeForm = this.fb.group({
      description: ['', Validators.required],
      amountCents: ['', [Validators.required, Validators.min(1)]],
      date: [new Date().toISOString().split('T')[0]],
      note: [''],
    });

    this.paymentForm = this.fb.group({
      amountCents: ['', [Validators.required, Validators.min(1)]],
      date: [new Date().toISOString().split('T')[0]],
      accountId: ['', Validators.required],
      note: [''],
    });
  }

  /**
   * Load all cards
   */
  private loadCards() {
    this.loading = true;
    this.error = null;

    // Load cards
    this.creditCardsService
      .getCards()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.cards = response.cards;
          this.totalBalance = response.totalBalanceFormatted;
          this.loading = false;
        },
        error: (err) => {
          this.error = 'Error cargando tarjetas';
          this.loading = false;
        },
      });

    // Load accounts for payment dropdown
    this.accountsService
      .getAccounts()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.accounts = response.accounts;
        },
        error: () => {
          // Silent fail for accounts
        },
      });
  }

  /**
   * Open/close dialogs
   */
  openAddCardDialog() {
    this.showAddCardDialog = true;
    this.error = null;
  }

  closeAddCardDialog() {
    this.showAddCardDialog = false;
    this.cardForm.reset();
  }

  openAddChargeDialog() {
    if (!this.selectedCard || !this.selectedCorte) return;
    if (this.selectedCorte.status !== 'open') {
      this.error = 'No se pueden agregar cargos a un corte cerrado';
      return;
    }
    this.showAddChargeDialog = true;
    this.error = null;
  }

  closeAddChargeDialog() {
    this.showAddChargeDialog = false;
    this.chargeForm.reset();
  }

  openPaymentDialog() {
    if (!this.selectedCard || !this.selectedCorte) return;
    if (this.selectedCorte.status !== 'open') {
      this.error = 'No se pueden agregar pagos a un corte cerrado';
      return;
    }
    this.showPaymentDialog = true;
    this.error = null;
  }

  closePaymentDialog() {
    this.showPaymentDialog = false;
    this.paymentForm.reset();
  }

  /**
   * Create a new credit card
   */
  createCard() {
    if (!this.cardForm.valid) {
      this.error = 'Por favor completa todos los campos requeridos';
      return;
    }

    this.loading = true;
    const formData = this.cardForm.value;

    // Convert credit limit from Q to cents if needed
    if (formData.creditLimitCents < 1000) {
      formData.creditLimitCents = this.creditCardsService.toCents(formData.creditLimitCents);
    }

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

  /**
   * Select a card
   */
  selectCard(card: CreditCard) {
    this.selectedCard = card;
    this.selectedCorte = null;
    this.error = null;
  }

  /**
   * Select a corte
   */
  selectCorte(corte: CreditCardCorte) {
    this.selectedCorte = corte;
    this.error = null;
  }

  /**
   * Add a charge
   */
  addCharge() {
    if (!this.selectedCard || !this.selectedCorte) return;
    if (!this.chargeForm.valid) {
      this.error = 'Por favor completa los datos requeridos';
      return;
    }

    this.loading = true;
    const formData = this.chargeForm.value;

    // Convert amount if needed (assume it's in Q)
    if (formData.amountCents < 100) {
      formData.amountCents = this.creditCardsService.toCents(formData.amountCents);
    }

    this.creditCardsService
      .recordCharge(this.selectedCard._id, this.selectedCorte._id, formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedCard) => {
          this.selectedCard = updatedCard;
          // Update selected corte
          const corte = updatedCard.statementCycles.find((c) => c._id === this.selectedCorte!._id);
          if (corte) {
            this.selectedCorte = corte;
          }
          this.closeAddChargeDialog();
          this.loadCards();
          this.loading = false;
        },
        error: (err) => {
          this.error = err.error?.message || 'Error registrando cargo';
          this.loading = false;
        },
      });
  }

  /**
   * Record a payment
   */
  recordPayment() {
    if (!this.selectedCard || !this.selectedCorte) return;
    if (!this.paymentForm.valid) {
      this.error = 'Por favor completa los datos requeridos';
      return;
    }

    this.loading = true;
    const formData = this.paymentForm.value;

    // Convert amount if needed
    if (formData.amountCents < 100) {
      formData.amountCents = this.creditCardsService.toCents(formData.amountCents);
    }

    this.creditCardsService
      .recordPayment(this.selectedCard._id, this.selectedCorte._id, formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedCard) => {
          this.selectedCard = updatedCard;
          // Update selected corte
          const corte = updatedCard.statementCycles.find((c) => c._id === this.selectedCorte!._id);
          if (corte) {
            this.selectedCorte = corte;
          }
          this.closePaymentDialog();
          this.loadCards();
          this.loading = false;
        },
        error: (err) => {
          this.error = err.error?.message || 'Error registrando pago';
          this.loading = false;
        },
      });
  }

  /**
   * Delete a charge
   */
  deleteCharge(chargeId: string) {
    if (!this.selectedCard || !this.selectedCorte) return;
    if (!confirm('¿Estás seguro de que deseas eliminar este cargo?')) return;

    this.creditCardsService
      .deleteCharge(this.selectedCard._id, this.selectedCorte._id, chargeId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedCard) => {
          this.selectedCard = updatedCard;
          const corte = updatedCard.statementCycles.find((c) => c._id === this.selectedCorte!._id);
          if (corte) {
            this.selectedCorte = corte;
          }
        },
        error: (err) => {
          this.error = err.error?.message || 'Error eliminando cargo';
        },
      });
  }

  /**
   * Format currency
   */
  formatCurrency(cents: number): string {
    return this.creditCardsService.formatCurrency(cents);
  }

  /**
   * Get status label
   */
  getStatusLabel(status: string): string {
    return this.creditCardsService.getStatusLabel(status);
  }

  /**
   * Get status badge color
   */
  getStatusColor(status: string): string {
    return this.creditCardsService.getStatusColor(status);
  }
}
