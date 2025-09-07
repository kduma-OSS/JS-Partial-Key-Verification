import { describe, it, expect } from "vitest";
import { Jenkins06 } from "../../src";
import type { HashInterface } from "../../src";

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

/* ---------- Local reference implementations (mirror the PHP tests) ---------- */

function rot(x: number, k: number): number {
    x = x >>> 0;
    return (((x << k) >>> 0) | (x >>> (32 - k))) >>> 0;
}

function finalMix(a: number, b: number, c: number): [number, number, number] {
    c ^= b; c = (c - rot(b, 14)) >>> 0;
    a ^= c; a = (a - rot(c, 11)) >>> 0;
    b ^= a; b = (b - rot(a, 25)) >>> 0;
    c ^= b; c = (c - rot(b, 16)) >>> 0;
    a ^= c; a = (a - rot(c, 4 )) >>> 0;
    b ^= a; b = (b - rot(a, 14)) >>> 0;
    c ^= b; c = (c - rot(b, 24)) >>> 0;
    return [a >>> 0, b >>> 0, c >>> 0];
}

function mix(a: number, b: number, c: number): [number, number, number] {
    a = (a - c) >>> 0; a ^= rot(c, 4 ); c = (c + b) >>> 0;
    b = (b - a) >>> 0; b ^= rot(a, 6 ); a = (a + c) >>> 0;
    c = (c - b) >>> 0; c ^= rot(b, 8 ); b = (b + a) >>> 0;
    a = (a - c) >>> 0; a ^= rot(c, 16); c = (c + b) >>> 0;
    b = (b - a) >>> 0; b ^= rot(a, 19); a = (a + c) >>> 0;
    c = (c - b) >>> 0; c ^= rot(b, 4 ); b = (b + a) >>> 0;
    return [a >>> 0, b >>> 0, c >>> 0];
}

/** Mirrors class behavior exactly (returns c immediately when tail length==0). */
function refJenkins06(data: Uint8Array, seed: number): number {
    seed = (seed >>> 0) & 0xFFFFFFFF;
    let length = data.length >>> 0;
    let a = (0xDEADBEEF + length + seed) >>> 0;
    let b = a >>> 0;
    let c = a >>> 0;

    let offset = 0;
    let remaining = length;
    while (remaining > 12) {
        a = (a + (data[offset++]       )) >>> 0;
        a = (a + ((data[offset++] << 8)  >>> 0)) >>> 0;
        a = (a + ((data[offset++] << 16) >>> 0)) >>> 0;
        a = (a + ((data[offset++] << 24) >>> 0)) >>> 0;

        b = (b + (data[offset++]       )) >>> 0;
        b = (b + ((data[offset++] << 8)  >>> 0)) >>> 0;
        b = (b + ((data[offset++] << 16) >>> 0)) >>> 0;
        b = (b + ((data[offset++] << 24) >>> 0)) >>> 0;

        c = (c + (data[offset++]       )) >>> 0;
        c = (c + ((data[offset++] << 8)  >>> 0)) >>> 0;
        c = (c + ((data[offset++] << 16) >>> 0)) >>> 0;
        c = (c + ((data[offset++] << 24) >>> 0)) >>> 0;

        [a, b, c] = mix(a, b, c);
        remaining -= 12;
    }

    switch (remaining) {
        case 12: c = (c + ((data[offset + 11] << 24) >>> 0)) >>> 0;
        case 11: c = (c + ((data[offset + 10] << 16) >>> 0)) >>> 0;
        case 10: c = (c + ((data[offset + 9]  << 8)  >>> 0)) >>> 0;
        case 9:  c = (c +  (data[offset + 8]        )) >>> 0;
        case 8:  b = (b + ((data[offset + 7]  << 24) >>> 0)) >>> 0;
        case 7:  b = (b + ((data[offset + 6]  << 16) >>> 0)) >>> 0;
        case 6:  b = (b + ((data[offset + 5]  << 8)  >>> 0)) >>> 0;
        case 5:  b = (b +  (data[offset + 4]        )) >>> 0;
        case 4:  a = (a + ((data[offset + 3]  << 24) >>> 0)) >>> 0;
        case 3:  a = (a + ((data[offset + 2]  << 16) >>> 0)) >>> 0;
        case 2:  a = (a + ((data[offset + 1]  << 8)  >>> 0)) >>> 0;
        case 1:  a = (a +  (data[offset + 0]        )) >>> 0;
        case 0:  break;
    }

    if (remaining === 0) {
        return c >>> 0;
    }

    [a, b, c] = finalMix(a, b, c);
    return c >>> 0;
}

/** Correct variant that ALWAYS applies finalMix (for comparison only). */
function refJenkins06AlwaysFinal(data: Uint8Array, seed: number): number {
    seed = (seed >>> 0) & 0xFFFFFFFF;
    let length = data.length >>> 0;
    let a = (0xDEADBEEF + length + seed) >>> 0;
    let b = a >>> 0;
    let c = a >>> 0;

    let offset = 0;
    let remaining = length;
    while (remaining > 12) {
        a = (a + (data[offset++]       )) >>> 0;
        a = (a + ((data[offset++] << 8)  >>> 0)) >>> 0;
        a = (a + ((data[offset++] << 16) >>> 0)) >>> 0;
        a = (a + ((data[offset++] << 24) >>> 0)) >>> 0;

        b = (b + (data[offset++]       )) >>> 0;
        b = (b + ((data[offset++] << 8)  >>> 0)) >>> 0;
        b = (b + ((data[offset++] << 16) >>> 0)) >>> 0;
        b = (b + ((data[offset++] << 24) >>> 0)) >>> 0;

        c = (c + (data[offset++]       )) >>> 0;
        c = (c + ((data[offset++] << 8)  >>> 0)) >>> 0;
        c = (c + ((data[offset++] << 16) >>> 0)) >>> 0;
        c = (c + ((data[offset++] << 24) >>> 0)) >>> 0;

        [a, b, c] = mix(a, b, c);
        remaining -= 12;
    }

    switch (remaining) {
        case 12: c = (c + ((data[offset + 11] << 24) >>> 0)) >>> 0;
        case 11: c = (c + ((data[offset + 10] << 16) >>> 0)) >>> 0;
        case 10: c = (c + ((data[offset + 9]  << 8)  >>> 0)) >>> 0;
        case 9:  c = (c +  (data[offset + 8]        )) >>> 0;
        case 8:  b = (b + ((data[offset + 7]  << 24) >>> 0)) >>> 0;
        case 7:  b = (b + ((data[offset + 6]  << 16) >>> 0)) >>> 0;
        case 6:  b = (b + ((data[offset + 5]  << 8)  >>> 0)) >>> 0;
        case 5:  b = (b +  (data[offset + 4]        )) >>> 0;
        case 4:  a = (a + ((data[offset + 3]  << 24) >>> 0)) >>> 0;
        case 3:  a = (a + ((data[offset + 2]  << 16) >>> 0)) >>> 0;
        case 2:  a = (a + ((data[offset + 1]  << 8)  >>> 0)) >>> 0;
        case 1:  a = (a +  (data[offset + 0]        )) >>> 0;
        case 0:  break;
    }

    [a, b, c] = finalMix(a, b, c);
    return c >>> 0;
}

/* --------------------------------- Tests ---------------------------------- */

describe("Jenkins06 (lookup3 style)", () => {
    it("implements interface (compile-time check)", () => {
        const h: HashInterface = new Jenkins06(0);
        expect(typeof h.compute).toBe("function");
    });

    it("deterministic and in 32-bit range with various seeds", () => {
        const seeds = [0, 1, 0xDEADBEEF, 123456789];
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

        for (const seed of seeds) {
            const h = new Jenkins06(seed);
            for (const data of inputs) {
                const a = h.compute(data);
                const c = h.compute(data);
                expect(a).toBe(c); // deterministic
                expect(Number.isInteger(a)).toBe(true);
                expect(a).toBeGreaterThanOrEqual(0);
                expect(a).toBeLessThanOrEqual(0xFFFFFFFF);
            }
        }
    });

    it("seed affects output", () => {
        const data = b("hello world");
        const h0 = new Jenkins06(0);
        const h1 = new Jenkins06(1);
        expect(h0.compute(data)).not.toBe(h1.compute(data));
    });

    it("matches reference implementation", () => {
        const seeds = [0, 1, 0xDEADBEEF >>> 0, 0xFEEDFACE >>> 0];
        const inputs: Uint8Array[] = [
            b(""),
            b("a"),
            b("abc"),
            b("123456789"),
            b("hello world"),
            randomBytes(5),
            randomBytes(13),
            randomBytes(29),
        ];

        for (const seed of seeds) {
            for (const data of inputs) {
                const expected = refJenkins06(data, seed);
                const actual = new Jenkins06(seed).compute(data);
                expect(actual).toBe(expected);
            }
        }
    });

    // Optional: "always final mix" comparison (skipped by default in PHP)
    // You can enable this to verify the difference in behavior.
    // it("final mix applied for multiples of 12 (comparison test)", () => {
    //   const seeds = [0, 1, 0xDEADBEEF >>> 0, 0xFEEDFACE >>> 0];
    //   const cases: Uint8Array[] = [
    //     b(""),
    //     new Uint8Array(Array(12).fill("A".charCodeAt(0))),
    //     randomBytes(24),
    //     randomBytes(36),
    //   ];
    //   for (const seed of seeds) {
    //     for (const data of cases) {
    //       const expected = refJenkins06AlwaysFinal(data, seed);
    //       const actual = new Jenkins06(seed).compute(data);
    //       expect(actual).toBe(expected);
    //     }
    //   }
    // });
});