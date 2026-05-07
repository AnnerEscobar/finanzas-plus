import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

/**
 * Debt Payment Interface
 */
export interface DebtPayment {
  _id: string;
  amountCents: number;
  date: Date;
  accountId?: string;
  principalCents?: number;
  interestCents?: number;
  note?: string;
  createdAt?: Date;
}

/**
 * Debt Interface
 */
export interface Debt {
  _id: string;
  userId: string;
  alias: string;
  creditorName: string;
  debtType: 'loan' | 'advance' | 'cooperative' | 'personal' | 'other';
  originalAmountCents: number;
  remainingCents: number;
  interestRate: number;
  monthlyPaymentCents: number;
  totalInstallments: number;
  paidInstallments: number;
  startDate: Date;
  dueDate?: Date;
  payments: DebtPayment[];
  status: 'active' | 'paid' | 'defaulted' | 'cancelled';
  note?: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Debt Summary Interface
 */
export interface DebtSummary {
  count: number;
  totalOriginalCents: number;
  totalRemainingCents: number;
  totalPaidCents: number;
  totalMonthlyPaymentCents: number;
  totalOriginalFormatted: string;
  totalRemainingFormatted: string;
  totalPaidFormatted: string;
  totalMonthlyPaymentFormatted: string;
  progressPercentage: number;
}

@Injectable({
  providedIn: 'root',
})
export class DebtsService {
  constructor(private apiService: ApiService) {}

  /**
   * Create a new debt
   */
  createDebt(data: any): Observable<Debt> {
    return this.apiService.post<Debt>('debts', data);
  }

  /**
   * Get all debts with summary
   */
  getDebts(): Observable<{ debts: Debt[]; summary: DebtSummary }> {
    return this.apiService.get('debts');
  }

  /**
   * Get summary only
   */
  getSummary(): Observable<DebtSummary> {
    return this.apiService.get('debts/summary');
  }

  /**
   * Get total debt amount
   */
  getTotalDebt(): Observable<{ totalCents: number; totalFormatted: string }> {
    return this.apiService.get('debts/balance/total');
  }

  /**
   * Get a specific debt
   */
  getDebt(id: string): Observable<Debt> {
    return this.apiService.get<Debt>(`debts/${id}`);
  }

  /**
   * Update debt details
   */
  updateDebt(id: string, data: any): Observable<Debt> {
    return this.apiService.put<Debt>(`debts/${id}`, data);
  }

  /**
   * Soft delete debt
   */
  deleteDebt(id: string): Observable<Debt> {
    return this.apiService.delete<Debt>(`debts/${id}`);
  }

  /**
   * Record a payment
   */
  recordPayment(id: string, data: any): Observable<Debt> {
    return this.apiService.post<Debt>(`debts/${id}/payments`, data);
  }

  /**
   * Get all payments for a debt
   */
  getPayments(
    id: string,
  ): Observable<{ payments: DebtPayment[]; count: number; total: number; totalFormatted: string }> {
    return this.apiService.get(`debts/${id}/payments`);
  }

  /**
   * Delete a payment
   */
  deletePayment(id: string, paymentId: string): Observable<Debt> {
    return this.apiService.delete<Debt>(`debts/${id}/payments/${paymentId}`);
  }

  // ============================================
  // Utility Methods
  // ============================================

  formatCurrency(cents: number): string {
    return `Q${(cents / 100).toFixed(2)}`;
  }

  toCents(amount: number): number {
    return Math.round(amount * 100);
  }

  getDebtTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      loan: 'Préstamo',
      advance: 'Adelanto',
      cooperative: 'Cooperativa',
      personal: 'Personal',
      other: 'Otro',
    };
    return labels[type] || type;
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      active: 'Activa',
      paid: 'Pagada',
      defaulted: 'En mora',
      cancelled: 'Cancelada',
    };
    return labels[status] || status;
  }

  getStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      active: 'bg-blue-100 text-blue-800',
      paid: 'bg-green-100 text-green-800',
      defaulted: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  }

  /**
   * Calculate progress percentage for a debt
   */
  calculateProgress(debt: Debt): number {
    if (debt.originalAmountCents === 0) return 0;
    const paid = debt.originalAmountCents - debt.remainingCents;
    return Math.round((paid / debt.originalAmountCents) * 100);
  }
}
