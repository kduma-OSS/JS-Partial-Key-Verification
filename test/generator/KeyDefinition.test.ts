import { describe, it, expect } from "vitest";

import { KeyDefinition } from "../../src";
import { ChecksumType } from "../../src";
import { HashType } from "../../src";

import { Adler16 } from "../../src";
import { Fnv1a } from "../../src";

describe("KeyDefinition", () => {
    it("checksum factory", () => {
        const def = new KeyDefinition();
        def.setChecksumType(ChecksumType.Adler16);

        const checksum = def.getChecksum();
        expect(checksum).toBeInstanceOf(Adler16);
    });

    it("hash factory", () => {
        const def = new KeyDefinition();
        def.setHashTypes([HashType.Fnv1A]);

        const hashes = def.getHashFunctions();
        expect(hashes.length).toBe(1);
        expect(hashes[0]).toBeInstanceOf(Fnv1a);
    });

    it("base keys, mask, and spacing getters/setters", () => {
        const def = new KeyDefinition();
        def.setBaseKeys([1, 2, 3]);
        def.setSpacing(5);
        def.setMask("XXXXX-YYYYY");

        expect(def.getBaseKeys()).toEqual([1, 2, 3]);
        expect(def.getSpacing()).toBe(5);
        expect(def.getMask()).toBe("XXXXX-YYYYY");
    });

    it("unsupported Jenkins06 throws", () => {
        const def = new KeyDefinition();
        def.setHashTypes([HashType.Jenkins06]);

        expect(() => def.getHashFunctions()).toThrowError(RangeError);
    });
});
