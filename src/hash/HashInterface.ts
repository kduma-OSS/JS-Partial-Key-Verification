/**
 * Classes that implement this interface should create a 32-bit hash
 * of the given binary data.
 */
export interface HashInterface {
    /**
     * Compute a 32-bit hash of the given binary data.
     *
     * @param data Binary data (equivalent to PHP's binary string or C#'s byte[]).
     *             Can be either a UTF-8 string or a Uint8Array.
     * @returns Unsigned 32-bit hash value (0 … 4,294,967,295).
     */
    compute(data: string | Uint8Array): number;
}
