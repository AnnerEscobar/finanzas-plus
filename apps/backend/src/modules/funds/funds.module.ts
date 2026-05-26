import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FundsService } from './funds.service';
import { FundsController } from './funds.controller';
import { Fund, FundSchema } from './schemas/fund.schema';
import { AccountsModule } from '../accounts/accounts.module';
import { MovementsModule } from '../movements/movements.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Fund.name, schema: FundSchema }]),
    AccountsModule,
    MovementsModule,
  ],
  providers: [FundsService],
  controllers: [FundsController],
  exports: [FundsService],
})
export class FundsModule {}
