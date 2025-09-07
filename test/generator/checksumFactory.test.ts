import { describe, it, expect } from "vitest";
import { createChecksum } from "../../src/generator/checksumFactory";
import { ChecksumType } from "../../src";
import type { Checksum16Interface } from "../../src";

const te = new TextEncoder();
const b = (s: string) => te.encode(s);

describe("checksumFactory/createChecksum", () => {
    const types = [ChecksumType.Adler16, ChecksumType.Crc16, ChecksumType.CrcCcitt];

    it("returns a working instance for each ChecksumType", () => {
        for (const t of types) {
            const cks: Checksum16Interface = createChecksum(t);
            const out = cks.compute(b("foobar"));
            expect(Number.isInteger(out)).toBe(true);
            expect(out).toBeGreaterThanOrEqual(0);
            expect(out).toBeLessThanOrEqual(0xFFFF);
        }
    });

    it("produces deterministic results", () => {
        for (const t of types) {
            const cks: Checksum16Interface = createChecksum(t);
            const a = cks.compute(b("hello"));
            const c = cks.compute(b("hello"));
            expect(a).toBe(c);
        }
    });

    it("different inputs usually differ", () => {
        for (const t of types) {
            const cks: Checksum16Interface = createChecksum(t);
            expect(cks.compute(b("foo"))).not.toBe(cks.compute(b("bar")));
        }
    });
});
