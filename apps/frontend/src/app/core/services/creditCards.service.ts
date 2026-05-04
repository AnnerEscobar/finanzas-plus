import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

/**
 * Credit Card Charge
 */
export interface CardCharge {
  _id: string;
  description: string;
  amountCents: number;
  date: Date;
  categoryId?: string;
  note?: string;
  createdAt?: Date;
}

/**
 * Credit Card Payment
 */
export interface CardPayment {
  _id: string;
  amountCents: number;
  date: Date;
  accountId?: string;
  note?: string;
  createdAt?: Date;
}

/**
 * Credit Card Statement Cycle (Corte)
 */
export interface CreditCardCorte {
  _id: string;
  cycleNumber: number;
  openingDate: Date;
  closingDate: Date;
  cutoffDay: number;
  charges: CardCharge[];
  payments: CardPayment[];
  chargesTotal: number;
  paymentsTotal: number;
  balanceCents: number;
  interestCents: number;
  status: 'open' | 'closing' | 'closed';
  isClosed: boolean;
}

/**
 * Credit Card Main Model
 */
export interface CreditCard {
  _id: string;
  userId: string;
  alias: string;
  cardType: 'credit';
  issuer: string;
  maskedNumber: string;
  holderName: string;
  creditLimitCents: number;
  statementCycles: CreditCardCorte[];
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

  /**
   * Create a new credit card
   */
  createCard(data: any): Observable<CreditCard> {
    return this.apiService.post<CreditCard>('credit-cards', data);
  }

  /**
   * Get all credit cards for the user
   */
  getCards(): Observable<{ cards: CreditCard[]; totalBalance: number; totalBalanceFormatted: string }> {
    return this.apiService.get('credit-cards');
  }

  /**
   * Get a specific card with all its data
   */
  getCard(id: string): Observable<CreditCard> {
    return this.apiService.get<CreditCard>(`credit-cards/${id}`);
  }

  /**
   * Get card summary (balance, available credit, etc.)
   */
  getCardSummary(id: string): Observable<any> {
    return this.apiService.get(`credit-cards/${id}/summary`);
  }

  /**
   * Get total balance across all cards
   */
  getTotalBalance(): Observable<{ totalCents: number; totalFormatted: string }> {
    return this.apiService.get('credit-cards/balance/total');
  }

  /**
   * Update card details
   */
  updateCard(id: string, data: any): Observable<CreditCard> {
    return this.apiService.put<CreditCard>(`credit-cards/${id}`, data);
  }

  /**
   * Soft delete card (deactivate)
   */
  deleteCard(id: string): Observable<CreditCard> {
    return this.apiService.delete<CreditCard>(`credit-cards/${id}`);
  }

  // ============================================
  // Statement Cycles (Cortes) Operations
  // ============================================

  /**
   * Get all statement cycles for a card
   */
  getCortes(cardId: string): Observable<{ cortes: CreditCardCorte[]; count: number }> {
    return this.apiService.get(`credit-cards/${cardId}/cortes`);
  }

  /**
   * Get a specific statement cycle
   */
  getCorte(cardId: string, corteId: string): Observable<CreditCardCorte> {
    return this.apiService.get<CreditCardCorte>(`credit-cards/${cardId}/cortes/${corteId}`);
  }

  /**
   * Get full statement detail (charges, payments, balance)
   */
  getStatementDetail(cardId: string, corteId: string): Observable<any> {
    return this.apiService.get(`credit-cards/${cardId}/cortes/${corteId}/statement`);
  }

  // ============================================
  // Charges Operations
  // ============================================

  /**
   * Record a new charge to a statement cycle
   */
  recordCharge(cardId: string, corteId: string, data: any): Observable<CreditCard> {
    return this.apiService.post<CreditCard>(`credit-cards/${cardId}/cortes/${corteId}/charges`, data);
  }

  /**
   * Get all charges for a statement cycle
   */
  getCharges(
    cardId: string,
    corteId: string,
  ): Observable<{ charges: CardCharge[]; count: number; total: number; totalFormatted: string }> {
    return this.apiService.get(`credit-cards/${cardId}/cortes/${corteId}/charges`);
  }

  /**
   * Delete a charge
   */
  deleteCharge(cardId: string, corteId: string, chargeId: string): Observable<CreditCard> {
    return this.apiService.delete<CreditCard>(`credit-cards/${cardId}/cortes/${corteId}/charges/${chargeId}`);
  }

  // ============================================
  // Payments Operations
  // ============================================

  /**
   * Record a payment against a statement cycle
   */
  recordPayment(cardId: string, corteId: string, data: any): Observable<CreditCard> {
    return this.apiService.post<CreditCard>(`credit-cards/${cardId}/cortes/${corteId}/payments`, data);
  }

  /**
   * Get all payments for a statement cycle
   */
  getPayments(
    cardId: string,
    corteId: string,
  ): Observable<{ payments: CardPayment[]; count: number; total: number; totalFormatted: string }> {
    return this.apiService.get(`credit-cards/${cardId}/cortes/${corteId}/payments`);
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Format amount from cents to Quetzal currency
   */
  formatCurrency(cents: number): string {
    return `Q${(cents / 100).toFixed(2)}`;
  }

  /**
   * Convert amount in Quetzales to cents
   */
  toCents(amount: number): number {
    return Math.round(amount * 100);
  }

  /**
   * Get status label in Spanish
   */
  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      open: 'Abierto',
      closing: 'Cerrando',
      closed: 'Cerrado',
    };
    return labels[status] || status;
  }

  /**
   * Get status badge color
   */
  getStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      open: 'bg-green-100 text-green-800',
      closing: 'bg-yellow-100 text-yellow-800',
      closed: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  }
}
