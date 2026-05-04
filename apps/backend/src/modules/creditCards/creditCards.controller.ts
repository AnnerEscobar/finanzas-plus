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
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreditCardsService } from './creditCards.service';

@Controller('credit-cards')
@UseGuards(JwtAuthGuard)
export class CreditCardsController {
  constructor(private creditCardsService: CreditCardsService) {}

  /**
   * POST /credit-cards
   * Create a new credit card
   */
  @Post()
  @HttpCode(201)
  async createCard(@Body() cardData: any, @Req() req: any) {
    return this.creditCardsService.createCard(req.user.userId, cardData);
  }

  /**
   * GET /credit-cards
   * List all credit cards for the user
   */
  @Get()
  async findByUser(@Req() req: any) {
    const cards = await this.creditCardsService.findByUserId(req.user.userId);
    const totalBalance = await this.creditCardsService.getTotalBalance(req.user.userId);

    return {
      cards,
      totalBalance,
      totalBalanceFormatted: `Q${(totalBalance / 100).toFixed(2)}`,
    };
  }

  /**
   * GET /credit-cards/balance/total
   * Get total balance across all cards
   */
  @Get('balance/total')
  async getTotalBalance(@Req() req: any) {
    const totalCents = await this.creditCardsService.getTotalBalance(req.user.userId);

    return {
      totalCents,
      totalFormatted: `Q${(totalCents / 100).toFixed(2)}`,
    };
  }

  /**
   * GET /credit-cards/:id
   * Get specific card with all statement cycles
   */
  @Get(':id')
  async getCard(@Param('id') id: string, @Req() req: any) {
    return this.creditCardsService.findByIdAndUser(id, req.user.userId);
  }

  /**
   * GET /credit-cards/:id/summary
   * Get card summary with balance and available credit
   */
  @Get(':id/summary')
  async getCardSummary(@Param('id') id: string, @Req() req: any) {
    return this.creditCardsService.getCardSummary(req.user.userId, id);
  }

  /**
   * PUT /credit-cards/:id
   * Update card details (alias, credit limit, etc.)
   */
  @Put(':id')
  async updateCard(@Param('id') id: string, @Body() updateData: any, @Req() req: any) {
    // Verify user owns this card
    await this.creditCardsService.findByIdAndUser(id, req.user.userId);
    return this.creditCardsService.updateCard(id, updateData);
  }

  /**
   * DELETE /credit-cards/:id
   * Soft delete card (mark as inactive)
   */
  @Delete(':id')
  async deleteCard(@Param('id') id: string, @Req() req: any) {
    // Verify user owns this card
    await this.creditCardsService.findByIdAndUser(id, req.user.userId);
    return this.creditCardsService.deleteCard(id);
  }

  // ============================================
  // Statement Cycles (Cortes) Endpoints
  // ============================================

  /**
   * GET /credit-cards/:id/cortes
   * List all statement cycles for a card
   */
  @Get(':id/cortes')
  async getCortes(@Param('id') id: string, @Req() req: any) {
    const card = await this.creditCardsService.findByIdAndUser(id, req.user.userId);
    return {
      cortes: card.statementCycles,
      count: card.statementCycles.length,
    };
  }

  /**
   * GET /credit-cards/:id/cortes/:corteId
   * Get specific statement cycle details
   */
  @Get(':id/cortes/:corteId')
  async getCorte(@Param('id') id: string, @Param('corteId') corteId: string, @Req() req: any) {
    const card = await this.creditCardsService.findByIdAndUser(id, req.user.userId);
    const corte = card.statementCycles.find((c) => c._id.toString() === corteId);

    if (!corte) {
      return { error: 'Corte no encontrado', statusCode: 404 };
    }

    return corte;
  }

  /**
   * GET /credit-cards/:id/cortes/:corteId/statement
   * Get full statement detail (charges, payments, balance)
   */
  @Get(':id/cortes/:corteId/statement')
  async getStatement(@Param('id') id: string, @Param('corteId') corteId: string, @Req() req: any) {
    return this.creditCardsService.getStatementDetail(req.user.userId, id, corteId);
  }

  // ============================================
  // Charges Endpoints
  // ============================================

  /**
   * POST /credit-cards/:id/cortes/:corteId/charges
   * Record a new charge to a statement cycle
   */
  @Post(':id/cortes/:corteId/charges')
  @HttpCode(201)
  async recordCharge(
    @Param('id') id: string,
    @Param('corteId') corteId: string,
    @Body() data: any,
    @Req() req: any,
  ) {
    return this.creditCardsService.recordCharge(req.user.userId, id, {
      ...data,
      corteId,
    });
  }

  /**
   * GET /credit-cards/:id/cortes/:corteId/charges
   * List all charges for a statement cycle
   */
  @Get(':id/cortes/:corteId/charges')
  async getCharges(
    @Param('id') id: string,
    @Param('corteId') corteId: string,
    @Req() req: any,
  ) {
    const charges = await this.creditCardsService.getCorteCharges(req.user.userId, id, corteId);
    return {
      charges,
      count: charges.length,
      total: charges.reduce((sum, ch) => sum + ch.amountCents, 0),
      totalFormatted: `Q${(charges.reduce((sum, ch) => sum + ch.amountCents, 0) / 100).toFixed(2)}`,
    };
  }

  /**
   * DELETE /credit-cards/:id/cortes/:corteId/charges/:chargeId
   * Delete a charge from a statement cycle
   */
  @Delete(':id/cortes/:corteId/charges/:chargeId')
  async deleteCharge(
    @Param('id') id: string,
    @Param('corteId') corteId: string,
    @Param('chargeId') chargeId: string,
    @Req() req: any,
  ) {
    return this.creditCardsService.deleteCharge(req.user.userId, id, corteId, chargeId);
  }

  // ============================================
  // Payments Endpoints
  // ============================================

  /**
   * POST /credit-cards/:id/cortes/:corteId/payments
   * Record a payment against a statement cycle
   */
  @Post(':id/cortes/:corteId/payments')
  @HttpCode(201)
  async recordPayment(
    @Param('id') id: string,
    @Param('corteId') corteId: string,
    @Body() data: any,
    @Req() req: any,
  ) {
    return this.creditCardsService.recordPayment(req.user.userId, id, {
      ...data,
      corteId,
    });
  }

  /**
   * GET /credit-cards/:id/cortes/:corteId/payments
   * List all payments for a statement cycle
   */
  @Get(':id/cortes/:corteId/payments')
  async getPayments(
    @Param('id') id: string,
    @Param('corteId') corteId: string,
    @Req() req: any,
  ) {
    const payments = await this.creditCardsService.getCortePayments(req.user.userId, id, corteId);
    return {
      payments,
      count: payments.length,
      total: payments.reduce((sum, p) => sum + p.amountCents, 0),
      totalFormatted: `Q${(payments.reduce((sum, p) => sum + p.amountCents, 0) / 100).toFixed(2)}`,
    };
  }
}
