import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

/**
 * Plan Debt Result for one method
 */
export interface PlanResult {
  method: 'snowball' | 'avalanche' | 'manual';
  methodLabel: string;
  debts: PlanDebt[];
  totalDebtCents: number;
  totalDebtFormatted: string;
  totalInterestCents: number;
  totalInterestFormatted: string;
  totalPaidCents: number;
  totalPaidFormatted: string;
  totalMonths: number;
  totalYears: number;
  remainingMonths: number;
  timeFormatted: string;
}

export interface PlanDebt {
  order: number;
  debtId: string;
  alias: string;
  creditorName: string;
  source: 'debt' | 'credit_card';   // NEW
  debtType: string;                  // NEW
  monthlyPaymentCents: number;       // NEW
  monthlyPaymentFormatted: string;   // NEW
  originalAmountCents: number;
  originalAmountFormatted: string;
  payoffMonth: number;
  monthsToPayoff: number;
  interestRate: number;
  totalInterestCents: number;
  totalInterestFormatted: string;
}

export interface PlanRecommendation {
  method: string;
  reason: string;
  savingsCents: number;
  savingsFormatted: string;
}

export interface PlanSummary {                // NEW
  totalLoanDebtCents: number;
  totalLoanDebtFormatted: string;
  totalCardDebtCents: number;
  totalCardDebtFormatted: string;
  grandTotalCents: number;
  grandTotalFormatted: string;
  loanCount: number;
  cardCount: number;
}

export interface DebtPlanComparison {
  snowball: PlanResult;
  avalanche: PlanResult;
  manual: PlanResult;
  recommendation: PlanRecommendation;
  extraPaymentCents: number;
  extraPaymentFormatted: string;
  summary: PlanSummary;              // NEW
}

@Injectable({
  providedIn: 'root',
})
export class DebtPlanService {
  constructor(private apiService: ApiService) {}

  /**
   * Calcular comparación de los 3 métodos
   */
  calculate(extraPaymentCents: number, manualOrder?: string[]): Observable<DebtPlanComparison> {
    return this.apiService.post<DebtPlanComparison>('debt-plans/calculate', {
      extraPaymentCents,
      manualOrder: manualOrder || [],
    });
  }

  formatCurrency(cents: number): string {
    return `Q${(cents / 100).toFixed(2)}`;
  }

  toCents(amount: number): number {
    return Math.round(amount * 100);
  }
}
