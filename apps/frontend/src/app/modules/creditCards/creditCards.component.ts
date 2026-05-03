import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-credit-cards',
  standalone: true,
  imports: [CommonModule],
  template: '<h1 class="text-3xl font-bold p-4">Tarjetas de Crédito</h1>',
})
export class CreditCardsComponent {}
