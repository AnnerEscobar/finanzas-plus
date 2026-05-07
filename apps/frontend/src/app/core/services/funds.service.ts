import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

/**
 * Fund Contribution Interface
 */
export interface FundContribution {
  _id: string;
  amountCents: number;
  date: Date;
  accountId?: string;
  note?: string;
  createdAt?: Date;
}

/**
 * Fund Interface
 */
export interface Fund {
  _id: string;
  userId: string;
  alias: string;
  description?: string;
  institution?: string;
  fundType: 'retirement' | 'emergency' | 'savings' | 'investment' | 'other';
  targetAmountCents: number;
  currentAmountCents: number;
  monthlyContributionCents: number;
  annualInterestRate: number;
  startDate: Date;
  targetDate?: Date;
  contributions: FundContribution[];
  status: 'active' | 'matured' | 'closed';
  note?: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Fund Projection Interface
 */
export interface FundProjection {
  projectedValueCents: number;
  monthsRemaining: number;
  totalContributionsCents: number;
  estimatedInterestCents: number;
  projectedValueFormatted: string;
  totalContributionsFormatted: string;
  estimatedInterestFormatted: string;
}

/**
 * Fund Summary Interface
 */
export interface FundSummary {
  count: number;
  totalCurrentCents: number;
  totalTargetCents: number;
  totalMonthlyContributionCents: number;
  totalProjectedCents: number;
  totalCurrentFormatted: string;
  totalTargetFormatted: string;
  totalMonthlyContributionFormatted: string;
  totalProjectedFormatted: string;
  progressPercentage: number;
}

@Injectable({
  providedIn: 'root',
})
export class FundsService {
  constructor(private apiService: ApiService) {}

  createFund(data: any): Observable<Fund> {
    return this.apiService.post<Fund>('funds', data);
  }

  getFunds(): Observable<{ funds: Fund[]; summary: FundSummary }> {
    return this.apiService.get('funds');
  }

  getSummary(): Observable<FundSummary> {
    return this.apiService.get('funds/summary');
  }

  getTotalSaved(): Observable<{ totalCents: number; totalFormatted: string }> {
    return this.apiService.get('funds/balance/total');
  }

  getFund(id: string): Observable<Fund> {
    return this.apiService.get<Fund>(`funds/${id}`);
  }

  getFundProjection(id: string): Observable<{ fund: Fund; projection: FundProjection }> {
    return this.apiService.get(`funds/${id}/projection`);
  }

  updateFund(id: string, data: any): Observable<Fund> {
    return this.apiService.put<Fund>(`funds/${id}`, data);
  }

  deleteFund(id: string): Observable<Fund> {
    return this.apiService.delete<Fund>(`funds/${id}`);
  }

  addContribution(id: string, data: any): Observable<Fund> {
    return this.apiService.post<Fund>(`funds/${id}/contributions`, data);
  }

  getContributions(
    id: string,
  ): Observable<{ contributions: FundContribution[]; count: number; total: number; totalFormatted: string }> {
    return this.apiService.get(`funds/${id}/contributions`);
  }

  deleteContribution(id: string, contributionId: string): Observable<Fund> {
    return this.apiService.delete<Fund>(`funds/${id}/contributions/${contributionId}`);
  }

  // ============================================
  // Utilities
  // ============================================

  formatCurrency(cents: number): string {
    return `Q${(cents / 100).toFixed(2)}`;
  }

  toCents(amount: number): number {
    return Math.round(amount * 100);
  }

  getFundTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      retirement: 'Retiro',
      emergency: 'Emergencia',
      savings: 'Ahorro',
      investment: 'Inversión',
      other: 'Otro',
    };
    return labels[type] || type;
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      active: 'Activo',
      matured: 'Madurado',
      closed: 'Cerrado',
    };
    return labels[status] || status;
  }

  getStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      active: 'bg-blue-100 text-blue-800',
      matured: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  }

  calculateProgress(fund: Fund): number {
    if (fund.targetAmountCents === 0) return 0;
    return Math.min(100, Math.round((fund.currentAmountCents / fund.targetAmountCents) * 100));
  }
}
