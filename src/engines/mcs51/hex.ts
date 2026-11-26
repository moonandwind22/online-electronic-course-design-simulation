export interface HexParseResult {
  bytes: Uint8Array;
  size: number;
  minAddress: number;
  maxAddress: number;
  errors: string[];
}

/** 解析 Intel HEX（支持 00/01/02/04/05 记录与校验和）。 */
export function parseIntelHex(text: string): HexParseResult {
  const image = new Uint8Array(0x10000);
  const errors: string[] = [];
  let base = 0;
  let minAddress = 0xffff;
  let maxAddress = -1;
  let size = 0;
  let eof = false;

  const lines = text.split(/\r?\n/);
  for (let lineNo = 0; lineNo < lines.length; lineNo += 1) {
    const line = lines[lineNo].trim();
    if (!line) continue;
    if (!line.startsWith(':')) {
      errors.push(`第 ${lineNo + 1} 行不是 Intel HEX 记录`);
      continue;
    }
    const raw = line.slice(1);
    if (raw.length < 10 || raw.length % 2 !== 0) {
      errors.push(`第 ${lineNo + 1} 行长度非法`);
      continue;
    }
    const bytes: number[] = [];
    for (let i = 0; i < raw.length; i += 2) {
      const v = Number.parseInt(raw.slice(i, i + 2), 16);
      if (Number.isNaN(v)) {
        errors.push(`第 ${lineNo + 1} 行包含非十六进制字符`);
        break;
      }
      bytes.push(v);
    }
    if (bytes.length < 5) continue;
    const count = bytes[0];
    if (bytes.length !== count + 5) {
      errors.push(`第 ${lineNo + 1} 行长度与字节数不一致`);
      continue;
    }
    const sum = bytes.reduce((a, b) => a + b, 0) & 0xff;
    if (sum !== 0) {
      errors.push(`第 ${lineNo + 1} 行校验和错误`);
      continue;
    }
    const address = (bytes[1] << 8) | bytes[2];
    const type = bytes[3];
    const data = bytes.slice(4, 4 + count);
    if (type === 0x00) {
      for (let i = 0; i < data.length; i += 1) {
        const addr = (base + address + i) & 0xffff;
        image[addr] = data[i];
        minAddress = Math.min(minAddress, addr);
        maxAddress = Math.max(maxAddress, addr);
      }
      size += data.length;
    } else if (type === 0x01) {
      eof = true;
      break;
    } else if (type === 0x02) {
      base = ((data[0] << 8) | data[1]) << 4;
    } else if (type === 0x04) {
      base = (((data[0] << 8) | data[1]) << 16) >>> 0;
      if (base > 0xffff) errors.push('代码地址超出 64 KB，51 内核无法加载');
    } else if (type === 0x03 || type === 0x05) {
      // 启动地址记录，忽略
    } else {
      errors.push(`第 ${lineNo + 1} 行使用未知记录类型 0x${type.toString(16)}`);
    }
  }

  if (!eof) errors.push('缺少 EOF 记录（:00000001FF）');
  if (minAddress === 0xffff) minAddress = 0;
  if (maxAddress < 0) maxAddress = 0;
  return { bytes: image, size, minAddress, maxAddress, errors };
}
