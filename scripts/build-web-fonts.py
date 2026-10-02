#!/usr/bin/env python3
"""
自己ホストの日本語Webフォントを、必要な文字だけ読み込まれる形に分割する。

なぜ：IBATOCO Mincho（Shippori Mincho Bold、8.5MB）と IBATOCO Gothic（Zen Kaku Gothic New Medium、2.3MB）を
TTFのまま丸ごと配信していて、どのページでも約11MBを読み込んでいた。モバイルの PageSpeed Insights で
FCP 32秒・LCP 37秒（2026-10-03 計測）。見た目は変えずに、読み込む量だけを減らす。

どう分けるか（Google Fonts と同じ考え方。unicode-range でブラウザが必要な分だけ取りにいく）：
  - core   … 英数字・記号・かな ＋ サイトの多くのページに出る漢字（ビルド済みの全ページで数えた上位 TIER1 字）
             ほとんどのページはこれだけで足りる（2026-10-03 の集計で、1ページの字の99%以上がここに入る）
  - more-N … サイトの原稿で使っているそれ以外の字を、多く出る順に MORE_CHUNK 字ずつ分けたもの
  - rest-N … フォントに入っているそれ以外の文字を、コードポイント順に分けたもの
             新しい記事で未使用の漢字が出ても、その字を含む分だけが追加で読み込まれる（字が欠けることはない）
  rest を先、more、core を最後に宣言する。unicode-range が重なるとき、ブラウザは後に宣言した @font-face から探すため、
  core・more にある字で rest が読み込まれることはない。

字形・カーニング・palt などのOpenType機能はすべて残す（--layout-features='*'）。ヒンティングも残す。

実行（フォントや原稿の文字が大きく変わったときだけ。生成物はリポジトリに入れる）：
  pip install fonttools brotli
  npm run build          # 字の出現ページ数を dist/ で数えるため、先にビルドしておく
  python3 scripts/build-web-fonts.py
出力：
  public/fonts/<family>-<slice>-<hash>.woff2
  src/styles/fonts.generated.css（global.css が読み込む）
"""
import hashlib
import os
import re
import sys
from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools import subset

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "public" / "fonts"
CSS_OUT = ROOT / "src" / "styles" / "fonts.generated.css"

FONTS = [
    {
        "family": "IBATOCO Mincho",
        "slug": "ibatoco-mincho",
        "src": ROOT / "src/assets/fonts/ShipporiMincho-Bold.ttf",
        "weight": "600 700",
    },
    {
        "family": "IBATOCO Gothic",
        "slug": "ibatoco-gothic",
        "src": ROOT / "src/assets/fonts/ZenKakuGothicNew-Medium.ttf",
        "weight": "400 700",
    },
]

# 原稿に出ていなくても、日本語の文章で普通に使う範囲は core に入れておく
BASE_RANGES = [
    (0x0020, 0x007E),  # ASCII
    (0x00A0, 0x00FF),  # Latin-1（©・°・×・÷ など）
    (0x2010, 0x2027),  # ダッシュ・引用符・…
    (0x2030, 0x205E),  # ‰・′・″ など
    (0x2190, 0x21FF),  # 矢印
    (0x2460, 0x24FF),  # 丸数字
    (0x25A0, 0x25FF),  # ■□▲△◆◇○●
    (0x2600, 0x26FF),  # ☆★ など
    (0x3000, 0x303F),  # 和文の句読点・括弧
    (0x3040, 0x309F),  # ひらがな
    (0x30A0, 0x30FF),  # カタカナ
    (0x31F0, 0x31FF),  # 小書きカタカナ
    (0xFF00, 0xFFEF),  # 全角英数・記号、半角カナ
]
CORPUS_DIRS = ["src"]
CORPUS_EXT = {".md", ".mdx", ".astro", ".ts", ".js", ".mjs", ".json", ".csv", ".css", ".html", ".svg", ".yaml", ".yml"}
REST_CHUNK = 1500  # rest の1ファイルあたりの文字数の目安
TIER1 = 1000  # core に入れる漢字などの数（多くのページに出る順）
MORE_CHUNK = 300  # more の1ファイルあたりの文字数


def page_frequency():
    """ビルド済みの各ページ（dist/**/index.html）の本文に、その字が出るページ数。
    ヘッダー・フッターのように全ページに出る字も、ページ単位で数えれば正しく上位に来る。"""
    from collections import Counter
    freq = Counter()
    pages = [p for p in (ROOT / "dist").rglob("index.html")]
    for path in pages:
        html = path.read_text(encoding="utf-8", errors="ignore")
        html = re.sub(r"<script[\s\S]*?</script>|<style[\s\S]*?</style>|<svg[\s\S]*?</svg>", "", html)
        text = re.sub(r"<[^>]+>", " ", html)
        freq.update({ord(c) for c in text})
    if not pages:
        print("dist/ がありません。先に npm run build を実行してください（字の頻度を数えられないため、原稿の字を codepoint 順に分けます）", file=sys.stderr)
    return freq, pages


def corpus_codepoints():
    used = set()
    for d in CORPUS_DIRS:
        for path in (ROOT / d).rglob("*"):
            if path.suffix in CORPUS_EXT and path.is_file():
                try:
                    used.update(ord(c) for c in path.read_text(encoding="utf-8"))
                except UnicodeDecodeError:
                    continue
    for lo, hi in BASE_RANGES:
        used.update(range(lo, hi + 1))
    return used


def to_ranges(codepoints):
    """[0x41,0x42,0x43,0x50] → 'U+41-43,U+50'"""
    out = []
    cps = sorted(codepoints)
    start = prev = cps[0]
    for cp in cps[1:]:
        if cp == prev + 1:
            prev = cp
            continue
        out.append((start, prev))
        start = prev = cp
    out.append((start, prev))
    return ",".join(f"U+{a:X}" if a == b else f"U+{a:X}-{b:X}" for a, b in out)


# 漢字の帯（統合漢字・拡張A）。この中でフォントに無い字はめったに出ないので、範囲をまたいでまとめてよい
CJK_BLOCKS = [(0x3400, 0x4DBF), (0x4E00, 0x9FFF)]


def in_cjk(cp):
    return any(lo <= cp <= hi for lo, hi in CJK_BLOCKS)


def rest_ranges(cps, cmap, core):
    """rest の unicode-range。フォントに入っている字の連続区間を、次の場合だけつなげて短くする：
    あいだの字がすべて core（後勝ちで core が使われる）か、漢字の帯の中の字。
    ハングル・絵文字・記号など、フォントに無い字の帯はつなげない（その字のために rest を読みに行かせない）。"""
    lo, hi = cps[0], cps[-1]
    inside = sorted(cp for cp in cmap if lo <= cp <= hi)
    runs = []
    for cp in inside:
        if runs and all(g in core or in_cjk(g) for g in range(runs[-1][1] + 1, cp)):
            runs[-1][1] = cp
        else:
            runs.append([cp, cp])
    return ",".join(f"U+{a:X}" if a == b else f"U+{a:X}-{b:X}" for a, b in runs)


def make_subset(src, codepoints):
    options = subset.Options()
    options.flavor = "woff2"
    options.layout_features = ["*"]  # palt・kern など、すべてのOpenType機能を残す
    options.name_IDs = ["*"]  # ライセンス等の名前情報を残す
    options.name_languages = ["*"]
    options.name_legacy = True
    options.notdef_outline = True
    options.hinting = True
    # 保存のたびに更新日時が変わると、中身が同じでもファイル名のハッシュが変わってしまう
    font = TTFont(src, recalcTimestamp=False)
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(unicodes=sorted(codepoints))
    subsetter.subset(font)
    from io import BytesIO
    buf = BytesIO()
    font.flavor = "woff2"
    font.save(buf)
    return buf.getvalue()


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    used = corpus_codepoints()
    freq, pages = page_frequency()
    base = set()
    for lo, hi in BASE_RANGES:
        base.update(range(lo, hi + 1))
    css = [
        "/* 自動生成（scripts/build-web-fonts.py）。手で編集しない。 */",
        "/* rest を先、core を最後に宣言する（unicode-range が重なると、後に宣言したものから探されるため）。 */",
        "",
    ]
    written = set()
    report = []
    for spec in FONTS:
        font = TTFont(spec["src"])
        cmap = set(font.getBestCmap().keys())
        used_in_font = cmap & used
        # 多く出る順（同じならコードポイント順）。core に英数字・かなと上位 TIER1 字、残りを more に
        ranked = sorted(used_in_font - base, key=lambda cp: (-freq.get(cp, 0), cp))
        core = (cmap & base) | set(ranked[:TIER1])
        more = ranked[TIER1:]
        rest = sorted(cmap - used_in_font)
        slices = [(f"rest-{n + 1}", rest[i:i + REST_CHUNK]) for n, i in enumerate(range(0, len(rest), REST_CHUNK))]
        more_slices = [(f"more-{n + 1}", sorted(more[i:i + MORE_CHUNK])) for n, i in enumerate(range(0, len(more), MORE_CHUNK))]
        faces = []
        sizes = {}
        for name, cps in slices + list(reversed(more_slices)) + [("core", sorted(core))]:
            data = make_subset(spec["src"], cps)
            digest = hashlib.sha256(data).hexdigest()[:8]
            filename = f"{spec['slug']}-{name}-{digest}.woff2"
            (OUT_DIR / filename).write_bytes(data)
            written.add(filename)
            # core は使う字だけを正確に列挙する。rest はフォントにある字の区間を、core と漢字の帯をまたいでつなげる
            # （CSSを小さくするため）。帯の中の core の字は、後に宣言した core が先に見つかるので rest は読み込まれない
            if name.startswith("rest-"):
                urange = rest_ranges(cps, cmap, used_in_font)
            else:
                urange = to_ranges(cps)
            sizes[name] = (set(cps), len(data))
            faces.append(
                "@font-face {\n"
                f"  font-family: \"{spec['family']}\";\n"
                f"  src: url(\"/fonts/{filename}\") format(\"woff2\");\n"
                f"  font-weight: {spec['weight']};\n"
                "  font-style: normal;\n"
                "  font-display: swap;\n"
                f"  unicode-range: {urange};\n"
                "}\n"
            )
            report.append(f"{filename}: {len(cps)}字 {len(data) / 1024:.0f}KB")
        css.append(f"/* {spec['family']}（{spec['src'].name}、{len(cmap)}字）: core {len(core)}字 + more {len(more_slices)}分割 + rest {len(slices)}分割 */")
        css.extend(faces)
        # 各ページで読み込まれる量の見積もり（そのページの字が1字でも入っているファイルを合計。書体の使い分けは考えない上限）
        if pages:
            totals = []
            for path in pages:
                html = path.read_text(encoding="utf-8", errors="ignore")
                html = re.sub(r"<script[\s\S]*?</script>|<style[\s\S]*?</style>|<svg[\s\S]*?</svg>", "", html)
                chars = {ord(c) for c in re.sub(r"<[^>]+>", " ", html)} & cmap
                totals.append(sum(n for cps, n in sizes.values() if cps & chars))
            totals.sort()
            mid, p90 = totals[len(totals) // 2], totals[int(len(totals) * 0.9)]
            report.append(f"  {spec['family']}: 1ページで読み込む量の見積もり 中央値 {mid / 1024:.0f}KB・上位10% {p90 / 1024:.0f}KB・最大 {totals[-1] / 1024:.0f}KB（{len(pages)}ページ）")
    for f in OUT_DIR.glob("ibatoco-*.woff2"):
        if f.name not in written:
            f.unlink()
    CSS_OUT.write_text("\n".join(css), encoding="utf-8")
    print("\n".join(report))
    print(f"CSS: {CSS_OUT.relative_to(ROOT)}（{CSS_OUT.stat().st_size / 1024:.1f}KB）")


if __name__ == "__main__":
    sys.exit(main())
