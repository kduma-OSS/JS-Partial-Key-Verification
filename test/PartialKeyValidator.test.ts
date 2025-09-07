import { describe, it, expect } from "vitest";
import { PartialKeyValidator } from "../src";
import { Base32 } from "../src";

import { Fnv1a } from "../src";
import type { HashInterface } from "../src";

import { Adler16 } from "../src";
import type { Checksum16Interface } from "../src";

const te = new TextEncoder();
const b = (s: string) => te.encode(s);

/** pack LE uint32 to bytes */
function packV(u32: number): Uint8Array {
    const v = u32 >>> 0;
    return new Uint8Array([v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff]);
}
/** pack LE uint16 to bytes */
function packv(u16: number): Uint8Array {
    const v = u16 & 0xffff;
    return new Uint8Array([v & 0xff, (v >>> 8) & 0xff]);
}

/**
 * Layout: [seed:4][subkey0:4][subkey1:4]...[checksum:2]
 */
function makeKeyBytes(
    seed: number,
    subkeyBases: number[],
    hash: HashInterface,
    checksum: Checksum16Interface
): Uint8Array {
    const parts: Uint8Array[] = [packV(seed)];
    for (const base of subkeyBases) {
        const payload = packV((seed ^ (base >>> 0)) >>> 0);
        const subkey = hash.compute(payload) >>> 0;
        parts.push(packV(subkey));
    }
    // concat body to compute checksum
    const bodyLen = parts.reduce((n, p) => n + p.length, 0);
    const body = new Uint8Array(bodyLen);
    {
        let off = 0;
        for (const p of parts) {
            body.set(p, off);
            off += p.length;
        }
    }
    const sum = checksum.compute(body) & 0xffff;
    const full = new Uint8Array(body.length + 2);
    full.set(body, 0);
    full.set(packv(sum), body.length);
    return full;
}

function dashify(s: string, group = 5): string {
    const chunks: string[] = [];
    for (let i = 0; i < s.length; i += group) {
        chunks.push(s.slice(i, i + group));
    }
    return chunks.join("-").toUpperCase();
}

describe("PartialKeyValidator", () => {
    it("serial helpers and validation", () => {
        const hash = new Fnv1a();        // default for seed and for subkeys
        const checksum = new Adler16();

        const seedString = "user@example.com";
        const seed = hash.compute(b(seedString)) >>> 0;

        const bases = [0x11111111, 0x22222222, 0x33333333];
        const bytes = makeKeyBytes(seed, bases, hash, checksum);
        const keyB32 = Base32.toBase32(bytes);

        // With dashes as well (validator must ignore them)
        const keyB32Dashed = dashify(keyB32, 5);

        const validator = new PartialKeyValidator(hash);

        // Serial number extraction
        expect(validator.getSerialNumberFromSeed(seedString)).toBe(seed);
        expect(PartialKeyValidator.getSerialNumberFromKey(keyB32)).toBe(seed);
        expect(PartialKeyValidator.getSerialNumberFromKey(keyB32Dashed)).toBe(seed);

        // Validate subkeys by index for both plain and dashed keys
        for (const idx of [0, 1, 2]) {
            expect(
                PartialKeyValidator.validateKey(checksum, hash, keyB32, idx, bases[idx])
            ).toBe(true);
            expect(
                PartialKeyValidator.validateKey(checksum, hash, keyB32Dashed, idx, bases[idx])
            ).toBe(true);
        }

        // Wrong base should fail
        expect(
            PartialKeyValidator.validateKey(checksum, hash, keyB32, 1, 0xAAAAAAAA)
        ).toBe(false);

        // Seed-string variant (must match)
        expect(
            validator.validateKeyWithSeedString(checksum, hash, keyB32, 0, bases[0], seedString)
        ).toBe(true);

        // Seed-string variant (mismatch)
        expect(
            validator.validateKeyWithSeedString(checksum, hash, keyB32, 0, bases[0], "wrong seed")
        ).toBe(false);
    });

    it("subkey index bounds", () => {
        const hash = new Fnv1a();
        const checksum = new Adler16();

        const seed = 123456789 >>> 0;
        const bases = [0xAAAAAAAA]; // only one subkey
        const bytes = makeKeyBytes(seed, bases, hash, checksum);
        const keyB32 = Base32.toBase32(bytes);

        expect(() =>
            PartialKeyValidator.validateKey(checksum, hash, keyB32, 1, 0xBBBBBBBB)
        ).toThrowError(RangeError);
    });
});
