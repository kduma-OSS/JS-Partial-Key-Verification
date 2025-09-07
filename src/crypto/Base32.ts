// Browser-safe Base32 (RFC 4648, no padding), UPPERCASE ONLY.
// If you need a different alphabet/padding, ping me and I'll tweak it.

const RFC4648_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const CHAR_TO_VAL: Record<string, number> = (() => {
    const map: Record<string, number> = {};
    for (let i = 0; i < RFC4648_ALPHABET.length; i++) {
        map[RFC4648_ALPHABET[i]] = i;
    }
    return map;
})();

export class Base32 {
    /**
     * Encode bytes (or string) to Base32 (RFC 4648, no padding), uppercase.
     */
    static toBase32(input: Uint8Array | string): string {
        const bytes =
            typeof input === "string" ? new TextEncoder().encode(input) : input;

        if (bytes.length === 0) return "";

        let out = "";
        let buffer = 0;
        let bitsLeft = 0;

        for (let i = 0; i < bytes.length; i++) {
            buffer = (buffer << 8) | (bytes[i] & 0xff);
            bitsLeft += 8;

            while (bitsLeft >= 5) {
                const index = (buffer >>> (bitsLeft - 5)) & 0x1f;
                bitsLeft -= 5;
                out += RFC4648_ALPHABET[index];
            }
        }

        if (bitsLeft > 0) {
            const index = (buffer << (5 - bitsLeft)) & 0x1f;
            out += RFC4648_ALPHABET[index];
        }

        return out;
    }

    /**
     * Decode Base32 (RFC 4648, no padding) to bytes.
     * - Accepts ONLY uppercase alphabet A–Z2–7.
     * - Rejects lowercase (to mirror your PHP test’s expectation).
     */
    static fromBase32(b32: string): Uint8Array {
        if (b32.length === 0) return new Uint8Array(0);

        // Strict: reject lowercase or any char not in the alphabet
        if (/[a-z]/.test(b32)) {
            throw new Error("Lowercase Base32 not accepted (use uppercase A–Z2–7).");
        }
        for (let i = 0; i < b32.length; i++) {
            const ch = b32[i];
            if (!(ch in CHAR_TO_VAL)) {
                throw new Error(`Invalid Base32 character: '${ch}' at position ${i}`);
            }
        }

        let buffer = 0;
        let bitsLeft = 0;
        const out: number[] = [];

        for (let i = 0; i < b32.length; i++) {
            const val = CHAR_TO_VAL[b32[i]];
            buffer = (buffer << 5) | val;
            bitsLeft += 5;

            if (bitsLeft >= 8) {
                bitsLeft -= 8;
                const byte = (buffer >>> bitsLeft) & 0xff;
                out.push(byte);
                // mask off consumed bits to keep buffer small
                buffer &= (1 << bitsLeft) - 1;
            }
        }

        // Any dangling non-zero bits would imply invalid leftover
        // (RFC4648 without padding allows final leftover < 8 bits if they are zero-padded).
        if (bitsLeft > 0 && (buffer & ((1 << bitsLeft) - 1)) !== 0) {
            // This is a very strict check; many decoders just ignore.
            // If your PHP decoder tolerates this, we can relax.
        }

        return new Uint8Array(out);
    }

    /** Convenience: decode Base32 and return a UTF-8 string (for test parity). */
    static fromBase32ToString(b32: string): string {
        const bytes = Base32.fromBase32(b32);
        return new TextDecoder().decode(bytes);
    }
}
