/**
 * ブラウザの中で実行する、1ページ分のUI検査。
 * scripts/ui-smoke.mjs が Playwright の page.evaluate で各 viewport ごとに呼ぶ。
 * DOM だけを見るので、外部サービスにも計測にも触れない。
 *
 * 返すもの：
 *   issues  … 見つかった問題（type と detail）
 *   imgs    … ページ内の画像URL（src / srcset）。存在確認は Node 側で dist と突き合わせる
 *   counts  … 呼び出し側が指定したセレクタの件数（主要CTAの欠損チェック用）
 *
 * @param {{ required: [string, number][] }} options
 */
export function inspectPage(options) {
  const html = document.documentElement;
  const body = document.body;
  const W = html.clientWidth;
  const issues = [];

  const label = (el) => {
    const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/).filter(Boolean).slice(0, 2).join('.') : '';
    return el.tagName.toLowerCase() + (el.id ? `#${el.id}` : '') + (cls ? `.${cls}` : '');
  };
  const isHidden = (el) => Boolean(el.closest('[hidden],[aria-hidden="true"],.sr-only,.visually-hidden,dialog:not([open])'));
  /** 横スクロールさせる前提の帯（タブ・ジャンプナビ等）の中は、はみ出しとして数えない */
  const inScroller = (el) => {
    for (let p = el.parentElement; p && p !== body; p = p.parentElement) {
      const ox = getComputedStyle(p).overflowX;
      if (ox === 'auto' || ox === 'scroll') return true;
    }
    return false;
  };
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    if (!(r.width > 0 && r.height > 0) || isHidden(el)) return null;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || cs.position === 'fixed') return null;
    return r;
  };

  // 1a) 読者が実際に横スクロールできてしまうか（html / body の overflow-x はそのままで測る）
  const userScrollWidth = html.scrollWidth;
  if (userScrollWidth > W + 1) {
    issues.push({ type: 'horizontal-overflow', detail: `document scrollWidth ${userScrollWidth} > viewport ${W}` });
  }

  // 1b) 以降は body / html の overflow-x を外してから測る（clip のままだと、切られた中身が見えない）
  const saved = [html.style.overflowX, body.style.overflowX];
  html.style.overflowX = 'visible';
  body.style.overflowX = 'visible';

  try {
    // 画面の右端で切られている中身。装飾（aria-hidden）と、横スクロールさせる帯の中は除く
    const offenders = [...body.querySelectorAll('*')]
      .filter((el) => { const r = visible(el); return r && r.right > W + 1 && !inScroller(el); })
    const leafOffenders = offenders.filter((el) => !offenders.some((other) => other !== el && el.contains(other)));
    for (const el of leafOffenders.slice(0, 5)) {
      issues.push({ type: 'content-beyond-viewport', detail: `${label(el)} right=${Math.round(el.getBoundingClientRect().right)} viewport=${W}` });
    }

    // 2) CTA・カードの viewport 外へのはみ出し
    const CTA = [
      'a[class*="cta"]', 'a[class*="btn"]', 'a[class*="button"]', 'button[type="submit"]',
      '.bp-cards > li', '.news-card', '.toco-card', '.toco-link-card', '[data-growth-next-link]',
    ].join(',');
    for (const el of document.querySelectorAll(CTA)) {
      const r = visible(el);
      if (!r || inScroller(el)) continue;
      if (r.left < -1 || r.right > W + 1) {
        issues.push({ type: 'cta-outside-viewport', detail: `${label(el)} left=${Math.round(r.left)} right=${Math.round(r.right)} viewport=${W}` });
      }
    }

    // 3) 親の overflow:hidden に途中で切られている文字（例：カード本文の右端が切れる）
    for (const el of body.querySelectorAll('*')) {
      if (el.children.length > 0 || !el.textContent.trim()) continue;
      const r = visible(el);
      if (!r) continue;
      for (let p = el.parentElement; p && p !== body; p = p.parentElement) {
        const ox = getComputedStyle(p).overflowX;
        if (ox === 'auto' || ox === 'scroll') break;
        if (ox === 'hidden' || ox === 'clip') {
          const pr = p.getBoundingClientRect();
          // 一部だけ切れているものだけ。丸ごと外にある（スライダーの待機中の面など）は対象外
          if (r.left < pr.right && r.right > pr.right + 2) {
            issues.push({ type: 'clipped-text', detail: `${label(el)} in ${label(p)} cut ${Math.round(r.right - pr.right)}px "${el.textContent.trim().slice(0, 20)}"` });
          }
          break;
        }
      }
    }

    // 4) 極端に狭いテキスト領域（1〜2文字ずつ縦に割れる）
    for (const el of body.querySelectorAll('p,h1,h2,h3,h4,h5,h6,li,a,span,strong,b,small,dt,dd,label,button,time')) {
      const text = el.textContent.replace(/\s+/g, '');
      if (text.length < 6) continue;
      const r = visible(el);
      if (!r) continue;
      const cs = getComputedStyle(el);
      if (cs.writingMode.startsWith('vertical') || cs.display === 'contents') continue;
      const fs = parseFloat(cs.fontSize) || 16;
      if (r.width < fs * 2.5 && r.height > fs * 4) {
        issues.push({ type: 'narrow-text', detail: `${label(el)} width=${Math.round(r.width)}px height=${Math.round(r.height)}px "${text.slice(0, 12)}"` });
      }
    }


    // 5) モバイル視認性・操作性。WCAGの厳密な適合判定ではなく、崩れと実用性のガードレール。
    if (W <= 430) {
      // iOS Safari はフォーム入力が16px未満だとフォーカス時に自動ズームする。
      for (const el of body.querySelectorAll('input:not([type="hidden"]),select,textarea')) {
        const r = visible(el);
        if (!r) continue;
        const fs = parseFloat(getComputedStyle(el).fontSize) || 16;
        if (fs < 16) {
          issues.push({ type: 'mobile-form-font-too-small', detail: `${label(el)} font-size=${fs}px（16px未満）` });
        }
      }

      // 主要な操作部品は44pxを最低目安にする。インライン本文リンクは対象外。
      const touchTargets = [
        'button[type="submit"]',
        'input[type="submit"]',
        'input[type="button"]',
        'a[class*="cta"]',
        'a[class*="button"]',
        '[data-quick-term]',
        '[data-growth-next-link]',
      ].join(',');
      for (const el of body.querySelectorAll(touchTargets)) {
        const r = visible(el);
        if (!r || inScroller(el)) continue;
        if (r.height < 44 || r.width < 44) {
          issues.push({ type: 'touch-target-too-small', detail: `${label(el)} ${Math.round(r.width)}x${Math.round(r.height)}px（44px未満）` });
        }
      }

      // 装飾キッカーや短いメタ情報は小さくても成立するため除外し、
      // 「読む必要がある本文」が極端に小さい場合だけ失敗させる。
      for (const el of body.querySelectorAll('p,li,dt,dd,label')) {
        const r = visible(el);
        if (!r) continue;
        const text = el.textContent.replace(/\s+/g, '').trim();
        if (text.length < 12) continue;
        const cls = typeof el.className === 'string' ? el.className : '';
        if (/kicker|label|meta|source|when|area|region|index|credit/i.test(cls)) continue;
        const fs = parseFloat(getComputedStyle(el).fontSize) || 16;
        const threshold = text.length >= 32 ? 11 : 10.5;
        if (fs < threshold) {
          issues.push({ type: 'readability-font-too-small', detail: `${label(el)} font-size=${fs}px "${text.slice(0, 20)}"` });
        }
      }
    }

    // 6) img の src 欠損
    const imgs = [];
    for (const img of document.querySelectorAll('img')) {
      const src = img.getAttribute('src');
      if (!src || !src.trim()) {
        issues.push({ type: 'img-src-missing', detail: `${label(img)} alt="${img.getAttribute('alt') ?? ''}"` });
        continue;
      }
      imgs.push(src);
      const srcset = img.getAttribute('srcset');
      if (srcset) for (const part of srcset.split(',')) imgs.push(part.trim().split(/\s+/)[0]);
    }
    for (const source of document.querySelectorAll('picture source[srcset]')) {
      for (const part of source.getAttribute('srcset').split(',')) imgs.push(part.trim().split(/\s+/)[0]);
    }

    // 7) 主要CTAの欠損
    const counts = {};
    for (const [selector] of options.required) counts[selector] = document.querySelectorAll(selector).length;

    return { issues, imgs, counts, viewport: W };
  } finally {
    html.style.overflowX = saved[0];
    body.style.overflowX = saved[1];
  }
}
