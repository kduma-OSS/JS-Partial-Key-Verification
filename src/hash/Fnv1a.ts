import { HashInterface } from "./HashInterface";
import { Hash32Base } from "./Hash32Base";

/**
 * Implementation of the FNV-1a 32-bit hash function.
 * Spec: http://isthe.com/chongo/tech/comp/fnv/
 */
export class Fnv1a extends Hash32Base implements HashInterface {
    private static readonly OFFSET_BASIS = 0x811C9DC5; // 2166136261
    private static readonly FNV_PRIME     = 0x01000193; // 16777619

    compute(data: Uint8Array): number {
        let h = Fnv1a.OFFSET_BASIS;

        for (let i = 0; i < data.length; i++) {
            h = this.mask32(h ^ data[i]);
            // Math.imul ensures 32-bit overflow semantics
            h = this.mask32(Math.imul(h, Fnv1a.FNV_PRIME));
        }

        return this.mask32(h);
    }
}
