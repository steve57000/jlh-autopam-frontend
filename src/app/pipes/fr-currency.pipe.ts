import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'frCurrency',
  standalone: true
})
export class FrCurrencyPipe implements PipeTransform {
  transform(value: number | string): string {
    const amount = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(amount)) return '';
    // format FR avec toujours deux décimales
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }
}
