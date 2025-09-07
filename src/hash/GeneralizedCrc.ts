import { HashInterface } from "./HashInterface";
import { Hash32Base } from "./Hash32Base";

/**
 * Generalized CRC-like 32-bit hash (matches your PHP implementation exactly).
 *
 * - Hash starts as data.length (masked to 32-bit)
 * - Each byte: idx = ((hash & 0xFF) ^ byte) & 0xFF
 *              hash = ((hash >>> 8) ^ TABLE[idx]) >>> 0
 * - Table is generated via four 5-round phases with +1/+2/+3/+4 increments.
 */
export class GeneralizedCrc extends Hash32Base implements HashInterface {
    private static _table: Uint32Array | null = null;

    compute(data: Uint8Array): number {
        let hash = this.mask32(data.length);

        const tbl = GeneralizedCrc.table();
        for (let i = 0; i < data.length; i++) {
            const idx = ((hash & 0xff) ^ (data[i] & 0xff)) & 0xff;
            hash = this.mask32((hash >>> 8) ^ tbl[idx]);
        }

        return this.mask32(hash);
    }

    /** Same table generation as in the PHP version. */
    private static table(): Uint32Array {
        if (this._table) return this._table;

        const table = new Uint32Array(256);

        for (let i = 0; i < 256; i++) {
            let x = i & 0xff;

            // 1st phase (5 rounds; +1)
            for (let j = 0; j < 5; j++) {
                x = (x + 1) & 0xff;
                x = (x + ((x << 1) & 0xff)) & 0xff;
                x ^= x >> 1;
                x &= 0xff;
            }
            let val = x & 0xff;

            // 2nd phase (5 rounds; +2) -> bits 8..15
            for (let j = 0; j < 5; j++) {
                x = (x + 2) & 0xff;
                x = (x + ((x << 1) & 0xff)) & 0xff;
                x ^= x >> 1;
                x &= 0xff;
            }
            val ^= (x & 0xff) << 8;

            // 3rd phase (5 rounds; +3) -> bits 16..23
            for (let j = 0; j < 5; j++) {
                x = (x + 3) & 0xff;
                x = (x + ((x << 1) & 0xff)) & 0xff;
                x ^= x >> 1;
                x &= 0xff;
            }
            val ^= (x & 0xff) << 16;

            // 4th phase (5 rounds; +4) -> bits 24..31
            for (let j = 0; j < 5; j++) {
                x = (x + 4) & 0xff;
                x = (x + ((x << 1) & 0xff)) & 0xff;
                x ^= x >> 1;
                x &= 0xff;
            }
            val ^= (x & 0xff) << 24;

            table[i] = (val >>> 0) & 0xFFFFFFFF;
        }

        this._table = table;
        return table;
    }
}
