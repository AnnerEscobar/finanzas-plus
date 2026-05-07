import { Module } from '@nestjs/common';
import { DebtPlanService } from './debtPlan.service';
import { DebtPlanController } from './debtPlan.controller';
import { DebtsModule } from '../debts/debts.module';
import { CreditCardsModule } from '../creditCards/creditCards.module';

@Module({
  imports: [DebtsModule, CreditCardsModule],
  providers: [DebtPlanService],
  controllers: [DebtPlanController],
  exports: [DebtPlanService],
})
export class DebtPlanModule {}
