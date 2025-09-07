import { HashInterface } from "./HashInterface";
import { Hash32Base } from "./Hash32Base";

/**
 * Bob Jenkins' One-at-a-Time (OAAT) 32-bit hash.
 * Ref: http://www.burtleburtle.net/bob/hash/doobs.html
 */
export class OneAtATime extends Hash32Base implements HashInterface {
    compute(data: Uint8Array): number {
        let h = 0;

        for (let i = 0; i < data.length; i++) {
            h = this.mask32(h + data[i]);
            h = this.mask32(h + (h << 10));
            h = this.mask32(h ^ (h >>> 6));
        }

        h = this.mask32(h + (h << 3));
        h = this.mask32(h ^ (h >>> 11));
        h = this.mask32(h + (h << 15));

        return this.mask32(h);
    }
}
