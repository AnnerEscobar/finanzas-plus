import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

/**
 * Charge subdocument - Cargo único o cuota de un extrafinanciamiento
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

  // Categoría OBLIGATORIA (Sprint 5)
  @Prop({ required: true, type: Types.ObjectId, ref: 'Category' })
  categoryId!: Types.ObjectId;

  // Si este cargo proviene de un extrafinanciamiento
  @Prop({ type: Types.ObjectId })
  extraFinancingId?: Types.ObjectId;

  // Número de cuota (1, 2, ..., N)
  @Prop()
  installmentNumber?: number;

  // Total de cuotas (snapshot informativo)
  @Prop()
  totalInstallments?: number;

  @Prop({ default: '' })
  note?: string;

  @Prop({ default: () => new Date() })
  createdAt?: Date;
}

export const ChargeSchema = SchemaFactory.createForClass(Charge);

/**
 * Payment subdocument - Pago realizado al corte (puede ser parcial o total)
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
 * ExtraFinanciamiento subdocument - Compra a cuotas (Sprint 5)
 */
@Schema({ _id: true })
export class ExtraFinanciamiento {
  _id!: Types.ObjectId;

  @Prop({ required: true })
  description!: string;

  @Prop({ required: true, min: 0 })
  totalAmountCents!: number;

  @Prop({ required: true, min: 1 })
  totalInstallments!: number;

  @Prop({ required: true, default: 0, min: 0 })
  paidInstallments!: number;

  @Prop({ required: true, min: 0 })
  monthlyAmountCents!: number;

  @Prop({ required: true, default: () => new Date() })
  startDate!: Date;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Category' })
  categoryId!: Types.ObjectId;

  @Prop({ enum: ['active', 'completed'], default: 'active' })
  status!: string;

  // Track del último corte donde se aplicó cuota (para no duplicar)
  @Prop()
  lastAppliedCorteId?: Types.ObjectId;

  @Prop({ default: '' })
  note?: string;

  @Prop({ default: () => new Date() })
  createdAt?: Date;
}

export const ExtraFinanciamientoSchema = SchemaFactory.createForClass(ExtraFinanciamiento);

/**
 * CreditCardCorte - Estado de cuenta del período (Sprint 5)
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

  // Fecha límite para pagar este corte (Sprint 5)
  // default = closingDate como fallback para documentos migrados
  @Prop({ default: null })
  paymentDueDate!: Date;

  @Prop({ default: 15 })
  cutoffDay!: number;

  @Prop({ type: [ChargeSchema], default: [] })
  charges!: Charge[];

  @Prop({ type: [PaymentSchema], default: [] })
  payments!: Payment[];

  @Prop({ required: true, default: 0, min: 0 })
  chargesTotal!: number;

  @Prop({ required: true, default: 0, min: 0 })
  paymentsTotal!: number;

  @Prop({ required: true, default: 0 })
  balanceCents!: number;

  @Prop({ required: true, default: 0, min: 0 })
  interestCents!: number;

  // Status: 'open' (en curso) | 'closed_unpaid' (cerrado pendiente de pago) | 'paid' (pagado)
  @Prop({ enum: ['open', 'closed_unpaid', 'paid'], default: 'open' })
  status!: string;

  @Prop({ default: false })
  isClosed!: boolean;

  @Prop()
  closedAt?: Date;

  // Cuándo y desde qué cuenta se pagó (Sprint 5)
  @Prop()
  paidAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'Account' })
  paidFromAccountId?: Types.ObjectId;
}

export const CreditCardCorteSchema = SchemaFactory.createForClass(CreditCardCorte);

/**
 * CreditCard - Tarjeta de crédito (Sprint 5)
 */
@Schema({ timestamps: true })
export class CreditCard extends Document {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId!: Types.ObjectId;

  @Prop({ required: true })
  alias!: string;

  @Prop({ enum: ['credit'], default: 'credit' })
  cardType!: string;

  @Prop({ required: true })
  issuer!: string;

  @Prop({ required: true })
  maskedNumber!: string;

  @Prop({ required: true })
  holderName!: string;

  @Prop({ required: true, min: 0 })
  creditLimitCents!: number;

  // Configuración del ciclo (Sprint 5) — defaults para migración de datos existentes
  @Prop({ min: 1, max: 31, default: 15 })
  cutoffDay!: number;

  @Prop({ min: 1, max: 31, default: 10 })
  paymentDueDay!: number;

  @Prop({ type: [CreditCardCorteSchema], default: [] })
  statementCycles!: CreditCardCorte[];

  // Extrafinanciamientos / compras a cuotas (Sprint 5)
  @Prop({ type: [ExtraFinanciamientoSchema], default: [] })
  extraFinancings!: ExtraFinanciamiento[];

  @Prop({ required: true, default: 0, min: 0 })
  totalBalanceCents!: number;

  @Prop({ required: true, default: 0, min: 0 })
  availableCreditCents!: number;

  @Prop({ default: true })
  isActive!: boolean;

  @Prop({ default: () => new Date() })
  createdAt?: Date;

  @Prop({ default: () => new Date() })
  updatedAt?: Date;
}

export const CreditCardSchema = SchemaFactory.createForClass(CreditCard);

CreditCardSchema.index({ userId: 1 });
CreditCardSchema.index({ userId: 1, isActive: 1 });
CreditCardSchema.index({ userId: 1, maskedNumber: 1 }, { unique: true });
CreditCardSchema.index({ 'statementCycles.isClosed': 1 });
CreditCardSchema.index({ 'statementCycles.openingDate': -1 });
CreditCardSchema.index({ 'statementCycles.status': 1 });
