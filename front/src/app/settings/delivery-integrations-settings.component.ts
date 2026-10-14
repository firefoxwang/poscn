import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import {
  ApiService,
  DeliveryCatalogMappingRow,
  DeliveryIntegrationEventRow,
  DeliveryIntegrationPublic,
  DeliveryProviderCatalogRow,
  Product,
} from '../services/api.service';

@Component({
  selector: 'app-delivery-integrations-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  template: `
    <div data-testid="settings-delivery-integrations-section">
      <h3>{{ 'SETTINGS.DELIVERY_INTEGRATIONS_TITLE' | translate }}</h3>
      <p class="section-desc">{{ 'SETTINGS.DELIVERY_INTEGRATIONS_SUBTITLE' | translate }}</p>

      @if (loading()) {
        <p class="hint">{{ 'COMMON.LOADING' | translate }}</p>
      } @else {
        @for (row of mergedRows(); track row.provider_key) {
          <div class="provider-card">
            <div class="provider-head">
              <div>
                <h3>{{ row.display_name }}</h3>
                <p class="hint mono">{{ row.provider_key }}</p>
              </div>
              <button
                type="button"
                class="btn btn-sm btn-secondary"
                (click)="toggleExpand(row.provider_key)"
              >
                {{
                  expanded() === row.provider_key
                    ? ('SETTINGS.DELIVERY_INTEGRATIONS_COLLAPSE' | translate)
                    : ('SETTINGS.DELIVERY_INTEGRATIONS_EXPAND' | translate)
                }}
              </button>
            </div>

            @if (expanded() === row.provider_key) {
              <div class="provider-body">
                <label class="chk">
                  <input type="checkbox" [(ngModel)]="draftEnabled[row.provider_key]" />
                  <span>{{ 'SETTINGS.DELIVERY_INTEGRATIONS_ENABLED' | translate }}</span>
                </label>

                <label>
                  <span>{{ 'SETTINGS.DELIVERY_INTEGRATIONS_STORE_ID' | translate }}</span>
                  <input
                    type="text"
                    [(ngModel)]="draftStoreId[row.provider_key]"
                    [placeholder]="'SETTINGS.DELIVERY_INTEGRATIONS_STORE_ID_PH' | translate"
                  />
                </label>

                <label>
                  <span>{{ 'SETTINGS.DELIVERY_INTEGRATIONS_CREDENTIALS_JSON' | translate }}</span>
                  <textarea
                    rows="5"
                    class="mono"
                    [(ngModel)]="draftCredentialsJson[row.provider_key]"
                    [placeholder]="credentialsPlaceholder()"
                  ></textarea>
                  <span class="hint">{{ 'SETTINGS.DELIVERY_INTEGRATIONS_CREDENTIALS_HINT' | translate }}</span>
                </label>

                <div class="btn-row">
                  <button type="button" class="btn btn-primary" [disabled]="saving()" (click)="save(row)">
                    {{ saving() ? ('COMMON.SAVING' | translate) : ('COMMON.SAVE' | translate) }}
                  </button>
                  @if (row.integration?.id) {
                    <button type="button" class="btn btn-secondary" [disabled]="testing()" (click)="runTest(row)">
                      {{ 'SETTINGS.DELIVERY_INTEGRATIONS_TEST' | translate }}
                    </button>
                  }
                </div>

                @if (row.integration?.id) {
                  <div class="webhook-box">
                    <strong>{{ 'SETTINGS.DELIVERY_INTEGRATIONS_WEBHOOK_URL' | translate }}</strong>
                    <div class="mono wrap">{{ row.integration!.webhook_url_hint }}</div>
                    <button type="button" class="btn btn-sm btn-secondary" (click)="copyUrl(row.integration!)">
                      {{ 'SETTINGS.DELIVERY_INTEGRATIONS_COPY_URL' | translate }}
                    </button>
                  </div>

                  <div class="status-row">
                    <span>{{ 'SETTINGS.DELIVERY_INTEGRATIONS_LAST_TEST' | translate }}:</span>
                    @if (row.integration!.last_test_at) {
                      <span>{{ row.integration!.last_test_at }}</span>
                      @if (row.integration!.last_test_ok === true) {
                        <span class="ok">{{ 'SETTINGS.DELIVERY_INTEGRATIONS_STATUS_OK' | translate }}</span>
                      } @else if (row.integration!.last_test_ok === false) {
                        <span class="bad">{{ 'SETTINGS.DELIVERY_INTEGRATIONS_STATUS_FAIL' | translate }}</span>
                      }
                    } @else {
                      <span class="hint">—</span>
                    }
                  </div>

                  <h4>{{ 'SETTINGS.DELIVERY_INTEGRATIONS_MAPPINGS' | translate }}</h4>
                  <p class="hint">{{ 'SETTINGS.DELIVERY_INTEGRATIONS_MAPPINGS_HINT' | translate }}</p>
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>{{ 'SETTINGS.DELIVERY_INTEGRATIONS_EXT_SKU' | translate }}</th>
                        <th>{{ 'SETTINGS.DELIVERY_INTEGRATIONS_PRODUCT' | translate }}</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (m of mappingDraft[row.provider_key]; track $index) {
                        <tr>
                          <td>
                            <input type="text" [(ngModel)]="m.external_item_id" class="inline-input" />
                          </td>
                          <td>
                            <select [(ngModel)]="m.product_id" class="inline-select">
                              <option [ngValue]="null">{{ 'COMMON.NONE' | translate }}</option>
                              @for (p of products(); track p.id) {
                                <option [ngValue]="p.id">{{ p.name }} (#{{ p.id }})</option>
                              }
                            </select>
                          </td>
                          <td class="actions">
                            <button type="button" class="btn btn-sm btn-secondary" (click)="removeMapping(row, $index)">
                              {{ 'COMMON.DELETE' | translate }}
                            </button>
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                  <button type="button" class="btn btn-sm btn-secondary" (click)="addMapping(row)">
                    {{ 'SETTINGS.DELIVERY_INTEGRATIONS_ADD_MAPPING' | translate }}
                  </button>
                  <button type="button" class="btn btn-primary" [disabled]="savingMappings()" (click)="saveMappings(row)">
                    {{ savingMappings() ? ('COMMON.SAVING' | translate) : ('SETTINGS.DELIVERY_INTEGRATIONS_SAVE_MAPPINGS' | translate) }}
                  </button>

                  <h4>{{ 'SETTINGS.DELIVERY_INTEGRATIONS_EVENTS' | translate }}</h4>
                  @if (eventsLoading()) {
                    <p class="hint">{{ 'COMMON.LOADING' | translate }}</p>
                  } @else if ((events[row.provider_key] || []).length === 0) {
                    <p class="hint">{{ 'SETTINGS.DELIVERY_INTEGRATIONS_NO_EVENTS' | translate }}</p>
                  } @else {
                    <ul class="event-list">
                      @for (ev of events[row.provider_key]; track ev.id) {
                        <li [class.bad]="!ev.success">
                          <span class="mono">{{ ev.created_at }}</span>
                          <strong>{{ ev.event_type }}</strong>
                          — {{ ev.summary }}
                          @if (ev.error_message) {
                            <span class="err">{{ ev.error_message }}</span>
                          }
                        </li>
                      }
                    </ul>
                  }
                }

                @if (message()) {
                  <p class="hint">{{ message() }}</p>
                }
              </div>
            }
          </div>
        }
      }
    </div>
  `,
  styles: [
    `
      .provider-card {
        border: 1px solid var(--border-subtle, #ddd);
        border-radius: 8px;
        padding: 1rem;
        margin-bottom: 1rem;
        background: var(--panel-bg, #fff);
      }
      .provider-head {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 1rem;
      }
      .provider-head h3 {
        margin: 0 0 0.25rem 0;
      }
      .mono {
        font-family: ui-monospace, monospace;
        font-size: 0.85rem;
      }
      .wrap {
        word-break: break-all;
      }
      .provider-body {
        margin-top: 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }
      .provider-body label span {
        display: block;
        font-weight: 500;
        margin-bottom: 0.25rem;
      }
      .provider-body input[type='text'],
      .provider-body textarea {
        width: 100%;
        max-width: 640px;
        padding: 0.5rem;
      }
      .chk {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .btn-row {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
      }
      .webhook-box {
        padding: 0.75rem;
        background: var(--soft-bg, #f6f7f9);
        border-radius: 6px;
      }
      .status-row .ok {
        color: #0a7;
        margin-left: 0.5rem;
      }
      .status-row .bad {
        color: #c33;
        margin-left: 0.5rem;
      }
      .inline-input {
        width: 100%;
        max-width: 280px;
      }
      .inline-select {
        min-width: 220px;
        padding: 0.35rem;
      }
      .event-list {
        list-style: none;
        padding: 0;
        margin: 0;
      }
      .event-list li {
        padding: 0.35rem 0;
        border-bottom: 1px solid #eee;
        font-size: 0.9rem;
      }
      .event-list li.bad {
        color: #a33;
      }
      .err {
        display: block;
        font-size: 0.85rem;
      }
      h4 {
        margin: 1rem 0 0.25rem 0;
      }
      .section-desc {
        color: #666;
        font-size: 0.9rem;
        margin: 0 0 1rem 0;
      }
    `,
  ],
})
export class DeliveryIntegrationsSettingsComponent implements OnInit {
  private readonly api = inject(ApiService);

  loading = signal(false);
  saving = signal(false);
  savingMappings = signal(false);
  testing = signal(false);
  eventsLoading = signal(false);
  message = signal('');
  catalog = signal<DeliveryProviderCatalogRow[]>([]);
  integrations = signal<DeliveryIntegrationPublic[]>([]);
  products = signal<Product[]>([]);

  expanded = signal<string | null>(null);

  draftEnabled: Record<string, boolean> = {};
  draftStoreId: Record<string, string> = {};
  draftCredentialsJson: Record<string, string> = {};
  mappingDraft: Record<string, DeliveryCatalogMappingRow[]> = {};
  events: Record<string, DeliveryIntegrationEventRow[]> = {};

  mergedRows(): Array<{
    provider_key: string;
    display_name: string;
    integration?: DeliveryIntegrationPublic;
  }> {
    const ints = this.integrations();
    return this.catalog().map((c) => ({
      provider_key: c.provider_key,
      display_name: c.display_name,
      integration: ints.find((i) => i.provider_key === c.provider_key),
    }));
  }

  credentialsPlaceholder(): string {
    return '{"api_key":"your-key"}';
  }

  ngOnInit(): void {
    this.reloadAll();
    this.api.getProducts().subscribe({
      next: (p) => this.products.set(p),
      error: () => this.products.set([]),
    });
  }

  reloadAll(): void {
    this.loading.set(true);
    this.message.set('');
    this.api.getDeliveryIntegrationCatalog().subscribe({
      next: (cat) => {
        this.catalog.set(cat);
        this.api.getDeliveryIntegrations().subscribe({
          next: (ints) => {
            this.integrations.set(ints);
            this.seedDrafts();
            this.loading.set(false);
          },
          error: () => {
            this.loading.set(false);
            this.message.set('Could not load integrations.');
          },
        });
      },
      error: () => {
        this.loading.set(false);
        this.message.set('Could not load provider catalog.');
      },
    });
  }

  private seedDrafts(): void {
    const ints = this.integrations();
    for (const c of this.catalog()) {
      const integ = ints.find((i) => i.provider_key === c.provider_key);
      this.draftEnabled[c.provider_key] = integ?.enabled ?? false;
      this.draftStoreId[c.provider_key] = integ?.external_store_id ?? '';
      this.draftCredentialsJson[c.provider_key] = integ?.credentials_configured
        ? '{"api_key":"••••"}'
        : '{"api_key":""}';
    }
  }

  toggleExpand(pk: string): void {
    if (this.expanded() === pk) {
      this.expanded.set(null);
      return;
    }
    this.expanded.set(pk);
    const row = this.mergedRows().find((r) => r.provider_key === pk);
    if (row?.integration?.id) {
      this.loadMappings(row);
      this.loadEvents(row);
    }
  }

  save(row: { provider_key: string; integration?: DeliveryIntegrationPublic }): void {
    let creds: Record<string, unknown> | undefined;
    const raw = (this.draftCredentialsJson[row.provider_key] || '').trim();
    if (raw && !raw.includes('••••')) {
      try {
        creds = JSON.parse(raw) as Record<string, unknown>;
      } catch {
        this.message.set('Invalid JSON in credentials.');
        return;
      }
    }
    this.saving.set(true);
    this.message.set('');
    this.api
      .upsertDeliveryIntegration({
        provider_key: row.provider_key,
        enabled: !!this.draftEnabled[row.provider_key],
        external_store_id: this.draftStoreId[row.provider_key]?.trim() || null,
        credentials: creds,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.reloadAll();
        },
        error: () => {
          this.saving.set(false);
          this.message.set('Save failed.');
        },
      });
  }

  runTest(row: { provider_key: string; integration?: DeliveryIntegrationPublic }): void {
    const id = row.integration?.id;
    if (!id) return;
    this.testing.set(true);
    this.message.set('');
    this.api.testDeliveryIntegration(id).subscribe({
      next: (r) => {
        this.testing.set(false);
        this.message.set(r.message || '');
        this.reloadAll();
      },
      error: () => {
        this.testing.set(false);
        this.message.set('Test failed.');
      },
    });
  }

  copyUrl(integration: DeliveryIntegrationPublic): void {
    const url = integration.webhook_url_hint;
    void navigator.clipboard.writeText(url).then(
      () => this.message.set('Copied.'),
      () => this.message.set('Could not copy.')
    );
  }

  loadMappings(row: { provider_key: string; integration?: DeliveryIntegrationPublic }): void {
    const id = row.integration?.id;
    if (!id) return;
    this.api.getDeliveryMappings(id).subscribe({
      next: (list) => {
        this.mappingDraft[row.provider_key] = list.length
          ? [...list]
          : [{ external_item_id: '', product_id: null }];
      },
      error: () => {
        this.mappingDraft[row.provider_key] = [{ external_item_id: '', product_id: null }];
      },
    });
  }

  loadEvents(row: { provider_key: string; integration?: DeliveryIntegrationPublic }): void {
    const id = row.integration?.id;
    if (!id) return;
    this.eventsLoading.set(true);
    this.api.getDeliveryIntegrationEvents(id, 30).subscribe({
      next: (evs) => {
        this.events[row.provider_key] = evs;
        this.eventsLoading.set(false);
      },
      error: () => {
        this.events[row.provider_key] = [];
        this.eventsLoading.set(false);
      },
    });
  }

  addMapping(row: { provider_key: string }): void {
    const list = this.mappingDraft[row.provider_key] || [];
    list.push({ external_item_id: '', product_id: null });
    this.mappingDraft[row.provider_key] = list;
  }

  removeMapping(row: { provider_key: string }, index: number): void {
    const list = [...(this.mappingDraft[row.provider_key] || [])];
    list.splice(index, 1);
    this.mappingDraft[row.provider_key] = list.length ? list : [{ external_item_id: '', product_id: null }];
  }

  saveMappings(row: { provider_key: string; integration?: DeliveryIntegrationPublic }): void {
    const id = row.integration?.id;
    if (!id) return;
    const raw = this.mappingDraft[row.provider_key] || [];
    const cleaned = raw
      .filter((m) => (m.external_item_id || '').trim())
      .map((m) => ({
        external_item_id: m.external_item_id.trim(),
        product_id: m.product_id,
        notes: m.notes ?? null,
      }));
    this.savingMappings.set(true);
    this.api.putDeliveryMappings(id, cleaned).subscribe({
      next: () => {
        this.savingMappings.set(false);
        this.loadMappings(row);
        this.loadEvents(row);
      },
      error: () => {
        this.savingMappings.set(false);
        this.message.set('Could not save mappings.');
      },
    });
  }
}
