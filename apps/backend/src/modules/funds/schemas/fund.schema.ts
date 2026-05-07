import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

/**
 * FundContribution subdocument - Represents a single contribution to a fund
 */
@Schema({ _id: true })
export class FundContribution {
  _id!: Types.ObjectId;

  @Prop({ required: true, min: 0 })
  amountCents!: number;

  @Prop({ required: true, default: () => new Date() })
  date!: Date;

  // Origen del aporte (ej: cuenta bancaria desde donde se transfirió)
  @Prop({ type: Types.ObjectId, ref: 'Account' })
  accountId?: Types.ObjectId;

  @Prop({ default: '' })
  note?: string;

  @Prop({ default: () => new Date() })
  createdAt?: Date;
}

export const FundContributionSchema = SchemaFactory.createForClass(FundContribution);

/**
 * Fund - Main retirement/savings fund document
 */
@Schema({ timestamps: true })
export class Fund extends Document {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId!: Types.ObjectId;

  // Identificación
  @Prop({ required: true })
  alias!: string;

  @Prop({ default: '' })
  description?: string;

  @Prop({ default: '' })
  institution?: string;

  // Tipo
  @Prop({
    enum: ['retirement', 'emergency', 'savings', 'investment', 'other'],
    default: 'retirement',
  })
  fundType!: string;

  // Monto objetivo (meta)
  @Prop({ default: 0, min: 0 })
  targetAmountCents!: number;

  // Monto actual acumulado
  @Prop({ required: true, default: 0, min: 0 })
  currentAmountCents!: number;

  // Aporte mensual planificado
  @Prop({ default: 0, min: 0 })
  monthlyContributionCents!: number;

  // Tasa de interés anual (informativa - para proyección)
  @Prop({ default: 0, min: 0 })
  annualInterestRate!: number;

  // Fecha inicio
  @Prop({ default: () => new Date() })
  startDate!: Date;

  // Fecha de vencimiento / objetivo
  @Prop()
  targetDate?: Date;

  // Lista de aportes
  @Prop({ type: [FundContributionSchema], default: [] })
  contributions!: FundContribution[];

  // Estado
  @Prop({
    enum: ['active', 'matured', 'closed'],
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

export const FundSchema = SchemaFactory.createForClass(Fund);

// Indices para mejor rendimiento
FundSchema.index({ userId: 1 });
FundSchema.index({ userId: 1, isActive: 1 });
FundSchema.index({ userId: 1, status: 1 });
FundSchema.index({ userId: 1, targetDate: 1 });
