"""Generate the production SVG assets, preview, manifest and redesigned project pages."""
from __future__ import annotations

import html
import json
import re
import shutil
import sys
import xml.etree.ElementTree as ET
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from catalog import ASSETS, NAME_MAP
from large_schematic import generate_large_assets, large_schematic_entry

ROOT = Path(__file__).resolve().parents[1]
WORKSPACE = ROOT.parent
PROJECT = WORKSPACE / "online-electronic-course-design-simulation"
DESIGN = PROJECT / "design" / "electronic-lab"
BY_SLUG = {a["slug"]: a for a in ASSETS}

INK = "var(--eda-ink,currentColor)"
PACKAGE = "var(--eda-package,#334155)"
PACKAGE_INK = "var(--eda-package-ink,#F8FAFC)"
PCB = "var(--eda-pcb,#DDEBE3)"
PCB_EDGE = "var(--eda-pcb-edge,#3F6F5B)"
PIN = "var(--eda-pin,#CBD5E1)"
METAL = "var(--eda-metal,#D7DEE7)"
SOFT = "var(--eda-soft,#F1F5F9)"
SCREEN = "var(--eda-screen,#172554)"
SCREEN_INK = "var(--eda-screen-ink,#93C5FD)"
ACCENT = "var(--eda-accent,#F59E0B)"
ACCENT_SOFT = "var(--eda-accent-soft,#FEF3C7)"
GREEN = "var(--eda-led-green,#22C55E)"
RED = "var(--eda-led-red,#EF4444)"
BLUE = "var(--eda-led-blue,#3B82F6)"
FONT = "ui-monospace,SFMono-Regular,Consolas,monospace"


def esc(value):
    return html.escape(str(value), quote=True)


def g(gid, content, extra=""):
    return f'<g id="{gid}" {extra}>{content}</g>'


def r(x, y, w, h, fill="none", stroke=INK, sw=2, rx=0, extra=""):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" {extra}/>'


def c(cx, cy, radius, fill="none", stroke=INK, sw=2, extra=""):
    return f'<circle cx="{cx}" cy="{cy}" r="{radius}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" {extra}/>'


def p(d, stroke=INK, sw=2, fill="none", extra=""):
    return f'<path d="{d}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" {extra}/>'


def line(x1, y1, x2, y2, stroke=INK, sw=2, extra=""):
    return f'<path d="M{x1} {y1}H{x2}M{x1} {y1}V{y2}" fill="none" stroke="none"/>' if False else f'<path d="M{x1} {y1}L{x2} {y2}" fill="none" stroke="{stroke}" stroke-width="{sw}" {extra}/>'


def t(x, y, value, size=9, fill=INK, anchor="middle", weight=600, extra=""):
    return f'<text x="{x}" y="{y}" fill="{fill}" stroke="none" font-family="{FONT}" font-size="{size}" font-weight="{weight}" text-anchor="{anchor}" {extra}>{esc(value)}</text>'


def label_block(a, y1=29, y2=40, fill=PACKAGE_INK, size=None):
    label = a["label"]
    size = size or (8 if len(label) >= 8 else 10)
    out = t(48, y1, label, size, fill)
    if a["sub"]:
        out += t(48, y2, a["sub"], 6.5, fill, weight=500, extra='opacity="0.78"')
    return out


def pin_h(x, y, w=9, h=3):
    return r(x, y - h / 2, w, h, PIN, INK, 1.2, 0.8)


def pin_v(x, y, w=3, h=9):
    return r(x - w / 2, y, w, h, PIN, INK, 1.2, 0.8)


def chip_dip(a):
    count = 5 if "40" in a["package"] or "28" in a["package"] or "20" in a["package"] else 4
    if "8" == a["package"].split("-")[-1]:
        count = 3
    ys = [12 + i * (36 / max(1, count - 1)) for i in range(count)]
    pins = "".join(pin_h(17, y) + pin_h(70, y) for y in ys)
    body = r(26, 5, 44, 50, PACKAGE, INK, 2, 4)
    body += p("M40 5Q48 14 56 5", PACKAGE_INK, 1.5, extra='opacity="0.8"')
    body += c(33, 47, 2.2, ACCENT, "none", 0)
    return g("pins", pins) + g("package", body) + g("markings", label_block(a))


def chip_dip14_schematic(a):
    """Full DIP-14 schematic symbol; pin order and names follow the 74LS32 datasheet."""
    body = p(
        "M58 30H82C82 44 98 44 98 30H122Q130 30 130 38V216Q130 224 122 224H58Q50 224 50 216V38Q50 30 58 30Z",
        INK,
        1.6,
        "var(--eda-symbol-body,#FFFFFF)",
    )
    markings = t(14, 18, "U1", 10, INK, "start", 700)
    markings += t(166, 18, "DIP-14", 6.5, "var(--eda-muted,#94A3B8)", "end", 600)
    markings += t(90, 55, a["label"], 11, INK, weight=700)
    markings += t(90, 65, a["sub"], 4.8, "var(--eda-muted,#64748B)", weight=500, extra='letter-spacing="0.35"')
    left = [("1", "1A", "input"), ("2", "1B", "input"), ("3", "1Y", "output"), ("4", "2A", "input"), ("5", "2B", "input"), ("6", "2Y", "output"), ("7", "GND", "power")]
    right = [("14", "VCC", "power"), ("13", "4B", "input"), ("12", "4A", "input"), ("11", "4Y", "output"), ("10", "3B", "input"), ("9", "3A", "input"), ("8", "3Y", "output")]
    pins = []
    for side, entries in (("left", left), ("right", right)):
        for index, (number, name, direction) in enumerate(entries):
            y = 72 + index * 23
            active = direction in ("output", "power")
            endpoint_fill = ACCENT if active else "var(--eda-symbol-body,#FFFFFF)"
            endpoint_stroke = ACCENT if active else "var(--eda-pin-line,#94A3B8)"
            lead = line(14, y, 50, y, "var(--eda-pin-line,#94A3B8)", 1.25) if side == "left" else line(130, y, 166, y, "var(--eda-pin-line,#94A3B8)", 1.25)
            endpoint = c(14 if side == "left" else 166, y, 3.2, endpoint_fill, endpoint_stroke, 1.1)
            number_text = t(42 if side == "left" else 138, y - 5, number, 5.8, "var(--eda-muted,#94A3B8)", "end" if side == "left" else "start", 500)
            name_text = t(57 if side == "left" else 123, y + 3, name, 7.5, INK, "start" if side == "left" else "end", 700 if direction == "power" else 600)
            content = lead + endpoint + number_text + name_text
            pins.append(g(f"pin-{number}", content, f'data-pin="{number}" data-name="{name}" data-direction="{direction}" data-side="{side}"'))
    return g("package", body) + g("reference-and-markings", markings) + g("pins", "\n    ".join(pins))


def chip_qfp(a):
    pins = ""
    for y in (14, 24, 34, 44):
        pins += pin_h(16, y) + pin_h(71, y)
    for x in (32, 43, 53, 64):
        pins += pin_v(x, 0, h=7) + pin_v(x, 53, h=7)
    body = r(25, 7, 46, 46, PACKAGE, INK, 2, 3)
    body += c(32, 45, 2.2, ACCENT, "none", 0)
    return g("pins", pins) + g("package", body) + g("markings", label_block(a, 28, 38))


def chip_soic(a):
    pins = "".join(pin_h(10, y) + pin_h(77, y) for y in (20, 27, 34, 41))
    body = r(19, 13, 58, 34, PACKAGE, INK, 2, 4)
    body += p("M43 13Q48 19 53 13", PACKAGE_INK, 1.4, extra='opacity="0.8"')
    body += c(26, 41, 2, ACCENT, "none", 0)
    return g("pins", pins) + g("package", body) + g("markings", label_block(a, 30, 39, size=8.5))


def chip_qfn(a):
    pins = ""
    for y in (17, 30, 43):
        pins += pin_h(20, y, 8, 3) + pin_h(68, y, 8, 3)
    for x in (36, 48, 60):
        pins += pin_v(x, 2, h=8) + pin_v(x, 50, h=8)
    body = r(28, 10, 40, 40, PACKAGE, INK, 2, 3) + c(35, 42, 2, ACCENT, "none", 0)
    return g("pads", pins) + g("package", body) + g("markings", label_block(a, 29, 38, size=7.5))


def gate(a, bubble=False, xor=False):
    kind = a["kind"]
    if kind in ("and", "nand"):
        shape = p("M30 12H44C58 12 67 19 67 30S58 48 44 48H30Z", INK, 2.2, SOFT)
        end = 67
    else:
        shape = p("M30 11Q43 30 30 49Q54 49 68 30Q54 11 30 11Z", INK, 2.2, SOFT)
        if xor:
            shape = p("M23 11Q36 30 23 49", INK, 2.2) + shape
        end = 68
    leads = line(7, 21, 30, 21) + line(7, 39, 30, 39)
    if bubble:
        shape += c(73, 30, 4, SOFT, INK, 2.2)
        leads += line(77, 30, 89, 30)
    else:
        leads += line(end, 30, 89, 30)
    return g("terminals", leads) + g("logic-symbol", shape) + g("pin-markers", c(7, 21, 1.6, INK, "none", 0) + c(7, 39, 1.6, INK, "none", 0))


def mounting_hole(x, y):
    return c(x, y, 2.6, METAL, PCB_EDGE, 1.2) + c(x, y, 1.1, SOFT, "none", 0)


def development_board(a):
    pins = ""
    for y in (13, 20, 27, 34, 41, 48):
        pins += r(22, y - 1.7, 5, 3.4, PIN, PCB_EDGE, 0.8, 0.5)
        pins += r(69, y - 1.7, 5, 3.4, PIN, PCB_EDGE, 0.8, 0.5)
    board = r(18, 3, 60, 54, PCB, PCB_EDGE, 2, 4)
    board += mounting_hole(23, 8) + mounting_hole(73, 8)
    board += r(39, 0, 18, 9, METAL, INK, 1.5, 2)
    board += r(42, 2, 12, 4, SOFT, INK, 1, 1)
    chip = r(34, 17, 28, 24, PACKAGE, INK, 1.6, 2) + c(38, 36, 1.4, ACCENT, "none", 0)
    chip += t(48, 28, a["label"], 6.5 if len(a["label"]) > 6 else 8, PACKAGE_INK)
    chip += t(48, 36, a["sub"], 5.5, PACKAGE_INK, weight=500)
    controls = r(38, 45, 20, 7, SOFT, PCB_EDGE, 1.2, 2) + t(48, 50.5, "RESET", 4.5, PCB_EDGE)
    return g("headers", pins) + g("pcb", board) + g("microcontroller", chip) + g("controls", controls)


def arduino_board(a):
    board = r(7, 9, 82, 43, PCB, PCB_EDGE, 2, 5) + mounting_hole(12, 45) + mounting_hole(83, 45)
    connectors = r(4, 18, 18, 20, METAL, INK, 1.5, 2) + r(7, 21, 12, 14, SOFT, INK, 1, 1)
    connectors += r(13, 5, 18, 10, PACKAGE, INK, 1.5, 2) + c(22, 10, 3, SOFT, "none", 0)
    headers = "".join(r(39 + i * 5, 6, 3, 7, PACKAGE, INK, 0.7, 0.4) for i in range(8))
    headers += "".join(r(39 + i * 5, 47, 3, 7, PACKAGE, INK, 0.7, 0.4) for i in range(8))
    chip = r(37, 24, 32, 14, PACKAGE, INK, 1.5, 2) + t(53, 33, "ATmega328P", 6.5, PACKAGE_INK)
    return g("pcb", board) + g("connectors", connectors) + g("headers", headers) + g("microcontroller", chip)


def module_base(a, header=4):
    body = r(14, 6, 68, 48, PCB, PCB_EDGE, 2, 4)
    body += mounting_hole(19, 49) + mounting_hole(77, 49)
    pins = "".join(pin_v(36 + i * 8, 1, h=9) for i in range(header))
    return body, pins


def lcd(a):
    board = r(3, 10, 90, 40, PCB, PCB_EDGE, 2, 4) + mounting_hole(8, 15) + mounting_hole(88, 45)
    screen = r(14, 15, 65, 29, SCREEN, INK, 1.5, 3)
    for row in (23, 33):
        screen += "".join(r(20 + i * 6.5, row - 3, 4, 5, SCREEN_INK, "none", 0, 0.5, 'opacity="0.82"') for i in range(8))
    pins = "".join(pin_v(20 + i * 5, 45, h=9) for i in range(12))
    return g("pcb", board) + g("display", screen) + g("header", pins)


def oled(a):
    board = r(24, 4, 48, 52, PCB, PCB_EDGE, 2, 4) + mounting_hole(29, 49) + mounting_hole(67, 49)
    screen = r(29, 13, 38, 29, SCREEN, INK, 1.5, 2)
    screen += p("M35 32L41 24L47 29L53 20L61 25", SCREEN_INK, 1.5)
    screen += t(48, 38, "128×64", 5.5, SCREEN_INK, weight=500)
    pins = "".join(pin_v(36 + i * 8, 0, h=9) for i in range(4))
    labels = t(48, 48, "GND VCC SCL SDA", 4.2, PCB_EDGE, weight=500)
    return g("pcb", board) + g("display", screen) + g("header", pins) + g("markings", labels)


def seven_segment(a, digits=1):
    if digits == 1:
        body = r(28, 2, 40, 56, PACKAGE, INK, 2, 5) + r(33, 7, 30, 46, SCREEN, "none", 0, 3)
        segs = ""
        on = {0, 1, 3, 4, 6}
        coords = [(41, 13, 55, 13), (57, 16, 57, 27), (57, 33, 57, 44), (41, 47, 55, 47), (39, 33, 39, 44), (39, 16, 39, 27), (41, 30, 55, 30)]
        for i, (x1, y1, x2, y2) in enumerate(coords):
            segs += line(x1, y1, x2, y2, ACCENT if i in on else "var(--eda-segment-off,#475569)", 3.4, extra=f'opacity="{1 if i in on else 0.45}"')
        segs += c(60, 46, 2, ACCENT, "none", 0)
        return g("package", body) + g("segments", segs)
    body = r(3, 12, 90, 36, PACKAGE, INK, 2, 4) + r(7, 16, 82, 28, SCREEN, "none", 0, 2)
    segs = ""
    for d in range(4):
        ox = 12 + d * 20
        coords = [(ox + 3, 20, ox + 12, 20), (ox + 14, 22, ox + 14, 28), (ox + 14, 32, ox + 14, 38), (ox + 3, 40, ox + 12, 40), (ox + 1, 32, ox + 1, 38), (ox + 1, 22, ox + 1, 28), (ox + 3, 30, ox + 12, 30)]
        for i, (x1, y1, x2, y2) in enumerate(coords):
            lit = (i + d) % 3 != 0
            segs += line(x1, y1, x2, y2, ACCENT if lit else "var(--eda-segment-off,#475569)", 2.2, extra=f'opacity="{1 if lit else 0.4}"')
        segs += c(ox + 17, 39, 1.3, ACCENT, "none", 0)
    return g("package", body) + g("segments", segs)


def led_icon(a, rgb=False):
    halo = c(48, 24, 23, ACCENT_SOFT if not rgb else SOFT, "none", 0, 'opacity="0.65"')
    dome = p("M34 28V20C34 10 40 4 48 4S62 10 62 20V28Z", INK, 2, RED if not rgb else SOFT)
    dome += r(32, 28, 32, 6, SOFT, INK, 1.8, 2)
    dome += p("M40 28V23H56V28", INK, 1.3)
    leads = line(41, 34, 41, 56) + line(55, 34, 55, 56)
    if rgb:
        leads = line(36, 34, 36, 56) + line(45, 34, 45, 56) + line(54, 34, 54, 56) + line(62, 34, 62, 56)
        dome += c(42, 18, 3, RED, "none", 0) + c(49, 18, 3, GREEN, "none", 0) + c(56, 18, 3, BLUE, "none", 0)
    else:
        dome += p("M43 21L48 16L53 21", PACKAGE_INK, 1.4)
    return g("halo", halo) + g("package", dome) + g("leads", leads)


def tactile_button(a):
    leads = line(27, 20, 17, 20) + line(27, 40, 17, 40) + line(69, 20, 79, 20) + line(69, 40, 79, 40)
    body = r(27, 10, 42, 40, SOFT, INK, 2, 5) + r(32, 15, 32, 30, METAL, INK, 1.2, 3)
    body += c(48, 30, 11, PACKAGE, INK, 1.8) + c(48, 30, 6, "var(--eda-button,#64748B)", "none", 0)
    return g("leads", leads) + g("package", body)


def keypad(a):
    body = r(17, 2, 62, 56, PCB, PCB_EDGE, 2, 4)
    keys = ""
    for row in range(4):
        for col in range(4):
            x, y = 22 + col * 14, 7 + row * 12
            keys += r(x, y, 11, 9, SOFT, INK, 1, 1.5)
            keys += t(x + 5.5, y + 6.5, str(row * 4 + col + 1) if row < 3 else "ABCD"[col], 4.8, INK, weight=500)
    return g("pcb", body) + g("keys", keys)


def potentiometer(a):
    pins = line(35, 42, 35, 56) + line(48, 44, 48, 58) + line(61, 42, 61, 56)
    body = c(48, 27, 22, METAL, INK, 2) + c(48, 27, 14, SOFT, INK, 1.5)
    body += line(48, 27, 58, 16, ACCENT, 3) + c(48, 27, 3, PACKAGE, "none", 0)
    body += p("M29 18A22 22 0 0 1 67 18", ACCENT, 1.4)
    return g("pins", pins) + g("package", body)


def usb_ttl(a):
    board = r(18, 8, 68, 44, PCB, PCB_EDGE, 2, 4) + mounting_hole(78, 44)
    usb = r(4, 17, 22, 26, METAL, INK, 1.8, 2) + r(7, 21, 15, 18, SOFT, INK, 1.2, 1)
    chip = r(35, 18, 25, 24, PACKAGE, INK, 1.5, 2) + t(47.5, 29, "CH340", 6.5, PACKAGE_INK) + t(47.5, 36, "UART", 5, PACKAGE_INK)
    headers = "".join(r(68, 14 + i * 8, 12, 4, PIN, INK, 0.9, 0.5) for i in range(4))
    labels = t(47, 48, "USB  →  TX RX", 5.5, PCB_EDGE)
    return g("pcb", board) + g("usb-connector", usb) + g("bridge-chip", chip) + g("uart-header", headers) + g("markings", labels)


def instrument(a, mode):
    body = r(4, 7, 88, 46, SOFT, INK, 2, 5)
    screen = r(10, 13, 54, 31, SCREEN, INK, 1.3, 2)
    if mode == "terminal":
        screen += t(15, 22, "> TX 010101", 6, SCREEN_INK, "start", 500)
        screen += t(15, 31, "> RX 9600", 6, SCREEN_INK, "start", 500)
        screen += line(15, 37, 48, 37, SCREEN_INK, 1)
    else:
        screen += p("M14 29H20V20H28V36H36V20H44V29H58", ACCENT if mode == "analyzer" else SCREEN_INK, 1.8)
        screen += p("M14 34H58", "var(--eda-screen-grid,#475569)", 0.8, extra='stroke-dasharray="2 3"')
    controls = c(76, 20, 5, METAL, INK, 1.4) + c(76, 36, 5, METAL, INK, 1.4)
    controls += line(76, 20, 79, 17, INK, 1.2) + line(76, 36, 73, 33, INK, 1.2)
    controls += t(75, 49, "CH1  CH2" if mode == "oscilloscope" else "8 CH", 4.8, INK)
    return g("enclosure", body) + g("display", screen) + g("controls", controls)


def signal_source(a, square=False):
    body = c(43, 30, 23, SOFT, INK, 2)
    wave = p("M27 30C33 13 39 13 45 30S57 47 61 30", ACCENT, 2.3) if not square else p("M26 35V23H37V35H48V23H60V35", ACCENT, 2.3)
    terminals = line(66, 30, 89, 30) + line(7, 30, 20, 30) + c(7, 30, 2, SOFT, INK, 1.5) + c(89, 30, 2, SOFT, INK, 1.5)
    return g("enclosure", body) + g("waveform", wave) + g("terminals", terminals)


def pwm_driver(a):
    board, pins = module_base(a, 3)
    chip = r(29, 18, 30, 25, PACKAGE, INK, 1.5, 2) + p("M34 34V25H41V34H48V25H54", ACCENT, 1.5)
    terminal = r(64, 17, 13, 27, "var(--eda-terminal,#60A5FA)", INK, 1.3, 2)
    terminal += "".join(c(70.5, 22 + i * 8, 2.2, METAL, INK, 0.8) for i in range(3))
    return g("pcb", board) + g("input-header", pins) + g("driver", chip) + g("output-terminal", terminal)


def buzzer(a):
    body = p("M27 30V42H69V30", INK, 2, SOFT) + p("M27 30A21 21 0 0 1 69 30Z", INK, 2, PACKAGE)
    body += c(48, 17, 4, SCREEN, PACKAGE_INK, 1.2) + t(48, 34, "+", 10, PACKAGE_INK)
    pins = line(38, 42, 38, 56) + line(58, 42, 58, 56)
    waves = p("M73 15Q82 22 73 29M77 10Q91 22 77 34", ACCENT, 1.8)
    return g("package", body) + g("pins", pins) + g("sound-waves", waves)


def servo(a):
    body = r(21, 16, 51, 34, "var(--eda-servo,#60A5FA)", INK, 2, 4)
    body += r(13, 21, 67, 8, "var(--eda-servo,#60A5FA)", INK, 1.5, 2)
    body += c(37, 16, 9, METAL, INK, 1.5) + line(37, 16, 56, 6, METAL, 6) + c(58, 5, 3, SOFT, INK, 1)
    body += t(49, 42, "SG90", 8, PACKAGE_INK)
    wires = p("M72 38H84V48", RED, 2) + p("M72 42H88V52", "var(--eda-wire-brown,#92400E)", 2) + p("M72 46H80V56", ACCENT, 2)
    return g("case-and-horn", body) + g("wires", wires)


def stepper(a):
    body = c(41, 29, 21, METAL, INK, 2) + c(41, 29, 13, SOFT, INK, 1.5) + c(41, 29, 4, PACKAGE, INK, 1.2)
    body += p("M24 15L17 10V22M58 15L65 10V22M24 43L17 48V36M58 43L65 48V36", INK, 2, SOFT)
    body += p("M36 22L41 18L46 22L41 26Z", ACCENT, 1.3, ACCENT)
    connector = r(70, 17, 16, 26, SOFT, INK, 1.5, 2)
    connector += "".join(line(74, 14, 74, 18, RED if i == 0 else INK, 1.3) for i in range(1))
    connector += "".join(c(75 + (i % 2) * 6, 22 + (i // 2) * 8, 1.6, PIN, INK, 0.6) for i in range(5))
    return g("motor", body) + g("connector", connector)


def to92(a):
    body = p("M29 42V26C29 13 37 5 48 5S67 13 67 26V42Z", INK, 2, PACKAGE)
    body += line(29, 42, 67, 42, PACKAGE_INK, 1.2)
    pins = line(37, 42, 37, 57) + line(48, 42, 48, 57) + line(59, 42, 59, 57)
    labels = t(48, 28, a["label"], 7.5, PACKAGE_INK) + t(48, 36, a["sub"], 5.5, PACKAGE_INK)
    labels += t(37, 59, "E", 4.5, INK) + t(48, 59, "B", 4.5, INK) + t(59, 59, "C", 4.5, INK)
    return g("package", body) + g("pins", pins) + g("markings", labels)


def to220(a, wide=False):
    x, w = (25, 46) if wide else (30, 36)
    body = r(x, 16, w, 31, PACKAGE, INK, 2, 2)
    tab = r(x, 5, w, 13, METAL, INK, 1.8, 2) + c(48, 11, 3.5, SOFT, INK, 1.2)
    pinxs = (34, 48, 62) if wide else (37, 48, 59)
    pins = "".join(line(px, 47, px, 59) for px in pinxs)
    labels = t(48, 29, a["label"], 7 if len(a["label"]) > 6 else 8.5, PACKAGE_INK) + t(48, 38, a["sub"], 5.5, PACKAGE_INK)
    return g("thermal-tab", tab) + g("package", body) + g("pins", pins) + g("markings", labels)


def resistor(a):
    leads = line(3, 30, 22, 30) + line(74, 30, 93, 30)
    body = r(22, 21, 52, 18, "var(--eda-resistor,#E7D7B6)", INK, 2, 7)
    bands = "".join(r(x, 22, width, 16, color, "none", 0, 0.5) for x, width, color in [(32, 4, "#92400E"), (41, 4, "#1F2937"), (50, 4, RED), (64, 3, "#D4A72C")])
    return g("leads", leads) + g("body", body) + g("resistance-bands", bands)


def capacitor(a):
    leads = line(39, 34, 35, 57) + line(57, 34, 61, 57)
    body = p("M30 34V21C30 12 38 7 48 7S66 12 66 21V34Z", INK, 2, "var(--eda-capacitor,#60A5FA)")
    body += t(48, 27, "104", 10, PACKAGE_INK)
    return g("leads", leads) + g("package", body)


def electrolytic(a):
    leads = line(40, 43, 40, 58) + line(57, 43, 57, 58)
    body = r(30, 8, 37, 37, PACKAGE, INK, 2, 5) + p("M30 13A18.5 6 0 0 1 67 13", PACKAGE_INK, 1.2)
    body += r(57, 9, 9, 35, "var(--eda-cap-stripe,#94A3B8)", "none", 0, 1) + t(36, 27, "+", 11, PACKAGE_INK)
    body += t(46, 38, "470µF", 6.5, PACKAGE_INK)
    return g("leads", leads) + g("package", body)


def inductor(a):
    pads = r(13, 22, 16, 16, METAL, INK, 1.4, 2) + r(67, 22, 16, 16, METAL, INK, 1.4, 2)
    body = r(24, 12, 48, 36, PACKAGE, INK, 2, 6) + r(30, 18, 36, 24, "var(--eda-inductor,#475569)", PACKAGE_INK, 1, 3)
    body += t(48, 35, "221", 12, PACKAGE_INK)
    return g("solder-pads", pads) + g("shielded-body", body)


def diode(a, smd=False):
    if smd:
        pads = r(7, 21, 20, 18, METAL, INK, 1.5, 2) + r(69, 21, 20, 18, METAL, INK, 1.5, 2)
        body = r(24, 17, 48, 26, PACKAGE, INK, 2, 4) + r(57, 18, 6, 24, PACKAGE_INK, "none", 0, 1)
        body += t(43, 33, "SS34", 8, PACKAGE_INK)
        return g("pads", pads) + g("package", body) + g("cathode-band", "")
    leads = line(3, 30, 27, 30) + line(69, 30, 93, 30)
    body = r(27, 20, 42, 20, "var(--eda-diode,#D6B98C)", INK, 2, 8) + r(56, 21, 5, 18, PACKAGE, "none", 0, 1)
    body += t(45, 33, "4148", 6.5, INK)
    return g("leads", leads) + g("package", body) + g("cathode-band", "")


def rocker(a):
    pins = line(35, 46, 35, 57) + line(61, 46, 61, 57)
    body = r(22, 8, 52, 40, PACKAGE, INK, 2, 5) + r(30, 13, 36, 29, SOFT, INK, 1.5, 3)
    body += p("M35 35L39 18H61L57 35Z", INK, 1.5, "var(--eda-rocker,#64748B)")
    body += t(48, 24, "I", 8, PACKAGE_INK) + t(48, 38, "O", 7, INK)
    return g("pins", pins) + g("switch", body)


def generic_module_chip(a):
    board, pins = module_base(a, 4)
    chip = r(29, 17, 38, 27, PACKAGE, INK, 1.5, 3) + c(34, 39, 1.5, ACCENT, "none", 0)
    chip += t(48, 29, a["label"], 7.5, PACKAGE_INK) + t(48, 37, a["sub"], 5.5, PACKAGE_INK)
    return g("pcb", board) + g("header", pins) + g("chip", chip)


def rtc_module(a):
    board, pins = module_base(a, 5)
    chip = r(20, 19, 29, 20, PACKAGE, INK, 1.4, 2) + t(34.5, 31, "DS3231", 6, PACKAGE_INK)
    battery = c(64, 29, 13, METAL, INK, 1.5) + c(64, 29, 9, SOFT, INK, 1) + t(64, 32, "+", 8, INK)
    return g("pcb", board) + g("header", pins) + g("rtc-chip", chip) + g("backup-battery", battery)


def sot223(a):
    tab = r(37, 5, 22, 11, METAL, INK, 1.4, 2)
    body = r(27, 15, 42, 29, PACKAGE, INK, 2, 3)
    pins = "".join(line(x, 44, x, 58) for x in (34, 48, 62))
    labels = t(48, 29, a["label"], 9, PACKAGE_INK) + t(48, 37, a["sub"], 6, PACKAGE_INK)
    return g("tab", tab) + g("package", body) + g("pins", pins) + g("markings", labels)


def power_module(a):
    board = r(5, 10, 86, 42, PCB, PCB_EDGE, 2, 4) + mounting_hole(10, 15) + mounting_hole(86, 47)
    inductor_body = r(39, 16, 22, 22, PACKAGE, INK, 1.4, 3) + t(50, 30, "220", 8, PACKAGE_INK)
    chip = r(17, 19, 18, 17, PACKAGE, INK, 1.3, 2) + t(26, 29, "DC", 6, PACKAGE_INK)
    terminals = r(69, 15, 15, 27, "var(--eda-terminal,#60A5FA)", INK, 1.3, 2) + c(76.5, 23, 2.4, METAL, INK, 0.8) + c(76.5, 34, 2.4, METAL, INK, 0.8)
    labels = t(49, 47, a["label"] + " · " + a["sub"], 5.5, PCB_EDGE)
    return g("pcb", board) + g("inductor", inductor_body) + g("controller", chip) + g("terminals", terminals) + g("markings", labels)


def battery(a):
    body = r(29, 5, 38, 50, "var(--eda-battery,#60A5FA)", INK, 2, 8) + r(41, 1, 14, 5, METAL, INK, 1.2, 1)
    body += p("M30 45H66", PACKAGE_INK, 1.2) + t(48, 26, "+", 13, PACKAGE_INK) + t(48, 40, "3.7 V", 8, PACKAGE_INK)
    return g("cell", body)


def crystal(a):
    pins = line(39, 40, 39, 58) + line(57, 40, 57, 58)
    body = r(27, 8, 42, 33, METAL, INK, 2, 14) + line(32, 35, 64, 35, "var(--eda-metal-edge,#94A3B8)", 1)
    body += t(48, 27, "16.000", 8, INK) + t(48, 34, "MHz", 5, INK)
    return g("pins", pins) + g("can", body)


def transformer(a):
    core = r(24, 8, 48, 44, "var(--eda-core,#94A3B8)", INK, 2, 3) + r(34, 15, 28, 30, SOFT, INK, 1.5, 2)
    coils = p("M34 20C45 13 45 27 34 20C45 27 45 41 34 34C45 27 45 41 34 34", "var(--eda-copper,#B45309)", 3)
    coils += p("M62 20C51 13 51 27 62 20C51 27 51 41 62 34C51 27 51 41 62 34", "var(--eda-copper,#B45309)", 3)
    pins = line(31, 52, 31, 59) + line(65, 52, 65, 59)
    return g("core", core) + g("windings", coils) + g("pins", pins)


def sensor_module(a, mode):
    board, pins = module_base(a, 4)
    detail = ""
    if mode == "axis":
        detail = r(31, 17, 34, 28, PACKAGE, INK, 1.5, 3) + t(48, 29, "MPU", 8, PACKAGE_INK)
        detail += line(48, 30, 48, 18, RED, 1.5) + line(48, 30, 60, 30, GREEN, 1.5) + line(48, 30, 40, 38, BLUE, 1.5)
    elif mode == "metal":
        detail = r(32, 17, 32, 25, METAL, INK, 1.5, 3) + c(48, 25, 4, SOFT, INK, 1)
        detail += t(48, 39, "BME280", 5.5, INK)
    elif mode == "light":
        detail = r(29, 17, 38, 27, PACKAGE, INK, 1.5, 3) + c(48, 28, 8, SOFT, PACKAGE_INK, 1.2)
        detail += p("M48 16V12M48 44V40M36 28H32M64 28H60M39 19L36 16M57 19L60 16", ACCENT, 1.5)
    elif mode == "dht11":
        board = r(26, 3, 44, 54, "var(--eda-sensor-blue,#60A5FA)", INK, 2, 4)
        detail = "".join(r(33 + col * 8, 12 + row * 7, 5, 4, SCREEN, "none", 0, 0.7) for row in range(4) for col in range(4))
        detail += t(48, 48, "DHT11", 7, PACKAGE_INK)
        pins = line(37, 57, 37, 60) + line(48, 57, 48, 60) + line(59, 57, 59, 60)
    return g("pcb", board) + g("header-or-pins", pins) + g("sensing-element", detail)


def ultrasonic(a):
    board = r(4, 12, 88, 38, PCB, PCB_EDGE, 2, 4) + mounting_hole(9, 17) + mounting_hole(87, 45)
    transducers = c(29, 29, 15, METAL, INK, 1.8) + c(29, 29, 11, SOFT, INK, 1.1) + c(67, 29, 15, METAL, INK, 1.8) + c(67, 29, 11, SOFT, INK, 1.1)
    transducers += t(29, 32, "T", 8, INK) + t(67, 32, "R", 8, INK)
    pins = "".join(pin_v(39 + i * 6, 45, h=9) for i in range(4))
    return g("pcb", board) + g("transducers", transducers) + g("header", pins)


def pir(a):
    board = r(17, 7, 62, 48, PCB, PCB_EDGE, 2, 4) + mounting_hole(22, 50) + mounting_hole(74, 50)
    dome = p("M28 37C28 17 36 6 48 6S68 17 68 37Z", INK, 2, "var(--eda-fresnel,#F8FAFC)")
    dome += p("M34 31H62M38 22H58M48 9V36M36 16L60 33M60 16L36 33", "var(--eda-fresnel-line,#CBD5E1)", 1)
    controls = c(28, 45, 4, ACCENT, INK, 1) + c(68, 45, 4, ACCENT, INK, 1)
    return g("pcb", board) + g("fresnel-lens", dome) + g("controls", controls)


def ir_receiver(a):
    body = p("M30 43V25C30 12 38 5 48 5S66 12 66 25V43Z", INK, 2, PACKAGE)
    body += p("M38 27C38 17 43 13 48 13S58 17 58 27Z", PACKAGE_INK, 1.2, "var(--eda-ir-lens,#1E293B)")
    pins = line(37, 43, 37, 58) + line(48, 43, 48, 58) + line(59, 43, 59, 58)
    return g("package", body) + g("pins", pins)


def ldr(a):
    leads = line(39, 39, 34, 58) + line(57, 39, 62, 58)
    body = c(48, 25, 21, "var(--eda-ldr,#D6B98C)", INK, 2)
    body += p("M33 17H43L37 25H47L41 33H53L47 17H57L51 25H63", "var(--eda-ldr-trace,#78350F)", 2)
    rays = p("M73 7L66 14M82 15L73 20M71 1L68 9", ACCENT, 2)
    return g("leads", leads) + g("package", body) + g("light", rays)


def reed(a):
    leads = line(3, 30, 25, 30) + line(71, 30, 93, 30)
    glass = r(24, 20, 48, 20, "var(--eda-glass,#E0F2FE)", INK, 1.8, 10)
    contacts = line(25, 30, 50, 30, "var(--eda-reed,#64748B)", 2.5) + line(71, 30, 48, 24, "var(--eda-reed,#64748B)", 2.5)
    return g("leads", leads) + g("glass", glass) + g("contacts", contacts)


def microphone(a):
    board, pins = module_base(a, 4)
    mic = c(48, 27, 16, METAL, INK, 1.8) + c(48, 27, 12, PACKAGE, INK, 1.2)
    mic += "".join(c(43 + (i % 3) * 5, 22 + (i // 3) * 5, 1, SOFT, "none", 0) for i in range(9))
    return g("pcb", board) + g("header", pins) + g("microphone", mic)


def sd_module(a):
    board, pins = module_base(a, 6)
    slot = r(27, 15, 42, 31, METAL, INK, 1.6, 3) + p("M32 15V11H62L69 18", INK, 1.4, METAL)
    slot += t(48, 33, "micro SD", 7, INK) + line(34, 40, 62, 40, INK, 1)
    return g("pcb", board) + g("header", pins) + g("card-slot", slot)


def tft(a):
    board = r(12, 3, 72, 54, PCB, PCB_EDGE, 2, 4) + mounting_hole(17, 50) + mounting_hole(79, 50)
    screen = r(20, 8, 56, 39, SCREEN, INK, 1.5, 2)
    screen += p("M20 37L35 23L46 32L57 18L76 37V47H20Z", "none", 0, "var(--eda-image,#3B82F6)")
    screen += c(62, 18, 5, ACCENT, "none", 0)
    pins = "".join(pin_v(31 + i * 6, 50, h=9) for i in range(7))
    return g("pcb", board) + g("display", screen) + g("header", pins)


def matrix(a):
    body = r(15, 3, 66, 54, PACKAGE, INK, 2, 4)
    dots = "".join(c(24 + col * 7, 11 + row * 6, 2.1, ACCENT if (row + col) % 3 else "var(--eda-matrix-off,#64748B)", "none", 0) for row in range(8) for col in range(8))
    return g("package", body) + g("pixels", dots)


def ws2812(a):
    pads = "".join(r(x, y, 10, 6, METAL, INK, 0.8, 1) for x, y in [(14, 12), (72, 12), (14, 42), (72, 42)])
    body = r(23, 7, 50, 46, "var(--eda-ws-body,#E2E8F0)", INK, 2, 4) + r(31, 15, 34, 30, PACKAGE, INK, 1.4, 5)
    body += c(41, 30, 6, RED, "none", 0, 'opacity="0.85"') + c(50, 30, 6, GREEN, "none", 0, 'opacity="0.85"') + c(59, 30, 6, BLUE, "none", 0, 'opacity="0.85"')
    body += c(29, 45, 1.8, ACCENT, "none", 0)
    return g("pads", pads) + g("package", body)


def encoder(a):
    pins = line(34, 43, 34, 58) + line(44, 46, 44, 59) + line(56, 43, 56, 58)
    body = r(25, 15, 46, 32, METAL, INK, 2, 4) + c(48, 24, 15, PACKAGE, INK, 1.6)
    shaft = r(43, 1, 10, 22, METAL, INK, 1.5, 3) + line(45, 5, 51, 5, INK, 1)
    body += p("M29 37A18 18 0 0 0 67 37", ACCENT, 1.5) + p("M64 33L68 37L64 41", ACCENT, 1.5)
    return g("shaft", shaft) + g("body", body) + g("pins", pins)


def joystick(a):
    board = r(13, 8, 70, 48, PCB, PCB_EDGE, 2, 5) + mounting_hole(18, 13) + mounting_hole(78, 51)
    stick = c(48, 31, 20, PACKAGE, INK, 1.8) + c(48, 27, 13, "var(--eda-joystick,#64748B)", INK, 1.5)
    stick += p("M38 24Q48 16 58 24", PACKAGE_INK, 1.2)
    pins = "".join(pin_v(34 + i * 7, 50, h=9) for i in range(5))
    return g("pcb", board) + g("stick", stick) + g("header", pins)


def relay(a):
    pins = line(31, 45, 31, 57) + line(43, 45, 43, 57) + line(61, 45, 61, 57) + line(69, 45, 69, 57)
    body = r(23, 6, 50, 41, "var(--eda-relay,#3B82F6)", INK, 2, 3)
    body += t(48, 22, "SRD-05VDC", 7, PACKAGE_INK) + t(48, 32, "10A 250VAC", 6, PACKAGE_INK) + t(48, 40, "SPDT", 5.5, PACKAGE_INK)
    return g("pins", pins) + g("relay-case", body)


def motor(a):
    body = r(22, 11, 45, 38, METAL, INK, 2, 15) + p("M67 18H76V42H67", INK, 2, SOFT)
    shaft = line(76, 30, 92, 30, METAL, 6) + line(76, 30, 92, 30, INK, 1.2)
    body += t(44, 35, "M", 16, INK)
    terminals = line(27, 11, 27, 4) + line(38, 11, 38, 4)
    return g("motor-body", body) + g("shaft", shaft) + g("terminals", terminals)


def fan(a):
    frame = r(9, 3, 54, 54, PACKAGE, INK, 2, 7) + c(36, 30, 22, SOFT, PACKAGE_INK, 1.4)
    blades = p("M36 28C23 26 20 15 27 12C34 9 37 19 36 28ZM38 30C40 17 51 14 54 21C57 28 47 31 38 30ZM36 32C49 34 52 45 45 48C38 51 35 41 36 32ZM34 30C32 43 21 46 18 39C15 32 25 29 34 30Z", "none", 0, "var(--eda-fan-blade,#94A3B8)")
    blades += c(36, 30, 5, METAL, INK, 1.2)
    wires = p("M63 39H77V52", RED, 2) + p("M63 44H83V56", PACKAGE, 2)
    return g("frame", frame) + g("impeller", blades) + g("wires", wires)


def speaker(a):
    frame = c(42, 30, 26, METAL, INK, 2) + c(42, 30, 20, PACKAGE, INK, 1.5) + c(42, 30, 9, "var(--eda-speaker-cone,#64748B)", PACKAGE_INK, 1.2)
    waves = p("M72 20Q82 30 72 40M77 14Q92 30 77 46", ACCENT, 2)
    terminals = line(28, 53, 28, 59) + line(38, 55, 38, 60)
    return g("speaker", frame) + g("sound-waves", waves) + g("terminals", terminals)


def usbc(a):
    pins = "".join(pin_v(32 + i * 4, 44, h=9) for i in range(9))
    shell = r(15, 13, 66, 33, METAL, INK, 2, 14) + r(21, 19, 54, 21, SCREEN, INK, 1.5, 9)
    tongue = r(28, 25, 40, 9, "var(--eda-usb-tongue,#334155)", PACKAGE_INK, 1, 4)
    tongue += line(34, 29, 62, 29, ACCENT, 1.2)
    return g("pins", pins) + g("shell", shell) + g("tongue", tongue)


def header(a):
    body = r(4, 17, 88, 26, PACKAGE, INK, 2, 3)
    pins = ""
    for i in range(12):
        x = 9 + i * 7
        pins += r(x, 21, 4, 18, PIN, "none", 0, 0.5) + line(x + 2, 17, x + 2, 8, METAL, 2.2) + line(x + 2, 43, x + 2, 52, METAL, 2.2)
    return g("insulator", body) + g("pins", pins)


def terminal_block(a):
    pins = line(28, 45, 28, 58) + line(48, 45, 48, 58) + line(68, 45, 68, 58)
    body = r(17, 9, 62, 38, "var(--eda-terminal,#60A5FA)", INK, 2, 4)
    screws = "".join(c(28 + i * 20, 20, 6, METAL, INK, 1.2) + line(24 + i * 20, 20, 32 + i * 20, 20, INK, 1.2) for i in range(3))
    openings = "".join(r(22 + i * 20, 32, 12, 9, SCREEN, "none", 0, 1) for i in range(3))
    return g("pins", pins) + g("housing", body) + g("screws", screws) + g("wire-entry", openings)


def render_geometry(a):
    kind = a["kind"]
    if kind == "dip": return chip_dip(a)
    if kind == "dip14-schematic": return chip_dip14_schematic(a)
    if kind == "qfp": return chip_qfp(a)
    if kind == "soic": return chip_soic(a)
    if kind == "qfn": return chip_qfn(a)
    if kind in ("and", "nand", "or", "xor"): return gate(a, kind == "nand", kind == "xor")
    if kind == "board": return development_board(a)
    if kind == "arduino": return arduino_board(a)
    if kind == "lcd": return lcd(a)
    if kind == "oled": return oled(a)
    if kind == "seven1": return seven_segment(a, 1)
    if kind == "seven4": return seven_segment(a, 4)
    if kind == "led": return led_icon(a)
    if kind == "rgbled": return led_icon(a, True)
    if kind == "button": return tactile_button(a)
    if kind == "keypad": return keypad(a)
    if kind == "potentiometer": return potentiometer(a)
    if kind == "usbttl": return usb_ttl(a)
    if kind in ("analyzer", "oscilloscope", "terminal"): return instrument(a, kind)
    if kind == "sine": return signal_source(a)
    if kind == "clock": return signal_source(a, True)
    if kind == "pwm": return pwm_driver(a)
    if kind == "buzzer": return buzzer(a)
    if kind == "servo": return servo(a)
    if kind == "stepper": return stepper(a)
    if kind == "to92": return to92(a)
    if kind == "to220": return to220(a)
    if kind == "to247": return to220(a, True)
    if kind == "resistor": return resistor(a)
    if kind == "capacitor": return capacitor(a)
    if kind == "electrolytic": return electrolytic(a)
    if kind == "inductor": return inductor(a)
    if kind == "diode": return diode(a)
    if kind == "schottky": return diode(a, True)
    if kind == "rocker": return rocker(a)
    if kind == "module-chip": return generic_module_chip(a)
    if kind == "rtc": return rtc_module(a)
    if kind == "sot223": return sot223(a)
    if kind == "power-module": return power_module(a)
    if kind == "battery": return battery(a)
    if kind == "crystal": return crystal(a)
    if kind == "transformer": return transformer(a)
    if kind == "sensor-axis": return sensor_module(a, "axis")
    if kind == "sensor-metal": return sensor_module(a, "metal")
    if kind == "sensor-light": return sensor_module(a, "light")
    if kind == "dht11": return sensor_module(a, "dht11")
    if kind == "ultrasonic": return ultrasonic(a)
    if kind == "pir": return pir(a)
    if kind == "ir": return ir_receiver(a)
    if kind == "ldr": return ldr(a)
    if kind == "reed": return reed(a)
    if kind == "microphone": return microphone(a)
    if kind == "sd": return sd_module(a)
    if kind == "tft": return tft(a)
    if kind == "matrix": return matrix(a)
    if kind == "ws2812": return ws2812(a)
    if kind == "encoder": return encoder(a)
    if kind == "joystick": return joystick(a)
    if kind == "relay": return relay(a)
    if kind == "motor": return motor(a)
    if kind == "fan": return fan(a)
    if kind == "speaker": return speaker(a)
    if kind == "usbc": return usbc(a)
    if kind == "header": return header(a)
    if kind == "terminal-block": return terminal_block(a)
    raise ValueError(f"Unsupported kind: {kind}")


def asset_path(a):
    folder = {
        "芯片与逻辑": "chips", "开发板": "boards", "显示器件": "displays", "输入器件": "inputs",
        "通信与接口": "interfaces", "仪器与信号": "instruments", "执行与声学": "actuators",
        "分立半导体": "semiconductors", "无源器件": "passives", "电源器件": "power", "传感器": "sensors", "连接器": "connectors",
    }[a["category"]]
    return Path("assets") / a["scope"] / folder / f'{a["slug"]}.svg'


def render_asset(a):
    title_id = f'title-{a["slug"]}'
    desc_id = f'desc-{a["slug"]}'
    description = f'{a["name"]}，{a["model"]}，{a["package"]}。统一 EDA 封装风格，可编辑矢量。'
    viewbox, width, height = ("0 0 180 250", 180, 250) if a["kind"] == "dip14-schematic" else ("0 0 96 60", 96, 60)
    root_color = ' color="#475569"' if a["kind"] == "dip14-schematic" else ""
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{viewbox}" width="{width}" height="{height}"{root_color} '
        f'fill="none" stroke-linecap="round" stroke-linejoin="round" shape-rendering="geometricPrecision" '
        f'role="img" aria-labelledby="{title_id} {desc_id}" data-component="{a["slug"]}">\n'
        f'  <title id="{title_id}">{esc(a["model"])} · {esc(a["name"])}</title>\n'
        f'  <desc id="{desc_id}">{esc(description)}</desc>\n'
        f'  {render_geometry(a)}\n</svg>\n'
    )


# Clean schematic symbols. Original ids and electrical terminal coordinates are retained.
SYMBOLS = {
    "sym-resistor-right": ('-0.564 -0.28 1.128 0.48', '<path d="M-0.47-0.04H-0.21L-0.18-0.14L-0.11 0.05L-0.04-0.14L0.03 0.05L0.10-0.14L0.17 0.05L0.21-0.04H0.47"/>'),
    "sym-resistor-down": ('-0.162 -0.604 0.324 1.128', '<path d="M0-0.51V-0.25L-0.10-0.20L0.10-0.12L-0.10-0.04L0.10 0.04L-0.10 0.12L0 0.17V0.43"/>'),
    "sym-capacitor-right": ('-0.36 -0.39 0.72 0.78', '<path d="M-0.3 0H-0.06M0.06 0H0.3M-0.06-0.16V0.16M0.06-0.16V0.16"/>'),
    "sym-capacitor-down": ('-0.54 -0.36 1.08 0.72', '<path d="M0-0.3V-0.06M0 0.06V0.3M-0.16-0.06H0.16M-0.16 0.06H0.16"/>'),
    "sym-capacitor-polarized-down": ('-0.66 -0.36 1.32 0.72', '<path d="M0-0.3V0M0 0.06V0.3M-0.16 0H0.16M-0.16 0.08Q0 0.01 0.16 0.08M-0.23-0.12H-0.15M-0.19-0.16V-0.08"/>'),
    "sym-inductor-right": ('-0.634 -0.252 1.266 0.552', '<path d="M-0.56-0.04H-0.42C-0.42-0.22-0.28-0.22-0.28-0.04C-0.28-0.22-0.14-0.22-0.14-0.04C-0.14-0.22 0-0.22 0-0.04C0-0.22 0.14-0.22 0.14-0.04C0.14-0.22 0.28-0.22 0.28-0.04H0.56"/>'),
    "sym-diode-right": ('-0.624 -0.364 1.248 0.648', '<path d="M-0.52-0.04H-0.13M0.14-0.04H0.52M-0.13-0.17V0.09L0.14-0.04ZM0.14-0.17V0.09"/>'),
    "sym-diode-down": ('-0.324 -0.664 0.648 1.248', '<path d="M0-0.56V-0.16M0 0.10V0.48M-0.13-0.16H0.14L0 0.10ZM-0.13 0.10H0.14"/>'),
    "sym-led-right": ('-0.678 -0.39 1.356 0.78', '<path d="M-0.54 0H-0.13M0.14 0H0.54M-0.13-0.13V0.13L0.14 0ZM0.14-0.13V0.13M-0.08-0.17L0.02-0.29M0.02-0.17L0.12-0.29M0.02-0.29L-0.01-0.25M0.02-0.29L-0.02-0.32M0.12-0.29L0.09-0.25M0.12-0.29L0.08-0.32"/>'),
    "sym-npn-down": ('-0.498 -0.66 0.996 1.32', '<circle cx="0.14" cy="0" r="0.29"/><path d="M-0.4 0H0.07M0.07-0.27V0.28M0.08-0.11L0.29-0.25V-0.55M0.09 0.11L0.29 0.25V0.55M0.18 0.17L0.25 0.23M0.25 0.23L0.18 0.23M0.25 0.23L0.24 0.16"/>'),
    "sym-pnp-down": ('-0.498 -0.66 0.996 1.32', '<circle cx="0.14" cy="0" r="0.29"/><path d="M-0.4 0H0.07M0.07-0.27V0.28M0.08-0.11L0.29-0.25V-0.55M0.09 0.11L0.29 0.25V0.55M0.25 0.23L0.16 0.15M0.16 0.15L0.17 0.22M0.16 0.15L0.23 0.14"/>'),
    "sym-nmos": ('-0.504 -0.66 1.008 1.32', '<circle cx="0.16" cy="0" r="0.29"/><path d="M-0.42 0.1H0.05M0.05-0.11V0.11M0.09-0.15V-0.07M0.09-0.03V0.04M0.09 0.08V0.15M0.09-0.11H0.30V-0.55M0.09 0.10H0.31V0.55M0.09 0H0.27M0.27 0L0.19-0.04M0.27 0L0.19 0.04"/>'),
    "sym-pmos": ('-0.504 -0.66 1.008 1.32', '<circle cx="0.16" cy="0" r="0.29"/><path d="M-0.42 0.1H0.05M0.05-0.11V0.11M0.09-0.15V-0.07M0.09-0.03V0.04M0.09 0.08V0.15M0.09-0.11H0.30V-0.55M0.09 0.10H0.31V0.55M0.09 0H0.27M0.19 0L0.27-0.04M0.19 0L0.27 0.04"/>'),
    "sym-opamp-right": ('-0.67 -0.482 1.2 0.864', '<path d="M-0.57-0.18H-0.32M-0.57 0.09H-0.32M-0.32-0.31V0.21L0.14-0.04ZM0.14-0.04H0.43M-0.27-0.18H-0.19M-0.23-0.22V-0.14M-0.27 0.09H-0.19"/>'),
    "sym-scr-horz": ('-0.624 -0.456 1.248 0.912', '<path d="M-0.52-0.04H-0.17M0.18-0.05H0.52M-0.17-0.25V0.15L0.18-0.05ZM0.18-0.25V0.15M0.19 0L0.35 0.14V0.35"/>'),
    "sym-igbt-horz": ('-0.498 -0.672 0.996 1.344', '<circle cx="0.14" cy="0" r="0.29"/><path d="M-0.4 0H0.01M0.01-0.14V0.12M0.07-0.19V0.18M0.07-0.11L0.28-0.26V-0.56M0.08 0.09L0.28 0.25V0.56M0.19 0.16L0.25 0.22M0.25 0.22L0.18 0.22M0.25 0.22L0.24 0.15"/>'),
    "sym-ground-down": ('-0.264 -0.36 0.528 0.72', '<path d="M0-0.29V0.04M-0.22 0.04H0.22M-0.15 0.12H0.15M-0.06 0.20H0.06"/>'),
    "sym-battery-right": ('-0.6 -0.42 1.2 0.78', '<path d="M-0.5-0.03H-0.06M0.02-0.03H0.5M-0.06-0.19V0.12M0.02-0.13V0.06M-0.24-0.23V-0.15M-0.28-0.19H-0.20M0.12-0.19H0.20"/>'),
    "sym-button-right": ('-0.564 -0.382 1.128 0.864', '<path d="M-0.47 0.05H-0.15M0.17 0.05H0.47M-0.16-0.04H0.18M-0.05-0.04V-0.10H0.07V-0.04"/><circle cx="-0.14" cy="0.05" r="0.025"/><circle cx="0.17" cy="0.05" r="0.025"/>'),
    "sym-pot-vert": ('-0.624 -0.624 1.248 1.248', '<path d="M0-0.52V-0.38L-0.10-0.30L0.10-0.20L-0.10-0.10L0.10 0L-0.10 0.10L0.10 0.20L-0.10 0.30L0 0.38V0.52M0.52 0H0.25L0.10-0.10M0.10-0.10L0.18-0.10M0.10-0.10L0.14-0.02"/>'),
    "sym-zener-down": ('-0.197 -0.669 0.394 1.249', '<path d="M0-0.56V-0.16M0 0.10V0.48M-0.13-0.16H0.14L0 0.10ZM-0.13 0.10H0.14M-0.13 0.10V0.04M0.14 0.10V0.16"/>'),
    "sym-crystal-down": ('-0.354 -0.65 0.708 1.32', '<path d="M0-0.54V-0.13M0 0.14V0.56M-0.27-0.13H0.27M-0.27 0.14H0.27M-0.27-0.07V0.08H0.27V-0.07"/>'),
    "sym-spst-right": ('-0.456 -0.3 0.912 0.6', '<path d="M-0.38 0H-0.12M0.12 0H0.38M-0.08-0.01L0.10-0.15"/><circle cx="-0.10" cy="0" r="0.025"/><circle cx="0.10" cy="0" r="0.025"/>'),
    "sym-fuse-horz": ('-0.678 -0.282 1.356 0.564', '<path d="M-0.53-0.04H0.53M-0.26-0.17H0.27V0.10H-0.26Z"/>'),
    "sym-speaker-right": ('-0.48 -0.72 0.96 1.44', '<path d="M-0.4-0.2H-0.2M-0.4 0.2H-0.2M-0.2-0.2H0V0.2H-0.2ZM0-0.2L0.4-0.4V0.4L0 0.2M0.16-0.12Q0.28 0 0.16 0.12"/>'),
    "sym-square-wave-right": ('-0.535 -0.314 1.07 0.574', '<path d="M-0.446-0.027H-0.25M0.25-0.027H0.446M-0.25 0.10V-0.16H-0.08V0.10H0.08V-0.16H0.25V0.10"/>'),
}


def original_viewboxes():
    source = (DESIGN / "partials" / "schematic-symbols.svg").read_text(encoding="utf-8")
    return dict(re.findall(r'<symbol id="([^"]+)" viewBox="([^"]+)"', source))


def schematic_sprite():
    symbols = []
    viewboxes = original_viewboxes()
    for sid, (fallback_viewbox, content) in SYMBOLS.items():
        viewbox = viewboxes.get(sid, fallback_viewbox)
        symbols.append(f'<symbol id="{sid}" viewBox="{viewbox}" fill="none" stroke="currentColor" stroke-width="0.02" stroke-linecap="round" stroke-linejoin="round">{content}</symbol>')
    return '<!-- Redesigned clean schematic symbols. Original MIT schematic-symbols attribution: Copyright (c) 2024 tscircuit. -->\n<svg class="symbol-sprite" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><defs>\n' + "\n".join(symbols) + '\n</defs></svg>\n'


def inline_asset(a):
    source = render_asset(a).strip()
    source = re.sub(r'\s+id="[^"]+"', "", source)
    source = re.sub(r'\s+aria-labelledby="[^"]+"', "", source)
    source = re.sub(r'\s+role="img"', "", source)
    source = re.sub(r'\s+width="\d+" height="\d+"', "", source, count=1)
    source = re.sub(r'\s*<title>.*?</title>\s*', "", source, flags=re.S)
    source = re.sub(r'\s*<desc>.*?</desc>\s*', "", source, flags=re.S)
    source = source.replace("<svg ", '<svg aria-hidden="true" class="eda-part-icon" ', 1)
    return source


def build_preview(entries):
    cards = []
    for a in entries:
        path = asset_path(a).as_posix()
        large = large_schematic_entry(a["slug"])
        large_link = f'<a class="large-symbol-link" href="../{large["file"]}" aria-label="查看 {esc(a["model"])} 大符号">查看大符号 →</a>' if large else ""
        search = " ".join([a["name"], a["model"], a["package"], a["category"], a["slug"]]).lower()
        cards.append(f'''<article class="asset-card" data-scope="{a['scope']}" data-category="{esc(a['category'])}" data-search="{esc(search)}">
  <a class="asset-art" href="../{path}" download aria-label="下载 {esc(a['model'])} SVG">{inline_asset(a)}<span class="download-hint">下载 SVG</span></a>
  <div class="asset-copy"><div class="asset-model">{esc(a['model'])}</div><h3>{esc(a['name'])}</h3><p>{esc(a['package'])}</p></div>
  <div class="asset-foot"><span>{esc(a['category'])}</span><code>{a['slug']}</code></div>{large_link}
</article>''')
    categories = sorted({a["category"] for a in entries})
    options = "".join(f'<button class="filter" data-filter="{esc(cat)}">{esc(cat)}</button>' for cat in categories)
    current_count = sum(a["scope"] == "current" for a in entries)
    extended_count = len(entries) - current_count
    large_count = sum(large_schematic_entry(a["slug"]) is not None for a in entries)
    return f'''<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>EDA 器件 SVG 资产库</title>
<style>
:root{{--bg:#f5f7fa;--panel:#fff;--panel2:#eef2f7;--text:#172033;--muted:#667085;--border:#dce3ec;--brand:#2563eb;--brand-soft:#e8f0fe;--eda-ink:#475569;--eda-package:#334155;--eda-package-ink:#f8fafc;--eda-pcb:#ddebe3;--eda-pcb-edge:#3f6f5b;--eda-soft:#f1f5f9;--eda-screen:#172554;--eda-screen-ink:#93c5fd;--eda-accent:#f59e0b;--eda-accent-soft:#fef3c7;--eda-symbol-body:#ffffff;--eda-pin-line:#94a3b8;--eda-muted:#64748b;color-scheme:light}}
html[data-theme="dark"]{{--bg:#0c1220;--panel:#141d2e;--panel2:#1c283b;--text:#edf3fc;--muted:#9aaac0;--border:#2b3a50;--brand:#7aa7ff;--brand-soft:#1c3154;--eda-ink:#b6c3d5;--eda-package:#334155;--eda-package-ink:#f8fafc;--eda-pcb:#1f4a3c;--eda-pcb-edge:#79b89e;--eda-soft:#253248;--eda-screen:#081a3a;--eda-screen-ink:#7dd3fc;--eda-accent:#fbbf24;--eda-accent-soft:#453714;--eda-symbol-body:#141d2e;--eda-pin-line:#64748b;--eda-muted:#9aaac0;color-scheme:dark}}
*{{box-sizing:border-box}}body{{margin:0;background:var(--bg);color:var(--text);font:14px/1.55 Inter,"Microsoft YaHei",system-ui,sans-serif}}button,input{{font:inherit}}a{{color:inherit;text-decoration:none}}.wrap{{width:min(1440px,calc(100% - 48px));margin:auto}}header{{padding:48px 0 30px;border-bottom:1px solid var(--border);background:linear-gradient(135deg,var(--panel),var(--brand-soft))}}.eyebrow{{color:var(--brand);font:700 11px/1 ui-monospace,monospace;letter-spacing:.16em;text-transform:uppercase}}h1{{margin:12px 0 12px;font-size:clamp(30px,4vw,52px);line-height:1.08;letter-spacing:-.04em}}.lead{{max-width:760px;margin:0;color:var(--muted);font-size:15px}}.stats{{display:flex;gap:12px;flex-wrap:wrap;margin-top:24px}}.stat{{padding:10px 14px;border:1px solid var(--border);border-radius:12px;background:var(--panel);font:600 12px ui-monospace,monospace}}.toolbar{{position:sticky;top:0;z-index:5;padding:14px 0;background:color-mix(in srgb,var(--bg) 92%,transparent);backdrop-filter:blur(14px);border-bottom:1px solid var(--border)}}.toolbar-row{{display:flex;gap:12px;align-items:center}}.search{{flex:1;min-width:200px;padding:11px 14px;border:1px solid var(--border);border-radius:11px;background:var(--panel);color:var(--text);outline:none}}.search:focus{{border-color:var(--brand)}}.theme,.filter{{border:1px solid var(--border);background:var(--panel);color:var(--text);border-radius:9px;padding:8px 11px;cursor:pointer}}.filters{{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}}.filter.active{{background:var(--brand);border-color:var(--brand);color:white}}main{{padding:28px 0 60px}}.section-head{{display:flex;justify-content:space-between;align-items:end;margin:20px 0 16px}}h2{{margin:0;font-size:22px}}.section-head p{{margin:0;color:var(--muted)}}.grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(205px,1fr));gap:14px}}.asset-card{{overflow:hidden;border:1px solid var(--border);border-radius:16px;background:var(--panel);transition:.18s ease}}.asset-card:hover{{transform:translateY(-2px);border-color:var(--brand);box-shadow:0 12px 28px -20px var(--text)}}.asset-art{{position:relative;display:flex;align-items:center;justify-content:center;height:134px;background:var(--panel2);border-bottom:1px solid var(--border)}}.asset-art svg{{width:144px;height:90px}}.download-hint{{position:absolute;right:9px;bottom:8px;padding:3px 6px;border-radius:6px;background:var(--panel);color:var(--brand);font-size:10px;opacity:0;transition:.15s}}.asset-art:hover .download-hint{{opacity:1}}.asset-copy{{padding:13px 14px 10px}}.asset-model{{color:var(--brand);font:700 12px ui-monospace,monospace}}h3{{margin:5px 0 3px;font-size:14px}}.asset-copy p{{margin:0;color:var(--muted);font-size:12px}}.asset-foot{{display:flex;justify-content:space-between;gap:8px;padding:9px 14px;border-top:1px solid var(--border);color:var(--muted);font-size:10px}}.asset-foot code{{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}}.guide{{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:26px 0}}.guide article{{padding:16px;border:1px solid var(--border);border-radius:14px;background:var(--panel)}}.guide b{{display:block;margin-bottom:6px}}.guide p{{margin:0;color:var(--muted);font-size:12px}}.integration{{padding:20px;border:1px solid var(--border);border-radius:16px;background:var(--panel);margin-top:26px}}.integration code{{color:var(--brand)}}.empty{{display:none;padding:50px;text-align:center;color:var(--muted)}}footer{{padding:24px 0 40px;color:var(--muted);font-size:12px;border-top:1px solid var(--border)}}[hidden]{{display:none!important}}@media(max-width:800px){{.wrap{{width:min(100% - 24px,1440px)}}.guide{{grid-template-columns:1fr 1fr}}.toolbar-row{{flex-wrap:wrap}}.search{{flex-basis:100%}}}}@media(max-width:460px){{.guide{{grid-template-columns:1fr}}.grid{{grid-template-columns:1fr 1fr}}.asset-art{{height:110px}}.asset-art svg{{width:120px;height:75px}}}}
.large-symbol-link{{display:block;padding:9px 14px;border-top:1px solid var(--border);color:var(--brand);font-size:12px;font-weight:700;text-align:right}}.large-symbol-link:hover{{background:var(--brand-soft)}}
</style></head>
<body><header><div class="wrap"><div class="eyebrow">Production-ready editable vector · EDA package language</div><h1>电子课程设计 · 器件 SVG 资产库</h1><p class="lead">为 online-electronic-course-design-simulation 重绘。统一封装轮廓、金属引脚、1 脚标识、PCB 与显示器件语义；同时保留可编辑结构与项目现有主题适应能力。</p><div class="stats"><span class="stat">{current_count} 枚现有器件</span><span class="stat">{extended_count} 枚扩展器件</span><span class="stat">{len(SYMBOLS)} 枚原理图符号</span><span class="stat">{large_count} 枚大符号</span><span class="stat">96 × 60 缩略图 / 动态大符号网格</span></div></div></header>
<div class="toolbar"><div class="wrap"><div class="toolbar-row"><input class="search" id="search" type="search" placeholder="搜索型号、名称、封装或分类…" aria-label="搜索器件"><button class="theme" id="theme" type="button">切换深色预览</button><button class="filter active" data-filter="all">全部</button></div><div class="filters">{options}</div></div></div>
<main class="wrap"><section class="guide"><article><b>封装语义</b><p>DIP 缺口、QFP 四边引脚、TO 系列散热片与极性标记均按行业常见表达绘制。</p></article><article><b>可编辑结构</b><p>独立 SVG 含 title、desc 与 pins/package/markings 等语义分组；大符号每脚附 data-pin 与 data-direction，无位图、脚本或外部依赖。</p></article><article><b>大符号规范</b><p>集成电路按标准脚序；开发板与模块采用功能端口，不为不同厂商版本虚构物理脚号；分立器件使用标准原理图符号。</p></article><article><b>主题变量</b><p>通过 --eda-ink、--eda-package、--eda-symbol-body、--eda-accent 等变量适配界面，默认色可直接使用。</p></article><article><b>尺寸建议</b><p>缩略图 44–96 px；原理图大符号按 23-unit 引脚间距动态扩展，画布中可直接缩放而不损失文字。</p></article></section>
<section><div class="section-head"><h2>器件资产</h2><p id="count">{len(entries)} / {len(entries)}</p></div><div class="grid" id="grid">{''.join(cards)}</div><div class="empty" id="empty">没有匹配的器件，请更换关键词或分类。</div></section>
<section class="integration"><h2>项目替换与文件结构</h2><p><code>redesigned-design/electronic-lab/</code> 是已替换器件缩略图与原理图符号的完整 design 副本，可对照预览。</p><p><code>assets/current/</code> 对应当前项目器件；<code>assets/extended/</code> 为后续扩展；<code>assets/large-schematic/</code> 为其余器件的大符号版本；<code>assets/schematic/schematic-symbols.svg</code> 保留原 symbol id，可替换共享符号文件。</p><p>页面状态建议：默认使用当前主题色；悬停提高描边对比；选中仅增加外框，不改变器件本身极性与引脚颜色；禁用态整体不透明度 40%。器件命名使用“型号-封装”小写短横线。</p></section></main>
<footer><div class="wrap">所有图形均为可编辑 SVG。品牌型号仅用于器件识别，未绘制厂商商标；通用兼容板不代表官方开发板外观复刻。</div></footer>
<script>
const cards=[...document.querySelectorAll('.asset-card')];let category='all';const q=document.getElementById('search');
function apply(){{const term=q.value.trim().toLowerCase();let shown=0;cards.forEach(card=>{{const visible=(category==='all'||card.dataset.category===category)&&card.dataset.search.includes(term);card.hidden=!visible;if(visible)shown++}});document.getElementById('count').textContent=shown+' / '+cards.length;document.getElementById('empty').style.display=shown?'none':'block'}}
q.addEventListener('input',apply);document.querySelectorAll('.filter').forEach(btn=>btn.addEventListener('click',()=>{{category=btn.dataset.filter;document.querySelectorAll('.filter').forEach(b=>b.classList.toggle('active',b===btn));apply()}}));
document.getElementById('theme').addEventListener('click',()=>{{const dark=document.documentElement.dataset.theme==='dark';document.documentElement.dataset.theme=dark?'light':'dark';document.getElementById('theme').textContent=dark?'切换深色预览':'切换浅色预览'}});
</script></body></html>'''


def choose_asset(name, meta):
    if name == "7 段数码管":
        return BY_SLUG["seven-segment-4digit" if "4 位" in meta else "seven-segment-1digit"]
    if name == "电容" and "470" in meta:
        return BY_SLUG["electrolytic-capacitor"]
    slug = NAME_MAP.get(name)
    if not slug:
        raise KeyError(f"No redesigned asset mapped for part: {name} / {meta}")
    return BY_SLUG[slug]


def integrate_project():
    target_root = ROOT / "redesigned-design"
    if target_root.exists():
        shutil.rmtree(target_root)
    shutil.copytree(PROJECT / "design", target_root / "design")
    sprite = schematic_sprite()
    (target_root / "design" / "electronic-lab" / "partials" / "schematic-symbols.svg").write_text(sprite, encoding="utf-8")
    replacements = 0
    for page in (target_root / "design" / "electronic-lab" / "pages").glob("*.html"):
        source = page.read_text(encoding="utf-8")
        source = re.sub(r'<svg class="symbol-sprite"[^>]*>.*?</defs></svg>', lambda _: sprite.strip(), source, count=1, flags=re.S)
        def replace_card(match):
            nonlocal replacements
            card = match.group(0)
            name_m = re.search(r'<span class="part-name">(.*?)</span>', card, re.S)
            meta_m = re.search(r'<span class="part-meta">(.*?)</span>', card, re.S)
            if not name_m:
                return card
            name = html.unescape(name_m.group(1).strip())
            meta = html.unescape(meta_m.group(1).strip()) if meta_m else ""
            a = choose_asset(name, meta)
            new_svg = inline_asset(a)
            updated, n = re.subn(r'<svg\b[^>]*>.*?</svg>', lambda _: new_svg, card, count=1, flags=re.S)
            replacements += n
            return updated
        source = re.sub(r'<button class="part-card\b.*?</button>', replace_card, source, flags=re.S)
        page.write_text(source, encoding="utf-8")
    return replacements


def validate(entries):
    errors = []
    svg_files = list((ROOT / "assets").rglob("*.svg"))
    for path in svg_files:
        try:
            ET.parse(path)
        except ET.ParseError as exc:
            errors.append(f"{path.relative_to(ROOT)}: {exc}")
    slugs = [a["slug"] for a in entries]
    duplicates = [slug for slug, count in Counter(slugs).items() if count > 1]
    large_files = list((ROOT / "assets" / "large-schematic").rglob("*.svg"))
    large_files.append(ROOT / "assets" / "extended" / "chips" / "74ls32-dip14-schematic.svg")
    large_pin_count = 0
    for path in large_files:
        root = ET.parse(path).getroot()
        large_pin_count += len(root.findall(".//{http://www.w3.org/2000/svg}g[@data-pin]"))
    if duplicates:
        errors.append("Duplicate slugs: " + ", ".join(duplicates))
    if len(SYMBOLS) != len(set(SYMBOLS)):
        errors.append("Duplicate schematic ids")
    report = {
        "status": "passed" if not errors else "failed",
        "standalone_component_assets": len(entries),
        "current_assets": sum(a["scope"] == "current" for a in entries),
        "extended_assets": sum(a["scope"] == "extended" for a in entries),
        "schematic_symbols": len(SYMBOLS),
        "large_schematic_symbols": len(large_files),
        "large_schematic_pins": large_pin_count,
        "svg_files_validated": len(svg_files),
        "xml_errors": errors,
        "external_raster_or_script": False,
        "viewBox_components": "0 0 96 60",
        "viewBox_large_schematic": "dynamic · 23-unit pin pitch",
    }
    (ROOT / "validation.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    if errors:
        raise RuntimeError("Validation failed: " + "; ".join(errors))
    return report


def main():
    for a in ASSETS:
        path = ROOT / asset_path(a)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(render_asset(a), encoding="utf-8")
    large_entries = generate_large_assets(ROOT)
    schematic_dir = ROOT / "assets" / "schematic"
    schematic_dir.mkdir(parents=True, exist_ok=True)
    (schematic_dir / "schematic-symbols.svg").write_text(schematic_sprite(), encoding="utf-8")
    individual = schematic_dir / "individual"
    individual.mkdir(exist_ok=True)
    viewboxes = original_viewboxes()
    for sid, (fallback_viewbox, content) in SYMBOLS.items():
        viewbox = viewboxes.get(sid, fallback_viewbox)
        svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{viewbox}" width="48" height="48" fill="none" stroke="currentColor" stroke-width="0.02" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="{sid}"><title>{sid}</title>{content}</svg>\n'
        (individual / f"{sid.removeprefix('sym-')}.svg").write_text(svg, encoding="utf-8")
    manifest = {
        "name": "Electronic Course Design EDA SVG Library",
        "source_project": "https://github.com/moonandwind22/online-electronic-course-design-simulation",
        "version": "1.0.0",
        "component_viewBox": "0 0 96 60",
        "large_schematic_viewBox": "dynamic · 23-unit pin pitch",
        "style": {"stroke": 2, "corner_radius": "2–6 units", "pin_fill": "#CBD5E1", "package_fill": "#334155", "pcb_fill": "#DDEBE3", "accent": "#F59E0B"},
        "assets": [{**a, "file": asset_path(a).as_posix()} for a in ASSETS],
        "large_schematics": large_entries,
        "schematic_symbol_ids": list(SYMBOLS),
    }
    (ROOT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    (ROOT / "preview" / "index.html").write_text(build_preview(ASSETS), encoding="utf-8")
    replacements = integrate_project()
    report = validate(ASSETS)
    report["html_thumbnail_replacements"] = replacements
    (ROOT / "validation.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
