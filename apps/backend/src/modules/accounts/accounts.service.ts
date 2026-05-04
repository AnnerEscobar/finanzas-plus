import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Account } from './schemas/account.schema';

@Injectable()
export class AccountsService {
  constructor(@InjectModel(Account.name) private accountModel: Model<Account>) {}

  async create(userId: string, accountData: any) {
    // Validar que amountCents sea válido (RB-18)
    if (accountData.currentBalanceCents && accountData.currentBalanceCents < 0) {
      throw new BadRequestException('El saldo no puede ser negativo');
    }

    const account = new this.accountModel({
      userId,
      ...accountData,
      currentBalanceCents: accountData.currentBalanceCents || 0,
      initialBalanceCents: accountData.currentBalanceCents || 0,
    });
    return account.save();
  }

  async findByUserId(userId: string) {
    return this.accountModel.find({ userId, isActive: true });
  }

  async findById(id: string) {
    return this.accountModel.findById(id);
  }

  async update(id: string, updateData: any) {
    if (updateData.currentBalanceCents !== undefined && updateData.currentBalanceCents < 0) {
      throw new BadRequestException('El saldo no puede ser negativo');
    }
    return this.accountModel.findByIdAndUpdate(id, updateData, { new: true });
  }

  /**
   * RB-01: Obtiene el disponible total (suma de todas las cuentas activas)
   * Disponible total = SUM(account.currentBalanceCents for account in user.accounts where isActive=true)
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
      throw new BadRequestException('Saldo insuficiente');
    }

    account.currentBalanceCents -= amountCents;
    return account.save();
  }
}
