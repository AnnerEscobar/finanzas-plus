import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface Overview {
  assets: { totalCents: number; formatted: string };
  funds: { totalCents: number; formatted: string };
  creditCardDebt: { totalCents: number; formatted: string };
  debt: { totalCents: number; formatted: string };
  netWorth: { totalCents: number; formatted: string };
  currentMonth: any;
}

export interface ChartDataset {
  labels: string[];
  data: number[];
  total?: number;
  totalFormatted?: string;
}

export interface NetWorthEvolution {
  labels: string[];
  assets: number[];
  funds: number[];
  cardDebt: number[];
  debt: number[];
  netWorth: number[];
}

export interface DebtEvolution {
  labels: string[];
  cardDebt: number[];
  loans: number[];
  total: number[];
}

export interface IncomeVsExpense {
  labels: string[];
  income: number[];
  expense: number[];
}

export interface TopExpense {
  date: Date;
  amountCents: number;
  amountFormatted: string;
  category: string;
  account: string;
  note: string;
}

export interface DistributionData {
  labels: string[];
  data: number[];
  types: string[];
  totalCents: number;
}

@Injectable({
  providedIn: 'root',
})
export class ReportsService {
  constructor(private apiService: ApiService) {}

  getOverview(): Observable<Overview> {
    return this.apiService.get('reports/overview');
  }

  getNetWorthEvolution(): Observable<NetWorthEvolution> {
    return this.apiService.get('reports/net-worth-evolution');
  }

  getDebtEvolution(): Observable<DebtEvolution> {
    return this.apiService.get('reports/debt-evolution');
  }

  getExpenseByCategory(year?: number, month?: number): Observable<ChartDataset> {
    const params: any = {};
    if (year) params.year = year;
    if (month) params.month = month;
    return this.apiService.get('reports/expense-by-category', params);
  }

  getIncomeVsExpense(monthsBack: number = 6): Observable<IncomeVsExpense> {
    return this.apiService.get('reports/income-vs-expense', { monthsBack });
  }

  getTopExpenses(limit: number = 10, year?: number, month?: number): Observable<TopExpense[]> {
    const params: any = { limit };
    if (year) params.year = year;
    if (month) params.month = month;
    return this.apiService.get('reports/top-expenses', params);
  }

  getAssetDistribution(): Observable<DistributionData> {
    return this.apiService.get('reports/asset-distribution');
  }

  getDebtDistribution(): Observable<DistributionData> {
    return this.apiService.get('reports/debt-distribution');
  }

  // ============================================
  // Exports
  // ============================================

  downloadExcel(year: number, month: number): Observable<Blob> {
    return this.apiService.getBlob('reports/excel', { year, month });
  }

  downloadPdf(year: number, month: number): Observable<Blob> {
    return this.apiService.getBlob('reports/pdf', { year, month });
  }

  /**
   * Helper para forzar descarga de un Blob
   */
  triggerDownload(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  formatCurrency(cents: number): string {
    return `Q${(cents / 100).toFixed(2)}`;
  }
}
