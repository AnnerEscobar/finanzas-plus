import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { forkJoin, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  DebtPlanService,
  DebtPlanComparison,
  PlanResult,
  PlanDebt,
} from '../../core/services/debtPlan.service';
import { DebtsService, Debt } from '../../core/services/debts.service';
import { CreditCardsService, CreditCard } from '../../core/services/creditCards.service';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';

/** Fila unificada para el editor manual (puede ser deuda o tarjeta) */
interface PlanItem {
  id: string;          // debtId del plan (con prefijo cc_ para tarjetas)
  alias: string;
  creditorName: string;
  remainingCents: number;
  source: 'debt' | 'credit_card';
}

@Component({
  selector: 'app-debt-plan',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NavbarComponent],
  templateUrl: './debtPlan.component.html',
  styleUrls: ['./debtPlan.component.css'],
})
export class DebtPlanComponent implements OnInit, OnDestroy {
  // State
  debts: Debt[] = [];
  creditCards: CreditCard[] = [];
  planItems: PlanItem[] = [];   // combinado: préstamos + tarjetas con saldo
  comparison: DebtPlanComparison | null = null;
  selectedMethod: 'snowball' | 'avalanche' | 'manual' = 'snowball';

  // Form
  configForm!: FormGroup;

  // Manual order (IDs de planItems)
  manualOrder: string[] = [];

  loading = false;
  error: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private debtPlanService: DebtPlanService,
    private debtsService: DebtsService,
    private creditCardsService: CreditCardsService,
    private fb: FormBuilder,
  ) {
    this.configForm = this.fb.group({
      extraPaymentCents: [0],
    });
  }

  ngOnInit() {
    this.loadAll();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ──────────────────────────────────────────
  // Data loading
  // ──────────────────────────────────────────

  loadAll() {
    this.loading = true;
    forkJoin({
      debts: this.debtsService.getDebts(),
      cards: this.creditCardsService.getCards(),
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ debts, cards }) => {
          this.debts = debts.debts.filter(
            (d) => d.status === 'active' && d.remainingCents > 0,
          );
          this.creditCards = cards.cards.filter((c) => c.totalBalanceCents > 0);

          // Build unified planItems list
          this.planItems = [
            ...this.debts.map((d) => ({
              id: d._id,
              alias: d.alias,
              creditorName: d.creditorName,
              remainingCents: d.remainingCents,
              source: 'debt' as const,
            })),
            ...this.creditCards.map((c) => ({
              id: `cc_${c._id}`,
              alias: c.alias,
              creditorName: c.issuer,
              remainingCents: c.totalBalanceCents,
              source: 'credit_card' as const,
            })),
          ];

          this.manualOrder = this.planItems.map((p) => p.id);
          this.loading = false;

          if (this.planItems.length > 0) {
            this.calculatePlan();
          }
        },
        error: () => {
          this.error = 'Error al cargar deudas y tarjetas';
          this.loading = false;
        },
      });
  }

  // ──────────────────────────────────────────
  // Plan calculation
  // ──────────────────────────────────────────

  calculatePlan() {
    if (this.planItems.length === 0) {
      this.error = 'No hay deudas activas ni tarjetas con saldo para calcular el plan';
      return;
    }

    const extraPayment = Number(this.configForm.value.extraPaymentCents) || 0;
    const extraPaymentCents = this.debtPlanService.toCents(extraPayment);

    this.loading = true;
    this.error = null;

    this.debtPlanService
      .calculate(extraPaymentCents, this.manualOrder)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.comparison = response;
          this.loading = false;

          if (response.recommendation?.method && this.comparison) {
            this.selectedMethod = response.recommendation.method as any;
          }
        },
        error: (err) => {
          this.error = err.error?.message || 'Error al calcular el plan';
          this.loading = false;
        },
      });
  }

  selectMethod(method: 'snowball' | 'avalanche' | 'manual') {
    this.selectedMethod = method;
  }

  getSelectedPlan(): PlanResult | null {
    if (!this.comparison) return null;
    return this.comparison[this.selectedMethod];
  }

  // ──────────────────────────────────────────
  // Manual order
  // ──────────────────────────────────────────

  moveDebtUp(id: string) {
    const idx = this.manualOrder.indexOf(id);
    if (idx > 0) {
      [this.manualOrder[idx - 1], this.manualOrder[idx]] = [
        this.manualOrder[idx],
        this.manualOrder[idx - 1],
      ];
      if (this.selectedMethod === 'manual') this.calculatePlan();
    }
  }

  moveDebtDown(id: string) {
    const idx = this.manualOrder.indexOf(id);
    if (idx < this.manualOrder.length - 1) {
      [this.manualOrder[idx], this.manualOrder[idx + 1]] = [
        this.manualOrder[idx + 1],
        this.manualOrder[idx],
      ];
      if (this.selectedMethod === 'manual') this.calculatePlan();
    }
  }

  getPlanItemById(id: string): PlanItem | undefined {
    return this.planItems.find((p) => p.id === id);
  }

  // ──────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────

  isCardDebt(debt: PlanDebt): boolean {
    return debt.source === 'credit_card';
  }

  formatCurrency(cents: number): string {
    return this.debtPlanService.formatCurrency(cents);
  }

  getMethodColor(method: string): string {
    const colors: { [key: string]: string } = {
      snowball: 'bg-blue-100 text-blue-800 border-blue-300',
      avalanche: 'bg-purple-100 text-purple-800 border-purple-300',
      manual: 'bg-orange-100 text-orange-800 border-orange-300',
    };
    return colors[method] || colors['snowball'];
  }

  compareMethods(metric: 'months' | 'interest', method: 'snowball' | 'avalanche' | 'manual'): string {
    if (!this.comparison) return '';
    const values = {
      snowball: metric === 'months' ? this.comparison.snowball.totalMonths : this.comparison.snowball.totalInterestCents,
      avalanche: metric === 'months' ? this.comparison.avalanche.totalMonths : this.comparison.avalanche.totalInterestCents,
      manual: metric === 'months' ? this.comparison.manual.totalMonths : this.comparison.manual.totalInterestCents,
    };
    const min = Math.min(values.snowball, values.avalanche, values.manual);
    const max = Math.max(values.snowball, values.avalanche, values.manual);
    if (values[method] === min && min !== max) return 'text-green-600 font-bold';
    if (values[method] === max && min !== max) return 'text-red-600';
    return 'text-gray-700';
  }
}
