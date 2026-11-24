import { clearCtaOrigin, readCtaOrigin } from './analytics-events';

/**
 * フォーム送信ヘルパー（クライアント）。
 * - form[data-endpoint] が設定されていれば Formspree へAJAX送信（ページ遷移なし）
 * - 未設定ならメール下書き（mailto）にフォールバック
 */
interface Options {
  successText: string;
  mailto?: string;
  mailSubject?: string;
  /** GA4へ送るCV名。未指定なら form の id、それも無ければ 'contact' */
  conversionId?: string;
  analyticsSubject?: () => string;
}

/**
 * CVイベント。**エンドポイントが 2xx を返した送信だけ**送る。
 * ボタンのクリックや、失敗した送信では送らない（実際に届いた件数と一致させるため）。
 * gtag が読み込まれていない環境（開発・運営者除外）では何もしない。
 */
function trackConversion(id: string, subject: string): void {
  const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
  if (typeof gtag !== 'function') return;
  // 記事末のCTAから来た送信なら、どのCTA・どの記事からかを付ける（無ければ付けない）
  const origin = readCtaOrigin();
  gtag('event', 'generate_lead', {
    form_id: id,
    form_subject: subject || '(未選択)',
    page_path: window.location.pathname,
    ...(origin ?? {}),
  });
}

export function submitForm(form: HTMLFormElement, opts: Options): void {
  const endpoint = form.dataset.endpoint?.trim();
  const status = form.querySelector<HTMLElement>('[data-status]');
  const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  const mailto = opts.mailto ?? 'info@ibatoco.jp';

  const show = (text: string, tone: 'ok' | 'err') => {
    if (!status) return;
    status.textContent = text;
    status.dataset.tone = tone;
    status.hidden = false;
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = new FormData(form);

    // フォールバック：エンドポイント未設定ならメール下書きを開く
    if (!endpoint) {
      const body = [...data.entries()].map(([k, v]) => `${k}: ${v}`).join('\n');
      const subject = encodeURIComponent(opts.mailSubject ?? '【イバトコ】お問い合わせ');
      window.location.href = `mailto:${mailto}?subject=${subject}&body=${encodeURIComponent(body)}`;
      return;
    }

    form.classList.add('is-sending');
    if (button) button.disabled = true;
    show('送信中…', 'ok');

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        body: data,
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        trackConversion(
          opts.conversionId || form.id || 'contact',
          opts.analyticsSubject ? opts.analyticsSubject() : String(data.get('inquiry_type') ?? ''),
        );
        clearCtaOrigin();
        form.reset();
        show(opts.successText, 'ok');
        form.querySelectorAll('input, select, textarea').forEach((el) => {
          (el as HTMLElement).setAttribute('disabled', '');
        });
        if (button) button.style.display = 'none';
      } else {
        const json = await res.json().catch(() => null);
        const msg = json?.errors?.[0]?.message ?? '送信に失敗しました。時間をおいて再度お試しください。';
        show(msg, 'err');
      }
    } catch {
      show('通信エラーが発生しました。電話またはメールでご連絡ください。', 'err');
    } finally {
      form.classList.remove('is-sending');
      if (button) button.disabled = false;
    }
  });
}
