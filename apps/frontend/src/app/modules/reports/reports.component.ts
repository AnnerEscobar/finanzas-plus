import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { NgChartsModule } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import {
  ReportsService,
  Overview,
  NetWorthEvolution,
  DebtEvolution,
  IncomeVsExpense,
  TopExpense,
  DistributionData,
  ChartDataset,
} from '../../core/services/reports.service';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, NgChartsModule, NavbarComponent],
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.css'],
})
export class ReportsComponent implements OnInit, OnDestroy {
  // Data
  overview: Overview | null = null;
  topExpenses: TopExpense[] = [];

  // Period
  selectedYear: number = new Date().getFullYear();
  selectedMonth: number = new Date().getMonth() + 1;

  // UI
  loading = false;
  error: string | null = null;
  exporting = false;

  // ============================================
  // Charts
  // ============================================

  // Net Worth Evolution
  netWorthChartData: ChartData<'line'> = { labels: [], datasets: [] };
  netWorthChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'top' },
      tooltip: {
        callbacks: {
          label: (ctx: any) => `${ctx.dataset.label}: Q${Number(ctx.parsed.y || 0).toFixed(2)}`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        ticks: { callback: (v) => `Q${v}` },
      },
    },
  };

  // Debt Evolution
  debtEvolutionChartData: ChartData<'line'> = { labels: [], datasets: [] };
  debtEvolutionChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'top' },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { callback: (v) => `Q${v}` },
      },
    },
  };

  // Expense by Category (Doughnut)
  expenseByCategoryChartData: ChartData<'doughnut'> = { labels: [], datasets: [] };
  expenseByCategoryChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'right' },
    },
  };

  // Income vs Expense (Bar)
  incomeVsExpenseChartData: ChartData<'bar'> = { labels: [], datasets: [] };
  incomeVsExpenseChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: true, position: 'top' } },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { callback: (v) => `Q${v}` },
      },
    },
  };

  // Asset Distribution (Pie)
  assetDistributionChartData: ChartData<'pie'> = { labels: [], datasets: [] };
  assetDistributionChartOptions: ChartConfiguration<'pie'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: true, position: 'right' } },
  };

  // Debt Distribution (Pie)
  debtDistributionChartData: ChartData<'pie'> = { labels: [], datasets: [] };
  debtDistributionChartOptions: ChartConfiguration<'pie'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: true, position: 'right' } },
  };

  private destroy$ = new Subject<void>();

  constructor(private reportsService: ReportsService) {}

  ngOnInit() {
    this.loadAll();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadAll() {
    this.loadOverview();
    this.loadNetWorthEvolution();
    this.loadDebtEvolution();
    this.loadExpenseByCategory();
    this.loadIncomeVsExpense();
    this.loadTopExpenses();
    this.loadAssetDistribution();
    this.loadDebtDistribution();
  }

  loadOverview() {
    this.reportsService
      .getOverview()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => (this.overview = data),
        error: () => {
          this.error = 'Error al cargar el resumen';
        },
      });
  }

  loadNetWorthEvolution() {
    this.reportsService
      .getNetWorthEvolution()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.netWorthChartData = {
            labels: data.labels,
            datasets: [
              {
                label: 'Patrimonio Neto',
                data: data.netWorth,
                borderColor: '#7C3AED',
                backgroundColor: 'rgba(124, 58, 237, 0.15)',
                fill: true,
                tension: 0.3,
                borderWidth: 3,
              },
              {
                label: 'Activos',
                data: data.assets,
                borderColor: '#10B981',
                backgroundColor: 'rgba(16, 185, 129, 0.05)',
                tension: 0.3,
              },
              {
                label: 'Fondos',
                data: data.funds,
                borderColor: '#3B82F6',
                backgroundColor: 'rgba(59, 130, 246, 0.05)',
                tension: 0.3,
              },
            ],
          };
        },
      });
  }

  loadDebtEvolution() {
    this.reportsService
      .getDebtEvolution()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.debtEvolutionChartData = {
            labels: data.labels,
            datasets: [
              {
                label: 'Total Deudas',
                data: data.total,
                borderColor: '#EF4444',
                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                fill: true,
                tension: 0.3,
                borderWidth: 3,
              },
              {
                label: 'Tarjetas',
                data: data.cardDebt,
                borderColor: '#F59E0B',
                tension: 0.3,
              },
              {
                label: 'Préstamos',
                data: data.loans,
                borderColor: '#DC2626',
                tension: 0.3,
              },
            ],
          };
        },
      });
  }

  loadExpenseByCategory() {
    this.reportsService
      .getExpenseByCategory(this.selectedYear, this.selectedMonth)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.expenseByCategoryChartData = {
            labels: data.labels,
            datasets: [
              {
                data: data.data,
                backgroundColor: [
                  '#EF4444', '#F59E0B', '#10B981', '#3B82F6',
                  '#8B5CF6', '#EC4899', '#14B8A6', '#F97316',
                  '#84CC16', '#06B6D4',
                ],
                borderColor: '#fff',
                borderWidth: 2,
              },
            ],
          };
        },
      });
  }

  loadIncomeVsExpense() {
    this.reportsService
      .getIncomeVsExpense(6)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.incomeVsExpenseChartData = {
            labels: data.labels,
            datasets: [
              {
                label: 'Ingresos',
                data: data.income,
                backgroundColor: '#10B981',
                borderRadius: 4,
              },
              {
                label: 'Gastos',
                data: data.expense,
                backgroundColor: '#EF4444',
                borderRadius: 4,
              },
            ],
          };
        },
      });
  }

  loadTopExpenses() {
    this.reportsService
      .getTopExpenses(10, this.selectedYear, this.selectedMonth)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => (this.topExpenses = data),
      });
  }

  loadAssetDistribution() {
    this.reportsService
      .getAssetDistribution()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.assetDistributionChartData = {
            labels: data.labels,
            datasets: [
              {
                data: data.data,
                backgroundColor: ['#10B981', '#3B82F6', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'],
                borderColor: '#fff',
                borderWidth: 2,
              },
            ],
          };
        },
      });
  }

  loadDebtDistribution() {
    this.reportsService
      .getDebtDistribution()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.debtDistributionChartData = {
            labels: data.labels,
            datasets: [
              {
                data: data.data,
                backgroundColor: ['#EF4444', '#F59E0B', '#DC2626', '#FB923C', '#FBBF24'],
                borderColor: '#fff',
                borderWidth: 2,
              },
            ],
          };
        },
      });
  }

  // ============================================
  // Period selector
  // ============================================

  changePeriod(delta: number) {
    let m = this.selectedMonth + delta;
    let y = this.selectedYear;
    if (m > 12) {
      m = 1;
      y += 1;
    } else if (m < 1) {
      m = 12;
      y -= 1;
    }
    this.selectedMonth = m;
    this.selectedYear = y;

    // Recargar reportes que dependen del período
    this.loadExpenseByCategory();
    this.loadTopExpenses();
  }

  getMonthLabel(): string {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
    ];
    return `${months[this.selectedMonth - 1]} ${this.selectedYear}`;
  }

  // ============================================
  // Exports
  // ============================================

  downloadExcel() {
    this.exporting = true;
    this.error = null;
    this.reportsService
      .downloadExcel(this.selectedYear, this.selectedMonth)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          const filename = `Finanzas-${this.selectedYear}-${String(this.selectedMonth).padStart(2, '0')}.xlsx`;
          this.reportsService.triggerDownload(blob, filename);
          this.exporting = false;
        },
        error: (err) => {
          this.error = 'Error al descargar el Excel';
          this.exporting = false;
        },
      });
  }

  downloadPdf() {
    this.exporting = true;
    this.error = null;
    this.reportsService
      .downloadPdf(this.selectedYear, this.selectedMonth)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          const filename = `Finanzas-${this.selectedYear}-${String(this.selectedMonth).padStart(2, '0')}.pdf`;
          this.reportsService.triggerDownload(blob, filename);
          this.exporting = false;
        },
        error: (err) => {
          this.error = 'Error al descargar el PDF';
          this.exporting = false;
        },
      });
  }

  // ============================================
  // Helpers
  // ============================================

  formatCurrency(cents: number): string {
    return this.reportsService.formatCurrency(cents);
  }

  hasNetWorthData(): boolean {
    return this.netWorthChartData.labels !== undefined && this.netWorthChartData.labels.length > 0;
  }

  hasExpenseData(): boolean {
    return this.expenseByCategoryChartData.labels !== undefined && this.expenseByCategoryChartData.labels.length > 0;
  }

  hasAssetData(): boolean {
    return this.assetDistributionChartData.labels !== undefined && this.assetDistributionChartData.labels.length > 0;
  }

  hasDebtData(): boolean {
    return this.debtDistributionChartData.labels !== undefined && this.debtDistributionChartData.labels.length > 0;
  }
}
