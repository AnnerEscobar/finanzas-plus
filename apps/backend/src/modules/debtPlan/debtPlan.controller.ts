import { Controller, Post, Body, UseGuards, Req, HttpCode } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DebtPlanService } from './debtPlan.service';

@Controller('debt-plans')
@UseGuards(JwtAuthGuard)
export class DebtPlanController {
  constructor(private debtPlanService: DebtPlanService) {}

  /**
   * POST /debt-plans/calculate
   * Calcula los 3 métodos: bola de nieve, avalancha, manual
   * Body: { extraPaymentCents?: number, manualOrder?: string[] }
   */
  @Post('calculate')
  @HttpCode(200)
  async calculate(@Body() data: any, @Req() req: any) {
    return this.debtPlanService.calculateComparison(req.user.userId, data || {});
  }
}
