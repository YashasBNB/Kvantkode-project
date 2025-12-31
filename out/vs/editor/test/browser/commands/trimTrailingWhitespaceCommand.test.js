/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { TrimTrailingWhitespaceCommand, trimTrailingWhitespace, } from '../../../common/commands/trimTrailingWhitespaceCommand.js';
import { Position } from '../../../common/core/position.js';
import { Range } from '../../../common/core/range.js';
import { Selection } from '../../../common/core/selection.js';
import { EncodedTokenizationResult, TokenizationRegistry, } from '../../../common/languages.js';
import { ILanguageService } from '../../../common/languages/language.js';
import { NullState } from '../../../common/languages/nullTokenize.js';
import { getEditOperation } from '../testCommand.js';
import { createModelServices, instantiateTextModel, withEditorModel, } from '../../common/testTextModel.js';
/**
 * Create single edit operation
 */
function createInsertDeleteSingleEditOp(text, positionLineNumber, positionColumn, selectionLineNumber = positionLineNumber, selectionColumn = positionColumn) {
    return {
        range: new Range(selectionLineNumber, selectionColumn, positionLineNumber, positionColumn),
        text: text,
    };
}
/**
 * Create single edit operation
 */
function createSingleEditOp(text, positionLineNumber, positionColumn, selectionLineNumber = positionLineNumber, selectionColumn = positionColumn) {
    return {
        range: new Range(selectionLineNumber, selectionColumn, positionLineNumber, positionColumn),
        text: text,
        forceMoveMarkers: false,
    };
}
function assertTrimTrailingWhitespaceCommand(text, expected) {
    return withEditorModel(text, (model) => {
        const op = new TrimTrailingWhitespaceCommand(new Selection(1, 1, 1, 1), [], true);
        const actual = getEditOperation(model, op);
        assert.deepStrictEqual(actual, expected);
    });
}
function assertTrimTrailingWhitespace(text, cursors, expected) {
    return withEditorModel(text, (model) => {
        const actual = trimTrailingWhitespace(model, cursors, true);
        assert.deepStrictEqual(actual, expected);
    });
}
suite('Editor Commands - Trim Trailing Whitespace Command', () => {
    let disposables;
    setup(() => {
        disposables = new DisposableStore();
    });
    teardown(() => {
        disposables.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('remove trailing whitespace', function () {
        assertTrimTrailingWhitespaceCommand([''], []);
        assertTrimTrailingWhitespaceCommand(['text'], []);
        assertTrimTrailingWhitespaceCommand(['text   '], [createSingleEditOp(null, 1, 5, 1, 8)]);
        assertTrimTrailingWhitespaceCommand(['text\t   '], [createSingleEditOp(null, 1, 5, 1, 9)]);
        assertTrimTrailingWhitespaceCommand(['\t   '], [createSingleEditOp(null, 1, 1, 1, 5)]);
        assertTrimTrailingWhitespaceCommand(['text\t'], [createSingleEditOp(null, 1, 5, 1, 6)]);
        assertTrimTrailingWhitespaceCommand(['some text\t', 'some more text', '\t  ', 'even more text  ', 'and some mixed\t   \t'], [
            createSingleEditOp(null, 1, 10, 1, 11),
            createSingleEditOp(null, 3, 1, 3, 4),
            createSingleEditOp(null, 4, 15, 4, 17),
            createSingleEditOp(null, 5, 15, 5, 20),
        ]);
        assertTrimTrailingWhitespace(['text   '], [new Position(1, 1), new Position(1, 2), new Position(1, 3)], [createInsertDeleteSingleEditOp(null, 1, 5, 1, 8)]);
        assertTrimTrailingWhitespace(['text   '], [new Position(1, 1), new Position(1, 5)], [createInsertDeleteSingleEditOp(null, 1, 5, 1, 8)]);
        assertTrimTrailingWhitespace(['text   '], [new Position(1, 1), new Position(1, 5), new Position(1, 6)], [createInsertDeleteSingleEditOp(null, 1, 6, 1, 8)]);
        assertTrimTrailingWhitespace(['some text\t', 'some more text', '\t  ', 'even more text  ', 'and some mixed\t   \t'], [], [
            createInsertDeleteSingleEditOp(null, 1, 10, 1, 11),
            createInsertDeleteSingleEditOp(null, 3, 1, 3, 4),
            createInsertDeleteSingleEditOp(null, 4, 15, 4, 17),
            createInsertDeleteSingleEditOp(null, 5, 15, 5, 20),
        ]);
        assertTrimTrailingWhitespace(['some text\t', 'some more text', '\t  ', 'even more text  ', 'and some mixed\t   \t'], [
            new Position(1, 11),
            new Position(3, 2),
            new Position(5, 1),
            new Position(4, 1),
            new Position(5, 10),
        ], [
            createInsertDeleteSingleEditOp(null, 3, 2, 3, 4),
            createInsertDeleteSingleEditOp(null, 4, 15, 4, 17),
            createInsertDeleteSingleEditOp(null, 5, 15, 5, 20),
        ]);
    });
    test('skips strings and regex if configured', function () {
        const instantiationService = createModelServices(disposables);
        const languageService = instantiationService.get(ILanguageService);
        const languageId = 'testLanguageId';
        const languageIdCodec = languageService.languageIdCodec;
        disposables.add(languageService.registerLanguage({ id: languageId }));
        const encodedLanguageId = languageIdCodec.encodeLanguageId(languageId);
        const otherMetadata = ((encodedLanguageId << 0 /* MetadataConsts.LANGUAGEID_OFFSET */) |
            (0 /* StandardTokenType.Other */ << 8 /* MetadataConsts.TOKEN_TYPE_OFFSET */) |
            1024 /* MetadataConsts.BALANCED_BRACKETS_MASK */) >>>
            0;
        const stringMetadata = ((encodedLanguageId << 0 /* MetadataConsts.LANGUAGEID_OFFSET */) |
            (2 /* StandardTokenType.String */ << 8 /* MetadataConsts.TOKEN_TYPE_OFFSET */) |
            1024 /* MetadataConsts.BALANCED_BRACKETS_MASK */) >>>
            0;
        const tokenizationSupport = {
            getInitialState: () => NullState,
            tokenize: undefined,
            tokenizeEncoded: (line, hasEOL, state) => {
                switch (line) {
                    case 'const a = `  ': {
                        const tokens = new Uint32Array([0, otherMetadata, 10, stringMetadata]);
                        return new EncodedTokenizationResult(tokens, state);
                    }
                    case '  a string  ': {
                        const tokens = new Uint32Array([0, stringMetadata]);
                        return new EncodedTokenizationResult(tokens, state);
                    }
                    case '`;  ': {
                        const tokens = new Uint32Array([0, stringMetadata, 1, otherMetadata]);
                        return new EncodedTokenizationResult(tokens, state);
                    }
                }
                throw new Error(`Unexpected`);
            },
        };
        disposables.add(TokenizationRegistry.register(languageId, tokenizationSupport));
        const model = disposables.add(instantiateTextModel(instantiationService, ['const a = `  ', '  a string  ', '`;  '].join('\n'), languageId));
        model.tokenization.forceTokenization(1);
        model.tokenization.forceTokenization(2);
        model.tokenization.forceTokenization(3);
        const op = new TrimTrailingWhitespaceCommand(new Selection(1, 1, 1, 1), [], false);
        const actual = getEditOperation(model, op);
        assert.deepStrictEqual(actual, [createSingleEditOp(null, 3, 3, 3, 5)]);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJpbVRyYWlsaW5nV2hpdGVzcGFjZUNvbW1hbmQudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L2Jyb3dzZXIvY29tbWFuZHMvdHJpbVRyYWlsaW5nV2hpdGVzcGFjZUNvbW1hbmQudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9GLE9BQU8sRUFDTiw2QkFBNkIsRUFDN0Isc0JBQXNCLEdBQ3RCLE1BQU0sMkRBQTJELENBQUE7QUFFbEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFN0QsT0FBTyxFQUNOLHlCQUF5QixFQUV6QixvQkFBb0IsR0FDcEIsTUFBTSw4QkFBOEIsQ0FBQTtBQUNyQyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDckUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sbUJBQW1CLENBQUE7QUFDcEQsT0FBTyxFQUNOLG1CQUFtQixFQUNuQixvQkFBb0IsRUFDcEIsZUFBZSxHQUNmLE1BQU0sK0JBQStCLENBQUE7QUFFdEM7O0dBRUc7QUFDSCxTQUFTLDhCQUE4QixDQUN0QyxJQUFtQixFQUNuQixrQkFBMEIsRUFDMUIsY0FBc0IsRUFDdEIsc0JBQThCLGtCQUFrQixFQUNo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