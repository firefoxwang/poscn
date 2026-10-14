import { Component, HostListener, inject, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { TranslateModule } from '@ngx-translate/core';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-changelog-modal',
  standalone: true,
  imports: [TranslateModule],
  template: `
    @if (open()) {
      <div
        class="changelog-overlay"
        (click)="close()"
        role="button"
        tabindex="0"
        data-testid="changelog-overlay"
      >
        <div class="changelog-modal" (click)="$event.stopPropagation()" role="dialog" aria-labelledby="changelog-title">
          <div class="changelog-header">
            <h2 id="changelog-title" class="changelog-title">{{ 'DASHBOARD.CHANGELOG_TITLE' | translate }}</h2>
            <button
              type="button"
              class="changelog-close"
              (click)="close()"
              [attr.aria-label]="'COMMON.CLOSE' | translate"
            >
              {{ 'COMMON.CLOSE' | translate }}
            </button>
          </div>
          <div class="changelog-body">
            @if (loading()) {
              <p class="changelog-loading">{{ 'DASHBOARD.CHANGELOG_LOADING' | translate }}</p>
            } @else if (error()) {
              <p class="changelog-error">{{ error() }}</p>
            } @else if (html()) {
              <div class="changelog-content" [innerHTML]="html()"></div>
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    .changelog-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2000;
      padding: var(--space-4);
    }

    .changelog-modal {
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      border: 1px solid var(--color-border);
      box-shadow: var(--shadow-lg);
      max-width: 42rem;
      width: 100%;
      max-height: 85vh;
      display: flex;
      flex-direction: column;
    }

    .changelog-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-4) var(--space-5);
      border-bottom: 1px solid var(--color-border);
      flex-shrink: 0;
    }

    .changelog-title {
      font-size: 1.25rem;
      font-weight: 600;
      margin: 0;
      color: var(--color-text);
    }

    .changelog-close {
      padding: var(--space-2) var(--space-3);
      background: transparent;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      color: var(--color-text);
      font-size: 0.875rem;
      cursor: pointer;
    }

    .changelog-close:hover {
      border-color: var(--color-primary);
      color: var(--color-primary);
    }

    .changelog-body {
      padding: var(--space-5);
      overflow-y: auto;
      flex: 1;
      min-height: 0;
    }

    .changelog-loading,
    .changelog-error {
      color: var(--color-text-muted);
      margin: 0;
    }

    .changelog-error {
      color: var(--color-error, #b91c1c);
    }

    .changelog-content {
      font-size: 0.9375rem;
      line-height: 1.6;
      color: var(--color-text);
    }

    .changelog-content ::ng-deep h2 {
      font-size: 1.125rem;
      font-weight: 600;
      margin: var(--space-6) 0 var(--space-2);
      color: var(--color-primary);
    }

    .changelog-content ::ng-deep h2:first-child {
      margin-top: 0;
    }

    .changelog-content ::ng-deep h3 {
      font-size: 1rem;
      font-weight: 600;
      margin: var(--space-4) 0 var(--space-2);
      color: var(--color-text);
    }

    .changelog-content ::ng-deep ul {
      margin: 0 0 var(--space-3);
      padding-left: 1.5rem;
    }

    .changelog-content ::ng-deep li {
      margin-bottom: var(--space-1);
    }

    .changelog-content ::ng-deep strong {
      font-weight: 600;
    }

    .changelog-content ::ng-deep a {
      color: var(--color-primary);
      text-decoration: none;
    }

    .changelog-content ::ng-deep a:hover {
      text-decoration: underline;
    }

    .changelog-content ::ng-deep p {
      margin: 0 0 var(--space-2);
    }
  `,
})
export class ChangelogModalComponent {
  private api = inject(ApiService);
  private sanitizer = inject(DomSanitizer);

  open = signal(false);
  html = signal<SafeHtml | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  show() {
    this.open.set(true);
    this.error.set(null);
    if (this.html()) {
      return;
    }
    this.loading.set(true);
    this.api.getChangelog().subscribe({
      next: (text) => {
        this.loading.set(false);
        this.html.set(this.sanitizer.bypassSecurityTrustHtml(markdownToHtml(text)));
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.message || 'Failed to load changelog.');
      },
    });
  }

  close() {
    this.open.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.open()) this.close();
  }
}

/** Convert changelog markdown to safe HTML (h2, h3, ul, li, strong, a). */
export function markdownToHtml(md: string): string {
  const escape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const lines = md.split(/\r?\n/);
  let out = '';
  let inList = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trimEnd();
    if (/^##\s/.test(trimmed)) {
      if (inList) {
        out += '</ul>';
        inList = false;
      }
      const title = trimmed.replace(/^##\s+/, '').replace(/\*\*/g, '');
      out += '<h2>' + escape(title) + '</h2>';
    } else if (/^###\s/.test(trimmed)) {
      if (inList) {
        out += '</ul>';
        inList = false;
      }
      const title = trimmed.replace(/^###\s+/, '').replace(/\*\*/g, '');
      out += '<h3>' + escape(title) + '</h3>';
    } else if (/^-\s+/.test(trimmed)) {
      if (!inList) {
        out += '<ul>';
        inList = true;
      }
      let content = trimmed.replace(/^-\s+/, '');
      const bold: string[] = [];
      content = content.replace(/\*\*([^*]+)\*\*/g, (_, t) => {
        bold.push(t);
        return '\x01B' + (bold.length - 1) + '\x02';
      });
      const links: { t: string; u: string }[] = [];
      content = content.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, t, u) => {
        links.push({ t, u });
        return '\x01L' + (links.length - 1) + '\x02';
      });
      content = escape(content);
      content = content.replace(/\x01B(\d+)\x02/g, (_, i) => '<strong>' + escape(bold[Number(i)]) + '</strong>');
      content = content.replace(/\x01L(\d+)\x02/g, (_, i) => {
        const { t, u } = links[Number(i)];
        return '<a href="' + escape(u) + '" target="_blank" rel="noopener noreferrer">' + escape(t) + '</a>';
      });
      out += '<li>' + content + '</li>';
    } else if (trimmed === '') {
      if (inList) {
        out += '</ul>';
        inList = false;
      }
    }
  }
  if (inList) out += '</ul>';
  return out || '<p>No content.</p>';
}
