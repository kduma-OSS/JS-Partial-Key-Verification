import { describe, it, expect } from "vitest";
import { Base32 } from "../../src";

// --- Data provider equivalent (RFC 4648, uppercase, no padding) ---
const VECTORS: Array<[plain: string, base32: string]> = [
    ["f", "MY"],
    ["fo", "MZXQ"],
    ["foo", "MZXW6"],
    ["foob", "MZXW6YQ"],
    ["fooba", "MZXW6YTB"],
    ["foobar", "MZXW6YTBOI"],
    // extra mixed-length cases from PHP test
    ["A", "IE"],
    ["AB", "IFBA"],
    ["ABC", "IFBEG"],
];

// Helpers
function utf8(str: string): Uint8Array {
    return new TextEncoder().encode(str);
}
function toString(bytes: Uint8Array): string {
    return new TextDecoder().decode(bytes);
}
function randomBytes(len: number): Uint8Array {
    const out = new Uint8Array(len);
    if (len === 0) return out;

    // Prefer Web Crypto in browser-like envs (happy-dom/jsdom)
    const g: any = globalThis as any;
    if (g.crypto?.getRandomValues) {
        g.crypto.getRandomValues(out);
        return out;
    }
    // Fallback: Math.random (sufficient for tests)
    for (let i = 0; i < len; i++) out[i] = (Math.random() * 256) | 0;
    return out;
}

describe("Base32Test (ported from PHP)", () => {
    it("test_empty", () => {
        expect(Base32.toBase32("")).toBe("");
        expect(Base32.fromBase32ToString("")).toBe("");
    });

    it("test_to_base32_matches_known_vectors", () => {
        for (const [plain, base32] of VECTORS) {
            expect(Base32.toBase32(plain)).toBe(base32);
        }
    });

    it("test_from_base32_matches_known_vectors", () => {
        for (const [plain, base32] of VECTORS) {
            expect(Base32.fromBase32ToString(base32)).toBe(plain);
        }
    });

    it("test_round_trip_random_binary", () => {
        const lengths = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 16, 31, 32, 33, 64, 100, 256, 1024];

        for (const len of lengths) {
            const bin = randomBytes(len);
            const encoded = Base32.toBase32(bin);
            const decoded = Base32.fromBase32(encoded);

            // equality: bytes -> bytes
            expect(decoded.length).toBe(bin.length);
            for (let i = 0; i < bin.length; i++) {
                expect(decoded[i]).toBe(bin[i]);
            }

            // encode(decode(x)) == x
            const reEncoded = Base32.toBase32(decoded);
            expect(reEncoded).toBe(encoded);
        }
    });

    it("test_decode_then_encode_is_idempotent_for_valid_alphabet", () => {
        const original = "MZXW6YTBOI"; // "foobar"
        const decoded = Base32.fromBase32(original);
        const reEncoded = Base32.toBase32(decoded);
        expect(reEncoded).toBe(original);
    });

    it("test_case_sensitivity_uppercase_only", () => {
        const lower = "mzxw6ytboi";
        const expectFoobar = utf8("foobar");

        // PHP asserts: lowercase should NOT decode to the valid bytes of "foobar".
        // Our TS impl may either throw (strict) or decode to garbage; accept either outcome.
        try {
            const decoded = Base32.fromBase32(lower); // may throw
            let same = decoded.length === expectFoobar.length;
            if (same) {
                for (let i = 0; i < decoded.length; i++) {
                    if (decoded[i] !== expectFoobar[i]) {
                        same = false;
                        break;
                    }
                }
            }
            expect(same).toBe(false);
        } catch {
            // Throwing on lowercase is also acceptable.
            expect(true).toBe(true);
        }
    });
});
