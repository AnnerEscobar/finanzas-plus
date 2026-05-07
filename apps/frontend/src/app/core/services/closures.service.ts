import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface AccountSnapshot {
  accountId: string;
  alias: string;
  balanceCents: number;
}

export interface CreditCardSnapshot {
  cardId: string;
  alias: string;
  totalBalanceCents: number;
  availableCreditCents: number;
}

export interface DebtSnapshot {
  debtId: string;
  alias: string;
  remainingCents: number;
  monthlyPaymentCents: number;
}

export interface FundSnapshot {
  fundId: string;
  alias: string;
  currentAmountCents: number;
  targetAmountCents: number;
}

export interface ClosureSummary {
  totalAssetsCents: number;
  totalDebtCents: number;
  totalCreditCardDebtCents: number;
  totalFundsCents: number;
  netWorthCents: number;
}

export interface Closure {
  _id: string;
  userId: string;
  month: string;
  generatedAt: Date;
  closedAt?: Date;
  status: 'open' | 'closed';
  isEditable: boolean;
  accountSnapshots: AccountSnapshot[];
  creditCardSnapshots: CreditCardSnapshot[];
  debtSnapshots: DebtSnapshot[];
  fundSnapshots: FundSnapshot[];
  summary: ClosureSummary;
  note?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface EvolutionPoint {
  month: string;
  totalAssetsCents: number;
  totalDebtCents: number;
  totalCreditCardDebtCents: number;
  totalFundsCents: number;
  netWorthCents: number;
}

@Injectable({
  providedIn: 'root',
})
export class ClosuresService {
  constructor(private apiService: ApiService) {}

  listClosures(): Observable<{ closures: Closure[]; count: number }> {
    return this.apiService.get('closures');
  }

  getEvolution(): Observable<EvolutionPoint[]> {
    return this.apiService.get('closures/evolution');
  }

  generateClosure(month: string): Observable<Closure> {
    return this.apiService.post<Closure>('closures/generate', { month });
  }

  getClosureByMonth(month: string): Observable<Closure> {
    return this.apiService.get<Closure>(`closures/month/${month}`);
  }

  getClosure(id: string): Observable<Closure> {
    return this.apiService.get<Closure>(`closures/${id}`);
  }

  updateClosure(id: string, data: any): Observable<Closure> {
    return this.apiService.put<Closure>(`closures/${id}`, data);
  }

  closeMonth(id: string): Observable<Closure> {
    return this.apiService.post<Closure>(`closures/${id}/close`, {});
  }

  reopenMonth(id: string): Observable<Closure> {
    return this.apiService.post<Closure>(`closures/${id}/reopen`, {});
  }

  deleteClosure(id: string): Observable<any> {
    return this.apiService.delete(`closures/${id}`);
  }

  // ============================================
  // Helpers
  // ============================================

  formatCurrency(cents: number): string {
    return `Q${(cents / 100).toFixed(2)}`;
  }

  /**
   * Format YYYY-MM to readable Spanish (e.g., "Mayo 2026")
   */
  formatMonth(month: string): string {
    const [year, monthNum] = month.split('-');
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
    ];
    const idx = parseInt(monthNum, 10) - 1;
    return `${monthNames[idx]} ${year}`;
  }

  /**
   * Get current month in YYYY-MM
   */
  getCurrentMonth(): string {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${now.getFullYear()}-${month}`;
  }

  /**
   * Get previous month
   */
  getPreviousMonth(month: string): string {
    const [yearStr, monthStr] = month.split('-');
    let year = parseInt(yearStr, 10);
    let m = parseInt(monthStr, 10) - 1;
    if (m === 0) {
      m = 12;
      year -= 1;
    }
    return `${year}-${String(m).padStart(2, '0')}`;
  }
}
