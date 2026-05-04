import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { NgChartsModule } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import { AccountsService } from '../../core/services/accounts.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, NgChartsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit, OnDestroy {
  // Dashboard metrics (RB-01)
  totalBalance: number = 0;
  blockedSavings: number = 0;
  totalDebt: number = 0;
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
    private router: Router,
  ) {}

  ngOnInit() {
    this.loadDashboardData();
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
          // Calculate patrimony: available balance - debt + savings
          this.estimatedPatrimony = this.totalBalance - this.totalDebt + this.blockedSavings;
          this.loading = false;
        },
        error: (err) => {
          this.error = 'Error al cargar saldo disponible';
          console.error('Error loading total balance:', err);
          this.loading = false;
        },
      });

    // TODO: Load blocked savings and total debt from respective services
    // For Sprint 1, these remain 0
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
