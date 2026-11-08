#!/usr/bin/env python3
"""Build the v42 fidelity design supplement without modifying its reference.

Usage: python3 build_preview.py --reference /path/to/ibatoco-all-pages-design-v42 --output /path/to/new-preview
This builds design documents only. It never edits Astro, git, or production data.
"""
from pathlib import Path
import argparse, html, json, re, shutil

ROOT = Path(__file__).resolve().parent
def esc(s): return html.escape(str(s), quote=True)
def art(name, alt=''):
    return f'<img src="../reference/assets/{esc(name)}" alt="{esc(alt)}" loading="lazy" decoding="async">'
def button(href, label):
    return f'<a class="p41-button" href="{esc(href)}">{esc(label)}<span aria-hidden="true">→</span></a>'
def crumb(label):
    return f'<nav class="p41-wrap p41-crumb" aria-label="現在地"><a href="index.html">イバトコ</a><span>／</span><span>{esc(label)}</span></nav>'
def hero(kicker, title, lead, image='field-reporters.webp'):
    breaks={'確認できた場所から、探す。':['確認できた場所から、','探す。'],'JAXA筑波宇宙センター':['JAXA','筑波宇宙センター'],'干し芋を、もっと好きになる。':['干し芋を、','もっと好きになる。'],'いま、会いに行きたい花。':['いま、会いに','行きたい花。'],'予約は、各施設の公式窓口へ。':['予約は、各施設の','公式窓口へ。']}
    title_html='<br class="v42-br-phone">'.join(esc(x) for x in breaks.get(title,[title]))
    return f'<header class="v42r-hero"><div class="v42r-hero-inner"><div><p class="p41-kicker">{esc(kicker)}</p><h1>{title_html}</h1><p class="p41-lead">{lead}</p></div>{art(image)}</div></header>'
def related():
    return '<section class="v42r-folio"><p class="p41-kicker">ONE MORE DISCOVERY</p><h2>ここから、もうひと歩き。</h2><div class="v42r-actions">'+button('area-index.html','44市町村から探す')+button('course-list.html','モデルコースを読む')+button('food-list.html','おいしい図鑑をひらく')+'</div></section>'
def shell(label, content): return f'<main class="p41-main" id="content">{crumb(label)}{content}{related()}</main>'

def shop_empty():
    return shell('場所を探す', hero('PLACES ／ LOCAL FIELD NOTES','確認できた場所から、探す。','住所や営業時間などの公式情報と、取材で受け取った物語を分けて掲載します。','food-vignette.webp') + '''<section class="v42r-folio"><div class="v42r-empty">'''+art('v38-pet-cafe-terrace.webp')+'''<div><p class="p41-kicker">LOCAL PLACES</p><h2>まちのお店を、<br>ひとつずつ。</h2><p>いまは、掲載しているお店がありません。<br>確認できた情報から、紹介を増やしていきます。</p><div class="v42r-actions"><a href="pet.html">ペットと行ける場所へ　→</a><a href="area-index.html">街のガイドを読む　→</a></div></div></div><p class="v42r-caption">掲載基準・編集と広告の区分は、現在公開している方針をご確認ください。</p></section>''')

def shop_template():
    return shell('店舗の紹介',hero('LOCAL PLACE ／ 店舗詳細','お店のお名前','この場所の紹介文が入ります。<br>その店の写真を使える場合だけ、写真を配置します。','food-vignette.webp')+'''<div class="v42r-profile"><article><p class="p41-kicker">STORY</p><h2>この場所の、続いてきたこと。</h2><p class="v42r-data-slot">確認できたお店の紹介文。<br>取材をしていない場合、架空の取材談は入りません。<br>編集記事・PRの区分は、本文の前に表示します。</p><section class="v42r-folio"><p class="p41-kicker">BEFORE YOU GO</p><h2>出かける前に。</h2><dl class="v42r-facts"><dt>所在地</dt><dd>確認済みの所在地</dd><dt>営業時間</dt><dd>確認済みの時間だけを表示</dd><dt>定休日</dt><dd>確認できた場合のみ表示</dd><dt>公式の案内</dt><dd>公式サイトへのリンク</dd></dl></section></article><aside><p class="p41-kicker">FIELD NOTES</p>'''+art('field-reporters.webp')+'''<p>確認日と情報源を、ここに添えます。</p><p class="v42r-caption">写真がないときは、店の外観を想像でつくりません。</p></aside></div>''')

def author_template():
    return shell('書き手のプロフィール',hero('WRITER ／ EDITOR','書き手のお名前','担当地域と役割を、確認できた情報で紹介します。','field-reporters.webp')+'''<div class="v42r-profile"><article><p class="p41-kicker">PROFILE</p><h2>この街との、かかわり。</h2><p class="v42r-data-slot">実在する書き手の紹介文が入ります。<br>確認できた担当地域・専門分野・公開アカウントを掲載します。<br>取材実績は、本人との対応が確認できるものだけを示します。</p><section class="v42r-folio"><p class="p41-kicker">STORIES</p><h2>この書き手の、よりみち。</h2><p>公開されている担当記事だけを、ここへ。</p></section></article><aside><p class="p41-kicker">DISCLOSURE</p><h3>編集に関わる立場。</h3><p>役割・利益相反など、公開が必要な情報を添えます。</p><div class="v42r-actions"><a href="team.html">運営・チームへ　→</a><a href="policy-editorial.html">編集方針へ　→</a></div></aside></div>''')

def author_empty():
    return shell('書き手のプロフィール',hero('PEOPLE OF IBATOCO','茨城の話を、届ける人。','実名のプロフィールは、公開できる情報がそろった方から紹介します。')+'''<section class="v42r-folio"><div class="v42r-empty">'''+art('field-reporters.webp')+'''<div><p class="p41-kicker">FROM THE EDITORS</p><h2>書き手を、<br>きちんと紹介するために。</h2><p>現在、公開している個別プロフィールはありません。<br>運営体制と編集方針は、こちらからご覧いただけます。</p><div class="v42r-actions"><a href="team.html">運営・チームを読む　→</a><a href="reporters.html">参加の案内へ　→</a></div></div></div></section>''')

def spot_lean():
    return shell('JAXA筑波宇宙センター',hero('DISCOVERY MINI GUIDE ／ つくば市','JAXA筑波宇宙センター','県南・つくば市。<br>出かける前に、公式の案内をご確認ください。','map-travelers.webp')+'''<div class="v42r-profile"><article><section class="v42r-notebook"><p class="p41-kicker">BEFORE YOU GO</p><h2>行く前に確認できること。</h2><dl class="v42r-facts"><dt>エリア</dt><dd>つくば市</dd><dt>情報確認日</dt><dd>2026年8月7日</dd><dt>掲載根拠</dt><dd><a href="https://ibatoco.jp/spot/jaxa-tsukuba/">掲載ページの情報源を見る ↗</a></dd></dl><div class="v42r-actions"><a href="https://ibatoco.jp/spot/jaxa-tsukuba/">公式の案内を確かめる　↗</a></div></section><section class="v42r-folio"><p class="p41-kicker">NEARBY</p><h2>つくばで、もうひと歩き。</h2><div class="v42r-actions"><a href="https://ibatoco.jp/area/tsukuba/">つくば市のガイドへ　→</a><a href="map-browser.html">条件を変えて探す　→</a></div></section></article><aside>'''+art('field-reporters.webp')+'''<p class="p41-kicker">MINI FIELD NOTE</p><p>営業時間・料金・休業日など、変わりやすい情報は公式へ。</p><p class="v42r-caption">この挿絵は、施設の写真ではありません。</p></aside></div>''')

def books():
    names=[('干し芋','hoshiimo/','#ab9158'),('常陸秋そば','food-library/soba/','#6e8063'),('メロン','food-library/melon/','#8c9b6f'),('いちご','food-library/ichigo/','#a87569'),('栗','food-library/kuri/','#9b7b5c'),('れんこん','food-library/renkon/','#a79a7b'),('さつまいも','food-library/satsumaimo/','#99746f'),('白菜','food-library/hakusai/','#8d9e80')]
    return '<div class="v42r-book-grid">'+''.join(f'<a class="v42r-book" style="--book:{c}" href="https://ibatoco.jp/{u}"><span class="p41-kicker">FIELD BOOK {i:02d}</span><h3>{n}</h3><span class="p41-read">図鑑をひらく　→</span></a>' for i,(n,u,c) in enumerate(names,1))+'</div>'

def food_list():
    return shell('おいしい図鑑',hero('FOOD LIBRARY','茨城のおいしい図鑑','品種、産地、つくる人。<br>食べものから、茨城の土地をひらく。','hoshiimo-field-visit.webp')+'''<section class="v42r-folio"><p class="p41-kicker">EIGHT FIELD BOOKS</p><h2>八つの食べもの、八冊の図鑑。</h2>'''+books()+'''</section><section class="v42r-folio" id="origin"><p class="p41-kicker">SEASON · ORIGIN · VARIETY</p><h2>旬から、産地から、好みから。</h2><div class="v42r-actions"><a href="#season">旬のカレンダーへ　→</a><a href="#origin">産地をたどる　→</a><a href="food-guide.html">干し芋の品種を知る　→</a></div></section><section class="v42r-folio" id="season"><p class="p41-kicker">FOOD CALENDAR</p><h2>一月から十二月まで、何かが旬。</h2><p>季節と産地の情報は、現行の図鑑へ。</p></section>''')

def food_guide():
    varieties=['べにはるか','シルクスイート','玉豊','いずみ','ほしこがね','ほしキラリ','ほしあかね','タマオトメ']
    cells=''.join(f'<a href="#varieties"><span class="v42r-number">{i:02d}</span><strong>{name}</strong><span aria-hidden="true">→</span></a>' for i,name in enumerate(varieties,1))
    return shell('干し芋図鑑',hero('FOOD FIELD NOTES ／ 干し芋図鑑','干し芋を、もっと好きになる。','品種、産地、干し方。<br>甘さの向こうに、この土地の時間。','hoshiimo-field-visit.webp')+'''<div class="v42r-profile"><article><p class="p41-kicker">TASTE & TEXTURE</p><h2>同じ干し芋なのに、こんなに違う。</h2><p>知ってから選ぶと、次のひと口が少し楽しくなる。品種と産地から、茨城の干し芋をたどります。</p><section class="v42r-folio" id="varieties"><p class="p41-kicker">EIGHT VARIETIES</p><h2>八つの個性を、味わう。</h2><div class="v42r-variant-list">'''+cells+'''</div></section><section class="v42r-folio" id="origin"><p class="p41-kicker">ORIGIN</p><h2>干し芋の、ふるさとへ。</h2><p>産地の紹介と品種ごとの説明は、現行の図鑑で読めます。</p><div class="v42r-actions"><a href="https://ibatoco.jp/hoshiimo/#origin">産地を読む　→</a></div></section></article><aside><p class="p41-kicker">CONTENTS ／ 読む順番</p><div class="v42r-actions"><a href="#varieties">品種から選ぶ　→</a><a href="#origin">産地を知る　→</a><a href="https://ibatoco.jp/hoshiimo/">図鑑を読む　→</a></div>'''+art('food-vignette.webp')+'''<p class="v42r-caption">食のイメージイラスト。</p></aside></div>''')

def flower_empty():
    return shell('花だより',hero('FLOWER NOTES','いま、会いに行きたい花。','季節とともに、花の庭をたずねよう。','food-vignette.webp')+'''<section class="v42r-folio"><div class="v42r-empty">'''+art('field-reporters.webp')+'''<div><p class="p41-kicker">BETWEEN THE SEASONS</p><h2>次の花の便りを、<br>待つ時間も。</h2><p>いま見頃と確認できる花の掲載はありません。<br>次の季節の花を、例年の時期からご案内します。</p></div></div></section><section class="v42r-folio"><p class="p41-kicker">UPCOMING FLOWERS</p><h2>次に咲く花。</h2><div class="v42r-region-links"><a href="https://www.hitachikaihin.jp/">海浜公園の冬の花　↗</a><a href="https://ibaraki-kairakuen.jp/">偕楽園の梅　↗</a></div><p class="v42r-caption">開花中という案内ではありません。例年の時期と、実際の開花を分けてご確認ください。</p></section>''')

def home_additions(s):
    themes=[('食べる','FOOD','eat'),('出かける','TRAVEL','sauna-play'),('泊まる','STAY','stay'),('暮らす','LIFE','life'),('整える','WELLNESS','beauty'),('働く・つくる','CRAFT','company')]
    strip='<section class="v42r-theme-strip"><p class="p41-kicker">SIX WAYS INTO IBARAKI</p><h2>茨城を、六つの入口から。</h2><nav aria-label="テーマから探す"><ol>'+''.join(f'<li><a href="https://ibatoco.jp/{p}/"><small>{i:02d} ／ {en}</small><strong>{label}</strong><span aria-hidden="true">→</span></a></li>' for i,(label,en,p) in enumerate(themes,1))+'</ol></nav></section>'
    s=s.replace('<section class="area',strip+'<section class="area',1) if '<section class="area' in s else s.replace('id="area-guide"', 'id="area-guide"',1)
    if strip not in s:
        m=re.search(r'<section\b[^>]*id="area-guide"',s)
        if m:s=s[:m.start()]+strip+s[m.start():]
    trust='''<section class="v42r-trust"><div class="v42r-trust-inner"><div class="v42r-trust-top">'''+art('field-reporters.webp')+'''<div><p class="p41-kicker">WHY IBATOCO</p><h2>検索では見つからない、<br>この土地の理由を。</h2><p>景色の向こうに、人の営みがある。この土地で続く日常を、ひとつずつ届けたい。</p><div class="v42r-actions"><a href="about.html">イバトコをつくった理由　→</a></div></div></div><div class="v42r-folio"><p class="p41-kicker">取材と編集</p><h2>現地でしか、わからないことを書く。</h2><p>会って、聞いて、確かめる。公開したあとも、変化を追う。</p><div class="v42r-steps"><article><span class="p41-kicker">01 ／ FIELD</span><h3>会いに行く。</h3><p>写真を撮るためだけではなく、声の調子と土地の空気まで受け取ります。</p></article><article><span class="p41-kicker">02 ／ VERIFY</span><h3>事実を、確かめる。</h3><p>確認できた事実と、編集部が感じたことを混ぜずに伝えます。</p></article><article><span class="p41-kicker">03 ／ UPDATE</span><h3>公開後も、見直す。</h3><p>店や制度が変われば、もう一度確かめ、記事を更新します。</p></article></div><div class="v42r-actions"><a href="policy-editorial.html">編集方針を読む　→</a></div></div><div class="v42r-folio"><p class="p41-kicker">FOR LOCAL BUSINESSES</p><h2>茨城を、一緒におもしろく。</h2><div class="v42r-actions"><a href="sponsor.html">協賛のご案内　→</a><a href="sponsor-info.html">地域事業者の方へ　→</a></div></div></div></section>'''
    sponsor=s.find('id="sponsor-title"')
    start=s.rfind('<section',0,sponsor) if sponsor>=0 else -1
    if start>=0:s=s[:start]+trust+s[start:]
    else:s=s.replace('</main>',trust+'</main>',1)
    return s

def region_panel(s):
    cities=[('日立市','hitachi'),('高萩市','takahagi'),('北茨城市','kitaibaraki'),('常陸太田市','hitachiota'),('常陸大宮市','hitachiomiya'),('大子町','daigo')]
    panel='<section class="v42r-folio" id="region-kenpoku"><p class="p41-kicker">KENPOKU ／ 県北</p><h2>海と渓谷、深呼吸の旅。</h2><p>気になる街を、ひとつ。市町村のガイドへつながります。</p><div class="v42r-region-links">'+''.join(f'<a href="https://ibatoco.jp/area/{slug}/">{name}<span aria-hidden="true">→</span></a>' for name,slug in cities)+'</div></section>'
    return s.replace('</main>',panel+'</main>',1)

def preserve_h1(s, current, label_mode=False):
    m=re.search(r'<main\b[\s\S]*?</main>',s)
    if not m:return s
    content=m.group(0);h=re.search(r'<h1\b([^>]*)>([\s\S]*?)</h1>',content)
    if not h:return s
    if label_mode:
        display=f'<p class="v42r-display">{h.group(2)}</p>'
        before=content[:h.start()]
        kick=list(re.finditer(r'<p\b[^>]*class="[^"]*p41-kicker[^"\n]*"[^>]*>[\s\S]*?</p>',before))
        if kick:
            k=kick[-1];before=before[:k.start()]+f'<h1 class="v42r-label">{esc(current)}</h1>'+before[k.end():]
        else:display=f'<h1 class="v42r-label">{esc(current)}</h1>'+display
        content=before+display+content[h.end():]
    else:
        cl='v42-title p41-title v42r-real-title' if len(current)>25 else 'v42-title p41-title'
        content=content[:h.start()]+f'<h1 class="{cl}">{esc(current)}</h1>'+content[h.end():]
    return s[:m.start()]+content+s[m.end():]

def rewrite_assets(s):
    def replace(m):
        attr,url=m.groups()
        if url.startswith(('assets/','fonts/')) or re.match(r'^[^/:]+\.(css|js|json)(?:\?|$)',url):url='../reference/'+url
        return f'{attr}="{url}"'
    return re.sub(r'(src|href)="([^"\n]+)"',replace,s)

def locale_preview(data):
    cards=''.join(f'<article><p class="p41-kicker">0{i+1}</p><h3>{esc(data["sections"][i+1])}</h3><p>{esc(data["paragraphs"][i+3]) if i<2 else ""}</p></article>' for i in range(3))
    guides=''.join(f'<a class="v42r-book" href="https://ibatoco.jp{esc(data["links"][i]["href"])}"><p class="p41-kicker">FIELD GUIDE 0{i//2+1}</p><h3>{esc(data["links"][i]["text"])}</h3><span aria-hidden="true">→</span></a>' for i in [0,2])
    return f'''<!doctype html><html lang="{esc(data['lang'])}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>{esc(data['title'])}</title><link rel="stylesheet" href="../reference/fonts.css"><link rel="stylesheet" href="../corrections.css"><link rel="stylesheet" href="../annex.css"><body class="v42r-page v42r-intl"><header class="intl-top"><a href="index.html">イバトコ <small>IBATOCO</small></a><nav><a href="annex-en.html" lang="en">English</a><a href="annex-ko.html" lang="ko">한국어</a><a href="annex-zh-tw.html" lang="zh-Hant">繁體中文</a></nav></header><main><section class="intl-hero"><div><p class="intl-kicker">{esc(data['paragraphs'][0])}</p><h1>{esc(data['h1'])}</h1><p>{esc(data['paragraphs'][1])}</p><p>{esc(data['paragraphs'][2])}</p></div><figure><img src="../reference/assets/nemophila-photo.webp" alt="Hitachi Seaside Park"><figcaption>Photo: Kakidai / <a href="https://commons.wikimedia.org/wiki/File:2025_Hitachi_Seaside_Park.jpg">Wikimedia Commons</a> / <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a> · cropped</figcaption></figure></section><section class="intl-section"><h2>{esc(data['sections'][0])}</h2><div class="v42r-steps">{cards}</div></section><section class="intl-section"><h2>{esc(data['sections'][4])}</h2><div class="intl-guides">{guides}</div></section></main><footer class="intl-section"><a href="https://ibatoco.jp{esc(data['route'])}">IBATOCO</a> · <a href="../reference/ARTWORK.md">Credits</a></footer></body></html>'''

def reserve_preview(base):
    content=shell('予約について',hero('RESERVATION','予約は、各施設の公式窓口へ。','イバトコでは現在、予約の受付や仲介を行っていません。掲載ページに公式の予約先が確認できた場合のみ、その窓口をご案内します。','map-travelers.webp')+'<section class="v42r-folio"><p class="p41-kicker">BEFORE YOU BOOK</p><h2>なぜ直接予約なのか</h2><p>空席・料金・キャンセル条件など、最新情報を施設から正確に受け取っていただくためです。イバトコが確認できていない連絡先や予約枠を表示することはありません。</p><div class="v42r-actions"><a href="https://ibatoco.jp/place/">場所を探す →</a><a href="https://ibatoco.jp/contact/">掲載情報について問い合わせる →</a></div></section>')
    s=rewrite_assets(base);s=re.sub(r'<main\b[\s\S]*?</main>',lambda _:content,s,count=1)
    s=s.replace('<body','<body class="v42r-page"',1).replace('</head>','<meta name="robots" content="noindex,nofollow"><link rel="stylesheet" href="../corrections.css"></head>')
    return s

def build(reference,output):
    reference=reference.resolve();output=output.resolve()
    if output==reference or reference in output.parents:raise SystemExit('Use a separate output directory; the reference is immutable.')
    if not (reference/'page-manifest42.json').is_file():raise SystemExit('Missing page-manifest42.json in reference folder')
    output.mkdir(parents=True,exist_ok=True);refdest=output/'reference';target=output/'target'
    target.mkdir(exist_ok=True)
    if refdest.resolve()!=reference:shutil.copytree(reference,refdest,dirs_exist_ok=True,ignore=shutil.ignore_patterns('rendered','previews','design-source'))
    mapping=json.loads((ROOT/'MAPPING.json').read_text())
    base=(reference/'spot.html').read_text()
    custom={'shop-list':shop_empty,'shop':shop_template,'author':author_template,'spot':spot_lean,'food-guide':food_guide}
    label_ids={'food-list','about','team','reporters','discover','discover-result','news-list','area-index','area-city','area-city-sparse','theme-pending','sports-club'}
    for row in mapping:
        source=reference/row['file'];s=source.read_text()
        s=re.sub(r'<script\b[^>]*src="[^"]*subpages41\.js"[^>]*>\s*</script>','',s)
        s=re.sub(r'<script\b[^>]*type="application/ld\+json"[^>]*>[\s\S]*?</script>','',s)
        s=rewrite_assets(s)
        if row['id'] in custom:
            replacement=custom[row['id']]()
            s=re.sub(r'<main\b[\s\S]*?</main>',lambda _:replacement,s,count=1)
        elif row['id']=='area-region':
            s=rewrite_assets((reference/'area-index.html').read_text());s=region_panel(s)
        if row.get('current_h1') and row['id'] not in custom:
            s=preserve_h1(s,row['current_h1'],row['id'] in label_ids)
        if row['id']=='home':s=home_additions(s)
        s=re.sub(r'<body([^>]*)>',lambda m:'<body'+m.group(1)+' data-v42r="'+row['id']+'" class="v42r-page'+(' v42r-home' if row['id']=='home' else '')+'">' if 'class=' not in m.group(1) else '<body'+re.sub(r'class="([^"]*)"',lambda c:'class="'+c.group(1)+' v42r-page'+(' v42r-home' if row['id']=='home' else '')+'"',m.group(1))+' data-v42r="'+row['id']+'">',s,count=1)
        s=s.replace('</head>','<meta name="robots" content="noindex,nofollow"><link rel="stylesheet" href="../corrections.css"></head>')
        s=s.replace('</body>','<p class="p41-wrap v42r-caption"><a href="../reference/ARTWORK.md">写真・挿絵・フォントの出典と利用条件</a></p><script src="../interaction.js"></script></body>')
        s=s.replace('山田太郎','入力されたお名前').replace('山田花子','入力されたお名前').replace('taro@example.com','入力されたメールアドレス')
        (target/row['file']).write_text(s)
    extras=[('flowers-empty.html',flower_empty,'いま見頃0件・次の花あり'),('author-empty.html',author_empty,'公開プロフィール0人')]
    for name,fn,label in extras:
        s=rewrite_assets(base);s=re.sub(r'<main\b[\s\S]*?</main>',lambda _:fn(),s,count=1)
        s=s.replace('<body','<body class="v42r-page"',1).replace('</head>','<meta name="robots" content="noindex,nofollow"><link rel="stylesheet" href="../corrections.css"></head>').replace('</body>','<script src="../interaction.js"></script></body>')
        s=re.sub(r'<script\b[^>]*src="[^"]*subpages41\.js"[^>]*>\s*</script>','',s)
        (target/name).write_text(s)
    locale_data=json.loads((ROOT/'LOCALES.json').read_text()) if (ROOT/'LOCALES.json').exists() else []
    for data in locale_data:
        (target/('annex-'+data['route'].strip('/')+'.html')).write_text(locale_preview(data))
    (target/'annex-reserve.html').write_text(reserve_preview(base))
    for f in target.glob('*.html'):
        s=f.read_text()
        s=re.sub(r'href="(policy-(?:editorial|advertising|corrections)\.html)"',r'href="../reference/\1"',s)
        f.write_text(s)
    for name in ['corrections.css','interaction.js','MAPPING.json','annex.css']:
        shutil.copy2(ROOT/name,output/name)
    (output/'index.html').write_text((ROOT/'viewer.html').read_text().replace('__MAPPING_JSON__',json.dumps(mapping,ensure_ascii=False).replace('</script','<\\/script')))
    for name in ['SPEC.md','README.md']:
        if (ROOT/name).exists():shutil.copy2(ROOT/name,output/name)
    print(json.dumps({'output':str(output),'page_types':len(mapping),'additional_states':len(extras)+len(locale_data)+1,'reference_modified':False},ensure_ascii=False))

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--reference',type=Path,required=True);parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args();build(args.reference,args.output)
