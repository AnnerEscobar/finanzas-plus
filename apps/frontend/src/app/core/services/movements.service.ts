import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

/**
 * Category
 */
export interface Category {
  _id: string;
  userId: string;
  name: string;
  type: 'expense' | 'income';
  isDefault: boolean;
  isActive: boolean;
}

/**
 * Movement (with populated account/category)
 */
export interface Movement {
  _id: string;
  userId: string;
  type: 'income' | 'expense' | 'transfer' | 'adjustment';
  amountCents: number;
  date: Date;
  accountId: any; // populated: {_id, alias, type, institution}
  categoryId?: any; // populated: {_id, name, type}
  paymentMethod: 'cash' | 'debit' | 'transfer' | 'adjustment';
  note?: string;
  status: 'pending' | 'completed';
  relatedEntityId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Monthly Summary
 */
export interface MonthlySummary {
  year: number;
  month: number;
  totalIncome: number;
  totalExpense: number;
  totalTransfersOut: number;
  balance: number;
  totalIncomeFormatted: string;
  totalExpenseFormatted: string;
  balanceFormatted: string;
  movementsCount: number;
  expenseByCategory: Array<{ name: string; totalCents: number }>;
  incomeByCategory: Array<{ name: string; totalCents: number }>;
}

/**
 * Movements filter
 */
export interface MovementFilters {
  accountId?: string;
  type?: string;
  categoryId?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
}

@Injectable({
  providedIn: 'root',
})
export class MovementsService {
  constructor(private apiService: ApiService) {}

  // ============================================
  // Movements
  // ============================================

  createIncome(data: any): Observable<Movement> {
    return this.apiService.post('movements/income', data);
  }

  createExpense(data: any): Observable<Movement> {
    return this.apiService.post('movements/expense', data);
  }

  createTransfer(data: any): Observable<{ transferOut: Movement; transferIn: Movement }> {
    return this.apiService.post('movements/transfer', data);
  }

  createAdjustment(data: any): Observable<Movement> {
    return this.apiService.post('movements/adjustment', data);
  }

  getMovements(filters: MovementFilters = {}): Observable<{ movements: Movement[]; count: number }> {
    return this.apiService.get('movements', filters);
  }

  getMovement(id: string): Observable<Movement> {
    return this.apiService.get(`movements/${id}`);
  }

  deleteMovement(id: string): Observable<any> {
    return this.apiService.delete(`movements/${id}`);
  }

  getMonthlySummary(year?: number, month?: number): Observable<MonthlySummary> {
    const params: any = {};
    if (year !== undefined) params.year = year;
    if (month !== undefined) params.month = month;
    return this.apiService.get('movements/summary', params);
  }

  // ============================================
  // Categories
  // ============================================

  getCategories(type?: 'expense' | 'income'): Observable<{ categories: Category[]; count: number }> {
    const params = type ? { type } : {};
    return this.apiService.get('categories', params);
  }

  createCategory(data: any): Observable<Category> {
    return this.apiService.post('categories', data);
  }

  ensureDefaultCategories(): Observable<{ created: number; existing: number }> {
    return this.apiService.post('categories/ensure-defaults', {});
  }

  deduplicateCategories(): Observable<{ removed: number }> {
    return this.apiService.post('categories/deduplicate', {});
  }

  updateCategory(id: string, data: any): Observable<Category> {
    return this.apiService.put(`categories/${id}`, data);
  }

  deleteCategory(id: string): Observable<Category> {
    return this.apiService.delete(`categories/${id}`);
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
      income: 'Ingreso',
      expense: 'Gasto',
      transfer: 'Transferencia',
      adjustment: 'Ajuste',
    };
    return labels[type] || type;
  }

  getTypeColor(type: string): string {
    const colors: { [key: string]: string } = {
      income: 'bg-green-100 text-green-800',
      expense: 'bg-red-100 text-red-800',
      transfer: 'bg-blue-100 text-blue-800',
      adjustment: 'bg-yellow-100 text-yellow-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  }

  getTypeIcon(type: string): string {
    const icons: { [key: string]: string } = {
      income: '⬆️',
      expense: '⬇️',
      transfer: '↔️',
      adjustment: '⚖️',
    };
    return icons[type] || '•';
  }

  getPaymentMethodLabel(method: string): string {
    const labels: { [key: string]: string } = {
      cash: 'Efectivo',
      debit: 'Débito',
      transfer: 'Transferencia',
      adjustment: 'Ajuste',
    };
    return labels[method] || method;
  }

  /**
   * Get current YYYY-MM
   */
  getCurrentYearMonth(): { year: number; month: number } {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }
}
