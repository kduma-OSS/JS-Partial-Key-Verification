import { describe, it, expect } from "vitest";
import { SuperFast } from "../../src";
import type { HashInterface } from "../../src";

// helpers
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

// Local reference (mirrors the PHP class exactly)
function u16le(bytes: Uint8Array, off: number): number {
    return (bytes[off] | (bytes[off + 1] << 8)) & 0xffff;
}
function refSuperFast(data: Uint8Array): number {
    const len = data.length;
    let hash = len >>> 0;

    let rem = len & 3;
    let pairs = len >> 2;
    let offset = 0;

    while (pairs-- > 0) {
        hash = (hash + u16le(data, offset)) >>> 0;
        offset += 2;

        const next = u16le(data, offset);
        offset += 2;

        const tmp = (((next << 11) >>> 0) ^ hash) >>> 0;
        hash = ((((hash << 16) >>> 0) ^ tmp) >>> 0);
        hash = (hash + (hash >>> 11)) >>> 0;
    }

    switch (rem) {
        case 3:
            hash = (hash + u16le(data, offset)) >>> 0;
            offset += 2;
            hash = (hash ^ ((hash << 16) >>> 0)) >>> 0;
            hash = (hash ^ (data[offset] << 18)) >>> 0;
            hash = (hash + (hash >>> 11)) >>> 0;
            break;
        case 2:
            hash = (hash + u16le(data, offset)) >>> 0;
            hash = (hash ^ ((hash << 11) >>> 0)) >>> 0;
            hash = (hash + (hash >>> 17)) >>> 0;
            break;
        case 1:
            hash = (hash + data[offset]) >>> 0;
            hash = (hash ^ ((hash << 10) >>> 0)) >>> 0;
            hash = (hash + (hash >>> 1)) >>> 0;
            break;
        case 0:
            break;
    }

    hash = (hash ^ ((hash << 3) >>> 0)) >>> 0;
    hash = (hash + (hash >>> 5)) >>> 0;
    hash = (hash ^ ((hash << 4) >>> 0)) >>> 0;
    hash = (hash + (hash >>> 17)) >>> 0;
    hash = (hash ^ ((hash << 25) >>> 0)) >>> 0;
    hash = (hash + (hash >>> 6)) >>> 0;

    return hash >>> 0;
}

describe("SuperFast", () => {
    it("implements interface (compile-time check)", () => {
        const h: HashInterface = new SuperFast();
        expect(typeof h.compute).toBe("function");
    });

    it("deterministic and in 32-bit range", () => {
        const h = new SuperFast();
        const inputs: Uint8Array[] = [
            b(""),
            b("a"),
            b("ab"),
            b("abc"),
            b("abcd"),
            b("abcde"),
            b("abcdef"),
            b("abcdefg"),
            b("abcdefgh"),
            b("123456789"),
            b("The quick brown fox jumps over the lazy dog"),
            new Uint8Array([0x00]),
            new Uint8Array([0x00, 0xff, 0x01, 0x02, 0x03]),
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

    it("matches local reference", () => {
        const h = new SuperFast();
        const inputs: Uint8Array[] = [
            b(""),
            b("a"),
            b("ab"),
            b("abc"),
            b("abcdefg"),
            b("123456789"),
            b("hello world"),
            randomBytes(5),
            randomBytes(33),
        ];

        for (const data of inputs) {
            const expected = refSuperFast(data);
            const actual = h.compute(data);
            expect(actual).toBe(expected);
        }
    });

    it("sensitivity to changes", () => {
        const h = new SuperFast();
        expect(h.compute(b("foo"))).not.toBe(h.compute(b("bar")));
        expect(h.compute(b("foo"))).not.toBe(h.compute(b("foo ")));
        expect(h.compute(b("foo"))).not.toBe(h.compute(b("foO")));
    });
});
