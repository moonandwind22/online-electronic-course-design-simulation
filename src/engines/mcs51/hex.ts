export interface HexImage {
  ok: boolean;
  error?: string;
  data: Uint8Array;
  size: number;
  min: number;
  max: number;
  crc32: string;
  entry: number;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

export function crc32(bytes: Uint8Array): string {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return ((crc ^ 0xffffffff) >>> 0).toString(16).toUpperCase().padStart(8, '0');
}

/** 解析 Intel HEX，支持 00/01/02/03/04/05 记录与校验和验证。 */
export function parseIntelHex(text: string): HexImage {
  const data = new Uint8Array(65536);
  const written = new Uint8Array(65536);
  let size = 0;
  let min = 0xffff;
  let max = 0;
  let entry = 0;
  let base = 0;
  let eof = false;
  let error: string | undefined;

  const lines = text.split(/\r?\n/);
  for (let ln = 0; ln < lines.length; ln++) {
    const raw = lines[ln].trim();
    if (!raw) continue;
    if (!raw.startsWith(':')) {
      error = `第 ${ln + 1} 行不是 Intel HEX 记录（缺少冒号）`;
      break;
    }
    const hex = raw.slice(1);
    if (hex.length < 10 || hex.length % 2 !== 0) {
      error = `第 ${ln + 1} 行长度错误`;
      break;
    }
    const bytes: number[] = [];
    for (let i = 0; i < hex.length; i += 2) {
      const v = parseInt(hex.slice(i, i + 2), 16);
      if (Number.isNaN(v)) {
        error = `第 ${ln + 1} 行包含非法十六进制字符`;
        break;
      }
      bytes.push(v);
    }
    if (error) break;
    const count = bytes[0];
    if (bytes.length !== count + 5) {
      error = `第 ${ln + 1} 行长度与计数不符`;
      break;
    }
    let sum = 0;
    for (const b of bytes) sum = (sum + b) & 0xff;
    if (sum !== 0) {
      error = `第 ${ln + 1} 行校验和错误`;
      break;
    }
    const addr = (bytes[1] << 8) | bytes[2];
    const type = bytes[3];
    const payload = bytes.slice(4, 4 + count);

    if (type === 0x00) {
      for (let i = 0; i < payload.length; i++) {
        const target = (base + addr + i) & 0xffff;
        if (base + addr + i > 0xffff) {
          error = `第 ${ln + 1} 行地址超出 64 KB`;
          break;
        }
        if (!written[target]) size++;
        written[target] = 1;
        data[target] = payload[i];
        if (target < min) min = target;
        if (target > max) max = target;
      }
      if (error) break;
    } else if (type === 0x01) {
      eof = true;
      break;
    } else if (type === 0x02) {
      if (payload.length !== 2) {
        error = `第 ${ln + 1} 行扩展段地址长度错误`;
        break;
      }
      base = ((payload[0] << 8) | payload[1]) << 4;
    } else if (type === 0x04) {
      if (payload.length !== 2) {
        error = `第 ${ln + 1} 行扩展线性地址长度错误`;
        break;
      }
      base = ((payload[0] << 8) | payload[1]) << 16;
    } else if (type === 0x03 || type === 0x05) {
      if (payload.length !== 4) {
        error = `第 ${ln + 1} 行入口地址长度错误`;
        break;
      }
      entry = ((payload[0] << 8) | payload[1]) * 0x10000 + ((payload[2] << 8) | payload[3]);
    } else {
      error = `第 ${ln + 1} 行记录类型 0x${type.toString(16)} 不受支持`;
      break;
    }
  }

  if (!error && size === 0) error = 'HEX 文件中没有数据记录';
  if (!error && !eof) error = 'HEX 文件缺少结束记录（:00000001FF）';
  if (min > max) {
    min = 0;
    max = 0;
  }
  return {
    ok: !error,
    error,
    data,
    size,
    min,
    max,
    crc32: crc32(data),
    entry,
  };
}
