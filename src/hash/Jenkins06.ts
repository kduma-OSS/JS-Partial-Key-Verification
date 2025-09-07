import { HashInterface } from "./HashInterface";
import { Hash32Base } from "./Hash32Base";

/**
 * Bob Jenkins' lookup3-style 32-bit hash (2006), with seed.
 * Mirrors the provided PHP implementation (including tail==0 early return).
 */
export class Jenkins06 extends Hash32Base implements HashInterface {
    private readonly seed: number;

    constructor(seed: number) {
        super();
        this.seed = this.mask32(seed);
    }

    compute(data: Uint8Array): number {
        let length = data.length >>> 0;
        let a = this.mask32(0xDEADBEEF + length + this.seed);
        let b = a;
        let c = a;

        // process all but the last (<=12) bytes
        let offset = 0;
        while (length > 12) {
            a = this.add32(a, data[offset++]);
            a = this.add32(a, (data[offset++] << 8));
            a = this.add32(a, (data[offset++] << 16));
            a = this.add32(a, (data[offset++] << 24));

            b = this.add32(b, data[offset++]);
            b = this.add32(b, (data[offset++] << 8));
            b = this.add32(b, (data[offset++] << 16));
            b = this.add32(b, (data[offset++] << 24));

            c = this.add32(c, data[offset++]);
            c = this.add32(c, (data[offset++] << 8));
            c = this.add32(c, (data[offset++] << 16));
            c = this.add32(c, (data[offset++] << 24));

            [a, b, c] = this.mix(a, b, c);
            length -= 12;
        }

        // last block (<= 12 bytes), fall-through by design
        switch (length) {
            case 12: c = this.add32(c, (data[offset + 11] << 24));
            // no break
            case 11: c = this.add32(c, (data[offset + 10] << 16));
            // no break
            case 10: c = this.add32(c, (data[offset + 9]  << 8));
            // no break
            case 9:  c = this.add32(c,  data[offset + 8]);
            // no break
            case 8:  b = this.add32(b, (data[offset + 7]  << 24));
            // no break
            case 7:  b = this.add32(b, (data[offset + 6]  << 16));
            // no break
            case 6:  b = this.add32(b, (data[offset + 5]  << 8));
            // no break
            case 5:  b = this.add32(b,  data[offset + 4]);
            // no break
            case 4:  a = this.add32(a, (data[offset + 3]  << 24));
            // no break
            case 3:  a = this.add32(a, (data[offset + 2]  << 16));
            // no break
            case 2:  a = this.add32(a, (data[offset + 1]  << 8));
            // no break
            case 1:  a = this.add32(a,  data[offset + 0]);
            // no break
            case 0:  break;
        }

        // Mirror PHP behavior: if tail length was 0, return c immediately
        if (length === 0) {
            return this.mask32(c);
        }

        [a, b, c] = this.finalMix(a, b, c);
        return this.mask32(c);
    }

    /** Main mixing step (exact order/ops as PHP `mix`) */
    private mix(a: number, b: number, c: number): [number, number, number] {
        a = this.sub32(a, c); a ^= this.rotl(c, 4 ); c = this.add32(c, b);
        b = this.sub32(b, a); b ^= this.rotl(a, 6 ); a = this.add32(a, c);
        c = this.sub32(c, b); c ^= this.rotl(b, 8 ); b = this.add32(b, a);
        a = this.sub32(a, c); a ^= this.rotl(c, 16); c = this.add32(c, b);
        b = this.sub32(b, a); b ^= this.rotl(a, 19); a = this.add32(a, c);
        c = this.sub32(c, b); c ^= this.rotl(b, 4 ); b = this.add32(b, a);
        return [this.mask32(a), this.mask32(b), this.mask32(c)];
    }

    /** Final scramble (exact order/ops as PHP `finalMix`) */
    private finalMix(a: number, b: number, c: number): [number, number, number] {
        c ^= b; c = this.sub32(c, this.rotl(b, 14));
        a ^= c; a = this.sub32(a, this.rotl(c, 11));
        b ^= a; b = this.sub32(b, this.rotl(a, 25));
        c ^= b; c = this.sub32(c, this.rotl(b, 16));
        a ^= c; a = this.sub32(a, this.rotl(c, 4 ));
        b ^= a; b = this.sub32(b, this.rotl(a, 14));
        c ^= b; c = this.sub32(c, this.rotl(b, 24));
        return [this.mask32(a), this.mask32(b), this.mask32(c)];
    }
}
