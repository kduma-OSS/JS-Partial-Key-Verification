/**
 * Classes that implement this interface should create a 32-bit checksum
 * of the given binary data.
 */
export interface Checksum32Interface {
    /**
     * Compute a 32-bit checksum for the given binary data.
     *
     * @param data Binary data (Uint8Array, equivalent to PHP's binary string or C#'s byte[]).
     * @returns Unsigned 32-bit checksum value (0 … 4,294,967,295).
     */
    compute(data: Uint8Array): number;
}
