import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css'],
})
export class NavbarComponent {
  mobileMenuOpen = false;

  navItems = [
    { label: 'Dashboard', route: '/dashboard', icon: '📊' },
    { label: 'Cuentas', route: '/accounts', icon: '🏦' },
    { label: 'Movimientos', route: '/movements', icon: '↔️' },
    { label: 'Tarjetas', route: '/credit-cards', icon: '💳' },
    { label: 'Deudas', route: '/debts', icon: '📉' },
    { label: 'Fondos', route: '/funds', icon: '💰' },
    { label: 'Plan Deuda Cero', route: '/debt-plan', icon: '🎯' },
    { label: 'Cierres', route: '/closures', icon: '📅' },
    { label: 'Reportes', route: '/reports', icon: '📈' },
  ];

  constructor(private authService: AuthService, private router: Router) {}

  getCurrentUser(): string {
    const user = this.authService.getCurrentUser();
    return user?.name || 'Usuario';
  }

  toggleMobileMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  closeMobileMenu() {
    this.mobileMenuOpen = false;
  }

  logout() {
    if (confirm('¿Cerrar sesión?')) {
      this.authService.logout();
      this.router.navigate(['/login']);
    }
  }

  goBack() {
    window.history.back();
  }
}
