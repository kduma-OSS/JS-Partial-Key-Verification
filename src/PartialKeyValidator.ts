import { Base32 } from "./crypto/Base32";
import type { HashInterface } from "./hash/HashInterface";
import type { Checksum16Interface } from "./checksum/Checksum16Interface";
import { u16LE, u32LE } from "./utils/endian";

/**
 * Validates a Partial Key Verification key.
 * A key is valid if the checksum is valid and the requested subkey(s) are valid.
 */
export class PartialKeyValidator {
    /** Default hash used only by the serial-from-seed helpers (mirrors C# static Fnv1A). */
    private readonly defaultHash: HashInterface;
    private static te = new TextEncoder();

    constructor(defaultHash: HashInterface) {
        this.defaultHash = defaultHash;
    }

    /**
     * Validates the given key. Verifies the checksum and the subkey at index.
     *
     * @param checksum  Algorithm to compute the key checksum (16-bit)
     * @param hash      Algorithm to compute each subkey (32-bit)
     * @param key       Base32 key string (dashes allowed)
     * @param subkeyIndex Zero-based index of the subkey to check
     * @param subkeyBase  Unsigned 32-bit base used to create the subkey
     */
    static validateKey(
        checksum: Checksum16Interface,
        hash: HashInterface,
        key: string,
        subkeyIndex: number,
        subkeyBase: number
    ): boolean {
        const bytes = this.getKeyBytes(key); // Uint8Array
        const seed = u32LE(bytes, 0);        // first 4 bytes (LE)
        return this.validateKeyBytes(hash, checksum, bytes, seed, subkeyIndex, subkeyBase >>> 0);
    }

    /**
     * Validates the given key and also verifies the provided seed string hashes
     * to the embedded seed in the key (UTF-8, default hash algorithm).
     */
    validateKeyWithSeedString(
        checksum: Checksum16Interface,
        hash: HashInterface,
        key: string,
        subkeyIndex: number,
        subkeyBase: number,
        seedString: string
    ): boolean {
        const bytes = PartialKeyValidator.getKeyBytes(key);
        const seed = u32LE(bytes, 0);

        const seedUtf8 = PartialKeyValidator.te.encode(seedString);
        if ((this.defaultHash.compute(seedUtf8) >>> 0) !== seed) {
            return false;
        }

        return PartialKeyValidator.validateKeyBytes(
            hash,
            checksum,
            bytes,
            seed,
            subkeyIndex,
            subkeyBase >>> 0
        );
    }

    /** Extracts the serial number (seed) from a key. */
    static getSerialNumberFromKey(key: string): number {
        const bytes = this.getKeyBytes(key);
        return u32LE(bytes, 0);
    }

    /**
     * Converts a string seed into a serial number using the provided default hash.
     * (C# used a static Fnv1A; here you pass it via the constructor.)
     */
    getSerialNumberFromSeed(seed: string): number {
        return this.defaultHash.compute(PartialKeyValidator.te.encode(seed)) >>> 0;
    }

    /** Convert a Base32 key string (dashes allowed) to raw bytes (Uint8Array). */
    private static getKeyBytes(key: string): Uint8Array {
        // Remove separators and normalize to uppercase
        const clean = key.replace(/-/g, "").toUpperCase();
        return Base32.fromBase32(clean); // Uint8Array
    }

    /**
     * Validate the checksum and a single subkey.
     *
     * @throws RangeError if subkey index is out of bounds
     */
    private static validateKeyBytes(
        hash: HashInterface,
        checksum: Checksum16Interface,
        keyBytes: Uint8Array,
        seed: number,
        subkeyIndex: number,
        subkeyBase: number
    ): boolean {
        if (!this.validateChecksum(checksum, keyBytes)) {
            return false;
        }

        const totalLen = keyBytes.length;           // includes trailing 2-byte checksum
        const offset = (subkeyIndex * 4) + 4;       // after 4-byte seed

        if (subkeyIndex < 0 || (offset + 4) > (totalLen - 2)) {
            throw new RangeError("Sub key index is out of bounds");
        }

        const subKey = u32LE(keyBytes, offset);

        // payload = LE uint32 of (seed ^ subkeyBase)
        const v = (seed ^ (subkeyBase >>> 0)) >>> 0;
        const payload = new Uint8Array([
            v & 0xff,
            (v >>> 8) & 0xff,
            (v >>> 16) & 0xff,
            (v >>> 24) & 0xff,
        ]);

        const expected = hash.compute(payload) >>> 0;

        return expected === subKey;
    }

    /** Validate the 16-bit checksum at the end of the key. */
    private static validateChecksum(checksum: Checksum16Interface, keyBytes: Uint8Array): boolean {
        const len = keyBytes.length;
        if (len < 2) return false;

        const sumStored = u16LE(keyBytes, len - 2);
        const body = keyBytes.subarray(0, len - 2);

        const sumComputed = checksum.compute(body) & 0xffff;

        return sumStored === sumComputed;
    }
}
