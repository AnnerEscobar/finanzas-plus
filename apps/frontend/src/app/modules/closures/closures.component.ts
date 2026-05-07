import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  ClosuresService,
  Closure,
  EvolutionPoint,
} from '../../core/services/closures.service';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';

@Component({
  selector: 'app-closures',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent],
  templateUrl: './closures.component.html',
  styleUrls: ['./closures.component.css'],
})
export class ClosuresComponent implements OnInit, OnDestroy {
  // State
  closures: Closure[] = [];
  selectedClosure: Closure | null = null;
  evolution: EvolutionPoint[] = [];

  // Form
  monthToGenerate: string = '';

  loading = false;
  error: string | null = null;
  success: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(private closuresService: ClosuresService) {}

  ngOnInit() {
    this.monthToGenerate = this.closuresService.getCurrentMonth();
    this.loadClosures();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Cargar lista de cierres y datos de evolución
   */
  loadClosures() {
    this.loading = true;
    this.error = null;

    this.closuresService
      .listClosures()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.closures = response.closures;
          this.loading = false;

          // Re-seleccionar si se había selecionado
          if (this.selectedClosure) {
            const updated = this.closures.find((c) => c._id === this.selectedClosure!._id);
            this.selectedClosure = updated || null;
          }
        },
        error: () => {
          this.error = 'Error al cargar cierres';
          this.loading = false;
        },
      });

    this.closuresService
      .getEvolution()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.evolution = data;
        },
        error: () => {},
      });
  }

  selectClosure(closure: Closure) {
    this.selectedClosure = closure;
    this.error = null;
    this.success = null;
  }

  /**
   * Generar cierre para el mes seleccionado
   */
  generateClosure() {
    if (!this.monthToGenerate) {
      this.error = 'Selecciona un mes';
      return;
    }

    if (!confirm(`¿Generar cierre para ${this.closuresService.formatMonth(this.monthToGenerate)}? Se capturará el estado actual de cuentas, tarjetas, deudas y fondos.`)) {
      return;
    }

    this.loading = true;
    this.error = null;
    this.success = null;

    this.closuresService
      .generateClosure(this.monthToGenerate)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (closure) => {
          this.success = `Cierre generado para ${this.closuresService.formatMonth(closure.month)}`;
          this.selectedClosure = closure;
          this.loadClosures();
        },
        error: (err) => {
          this.error = err.error?.message || 'Error al generar el cierre';
          this.loading = false;
        },
      });
  }

  /**
   * Cerrar mes (bloquear edición)
   */
  closeMonth() {
    if (!this.selectedClosure) return;
    if (!confirm(`¿Cerrar definitivamente ${this.closuresService.formatMonth(this.selectedClosure.month)}? Después no se podrá modificar sin reabrir.`)) return;

    this.loading = true;
    this.closuresService
      .closeMonth(this.selectedClosure._id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          this.success = 'Mes cerrado correctamente';
          this.selectedClosure = updated;
          this.loadClosures();
          this.loading = false;
        },
        error: (err) => {
          this.error = err.error?.message || 'Error al cerrar el mes';
          this.loading = false;
        },
      });
  }

  /**
   * Reabrir mes
   */
  reopenMonth() {
    if (!this.selectedClosure) return;
    if (!confirm('¿Reabrir este cierre para edición?')) return;

    this.loading = true;
    this.closuresService
      .reopenMonth(this.selectedClosure._id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          this.success = 'Cierre reabierto';
          this.selectedClosure = updated;
          this.loadClosures();
          this.loading = false;
        },
        error: (err) => {
          this.error = err.error?.message || 'Error al reabrir el cierre';
          this.loading = false;
        },
      });
  }

  /**
   * Eliminar cierre
   */
  deleteClosure() {
    if (!this.selectedClosure) return;
    if (!confirm('¿Eliminar este cierre? Esta acción no se puede deshacer.')) return;

    this.loading = true;
    this.closuresService
      .deleteClosure(this.selectedClosure._id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.success = 'Cierre eliminado';
          this.selectedClosure = null;
          this.loadClosures();
          this.loading = false;
        },
        error: (err) => {
          this.error = err.error?.message || 'Error al eliminar el cierre';
          this.loading = false;
        },
      });
  }

  // ============================================
  // Helpers
  // ============================================

  formatCurrency(cents: number): string {
    return this.closuresService.formatCurrency(cents);
  }

  formatMonth(month: string): string {
    return this.closuresService.formatMonth(month);
  }

  /**
   * Color según patrimonio neto (positivo = verde, negativo = rojo)
   */
  getNetWorthColor(cents: number): string {
    if (cents > 0) return 'text-green-600';
    if (cents < 0) return 'text-red-600';
    return 'text-gray-600';
  }
}
