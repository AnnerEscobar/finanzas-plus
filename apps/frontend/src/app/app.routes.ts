import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./modules/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./modules/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [AuthGuard],
  },
  {
    path: 'accounts',
    loadComponent: () => import('./modules/accounts/accounts.component').then(m => m.AccountsComponent),
    canActivate: [AuthGuard],
  },
  {
    path: 'movements',
    loadComponent: () => import('./modules/movements/movements.component').then(m => m.MovementsComponent),
    canActivate: [AuthGuard],
  },
  {
    path: 'credit-cards',
    loadComponent: () => import('./modules/creditCards/creditCards.component').then(m => m.CreditCardsComponent),
    canActivate: [AuthGuard],
  },
  {
    path: 'debts',
    loadComponent: () => import('./modules/debts/debts.component').then(m => m.DebtsComponent),
    canActivate: [AuthGuard],
  },
  {
    path: 'funds',
    loadComponent: () => import('./modules/funds/funds.component').then(m => m.FundsComponent),
    canActivate: [AuthGuard],
  },
  {
    path: 'debt-plan',
    loadComponent: () => import('./modules/debtPlan/debtPlan.component').then(m => m.DebtPlanComponent),
    canActivate: [AuthGuard],
  },
  {
    path: 'reports',
    loadComponent: () => import('./modules/reports/reports.component').then(m => m.ReportsComponent),
    canActivate: [AuthGuard],
  },
  {
    path: 'closures',
    loadComponent: () => import('./modules/closures/closures.component').then(m => m.ClosuresComponent),
    canActivate: [AuthGuard],
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
