import { Checksum16Interface } from "./Checksum16Interface";
import { Checksum16Base } from "./Checksum16Base";

/**
 * CRC-CCITT (False)
 * Poly: 0x1021, Init: 0xFFFF, Refin: false, Refout: false, Xorout: 0x0000.
 * Mirrors the provided PHP implementation exactly.
 */
export class CrcCcitt extends Checksum16Base implements Checksum16Interface {
    private static _table: Uint16Array | null = null;

    compute(data: Uint8Array): number {
        let remainder = 0xFFFF; // 16-bit

        const tbl = CrcCcitt.table();
        for (let i = 0; i < data.length; i++) {
            const byte = data[i] & 0xff;
            const index = (byte ^ ((remainder >>> 8) & 0xff)) & 0xff;
            remainder = (tbl[index] ^ ((remainder << 8) & 0xffff)) & 0xffff;
        }

        return this.mask16(remainder);
    }

    /** Build table the same way as the PHP version (non-reflected poly, left shifts). */
    private static table(): Uint16Array {
        if (this._table) return this._table;

        const table = new Uint16Array(256);
        const TOPBIT = 1 << 15;
        const POLY = 0x1021;

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
}
