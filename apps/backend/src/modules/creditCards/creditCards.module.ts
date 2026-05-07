import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CreditCardsService } from './creditCards.service';
import { CreditCardsController } from './creditCards.controller';
import { CreditCard, CreditCardSchema } from './schemas/creditCard.schema';
import { AccountsModule } from '../accounts/accounts.module';
import { MovementsModule } from '../movements/movements.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: CreditCard.name, schema: CreditCardSchema }]),
    AccountsModule,
    MovementsModule,
  ],
  providers: [CreditCardsService],
  controllers: [CreditCardsController],
  exports: [CreditCardsService],
})
export class CreditCardsModule {}
