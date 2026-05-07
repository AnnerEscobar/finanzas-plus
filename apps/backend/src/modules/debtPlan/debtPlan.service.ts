import { Injectable, BadRequestException } from '@nestjs/common';
import { DebtsService } from '../debts/debts.service';
import { CreditCardsService } from '../creditCards/creditCards.service';

/**
 * Debt Plan Service - Algoritmos de pago de deudas
 * Métodos: bola de nieve, avalancha, manual
 * Incluye: préstamos/deudas + saldos de tarjetas de crédito
 */
@Injectable()
export class DebtPlanService {
  constructor(
    private debtsService: DebtsService,
    private creditCardsService: CreditCardsService,
  ) {}

  /**
   * Calcular plan completo (los 3 métodos para comparación)
   * Toma en cuenta deudas formales + saldos de tarjetas de crédito
   */
  async calculateComparison(userId: string, options: any) {
    const extraPaymentCents = options.extraPaymentCents || 0;

    // ── Deudas formales (préstamos, cooperativas, etc.) ──
    const debts = await this.debtsService.findByUserId(userId);
    const loanDebts = debts
      .filter((d) => d.status === 'active' && d.remainingCents > 0)
      .map((d) => ({
        _id: d._id.toString(),
        alias: d.alias,
        creditorName: d.creditorName,
        remainingCents: d.remainingCents,
        monthlyPaymentCents: d.monthlyPaymentCents,
        interestRate: d.interestRate || 0,
        debtType: d.debtType || 'loan',
        source: 'debt' as const,
      }));

    // ── Tarjetas de crédito con saldo ──
    const cards = await this.creditCardsService.findByUserId(userId);
    const cardDebts = cards
      .filter((c) => c.totalBalanceCents > 0)
      .map((c) => {
        // Cuota mensual estimada = saldo del corte más reciente no pagado
        // (lo que hay que pagar este mes). Si no hay corte pendiente, usamos
        // el balance total como cuota mínima (tarjeta sin cuota mínima definida).
        const unpaidCortes = c.statementCycles.filter(
          (s: any) => s.status !== 'paid' && s.balanceCents > 0,
        );
        const monthlyPaymentCents =
          unpaidCortes.length > 0
            ? unpaidCortes[unpaidCortes.length - 1].balanceCents   // corte más antiguo pendiente
            : c.totalBalanceCents;

        return {
          _id: `cc_${c._id.toString()}`,
          alias: c.alias,
          creditorName: c.issuer,
          remainingCents: c.totalBalanceCents,
          monthlyPaymentCents: Math.max(monthlyPaymentCents, 1),
          interestRate: 0,  // no rastreamos tasa de interés por tarjeta (MVP)
          debtType: 'credit_card',
          source: 'credit_card' as const,
        };
      });

    const activeDebts = [...loanDebts, ...cardDebts];

    if (activeDebts.length === 0) {
      throw new BadRequestException('No hay deudas activas para calcular el plan');
    }

    const snowball = this.calculateSnowball([...activeDebts], extraPaymentCents);
    const avalanche = this.calculateAvalanche([...activeDebts], extraPaymentCents);
    const manual = this.calculateManual([...activeDebts], extraPaymentCents, options.manualOrder);

    const totalLoanDebt = loanDebts.reduce((s, d) => s + d.remainingCents, 0);
    const totalCardDebt = cardDebts.reduce((s, d) => s + d.remainingCents, 0);

    return {
      snowball,
      avalanche,
      manual,
      recommendation: this.getRecommendation(snowball, avalanche),
      extraPaymentCents,
      extraPaymentFormatted: `Q${(extraPaymentCents / 100).toFixed(2)}`,
      summary: {
        totalLoanDebtCents: totalLoanDebt,
        totalLoanDebtFormatted: `Q${(totalLoanDebt / 100).toFixed(2)}`,
        totalCardDebtCents: totalCardDebt,
        totalCardDebtFormatted: `Q${(totalCardDebt / 100).toFixed(2)}`,
        grandTotalCents: totalLoanDebt + totalCardDebt,
        grandTotalFormatted: `Q${((totalLoanDebt + totalCardDebt) / 100).toFixed(2)}`,
        loanCount: loanDebts.length,
        cardCount: cardDebts.length,
      },
    };
  }

  /**
   * Método Bola de Nieve: pagar deudas de menor a mayor saldo
   * Ventaja psicológica: ganar momentum cerrando deudas pequeñas rápido
   */
  calculateSnowball(debts: any[], extraPaymentCents: number) {
    const sorted = [...debts].sort((a, b) => a.remainingCents - b.remainingCents);
    return this.simulatePayoff(sorted, extraPaymentCents, 'snowball');
  }

  /**
   * Método Avalancha: pagar deudas de mayor a menor tasa de interés
   * Ventaja matemática: minimiza intereses pagados
   */
  calculateAvalanche(debts: any[], extraPaymentCents: number) {
    const sorted = [...debts].sort((a, b) => b.interestRate - a.interestRate);
    return this.simulatePayoff(sorted, extraPaymentCents, 'avalanche');
  }

  /**
   * Método Manual: orden personalizado por el usuario
   */
  calculateManual(debts: any[], extraPaymentCents: number, manualOrder?: string[]) {
    let sorted = [...debts];
    if (manualOrder && manualOrder.length > 0) {
      // Ordenar según el array de IDs proporcionado
      sorted = manualOrder
        .map((id) => debts.find((d) => d._id === id))
        .filter((d) => !!d);

      // Agregar las deudas que no están en manualOrder al final
      const includedIds = new Set(manualOrder);
      const remaining = debts.filter((d) => !includedIds.has(d._id));
      sorted = [...sorted, ...remaining];
    }
    return this.simulatePayoff(sorted, extraPaymentCents, 'manual');
  }

  /**
   * Simulación mes a mes del pago de deudas
   * Aplica:
   *   - Pagos mínimos (cuota mensual) a todas las deudas
   *   - Pago extra a la deuda activa según orden
   *   - Cuando una deuda se paga, su pago mínimo + extra se suma a la siguiente
   */
  private simulatePayoff(orderedDebts: any[], extraPaymentCents: number, method: string) {
    // Clonar las deudas para no mutarlas
    const debts = orderedDebts.map((d) => ({
      _id: d._id,
      alias: d.alias,
      creditorName: d.creditorName,
      originalRemainingCents: d.remainingCents,
      currentRemainingCents: d.remainingCents,
      monthlyPaymentCents: d.monthlyPaymentCents,
      interestRate: d.interestRate,
      debtType: (d as any).debtType || 'loan',
      source: (d as any).source || 'debt',
      payoffMonth: 0,
      monthsToPayoff: 0,
      totalInterestCents: 0,
      totalPaidCents: 0,
    }));

    let month = 0;
    const maxMonths = 600; // 50 años máximo (failsafe)
    let availableExtra = extraPaymentCents;
    const totalMinimumPayments = debts.reduce((s, d) => s + d.monthlyPaymentCents, 0);
    const totalMonthlyBudget = totalMinimumPayments + extraPaymentCents;

    while (debts.some((d) => d.currentRemainingCents > 0) && month < maxMonths) {
      month++;

      // 1. Calcular interés mensual y aplicarlo (educativo)
      for (const debt of debts) {
        if (debt.currentRemainingCents > 0 && debt.interestRate > 0) {
          const monthlyInterest = (debt.currentRemainingCents * debt.interestRate) / 100 / 12;
          debt.totalInterestCents += Math.round(monthlyInterest);
          // No agregamos interés al saldo para no volverlo infinito,
          // solo lo trackeamos como costo informativo
        }
      }

      // 2. Aplicar pagos mínimos
      let remainingBudget = totalMonthlyBudget;
      for (const debt of debts) {
        if (debt.currentRemainingCents > 0) {
          const minPayment = Math.min(debt.monthlyPaymentCents, debt.currentRemainingCents);
          debt.currentRemainingCents -= minPayment;
          debt.totalPaidCents += minPayment;
          remainingBudget -= minPayment;
        }
      }

      // 3. Aplicar pago extra a la primera deuda activa (según orden)
      for (const debt of debts) {
        if (debt.currentRemainingCents > 0 && remainingBudget > 0) {
          const extraToApply = Math.min(remainingBudget, debt.currentRemainingCents);
          debt.currentRemainingCents -= extraToApply;
          debt.totalPaidCents += extraToApply;
          remainingBudget -= extraToApply;

          if (remainingBudget <= 0) break;
        }
      }

      // 4. Marcar deudas pagadas
      for (const debt of debts) {
        if (debt.currentRemainingCents <= 0 && debt.payoffMonth === 0) {
          debt.payoffMonth = month;
          debt.monthsToPayoff = month;
        }
      }
    }

    // Calcular totales
    const totalDebtCents = debts.reduce((s, d) => s + d.originalRemainingCents, 0);
    const totalInterestCents = debts.reduce((s, d) => s + d.totalInterestCents, 0);
    const totalPaidCents = debts.reduce((s, d) => s + d.totalPaidCents, 0);
    const totalMonths = month;

    return {
      method,
      methodLabel: this.getMethodLabel(method),
      debts: debts.map((d, idx) => ({
        order: idx + 1,
        debtId: d._id,
        alias: d.alias,
        creditorName: d.creditorName,
        source: d.source,           // 'debt' | 'credit_card'
        debtType: d.debtType,       // 'loan' | 'credit_card' | etc.
        monthlyPaymentCents: d.monthlyPaymentCents,
        monthlyPaymentFormatted: `Q${(d.monthlyPaymentCents / 100).toFixed(2)}`,
        originalAmountCents: d.originalRemainingCents,
        originalAmountFormatted: `Q${(d.originalRemainingCents / 100).toFixed(2)}`,
        payoffMonth: d.payoffMonth,
        monthsToPayoff: d.monthsToPayoff,
        interestRate: d.interestRate,
        totalInterestCents: d.totalInterestCents,
        totalInterestFormatted: `Q${(d.totalInterestCents / 100).toFixed(2)}`,
      })),
      totalDebtCents,
      totalDebtFormatted: `Q${(totalDebtCents / 100).toFixed(2)}`,
      totalInterestCents,
      totalInterestFormatted: `Q${(totalInterestCents / 100).toFixed(2)}`,
      totalPaidCents,
      totalPaidFormatted: `Q${(totalPaidCents / 100).toFixed(2)}`,
      totalMonths,
      totalYears: Math.floor(totalMonths / 12),
      remainingMonths: totalMonths % 12,
      timeFormatted: this.formatTime(totalMonths),
    };
  }

  private getMethodLabel(method: string): string {
    const labels: { [key: string]: string } = {
      snowball: 'Bola de Nieve',
      avalanche: 'Avalancha',
      manual: 'Manual',
    };
    return labels[method] || method;
  }

  private formatTime(months: number): string {
    if (months === 0) return 'Inmediato';
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    const parts = [];
    if (years > 0) parts.push(`${years} año${years > 1 ? 's' : ''}`);
    if (remainingMonths > 0) parts.push(`${remainingMonths} mes${remainingMonths > 1 ? 'es' : ''}`);
    return parts.join(' y ');
  }

  /**
   * Recomendación basada en comparación de métodos
   */
  private getRecommendation(snowball: any, avalanche: any) {
    const interestSavings = snowball.totalInterestCents - avalanche.totalInterestCents;
    const monthsDiff = snowball.totalMonths - avalanche.totalMonths;

    if (interestSavings > 0 && Math.abs(interestSavings) > 10000) {
      // Si avalancha ahorra más de Q100, recomendarlo
      return {
        method: 'avalanche',
        reason: `El método Avalancha te ahorra Q${(interestSavings / 100).toFixed(2)} en intereses`,
        savingsCents: interestSavings,
        savingsFormatted: `Q${(interestSavings / 100).toFixed(2)}`,
      };
    }

    return {
      method: 'snowball',
      reason: 'El método Bola de Nieve te ayuda a ganar momentum eliminando deudas pequeñas primero',
      savingsCents: 0,
      savingsFormatted: 'Q0.00',
    };
  }
}
