import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

/**
 * Snapshot subdocuments
 */
@Schema({ _id: false })
export class AccountSnapshot {
  @Prop({ required: true, type: Types.ObjectId })
  accountId!: Types.ObjectId;

  @Prop({ required: true })
  alias!: string;

  @Prop({ required: true, default: 0 })
  balanceCents!: number;
}
export const AccountSnapshotSchema = SchemaFactory.createForClass(AccountSnapshot);

@Schema({ _id: false })
export class CreditCardSnapshot {
  @Prop({ required: true, type: Types.ObjectId })
  cardId!: Types.ObjectId;

  @Prop({ required: true })
  alias!: string;

  @Prop({ required: true, default: 0 })
  totalBalanceCents!: number;

  @Prop({ default: 0 })
  availableCreditCents!: number;
}
export const CreditCardSnapshotSchema = SchemaFactory.createForClass(CreditCardSnapshot);

@Schema({ _id: false })
export class DebtSnapshot {
  @Prop({ required: true, type: Types.ObjectId })
  debtId!: Types.ObjectId;

  @Prop({ required: true })
  alias!: string;

  @Prop({ required: true, default: 0 })
  remainingCents!: number;

  @Prop({ default: 0 })
  monthlyPaymentCents!: number;
}
export const DebtSnapshotSchema = SchemaFactory.createForClass(DebtSnapshot);

@Schema({ _id: false })
export class FundSnapshot {
  @Prop({ required: true, type: Types.ObjectId })
  fundId!: Types.ObjectId;

  @Prop({ required: true })
  alias!: string;

  @Prop({ required: true, default: 0 })
  currentAmountCents!: number;

  @Prop({ default: 0 })
  targetAmountCents!: number;
}
export const FundSnapshotSchema = SchemaFactory.createForClass(FundSnapshot);

@Schema({ _id: false })
export class SummaryMetrics {
  @Prop({ default: 0 })
  totalAssetsCents!: number;

  @Prop({ default: 0 })
  totalDebtCents!: number;

  @Prop({ default: 0 })
  totalCreditCardDebtCents!: number;

  @Prop({ default: 0 })
  totalFundsCents!: number;

  @Prop({ default: 0 })
  netWorthCents!: number;
}
export const SummaryMetricsSchema = SchemaFactory.createForClass(SummaryMetrics);

/**
 * Closure - Monthly closure with snapshots
 */
@Schema({ timestamps: true })
export class Closure extends Document {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId!: Types.ObjectId;

  // Mes en formato YYYY-MM
  @Prop({ required: true })
  month!: string;

  @Prop({ default: () => new Date() })
  generatedAt!: Date;

  @Prop()
  closedAt?: Date;

  // Estado
  @Prop({ enum: ['open', 'closed'], default: 'open' })
  status!: string;

  // Si es editable (true = se puede modificar; false = bloqueado)
  @Prop({ default: true })
  isEditable!: boolean;

  // Snapshots
  @Prop({ type: [AccountSnapshotSchema], default: [] })
  accountSnapshots!: AccountSnapshot[];

  @Prop({ type: [CreditCardSnapshotSchema], default: [] })
  creditCardSnapshots!: CreditCardSnapshot[];

  @Prop({ type: [DebtSnapshotSchema], default: [] })
  debtSnapshots!: DebtSnapshot[];

  @Prop({ type: [FundSnapshotSchema], default: [] })
  fundSnapshots!: FundSnapshot[];

  @Prop({ type: SummaryMetricsSchema, default: {} })
  summary!: SummaryMetrics;

  @Prop({ default: '' })
  note?: string;

  @Prop({ default: () => new Date() })
  createdAt?: Date;

  @Prop({ default: () => new Date() })
  updatedAt?: Date;
}

export const ClosureSchema = SchemaFactory.createForClass(Closure);

// Índices
ClosureSchema.index({ userId: 1, month: 1 }, { unique: true });
ClosureSchema.index({ userId: 1, status: 1 });
ClosureSchema.index({ userId: 1, generatedAt: -1 });
