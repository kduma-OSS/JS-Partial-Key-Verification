import { KeyDefinition } from "./KeyDefinition";
import { PartialKeyGenerator } from "./PartialKeyGenerator";
import { ChecksumType } from "./enums/ChecksumType";
import { HashType } from "./enums/HashType";

/** Secure-ish integer in [min,max], using crypto when available (fallback: Math.random). */
function randomInt(min: number, max: number): number {
    if (min > max) [min, max] = [max, min];
    const range = (max - min + 1) >>> 0;

    const g = (n: number) => {
        // generate unbiased uint32 modulo range
        const maxUnbiased = Math.floor(0xffffffff / range) * range;
        let x: number;
        do {
            if (globalThis.crypto?.getRandomValues) {
                const buf = new Uint32Array(1);
                globalThis.crypto.getRandomValues(buf);
                x = buf[0] >>> 0;
            } else {
                // fallback (not crypto-strong)
                x = Math.floor(Math.random() * 0x1_0000_0000) >>> 0;
            }
        } while (x >= maxUnbiased);
        return min + (x % range);
    };

    return g(range);
}

/** Random uint32 (0..0xFFFFFFFF). */
function randomUint32(): number {
    if (globalThis.crypto?.getRandomValues) {
        const buf = new Uint32Array(1);
        globalThis.crypto.getRandomValues(buf);
        return buf[0] >>> 0;
    }
    // fallback
    const hi = randomInt(0, 0xffff);
    const lo = randomInt(0, 0xffff);
    return (((hi << 16) | lo) >>> 0);
}

/** All enum values as an array (for string enums). */
function enumValues<T extends string>(e: Record<string, T>): T[] {
    return Object.values(e) as T[];
}

/**
 * Builds random KeyDefinition instances and derives optimal spacing/mask.
 */
export class DefinitionGenerator {
    /**
     * Create a KeyDefinition with random checksum/hash selections and base keys.
     * Spacing and Mask are computed based on the generated key length.
     */
    static makeDefinition(numberOfKeys: number): KeyDefinition {
        const definition = new KeyDefinition();

        definition.setChecksumType(this.getRandomChecksumFunction());

        const hashes: HashType[] = [];
        const baseKeys: number[] = [];

        for (let i = 0; i < numberOfKeys; i++) {
            baseKeys.push(this.getRandomUint());
            hashes.push(this.getRandomHashFunction());
        }

        definition.setBaseKeys(baseKeys);
        definition.setHashTypes(hashes);

        definition.setSpacing(this.calculateOptimalSpacing(definition));
        definition.setMask(this.makeMask(definition));

        return definition;
    }

    /**
     * Build the visual mask (e.g., ">AAAAA-AAAAA-...") based on spacing and generated code length.
     */
    private static makeMask(definition: KeyDefinition): string {
        let mask = ">";

        // Generate a sample key with spacing = 0 to measure raw code length
        const generator = PartialKeyGenerator.fromKeyDefinition(definition);
        generator.setSpacing(0);
        const codeLength = generator.generate(0).length;

        const spacing = definition.getSpacing();
        if (spacing === 0) {
            return mask + "A".repeat(codeLength);
        }

        let remaining = codeLength;
        while (remaining > 0) {
            const take = Math.min(spacing, remaining);
            mask += "A".repeat(take);

            remaining -= take;
            if (remaining > 0) {
                mask += "-";
            }
        }

        return mask;
    }

    /**
     * Choose a spacing that makes chunks relatively even and human-readable.
     * Returns 0 (no grouping) for very long codes.
     */
    private static calculateOptimalSpacing(definition: KeyDefinition): number {
        const generator = PartialKeyGenerator.fromKeyDefinition(definition);
        const codeLength = generator.generate(0).length;

        let min = 0;
        let max = 0;

        if (codeLength < 30) {
            min = 4;
            max = 9;
        } else if (codeLength < 45) {
            min = 6;
            max = 10;
        } else if (codeLength < 60) {
            min = 8;
            max = 15;
        } else if (codeLength < 85) {
            min = 10;
            max = 20;
        } else {
            return 0; // too long—don’t group
        }

        // If perfectly divisible by any candidate, pick it immediately
        for (let opt = min; opt <= max; opt++) {
            if (codeLength % opt === 0) {
                return opt;
            }
        }

        // Otherwise pick the one minimizing leftover, then the smaller group size
        const scores = new Map<number, number>(); // groupSize => score
        for (let opt = min; opt <= max; opt++) {
            scores.set(opt, Math.abs((codeLength % opt) - opt));
        }

        // sort by score asc, then by key asc
        const sorted = [...scores.entries()].sort((a, b) =>
            a[1] === b[1] ? a[0] - b[0] : a[1] - b[1]
        );

        return sorted[0][0] | 0;
    }

    /**
     * Random hash type (excluding Jenkins06, as in original behavior).
     */
    private static getRandomHashFunction(): HashType {
        const all = enumValues(HashType);
        const filtered = all.filter((t) => t !== HashType.Jenkins06);
        const idx = randomInt(0, filtered.length - 1);
        return filtered[idx];
    }

    /**
     * Random checksum type.
     */
    private static getRandomChecksumFunction(): ChecksumType {
        const all = enumValues(ChecksumType);
        const idx = randomInt(0, all.length - 1);
        return all[idx];
    }

    /**
     * Random uint32 (0..0xFFFFFFFF).
     */
    private static getRandomUint(): number {
        return randomUint32();
    }
}
