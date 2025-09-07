import { describe, it, expect } from "vitest";
import { XmlKeyDefinitionSerializer } from "../../src";
import { KeyDefinition } from "../../src";
import { ChecksumType } from "../../src";
import { HashType } from "../../src";

const SAMPLE_XML = `<?xml version="1.0"?>
<KeyDefinition xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <BaseKeys>
    <unsignedInt>3129109879</unsignedInt>
    <unsignedInt>766109221</unsignedInt>
    <unsignedInt>534025585</unsignedInt>
    <unsignedInt>1416678536</unsignedInt>
    <unsignedInt>4072442218</unsignedInt>
  </BaseKeys>
  <Checksum>Adler16</Checksum>
  <HashFunctions>
    <HashType>Jenkins96</HashType>
    <HashType>OneAtATime</HashType>
    <HashType>OneAtATime</HashType>
    <HashType>GeneralizedCrc</HashType>
    <HashType>SuperFast</HashType>
  </HashFunctions>
  <Spacing>6</Spacing>
  <Mask>&gt;AAAAAA-AAAAAA-AAAAAA-AAAAAA-AAAAAA-AAAAAA-AAAAAA</Mask>
</KeyDefinition>
`;

function canonicalizeXml(xml: string): string {
    // Relies on a DOM-like test environment (e.g., jsdom / happy-dom in Vitest).
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, "application/xml");
    const ser = new XMLSerializer();
    return ser.serializeToString(doc);
}

describe("XmlKeyDefinitionSerializer", () => {
    it("deserialize sample XML", () => {
        const def = XmlKeyDefinitionSerializer.deserialize(SAMPLE_XML);

        expect(def.getBaseKeys()).toEqual([
            3129109879, 766109221, 534025585, 1416678536, 4072442218,
        ]);
        expect(def.getChecksumType()).toBe(ChecksumType.Adler16);
        expect(def.getHashTypes()).toEqual([
            HashType.Jenkins96,
            HashType.OneAtATime,
            HashType.OneAtATime,
            HashType.GeneralizedCrc,
            HashType.SuperFast,
        ]);
        expect(def.getSpacing()).toBe(6);
        // XML entity &gt; becomes ">" after parsing
        expect(def.getMask()).toBe(">AAAAAA-AAAAAA-AAAAAA-AAAAAA-AAAAAA-AAAAAA-AAAAAA");
    });

    it("serialize matches shape and round-trips", () => {
        const def = new KeyDefinition();
        def.setBaseKeys([3129109879, 766109221, 534025585, 1416678536, 4072442218]);
        def.setChecksumType(ChecksumType.Adler16);
        def.setHashTypes([
            HashType.Jenkins96,
            HashType.OneAtATime,
            HashType.OneAtATime,
            HashType.GeneralizedCrc,
            HashType.SuperFast,
        ]);
        def.setSpacing(6);
        def.setMask(">AAAAAA-AAAAAA-AAAAAA-AAAAAA-AAAAAA-AAAAAA-AAAAAA");

        const xml = XmlKeyDefinitionSerializer.serialize(def);

        // Compare canonical forms (ignores whitespace/formatting differences)
        expect(canonicalizeXml(xml)).toBe(canonicalizeXml(SAMPLE_XML));

        // Round-trip
        const back = XmlKeyDefinitionSerializer.deserialize(xml);
        expect(back.getBaseKeys()).toEqual(def.getBaseKeys());
        expect(back.getChecksumType()).toBe(def.getChecksumType());
        expect(back.getHashTypes()).toEqual(def.getHashTypes());
        expect(back.getSpacing()).toBe(def.getSpacing());
        expect(back.getMask()).toBe(def.getMask());
    });

    it("deserialize rejects bad root", () => {
        expect(() => XmlKeyDefinitionSerializer.deserialize("<nope/>")).toThrowError();
    });

    it("deserialize rejects bad XML", () => {
        expect(() => XmlKeyDefinitionSerializer.deserialize("<KeyDefinition>")).toThrowError();
    });
});
