import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  UseGuards,
  Req,
  HttpCode,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DebtsService } from './debts.service';

@Controller('debts')
@UseGuards(JwtAuthGuard)
export class DebtsController {
  constructor(private debtsService: DebtsService) {}

  /**
   * POST /debts
   * Create a new debt
   */
  @Post()
  @HttpCode(201)
  async createDebt(@Body() data: any, @Req() req: any) {
    return this.debtsService.createDebt(req.user.userId, data);
  }

  /**
   * GET /debts
   * List all debts for the user with summary
   */
  @Get()
  async findByUser(@Req() req: any, @Query('status') status?: 'active' | 'paid' | 'all') {
    const debts = await this.debtsService.findByUserId(req.user.userId, status || 'active');
    const summary = await this.debtsService.getSummary(req.user.userId);

    return {
      debts,
      summary,
    };
  }

  /**
   * GET /debts/summary
   * Get debt summary for dashboard / reports
   */
  @Get('summary')
  async getSummary(@Req() req: any) {
    return this.debtsService.getSummary(req.user.userId);
  }

  /**
   * GET /debts/balance/total
   * Total debt across all active debts
   */
  @Get('balance/total')
  async getTotalDebt(@Req() req: any) {
    const totalCents = await this.debtsService.getTotalDebt(req.user.userId);
    return {
      totalCents,
      totalFormatted: `Q${(totalCents / 100).toFixed(2)}`,
    };
  }

  /**
   * GET /debts/:id
   * Get specific debt details
   */
  @Get(':id')
  async getDebt(@Param('id') id: string, @Req() req: any) {
    return this.debtsService.findByIdAndUser(id, req.user.userId);
  }

  /**
   * PUT /debts/:id
   * Update debt details
   */
  @Put(':id')
  async updateDebt(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    return this.debtsService.updateDebt(id, req.user.userId, data);
  }

  /**
   * DELETE /debts/:id
   * Soft delete debt (mark as inactive)
   */
  @Delete(':id')
  async deleteDebt(@Param('id') id: string, @Req() req: any) {
    return this.debtsService.deleteDebt(id, req.user.userId);
  }

  // ============================================
  // Payments Endpoints
  // ============================================

  /**
   * POST /debts/:id/payments
   * Record a new payment against a debt
   */
  @Post(':id/payments')
  @HttpCode(201)
  async recordPayment(
    @Param('id') id: string,
    @Body() data: any,
    @Req() req: any,
  ) {
    return this.debtsService.recordPayment(id, req.user.userId, data);
  }

  /**
   * GET /debts/:id/payments
   * List all payments for a debt
   */
  @Get(':id/payments')
  async getPayments(@Param('id') id: string, @Req() req: any) {
    const payments = await this.debtsService.getPayments(id, req.user.userId);
    const total = payments.reduce((sum, p) => sum + p.amountCents, 0);

    return {
      payments,
      count: payments.length,
      total,
      totalFormatted: `Q${(total / 100).toFixed(2)}`,
    };
  }

  /**
   * DELETE /debts/:id/payments/:paymentId
   * Delete a payment from a debt (revertir saldo)
   */
  @Delete(':id/payments/:paymentId')
  async deletePayment(
    @Param('id') id: string,
    @Param('paymentId') paymentId: string,
    @Req() req: any,
  ) {
    return this.debtsService.deletePayment(id, req.user.userId, paymentId);
  }
}
