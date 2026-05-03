import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async create(userData: any) {
    const user = new this.userModel(userData);
    return user.save();
  }

  async findById(id: string) {
    return this.userModel.findById(id);
  }

  async findByEmail(email: string) {
    return this.userModel.findOne({ email });
  }

  async update(id: string, updateData: any) {
    return this.userModel.findByIdAndUpdate(id, updateData, { new: true });
  }
}
