import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Movement } from './schemas/movement.schema';
import { Category } from './schemas/category.schema';
import { AccountsService } from '../accounts/accounts.service';

@Injectable()
export class MovementsService {
  constructor(
    @InjectModel(Movement.name) private movementModel: Model<Movement>,
    @InjectModel(Category.name) private categoryModel: Model<Category>,
    private accountsService: AccountsService,
  ) {}

  /**
   * RB-05: Registrar ingreso
   * Aumenta el saldo de la cuenta destino
   */
  async createIncome(userId: string, data: any) {
    const { amountCents, date, accountId, categoryId, note } = data;

    if (amountCents <= 0) {
      throw new BadRequestException('El monto debe ser mayor a 0');
    }

    // Aumentar saldo de cuenta (RB-05)
    await this.accountsService.increaseBalance(accountId, amountCents);

    // Registrar movimiento
    const movement = new this.movementModel({
      userId,
      type: 'income',
      amountCents,
      date: date || new Date(),
      accountId,
      categoryId,
      paymentMethod: 'transfer',
      note,
      status: 'completed',
    });

    return movement.save();
  }

  /**
   * RB-06: Registrar gasto con efectivo/débito
   * Reduce el saldo de la cuenta origen
   */
  async createExpense(userId: string, data: any) {
    const { amountCents, date, accountId, categoryId, paymentMethod, note } = data;

    if (amountCents <= 0) {
      throw new BadRequestException('El monto debe ser mayor a 0');
    }

    if (!['cash', 'debit'].includes(paymentMethod)) {
      throw new BadRequestException('paymentMethod debe ser cash o debit');
    }

    // Reducir saldo de cuenta (RB-06)
    await this.accountsService.decreaseBalance(accountId, amountCents);

    // Registrar movimiento
    const movement = new this.movementModel({
      userId,
      type: 'expense',
      amountCents,
      date: date || new Date(),
      accountId,
      categoryId,
      paymentMethod,
      note,
      status: 'completed',
    });

    return movement.save();
  }

  /**
   * RB-08: Transferencia entre cuentas propias
   * Afecta cuenta origen (decremento) + cuenta destino (incremento)
   * Operación ACID (RB-19)
   */
  async createTransfer(userId: string, data: any) {
    const { amountCents, date, sourceAccountId, targetAccountId, note } = data;

    if (amountCents <= 0) {
      throw new BadRequestException('El monto debe ser mayor a 0');
    }

    if (sourceAccountId === targetAccountId) {
      throw new BadRequestException('No puede transferir a la misma cuenta');
    }

    // TODO: Usar sesión de MongoDB para transacción ACID
    // Por ahora, hacemos las operaciones secuencialmente

    // Reducir cuenta origen
    await this.accountsService.decreaseBalance(sourceAccountId, amountCents);

    // Aumentar cuenta destino
    await this.accountsService.increaseBalance(targetAccountId, amountCents);

    // Registrar movimiento de salida
    const transferOut = new this.movementModel({
      userId,
      type: 'transfer',
      amountCents,
      date: date || new Date(),
      accountId: sourceAccountId,
      paymentMethod: 'transfer',
      note: `Transferencia a otra cuenta: ${note || ''}`,
      status: 'completed',
    });

    const transferOutSaved = await transferOut.save();

    // Registrar movimiento de entrada
    const transferIn = new this.movementModel({
      userId,
      type: 'transfer',
      amountCents,
      date: date || new Date(),
      accountId: targetAccountId,
      paymentMethod: 'transfer',
      note: `Recepción de transferencia: ${note || ''}`,
      status: 'completed',
      relatedEntityId: transferOutSaved._id,
    });

    await transferIn.save();

    return { transferOut: transferOutSaved, transferIn };
  }

  /**
   * RB-08: Ajuste de saldo (conciliación)
   */
  async createAdjustment(userId: string, data: any) {
    const { amountCents, date, accountId, note } = data;

    const account = await this.accountsService.findById(accountId);
    if (!account) {
      throw new BadRequestException('Cuenta no encontrada');
    }

    const newBalance = account.currentBalanceCents + amountCents;

    if (newBalance < 0) {
      throw new BadRequestException('El ajuste resultaría en saldo negativo');
    }

    // Actualizar saldo
    account.currentBalanceCents = newBalance;
    await account.save();

    // Registrar ajuste
    const movement = new this.movementModel({
      userId,
      type: 'adjustment',
      amountCents,
      date: date || new Date(),
      accountId,
      paymentMethod: 'adjustment',
      note: note || 'Ajuste de conciliación',
      status: 'completed',
    });

    return movement.save();
  }

  /**
   * Obtener movimientos del usuario con filtros
   */
  async getMovements(userId: string, filters: any = {}) {
    const query: any = { userId };

    if (filters.accountId) {
      query.accountId = new Types.ObjectId(filters.accountId);
    }

    if (filters.type) {
      query.type = filters.type;
    }

    if (filters.fromDate || filters.toDate) {
      query.date = {};
      if (filters.fromDate) {
        query.date.$gte = new Date(filters.fromDate);
      }
      if (filters.toDate) {
        query.date.$lte = new Date(filters.toDate);
      }
    }

    return this.movementModel
      .find(query)
      .sort({ date: -1 })
      .limit(100)
      .populate('accountId')
      .populate('categoryId');
  }

  /**
   * Resumen de movimientos por mes
   */
  async getMonthlySummary(userId: string, year: number, month: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const movements = await this.movementModel.find({
      userId,
      date: { $gte: startDate, $lte: endDate },
    });

    const summary: any = {
      totalIncome: 0,
      totalExpense: 0,
      totalTransfers: 0,
      movementsByType: {} as Record<string, number>,
    };

    movements.forEach((m) => {
      if (m.type === 'income') {
        summary.totalIncome += m.amountCents;
      } else if (m.type === 'expense') {
        summary.totalExpense += m.amountCents;
      } else if (m.type === 'transfer') {
        summary.totalTransfers += m.amountCents;
      }

      if (!summary.movementsByType[m.type]) {
        summary.movementsByType[m.type] = 0;
      }
      summary.movementsByType[m.type]++;
    });

    return {
      ...summary,
      totalIncomeFormatted: `Q${(summary.totalIncome / 100).toFixed(2)}`,
      totalExpenseFormatted: `Q${(summary.totalExpense / 100).toFixed(2)}`,
    };
  }
}
