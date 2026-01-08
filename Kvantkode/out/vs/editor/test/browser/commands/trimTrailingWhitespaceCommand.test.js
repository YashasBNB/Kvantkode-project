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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJpbVRyYWlsaW5nV2hpdGVzcGFjZUNvbW1hbmQudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3Rlc3QvYnJvd3Nlci9jb21tYW5kcy90cmltVHJhaWxpbmdXaGl0ZXNwYWNlQ29tbWFuZC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDdEUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0YsT0FBTyxFQUNOLDZCQUE2QixFQUM3QixzQkFBc0IsR0FDdEIsTUFBTSwyREFBMkQsQ0FBQTtBQUVsRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDM0QsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3JELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUU3RCxPQUFPLEVBQ04seUJBQXlCLEVBRXpCLG9CQUFvQixHQUNwQixNQUFNLDhCQUE4QixDQUFBO0FBQ3JDLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQTtBQUNwRCxPQUFPLEVBQ04sbUJBQW1CLEVBQ25CLG9CQUFvQixFQUNwQixlQUFlLEdBQ2YsTUFBTSwrQkFBK0IsQ0FBQTtBQUV0Qzs7R0FFRztBQUNILFNBQVMsOEJBQThCLENBQ3RDLElBQW1CLEVBQ25CLGtCQUEwQixFQUMxQixjQUFzQixFQUN0QixzQkFBOEIsa0JBQWtC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