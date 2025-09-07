import { describe, it, expect } from "vitest";

import { KeyDefinition } from "../../src";
import { PartialKeyGenerator } from "../../src";
import { PartialKeyValidator } from "../../src";

import { ChecksumType } from "../../src";
import { HashType } from "../../src";

import { Adler16 } from "../../src";
import { Crc32 } from "../../src";
import { Fnv1a } from "../../src";
import { OneAtATime } from "../../src";
import { SuperFast } from "../../src";

// --- helpers ---

function makeDefinition(
    baseKeys: number[],
    hashTypes: HashType[],
    spacing = 0
): KeyDefinition {
    const def = new KeyDefinition();
    def.setBaseKeys(baseKeys);
    def.setChecksumType(ChecksumType.Adler16);
    def.setHashTypes(hashTypes);
    def.setSpacing(spacing);
    return def;
}

/** Small deterministic PRNG (mulberry32) returning numbers in [0,1). */
function mulberry32(seed: number): () => number {
    let t = seed >>> 0;
    return () => {
        t += 0x6d2b79f5;
        let x = Math.imul(t ^ (t >>> 15), 1 | t);
        x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
        return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
}

describe("PartialKeyGenerator", () => {
    it("generate and validate with numeric seed", () => {
        const def = makeDefinition(
            [0x11111111, 0x22222222, 0x33333333],
            [HashType.Fnv1A, HashType.OneAtATime, HashType.SuperFast],
            0
        );

        const gen = PartialKeyGenerator.fromKeyDefinition(def);
        const key = gen.generate(0xcafebabe);

        // Validate subkeys via validator
        expect(
            PartialKeyValidator.validateKey(new Adler16(), new Fnv1a(), key, 0, 0x11111111)
        ).toBe(true);
        expect(
            PartialKeyValidator.validateKey(new Adler16(), new OneAtATime(), key, 1, 0x22222222)
        ).toBe(true);
        expect(
            PartialKeyValidator.validateKey(new Adler16(), new SuperFast(), key, 2, 0x33333333)
        ).toBe(true);
    });

    it("generate from string seed matches validator seed-string path", () => {
        const def = makeDefinition(
            [0xaaaaaaaa, 0xbbbbbbbb],
            [HashType.Fnv1A, HashType.Fnv1A],
            5
        );

        const gen = PartialKeyGenerator.fromKeyDefinition(def);
        const seedString = "user@example.com";
        const key = gen.generateFromString(seedString);

        const validator = new PartialKeyValidator(new Fnv1a());
        expect(
            validator.validateKeyWithSeedString(
                new Adler16(),
                new Fnv1a(),
                key,
                0,
                0xaaaaaaaa,
                seedString
            )
        ).toBe(true);
        expect(
            validator.validateKeyWithSeedString(
                new Adler16(),
                new Fnv1a(),
                key,
                1,
                0xbbbbbbbb,
                seedString
            )
        ).toBe(true);

        // Check spacing (groups of 5 separated by dashes)
        expect(/^([A-Z2-7]{5}-)*[A-Z2-7]{1,5}$/.test(key)).toBe(true);
    });

    it("generateMany unique and valid", () => {
        const def = makeDefinition(
            [0x01020304, 0xa5a5a5a5, 0x0badf00d, 0xfeedface],
            [HashType.Crc32, HashType.Fnv1A],
            0
        );

        const gen = PartialKeyGenerator.fromKeyDefinition(def);

        // reproducible rng
        const rng = mulberry32(123456);
        const keys = gen.generateMany(20, rng);

        expect(keys.size).toBe(20);

        // seeds must be unique
        const seeds = Array.from(keys.keys());
        const uniq = new Set(seeds);
        expect(uniq.size).toBe(seeds.length);

        // spot-validate a few entries using subkey checks
        let i = 0;
        for (const [, key] of keys) {
            if (i++ >= 5) break;
            expect(
                PartialKeyValidator.validateKey(new Adler16(), new Crc32(), key, 0, 0x01020304)
            ).toBe(true);
        }
    });

    it("alternate factories single and multiple", () => {
        const checksum = new Adler16();
        const baseKeys = [0x11111111, 0x22222222];

        // single-hash
        const gen1 = PartialKeyGenerator.fromSingleHash(checksum, new Fnv1a(), baseKeys);
        const k1 = gen1.generate(0x12345678);
        expect(typeof k1).toBe("string");

        // multiple-hash
        const gen2 = PartialKeyGenerator.fromMultipleHashes(
            checksum,
            [new Fnv1a(), new OneAtATime()],
            baseKeys
        );
        const k2 = gen2.generate(0x12345678);
        expect(typeof k2).toBe("string");

        expect(k1).not.toBe(k2); // Different hash sets should typically yield different keys
    });
});
