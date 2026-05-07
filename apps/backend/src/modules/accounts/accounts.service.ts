import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Account } from './schemas/account.schema';

@Injectable()
export class AccountsService {
  constructor(@InjectModel(Account.name) private accountModel: Model<Account>) {}

  async create(userId: string, accountData: any) {
    if (!accountData.alias) {
      throw new BadRequestException('El alias es requerido');
    }

    if (accountData.currentBalanceCents && accountData.currentBalanceCents < 0) {
      throw new BadRequestException('El saldo no puede ser negativo');
    }

    const initialBalance = accountData.currentBalanceCents || 0;

    const account = new this.accountModel({
      userId,
      alias: accountData.alias,
      institution: accountData.institution || '',
      type: accountData.type || 'checking',
      currentBalanceCents: initialBalance,
      initialBalanceCents: initialBalance,
      isActive: true,
    });
    return account.save();
  }

  async findByUserId(userId: string) {
    return this.accountModel.find({ userId, isActive: true }).sort({ createdAt: -1 });
  }

  async findById(id: string) {
    return this.accountModel.findById(id);
  }

  /**
   * Find account by ID with user validation
   */
  async findByIdAndUser(id: string, userId: string) {
    const account = await this.accountModel.findOne({ _id: id, userId });
    if (!account) {
      throw new NotFoundException('Cuenta no encontrada');
    }
    return account;
  }

  async update(id: string, userId: string, updateData: any) {
    await this.findByIdAndUser(id, userId);

    // No permitir cambiar userId, _id directamente
    delete updateData.userId;
    delete updateData._id;
    // No permitir cambiar el saldo desde update (debe usar movimientos o adjustment)
    delete updateData.currentBalanceCents;
    delete updateData.initialBalanceCents;

    return this.accountModel.findByIdAndUpdate(id, updateData, { new: true });
  }

  /**
   * Soft delete account
   */
  async delete(id: string, userId: string) {
    const account = await this.findByIdAndUser(id, userId);

    // Validar que el saldo sea 0 antes de eliminar
    if (account.currentBalanceCents > 0) {
      throw new BadRequestException(
        `No se puede eliminar la cuenta con saldo de Q${(account.currentBalanceCents / 100).toFixed(2)}. Transfiere el saldo primero.`,
      );
    }

    return this.accountModel.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true },
    );
  }

  /**
   * RB-01: Obtiene el disponible total (suma de todas las cuentas activas)
   */
  async getTotalBalance(userId: string): Promise<number> {
    const accounts = await this.findByUserId(userId);
    return accounts.reduce((sum, acc) => sum + acc.currentBalanceCents, 0);
  }

  /**
   * Aumenta el saldo de una cuenta (RB-05: Ingresos)
   */
  async increaseBalance(accountId: string, amountCents: number): Promise<Account> {
    if (amountCents <= 0) {
      throw new BadRequestException('El monto debe ser positivo');
    }

    const account = await this.findById(accountId);
    if (!account) {
      throw new BadRequestException('Cuenta no encontrada');
    }

    account.currentBalanceCents += amountCents;
    return account.save();
  }

  /**
   * Reduce el saldo de una cuenta (RB-06: Gastos)
   */
  async decreaseBalance(accountId: string, amountCents: number): Promise<Account> {
    if (amountCents <= 0) {
      throw new BadRequestException('El monto debe ser positivo');
    }

    const account = await this.findById(accountId);
    if (!account) {
      throw new BadRequestException('Cuenta no encontrada');
    }

    if (account.currentBalanceCents < amountCents) {
      throw new BadRequestException(
        `Saldo insuficiente en ${account.alias}. Disponible: Q${(account.currentBalanceCents / 100).toFixed(2)}`,
      );
    }

    account.currentBalanceCents -= amountCents;
    return account.save();
  }

  /**
   * Get summary with account types breakdown
   */
  async getSummary(userId: string) {
    const accounts = await this.findByUserId(userId);

    const totalBalance = accounts.reduce((s, a) => s + a.currentBalanceCents, 0);

    const byType: Record<string, { count: number; totalCents: number; totalFormatted: string }> = {};
    accounts.forEach((acc) => {
      if (!byType[acc.type]) {
        byType[acc.type] = { count: 0, totalCents: 0, totalFormatted: 'Q0.00' };
      }
      byType[acc.type].count += 1;
      byType[acc.type].totalCents += acc.currentBalanceCents;
      byType[acc.type].totalFormatted = `Q${(byType[acc.type].totalCents / 100).toFixed(2)}`;
    });

    return {
      count: accounts.length,
      totalBalanceCents: totalBalance,
      totalBalanceFormatted: `Q${(totalBalance / 100).toFixed(2)}`,
      byType,
    };
  }
}
