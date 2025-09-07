import { describe, it, expect } from "vitest";
import { GeneralizedCrc } from "../../src";
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

/** Local reference implementation (mirrors the PHP class exactly). */
function referenceTable(): Uint32Array {
    const table = new Uint32Array(256);

    for (let i = 0; i < 256; i++) {
        let x = i & 0xFF;

        // 1st phase (5 rounds; +1)
        for (let j = 0; j < 5; j++) {
            x = (x + 1) & 0xFF;
            x = (x + ((x << 1) & 0xFF)) & 0xFF;
            x ^= (x >> 1);
            x &= 0xFF;
        }
        let val = x & 0xFF;

        // 2nd phase (5 rounds; +2), bits 8..15
        for (let j = 0; j < 5; j++) {
            x = (x + 2) & 0xFF;
            x = (x + ((x << 1) & 0xFF)) & 0xFF;
            x ^= (x >> 1);
            x &= 0xFF;
        }
        val ^= ((x & 0xFF) << 8);

        // 3rd phase (5 rounds; +3), bits 16..23
        for (let j = 0; j < 5; j++) {
            x = (x + 3) & 0xFF;
            x = (x + ((x << 1) & 0xFF)) & 0xFF;
            x ^= (x >> 1);
            x &= 0xFF;
        }
        val ^= ((x & 0xFF) << 16);

        // 4th phase (5 rounds; +4), bits 24..31
        for (let j = 0; j < 5; j++) {
            x = (x + 4) & 0xFF;
            x = (x + ((x << 1) & 0xFF)) & 0xFF;
            x ^= (x >> 1);
            x &= 0xFF;
        }
        val ^= ((x & 0xFF) << 24);

        table[i] = (val >>> 0) & 0xFFFFFFFF;
    }

    return table;
}

function referenceGeneralizedCrc(data: Uint8Array): number {
    const table = referenceTable();
    let hash = (data.length >>> 0) & 0xFFFFFFFF;

    for (let i = 0; i < data.length; i++) {
        const idx = ((hash & 0xFF) ^ (data[i] & 0xFF)) & 0xFF;
        hash = (((hash >>> 8) ^ table[idx]) >>> 0) & 0xFFFFFFFF;
    }

    return hash >>> 0;
}

describe("GeneralizedCrc", () => {
    it("implements interface (compile-time check)", () => {
        const g: HashInterface = new GeneralizedCrc();
        expect(typeof g.compute).toBe("function");
    });

    it("deterministic and in 32-bit range", () => {
        const g = new GeneralizedCrc();
        const inputs: Uint8Array[] = [
            b(""),
            b("a"),
            b("abc"),
            b("foobar"),
            new Uint8Array([0x00, 0xFF, 0x01, 0x02]),
            b("xyz".repeat(100)),
            randomBytes(64),
        ];

        for (const data of inputs) {
            const a = g.compute(data);
            const c = g.compute(data);
            expect(a).toBe(c); // deterministic
            expect(Number.isInteger(a)).toBe(true);
            expect(a).toBeGreaterThanOrEqual(0);
            expect(a).toBeLessThanOrEqual(0xFFFFFFFF);
        }
    });

    it("matches reference implementation", () => {
        const g = new GeneralizedCrc();
        const inputs: Uint8Array[] = [
            b(""),
            b("a"),
            b("abc"),
            b("123456789"),
            b("hello world"),
            randomBytes(17),
            randomBytes(1024),
        ];

        for (const data of inputs) {
            const expected = referenceGeneralizedCrc(data);
            const actual = g.compute(data);
            expect(actual).toBe(expected);
        }
    });

    it("pinned vectors", () => {
        const g = new GeneralizedCrc();
        expect(g.compute(b(""))).toBe(0x00000000);
        expect(g.compute(b("a"))).toBe(0x9DC3B961);
        expect(g.compute(b("abc"))).toBe(0x66F78E90);
        expect(g.compute(b("123456789"))).toBe(0x55CE33CE);
        expect(g.compute(b("hello world"))).toBe(0x22078CAF);
    });

    it("different inputs usually differ", () => {
        const g = new GeneralizedCrc();
        expect(g.compute(b("foo"))).not.toBe(g.compute(b("bar")));
        expect(g.compute(b("foo"))).not.toBe(g.compute(b("foo ")));
        expect(g.compute(b("foo"))).not.toBe(g.compute(b("foO")));
    });
});
