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
import assert from 'assert';
import { Disposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { Selection } from '../../../../common/core/selection.js';
import { EncodedTokenizationResult, TokenizationRegistry, } from '../../../../common/languages.js';
import { ILanguageService } from '../../../../common/languages/language.js';
import { ILanguageConfigurationService } from '../../../../common/languages/languageConfigurationRegistry.js';
import { NullState } from '../../../../common/languages/nullTokenize.js';
import { LineCommentCommand, } from '../../browser/lineCommentCommand.js';
import { testCommand } from '../../../../test/browser/testCommand.js';
import { TestLanguageConfigurationService } from '../../../../test/common/modes/testLanguageConfigurationService.js';
import { IInstantiationService, } from '../../../../../platform/instantiation/common/instantiation.js';
function createTestCommandHelper(commentsConfig, commandFactory) {
    return (lines, selection, expectedLines, expectedSelection) => {
        const languageId = 'commentMode';
        const prepare = (accessor, disposables) => {
            const languageConfigurationService = accessor.get(ILanguageConfigurationService);
            const languageService = accessor.get(ILanguageService);
            disposables.add(languageService.registerLanguage({ id: languageId }));
            disposables.add(languageConfigurationService.register(languageId, {
                comments: commentsConfig,
            }));
        };
        testCommand(lines, languageId, selection, commandFactory, expectedLines, expectedSelection, false, prepare);
    };
}
suite('Editor Contrib - Line Comment Command', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    const testLineCommentCommand = createTestCommandHelper({ lineComment: '!@#', blockComment: ['<!@#', '#@!>'] }, (accessor, sel) => new LineCommentCommand(accessor.get(ILanguageConfigurationService), sel, 4, 0 /* Type.Toggle */, true, true));
    const testAddLineCommentCommand = createTestCommandHelper({ lineComment: '!@#', blockComment: ['<!@#', '#@!>'] }, (accessor, sel) => new LineCommentCommand(accessor.get(ILanguageConfigurationService), sel, 4, 1 /* Type.ForceAdd */, true, true));
    test('comment single line', function () {
        testLineCommentCommand(['some text', '\tsome more text'], new Selection(1, 1, 1, 1), ['!@# some text', '\tsome more text'], new Selection(1, 5, 1, 5));
    });
    test('case insensitive', function () {
        const testLineCommentCommand = createTestCommandHelper({ lineComment: 'rem' }, (accessor, sel) => new LineCommentCommand(accessor.get(ILanguageConfigurationService), sel, 4, 0 /* Type.Toggle */, true, true));
        testLineCommentCommand(['REM some text'], new Selection(1, 1, 1, 1), ['some text'], new Selection(1, 1, 1, 1));
    });
    function createSimpleModel(lines) {
        return {
            getLineContent: (lineNumber) => {
                return lines[lineNumber - 1];
            },
        };
    }
    function createBasicLinePreflightData(commentTokens) {
        return commentTokens.map((commentString) => {
            const r = {
                ignore: false,
                commentStr: commentString,
                commentStrOffset: 0,
                commentStrLength: commentString.length,
            };
            return r;
        });
    }
    test('_analyzeLines', () => {
        const disposable = new DisposableStore();
        let r;
        r = LineCommentCommand._analyzeLines(0 /* Type.Toggle */, true, createSimpleModel(['\t\t', '    ', '    c', '\t\td']), createBasicLinePreflightData(['//', 'rem', '!@#', '!@#']), 1, true, false, disposable.add(new TestLanguageConfigurationService()));
        if (!r.supported) {
            throw new Error(`unexpected`);
        }
        assert.strictEqual(r.shouldRemoveComments, false);
        // Does not change `commentStr`
        assert.strictEqual(r.lines[0].commentStr, '//');
        assert.strictEqual(r.lines[1].commentStr, 'rem');
        assert.strictEqual(r.lines[2].commentStr, '!@#');
        assert.strictEqual(r.lines[3].commentStr, '!@#');
        // Fills in `isWhitespace`
        assert.strictEqual(r.lines[0].ignore, true);
        assert.strictEqual(r.lines[1].ignore, true);
        assert.strictEqual(r.lines[2].ignore, false);
        assert.strictEqual(r.lines[3].ignore, false);
        // Fills in `commentStrOffset`
        assert.strictEqual(r.lines[0].commentStrOffset, 2);
        assert.strictEqual(r.lines[1].commentStrOffset, 4);
        assert.strictEqual(r.lines[2].commentStrOffset, 4);
        assert.strictEqual(r.lines[3].commentStrOffset, 2);
        r = LineCommentCommand._analyzeLines(0 /* Type.Toggle */, true, createSimpleModel(['\t\t', '    rem ', '    !@# c', '\t\t!@#d']), createBasicLinePreflightData(['//', 'rem', '!@#', '!@#']), 1, true, false, disposable.add(new TestLanguageConfigurationService()));
        if (!r.supported) {
            throw new Error(`unexpected`);
        }
        assert.strictEqual(r.shouldRemoveComments, true);
        // Does not change `commentStr`
        assert.strictEqual(r.lines[0].commentStr, '//');
        assert.strictEqual(r.lines[1].commentStr, 'rem');
        assert.strictEqual(r.lines[2].commentStr, '!@#');
        assert.strictEqual(r.lines[3].commentStr, '!@#');
        // Fills in `isWhitespace`
        assert.strictEqual(r.lines[0].ignore, true);
        assert.strictEqual(r.lines[1].ignore, false);
        assert.strictEqual(r.lines[2].ignore, false);
        assert.strictEqual(r.lines[3].ignore, false);
        // Fills in `commentStrOffset`
        assert.strictEqual(r.lines[0].commentStrOffset, 2);
        assert.strictEqual(r.lines[1].commentStrOffset, 4);
        assert.strictEqual(r.lines[2].commentStrOffset, 4);
        assert.strictEqual(r.lines[3].commentStrOffset, 2);
        // Fills in `commentStrLength`
        assert.strictEqual(r.lines[0].commentStrLength, 2);
        assert.strictEqual(r.lines[1].commentStrLength, 4);
        assert.strictEqual(r.lines[2].commentStrLength, 4);
        assert.strictEqual(r.lines[3].commentStrLength, 3);
        disposable.dispose();
    });
    test('_normalizeInsertionPoint', () => {
        const runTest = (mixedArr, tabSize, expected, testName) => {
            const model = createSimpleModel(mixedArr.filter((item, idx) => idx % 2 === 0));
            const offsets = mixedArr
                .filter((item, idx) => idx % 2 === 1)
                .map((offset) => {
                return {
                    commentStrOffset: offset,
                    ignore: false,
                };
            });
            LineCommentCommand._normalizeInsertionPoint(model, offsets, 1, tabSize);
            const actual = offsets.map((item) => item.commentStrOffset);
            assert.deepStrictEqual(actual, expected, testName);
        };
        // Bug 16696:[comment] comments not aligned in this case
        runTest(['  XX', 2, '    YY', 4], 4, [0, 0], 'Bug 16696');
        runTest(['\t\t\tXX', 3, '    \tYY', 5, '        ZZ', 8, '\t\tTT', 2], 4, [2, 5, 8, 2], 'Test1');
        runTest(['\t\t\t   XX', 6, '    \t\t\t\tYY', 8, '        ZZ', 8, '\t\t    TT', 6], 4, [2, 5, 8, 2], 'Test2');
        runTest(['\t\t', 2, '\t\t\t', 3, '\t\t\t\t', 4, '\t\t\t', 3], 4, [2, 2, 2, 2], 'Test3');
        runTest(['\t\t', 2, '\t\t\t', 3, '\t\t\t\t', 4, '\t\t\t', 3, '    ', 4], 2, [2, 2, 2, 2, 4], 'Test4');
        runTest(['\t\t', 2, '\t\t\t', 3, '\t\t\t\t', 4, '\t\t\t', 3, '    ', 4], 4, [1, 1, 1, 1, 4], 'Test5');
        runTest([' \t', 2, '  \t', 3, '   \t', 4, '    ', 4, '\t', 1], 4, [2, 3, 4, 4, 1], 'Test6');
        runTest([' \t\t', 3, '  \t\t', 4, '   \t\t', 5, '    \t', 5, '\t', 1], 4, [2, 3, 4, 4, 1], 'Test7');
        runTest(['\t', 1, '    ', 4], 4, [1, 4], 'Test8:4');
        runTest(['\t', 1, '   ', 3], 4, [0, 0], 'Test8:3');
        runTest(['\t', 1, '  ', 2], 4, [0, 0], 'Test8:2');
        runTest(['\t', 1, ' ', 1], 4, [0, 0], 'Test8:1');
        runTest(['\t', 1, '', 0], 4, [0, 0], 'Test8:0');
    });
    test('detects indentation', function () {
        testLineCommentCommand(['\tsome text', '\tsome more text'], new Selection(2, 2, 1, 1), ['\t!@# some text', '\t!@# some more text'], new Selection(2, 2, 1, 1));
    });
    test('detects mixed indentation', function () {
        testLineCommentCommand(['\tsome text', '    some more text'], new Selection(2, 2, 1, 1), ['\t!@# some text', '    !@# some more text'], new Selection(2, 2, 1, 1));
    });
    test('ignores whitespace lines', function () {
        testLineCommentCommand(['\tsome text', '\t   ', '', '\tsome more text'], new Selection(4, 2, 1, 1), ['\t!@# some text', '\t   ', '', '\t!@# some more text'], new Selection(4, 2, 1, 1));
    });
    test('removes its own', function () {
        testLineCommentCommand(['\t!@# some text', '\t   ', '\t\t!@# some more text'], new Selection(3, 2, 1, 1), ['\tsome text', '\t   ', '\t\tsome more text'], new Selection(3, 2, 1, 1));
    });
    test('works in only whitespace', function () {
        testLineCommentCommand(['\t    ', '\t', '\t\tsome more text'], new Selection(3, 1, 1, 1), ['\t!@#     ', '\t!@# ', '\t\tsome more text'], new Selection(3, 1, 1, 1));
    });
    test('bug 9697 - whitespace before comment token', function () {
        testLineCommentCommand(['\t !@#first', '\tsecond line'], new Selection(1, 1, 1, 1), ['\t first', '\tsecond line'], new Selection(1, 1, 1, 1));
    });
    test('bug 10162 - line comment before caret', function () {
        testLineCommentCommand(['first!@#', '\tsecond line'], new Selection(1, 1, 1, 1), ['!@# first!@#', '\tsecond line'], new Selection(1, 5, 1, 5));
    });
    test('comment single line - leading whitespace', function () {
        testLineCommentCommand(['first!@#', '\tsecond line'], new Selection(2, 3, 2, 1), ['first!@#', '\t!@# second line'], new Selection(2, 7, 2, 1));
    });
    test('ignores invisible selection', function () {
        testLineCommentCommand(['first', '\tsecond line', 'third line', 'fourth line', 'fifth'], new Selection(2, 1, 1, 1), ['!@# first', '\tsecond line', 'third line', 'fourth line', 'fifth'], new Selection(2, 1, 1, 5));
    });
    test('multiple lines', function () {
        testLineCommentCommand(['first', '\tsecond line', 'third line', 'fourth line', 'fifth'], new Selection(2, 4, 1, 1), ['!@# first', '!@# \tsecond line', 'third line', 'fourth line', 'fifth'], new Selection(2, 8, 1, 5));
    });
    test('multiple modes on multiple lines', function () {
        testLineCommentCommand(['first', '\tsecond line', 'third line', 'fourth line', 'fifth'], new Selection(4, 4, 3, 1), ['first', '\tsecond line', '!@# third line', '!@# fourth line', 'fifth'], new Selection(4, 8, 3, 5));
    });
    test('toggle single line', function () {
        testLineCommentCommand(['first', '\tsecond line', 'third line', 'fourth line', 'fifth'], new Selection(1, 1, 1, 1), ['!@# first', '\tsecond line', 'third line', 'fourth line', 'fifth'], new Selection(1, 5, 1, 5));
        testLineCommentCommand(['!@# first', '\tsecond line', 'third line', 'fourth line', 'fifth'], new Selection(1, 4, 1, 4), ['first', '\tsecond line', 'third line', 'fourth line', 'fifth'], new Selection(1, 1, 1, 1));
    });
    test('toggle multiple lines', function () {
        testLineCommentCommand(['first', '\tsecond line', 'third line', 'fourth line', 'fifth'], new Selection(2, 4, 1, 1), ['!@# first', '!@# \tsecond line', 'third line', 'fourth line', 'fifth'], new Selection(2, 8, 1, 5));
        testLineCommentCommand(['!@# first', '!@# \tsecond line', 'third line', 'fourth line', 'fifth'], new Selection(2, 7, 1, 4), ['first', '\tsecond line', 'third line', 'fourth line', 'fifth'], new Selection(2, 3, 1, 1));
    });
    test('issue #5964: Ctrl+/ to create comment when cursor is at the beginning of the line puts the cursor in a strange position', () => {
        testLineCommentCommand(['first', '\tsecond line', 'third line', 'fourth line', 'fifth'], new Selection(1, 1, 1, 1), ['!@# first', '\tsecond line', 'third line', 'fourth line', 'fifth'], new Selection(1, 5, 1, 5));
    });
    test('issue #35673: Comment hotkeys throws the cursor before the comment', () => {
        testLineCommentCommand(['first', '', '\tsecond line', 'third line', 'fourth line', 'fifth'], new Selection(2, 1, 2, 1), ['first', '!@# ', '\tsecond line', 'third line', 'fourth line', 'fifth'], new Selection(2, 5, 2, 5));
        testLineCommentCommand(['first', '\t', '\tsecond line', 'third line', 'fourth line', 'fifth'], new Selection(2, 2, 2, 2), ['first', '\t!@# ', '\tsecond line', 'third line', 'fourth line', 'fifth'], new Selection(2, 6, 2, 6));
    });
    test('issue #2837 "Add Line Comment" fault when blank lines involved', function () {
        testAddLineCommentCommand([
            '    if displayName == "":',
            '        displayName = groupName',
            '    description = getAttr(attributes, "description")',
            '    mailAddress = getAttr(attributes, "mail")',
            '',
            '    print "||Group name|%s|" % displayName',
            '    print "||Description|%s|" % description',
            '    print "||Email address|[mailto:%s]|" % mailAddress`',
        ], new Selection(1, 1, 8, 56), [
            '    !@# if displayName == "":',
            '    !@#     displayName = groupName',
            '    !@# description = getAttr(attributes, "description")',
            '    !@# mailAddress = getAttr(attributes, "mail")',
            '',
            '    !@# print "||Group name|%s|" % displayName',
            '    !@# print "||Description|%s|" % description',
            '    !@# print "||Email address|[mailto:%s]|" % mailAddress`',
        ], new Selection(1, 1, 8, 60));
    });
    test("issue #47004: Toggle comments shouldn't move cursor", () => {
        testAddLineCommentCommand(['    A line', '    Another line'], new Selection(2, 7, 1, 1), ['    !@# A line', '    !@# Another line'], new Selection(2, 11, 1, 1));
    });
    test('insertSpace false', () => {
        const testLineCommentCommand = createTestCommandHelper({ lineComment: '!@#' }, (accessor, sel) => new LineCommentCommand(accessor.get(ILanguageConfigurationService), sel, 4, 0 /* Type.Toggle */, false, true));
        testLineCommentCommand(['some text'], new Selection(1, 1, 1, 1), ['!@#some text'], new Selection(1, 4, 1, 4));
    });
    test('insertSpace false does not remove space', () => {
        const testLineCommentCommand = createTestCommandHelper({ lineComment: '!@#' }, (accessor, sel) => new LineCommentCommand(accessor.get(ILanguageConfigurationService), sel, 4, 0 /* Type.Toggle */, false, true));
        testLineCommentCommand(['!@#    some text'], new Selection(1, 1, 1, 1), ['    some text'], new Selection(1, 1, 1, 1));
    });
});
suite('ignoreEmptyLines false', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    const testLineCommentCommand = createTestCommandHelper({ lineComment: '!@#', blockComment: ['<!@#', '#@!>'] }, (accessor, sel) => new LineCommentCommand(accessor.get(ILanguageConfigurationService), sel, 4, 0 /* Type.Toggle */, true, false));
    test('does not ignore whitespace lines', () => {
        testLineCommentCommand(['\tsome text', '\t   ', '', '\tsome more text'], new Selection(4, 2, 1, 1), ['!@# \tsome text', '!@# \t   ', '!@# ', '!@# \tsome more text'], new Selection(4, 6, 1, 5));
    });
    test('removes its own', function () {
        testLineCommentCommand(['\t!@# some text', '\t   ', '\t\t!@# some more text'], new Selection(3, 2, 1, 1), ['\tsome text', '\t   ', '\t\tsome more text'], new Selection(3, 2, 1, 1));
    });
    test('works in only whitespace', function () {
        testLineCommentCommand(['\t    ', '\t', '\t\tsome more text'], new Selection(3, 1, 1, 1), ['\t!@#     ', '\t!@# ', '\t\tsome more text'], new Selection(3, 1, 1, 1));
    });
    test('comments single line', function () {
        testLineCommentCommand(['some text', '\tsome more text'], new Selection(1, 1, 1, 1), ['!@# some text', '\tsome more text'], new Selection(1, 5, 1, 5));
    });
    test('detects indentation', function () {
        testLineCommentCommand(['\tsome text', '\tsome more text'], new Selection(2, 2, 1, 1), ['\t!@# some text', '\t!@# some more text'], new Selection(2, 2, 1, 1));
    });
});
suite('Editor Contrib - Line Comment As Block Comment', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    const testLineCommentCommand = createTestCommandHelper({ lineComment: '', blockComment: ['(', ')'] }, (accessor, sel) => new LineCommentCommand(accessor.get(ILanguageConfigurationService), sel, 4, 0 /* Type.Toggle */, true, true));
    test('fall back to block comment command', function () {
        testLineCommentCommand(['first', '\tsecond line', 'third line', 'fourth line', 'fifth'], new Selection(1, 1, 1, 1), ['( first )', '\tsecond line', 'third line', 'fourth line', 'fifth'], new Selection(1, 3, 1, 3));
    });
    test('fall back to block comment command - toggle', function () {
        testLineCommentCommand(['(first)', '\tsecond line', 'third line', 'fourth line', 'fifth'], new Selection(1, 7, 1, 2), ['first', '\tsecond line', 'third line', 'fourth line', 'fifth'], new Selection(1, 6, 1, 1));
    });
    test('bug 9513 - expand single line to uncomment auto block', function () {
        testLineCommentCommand(['first', '\tsecond line', 'third line', 'fourth line', 'fifth'], new Selection(1, 1, 1, 1), ['( first )', '\tsecond line', 'third line', 'fourth line', 'fifth'], new Selection(1, 3, 1, 3));
    });
    test('bug 9691 - always expand selection to line boundaries', function () {
        testLineCommentCommand(['first', '\tsecond line', 'third line', 'fourth line', 'fifth'], new Selection(3, 2, 1, 3), ['( first', '\tsecond line', 'third line )', 'fourth line', 'fifth'], new Selection(3, 2, 1, 5));
        testLineCommentCommand(['(first', '\tsecond line', 'third line)', 'fourth line', 'fifth'], new Selection(3, 11, 1, 2), ['first', '\tsecond line', 'third line', 'fourth line', 'fifth'], new Selection(3, 11, 1, 1));
    });
});
suite('Editor Contrib - Line Comment As Block Comment 2', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    const testLineCommentCommand = createTestCommandHelper({ lineComment: null, blockComment: ['<!@#', '#@!>'] }, (accessor, sel) => new LineCommentCommand(accessor.get(ILanguageConfigurationService), sel, 4, 0 /* Type.Toggle */, true, true));
    test('no selection => uses indentation', function () {
        testLineCommentCommand([
            '\t\tfirst\t    ',
            '\t\tsecond line',
            '\tthird line',
            'fourth line',
            '\t\t<!@#fifth#@!>\t\t',
        ], new Selection(1, 1, 1, 1), [
            '\t\t<!@# first\t     #@!>',
            '\t\tsecond line',
            '\tthird line',
            'fourth line',
            '\t\t<!@#fifth#@!>\t\t',
        ], new Selection(1, 1, 1, 1));
        testLineCommentCommand([
            '\t\t<!@#first\t    #@!>',
            '\t\tsecond line',
            '\tthird line',
            'fourth line',
            '\t\t<!@#fifth#@!>\t\t',
        ], new Selection(1, 1, 1, 1), ['\t\tfirst\t   ', '\t\tsecond line', '\tthird line', 'fourth line', '\t\t<!@#fifth#@!>\t\t'], new Selection(1, 1, 1, 1));
    });
    test('can remove', function () {
        testLineCommentCommand([
            '\t\tfirst\t    ',
            '\t\tsecond line',
            '\tthird line',
            'fourth line',
            '\t\t<!@#fifth#@!>\t\t',
        ], new Selection(5, 1, 5, 1), ['\t\tfirst\t    ', '\t\tsecond line', '\tthird line', 'fourth line', '\t\tfifth\t\t'], new Selection(5, 1, 5, 1));
        testLineCommentCommand([
            '\t\tfirst\t    ',
            '\t\tsecond line',
            '\tthird line',
            'fourth line',
            '\t\t<!@#fifth#@!>\t\t',
        ], new Selection(5, 3, 5, 3), ['\t\tfirst\t    ', '\t\tsecond line', '\tthird line', 'fourth line', '\t\tfifth\t\t'], new Selection(5, 3, 5, 3));
        testLineCommentCommand([
            '\t\tfirst\t    ',
            '\t\tsecond line',
            '\tthird line',
            'fourth line',
            '\t\t<!@#fifth#@!>\t\t',
        ], new Selection(5, 4, 5, 4), ['\t\tfirst\t    ', '\t\tsecond line', '\tthird line', 'fourth line', '\t\tfifth\t\t'], new Selection(5, 3, 5, 3));
        testLineCommentCommand([
            '\t\tfirst\t    ',
            '\t\tsecond line',
            '\tthird line',
            'fourth line',
            '\t\t<!@#fifth#@!>\t\t',
        ], new Selection(5, 16, 5, 3), ['\t\tfirst\t    ', '\t\tsecond line', '\tthird line', 'fourth line', '\t\tfifth\t\t'], new Selection(5, 8, 5, 3));
        testLineCommentCommand([
            '\t\tfirst\t    ',
            '\t\tsecond line',
            '\tthird line',
            'fourth line',
            '\t\t<!@#fifth#@!>\t\t',
        ], new Selection(5, 12, 5, 7), ['\t\tfirst\t    ', '\t\tsecond line', '\tthird line', 'fourth line', '\t\tfifth\t\t'], new Selection(5, 8, 5, 3));
        testLineCommentCommand([
            '\t\tfirst\t    ',
            '\t\tsecond line',
            '\tthird line',
            'fourth line',
            '\t\t<!@#fifth#@!>\t\t',
        ], new Selection(5, 18, 5, 18), ['\t\tfirst\t    ', '\t\tsecond line', '\tthird line', 'fourth line', '\t\tfifth\t\t'], new Selection(5, 10, 5, 10));
    });
    test('issue #993: Remove comment does not work consistently in HTML', () => {
        testLineCommentCommand(['     asd qwe', '     asd qwe', ''], new Selection(1, 1, 3, 1), ['     <!@# asd qwe', '     asd qwe #@!>', ''], new Selection(1, 1, 3, 1));
        testLineCommentCommand(['     <!@#asd qwe', '     asd qwe#@!>', ''], new Selection(1, 1, 3, 1), ['     asd qwe', '     asd qwe', ''], new Selection(1, 1, 3, 1));
    });
});
suite('Editor Contrib - Line Comment in mixed modes', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    const OUTER_LANGUAGE_ID = 'outerMode';
    const INNER_LANGUAGE_ID = 'innerMode';
    let OuterMode = class OuterMode extends Disposable {
        constructor(commentsConfig, languageService, languageConfigurationService) {
            super();
            this.languageId = OUTER_LANGUAGE_ID;
            this._register(languageService.registerLanguage({ id: this.languageId }));
            this._register(languageConfigurationService.register(this.languageId, {
                comments: commentsConfig,
            }));
            this._register(TokenizationRegistry.register(this.languageId, {
                getInitialState: () => NullState,
                tokenize: () => {
                    throw new Error('not implemented');
                },
                tokenizeEncoded: (line, hasEOL, state) => {
                    const languageId = /^  /.test(line) ? INNER_LANGUAGE_ID : OUTER_LANGUAGE_ID;
                    const encodedLanguageId = languageService.languageIdCodec.encodeLanguageId(languageId);
                    const tokens = new Uint32Array(1 << 1);
                    tokens[0 << 1] = 0;
                    tokens[(0 << 1) + 1] =
                        (1 /* ColorId.DefaultForeground */ << 15 /* MetadataConsts.FOREGROUND_OFFSET */) |
                            (encodedLanguageId << 0 /* MetadataConsts.LANGUAGEID_OFFSET */);
                    return new EncodedTokenizationResult(tokens, state);
                },
            }));
        }
    };
    OuterMode = __decorate([
        __param(1, ILanguageService),
        __param(2, ILanguageConfigurationService)
    ], OuterMode);
    let InnerMode = class InnerMode extends Disposable {
        constructor(commentsConfig, languageService, languageConfigurationService) {
            super();
            this.languageId = INNER_LANGUAGE_ID;
            this._register(languageService.registerLanguage({ id: this.languageId }));
            this._register(languageConfigurationService.register(this.languageId, {
                comments: commentsConfig,
            }));
        }
    };
    InnerMode = __decorate([
        __param(1, ILanguageService),
        __param(2, ILanguageConfigurationService)
    ], InnerMode);
    function testLineCommentCommand(lines, selection, expectedLines, expectedSelection) {
        const setup = (accessor, disposables) => {
            const instantiationService = accessor.get(IInstantiationService);
            disposables.add(instantiationService.createInstance(OuterMode, {
                lineComment: '//',
                blockComment: ['/*', '*/'],
            }));
            disposables.add(instantiationService.createInstance(InnerMode, {
                lineComment: null,
                blockComment: ['{/*', '*/}'],
            }));
        };
        testCommand(lines, OUTER_LANGUAGE_ID, selection, (accessor, sel) => new LineCommentCommand(accessor.get(ILanguageConfigurationService), sel, 4, 0 /* Type.Toggle */, true, true), expectedLines, expectedSelection, true, setup);
    }
    test('issue #24047 (part 1): Commenting code in JSX files', () => {
        testLineCommentCommand([
            "import React from 'react';",
            'const Loader = () => (',
            '  <div>',
            '    Loading...',
            '  </div>',
            ');',
            'export default Loader;',
        ], new Selection(1, 1, 7, 22), [
            "// import React from 'react';",
            '// const Loader = () => (',
            '//   <div>',
            '//     Loading...',
            '//   </div>',
            '// );',
            '// export default Loader;',
        ], new Selection(1, 4, 7, 25));
    });
    test('issue #24047 (part 2): Commenting code in JSX files', () => {
        testLineCommentCommand([
            "import React from 'react';",
            'const Loader = () => (',
            '  <div>',
            '    Loading...',
            '  </div>',
            ');',
            'export default Loader;',
        ], new Selection(3, 4, 3, 4), [
            "import React from 'react';",
            'const Loader = () => (',
            '  {/* <div> */}',
            '    Loading...',
            '  </div>',
            ');',
            'export default Loader;',
        ], new Selection(3, 8, 3, 8));
    });
    test('issue #36173: Commenting code in JSX tag body', () => {
        testLineCommentCommand(['<div>', '  {123}', '</div>'], new Selection(2, 4, 2, 4), ['<div>', '  {/* {123} */}', '</div>'], new Selection(2, 8, 2, 8));
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluZUNvbW1lbnRDb21tYW5kLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9jb21tZW50L3Rlc3QvYnJvd3Nlci9saW5lQ29tbWVudENvbW1hbmQudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNyRixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFHaEUsT0FBTyxFQUNOLHlCQUF5QixFQUV6QixvQkFBb0IsR0FDcEIsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN4QyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUUzRSxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUM3RyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDeEUsT0FBTyxFQUlOLGtCQUFrQixHQUVsQixNQUFNLHFDQUFxQyxDQUFBO0FBQzVDLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSxtRUFBbUUsQ0FBQTtBQUNwSCxPQUFPLEVBQ04scUJBQXFCLEdBRXJCLE1BQU0sK0RBQStELENBQUE7QUFFdEUsU0FBUyx1QkFBdUIsQ0FDL0IsY0FBMkIsRUFDM0IsY0FBOEU7SUFPOUUsT0FBTyxDQUNOLEtBQWUsRUFDZixTQUFvQixFQUNwQixhQUF1QixFQUN2QixpQkFBNEIsRUFDM0IsRUFBRTtRQUNILE1BQU0s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LENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDLEVBQy9ELENBQUMsRUFDRCxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDZixPQUFPLENBQ1AsQ0FBQTtRQUVELE9BQU8sQ0FDTixDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsUUFBUSxFQUFFLENBQUMsRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUFFLFFBQVEsRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQyxFQUMvRCxDQUFDLEVBQ0QsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQ2YsT0FBTyxDQUNQLENBQUE7UUFFRCxPQUFPLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFFM0YsT0FBTyxDQUNOLENBQUMsT0FBTyxFQUFFLENBQUMsRUFBRSxRQUFRLEVBQUUsQ0FBQyxFQUFFLFNBQVMsRUFBRSxDQUFDLEVBQUUsUUFBUSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQzdELENBQUMsRUFDRCxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDZixPQUFPLENBQ1AsQ0FBQTtRQUVELE9BQU8sQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUNuRCxPQUFPLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDbEQsT0FBTyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQ2pELE9BQU8sQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUNoRCxPQUFPLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUE7SUFDaEQsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMscUJBQXFCLEVBQUU7UUFDM0Isc0JBQXNCLENBQ3JCLENBQUMsYUFBYSxFQUFFLGtCQUFrQixDQUFDLEVBQ25DLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUN6QixDQUFDLGlCQUFpQixFQUFFLHNCQUFzQixDQUFDLEVBQzNDLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUN6QixDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsMkJBQTJCLEVBQUU7UUFDakMsc0JBQXNCLENBQ3JCLENBQUMsYUFBYSxFQUFFLG9CQUFvQixDQUFDLEVBQ3JDLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUN6QixDQUFDLGlCQUFpQixFQUFFLHdCQUF3QixDQUFDLEVBQzdDLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUN6QixDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsMEJBQTBCLEVBQUU7UUFDaEMsc0JBQXNCLENBQ3JCLENBQUMsYUFBYSxFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUUsa0JBQWtCLENBQUMsRUFDaEQsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQ3pCLENBQUMsaUJBQWlCLEVBQUUsT0FBTyxFQUFFLEVBQUUsRUFBRSxzQkFBc0IsQ0FBQyxFQUN4RCxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FDekIsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGlCQUFpQixFQUFFO1FBQ3ZCLHNCQUFzQixDQUNyQixDQUFDLGlCQUFpQixFQUFFLE9BQU8sRUFBRSx3QkFBd0IsQ0FBQyxFQUN0RCxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDekIsQ0FBQyxhQUFhLEVBQUUsT0FBTyxFQUFFLG9CQUFvQixDQUFDLEVBQzlDLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUN6QixDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsMEJBQTBCLEVBQUU7UUFDaEMsc0JBQXNCLENBQ3JCLENBQUMsUUFBUSxFQUFFLElBQUksRUFBRSxvQkFBb0IsQ0FBQyxFQUN0QyxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDekIsQ0FBQyxZQUFZLEVBQUUsUUFBUSxFQUFFLG9CQUFvQixDQUFDLEVBQzlDLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUN6QixDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsNENBQTRDLEVBQUU7UUFDbEQsc0JBQXNCLENBQ3JCLENBQUMsYUFBYSxFQUFFLGVBQWUsQ0FBQyxFQUNoQyxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDekIsQ0FBQyxVQUFVLEVBQUUsZUFBZSxDQUFDLEVBQzdCLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUN6QixDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsdUNBQXVDLEVBQUU7UUFDN0Msc0JBQXNCLENBQ3JCLENBQUMsVUFBVSxFQUFFLGVBQWUsQ0FBQyxFQUM3QixJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDekIsQ0FBQyxjQUFjLEVBQUUsZUFBZSxDQUFDLEVBQ2pDLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUN6QixDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsMENBQTBDLEVBQUU7UUFDaEQsc0JBQXNCLENBQ3JCLENBQUMsVUFBVSxFQUFFLGVBQWUsQ0FBQyxFQUM3QixJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDekIsQ0FBQyxVQUFVLEVBQUUsbUJBQW1CLENBQUMsRUFDakMsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQ3pCLENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyw2QkFBNkIsRUFBRTtRQUNuQyxzQkFBc0IsQ0FDckIsQ0FBQyxPQUFPLEVBQUUsZUFBZSxFQUFFLFlBQVksRUFBRSxhQUFhLEVBQUUsT0FBTyxDQUFDLEVBQ2hFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUN6QixDQUFDLFdBQVcsRUFBRSxlQUFlLEVBQUUsWUFBWSxFQUFFLGFBQWEsRUFBRSxPQUFPLENBQUMsRUFDcEUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQ3pCLENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxnQkFBZ0IsRUFBRTtRQUN0QixzQkFBc0IsQ0FDckIsQ0FBQyxPQUFPLEVBQUUsZUFBZSxFQUFFLFlBQVksRUFBRSxhQUFhLEVBQUUsT0FBTyxDQUFDLEVBQ2hFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUN6QixDQUFDLFdBQVcsRUFBRSxtQkFBbUIsRUFBRSxZQUFZLEVBQUUsYUFBYSxFQUFFLE9BQU8sQ0FBQyxFQUN4RSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FDekIsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGtDQUFrQyxFQUFFO1FBQ3hDLHNCQUFzQixDQUNyQixDQUFDLE9BQU8sRUFBRSxlQUFlLEVBQUUsWUFBWSxFQUFFLGFBQWEsRUFBRSxPQUFPLENBQUMsRUFDaEUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQ3pCLENBQUMsT0FBTyxFQUFFLGVBQWUsRUFBRSxnQkFBZ0IsRUFBRSxpQkFBaUIsRUFBRSxPQUFPLENBQUMsRUFDeEUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQ3pCLENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxvQkFBb0IsRUFBRTtRQUMxQixzQkFBc0IsQ0FDckIsQ0FBQyxPQUFPLEVBQUUsZUFBZSxFQUFFLFlBQVksRUFBRSxhQUFhLEVBQUUsT0FBTyxDQUFDLEVBQ2hFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUN6QixDQUFDLFdBQVcsRUFBRSxlQUFlLEVBQUUsWUFBWSxFQUFFLGFBQWEsRUFBRSxPQUFPLENBQUMsRUFDcEUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQ3pCLENBQUE7UUFFRCxzQkFBc0IsQ0FDckIsQ0FBQyxXQUFXLEVBQUUsZUFBZSxFQUFFLFlBQVksRUFBRSxhQUFhLEVBQUUsT0FBTyxDQUFDLEVBQ3BFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUN6QixDQUFDLE9BQU8sRUFBRSxlQUFlLEVBQUUsWUFBWSxFQUFFLGFBQWEsRUFBRSxPQUFPLENBQUMsRUFDaEUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQ3pCLENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyx1QkFBdUIsRUFBRTtRQUM3QixzQkFBc0IsQ0FDckIsQ0FBQyxPQUFPLEVBQUUsZUFBZSxFQUFFLFlBQVksRUFBRSxhQUFhLEVBQUUsT0FBTyxDQUFDLEVBQ2hFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUN6QixDQUFDLFdBQVcsRUFBRSxtQkFBbUIsRUFBRSxZQUFZLEVBQUUsYUFBYSxFQUFFLE9BQU8sQ0FBQyxFQUN4RSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FDekIsQ0FBQTtRQUVELHNCQUFzQixDQUNyQixDQUFDLFdBQVcsRUFBRSxtQkFBbUIsRUFBRSxZQUFZLEVBQUUsYUFBYSxFQUFFLE9BQU8sQ0FBQyxFQUN4RSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDekIsQ0FBQyxPQUFPLEVBQUUsZUFBZSxFQUFFLFlBQVksRUFBRSxhQUFhLEVBQUUsT0FBTyxDQUFDLEVBQ2hFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUN6QixDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMseUhBQXlILEVBQUUsR0FBRyxFQUFFO1FBQ3BJLHNCQUFzQixDQUNyQixDQUFDLE9BQU8sRUFBRSxlQUFlLEVBQUUsWUFBWSxFQUFFLGFBQWEsRUFBRSxPQUFPLENBQUMsRUFDaEUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQ3pCLENBQUMsV0FBVyxFQUFFLGVBQWUsRUFBRSxZQUFZLEVBQUUsYUFBYSxFQUFFLE9BQU8sQ0FBQyxFQUNwRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FDekIsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLG9FQUFvRSxFQUFFLEdBQUcsRUFBRTtRQUMvRSxzQkFBc0IsQ0FDckIsQ0FBQyxPQUFPLEVBQUUsRUFBRSxFQUFFLGVBQWUsRUFBRSxZQUFZLEVBQUUsYUFBYSxFQUFFLE9BQU8sQ0FBQyxFQUNwRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDekIsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLGVBQWUsRUFBRSxZQUFZLEVBQUUsYUFBYSxFQUFFLE9BQU8sQ0FBQyxFQUN4RSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FDekIsQ0FBQTtRQUVELHNCQUFzQixDQUNyQixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsZUFBZSxFQUFFLFlBQVksRUFBRSxhQUFhLEVBQUUsT0FBTyxDQUFDLEVBQ3RFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUN6QixDQUFDLE9BQU8sRUFBRSxRQUFRLEVBQUUsZUFBZSxFQUFFLFlBQVksRUFBRSxhQUFhLEVBQUUsT0FBTyxDQUFDLEVBQzFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUN6QixDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsZ0VBQWdFLEVBQUU7UUFDdEUseUJBQXlCLENBQ3hCO1lBQ0MsMkJBQTJCO1lBQzNCLGlDQUFpQztZQUNqQyxzREFBc0Q7WUFDdEQsK0NBQStDO1lBQy9DLEVBQUU7WUFDRiw0Q0FBNEM7WUFDNUMsNkNBQTZDO1lBQzdDLHlEQUF5RDtTQUN6RCxFQUNELElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUMxQjtZQUNDLCtCQUErQjtZQUMvQixxQ0FBcUM7WUFDckMsMERBQTBEO1lBQzFELG1EQUFtRDtZQUNuRCxFQUFFO1lBQ0YsZ0RBQWdEO1lBQ2hELGlEQUFpRDtZQUNqRCw2REFBNkQ7U0FDN0QsRUFDRCxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FDMUIsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHFEQUFxRCxFQUFFLEdBQUcsRUFBRTtRQUNoRSx5QkFBeUIsQ0FDeEIsQ0FBQyxZQUFZLEVBQUUsa0JBQWtCLENBQUMsRUFDbEMsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQ3pCLENBQUMsZ0JBQWdCLEVBQUUsc0JBQXNCLENBQUMsRUFDMUMsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQzFCLENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxHQUFHLEVBQUU7UUFDOUIsTUFBTSxzQkFBc0IsR0FBRyx1QkFBdUIsQ0FDckQsRUFBRSxXQUFXLEVBQUUsS0FBSyxFQUFFLEVBQ3RCLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRSxFQUFFLENBQ2pCLElBQUksa0JBQWtCLENBQ3JCLFFBQVEsQ0FBQyxHQUFHLENBQUMsNkJBQTZCLENBQUMsRUFDM0MsR0FBRyxFQUNILENBQUMsdUJBRUQsS0FBSyxFQUNMLElBQUksQ0FDSixDQUNGLENBQUE7UUFFRCxzQkFBc0IsQ0FDckIsQ0FBQyxXQUFXLENBQUMsRUFDYixJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDekIsQ0FBQyxjQUFjLENBQUMsRUFDaEIsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQ3pCLENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyx5Q0FBeUMsRUFBRSxHQUFHLEVBQUU7UUFDcEQsTUFBTSxzQkFBc0IsR0FBRyx1QkFBdUIsQ0FDckQsRUFBRSxXQUFXLEVBQUUsS0FBSyxFQUFFLEVBQ3RCLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRSxFQUFFLENBQ2pCLElBQUksa0JBQWtCLENBQ3JCLFFBQVEsQ0FBQyxHQUFHLENBQUMsNkJBQTZCLENBQUMsRUFDM0MsR0FBRyxFQUNILENBQUMsdUJBRUQsS0FBSyxFQUNMLElBQUksQ0FDSixDQUNGLENBQUE7UUFFRCxzQkFBc0IsQ0FDckIsQ0FBQyxrQkFBa0IsQ0FBQyxFQUNwQixJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDekIsQ0FBQyxlQUFlLENBQUMsRUFDakIsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQ3pCLENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtBQUNILENBQUMsQ0FBQyxDQUFBO0FBRUYsS0FBSyxDQUFDLHdCQUF3QixFQUFFLEdBQUcsRUFBRTtJQUNwQyx1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLE1BQU0sc0JBQXNCLEdBQUcsdUJBQXVCLENBQ3JELEVBQUUsV0FBVyxFQUFFLEtBQUssRUFBRSxZQUFZLEVBQUUsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLEVBQUUsRUFDdEQsQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFLEVBQUUsQ0FDakIsSUFBSSxrQkFBa0IsQ0FDckIsUUFBUSxDQUFDLEdBQUcsQ0FBQyw2QkFBNkIsQ0FBQyxFQUMzQyxHQUFHLEVBQ0gsQ0FBQyx1QkFFRCxJQUFJLEVBQ0osS0FBSyxDQUNMLENBQ0YsQ0FBQTtJQUVELElBQUksQ0FBQyxrQ0FBa0MsRUFBRSxHQUFHLEVBQUU7UUFDN0Msc0JBQXNCLENBQ3JCLENBQUMsYUFBYSxFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUUsa0JBQWtCLENBQUMsRUFDaEQsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQ3pCLENBQUMsaUJBQWlCLEVBQUUsV0FBVyxFQUFFLE1BQU0sRUFBRSxzQkFBc0IsQ0FBQyxFQUNoRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FDekIsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGlCQUFpQixFQUFFO1FBQ3ZCLHNCQUFzQixDQUNyQixDQUFDLGlCQUFpQixFQUFFLE9BQU8sRUFBRSx3QkFBd0IsQ0FBQyxFQUN0RCxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDekIsQ0FBQyxhQUFhLEVBQUUsT0FBTyxFQUFFLG9CQUFvQixDQUFDLEVBQzlDLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUN6QixDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsMEJBQTBCLEVBQUU7UUFDaEMsc0JBQXNCLENBQ3JCLENBQUMsUUFBUSxFQUFFLElBQUksRUFBRSxvQkFBb0IsQ0FBQyxFQUN0QyxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDekIsQ0FBQyxZQUFZLEVBQUUsUUFBUSxFQUFFLG9CQUFvQixDQUFDLEVBQzlDLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUN6QixDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsc0JBQXNCLEVBQUU7UUFDNUIsc0JBQXNCLENBQ3JCLENBQUMsV0FBVyxFQUFFLGtCQUFrQixDQUFDLEVBQ2pDLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUN6QixDQUFDLGVBQWUsRUFBRSxrQkFBa0IsQ0FBQyxFQUNyQyxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FDekIsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHFCQUFxQixFQUFFO1FBQzNCLHNCQUFzQixDQUNyQixDQUFDLGFBQWEsRUFBRSxrQkFBa0IsQ0FBQyxFQUNuQyxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDekIsQ0FBQyxpQkFBaUIsRUFBRSxzQkFBc0IsQ0FBQyxFQUMzQyxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FDekIsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFBO0FBQ0gsQ0FBQyxDQUFDLENBQUE7QUFFRixLQUFLLENBQUMsZ0RBQWdELEVBQUUsR0FBRyxFQUFFO0lBQzVELHVDQUF1QyxFQUFFLENBQUE7SUFFekMsTUFBTSxzQkFBc0IsR0FBRyx1QkFBdUIsQ0FDckQsRUFBRSxXQUFXLEVBQUUsRUFBRSxFQUFFLFlBQVksRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsRUFBRSxFQUM3QyxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUUsRUFBRSxDQUNqQixJQUFJLGtCQUFrQixDQUNyQixRQUFRLENBQUMsR0FBRyxDQUFDLDZCQUE2QixDQUFDLEVBQzNDLEdBQUcsRUFDSCxDQUFDLHVCQUVELElBQUksRUFDSixJQUFJLENBQ0osQ0FDRixDQUFBO0lBRUQsSUFBSSxDQUFDLG9DQUFvQyxFQUFFO1FBQzFDLHNCQUFzQixDQUNyQixDQUFDLE9BQU8sRUFBRSxlQUFlLEVBQUUsWUFBWSxFQUFFLGFBQWEsRUFBRSxPQUFPLENBQUMsRUFDaEUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQ3pCLENBQUMsV0FBVyxFQUFFLGVBQWUsRUFBRSxZQUFZLEVBQUUsYUFBYSxFQUFFLE9BQU8sQ0FBQyxFQUNwRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FDekIsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDZDQUE2QyxFQUFFO1FBQ25ELHNCQUFzQixDQUNyQixDQUFDLFNBQVMsRUFBRSxlQUFlLEVBQUUsWUFBWSxFQUFFLGFBQWEsRUFBRSxPQUFPLENBQUMsRUFDbEUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQ3pCLENBQUMsT0FBTyxFQUFFLGVBQWUsRUFBRSxZQUFZLEVBQUUsYUFBYSxFQUFFLE9BQU8sQ0FBQyxFQUNoRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FDekIsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHVEQUF1RCxFQUFFO1FBQzdELHNCQUFzQixDQUNyQixDQUFDLE9BQU8sRUFBRSxlQUFlLEVBQUUsWUFBWSxFQUFFLGFBQWEsRUFBRSxPQUFPLENBQUMsRUFDaEUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQ3pCLENBQUMsV0FBVyxFQUFFLGVBQWUsRUFBRSxZQUFZLEVBQUUsYUFBYSxFQUFFLE9BQU8sQ0FBQyxFQUNwRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FDekIsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHVEQUF1RCxFQUFFO1FBQzdELHNCQUFzQixDQUNyQixDQUFDLE9BQU8sRUFBRSxlQUFlLEVBQUUsWUFBWSxFQUFFLGFBQWEsRUFBRSxPQUFPLENBQUMsRUFDaEUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQ3pCLENBQUMsU0FBUyxFQUFFLGVBQWUsRUFBRSxjQUFjLEVBQUUsYUFBYSxFQUFFLE9BQU8sQ0FBQyxFQUNwRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FDekIsQ0FBQTtRQUVELHNCQUFzQixDQUNyQixDQUFDLFFBQVEsRUFBRSxlQUFlLEVBQUUsYUFBYSxFQUFFLGFBQWEsRUFBRSxPQUFPLENBQUMsRUFDbEUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQzFCLENBQUMsT0FBTyxFQUFFLGVBQWUsRUFBRSxZQUFZLEVBQUUsYUFBYSxFQUFFLE9BQU8sQ0FBQyxFQUNoRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FDMUIsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFBO0FBQ0gsQ0FBQyxDQUFDLENBQUE7QUFFRixLQUFLLENBQUMsa0RBQWtELEVBQUUsR0FBRyxFQUFFO0lBQzlELHVDQUF1QyxFQUFFLENBQUE7SUFFekMsTUFBTSxzQkFBc0IsR0FBRyx1QkFBdUIsQ0FDckQsRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLFlBQVksRUFBRSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsRUFBRSxFQUNyRCxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUUsRUFBRSxDQUNqQixJQUFJLGtCQUFrQixDQUNyQixRQUFRLENBQUMsR0FBRyxDQUFDLDZCQUE2QixDQUFDLEVBQzNDLEdBQUcsRUFDSCxDQUFDLHVCQUVELElBQUksRUFDSixJQUFJLENBQ0osQ0FDRixDQUFBO0lBRUQsSUFBSSxDQUFDLGtDQUFrQyxFQUFFO1FBQ3hDLHNCQUFzQixDQUNyQjtZQUNDLGlCQUFpQjtZQUNqQixpQkFBaUI7WUFDakIsY0FBYztZQUNkLGFBQWE7WUFDYix1QkFBdUI7U0FDdkIsRUFDRCxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDekI7WUFDQywyQkFBMkI7WUFDM0IsaUJBQWlCO1lBQ2pCLGNBQWM7WUFDZCxhQUFhO1lBQ2IsdUJBQXVCO1NBQ3ZCLEVBQ0QsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQ3pCLENBQUE7UUFFRCxzQkFBc0IsQ0FDckI7WUFDQyx5QkFBeUI7WUFDekIsaUJBQWlCO1lBQ2pCLGNBQWM7WUFDZCxhQUFhO1lBQ2IsdUJBQXVCO1NBQ3ZCLEVBQ0QsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQ3pCLENBQUMsZ0JBQWdCLEVBQUUsaUJBQWlCLEVBQUUsY0FBYyxFQUFFLGFBQWEsRUFBRSx1QkFBdUIsQ0FBQyxFQUM3RixJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FDekIsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLFlBQVksRUFBRTtRQUNsQixzQkFBc0IsQ0FDckI7WUFDQyxpQkFBaUI7WUFDakIsaUJBQWlCO1lBQ2pCLGNBQWM7WUFDZCxhQUFhO1lBQ2IsdUJBQXVCO1NBQ3ZCLEVBQ0QsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQ3pCLENBQUMsaUJBQWlCLEVBQUUsaUJBQWlCLEVBQUUsY0FBYyxFQUFFLGFBQWEsRUFBRSxlQUFlLENBQUMsRUFDdEYsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQ3pCLENBQUE7UUFFRCxzQkFBc0IsQ0FDckI7WUFDQyxpQkFBaUI7WUFDakIsaUJBQWlCO1lBQ2pCLGNBQWM7WUFDZCxhQUFhO1lBQ2IsdUJBQXVCO1NBQ3ZCLEVBQ0QsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQ3pCLENBQUMsaUJBQWlCLEVBQUUsaUJBQWlCLEVBQUUsY0FBYyxFQUFFLGFBQWEsRUFBRSxlQUFlLENBQUMsRUFDdEYsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQ3pCLENBQUE7UUFFRCxzQkFBc0IsQ0FDckI7WUFDQyxpQkFBaUI7WUFDakIsaUJBQWlCO1lBQ2pCLGNBQWM7WUFDZCxhQUFhO1lBQ2IsdUJBQXVCO1NBQ3ZCLEVBQ0QsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQ3pCLENBQUMsaUJBQWlCLEVBQUUsaUJBQWlCLEVBQUUsY0FBYyxFQUFFLGFBQWEsRUFBRSxlQUFlLENBQUMsRUFDdEYsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQ3pCLENBQUE7UUFFRCxzQkFBc0IsQ0FDckI7WUFDQyxpQkFBaUI7WUFDakIsaUJBQWlCO1lBQ2pCLGNBQWM7WUFDZCxhQUFhO1lBQ2IsdUJBQXVCO1NBQ3ZCLEVBQ0QsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQzFCLENBQUMsaUJBQWlCLEVBQUUsaUJBQWlCLEVBQUUsY0FBYyxFQUFFLGFBQWEsRUFBRSxlQUFlLENBQUMsRUFDdEYsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQ3pCLENBQUE7UUFFRCxzQkFBc0IsQ0FDckI7WUFDQyxpQkFBaUI7WUFDakIsaUJBQWlCO1lBQ2pCLGNBQWM7WUFDZCxhQUFhO1lBQ2IsdUJBQXVCO1NBQ3ZCLEVBQ0QsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQzFCLENBQUMsaUJBQWlCLEVBQUUsaUJBQWlCLEVBQUUsY0FBYyxFQUFFLGFBQWEsRUFBRSxlQUFlLENBQUMsRUFDdEYsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQ3pCLENBQUE7UUFFRCxzQkFBc0IsQ0FDckI7WUFDQyxpQkFBaUI7WUFDakIsaUJBQWlCO1lBQ2pCLGNBQWM7WUFDZCxhQUFhO1lBQ2IsdUJBQXVCO1NBQ3ZCLEVBQ0QsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQzNCLENBQUMsaUJBQWlCLEVBQUUsaUJBQWlCLEVBQUUsY0FBYyxFQUFFLGFBQWEsRUFBRSxlQUFlLENBQUMsRUFDdEYsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUs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