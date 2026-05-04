import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Movement extends Document {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId!: Types.ObjectId;

  @Prop({ enum: ['income', 'expense', 'transfer', 'adjustment'], required: true })
  type!: string;

  @Prop({ required: true, min: 0 })
  amountCents!: number;

  @Prop({ required: true, default: () => new Date() })
  date!: Date;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Account' })
  accountId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Category' })
  categoryId?: Types.ObjectId;

  @Prop({ enum: ['cash', 'debit', 'transfer', 'adjustment'], required: true })
  paymentMethod!: string;

  @Prop({ default: '' })
  note?: string;

  @Prop({ enum: ['pending', 'completed'], default: 'completed' })
  status!: string;

  @Prop({ type: Types.ObjectId })
  relatedEntityId?: Types.ObjectId;

  @Prop({ default: () => new Date() })
  createdAt?: Date;

  @Prop({ default: () => new Date() })
  updatedAt?: Date;
}

export const MovementSchema = SchemaFactory.createForClass(Movement);

// Índices para consultas frecuentes
MovementSchema.index({ userId: 1, date: -1 });
MovementSchema.index({ userId: 1, accountId: 1, date: -1 });
MovementSchema.index({ userId: 1, type: 1 });
MovementSchema.index({ userId: 1, categoryId: 1 });
