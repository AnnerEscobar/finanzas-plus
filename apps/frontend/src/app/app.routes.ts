import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./modules/dashboard/dashboard.component').then(m => m.DashboardComponent),
  },
  {
    path: 'accounts',
    loadComponent: () => import('./modules/accounts/accounts.component').then(m => m.AccountsComponent),
  },
  {
    path: 'movements',
    loadComponent: () => import('./modules/movements/movements.component').then(m => m.MovementsComponent),
  },
  {
    path: 'credit-cards',
    loadComponent: () => import('./modules/creditCards/creditCards.component').then(m => m.CreditCardsComponent),
  },
  {
    path: 'debts',
    loadComponent: () => import('./modules/debts/debts.component').then(m => m.DebtsComponent),
  },
  {
    path: 'funds',
    loadComponent: () => import('./modules/funds/funds.component').then(m => m.FundsComponent),
  },
  {
    path: 'debt-plan',
    loadComponent: () => import('./modules/debtPlan/debtPlan.component').then(m => m.DebtPlanComponent),
  },
  {
    path: 'reports',
    loadComponent: () => import('./modules/reports/reports.component').then(m => m.ReportsComponent),
  },
];
