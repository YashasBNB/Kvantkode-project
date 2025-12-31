/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { ILanguageConfigurationService } from '../../../../common/languages/languageConfigurationRegistry.js';
import { createTextModel } from '../../../../test/common/testTextModel.js';
import { Range } from '../../../../common/core/range.js';
import { Selection } from '../../../../common/core/selection.js';
import { EncodedTokenizationResult, TokenizationRegistry, } from '../../../../common/languages.js';
import { ILanguageService } from '../../../../common/languages/language.js';
import { NullState } from '../../../../common/languages/nullTokenize.js';
import { AutoIndentOnPaste, IndentationToSpacesCommand, IndentationToTabsCommand, } from '../../browser/indentation.js';
import { withTestCodeEditor } from '../../../../test/browser/testCodeEditor.js';
import { testCommand } from '../../../../test/browser/testCommand.js';
import { goIndentationRules, htmlIndentationRules, javascriptIndentationRules, latexIndentationRules, luaIndentationRules, phpIndentationRules, rubyIndentationRules, } from '../../../../test/common/modes/supports/indentationRules.js';
import { cppOnEnterRules, htmlOnEnterRules, javascriptOnEnterRules, phpOnEnterRules, } from '../../../../test/common/modes/supports/onEnterRules.js';
import { TypeOperations } from '../../../../common/cursor/cursorTypeOperations.js';
import { cppBracketRules, goBracketRules, htmlBracketRules, latexBracketRules, luaBracketRules, phpBracketRules, rubyBracketRules, typescriptBracketRules, vbBracketRules, } from '../../../../test/common/modes/supports/bracketRules.js';
import { javascriptAutoClosingPairsRules, latexAutoClosingPairsRules, } from '../../../../test/common/modes/supports/autoClosingPairsRules.js';
import { LanguageService } from '../../../../common/services/languageService.js';
import { ServiceCollection } from '../../../../../platform/instantiation/common/serviceCollection.js';
import { TestLanguageConfigurationService } from '../../../../test/common/modes/testLanguageConfigurationService.js';
export var Language;
(function (Language) {
    Language["TypeScript"] = "ts-test";
    Language["Ruby"] = "ruby-test";
    Language["PHP"] = "php-test";
    Language["Go"] = "go-test";
    Language["CPP"] = "cpp-test";
    Language["HTML"] = "html-test";
    Language["VB"] = "vb-test";
    Language["Latex"] = "latex-test";
    Language["Lua"] = "lua-test";
})(Language || (Language = {}));
function testIndentationToSpacesCommand(lines, selection, tabSize, expectedLines, expectedSelection) {
    testCommand(lines, null, selection, (accessor, sel) => new IndentationToSpacesCommand(sel, tabSize), expectedLines, expectedSelection);
}
function testIndentationToTabsCommand(lines, selection, tabSize, expectedLines, expectedSelection) {
    testCommand(lines, null, selection, (accessor, sel) => new IndentationToTabsCommand(sel, tabSize), expectedLines, expectedSelection);
}
export function registerLanguage(languageService, language) {
    return languageService.registerLanguage({ id: language });
}
export function registerLanguageConfiguration(languageConfigurationService, language) {
    switch (language) {
        case Language.TypeScript:
            return languageConfigurationService.register(language, {
                brackets: typescriptBracketRules,
                comments: {
                    lineComment: '//',
                    blockComment: ['/*', '*/'],
                },
                autoClosingPairs: javascriptAutoClosingPairsRules,
                indentationRules: javascriptIndentationRules,
                onEnterRules: javascriptOnEnterRules,
            });
        case Language.Ruby:
            return languageConfigurationService.register(language, {
                brackets: rubyBracketRules,
                indentationRules: rubyIndentationRules,
            });
        case Language.PHP:
            return languageConfigurationService.register(language, {
                brackets: phpBracketRules,
                indentationRules: phpIndentationRules,
                onEnterRules: phpOnEnterRules,
            });
        case Language.Go:
            return languageConfigurationService.register(language, {
                brackets: goBracketRules,
                indentationRules: goIndentationRules,
            });
        case Language.CPP:
            return languageConfigurationService.register(language, {
                brackets: cppBracketRules,
                onEnterRules: cppOnEnterRules,
            });
        case Language.HTML:
            return languageConfigurationService.register(language, {
                brackets: htmlBracketRules,
                indentationRules: htmlIndentationRules,
                onEnterRules: htmlOnEnterRules,
            });
        case Language.VB:
            return languageConfigurationService.register(language, {
                brackets: vbBracketRules,
            });
        case Language.Latex:
            return languageConfigurationService.register(language, {
                brackets: latexBracketRules,
                autoClosingPairs: latexAutoClosingPairsRules,
                indentationRules: latexIndentationRules,
            });
        case Language.Lua:
            return languageConfigurationService.register(language, {
                brackets: luaBracketRules,
                indentationRules: luaIndentationRules,
            });
    }
}
export function registerTokenizationSupport(instantiationService, tokens, languageId) {
    let lineIndex = 0;
    const languageService = instantiationService.get(ILanguageService);
    const tokenizationSupport = {
        getInitialState: () => NullState,
        tokenize: undefined,
        tokenizeEncoded: (line, hasEOL, state) => {
            const tokensOnLine = tokens[lineIndex++];
            const encodedLanguageId = languageService.languageIdCodec.encodeLanguageId(languageId);
            const result = new Uint32Array(2 * tokensOnLine.length);
            for (let i = 0; i < tokensOnLine.length; i++) {
                result[2 * i] = tokensOnLine[i].startIndex;
                result[2 * i + 1] =
                    (encodedLanguageId << 0 /* MetadataConsts.LANGUAGEID_OFFSET */) |
                        (tokensOnLine[i].standardTokenType << 8 /* MetadataConsts.TOKEN_TYPE_OFFSET */);
            }
            return new EncodedTokenizationResult(result, state);
        },
    };
    return TokenizationRegistry.register(languageId, tokenizationSupport);
}
suite('Change Indentation to Spaces - TypeScript/Javascript', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('single tabs only at start of line', function () {
        testIndentationToSpacesCommand(['first', 'second line', 'third line', '\tfourth line', '\tfifth'], new Selection(2, 3, 2, 3), 4, ['first', 'second line', 'third line', '    fourth line', '    fifth'], new Selection(2, 3, 2, 3));
    });
    test('multiple tabs at start of line', function () {
        testIndentationToSpacesCommand(['\t\tfirst', '\tsecond line', '\t\t\t third line', 'fourth line', 'fifth'], new Selection(1, 5, 1, 5), 3, ['      first', '   second line', '          third line', 'fourth line', 'fifth'], new Selection(1, 9, 1, 9));
    });
    test('multiple tabs', function () {
        testIndentationToSpacesCommand(['\t\tfirst\t', '\tsecond  \t line \t', '\t\t\t third line', ' \tfourth line', 'fifth'], new Selection(1, 5, 1, 5), 2, ['    first\t', '  second  \t line \t', '       third line', '   fourth line', 'fifth'], new Selection(1, 7, 1, 7));
    });
    test('empty lines', function () {
        testIndentationToSpacesCommand(['\t\t\t', '\t', '\t\t'], new Selection(1, 4, 1, 4), 2, ['      ', '  ', '    '], new Selection(1, 4, 1, 4));
    });
});
suite('Change Indentation to Tabs -  TypeScript/Javascript', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('spaces only at start of line', function () {
        testIndentationToTabsCommand(['    first', 'second line', '    third line', 'fourth line', 'fifth'], new Selection(2, 3, 2, 3), 4, ['\tfirst', 'second line', '\tthird line', 'fourth line', 'fifth'], new Selection(2, 3, 2, 3));
    });
    test('multiple spaces at start of line', function () {
        testIndentationToTabsCommand(['first', '   second line', '          third line', 'fourth line', '     fifth'], new Selection(1, 5, 1, 5), 3, ['first', '\tsecond line', '\t\t\t third line', 'fourth line', '\t  fifth'], new Selection(1, 5, 1, 5));
    });
    test('multiple spaces', function () {
        testIndentationToTabsCommand(['      first   ', '  second     line \t', '       third line', '   fourth line', 'fifth'], new Selection(1, 8, 1, 8), 2, ['\t\t\tfirst   ', '\tsecond     line \t', '\t\t\t third line', '\t fourth line', 'fifth'], new Selection(1, 5, 1, 5));
    });
    test('issue #45996', function () {
        testIndentationToSpacesCommand(['\tabc'], new Selection(1, 3, 1, 3), 4, ['    abc'], new Selection(1, 6, 1, 6));
    });
});
suite('Indent With Tab - TypeScript/JavaScript', () => {
    const languageId = Language.TypeScript;
    let disposables;
    let serviceCollection;
    setup(() => {
        disposables = new DisposableStore();
        const languageService = new LanguageService();
        const languageConfigurationService = new TestLanguageConfigurationService();
        disposables.add(languageService);
        disposables.add(languageConfigurationService);
        disposables.add(registerLanguage(languageService, languageId));
        disposables.add(registerLanguageConfiguration(languageConfigurationService, languageId));
        serviceCollection = new ServiceCollection([ILanguageService, languageService], [ILanguageConfigurationService, languageConfigurationService]);
    });
    teardown(() => {
        disposables.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('temp issue because there should be at least one passing test in a suite', () => {
        assert.ok(true);
    });
    test.skip('issue #63388: perserve correct indentation on tab 1', () => {
        // https://github.com/microsoft/vscode/issues/63388
        const model = createTextModel(['/*', ' * Comment', ' * /'].join('\n'), languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: 'full', serviceCollection }, (editor, viewModel, instantiationService) => {
            editor.setSelection(new Selection(1, 1, 3, 5));
            editor.executeCommands('editor.action.indentLines', TypeOperations.indent(viewModel.cursorConfig, editor.getModel(), editor.getSelections()));
            assert.strictEqual(model.getValue(), ['    /*', '     * Comment', '     * /'].join('\n'));
        });
    });
    test.skip('issue #63388: perserve correct indentation on tab 2', () => {
        // https://github.com/microsoft/vscode/issues/63388
        const model = createTextModel(['switch (something) {', '  case 1:', '    whatever();', '    break;', '}'].join('\n'), languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: 'full', serviceCollection }, (editor, viewModel, instantiationService) => {
            editor.setSelection(new Selection(1, 1, 5, 2));
            editor.executeCommands('editor.action.indentLines', TypeOperations.indent(viewModel.cursorConfig, editor.getModel(), editor.getSelections()));
            assert.strictEqual(model.getValue(), [
                '    switch (something) {',
                '        case 1:',
                '            whatever();',
                '            break;',
                '    }',
            ].join('\n'));
        });
    });
});
suite('Auto Indent On Paste - TypeScript/JavaScript', () => {
    const languageId = Language.TypeScript;
    let disposables;
    let serviceCollection;
    setup(() => {
        disposables = new DisposableStore();
        const languageService = new LanguageService();
        const languageConfigurationService = new TestLanguageConfigurationService();
        disposables.add(languageService);
        disposables.add(languageConfigurationService);
        disposables.add(registerLanguage(languageService, languageId));
        disposables.add(registerLanguageConfiguration(languageConfigurationService, languageId));
        serviceCollection = new ServiceCollection([ILanguageService, languageService], [ILanguageConfigurationService, languageConfigurationService]);
    });
    teardown(() => {
        disposables.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('issue #119225: Do not add extra leading space when pasting JSDoc', () => {
        const model = createTextModel('', languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: 'full', serviceCollection }, (editor, viewModel, instantiationService) => {
            const pasteText = ['/**', ' * JSDoc', ' */', 'function a() {}'].join('\n');
            const tokens = [
                [
                    { startIndex: 0, standardTokenType: 1 /* StandardTokenType.Comment */ },
                    { startIndex: 3, standardTokenType: 1 /* StandardTokenType.Comment */ },
                ],
                [
                    { startIndex: 0, standardTokenType: 1 /* StandardTokenType.Comment */ },
                    { startIndex: 2, standardTokenType: 1 /* StandardTokenType.Comment */ },
                    { startIndex: 8, standardTokenType: 1 /* StandardTokenType.Comment */ },
                ],
                [
                    { startIndex: 0, standardTokenType: 1 /* StandardTokenType.Comment */ },
                    { startIndex: 1, standardTokenType: 1 /* StandardTokenType.Comment */ },
                    { startIndex: 3, standardTokenType: 0 /* StandardTokenType.Other */ },
                ],
                [
                    { startIndex: 0, standardTokenType: 0 /* StandardTokenType.Other */ },
                    { startIndex: 8, standardTokenType: 0 /* StandardTokenType.Other */ },
                    { startIndex: 9, standardTokenType: 0 /* StandardTokenType.Other */ },
                    { startIndex: 10, standardTokenType: 0 /* StandardTokenType.Other */ },
                    { startIndex: 11, standardTokenType: 0 /* StandardTokenType.Other */ },
                    { startIndex: 12, standardTokenType: 0 /* StandardTokenType.Other */ },
                    { startIndex: 13, standardTokenType: 0 /* StandardTokenType.Other */ },
                    { startIndex: 14, standardTokenType: 0 /* StandardTokenType.Other */ },
                    { startIndex: 15, standardTokenType: 0 /* StandardTokenType.Other */ },
                ],
            ];
            disposables.add(registerTokenizationSupport(instantiationService, tokens, languageId));
            const autoIndentOnPasteController = editor.registerAndInstantiateContribution(AutoIndentOnPaste.ID, AutoIndentOnPaste);
            viewModel.paste(pasteText, true, undefined, 'keyboard');
            autoIndentOnPasteController.trigger(new Range(1, 1, 4, 16));
            assert.strictEqual(model.getValue(), pasteText);
        });
    });
    test('issue #167299: Blank line removes indent', () => {
        const model = createTextModel('', languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: 'full', serviceCollection }, (editor, viewModel, instantiationService) => {
            // no need for tokenization because there are no comments
            const pasteText = [
                '',
                'export type IncludeReference =',
                '	| BaseReference',
                '	| SelfReference',
                '	| RelativeReference;',
                '',
                'export const enum IncludeReferenceKind {',
                '	Base,',
                '	Self,',
                '	RelativeReference,',
                '}',
            ].join('\n');
            const autoIndentOnPasteController = editor.registerAndInstantiateContribution(AutoIndentOnPaste.ID, AutoIndentOnPaste);
            viewModel.paste(pasteText, true, undefined, 'keyboard');
            autoIndentOnPasteController.trigger(new Range(1, 1, 11, 2));
            assert.strictEqual(model.getValue(), pasteText);
        });
    });
    test('issue #29803: do not indent when pasting text with only one line', () => {
        // https://github.com/microsoft/vscode/issues/29803
        const model = createTextModel(['const linkHandler = new Class(a, b, c,', '    d)'].join('\n'), languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: 'full', serviceCollection }, (editor, viewModel, instantiationService) => {
            editor.setSelection(new Selection(2, 6, 2, 6));
            const text = ', null';
            viewModel.paste(text, true, undefined, 'keyboard');
            const autoIndentOnPasteController = editor.registerAndInstantiateContribution(AutoIndentOnPaste.ID, AutoIndentOnPaste);
            autoIndentOnPasteController.trigger(new Range(2, 6, 2, 11));
            assert.strictEqual(model.getValue(), ['const linkHandler = new Class(a, b, c,', '    d, null)'].join('\n'));
        });
    });
    test('issue #29753: incorrect indentation after comment', () => {
        // https://github.com/microsoft/vscode/issues/29753
        const model = createTextModel([
            'class A {',
            '    /**',
            '     * used only for debug purposes.',
            '     */',
            '    private _codeInfo: KeyMapping[];',
            '}',
        ].join('\n'), languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: 'full', serviceCollection }, (editor, viewModel, instantiationService) => {
            editor.setSelection(new Selection(5, 24, 5, 34));
            const text = 'IMacLinuxKeyMapping';
            viewModel.paste(text, true, undefined, 'keyboard');
            const autoIndentOnPasteController = editor.registerAndInstantiateContribution(AutoIndentOnPaste.ID, AutoIndentOnPaste);
            autoIndentOnPasteController.trigger(new Range(5, 24, 5, 43));
            assert.strictEqual(model.getValue(), [
                'class A {',
                '    /**',
                '     * used only for debug purposes.',
                '     */',
                '    private _codeInfo: IMacLinuxKeyMapping[];',
                '}',
            ].join('\n'));
        });
    });
    test('issue #29753: incorrect indentation of header comment', () => {
        // https://github.com/microsoft/vscode/issues/29753
        const model = createTextModel('', languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: 'full', serviceCollection }, (editor, viewModel, instantiationService) => {
            const text = [
                '/*----------------',
                ' *  Copyright (c) ',
                ' *  Licensed under ...',
                ' *-----------------*/',
            ].join('\n');
            viewModel.paste(text, true, undefined, 'keyboard');
            const autoIndentOnPasteController = editor.registerAndInstantiateContribution(AutoIndentOnPaste.ID, AutoIndentOnPaste);
            autoIndentOnPasteController.trigger(new Range(1, 1, 4, 22));
            assert.strictEqual(model.getValue(), text);
        });
    });
    test('issue #209859: do not do change indentation when pasted inside of a string', () => {
        // issue: https://github.com/microsoft/vscode/issues/209859
        // issue: https://github.com/microsoft/vscode/issues/209418
        const initialText = [
            'const foo = "some text',
            '         which is strangely',
            '    indented"',
        ].join('\n');
        const model = createTextModel(initialText, languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: 'full', serviceCollection }, (editor, viewModel, instantiationService) => {
            const tokens = [
                [
                    { startIndex: 0, standardTokenType: 0 /* StandardTokenType.Other */ },
                    { startIndex: 12, standardTokenType: 2 /* StandardTokenType.String */ },
                ],
                [{ startIndex: 0, standardTokenType: 2 /* StandardTokenType.String */ }],
                [{ startIndex: 0, standardTokenType: 2 /* StandardTokenType.String */ }],
            ];
            disposables.add(registerTokenizationSupport(instantiationService, tokens, languageId));
            editor.setSelection(new Selection(2, 10, 2, 15));
            viewModel.paste('which', true, undefined, 'keyboard');
            const autoIndentOnPasteController = editor.registerAndInstantiateContribution(AutoIndentOnPaste.ID, AutoIndentOnPaste);
            autoIndentOnPasteController.trigger(new Range(2, 1, 2, 28));
            assert.strictEqual(model.getValue(), initialText);
        });
    });
    // Failing tests found in issues...
    test.skip('issue #181065: Incorrect paste of object within comment', () => {
        // https://github.com/microsoft/vscode/issues/181065
        const model = createTextModel('', languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: 'full', serviceCollection }, (editor, viewModel, instantiationService) => {
            const text = ['/**', ' * @typedef {', ' * }', ' */'].join('\n');
            const tokens = [
                [
                    { startIndex: 0, standardTokenType: 1 /* StandardTokenType.Comment */ },
                    { startIndex: 3, standardTokenType: 1 /* StandardTokenType.Comment */ },
                ],
                [
                    { startIndex: 0, standardTokenType: 1 /* StandardTokenType.Comment */ },
                    { startIndex: 2, standardTokenType: 1 /* StandardTokenType.Comment */ },
                    { startIndex: 3, standardTokenType: 1 /* StandardTokenType.Comment */ },
                    { startIndex: 11, standardTokenType: 1 /* StandardTokenType.Comment */ },
                    { startIndex: 12, standardTokenType: 0 /* StandardTokenType.Other */ },
                    { startIndex: 13, standardTokenType: 0 /* StandardTokenType.Other */ },
                ],
                [
                    { startIndex: 0, standardTokenType: 1 /* StandardTokenType.Comment */ },
                    { startIndex: 2, standardTokenType: 0 /* StandardTokenType.Other */ },
                    { startIndex: 3, standardTokenType: 0 /* StandardTokenType.Other */ },
                    { startIndex: 4, standardTokenType: 0 /* StandardTokenType.Other */ },
                ],
                [
                    { startIndex: 0, standardTokenType: 1 /* StandardTokenType.Comment */ },
                    { startIndex: 1, standardTokenType: 1 /* StandardTokenType.Comment */ },
                    { startIndex: 3, standardTokenType: 0 /* StandardTokenType.Other */ },
                ],
            ];
            disposables.add(registerTokenizationSupport(instantiationService, tokens, languageId));
            const autoIndentOnPasteController = editor.registerAndInstantiateContribution(AutoIndentOnPaste.ID, AutoIndentOnPaste);
            viewModel.paste(text, true, undefined, 'keyboard');
            autoIndentOnPasteController.trigger(new Range(1, 1, 4, 4));
            assert.strictEqual(model.getValue(), text);
        });
    });
    test.skip('issue #86301: preserve cursor at inserted indentation level', () => {
        // https://github.com/microsoft/vscode/issues/86301
        const model = createTextModel(['() => {', '', '}'].join('\n'), languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: 'full', serviceCollection }, (editor, viewModel, instantiationService) => {
            editor.setSelection(new Selection(2, 1, 2, 1));
            const text = ['() => {', '', '}', ''].join('\n');
            const autoIndentOnPasteController = editor.registerAndInstantiateContribution(AutoIndentOnPaste.ID, AutoIndentOnPaste);
            viewModel.paste(text, true, undefined, 'keyboard');
            autoIndentOnPasteController.trigger(new Range(2, 1, 5, 1));
            // notes:
            // why is line 3 not indented to the same level as line 2?
            // looks like the indentation is inserted correctly at line 5, but the cursor does not appear at the maximum indentation level?
            assert.strictEqual(model.getValue(), [
                '() => {',
                '    () => {',
                '    ', // <- should also be indented
                '    }',
                '    ', // <- cursor should be at the end of the indentation
                '}',
            ].join('\n'));
            const selection = viewModel.getSelection();
            assert.deepStrictEqual(selection, new Selection(5, 5, 5, 5));
        });
    });
    test.skip('issue #85781: indent line with extra white space', () => {
        // https://github.com/microsoft/vscode/issues/85781
        // note: still to determine whether this is a bug or not
        const model = createTextModel(['() => {', '    console.log("a");', '}'].join('\n'), languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: 'full', serviceCollection }, (editor, viewModel, instantiationService) => {
            editor.setSelection(new Selection(2, 5, 2, 5));
            const text = ['() => {', '    console.log("b")', '}', ' '].join('\n');
            const autoIndentOnPasteController = editor.registerAndInstantiateContribution(AutoIndentOnPaste.ID, AutoIndentOnPaste);
            viewModel.paste(text, true, undefined, 'keyboard');
            // todo@aiday-mar, make sure range is correct, and make test work as in real life
            autoIndentOnPasteController.trigger(new Range(2, 5, 5, 6));
            assert.strictEqual(model.getValue(), [
                '() => {',
                '    () => {',
                '        console.log("b")',
                '    }',
                '    console.log("a");',
                '}',
            ].join('\n'));
        });
    });
    test.skip('issue #29589: incorrect indentation of closing brace on paste', () => {
        // https://github.com/microsoft/vscode/issues/29589
        const model = createTextModel('', languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: 'full', serviceCollection }, (editor, viewModel, instantiationService) => {
            editor.setSelection(new Selection(2, 5, 2, 5));
            const text = [
                'function makeSub(a,b) {',
                'subsent = sent.substring(a,b);',
                'return subsent;',
                '}',
            ].join('\n');
            const autoIndentOnPasteController = editor.registerAndInstantiateContribution(AutoIndentOnPaste.ID, AutoIndentOnPaste);
            viewModel.paste(text, true, undefined, 'keyboard');
            // todo@aiday-mar, make sure range is correct, and make test work as in real life
            autoIndentOnPasteController.trigger(new Range(1, 1, 4, 2));
            assert.strictEqual(model.getValue(), [
                'function makeSub(a,b) {',
                'subsent = sent.substring(a,b);',
                'return subsent;',
                '}',
            ].join('\n'));
        });
    });
    test.skip('issue #201420: incorrect indentation when first line is comment', () => {
        // https://github.com/microsoft/vscode/issues/201420
        const model = createTextModel(['function bar() {', '', '}'].join('\n'), languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: 'full', serviceCollection }, (editor, viewModel, instantiationService) => {
            const tokens = [
                [
                    { startIndex: 0, standardTokenType: 0 /* StandardTokenType.Other */ },
                    { startIndex: 8, standardTokenType: 0 /* StandardTokenType.Other */ },
                    { startIndex: 9, standardTokenType: 0 /* StandardTokenType.Other */ },
                    { startIndex: 12, standardTokenType: 0 /* StandardTokenType.Other */ },
                    { startIndex: 13, standardTokenType: 0 /* StandardTokenType.Other */ },
                    { startIndex: 14, standardTokenType: 0 /* StandardTokenType.Other */ },
                    { startIndex: 15, standardTokenType: 0 /* StandardTokenType.Other */ },
                    { startIndex: 16, standardTokenType: 0 /* StandardTokenType.Other */ },
                ],
                [
                    { startIndex: 0, standardTokenType: 1 /* StandardTokenType.Comment */ },
                    { startIndex: 2, standardTokenType: 1 /* StandardTokenType.Comment */ },
                    { startIndex: 3, standardTokenType: 1 /* StandardTokenType.Comment */ },
                    { startIndex: 10, standardTokenType: 1 /* StandardTokenType.Comment */ },
                ],
                [
                    { startIndex: 0, standardTokenType: 0 /* StandardTokenType.Other */ },
                    { startIndex: 5, standardTokenType: 0 /* StandardTokenType.Other */ },
                    { startIndex: 6, standardTokenType: 0 /* StandardTokenType.Other */ },
                    { startIndex: 9, standardTokenType: 0 /* StandardTokenType.Other */ },
                    { startIndex: 10, standardTokenType: 0 /* StandardTokenType.Other */ },
                    { startIndex: 11, standardTokenType: 0 /* StandardTokenType.Other */ },
                    { startIndex: 12, standardTokenType: 0 /* StandardTokenType.Other */ },
                    { startIndex: 14, standardTokenType: 0 /* StandardTokenType.Other */ },
                ],
                [
                    { startIndex: 0, standardTokenType: 0 /* StandardTokenType.Other */ },
                    { startIndex: 1, standardTokenType: 0 /* StandardTokenType.Other */ },
                ],
            ];
            disposables.add(registerTokenizationSupport(instantiationService, tokens, languageId));
            editor.setSelection(new Selection(2, 1, 2, 1));
            const text = ['// comment', 'const foo = 42'].join('\n');
            const autoIndentOnPasteController = editor.registerAndInstantiateContribution(AutoIndentOnPaste.ID, AutoIndentOnPaste);
            viewModel.paste(text, true, undefined, 'keyboard');
            autoIndentOnPasteController.trigger(new Range(2, 1, 3, 15));
            assert.strictEqual(model.getValue(), ['function bar() {', '    // comment', '    const foo = 42', '}'].join('\n'));
        });
    });
});
suite('Auto Indent On Type - TypeScript/JavaScript', () => {
    const languageId = Language.TypeScript;
    let disposables;
    let serviceCollection;
    setup(() => {
        disposables = new DisposableStore();
        const languageService = new LanguageService();
        const languageConfigurationService = new TestLanguageConfigurationService();
        disposables.add(languageService);
        disposables.add(languageConfigurationService);
        disposables.add(registerLanguage(languageService, languageId));
        disposables.add(registerLanguageConfiguration(languageConfigurationService, languageId));
        serviceCollection = new ServiceCollection([ILanguageService, languageService], [ILanguageConfigurationService, languageConfigurationService]);
    });
    teardown(() => {
        disposables.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    // Failing tests from issues...
    test('issue #208215: indent after arrow function', () => {
        // https://github.com/microsoft/vscode/issues/208215
        const model = createTextModel('', languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: 'full', serviceCollection }, (editor, viewModel) => {
            viewModel.type('const add1 = (n) =>');
            viewModel.type('\n', 'keyboard');
            assert.strictEqual(model.getValue(), ['const add1 = (n) =>', '    '].join('\n'));
        });
    });
    test('issue #208215: indent after arrow function 2', () => {
        // https://github.com/microsoft/vscode/issues/208215
        const model = createTextModel(['const array = [1, 2, 3, 4, 5];', 'array.map(', '    v =>'].join('\n'), languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: 'full', serviceCollection }, (editor, viewModel) => {
            editor.setSelection(new Selection(3, 9, 3, 9));
            viewModel.type('\n', 'keyboard');
            assert.strictEqual(model.getValue(), ['const array = [1, 2, 3, 4, 5];', 'array.map(', '    v =>', '        '].join('\n'));
        });
    });
    test('issue #116843: indent after arrow function', () => {
        // https://github.com/microsoft/vscode/issues/116843
        const model = createTextModel('', languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: 'full', serviceCollection }, (editor, viewModel) => {
            viewModel.type(['const add1 = (n) =>', '    n + 1;'].join('\n'));
            viewModel.type('\n', 'keyboard');
            assert.strictEqual(model.getValue(), ['const add1 = (n) =>', '    n + 1;', ''].join('\n'));
        });
    });
    test('issue #29755: do not add indentation on enter if indentation is already valid', () => {
        //https://github.com/microsoft/vscode/issues/29755
        const model = createTextModel(['function f() {', '    const one = 1;', '    const two = 2;', '}'].join('\n'), languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: 'full', serviceCollection }, (editor, viewModel) => {
            editor.setSelection(new Selection(3, 1, 3, 1));
            viewModel.type('\n', 'keyboard');
            assert.strictEqual(model.getValue(), ['function f() {', '    const one = 1;', '', '    const two = 2;', '}'].join('\n'));
        });
    });
    test('issue #36090', () => {
        // https://github.com/microsoft/vscode/issues/36090
        const model = createTextModel([
            'class ItemCtrl {',
            '    getPropertiesByItemId(id) {',
            '        return this.fetchItem(id)',
            '            .then(item => {',
            '                return this.getPropertiesOfItem(item);',
            '            });',
            '    }',
            '}',
        ].join('\n'), languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: 'advanced', serviceCollection }, (editor, viewModel) => {
            editor.setSelection(new Selection(7, 6, 7, 6));
            viewModel.type('\n', 'keyboard');
            assert.strictEqual(model.getValue(), [
                'class ItemCtrl {',
                '    getPropertiesByItemId(id) {',
                '        return this.fetchItem(id)',
                '            .then(item => {',
                '                return this.getPropertiesOfItem(item);',
                '            });',
                '    }',
                '    ',
                '}',
            ].join('\n'));
            assert.deepStrictEqual(editor.getSelection(), new Selection(8, 5, 8, 5));
        });
    });
    test('issue #115304: indent block comment onEnter', () => {
        // https://github.com/microsoft/vscode/issues/115304
        const model = createTextModel(['/** */', 'function f() {}'].join('\n'), languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: 'advanced', serviceCollection }, (editor, viewModel) => {
            editor.setSelection(new Selection(1, 4, 1, 4));
            viewModel.type('\n', 'keyboard');
            assert.strictEqual(model.getValue(), ['/**', ' * ', ' */', 'function f() {}'].join('\n'));
            assert.deepStrictEqual(editor.getSelection(), new Selection(2, 4, 2, 4));
        });
    });
    test('issue #43244: indent when lambda arrow function is detected, outdent when end is reached', () => {
        // https://github.com/microsoft/vscode/issues/43244
        const model = createTextModel(['const array = [1, 2, 3, 4, 5];', 'array.map(_)'].join('\n'), languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: 'full', serviceCollection }, (editor, viewModel) => {
            editor.setSelection(new Selection(2, 12, 2, 12));
            viewModel.type('\n', 'keyboard');
            assert.strictEqual(model.getValue(), ['const array = [1, 2, 3, 4, 5];', 'array.map(_', '    ', ')'].join('\n'));
        });
    });
    test('issue #43244: incorrect indentation after if/for/while without braces', () => {
        // https://github.com/microsoft/vscode/issues/43244
        const model = createTextModel(['function f() {', '    if (condition)', '}'].join('\n'), languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: 'full', serviceCollection }, (editor, viewModel) => {
            editor.setSelection(new Selection(2, 19, 2, 19));
            viewModel.type('\n', 'keyboard');
            assert.strictEqual(model.getValue(), ['function f() {', '    if (condition)', '        ', '}'].join('\n'));
            viewModel.type('return;');
            viewModel.type('\n', 'keyboard');
            assert.strictEqual(model.getValue(), ['function f() {', '    if (condition)', '        return;', '    ', '}'].join('\n'));
        });
    });
    test('issue #208232: incorrect indentation inside of comments', () => {
        // https://github.com/microsoft/vscode/issues/208232
        const model = createTextModel(['/**', 'indentation done for {', '*/'].join('\n'), languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: 'full', serviceCollection }, (editor, viewModel, instantiationService) => {
            const tokens = [
                [{ startIndex: 0, standardTokenType: 1 /* StandardTokenType.Comment */ }],
                [{ startIndex: 0, standardTokenType: 1 /* StandardTokenType.Comment */ }],
                [{ startIndex: 0, standardTokenType: 1 /* StandardTokenType.Comment */ }],
            ];
            disposables.add(registerTokenizationSupport(instantiationService, tokens, languageId));
            editor.setSelection(new Selection(2, 23, 2, 23));
            viewModel.type('\n', 'keyboard');
            assert.strictEqual(model.getValue(), ['/**', 'indentation done for {', '', '*/'].join('\n'));
        });
    });
    test('issue #209802: allman style braces in JavaScript', () => {
        // https://github.com/microsoft/vscode/issues/209802
        const model = createTextModel(['if (/*condition*/)'].join('\n'), languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: 'full', serviceCollection }, (editor, viewModel) => {
            editor.setSelection(new Selection(1, 19, 1, 19));
            viewModel.type('\n', 'keyboard');
            assert.strictEqual(model.getValue(), ['if (/*condition*/)', '    '].join('\n'));
            viewModel.type('{', 'keyboard');
            assert.strictEqual(model.getValue(), ['if (/*condition*/)', '{}'].join('\n'));
            editor.setSelection(new Selection(2, 2, 2, 2));
            viewModel.type('\n', 'keyboard');
            assert.strictEqual(model.getValue(), ['if (/*condition*/)', '{', '    ', '}'].join('\n'));
        });
    });
    // Failing tests...
    test.skip('issue #43244: indent after equal sign is detected', () => {
        // https://github.com/microsoft/vscode/issues/43244
        // issue: Should indent after an equal sign is detected followed by whitespace characters.
        // This should be outdented when a semi-colon is detected indicating the end of the assignment.
        // TODO: requires exploring indent/outdent pairs instead
        const model = createTextModel(['const array ='].join('\n'), languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: 'full', serviceCollection }, (editor, viewModel) => {
            editor.setSelection(new Selection(1, 14, 1, 14));
            viewModel.type('\n', 'keyboard');
            assert.strictEqual(model.getValue(), ['const array =', '    '].join('\n'));
        });
    });
    test.skip('issue #43244: indent after dot detected after object/array signifying a method call', () => {
        // https://github.com/microsoft/vscode/issues/43244
        // issue: When a dot is written, we should detect that this is a method call and indent accordingly
        // TODO: requires exploring indent/outdent pairs instead
        const model = createTextModel(['const array = [1, 2, 3];', 'array.'].join('\n'), languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: 'full', serviceCollection }, (editor, viewModel) => {
            editor.setSelection(new Selection(2, 7, 2, 7));
            viewModel.type('\n', 'keyboard');
            assert.strictEqual(model.getValue(), ['const array = [1, 2, 3];', 'array.', '    '].join('\n'));
        });
    });
    test.skip('issue #43244: indent after dot detected on a subsequent line after object/array signifying a method call', () => {
        // https://github.com/microsoft/vscode/issues/43244
        // issue: When a dot is written, we should detect that this is a method call and indent accordingly
        // TODO: requires exploring indent/outdent pairs instead
        const model = createTextModel(['const array = [1, 2, 3]'].join('\n'), languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: 'full', serviceCollection }, (editor, viewModel) => {
            editor.setSelection(new Selection(2, 7, 2, 7));
            viewModel.type('\n', 'keyboard');
            viewModel.type('.');
            assert.strictEqual(model.getValue(), ['const array = [1, 2, 3]', '    .'].join('\n'));
        });
    });
    test.skip('issue #43244: keep indentation when methods called on object/array', () => {
        // https://github.com/microsoft/vscode/issues/43244
        // Currently passes, but should pass with all the tests above too
        // TODO: requires exploring indent/outdent pairs instead
        const model = createTextModel(['const array = [1, 2, 3]', '    .filter(() => true)'].join('\n'), languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: 'full', serviceCollection }, (editor, viewModel) => {
            editor.setSelection(new Selection(2, 24, 2, 24));
            viewModel.type('\n', 'keyboard');
            assert.strictEqual(model.getValue(), ['const array = [1, 2, 3]', '    .filter(() => true)', '    '].join('\n'));
        });
    });
    test.skip('issue #43244: keep indentation when chained methods called on object/array', () => {
        // https://github.com/microsoft/vscode/issues/43244
        // When the call chain is not finished yet, and we type a dot, we do not want to change the indentation
        // TODO: requires exploring indent/outdent pairs instead
        const model = createTextModel(['const array = [1, 2, 3]', '    .filter(() => true)', '    '].join('\n'), languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: 'full', serviceCollection }, (editor, viewModel) => {
            editor.setSelection(new Selection(3, 5, 3, 5));
            viewModel.type('.');
            assert.strictEqual(model.getValue(), [
                'const array = [1, 2, 3]',
                '    .filter(() => true)',
                '    .', // here we don't want to increase the indentation because we have chained methods
            ].join('\n'));
        });
    });
    test.skip('issue #43244: outdent when a semi-color is detected indicating the end of the assignment', () => {
        // https://github.com/microsoft/vscode/issues/43244
        // TODO: requires exploring indent/outdent pairs instead
        const model = createTextModel(['const array = [1, 2, 3]', '    .filter(() => true);'].join('\n'), languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: 'full', serviceCollection }, (editor, viewModel) => {
            editor.setSelection(new Selection(2, 25, 2, 25));
            viewModel.type('\n', 'keyboard');
            assert.strictEqual(model.getValue(), ['const array = [1, 2, 3]', '    .filter(() => true);', ''].join('\n'));
        });
    });
    test.skip('issue #40115: keep indentation when added', () => {
        // https://github.com/microsoft/vscode/issues/40115
        const model = createTextModel('function foo() {}', languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: 'full', serviceCollection }, (editor, viewModel) => {
            editor.setSelection(new Selection(1, 17, 1, 17));
            viewModel.type('\n', 'keyboard');
            assert.strictEqual(model.getValue(), ['function foo() {', '    ', '}'].join('\n'));
            editor.setSelection(new Selection(2, 5, 2, 5));
            viewModel.type('\n', 'keyboard');
            assert.strictEqual(model.getValue(), ['function foo() {', '    ', '    ', '}'].join('\n'));
        });
    });
    test.skip('issue #193875: incorrect indentation on enter', () => {
        // https://github.com/microsoft/vscode/issues/193875
        const model = createTextModel(['{', '    for(;;)', '    for(;;) {}', '}'].join('\n'), languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: 'full', serviceCollection }, (editor, viewModel) => {
            editor.setSelection(new Selection(3, 14, 3, 14));
            viewModel.type('\n', 'keyboard');
            assert.strictEqual(model.getValue(), ['{', '    for(;;)', '    for(;;) {', '        ', '    }', '}'].join('\n'));
        });
    });
    test.skip('issue #67678: indent on typing curly brace', () => {
        // https://github.com/microsoft/vscode/issues/67678
        const model = createTextModel(['if (true) {', 'console.log("a")', 'console.log("b")', ''].join('\n'), languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: 'full', serviceCollection }, (editor, viewModel) => {
            editor.setSelection(new Selection(4, 1, 4, 1));
            viewModel.type('}', 'keyboard');
            assert.strictEqual(model.getValue(), ['if (true) {', '    console.log("a")', '    console.log("b")', '}'].join('\n'));
        });
    });
    test.skip('issue #46401: outdent when encountering bracket on line - allman style indentation', () => {
        // https://github.com/microsoft/vscode/issues/46401
        const model = createTextModel(['if (true)', '    '].join('\n'), languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: 'full', serviceCollection }, (editor, viewModel) => {
            editor.setSelection(new Selection(2, 5, 2, 5));
            viewModel.type('{}', 'keyboard');
            assert.strictEqual(model.getValue(), ['if (true)', '{}'].join('\n'));
            editor.setSelection(new Selection(2, 2, 2, 2));
            viewModel.type('\n', 'keyboard');
            assert.strictEqual(model.getValue(), ['if (true)', '{', '    ', '}'].join('\n'));
        });
    });
    test.skip('issue #125261: typing closing brace does not keep the current indentation', () => {
        // https://github.com/microsoft/vscode/issues/125261
        const model = createTextModel(['foo {', '    '].join('\n'), languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: 'keep', serviceCollection }, (editor, viewModel) => {
            editor.setSelection(new Selection(2, 5, 2, 5));
            viewModel.type('}', 'keyboard');
            assert.strictEqual(model.getValue(), ['foo {', '}'].join('\n'));
        });
    });
});
suite('Auto Indent On Type - Ruby', () => {
    const languageId = Language.Ruby;
    let disposables;
    let serviceCollection;
    setup(() => {
        disposables = new DisposableStore();
        const languageService = new LanguageService();
        const languageConfigurationService = new TestLanguageConfigurationService();
        disposables.add(languageService);
        disposables.add(languageConfigurationService);
        disposables.add(registerLanguage(languageService, languageId));
        disposables.add(registerLanguageConfiguration(languageConfigurationService, languageId));
        serviceCollection = new ServiceCollection([ILanguageService, languageService], [ILanguageConfigurationService, languageConfigurationService]);
    });
    teardown(() => {
        disposables.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('issue #198350: in or when incorrectly match non keywords for Ruby', () => {
        // https://github.com/microsoft/vscode/issues/198350
        const model = createTextModel('', languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: 'full', serviceCollection }, (editor, viewModel) => {
            viewModel.type('def foo\n        i');
            viewModel.type('n', 'keyboard');
            assert.strictEqual(model.getValue(), 'def foo\n        in');
            viewModel.type(' ', 'keyboard');
            assert.strictEqual(model.getValue(), 'def foo\nin ');
            viewModel.model.setValue('');
            viewModel.type('  # in');
            assert.strictEqual(model.getValue(), '  # in');
            viewModel.type(' ', 'keyboard');
            assert.strictEqual(model.getValue(), '  # in ');
        });
    });
    // Failing tests...
    test.skip('issue #199846: in or when incorrectly match non keywords for Ruby', () => {
        // https://github.com/microsoft/vscode/issues/199846
        // explanation: happening because the # is detected probably as a comment
        const model = createTextModel('', languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: 'full', serviceCollection }, (editor, viewModel) => {
            viewModel.type("method('#foo') do");
            viewModel.type('\n', 'keyboard');
            assert.strictEqual(model.getValue(), ["method('#foo') do", '    '].join('\n'));
        });
    });
});
suite('Auto Indent On Type - PHP', () => {
    const languageId = Language.PHP;
    let disposables;
    let serviceCollection;
    setup(() => {
        disposables = new DisposableStore();
        const languageService = new LanguageService();
        const languageConfigurationService = new TestLanguageConfigurationService();
        disposables.add(languageService);
        disposables.add(languageConfigurationService);
        disposables.add(registerLanguage(languageService, languageId));
        disposables.add(registerLanguageConfiguration(languageConfigurationService, languageId));
        serviceCollection = new ServiceCollection([ILanguageService, languageService], [ILanguageConfigurationService, languageConfigurationService]);
    });
    teardown(() => {
        disposables.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('issue #199050: should not indent after { detected in a string', () => {
        // https://github.com/microsoft/vscode/issues/199050
        const model = createTextModel("preg_replace('{');", languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: 'full', serviceCollection }, (editor, viewModel, instantiationService) => {
            const tokens = [
                [
                    { startIndex: 0, standardTokenType: 0 /* StandardTokenType.Other */ },
                    { startIndex: 13, standardTokenType: 2 /* StandardTokenType.String */ },
                    { startIndex: 16, standardTokenType: 0 /* StandardTokenType.Other */ },
                ],
            ];
            disposables.add(registerTokenizationSupport(instantiationService, tokens, languageId));
            editor.setSelection(new Selection(1, 54, 1, 54));
            viewModel.type('\n', 'keyboard');
            assert.strictEqual(model.getValue(), ["preg_replace('{');", ''].join('\n'));
        });
    });
});
suite('Auto Indent On Paste - Go', () => {
    const languageId = Language.Go;
    let disposables;
    let serviceCollection;
    setup(() => {
        disposables = new DisposableStore();
        const languageService = new LanguageService();
        const languageConfigurationService = new TestLanguageConfigurationService();
        disposables.add(languageService);
        disposables.add(languageConfigurationService);
        disposables.add(registerLanguage(languageService, languageId));
        disposables.add(registerLanguageConfiguration(languageConfigurationService, languageId));
        serviceCollection = new ServiceCollection([ILanguageService, languageService], [ILanguageConfigurationService, languageConfigurationService]);
    });
    teardown(() => {
        disposables.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('temp issue because there should be at least one passing test in a suite', () => {
        assert.ok(true);
    });
    test.skip('issue #199050: should not indent after { detected in a string', () => {
        // https://github.com/microsoft/vscode/issues/199050
        const model = createTextModel(['var s = `', 'quick  brown', 'fox', '`'].join('\n'), languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: 'full', serviceCollection }, (editor, viewModel) => {
            editor.setSelection(new Selection(3, 1, 3, 1));
            const text = '  ';
            const autoIndentOnPasteController = editor.registerAndInstantiateContribution(AutoIndentOnPaste.ID, AutoIndentOnPaste);
            viewModel.paste(text, true, undefined, 'keyboard');
            autoIndentOnPasteController.trigger(new Range(3, 1, 3, 3));
            assert.strictEqual(model.getValue(), ['var s = `', 'quick  brown', '  fox', '`'].join('\n'));
        });
    });
});
suite('Auto Indent On Type - CPP', () => {
    const languageId = Language.CPP;
    let disposables;
    let serviceCollection;
    setup(() => {
        disposables = new DisposableStore();
        const languageService = new LanguageService();
        const languageConfigurationService = new TestLanguageConfigurationService();
        disposables.add(languageService);
        disposables.add(languageConfigurationService);
        disposables.add(registerLanguage(languageService, languageId));
        disposables.add(registerLanguageConfiguration(languageConfigurationService, languageId));
        serviceCollection = new ServiceCollection([ILanguageService, languageService], [ILanguageConfigurationService, languageConfigurationService]);
    });
    teardown(() => {
        disposables.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('temp issue because there should be at least one passing test in a suite', () => {
        assert.ok(true);
    });
    test.skip('issue #178334: incorrect outdent of } when signature spans multiple lines', () => {
        // https://github.com/microsoft/vscode/issues/178334
        const model = createTextModel(['int WINAPI WinMain(bool instance,', '    int nshowcmd) {}'].join('\n'), languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: 'full', serviceCollection }, (editor, viewModel) => {
            editor.setSelection(new Selection(2, 20, 2, 20));
            viewModel.type('\n', 'keyboard');
            assert.strictEqual(model.getValue(), ['int WINAPI WinMain(bool instance,', '    int nshowcmd) {', '    ', '}'].join('\n'));
        });
    });
    test.skip('issue #118929: incorrect indent when // follows curly brace', () => {
        // https://github.com/microsoft/vscode/issues/118929
        const model = createTextModel(['if (true) { // jaja', '}'].join('\n'), languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: 'full', serviceCollection }, (editor, viewModel) => {
            editor.setSelection(new Selection(1, 20, 1, 20));
            viewModel.type('\n', 'keyboard');
            assert.strictEqual(model.getValue(), ['if (true) { // jaja', '    ', '}'].join('\n'));
        });
    });
    test.skip('issue #111265: auto indentation set to "none" still changes the indentation', () => {
        // https://github.com/microsoft/vscode/issues/111265
        const model = createTextModel(['int func() {', '		'].join('\n'), languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: 'none', serviceCollection }, (editor, viewModel) => {
            editor.setSelection(new Selection(2, 3, 2, 3));
            viewModel.type('}', 'keyboard');
            assert.strictEqual(model.getValue(), ['int func() {', '		}'].join('\n'));
        });
    });
});
suite('Auto Indent On Type - HTML', () => {
    const languageId = Language.HTML;
    let disposables;
    let serviceCollection;
    setup(() => {
        disposables = new DisposableStore();
        const languageService = new LanguageService();
        const languageConfigurationService = new TestLanguageConfigurationService();
        disposables.add(languageService);
        disposables.add(languageConfigurationService);
        disposables.add(registerLanguage(languageService, languageId));
        disposables.add(registerLanguageConfiguration(languageConfigurationService, languageId));
        serviceCollection = new ServiceCollection([ILanguageService, languageService], [ILanguageConfigurationService, languageConfigurationService]);
    });
    teardown(() => {
        disposables.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('temp issue because there should be at least one passing test in a suite', () => {
        assert.ok(true);
    });
    test.skip('issue #61510: incorrect indentation after // in html file', () => {
        // https://github.com/microsoft/vscode/issues/178334
        const model = createTextModel(['<pre>', '  foo //I press <Enter> at the end of this line', '</pre>'].join('\n'), languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: 'full', serviceCollection }, (editor, viewModel) => {
            editor.setSelection(new Selection(2, 48, 2, 48));
            viewModel.type('\n', 'keyboard');
            assert.strictEqual(model.getValue(), ['<pre>', '  foo //I press <Enter> at the end of this line', '  ', '</pre>'].join('\n'));
        });
    });
});
suite('Auto Indent On Type - Visual Basic', () => {
    const languageId = Language.VB;
    let disposables;
    let serviceCollection;
    setup(() => {
        disposables = new DisposableStore();
        const languageService = new LanguageService();
        const languageConfigurationService = new TestLanguageConfigurationService();
        disposables.add(languageService);
        disposables.add(languageConfigurationService);
        disposables.add(registerLanguage(languageService, languageId));
        disposables.add(registerLanguageConfiguration(languageConfigurationService, languageId));
        serviceCollection = new ServiceCollection([ILanguageService, languageService], [ILanguageConfigurationService, languageConfigurationService]);
    });
    teardown(() => {
        disposables.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('temp issue because there should be at least one passing test in a suite', () => {
        assert.ok(true);
    });
    test.skip('issue #118932: no indentation in visual basic files', () => {
        // https://github.com/microsoft/vscode/issues/118932
        const model = createTextModel(['if True then', '    Some code', '    end i'].join('\n'), languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: 'full', serviceCollection }, (editor, viewModel, instantiationService) => {
            editor.setSelection(new Selection(3, 10, 3, 10));
            viewModel.type('f', 'keyboard');
            assert.strictEqual(model.getValue(), ['if True then', '    Some code', 'end if'].join('\n'));
        });
    });
});
suite('Auto Indent On Type - Latex', () => {
    const languageId = Language.Latex;
    let disposables;
    let serviceCollection;
    setup(() => {
        disposables = new DisposableStore();
        const languageService = new LanguageService();
        const languageConfigurationService = new TestLanguageConfigurationService();
        disposables.add(languageService);
        disposables.add(languageConfigurationService);
        disposables.add(registerLanguage(languageService, languageId));
        disposables.add(registerLanguageConfiguration(languageConfigurationService, languageId));
        serviceCollection = new ServiceCollection([ILanguageService, languageService], [ILanguageConfigurationService, languageConfigurationService]);
    });
    teardown(() => {
        disposables.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('temp issue because there should be at least one passing test in a suite', () => {
        assert.ok(true);
    });
    test.skip('issue #178075: no auto closing pair when indentation done', () => {
        // https://github.com/microsoft/vscode/issues/178075
        const model = createTextModel(['\\begin{theorem}', '    \\end'].join('\n'), languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: 'full', serviceCollection }, (editor, viewModel) => {
            editor.setSelection(new Selection(2, 9, 2, 9));
            viewModel.type('{', 'keyboard');
            assert.strictEqual(model.getValue(), ['\\begin{theorem}', '\\end{}'].join('\n'));
        });
    });
});
suite('Auto Indent On Type - Lua', () => {
    const languageId = Language.Lua;
    let disposables;
    let serviceCollection;
    setup(() => {
        disposables = new DisposableStore();
        const languageService = new LanguageService();
        const languageConfigurationService = new TestLanguageConfigurationService();
        disposables.add(languageService);
        disposables.add(languageConfigurationService);
        disposables.add(registerLanguage(languageService, languageId));
        disposables.add(registerLanguageConfiguration(languageConfigurationService, languageId));
        serviceCollection = new ServiceCollection([ILanguageService, languageService], [ILanguageConfigurationService, languageConfigurationService]);
    });
    teardown(() => {
        disposables.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('temp issue because there should be at least one passing test in a suite', () => {
        assert.ok(true);
    });
    test.skip('issue #178075: no auto closing pair when indentation done', () => {
        // https://github.com/microsoft/vscode/issues/178075
        const model = createTextModel(['print("asdf function asdf")'].join('\n'), languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: 'full', serviceCollection }, (editor, viewModel) => {
            editor.setSelection(new Selection(1, 28, 1, 28));
            viewModel.type('\n', 'keyboard');
            assert.strictEqual(model.getValue(), ['print("asdf function asdf")', ''].join('\n'));
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZW50YXRpb24udGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2luZGVudGF0aW9uL3Rlc3QvYnJvd3Nlci9pbmRlbnRhdGlvbi50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsZUFBZSxFQUFlLE1BQU0seUNBQXlDLENBQUE7QUFDdEYsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbEcsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDN0csT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBRTFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFaEUsT0FBTyxFQUNOLHlCQUF5QixFQUd6QixvQkFBb0IsR0FDcEIsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN4QyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDeEUsT0FBTyxFQUNOLGlCQUFpQixFQUNqQiwwQkFBMEIsRUFDMUIsd0JBQXdCLEdBQ3hCLE1BQU0sOEJBQThCLENBQUE7QUFDckMsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDL0UsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3JFLE9BQU8sRUFDTixrQkFBa0IsRUFDbEIsb0JBQW9CLEVBQ3BCLDBCQUEwQixFQUMxQixxQkFBcUIsRUFDckIsbUJBQW1CLEVBQ25CLG1CQUFtQixFQUNuQixvQkFBb0IsR0FDcEIsTUFBTSw0REFBNEQsQ0FBQTtBQUNuRSxPQUFPLEVBQ04sZUFBZSxFQUNmLGdCQUFnQixFQUNoQixzQkFBc0IsRUFDdEIsZUFBZSxHQUNmLE1BQU0sd0RBQXdELENBQUE7QUFDL0QsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ2xGLE9BQU8sRUFDTixlQUFlLEVBQ2YsY0FBYyxFQUNkLGdCQUFnQixFQUNoQixpQkFBaUIsRUFDakIsZUFBZSxFQUNmLGVBQWUsRUFDZixnQkFBZ0IsRUFDaEIsc0JBQXNCLEVBQ3RCLGNBQWMsR0FDZCxNQUFNLHdEQUF3RCxDQUFBO0FBQy9ELE9BQU8sRUFDTiwrQkFBK0IsRUFDL0IsMEJBQTBCLEdBQzFCLE1BQU0saUVBQWlFLENBQUE7QUFDeEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ2hGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1FQUFtRSxDQUFBO0FBQ3JHLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLG1FQUFtRSxDQUFBO0FBRXBILE1BQU0sQ0FBTixJQUFZLFFBVVg7QUFWRCxXQUFZLFFBQVE7SUFDbkIsa0NBQXNCLENBQUE7SUFDdEIsOEJBQWtCLENBQUE7SUFDbEIsNEJBQWdCLENBQUE7SUFDaEIsMEJBQWMsQ0FBQTtJQUNkLDRCQUFnQixDQUFBO0lBQ2hCLDhCQUFrQixDQUFBO0lBQ2xCLDBCQUFjLENBQUE7SUFDZCxnQ0FBb0IsQ0FBQTtJQUNwQiw0QkFBZ0IsQ0FBQTtBQUNqQixDQUFDLEVBVlcsUUFBUSxLQUFSLFFBQVEsUUFVbkI7QUFFRCxTQUFTLDhCQUE4QixDQUN0QyxLQUFlLEVBQ2YsU0FBb0IsRUFDcEIsT0FBZSxFQUNmLGFBQXVCLEVBQ3ZCLGlCQUE0QjtJQUU1QixXQUFXLENBQ1YsS0FBSyxFQUNMLElBQUksRUFDSixTQUFTLEVBQ1QsQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFLEVBQUUsQ0FBQyxJQUFJLDBCQUEwQixDQUFDLEdBQUcsRUFBRSxPQUFPLENBQUMsRUFDL0QsYUFBYSxFQUNiLGlCQUFpQixDQUNqQixDQUFBO0FBQ0YsQ0FBQztBQUVELFNBQVMsNEJBQTRCLENBQ3BDLEtBQWUsRUFDZixTQUFvQixFQUNwQixPQUFlLEVBQ2YsYUFBdUIsRUFDdkIsaUJBQTRCO0lBRTVCLFdBQVcsQ0FDVixLQUFLLEVBQ0wsSUFBSSxFQUNKLFNBQVMsRUFDVCxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUUsRUFBRSxDQUFDLElBQUksd0JBQXdCLENBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxFQUM3RCxhQUFhLEVBQ2IsaUJBQWlCLENBQ2pCLENBQUE7QUFDRixDQUFDO0FBRUQsTUFBTSxVQUFVLGdCQUFnQixDQUMvQixlQUFpQyxFQUNqQyxRQUFrQjtJQUVsQixPQUFPLGVBQWUsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLEVBQUUsRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFBO0FBQzFELENBQUM7QUFFRCxNQUFNLFVBQVUsNkJBQTZCLENBQzVDLDRCQUEyRCxFQUMzRCxRQUFrQjtJQUVsQixRQUFRLFFBQVEsRUFBRSxDQUFDO1FBQ2xCLEtBQUssUUFBUSxDQUFDLFVBQVU7WUFDdkIsT0FBTyw0QkFBNEIsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFO2dCQUN0RCxRQUFRLEVBQUUsc0JBQXNCO2dCQUNoQyxRQUFRLEVBQUU7b0JBQ1QsV0FBVyxFQUFFLElBQUk7b0JBQ2pCLFlBQVksRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUM7aUJBQzFCO2dCQUNELGdCQUFnQixFQUFFLCtCQUErQjtnQkFDakQsZ0JBQWdCLEVBQUUsMEJBQTBCO2dCQUM1QyxZQUFZLEVBQUUsc0JBQXNCO2FBQ3BDLENBQUMsQ0FBQTtRQUNILEtBQUssUUFBUSxDQUFDLElBQUk7WUFDakIsT0FBTyw0QkFBNEIsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFO2dCQUN0RCxRQUFRLEVBQUUsZ0JBQWdCO2dCQUMxQixnQkFBZ0IsRUFBRSxvQkFBb0I7YUFDdEMsQ0FBQyxDQUFBO1FBQ0gsS0FBSyxRQUFRLENBQUMsR0FBRztZQUNoQixPQUFPLDRCQUE0QixDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUU7Z0JBQ3RELFFBQVEsRUFBRSxlQUFlO2dCQUN6QixnQkFBZ0IsRUFBRSxtQkFBbUI7Z0JBQ3JDLFlBQVksRUFBRSxlQUFlO2FBQzdCLENBQUMsQ0FBQTtRQUNILEtBQUssUUFBUSxDQUFDLEVBQUU7WUFDZixPQUFPLDRCQUE0QixDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUU7Z0JBQ3RELFFBQVEsRUFBRSxjQUFjO2dCQUN4QixnQkFBZ0IsRUFBRSxrQkFBa0I7YUFDcEMsQ0FBQyxDQUFBO1FBQ0gsS0FBSyxRQUFRLENBQUMsR0FBRztZQUNoQixPQUFPLDRCQUE0QixDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUU7Z0JBQ3RELFFBQVEsRUFBRSxlQUFlO2dCQUN6QixZQUFZLEVBQUUsZUFBZTthQUM3QixDQUFDLENBQUE7UUFDSCxLQUFLLFFBQVEsQ0FBQyxJQUFJO1lBQ2pCLE9BQU8sNEJBQTRCLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRTtnQkFDdEQsUUFBUSxFQUFFLGdCQUFnQjtnQkFDMUIsZ0JBQWdCLEVBQUUsb0JBQW9CO2dCQUN0QyxZQUFZLEVBQUUsZ0JBQWdCO2FBQzlCLENBQUMsQ0FBQTtRQUNILEtBQUssUUFBUSxDQUFDLEVBQUU7WUFDZixPQUFPLDRCQUE0QixDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUU7Z0JBQ3RELFFBQVEsRUFBRSxjQUFjO2FBQ3hCLENBQUMsQ0FBQTtRQUNILEtBQUssUUFBUSxDQUFDLEtBQUs7WUFDbEIsT0FBTyw0QkFBNEIsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFO2dCQUN0RCxRQUFRLEVBQUUsaUJBQWlCO2dCQUMzQixnQkFBZ0IsRUFBRSwwQkFBMEI7Z0JBQzVDLGdCQUFnQixFQUFFLHFCQUFxQjthQUN2QyxDQUFDLENBQUE7UUFDSCxLQUFLLFFBQVEsQ0FBQyxHQUFHO1lBQ2hCLE9BQU8sNEJBQTRCLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRTtnQkFDdEQsUUFBUSxFQUFFLGVBQWU7Z0JBQ3pCLGdCQUFnQixFQUFFLG1CQUFtQjthQUNyQyxDQUFDLENBQUE7SUFDSixDQUFDO0FBQ0YsQ0FBQztBQU9ELE1BQU0sVUFBVSwyQkFBMkIsQ0FDMUMsb0JBQThDLEVBQzlDLE1BQWlDLEVBQ2pDLFVBQW9CO0lBRXBCLElBQUksU0FBUyxHQUFHLENBQUMsQ0FBQTtJQUNqQixNQUFNLGVBQWUsR0FBRyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtJQUNsRSxNQUFNLG1CQUFtQixHQUF5QjtRQUNqRCxlQUFlLEVBQUUsR0FBRyxFQUFFLENBQUMsU0FBUztRQUNoQyxRQUFRLEVBQUUsU0FBVTtRQUNwQixlQUFlLEVBQUUsQ0FBQyxJQUFZLEVBQUUsTUFBZSxFQUFFLEtBQWEsRUFBNkIsRUFBRTtZQUM1RixNQUFNLFlBQVksR0FBRyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQTtZQUN4QyxNQUFNLGlCQUFpQixHQUFHLGVBQWUsQ0FBQyxlQUFlLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLENBQUE7WUFDdEYsTUFBTSxNQUFNLEdBQUcsSUFBSSxXQUFXLENBQUMsQ0FBQyxHQUFHLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUN2RCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsWUFBWSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUM5QyxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUE7Z0JBQzFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztvQkFDaEIsQ0FBQyxpQkFBaUIsNENBQW9DLENBQUM7d0JBQ3ZELENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLGlCQUFpQiw0Q0FBb0MsQ0FBQyxDQUFBO1lBQ3pFLENBQUM7WUFDRCxPQUFPLElBQUkseUJBQXlCLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ3BELENBQUM7S0FDRCxDQUFBO0lBQ0QsT0FBTyxvQkFBb0IsQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLG1CQUFtQixDQUFDLENBQUE7QUFDdEUsQ0FBQztBQUVELEtBQUssQ0FBQyxzREFBc0QsRUFBRSxHQUFHLEVBQUU7SUFDbEUsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxJQUFJLENBQUMsbUNBQW1DLEVBQUU7UUFDekMsOEJBQThCLENBQzdCLENBQUMsT0FBTyxFQUFFLGFBQWEsRUFBRSxZQUFZLEVBQUUsZUFBZSxFQUFFLFNBQVMsQ0FBQyxFQUNsRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDekIsQ0FBQyxFQUNELENBQUMsT0FBTyxFQUFFLGFBQWEsRUFBRSxZQUFZLEVBQUUsaUJBQWlCLEVBQUUsV0FBVyxDQUFDLEVBQ3RFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUN6QixDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsZ0NBQWdDLEVBQUU7UUFDdEMsOEJBQThCLENBQzdCLENBQUMsV0FBVyxFQUFFLGVBQWUsRUFBRSxtQkFBbUIsRUFBRSxhQUFhLEVBQUUsT0FBTyxDQUFDLEVBQzNFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUN6QixDQUFDLEVBQ0QsQ0FBQyxhQUFhLEVBQUUsZ0JBQWdCLEVBQUUsc0JBQXNCLEVBQUUsYUFBYSxFQUFFLE9BQU8sQ0FBQyxFQUNqRixJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FDekIsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGVBQWUsRUFBRTtRQUNyQiw4QkFBOEIsQ0FDN0IsQ0FBQyxhQUFhLEVBQUUsc0JBQXNCLEVBQUUsbUJBQW1CLEVBQUUsZ0JBQWdCLEVBQUUsT0FBTyxDQUFDLEVBQ3ZGLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUN6QixDQUFDLEVBQ0QsQ0FBQyxhQUFhLEVBQUUsc0JBQXNCLEVBQUUsbUJBQW1CLEVBQUUsZ0JBQWdCLEVBQUUsT0FBTyxDQUFDLEVBQ3ZGLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUN6QixDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsYUFBYSxFQUFFO1FBQ25CLDhCQUE4QixDQUM3QixDQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUUsTUFBTSxDQUFDLEVBQ3hCLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUN6QixDQUFDLEVBQ0QsQ0FBQyxRQUFRLEVBQUUsSUFBSSxFQUFFLE1BQU0sQ0FBQyxFQUN4QixJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FDekIsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFBO0FBQ0gsQ0FBQyxDQUFDLENBQUE7QUFFRixLQUFLLENBQUMscURBQXFELEVBQUUsR0FBRyxFQUFFO0lBQ2pFLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsSUFBSSxDQUFDLDhCQUE4QixFQUFFO1FBQ3BDLDRCQUE0QixDQUMzQixDQUFDLFdBQVcsRUFBRSxhQUFhLEVBQUUsZ0JBQWdCLEVBQUUsYUFBYSxFQUFFLE9BQU8sQ0FBQyxFQUN0RSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDekIsQ0FBQyxFQUNELENBQUMsU0FBUyxFQUFFLGFBQWEsRUFBRSxjQUFjLEVBQUUsYUFBYSxFQUFFLE9BQU8sQ0FBQyxFQUNsRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FDekIsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGtDQUFrQyxFQUFFO1FBQ3hDLDRCQUE0QixDQUMzQixDQUFDLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxzQkFBc0IsRUFBRSxhQUFhLEVBQUUsWUFBWSxDQUFDLEVBQ2hGLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUN6QixDQUFDLEVBQ0QsQ0FBQyxPQUFPLEVBQUUsZUFBZSxFQUFFLG1CQUFtQixFQUFFLGFBQWEsRUFBRSxXQUFXLENBQUMsRUFDM0UsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQ3pCLENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxpQkFBaUIsRUFBRTtRQUN2Qiw0QkFBNEIsQ0FDM0IsQ0FBQyxnQkFBZ0IsRUFBRSxzQkFBc0IsRUFBRSxtQkFBbUIsRUFBRSxnQkFBZ0IsRUFBRSxPQUFPLENBQUMsRUFDMUYsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQ3pCLENBQUMsRUFDRCxDQUFDLGdCQUFnQixFQUFFLHNCQUFzQixFQUFFLG1CQUFtQixFQUFFLGdCQUFnQixFQUFFLE9BQU8sQ0FBQyxFQUMxRixJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FDekIsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGNBQWMsRUFBRTtRQUNwQiw4QkFBOEIsQ0FDN0IsQ0FBQyxPQUFPLENBQUMsRUFDVCxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDekIsQ0FBQyxFQUNELENBQUMsU0FBUyxDQUFDLEVBQ1gsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQ3pCLENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtBQUNILENBQUMsQ0FBQyxDQUFBO0FBRUYsS0FBSyxDQUFDLHlDQUF5QyxFQUFFLEdBQUcsRUFBRTtJQUNyRCxNQUFNLFVBQVUsR0FBRyxRQUFRLENBQUMsVUFBVSxDQUFBO0lBQ3RDLElBQUksV0FBNEIsQ0FBQTtJQUNoQyxJQUFJLGlCQUFvQyxDQUFBO0lBRXhDLEtBQUssQ0FBQyxHQUFHLEVBQUU7UUFDVixXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtRQUNuQyxNQUFNLGVBQWUsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO1FBQzdDLE1BQU0sNEJBQTRCLEdBQUcsSUFBSSxnQ0FBZ0MsRUFBRSxDQUFBO1FBQzNFLFdBQVcsQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUE7UUFDaEMsV0FBVyxDQUFDLEdBQUcsQ0FBQyw0QkFBNEIsQ0FBQyxDQUFBO1FBQzdDLFdBQVcsQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsZUFBZSxFQUFFLFVBQVUsQ0FBQyxDQUFDLENBQUE7UUFDOUQsV0FBVyxDQUFDLEdBQUcsQ0FBQyw2QkFBNkIsQ0FBQyw0QkFBNEIsRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFBO1FBQ3hGLGlCQUFpQixHQUFHLElBQUksaUJBQWlCLENBQ3hDLENBQUMsZ0JBQWdCLEVBQUUsZUFBZSxDQUFDLEVBQ25DLENBQUMsNkJBQTZCLEVBQUUsNEJBQTRCLENBQUMsQ0FDN0QsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFBO0lBRUYsUUFBUSxDQUFDLEdBQUcsRUFBRTtRQUNiLFdBQVcsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUN0QixDQUFDLENBQUMsQ0FBQTtJQUVGLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsSUFBSSxDQUFDLHlFQUF5RSxFQUFFLEdBQUcsRUFBRTtRQUNwRixNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQ2hCLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLElBQUksQ0FBQyxxREFBcUQsRUFBRSxHQUFHLEVBQUU7UUFDckUsbURBQW1EO1FBRW5ELE1BQU0sS0FBSyxHQUFHLGVBQWUsQ0FBQyxDQUFDLElBQUksRUFBRSxZQUFZLEVBQUUsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLFVBQVUsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUN0RixXQUFXLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBRXRCLGtCQUFrQixDQUNqQixLQUFLLEVBQ0wsRUFBRSxVQUFVLEVBQUUsTUFBTSxFQUFFLGlCQUFpQixFQUFFLEVBQ3pDLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxvQkFBb0IsRUFBRSxFQUFFO1lBQzNDLE1BQU0sQ0FBQyxZQUFZLENBQUMsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUM5QyxNQUFNLENBQUMsZUFBZSxDQUNyQiwyQkFBMkIsRUFDM0IsY0FBYyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsWUFBWSxFQUFFLE1BQU0sQ0FBQyxRQUFRLEVBQUUsRUFBRSxNQUFNLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FDeEYsQ0FBQTtZQUNELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsUUFBUSxFQUFFLGdCQUFnQixFQUFFLFVBQVUsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO1FBQzFGLENBQUMsQ0FDRCxDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsSUFBSSxDQUFDLHFEQUFxRCxFQUFFLEdBQUcsRUFBRTtRQUNyRSxtREFBbUQ7UUFFbkQsTUFBTSxLQUFLLEdBQUcsZUFBZSxDQUM1QixDQUFDLHNCQUFzQixFQUFFLFdBQVcsRUFBRSxpQkFBaUIsRUFBRSxZQUFZLEVBQUUsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUN0RixVQUFVLEVBQ1YsRUFBRSxDQUNGLENBQUE7UUFDRCxXQUFXLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBRXRCLGtCQUFrQixDQUNqQixLQUFLLEVBQ0wsRUFBRSxVQUFVLEVBQUUsTUFBTSxFQUFFLGlCQUFpQixFQUFFLEVBQ3pDLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxvQkFBb0IsRUFBRSxFQUFFO1lBQzNDLE1BQU0sQ0FBQyxZQUFZLENBQUMsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUM5QyxNQUFNLENBQUMsZUFBZSxDQUNyQiwyQkFBMkIsRUFDM0IsY0FBYyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsWUFBWSxFQUFFLE1BQU0sQ0FBQyxRQUFRLEVBQUUsRUFBRSxNQUFNLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FDeEYsQ0FBQTtZQUNELE1BQU0sQ0FBQyxXQUFXLENBQ2pCLEtBQUssQ0FBQyxRQUFRLEVBQUUsRUFDaEI7Z0JBQ0MsMEJBQTBCO2dCQUMxQixpQkFBaUI7Z0JBQ2pCLHlCQUF5QjtnQkFDekIsb0JBQW9CO2dCQUNwQixPQUFPO2FBQ1AsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQ1osQ0FBQTtRQUNGLENBQUMsQ0FDRCxDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDLENBQUMsQ0FBQTtBQUVGLEtBQUssQ0FBQyw4Q0FBOEMsRUFBRSxHQUFHLEVBQUU7SUFDMUQsTUFBTSxVQUFVLEdBQUcsUUFBUSxDQUFDLFVBQVUsQ0FBQTtJQUN0QyxJQUFJLFdBQTRCLENBQUE7SUFDaEMsSUFBSSxpQkFBb0MsQ0FBQTtJQUV4QyxLQUFLLENBQUMsR0FBRyxFQUFFO1FBQ1YsV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7UUFDbkMsTUFBTSxlQUFlLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtRQUM3QyxNQUFNLDRCQUE0QixHQUFHLElBQUksZ0NBQWdDLEVBQUUsQ0FBQTtRQUMzRSxXQUFXLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFBO1FBQ2hDLFdBQVcsQ0FBQyxHQUFHLENBQUMsNEJBQTRCLENBQUMsQ0FBQTtRQUM3QyxXQUFXLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLGVBQWUsRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFBO1FBQzlELFdBQVcsQ0FBQyxHQUFHLENBQUMsNkJBQTZCLENBQUMsNEJBQTRCLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQTtRQUN4RixpQkFBaUIsR0FBRyxJQUFJLGlCQUFpQixDQUN4QyxDQUFDLGdCQUFnQixFQUFFLGVBQWUsQ0FBQyxFQUNuQyxDQUFDLDZCQUE2QixFQUFFLDRCQUE0QixDQUFDLENBQzdELENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUVGLFFBQVEsQ0FBQyxHQUFHLEVBQUU7UUFDYixXQUFXLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDdEIsQ0FBQyxDQUFDLENBQUE7SUFFRix1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLElBQUksQ0FBQyxrRUFBa0UsRUFBRSxHQUFHLEVBQUU7UUFDN0UsTUFBTSxLQUFLLEdBQUcsZUFBZSxDQUFDLEVBQUUsRUFBRSxVQUFVLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDakQsV0FBVyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUV0QixrQkFBa0IsQ0FDakIsS0FBSyxFQUNMLEVBQUUsVUFBVSxFQUFFLE1BQU0sRUFBRSxpQkFBaUIsRUFBRSxFQUN6QyxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsb0JBQW9CLEVBQUUsRUFBRTtZQUMzQyxNQUFNLFNBQVMsR0FBRyxDQUFDLEtBQUssRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLGlCQUFpQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQzFFLE1BQU0sTUFBTSxHQUE4QjtnQkFDekM7b0JBQ0MsRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUFFLGlCQUFpQixtQ0FBMkIsRUFBRTtvQkFDL0QsRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUFFLGlCQUFpQixtQ0FBMkIsRUFBRTtpQkFDL0Q7Z0JBQ0Q7b0JBQ0MsRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUFFLGlCQUFpQixtQ0FBMkIsRUFBRTtvQkFDL0QsRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUFFLGlCQUFpQixtQ0FBMkIsRUFBRTtvQkFDL0QsRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUFFLGlCQUFpQixtQ0FBMkIsRUFBRTtpQkFDL0Q7Z0JBQ0Q7b0JBQ0MsRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUFFLGlCQUFpQixtQ0FBMkIsRUFBRTtvQkFDL0QsRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUFFLGlCQUFpQixtQ0FBMkIsRUFBRTtvQkFDL0QsRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUFFLGlCQUFpQixpQ0FBeUIsRUFBRTtpQkFDN0Q7Z0JBQ0Q7b0JBQ0MsRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUFFLGlCQUFpQixpQ0FBeUIsRUFBRTtvQkFDN0QsRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUFFLGlCQUFpQixpQ0FBeUIsRUFBRTtvQkFDN0QsRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUFFLGlCQUFpQixpQ0FBeUIsRUFBRTtvQkFDN0QsRUFBRSxVQUFVLEVBQUUsRUFBRSxFQUFFLGlCQUFpQixpQ0FBeUIsRUFBRTtvQkFDOUQsRUFBRSxVQUFVLEVBQUUsRUFBRSxFQUFFLGlCQUFpQixpQ0FBeUIsRUFBRTtvQkFDOUQsRUFBRSxVQUFVLEVBQUUsRUFBRSxFQUFFLGlCQUFpQixpQ0FBeUIsRUFBRTtvQkFDOUQsRUFBRSxVQUFVLEVBQUUsRUFBRSxFQUFFLGlCQUFpQixpQ0FBeUIsRUFBRTtvQkFDOUQsRUFBRSxVQUFVLEVBQUUsRUFBRSxFQUFFLGlCQUFpQixpQ0FBeUIsRUFBRTtvQkFDOUQsRUFBRSxVQUFVLEVBQUUsRUFBRSxFQUFFLGlCQUFpQixpQ0FBeUIsRUFBRTtpQkFDOUQ7YUFDRCxDQUFBO1lBQ0QsV0FBVyxD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