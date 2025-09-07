import { ChecksumType } from "./enums/ChecksumType";
import { HashType } from "./enums/HashType";

import type { Checksum16Interface } from "../checksum/Checksum16Interface";
import type { HashInterface } from "../hash/HashInterface";

import { createChecksum } from "./checksumFactory";
import { createHash } from "./hashFactory";

/**
 * Definition of how keys are generated/validated (checksum, hash functions, base keys, mask).
 * Uses factories for instantiation. Jenkins06 remains unsupported here.
 */
export class KeyDefinition {
    private baseKeys: number[] = [];
    private checksum!: ChecksumType;
    private hashFunctions: HashType[] = [];
    private spacing = 0;
    private mask = "";

    constructor() {
        this.baseKeys = [];
        this.hashFunctions = [];
    }

    /** Getters / Setters */
    getBaseKeys(): number[] {
        return this.baseKeys;
    }
    setBaseKeys(keys: number[]): void {
        this.baseKeys = keys.map((k) => (k | 0) >>> 0);
    }

    getChecksumType(): ChecksumType {
        return this.checksum;
    }
    setChecksumType(checksum: ChecksumType): void {
        this.checksum = checksum;
    }

    getHashTypes(): HashType[] {
        return this.hashFunctions;
    }
    setHashTypes(hashTypes: HashType[]): void {
        this.hashFunctions = hashTypes.slice();
    }

    getSpacing(): number {
        return this.spacing | 0;
    }
    setSpacing(spacing: number): void {
        this.spacing = spacing | 0;
    }

    getMask(): string {
        return this.mask;
    }
    setMask(mask: string): void {
        this.mask = mask;
    }

    /** Instantiate the configured checksum algorithm via the factory. */
    getChecksum(): Checksum16Interface {
        return createChecksum(this.checksum);
    }

    /**
     * Instantiate the configured hash algorithms via the factory.
     * Jenkins06 is intentionally unsupported here (throw like PHP).
     */
    getHashFunctions(): HashInterface[] {
        return this.hashFunctions.map((type) => {
            if (type === HashType.Jenkins06) {
                throw new RangeError("Jenkins06 not supported in this context");
            }
            // All other hashes are parameterless in our factory
            return createHash(type);
        });
    }
}
