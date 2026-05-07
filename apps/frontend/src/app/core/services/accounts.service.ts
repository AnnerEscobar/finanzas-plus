import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface Account {
  _id: string;
  userId: string;
  alias: string;
  institution?: string;
  type: 'checking' | 'savings' | 'cash' | 'credit_union';
  currentBalanceCents: number;
  initialBalanceCents: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AccountSummary {
  count: number;
  totalBalanceCents: number;
  totalBalanceFormatted: string;
  byType: Record<string, { count: number; totalCents: number; totalFormatted: string }>;
}

@Injectable({
  providedIn: 'root',
})
export class AccountsService {
  constructor(private apiService: ApiService) {}

  createAccount(data: any): Observable<Account> {
    return this.apiService.post('accounts', data);
  }

  getAccounts(): Observable<{
    accounts: Account[];
    totalBalance: number;
    totalBalanceFormatted: string;
    summary: AccountSummary;
  }> {
    return this.apiService.get('accounts');
  }

  getSummary(): Observable<AccountSummary> {
    return this.apiService.get('accounts/summary');
  }

  getTotalBalance(): Observable<{ totalCents: number; totalFormatted: string }> {
    return this.apiService.get('accounts/balance/total');
  }

  getAccount(id: string): Observable<Account> {
    return this.apiService.get(`accounts/${id}`);
  }

  updateAccount(id: string, data: any): Observable<Account> {
    return this.apiService.put(`accounts/${id}`, data);
  }

  deleteAccount(id: string): Observable<Account> {
    return this.apiService.delete(`accounts/${id}`);
  }

  // ============================================
  // Helpers
  // ============================================

  formatCurrency(cents: number): string {
    return `Q${(cents / 100).toFixed(2)}`;
  }

  toCents(amount: number): number {
    return Math.round(amount * 100);
  }

  getTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      checking: 'Cuenta Corriente',
      savings: 'Cuenta de Ahorro',
      cash: 'Efectivo',
      credit_union: 'Cooperativa',
    };
    return labels[type] || type;
  }

  getTypeColor(type: string): string {
    const colors: { [key: string]: string } = {
      checking: 'bg-blue-100 text-blue-800',
      savings: 'bg-green-100 text-green-800',
      cash: 'bg-yellow-100 text-yellow-800',
      credit_union: 'bg-purple-100 text-purple-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  }

  getTypeIcon(type: string): string {
    const icons: { [key: string]: string } = {
      checking: '🏦',
      savings: '💰',
      cash: '💵',
      credit_union: '🏛️',
    };
    return icons[type] || '🏦';
  }
}
