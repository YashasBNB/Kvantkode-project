/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { Position } from '../../../common/core/position.js';
import { Range } from '../../../common/core/range.js';
import { TokenMetadata, } from '../../../common/encodedTokenAttributes.js';
import { ILanguageConfigurationService, LanguageConfigurationService, } from '../../../common/languages/languageConfigurationRegistry.js';
import { LanguageIdCodec } from '../../../common/services/languagesRegistry.js';
import { LineTokens } from '../../../common/tokens/lineTokens.js';
import { SparseMultilineTokens } from '../../../common/tokens/sparseMultilineTokens.js';
import { SparseTokensStore } from '../../../common/tokens/sparseTokensStore.js';
import { createModelServices, createTextModel, instantiateTextModel } from '../testTextModel.js';
suite('TokensStore', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    const SEMANTIC_COLOR = 5;
    function parseTokensState(state) {
        const text = [];
        const tokens = [];
        let baseLine = 1;
        for (let i = 0; i < state.length; i++) {
            const line = state[i];
            let startOffset = 0;
            let lineText = '';
            while (true) {
                const firstPipeOffset = line.indexOf('|', startOffset);
                if (firstPipeOffset === -1) {
                    break;
                }
                const secondPipeOffset = line.indexOf('|', firstPipeOffset + 1);
                if (secondPipeOffset === -1) {
                    break;
                }
                if (firstPipeOffset + 1 === secondPipeOffset) {
                    // skip ||
                    lineText += line.substring(startOffset, secondPipeOffset + 1);
                    startOffset = secondPipeOffset + 1;
                    continue;
                }
                lineText += line.substring(startOffset, firstPipeOffset);
                const tokenStartCharacter = lineText.length;
                const tokenLength = secondPipeOffset - firstPipeOffset - 1;
                const metadata = (SEMANTIC_COLOR << 15 /* MetadataConsts.FOREGROUND_OFFSET */) |
                    16 /* MetadataConsts.SEMANTIC_USE_FOREGROUND */;
                if (tokens.length === 0) {
                    baseLine = i + 1;
                }
                tokens.push(i + 1 - baseLine, tokenStartCharacter, tokenStartCharacter + tokenLength, metadata);
                lineText += line.substr(firstPipeOffset + 1, tokenLength);
                startOffset = secondPipeOffset + 1;
            }
            lineText += line.substring(startOffset);
            text.push(lineText);
        }
        return {
            text: text.join('\n'),
            tokens: SparseMultilineTokens.create(baseLine, new Uint32Array(tokens)),
        };
    }
    function extractState(model) {
        const result = [];
        for (let lineNumber = 1; lineNumber <= model.getLineCount(); lineNumber++) {
            const lineTokens = model.tokenization.getLineTokens(lineNumber);
            const lineContent = model.getLineContent(lineNumber);
            let lineText = '';
            for (let i = 0; i < lineTokens.getCount(); i++) {
                const tokenStartCharacter = lineTokens.getStartOffset(i);
                const tokenEndCharacter = lineTokens.getEndOffset(i);
                const metadata = lineTokens.getMetadata(i);
                const color = TokenMetadata.getForeground(metadata);
                const tokenText = lineContent.substring(tokenStartCharacter, tokenEndCharacter);
                if (color === SEMANTIC_COLOR) {
                    lineText += `|${tokenText}|`;
                }
                else {
                    lineText += tokenText;
                }
            }
            result.push(lineText);
        }
        return result;
    }
    function testTokensAdjustment(rawInitialState, edits, rawFinalState) {
        const initialState = parseTokensState(rawInitialState);
        const model = createTextModel(initialState.text);
        model.tokenization.setSemanticTokens([initialState.tokens], true);
        model.applyEdits(edits);
        const actualState = extractState(model);
        assert.deepStrictEqual(actualState, rawFinalState);
        model.dispose();
    }
    test('issue #86303 - color shifting between different tokens', () => {
        testTokensAdjustment([`import { |URI| } from 'vs/base/common/uri';`, `const foo = |URI|.parse('hey');`], [{ range: new Range(2, 9, 2, 10), text: '' }], [`import { |URI| } from 'vs/base/common/uri';`, `const fo = |URI|.parse('hey');`]);
    });
    test('deleting a newline', () => {
        testTokensAdjustment([`import { |URI| } from 'vs/base/common/uri';`, `const foo = |URI|.parse('hey');`], [{ range: new Range(1, 42, 2, 1), text: '' }], [`import { |URI| } from 'vs/base/common/uri';const foo = |URI|.parse('hey');`]);
    });
    test('inserting a newline', () => {
        testTokensAdjustment([`import { |URI| } from 'vs/base/common/uri';const foo = |URI|.parse('hey');`], [{ range: new Range(1, 42, 1, 42), text: '\n' }], [`import { |URI| } from 'vs/base/common/uri';`, `const foo = |URI|.parse('hey');`]);
    });
    test('deleting a newline 2', () => {
        testTokensAdjustment([`import { `, `    |URI| } from 'vs/base/common/uri';const foo = |URI|.parse('hey');`], [{ range: new Range(1, 10, 2, 5), text: '' }], [`import { |URI| } from 'vs/base/common/uri';const foo = |URI|.parse('hey');`]);
    });
    test('issue #179268: a complex edit', () => {
        testTokensAdjustment([
            `|export| |'interior_material_selector.dart'|;`,
            `|export| |'mileage_selector.dart'|;`,
            `|export| |'owners_selector.dart'|;`,
            `|export| |'price_selector.dart'|;`,
            `|export| |'seat_count_selector.dart'|;`,
            `|export| |'year_selector.dart'|;`,
            `|export| |'winter_options_selector.dart'|;|export| |'camera_selector.dart'|;`,
        ], [
            { range: new Range(1, 9, 1, 9), text: `camera_selector.dart';\nexport '` },
            { range: new Range(6, 9, 7, 9), text: `` },
            { range: new Range(7, 39, 7, 39), text: `\n` },
            { range: new Range(7, 47, 7, 48), text: `ye` },
            { range: new Range(7, 49, 7, 51), text: `` },
            { range: new Range(7, 52, 7, 53), text: `` },
        ], [
            `|export| |'|camera_selector.dart';`,
            `export 'interior_material_selector.dart';`,
            `|export| |'mileage_selector.dart'|;`,
            `|export| |'owners_selector.dart'|;`,
            `|export| |'price_selector.dart'|;`,
            `|export| |'seat_count_selector.dart'|;`,
            `|export| |'||winter_options_selector.dart'|;`,
            `|export| |'year_selector.dart'|;`,
        ]);
    });
    test('issue #91936: Semantic token color highlighting fails on line with selected text', () => {
        const model = createTextModel("                    else if ($s = 08) then '\\b'");
        model.tokenization.setSemanticTokens([
            SparseMultilineTokens.create(1, new Uint32Array([
                0, 20, 24, 0b01111000000000010000, 0, 25, 27, 0b01111000000000010000, 0, 28, 29,
                0b00001000000000010000, 0, 29, 31, 0b10000000000000010000, 0, 32, 33,
                0b00001000000000010000, 0, 34, 36, 0b00110000000000010000, 0, 36, 37,
                0b00001000000000010000, 0, 38, 42, 0b01111000000000010000, 0, 43, 47,
                0b01011000000000010000,
            ])),
        ], true);
        const lineTokens = model.tokenization.getLineTokens(1);
        const decodedTokens = [];
        for (let i = 0, len = lineTokens.getCount(); i < len; i++) {
            decodedTokens.push(lineTokens.getEndOffset(i), lineTokens.getMetadata(i));
        }
        assert.deepStrictEqual(decodedTokens, [
            20, 0b10000000001000010000000001, 24, 0b10000001111000010000000001, 25,
            0b10000000001000010000000001, 27, 0b10000001111000010000000001, 28,
            0b10000000001000010000000001, 29, 0b10000000001000010000000001, 31,
            0b10000010000000010000000001, 32, 0b10000000001000010000000001, 33,
            0b10000000001000010000000001, 34, 0b10000000001000010000000001, 36,
            0b10000000110000010000000001, 37, 0b10000000001000010000000001, 38,
            0b10000000001000010000000001, 42, 0b10000001111000010000000001, 43,
            0b10000000001000010000000001, 47, 0b10000001011000010000000001,
        ]);
        model.dispose();
    });
    test('issue #147944: Language id "vs.editor.nullLanguage" is not configured nor known', () => {
        const disposables = new DisposableStore();
        const instantiationService = createModelServices(disposables, [
            [ILanguageConfigurationService, LanguageConfigurationService],
        ]);
        const model = disposables.add(instantiateTextModel(instantiationService, '--[[\n\n]]'));
        model.tokenization.setSemanticTokens([
            SparseMultilineTokens.create(1, new Uint32Array([
                0, 2, 4, 0b100000000000010000, 1, 0, 0, 0b100000000000010000, 2, 0, 2,
                0b100000000000010000,
            ])),
        ], true);
        assert.strictEqual(model.getWordAtPosition(new Position(2, 1)), null);
        disposables.dispose();
    });
    test('partial tokens 1', () => {
        const codec = new LanguageIdCodec();
        const store = new SparseTokensStore(codec);
        // setPartial: [1,1 -> 31,2], [(5,5-10),(10,5-10),(15,5-10),(20,5-10),(25,5-10),(30,5-10)]
        store.setPartial(new Range(1, 1, 31, 2), [
            SparseMultilineTokens.create(5, new Uint32Array([
                0, 5, 10, 1, 5, 5, 10, 2, 10, 5, 10, 3, 15, 5, 10, 4, 20, 5, 10, 5, 25, 5, 10, 6,
            ])),
        ]);
        // setPartial: [18,1 -> 42,1], [(20,5-10),(25,5-10),(30,5-10),(35,5-10),(40,5-10)]
        store.setPartial(new Range(18, 1, 42, 1), [
            SparseMultilineTokens.create(20, new Uint32Array([0, 5, 10, 4, 5, 5, 10, 5, 10, 5, 10, 6, 15, 5, 10, 7, 20, 5, 10, 8])),
        ]);
        // setPartial: [1,1 -> 31,2], [(5,5-10),(10,5-10),(15,5-10),(20,5-10),(25,5-10),(30,5-10)]
        store.setPartial(new Range(1, 1, 31, 2), [
            SparseMultilineTokens.create(5, new Uint32Array([
                0, 5, 10, 1, 5, 5, 10, 2, 10, 5, 10, 3, 15, 5, 10, 4, 20, 5, 10, 5, 25, 5, 10, 6,
            ])),
        ]);
        const lineTokens = store.addSparseTokens(10, new LineTokens(new Uint32Array([12, 1]), `enum Enum1 {`, codec));
        assert.strictEqual(lineTokens.getCount(), 3);
    });
    test('partial tokens 2', () => {
        const codec = new LanguageIdCodec();
        const store = new SparseTokensStore(codec);
        // setPartial: [1,1 -> 31,2], [(5,5-10),(10,5-10),(15,5-10),(20,5-10),(25,5-10),(30,5-10)]
        store.setPartial(new Range(1, 1, 31, 2), [
            SparseMultilineTokens.create(5, new Uint32Array([
                0, 5, 10, 1, 5, 5, 10, 2, 10, 5, 10, 3, 15, 5, 10, 4, 20, 5, 10, 5, 25, 5, 10, 6,
            ])),
        ]);
        // setPartial: [6,1 -> 36,2], [(10,5-10),(15,5-10),(20,5-10),(25,5-10),(30,5-10),(35,5-10)]
        store.setPartial(new Range(6, 1, 36, 2), [
            SparseMultilineTokens.create(10, new Uint32Array([0, 5, 10, 2, 5, 5, 10, 3, 10, 5, 10, 4, 15, 5, 10, 5, 20, 5, 10, 6])),
        ]);
        // setPartial: [17,1 -> 42,1], [(20,5-10),(25,5-10),(30,5-10),(35,5-10),(40,5-10)]
        store.setPartial(new Range(17, 1, 42, 1), [
            SparseMultilineTokens.create(20, new Uint32Array([0, 5, 10, 4, 5, 5, 10, 5, 10, 5, 10, 6, 15, 5, 10, 7, 20, 5, 10, 8])),
        ]);
        const lineTokens = store.addSparseTokens(20, new LineTokens(new Uint32Array([12, 1]), `enum Enum1 {`, codec));
        assert.strictEqual(lineTokens.getCount(), 3);
    });
    test('partial tokens 3', () => {
        const codec = new LanguageIdCodec();
        const store = new SparseTokensStore(codec);
        // setPartial: [1,1 -> 31,2], [(5,5-10),(10,5-10),(15,5-10),(20,5-10),(25,5-10),(30,5-10)]
        store.setPartial(new Range(1, 1, 31, 2), [
            SparseMultilineTokens.create(5, new Uint32Array([
                0, 5, 10, 1, 5, 5, 10, 2, 10, 5, 10, 3, 15, 5, 10, 4, 20, 5, 10, 5, 25, 5, 10, 6,
            ])),
        ]);
        // setPartial: [11,1 -> 16,2], [(15,5-10),(20,5-10)]
        store.setPartial(new Range(11, 1, 16, 2), [
            SparseMultilineTokens.create(10, new Uint32Array([0, 5, 10, 3, 5, 5, 10, 4])),
        ]);
        const lineTokens = store.addSparseTokens(5, new LineTokens(new Uint32Array([12, 1]), `enum Enum1 {`, codec));
        assert.strictEqual(lineTokens.getCount(), 3);
    });
    test('issue #94133: Semantic colors stick around when using (only) range provider', () => {
        const codec = new LanguageIdCodec();
        const store = new SparseTokensStore(codec);
        // setPartial: [1,1 -> 1,20] [(1,9-11)]
        store.setPartial(new Range(1, 1, 1, 20), [
            SparseMultilineTokens.create(1, new Uint32Array([0, 9, 11, 1])),
        ]);
        // setPartial: [1,1 -> 1,20], []
        store.setPartial(new Range(1, 1, 1, 20), []);
        const lineTokens = store.addSparseTokens(1, new LineTokens(new Uint32Array([12, 1]), `enum Enum1 {`, codec));
        assert.strictEqual(lineTokens.getCount(), 1);
    });
    test('bug', () => {
        function createTokens(str) {
            str = str.replace(/^\[\(/, '');
            str = str.replace(/\)\]$/, '');
            const strTokens = str.split('),(');
            const result = [];
            let firstLineNumber = 0;
            for (const strToken of strTokens) {
                const pieces = strToken.split(',');
                const chars = pieces[1].split('-');
                const lineNumber = parseInt(pieces[0], 10);
                const startChar = parseInt(chars[0], 10);
                const endChar = parseInt(chars[1], 10);
                if (firstLineNumber === 0) {
                    // this is the first line
                    firstLineNumber = lineNumber;
                }
                result.push(lineNumber - firstLineNumber, startChar, endChar, (lineNumber + startChar) % 13);
            }
            return SparseMultilineTokens.create(firstLineNumber, new Uint32Array(result));
        }
        const codec = new LanguageIdCodec();
        const store = new SparseTokensStore(codec);
        // setPartial [36446,1 -> 36475,115] [(36448,24-29),(36448,33-46),(36448,47-54),(36450,25-35),(36450,36-50),(36451,28-33),(36451,36-49),(36451,50-57),(36452,35-53),(36452,54-62),(36454,33-38),(36454,41-54),(36454,55-60),(36455,35-53),(36455,54-62),(36457,33-44),(36457,45-49),(36457,50-56),(36457,62-83),(36457,84-88),(36458,35-53),(36458,54-62),(36460,33-37),(36460,38-42),(36460,47-57),(36460,58-67),(36461,35-53),(36461,54-62),(36463,34-38),(36463,39-45),(36463,46-51),(36463,54-63),(36463,64-71),(36463,76-80),(36463,81-87),(36463,88-92),(36463,97-107),(36463,108-119),(36464,35-53),(36464,54-62),(36466,33-71),(36466,72-76),(36467,35-53),(36467,54-62),(36469,24-29),(36469,33-46),(36469,47-54),(36470,24-35),(36470,38-46),(36473,25-35),(36473,36-51),(36474,28-33),(36474,36-49),(36474,50-58),(36475,35-53),(36475,54-62)]
        store.setPartial(new Range(36446, 1, 36475, 115), [
            createTokens('[(36448,24-29),(36448,33-46),(36448,47-54),(36450,25-35),(36450,36-50),(36451,28-33),(36451,36-49),(36451,50-57),(36452,35-53),(36452,54-62),(36454,33-38),(36454,41-54),(36454,55-60),(36455,35-53),(36455,54-62),(36457,33-44),(36457,45-49),(36457,50-56),(36457,62-83),(36457,84-88),(36458,35-53),(36458,54-62),(36460,33-37),(36460,38-42),(36460,47-57),(36460,58-67),(36461,35-53),(36461,54-62),(36463,34-38),(36463,39-45),(36463,46-51),(36463,54-63),(36463,64-71),(36463,76-80),(36463,81-87),(36463,88-92),(36463,97-107),(36463,108-119),(36464,35-53),(36464,54-62),(36466,33-71),(36466,72-76),(36467,35-53),(36467,54-62),(36469,24-29),(36469,33-46),(36469,47-54),(36470,24-35),(36470,38-46),(36473,25-35),(36473,36-51),(36474,28-33),(36474,36-49),(36474,50-58),(36475,35-53),(36475,54-62)]'),
        ]);
        // setPartial [36436,1 -> 36464,142] [(36437,33-37),(36437,38-42),(36437,47-57),(36437,58-67),(36438,35-53),(36438,54-62),(36440,24-29),(36440,33-46),(36440,47-53),(36442,25-35),(36442,36-50),(36443,30-39),(36443,42-46),(36443,47-53),(36443,54-58),(36443,63-73),(36443,74-84),(36443,87-91),(36443,92-98),(36443,101-105),(36443,106-112),(36443,113-119),(36444,28-37),(36444,38-42),(36444,47-57),(36444,58-75),(36444,80-95),(36444,96-105),(36445,35-53),(36445,54-62),(36448,24-29),(36448,33-46),(36448,47-54),(36450,25-35),(36450,36-50),(36451,28-33),(36451,36-49),(36451,50-57),(36452,35-53),(36452,54-62),(36454,33-38),(36454,41-54),(36454,55-60),(36455,35-53),(36455,54-62),(36457,33-44),(36457,45-49),(36457,50-56),(36457,62-83),(36457,84-88),(36458,35-53),(36458,54-62),(36460,33-37),(36460,38-42),(36460,47-57),(36460,58-67),(36461,35-53),(36461,54-62),(36463,34-38),(36463,39-45),(36463,46-51),(36463,54-63),(36463,64-71),(36463,76-80),(36463,81-87),(36463,88-92),(36463,97-107),(36463,108-119),(36464,35-53),(36464,54-62)]
        store.setPartial(new Range(36436, 1, 36464, 142), [
            createTokens('[(36437,33-37),(36437,38-42),(36437,47-57),(36437,58-67),(36438,35-53),(36438,54-62),(36440,24-29),(36440,33-46),(36440,47-53),(36442,25-35),(36442,36-50),(36443,30-39),(36443,42-46),(36443,47-53),(36443,54-58),(36443,63-73),(36443,74-84),(36443,87-91),(36443,92-98),(36443,101-105),(36443,106-112),(36443,113-119),(36444,28-37),(36444,38-42),(36444,47-57),(36444,58-75),(36444,80-95),(36444,96-105),(36445,35-53),(36445,54-62),(36448,24-29),(36448,33-46),(36448,47-54),(36450,25-35),(36450,36-50),(36451,28-33),(36451,36-49),(36451,50-57),(36452,35-53),(36452,54-62),(36454,33-38),(36454,41-54),(36454,55-60),(36455,35-53),(36455,54-62),(36457,33-44),(36457,45-49),(36457,50-56),(36457,62-83),(36457,84-88),(36458,35-53),(36458,54-62),(36460,33-37),(36460,38-42),(36460,47-57),(36460,58-67),(36461,35-53),(36461,54-62),(36463,34-38),(36463,39-45),(36463,46-51),(36463,54-63),(36463,64-71),(36463,76-80),(36463,81-87),(36463,88-92),(36463,97-107),(36463,108-119),(36464,35-53),(36464,54-62)]'),
        ]);
        // setPartial [36457,1 -> 36485,140] [(36457,33-44),(36457,45-49),(36457,50-56),(36457,62-83),(36457,84-88),(36458,35-53),(36458,54-62),(36460,33-37),(36460,38-42),(36460,47-57),(36460,58-67),(36461,35-53),(36461,54-62),(36463,34-38),(36463,39-45),(36463,46-51),(36463,54-63),(36463,64-71),(36463,76-80),(36463,81-87),(36463,88-92),(36463,97-107),(36463,108-119),(36464,35-53),(36464,54-62),(36466,33-71),(36466,72-76),(36467,35-53),(36467,54-62),(36469,24-29),(36469,33-46),(36469,47-54),(36470,24-35),(36470,38-46),(36473,25-35),(36473,36-51),(36474,28-33),(36474,36-49),(36474,50-58),(36475,35-53),(36475,54-62),(36477,28-32),(36477,33-37),(36477,42-52),(36477,53-69),(36478,32-36),(36478,37-41),(36478,46-56),(36478,57-74),(36479,32-36),(36479,37-41),(36479,46-56),(36479,57-76),(36480,32-36),(36480,37-41),(36480,46-56),(36480,57-68),(36481,32-36),(36481,37-41),(36481,46-56),(36481,57-68),(36482,39-57),(36482,58-66),(36484,34-38),(36484,39-45),(36484,46-50),(36484,55-65),(36484,66-82),(36484,86-97),(36484,98-102),(36484,103-109),(36484,111-124),(36484,125-133),(36485,39-57),(36485,58-66)]
        store.setPartial(new Range(36457, 1, 36485, 140), [
            createTokens('[(36457,33-44),(36457,45-49),(36457,50-56),(36457,62-83),(36457,84-88),(36458,35-53),(36458,54-62),(36460,33-37),(36460,38-42),(36460,47-57),(36460,58-67),(36461,35-53),(36461,54-62),(36463,34-38),(36463,39-45),(36463,46-51),(36463,54-63),(36463,64-71),(36463,76-80),(36463,81-87),(36463,88-92),(36463,97-107),(36463,108-119),(36464,35-53),(36464,54-62),(36466,33-71),(36466,72-76),(36467,35-53),(36467,54-62),(36469,24-29),(36469,33-46),(36469,47-54),(36470,24-35),(36470,38-46),(36473,25-35),(36473,36-51),(36474,28-33),(36474,36-49),(36474,50-58),(36475,35-53),(36475,54-62),(36477,28-32),(36477,33-37),(36477,42-52),(36477,53-69),(36478,32-36),(36478,37-41),(36478,46-56),(36478,57-74),(36479,32-36),(36479,37-41),(36479,46-56),(36479,57-76),(36480,32-36),(36480,37-41),(36480,46-56),(36480,57-68),(36481,32-36),(36481,37-41),(36481,46-56),(36481,57-68),(36482,39-57),(36482,58-66),(36484,34-38),(36484,39-45),(36484,46-50),(36484,55-65),(36484,66-82),(36484,86-97),(36484,98-102),(36484,103-109),(36484,111-124),(36484,125-133),(36485,39-57),(36485,58-66)]'),
        ]);
        // setPartial [36441,1 -> 36469,56] [(36442,25-35),(36442,36-50),(36443,30-39),(36443,42-46),(36443,47-53),(36443,54-58),(36443,63-73),(36443,74-84),(36443,87-91),(36443,92-98),(36443,101-105),(36443,106-112),(36443,113-119),(36444,28-37),(36444,38-42),(36444,47-57),(36444,58-75),(36444,80-95),(36444,96-105),(36445,35-53),(36445,54-62),(36448,24-29),(36448,33-46),(36448,47-54),(36450,25-35),(36450,36-50),(36451,28-33),(36451,36-49),(36451,50-57),(36452,35-53),(36452,54-62),(36454,33-38),(36454,41-54),(36454,55-60),(36455,35-53),(36455,54-62),(36457,33-44),(36457,45-49),(36457,50-56),(36457,62-83),(36457,84-88),(36458,35-53),(36458,54-62),(36460,33-37),(36460,38-42),(36460,47-57),(36460,58-67),(36461,35-53),(36461,54-62),(36463,34-38),(36463,39-45),(36463,46-51),(36463,54-63),(36463,64-71),(36463,76-80),(36463,81-87),(36463,88-92),(36463,97-107),(36463,108-119),(36464,35-53),(36464,54-62),(36466,33-71),(36466,72-76),(36467,35-53),(36467,54-62),(36469,24-29),(36469,33-46),(36469,47-54),(36470,24-35)]
        store.setPartial(new Range(36441, 1, 36469, 56), [
            createTokens('[(36442,25-35),(36442,36-50),(36443,30-39),(36443,42-46),(36443,47-53),(36443,54-58),(36443,63-73),(36443,74-84),(36443,87-91),(36443,92-98),(36443,101-105),(36443,106-112),(36443,113-119),(36444,28-37),(36444,38-42),(36444,47-57),(36444,58-75),(36444,80-95),(36444,96-105),(36445,35-53),(36445,54-62),(36448,24-29),(36448,33-46),(36448,47-54),(36450,25-35),(36450,36-50),(36451,28-33),(36451,36-49),(36451,50-57),(36452,35-53),(36452,54-62),(36454,33-38),(36454,41-54),(36454,55-60),(36455,35-53),(36455,54-62),(36457,33-44),(36457,45-49),(36457,50-56),(36457,62-83),(36457,84-88),(36458,35-53),(36458,54-62),(36460,33-37),(36460,38-42),(36460,47-57),(36460,58-67),(36461,35-53),(36461,54-62),(36463,34-38),(36463,39-45),(36463,46-51),(36463,54-63),(36463,64-71),(36463,76-80),(36463,81-87),(36463,88-92),(36463,97-107),(36463,108-119),(36464,35-53),(36464,54-62),(36466,33-71),(36466,72-76),(36467,35-53),(36467,54-62),(36469,24-29),(36469,33-46),(36469,47-54),(36470,24-35)]'),
        ]);
        const lineTokens = store.addSparseTokens(36451, new LineTokens(new Uint32Array([60, 1]), `                        if (flags & ModifierFlags.Ambient) {`, codec));
        assert.strictEqual(lineTokens.getCount(), 7);
    });
    test('issue #95949: Identifiers are colored in bold when targetting keywords', () => {
        function createTMMetadata(foreground, fontStyle, languageId) {
            return (((languageId << 0 /* MetadataConsts.LANGUAGEID_OFFSET */) |
                (fontStyle << 11 /* MetadataConsts.FONT_STYLE_OFFSET */) |
                (foreground << 15 /* MetadataConsts.FOREGROUND_OFFSET */)) >>>
                0);
        }
        function toArr(lineTokens) {
            const r = [];
            for (let i = 0; i < lineTokens.getCount(); i++) {
                r.push(lineTokens.getEndOffset(i));
                r.push(lineTokens.getMetadata(i));
            }
            return r;
        }
        const codec = new LanguageIdCodec();
        const store = new SparseTokensStore(codec);
        store.set([
            SparseMultilineTokens.create(1, new Uint32Array([
                0,
                6,
                11,
                (1 << 15 /* MetadataConsts.FOREGROUND_OFFSET */) | 16 /* MetadataConsts.SEMANTIC_USE_FOREGROUND */,
            ])),
        ], true);
        const lineTokens = store.addSparseTokens(1, new LineTokens(new Uint32Array([
            5,
            createTMMetadata(5, 2 /* FontStyle.Bold */, 53),
            14,
            createTMMetadata(1, 0 /* FontStyle.None */, 53),
            17,
            createTMMetadata(6, 0 /* FontStyle.None */, 53),
            18,
            createTMMetadata(1, 0 /* FontStyle.None */, 53),
        ]), `const hello = 123;`, codec));
        const actual = toArr(lineTokens);
        assert.deepStrictEqual(actual, [
            5,
            createTMMetadata(5, 2 /* FontStyle.Bold */, 53),
            6,
            createTMMetadata(1, 0 /* FontStyle.None */, 53),
            11,
            createTMMetadata(1, 0 /* FontStyle.None */, 53),
            14,
            createTMMetadata(1, 0 /* FontStyle.None */, 53),
            17,
            createTMMetadata(6, 0 /* FontStyle.None */, 53),
            18,
            createTMMetadata(1, 0 /* FontStyle.None */, 53),
        ]);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9rZW5zU3RvcmUudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3Rlc3QvY29tbW9uL21vZGVsL3Rva2Vuc1N0b3JlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUUvRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDM0QsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3JELE9BQU8sRUFJTixhQUFhLEdBQ2IsTUFBTSwyQ0FBMkMsQ0FBQTtBQUNsRCxPQUFPLEVBQ04sNkJBQTZCLEVBQzdCLDRCQUE0QixHQUM1QixNQUFNLDREQUE0RCxDQUFBO0FBRW5FLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0saURBQWlELENBQUE7QUFDdkYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDL0UsT0FBTyxFQUFFLG1CQUFtQixFQUFFLGVBQWUsRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBRWhHLEtBQUssQ0FBQyxhQUFhLEVBQUUsR0FBRyxFQUFFO0lBQ3pCLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsTUFBTSxjQUFjLEdBQUcsQ0FBWSxDQUFBO0lBRW5DLFNBQVMsZ0JBQWdCLENBQUMsS0FBZTtRQUN4QyxN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