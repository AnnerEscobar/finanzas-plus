import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FundsService } from './funds.service';
import { FundsController } from './funds.controller';
import { Fund, FundSchema } from './schemas/fund.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Fund.name, schema: FundSchema }]),
  ],
  providers: [FundsService],
  controllers: [FundsController],
  exports: [FundsService],
})
export class FundsModule {}
