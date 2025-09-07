import { describe, it, expect } from "vitest";
import { CrcCcitt } from "../../src";
import type { Checksum16Interface } from "../../src";

const te = new TextEncoder();
const b = (s: string) => te.encode(s);

function randomBytes(len: number): Uint8Array {
    const out = new Uint8Array(len);
    if (len === 0) return out;
    const g: any = globalThis as any;
    if (g.crypto?.getRandomValues) g.crypto.getRandomValues(out);
    else for (let i = 0; i < len; i++) out[i] = (Math.random() * 256) | 0;
    return out;
}

/* --------- Local reference implementation (mirrors class exactly) --------- */

let _table: Uint16Array | null = null;
function table(): Uint16Array {
    if (_table) return _table;
    const t = new Uint16Array(256);
    const TOPBIT = 1 << 15;
    const POLY = 0x1021;
    for (let dividend = 0; dividend < 256; dividend++) {
        let remainder = ((dividend << 8) & 0xffff) >>> 0;
        for (let bit = 8; bit > 0; bit--) {
            if ((remainder & TOPBIT) !== 0) {
                remainder = (((remainder << 1) & 0xffff) ^ POLY) & 0xffff;
            } else {
                remainder = (remainder << 1) & 0xffff;
            }
        }
        t[dividend] = remainder & 0xffff;
    }
    _table = t;
    return t;
}

function refCrcCcittFalse(data: Uint8Array): number {
    let remainder = 0xFFFF;
    const tbl = table();

    for (let i = 0; i < data.length; i++) {
        const byte = data[i] & 0xff;
        const index = (byte ^ ((remainder >>> 8) & 0xff)) & 0xff;
        remainder = (tbl[index] ^ ((remainder << 8) & 0xffff)) & 0xffff;
    }

    return remainder & 0xffff;
}

/* ----------------------------------- Tests ----------------------------------- */

describe("CrcCcitt (CRC-CCITT False)", () => {
    it("implements interface (compile-time check)", () => {
        const crc: Checksum16Interface = new CrcCcitt();
        expect(typeof crc.compute).toBe("function");
    });

    it("empty is 0xFFFF", () => {
        const crc = new CrcCcitt();
        expect(crc.compute(b(""))).toBe(0xFFFF);
    });

    it('known vector "123456789" → 0x29B1', () => {
        const crc = new CrcCcitt();
        expect(crc.compute(b("123456789"))).toBe(0x29B1);
    });

    it("deterministic and in 16-bit range", () => {
        const crc = new CrcCcitt();
        const inputs: Uint8Array[] = [
            b(""),
            b("a"),
            b("abc"),
            b("message digest"),
            b("ABCDEFGHIJKLMNOPQRSTUVWXYZ"),
            b("abcdefghijklmnopqrstuvwxyz"),
            b("1234567890"),
            b("The quick brown fox jumps over the lazy dog"),
            new Uint8Array([0x00, 0x00, 0x00, 0x00]),
            new Uint8Array([0xff, 0xff, 0xff, 0xff]),
            randomBytes(17),
            randomBytes(1024),
        ];

        for (const data of inputs) {
            const a = crc.compute(data);
            const c = crc.compute(data);
            expect(a).toBe(c); // deterministic
            expect(Number.isInteger(a)).toBe(true);
            expect(a).toBeGreaterThanOrEqual(0);
            expect(a).toBeLessThanOrEqual(0xFFFF);
        }
    });

    it("matches reference implementation", () => {
        const crc = new CrcCcitt();
        const inputs: Uint8Array[] = [
            b(""),
            b("a"),
            b("abc"),
            b("message digest"),
            b("ABCDEFGHIJKLMNOPQRSTUVWXYZ"),
            b("abcdefghijklmnopqrstuvwxyz"),
            b("1234567890"),
            b("The quick brown fox jumps over the lazy dog"),
            new Uint8Array([0x00, 0x00, 0x00, 0x00]),
            new Uint8Array([0xff, 0xff, 0xff, 0xff]),
            randomBytes(17),
            randomBytes(1024),
        ];

        for (const data of inputs) {
            const expected = refCrcCcittFalse(data);
            const actual = crc.compute(data);
            expect(actual).toBe(expected);
        }
    });

    it("sensitivity to changes", () => {
        const crc = new CrcCcitt();
        expect(crc.compute(b("foo"))).not.toBe(crc.compute(b("bar")));
        expect(crc.compute(b("foo"))).not.toBe(crc.compute(b("foo ")));
        expect(crc.compute(b("foo"))).not.toBe(crc.compute(b("foO")));
    });
});
