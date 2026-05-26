import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { ClientSession, Connection, Model, Types } from 'mongoose';
import { Movement } from './schemas/movement.schema';
import { Category } from './schemas/category.schema';
import { AccountsService } from '../accounts/accounts.service';

@Injectable()
export class MovementsService {
  constructor(
    @InjectModel(Movement.name) private movementModel: Model<Movement>,
    @InjectModel(Category.name) private categoryModel: Model<Category>,
    private accountsService: AccountsService,
    @InjectConnection() private connection: Connection,
  ) {}

  /**
   * RB-05: Registrar ingreso
   */
  async createIncome(userId: string, data: any) {
    return this.connection.transaction(async (session) => {
      const { amountCents, date, accountId, categoryId, note } = data;
      if (!amountCents || amountCents <= 0) {
        throw new BadRequestException('El monto debe ser mayor a 0');
      }
      if (!accountId) {
        throw new BadRequestException('La cuenta destino es requerida');
      }
      await this.accountsService.findByIdAndUser(accountId, userId, session);
      await this.accountsService.increaseBalance(accountId, amountCents, session);

      const movement = new this.movementModel({
        userId,
        type: 'income',
        amountCents,
        date: date ? new Date(date) : new Date(),
        accountId,
        categoryId: categoryId || undefined,
        paymentMethod: 'transfer',
        note: note || '',
        status: 'completed',
      });

      return movement.save({ session });
    });

    const { amountCents, date, accountId, categoryId, note } = data;

    if (!amountCents || amountCents <= 0) {
      throw new BadRequestException('El monto debe ser mayor a 0');
    }
    if (!accountId) {
      throw new BadRequestException('La cuenta destino es requerida');
    }

    // Validar que la cuenta pertenezca al usuario
    await this.accountsService.findByIdAndUser(accountId, userId);

    // Aumentar saldo de cuenta (RB-05)
    await this.accountsService.increaseBalance(accountId, amountCents);

    const movement = new this.movementModel({
      userId,
      type: 'income',
      amountCents,
      date: date ? new Date(date) : new Date(),
      accountId,
      categoryId: categoryId || undefined,
      paymentMethod: 'transfer',
      note: note || '',
      status: 'completed',
    });

    return movement.save();
  }

  /**
   * RB-06: Registrar gasto con efectivo/débito
   */
  async createExpense(userId: string, data: any) {
    return this.connection.transaction(async (session) => {
      const { amountCents, date, accountId, categoryId, paymentMethod, note } = data;
      if (!amountCents || amountCents <= 0) {
        throw new BadRequestException('El monto debe ser mayor a 0');
      }
      if (!accountId) {
        throw new BadRequestException('La cuenta es requerida');
      }
      if (!['cash', 'debit'].includes(paymentMethod)) {
        throw new BadRequestException('paymentMethod debe ser cash o debit');
      }
      await this.accountsService.findByIdAndUser(accountId, userId, session);
      await this.accountsService.decreaseBalance(accountId, amountCents, session);

      const movement = new this.movementModel({
        userId,
        type: 'expense',
        amountCents,
        date: date ? new Date(date) : new Date(),
        accountId,
        categoryId: categoryId || undefined,
        paymentMethod,
        note: note || '',
        status: 'completed',
      });

      return movement.save({ session });
    });

    const { amountCents, date, accountId, categoryId, paymentMethod, note } = data;

    if (!amountCents || amountCents <= 0) {
      throw new BadRequestException('El monto debe ser mayor a 0');
    }
    if (!accountId) {
      throw new BadRequestException('La cuenta es requerida');
    }
    if (!['cash', 'debit'].includes(paymentMethod)) {
      throw new BadRequestException('paymentMethod debe ser cash o debit');
    }

    await this.accountsService.findByIdAndUser(accountId, userId);

    // Reducir saldo (RB-06)
    await this.accountsService.decreaseBalance(accountId, amountCents);

    const movement = new this.movementModel({
      userId,
      type: 'expense',
      amountCents,
      date: date ? new Date(date) : new Date(),
      accountId,
      categoryId: categoryId || undefined,
      paymentMethod,
      note: note || '',
      status: 'completed',
    });

    return movement.save();
  }

  /**
   * RB-08: Transferencia entre cuentas propias
   */
  async createTransfer(userId: string, data: any) {
    return this.connection.transaction(async (session) => {
      const { amountCents, date, sourceAccountId, targetAccountId, note } = data;
      if (!amountCents || amountCents <= 0) {
        throw new BadRequestException('El monto debe ser mayor a 0');
      }
      if (!sourceAccountId || !targetAccountId) {
        throw new BadRequestException('Cuentas origen y destino son requeridas');
      }
      if (sourceAccountId === targetAccountId) {
        throw new BadRequestException('No puede transferir a la misma cuenta');
      }

      await this.accountsService.findByIdAndUser(sourceAccountId, userId, session);
      await this.accountsService.findByIdAndUser(targetAccountId, userId, session);
      await this.accountsService.decreaseBalance(sourceAccountId, amountCents, session);
      await this.accountsService.increaseBalance(targetAccountId, amountCents, session);

      const movementDate = date ? new Date(date) : new Date();
      const noteText = note || '';
      const transferOut = new this.movementModel({
        userId,
        type: 'transfer',
        amountCents,
        date: movementDate,
        accountId: sourceAccountId,
        paymentMethod: 'transfer',
        note: `Transferencia salida: ${noteText}`,
        status: 'completed',
      });
      const transferOutSaved = await transferOut.save({ session });

      const transferIn = new this.movementModel({
        userId,
        type: 'transfer',
        amountCents,
        date: movementDate,
        accountId: targetAccountId,
        paymentMethod: 'transfer',
        note: `Transferencia entrada: ${noteText}`,
        status: 'completed',
        relatedEntityId: transferOutSaved._id,
      });
      await transferIn.save({ session });

      transferOutSaved.relatedEntityId = transferIn._id as Types.ObjectId;
      await transferOutSaved.save({ session });

      return { transferOut: transferOutSaved, transferIn };
    });

    const { amountCents, date, sourceAccountId, targetAccountId, note } = data;

    if (!amountCents || amountCents <= 0) {
      throw new BadRequestException('El monto debe ser mayor a 0');
    }
    if (!sourceAccountId || !targetAccountId) {
      throw new BadRequestException('Cuentas origen y destino son requeridas');
    }
    if (sourceAccountId === targetAccountId) {
      throw new BadRequestException('No puede transferir a la misma cuenta');
    }

    // Validar ambas cuentas pertenezcan al usuario
    await this.accountsService.findByIdAndUser(sourceAccountId, userId);
    await this.accountsService.findByIdAndUser(targetAccountId, userId);

    // TODO: Usar sesión MongoDB para transacción ACID (RB-19)
    await this.accountsService.decreaseBalance(sourceAccountId, amountCents);
    await this.accountsService.increaseBalance(targetAccountId, amountCents);

    const movementDate = date ? new Date(date) : new Date();
    const noteText = note || '';

    // Movimiento de salida
    const transferOut = new this.movementModel({
      userId,
      type: 'transfer',
      amountCents,
      date: movementDate,
      accountId: sourceAccountId,
      paymentMethod: 'transfer',
      note: `→ Transferencia: ${noteText}`,
      status: 'completed',
    });
    const transferOutSaved = await transferOut.save();

    // Movimiento de entrada
    const transferIn = new this.movementModel({
      userId,
      type: 'transfer',
      amountCents,
      date: movementDate,
      accountId: targetAccountId,
      paymentMethod: 'transfer',
      note: `← Recepción: ${noteText}`,
      status: 'completed',
      relatedEntityId: transferOutSaved._id,
    });
    await transferIn.save();

    // Actualizar relatedEntityId del primero
    transferOutSaved.relatedEntityId = transferIn._id as Types.ObjectId;
    await transferOutSaved.save();

    return { transferOut: transferOutSaved, transferIn };
  }

  /**
   * Crear registro de movimiento SIN tocar el saldo de la cuenta.
   * Uso interno: payCorte() crea los movimientos de gasto aquí,
   * y hace UN solo decreaseBalance() por el total del corte.
   */
  async createMovementRecord(
    userId: string,
    data: {
      type: 'income' | 'expense';
      amountCents: number;
      date: Date;
      accountId: string;
      categoryId?: string;
      defaultCategoryName?: string;
      paymentMethod?: string;
      note?: string;
      relatedEntityId?: string;
    },
    session?: ClientSession,
  ) {
    const categoryId =
      data.categoryId ||
      (data.defaultCategoryName
        ? (await this.ensureExpenseCategory(userId, data.defaultCategoryName, session))._id.toString()
        : undefined);

    const movement = new this.movementModel({
      userId,
      type: data.type,
      amountCents: data.amountCents,
      date: data.date,
      accountId: data.accountId,
      categoryId,
      paymentMethod: data.paymentMethod || 'debit',
      note: data.note || '',
      status: 'completed',
      relatedEntityId: data.relatedEntityId || undefined,
    });
    return movement.save({ session });
  }

  async ensureExpenseCategory(userId: string, name: string, session?: ClientSession) {
    const normalizedName = name.trim();
    let category = await this.categoryModel
      .findOne({ userId, name: normalizedName, type: 'expense' })
      .session(session || null);

    if (category) {
      if (!category.isActive) {
        category.isActive = true;
        await category.save({ session });
      }
      return category;
    }

    category = new this.categoryModel({
      userId,
      name: normalizedName,
      type: 'expense',
      isDefault: true,
      isActive: true,
    });
    return category.save({ session });
  }

  async deleteMovementRecordsByRelatedEntity(
    userId: string,
    relatedEntityId: string,
    session?: ClientSession,
  ) {
    return this.movementModel.deleteMany({
      userId,
      relatedEntityId: new Types.ObjectId(relatedEntityId),
    }).session(session || null);
  }

  /**
   * RB-08: Ajuste de saldo (conciliación)
   */
  async createAdjustment(userId: string, data: any) {
    const { amountCents, date, accountId, note } = data;

    const account = await this.accountsService.findByIdAndUser(accountId, userId);

    const newBalance = account.currentBalanceCents + amountCents;

    if (newBalance < 0) {
      throw new BadRequestException('El ajuste resultaría en saldo negativo');
    }

    account.currentBalanceCents = newBalance;
    await account.save();

    const movement = new this.movementModel({
      userId,
      type: 'adjustment',
      amountCents: Math.abs(amountCents),
      date: date ? new Date(date) : new Date(),
      accountId,
      paymentMethod: 'adjustment',
      note: note || `Ajuste de ${amountCents > 0 ? '+' : '-'}${Math.abs(amountCents / 100).toFixed(2)}`,
      status: 'completed',
    });

    return movement.save();
  }

  /**
   * Eliminar un movimiento - revierte el efecto en la cuenta
   */
  async deleteMovement(userId: string, movementId: string) {
    const movement = await this.movementModel.findOne({ _id: movementId, userId });
    if (!movement) {
      throw new NotFoundException('Movimiento no encontrado');
    }

    // Revertir efecto en cuenta
    if (movement.type === 'income') {
      // Era ingreso → ahora descontar
      const account = await this.accountsService.findById(movement.accountId.toString());
      if (account && account.currentBalanceCents >= movement.amountCents) {
        await this.accountsService.decreaseBalance(movement.accountId.toString(), movement.amountCents);
      } else {
        throw new BadRequestException(
          'No se puede eliminar este ingreso porque ya se gastó. Realiza un ajuste.',
        );
      }
    } else if (movement.type === 'expense') {
      // Era gasto → restaurar
      await this.accountsService.increaseBalance(movement.accountId.toString(), movement.amountCents);
    } else if (movement.type === 'transfer') {
      // Eliminar también el par y revertir
      throw new BadRequestException(
        'Para eliminar transferencias, ve al detalle y borra ambas partes manualmente o crea un ajuste.',
      );
    } else if (movement.type === 'adjustment') {
      // No se puede revertir un ajuste fácilmente sin perder rastro
      throw new BadRequestException(
        'Los ajustes no se pueden eliminar. Crea un ajuste contrario.',
      );
    }

    return this.movementModel.findByIdAndDelete(movementId);
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

    if (filters.categoryId) {
      query.categoryId = new Types.ObjectId(filters.categoryId);
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

    const limit = filters.limit ? parseInt(filters.limit) : 200;

    return this.movementModel
      .find(query)
      .sort({ date: -1, createdAt: -1 })
      .limit(limit)
      .populate('accountId', 'alias type institution')
      .populate('categoryId', 'name type');
  }

  /**
   * Movimiento por ID
   */
  async findByIdAndUser(id: string, userId: string) {
    const movement = await this.movementModel
      .findOne({ _id: id, userId })
      .populate('accountId', 'alias type institution')
      .populate('categoryId', 'name type');
    if (!movement) {
      throw new NotFoundException('Movimiento no encontrado');
    }
    return movement;
  }

  /**
   * Resumen de movimientos por mes
   */
  async getMonthlySummary(userId: string, year: number, month: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const movements = await this.movementModel
      .find({
        userId,
        date: { $gte: startDate, $lte: endDate },
      })
      .populate('categoryId', 'name type');

    let totalIncome = 0;
    let totalExpense = 0;
    let totalTransfersOut = 0;
    const expenseByCategory: Record<string, { name: string; totalCents: number }> = {};
    const incomeByCategory: Record<string, { name: string; totalCents: number }> = {};

    movements.forEach((m: any) => {
      if (m.type === 'income') {
        totalIncome += m.amountCents;
        const catName = m.categoryId?.name || 'Sin categoría';
        const catId = m.categoryId?._id?.toString() || 'none';
        if (!incomeByCategory[catId]) {
          incomeByCategory[catId] = { name: catName, totalCents: 0 };
        }
        incomeByCategory[catId].totalCents += m.amountCents;
      } else if (m.type === 'expense') {
        totalExpense += m.amountCents;
        const catName = m.categoryId?.name || 'Sin categoría';
        const catId = m.categoryId?._id?.toString() || 'none';
        if (!expenseByCategory[catId]) {
          expenseByCategory[catId] = { name: catName, totalCents: 0 };
        }
        expenseByCategory[catId].totalCents += m.amountCents;
      } else if (m.type === 'transfer' && m.note?.startsWith('→')) {
        totalTransfersOut += m.amountCents;
      }
    });

    const balance = totalIncome - totalExpense;

    return {
      year,
      month,
      totalIncome,
      totalExpense,
      totalTransfersOut,
      balance,
      totalIncomeFormatted: `Q${(totalIncome / 100).toFixed(2)}`,
      totalExpenseFormatted: `Q${(totalExpense / 100).toFixed(2)}`,
      balanceFormatted: `Q${(balance / 100).toFixed(2)}`,
      movementsCount: movements.length,
      expenseByCategory: Object.values(expenseByCategory).sort((a, b) => b.totalCents - a.totalCents),
      incomeByCategory: Object.values(incomeByCategory).sort((a, b) => b.totalCents - a.totalCents),
    };
  }
}
