import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Debt, DebtPayment } from './schemas/debt.schema';

@Injectable()
export class DebtsService {
  constructor(
    @InjectModel(Debt.name) private debtModel: Model<Debt>,
  ) {}

  /**
   * Create a new debt
   */
  async createDebt(userId: string, data: any) {
    if (!data.originalAmountCents || data.originalAmountCents <= 0) {
      throw new BadRequestException('El monto original debe ser mayor a 0');
    }
    if (!data.alias || !data.creditorName) {
      throw new BadRequestException('Alias y acreedor son requeridos');
    }

    const originalAmountCents = data.originalAmountCents;
    const monthlyPaymentCents = data.monthlyPaymentCents || 0;
    const totalInstallments = data.totalInstallments || 0;
    const paidInstallments = data.paidInstallments || 0;

    // Calcular saldo restante:
    // 1) Si el usuario lo proporcionó explícitamente, usar ese valor (override)
    // 2) Si hay cuotas pagadas y cuota mensual, calcular automáticamente:
    //    remaining = original - (paidInstallments × monthlyPayment)
    // 3) Si no, asumir que es deuda nueva: remaining = original
    let remainingCents: number;
    if (data.remainingCents !== undefined && data.remainingCents !== null) {
      remainingCents = data.remainingCents;
    } else if (paidInstallments > 0 && monthlyPaymentCents > 0) {
      const calculated = originalAmountCents - (paidInstallments * monthlyPaymentCents);
      remainingCents = Math.max(0, calculated);
    } else {
      remainingCents = originalAmountCents;
    }

    // Validación: saldo restante no puede exceder el original
    if (remainingCents > originalAmountCents) {
      throw new BadRequestException(
        'El saldo restante no puede ser mayor que el monto original',
      );
    }

    // Determinar status basado en saldo
    const status = remainingCents === 0 ? 'paid' : 'active';

    const debt = new this.debtModel({
      userId,
      alias: data.alias,
      creditorName: data.creditorName,
      debtType: data.debtType || 'loan',
      originalAmountCents,
      remainingCents,
      interestRate: data.interestRate || 0,
      monthlyPaymentCents,
      totalInstallments,
      paidInstallments,
      startDate: data.startDate ? new Date(data.startDate) : new Date(),
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      payments: [],
      status,
      note: data.note || '',
      isActive: true,
    });

    return debt.save();
  }

  /**
   * Find all active debts for a user
   */
  async findByUserId(userId: string) {
    return this.debtModel.find({ userId, isActive: true }).sort({ createdAt: -1 });
  }

  /**
   * Find debt by ID
   */
  async findById(id: string) {
    return this.debtModel.findById(id);
  }

  /**
   * Find debt by ID with user validation
   */
  async findByIdAndUser(id: string, userId: string) {
    const debt = await this.debtModel.findOne({ _id: id, userId });
    if (!debt) {
      throw new NotFoundException('Deuda no encontrada');
    }
    return debt;
  }

  /**
   * Update debt details
   */
  async updateDebt(id: string, userId: string, updateData: any) {
    await this.findByIdAndUser(id, userId);

    // No permitir cambiar userId, payments, _id directamente
    delete updateData.userId;
    delete updateData.payments;
    delete updateData._id;

    const debt = await this.debtModel.findByIdAndUpdate(id, updateData, { new: true });
    if (!debt) {
      throw new NotFoundException('Deuda no encontrada');
    }
    return debt;
  }

  /**
   * Soft delete debt (mark as inactive)
   */
  async deleteDebt(id: string, userId: string) {
    await this.findByIdAndUser(id, userId);

    const debt = await this.debtModel.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true },
    );
    if (!debt) {
      throw new NotFoundException('Deuda no encontrada');
    }
    return debt;
  }

  /**
   * Record a payment against a debt
   */
  async recordPayment(id: string, userId: string, data: any) {
    const debt = await this.findByIdAndUser(id, userId);

    if (debt.status !== 'active') {
      throw new BadRequestException('Solo se pueden registrar pagos en deudas activas');
    }

    if (!data.amountCents || data.amountCents <= 0) {
      throw new BadRequestException('El monto del pago debe ser mayor a 0');
    }

    if (data.amountCents > debt.remainingCents) {
      throw new BadRequestException(
        `El pago (Q${(data.amountCents / 100).toFixed(2)}) excede el saldo restante (Q${(debt.remainingCents / 100).toFixed(2)})`,
      );
    }

    // Validar desglose capital/interés si fue proporcionado
    const principalCents = data.principalCents || 0;
    const interestCents = data.interestCents || 0;
    if (principalCents > 0 || interestCents > 0) {
      if (principalCents + interestCents !== data.amountCents) {
        throw new BadRequestException(
          'La suma de capital + interés debe ser igual al monto del pago',
        );
      }
    }

    const payment: any = {
      amountCents: data.amountCents,
      date: data.date ? new Date(data.date) : new Date(),
      accountId: data.accountId,
      principalCents,
      interestCents,
      note: data.note || '',
      createdAt: new Date(),
    };

    debt.payments.push(payment);

    // Actualizar saldo restante (descontar capital, no interés)
    const reductionCents = principalCents > 0 ? principalCents : data.amountCents;
    debt.remainingCents = Math.max(0, debt.remainingCents - reductionCents);

    // Incrementar cuotas pagadas
    debt.paidInstallments = (debt.paidInstallments || 0) + 1;

    // Si saldo es 0, marcar como pagada
    if (debt.remainingCents === 0) {
      debt.status = 'paid';
    }

    return debt.save();
  }

  /**
   * Get all payments for a debt
   */
  async getPayments(id: string, userId: string) {
    const debt = await this.findByIdAndUser(id, userId);
    return debt.payments;
  }

  /**
   * Delete a payment from a debt
   */
  async deletePayment(id: string, userId: string, paymentId: string) {
    const debt = await this.findByIdAndUser(id, userId);

    const payment = debt.payments.find((p) => p._id.toString() === paymentId);
    if (!payment) {
      throw new NotFoundException('Pago no encontrado');
    }

    // Restaurar saldo
    const reductionCents =
      payment.principalCents && payment.principalCents > 0
        ? payment.principalCents
        : payment.amountCents;
    debt.remainingCents = Math.min(
      debt.originalAmountCents,
      debt.remainingCents + reductionCents,
    );

    // Decrementar cuotas pagadas
    debt.paidInstallments = Math.max(0, (debt.paidInstallments || 0) - 1);

    // Re-activar si estaba pagada
    if (debt.status === 'paid' && debt.remainingCents > 0) {
      debt.status = 'active';
    }

    debt.payments = debt.payments.filter((p) => p._id.toString() !== paymentId);

    return debt.save();
  }

  /**
   * Get total debt across all active debts for a user
   */
  async getTotalDebt(userId: string): Promise<number> {
    const debts = await this.findByUserId(userId);
    return debts.reduce((sum, d) => sum + d.remainingCents, 0);
  }

  /**
   * Get total monthly payments across all active debts
   */
  async getTotalMonthlyPayments(userId: string): Promise<number> {
    const debts = await this.findByUserId(userId);
    return debts.reduce((sum, d) => sum + (d.monthlyPaymentCents || 0), 0);
  }

  /**
   * Get summary of all debts
   */
  async getSummary(userId: string) {
    const debts = await this.findByUserId(userId);

    const totalRemaining = debts.reduce((sum, d) => sum + d.remainingCents, 0);
    const totalOriginal = debts.reduce((sum, d) => sum + d.originalAmountCents, 0);
    const totalMonthly = debts.reduce((sum, d) => sum + (d.monthlyPaymentCents || 0), 0);
    const totalPaid = totalOriginal - totalRemaining;

    return {
      count: debts.length,
      totalOriginalCents: totalOriginal,
      totalRemainingCents: totalRemaining,
      totalPaidCents: totalPaid,
      totalMonthlyPaymentCents: totalMonthly,
      totalOriginalFormatted: `Q${(totalOriginal / 100).toFixed(2)}`,
      totalRemainingFormatted: `Q${(totalRemaining / 100).toFixed(2)}`,
      totalPaidFormatted: `Q${(totalPaid / 100).toFixed(2)}`,
      totalMonthlyPaymentFormatted: `Q${(totalMonthly / 100).toFixed(2)}`,
      progressPercentage: totalOriginal > 0 ? Math.round((totalPaid / totalOriginal) * 100) : 0,
    };
  }
}
