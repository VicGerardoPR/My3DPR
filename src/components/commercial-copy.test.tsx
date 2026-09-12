import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Footer } from './layout/Footer';
import FAQPage from '@/app/[lang]/faq/page';
import { dictionaries } from '@/lib/i18n';
vi.mock('next/image', () => ({ default: () => null }));

describe('public commercial copy', () => {
  it.each(['es', 'en'] as const)('does not advertise unavailable services or unsupported guarantees in %s', async lang => {
    const footer = renderToStaticMarkup(<Footer lang={lang} />);
    const faq = renderToStaticMarkup(await FAQPage({ params: Promise.resolve({ lang }) }));
    expect(footer).not.toMatch(/paypal|stripe|newsletter|100%|weekly|cada semana|USPS|garantía|guarantee/i);
    expect(faq).not.toMatch(/paypal|24h|1-3|USPS|todos nuestros/i);
    expect(footer).toContain('mailto:');
    expect(footer).toContain('aria-label="MY3D.PR Instagram"');
    expect(footer).not.toContain('href="https://facebook.com"');
    expect(dictionaries[lang].sections.customBannerSubtitle).not.toMatch(/24h/);
    expect(dictionaries[lang].features.qualityDesc).not.toMatch(/non-toxic|no tóxicos/);
  });
});
