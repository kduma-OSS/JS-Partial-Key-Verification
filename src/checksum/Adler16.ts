import { Checksum16Interface } from "./Checksum16Interface";
import { Checksum16Base } from "./Checksum16Base";

/**
 * Adler-16 checksum (mod 251), chunked processing (5550 bytes),
 * returning (b << 8) | a as an unsigned 16-bit value.
 * Mirrors the provided PHP/C# logic exactly.
 */
export class Adler16 extends Checksum16Base implements Checksum16Interface {
    compute(data: Uint8Array): number {
        let a = 1;
        let b = 0;

        let len = data.length;
        let offset = 0;

        while (len > 0) {
            const tlen = len < 5550 ? len : 5550;
            len -= tlen;

            let n = tlen;
            do {
                a += data[offset++];
                b += a;
            } while (--n > 0);

            a %= 251;
            b %= 251;
        }

        return this.mask16((b << 8) | a);
    }
}
