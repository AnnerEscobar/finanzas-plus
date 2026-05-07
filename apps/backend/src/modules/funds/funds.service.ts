import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Fund, FundContribution } from './schemas/fund.schema';

@Injectable()
export class FundsService {
  constructor(
    @InjectModel(Fund.name) private fundModel: Model<Fund>,
  ) {}

  /**
   * Create a new fund
   */
  async createFund(userId: string, data: any) {
    if (!data.alias) {
      throw new BadRequestException('El alias es requerido');
    }

    const fund = new this.fundModel({
      userId,
      alias: data.alias,
      description: data.description || '',
      institution: data.institution || '',
      fundType: data.fundType || 'retirement',
      targetAmountCents: data.targetAmountCents || 0,
      currentAmountCents: data.currentAmountCents || 0,
      monthlyContributionCents: data.monthlyContributionCents || 0,
      annualInterestRate: data.annualInterestRate || 0,
      startDate: data.startDate ? new Date(data.startDate) : new Date(),
      targetDate: data.targetDate ? new Date(data.targetDate) : undefined,
      contributions: [],
      status: 'active',
      note: data.note || '',
      isActive: true,
    });

    return fund.save();
  }

  /**
   * Find all active funds for a user
   */
  async findByUserId(userId: string) {
    return this.fundModel.find({ userId, isActive: true }).sort({ createdAt: -1 });
  }

  /**
   * Find fund by ID
   */
  async findById(id: string) {
    return this.fundModel.findById(id);
  }

  /**
   * Find fund by ID with user validation
   */
  async findByIdAndUser(id: string, userId: string) {
    const fund = await this.fundModel.findOne({ _id: id, userId });
    if (!fund) {
      throw new NotFoundException('Fondo no encontrado');
    }
    return fund;
  }

  /**
   * Update fund details
   */
  async updateFund(id: string, userId: string, updateData: any) {
    await this.findByIdAndUser(id, userId);

    delete updateData.userId;
    delete updateData.contributions;
    delete updateData._id;
    delete updateData.currentAmountCents; // Solo se actualiza al agregar contribución

    const fund = await this.fundModel.findByIdAndUpdate(id, updateData, { new: true });
    if (!fund) {
      throw new NotFoundException('Fondo no encontrado');
    }
    return fund;
  }

  /**
   * Soft delete fund
   */
  async deleteFund(id: string, userId: string) {
    await this.findByIdAndUser(id, userId);

    const fund = await this.fundModel.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true },
    );
    if (!fund) {
      throw new NotFoundException('Fondo no encontrado');
    }
    return fund;
  }

  /**
   * Add a contribution to a fund
   */
  async addContribution(id: string, userId: string, data: any) {
    const fund = await this.findByIdAndUser(id, userId);

    if (fund.status !== 'active') {
      throw new BadRequestException('Solo se pueden agregar aportes a fondos activos');
    }

    if (!data.amountCents || data.amountCents <= 0) {
      throw new BadRequestException('El monto del aporte debe ser mayor a 0');
    }

    const contribution: any = {
      amountCents: data.amountCents,
      date: data.date ? new Date(data.date) : new Date(),
      accountId: data.accountId,
      note: data.note || '',
      createdAt: new Date(),
    };

    fund.contributions.push(contribution);
    fund.currentAmountCents += contribution.amountCents;

    // Si llegó al objetivo, marcar como maduro
    if (
      fund.targetAmountCents > 0 &&
      fund.currentAmountCents >= fund.targetAmountCents
    ) {
      fund.status = 'matured';
    }

    return fund.save();
  }

  /**
   * Get all contributions for a fund
   */
  async getContributions(id: string, userId: string) {
    const fund = await this.findByIdAndUser(id, userId);
    return fund.contributions;
  }

  /**
   * Delete a contribution
   */
  async deleteContribution(id: string, userId: string, contributionId: string) {
    const fund = await this.findByIdAndUser(id, userId);

    const contribution = fund.contributions.find(
      (c) => c._id.toString() === contributionId,
    );
    if (!contribution) {
      throw new NotFoundException('Aporte no encontrado');
    }

    // Restar del monto actual
    fund.currentAmountCents = Math.max(0, fund.currentAmountCents - contribution.amountCents);

    // Re-activar si estaba maduro
    if (fund.status === 'matured' && fund.currentAmountCents < fund.targetAmountCents) {
      fund.status = 'active';
    }

    fund.contributions = fund.contributions.filter(
      (c) => c._id.toString() !== contributionId,
    );

    return fund.save();
  }

  /**
   * Calcular proyección a futuro usando interés compuesto mensual
   * FV = PV(1+r)^n + PMT * (((1+r)^n - 1) / r)
   * donde r = tasa mensual, n = número de meses
   */
  calculateProjection(fund: Fund): {
    projectedValueCents: number;
    monthsRemaining: number;
    totalContributionsCents: number;
    estimatedInterestCents: number;
  } {
    if (!fund.targetDate) {
      return {
        projectedValueCents: fund.currentAmountCents,
        monthsRemaining: 0,
        totalContributionsCents: 0,
        estimatedInterestCents: 0,
      };
    }

    const now = new Date();
    const target = new Date(fund.targetDate);
    const monthsRemaining = Math.max(
      0,
      Math.round(
        (target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30.44),
      ),
    );

    if (monthsRemaining === 0) {
      return {
        projectedValueCents: fund.currentAmountCents,
        monthsRemaining: 0,
        totalContributionsCents: 0,
        estimatedInterestCents: 0,
      };
    }

    const monthlyRate = (fund.annualInterestRate / 100) / 12;
    const PV = fund.currentAmountCents / 100;
    const PMT = fund.monthlyContributionCents / 100;
    const n = monthsRemaining;

    let FV: number;
    if (monthlyRate === 0) {
      FV = PV + PMT * n;
    } else {
      FV = PV * Math.pow(1 + monthlyRate, n) + PMT * ((Math.pow(1 + monthlyRate, n) - 1) / monthlyRate);
    }

    const projectedValueCents = Math.round(FV * 100);
    const totalContributionsCents = fund.monthlyContributionCents * n;
    const estimatedInterestCents = projectedValueCents - fund.currentAmountCents - totalContributionsCents;

    return {
      projectedValueCents,
      monthsRemaining,
      totalContributionsCents,
      estimatedInterestCents: Math.max(0, estimatedInterestCents),
    };
  }

  /**
   * Get fund with projection
   */
  async getFundWithProjection(id: string, userId: string) {
    const fund = await this.findByIdAndUser(id, userId);
    const projection = this.calculateProjection(fund);

    return {
      fund,
      projection: {
        ...projection,
        projectedValueFormatted: `Q${(projection.projectedValueCents / 100).toFixed(2)}`,
        totalContributionsFormatted: `Q${(projection.totalContributionsCents / 100).toFixed(2)}`,
        estimatedInterestFormatted: `Q${(projection.estimatedInterestCents / 100).toFixed(2)}`,
      },
    };
  }

  /**
   * Get total saved across all funds
   */
  async getTotalSaved(userId: string): Promise<number> {
    const funds = await this.findByUserId(userId);
    return funds.reduce((sum, f) => sum + f.currentAmountCents, 0);
  }

  /**
   * Get summary of all funds
   */
  async getSummary(userId: string) {
    const funds = await this.findByUserId(userId);

    const totalCurrent = funds.reduce((sum, f) => sum + f.currentAmountCents, 0);
    const totalTarget = funds.reduce((sum, f) => sum + f.targetAmountCents, 0);
    const totalMonthly = funds.reduce((sum, f) => sum + f.monthlyContributionCents, 0);

    // Proyección agregada
    let totalProjected = 0;
    for (const fund of funds) {
      const proj = this.calculateProjection(fund);
      totalProjected += proj.projectedValueCents;
    }

    return {
      count: funds.length,
      totalCurrentCents: totalCurrent,
      totalTargetCents: totalTarget,
      totalMonthlyContributionCents: totalMonthly,
      totalProjectedCents: totalProjected,
      totalCurrentFormatted: `Q${(totalCurrent / 100).toFixed(2)}`,
      totalTargetFormatted: `Q${(totalTarget / 100).toFixed(2)}`,
      totalMonthlyContributionFormatted: `Q${(totalMonthly / 100).toFixed(2)}`,
      totalProjectedFormatted: `Q${(totalProjected / 100).toFixed(2)}`,
      progressPercentage:
        totalTarget > 0 ? Math.round((totalCurrent / totalTarget) * 100) : 0,
    };
  }
}
