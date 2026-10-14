import { describe, expect, it } from 'vitest';
import { escapeHtml, renderMail } from './mailTemplate';

const content = {
  preheader: 'Ein Klick fehlt noch',
  heading: 'Bitte bestätige deinen Preisalarm',
  paragraphs: ['Hotel <Adlon> & Co', 'Zweiter Absatz'],
  button: { label: 'Alarm bestätigen', url: 'https://tidaq.com/alarm/bestaetigen?token=a"b' },
  footer: ['Du bekommst diese E-Mail, weil …'],
};

describe('renderMail', () => {
  it('escapes every value in the HTML', () => {
    const { html } = renderMail(content);
    expect(html).toContain('Hotel &lt;Adlon&gt; &amp; Co');
    expect(html).toContain('href="https://tidaq.com/alarm/bestaetigen?token=a&quot;b"');
    expect(html).not.toContain('<Adlon>');
  });

  it('has a plain-text version with the link written out', () => {
    const { text } = renderMail(content);
    expect(text.split('\n')[0]).toBe('Bitte bestätige deinen Preisalarm');
    expect(text).toContain('Hotel <Adlon> & Co');
    expect(text).toContain('Alarm bestätigen: https://tidaq.com/alarm/bestaetigen?token=a"b');
    expect(text).toContain('Du bekommst diese E-Mail, weil …');
  });

  it('escapes quotes and apostrophes', () => {
    expect(escapeHtml(`"it's"`)).toBe('&quot;it&#39;s&quot;');
  });
});
