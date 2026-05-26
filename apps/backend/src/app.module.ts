import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from './config/config.module';
import { getEnv } from './config/env';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { AccountsModule } from './modules/accounts/accounts.module';
import { MovementsModule } from './modules/movements/movements.module';
import { CreditCardsModule } from './modules/creditCards/creditCards.module';
import { DebtsModule } from './modules/debts/debts.module';
import { FundsModule } from './modules/funds/funds.module';
import { DebtPlanModule } from './modules/debtPlan/debtPlan.module';
import { ReportsModule } from './modules/reports/reports.module';
import { ClosuresModule } from './modules/closures/closures.module';
@Module({
  imports: [
    ConfigModule.forRoot(),
    MongooseModule.forRoot(getEnv('MONGODB_URI', 'mongodb://localhost:27017/finanzas-plus')),
    AuthModule,
    UsersModule,
    AccountsModule,
    MovementsModule,
    CreditCardsModule,
    DebtsModule,
    FundsModule,
    DebtPlanModule,
    ReportsModule,
    ClosuresModule,
  ],
})
export class AppModule {}
