import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClosuresService } from './closures.service';
import { ClosuresController } from './closures.controller';
import { Closure, ClosureSchema } from './schemas/closure.schema';
import { AccountsModule } from '../accounts/accounts.module';
import { CreditCardsModule } from '../creditCards/creditCards.module';
import { DebtsModule } from '../debts/debts.module';
import { FundsModule } from '../funds/funds.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Closure.name, schema: ClosureSchema }]),
    AccountsModule,
    CreditCardsModule,
    DebtsModule,
    FundsModule,
  ],
  providers: [ClosuresService],
  controllers: [ClosuresController],
  exports: [ClosuresService],
})
export class ClosuresModule {}
