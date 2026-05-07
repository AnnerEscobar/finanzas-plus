import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Closure } from './schemas/closure.schema';
import { AccountsService } from '../accounts/accounts.service';
import { CreditCardsService } from '../creditCards/creditCards.service';
import { DebtsService } from '../debts/debts.service';
import { FundsService } from '../funds/funds.service';

@Injectable()
export class ClosuresService {
  constructor(
    @InjectModel(Closure.name) private closureModel: Model<Closure>,
    private accountsService: AccountsService,
    private creditCardsService: CreditCardsService,
    private debtsService: DebtsService,
    private fundsService: FundsService,
  ) {}

  /**
   * Generar un cierre mensual capturando snapshot del estado actual
   */
  async generateClosure(userId: string, month: string) {
    // Validar formato YYYY-MM
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      throw new BadRequestException('Formato de mes inválido. Usa YYYY-MM (ej: 2026-05)');
    }

    // Verificar si ya existe
    const existing = await this.closureModel.findOne({ userId, month });
    if (existing) {
      throw new BadRequestException(`Ya existe un cierre para ${month}`);
    }

    // Capturar estado actual
    const accounts = await this.accountsService.findByUserId(userId);
    const creditCards = await this.creditCardsService.findByUserId(userId);
    const debts = await this.debtsService.findByUserId(userId);
    const funds = await this.fundsService.findByUserId(userId);

    // Crear snapshots
    const accountSnapshots = accounts.map((a) => ({
      accountId: a._id,
      alias: a.alias,
      balanceCents: a.currentBalanceCents,
    }));

    const creditCardSnapshots = creditCards.map((c) => ({
      cardId: c._id,
      alias: c.alias,
      totalBalanceCents: c.totalBalanceCents,
      availableCreditCents: c.availableCreditCents,
    }));

    const debtSnapshots = debts.map((d) => ({
      debtId: d._id,
      alias: d.alias,
      remainingCents: d.remainingCents,
      monthlyPaymentCents: d.monthlyPaymentCents,
    }));

    const fundSnapshots = funds.map((f) => ({
      fundId: f._id,
      alias: f.alias,
      currentAmountCents: f.currentAmountCents,
      targetAmountCents: f.targetAmountCents,
    }));

    // Calcular métricas resumen
    const totalAssets = accountSnapshots.reduce((s, a) => s + a.balanceCents, 0);
    const totalCreditCardDebt = creditCardSnapshots.reduce(
      (s, c) => s + c.totalBalanceCents,
      0,
    );
    const totalDebt = debtSnapshots.reduce((s, d) => s + d.remainingCents, 0);
    const totalFunds = fundSnapshots.reduce((s, f) => s + f.currentAmountCents, 0);

    // Patrimonio neto = Activos + Fondos - Deudas (tarjetas + préstamos)
    const netWorth = totalAssets + totalFunds - totalCreditCardDebt - totalDebt;

    const closure = new this.closureModel({
      userId,
      month,
      generatedAt: new Date(),
      status: 'open',
      isEditable: true,
      accountSnapshots,
      creditCardSnapshots,
      debtSnapshots,
      fundSnapshots,
      summary: {
        totalAssetsCents: totalAssets,
        totalDebtCents: totalDebt,
        totalCreditCardDebtCents: totalCreditCardDebt,
        totalFundsCents: totalFunds,
        netWorthCents: netWorth,
      },
    });

    return closure.save();
  }

  /**
   * Listar todos los cierres del usuario
   */
  async listClosures(userId: string) {
    return this.closureModel.find({ userId }).sort({ month: -1 });
  }

  /**
   * Obtener un cierre específico por mes
   */
  async getClosureByMonth(userId: string, month: string) {
    const closure = await this.closureModel.findOne({ userId, month });
    if (!closure) {
      throw new NotFoundException(`No hay cierre generado para ${month}`);
    }
    return closure;
  }

  /**
   * Obtener cierre por ID
   */
  async getClosureById(id: string, userId: string) {
    const closure = await this.closureModel.findOne({ _id: id, userId });
    if (!closure) {
      throw new NotFoundException('Cierre no encontrado');
    }
    return closure;
  }

  /**
   * Actualizar un cierre (solo si isEditable=true)
   */
  async updateClosure(id: string, userId: string, updateData: any) {
    const closure = await this.getClosureById(id, userId);

    if (!closure.isEditable || closure.status === 'closed') {
      throw new BadRequestException('Este cierre está bloqueado y no puede modificarse');
    }

    // Solo se pueden modificar los snapshots y la nota
    const allowedFields = [
      'accountSnapshots',
      'creditCardSnapshots',
      'debtSnapshots',
      'fundSnapshots',
      'note',
    ];
    const sanitizedData: any = {};
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        sanitizedData[field] = updateData[field];
      }
    }

    // Recalcular métricas si los snapshots cambiaron
    if (sanitizedData.accountSnapshots || sanitizedData.creditCardSnapshots ||
        sanitizedData.debtSnapshots || sanitizedData.fundSnapshots) {
      const accountSnaps = sanitizedData.accountSnapshots || closure.accountSnapshots;
      const cardSnaps = sanitizedData.creditCardSnapshots || closure.creditCardSnapshots;
      const debtSnaps = sanitizedData.debtSnapshots || closure.debtSnapshots;
      const fundSnaps = sanitizedData.fundSnapshots || closure.fundSnapshots;

      const totalAssets = accountSnaps.reduce((s: number, a: any) => s + a.balanceCents, 0);
      const totalCardDebt = cardSnaps.reduce((s: number, c: any) => s + c.totalBalanceCents, 0);
      const totalDebt = debtSnaps.reduce((s: number, d: any) => s + d.remainingCents, 0);
      const totalFunds = fundSnaps.reduce((s: number, f: any) => s + f.currentAmountCents, 0);

      sanitizedData.summary = {
        totalAssetsCents: totalAssets,
        totalDebtCents: totalDebt,
        totalCreditCardDebtCents: totalCardDebt,
        totalFundsCents: totalFunds,
        netWorthCents: totalAssets + totalFunds - totalCardDebt - totalDebt,
      };
    }

    const updated = await this.closureModel.findByIdAndUpdate(id, sanitizedData, { new: true });
    return updated;
  }

  /**
   * Cerrar un mes (bloquear edición)
   */
  async closeMonth(id: string, userId: string) {
    const closure = await this.getClosureById(id, userId);

    if (closure.status === 'closed') {
      throw new BadRequestException('Este cierre ya está cerrado');
    }

    closure.status = 'closed';
    closure.isEditable = false;
    closure.closedAt = new Date();

    return closure.save();
  }

  /**
   * Reabrir un mes cerrado (auditable)
   */
  async reopenMonth(id: string, userId: string) {
    const closure = await this.getClosureById(id, userId);

    if (closure.status === 'open') {
      throw new BadRequestException('Este cierre ya está abierto');
    }

    closure.status = 'open';
    closure.isEditable = true;

    return closure.save();
  }

  /**
   * Eliminar un cierre (solo si está abierto)
   */
  async deleteClosure(id: string, userId: string) {
    const closure = await this.getClosureById(id, userId);

    if (closure.status === 'closed') {
      throw new BadRequestException(
        'No se puede eliminar un cierre cerrado. Primero debes reabrirlo.',
      );
    }

    return this.closureModel.findByIdAndDelete(id);
  }

  /**
   * Get summary of all closures (for evolution chart)
   */
  async getEvolutionSummary(userId: string) {
    const closures = await this.closureModel
      .find({ userId })
      .sort({ month: 1 })
      .select('month summary');

    return closures.map((c) => ({
      month: c.month,
      totalAssetsCents: c.summary.totalAssetsCents,
      totalDebtCents: c.summary.totalDebtCents,
      totalCreditCardDebtCents: c.summary.totalCreditCardDebtCents,
      totalFundsCents: c.summary.totalFundsCents,
      netWorthCents: c.summary.netWorthCents,
    }));
  }
}
