import { Injectable } from '@nestjs/common';
import { AccountsService } from '../accounts/accounts.service';
import { CreditCardsService } from '../creditCards/creditCards.service';
import { DebtsService } from '../debts/debts.service';
import { FundsService } from '../funds/funds.service';
import { MovementsService } from '../movements/movements.service';
import { ClosuresService } from '../closures/closures.service';

@Injectable()
export class ReportsService {
  constructor(
    private accountsService: AccountsService,
    private creditCardsService: CreditCardsService,
    private debtsService: DebtsService,
    private fundsService: FundsService,
    private movementsService: MovementsService,
    private closuresService: ClosuresService,
  ) {}

  /**
   * Resumen ejecutivo: dashboard general
   */
  async getOverview(userId: string) {
    const totalAssets = await this.accountsService.getTotalBalance(userId);
    const totalCardDebt = await this.creditCardsService.getTotalBalance(userId);
    const totalDebt = await this.debtsService.getTotalDebt(userId);
    const totalFunds = await this.fundsService.getTotalSaved(userId);

    const netWorth = totalAssets + totalFunds - totalCardDebt - totalDebt;

    // Resumen del mes actual
    const now = new Date();
    const monthlySummary = await this.movementsService.getMonthlySummary(
      userId,
      now.getFullYear(),
      now.getMonth() + 1,
    );

    return {
      assets: {
        totalCents: totalAssets,
        formatted: `Q${(totalAssets / 100).toFixed(2)}`,
      },
      funds: {
        totalCents: totalFunds,
        formatted: `Q${(totalFunds / 100).toFixed(2)}`,
      },
      creditCardDebt: {
        totalCents: totalCardDebt,
        formatted: `Q${(totalCardDebt / 100).toFixed(2)}`,
      },
      debt: {
        totalCents: totalDebt,
        formatted: `Q${(totalDebt / 100).toFixed(2)}`,
      },
      netWorth: {
        totalCents: netWorth,
        formatted: `Q${(netWorth / 100).toFixed(2)}`,
      },
      currentMonth: monthlySummary,
    };
  }

  /**
   * Evolución del patrimonio (usa cierres mensuales)
   */
  async getNetWorthEvolution(userId: string) {
    const evolution = await this.closuresService.getEvolutionSummary(userId);

    // Siempre añadir el estado actual como punto más reciente
    const totalAssets = await this.accountsService.getTotalBalance(userId);
    const totalCardDebt = await this.creditCardsService.getTotalBalance(userId);
    const totalDebt = await this.debtsService.getTotalDebt(userId);
    const totalFunds = await this.fundsService.getTotalSaved(userId);
    const netWorth = totalAssets + totalFunds - totalCardDebt - totalDebt;

    const now = new Date();
    const monthNames = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // No duplicar si ya existe cierre del mes actual
    const alreadyClosed = evolution.some((e) => e.month === currentMonthKey);

    const allPoints = evolution.map((e) => {
      const [year, month] = e.month.split('-');
      return {
        label: `${monthNames[parseInt(month) - 1]} ${year.slice(2)}`,
        totalAssetsCents: e.totalAssetsCents,
        totalFundsCents: e.totalFundsCents,
        totalCreditCardDebtCents: e.totalCreditCardDebtCents,
        totalDebtCents: e.totalDebtCents,
        netWorthCents: e.netWorthCents,
      };
    });

    if (!alreadyClosed) {
      allPoints.push({
        label: `${monthNames[now.getMonth()]} ${String(now.getFullYear()).slice(2)} (hoy)`,
        totalAssetsCents: totalAssets,
        totalFundsCents: totalFunds,
        totalCreditCardDebtCents: totalCardDebt,
        totalDebtCents: totalDebt,
        netWorthCents: netWorth,
      });
    }

    return {
      labels: allPoints.map((e) => e.label),
      assets: allPoints.map((e) => e.totalAssetsCents / 100),
      funds: allPoints.map((e) => e.totalFundsCents / 100),
      cardDebt: allPoints.map((e) => e.totalCreditCardDebtCents / 100),
      debt: allPoints.map((e) => e.totalDebtCents / 100),
      netWorth: allPoints.map((e) => e.netWorthCents / 100),
    };
  }

  /**
   * Evolución de deuda (cierres + tarjetas + préstamos)
   */
  async getDebtEvolution(userId: string) {
    const evolution = await this.closuresService.getEvolutionSummary(userId);

    return {
      labels: evolution.map((e) => e.month),
      cardDebt: evolution.map((e) => e.totalCreditCardDebtCents / 100),
      loans: evolution.map((e) => e.totalDebtCents / 100),
      total: evolution.map((e) => (e.totalCreditCardDebtCents + e.totalDebtCents) / 100),
    };
  }

  /**
   * Gastos por categoría del mes actual o seleccionado
   */
  async getExpenseByCategory(userId: string, year?: number, month?: number) {
    const now = new Date();
    const summary = await this.movementsService.getMonthlySummary(
      userId,
      year || now.getFullYear(),
      month || now.getMonth() + 1,
    );

    return {
      labels: summary.expenseByCategory.map((c) => c.name),
      data: summary.expenseByCategory.map((c) => c.totalCents / 100),
      total: summary.totalExpense / 100,
      totalFormatted: summary.totalExpenseFormatted,
    };
  }

  /**
   * Ingresos vs gastos últimos 6 meses
   */
  async getIncomeVsExpense(userId: string, monthsBack: number = 6) {
    const labels: string[] = [];
    const incomeData: number[] = [];
    const expenseData: number[] = [];

    const now = new Date();

    for (let i = monthsBack - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;

      const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      labels.push(`${monthNames[month - 1]} ${String(year).slice(2)}`);

      const summary = await this.movementsService.getMonthlySummary(userId, year, month);
      incomeData.push(summary.totalIncome / 100);
      expenseData.push(summary.totalExpense / 100);
    }

    return {
      labels,
      income: incomeData,
      expense: expenseData,
    };
  }

  /**
   * Top gastos del mes (movimientos individuales más altos)
   */
  async getTopExpenses(userId: string, limit: number = 10, year?: number, month?: number) {
    const now = new Date();
    const y = year || now.getFullYear();
    const m = month || now.getMonth() + 1;

    const startDate = new Date(y, m - 1, 1);
    const endDate = new Date(y, m, 0, 23, 59, 59);

    const movements = await this.movementsService.getMovements(userId, {
      type: 'expense',
      fromDate: startDate.toISOString(),
      toDate: endDate.toISOString(),
      limit: limit,
    });

    return movements
      .sort((a: any, b: any) => b.amountCents - a.amountCents)
      .slice(0, limit)
      .map((m: any) => ({
        date: m.date,
        amountCents: m.amountCents,
        amountFormatted: `Q${(m.amountCents / 100).toFixed(2)}`,
        category: m.categoryId?.name || 'Sin categoría',
        account: m.accountId?.alias || '—',
        note: m.note || '—',
      }));
  }

  /**
   * Distribución de activos
   */
  async getAssetDistribution(userId: string) {
    const accounts = await this.accountsService.findByUserId(userId);
    const funds = await this.fundsService.findByUserId(userId);

    const items: Array<{ label: string; cents: number; type: string }> = [];

    accounts.forEach((acc) => {
      items.push({
        label: acc.alias,
        cents: acc.currentBalanceCents,
        type: 'account',
      });
    });

    funds.forEach((f) => {
      items.push({
        label: `${f.alias} (Fondo)`,
        cents: f.currentAmountCents,
        type: 'fund',
      });
    });

    items.sort((a, b) => b.cents - a.cents);

    return {
      labels: items.map((i) => i.label),
      data: items.map((i) => i.cents / 100),
      types: items.map((i) => i.type),
      totalCents: items.reduce((s, i) => s + i.cents, 0),
    };
  }

  /**
   * Distribución de deudas
   */
  async getDebtDistribution(userId: string) {
    const cards = await this.creditCardsService.findByUserId(userId);
    const debts = await this.debtsService.findByUserId(userId);

    const items: Array<{ label: string; cents: number; type: string }> = [];

    cards.forEach((c) => {
      if (c.totalBalanceCents > 0) {
        items.push({
          label: `${c.alias} (Tarjeta)`,
          cents: c.totalBalanceCents,
          type: 'creditCard',
        });
      }
    });

    debts.forEach((d) => {
      if (d.remainingCents > 0) {
        items.push({
          label: d.alias,
          cents: d.remainingCents,
          type: 'debt',
        });
      }
    });

    items.sort((a, b) => b.cents - a.cents);

    return {
      labels: items.map((i) => i.label),
      data: items.map((i) => i.cents / 100),
      types: items.map((i) => i.type),
      totalCents: items.reduce((s, i) => s + i.cents, 0),
    };
  }

  /**
   * Datos completos para reporte mensual (Excel/PDF)
   */
  async getMonthlyReportData(userId: string, year: number, month: number) {
    const accounts = await this.accountsService.findByUserId(userId);
    const cards = await this.creditCardsService.findByUserId(userId);
    const debts = await this.debtsService.findByUserId(userId);
    const funds = await this.fundsService.findByUserId(userId);
    const summary = await this.movementsService.getMonthlySummary(userId, year, month);

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    const movements = await this.movementsService.getMovements(userId, {
      fromDate: startDate.toISOString(),
      toDate: endDate.toISOString(),
      limit: 1000,
    });

    const totalAssets = accounts.reduce((s, a) => s + a.currentBalanceCents, 0);
    const totalCardDebt = cards.reduce((s, c) => s + c.totalBalanceCents, 0);
    const totalDebt = debts.reduce((s, d) => s + d.remainingCents, 0);
    const totalFunds = funds.reduce((s, f) => s + f.currentAmountCents, 0);
    const netWorth = totalAssets + totalFunds - totalCardDebt - totalDebt;

    return {
      period: { year, month },
      generatedAt: new Date(),
      summary: {
        ...summary,
        totalAssetsCents: totalAssets,
        totalCardDebtCents: totalCardDebt,
        totalDebtCents: totalDebt,
        totalFundsCents: totalFunds,
        netWorthCents: netWorth,
      },
      accounts: accounts.map((a) => ({
        alias: a.alias,
        type: a.type,
        institution: a.institution || '',
        currentBalanceCents: a.currentBalanceCents,
      })),
      creditCards: cards.map((c) => ({
        alias: c.alias,
        issuer: c.issuer,
        creditLimitCents: c.creditLimitCents,
        totalBalanceCents: c.totalBalanceCents,
        availableCreditCents: c.availableCreditCents,
      })),
      debts: debts.map((d) => ({
        alias: d.alias,
        creditorName: d.creditorName,
        debtType: d.debtType,
        originalAmountCents: d.originalAmountCents,
        remainingCents: d.remainingCents,
        monthlyPaymentCents: d.monthlyPaymentCents,
        paidInstallments: d.paidInstallments,
        totalInstallments: d.totalInstallments,
      })),
      funds: funds.map((f) => ({
        alias: f.alias,
        institution: f.institution || '',
        currentAmountCents: f.currentAmountCents,
        targetAmountCents: f.targetAmountCents,
        monthlyContributionCents: f.monthlyContributionCents,
      })),
      movements: movements.map((m: any) => ({
        date: m.date,
        type: m.type,
        amountCents: m.amountCents,
        accountAlias: m.accountId?.alias || '—',
        categoryName: m.categoryId?.name || '—',
        paymentMethod: m.paymentMethod,
        note: m.note || '',
      })),
    };
  }
}
