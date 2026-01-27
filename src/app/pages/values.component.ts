import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-values',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './values.component.html',
  styleUrl: './values.component.scss'
})
export class ValuesComponent {}
