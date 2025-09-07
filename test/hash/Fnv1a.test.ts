import { describe, it, expect } from "vitest";
import { Fnv1a } from "../../src";
import type { HashInterface } from "../../src";

// Helpers
const te = new TextEncoder();
function b(s: string): Uint8Array { return te.encode(s); }

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
 * Correct reference: use a snapshot x of h for all shifts, then add once.
 * This mirrors your PHP `referenceShiftAdd` and equals h * 16777619 (mod 2^32).
 */
function referenceShiftAdd(data: Uint8Array): number {
    let h = 0x811C9DC5 >>> 0; // offset basis
    for (let i = 0; i < data.length; i++) {
        h ^= data[i];

        const x = h >>> 0; // snapshot
        const sum =
            (x +
                ((x << 1)  >>> 0) +
                ((x << 4)  >>> 0) +
                ((x << 7)  >>> 0) +
                ((x << 8)  >>> 0) +
                ((x << 24) >>> 0)) >>> 0;

        h = sum >>> 0;
    }
    return h >>> 0;
}

describe("Fnv1a (32-bit)", () => {
    it("implements interface (compile-time check)", () => {
        // This line enforces the type at compile-time:
        const _hashMustSatisfyInterface: HashInterface = new Fnv1a();
        expect(typeof _hashMustSatisfyInterface.compute).toBe("function");
    });

    it("empty returns offset basis", () => {
        const hash = new Fnv1a();
        const out = hash.compute(b(""));
        expect(out).toBe(0x811C9DC5);
    });

    it("known vector: 'a'", () => {
        const hash = new Fnv1a();
        // canonical FNV-1a 32-bit for "a"
        expect(hash.compute(b("a"))).toBe(0xE40C292C);
    });

    it("deterministic and in 32-bit unsigned range", () => {
        const hash = new Fnv1a();
        const inputs: Uint8Array[] = [
            b(""),
            b("a"),
            b("foo"),
            b("foobar"),
            new Uint8Array([0x00]),
            new Uint8Array([0x00, 0xFF, 0x01, 0x02]),
            b("xyz".repeat(1000)),
            randomBytes(256),
        ];

        for (const data of inputs) {
            const a = hash.compute(data);
            const b2 = hash.compute(data);
            expect(a).toBe(b2); // deterministic
            expect(Number.isInteger(a)).toBe(true);
            expect(a).toBeGreaterThanOrEqual(0);
            expect(a).toBeLessThanOrEqual(0xFFFFFFFF);
        }
    });

    it("matches corrected shift+add reference", () => {
        const hash = new Fnv1a();
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
            const expected = referenceShiftAdd(data);
            const actual = hash.compute(data);
            expect(actual).toBe(expected);
        }
    });

    it("different inputs usually differ", () => {
        const hash = new Fnv1a();
        expect(hash.compute(b("foo"))).not.toBe(hash.compute(b("bar")));
        expect(hash.compute(b("foo"))).not.toBe(hash.compute(b("foo ")));
    });
});
