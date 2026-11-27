/**
 * 器件封装 SVG 资产索引。
 *
 * 小封装（器件库缩略图）与大封装（检查器原理图）严格引用仓库根目录
 * `eda-component-svg-pack/assets` 内的 SVG 源文件，不使用手绘或外部替代图。
 * 资产包缺少对应型号时，器件库回退到通用符号，并在交付说明中登记缺口。
 */

// —— 小封装：assets/current、assets/extended ——
import small74ls74 from '../../eda-component-svg-pack/assets/current/chips/74ls74-dip14.svg?raw';
import small74ls138 from '../../eda-component-svg-pack/assets/current/chips/74ls138-dip16.svg?raw';
import small74ls373 from '../../eda-component-svg-pack/assets/current/chips/74ls373-dip20.svg?raw';
import small74ls161 from '../../eda-component-svg-pack/assets/current/chips/74ls161-dip16.svg?raw';
import small74ls47 from '../../eda-component-svg-pack/assets/current/chips/74ls47-dip16.svg?raw';
import small74hc595 from '../../eda-component-svg-pack/assets/current/chips/74hc595-dip16.svg?raw';
import small74ls00 from '../../eda-component-svg-pack/assets/current/chips/74ls00-nand.svg?raw';
import small74ls08 from '../../eda-component-svg-pack/assets/current/chips/74ls08-and.svg?raw';
import small74ls32 from '../../eda-component-svg-pack/assets/current/chips/74ls32-or.svg?raw';
import small74ls86 from '../../eda-component-svg-pack/assets/current/chips/74ls86-xor.svg?raw';
import smallSevenSeg from '../../eda-component-svg-pack/assets/current/displays/seven-segment-1digit.svg?raw';
import smallLed from '../../eda-component-svg-pack/assets/current/displays/led-5mm-red.svg?raw';
import smallButton from '../../eda-component-svg-pack/assets/current/inputs/tactile-button-6mm.svg?raw';
import smallRocker from '../../eda-component-svg-pack/assets/current/inputs/spst-rocker.svg?raw';
import smallBuzzer from '../../eda-component-svg-pack/assets/current/actuators/active-buzzer.svg?raw';
import smallResistor from '../../eda-component-svg-pack/assets/current/passives/resistor-axial.svg?raw';
import smallCapacitor from '../../eda-component-svg-pack/assets/current/passives/capacitor-ceramic.svg?raw';
import smallInductor from '../../eda-component-svg-pack/assets/current/passives/inductor-shielded.svg?raw';
import smallDiode from '../../eda-component-svg-pack/assets/current/semiconductors/1n4148-axial.svg?raw';
import smallClock from '../../eda-component-svg-pack/assets/current/instruments/clock-source-square.svg?raw';
import smallStc89c52 from '../../eda-component-svg-pack/assets/current/chips/stc89c52rc-dip40.svg?raw';
import smallBluePill from '../../eda-component-svg-pack/assets/extended/boards/blue-pill-stm32.svg?raw';

// —— 大封装：assets/large-schematic ——
import large74ls74 from '../../eda-component-svg-pack/assets/large-schematic/chips/74ls74-dip14-schematic.svg?raw';
import large74ls138 from '../../eda-component-svg-pack/assets/large-schematic/chips/74ls138-dip16-schematic.svg?raw';
import large74ls373 from '../../eda-component-svg-pack/assets/large-schematic/chips/74ls373-dip20-schematic.svg?raw';
import large74ls161 from '../../eda-component-svg-pack/assets/large-schematic/chips/74ls161-dip16-schematic.svg?raw';
import large74ls47 from '../../eda-component-svg-pack/assets/large-schematic/chips/74ls47-dip16-schematic.svg?raw';
import large74hc595 from '../../eda-component-svg-pack/assets/large-schematic/chips/74hc595-dip16-schematic.svg?raw';
import large74ls00 from '../../eda-component-svg-pack/assets/large-schematic/chips/74ls00-nand-schematic.svg?raw';
import large74ls08 from '../../eda-component-svg-pack/assets/large-schematic/chips/74ls08-and-schematic.svg?raw';
import large74ls32 from '../../eda-component-svg-pack/assets/extended/chips/74ls32-dip14-schematic.svg?raw';
import large74ls86 from '../../eda-component-svg-pack/assets/large-schematic/chips/74ls86-xor-schematic.svg?raw';
import largeSevenSeg from '../../eda-component-svg-pack/assets/large-schematic/displays/seven-segment-1digit-schematic.svg?raw';
import largeLed from '../../eda-component-svg-pack/assets/large-schematic/displays/led-5mm-red-schematic.svg?raw';
import largeButton from '../../eda-component-svg-pack/assets/large-schematic/inputs/tactile-button-6mm-schematic.svg?raw';
import largeRocker from '../../eda-component-svg-pack/assets/large-schematic/inputs/spst-rocker-schematic.svg?raw';
import largeBuzzer from '../../eda-component-svg-pack/assets/large-schematic/actuators/active-buzzer-schematic.svg?raw';
import largeResistor from '../../eda-component-svg-pack/assets/large-schematic/passives/resistor-axial-schematic.svg?raw';
import largeCapacitor from '../../eda-component-svg-pack/assets/large-schematic/passives/capacitor-ceramic-schematic.svg?raw';
import largeInductor from '../../eda-component-svg-pack/assets/large-schematic/passives/inductor-shielded-schematic.svg?raw';
import largeDiode from '../../eda-component-svg-pack/assets/large-schematic/semiconductors/1n4148-axial-schematic.svg?raw';
import largeClock from '../../eda-component-svg-pack/assets/large-schematic/instruments/clock-source-square-schematic.svg?raw';
import largeStc89c52 from '../../eda-component-svg-pack/assets/large-schematic/chips/stc89c52rc-dip40-schematic.svg?raw';
import largeBluePill from '../../eda-component-svg-pack/assets/large-schematic/boards/blue-pill-stm32-schematic.svg?raw';

interface SvgAsset {
  small: string;
  large: string;
}

export interface SvgPinAnchor {
  side: 'left' | 'right' | 'up' | 'down';
  x: number;
  y: number;
}

interface SvgAssetMeta {
  canvasLarge: string;
  largeWidth: number;
  largeHeight: number;
  largePins: SvgPinAnchor[];
}

/** 去掉资产包内固定的参考位号（U1/R1…），画布上使用元件自身的动态位号。 */
function stripReference(markup: string): string {
  const start = markup.indexOf('<g id="reference-and-markings"');
  if (start < 0) return markup;
  const end = markup.indexOf('<g id="pins"', start);
  if (end < 0) return markup;
  const group = markup.slice(start, end).replace(/<text\b[^>]*text-anchor="start"[^>]*>[^<]*<\/text>/, '');
  return markup.slice(0, start) + group + markup.slice(end);
}

function parseLargeSvg(markup: string): Omit<SvgAssetMeta, 'canvasLarge'> {
  const viewBox = /viewBox="([^"]+)"/.exec(markup)?.[1].trim().split(/[\s,]+/).map(Number) ?? [];
  const largeWidth = viewBox[2] ?? 0;
  const largeHeight = viewBox[3] ?? 0;
  const largePins: SvgPinAnchor[] = [];
  const groupRe = /<g id="((?:pin-[^"]+|port-(?:left|right)-[^"]+))"([^>]*)>([\s\S]*?)<\/g>/g;
  let match: RegExpExecArray | null;
  while ((match = groupRe.exec(markup))) {
    const [, id, attrs, body] = match;
    const circle = /<circle\s+cx="([\d.]+)"\s+cy="([\d.]+)"/.exec(body);
    if (!circle) continue;
    const x = Number(circle[1]);
    const y = Number(circle[2]);
    const declared = /data-side="(left|right|up|down)"/.exec(attrs)?.[1] as SvgPinAnchor['side'] | undefined;
    const side = declared ?? (id.includes('left') ? 'left' : id.includes('right') ? 'right' : x < largeWidth / 2 ? 'left' : 'right');
    largePins.push({ side, x, y });
  }
  return { largeWidth, largeHeight, largePins };
}

const ASSETS: Record<string, SvgAsset> = {
  '74ls74-dip14': { small: small74ls74, large: large74ls74 },
  '74ls138-dip16': { small: small74ls138, large: large74ls138 },
  '74ls373-dip20': { small: small74ls373, large: large74ls373 },
  '74ls161-dip16': { small: small74ls161, large: large74ls161 },
  '74ls47-dip16': { small: small74ls47, large: large74ls47 },
  '74hc595-dip16': { small: small74hc595, large: large74hc595 },
  '74ls00-nand': { small: small74ls00, large: large74ls00 },
  '74ls08-and': { small: small74ls08, large: large74ls08 },
  '74ls32-or': { small: small74ls32, large: large74ls32 },
  '74ls86-xor': { small: small74ls86, large: large74ls86 },
  'seven-segment-1digit': { small: smallSevenSeg, large: largeSevenSeg },
  'led-5mm-red': { small: smallLed, large: largeLed },
  'tactile-button-6mm': { small: smallButton, large: largeButton },
  'spst-rocker': { small: smallRocker, large: largeRocker },
  'active-buzzer': { small: smallBuzzer, large: largeBuzzer },
  'resistor-axial': { small: smallResistor, large: largeResistor },
  'capacitor-ceramic': { small: smallCapacitor, large: largeCapacitor },
  'inductor-shielded': { small: smallInductor, large: largeInductor },
  '1n4148-axial': { small: smallDiode, large: largeDiode },
  'clock-source-square': { small: smallClock, large: largeClock },
  'stc89c52rc-dip40': { small: smallStc89c52, large: largeStc89c52 },
  'blue-pill-stm32': { small: smallBluePill, large: largeBluePill },
};

/** 应用器件类型 → 资产包 slug，slug 与 `eda-component-svg-pack/manifest.json` 一致。 */
const PART_ASSET_SLUG: Record<string, string> = {
  // 数字芯片
  '74LS00': '74ls00-nand',
  '74LS08': '74ls08-and',
  '74LS32': '74ls32-or',
  '74LS86': '74ls86-xor',
  '74LS74': '74ls74-dip14',
  '74LS138': '74ls138-dip16',
  '74LS373': '74ls373-dip20',
  '74LS161': '74ls161-dip16',
  '74LS47': '74ls47-dip16',
  '74HC595': '74hc595-dip16',
  // 基础与显示器件
  NAND2: '74ls00-nand',
  SEVENSEG: 'seven-segment-1digit',
  LED: 'led-5mm-red',
  BUTTON: 'tactile-button-6mm',
  LOGIC_SWITCH: 'spst-rocker',
  SWITCH: 'spst-rocker',
  BUZZER: 'active-buzzer',
  RESISTOR: 'resistor-axial',
  CAPACITOR: 'capacitor-ceramic',
  INDUCTOR: 'inductor-shielded',
  DIODE: '1n4148-axial',
  // 信号源与单片机
  CLOCK: 'clock-source-square',
  MCU51: 'stc89c52rc-dip40',
  STM32: 'blue-pill-stm32',
};

export interface PartSvgAssets {
  slug: string;
  small: string;
  large: string;
  canvasLarge: string;
  largeWidth: number;
  largeHeight: number;
  largePins: SvgPinAnchor[];
}

const ASSET_META = new Map<string, SvgAssetMeta>(
  Object.entries(ASSETS).map(([slug, asset]) => [
    slug,
    { ...parseLargeSvg(asset.large), canvasLarge: stripReference(asset.large) },
  ]),
);

export function partSvgAssets(type: string): PartSvgAssets | undefined {
  const slug = PART_ASSET_SLUG[type];
  const asset = slug ? ASSETS[slug] : undefined;
  const meta = slug ? ASSET_META.get(slug) : undefined;
  return slug && asset && meta ? { slug, ...asset, ...meta } : undefined;
}
