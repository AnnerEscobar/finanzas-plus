import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ExportService } from './export.service';
import { ReportsController } from './reports.controller';
import { AccountsModule } from '../accounts/accounts.module';
import { CreditCardsModule } from '../creditCards/creditCards.module';
import { DebtsModule } from '../debts/debts.module';
import { FundsModule } from '../funds/funds.module';
import { MovementsModule } from '../movements/movements.module';
import { ClosuresModule } from '../closures/closures.module';

@Module({
  imports: [
    AccountsModule,
    CreditCardsModule,
    DebtsModule,
    FundsModule,
    MovementsModule,
    ClosuresModule,
  ],
  providers: [ReportsService, ExportService],
  controllers: [ReportsController],
  exports: [ReportsService],
})
export class ReportsModule {}
