import { HashInterface } from "./HashInterface";
import { Hash32Base } from "./Hash32Base";
import { Checksum32Interface } from "../checksum/Checksum32Interface";

/**
 * CRC-32 / ISO-HDLC
 * Poly: 0x04C11DB7, Init: 0xFFFFFFFF, Refin: true, Refout: true, Xorout: 0xFFFFFFFF.
 * Matches standard CRC-32 used by many tools.
 */
export class Crc32 extends Hash32Base implements HashInterface, Checksum32Interface {
    private static _table: Uint32Array | null = null;

    compute(data: Uint8Array): number {
        let remainder = 0xFFFFFFFF;

        const tbl = Crc32.table();
        for (let i = 0; i < data.length; i++) {
            const byte = data[i] & 0xff;
            const index = (Crc32.reflect(byte, 8) ^ ((remainder >>> 24) & 0xff)) & 0xff;
            remainder = this.mask32(tbl[index] ^ (remainder << 8));
        }

        const final = this.mask32(Crc32.reflect(remainder, 32) ^ 0xFFFFFFFF);
        return this.mask32(final);
    }

    /** Build same table as PHP version (non-reflected poly, left shifts). */
    private static table(): Uint32Array {
        if (this._table) return this._table;

        const table = new Uint32Array(256);
        const POLY = 0x04C11DB7;
        const TOPBIT = 1 << 31;

        for (let dividend = 0; dividend < 256; dividend++) {
            let remainder = (dividend << 24) >>> 0;
            for (let bit = 8; bit > 0; bit--) {
                if ((remainder & TOPBIT) !== 0) {
                    remainder = (((remainder << 1) >>> 0) ^ POLY) >>> 0;
                } else {
                    remainder = (remainder << 1) >>> 0;
                }
            }
            table[dividend] = remainder >>> 0;
        }

        this._table = table;
        return table;
    }

    /** Bit reflection helper (same logic as PHP reflect()). */
    private static reflect(data: number, nBits: number): number {
        let reflection = 0 >>> 0;
        for (let bit = 0; bit < nBits; bit++) {
            if (data & 0x01) reflection |= 1 << ((nBits - 1) - bit);
            data >>>= 1;
        }
        const mask = nBits === 32 ? 0xFFFFFFFF : (1 << nBits) - 1;
        return (reflection & mask) >>> 0;
    }
}
