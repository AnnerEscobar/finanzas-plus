import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface Movement {
  _id: string;
  userId: string;
  type: 'income' | 'expense' | 'transfer' | 'adjustment';
  amountCents: number;
  date: Date;
  accountId: string;
  categoryId?: string;
  paymentMethod: 'cash' | 'debit' | 'transfer' | 'adjustment';
  note?: string;
  status: 'pending' | 'completed';
  relatedEntityId?: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable({
  providedIn: 'root',
})
export class MovementsService {
  constructor(private apiService: ApiService) {}

  /**
   * Registrar ingreso (RB-05)
   */
  createIncome(data: any): Observable<Movement> {
    return this.apiService.post('movements/income', data);
  }

  /**
   * Registrar gasto con efectivo/débito (RB-06)
   */
  createExpense(data: any): Observable<Movement> {
    return this.apiService.post('movements/expense', data);
  }

  /**
   * Registrar transferencia entre cuentas (RB-08)
   */
  createTransfer(data: any): Observable<any> {
    return this.apiService.post('movements/transfer', data);
  }

  /**
   * Registrar ajuste de saldo (conciliación)
   */
  createAdjustment(data: any): Observable<Movement> {
    return this.apiService.post('movements/adjustment', data);
  }

  /**
   * Obtener movimientos con filtros
   */
  getMovements(filters?: any): Observable<Movement[]> {
    return this.apiService.get('movements', filters);
  }

  /**
   * Obtener resumen mensual
   */
  getMonthlySummary(year: number, month: number): Observable<any> {
    return this.apiService.get('movements/summary', { year, month });
  }
}
