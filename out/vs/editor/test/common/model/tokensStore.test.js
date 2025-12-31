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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9rZW5zU3RvcmUudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L2NvbW1vbi9tb2RlbC90b2tlbnNTdG9yZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDdEUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFFL0YsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUNyRCxPQUFPLEVBSU4sYUFBYSxHQUNiLE1BQU0sMkNBQTJDLENBQUE7QUFDbEQsT0FBTyxFQUNOLDZCQUE2QixFQUM3Qiw0QkFBNEIsR0FDNUIsTUFBTSw0REFBNEQsQ0FBQTtBQUVuRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDL0UsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQy9FLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxlQUFlLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUVoRyxLQUFLLENBQUMsYUFBYSxFQUFFLEdBQUcsRUFBRTtJQUN6Qix1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLE1BQU0sY0FBYyxHQUFHLENBQVksQ0FBQTtJQUVuQyxTQUFTLGdCQUFnQixDQUFDLEtBQWU7UUFDeEMsTUFBTSxJQUFJLEdBQWEsRUFBRSxDQUFB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