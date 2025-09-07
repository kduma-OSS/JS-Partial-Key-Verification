import { describe, it, expect } from "vitest";
import { createHash } from "../../src/generator/hashFactory";
import { HashType } from "../../src";
import type { HashInterface } from "../../src";

const te = new TextEncoder();
const b = (s: string) => te.encode(s);

describe("hashFactory/createHash", () => {
    const types = [
        HashType.Crc32,
        HashType.Fnv1A,
        HashType.GeneralizedCrc,
        HashType.Jenkins06,
        HashType.Jenkins96,
        HashType.OneAtATime,
        HashType.SuperFast,
    ];

    it("returns a working instance for each HashType", () => {
        for (const t of types) {
            const h: HashInterface =
                t === HashType.Jenkins06 ? createHash(t, 0x12345678) : createHash(t);

            const out = h.compute(b("foobar"));
            expect(Number.isInteger(out)).toBe(true);
            expect(out).toBeGreaterThanOrEqual(0);
            expect(out).toBeLessThanOrEqual(0xFFFFFFFF);
        }
    });

    it("produces deterministic results", () => {
        for (const t of types) {
            const h: HashInterface =
                t === HashType.Jenkins06 ? createHash(t, 42) : createHash(t);

            const a = h.compute(b("hello"));
            const c = h.compute(b("hello"));
            expect(a).toBe(c);
        }
    });

    it("Jenkins06 seed affects output", () => {
        const a = createHash(HashType.Jenkins06, 1).compute(b("data"));
        const b2 = createHash(HashType.Jenkins06, 2).compute(b("data"));
        expect(a).not.toBe(b2);
    });
});
