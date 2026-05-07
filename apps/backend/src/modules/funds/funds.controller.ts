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
import { FundsService } from './funds.service';

@Controller('funds')
@UseGuards(JwtAuthGuard)
export class FundsController {
  constructor(private fundsService: FundsService) {}

  /**
   * POST /funds
   * Create a new fund
   */
  @Post()
  @HttpCode(201)
  async createFund(@Body() data: any, @Req() req: any) {
    return this.fundsService.createFund(req.user.userId, data);
  }

  /**
   * GET /funds
   * List all funds with summary
   */
  @Get()
  async findByUser(@Req() req: any) {
    const funds = await this.fundsService.findByUserId(req.user.userId);
    const summary = await this.fundsService.getSummary(req.user.userId);

    return {
      funds,
      summary,
    };
  }

  /**
   * GET /funds/summary
   */
  @Get('summary')
  async getSummary(@Req() req: any) {
    return this.fundsService.getSummary(req.user.userId);
  }

  /**
   * GET /funds/balance/total
   */
  @Get('balance/total')
  async getTotalSaved(@Req() req: any) {
    const totalCents = await this.fundsService.getTotalSaved(req.user.userId);
    return {
      totalCents,
      totalFormatted: `Q${(totalCents / 100).toFixed(2)}`,
    };
  }

  /**
   * GET /funds/:id
   */
  @Get(':id')
  async getFund(@Param('id') id: string, @Req() req: any) {
    return this.fundsService.findByIdAndUser(id, req.user.userId);
  }

  /**
   * GET /funds/:id/projection
   */
  @Get(':id/projection')
  async getFundWithProjection(@Param('id') id: string, @Req() req: any) {
    return this.fundsService.getFundWithProjection(id, req.user.userId);
  }

  /**
   * PUT /funds/:id
   */
  @Put(':id')
  async updateFund(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    return this.fundsService.updateFund(id, req.user.userId, data);
  }

  /**
   * DELETE /funds/:id
   */
  @Delete(':id')
  async deleteFund(@Param('id') id: string, @Req() req: any) {
    return this.fundsService.deleteFund(id, req.user.userId);
  }

  // ============================================
  // Contributions Endpoints
  // ============================================

  /**
   * POST /funds/:id/contributions
   */
  @Post(':id/contributions')
  @HttpCode(201)
  async addContribution(
    @Param('id') id: string,
    @Body() data: any,
    @Req() req: any,
  ) {
    return this.fundsService.addContribution(id, req.user.userId, data);
  }

  /**
   * GET /funds/:id/contributions
   */
  @Get(':id/contributions')
  async getContributions(@Param('id') id: string, @Req() req: any) {
    const contributions = await this.fundsService.getContributions(id, req.user.userId);
    const total = contributions.reduce((sum, c) => sum + c.amountCents, 0);

    return {
      contributions,
      count: contributions.length,
      total,
      totalFormatted: `Q${(total / 100).toFixed(2)}`,
    };
  }

  /**
   * DELETE /funds/:id/contributions/:contributionId
   */
  @Delete(':id/contributions/:contributionId')
  async deleteContribution(
    @Param('id') id: string,
    @Param('contributionId') contributionId: string,
    @Req() req: any,
  ) {
    return this.fundsService.deleteContribution(id, req.user.userId, contributionId);
  }
}
