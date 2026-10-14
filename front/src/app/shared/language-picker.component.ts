import { Component, ElementRef, HostListener, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageService, SUPPORTED_LANGUAGES, LanguageCode } from '../services/language.service';

@Component({
  selector: 'app-language-picker',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  template: `
    @if (appearance() === 'icon') {
      <div class="language-picker language-picker--icon" [class.is-open]="menuOpen()">
        <button
          type="button"
          class="language-icon-btn"
          [attr.aria-label]="'SETTINGS.SELECT_LANGUAGE' | translate"
          [attr.aria-expanded]="menuOpen()"
          aria-haspopup="listbox"
          data-testid="language-picker-icon"
          (click)="toggleMenu($event)"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/>
            <path d="M2 12h20"/>
            <path d="M12 2a15.3 15.3 0 010 20 15.3 15.3 0 010-20z"/>
          </svg>
          <span class="language-code" aria-hidden="true">{{ currentCodeLabel }}</span>
        </button>
        @if (menuOpen()) {
          <ul
            class="language-menu"
            role="listbox"
            [attr.aria-label]="'SETTINGS.SELECT_LANGUAGE' | translate"
          >
            @for (lang of languages; track lang.code) {
              <li role="option" [attr.aria-selected]="lang.code === currentLanguageValue">
                <button
                  type="button"
                  class="language-menu-item"
                  [class.is-active]="lang.code === currentLanguageValue"
                  (click)="selectLanguage(lang.code, $event)"
                >
                  {{ lang.label }}
                </button>
              </li>
            }
          </ul>
        }
      </div>
    } @else {
      <div class="language-picker">
        <select
          [(ngModel)]="currentLanguageValue"
          class="language-select"
          [attr.aria-label]="'SETTINGS.SELECT_LANGUAGE' | translate"
        >
          @for (lang of languages; track lang.code) {
            <option [value]="lang.code">{{ lang.label }}</option>
          }
        </select>
      </div>
    }
  `,
  styles: [`
    .language-picker {
      display: inline-block;
      position: relative;
    }

    .language-select {
      padding: 0.375rem 0.75rem;
      font-size: 0.875rem;
      border: 1px solid var(--color-border, #e5e7eb);
      border-radius: 0.375rem;
      background-color: var(--color-surface, #fff);
      color: var(--color-text, #1f2937);
      cursor: pointer;
      min-width: 120px;

      &:hover {
        border-color: var(--color-border-hover, #d1d5db);
      }

      &:focus {
        outline: none;
        border-color: var(--color-primary, #D35233);
        box-shadow: 0 0 0 2px rgba(211, 82, 51, 0.1);
      }
    }

    .language-picker--icon {
      flex-shrink: 0;
    }

    .language-icon-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.25rem 0.35rem;
      margin: 0;
      border: none;
      background: transparent;
      color: var(--color-text-muted, #6b7280);
      border-radius: var(--radius-sm, 0.25rem);
      cursor: pointer;
      line-height: 1;
      min-height: 28px;

      &:hover {
        color: var(--color-primary, #D35233);
        background: var(--color-subtle, var(--color-bg, #f9fafb));
      }

      &:focus-visible {
        outline: 2px solid var(--color-primary, #D35233);
        outline-offset: 2px;
      }
    }

    .language-code {
      font-size: 0.625rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .language-menu {
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      z-index: 200;
      margin: 0;
      padding: 0.25rem;
      list-style: none;
      min-width: 10rem;
      max-height: 16rem;
      overflow-y: auto;
      background: var(--color-surface, #fff);
      border: 1px solid var(--color-border, #e5e7eb);
      border-radius: var(--radius-md, 0.375rem);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    }

    .language-menu-item {
      display: block;
      width: 100%;
      text-align: left;
      padding: 0.5rem 0.65rem;
      border: none;
      background: transparent;
      color: var(--color-text, #1f2937);
      font-size: 0.8125rem;
      border-radius: var(--radius-sm, 0.25rem);
      cursor: pointer;

      &:hover {
        background: var(--color-subtle, var(--color-bg, #f9fafb));
      }

      &.is-active {
        color: var(--color-primary, #D35233);
        font-weight: 600;
      }

      &:focus-visible {
        outline: 2px solid var(--color-primary, #D35233);
        outline-offset: -2px;
      }
    }
  `]
})
export class LanguagePickerComponent {
  private languageService = inject(LanguageService);
  private host = inject(ElementRef<HTMLElement>);

  /** `select` = full dropdown (default). `icon` = compact globe + code for sidebar density. */
  appearance = input<'select' | 'icon'>('select');

  languages = SUPPORTED_LANGUAGES;
  menuOpen = signal(false);

  get currentLanguageValue(): LanguageCode {
    return this.languageService.currentLanguage();
  }

  set currentLanguageValue(value: LanguageCode) {
    this.languageService.setLanguage(value);
  }

  get currentCodeLabel(): string {
    const code = this.currentLanguageValue;
    return code.includes('-') ? code.split('-')[0]!.toUpperCase() : code.toUpperCase();
  }

  toggleMenu(event: Event): void {
    event.stopPropagation();
    this.menuOpen.update((open) => !open);
  }

  selectLanguage(code: LanguageCode, event: Event): void {
    event.stopPropagation();
    this.languageService.setLanguage(code);
    this.menuOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.menuOpen()) {
      return;
    }
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.menuOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.menuOpen()) {
      this.menuOpen.set(false);
    }
  }
}
