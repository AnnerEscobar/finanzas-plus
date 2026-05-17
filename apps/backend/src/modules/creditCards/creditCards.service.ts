import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreditCard, CreditCardCorte, Charge, ExtraFinanciamiento } from './schemas/creditCard.schema';
import { AccountsService } from '../accounts/accounts.service';
import { MovementsService } from '../movements/movements.service';

@Injectable()
export class CreditCardsService {
  constructor(
    @InjectModel(CreditCard.name) private creditCardModel: Model<CreditCard>,
    private accountsService: AccountsService,
    private movementsService: MovementsService,
  ) {}

  /**
   * Calcular fecha de vencimiento de pago basado en cierre y paymentDueDay
   */
  private calculatePaymentDueDate(closingDate: Date, paymentDueDay: number): Date {
    const due = new Date(closingDate);
    if (paymentDueDay > closingDate.getDate()) {
      // Mismo mes
      due.setDate(paymentDueDay);
    } else {
      // Mes siguiente
      due.setMonth(due.getMonth() + 1);
      due.setDate(paymentDueDay);
    }
    return due;
  }

  /**
   * Generar el corte actual basado en la fecha de hoy y cutoffDay
   * Returns: { openingDate, closingDate, cutoffDay }
   */
  private generateCurrentCorte(
    cutoffDay: number,
    paymentDueDay: number,
    cycleNumber: number,
  ): Partial<CreditCardCorte> {
    const today = new Date();
    const day = today.getDate();
    const month = today.getMonth();
    const year = today.getFullYear();

    let openingDate: Date;
    let closingDate: Date;

    if (day > cutoffDay) {
      // Corte abierto: del cutoffDay+1 actual al cutoffDay del siguiente mes
      openingDate = new Date(year, month, cutoffDay + 1);
      closingDate = new Date(year, month + 1, cutoffDay);
    } else {
      // Corte abierto: del cutoffDay+1 anterior al cutoffDay actual
      openingDate = new Date(year, month - 1, cutoffDay + 1);
      closingDate = new Date(year, month, cutoffDay);
    }

    const paymentDueDate = this.calculatePaymentDueDate(closingDate, paymentDueDay);

    return {
      cycleNumber,
      openingDate,
      closingDate,
      paymentDueDate,
      cutoffDay,
      charges: [],
      payments: [],
      chargesTotal: 0,
      paymentsTotal: 0,
      balanceCents: 0,
      interestCents: 0,
      status: 'open',
      isClosed: false,
    };
  }

  /**
   * Crear nueva tarjeta con cutoffDay y paymentDueDay configurables
   */
  async createCard(userId: string, cardData: any) {
    if (!cardData.creditLimitCents || cardData.creditLimitCents <= 0) {
      throw new BadRequestException('El límite de crédito debe ser mayor a 0');
    }
    if (!cardData.cutoffDay || cardData.cutoffDay < 1 || cardData.cutoffDay > 31) {
      throw new BadRequestException('cutoffDay debe estar entre 1 y 31');
    }
    if (!cardData.paymentDueDay || cardData.paymentDueDay < 1 || cardData.paymentDueDay > 31) {
      throw new BadRequestException('paymentDueDay debe estar entre 1 y 31');
    }

    const initialCorte = this.generateCurrentCorte(
      cardData.cutoffDay,
      cardData.paymentDueDay,
      1,
    );

    const card = new this.creditCardModel({
      userId,
      alias: cardData.alias,
      cardType: 'credit',
      issuer: cardData.issuer,
      maskedNumber: cardData.maskedNumber,
      holderName: cardData.holderName,
      creditLimitCents: cardData.creditLimitCents,
      cutoffDay: cardData.cutoffDay,
      paymentDueDay: cardData.paymentDueDay,
      statementCycles: [initialCorte],
      extraFinancings: [],
      totalBalanceCents: 0,
      availableCreditCents: cardData.creditLimitCents,
      isActive: true,
    });

    return card.save();
  }

  async findByUserId(userId: string) {
    return this.creditCardModel.find({ userId, isActive: true });
  }

  async findById(id: string) {
    return this.creditCardModel.findById(id);
  }

  async findByIdAndUser(id: string, userId: string) {
    const card = await this.creditCardModel.findOne({ _id: id, userId });
    if (!card) {
      throw new NotFoundException('Tarjeta de crédito no encontrada');
    }
    return card;
  }

  async updateCard(id: string, updateData: any) {
    delete updateData.userId;
    delete updateData.statementCycles;
    delete updateData.extraFinancings;
    delete updateData._id;

    const card = await this.creditCardModel.findByIdAndUpdate(id, updateData, { new: true });
    if (!card) {
      throw new NotFoundException('Tarjeta de crédito no encontrada');
    }
    return card;
  }

  async deleteCard(id: string) {
    const card = await this.creditCardModel.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true },
    );
    if (!card) {
      throw new NotFoundException('Tarjeta de crédito no encontrada');
    }
    return card;
  }

  /**
   * Saldo total: suma de saldos de cortes que NO están pagados
   */
  async getTotalBalance(userId: string): Promise<number> {
    const cards = await this.findByUserId(userId);
    return cards.reduce((sum, card) => sum + card.totalBalanceCents, 0);
  }

  /**
   * Recalcular totales de la tarjeta
   */
  private recalculateCardTotals(card: any) {
    // Saldo = suma de saldos de cortes NO pagados
    card.totalBalanceCents = card.statementCycles.reduce(
      (sum: number, c: any) =>
        sum + (c.status !== 'paid' ? Math.max(0, c.balanceCents) : 0),
      0,
    );
    card.availableCreditCents = Math.max(0, card.creditLimitCents - card.totalBalanceCents);
  }

  /**
   * Recalcular totales de un corte específico
   */
  private recalculateCorteTotals(corte: any) {
    corte.chargesTotal = corte.charges.reduce((s: number, c: any) => s + c.amountCents, 0);
    corte.paymentsTotal = corte.payments.reduce((s: number, p: any) => s + p.amountCents, 0);
    corte.balanceCents = corte.chargesTotal - corte.paymentsTotal;
  }

  /**
   * Registrar un cargo (compra) en un corte abierto
   * Categoría OBLIGATORIA
   */
  async recordCharge(userId: string, cardId: string, data: any) {
    const card = await this.findByIdAndUser(cardId, userId);

    const corte = card.statementCycles.find((c) => c._id.toString() === data.corteId);
    if (!corte) {
      throw new NotFoundException('Corte de estado no encontrado');
    }

    if (corte.status !== 'open') {
      throw new BadRequestException('No se puede agregar cargos a un corte cerrado o pagado');
    }

    if (!data.categoryId) {
      throw new BadRequestException('La categoría es obligatoria para los cargos');
    }
    if (!data.amountCents || data.amountCents <= 0) {
      throw new BadRequestException('El monto debe ser mayor a 0');
    }

    const charge: any = {
      description: data.description,
      amountCents: data.amountCents,
      date: data.date ? new Date(data.date) : new Date(),
      categoryId: data.categoryId,
      note: data.note || '',
      createdAt: new Date(),
    };

    corte.charges.push(charge);
    this.recalculateCorteTotals(corte);
    this.recalculateCardTotals(card);

    return card.save();
  }

  async getCorteCharges(userId: string, cardId: string, corteId: string) {
    const card = await this.findByIdAndUser(cardId, userId);
    const corte = card.statementCycles.find((c) => c._id.toString() === corteId);
    if (!corte) {
      throw new NotFoundException('Corte de estado no encontrado');
    }
    return corte.charges;
  }

  async deleteCharge(userId: string, cardId: string, corteId: string, chargeId: string) {
    const card = await this.findByIdAndUser(cardId, userId);
    const corte = card.statementCycles.find((c) => c._id.toString() === corteId);

    if (!corte) {
      throw new NotFoundException('Corte de estado no encontrado');
    }
    if (corte.status === 'paid') {
      throw new BadRequestException('No se puede eliminar cargos de un corte pagado');
    }

    const charge = corte.charges.find((ch) => ch._id.toString() === chargeId);
    if (!charge) {
      throw new NotFoundException('Cargo no encontrado');
    }

    // No permitir eliminar cargos que son cuotas de extrafinanciamientos
    if (charge.extraFinancingId) {
      throw new BadRequestException(
        'Este cargo es una cuota de un extrafinanciamiento. Cancela el extrafinanciamiento si deseas eliminarlo.',
      );
    }

    corte.charges = corte.charges.filter((ch) => ch._id.toString() !== chargeId);
    this.recalculateCorteTotals(corte);
    this.recalculateCardTotals(card);

    return card.save();
  }

  /**
   * Pago manual al corte (parcial o total) - método legacy
   */
  async recordPayment(userId: string, cardId: string, data: any) {
    const card = await this.findByIdAndUser(cardId, userId);

    const corte = card.statementCycles.find((c) => c._id.toString() === data.corteId);
    if (!corte) {
      throw new NotFoundException('Corte de estado no encontrado');
    }

    if (corte.status === 'paid') {
      throw new BadRequestException('Este corte ya está completamente pagado');
    }

    const payment: any = {
      amountCents: data.amountCents,
      date: data.date ? new Date(data.date) : new Date(),
      accountId: data.accountId,
      note: data.note || '',
      createdAt: new Date(),
    };

    corte.payments.push(payment);
    this.recalculateCorteTotals(corte);
    this.recalculateCardTotals(card);

    return card.save();
  }

  async getCortePayments(userId: string, cardId: string, corteId: string) {
    const card = await this.findByIdAndUser(cardId, userId);
    const corte = card.statementCycles.find((c) => c._id.toString() === corteId);
    if (!corte) {
      throw new NotFoundException('Corte de estado no encontrado');
    }
    return corte.payments;
  }

  async getStatementDetail(userId: string, cardId: string, corteId: string) {
    const card = await this.findByIdAndUser(cardId, userId);
    const corte = card.statementCycles.find((c) => c._id.toString() === corteId);

    if (!corte) {
      throw new NotFoundException('Corte de estado no encontrado');
    }

    return {
      corte,
      charges: corte.charges,
      payments: corte.payments,
      balance: corte.balanceCents,
    };
  }

  async getCardSummary(userId: string, cardId: string) {
    const card = await this.findByIdAndUser(cardId, userId);

    return {
      card,
      currentBalance: card.totalBalanceCents,
      currentBalanceFormatted: `Q${(card.totalBalanceCents / 100).toFixed(2)}`,
      availableCredit: card.availableCreditCents,
      availableCreditFormatted: `Q${(card.availableCreditCents / 100).toFixed(2)}`,
      creditLimit: card.creditLimitCents,
      creditLimitFormatted: `Q${(card.creditLimitCents / 100).toFixed(2)}`,
    };
  }

  // ==========================================================================
  // EXTRAFINANCIAMIENTOS (Sprint 5)
  // ==========================================================================

  /**
   * Crear extrafinanciamiento (compra a cuotas)
   * Si el corte abierto aún NO contiene una cuota de este extrafinanciamiento,
   * se aplica la primera cuota inmediatamente.
   */
  async createExtraFinanciamiento(userId: string, cardId: string, data: any) {
    const card = await this.findByIdAndUser(cardId, userId);

    if (!data.description) {
      throw new BadRequestException('Descripción es requerida');
    }
    if (!data.totalAmountCents || data.totalAmountCents <= 0) {
      throw new BadRequestException('Monto total debe ser mayor a 0');
    }
    if (!data.totalInstallments || data.totalInstallments < 1) {
      throw new BadRequestException('Total de cuotas debe ser al menos 1');
    }
    if (!data.categoryId) {
      throw new BadRequestException('Categoría es requerida');
    }

    const monthlyAmountCents = Math.round(data.totalAmountCents / data.totalInstallments);

    // Cuotas ya pagadas antes de este registro (compras en curso)
    const paidInstallments = Math.max(0, Math.min(
      parseInt(data.paidInstallments ?? 0, 10),
      data.totalInstallments - 1, // no puede estar ya completamente pagado
    ));

    if (paidInstallments >= data.totalInstallments) {
      throw new BadRequestException(
        'Las cuotas pagadas no pueden ser iguales o mayores al total de cuotas',
      );
    }

    const ef: any = {
      description: data.description,
      totalAmountCents: data.totalAmountCents,
      totalInstallments: data.totalInstallments,
      paidInstallments,
      monthlyAmountCents,
      startDate: data.startDate ? new Date(data.startDate) : new Date(),
      categoryId: data.categoryId,
      status: 'active',
      note: data.note || '',
      createdAt: new Date(),
    };

    card.extraFinancings.push(ef);

    // Aplicar la SIGUIENTE cuota (paidInstallments + 1) al corte abierto actual
    const openCorte = card.statementCycles.find((c) => c.status === 'open');
    if (openCorte) {
      const newEf = card.extraFinancings[card.extraFinancings.length - 1];
      const nextInstallment = paidInstallments + 1;
      this.applyExtraFinancingCuota(card, openCorte, newEf, nextInstallment);
    }

    this.recalculateCardTotals(card);
    return card.save();
  }

  /**
   * Aplica una cuota específica de un extrafinanciamiento al corte dado
   */
  private applyExtraFinancingCuota(
    card: any,
    corte: any,
    ef: any,
    installmentNumber: number,
  ) {
    const charge: any = {
      description: `Cuota ${installmentNumber}/${ef.totalInstallments} - ${ef.description}`,
      amountCents: ef.monthlyAmountCents,
      date: new Date(),
      categoryId: ef.categoryId,
      extraFinancingId: ef._id,
      installmentNumber,
      totalInstallments: ef.totalInstallments,
      note: 'Cuota automática de extrafinanciamiento',
      createdAt: new Date(),
    };

    corte.charges.push(charge);
    ef.lastAppliedCorteId = corte._id;
    this.recalculateCorteTotals(corte);

    // Si esta es la última cuota, marcar el EF como completado
    // (ya no hay más cuotas que programar, aunque el corte aún no se haya pagado)
    if (installmentNumber >= ef.totalInstallments) {
      ef.status = 'completed';
    }
  }

  /**
   * Obtener todos los extrafinanciamientos de una tarjeta
   */
  async getExtraFinancings(userId: string, cardId: string) {
    const card = await this.findByIdAndUser(cardId, userId);
    return card.extraFinancings;
  }

  /**
   * Cancelar un extrafinanciamiento (no afecta cuotas ya aplicadas)
   */
  async cancelExtraFinanciamiento(userId: string, cardId: string, efId: string) {
    const card = await this.findByIdAndUser(cardId, userId);
    const ef = card.extraFinancings.find((e) => e._id.toString() === efId);
    if (!ef) {
      throw new NotFoundException('Extrafinanciamiento no encontrado');
    }
    ef.status = 'completed';
    return card.save();
  }

  // ==========================================================================
  // CIERRE DE CORTE (Sprint 5)
  // ==========================================================================

  /**
   * Cerrar el corte abierto y crear el siguiente
   * - Aplica cuotas pendientes de extrafinanciamientos al nuevo corte
   * - Marca el corte como 'closed_unpaid'
   */
  async closeCurrentCorte(userId: string, cardId: string) {
    const card = await this.findByIdAndUser(cardId, userId);

    const openCorte = card.statementCycles.find((c) => c.status === 'open');
    if (!openCorte) {
      throw new BadRequestException('No hay corte abierto');
    }

    // Cerrar corte
    openCorte.status = 'closed_unpaid';
    openCorte.isClosed = true;
    openCorte.closedAt = new Date();

    // Crear el siguiente corte
    const lastCycleNumber = Math.max(...card.statementCycles.map((c) => c.cycleNumber || 0));
    const newCorte = this.generateCurrentCorteAfter(
      openCorte.closingDate,
      card.cutoffDay,
      card.paymentDueDay,
      lastCycleNumber + 1,
    );

    card.statementCycles.push(newCorte as any);
    const createdNewCorte = card.statementCycles[card.statementCycles.length - 1];

    // Aplicar cuotas pendientes de extrafinanciamientos activos
    for (const ef of card.extraFinancings) {
      if (ef.status !== 'active') continue;

      const lastApplied = this.getLastAppliedInstallmentNumber(card, ef);

      // Si la última cuota ya está aplicada en un corte anterior, marcar completado
      if (lastApplied >= ef.totalInstallments) {
        ef.status = 'completed';
        continue;
      }

      if (ef.paidInstallments < ef.totalInstallments) {
        const nextInstallmentNumber = lastApplied + 1;
        if (nextInstallmentNumber <= ef.totalInstallments) {
          // applyExtraFinancingCuota marca como completed si es la última cuota
          this.applyExtraFinancingCuota(card, createdNewCorte, ef, nextInstallmentNumber);
        }
      }
    }

    this.recalculateCardTotals(card);
    return card.save();
  }

  /**
   * Generar el siguiente corte después del corte cerrado
   */
  private generateCurrentCorteAfter(
    previousClosingDate: Date,
    cutoffDay: number,
    paymentDueDay: number,
    cycleNumber: number,
  ): Partial<CreditCardCorte> {
    const opening = new Date(previousClosingDate);
    opening.setDate(opening.getDate() + 1);

    const closing = new Date(opening);
    closing.setMonth(closing.getMonth() + 1);
    closing.setDate(cutoffDay);
    if (closing < opening) {
      closing.setMonth(closing.getMonth() + 1);
    }

    const paymentDueDate = this.calculatePaymentDueDate(closing, paymentDueDay);

    return {
      cycleNumber,
      openingDate: opening,
      closingDate: closing,
      paymentDueDate,
      cutoffDay,
      charges: [],
      payments: [],
      chargesTotal: 0,
      paymentsTotal: 0,
      balanceCents: 0,
      interestCents: 0,
      status: 'open',
      isClosed: false,
    };
  }

  /**
   * Devuelve el último número de cuota aplicado para un extrafinanciamiento dado.
   * Usa el installmentNumber real de cada cargo (no cuenta físicamente).
   * Esto garantiza que al crear con paidInstallments=N, la siguiente cuota sea N+2, no 2.
   */
  private getLastAppliedInstallmentNumber(card: any, ef: any): number {
    let max = 0;
    for (const corte of card.statementCycles) {
      for (const charge of corte.charges) {
        if (charge.extraFinancingId && charge.extraFinancingId.toString() === ef._id.toString()) {
          const num = charge.installmentNumber ?? 0;
          if (num > max) max = num;
        }
      }
    }
    return max;
  }

  // ==========================================================================
  // REPARACIÓN DE CUOTAS EN CORTE ABIERTO
  // ==========================================================================

  /**
   * Elimina las cuotas de extrafinanciamientos mal numeradas del corte abierto
   * y las vuelve a aplicar con el número correcto.
   * Se usa una sola vez para corregir datos migrados con el bug de countAppliedInstallments.
   */
  async repairOpenCorteInstallments(userId: string, cardId: string) {
    const card = await this.findByIdAndUser(cardId, userId);

    const openCorte = card.statementCycles.find((c) => c.status === 'open');
    if (!openCorte) {
      throw new BadRequestException('No hay corte abierto para reparar');
    }

    // Quitar todas las cuotas de EF del corte abierto
    (openCorte as any).charges = (openCorte as any).charges.filter(
      (ch: any) => !ch.extraFinancingId,
    );

    // Re-aplicar cada EF activo con el número correcto
    // (getLastAppliedInstallmentNumber ya no cuenta el corte abierto porque lo limpiamos)
    for (const ef of card.extraFinancings) {
      if (ef.status !== 'active') continue;

      const lastApplied = this.getLastAppliedInstallmentNumber(card, ef);

      // Si la última cuota ya está aplicada en un corte anterior (cerrado),
      // marcar como completado sin agregar nueva cuota al corte abierto
      if (lastApplied >= ef.totalInstallments) {
        ef.status = 'completed';
        continue;
      }

      // Si aún hay cuotas pendientes, aplicar la siguiente
      if (ef.paidInstallments < ef.totalInstallments) {
        const nextInstallmentNumber = lastApplied + 1;
        if (nextInstallmentNumber <= ef.totalInstallments) {
          // applyExtraFinancingCuota marca como completed si es la última
          this.applyExtraFinancingCuota(card, openCorte, ef, nextInstallmentNumber);
        }
      }
    }

    this.recalculateCorteTotals(openCorte);
    this.recalculateCardTotals(card);
    return card.save();
  }

  // ==========================================================================
  // ABONO PARCIAL AL CORTE
  // ==========================================================================

  /**
   * Registrar un abono parcial a un corte cerrado.
   * - Descuenta el monto de la cuenta seleccionada
   * - Agrega el pago a corte.payments
   * - El corte sigue en 'closed_unpaid' hasta que balanceCents llegue a 0
   * - NO genera movimientos de gasto (eso ocurre al pagar el corte completo)
   */
  async abonarCorte(userId: string, cardId: string, corteId: string, data: any) {
    const card = await this.findByIdAndUser(cardId, userId);

    const corte = card.statementCycles.find((c) => c._id.toString() === corteId);
    if (!corte) {
      throw new NotFoundException('Corte no encontrado');
    }
    if (corte.status === 'paid') {
      throw new BadRequestException('Este corte ya está completamente pagado');
    }
    if (corte.status === 'open') {
      throw new BadRequestException('No se puede abonar a un corte abierto. Cierra el corte primero.');
    }

    const amountCents: number = data.amountCents;
    if (!amountCents || amountCents <= 0) {
      throw new BadRequestException('El monto del abono debe ser mayor a 0');
    }
    if (amountCents > corte.balanceCents) {
      throw new BadRequestException(
        `El abono (${(amountCents / 100).toFixed(2)}) supera el saldo pendiente del corte (${(corte.balanceCents / 100).toFixed(2)})`,
      );
    }

    // Validar cuenta y saldo disponible
    const account = await this.accountsService.findByIdAndUser(data.accountId, userId);
    if (account.currentBalanceCents < amountCents) {
      throw new BadRequestException(
        `Saldo insuficiente en "${account.alias}". Disponible: Q${(account.currentBalanceCents / 100).toFixed(2)}`,
      );
    }

    // Descontar de la cuenta
    await this.accountsService.decreaseBalance(data.accountId, amountCents);

    // Registrar el abono en el corte
    const payment: any = {
      amountCents,
      date: data.date ? new Date(data.date) : new Date(),
      accountId: new Types.ObjectId(data.accountId),
      note: data.note || 'Abono parcial',
      createdAt: new Date(),
    };
    corte.payments.push(payment);

    this.recalculateCorteTotals(corte);
    this.recalculateCardTotals(card);

    return card.save();
  }

  // ==========================================================================
  // PAGAR CORTE COMPLETO (Sprint 5)
  // ==========================================================================

  /**
   * Pagar el corte completo desde una cuenta:
   * 1. Descuenta el saldo del corte de la cuenta
   * 2. Genera UN movimiento de gasto por cada categoría única
   * 3. Marca corte como 'paid'
   * 4. Incrementa paidInstallments en cada extrafinanciamiento que tenía cuota
   */
  async payCorte(userId: string, cardId: string, corteId: string, accountId: string) {
    const card = await this.findByIdAndUser(cardId, userId);

    const corte = card.statementCycles.find((c) => c._id.toString() === corteId);
    if (!corte) {
      throw new NotFoundException('Corte no encontrado');
    }
    if (corte.status === 'paid') {
      throw new BadRequestException('Este corte ya está pagado');
    }

    const remainingCents = corte.balanceCents;
    if (remainingCents <= 0) {
      throw new BadRequestException('No hay saldo a pagar en este corte');
    }

    // Validar cuenta y saldo
    const account = await this.accountsService.findByIdAndUser(accountId, userId);
    if (account.currentBalanceCents < remainingCents) {
      throw new BadRequestException(
        `Saldo insuficiente en ${account.alias}. Disponible: Q${(account.currentBalanceCents / 100).toFixed(2)}`,
      );
    }

    // 1. Agrupar cargos por categoría
    const categoryGroups = new Map<string, number>();
    for (const charge of corte.charges) {
      const catId = charge.categoryId.toString();
      categoryGroups.set(catId, (categoryGroups.get(catId) || 0) + charge.amountCents);
    }

    // Si había pagos parciales previos, distribuir proporcionalmente al saldo real
    const totalCharges = corte.chargesTotal;
    const ratio = totalCharges > 0 ? remainingCents / totalCharges : 1;

    const payDate = new Date();
    const noteBase = `Pago tarjeta ${card.alias} - Corte #${corte.cycleNumber}`;

    // 2. Crear UN movimiento de gasto por categoría (sin tocar el saldo aquí)
    for (const [categoryId, amount] of categoryGroups.entries()) {
      const adjustedAmount = Math.round(amount * ratio);
      if (adjustedAmount > 0) {
        await this.movementsService.createMovementRecord(userId, {
          type: 'expense',
          amountCents: adjustedAmount,
          date: payDate,
          accountId,
          categoryId,
          paymentMethod: 'debit',
          note: noteBase,
        });
      }
    }

    // 3. UN solo descuento de saldo por el total del corte
    await this.accountsService.decreaseBalance(accountId, remainingCents);

    // 3. Registrar pago
    const payment: any = {
      amountCents: remainingCents,
      date: new Date(),
      accountId: new Types.ObjectId(accountId),
      note: 'Pago completo del corte',
      createdAt: new Date(),
    };
    corte.payments.push(payment);

    // 4. Marcar corte como pagado
    corte.status = 'paid';
    corte.paidAt = new Date();
    corte.paidFromAccountId = new Types.ObjectId(accountId);

    // 5. Incrementar paidInstallments en extrafinanciamientos
    const efIdsInCorte = new Set<string>();
    for (const charge of corte.charges) {
      if (charge.extraFinancingId) {
        efIdsInCorte.add(charge.extraFinancingId.toString());
      }
    }
    for (const efId of efIdsInCorte) {
      const ef = card.extraFinancings.find((e) => e._id.toString() === efId);
      if (ef) {
        ef.paidInstallments = Math.min(ef.paidInstallments + 1, ef.totalInstallments);
        if (ef.paidInstallments >= ef.totalInstallments) {
          ef.status = 'completed';
        }
      }
    }

    this.recalculateCorteTotals(corte);
    this.recalculateCardTotals(card);

    return card.save();
  }

  /**
   * Obtener cortes pagados de una tarjeta en un período
   */
  async getPaidCortesInPeriod(
    userId: string,
    fromDate: Date,
    toDate: Date,
  ) {
    const cards = await this.findByUserId(userId);
    const result: Array<{ card: any; corte: any }> = [];

    for (const card of cards) {
      for (const corte of card.statementCycles) {
        if (
          corte.status === 'paid' &&
          corte.paidAt &&
          corte.paidAt >= fromDate &&
          corte.paidAt <= toDate
        ) {
          result.push({ card, corte });
        }
      }
    }

    return result;
  }

  // ==========================================================================
  // MIGRACIÓN Sprint 5 — parchar tarjetas existentes
  // ==========================================================================

  /**
   * Migra todas las tarjetas del usuario que no tienen los campos Sprint 5.
   * Aplica defaults seguros y recalcula paymentDueDate de cada corte.
   *
   * @param userId        dueño de las tarjetas
   * @param cardDefaults  mapa opcional { cardId -> { cutoffDay, paymentDueDay } }
   *                      si no se provee se usan los defaults del schema (15/10)
   */
  async migrateSpring5(
    userId: string,
    cardDefaults?: Record<string, { cutoffDay: number; paymentDueDay: number }>,
  ) {
    // Buscar TODAS las tarjetas (activas e inactivas) del usuario
    const cards = await this.creditCardModel.find({ userId });
    const results: any[] = [];

    for (const card of cards) {
      const overrides = cardDefaults?.[card._id.toString()];
      let changed = false;

      // Rellenar cutoffDay / paymentDueDay si faltan
      if (!card.cutoffDay) {
        card.cutoffDay = overrides?.cutoffDay ?? 15;
        changed = true;
      }
      if (!card.paymentDueDay) {
        card.paymentDueDay = overrides?.paymentDueDay ?? 10;
        changed = true;
      }

      // Rellenar paymentDueDate en cada corte que no lo tenga
      for (const corte of card.statementCycles) {
        if (!corte.paymentDueDate) {
          corte.paymentDueDate = this.calculatePaymentDueDate(
            corte.closingDate,
            card.paymentDueDay,
          );
          changed = true;
        }
        // Migrar status de cortes cerrados que usaban el campo viejo
        if ((corte as any).status === 'closing' || (corte as any).status === 'closed') {
          (corte as any).status = 'closed_unpaid';
          changed = true;
        }
        if (!corte.status) {
          (corte as any).status = corte.isClosed ? 'closed_unpaid' : 'open';
          changed = true;
        }
      }

      if (changed) {
        this.recalculateCardTotals(card);
        await card.save();
      }

      results.push({
        cardId: card._id.toString(),
        alias: card.alias,
        cutoffDay: card.cutoffDay,
        paymentDueDay: card.paymentDueDay,
        cortesPatched: card.statementCycles.length,
        changed,
      });
    }

    return {
      message: `Migración Sprint 5 completada para ${results.length} tarjeta(s)`,
      cards: results,
    };
  }
}
