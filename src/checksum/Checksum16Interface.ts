/**
 * Classes that implement this interface should create a 16-bit checksum
 * of the given binary data.
 */
export interface Checksum16Interface {
    /**
     * Compute a 16-bit checksum for the given binary data.
     *
     * @param data Binary data (Uint8Array, equivalent to PHP's binary string or C#'s byte[]).
     * @returns Unsigned 16-bit checksum value (0 … 65535).
     */
    compute(data: Uint8Array): number;
}
