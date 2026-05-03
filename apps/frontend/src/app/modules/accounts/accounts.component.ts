import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-accounts',
  standalone: true,
  imports: [CommonModule],
  template: '<h1 class="text-3xl font-bold p-4">Cuentas</h1>',
})
export class AccountsComponent {}
