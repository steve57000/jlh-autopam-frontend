import { Component, ElementRef, HostListener, Input, ViewChild } from '@angular/core';
import { NgOptimizedImage }            from '@angular/common';
import { RouterLink }                  from '@angular/router';
import { InViewportDirective }         from '../directives/in-viewport.directive';

@Component({
  selector: 'app-metiers-pictos',
  standalone: true,
  imports: [
    NgOptimizedImage,
    RouterLink,
    InViewportDirective
  ],
  templateUrl: './metiers-pictos.component.html',
  styleUrls: ['./metiers-pictos.component.scss']    // <— styleUrls (au pluriel)
})
export class MetiersPictosComponent {
  @Input() items: { img: string; label: string; description: string }[] = [];

  selectedItem: { img: string; label: string; description: string } | null = null;
  isClosing = false;
  private lastFocusedTrigger: HTMLElement | null = null;

  @ViewChild('dialogElement')
  set dialogElement(element: ElementRef<HTMLDivElement> | null) {
    if (element) {
      setTimeout(() => element.nativeElement.focus(), 0);
    }
  }

  openModal(item: { img: string; label: string; description: string }, event: Event) {
    this.selectedItem = item;
    this.isClosing = false;
    this.lastFocusedTrigger = event.currentTarget as HTMLElement;
  }

  closeModal() {
    if (!this.selectedItem || this.isClosing) {
      return;
    }
    this.isClosing = true;
    setTimeout(() => {
      this.selectedItem = null;
      this.isClosing = false;
      if (this.lastFocusedTrigger) {
        this.lastFocusedTrigger.focus();
        this.lastFocusedTrigger = null;
      }
    }, 200);
  }

  @HostListener('document:keydown.escape')
  handleEscape() {
    if (this.selectedItem) {
      this.closeModal();
    }
  }
}
