import { Checksum16Interface } from "./Checksum16Interface";

/**
 * Base class for 16-bit checksum implementations.
 * Implements Checksum16Interface and provides common helpers.
 */
export abstract class Checksum16Base implements Checksum16Interface {
    /** Compute a 16-bit checksum (must be implemented in subclasses). */
    abstract compute(data: Uint8Array): number;

    /** Mask any number down to unsigned 16-bit. */
    protected mask16(value: number): number {
        return value & 0xFFFF;
    }

    /** Add two 16-bit values with wraparound (optional helper). */
    protected add16(a: number, b: number): number {
        return (a + b) & 0xFFFF;
    }
}
