import { parseIntelHex } from './hex';

// ---------- SFR 与位地址 ----------

const SFR_P0 = 0x80;
const SFR_SP = 0x81;
const SFR_DPL = 0x82;
const SFR_DPH = 0x83;
const SFR_TCON = 0x88;
const SFR_TMOD = 0x89;
const SFR_TL0 = 0x8a;
const SFR_TL1 = 0x8b;
const SFR_TH0 = 0x8c;
const SFR_TH1 = 0x8d;
const SFR_P1 = 0x90;
const SFR_SCON = 0x98;
const SFR_SBUF = 0x99;
const SFR_P2 = 0xa0;
const SFR_IE = 0xa8;
const SFR_P3 = 0xb0;
const SFR_IP = 0xb8;
const SFR_PSW = 0xd0;
const SFR_ACC = 0xe0;
const SFR_B = 0xf0;

const PORT_ADDRS = [SFR_P0, SFR_P1, SFR_P2, SFR_P3];

const IE_EA = 0x80;
const IE_ET0 = 0x02;
const IE_ET1 = 0x08;
const IE_ES = 0x10;
const IE_EX0 = 0x01;
const IE_EX1 = 0x04;

const TCON_TR0 = 0x10;
const TCON_TF0 = 0x20;
const TCON_TR1 = 0x40;
const TCON_TF1 = 0x80;
const TCON_IE0 = 0x02;
const TCON_IE1 = 0x08;

const SCON_RI = 0x01;
const SCON_TI = 0x02;

export interface Mcs51Snapshot {
  pc: number;
  a: number;
  b: number;
  psw: number;
  sp: number;
  dptr: number;
  cycles: number;
  latches: [number, number, number, number];
  pins: [number, number, number, number];
  codeSize: number;
  unsupported: number[];
  uartTx: number;
}

const bit = (v: number, n: number): number => (v >> n) & 1;

export class Mcs51 {
  private ram = new Uint8Array(0x100);
  private sfr = new Uint8Array(0x80);
  private code: Uint8Array = new Uint8Array(0x10000);
  private xram = new Uint8Array(0x10000);
  private portPins: [number, number, number, number] = [0xff, 0xff, 0xff, 0xff];
  private pc = 0;
  private cycles = 0;
  private inIsr = false;
  private txBuffer: number[] = [];
  private rxByte = 0;
  private unsupported = new Set<number>();
  private codeSize = 0;

  constructor(hexText?: string | null) {
    this.reset();
    if (hexText) this.loadHex(hexText);
  }

  reset(): void {
    this.ram.fill(0);
    this.sfr.fill(0);
    this.pc = 0;
    this.cycles = 0;
    this.inIsr = false;
    this.txBuffer = [];
    this.rxByte = 0;
    this.portPins = [0xff, 0xff, 0xff, 0xff];
    this.unsupported.clear();
    this.writeSfr(SFR_SP, 0x07);
    for (const addr of PORT_ADDRS) this.writeSfr(addr, 0xff);
  }

  loadHex(text: string): { size: number; errors: string[] } {
    const parsed = parseIntelHex(text);
    this.code = parsed.bytes;
    this.codeSize = parsed.size;
    this.pc = 0;
    this.cycles = 0;
    this.inIsr = false;
    return { size: parsed.size, errors: parsed.errors };
  }

  loadBytes(bytes: Uint8Array): void {
    this.code.fill(0);
    this.code.set(bytes.slice(0, this.code.length));
    this.codeSize = Math.min(bytes.length, this.code.length);
    this.pc = 0;
    this.cycles = 0;
  }

  setPortPins(port: number, bits: number): void {
    if (port >= 0 && port < 4) this.portPins[port] = bits & 0xff;
  }

  portLatch(port: number): number {
    return this.sfr[(PORT_ADDRS[port] - 0x80) | 0];
  }

  receiveByte(value: number): void {
    this.rxByte = value & 0xff;
    this.writeSfr(SFR_SCON, this.readSfr(SFR_SCON) | SCON_RI);
  }

  takeTxBytes(): number[] {
    const out = this.txBuffer;
    this.txBuffer = [];
    return out;
  }

  get cycleCount(): number {
    return this.cycles;
  }

  run(cyclesBudget: number): number {
    let used = 0;
    while (used < cyclesBudget) {
      const cycles = this.step();
      used += cycles;
      this.advanceTimers(cycles);
      this.serviceInterrupts();
    }
    this.cycles += used;
    return used;
  }

  snapshot(): Mcs51Snapshot {
    return {
      pc: this.pc,
      a: this.readSfr(SFR_ACC),
      b: this.readSfr(SFR_B),
      psw: this.readSfr(SFR_PSW),
      sp: this.readSfr(SFR_SP),
      dptr: (this.readSfr(SFR_DPH) << 8) | this.readSfr(SFR_DPL),
      cycles: this.cycles,
      latches: [
        this.portLatch(0),
        this.portLatch(1),
        this.portLatch(2),
        this.portLatch(3),
      ],
      pins: [...this.portPins] as [number, number, number, number],
      codeSize: this.codeSize,
      unsupported: [...this.unsupported].slice(0, 8),
      uartTx: this.txBuffer.length,
    };
  }

  // ---------- 存储与 SFR ----------

  private readSfr(addr: number): number {
    if (addr === SFR_PSW) {
      const stored = this.sfr[SFR_PSW - 0x80];
      return ((stored & 0xfe) | parity(this.readSfr(SFR_ACC))) & 0xff;
    }
    if (addr === SFR_SBUF) return this.rxByte;
    const idx = addr - 0x80;
    if (idx < 0 || idx >= 0x80) return 0;
    if (PORT_ADDRS.includes(addr)) {
      const port = PORT_ADDRS.indexOf(addr);
      return this.sfr[idx] & this.portPins[port];
    }
    return this.sfr[idx];
  }

  private writeSfr(addr: number, value: number): void {
    const v = value & 0xff;
    if (addr === SFR_PSW) {
      this.sfr[SFR_PSW - 0x80] = v & 0xfe;
      return;
    }
    if (addr === SFR_SBUF) {
      this.txBuffer.push(v);
      const scon = this.readSfr(SFR_SCON);
      this.sfr[SFR_SCON - 0x80] = scon | SCON_TI;
      return;
    }
    const idx = addr - 0x80;
    if (idx < 0 || idx >= 0x80) return;
    if (PORT_ADDRS.includes(addr)) {
      this.sfr[idx] = v;
      return;
    }
    this.sfr[idx] = v;
  }

  private readDirect(addr: number): number {
    return addr < 0x80 ? this.ram[addr & 0xff] : this.readSfr(addr);
  }

  private writeDirect(addr: number, value: number): void {
    if (addr < 0x80) this.ram[addr & 0xff] = value & 0xff;
    else this.writeSfr(addr, value);
  }

  private readBit(bitAddr: number): number {
    if (bitAddr < 0x80) {
      return bit(this.ram[(bitAddr >> 3) & 0x0f], bitAddr & 7);
    }
    const sfrAddr = bitAddr & 0xf8;
    return bit(this.readSfr(sfrAddr), bitAddr & 7);
  }

  private writeBit(bitAddr: number, value: number): void {
    if (bitAddr < 0x80) {
      const byteAddr = (bitAddr >> 3) & 0x0f;
      const mask = 1 << (bitAddr & 7);
      this.ram[byteAddr] = value ? this.ram[byteAddr] | mask : this.ram[byteAddr] & ~mask;
      return;
    }
    const sfrAddr = bitAddr & 0xf8;
    const mask = 1 << (bitAddr & 7);
    const current = this.readSfr(sfrAddr);
    this.writeSfr(sfrAddr, value ? current | mask : current & ~mask);
  }

  // ---------- 寄存器与 PSW ----------

  private getA(): number {
    return this.sfr[SFR_ACC - 0x80];
  }

  private setA(v: number): void {
    this.sfr[SFR_ACC - 0x80] = v & 0xff;
  }

  private getB(): number {
    return this.sfr[SFR_B - 0x80];
  }

  private setB(v: number): void {
    this.sfr[SFR_B - 0x80] = v & 0xff;
  }

  private getCY(): number {
    return (this.sfr[SFR_PSW - 0x80] & 0x80) ? 1 : 0;
  }

  private setCY(v: number): void {
    this.sfr[SFR_PSW - 0x80] = v ? this.sfr[SFR_PSW - 0x80] | 0x80 : this.sfr[SFR_PSW - 0x80] & ~0x80;
  }

  private getAC(): number {
    return (this.sfr[SFR_PSW - 0x80] & 0x40) ? 1 : 0;
  }

  private setAC(v: number): void {
    this.sfr[SFR_PSW - 0x80] = v ? this.sfr[SFR_PSW - 0x80] | 0x40 : this.sfr[SFR_PSW - 0x80] & ~0x40;
  }

  private setOV(v: number): void {
    this.sfr[SFR_PSW - 0x80] = v ? this.sfr[SFR_PSW - 0x80] | 0x04 : this.sfr[SFR_PSW - 0x80] & ~0x04;
  }

  private getSP(): number {
    return this.readSfr(SFR_SP);
  }

  private setSP(v: number): void {
    this.writeSfr(SFR_SP, v);
  }

  private getDPTR(): number {
    return (this.readSfr(SFR_DPH) << 8) | this.readSfr(SFR_DPL);
  }

  private setDPTR(v: number): void {
    this.writeSfr(SFR_DPH, (v >> 8) & 0xff);
    this.writeSfr(SFR_DPL, v & 0xff);
  }

  private regAddr(n: number): number {
    const bank = ((this.sfr[SFR_PSW - 0x80] >> 3) & 0x03) * 8;
    return bank + n;
  }

  private getRn(n: number): number {
    return this.ram[this.regAddr(n)];
  }

  private setRn(n: number, v: number): void {
    this.ram[this.regAddr(n)] = v & 0xff;
  }

  private getRi(n: number): number {
    return this.ram[this.getRn(n)];
  }

  private setRi(n: number, v: number): void {
    this.ram[this.getRn(n)] = v & 0xff;
  }

  private push(v: number): void {
    const sp = (this.getSP() + 1) & 0xff;
    this.setSP(sp);
    this.ram[sp] = v & 0xff;
  }

  private pop(): number {
    const sp = this.getSP();
    const value = this.ram[sp];
    this.setSP((sp - 1) & 0xff);
    return value;
  }

  private push16(v: number): void {
    this.push(v & 0xff);
    this.push((v >> 8) & 0xff);
  }

  private pop16(): number {
    const hi = this.pop();
    const lo = this.pop();
    return ((hi << 8) | lo) & 0xffff;
  }

  // ---------- 取指 ----------

  private fetch(): number {
    const v = this.code[this.pc & 0xffff];
    this.pc = (this.pc + 1) & 0xffff;
    return v;
  }

  private fetch16(): number {
    const hi = this.fetch();
    const lo = this.fetch();
    return (hi << 8) | lo;
  }

  private rel(): number {
    const v = this.fetch();
    return v < 0x80 ? v : v - 256;
  }

  // ---------- 定时器与中断 ----------

  private advanceTimers(cycles: number): void {
    for (let i = 0; i < cycles; i += 1) {
      const tcon = this.readSfr(SFR_TCON);
      if (tcon & TCON_TR0) this.tickTimer(0);
      if (tcon & TCON_TR1) this.tickTimer(1);
    }
  }

  private tickTimer(index: number): void {
    const tmod = this.readSfr(SFR_TMOD);
    const mode = (tmod >> (index === 0 ? 0 : 4)) & 0x03;
    const tl = index === 0 ? SFR_TL0 : SFR_TL1;
    const th = index === 0 ? SFR_TH0 : SFR_TH1;
    const tf = index === 0 ? TCON_TF0 : TCON_TF1;
    let tcon = this.readSfr(SFR_TCON);

    if (mode === 2) {
      let v = this.readSfr(tl) + 1;
      if (v > 0xff) {
        v = this.readSfr(th);
        tcon |= tf;
      }
      this.writeSfr(tl, v & 0xff);
    } else if (mode === 0) {
      let v = ((this.readSfr(th) << 5) | (this.readSfr(tl) & 0x1f)) + 1;
      if (v > 0x1fff) {
        v &= 0x1fff;
        tcon |= tf;
      }
      this.writeSfr(th, (v >> 5) & 0xff);
      this.writeSfr(tl, v & 0x1f);
    } else {
      let v = ((this.readSfr(th) << 8) | this.readSfr(tl)) + 1;
      if (v > 0xffff) {
        v &= 0xffff;
        tcon |= tf;
      }
      this.writeSfr(th, (v >> 8) & 0xff);
      this.writeSfr(tl, v & 0xff);
    }
    this.writeSfr(SFR_TCON, tcon);
  }

  private serviceInterrupts(): void {
    if (this.inIsr) return;
    const ie = this.readSfr(SFR_IE);
    if (!(ie & IE_EA)) return;
    const tcon = this.readSfr(SFR_TCON);
    const scon = this.readSfr(SFR_SCON);
    const ip = this.readSfr(SFR_IP);

    const candidates: Array<{ vector: number; priority: number; clear: () => void; order: number }> = [];
    if (ie & IE_EX0 && tcon & TCON_IE0) {
      candidates.push({
        vector: 0x0003,
        priority: ip & 0x01 ? 1 : 0,
        order: 0,
        clear: () => this.writeSfr(SFR_TCON, this.readSfr(SFR_TCON) & ~TCON_IE0),
      });
    }
    if (ie & IE_ET0 && tcon & TCON_TF0) {
      candidates.push({
        vector: 0x000b,
        priority: ip & 0x02 ? 1 : 0,
        order: 1,
        clear: () => this.writeSfr(SFR_TCON, this.readSfr(SFR_TCON) & ~TCON_TF0),
      });
    }
    if (ie & IE_EX1 && tcon & TCON_IE1) {
      candidates.push({
        vector: 0x0013,
        priority: ip & 0x04 ? 1 : 0,
        order: 2,
        clear: () => this.writeSfr(SFR_TCON, this.readSfr(SFR_TCON) & ~TCON_IE1),
      });
    }
    if (ie & IE_ET1 && tcon & TCON_TF1) {
      candidates.push({
        vector: 0x001b,
        priority: ip & 0x08 ? 1 : 0,
        order: 3,
        clear: () => this.writeSfr(SFR_TCON, this.readSfr(SFR_TCON) & ~TCON_TF1),
      });
    }
    if (ie & IE_ES && scon & 0x03) {
      candidates.push({
        vector: 0x0023,
        priority: ip & 0x10 ? 1 : 0,
        order: 4,
        clear: () => {
          const s = this.readSfr(SFR_SCON);
          this.writeSfr(SFR_SCON, s & ~(SCON_RI | SCON_TI));
        },
      });
    }
    if (candidates.length === 0) return;
    candidates.sort((a, b) => b.priority - a.priority || a.order - b.order);
    const chosen = candidates[0];
    chosen.clear();
    this.push16(this.pc);
    this.pc = chosen.vector;
    this.inIsr = true;
  }

  // ---------- 指令 ----------

  private addToA(x: number, carryIn: number): void {
    const a = this.getA();
    const result = a + x + carryIn;
    const half = (a & 0x0f) + (x & 0x0f) + carryIn;
    const ov = (~(a ^ x) & (a ^ result) & 0x80) !== 0;
    this.setA(result & 0xff);
    this.setCY(result > 0xff ? 1 : 0);
    this.setAC(half > 0x0f ? 1 : 0);
    this.setOV(ov ? 1 : 0);
  }

  private subbFromA(x: number): void {
    const a = this.getA();
    const c = this.getCY();
    const result = a - x - c;
    const halfBorrow = (a & 0x0f) < ((x & 0x0f) + c);
    const ov = ((a ^ x) & (a ^ result) & 0x80) !== 0;
    this.setA(result & 0xff);
    this.setCY(result < 0 ? 1 : 0);
    this.setAC(halfBorrow ? 1 : 0);
    this.setOV(ov ? 1 : 0);
  }

  private step(): number {
    const op = this.fetch();
    switch (op) {
      case 0x00:
        return 1;
      // AJMP / ACALL
      case 0x01:
      case 0x21:
      case 0x41:
      case 0x61:
      case 0x81:
      case 0xa1:
      case 0xc1:
      case 0xe1: {
        const low = this.fetch();
        this.pc = ((this.pc & 0xf800) | ((op & 0xe0) << 3) | low) & 0xffff;
        return 2;
      }
      case 0x11:
      case 0x31:
      case 0x51:
      case 0x71:
      case 0x91:
      case 0xb1:
      case 0xd1:
      case 0xf1: {
        const low = this.fetch();
        const target = ((this.pc & 0xf800) | ((op & 0xe0) << 3) | low) & 0xffff;
        this.push16(this.pc);
        this.pc = target;
        return 2;
      }
      case 0x02:
        this.pc = this.fetch16();
        return 2;
      case 0x12: {
        const target = this.fetch16();
        this.push16(this.pc);
        this.pc = target;
        return 2;
      }
      case 0x22:
        this.pc = this.pop16();
        return 2;
      case 0x32:
        this.pc = this.pop16();
        this.inIsr = false;
        return 2;
      case 0x80: {
        const offset = this.rel();
        this.pc = (this.pc + offset) & 0xffff;
        return 2;
      }
      case 0x40: {
        const offset = this.rel();
        if (this.getCY()) this.pc = (this.pc + offset) & 0xffff;
        return 2;
      }
      case 0x50: {
        const offset = this.rel();
        if (!this.getCY()) this.pc = (this.pc + offset) & 0xffff;
        return 2;
      }
      case 0x60: {
        const offset = this.rel();
        if (this.getA() === 0) this.pc = (this.pc + offset) & 0xffff;
        return 2;
      }
      case 0x70: {
        const offset = this.rel();
        if (this.getA() !== 0) this.pc = (this.pc + offset) & 0xffff;
        return 2;
      }
      case 0x10: {
        const bitAddr = this.fetch();
        const offset = this.rel();
        if (this.readBit(bitAddr)) {
          this.writeBit(bitAddr, 0);
          this.pc = (this.pc + offset) & 0xffff;
        }
        return 2;
      }
      case 0x20: {
        const bitAddr = this.fetch();
        const offset = this.rel();
        if (this.readBit(bitAddr)) this.pc = (this.pc + offset) & 0xffff;
        return 2;
      }
      case 0x30: {
        const bitAddr = this.fetch();
        const offset = this.rel();
        if (!this.readBit(bitAddr)) this.pc = (this.pc + offset) & 0xffff;
        return 2;
      }
      case 0x73:
        this.pc = (this.getA() + this.getDPTR()) & 0xffff;
        return 2;
      // 条件比较与循环
      case 0xb4: {
        const x = this.fetch();
        const a = this.getA();
        this.setCY(a < x ? 1 : 0);
        const offset = this.rel();
        if (a !== x) this.pc = (this.pc + offset) & 0xffff;
        return 2;
      }
      case 0xb5: {
        const addr = this.fetch();
        const x = this.readDirect(addr);
        const a = this.getA();
        this.setCY(a < x ? 1 : 0);
        const offset = this.rel();
        if (a !== x) this.pc = (this.pc + offset) & 0xffff;
        return 2;
      }
      case 0xb6:
      case 0xb7: {
        const x = this.fetch();
        const v = this.getRi(op & 1);
        this.setCY(v < x ? 1 : 0);
        const offset = this.rel();
        if (v !== x) this.pc = (this.pc + offset) & 0xffff;
        return 2;
      }
      case 0xd5: {
        const addr = this.fetch();
        const offset = this.rel();
        const v = (this.readDirect(addr) - 1) & 0xff;
        this.writeDirect(addr, v);
        if (v !== 0) this.pc = (this.pc + offset) & 0xffff;
        return 2;
      }
      // MOV
      case 0x74:
        this.setA(this.fetch());
        return 1;
      case 0x75: {
        const addr = this.fetch();
        this.writeDirect(addr, this.fetch());
        return 2;
      }
      case 0x76:
      case 0x77:
        this.setRi(op & 1, this.fetch());
        return 1;
      case 0xe4:
        this.setA(0);
        return 1;
      case 0xf4:
        this.setA(~this.getA());
        return 1;
      case 0xe5:
        this.setA(this.readDirect(this.fetch()));
        return 1;
      case 0xe6:
      case 0xe7:
        this.setA(this.getRi(op & 1));
        return 1;
      case 0xf5:
        this.writeDirect(this.fetch(), this.getA());
        return 1;
      case 0xf6:
      case 0xf7:
        this.setRi(op & 1, this.getA());
        return 1;
      case 0x85: {
        const src = this.fetch();
        const dst = this.fetch();
        this.writeDirect(dst, this.readDirect(src));
        return 2;
      }
      case 0x86:
      case 0x87:
        this.writeDirect(this.fetch(), this.getRi(op & 1));
        return 2;
      case 0xa6:
      case 0xa7: {
        const addr = this.fetch();
        this.setRi(op & 1, this.readDirect(addr));
        return 2;
      }
      case 0x90:
        this.setDPTR(this.fetch16());
        return 2;
      case 0xa3:
        this.setDPTR((this.getDPTR() + 1) & 0xffff);
        return 2;
      case 0x83:
        this.setA(this.code[(this.pc + this.getA()) & 0xffff]);
        return 2;
      case 0x93:
        this.setA(this.code[(this.getDPTR() + this.getA()) & 0xffff]);
        return 2;
      case 0xe0: {
        const addr = this.getDPTR();
        this.setA(this.xram[addr]);
        return 2;
      }
      case 0xf0:
        this.xram[this.getDPTR()] = this.getA();
        return 2;
      case 0xe2:
      case 0xe3: {
        const addr = ((this.readSfr(SFR_P2) << 8) | this.getRi(op & 1)) & 0xffff;
        this.setA(this.xram[addr]);
        return 2;
      }
      case 0xf2:
      case 0xf3: {
        const addr = ((this.readSfr(SFR_P2) << 8) | this.getRi(op & 1)) & 0xffff;
        this.xram[addr] = this.getA();
        return 2;
      }
      case 0xc5: {
        const addr = this.fetch();
        const tmp = this.readDirect(addr);
        this.writeDirect(addr, this.getA());
        this.setA(tmp);
        return 1;
      }
      case 0xc6:
      case 0xc7: {
        const tmp = this.getRi(op & 1);
        this.setRi(op & 1, this.getA());
        this.setA(tmp);
        return 1;
      }
      case 0xd6:
      case 0xd7: {
        const v = this.getRi(op & 1);
        const a = this.getA();
        this.setRi(op & 1, (v & 0xf0) | (a & 0x0f));
        this.setA((a & 0xf0) | (v & 0x0f));
        return 1;
      }
      case 0xc0:
        this.push(this.readDirect(this.fetch()));
        return 2;
      case 0xd0:
        this.writeDirect(this.fetch(), this.pop());
        return 2;
      // 位操作
      case 0x72: {
        const b = this.readBit(this.fetch());
        this.setCY(this.getCY() | b);
        return 2;
      }
      case 0x82: {
        const b = this.readBit(this.fetch());
        this.setCY(this.getCY() & b);
        return 2;
      }
      case 0xa0: {
        const b = this.readBit(this.fetch()) ? 0 : 1;
        this.setCY(this.getCY() | b);
        return 2;
      }
      case 0xb0: {
        const b = this.readBit(this.fetch()) ? 0 : 1;
        this.setCY(this.getCY() & b);
        return 2;
      }
      case 0xa2:
        this.setCY(this.readBit(this.fetch()));
        return 1;
      case 0x92: {
        const b = this.fetch();
        this.writeBit(b, this.getCY());
        return 2;
      }
      case 0xb2: {
        const b = this.fetch();
        this.writeBit(b, this.readBit(b) ? 0 : 1);
        return 2;
      }
      case 0xb3:
        this.setCY(this.getCY() ? 0 : 1);
        return 1;
      case 0xc2:
        this.writeBit(this.fetch(), 0);
        return 1;
      case 0xc3:
        this.setCY(0);
        return 1;
      case 0xd2:
        this.writeBit(this.fetch(), 1);
        return 1;
      case 0xd3:
        this.setCY(1);
        return 1;
      // 算术
      case 0x04:
        this.setA(this.getA() + 1);
        return 1;
      case 0x05: {
        const addr = this.fetch();
        this.writeDirect(addr, this.readDirect(addr) + 1);
        return 1;
      }
      case 0x14:
        this.setA(this.getA() - 1);
        return 1;
      case 0x15: {
        const addr = this.fetch();
        this.writeDirect(addr, this.readDirect(addr) - 1);
        return 1;
      }
      case 0x24:
        this.addToA(this.fetch(), 0);
        return 1;
      case 0x25:
        this.addToA(this.readDirect(this.fetch()), 0);
        return 1;
      case 0x34:
        this.addToA(this.fetch(), this.getCY());
        return 1;
      case 0x35:
        this.addToA(this.readDirect(this.fetch()), this.getCY());
        return 1;
      case 0x94:
        this.subbFromA(this.fetch());
        return 1;
      case 0x95:
        this.subbFromA(this.readDirect(this.fetch()));
        return 1;
      case 0xa4: {
        const p = this.getA() * this.getB();
        this.setA(p & 0xff);
        this.setB((p >> 8) & 0xff);
        this.setOV((p >> 8) ? 1 : 0);
        this.setCY(0);
        return 4;
      }
      case 0x84: {
        const b = this.getB();
        if (b === 0) {
          this.setOV(1);
        } else {
          const a = this.getA();
          this.setA(Math.floor(a / b));
          this.setB(a % b);
          this.setOV(0);
        }
        this.setCY(0);
        return 4;
      }
      case 0xd4: {
        let a = this.getA();
        let cy = this.getCY();
        if ((a & 0x0f) > 9 || this.getAC()) {
          a += 0x06;
          if (a > 0xff) {
            a &= 0xff;
            cy = 1;
          }
        }
        if (((a >> 4) & 0x0f) > 9 || cy) {
          a += 0x60;
          if (a > 0xff) {
            a &= 0xff;
            cy = 1;
          }
        }
        this.setA(a & 0xff);
        this.setCY(cy);
        return 1;
      }
      // 循环移位
      case 0x03:
        this.setA(((this.getA() >> 1) | (this.getA() << 7)) & 0xff);
        return 1;
      case 0x13: {
        const cy = this.getCY();
        const a = this.getA();
        this.setA(((a >> 1) | (cy << 7)) & 0xff);
        this.setCY(a & 1);
        return 1;
      }
      case 0x23:
        this.setA(((this.getA() << 1) | (this.getA() >> 7)) & 0xff);
        return 1;
      case 0x33: {
        const cy = this.getCY();
        const a = this.getA();
        this.setA(((a << 1) | cy) & 0xff);
        this.setCY((a >> 7) & 1);
        return 1;
      }
      case 0xc4:
        this.setA(((this.getA() << 4) | (this.getA() >> 4)) & 0xff);
        return 1;
      default:
        break;
    }

    // 分组指令
    if (op >= 0x08 && op <= 0x0f) {
      this.setRn(op & 7, this.getRn(op & 7) + 1);
      return 1;
    }
    if (op >= 0x18 && op <= 0x1f) {
      this.setRn(op & 7, this.getRn(op & 7) - 1);
      return 1;
    }
    if (op === 0x06 || op === 0x07) {
      this.setRi(op & 1, this.getRi(op & 1) + 1);
      return 1;
    }
    if (op === 0x16 || op === 0x17) {
      this.setRi(op & 1, this.getRi(op & 1) - 1);
      return 1;
    }
    if (op >= 0x28 && op <= 0x2f) {
      this.addToA(this.getRn(op & 7), 0);
      return 1;
    }
    if (op >= 0x38 && op <= 0x3f) {
      this.addToA(this.getRn(op & 7), this.getCY());
      return 1;
    }
    if (op >= 0x26 && op <= 0x27) {
      this.addToA(this.getRi(op & 1), 0);
      return 1;
    }
    if (op >= 0x36 && op <= 0x37) {
      this.addToA(this.getRi(op & 1), this.getCY());
      return 1;
    }
    if (op >= 0x98 && op <= 0x9f) {
      this.subbFromA(this.getRn(op & 7));
      return 1;
    }
    if (op >= 0x96 && op <= 0x97) {
      this.subbFromA(this.getRi(op & 1));
      return 1;
    }
    if (op >= 0x48 && op <= 0x4f) {
      this.setA(this.getA() | this.getRn(op & 7));
      return 1;
    }
    if (op >= 0x58 && op <= 0x5f) {
      this.setA(this.getA() & this.getRn(op & 7));
      return 1;
    }
    if (op >= 0x68 && op <= 0x6f) {
      this.setA(this.getA() ^ this.getRn(op & 7));
      return 1;
    }
    if (op >= 0x78 && op <= 0x7f) {
      this.setRn(op & 7, this.fetch());
      return 1;
    }
    if (op >= 0x88 && op <= 0x8f) {
      this.writeDirect(this.fetch(), this.getRn(op & 7));
      return 2;
    }
    if (op >= 0xa8 && op <= 0xaf) {
      this.setRn(op & 7, this.readDirect(this.fetch()));
      return 2;
    }
    if (op >= 0xb8 && op <= 0xbf) {
      const x = this.fetch();
      const v = this.getRn(op & 7);
      this.setCY(v < x ? 1 : 0);
      const offset = this.rel();
      if (v !== x) this.pc = (this.pc + offset) & 0xffff;
      return 2;
    }
    if (op >= 0xc8 && op <= 0xcf) {
      const n = op & 7;
      const tmp = this.getRn(n);
      this.setRn(n, this.getA());
      this.setA(tmp);
      return 1;
    }
    if (op >= 0xd8 && op <= 0xdf) {
      const n = op & 7;
      const offset = this.rel();
      const v = (this.getRn(n) - 1) & 0xff;
      this.setRn(n, v);
      if (v !== 0) this.pc = (this.pc + offset) & 0xffff;
      return 2;
    }
    if (op >= 0xe8 && op <= 0xef) {
      this.setA(this.getRn(op & 7));
      return 1;
    }
    if (op >= 0xf8 && op <= 0xff) {
      this.setRn(op & 7, this.getA());
      return 1;
    }
    if (op >= 0x44 && op <= 0x47) {
      const operand = op === 0x44 ? this.fetch() : op === 0x45 ? this.readDirect(this.fetch()) : this.getRi(op & 1);
      this.setA(this.getA() | operand);
      return 1;
    }
    if (op >= 0x54 && op <= 0x57) {
      const operand = op === 0x54 ? this.fetch() : op === 0x55 ? this.readDirect(this.fetch()) : this.getRi(op & 1);
      this.setA(this.getA() & operand);
      return 1;
    }
    if (op >= 0x64 && op <= 0x67) {
      const operand = op === 0x64 ? this.fetch() : op === 0x65 ? this.readDirect(this.fetch()) : this.getRi(op & 1);
      this.setA(this.getA() ^ operand);
      return 1;
    }
    if (op >= 0x42 && op <= 0x43) {
      const addr = this.fetch();
      const operand = op === 0x42 ? this.getA() : this.fetch();
      this.writeDirect(addr, this.readDirect(addr) | operand);
      return 2;
    }
    if (op >= 0x52 && op <= 0x53) {
      const addr = this.fetch();
      const operand = op === 0x52 ? this.getA() : this.fetch();
      this.writeDirect(addr, this.readDirect(addr) & operand);
      return 2;
    }
    if (op >= 0x62 && op <= 0x63) {
      const addr = this.fetch();
      const operand = op === 0x62 ? this.getA() : this.fetch();
      this.writeDirect(addr, this.readDirect(addr) ^ operand);
      return 2;
    }

    this.unsupported.add(op);
    return 1;
  }
}

function parity(value: number): number {
  let v = value & 0xff;
  let p = 0;
  while (v) {
    p ^= 1;
    v &= v - 1;
  }
  return p;
}
