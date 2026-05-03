import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Account } from './schemas/account.schema';

@Injectable()
export class AccountsService {
  constructor(@InjectModel(Account.name) private accountModel: Model<Account>) {}

  async create(userId: string, accountData: any) {
    const account = new this.accountModel({ userId, ...accountData });
    return account.save();
  }

  async findByUserId(userId: string) {
    return this.accountModel.find({ userId, isActive: true });
  }

  async findById(id: string) {
    return this.accountModel.findById(id);
  }

  async update(id: string, updateData: any) {
    return this.accountModel.findByIdAndUpdate(id, updateData, { new: true });
  }

  async getTotalBalance(userId: string) {
    const accounts = await this.findByUserId(userId);
    return accounts.reduce((sum, acc) => sum + acc.currentBalanceCents, 0);
  }
}
