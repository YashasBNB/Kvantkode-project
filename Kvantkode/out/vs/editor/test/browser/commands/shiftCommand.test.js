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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2hpZnRDb21tYW5kLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L2Jyb3dzZXIvY29tbWFuZHMvc2hpZnRDb21tYW5kLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsVUFBVSxFQUFtQixNQUFNLHNDQUFzQyxDQUFBO0FBQ2xGLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9GLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUd2RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDckQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQzFHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxXQUFXLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUNwRixPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUN6RyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFHL0Q7O0dBRUc7QUFDSCxTQUFTLGtCQUFrQixDQUMxQixJQUFZLEVBQ1osa0JBQTBCLEVBQzFCLGNBQXNCLEVBQ3RCLHNCQUE4QixrQkFBa0IsRUFDaEQsa0JBQTBCLGNBQWM7SUFFeEMsT0FBTztRQUNOLEtBQUssRUFBRSxJQUFJLEtBQUssQ0FBQyxtQkFBbUIs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QUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDbEMsZUFBZSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNqQyxlQUFlLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ25DLGVBQWUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDbEMsZUFBZSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsT0FBTyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNwQyxlQUFlLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRW5DLFNBQVM7UUFDVCxlQUFlLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ25DLGVBQWUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDbEMsZUFBZSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsT0FBTyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNwQyxlQUFlLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ25DLGVBQWUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLFFBQVEsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDckMsZUFBZSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsT0FBTyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNwQyxlQUFlLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3RDLGVBQWUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLFFBQVEsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDckMsZUFBZSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsT0FBTyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNwQyxlQUFlLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ25DLGVBQWUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLFFBQVEsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDckMsZUFBZSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsT0FBTyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNwQyxlQUFlLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3RDLGVBQWUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLFFBQVEsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDckMsZUFBZSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsVUFBVSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN2QyxlQUFlLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3RDLGVBQWUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLFFBQVEsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDckMsZUFBZSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsT0FBTyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNwQyxlQUFlLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3RDLGVBQWUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLFFBQVEsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDckMsZUFBZSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsVUFBVSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN2QyxlQUFlLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3RDLGVBQWUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLFdBQVcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDeEMsZUFBZSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsVUFBVSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN2QyxlQUFlLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3RDLGVBQWUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLFFBQVEsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDckMsZUFBZSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsVUFBVSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN2QyxlQUFlLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3RDLGVBQWUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLFdBQVcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDeEMsZUFBZSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsVUFBVSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN2QyxlQUFlLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxZQUFZLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3pDLGVBQWUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLFdBQVcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDeEMsZUFBZSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsUUFB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