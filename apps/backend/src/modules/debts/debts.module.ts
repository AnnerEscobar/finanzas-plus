import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DebtsService } from './debts.service';
import { DebtsController } from './debts.controller';
import { Debt, DebtSchema } from './schemas/debt.schema';
import { AccountsModule } from '../accounts/accounts.module';
import { MovementsModule } from '../movements/movements.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Debt.name, schema: DebtSchema }]),
    AccountsModule,
    MovementsModule,
  ],
  providers: [DebtsService],
  controllers: [DebtsController],
  exports: [DebtsService],
})
export class DebtsModule {}
