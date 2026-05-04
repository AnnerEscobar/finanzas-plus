import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Category extends Document {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId!: Types.ObjectId;

  @Prop({ required: true })
  name!: string;

  @Prop({ enum: ['expense', 'income'], default: 'expense' })
  type!: string;

  @Prop({ default: false })
  isDefault!: boolean;

  @Prop({ default: true })
  isActive!: boolean;

  @Prop({ default: () => new Date() })
  createdAt?: Date;

  @Prop({ default: () => new Date() })
  updatedAt?: Date;
}

export const CategorySchema = SchemaFactory.createForClass(Category);

// Índices
CategorySchema.index({ userId: 1, type: 1, isActive: 1 });
CategorySchema.index({ userId: 1 });
