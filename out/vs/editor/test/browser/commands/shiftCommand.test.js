/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var DocBlockCommentMode_1;
import assert from 'assert';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { ShiftCommand } from '../../../common/commands/shiftCommand.js';
import { Range } from '../../../common/core/range.js';
import { Selection } from '../../../common/core/selection.js';
import { ILanguageService } from '../../../common/languages/language.js';
import { ILanguageConfigurationService } from '../../../common/languages/languageConfigurationRegistry.js';
import { getEditOperation, testCommand } from '../testCommand.js';
import { javascriptOnEnterRules } from '../../common/modes/supports/onEnterRules.js';
import { TestLanguageConfigurationService } from '../../common/modes/testLanguageConfigurationService.js';
import { withEditorModel } from '../../common/testTextModel.js';
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
let DocBlockCommentMode = class DocBlockCommentMode extends Disposable {
    static { DocBlockCommentMode_1 = this; }
    static { this.languageId = 'commentMode'; }
    constructor(languageService, languageConfigurationService) {
        super();
        this.languageId = DocBlockCommentMode_1.languageId;
        this._register(languageService.registerLanguage({ id: this.languageId }));
        this._register(languageConfigurationService.register(this.languageId, {
            brackets: [
                ['(', ')'],
                ['{', '}'],
                ['[', ']'],
            ],
            onEnterRules: javascriptOnEnterRules,
        }));
    }
};
DocBlockCommentMode = DocBlockCommentMode_1 = __decorate([
    __param(0, ILanguageService),
    __param(1, ILanguageConfigurationService)
], DocBlockCommentMode);
function testShiftCommand(lines, languageId, useTabStops, selection, expectedLines, expectedSelection, prepare) {
    testCommand(lines, languageId, selection, (accessor, sel) => new ShiftCommand(sel, {
        isUnshift: false,
        tabSize: 4,
        indentSize: 4,
        insertSpaces: false,
        useTabStops: useTabStops,
        autoIndent: 4 /* EditorAutoIndentStrategy.Full */,
    }, accessor.get(ILanguageConfigurationService)), expectedLines, expectedSelection, undefined, prepare);
}
function testUnshiftCommand(lines, languageId, useTabStops, selection, expectedLines, expectedSelection, prepare) {
    testCommand(lines, languageId, selection, (accessor, sel) => new ShiftCommand(sel, {
        isUnshift: true,
        tabSize: 4,
        indentSize: 4,
        insertSpaces: false,
        useTabStops: useTabStops,
        autoIndent: 4 /* EditorAutoIndentStrategy.Full */,
    }, accessor.get(ILanguageConfigurationService)), expectedLines, expectedSelection, undefined, prepare);
}
function prepareDocBlockCommentLanguage(accessor, disposables) {
    const languageConfigurationService = accessor.get(ILanguageConfigurationService);
    const languageService = accessor.get(ILanguageService);
    disposables.add(new DocBlockCommentMode(languageService, languageConfigurationService));
}
suite('Editor Commands - ShiftCommand', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    // --------- shift
    test('Bug 9503: Shifting without any selection', () => {
        testShiftCommand(['My First Line', '\t\tMy Second Line', '    Third Line', '', '123'], null, true, new Selection(1, 1, 1, 1), ['\tMy First Line', '\t\tMy Second Line', '    Third Line', '', '123'], new Selection(1, 2, 1, 2));
    });
    test('shift on single line selection 1', () => {
        testShiftCommand(['My First Line', '\t\tMy Second Line', '    Third Line', '', '123'], null, true, new Selection(1, 3, 1, 1), ['\tMy First Line', '\t\tMy Second Line', '    Third Line', '', '123'], new Selection(1, 4, 1, 1));
    });
    test('shift on single line selection 2', () => {
        testShiftCommand(['My First Line', '\t\tMy Second Line', '    Third Line', '', '123'], null, true, new Selection(1, 1, 1, 3), ['\tMy First Line', '\t\tMy Second Line', '    Third Line', '', '123'], new Selection(1, 1, 1, 4));
    });
    test('simple shift', () => {
        testShiftCommand(['My First Line', '\t\tMy Second Line', '    Third Line', '', '123'], null, true, new Selection(1, 1, 2, 1), ['\tMy First Line', '\t\tMy Second Line', '    Third Line', '', '123'], new Selection(1, 1, 2, 1));
    });
    test('shifting on two separate lines', () => {
        testShiftCommand(['My First Line', '\t\tMy Second Line', '    Third Line', '', '123'], null, true, new Selection(1, 1, 2, 1), ['\tMy First Line', '\t\tMy Second Line', '    Third Line', '', '123'], new Selection(1, 1, 2, 1));
        testShiftCommand(['\tMy First Line', '\t\tMy Second Line', '    Third Line', '', '123'], null, true, new Selection(2, 1, 3, 1), ['\tMy First Line', '\t\t\tMy Second Line', '    Third Line', '', '123'], new Selection(2, 1, 3, 1));
    });
    test('shifting on two lines', () => {
        testShiftCommand(['My First Line', '\t\tMy Second Line', '    Third Line', '', '123'], null, true, new Selection(1, 2, 2, 2), ['\tMy First Line', '\t\t\tMy Second Line', '    Third Line', '', '123'], new Selection(1, 3, 2, 2));
    });
    test('shifting on two lines again', () => {
        testShiftCommand(['My First Line', '\t\tMy Second Line', '    Third Line', '', '123'], null, true, new Selection(2, 2, 1, 2), ['\tMy First Line', '\t\t\tMy Second Line', '    Third Line', '', '123'], new Selection(2, 2, 1, 3));
    });
    test('shifting at end of file', () => {
        testShiftCommand(['My First Line', '\t\tMy Second Line', '    Third Line', '', '123'], null, true, new Selection(4, 1, 5, 2), ['My First Line', '\t\tMy Second Line', '    Third Line', '', '\t123'], new Selection(4, 1, 5, 3));
    });
    test('issue #1120 TAB should not indent empty lines in a multi-line selection', () => {
        testShiftCommand(['My First Line', '\t\tMy Second Line', '    Third Line', '', '123'], null, true, new Selection(1, 1, 5, 2), ['\tMy First Line', '\t\t\tMy Second Line', '\t\tThird Line', '', '\t123'], new Selection(1, 1, 5, 3));
        testShiftCommand(['My First Line', '\t\tMy Second Line', '    Third Line', '', '123'], null, true, new Selection(4, 1, 5, 1), ['My First Line', '\t\tMy Second Line', '    Third Line', '\t', '123'], new Selection(4, 1, 5, 1));
    });
    // --------- unshift
    test('unshift on single line selection 1', () => {
        testShiftCommand(['My First Line', '\t\tMy Second Line', '    Third Line', '', '123'], null, true, new Selection(2, 3, 2, 1), ['My First Line', '\t\t\tMy Second Line', '    Third Line', '', '123'], new Selection(2, 3, 2, 1));
    });
    test('unshift on single line selection 2', () => {
        testShiftCommand(['My First Line', '\t\tMy Second Line', '    Third Line', '', '123'], null, true, new Selection(2, 1, 2, 3), ['My First Line', '\t\t\tMy Second Line', '    Third Line', '', '123'], new Selection(2, 1, 2, 3));
    });
    test('simple unshift', () => {
        testUnshiftCommand(['My First Line', '\t\tMy Second Line', '    Third Line', '', '123'], null, true, new Selection(1, 1, 2, 1), ['My First Line', '\t\tMy Second Line', '    Third Line', '', '123'], new Selection(1, 1, 2, 1));
    });
    test('unshifting on two lines 1', () => {
        testUnshiftCommand(['My First Line', '\t\tMy Second Line', '    Third Line', '', '123'], null, true, new Selection(1, 2, 2, 2), ['My First Line', '\tMy Second Line', '    Third Line', '', '123'], new Selection(1, 2, 2, 2));
    });
    test('unshifting on two lines 2', () => {
        testUnshiftCommand(['My First Line', '\t\tMy Second Line', '    Third Line', '', '123'], null, true, new Selection(2, 3, 2, 1), ['My First Line', '\tMy Second Line', '    Third Line', '', '123'], new Selection(2, 2, 2, 1));
    });
    test('unshifting at the end of the file', () => {
        testUnshiftCommand(['My First Line', '\t\tMy Second Line', '    Third Line', '', '123'], null, true, new Selection(4, 1, 5, 2), ['My First Line', '\t\tMy Second Line', '    Third Line', '', '123'], new Selection(4, 1, 5, 2));
    });
    test('unshift many times + shift', () => {
        testUnshiftCommand(['My First Line', '\t\tMy Second Line', '    Third Line', '', '123'], null, true, new Selection(1, 1, 5, 4), ['My First Line', '\tMy Second Line', 'Third Line', '', '123'], new Selection(1, 1, 5, 4));
        testUnshiftCommand(['My First Line', '\tMy Second Line', 'Third Line', '', '123'], null, true, new Selection(1, 1, 5, 4), ['My First Line', 'My Second Line', 'Third Line', '', '123'], new Selection(1, 1, 5, 4));
        testShiftCommand(['My First Line', 'My Second Line', 'Third Line', '', '123'], null, true, new Selection(1, 1, 5, 4), ['\tMy First Line', '\tMy Second Line', '\tThird Line', '', '\t123'], new Selection(1, 1, 5, 5));
    });
    test("Bug 9119: Unshift from first column doesn't work", () => {
        testUnshiftCommand(['My First Line', '\t\tMy Second Line', '    Third Line', '', '123'], null, true, new Selection(2, 1, 2, 1), ['My First Line', '\tMy Second Line', '    Third Line', '', '123'], new Selection(2, 1, 2, 1));
    });
    test('issue #348: indenting around doc block comments', () => {
        testShiftCommand(['', '/**', ' * a doc comment', ' */', 'function hello() {}'], DocBlockCommentMode.languageId, true, new Selection(1, 1, 5, 20), ['', '\t/**', '\t * a doc comment', '\t */', '\tfunction hello() {}'], new Selection(1, 1, 5, 21), prepareDocBlockCommentLanguage);
        testUnshiftCommand(['', '/**', ' * a doc comment', ' */', 'function hello() {}'], DocBlockCommentMode.languageId, true, new Selection(1, 1, 5, 20), ['', '/**', ' * a doc comment', ' */', 'function hello() {}'], new Selection(1, 1, 5, 20), prepareDocBlockCommentLanguage);
        testUnshiftCommand(['\t', '\t/**', '\t * a doc comment', '\t */', '\tfunction hello() {}'], DocBlockCommentMode.languageId, true, new Selection(1, 1, 5, 21), ['', '/**', ' * a doc comment', ' */', 'function hello() {}'], new Selection(1, 1, 5, 20), prepareDocBlockCommentLanguage);
    });
    test('issue #1609: Wrong indentation of block comments', () => {
        testShiftCommand(['', '/**', ' * test', ' *', ' * @type {number}', ' */', 'var foo = 0;'], DocBlockCommentMode.languageId, true, new Selection(1, 1, 7, 13), ['', '\t/**', '\t * test', '\t *', '\t * @type {number}', '\t */', '\tvar foo = 0;'], new Selection(1, 1, 7, 14), prepareDocBlockCommentLanguage);
    });
    test("issue #1620: a) Line indent doesn't handle leading whitespace properly", () => {
        testCommand([
            '   Written | Numeric',
            '       one | 1',
            '       two | 2',
            '     three | 3',
            '      four | 4',
            '      five | 5',
            '       six | 6',
            '     seven | 7',
            '     eight | 8',
            '      nine | 9',
            '       ten | 10',
            '    eleven | 11',
            '',
        ], null, new Selection(1, 1, 13, 1), (accessor, sel) => new ShiftCommand(sel, {
            isUnshift: false,
            tabSize: 4,
            indentSize: 4,
            insertSpaces: true,
            useTabStops: false,
            autoIndent: 4 /* EditorAutoIndentStrategy.Full */,
        }, accessor.get(ILanguageConfigurationService)), [
            '       Written | Numeric',
            '           one | 1',
            '           two | 2',
            '         three | 3',
            '          four | 4',
            '          five | 5',
            '           six | 6',
            '         seven | 7',
            '         eight | 8',
            '          nine | 9',
            '           ten | 10',
            '        eleven | 11',
            '',
        ], new Selection(1, 1, 13, 1));
    });
    test("issue #1620: b) Line indent doesn't handle leading whitespace properly", () => {
        testCommand([
            '       Written | Numeric',
            '           one | 1',
            '           two | 2',
            '         three | 3',
            '          four | 4',
            '          five | 5',
            '           six | 6',
            '         seven | 7',
            '         eight | 8',
            '          nine | 9',
            '           ten | 10',
            '        eleven | 11',
            '',
        ], null, new Selection(1, 1, 13, 1), (accessor, sel) => new ShiftCommand(sel, {
            isUnshift: true,
            tabSize: 4,
            indentSize: 4,
            insertSpaces: true,
            useTabStops: false,
            autoIndent: 4 /* EditorAutoIndentStrategy.Full */,
        }, accessor.get(ILanguageConfigurationService)), [
            '   Written | Numeric',
            '       one | 1',
            '       two | 2',
            '     three | 3',
            '      four | 4',
            '      five | 5',
            '       six | 6',
            '     seven | 7',
            '     eight | 8',
            '      nine | 9',
            '       ten | 10',
            '    eleven | 11',
            '',
        ], new Selection(1, 1, 13, 1));
    });
    test("issue #1620: c) Line indent doesn't handle leading whitespace properly", () => {
        testCommand([
            '       Written | Numeric',
            '           one | 1',
            '           two | 2',
            '         three | 3',
            '          four | 4',
            '          five | 5',
            '           six | 6',
            '         seven | 7',
            '         eight | 8',
            '          nine | 9',
            '           ten | 10',
            '        eleven | 11',
            '',
        ], null, new Selection(1, 1, 13, 1), (accessor, sel) => new ShiftCommand(sel, {
            isUnshift: true,
            tabSize: 4,
            indentSize: 4,
            insertSpaces: false,
            useTabStops: false,
            autoIndent: 4 /* EditorAutoIndentStrategy.Full */,
        }, accessor.get(ILanguageConfigurationService)), [
            '   Written | Numeric',
            '       one | 1',
            '       two | 2',
            '     three | 3',
            '      four | 4',
            '      five | 5',
            '       six | 6',
            '     seven | 7',
            '     eight | 8',
            '      nine | 9',
            '       ten | 10',
            '    eleven | 11',
            '',
        ], new Selection(1, 1, 13, 1));
    });
    test("issue #1620: d) Line indent doesn't handle leading whitespace properly", () => {
        testCommand([
            '\t   Written | Numeric',
            '\t       one | 1',
            '\t       two | 2',
            '\t     three | 3',
            '\t      four | 4',
            '\t      five | 5',
            '\t       six | 6',
            '\t     seven | 7',
            '\t     eight | 8',
            '\t      nine | 9',
            '\t       ten | 10',
            '\t    eleven | 11',
            '',
        ], null, new Selection(1, 1, 13, 1), (accessor, sel) => new ShiftCommand(sel, {
            isUnshift: true,
            tabSize: 4,
            indentSize: 4,
            insertSpaces: true,
            useTabStops: false,
            autoIndent: 4 /* EditorAutoIndentStrategy.Full */,
        }, accessor.get(ILanguageConfigurationService)), [
            '   Written | Numeric',
            '       one | 1',
            '       two | 2',
            '     three | 3',
            '      four | 4',
            '      five | 5',
            '       six | 6',
            '     seven | 7',
            '     eight | 8',
            '      nine | 9',
            '       ten | 10',
            '    eleven | 11',
            '',
        ], new Selection(1, 1, 13, 1));
    });
    test('issue microsoft/monaco-editor#443: Indentation of a single row deletes selected text in some cases', () => {
        testCommand(['Hello world!', 'another line'], null, new Selection(1, 1, 1, 13), (accessor, sel) => new ShiftCommand(sel, {
            isUnshift: false,
            tabSize: 4,
            indentSize: 4,
            insertSpaces: false,
            useTabStops: true,
            autoIndent: 4 /* EditorAutoIndentStrategy.Full */,
        }, accessor.get(ILanguageConfigurationService)), ['\tHello world!', 'another line'], new Selection(1, 1, 1, 14));
    });
    test("bug #16815:Shift+Tab doesn't go back to tabstop", () => {
        const repeatStr = (str, cnt) => {
            let r = '';
            for (let i = 0; i < cnt; i++) {
                r += str;
            }
            return r;
        };
        const testOutdent = (tabSize, indentSize, insertSpaces, lineText, expectedIndents) => {
            const oneIndent = insertSpaces ? repeatStr(' ', indentSize) : '\t';
            const expectedIndent = repeatStr(oneIndent, expectedIndents);
            if (lineText.length > 0) {
                _assertUnshiftCommand(tabSize, indentSize, insertSpaces, [lineText + 'aaa'], [createSingleEditOp(expectedIndent, 1, 1, 1, lineText.length + 1)]);
            }
            else {
                _assertUnshiftCommand(tabSize, indentSize, insertSpaces, [lineText + 'aaa'], []);
            }
        };
        const testIndent = (tabSize, indentSize, insertSpaces, lineText, expectedIndents) => {
            const oneIndent = insertSpaces ? repeatStr(' ', indentSize) : '\t';
            const expectedIndent = repeatStr(oneIndent, expectedIndents);
            _assertShiftCommand(tabSize, indentSize, insertSpaces, [lineText + 'aaa'], [createSingleEditOp(expectedIndent, 1, 1, 1, lineText.length + 1)]);
        };
        const testIndentation = (tabSize, indentSize, lineText, expectedOnOutdent, expectedOnIndent) => {
            testOutdent(tabSize, indentSize, true, lineText, expectedOnOutdent);
            testOutdent(tabSize, indentSize, false, lineText, expectedOnOutdent);
            testIndent(tabSize, indentSize, true, lineText, expectedOnIndent);
            testIndent(tabSize, indentSize, false, lineText, expectedOnIndent);
        };
        // insertSpaces: true
        // 0 => 0
        testIndentation(4, 4, '', 0, 1);
        // 1 => 0
        testIndentation(4, 4, '\t', 0, 2);
        testIndentation(4, 4, ' ', 0, 1);
        testIndentation(4, 4, ' \t', 0, 2);
        testIndentation(4, 4, '  ', 0, 1);
        testIndentation(4, 4, '  \t', 0, 2);
        testIndentation(4, 4, '   ', 0, 1);
        testIndentation(4, 4, '   \t', 0, 2);
        testIndentation(4, 4, '    ', 0, 2);
        // 2 => 1
        testIndentation(4, 4, '\t\t', 1, 3);
        testIndentation(4, 4, '\t ', 1, 2);
        testIndentation(4, 4, '\t \t', 1, 3);
        testIndentation(4, 4, '\t  ', 1, 2);
        testIndentation(4, 4, '\t  \t', 1, 3);
        testIndentation(4, 4, '\t   ', 1, 2);
        testIndentation(4, 4, '\t   \t', 1, 3);
        testIndentation(4, 4, '\t    ', 1, 3);
        testIndentation(4, 4, ' \t\t', 1, 3);
        testIndentation(4, 4, ' \t ', 1, 2);
        testIndentation(4, 4, ' \t \t', 1, 3);
        testIndentation(4, 4, ' \t  ', 1, 2);
        testIndentation(4, 4, ' \t  \t', 1, 3);
        testIndentation(4, 4, ' \t   ', 1, 2);
        testIndentation(4, 4, ' \t   \t', 1, 3);
        testIndentation(4, 4, ' \t    ', 1, 3);
        testIndentation(4, 4, '  \t\t', 1, 3);
        testIndentation(4, 4, '  \t ', 1, 2);
        testIndentation(4, 4, '  \t \t', 1, 3);
        testIndentation(4, 4, '  \t  ', 1, 2);
        testIndentation(4, 4, '  \t  \t', 1, 3);
        testIndentation(4, 4, '  \t   ', 1, 2);
        testIndentation(4, 4, '  \t   \t', 1, 3);
        testIndentation(4, 4, '  \t    ', 1, 3);
        testIndentation(4, 4, '   \t\t', 1, 3);
        testIndentation(4, 4, '   \t ', 1, 2);
        testIndentation(4, 4, '   \t \t', 1, 3);
        testIndentation(4, 4, '   \t  ', 1, 2);
        testIndentation(4, 4, '   \t  \t', 1, 3);
        testIndentation(4, 4, '   \t   ', 1, 2);
        testIndentation(4, 4, '   \t   \t', 1, 3);
        testIndentation(4, 4, '   \t    ', 1, 3);
        testIndentation(4, 4, '    \t', 1, 3);
        testIndentation(4, 4, '     ', 1, 2);
        testIndentation(4, 4, '     \t', 1, 3);
        testIndentation(4, 4, '      ', 1, 2);
        testIndentation(4, 4, '      \t', 1, 3);
        testIndentation(4, 4, '       ', 1, 2);
        testIndentation(4, 4, '       \t', 1, 3);
        testIndentation(4, 4, '        ', 1, 3);
        // 3 => 2
        testIndentation(4, 4, '         ', 2, 3);
        function _assertUnshiftCommand(tabSize, indentSize, insertSpaces, text, expected) {
            return withEditorModel(text, (model) => {
                const testLanguageConfigurationService = new TestLanguageConfigurationService();
                const op = new ShiftCommand(new Selection(1, 1, text.length + 1, 1), {
                    isUnshift: true,
                    tabSize: tabSize,
                    indentSize: indentSize,
                    insertSpaces: insertSpaces,
                    useTabStops: true,
                    autoIndent: 4 /* EditorAutoIndentStrategy.Full */,
                }, testLanguageConfigurationService);
                const actual = getEditOperation(model, op);
                assert.deepStrictEqual(actual, expected);
                testLanguageConfigurationService.dispose();
            });
        }
        function _assertShiftCommand(tabSize, indentSize, insertSpaces, text, expected) {
            return withEditorModel(text, (model) => {
                const testLanguageConfigurationService = new TestLanguageConfigurationService();
                const op = new ShiftCommand(new Selection(1, 1, text.length + 1, 1), {
                    isUnshift: false,
                    tabSize: tabSize,
                    indentSize: indentSize,
                    insertSpaces: insertSpaces,
                    useTabStops: true,
                    autoIndent: 4 /* EditorAutoIndentStrategy.Full */,
                }, testLanguageConfigurationService);
                const actual = getEditOperation(model, op);
                assert.deepStrictEqual(actual, expected);
                testLanguageConfigurationService.dispose();
            });
        }
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2hpZnRDb21tYW5kLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9icm93c2VyL2NvbW1hbmRzL3NoaWZ0Q29tbWFuZC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLFVBQVUsRUFBbUIsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNsRixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMvRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFHdkUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3JELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUMxRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsV0FBVyxFQUFFLE1BQU0sbUJBQW1CLENBQUE7QUFDakUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDcEYsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDekcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBRy9EOztHQUVHO0FBQ0gsU0FBUyxrQkFBa0IsQ0FDMUIsSUFBWSxFQUNaLGtCQUEwQixFQUMxQixjQUFzQixFQUN0QixzQkFBOEIsa0JBQWtCLEVBQ2hELGtCQUEwQixjQUFjO0lBRXhDLE9BQU87UUFDTixLQUFLLEVBQUUsSUFBSSxLQUFLLENBQUMsbUJBQW1CLEVBQUUs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QUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2xDLGVBQWUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDakMsZUFBZSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNuQyxlQUFlLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2xDLGVBQWUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLE9BQU8sRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDcEMsZUFBZSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUVuQyxTQUFTO1FBQ1QsZUFBZSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNuQyxlQUFlLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2xDLGVBQWUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLE9BQU8sRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDcEMsZUFBZSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNuQyxlQUFlLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxRQUFRLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3JDLGVBQWUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLE9BQU8sRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDcEMsZUFBZSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN0QyxlQUFlLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxRQUFRLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3JDLGVBQWUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLE9BQU8sRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDcEMsZUFBZSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNuQyxlQUFlLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxRQUFRLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3JDLGVBQWUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLE9BQU8sRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDcEMsZUFBZSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN0QyxlQUFlLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxRQUFRLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3JDLGVBQWUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLFVBQVUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDdkMsZUFBZSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN0QyxlQUFlLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxRQUFRLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3JDLGVBQWUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLE9BQU8sRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDcEMsZUFBZSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN0QyxlQUFlLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxRQUFRLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3JDLGVBQWUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLFVBQVUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDdkMsZUFBZSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN0QyxlQUFlLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxXQUFXLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3hDLGVBQWUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLFVBQVUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDdkMsZUFBZSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN0QyxlQUFlLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxRQUFRLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3JDLGVBQWUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLFVBQVUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDdkMsZUFBZSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN0QyxlQUFlLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxXQUFXLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3hDLGVBQWUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLFVBQVUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDdkMsZUFBZSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsWUFBWSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN6QyxlQUFlLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxXQUFXLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3hDLGVBQWUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLFFBQVEsRUFB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