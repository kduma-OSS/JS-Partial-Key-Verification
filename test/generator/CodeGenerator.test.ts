import { describe, it, expect } from "vitest";

import { CodeGenerator } from "../../src";
import { KeyDefinition } from "../../src";
import { ChecksumType } from "../../src";
import { HashType } from "../../src";

function makeDefinition(
    baseKeys: number[],
    hashTypes: HashType[],
    checksum: ChecksumType = ChecksumType.Adler16
): KeyDefinition {
    const def = new KeyDefinition();
    def.setBaseKeys(baseKeys);
    def.setChecksumType(checksum);
    def.setHashTypes(hashTypes);
    def.setSpacing(0);
    def.setMask("");
    return def;
}

describe("CodeGenerator (TS output)", () => {
    it("empty_when_no_verified_keys", () => {
        const def = makeDefinition(
            [0x11111111, 0x22222222],
            [HashType.Fnv1A, HashType.OneAtATime]
        );

        const gen = new CodeGenerator(def);
        expect(gen.toString()).toBe("");
    });

    it("generates_without_username_and_with_blacklist", () => {
        // index 0 => Jenkins96
        // index 1 => OneAtATime
        // index 2 => GeneralizedCrc
        // index 3 => SuperFast
        // index 4 => Fnv1A (class name in TS: Fnv1a)
        const def = makeDefinition(
            [3129109879, 766109221, 534025585, 1416678536, 4072442218],
            [
                HashType.Jenkins96,
                HashType.OneAtATime,
                HashType.GeneralizedCrc,
                HashType.SuperFast,
                HashType.Fnv1A,
            ],
            ChecksumType.Adler16
        );

        const gen = new CodeGenerator(def);
        gen.setVerifiedKeys([1, 4]); // only indices 1 and 4 are required
        gen.setBlacklistedSerials([1518008798, 42]);
        gen.setValidateUsername(false);

        const code = gen.toString();

        // Signature (no username)
        expect(code).toContain("function validateKey(key: string): boolean");

        // Blacklist block
        expect(code).toContain(
            "const seed = PartialKeyValidator.getSerialNumberFromKey(key);"
        );
        expect(code).toContain("const blacklist = [1518008798, 42]");
        expect(code).toContain("if (blacklist.includes(seed)) return false;");

        // Validation for index 1 -> OneAtATime with base 766109221
        expect(code).toContain("// Validation for key with index 1");
        expect(code).toContain(
            "PartialKeyValidator.validateKey(new Adler16(), new OneAtATime(), key, 1, 766109221)"
        );

        // Validation for index 4 -> Fnv1a with base 4072442218
        expect(code).toContain("// Validation for key with index 4");
        expect(code).toContain(
            "PartialKeyValidator.validateKey(new Adler16(), new Fnv1a(), key, 4, 4072442218)"
        );

        // No username usage in this mode
        expect(code).not.toContain("userName");
        expect(code).toContain("return true;");
    });

    it("generates_with_username_and_validator_instance", () => {
        const def = makeDefinition(
            [0xaaaaaaaa, 0xbbbbbbbb, 0xcccccccc],
            [HashType.Fnv1A, HashType.SuperFast, HashType.GeneralizedCrc],
            ChecksumType.Crc16
        );

        const gen = new CodeGenerator(def);
        gen.setVerifiedKeys([0, 2]); // verify indices 0 and 2
        gen.setBlacklistedSerials([]); // no blacklist for this test
        gen.setValidateUsername(true);

        const code = gen.toString();

        // Signature (with username)
        expect(code).toContain(
            "function validateKey(userName: string, key: string): boolean"
        );

        // Validator instance creation
        expect(code).toContain(
            "const validator = new PartialKeyValidator(new Fnv1a());"
        );

        // Index 0 -> Checksum Crc16, Hash Fnv1a, base 2863311530
        expect(code).toContain("// Validation for key with index 0");
        expect(code).toContain(
            "validator.validateKeyWithSeedString(new Crc16(), new Fnv1a(), key, 0, 2863311530, userName)"
        );

        // Index 2 -> Checksum Crc16, Hash GeneralizedCrc, base 3435973836
        expect(code).toContain("// Validation for key with index 2");
        expect(code).toContain(
            "validator.validateKeyWithSeedString(new Crc16(), new GeneralizedCrc(), key, 2, 3435973836, userName)"
        );

        // Must end with return true
        expect(code).toContain("return true;");
    });

    it("skips_out_of_range_verified_key_indices", () => {
        const def = makeDefinition(
            [111, 222], // only 2 base keys
            [HashType.Fnv1A, HashType.Crc32] // only 2 hash types
        );

        const gen = new CodeGenerator(def);
        gen.setVerifiedKeys([0, 1, 2, 7]); // 2 and 7 out-of-range -> ignored
        gen.setValidateUsername(false);

        const code = gen.toString();

        // Should contain validations for 0 and 1
        expect(code).toContain("// Validation for key with index 0");
        expect(code).toContain("// Validation for key with index 1");

        // Should NOT contain index 2 or 7
        expect(code).not.toContain("// Validation for key with index 2");
        expect(code).not.toContain("// Validation for key with index 7");
    });
});
