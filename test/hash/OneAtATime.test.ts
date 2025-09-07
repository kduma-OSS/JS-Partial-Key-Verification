import { describe, it, expect } from "vitest";
import { OneAtATime } from "../../src";
import type { HashInterface } from "../../src";

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

/** Local reference mirroring the class exactly. */
function refOaat(data: Uint8Array): number {
    let hash = 0 >>> 0;

    for (let i = 0; i < data.length; i++) {
        hash = (hash + data[i]) >>> 0;
        hash = (hash + ((hash << 10) >>> 0)) >>> 0;
        hash ^= hash >>> 6;
        hash >>>= 0;
    }

    hash = (hash + ((hash << 3) >>> 0)) >>> 0;
    hash ^= hash >>> 11;
    hash = (hash + ((hash << 15) >>> 0)) >>> 0;

    return hash >>> 0;
}

describe("OneAtATime (OAAT)", () => {
    it("implements interface (compile-time check)", () => {
        const h: HashInterface = new OneAtATime();
        expect(typeof h.compute).toBe("function");
    });

    it("deterministic and in 32-bit range", () => {
        const h = new OneAtATime();
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
            const a = h.compute(data);
            const c = h.compute(data);
            expect(a).toBe(c); // deterministic
            expect(Number.isInteger(a)).toBe(true);
            expect(a).toBeGreaterThanOrEqual(0);
            expect(a).toBeLessThanOrEqual(0xFFFFFFFF);
        }
    });

    it("matches local reference", () => {
        const h = new OneAtATime();
        const inputs: Uint8Array[] = [
            b(""),
            b("a"),
            b("abc"),
            b("foobar"),
            b("123456789"),
            b("hello world"),
            randomBytes(5),
            randomBytes(33),
        ];

        for (const data of inputs) {
            const expected = refOaat(data);
            const actual = h.compute(data);
            expect(actual).toBe(expected);
        }
    });

    it("sensitivity to changes", () => {
        const h = new OneAtATime();
        expect(h.compute(b("foo"))).not.toBe(h.compute(b("bar")));
        expect(h.compute(b("foo"))).not.toBe(h.compute(b("foo ")));
        expect(h.compute(b("foo"))).not.toBe(h.compute(b("foO")));
    });
});
