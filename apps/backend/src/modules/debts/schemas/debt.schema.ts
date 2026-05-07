import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

/**
 * DebtPayment subdocument - Represents a single payment against a debt
 */
@Schema({ _id: true })
export class DebtPayment {
  _id!: Types.ObjectId;

  @Prop({ required: true, min: 0 })
  amountCents!: number;

  @Prop({ required: true, default: () => new Date() })
  date!: Date;

  // Si el pago se realizó desde una cuenta específica
  @Prop({ type: Types.ObjectId, ref: 'Account' })
  accountId?: Types.ObjectId;

  // Desglose capital/interés (educativo, opcional)
  @Prop({ default: 0, min: 0 })
  principalCents?: number;

  @Prop({ default: 0, min: 0 })
  interestCents?: number;

  @Prop({ default: '' })
  note?: string;

  @Prop({ default: () => new Date() })
  createdAt?: Date;
}

export const DebtPaymentSchema = SchemaFactory.createForClass(DebtPayment);

/**
 * Debt - Main debt document
 * Represents loans, advances, cooperative loans, etc.
 */
@Schema({ timestamps: true })
export class Debt extends Document {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId!: Types.ObjectId;

  // Identificación
  @Prop({ required: true })
  alias!: string;

  @Prop({ required: true })
  creditorName!: string;

  // Tipo de deuda
  @Prop({
    enum: ['loan', 'advance', 'cooperative', 'personal', 'other'],
    default: 'loan',
  })
  debtType!: string;

  // Monto Total Original
  @Prop({ required: true, min: 0 })
  originalAmountCents!: number;

  // Saldo restante actual
  @Prop({ required: true, min: 0 })
  remainingCents!: number;

  // Tasa de interés anual (informativa)
  @Prop({ default: 0, min: 0 })
  interestRate!: number;

  // Cuota mensual estimada
  @Prop({ default: 0, min: 0 })
  monthlyPaymentCents!: number;

  // Total de cuotas (si aplica)
  @Prop({ default: 0, min: 0 })
  totalInstallments!: number;

  // Cuotas ya pagadas
  @Prop({ default: 0, min: 0 })
  paidInstallments!: number;

  // Fecha de inicio de la deuda
  @Prop({ default: () => new Date() })
  startDate!: Date;

  // Fecha de vencimiento (cancelación esperada)
  @Prop()
  dueDate?: Date;

  // Pagos realizados
  @Prop({ type: [DebtPaymentSchema], default: [] })
  payments!: DebtPayment[];

  // Estado
  @Prop({
    enum: ['active', 'paid', 'defaulted', 'cancelled'],
    default: 'active',
  })
  status!: string;

  @Prop({ default: '' })
  note?: string;

  // Soft delete
  @Prop({ default: true })
  isActive!: boolean;

  @Prop({ default: () => new Date() })
  createdAt?: Date;

  @Prop({ default: () => new Date() })
  updatedAt?: Date;
}

export const DebtSchema = SchemaFactory.createForClass(Debt);

// Indices para mejor rendimiento
DebtSchema.index({ userId: 1 });
DebtSchema.index({ userId: 1, isActive: 1 });
DebtSchema.index({ userId: 1, status: 1 });
DebtSchema.index({ userId: 1, dueDate: 1 });
