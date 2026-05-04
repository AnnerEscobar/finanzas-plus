import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreditCard, CreditCardCorte, Charge, Payment } from './schemas/creditCard.schema';
import { AccountsService } from '../accounts/accounts.service';

@Injectable()
export class CreditCardsService {
  constructor(
    @InjectModel(CreditCard.name) private creditCardModel: Model<CreditCard>,
    private accountsService: AccountsService,
  ) {}

  /**
   * Create a new credit card with initial statement cycles
   * For G&T: Creates 2 cortes with cutoff days 15 and 10
   */
  async createCard(userId: string, cardData: any) {
    // Validate credit limit
    if (!cardData.creditLimitCents || cardData.creditLimitCents <= 0) {
      throw new BadRequestException('El límite de crédito debe ser mayor a 0');
    }

    // Create 2 initial statement cycles (G&T pattern: cutoff 15 and 10)
    const today = new Date();
    const statementCycles = this.generateInitialCortes(today);

    const card = new this.creditCardModel({
      userId,
      ...cardData,
      statementCycles,
      totalBalanceCents: 0,
      availableCreditCents: cardData.creditLimitCents,
      isActive: true,
    });

    return card.save();
  }

  /**
   * Generate initial cortes for a new card (G&T pattern)
   * Corte 1: Cutoff day 15 (opens ~4 days before, closes ~21 days after)
   * Corte 2: Cutoff day 10 (opens ~4 days before, closes ~21 days after)
   */
  private generateInitialCortes(referenceDate: Date): CreditCardCorte[] {
    const cortes: CreditCardCorte[] = [];
    const month = referenceDate.getMonth();
    const year = referenceDate.getFullYear();

    // Corte 1: Opening ~11 days before cutoff 15
    const corte1Opening = new Date(year, month, 4);
    const corte1Closing = new Date(year, month, 3);
    corte1Closing.setMonth(corte1Closing.getMonth() + 1);

    cortes.push({
      cycleNumber: 1,
      openingDate: corte1Opening,
      closingDate: corte1Closing,
      cutoffDay: 15,
      charges: [],
      payments: [],
      chargesTotal: 0,
      paymentsTotal: 0,
      balanceCents: 0,
      interestCents: 0,
      status: 'open',
      isClosed: false,
    } as any);

    // Corte 2: Opening ~11 days before cutoff 10
    const corte2Opening = new Date(year, month, 28);
    const corte2Closing = new Date(year, month, 27);
    corte2Closing.setMonth(corte2Closing.getMonth() + 1);

    cortes.push({
      cycleNumber: 2,
      openingDate: corte2Opening,
      closingDate: corte2Closing,
      cutoffDay: 10,
      charges: [],
      payments: [],
      chargesTotal: 0,
      paymentsTotal: 0,
      balanceCents: 0,
      interestCents: 0,
      status: 'open',
      isClosed: false,
    } as any);

    return cortes;
  }

  /**
   * Find all active cards for a user
   */
  async findByUserId(userId: string) {
    return this.creditCardModel.find({ userId, isActive: true });
  }

  /**
   * Find card by ID
   */
  async findById(id: string) {
    return this.creditCardModel.findById(id);
  }

  /**
   * Find card by ID with user validation
   */
  async findByIdAndUser(id: string, userId: string) {
    const card = await this.creditCardModel.findOne({ _id: id, userId });
    if (!card) {
      throw new NotFoundException('Tarjeta de crédito no encontrada');
    }
    return card;
  }

  /**
   * Update card details (alias, limit, etc.)
   */
  async updateCard(id: string, updateData: any) {
    const card = await this.creditCardModel.findByIdAndUpdate(id, updateData, { new: true });
    if (!card) {
      throw new NotFoundException('Tarjeta de crédito no encontrada');
    }
    return card;
  }

  /**
   * Soft delete card (mark as inactive)
   */
  async deleteCard(id: string) {
    const card = await this.creditCardModel.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true },
    );
    if (!card) {
      throw new NotFoundException('Tarjeta de crédito no encontrada');
    }
    return card;
  }

  /**
   * Get total balance across all cards for a user
   */
  async getTotalBalance(userId: string): Promise<number> {
    const cards = await this.findByUserId(userId);
    return cards.reduce((sum, card) => sum + card.totalBalanceCents, 0);
  }

  /**
   * Record a charge to an open statement cycle
   */
  async recordCharge(userId: string, cardId: string, data: any) {
    const card = await this.findByIdAndUser(cardId, userId);

    // Find the corte
    const corte = card.statementCycles.find((c) => c._id.toString() === data.corteId);
    if (!corte) {
      throw new NotFoundException('Corte de estado no encontrado');
    }

    // Validate corte is open
    if (corte.status !== 'open') {
      throw new BadRequestException('No se puede agregar cargos a un corte cerrado');
    }

    // Create charge
    const charge: any = {
      description: data.description,
      amountCents: data.amountCents,
      date: data.date || new Date(),
      categoryId: data.categoryId,
      note: data.note,
      createdAt: new Date(),
    };

    // Add charge to corte
    corte.charges.push(charge);

    // Update totals
    corte.chargesTotal += charge.amountCents;
    corte.balanceCents = corte.chargesTotal - corte.paymentsTotal;

    // Update card total balance
    card.totalBalanceCents = card.statementCycles.reduce(
      (sum, c) => sum + (c.status === 'open' ? c.balanceCents : 0),
      0,
    );
    card.availableCreditCents = card.creditLimitCents - card.totalBalanceCents;

    return card.save();
  }

  /**
   * Get charges for a specific corte
   */
  async getCorteCharges(userId: string, cardId: string, corteId: string) {
    const card = await this.findByIdAndUser(cardId, userId);
    const corte = card.statementCycles.find((c) => c._id.toString() === corteId);

    if (!corte) {
      throw new NotFoundException('Corte de estado no encontrado');
    }

    return corte.charges;
  }

  /**
   * Delete a charge from an open corte
   */
  async deleteCharge(userId: string, cardId: string, corteId: string, chargeId: string) {
    const card = await this.findByIdAndUser(cardId, userId);
    const corte = card.statementCycles.find((c) => c._id.toString() === corteId);

    if (!corte) {
      throw new NotFoundException('Corte de estado no encontrado');
    }

    if (corte.status !== 'open') {
      throw new BadRequestException('No se puede eliminar cargos de un corte cerrado');
    }

    const charge = corte.charges.find((ch) => ch._id.toString() === chargeId);
    if (!charge) {
      throw new NotFoundException('Cargo no encontrado');
    }

    // Remove charge
    corte.charges = corte.charges.filter((ch) => ch._id.toString() !== chargeId);

    // Update totals
    corte.chargesTotal -= charge.amountCents;
    corte.balanceCents = corte.chargesTotal - corte.paymentsTotal;

    // Update card total balance
    card.totalBalanceCents = card.statementCycles.reduce(
      (sum, c) => sum + (c.status === 'open' ? c.balanceCents : 0),
      0,
    );
    card.availableCreditCents = card.creditLimitCents - card.totalBalanceCents;

    return card.save();
  }

  /**
   * Record a payment against a corte
   */
  async recordPayment(userId: string, cardId: string, data: any) {
    const card = await this.findByIdAndUser(cardId, userId);

    // Find the corte
    const corte = card.statementCycles.find((c) => c._id.toString() === data.corteId);
    if (!corte) {
      throw new NotFoundException('Corte de estado no encontrado');
    }

    // Validate corte is open
    if (corte.status !== 'open') {
      throw new BadRequestException('No se puede agregar pagos a un corte cerrado');
    }

    // Create payment
    const payment: any = {
      amountCents: data.amountCents,
      date: data.date || new Date(),
      accountId: data.accountId ? (data.accountId as any) : undefined,
      note: data.note,
      createdAt: new Date(),
    };

    // Add payment to corte
    corte.payments.push(payment);

    // Update totals
    corte.paymentsTotal += payment.amountCents;
    corte.balanceCents = corte.chargesTotal - corte.paymentsTotal;

    // Update card total balance (only include open cortes)
    card.totalBalanceCents = card.statementCycles.reduce(
      (sum, c) => sum + (c.status === 'open' ? Math.max(0, c.balanceCents) : 0),
      0,
    );
    card.availableCreditCents = card.creditLimitCents - card.totalBalanceCents;

    return card.save();
  }

  /**
   * Get payments for a specific corte
   */
  async getCortePayments(userId: string, cardId: string, corteId: string) {
    const card = await this.findByIdAndUser(cardId, userId);
    const corte = card.statementCycles.find((c) => c._id.toString() === corteId);

    if (!corte) {
      throw new NotFoundException('Corte de estado no encontrado');
    }

    return corte.payments;
  }

  /**
   * Get statement detail for a corte
   */
  async getStatementDetail(userId: string, cardId: string, corteId: string) {
    const card = await this.findByIdAndUser(cardId, userId);
    const corte = card.statementCycles.find((c) => c._id.toString() === corteId);

    if (!corte) {
      throw new NotFoundException('Corte de estado no encontrado');
    }

    return {
      corte,
      charges: corte.charges,
      payments: corte.payments,
      balance: corte.balanceCents,
    };
  }

  /**
   * Get card summary with all details
   */
  async getCardSummary(userId: string, cardId: string) {
    const card = await this.findByIdAndUser(cardId, userId);

    return {
      card,
      currentBalance: card.totalBalanceCents,
      currentBalanceFormatted: `Q${(card.totalBalanceCents / 100).toFixed(2)}`,
      availableCredit: card.availableCreditCents,
      availableCreditFormatted: `Q${(card.availableCreditCents / 100).toFixed(2)}`,
      creditLimit: card.creditLimitCents,
      creditLimitFormatted: `Q${(card.creditLimitCents / 100).toFixed(2)}`,
    };
  }
}
