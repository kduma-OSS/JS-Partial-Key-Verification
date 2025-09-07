import { HashInterface } from "./HashInterface";

/**
 * Base class for 32-bit hash implementations.
 * Implements HashInterface and provides common helpers.
 */
export abstract class Hash32Base implements HashInterface {
    /** Compute a 32-bit hash (must be implemented in subclasses). */
    abstract compute(data: Uint8Array): number;

    /** Force unsigned 32-bit. */
    protected mask32(value: number): number {
        return value >>> 0;
    }

    protected add32(a: number, b: number): number {
        return (a + b) >>> 0;
    }
    protected sub32(a: number, b: number): number {
        return (a - b) >>> 0;
    }

    /** Rotate left (ROL) on 32-bit words. */
    protected rotl(x: number, r: number): number {
        return ((x << r) | (x >>> (32 - r))) >>> 0;
    }

    /** Rotate right (ROR) on 32-bit words. */
    protected rotr(x: number, r: number): number {
        return ((x >>> r) | (x << (32 - r))) >>> 0;
    }
}
