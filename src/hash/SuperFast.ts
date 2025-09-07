import { HashInterface } from "./HashInterface";
import { Hash32Base } from "./Hash32Base";
import { u16LE } from "../utils/endian";

/**
 * Paul Hsieh's SuperFastHash (32-bit), operating on little-endian 16-bit pairs.
 * Mirrors your PHP implementation exactly.
 */
export class SuperFast extends Hash32Base implements HashInterface {
    compute(data: Uint8Array): number {
        const len = data.length;
        let hash = this.mask32(len);

        let rem = len & 3;        // leftover bytes after 16-bit pairs
        let pairs = len >> 2;     // number of 16-bit pairs processed per loop (2 words = 4 bytes)
        let offset = 0;

        // Main loop: two u16 LE reads per iteration
        while (pairs-- > 0) {
            hash = this.mask32(hash + u16LE(data, offset));
            offset += 2;

            const next = u16LE(data, offset);
            offset += 2;

            const tmp = this.mask32((next << 11) ^ hash);
            hash = this.mask32((hash << 16) ^ tmp);
            hash = this.mask32(hash + (hash >>> 11));
        }

        // Tail
        switch (rem) {
            case 3: {
                hash = this.mask32(hash + u16LE(data, offset));
                offset += 2;
                hash = this.mask32(hash ^ (hash << 16));
                hash = this.mask32(hash ^ (data[offset] << 18));
                hash = this.mask32(hash + (hash >>> 11));
                break;
            }
            case 2: {
                hash = this.mask32(hash + u16LE(data, offset));
                hash = this.mask32(hash ^ (hash << 11));
                hash = this.mask32(hash + (hash >>> 17));
                break;
            }
            case 1: {
                hash = this.mask32(hash + data[offset]);
                hash = this.mask32(hash ^ (hash << 10));
                hash = this.mask32(hash + (hash >>> 1));
                break;
            }
            case 0:
                // nothing
                break;
        }

        // Final avalanching of 127 bits
        hash = this.mask32(hash ^ (hash << 3));
        hash = this.mask32(hash + (hash >>> 5));
        hash = this.mask32(hash ^ (hash << 4));
        hash = this.mask32(hash + (hash >>> 17));
        hash = this.mask32(hash ^ (hash << 25));
        hash = this.mask32(hash + (hash >>> 6));

        return this.mask32(hash);
    }
}
