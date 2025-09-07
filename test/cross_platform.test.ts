import { describe, it, test, expect } from "vitest";
import {
    Adler16,
    Fnv1a,
    HashInterface,
    Jenkins96,
    OneAtATime,
    PartialKeyGenerator,
    PartialKeyValidator,
    SuperFast,
} from "../src";


test("implements interface (compile-time check)", () => {

    const _hash: HashInterface = new Fnv1a();
    const seed = _hash.compute(new TextEncoder().encode('bob@smith.com'));

    expect(seed).toBe(966448512);
});


/**
 * Port of the helper from the PHP/C# tests.
 */
function validateKey(userName: string, key: string): boolean {
    const seed = PartialKeyValidator.getSerialNumberFromKey(key);
    const blacklist = new Set<number>([1518008798]);

    if (blacklist.has(seed)) return false;

    const validator = new PartialKeyValidator(new Fnv1a());

    // Validation for key with index 1
    if (
        !validator.validateKeyWithSeedString(
            new Adler16(),
            new OneAtATime(),
            key,
            1,
            766109221,
            userName
        )
    ) {
        return false;
    }

    // Validation for key with index 4
    return validator.validateKeyWithSeedString(
        new Adler16(),
        new SuperFast(),
        key,
        4,
        4072442218,
        userName
    );


}

describe("CrossPlatformPartialKeyValidator", () => {
    it("correct key", () => {
        const key = "HL65W5-KK6Y34-OBG32G-DM522M-H2ZI2E-4366ZG-UP57MM";
        const serial = 1977351482;
        const name = "Correct Key";

        expect(validateKey(name, key)).toBe(true);
        expect(PartialKeyValidator.getSerialNumberFromKey(key)).toBe(serial);
    });

    it("correct key but incorrect name", () => {
        const key = "LO3PLL-FWQ3MQ-JPC4OI-4XUGGM-Z6EVVP-DTGWJ2-MZW6BE";
        const serial = 2901784155;
        const name = "Correct Key But Incorrect Name";

        expect(validateKey(name, key)).toBe(false);
        expect(PartialKeyValidator.getSerialNumberFromKey(key)).toBe(serial);
    });

    it("blacklisted key", () => {
        const key = "334XUW-WDB6RD-MLHYSP-CLJU7H-66DPW5-G3CZK3-P2S5LM";
        const serial = 1518008798;
        const name = "Blacklisted Key";

        expect(validateKey(name, key)).toBe(false);
        expect(PartialKeyValidator.getSerialNumberFromKey(key)).toBe(serial);
    });
});



describe("CrossPlatformCodeGenerator", () => {
    it("empty_when_no_verified_keys", () => {
        const gen = PartialKeyGenerator.fromSingleHash(
            new Adler16(),
            new Jenkins96(), // Jenkins96 has no seed/args in our TS port
            [1, 2, 3, 4]
        );

        gen.setSpacing(6);

        const key = gen.generateFromString("bob@smith.com");

        const seed = new Fnv1a().compute(new TextEncoder().encode('bob@smith.com'));
        const seedFromKey = PartialKeyValidator.getSerialNumberFromKey(key);

        expect(key).toBe("QDKZUO-JLLWPY-XWOULC-ONCQIN-5R5X35-ZS3KEQ");
        expect(seed).toBe(966448512);
        expect(seedFromKey).toBe(966448512);
    });
});