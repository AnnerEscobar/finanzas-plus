import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

// ============================================
// Interfaces
// ============================================

export interface CardCharge {
  _id: string;
  description: string;
  amountCents: number;
  date: Date;
  categoryId?: any;
  extraFinancingId?: string;
  installmentNumber?: number;
  totalInstallments?: number;
  note?: string;
  createdAt?: Date;
}

export interface CardPayment {
  _id: string;
  amountCents: number;
  date: Date;
  accountId?: string;
  note?: string;
  createdAt?: Date;
}

export interface CreditCardCorte {
  _id: string;
  cycleNumber: number;
  openingDate: Date;
  closingDate: Date;
  paymentDueDate: Date;
  cutoffDay: number;
  charges: CardCharge[];
  payments: CardPayment[];
  chargesTotal: number;
  paymentsTotal: number;
  balanceCents: number;
  interestCents: number;
  status: 'open' | 'closed_unpaid' | 'paid';
  isClosed: boolean;
  closedAt?: Date;
  paidAt?: Date;
  paidFromAccountId?: string;
}

export interface ExtraFinanciamiento {
  _id: string;
  description: string;
  totalAmountCents: number;
  totalInstallments: number;
  paidInstallments: number;
  monthlyAmountCents: number;
  startDate: Date;
  categoryId?: any;
  status: 'active' | 'completed';
  note?: string;
  createdAt?: Date;
}

export interface CreditCard {
  _id: string;
  userId: string;
  alias: string;
  cardType: 'credit';
  issuer: string;
  maskedNumber: string;
  holderName: string;
  creditLimitCents: number;
  cutoffDay: number;
  paymentDueDay: number;
  statementCycles: CreditCardCorte[];
  extraFinancings: ExtraFinanciamiento[];
  totalBalanceCents: number;
  availableCreditCents: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable({
  providedIn: 'root',
})
export class CreditCardsService {
  constructor(private apiService: ApiService) {}

  // ============================================
  // Card CRUD Operations
  // ============================================

  createCard(data: any): Observable<CreditCard> {
    return this.apiService.post<CreditCard>('credit-cards', data);
  }

  getCards(): Observable<{ cards: CreditCard[]; totalBalance: number; totalBalanceFormatted: string }> {
    return this.apiService.get('credit-cards');
  }

  getCard(id: string): Observable<CreditCard> {
    return this.apiService.get<CreditCard>(`credit-cards/${id}`);
  }

  getCardSummary(id: string): Observable<any> {
    return this.apiService.get(`credit-cards/${id}/summary`);
  }

  getTotalBalance(): Observable<{ totalCents: number; totalFormatted: string }> {
    return this.apiService.get('credit-cards/balance/total');
  }

  updateCard(id: string, data: any): Observable<CreditCard> {
    return this.apiService.put<CreditCard>(`credit-cards/${id}`, data);
  }

  deleteCard(id: string): Observable<CreditCard> {
    return this.apiService.delete<CreditCard>(`credit-cards/${id}`);
  }

  // ============================================
  // Statement Cycles (Cortes) Operations
  // ============================================

  getCortes(cardId: string): Observable<{ cortes: CreditCardCorte[]; count: number }> {
    return this.apiService.get(`credit-cards/${cardId}/cortes`);
  }

  getCorte(cardId: string, corteId: string): Observable<CreditCardCorte> {
    return this.apiService.get<CreditCardCorte>(`credit-cards/${cardId}/cortes/${corteId}`);
  }

  getStatementDetail(cardId: string, corteId: string): Observable<any> {
    return this.apiService.get(`credit-cards/${cardId}/cortes/${corteId}/statement`);
  }

  /** Close the current open corte and create the next one */
  closeCorte(cardId: string): Observable<CreditCard> {
    return this.apiService.post<CreditCard>(`credit-cards/${cardId}/cortes/close`, {});
  }

  /** Pay a corte in full from an account (generates expense movements per category) */
  payCorte(cardId: string, corteId: string, accountId: string): Observable<CreditCard> {
    return this.apiService.post<CreditCard>(`credit-cards/${cardId}/cortes/${corteId}/pay`, { accountId });
  }

  /** Registrar abono parcial al corte (descuenta cuenta, no genera gastos aún) */
  abonarCorte(cardId: string, corteId: string, data: { accountId: string; amountCents: number; date?: string; note?: string }): Observable<CreditCard> {
    return this.apiService.post<CreditCard>(`credit-cards/${cardId}/cortes/${corteId}/abonar`, data);
  }

  // ============================================
  // Charges Operations
  // ============================================

  recordCharge(cardId: string, corteId: string, data: any): Observable<CreditCard> {
    return this.apiService.post<CreditCard>(`credit-cards/${cardId}/cortes/${corteId}/charges`, data);
  }

  getCharges(
    cardId: string,
    corteId: string,
  ): Observable<{ charges: CardCharge[]; count: number; total: number; totalFormatted: string }> {
    return this.apiService.get(`credit-cards/${cardId}/cortes/${corteId}/charges`);
  }

  deleteCharge(cardId: string, corteId: string, chargeId: string): Observable<CreditCard> {
    return this.apiService.delete<CreditCard>(`credit-cards/${cardId}/cortes/${corteId}/charges/${chargeId}`);
  }

  // ============================================
  // Payments Operations (parcial / legacy)
  // ============================================

  recordPayment(cardId: string, corteId: string, data: any): Observable<CreditCard> {
    return this.apiService.post<CreditCard>(`credit-cards/${cardId}/cortes/${corteId}/payments`, data);
  }

  getPayments(
    cardId: string,
    corteId: string,
  ): Observable<{ payments: CardPayment[]; count: number; total: number; totalFormatted: string }> {
    return this.apiService.get(`credit-cards/${cardId}/cortes/${corteId}/payments`);
  }

  // ============================================
  // ExtraFinanciamientos Operations (Sprint 5)
  // ============================================

  getExtraFinancings(cardId: string): Observable<{ extraFinancings: ExtraFinanciamiento[]; count: number }> {
    return this.apiService.get(`credit-cards/${cardId}/extra-financings`);
  }

  createExtraFinanciamiento(cardId: string, data: any): Observable<CreditCard> {
    return this.apiService.post<CreditCard>(`credit-cards/${cardId}/extra-financings`, data);
  }

  cancelExtraFinanciamiento(cardId: string, efId: string): Observable<CreditCard> {
    return this.apiService.put<CreditCard>(`credit-cards/${cardId}/extra-financings/${efId}/cancel`, {});
  }

  /**
   * One-shot Sprint 5 migration — patches existing cards without cutoffDay/paymentDueDay
   * @param cardOverrides optional map { cardId: { cutoffDay, paymentDueDay } }
   */
  migrateSpring5(cardOverrides?: Record<string, { cutoffDay: number; paymentDueDay: number }>): Observable<any> {
    return this.apiService.post('credit-cards/migrate-sprint5', { cards: cardOverrides });
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

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      open: 'Abierto',
      closed_unpaid: 'Cerrado - Pendiente de Pago',
      paid: 'Pagado',
    };
    return labels[status] || status;
  }

  getStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      open: 'text-green-600',
      closed_unpaid: 'text-yellow-600',
      paid: 'text-gray-500',
    };
    return colors[status] || 'text-gray-500';
  }

  getStatusBadge(status: string): string {
    const badges: { [key: string]: string } = {
      open: 'bg-green-100 text-green-800',
      closed_unpaid: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-gray-100 text-gray-600',
    };
    return badges[status] || 'bg-gray-100 text-gray-600';
  }
}
