import { describe, it, expect } from "vitest";
import type { Checksum32Interface } from "../../src";
import { Crc32 } from "../../src";

const te = new TextEncoder();
const b = (s: string) => te.encode(s);

function randomBytes(len: number): Uint8Array {
    const out = new Uint8Array(len);
    const g: any = globalThis as any;
    if (g.crypto?.getRandomValues) g.crypto.getRandomValues(out);
    else for (let i = 0; i < len; i++) out[i] = (Math.random() * 256) | 0;
    return out;
}

const implementations: (new () => Checksum32Interface)[] = [
    Crc32,
];

describe("Checksum32Interface implementations", () => {
    it("compute() returns unsigned 32-bit int", () => {
        const samples: Uint8Array[] = [
            b(""),
            b("a"),
            b("abc"),
            b("foobar"),
            new Uint8Array([0x00]),
            new Uint8Array([0x00, 0xff, 0x01, 0x02]),
            b("xyz".repeat(100)),
            randomBytes(64),
        ];

        for (const Impl of implementations) {
            const algo = new Impl();
            for (const data of samples) {
                const out = algo.compute(data);
                expect(Number.isInteger(out)).toBe(true);
                expect(out).toBeGreaterThanOrEqual(0);
                expect(out).toBeLessThanOrEqual(0xFFFFFFFF);
            }
        }
    });

    it("compute() is deterministic", () => {
        for (const Impl of implementations) {
            const algo = new Impl();
            const inputs: Uint8Array[] = [
                b(""),
                b("a"),
                b("foo"),
                b("foobar"),
                new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04, 0x05]),
                new Uint8Array(Array(257).fill("X".charCodeAt(0))),
                randomBytes(32),
            ];

            for (const data of inputs) {
                const a = algo.compute(data);
                const c = algo.compute(data);
                expect(a).toBe(c);
            }
        }
    });

    it("different inputs usually differ", () => {
        for (const Impl of implementations) {
            const algo = new Impl();
            expect(algo.compute(b("foo"))).not.toBe(algo.compute(b("bar")));
            expect(algo.compute(b("foo"))).not.toBe(algo.compute(b("foo ")));
        }
    });

    it("large input does not overflow or crash", () => {
        for (const Impl of implementations) {
            const algo = new Impl();
            const big = randomBytes(1 << 15); // 32 KiB
            const out = algo.compute(big);
            expect(Number.isInteger(out)).toBe(true);
            expect(out).toBeGreaterThanOrEqual(0);
            expect(out).toBeLessThanOrEqual(0xFFFFFFFF);
        }
    });
});
