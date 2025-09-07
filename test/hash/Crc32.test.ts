import { describe, it, expect } from "vitest";
import { Crc32 } from "../../src";
import type { HashInterface } from "../../src";
import type { Checksum32Interface } from "../../src";

const te = new TextEncoder();
const b = (s: string) => te.encode(s);

function randomBytes(len: number): Uint8Array {
    const out = new Uint8Array(len);
    if (len === 0) return out;
    const g: any = globalThis as any;
    if (g.crypto?.getRandomValues) {
        g.crypto.getRandomValues(out);
    } else {
        for (let i = 0; i < len; i++) out[i] = (Math.random() * 256) | 0;
    }
    return out;
}

/**
 * Reference CRC-32 (refin/refout=true) using the *reflected* polynomial 0xEDB88320.
 * This mirrors typical "builtin" CRC-32 implementations.
 */
function crc32BuiltinLike(data: Uint8Array): number {
    let crc = 0xFFFFFFFF >>> 0;
    const POLY_REFLECTED = 0xEDB88320 >>> 0;

    for (let i = 0; i < data.length; i++) {
        crc ^= data[i];
        for (let j = 0; j < 8; j++) {
            const lsb = crc & 1;
            crc >>>= 1;
            if (lsb) crc ^= POLY_REFLECTED;
        }
    }
    return (~crc) >>> 0;
}

describe("Crc32 (ISO-HDLC)", () => {
    it("implements interfaces (compile-time check)", () => {
        const a: HashInterface = new Crc32();
        const b2: Checksum32Interface = a; // same instance should satisfy both
        expect(typeof a.compute).toBe("function");
        expect(typeof b2.compute).toBe("function");
    });

    it("empty is zero", () => {
        const crc = new Crc32();
        expect(crc.compute(b(""))).toBe(0x00000000);
    });

    it('known vector "123456789"', () => {
        const crc = new Crc32();
        expect(crc.compute(b("123456789"))).toBe(0xCBF43926);
    });

    it("deterministic and in 32-bit range", () => {
        const crc = new Crc32();
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
            new Uint8Array([0xFF, 0xFF, 0xFF, 0xFF]),
            randomBytes(17),
            randomBytes(1024),
        ];

        for (const data of inputs) {
            const x = crc.compute(data);
            const y = crc.compute(data);
            expect(x).toBe(y);
            expect(Number.isInteger(x)).toBe(true);
            expect(x).toBeGreaterThanOrEqual(0);
            expect(x).toBeLessThanOrEqual(0xFFFFFFFF);
        }
    });

    it("different inputs usually differ", () => {
        const crc = new Crc32();
        expect(crc.compute(b("foo"))).not.toBe(crc.compute(b("bar")));
        expect(crc.compute(b("foo"))).not.toBe(crc.compute(b("foo ")));
        expect(crc.compute(b("foo"))).not.toBe(crc.compute(b("foO")));
    });

    it("matches builtin-style/reference implementation", () => {
        const crc = new Crc32();
        const inputs: Uint8Array[] = [
            b(""),
            b("123456789"),
            b("hello world"),
            randomBytes(64),
        ];

        for (const data of inputs) {
            const expected = crc32BuiltinLike(data);
            const actual = crc.compute(data);
            expect(actual).toBe(expected);
        }
    });
});
