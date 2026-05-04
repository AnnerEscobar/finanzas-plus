import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ required: true })
  name!: string;

  @Prop({ required: true, unique: true })
  email!: string;

  @Prop({ default: 'Q' })
  currency!: string;

  @Prop({ default: 'America/Guatemala' })
  timezone!: string;

  @Prop({ type: Object, default: {} })
  settings!: Record<string, any>;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
// Allow string _id for custom user IDs
UserSchema.set('_id', false);
UserSchema.add({ _id: { type: String, required: true } });
