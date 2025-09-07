import { HashInterface } from "./HashInterface";
import { Hash32Base } from "./Hash32Base";

/**
 * Bob Jenkins' lookup2 (1996) 32-bit hash.
 * Mirrors the PHP implementation exactly.
 */
export class Jenkins96 extends Hash32Base implements HashInterface {
    compute(data: Uint8Array): number {
        const len = data.length >>> 0;

        // internal state (uint32)
        let a = 0x9E3779B9;
        let b = 0x9E3779B9;
        let c = 0;

        let i = 0;

        // Process 12-byte blocks
        while (i + 12 <= len) {
            a = this.add32(a, data[i++]);
            a = this.add32(a, data[i++] << 8);
            a = this.add32(a, data[i++] << 16);
            a = this.add32(a, data[i++] << 24);

            b = this.add32(b, data[i++]);
            b = this.add32(b, data[i++] << 8);
            b = this.add32(b, data[i++] << 16);
            b = this.add32(b, data[i++] << 24);

            c = this.add32(c, data[i++]);
            c = this.add32(c, data[i++] << 8);
            c = this.add32(c, data[i++] << 16);
            c = this.add32(c, data[i++] << 24);

            [a, b, c] = this.mix(a, b, c);
        }

        // Tail
        c = this.add32(c, len);

        if (i < len) a = this.add32(a, data[i++]);
        if (i < len) a = this.add32(a, data[i++] << 8);
        if (i < len) a = this.add32(a, data[i++] << 16);
        if (i < len) a = this.add32(a, data[i++] << 24);

        if (i < len) b = this.add32(b, data[i++]);
        if (i < len) b = this.add32(b, data[i++] << 8);
        if (i < len) b = this.add32(b, data[i++] << 16);
        if (i < len) b = this.add32(b, data[i++] << 24);

        if (i < len) c = this.add32(c, data[i++] << 8);
        if (i < len) c = this.add32(c, data[i++] << 16);
        if (i < len) c = this.add32(c, data[i] << 24);

        [a, b, c] = this.mix(a, b, c);

        return this.mask32(c);
    }

    /** The lookup2 "mix" (exact order/ops as PHP mix) */
    private mix(a: number, b: number, c: number): [number, number, number] {
        a = this.sub32(a, b); a = this.sub32(a, c); a ^= c >>> 13;
        b = this.sub32(b, c); b = this.sub32(b, a); b ^= (a << 8);
        c = this.sub32(c, a); c = this.sub32(c, b); c ^= b >>> 13;
        a = this.sub32(a, b); a = this.sub32(a, c); a ^= c >>> 12;
        b = this.sub32(b, c); b = this.sub32(b, a); b ^= (a << 16);
        c = this.sub32(c, a); c = this.sub32(c, b); c ^= b >>> 5;
        a = this.sub32(a, b); a = this.sub32(a, c); a ^= c >>> 3;
        b = this.sub32(b, c); b = this.sub32(b, a); b ^= (a << 10);
        c = this.sub32(c, a); c = this.sub32(c, b); c ^= b >>> 15;
        return [this.mask32(a), this.mask32(b), this.mask32(c)];
    }
}
