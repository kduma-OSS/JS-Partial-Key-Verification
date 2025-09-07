import { describe, it, expect } from "vitest";
import { Adler16 } from "../../src";
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

/** Local reference mirroring the class exactly (mod 251, chunk 5550). */
function refAdler16(data: Uint8Array): number {
    let a = 1;
    let bsum = 0;

    let len = data.length;
    let offset = 0;

    while (len > 0) {
        const tlen = len < 5550 ? len : 5550;
        len -= tlen;

        let n = tlen;
        do {
            a += data[offset++];
            bsum += a;
        } while (--n > 0);

        a %= 251;
        bsum %= 251;
    }

    return (((bsum << 8) | a) & 0xffff) >>> 0;
}

describe("Adler16 (mod 251, chunk 5550)", () => {
    it("implements interface (compile-time check)", () => {
        const algo: Checksum16Interface = new Adler16();
        expect(typeof algo.compute).toBe("function");
    });

    it("empty returns one (0x0001)", () => {
        const algo = new Adler16();
        expect(algo.compute(b(""))).toBe(0x0001);
    });

    it("deterministic and in 16-bit range", () => {
        const algo = new Adler16();
        const inputs: Uint8Array[] = [
            b(""),
            b("a"),
            b("abc"),
            b("foobar"),
            new Uint8Array([0x00]),
            new Uint8Array([0x00, 0xff, 0x01, 0x02]),
            b("xyz".repeat(123)),
            randomBytes(32),
        ];

        for (const data of inputs) {
            const x = algo.compute(data);
            const y = algo.compute(data);
            expect(x).toBe(y); // deterministic
            expect(Number.isInteger(x)).toBe(true);
            expect(x).toBeGreaterThanOrEqual(0);
            expect(x).toBeLessThanOrEqual(0xffff);
        }
    });

    it("matches reference implementation", () => {
        const algo = new Adler16();
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
            const expected = refAdler16(data);
            const actual = algo.compute(data);
            expect(actual).toBe(expected);
        }
    });

    it("chunk boundary behavior", () => {
        const algo = new Adler16();
        const oneChunk = b("A".repeat(5550));
        const boundaryPlus1 = b("A".repeat(5551));
        const boundaryPlus100 = b("A".repeat(5650));

        expect(algo.compute(oneChunk)).toBe(refAdler16(oneChunk));
        expect(algo.compute(boundaryPlus1)).toBe(refAdler16(boundaryPlus1));
        expect(algo.compute(boundaryPlus100)).toBe(refAdler16(boundaryPlus100));
    });

    it("different inputs usually differ", () => {
        const algo = new Adler16();
        expect(algo.compute(b("foo"))).not.toBe(algo.compute(b("bar")));
        expect(algo.compute(b("foo"))).not.toBe(algo.compute(b("foo ")));
    });
});
