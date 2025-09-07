import { HashInterface } from "../hash/HashInterface";
import { Crc32 } from "../hash/Crc32";
import { Fnv1a } from "../hash/Fnv1a";
import { GeneralizedCrc } from "../hash/GeneralizedCrc";
import { Jenkins06 } from "../hash/Jenkins06";
import { Jenkins96 } from "../hash/Jenkins96";
import { OneAtATime } from "../hash/OneAtATime";
import { SuperFast } from "../hash/SuperFast";
import { HashType } from "./enums/HashType";


/**
 * Factory method that creates a hash implementation
 * from a HashType enum value.
 *
 * Jenkins06 requires a seed → you can provide it with the `seed` argument.
 */
export function createHash(type: HashType, seed: number = 0): HashInterface {
    switch (type) {
        case HashType.Crc32:
            return new Crc32();
        case HashType.Fnv1A:
            return new Fnv1a();
        case HashType.GeneralizedCrc:
            return new GeneralizedCrc();
        case HashType.Jenkins06:
            return new Jenkins06(seed);
        case HashType.Jenkins96:
            return new Jenkins96();
        case HashType.OneAtATime:
            return new OneAtATime();
        case HashType.SuperFast:
            return new SuperFast();
        default:
            throw new Error(`Unsupported HashType: ${type}`);
    }
}