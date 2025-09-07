import { Checksum16Interface } from "./Checksum16Interface";
import { Checksum16Base } from "./Checksum16Base";

/**
 * CRC-16/IBM (ARC)
 * Poly: 0x8005, Init: 0x0000, Refin: true, Refout: true, Xorout: 0x0000.
 * Mirrors the provided PHP implementation exactly.
 */
export class Crc16 extends Checksum16Base implements Checksum16Interface {
    private static _table: Uint16Array | null = null;

    compute(data: Uint8Array): number {
        let remainder = 0; // 16-bit

        const tbl = Crc16.table();
        for (let i = 0; i < data.length; i++) {
            const byte = data[i] & 0xff;
            const index = (Crc16.reflect(byte, 8) ^ ((remainder >>> 8) & 0xff)) & 0xff;
            remainder = (tbl[index] ^ ((remainder << 8) & 0xffff)) & 0xffff;
        }

        return this.mask16(Crc16.reflect(remainder, 16));
    }

    /** Build table the same way as the PHP version (non-reflected poly, left shifts). */
    private static table(): Uint16Array {
        if (this._table) return this._table;

        const table = new Uint16Array(256);
        const TOPBIT = 1 << 15;
        const POLY = 0x8005;

        for (let dividend = 0; dividend < 256; dividend++) {
            let remainder = ((dividend << 8) & 0xffff) >>> 0;

            for (let bit = 8; bit > 0; bit--) {
                if ((remainder & TOPBIT) !== 0) {
                    remainder = (((remainder << 1) & 0xffff) ^ POLY) & 0xffff;
                } else {
                    remainder = (remainder << 1) & 0xffff;
                }
            }

            table[dividend] = remainder & 0xffff;
        }

        this._table = table;
        return table;
    }

    /** Reflect the lower nBits of `data` about the center bit. (nBits = 8 or 16) */
    private static reflect(data: number, nBits: number): number {
        let reflection = 0;
        for (let bit = 0; bit < nBits; bit++) {
            if ((data & 0x01) !== 0) {
                reflection |= 1 << ((nBits - 1) - bit);
            }
            data >>>= 1;
        }
        const mask = (1 << nBits) - 1;
        return reflection & mask;
    }
}
