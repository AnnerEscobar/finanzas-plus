import {
  Controller,
  Get,
  Query,
  Res,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReportsService } from './reports.service';
import { ExportService } from './export.service';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(
    private reportsService: ReportsService,
    private exportService: ExportService,
  ) {}

  /**
   * GET /reports/overview
   * Dashboard general con todos los totales
   */
  @Get('overview')
  async getOverview(@Req() req: any) {
    return this.reportsService.getOverview(req.user.userId);
  }

  /**
   * GET /reports/net-worth-evolution
   * Evolución del patrimonio neto (basado en cierres mensuales)
   */
  @Get('net-worth-evolution')
  async getNetWorthEvolution(@Req() req: any) {
    return this.reportsService.getNetWorthEvolution(req.user.userId);
  }

  /**
   * GET /reports/debt-evolution
   */
  @Get('debt-evolution')
  async getDebtEvolution(@Req() req: any) {
    return this.reportsService.getDebtEvolution(req.user.userId);
  }

  /**
   * GET /reports/expense-by-category?year=2026&month=5
   */
  @Get('expense-by-category')
  async getExpenseByCategory(
    @Query('year') year: string,
    @Query('month') month: string,
    @Req() req: any,
  ) {
    return this.reportsService.getExpenseByCategory(
      req.user.userId,
      year ? parseInt(year) : undefined,
      month ? parseInt(month) : undefined,
    );
  }

  /**
   * GET /reports/income-vs-expense?monthsBack=6
   */
  @Get('income-vs-expense')
  async getIncomeVsExpense(@Query('monthsBack') monthsBack: string, @Req() req: any) {
    return this.reportsService.getIncomeVsExpense(
      req.user.userId,
      monthsBack ? parseInt(monthsBack) : 6,
    );
  }

  /**
   * GET /reports/top-expenses?limit=10
   */
  @Get('top-expenses')
  async getTopExpenses(
    @Query('limit') limit: string,
    @Query('year') year: string,
    @Query('month') month: string,
    @Req() req: any,
  ) {
    return this.reportsService.getTopExpenses(
      req.user.userId,
      limit ? parseInt(limit) : 10,
      year ? parseInt(year) : undefined,
      month ? parseInt(month) : undefined,
    );
  }

  /**
   * GET /reports/asset-distribution
   */
  @Get('asset-distribution')
  async getAssetDistribution(@Req() req: any) {
    return this.reportsService.getAssetDistribution(req.user.userId);
  }

  /**
   * GET /reports/debt-distribution
   */
  @Get('debt-distribution')
  async getDebtDistribution(@Req() req: any) {
    return this.reportsService.getDebtDistribution(req.user.userId);
  }

  /**
   * GET /reports/excel?year=2026&month=5
   * Descarga reporte mensual en Excel
   */
  @Get('excel')
  async exportExcel(
    @Query('year') year: string,
    @Query('month') month: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const now = new Date();
    const y = year ? parseInt(year) : now.getFullYear();
    const m = month ? parseInt(month) : now.getMonth() + 1;

    const data = await this.reportsService.getMonthlyReportData(req.user.userId, y, m);
    const buffer = await this.exportService.generateExcel(data);

    const filename = `Finanzas-${y}-${String(m).padStart(2, '0')}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  /**
   * GET /reports/pdf?year=2026&month=5
   * Descarga reporte mensual en PDF
   */
  @Get('pdf')
  async exportPdf(
    @Query('year') year: string,
    @Query('month') month: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const now = new Date();
    const y = year ? parseInt(year) : now.getFullYear();
    const m = month ? parseInt(month) : now.getMonth() + 1;

    const data = await this.reportsService.getMonthlyReportData(req.user.userId, y, m);
    const buffer = await this.exportService.generatePdf(data);

    const filename = `Finanzas-${y}-${String(m).padStart(2, '0')}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }
}
