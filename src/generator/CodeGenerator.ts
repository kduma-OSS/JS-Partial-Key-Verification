import { KeyDefinition } from "./KeyDefinition";
import { ChecksumType } from "./enums/ChecksumType";
import { HashType } from "./enums/HashType";

/**
 * Generates a TypeScript validation method with imports based on a KeyDefinition.
 */
export class CodeGenerator {
    private validateUsername = false;
    private definition: KeyDefinition;

    private verifiedKeys: number[] = [];
    private blacklistedSerials: number[] = [];

    constructor(definition: KeyDefinition) {
        this.definition = definition;
    }

    public setValidateUsername(validate: boolean): void {
        this.validateUsername = validate;
    }

    public getValidateUsername(): boolean {
        return this.validateUsername;
    }

    public getDefinition(): KeyDefinition {
        return this.definition;
    }

    public setVerifiedKeys(keys: Iterable<number>): void {
        this.verifiedKeys = Array.from(keys).map(k => k | 0);
    }

    public setBlacklistedSerials(serials: Iterable<number>): void {
        this.blacklistedSerials = Array.from(serials).map(s => s >>> 0);
    }

    public getBlacklistedSerials(): number[] {
        return [...this.blacklistedSerials];
    }

    /**
     * Render a full TypeScript snippet including imports + method code.
     */
    public toString(): string {
        if (this.verifiedKeys.length === 0) return "";

        const checksumClass = this.mapChecksumClass(this.definition.getChecksumType());
        const hashTypes = this.definition.getHashTypes();
        const baseKeys = this.definition.getBaseKeys();

        const nl = "\n";
        const tab = "  ";
        let code = "";

        // Collect imports
        const imports = new Set<string>();
        imports.add("PartialKeyValidator");
        imports.add("Fnv1a"); // always used if validateUsername=true

        imports.add(checksumClass);
        for (const keyIndex of this.verifiedKeys) {
            if (keyIndex >= 0 && keyIndex < hashTypes.length) {
                imports.add(this.mapHashClass(hashTypes[keyIndex]));
            }
        }

        // Header with imports
        code += `// Auto-generated validation snippet${nl}`;
        imports.forEach(imp => {
            code += `import { ${imp} } from "../";${nl}`;
        });
        code += nl;

        // Method signature
        const sigParams = this.validateUsername ? "userName: string, key: string" : "key: string";
        code += `private static validateKey(${sigParams}): boolean {${nl}`;

        if (this.validateUsername) {
            code += `${tab}const validator = new PartialKeyValidator(new Fnv1a());${nl}${nl}`;
        }

        if (this.blacklistedSerials.length > 0) {
            code += `${tab}const seed = PartialKeyValidator.getSerialNumberFromKey(key);${nl}`;
            code += `${tab}const blacklist = [${this.blacklistedSerials.join(", ")}];${nl}`;
            code += `${tab}if (blacklist.includes(seed)) return false;${nl}${nl}`;
        }

        for (const keyIndex of this.verifiedKeys) {
            if (keyIndex < 0 || keyIndex >= hashTypes.length || keyIndex >= baseKeys.length) continue;

            const hashClass = this.mapHashClass(hashTypes[keyIndex]);
            const base = baseKeys[keyIndex] >>> 0;

            code += `${tab}// Validation for key with index ${keyIndex}${nl}`;

            if (this.validateUsername) {
                code += `${tab}if (!validator.validateKeyWithSeedString(new ${checksumClass}(), new ${hashClass}(), key, ${keyIndex}, ${base}, userName)) return false;${nl}${nl}`;
            } else {
                code += `${tab}if (!PartialKeyValidator.validateKey(new ${checksumClass}(), new ${hashClass}(), key, ${keyIndex}, ${base})) return false;${nl}${nl}`;
            }
        }

        code += `${tab}return true;${nl}`;
        code += `}${nl}`;

        return code;
    }

    private mapChecksumClass(type: ChecksumType): string {
        switch (type) {
            case ChecksumType.Adler16:
                return "Adler16";
            case ChecksumType.Crc16:
                return "Crc16";
            case ChecksumType.CrcCcitt:
                return "CrcCcitt";
            default:
                throw new Error(`Unsupported ChecksumType: ${type}`);
        }
    }

    private mapHashClass(type: HashType): string {
        switch (type) {
            case HashType.Crc32:
                return "Crc32";
            case HashType.Fnv1A:
                return "Fnv1a";
            case HashType.GeneralizedCrc:
                return "GeneralizedCrc";
            case HashType.Jenkins06:
                return "Jenkins06";
            case HashType.Jenkins96:
                return "Jenkins96";
            case HashType.OneAtATime:
                return "OneAtATime";
            case HashType.SuperFast:
                return "SuperFast";
            default:
                throw new Error(`Unsupported HashType: ${type}`);
        }
    }
}
