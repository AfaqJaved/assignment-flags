import { maskString, redactDeep } from './redact';

describe('maskString', () => {
  it('fully redacts strings longer than 15 chars, with their length', () => {
    const apiKey =
      'sk_1f71988715a3a164e1e9e928c11920023beb8a97bc1038cdde202e882f69bbd8';
    expect(maskString(apiKey)).toBe(`[Redacted ${apiKey.length} chars long]`);
  });

  it('shows a 6-char prefix and masks the rest for strings over 6 and up to 15 chars', () => {
    expect(maskString('new-checkout')).toBe('new-ch******');
  });

  it('fully masks strings of 6 chars or fewer', () => {
    expect(maskString('abcdef')).toBe('******');
    expect(maskString('ab')).toBe('**');
    expect(maskString('')).toBe('');
  });

  it('preserves the visible masked length for a boundary 15-char string', () => {
    const fifteen = '123456789012345';
    expect(fifteen).toHaveLength(15);
    expect(maskString(fifteen)).toBe('123456*********');
  });

  it('fully redacts a boundary 16-char string', () => {
    const sixteen = '1234567890123456';
    expect(maskString(sixteen)).toBe('[Redacted 16 chars long]');
  });
});

describe('redactDeep', () => {
  it('masks string values inside a flat object', () => {
    expect(redactDeep({ key: 'new-checkout', createdBy: 'user-1' })).toEqual({
      key: 'new-ch******',
      createdBy: '******',
    });
  });

  it('leaves non-string values untouched', () => {
    expect(
      redactDeep({ enabled: true, rolloutPercentage: 25, description: null }),
    ).toEqual({ enabled: true, rolloutPercentage: 25, description: null });
  });

  it('recurses into nested objects and arrays', () => {
    const longKey = 'sk_1f71988715a3a164e1e9e928c11920023beb8a97bc1038';

    expect(
      redactDeep({
        tenant: { apiKey: longKey },
        tags: ['new-checkout', 'ok'],
      }),
    ).toEqual({
      tenant: { apiKey: `[Redacted ${longKey.length} chars long]` },
      tags: ['new-ch******', '**'],
    });
  });

  it('passes through null and undefined bodies unchanged', () => {
    expect(redactDeep(null)).toBeNull();
    expect(redactDeep(undefined)).toBeUndefined();
  });

  it('masks Date values via their ISO string instead of collapsing to {}', () => {
    const date = new Date('2026-07-18T18:44:44.123Z');
    const iso = date.toISOString();
    expect(redactDeep({ createdAt: date })).toEqual({
      createdAt: `[Redacted ${iso.length} chars long]`,
    });
  });
});
