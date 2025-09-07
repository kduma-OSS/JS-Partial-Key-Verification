import { describe, it, expect } from "vitest";

import { DefinitionGenerator } from "../../src";
import { PartialKeyGenerator } from "../../src";
import { PartialKeyValidator } from "../../src";
import { Fnv1a } from "../../src";

const te = new TextEncoder();

describe("DefinitionGenerator", () => {
    it("makeDefinition → mask/spacing shape and validation", () => {
        // create a definition for, say, 12 subkeys
        const def = DefinitionGenerator.makeDefinition(12);

        // Raw (no-dash) key length must equal the number of 'A' in the mask
        const genNoDash = PartialKeyGenerator.fromKeyDefinition(def);
        genNoDash.setSpacing(0);
        const rawKey = genNoDash.generate(0); // any seed
        const aCount = (def.getMask().match(/A/g) || []).length;
        expect(rawKey.length).toBe(aCount);

        // If spacing > 0, all groups except possibly the last must equal spacing
        const spacing = def.getSpacing();
        if (spacing > 0) {
            const groups = def.getMask().slice(1).split("-"); // drop leading '>'
            for (let i = 0; i < groups.length - 1; i++) {
                expect(groups[i].length).toBe(spacing);
            }
            const last = groups[groups.length - 1];
            expect(last.length).toBeGreaterThan(0);
            expect(last.length).toBeLessThanOrEqual(spacing);
        } else {
            // when very long, spacing can be 0 (no grouping): mask contains no dashes
            expect(def.getMask()).not.toContain("-");
        }

        // The generated definition should produce a key; verify seed mapping is consistent
        const gen = PartialKeyGenerator.fromKeyDefinition(def);
        const key = gen.generateFromString("demo@example.com");

        const seed = PartialKeyValidator.getSerialNumberFromKey(key);
        const expectedSeed = new Fnv1a().compute(te.encode("demo@example.com"));
        expect(seed).toBe(expectedSeed);
    });
});
