import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

/**
 * Charge subdocument - Represents a single charge/purchase on a credit card
 */
@Schema({ _id: true })
export class Charge {
  _id!: Types.ObjectId;

  @Prop({ required: true })
  description!: string;

  @Prop({ required: true, min: 0 })
  amountCents!: number;

  @Prop({ required: true, default: () => new Date() })
  date!: Date;

  @Prop({ type: Types.ObjectId, ref: 'Category' })
  categoryId?: Types.ObjectId;

  @Prop({ default: '' })
  note?: string;

  @Prop({ default: () => new Date() })
  createdAt?: Date;
}

export const ChargeSchema = SchemaFactory.createForClass(Charge);

/**
 * Payment subdocument - Represents a single payment against a statement cycle
 */
@Schema({ _id: true })
export class Payment {
  _id!: Types.ObjectId;

  @Prop({ required: true, min: 0 })
  amountCents!: number;

  @Prop({ required: true, default: () => new Date() })
  date!: Date;

  @Prop({ type: Types.ObjectId, ref: 'Account' })
  accountId?: Types.ObjectId;

  @Prop({ default: '' })
  note?: string;

  @Prop({ default: () => new Date() })
  createdAt?: Date;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);

/**
 * CreditCardCorte - Statement cycle for a credit card
 * Tracks charges and payments for a billing period
 */
@Schema({ _id: true })
export class CreditCardCorte {
  _id!: Types.ObjectId;
  @Prop({ required: true })
  cycleNumber!: number;

  @Prop({ required: true })
  openingDate!: Date;

  @Prop({ required: true })
  closingDate!: Date;

  @Prop({ required: true })
  cutoffDay!: number;

  @Prop({ type: [ChargeSchema], default: [] })
  charges!: Charge[];

  @Prop({ type: [PaymentSchema], default: [] })
  payments!: Payment[];

  // Balance tracking
  @Prop({ required: true, default: 0, min: 0 })
  chargesTotal!: number;

  @Prop({ required: true, default: 0, min: 0 })
  paymentsTotal!: number;

  @Prop({ required: true, default: 0 })
  balanceCents!: number;

  @Prop({ required: true, default: 0, min: 0 })
  interestCents!: number;

  @Prop({ enum: ['open', 'closing', 'closed'], default: 'open' })
  status!: string;

  @Prop({ default: false })
  isClosed!: boolean;

  @Prop()
  closedAt?: Date;
}

export const CreditCardCorteSchema = SchemaFactory.createForClass(CreditCardCorte);

/**
 * CreditCard - Main credit card document
 * Includes user's tarjeta with multiple statement cycles
 */
@Schema({ timestamps: true })
export class CreditCard extends Document {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId!: Types.ObjectId;

  // Card Identification
  @Prop({ required: true })
  alias!: string;

  @Prop({ enum: ['credit'], default: 'credit' })
  cardType!: string;

  @Prop({ required: true })
  issuer!: string;

  // Card Details (never store full number)
  @Prop({ required: true })
  maskedNumber!: string;

  @Prop({ required: true })
  holderName!: string;

  @Prop({ required: true, min: 0 })
  creditLimitCents!: number;

  // Statement Cycles
  @Prop({ type: [CreditCardCorteSchema], default: [] })
  statementCycles!: CreditCardCorte[];

  // Balance Tracking
  @Prop({ required: true, default: 0, min: 0 })
  totalBalanceCents!: number;

  @Prop({ required: true, default: 0, min: 0 })
  availableCreditCents!: number;

  // Status
  @Prop({ default: true })
  isActive!: boolean;

  @Prop({ default: () => new Date() })
  createdAt?: Date;

  @Prop({ default: () => new Date() })
  updatedAt?: Date;
}

export const CreditCardSchema = SchemaFactory.createForClass(CreditCard);

// Indices para mejor rendimiento
CreditCardSchema.index({ userId: 1 });
CreditCardSchema.index({ userId: 1, isActive: 1 });
CreditCardSchema.index({ userId: 1, maskedNumber: 1 }, { unique: true });
CreditCardSchema.index({ 'statementCycles.isClosed': 1 });
CreditCardSchema.index({ 'statementCycles.openingDate': -1 });
