import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Account extends Document {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId!: Types.ObjectId;

  @Prop({ required: true })
  alias!: string;

  @Prop({ required: false })
  institution?: string;

  @Prop({ enum: ['checking', 'savings', 'cash', 'credit_union'], default: 'checking' })
  type!: string;

  @Prop({ required: true, default: 0, min: 0 })
  currentBalanceCents!: number;

  @Prop({ required: true, default: 0 })
  initialBalanceCents!: number;

  @Prop({ default: true })
  isActive!: boolean;

  @Prop({ default: () => new Date() })
  createdAt?: Date;

  @Prop({ default: () => new Date() })
  updatedAt?: Date;
}

export const AccountSchema = SchemaFactory.createForClass(Account);

// Índices para mejor rendimiento
AccountSchema.index({ userId: 1, isActive: 1 });
AccountSchema.index({ userId: 1 });
