import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { MovementsService, Category } from '../../core/services/movements.service';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NavbarComponent],
  templateUrl: './categories.component.html',
})
export class CategoriesComponent implements OnInit {
  expenseCategories: Category[] = [];
  incomeCategories: Category[] = [];
  loading = true;
  error = '';
  successMsg = '';

  activeTab: 'expense' | 'income' = 'expense';

  showForm = false;
  categoryForm: FormGroup;
  saving = false;

  editingCategory: Category | null = null;
  editName = '';

  constructor(
    private movementsService: MovementsService,
    private fb: FormBuilder,
  ) {
    this.categoryForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      type: ['expense', Validators.required],
    });
  }

  ngOnInit() {
    this.initAndLoad();
  }

  // ──────────────────────────────────────────
  // Init: ensure defaults + dedup + load
  // ──────────────────────────────────────────

  initAndLoad() {
    this.loading = true;
    this.movementsService.ensureDefaultCategories().subscribe({
      next: () => this.runDedup(),
      error: () => this.runDedup(),
    });
  }

  private runDedup() {
    this.movementsService.deduplicateCategories().subscribe({
      next: () => this.loadCategories(),
      error: () => this.loadCategories(),
    });
  }

  loadCategories() {
    this.loading = true;
    this.movementsService.getCategories().subscribe({
      next: (res) => {
        this.expenseCategories = res.categories.filter((c) => c.type === 'expense');
        this.incomeCategories = res.categories.filter((c) => c.type === 'income');
        this.loading = false;
      },
      error: () => {
        this.error = 'Error al cargar categorías';
        this.loading = false;
      },
    });
  }

  // ──────────────────────────────────────────
  // Tab
  // ──────────────────────────────────────────

  get currentCategories(): Category[] {
    return this.activeTab === 'expense' ? this.expenseCategories : this.incomeCategories;
  }

  setTab(tab: 'expense' | 'income') {
    this.activeTab = tab;
    this.cancelEdit();
    this.closeForm();
  }

  // ──────────────────────────────────────────
  // Create
  // ──────────────────────────────────────────

  openForm() {
    this.showForm = true;
    this.editingCategory = null;
    this.categoryForm.reset({ type: this.activeTab, name: '' });
  }

  closeForm() {
    this.showForm = false;
    this.saving = false;
    this.categoryForm.reset({ type: this.activeTab, name: '' });
  }

  saveCategory() {
    if (this.categoryForm.invalid) return;
    this.saving = true;
    this.error = '';

    this.movementsService.createCategory(this.categoryForm.value).subscribe({
      next: () => {
        this.showSuccess('Categoría creada exitosamente');
        this.closeForm();
        this.loadCategories();
      },
      error: (err) => {
        this.error = err?.error?.message || 'Error al crear categoría';
        this.saving = false;
      },
    });
  }

  // ──────────────────────────────────────────
  // Edit
  // ──────────────────────────────────────────

  startEdit(cat: Category) {
    this.editingCategory = cat;
    this.editName = cat.name;
    this.showForm = false;
  }

  cancelEdit() {
    this.editingCategory = null;
    this.editName = '';
  }

  saveEdit() {
    if (!this.editingCategory || !this.editName.trim()) return;
    this.error = '';

    this.movementsService.updateCategory(this.editingCategory._id, { name: this.editName.trim() }).subscribe({
      next: () => {
        this.showSuccess('Categoría actualizada');
        this.cancelEdit();
        this.loadCategories();
      },
      error: (err) => {
        this.error = err?.error?.message || 'Error al actualizar categoría';
      },
    });
  }

  // ──────────────────────────────────────────
  // Delete
  // ──────────────────────────────────────────

  deleteCategory(cat: Category) {
    if (!confirm(`¿Eliminar la categoría "${cat.name}"?`)) return;
    this.error = '';

    this.movementsService.deleteCategory(cat._id).subscribe({
      next: () => {
        this.showSuccess('Categoría eliminada');
        this.loadCategories();
      },
      error: (err) => {
        this.error = err?.error?.message || 'Error al eliminar categoría';
      },
    });
  }

  // ──────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────

  private showSuccess(msg: string) {
    this.successMsg = msg;
    setTimeout(() => (this.successMsg = ''), 3000);
  }
}
