import { Module } from '@nestjs/common';
import { CreditCardsService } from './creditCards.service';
import { CreditCardsController } from './creditCards.controller';

@Module({
  providers: [CreditCardsService],
  controllers: [CreditCardsController],
  exports: [CreditCardsService],
})
export class CreditCardsModule {}
