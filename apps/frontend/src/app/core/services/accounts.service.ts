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

@Injectable({
  providedIn: 'root',
})
export class AccountsService {
  constructor(private apiService: ApiService) {}

  /**
   * Crear nueva cuenta
   */
  createAccount(data: any): Observable<Account> {
    return this.apiService.post('accounts', data);
  }

  /**
   * Obtener todas las cuentas del usuario y su saldo total
   */
  getAccounts(): Observable<{ accounts: Account[]; totalBalance: number; totalBalanceFormatted: string }> {
    return this.apiService.get('accounts');
  }

  /**
   * Obtener saldo total disponible (RB-01)
   */
  getTotalBalance(): Observable<{ totalCents: number; totalFormatted: string }> {
    return this.apiService.get('accounts/balance/total');
  }

  /**
   * Obtener detalles de una cuenta
   */
  getAccount(id: string): Observable<Account> {
    return this.apiService.get(`accounts/${id}`);
  }

  /**
   * Actualizar cuenta
   */
  updateAccount(id: string, data: any): Observable<Account> {
    return this.apiService.put(`accounts/${id}`, data);
  }

  /**
   * Convertir centavos a formato Q.XX
   */
  formatCurrency(cents: number): string {
    return `Q${(cents / 100).toFixed(2)}`;
  }

  /**
   * Convertir Q.XX a centavos
   */
  toCents(amount: number): number {
    return Math.round(amount * 100);
  }
}
