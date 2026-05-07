import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { NgChartsModule } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import { AccountsService } from '../../core/services/accounts.service';
import { AuthService } from '../../core/services/auth.service';
import { DebtsService } from '../../core/services/debts.service';
import { CreditCardsService } from '../../core/services/creditCards.service';
import { FundsService } from '../../core/services/funds.service';
import { ReportsService } from '../../core/services/reports.service';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, NgChartsModule, NavbarComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit, OnDestroy {
  // Dashboard metrics (RB-01)
  totalBalance: number = 0;
  blockedSavings: number = 0;
  loanDebt: number = 0;         // préstamos y deudas formales
  creditCardDebt: number = 0;   // saldo total de tarjetas de crédito
  totalDebt: number = 0;        // loanDebt + creditCardDebt
  estimatedPatrimony: number = 0;

  // Loading states
  loading: boolean = true;
  error: string = '';

  // Chart data - Balance trend (mock data for Sprint 1)
  balanceTrendChartData: ChartData<'line'> = {
    labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May'],
    datasets: [
      {
        label: 'Saldo Disponible',
        data: [250000, 280000, 310000, 290000, 350000],
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  balanceTrendChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        display: true,
        position: 'top',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  // Chart data - Expense by category (mock data for Sprint 1)
  expenseByCategoryChartData: ChartData<'doughnut'> = {
    labels: ['Comida', 'Servicios', 'Entretenimiento', 'Salud', 'Otros'],
    datasets: [
      {
        data: [1200, 800, 600, 400, 300],
        backgroundColor: [
          '#f87171',
          '#fbbf24',
          '#60a5fa',
          '#34d399',
          '#a78bfa',
        ],
        borderColor: '#fff',
        borderWidth: 2,
      },
    ],
  };

  expenseByCategoryChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        display: true,
        position: 'right',
      },
    },
  };

  // Chart data - Income vs Expense (mock data for Sprint 1)
  incomeVsExpenseChartData: ChartData<'bar'> = {
    labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May'],
    datasets: [
      {
        label: 'Ingresos',
        data: [300000, 300000, 350000, 300000, 350000],
        backgroundColor: '#10b981',
        borderRadius: 4,
      },
      {
        label: 'Gastos',
        data: [120000, 95000, 140000, 110000, 105000],
        backgroundColor: '#ef4444',
        borderRadius: 4,
      },
    ],
  };

  incomeVsExpenseChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        display: true,
        position: 'top',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  // Unsubscribe
  private destroy$ = new Subject<void>();

  constructor(
    private accountsService: AccountsService,
    private authService: AuthService,
    private debtsService: DebtsService,
    private creditCardsService: CreditCardsService,
    private fundsService: FundsService,
    private reportsService: ReportsService,
    private router: Router,
  ) {}

  ngOnInit() {
    // Pequeño delay para asegurar que el token está disponible en localStorage
    setTimeout(() => {
      this.loadDashboardData();
    }, 100);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load all dashboard metrics
   */
  private loadDashboardData() {
    this.loading = true;
    this.error = '';

    // Get total balance (RB-01)
    this.accountsService
      .getTotalBalance()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.totalBalance = response.totalCents || 0;
          this.recalculatePatrimony();
          this.loading = false;
        },
        error: (err) => {
          this.error = 'Error al cargar saldo disponible';
          console.error('Error loading total balance:', err);
          this.loading = false;
        },
      });

    // Préstamos / deudas formales
    this.debtsService
      .getTotalDebt()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.loanDebt = response.totalCents || 0;
          this.totalDebt = this.loanDebt + this.creditCardDebt;
          this.recalculatePatrimony();
        },
        error: () => {
          // Silent fail
        },
      });

    // Saldo de tarjetas de crédito (también es deuda)
    this.creditCardsService
      .getTotalBalance()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.creditCardDebt = response.totalCents || 0;
          this.totalDebt = this.loanDebt + this.creditCardDebt;
          this.recalculatePatrimony();
        },
        error: () => {
          // Silent fail (sin tarjetas)
        },
      });

    // Sprint 3: Load total saved (funds)
    this.fundsService
      .getTotalSaved()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.blockedSavings = response.totalCents || 0;
          this.recalculatePatrimony();
        },
        error: () => {
          // Silent fail (no funds yet)
        },
      });

    // Sprint 4: Cargar gráficas con datos reales
    this.loadRealCharts();
  }

  /**
   * Cargar gráficas reales (Sprint 4)
   */
  private loadRealCharts() {
    // Net worth evolution
    this.reportsService
      .getNetWorthEvolution()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          if (data.labels.length > 0) {
            this.balanceTrendChartData = {
              labels: data.labels,
              datasets: [
                {
                  label: 'Patrimonio Neto',
                  data: data.netWorth,
                  borderColor: '#7C3AED',
                  backgroundColor: 'rgba(124, 58, 237, 0.15)',
                  fill: true,
                  tension: 0.3,
                },
              ],
            };
          }
        },
      });

    // Income vs Expense
    this.reportsService
      .getIncomeVsExpense(5)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          if (data.labels.length > 0) {
            this.incomeVsExpenseChartData = {
              labels: data.labels,
              datasets: [
                {
                  label: 'Ingresos',
                  data: data.income,
                  backgroundColor: '#10b981',
                  borderRadius: 4,
                },
                {
                  label: 'Gastos',
                  data: data.expense,
                  backgroundColor: '#ef4444',
                  borderRadius: 4,
                },
              ],
            };
          }
        },
      });

    // Expense by Category (current month)
    this.reportsService
      .getExpenseByCategory()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          if (data.labels.length > 0) {
            this.expenseByCategoryChartData = {
              labels: data.labels,
              datasets: [
                {
                  data: data.data,
                  backgroundColor: [
                    '#f87171', '#fbbf24', '#60a5fa', '#34d399',
                    '#a78bfa', '#fb923c', '#22d3ee', '#84cc16',
                    '#ec4899', '#06b6d4',
                  ],
                  borderColor: '#fff',
                  borderWidth: 2,
                },
              ],
            };
          }
        },
      });
  }

  /**
   * Patrimonio = Saldo disponible + Fondos - Deudas
   */
  private recalculatePatrimony() {
    this.estimatedPatrimony = this.totalBalance + this.blockedSavings - this.totalDebt;
  }

  /**
   * Format centavos to currency display (Q##.##)
   */
  formatCurrency(centavos: number): string {
    return this.accountsService.formatCurrency(centavos);
  }

  /**
   * Get current user name/display
   */
  getCurrentUser(): string {
    const user = this.authService.getCurrentUser();
    return user?.name || 'Usuario';
  }

  /**
   * Logout
   */
  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
