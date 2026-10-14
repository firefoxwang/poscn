import { TranslateService } from '@ngx-translate/core';
import { intlLocaleFromTranslate } from './intl-locale';

/** Symbol for an ISO 4217 code using the active UI locale (ngx-translate). */
export function currencySymbolFromIsoCode(translate: TranslateService, code: string): string {
  const locale = intlLocaleFromTranslate(translate);
  try {
    const parts = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: code,
      currencyDisplay: 'symbol',
    }).formatToParts(0);
    return parts.find((part) => part.type === 'currency')?.value || code;
  } catch {
    return code;
  }
}

/**
 * Format price cents with the tenant ISO currency symbol (same rules as Products).
 * Symbol position follows the active UI locale.
 */
export function formatMoneyCents(
  translate: TranslateService,
  priceCents: number,
  currencyCode: string | null | undefined,
): string {
  const locale = intlLocaleFromTranslate(translate);
  const code = (currencyCode || '').trim().toUpperCase();
  if (code) {
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: code,
        currencyDisplay: 'symbol',
      }).format(priceCents / 100);
    } catch {
      /* fall through */
    }
  }
  return (priceCents / 100).toFixed(2);
}
