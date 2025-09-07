import { describe, it, expect } from "vitest";
import { HashInterface } from "../../src";

import { Crc32 } from "../../src";
import { Fnv1a } from "../../src";
import { GeneralizedCrc } from "../../src";
// import { Jenkins06 } from "./Jenkins06"; // optional
import { Jenkins96 } from "../../src";
import { OneAtATime } from "../../src";
import { SuperFast } from "../../src";

const te = new TextEncoder();
const b = (s: string) => te.encode(s);

const implementations: (new () => HashInterface)[] = [
    Crc32,
    Fnv1a,
    GeneralizedCrc,
    // Jenkins06, // left out for now
    Jenkins96,
    OneAtATime,
    SuperFast,
];

describe("HashInterface implementations", () => {
    it("compute() returns unsigned 32-bit int", () => {
        for (const Impl of implementations) {
            const hash = new Impl();
            const out = hash.compute(b("foobar"));
            expect(Number.isInteger(out)).toBe(true);
            expect(out).toBeGreaterThanOrEqual(0);
            expect(out).toBeLessThanOrEqual(0xFFFFFFFF);
        }
    });

    it("compute() is deterministic", () => {
        for (const Impl of implementations) {
            const hash = new Impl();
            const out1 = hash.compute(b("foobar"));
            const out2 = hash.compute(b("foobar"));
            expect(out1).toBe(out2);
        }
    });

    it("different inputs give different hashes", () => {
        for (const Impl of implementations) {
            const hash = new Impl();
            const a = hash.compute(b("foo"));
            const b2 = hash.compute(b("bar"));
            expect(a).not.toBe(b2);
        }
    });
});
