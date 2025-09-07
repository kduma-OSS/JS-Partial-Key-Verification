/** Read unsigned 32-bit little-endian from a byte array. */
export function u32LE(bytes: Uint8Array, offset: number): number {
    return (
        bytes[offset] |
        (bytes[offset + 1] << 8) |
        (bytes[offset + 2] << 16) |
        (bytes[offset + 3] << 24)
    ) >>> 0;
}

/** Read unsigned 32-bit big-endian from a byte array. */
export function u32BE(bytes: Uint8Array, offset: number): number {
    return (
        (bytes[offset] << 24) |
        (bytes[offset + 1] << 16) |
        (bytes[offset + 2] << 8) |
        bytes[offset + 3]
    ) >>> 0;
}

/** Write unsigned 32-bit little-endian into a byte array. */
export function setU32LE(bytes: Uint8Array, offset: number, value: number): void {
    bytes[offset] = value & 0xFF;
    bytes[offset + 1] = (value >>> 8) & 0xFF;
    bytes[offset + 2] = (value >>> 16) & 0xFF;
    bytes[offset + 3] = (value >>> 24) & 0xFF;
}

/** Write unsigned 32-bit big-endian into a byte array. */
export function setU32BE(bytes: Uint8Array, offset: number, value: number): void {
    bytes[offset] = (value >>> 24) & 0xFF;
    bytes[offset + 1] = (value >>> 16) & 0xFF;
    bytes[offset + 2] = (value >>> 8) & 0xFF;
    bytes[offset + 3] = value & 0xFF;
}

/** Read unsigned 16-bit little-endian from a byte array. */
export function u16LE(bytes: Uint8Array, offset: number): number {
    return (bytes[offset] | (bytes[offset + 1] << 8)) & 0xFFFF;
}

/** Read unsigned 16-bit big-endian from a byte array. */
export function u16BE(bytes: Uint8Array, offset: number): number {
    return ((bytes[offset] << 8) | bytes[offset + 1]) & 0xFFFF;
}

/** Write unsigned 16-bit little-endian into a byte array. */
export function setU16LE(bytes: Uint8Array, offset: number, value: number): void {
    bytes[offset] = value & 0xFF;
    bytes[offset + 1] = (value >>> 8) & 0xFF;
}

/** Write unsigned 16-bit big-endian into a byte array. */
export function setU16BE(bytes: Uint8Array, offset: number, value: number): void {
    bytes[offset] = (value >>> 8) & 0xFF;
    bytes[offset + 1] = value & 0xFF;
}

/** Extract a 32-bit word array (little-endian) from a Uint8Array. */
export function toU32ArrayLE(bytes: Uint8Array): number[] {
    const out: number[] = [];
    for (let i = 0; i + 3 < bytes.length; i += 4) {
        out.push(u32LE(bytes, i));
    }
    return out;
}

/** Extract a 32-bit word array (big-endian) from a Uint8Array. */
export function toU32ArrayBE(bytes: Uint8Array): number[] {
    const out: number[] = [];
    for (let i = 0; i + 3 < bytes.length; i += 4) {
        out.push(u32BE(bytes, i));
    }
    return out;
}
