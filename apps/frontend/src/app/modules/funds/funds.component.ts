import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { FundsService, Fund, FundSummary, FundProjection } from '../../core/services/funds.service';
import { AccountsService } from '../../core/services/accounts.service';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';

@Component({
  selector: 'app-funds',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NavbarComponent],
  templateUrl: './funds.component.html',
  styleUrls: ['./funds.component.css'],
})
export class FundsComponent implements OnInit, OnDestroy {
  // State
  funds: Fund[] = [];
  selectedFund: Fund | null = null;
  selectedProjection: FundProjection | null = null;
  summary: FundSummary | null = null;
  accounts: any[] = [];

  loading = false;
  error: string | null = null;

  // Dialogs
  showAddFundDialog = false;
  showEditFundDialog = false;
  showAddContributionDialog = false;

  // Forms
  fundForm!: FormGroup;
  editForm!: FormGroup;
  contributionForm!: FormGroup;

  private destroy$ = new Subject<void>();

  constructor(
    private fundsService: FundsService,
    private accountsService: AccountsService,
    private fb: FormBuilder,
  ) {
    this.initializeForms();
  }

  ngOnInit() {
    this.loadFunds();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForms() {
    this.fundForm = this.fb.group({
      alias: ['', Validators.required],
      description: [''],
      institution: [''],
      fundType: ['retirement', Validators.required],
      targetAmountCents: [0, [Validators.min(0)]],
      currentAmountCents: [0, [Validators.min(0)]],
      sourceAccountId: [''],
      monthlyContributionCents: [0, [Validators.min(0)]],
      annualInterestRate: [0, [Validators.min(0)]],
      startDate: [new Date().toISOString().split('T')[0]],
      targetDate: [''],
      note: [''],
    });

    this.editForm = this.fb.group({
      alias: ['', Validators.required],
      description: [''],
      institution: [''],
      fundType: ['retirement'],
      targetAmountCents: [0],
      monthlyContributionCents: [0],
      annualInterestRate: [0],
      targetDate: [''],
      note: [''],
    });

    this.contributionForm = this.fb.group({
      amountCents: ['', [Validators.required, Validators.min(0.01)]],
      date: [new Date().toISOString().split('T')[0]],
      accountId: ['', Validators.required],
      note: [''],
    });
  }

  loadFunds() {
    this.loading = true;
    this.error = null;

    this.fundsService
      .getFunds()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.funds = response.funds;
          this.summary = response.summary;
          this.loading = false;

          if (this.selectedFund) {
            const updated = this.funds.find((f) => f._id === this.selectedFund!._id);
            if (updated) {
              this.selectFund(updated);
            } else {
              this.selectedFund = null;
              this.selectedProjection = null;
            }
          }
        },
        error: () => {
          this.error = 'Error al cargar fondos';
          this.loading = false;
        },
      });

    this.accountsService
      .getAccounts()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.accounts = response.accounts || [];
        },
        error: () => {},
      });
  }

  selectFund(fund: Fund) {
    this.selectedFund = fund;
    this.error = null;

    // Cargar proyección
    this.fundsService
      .getFundProjection(fund._id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.selectedProjection = response.projection;
        },
        error: () => {
          this.selectedProjection = null;
        },
      });
  }

  // ============================================
  // Add Fund
  // ============================================

  openAddFundDialog() {
    this.fundForm.reset({
      fundType: 'retirement',
      targetAmountCents: 0,
      currentAmountCents: 0,
      sourceAccountId: this.accounts.length === 1 ? this.accounts[0]._id : '',
      monthlyContributionCents: 0,
      annualInterestRate: 0,
      startDate: new Date().toISOString().split('T')[0],
    });
    this.showAddFundDialog = true;
    this.error = null;
  }

  closeAddFundDialog() {
    this.showAddFundDialog = false;
    this.fundForm.reset();
  }

  createFund() {
    if (!this.fundForm.valid) {
      this.error = 'Completa los campos requeridos';
      return;
    }

    const formData = { ...this.fundForm.value };
    formData.targetAmountCents = this.fundsService.toCents(Number(formData.targetAmountCents || 0));
    formData.currentAmountCents = this.fundsService.toCents(Number(formData.currentAmountCents || 0));
    formData.monthlyContributionCents = this.fundsService.toCents(
      Number(formData.monthlyContributionCents || 0),
    );

    this.loading = true;
    this.fundsService
      .createFund(formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.closeAddFundDialog();
          this.loadFunds();
        },
        error: (err) => {
          this.error = err.error?.message || 'Error al crear el fondo';
          this.loading = false;
        },
      });
  }

  // ============================================
  // Edit Fund
  // ============================================

  openEditFundDialog() {
    if (!this.selectedFund) return;

    this.editForm.patchValue({
      alias: this.selectedFund.alias,
      description: this.selectedFund.description || '',
      institution: this.selectedFund.institution || '',
      fundType: this.selectedFund.fundType,
      targetAmountCents: this.selectedFund.targetAmountCents / 100,
      monthlyContributionCents: this.selectedFund.monthlyContributionCents / 100,
      annualInterestRate: this.selectedFund.annualInterestRate,
      targetDate: this.selectedFund.targetDate
        ? new Date(this.selectedFund.targetDate).toISOString().split('T')[0]
        : '',
      note: this.selectedFund.note || '',
    });
    this.showEditFundDialog = true;
    this.error = null;
  }

  closeEditFundDialog() {
    this.showEditFundDialog = false;
    this.editForm.reset();
  }

  updateFund() {
    if (!this.selectedFund || !this.editForm.valid) {
      this.error = 'Completa los campos requeridos';
      return;
    }

    const formData = { ...this.editForm.value };
    formData.targetAmountCents = this.fundsService.toCents(Number(formData.targetAmountCents || 0));
    formData.monthlyContributionCents = this.fundsService.toCents(
      Number(formData.monthlyContributionCents || 0),
    );

    this.loading = true;
    this.fundsService
      .updateFund(this.selectedFund._id, formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.closeEditFundDialog();
          this.loadFunds();
        },
        error: (err) => {
          this.error = err.error?.message || 'Error al actualizar el fondo';
          this.loading = false;
        },
      });
  }

  deleteFund() {
    if (!this.selectedFund) return;
    if (!confirm(`¿Eliminar el fondo "${this.selectedFund.alias}"?`)) return;

    this.fundsService
      .deleteFund(this.selectedFund._id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.selectedFund = null;
          this.selectedProjection = null;
          this.loadFunds();
        },
        error: (err) => {
          this.error = err.error?.message || 'Error al eliminar el fondo';
        },
      });
  }

  // ============================================
  // Contributions
  // ============================================

  openAddContributionDialog() {
    if (!this.selectedFund) return;
    if (this.selectedFund.status !== 'active') {
      this.error = 'Solo se pueden agregar aportes a fondos activos';
      return;
    }

    const defaultAmount = this.selectedFund.monthlyContributionCents > 0
      ? this.selectedFund.monthlyContributionCents / 100
      : '';

    this.contributionForm.reset({
      amountCents: defaultAmount,
      date: new Date().toISOString().split('T')[0],
      accountId: this.accounts.length === 1 ? this.accounts[0]._id : '',
    });
    this.showAddContributionDialog = true;
    this.error = null;
  }

  closeAddContributionDialog() {
    this.showAddContributionDialog = false;
    this.contributionForm.reset();
  }

  addContribution() {
    if (!this.selectedFund || !this.contributionForm.valid) {
      this.error = 'Completa los datos del aporte';
      return;
    }

    const formData = { ...this.contributionForm.value };
    formData.amountCents = this.fundsService.toCents(Number(formData.amountCents));

    this.loading = true;
    this.fundsService
      .addContribution(this.selectedFund._id, formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          this.selectedFund = updated;
          this.closeAddContributionDialog();
          this.loadFunds();
          this.loading = false;
        },
        error: (err) => {
          this.error = err.error?.message || 'Error al registrar el aporte';
          this.loading = false;
        },
      });
  }

  deleteContribution(contributionId: string) {
    if (!this.selectedFund) return;
    if (!confirm('¿Eliminar este aporte? El monto acumulado se reducirá.')) return;

    this.fundsService
      .deleteContribution(this.selectedFund._id, contributionId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          this.selectedFund = updated;
          this.loadFunds();
        },
        error: (err) => {
          this.error = err.error?.message || 'Error al eliminar el aporte';
        },
      });
  }

  // ============================================
  // Helpers
  // ============================================

  formatCurrency(cents: number): string {
    return this.fundsService.formatCurrency(cents);
  }

  getFundTypeLabel(type: string): string {
    return this.fundsService.getFundTypeLabel(type);
  }

  getStatusLabel(status: string): string {
    return this.fundsService.getStatusLabel(status);
  }

  getStatusColor(status: string): string {
    return this.fundsService.getStatusColor(status);
  }

  calculateProgress(fund: Fund): number {
    return this.fundsService.calculateProgress(fund);
  }

  hasInitialFundAmount(): boolean {
    return Number(this.fundForm.value.currentAmountCents || 0) > 0;
  }
}
