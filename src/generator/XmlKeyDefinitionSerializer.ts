import { KeyDefinition } from "./KeyDefinition";
import { ChecksumType } from "./enums/ChecksumType";
import { HashType } from "./enums/HashType";

function xmlEscape(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

export class XmlKeyDefinitionSerializer {
    /**
     * Serialize a KeyDefinition into the requested XML format.
     * Produces pretty-printed XML with two-space indentation,
     * matching the shape used in tests.
     */
    static serialize(def: KeyDefinition): string {
        const NL = "\n";
        const pad = (n: number) => "  ".repeat(n);

        const lines: string[] = [];
        // Match sample header exactly (no encoding attribute)
        lines.push(`<?xml version="1.0"?>`);
        lines.push(
            `<KeyDefinition xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">`
        );

        // <BaseKeys>...</BaseKeys>
        lines.push(`${pad(1)}<BaseKeys>`);
        for (const k of def.getBaseKeys()) {
            const unsigned = (k >>> 0).toString();
            lines.push(`${pad(2)}<unsignedInt>${unsigned}</unsignedInt>`);
        }
        lines.push(`${pad(1)}</BaseKeys>`);

        // <Checksum>Adler16</Checksum>
        lines.push(`${pad(1)}<Checksum>${def.getChecksumType()}</Checksum>`);

        // <HashFunctions>...</HashFunctions>
        lines.push(`${pad(1)}<HashFunctions>`);
        for (const h of def.getHashTypes()) {
            lines.push(`${pad(2)}<HashType>${h}</HashType>`);
        }
        lines.push(`${pad(1)}</HashFunctions>`);

        // <Spacing>6</Spacing>
        lines.push(`${pad(1)}<Spacing>${def.getSpacing()}</Spacing>`);

        // <Mask>…</Mask> (escape leading '>' etc.)
        lines.push(`${pad(1)}<Mask>${xmlEscape(def.getMask())}</Mask>`);

        lines.push(`</KeyDefinition>`);

        // Join with newlines to preserve whitespace text nodes
        return lines.join(NL);
    }

    /**
     * Parse the XML string and build a KeyDefinition instance.
     */
    static deserialize(xml: string): KeyDefinition {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xml, "application/xml");

        const root = doc.documentElement;
        if (!root || root.nodeName !== "KeyDefinition") {
            throw new Error("Missing <KeyDefinition> root element");
        }

        const def = new KeyDefinition();

        // BaseKeys
        const baseKeysEl = root.getElementsByTagName("BaseKeys")[0];
        if (baseKeysEl) {
            const unsignedInts = baseKeysEl.getElementsByTagName("unsignedInt");
            const keys: number[] = [];
            for (let i = 0; i < unsignedInts.length; i++) {
                const val = unsignedInts[i].textContent?.trim() ?? "0";
                keys.push(parseInt(val, 10) >>> 0);
            }
            def.setBaseKeys(keys);
        }

        // Checksum
        const checksumEl = root.getElementsByTagName("Checksum")[0];
        if (!checksumEl || !checksumEl.textContent) {
            throw new Error("Missing <Checksum>");
        }
        def.setChecksumType(checksumEl.textContent.trim() as ChecksumType);

        // HashFunctions
        const hashFnsEl = root.getElementsByTagName("HashFunctions")[0];
        if (hashFnsEl) {
            const hashTypes: HashType[] = [];
            const children = hashFnsEl.getElementsByTagName("HashType");
            for (let i = 0; i < children.length; i++) {
                const val = (children[i].textContent || "").trim() as HashType;
                hashTypes.push(val);
            }
            def.setHashTypes(hashTypes);
        }

        // Spacing
        const spacingEl = root.getElementsByTagName("Spacing")[0];
        if (spacingEl && spacingEl.textContent) {
            def.setSpacing(parseInt(spacingEl.textContent.trim(), 10) | 0);
        }

        // Mask
        const maskEl = root.getElementsByTagName("Mask")[0];
        def.setMask(maskEl?.textContent ?? "");

        return def;
    }
}
