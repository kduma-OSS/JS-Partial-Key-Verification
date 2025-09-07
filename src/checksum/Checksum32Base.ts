import { Checksum32Interface } from "./Checksum32Interface";

/**
 * Base class for 32-bit checksum implementations.
 * Implements Checksum32Interface and provides common helpers.
 */
export abstract class Checksum32Base implements Checksum32Interface {
    /** Compute a 32-bit checksum (must be implemented in subclasses). */
    abstract compute(data: Uint8Array): number;

    /** Force unsigned 32-bit. */
    protected mask32(value: number): number {
        return value >>> 0;
    }

    /** Add two 32-bit values with wraparound (optional helper). */
    protected add32(a: number, b: number): number {
        return (a + b) >>> 0;
    }
}
