import { describe, it, expect } from "vitest";
import { Jenkins96 } from "../../src";
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

/* ---------------- Local reference (mirrors PHP exactly) ---------------- */

function mix(a: number, b: number, c: number): [number, number, number] {
    a = (a - b - c) >>> 0; a ^= (c >>> 13);
    b = (b - c - a) >>> 0; b ^= ((a << 8)  >>> 0);
    c = (c - a - b) >>> 0; c ^= (b >>> 13);
    a = (a - b - c) >>> 0; a ^= (c >>> 12);
    b = (b - c - a) >>> 0; b ^= ((a << 16) >>> 0);
    c = (c - a - b) >>> 0; c ^= (b >>> 5);
    a = (a - b - c) >>> 0; a ^= (c >>> 3);
    b = (b - c - a) >>> 0; b ^= ((a << 10) >>> 0);
    c = (c - a - b) >>> 0; c ^= (b >>> 15);
    return [a >>> 0, b >>> 0, c >>> 0];
}

function refJenkins96(data: Uint8Array): number {
    const len = data.length >>> 0;
    let a = 0x9E3779B9 >>> 0;
    let b = 0x9E3779B9 >>> 0;
    let c = 0 >>> 0;

    let i = 0;
    while (i + 12 <= len) {
        a = (a + (data[i++] & 0xff)) >>> 0;
        a = (a + (((data[i++] & 0xff) << 8)  >>> 0)) >>> 0;
        a = (a + (((data[i++] & 0xff) << 16) >>> 0)) >>> 0;
        a = (a + (((data[i++] & 0xff) << 24) >>> 0)) >>> 0;

        b = (b + (data[i++] & 0xff)) >>> 0;
        b = (b + (((data[i++] & 0xff) << 8)  >>> 0)) >>> 0;
        b = (b + (((data[i++] & 0xff) << 16) >>> 0)) >>> 0;
        b = (b + (((data[i++] & 0xff) << 24) >>> 0)) >>> 0;

        c = (c + (data[i++] & 0xff)) >>> 0;
        c = (c + (((data[i++] & 0xff) << 8)  >>> 0)) >>> 0;
        c = (c + (((data[i++] & 0xff) << 16) >>> 0)) >>> 0;
        c = (c + (((data[i++] & 0xff) << 24) >>> 0)) >>> 0;

        [a, b, c] = mix(a, b, c);
    }

    c = (c + len) >>> 0;

    if (i < len) a = (a + (data[i++] & 0xff)) >>> 0;
    if (i < len) a = (a + (((data[i++] & 0xff) << 8)  >>> 0)) >>> 0;
    if (i < len) a = (a + (((data[i++] & 0xff) << 16) >>> 0)) >>> 0;
    if (i < len) a = (a + (((data[i++] & 0xff) << 24) >>> 0)) >>> 0;

    if (i < len) b = (b + (data[i++] & 0xff)) >>> 0;
    if (i < len) b = (b + (((data[i++] & 0xff) << 8)  >>> 0)) >>> 0;
    if (i < len) b = (b + (((data[i++] & 0xff) << 16) >>> 0)) >>> 0;
    if (i < len) b = (b + (((data[i++] & 0xff) << 24) >>> 0)) >>> 0;

    if (i < len) c = (c + (((data[i++] & 0xff) << 8)  >>> 0)) >>> 0;
    if (i < len) c = (c + (((data[i++] & 0xff) << 16) >>> 0)) >>> 0;
    if (i < len) c = (c + (((data[i]   & 0xff) << 24) >>> 0)) >>> 0;

    [a, b, c] = mix(a, b, c);

    return c >>> 0;
}

/* ---------------------------------- Tests --------------------------------- */

describe("Jenkins96 (lookup2)", () => {
    it("implements interface (compile-time check)", () => {
        const h: HashInterface = new Jenkins96();
        expect(typeof h.compute).toBe("function");
    });

    it("deterministic and in 32-bit range", () => {
        const h = new Jenkins96();
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
            const a = h.compute(data);
            const c = h.compute(data);
            expect(a).toBe(c); // deterministic
            expect(Number.isInteger(a)).toBe(true);
            expect(a).toBeGreaterThanOrEqual(0);
            expect(a).toBeLessThanOrEqual(0xFFFFFFFF);
        }
    });

    it("matches reference implementation", () => {
        const h = new Jenkins96();
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

        for (const data of inputs) {
            const expected = refJenkins96(data);
            const actual = h.compute(data);
            expect(actual).toBe(expected);
        }
    });

    it("sensitivity to changes", () => {
        const h = new Jenkins96();
        expect(h.compute(b("foo"))).not.toBe(h.compute(b("bar")));
        expect(h.compute(b("foo"))).not.toBe(h.compute(b("foo ")));
        expect(h.compute(b("foo"))).not.toBe(h.compute(b("foO")));
    });
});
