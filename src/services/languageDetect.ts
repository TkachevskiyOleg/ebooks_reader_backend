export async function detectLanguageFromText(sample: string): Promise<string | null> {
  try {
    if (!sample || sample.trim().length < 20) return null;
    const mod = await import('franc-min');
    const code = mod.franc(sample, { minLength: 20 });
    if (!code || code === 'und') return null;
    const map: Record<string, string> = {
      ukr: 'uk', eng: 'en', rus: 'ru', pol: 'pl', spa: 'es', fra: 'fr', deu: 'de', ita: 'it', jpn: 'ja', zho: 'zh'
    };
    return map[code] || code;
  } catch {
    return null;
  }
}


