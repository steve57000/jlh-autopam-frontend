import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-service-entretien',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './service-entretien.component.html',
  styleUrl: './service-entretien.component.scss'
})
export class ServiceEntretienComponent {}
