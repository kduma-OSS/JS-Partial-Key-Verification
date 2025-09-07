import { Checksum16Interface } from "../checksum/Checksum16Interface";
import { Adler16 } from "../checksum/Adler16";
import { Crc16 } from "../checksum/Crc16";
import { CrcCcitt } from "../checksum/CrcCcitt";
import { ChecksumType } from "./enums/ChecksumType";

/**
 * Factory method that creates a checksum implementation
 * from a ChecksumType enum value.
 */
export function createChecksum(type: ChecksumType): Checksum16Interface {
    switch (type) {
        case ChecksumType.Adler16:
            return new Adler16();
        case ChecksumType.Crc16:
            return new Crc16();
        case ChecksumType.CrcCcitt:
            return new CrcCcitt();
        default:
            throw new Error(`Unsupported ChecksumType: ${type}`);
    }
}
