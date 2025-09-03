// src/app/shared/directives/in-viewport.directive.ts
import {
  Directive,
  ElementRef,
  HostBinding,
  AfterViewInit,
  OnDestroy,
  Inject,
  PLATFORM_ID,
  ChangeDetectorRef,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Directive({ standalone: true, selector: '[appInViewport]' })
export class InViewportDirective implements AfterViewInit, OnDestroy {
  @HostBinding('class.in-view') isVisible = false;
  private observer?: IntersectionObserver;

  constructor(
    private host: ElementRef<HTMLElement>,
    @Inject(PLATFORM_ID) private platformId: Object,
    private cdr: ChangeDetectorRef
  ) {}

  ngAfterViewInit() {
    // SSR ou navigateur ancien → on affiche dès le rendu, mais en nextTick
    if (!isPlatformBrowser(this.platformId) || typeof IntersectionObserver === 'undefined') {
      setTimeout(() => {
        this.isVisible = true;
        this.cdr.markForCheck();
      }, 0);
      return;
    }

    this.observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // on reporte aussi dans un timer pour passer en dehors du CD actuel
          setTimeout(() => {
            this.isVisible = true;
            this.cdr.markForCheck();
          }, 0);
          this.observer!.unobserve(entry.target);
        }
      },
      { threshold: 0.1 }
    );
    this.observer.observe(this.host.nativeElement);
  }

  ngOnDestroy() {
    this.observer?.disconnect();
  }
}
