"""Apply final UI icons, schematic semantic fixes, preview updates and validation."""
from __future__ import annotations

import json
import re
import urllib.parse
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "redesigned-design" / "design" / "electronic-lab"
PAGES = TARGET / "pages"

UI_ICONS = {
    "brand-logo": {
        "name": "电子课程设计品牌图标",
        "body": '<path d="M3.5 13.5h3.8l2-6.2 3.7 12 2.7-8.4 1.8 4.6h3"/><circle cx="3.5" cy="13.5" r="1.35" fill="currentColor" stroke="none"/><circle cx="20.5" cy="15.5" r="1.35" fill="currentColor" stroke="none"/><path d="M14.5 4.5h3.5l2.5 2.5v3.5"/>',
        "description": "脉冲波形与 PCB 走线端点组合，作为产品品牌符号。",
    },
    "domain-digital": {
        "name": "数电",
        "body": '<path d="M3.5 8h4v8h5V8h5v8h3"/><circle cx="3.5" cy="8" r="1.2" fill="currentColor" stroke="none"/><circle cx="20.5" cy="16" r="1.2" fill="currentColor" stroke="none"/><path d="M6.5 18.5h11"/>',
        "description": "方波边沿与逻辑电平基线。",
    },
    "domain-analog": {
        "name": "模电",
        "body": '<path d="M3.5 14c3 0 3-8 6-8s3 8 6 8 3-8 5-8"/><path d="M3.5 18.5h17"/><path d="M7.5 18.5v2M16.5 18.5v2"/>',
        "description": "连续正弦波与模拟参考基线。",
    },
    "domain-power": {
        "name": "电力电子",
        "body": '<path d="M13 3.5 7.5 13h4l-1.2 7.5L17 10.5h-4z"/><path d="M3.5 12h4M16.5 12h4"/><circle cx="3.5" cy="12" r="1.15" fill="currentColor" stroke="none"/><circle cx="20.5" cy="12" r="1.15" fill="currentColor" stroke="none"/>',
        "description": "能量脉冲与两侧功率端子。",
    },
    "domain-8051": {
        "name": "8051",
        "body": '<rect x="7" y="5" width="10" height="14" rx="2"/><path d="M9.5 5a2.5 2.5 0 0 0 5 0"/><circle cx="9.4" cy="16.8" r="0.85" fill="currentColor" stroke="none"/><path d="M4 8.5h3M4 12h3M4 15.5h3M17 8.5h3M17 12h3M17 15.5h3"/><path d="M10.5 10.5h3M10.5 13.5h3"/>',
        "description": "DIP 缺口、引脚与 1 脚标识。",
    },
    "domain-stm32": {
        "name": "STM32",
        "body": '<rect x="7" y="7" width="10" height="10" rx="1.8"/><circle cx="9.3" cy="14.7" r="0.85" fill="currentColor" stroke="none"/><path d="M9.5 3.5V7M12 3.5V7M14.5 3.5V7M9.5 17v3.5M12 17v3.5M14.5 17v3.5M3.5 9.5H7M3.5 12H7M3.5 14.5H7M17 9.5h3.5M17 12h3.5M17 14.5h3.5"/><path d="M10.5 11.5h3v2h-3z"/>',
        "description": "LQFP 四边引脚、芯片核心与 1 脚标识。",
    },
}

UI_ORDER = ["domain-digital", "domain-analog", "domain-power", "domain-8051", "domain-stm32"]
BRAND_BODY = UI_ICONS["brand-logo"]["body"]


def ui_svg(slug: str) -> str:
    item = UI_ICONS[slug]
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" '
        f'stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" '
        f'role="img" aria-labelledby="title-{slug} desc-{slug}">\n'
        f'  <title id="title-{slug}">{item["name"]}</title>\n'
        f'  <desc id="desc-{slug}">{item["description"]}</desc>\n  {item["body"]}\n</svg>\n'
    )


def ui_svg_inline(slug: str) -> str:
    return (
        f'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" '
        f'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{UI_ICONS[slug]["body"]}</svg>'
    )


def data_uri(slug: str) -> str:
    raw = (
        f"<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' "
        f"stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'>{UI_ICONS[slug]['body']}</svg>"
    )
    return "data:image/svg+xml," + urllib.parse.quote(raw, safe="")


def replace_required(source: str, old: str, new: str, label: str, count: int = 1) -> str:
    found = source.count(old)
    if found < count:
        raise RuntimeError(f"Missing replacement target: {label}; found {found}, expected {count}")
    return source.replace(old, new, count)


def patch_file(path: Path, replacements: list[tuple[str, str, str]]) -> None:
    source = path.read_text(encoding="utf-8")
    for old, new, label in replacements:
        source = replace_required(source, old, new, label)
    path.write_text(source, encoding="utf-8")


def patch_ui_and_semantics() -> dict[str, int]:
    patched = {"brand": 0, "domain_css": 0, "semantic": 0}
    for index, slug in enumerate(UI_ORDER, start=1):
        replacement = f'.domain-tab:nth-child({index}) {{ --domain-icon: url("{data_uri(slug)}"); }}'
        pattern = rf'\.domain-tab:nth-child\({index}\) \{{ --domain-icon: url\("data:image/svg\+xml,[^\"]+"\); \}}'
        for css_path in [TARGET / "colors_and_type.css", *PAGES.glob("*.html")]:
            source = css_path.read_text(encoding="utf-8")
            updated, count = re.subn(pattern, lambda _: replacement, source)
            if count:
                css_path.write_text(updated, encoding="utf-8")
                patched["domain_css"] += count
    for page in PAGES.glob("*.html"):
        source = page.read_text(encoding="utf-8")
        pattern = r'(<span class="brand-mark"[^>]*>\s*<svg\b[^>]*>).*?(</svg>)'
        updated, count = re.subn(pattern, lambda m: m.group(1) + BRAND_BODY + m.group(2), source, count=1, flags=re.S)
        if count:
            page.write_text(updated, encoding="utf-8")
            patched["brand"] += count

    digital = PAGES / "workspace-digital.html"
    patch_file(digital, [
        ('<path class="sch-wire" d="M148 273H196V218H232"></path>', '<path class="sch-wire" d="M148 273H196V275H232"></path>', "digital clock route"),
        ('<circle class="sch-junction" cx="196" cy="218" r="2.6"></circle>', '<circle class="sch-junction" cx="196" cy="275" r="2.6"></circle>', "digital clock junction"),
        ('<path class="sch-wire" d="M438 240H500V310H560"></path>\n        <path class="sch-wire" d="M438 275H500V345H560"></path>\n        <path class="sch-wire" d="M438 310H500V380H560"></path>\n        <path class="sch-wire" d="M438 345H500V415H560"></path>', '<path class="sch-wire" d="M438 240H560"></path>\n        <path class="sch-wire" d="M438 275H560"></path>\n        <path class="sch-wire" d="M438 310H560"></path>\n        <path class="sch-wire" d="M438 345H560"></path>', "QA-QD routes"),
        ('        <circle class="sch-junction" cx="500" cy="310" r="2.6"></circle>\n        <circle class="sch-junction" cx="500" cy="345" r="2.6"></circle>\n        <circle class="sch-junction" cx="500" cy="380" r="2.6"></circle>\n', "", "obsolete route junctions"),
        ('<polyline class="trace-2" points="56,34 328,34 328,14 736,14"></polyline>\n            <polyline class="trace-3" points="56,74 192,74 192,54 464,54 464,74 736,74"></polyline>\n            <polyline class="trace-1" points="56,114 124,114 124,94 260,94 260,114 328,114 328,94 464,94 464,114 532,114 532,94 668,94 668,114 736,114"></polyline>\n            <polyline class="trace-4" points="56,154 90,154 90,134 158,134 158,154 226,154 226,134 294,134 294,154 362,154 362,134 430,134 430,154 498,154 498,134 566,134 566,154 634,154 634,134 736,134"></polyline>', '<polyline class="trace-4" points="56,34 90,34 90,14 158,14 158,34 226,34 226,14 294,14 294,34 362,34 362,14 430,14 430,34 498,34 498,14 566,14 566,34 634,34 634,14 736,14"></polyline>\n            <polyline class="trace-3" points="56,74 192,74 192,54 464,54 464,74 736,74"></polyline>\n            <polyline class="trace-1" points="56,114 124,114 124,94 260,94 260,114 328,114 328,94 464,94 464,114 532,114 532,94 668,94 668,114 736,114"></polyline>\n            <polyline class="trace-2" points="56,154 328,154 328,134 736,134"></polyline>', "digital waveform order"),
        ('.channel-swatch--3 { background: var(--golden-chart-5); }', '.channel-swatch--3 { background: var(--golden-chart-5); }\n.channel-swatch--4 { background: var(--golden-chart-3); }', "channel 4 swatch CSS"),
        ('<div class="channel-row"><span class="channel-swatch channel-swatch--1"></span>QA <span class="channel-value">1 kHz</span></div>\n          <div class="channel-row"><span class="channel-swatch channel-swatch--2"></span>QB <span class="channel-value">500 Hz</span></div>\n          <div class="channel-row"><span class="channel-swatch channel-swatch--3"></span>QC <span class="channel-value">250 Hz</span></div>\n          <div class="channel-row"><span class="channel-swatch channel-swatch--3"></span>QD <span class="channel-value">125 Hz</span></div>', '<div class="channel-row"><span class="channel-swatch channel-swatch--4"></span>QA <span class="channel-value">1 kHz</span></div>\n          <div class="channel-row"><span class="channel-swatch channel-swatch--3"></span>QB <span class="channel-value">500 Hz</span></div>\n          <div class="channel-row"><span class="channel-swatch channel-swatch--1"></span>QC <span class="channel-value">250 Hz</span></div>\n          <div class="channel-row"><span class="channel-swatch channel-swatch--2"></span>QD <span class="channel-value">125 Hz</span></div>', "digital channel swatches"),
    ])
    patched["semantic"] += 7

    ai = PAGES / "ai-netlist.html"
    patch_file(ai, [
        ('<polyline class="trace-2" points="56,34 328,34 328,14 736,14"></polyline>\n            <polyline class="trace-3" points="56,74 192,74 192,54 464,54 464,74 736,74"></polyline>\n            <polyline class="trace-1" points="56,114 124,114 124,94 260,94 260,114 328,114 328,94 464,94 464,114 532,114 532,94 668,94 668,114 736,114"></polyline>\n            <polyline class="trace-4" points="56,154 90,154 90,134 158,134 158,154 226,154 226,134 294,134 294,154 362,154 362,134 430,134 430,154 498,154 498,134 566,134 566,154 634,154 634,134 736,134"></polyline>', '<polyline class="trace-4" points="56,34 90,34 90,14 158,14 158,34 226,34 226,14 294,14 294,34 362,34 362,14 430,14 430,34 498,34 498,14 566,14 566,34 634,34 634,14 736,14"></polyline>\n            <polyline class="trace-3" points="56,74 192,74 192,54 464,54 464,74 736,74"></polyline>\n            <polyline class="trace-1" points="56,114 124,114 124,94 260,94 260,114 328,114 328,94 464,94 464,114 532,114 532,94 668,94 668,114 736,114"></polyline>\n            <polyline class="trace-2" points="56,154 328,154 328,134 736,134"></polyline>', "AI waveform order"),
    ])
    patched["semantic"] += 1

    mcu51 = PAGES / "workspace-mcu51.html"
    patch_file(mcu51, [
        ('<path class="sch-wire sch-wire--power" d="M340 96H670"></path>', '<path class="sch-wire sch-wire--power" d="M340 96H790"></path>', "51 VCC rail"),
        ('<path class="sch-wire" d="M741 202H760M741 220H760M741 238H760M741 256H760M741 274H760M741 292H760M741 310H760M741 328H760"></path>\n        <path class="sch-wire" d="M760 202V328"></path>', '<path class="sch-wire sch-wire--power" d="M741 202H790M741 220H790M741 238H790M741 256H790M741 274H790M741 292H790M741 310H790M741 328H790"></path>\n        <path class="sch-wire sch-wire--power" d="M790 202V96"></path>', "51 common-anode LED rail"),
        ('<path class="sch-wire" d="M420 470V520H380V544"></path>', '<path class="sch-wire" d="M420 470V520H380V544"></path>\n        <path class="sch-wire" d="M420 510H760V520"></path>', "51 MCU ground connection"),
    ])
    patched["semantic"] += 3

    stm32 = PAGES / "workspace-mcu-stm32.html"
    patch_file(stm32, [
        ('<path class="sch-pin" d="M540 130V104H570"></path>\n        <path class="sch-pin" d="M540 490V516H570"></path>', '<path class="sch-pin sch-pin--power" d="M540 130V90H570"></path>\n        <path class="sch-pin" d="M540 490V540H570"></path>', "STM32 power pins"),
        ('<circle class="sch-junction" cx="570" cy="104" r="2.6"></circle>\n        <circle class="sch-junction" cx="570" cy="516" r="2.6"></circle>', '<circle class="sch-junction" cx="570" cy="90" r="2.6"></circle>\n        <circle class="sch-junction" cx="570" cy="540" r="2.6"></circle>', "STM32 power junctions"),
        ('<path class="sch-wire" d="M570 203V520"></path>', '<path class="sch-wire" d="M570 203V540"></path>', "PC13 LED ground"),
        ('<path class="sch-wire" d="M602 364H700V300H736"></path>\n        <path class="sch-wire" d="M602 386H712V330H736"></path>\n        <text x="704" y="358" class="sch-label sch-label--tiny sch-label--muted">PA9</text>\n        <text x="704" y="380" class="sch-label sch-label--tiny sch-label--muted">PA10</text>', '<path class="sch-wire" d="M382 364H330V300H736"></path>\n        <path class="sch-wire" d="M382 386H320V330H736"></path>\n        <text x="690" y="294" class="sch-label sch-label--tiny sch-label--muted">PA9</text>\n        <text x="690" y="324" class="sch-label sch-label--tiny sch-label--muted">PA10</text>', "STM32 UART pins"),
        ('<text x="750" y="356" class="sch-label sch-label--tiny sch-label--muted">GND 已连接</text>', '<text x="750" y="356" class="sch-label sch-label--tiny sch-label--muted">GND 已连接</text>\n        <path class="sch-wire" d="M810 360V540"></path>', "USB-TTL ground"),
        ('<path class="sch-wire" d="M824 428V520H840"></path>', '<path class="sch-wire" d="M824 428V540"></path>', "external LED ground"),
    ])
    patched["semantic"] += 6

    analog = PAGES / "workspace-analog.html"
    patch_file(analog, [
        ('<path class="sch-wire sch-wire--power" d="M120 274V100"></path>', '<path class="sch-wire" d="M120 274V300"></path>', "analog source supply isolation"),
        ('<circle class="sch-junction" cx="120" cy="100" r="2.6"></circle>\n', "", "analog source VCC junction"),
        ('<path class="sch-wire" d="M430 305V330M430 346V520"></path>\n        <path class="sch-wire" d="M420 330H440M420 346H440"></path>', '<path class="sch-wire" d="M430 305V330M430 346V520"></path>\n        <path class="sch-wire" d="M420 330H440M420 346Q430 352 440 346"></path>\n        <path class="sch-wire" d="M448 320V332M444 326H452"></path>', "Ce polarity"),
        ('<rect x="628" y="220" width="24" height="70" rx="3" fill="var(--golden-card)" stroke="var(--golden-chart-2)" stroke-width="1"></rect>', '<use href="#sym-resistor-down" x="628" y="220" width="24" height="70" color="var(--golden-chart-2)"></use>', "RL resistor symbol"),
    ])
    patched["semantic"] += 4

    power = PAGES / "workspace-power.html"
    patch_file(power, [
        ('<use href="#sym-capacitor-down" x="608" y="384" width="24" height="40" color="var(--golden-chart-2)"></use>', '<use href="#sym-capacitor-polarized-down" x="608" y="384" width="24" height="40" color="var(--golden-chart-2)"></use>', "power capacitor polarity"),
    ])
    patched["semantic"] += 1

    hub = PAGES / "project-hub.html"
    patch_file(hub, [
        ('<text x="176" y="112" class="sch-label sch-label--tiny sch-label--muted">Y = A · B</text>', '<text x="168" y="112" class="sch-label sch-label--tiny sch-label--muted">Y = ¬(A · B)</text>', "74LS00 formula"),
    ])
    patched["semantic"] += 1

    for page in PAGES.glob("*.html"):
        source = page.read_text(encoding="utf-8")
        old = ".sch-pin {\n  stroke: var(--golden-chart-2);"
        new = ".sch-pin {\n  fill: none;\n  stroke: var(--golden-chart-2);"
        if old in source:
            page.write_text(source.replace(old, new, 1), encoding="utf-8")
            patched["semantic"] += 1
    return patched


def write_ui_assets() -> None:
    ui_dir = ROOT / "assets" / "current" / "ui"
    ui_dir.mkdir(parents=True, exist_ok=True)
    for slug in ["brand-logo", *UI_ORDER]:
        (ui_dir / f"{slug}.svg").write_text(ui_svg(slug), encoding="utf-8")


def icon_cards() -> str:
    cards = []
    for slug in ["brand-logo", *UI_ORDER]:
        item = UI_ICONS[slug]
        cards.append(
            f'<a class="ui-card" href="../assets/current/ui/{slug}.svg" download>'
            f'<span class="ui-icon">{ui_svg_inline(slug)}</span><b>{item["name"]}</b><small>{slug}.svg</small></a>'
        )
    return "".join(cards)


def write_ui_preview() -> None:
    html = f'''<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>品牌与领域图标预览</title><style>
:root{{--bg:#f5f7fa;--panel:#fff;--text:#172033;--muted:#667085;--border:#dce3ec;--brand:#2563eb}}html[data-theme=dark]{{--bg:#0c1220;--panel:#141d2e;--text:#edf3fc;--muted:#9aaac0;--border:#2b3a50;--brand:#7aa7ff}}*{{box-sizing:border-box}}body{{margin:0;background:var(--bg);color:var(--text);font:14px/1.5 "Microsoft YaHei",system-ui,sans-serif}}main{{width:min(920px,calc(100% - 40px));margin:48px auto}}h1{{margin:0 0 8px;font-size:36px}}p{{color:var(--muted)}}button{{padding:9px 13px;border:1px solid var(--border);border-radius:9px;background:var(--panel);color:var(--text);cursor:pointer}}.grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:14px;margin-top:28px}}.ui-card{{display:block;padding:24px;border:1px solid var(--border);border-radius:18px;background:var(--panel);color:var(--text);text-decoration:none}}.ui-card:hover{{border-color:var(--brand)}}.ui-icon{{display:grid;place-items:center;width:64px;height:64px;margin-bottom:18px;border:1px solid var(--border);border-radius:16px;background:var(--bg);color:var(--brand)}}.ui-icon svg{{width:34px;height:34px}}b{{display:block;font-size:15px}}small{{display:block;margin-top:5px;color:var(--muted);font-family:ui-monospace,monospace}}</style></head><body><main><button id="theme">切换主题</button><h1>品牌与五个领域图标</h1><p>24×24 网格、1.7 描边、圆角端点；保留页面 mask/currentColor 调用方式。</p><div class="grid">{icon_cards()}</div></main><script>document.getElementById('theme').onclick=()=>document.documentElement.dataset.theme=document.documentElement.dataset.theme==='dark'?'light':'dark'</script></body></html>'''
    (ROOT / "preview" / "ui-icons.html").write_text(html, encoding="utf-8")


def update_preview_and_manifest() -> None:
    preview = ROOT / "preview" / "index.html"
    source = preview.read_text(encoding="utf-8")
    if "preview/ui-icons.html" not in source:
        source = source.replace(
            '<section class="integration"><h2>项目替换与文件结构</h2>',
            '<section class="integration"><h2>项目替换与文件结构</h2><p><a href="ui-icons.html">查看品牌与五个领域图标预览</a>；独立文件位于 <code>assets/current/ui/</code>。</p>'
        )
        preview.write_text(source, encoding="utf-8")
    manifest_path = ROOT / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    manifest["ui_icons"] = [
        {"slug": slug, "name": UI_ICONS[slug]["name"], "file": f"assets/current/ui/{slug}.svg"}
        for slug in ["brand-logo", *UI_ORDER]
    ]
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")


def validate_all(patch_report: dict[str, int]) -> None:
    svg_files = list((ROOT / "assets").rglob("*.svg"))
    errors = []
    for path in svg_files:
        try:
            ET.parse(path)
        except ET.ParseError as exc:
            errors.append(f"{path.relative_to(ROOT)}: {exc}")
    if errors:
        raise RuntimeError("; ".join(errors))
    validation = json.loads((ROOT / "validation.json").read_text(encoding="utf-8"))
    validation.update({
        "status": "passed",
        "svg_files_validated": len(svg_files),
        "ui_icons": 6,
        "brand_icons_replaced_in_pages": patch_report["brand"],
        "domain_icon_css_replacements": patch_report["domain_css"],
        "schematic_semantic_fix_groups": patch_report["semantic"],
        "html_pages": len(list(PAGES.glob("*.html"))),
    })
    (ROOT / "validation.json").write_text(json.dumps(validation, ensure_ascii=False, indent=2), encoding="utf-8")


def main() -> None:
    write_ui_assets()
    patch_report = patch_ui_and_semantics()
    write_ui_preview()
    update_preview_and_manifest()
    validate_all(patch_report)
    print(json.dumps({"status": "passed", **patch_report, "svg_files": len(list((ROOT / "assets").rglob("*.svg")))}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
