import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AccountsService } from '../../core/services/accounts.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
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
