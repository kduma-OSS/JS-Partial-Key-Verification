import { Base32 } from "../crypto/Base32";
import type { Checksum16Interface } from "../checksum/Checksum16Interface";
import type { HashInterface } from "../hash/HashInterface";
import { Fnv1a } from "../hash/Fnv1a";
import { KeyDefinition } from "./KeyDefinition";

const te = new TextEncoder();

function writeU32LE(buf: Uint8Array, offset: number, value: number): void {
    const v = value >>> 0;
    buf[offset + 0] = v & 0xff;
    buf[offset + 1] = (v >>> 8) & 0xff;
    buf[offset + 2] = (v >>> 16) & 0xff;
    buf[offset + 3] = (v >>> 24) & 0xff;
}

function packU32LE(value: number): Uint8Array {
    const v = value >>> 0;
    return new Uint8Array([
        v & 0xff,
        (v >>> 8) & 0xff,
        (v >>> 16) & 0xff,
        (v >>> 24) & 0xff,
    ]);
}

function packU16LE(value: number): Uint8Array {
    const v = value & 0xffff;
    return new Uint8Array([v & 0xff, (v >>> 8) & 0xff]);
}

function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
    const out = new Uint8Array(a.length + b.length);
    out.set(a, 0);
    out.set(b, a.length);
    return out;
}

export class PartialKeyGenerator {
    // Default hash used by generateFromString (singleton; matches PHP static Fnv1a)
    private static _defaultHash: HashInterface | null = null;

    private baseKeys: number[];
    private checksum: Checksum16Interface;
    private hashFunctions: HashInterface[];
    private spacing: number;

    /**
     * Private value-constructor. Use one of the named factories below.
     */
    private constructor(
        baseKeys: number[],
        checksum: Checksum16Interface,
        hashFunctions: HashInterface[],
        spacing: number = 0
    ) {
        if (!baseKeys.length) throw new RangeError("baseKeys must be non-empty");
        if (!hashFunctions.length) throw new RangeError("hashFunctions must be non-empty");

        // normalize inputs
        this.baseKeys = baseKeys.map((v) => (v | 0) >>> 0);
        this.checksum = checksum;
        this.hashFunctions = hashFunctions.slice();
        this.spacing = Math.max(0, spacing | 0);
    }

    /**
     * Factory: build from a KeyDefinition (clean DI path).
     */
    static fromKeyDefinition(def: KeyDefinition): PartialKeyGenerator {
        return new PartialKeyGenerator(
            def.getBaseKeys(),
            def.getChecksum(),
            def.getHashFunctions(),
            def.getSpacing()
        );
    }

    /**
     * Factory: single-hash overload.
     */
    static fromSingleHash(
        checksum: Checksum16Interface,
        hash: HashInterface,
        baseKeys: number[]
    ): PartialKeyGenerator {
        return new PartialKeyGenerator(baseKeys, checksum, [hash], 0);
    }

    /**
     * Factory: multiple-hashes overload.
     */
    static fromMultipleHashes(
        checksum: Checksum16Interface,
        hashFunctions: HashInterface[],
        baseKeys: number[]
    ): PartialKeyGenerator {
        return new PartialKeyGenerator(baseKeys, checksum, hashFunctions, 0);
    }

    /** Spacing (group size for dashes); 0 = no dashes */
    setSpacing(spacing: number): void {
        this.spacing = Math.max(0, spacing | 0);
    }

    getSpacing(): number {
        return this.spacing;
    }

    /** Generate a key from a uint32 seed. */
    generate(seed: number): string {
        seed = seed >>> 0;

        const dataLen = this.baseKeys.length * 4 + 4;
        const data = new Uint8Array(dataLen);

        // write seed (LE)
        writeU32LE(data, 0, seed);

        // subkeys
        let hashIdx = 0;
        let offset = 4;
        const numHashes = this.hashFunctions.length;

        for (const base of this.baseKeys) {
            const digit = (seed ^ (base >>> 0)) >>> 0;
            const payload = packU32LE(digit); // LE

            const hval = this.hashFunctions[hashIdx].compute(payload) >>> 0;
            writeU32LE(data, offset, hval);

            offset += 4;
            hashIdx = (hashIdx + 1) % numHashes;
        }

        // checksum (LE 16-bit) over data
        const sum = this.checksum.compute(data) & 0xffff;
        const keyBytes = concat(data, packU16LE(sum));

        // Base32 encode
        let ret = Base32.toBase32(keyBytes);

        // Insert dashes if spacing > 0 (mirror the PHP logic)
        if (this.spacing > 0) {
            const L = ret.length;
            let groups = Math.trunc(L / this.spacing);
            if (L % this.spacing === 0) groups -= 1;

            for (let i = 0; i < groups; i++) {
                const pos = this.spacing + (i * this.spacing + i);
                ret = ret.slice(0, pos) + "-" + ret.slice(pos);
            }
        }

        return ret;
    }

    /** Generate from a string seed (UTF-8) using FNV-1a to produce the uint32 seed. */
    generateFromString(seed: string): string {
        if (!PartialKeyGenerator._defaultHash) {
            PartialKeyGenerator._defaultHash = new Fnv1a();
        }
        const seed32 = PartialKeyGenerator._defaultHash.compute(te.encode(seed)) >>> 0;
        return this.generate(seed32);
    }

    /**
     * Generate N random keys; returns Map<seed, key>.
     * If you need deterministic generation, pass a PRNG returning [0,1) like Math.random.
     */
    generateMany(
        numberOfKeys: number,
        rng?: () => number
    ): Map<number, string> {
        if (numberOfKeys < 0) throw new RangeError("numberOfKeys must be >= 0");

        const out = new Map<number, string>();

        const nextSeed = (): number => {
            if (rng) {
                // from [0,1) to 32-bit uint
                return Math.floor(rng() * 0x1_0000_0000) >>> 0;
            }
            // crypto-backed
            const buf = new Uint32Array(1);
            (globalThis.crypto?.getRandomValues ?? ((a: Uint32Array) => {
                // fallback (non-crypto)
                for (let i = 0; i < a.length; i++) a[i] = (Math.random() * 0x1_0000_0000) >>> 0;
                return a;
            }))(buf);
            return buf[0] >>> 0;
        };

        while (out.size < numberOfKeys) {
            const seed = nextSeed();
            if (!out.has(seed)) {
                out.set(seed, this.generate(seed));
            }
        }

        return out;
    }
}
