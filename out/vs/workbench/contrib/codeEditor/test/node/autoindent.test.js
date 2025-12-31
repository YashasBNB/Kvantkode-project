/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as fs from 'fs';
import * as path from 'path';
import assert from 'assert';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { ILanguageConfigurationService } from '../../../../../editor/common/languages/languageConfigurationRegistry.js';
import { getReindentEditOperations } from '../../../../../editor/contrib/indentation/common/indentation.js';
import { createModelServices, instantiateTextModel, } from '../../../../../editor/test/common/testTextModel.js';
import { LanguageConfigurationFileHandler, } from '../../common/languageConfigurationExtensionPoint.js';
import { parse } from '../../../../../base/common/json.js';
import { trimTrailingWhitespace } from '../../../../../editor/common/commands/trimTrailingWhitespaceCommand.js';
import { execSync } from 'child_process';
import { ILanguageService } from '../../../../../editor/common/languages/language.js';
import { EncodedTokenizationResult, TokenizationRegistry, } from '../../../../../editor/common/languages.js';
import { NullState } from '../../../../../editor/common/languages/nullTokenize.js';
import { FileAccess } from '../../../../../base/common/network.js';
function getIRange(range) {
    return {
        startLineNumber: range.startLineNumber,
        startColumn: range.startColumn,
        endLineNumber: range.endLineNumber,
        endColumn: range.endColumn,
    };
}
var LanguageId;
(function (LanguageId) {
    LanguageId["TypeScript"] = "ts-test";
})(LanguageId || (LanguageId = {}));
function forceTokenizationFromLineToLine(model, startLine, endLine) {
    for (let line = startLine; line <= endLine; line++) {
        model.tokenization.forceTokenization(line);
    }
}
function registerLanguage(instantiationService, languageId) {
    const disposables = new DisposableStore();
    const languageService = instantiationService.get(ILanguageService);
    disposables.add(registerLanguageConfiguration(instantiationService, languageId));
    disposables.add(languageService.registerLanguage({ id: languageId }));
    return disposables;
}
function registerLanguageConfiguration(instantiationService, languageId) {
    const languageConfigurationService = instantiationService.get(ILanguageConfigurationService);
    let configPath;
    switch (languageId) {
        case "ts-test" /* LanguageId.TypeScript */:
            configPath = FileAccess.asFileUri('vs/workbench/contrib/codeEditor/test/node/language-configuration.json').fsPath;
            break;
        default:
            throw new Error('Unknown languageId');
    }
    const configContent = fs.readFileSync(configPath, { encoding: 'utf-8' });
    const parsedConfig = parse(configContent, []);
    const languageConfig = LanguageConfigurationFileHandler.extractValidConfig(languageId, parsedConfig);
    return languageConfigurationService.register(languageId, languageConfig);
}
function registerTokenizationSupport(instantiationService, tokens, languageId) {
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
suite('Auto-Reindentation - TypeScript/JavaScript', () => {
    const languageId = "ts-test" /* LanguageId.TypeScript */;
    const options = {};
    let disposables;
    let instantiationService;
    let languageConfigurationService;
    setup(() => {
        disposables = new DisposableStore();
        instantiationService = createModelServices(disposables);
        languageConfigurationService = instantiationService.get(ILanguageConfigurationService);
        disposables.add(instantiationService);
        disposables.add(registerLanguage(instantiationService, languageId));
        disposables.add(registerLanguageConfiguration(instantiationService, languageId));
    });
    teardown(() => {
        disposables.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    // Test which can be ran to find cases of incorrect indentation...
    test.skip('Find Cases of Incorrect Indentation with the Reindent Lines Command', () => {
        // ./scripts/test.sh --inspect --grep='Find Cases of Incorrect Indentation with the Reindent Lines Command' --timeout=15000
        function walkDirectoryAndReindent(directory, languageId) {
            const files = fs.readdirSync(directory, { withFileTypes: true });
            const directoriesToRecurseOn = [];
            for (const file of files) {
                if (file.isDirectory()) {
                    directoriesToRecurseOn.push(path.join(directory, file.name));
                }
                else {
                    const filePathName = path.join(directory, file.name);
                    const fileExtension = path.extname(filePathName);
                    if (fileExtension !== '.ts') {
                        continue;
                    }
                    const fileContents = fs.readFileSync(filePathName, { encoding: 'utf-8' });
                    const modelOptions = {
                        tabSize: 4,
                        insertSpaces: false,
                    };
                    const model = disposables.add(instantiateTextModel(instantiationService, fileContents, languageId, modelOptions));
                    const lineCount = model.getLineCount();
                    const editOperations = [];
                    for (let line = 1; line <= lineCount - 1; line++) {
                        /*
                        NOTE: Uncomment in order to ignore incorrect JS DOC indentation
                        const lineContent = model.getLineContent(line);
                        const trimmedLineContent = lineContent.trim();
                        if (trimmedLineContent.length === 0 || trimmedLineContent.startsWith('*') || trimmedLineContent.startsWith('/*')) {
                            continue;
                        }
                        */
                        const lineContent = model.getLineContent(line);
                        const trimmedLineContent = lineContent.trim();
                        if (trimmedLineContent.length === 0) {
                            continue;
                        }
                        const editOperation = getReindentEditOperations(model, languageConfigurationService, line, line + 1);
                        /*
                        NOTE: Uncomment in order to see actual incorrect indentation diff
                        model.applyEdits(editOperation);
                        */
                        editOperations.push(...editOperation);
                    }
                    model.applyEdits(editOperations);
                    model.applyEdits(trimTrailingWhitespace(model, [], true));
                    fs.writeFileSync(filePathName, model.getValue());
                }
            }
            for (const directory of directoriesToRecurseOn) {
                walkDirectoryAndReindent(directory, languageId);
            }
        }
        walkDirectoryAndReindent('/Users/aiday/Desktop/Test/vscode-test', 'ts-test');
        const output = execSync('cd /Users/aiday/Desktop/Test/vscode-test && git diff --shortstat', {
            encoding: 'utf-8',
        });
        console.log('\ngit diff --shortstat:\n', output);
    });
    // Unit tests for increase and decrease indent patterns...
    /**
     * First increase indent and decrease indent patterns:
     *
     * - decreaseIndentPattern: /^(.*\*\/)?\s*\}.*$/
     *  - In (https://macromates.com/manual/en/appendix)
     * 	  Either we have white space before the closing bracket, or we have a multi line comment ending on that line followed by whitespaces
     *    This is followed by any character.
     *    Textmate decrease indent pattern is as follows: /^(.*\*\/)?\s*\}[;\s]*$/
     *    Presumably allowing multi line comments ending on that line implies that } is itself not part of a multi line comment
     *
     * - increaseIndentPattern: /^.*\{[^}"']*$/
     *  - In (https://macromates.com/manual/en/appendix)
     *    This regex means that we increase the indent when we have any characters followed by the opening brace, followed by characters
     *    except for closing brace }, double quotes " or single quote '.
     *    The } is checked in order to avoid the indentation in the following case `int arr[] = { 1, 2, 3 };`
     *    The double quote and single quote are checked in order to avoid the indentation in the following case: str = "foo {";
     */
    test('Issue #25437', () => {
        // issue: https://github.com/microsoft/vscode/issues/25437
        // fix: https://github.com/microsoft/vscode/commit/8c82a6c6158574e098561c28d470711f1b484fc8
        // explanation: var foo = `{`; should not increase indentation
        // increaseIndentPattern: /^.*\{[^}"']*$/ -> /^.*\{[^}"'`]*$/
        const fileContents = ['const foo = `{`;', '    '].join('\n');
        const tokens = [
            [
                { startIndex: 0, standardTokenType: 0 /* StandardTokenType.Other */ },
                { startIndex: 5, standardTokenType: 0 /* StandardTokenType.Other */ },
                { startIndex: 6, standardTokenType: 0 /* StandardTokenType.Other */ },
                { startIndex: 9, standardTokenType: 0 /* StandardTokenType.Other */ },
                { startIndex: 10, standardTokenType: 0 /* StandardTokenType.Other */ },
                { startIndex: 11, standardTokenType: 0 /* StandardTokenType.Other */ },
                { startIndex: 12, standardTokenType: 2 /* StandardTokenType.String */ },
                { startIndex: 13, standardTokenType: 2 /* StandardTokenType.String */ },
                { startIndex: 14, standardTokenType: 2 /* StandardTokenType.String */ },
                { startIndex: 15, standardTokenType: 0 /* StandardTokenType.Other */ },
                { startIndex: 16, standardTokenType: 0 /* StandardTokenType.Other */ },
            ],
            [
                { startIndex: 0, standardTokenType: 0 /* StandardTokenType.Other */ },
                { startIndex: 4, standardTokenType: 0 /* StandardTokenType.Other */ },
            ],
        ];
        disposables.add(registerTokenizationSupport(instantiationService, tokens, languageId));
        const model = disposables.add(instantiateTextModel(instantiationService, fileContents, languageId, options));
        forceTokenizationFromLineToLine(model, 1, 2);
        const editOperations = getReindentEditOperations(model, languageConfigurationService, 1, model.getLineCount());
        assert.deepStrictEqual(editOperations.length, 1);
        const operation = editOperations[0];
        assert.deepStrictEqual(getIRange(operation.range), {
            startLineNumber: 2,
            startColumn: 1,
            endLineNumber: 2,
            endColumn: 5,
        });
        assert.deepStrictEqual(operation.text, '');
    });
    test('Enriching the hover', () => {
        // issue: -
        // fix: https://github.com/microsoft/vscode/commit/19ae0932c45b1096443a8c1335cf1e02eb99e16d
        // explanation:
        //  - decrease indent on ) and ] also
        //  - increase indent on ( and [ also
        // decreaseIndentPattern: /^(.*\*\/)?\s*\}.*$/ -> /^(.*\*\/)?\s*[\}\]\)].*$/
        // increaseIndentPattern: /^.*\{[^}"'`]*$/ -> /^.*(\{[^}"'`]*|\([^)"'`]*|\[[^\]"'`]*)$/
        let fileContents = ['function foo(', '    bar: string', '    ){}'].join('\n');
        let model = disposables.add(instantiateTextModel(instantiationService, fileContents, languageId, options));
        let editOperations = getReindentEditOperations(model, languageConfigurationService, 1, model.getLineCount());
        assert.deepStrictEqual(editOperations.length, 1);
        let operation = editOperations[0];
        assert.deepStrictEqual(getIRange(operation.range), {
            startLineNumber: 3,
            startColumn: 1,
            endLineNumber: 3,
            endColumn: 5,
        });
        assert.deepStrictEqual(operation.text, '');
        fileContents = ['function foo(', 'bar: string', '){}'].join('\n');
        model = disposables.add(instantiateTextModel(instantiationService, fileContents, languageId, options));
        editOperations = getReindentEditOperations(model, languageConfigurationService, 1, model.getLineCount());
        assert.deepStrictEqual(editOperations.length, 1);
        operation = editOperations[0];
        assert.deepStrictEqual(getIRange(operation.range), {
            startLineNumber: 2,
            startColumn: 1,
            endLineNumber: 2,
            endColumn: 1,
        });
        assert.deepStrictEqual(operation.text, '    ');
    });
    test('Issue #86176', () => {
        // issue: https://github.com/microsoft/vscode/issues/86176
        // fix: https://github.com/microsoft/vscode/commit/d89e2e17a5d1ba37c99b1d3929eb6180a5bfc7a8
        // explanation: When quotation marks are present on the first line of an if statement or for loop, following line should not be indented
        // increaseIndentPattern: /^((?!\/\/).)*(\{[^}"'`]*|\([^)"'`]*|\[[^\]"'`]*)$/ -> /^((?!\/\/).)*(\{([^}"'`]*|(\t|[ ])*\/\/.*)|\([^)"'`]*|\[[^\]"'`]*)$/
        // explanation: after open brace, do not decrease indent if it is followed on the same line by "<whitespace characters> // <any characters>"
        // todo@aiday-mar: should also apply for when it follows ( and [
        const fileContents = [`if () { // '`, `x = 4`, `}`].join('\n');
        const model = disposables.add(instantiateTextModel(instantiationService, fileContents, languageId, options));
        const editOperations = getReindentEditOperations(model, languageConfigurationService, 1, model.getLineCount());
        assert.deepStrictEqual(editOperations.length, 1);
        const operation = editOperations[0];
        assert.deepStrictEqual(getIRange(operation.range), {
            startLineNumber: 2,
            startColumn: 1,
            endLineNumber: 2,
            endColumn: 1,
        });
        assert.deepStrictEqual(operation.text, '    ');
    });
    test('Issue #141816', () => {
        // issue: https://github.com/microsoft/vscode/issues/141816
        // fix: https://github.com/microsoft/vscode/pull/141997/files
        // explanation: if (, [, {, is followed by a forward slash then assume we are in a regex pattern, and do not indent
        // increaseIndentPattern: /^((?!\/\/).)*(\{([^}"'`]*|(\t|[ ])*\/\/.*)|\([^)"'`]*|\[[^\]"'`]*)$/ -> /^((?!\/\/).)*(\{([^}"'`/]*|(\t|[ ])*\/\/.*)|\([^)"'`/]*|\[[^\]"'`/]*)$/
        // -> Final current increase indent pattern at of writing
        const fileContents = ['const r = /{/;', '   '].join('\n');
        const tokens = [
            [
                { startIndex: 0, standardTokenType: 0 /* StandardTokenType.Other */ },
                { startIndex: 5, standardTokenType: 0 /* StandardTokenType.Other */ },
                { startIndex: 6, standardTokenType: 0 /* StandardTokenType.Other */ },
                { startIndex: 7, standardTokenType: 0 /* StandardTokenType.Other */ },
                { startIndex: 8, standardTokenType: 0 /* StandardTokenType.Other */ },
                { startIndex: 9, standardTokenType: 3 /* StandardTokenType.RegEx */ },
                { startIndex: 10, standardTokenType: 3 /* StandardTokenType.RegEx */ },
                { startIndex: 11, standardTokenType: 3 /* StandardTokenType.RegEx */ },
                { startIndex: 12, standardTokenType: 3 /* StandardTokenType.RegEx */ },
                { startIndex: 13, standardTokenType: 0 /* StandardTokenType.Other */ },
                { startIndex: 14, standardTokenType: 0 /* StandardTokenType.Other */ },
            ],
            [
                { startIndex: 0, standardTokenType: 0 /* StandardTokenType.Other */ },
                { startIndex: 4, standardTokenType: 0 /* StandardTokenType.Other */ },
            ],
        ];
        disposables.add(registerTokenizationSupport(instantiationService, tokens, languageId));
        const model = disposables.add(instantiateTextModel(instantiationService, fileContents, languageId, options));
        forceTokenizationFromLineToLine(model, 1, 2);
        const editOperations = getReindentEditOperations(model, languageConfigurationService, 1, model.getLineCount());
        assert.deepStrictEqual(editOperations.length, 1);
        const operation = editOperations[0];
        assert.deepStrictEqual(getIRange(operation.range), {
            startLineNumber: 2,
            startColumn: 1,
            endLineNumber: 2,
            endColumn: 4,
        });
        assert.deepStrictEqual(operation.text, '');
    });
    test('Issue #29886', () => {
        // issue: https://github.com/microsoft/vscode/issues/29886
        // fix: https://github.com/microsoft/vscode/commit/7910b3d7bab8a721aae98dc05af0b5e1ea9d9782
        // decreaseIndentPattern: /^(.*\*\/)?\s*[\}\]\)].*$/ -> /^((?!.*?\/\*).*\*\/)?\s*[\}\]\)].*$/
        // -> Final current decrease indent pattern at the time of writing
        // explanation: Positive lookahead: (?= «pattern») matches if pattern matches what comes after the current location in the input string.
        // Negative lookahead: (?! «pattern») matches if pattern does not match what comes after the current location in the input string
        // The change proposed is to not decrease the indent if there is a multi-line comment ending on the same line before the closing parentheses
        const fileContents = ['function foo() {', '    bar(/*  */)', '};'].join('\n');
        const model = disposables.add(instantiateTextModel(instantiationService, fileContents, languageId, options));
        const editOperations = getReindentEditOperations(model, languageConfigurationService, 1, model.getLineCount());
        assert.deepStrictEqual(editOperations.length, 0);
    });
    test('Issue #209859: do not do reindentation for tokens inside of a string', () => {
        // issue: https://github.com/microsoft/vscode/issues/209859
        const tokens = [
            [
                { startIndex: 0, standardTokenType: 0 /* StandardTokenType.Other */ },
                { startIndex: 12, standardTokenType: 2 /* StandardTokenType.String */ },
            ],
            [{ startIndex: 0, standardTokenType: 2 /* StandardTokenType.String */ }],
            [{ startIndex: 0, standardTokenType: 2 /* StandardTokenType.String */ }],
            [{ startIndex: 0, standardTokenType: 2 /* StandardTokenType.String */ }],
        ];
        disposables.add(registerTokenizationSupport(instantiationService, tokens, languageId));
        const fileContents = [
            'const foo = `some text',
            '         which is strangely',
            '    indented. It should',
            '   not be reindented.`',
        ].join('\n');
        const model = disposables.add(instantiateTextModel(instantiationService, fileContents, languageId, options));
        forceTokenizationFromLineToLine(model, 1, 4);
        const editOperations = getReindentEditOperations(model, languageConfigurationService, 1, model.getLineCount());
        assert.deepStrictEqual(editOperations.length, 0);
    });
    // Failing tests inferred from the current regexes...
    test.skip('Incorrect deindentation after `*/}` string', () => {
        // explanation: If */ was not before the }, the regex does not allow characters before the }, so there would not be an indent
        // Here since there is */ before the }, the regex allows all the characters before, hence there is a deindent
        const fileContents = [
            `const obj = {`,
            `    obj1: {`,
            `        brace : '*/}'`,
            `    }`,
            `}`,
        ].join('\n');
        const model = disposables.add(instantiateTextModel(instantiationService, fileContents, languageId, options));
        const editOperations = getReindentEditOperations(model, languageConfigurationService, 1, model.getLineCount());
        assert.deepStrictEqual(editOperations.length, 0);
    });
    // Failing tests from issues...
    test.skip('Issue #56275', () => {
        // issue: https://github.com/microsoft/vscode/issues/56275
        // explanation: If */ was not before the }, the regex does not allow characters before the }, so there would not be an indent
        // Here since there is */ before the }, the regex allows all the characters before, hence there is a deindent
        let fileContents = ['function foo() {', '    var bar = (/b*/);', '}'].join('\n');
        let model = disposables.add(instantiateTextModel(instantiationService, fileContents, languageId, options));
        let editOperations = getReindentEditOperations(model, languageConfigurationService, 1, model.getLineCount());
        assert.deepStrictEqual(editOperations.length, 0);
        fileContents = ['function foo() {', '    var bar = "/b*/)";', '}'].join('\n');
        model = disposables.add(instantiateTextModel(instantiationService, fileContents, languageId, options));
        editOperations = getReindentEditOperations(model, languageConfigurationService, 1, model.getLineCount());
        assert.deepStrictEqual(editOperations.length, 0);
    });
    test.skip('Issue #116843', () => {
        // issue: https://github.com/microsoft/vscode/issues/116843
        // related: https://github.com/microsoft/vscode/issues/43244
        // explanation: When you have an arrow function, you don't have { or }, but you would expect indentation to still be done in that way
        // TODO: requires exploring indent/outdent pairs instead
        const fileContents = ['const add1 = (n) =>', '	n + 1;'].join('\n');
        const model = disposables.add(instantiateTextModel(instantiationService, fileContents, languageId, options));
        const editOperations = getReindentEditOperations(model, languageConfigurationService, 1, model.getLineCount());
        assert.deepStrictEqual(editOperations.length, 0);
    });
    test.skip('Issue #185252', () => {
        // issue: https://github.com/microsoft/vscode/issues/185252
        // explanation: Reindenting the comment correctly
        const fileContents = ['/*', ' * This is a comment.', ' */'].join('\n');
        const model = disposables.add(instantiateTextModel(instantiationService, fileContents, languageId, options));
        const editOperations = getReindentEditOperations(model, languageConfigurationService, 1, model.getLineCount());
        assert.deepStrictEqual(editOperations.length, 0);
    });
    test.skip('Issue 43244: incorrect indentation when signature of function call spans several lines', () => {
        // issue: https://github.com/microsoft/vscode/issues/43244
        const fileContents = [
            'function callSomeOtherFunction(one: number, two: number) { }',
            'function someFunction() {',
            '    callSomeOtherFunction(4,',
            '        5)',
            '}',
        ].join('\n');
        const model = disposables.add(instantiateTextModel(instantiationService, fileContents, languageId, options));
        const editOperations = getReindentEditOperations(model, languageConfigurationService, 1, model.getLineCount());
        assert.deepStrictEqual(editOperations.length, 0);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0b2luZGVudC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY29kZUVkaXRvci90ZXN0L25vZGUvYXV0b2luZGVudC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxFQUFFLE1BQU0sSUFBSSxDQUFBO0FBQ3hCLE9BQU8sS0FBSyxJQUFJLE1BQU0sTUFBTSxDQUFBO0FBQzVCLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsZUFBZSxFQUFlLE1BQU0seUNBQXlDLENBQUE7QUFDdEYsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbEcsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0seUVBQXlFLENBQUE7QUFDdkgsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0saUVBQWlFLENBQUE7QUFDM0csT0FBTyxFQUVOLG1CQUFtQixFQUNuQixvQkFBb0IsR0FDcEIsTUFBTSxvREFBb0QsQ0FBQTtBQUUzRCxPQUFPLEVBRU4sZ0NBQWdDLEdBQ2hDLE1BQU0scURBQXFELENBQUE7QUFDNUQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBRzFELE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHdFQUF3RSxDQUFBO0FBQy9HLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxlQUFlLENBQUE7QUFDeEMsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDckYsT0FBTyxFQUNOLHlCQUF5QixFQUd6QixvQkFBb0IsR0FDcEIsTUFBTSwyQ0FBMkMsQ0FBQTtBQUNsRCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFNbEYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBRWxFLFNBQVMsU0FBUyxDQUFDLEtBQWE7SUFDL0IsT0FBTztRQUNOLGVBQWUsRUFBRSxLQUFLLENBQUMsZUFBZTtRQUN0QyxXQUFXLEVBQUUsS0FBSyxDQUFDLFdBQVc7UUFDOUIsYUFBYSxFQUFFLEtBQUssQ0FBQyxhQUFhO1FBQ2xDLFNBQVMsRUFBRSxLQUFLLENBQUMsU0FBUztLQUMxQixDQUFBO0FBQ0YsQ0FBQztBQUVELElBQVcsVUFFVjtBQUZELFdBQVcsVUFBVTtJQUNwQixvQ0FBc0IsQ0FBQTtBQUN2QixDQUFDLEVBRlUsVUFBVSxLQUFWLFVBQVUsUUFFcEI7QUFFRCxTQUFTLCtCQUErQixDQUN2QyxLQUFpQixFQUNqQixTQUFpQixFQUNqQixPQUFlO0lBRWYsS0FBSyxJQUFJLElBQUksR0FBRyxTQUFTLEVBQUUsSUFBSSxJQUFJLE9BQU8sRUFBRSxJQUFJLEVBQUUsRUFBRSxDQUFDO1FBQ3BELEtBQUssQ0FBQyxZQUFZLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDM0MsQ0FBQztBQUNGLENBQUM7QUFFRCxTQUFTLGdCQUFnQixDQUN4QixvQkFBOEMsRUFDOUMsVUFBc0I7SUFFdEIsTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtJQUN6QyxNQUFNLGVBQWUsR0FBRyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtJQUNsRSxXQUFXLENBQUMsR0FBRyxDQUFDLDZCQUE2QixDQUFDLG9CQUFvQixFQUFFLFVBQVUsQ0FBQyxDQUFDLENBQUE7SUFDaEYsV0FBVyxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLEVBQUUsVUFBVSxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQ3JFLE9BQU8sV0FBVyxDQUFBO0FBQ25CLENBQUM7QUFFRCxTQUFTLDZCQUE2QixDQUNyQyxvQkFBOEMsRUFDOUMsVUFBc0I7SUFFdEIsTUFBTSw0QkFBNEIsR0FBRyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsNkJBQTZCLENBQUMsQ0FBQTtJQUM1RixJQUFJLFVBQWtCLENBQUE7SUFDdEIsUUFBUSxVQUFVLEVBQUUsQ0FBQztRQUNwQjtZQUNDLFVBQVUsR0FBRyxVQUFVLENBQUMsU0FBUyxDQUNoQyx1RUFBdUUsQ0FDdkUsQ0FBQyxNQUFNLENBQUE7WUFDUixNQUFLO1FBQ047WUFDQyxNQUFNLElBQUksS0FBSyxDQUFDLG9CQUFvQixDQUFDLENBQUE7SUFDdkMsQ0FBQztJQUNELE1BQU0sYUFBYSxHQUFHLEVBQUUsQ0FBQyxZQUFZLENBQUMsVUFBVSxFQUFFLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUE7SUFDeEUsTUFBTSxZQUFZLEdBQTJCLEtBQUssQ0FBQyxhQUFhLEVBQUUsRUFBRSxDQUFDLENBQUE7SUFDckUsTUFBTSxjQUFjLEdBQUcsZ0NBQWdDLENBQUMsa0JBQWtCLENBQ3pFLFVBQVUsRUFDVixZQUFZLENBQ1osQ0FBQTtJQUNELE9BQU8sNEJBQTRCLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRSxjQUFjLENBQUMsQ0FBQTtBQUN6RSxDQUFDO0FBT0QsU0FBUywyQkFBMkIsQ0FDbkMsb0JBQThDLEVBQzlDLE1BQWlDLEVBQ2pDLFVBQXNCO0lBRXRCLElBQUksU0FBUyxHQUFHLENBQUMsQ0FBQTtJQUNqQixNQUFNLGVBQWUsR0FBRyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtJQUNsRSxNQUFNLG1CQUFtQixHQUF5QjtRQUNqRCxlQUFlLEVBQUUsR0FBRyxFQUFFLENBQUMsU0FBUztRQUNoQyxRQUFRLEVBQUUsU0FBVTtRQUNwQixlQUFlLEVBQUUsQ0FBQyxJQUFZLEVBQUUsTUFBZSxFQUFFLEtBQWEsRUFBNkIsRUFBRTtZQUM1RixNQUFNLFlBQVksR0FBRyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQTtZQUN4QyxNQUFNLGlCQUFpQixHQUFHLGVBQWUsQ0FBQyxlQUFlLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLENBQUE7WUFDdEYsTUFBTSxNQUFNLEdBQUcsSUFBSSxXQUFXLENBQUMsQ0FBQyxHQUFHLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUN2RCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsWUFBWSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUM5QyxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUE7Z0JBQzFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztvQkFDaEIsQ0FBQyxpQkFBaUIsNENBQW9DLENBQUM7d0JBQ3ZELENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLGlCQUFpQiw0Q0FBb0MsQ0FBQyxDQUFBO1lBQ3pFLENBQUM7WUFDRCxPQUFPLElBQUkseUJBQXlCLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ3BELENBQUM7S0FDRCxDQUFBO0lBQ0QsT0FBTyxvQkFBb0IsQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLG1CQUFtQixDQUFDLENBQUE7QUFDdEUsQ0FBQztBQUVELEtBQUssQ0FBQyw0Q0FBNEMsRUFBRSxHQUFHLEVBQUU7SUFDeEQsTUFBTSxVQUFVLHdDQUF3QixDQUFBO0lBQ3hDLE1BQU0sT0FBTyxHQUFxQyxFQUFFLENBQUE7SUFDcEQsSUFBSSxXQUE0QixDQUFBO0lBQ2hDLElBQUksb0JBQThDLENBQUE7SUFDbEQsSUFBSSw0QkFBMkQsQ0FBQTtJQUUvRCxLQUFLLENBQUMsR0FBRyxFQUFFO1FBQ1YsV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7UUFDbkMsb0JBQW9CLEdBQUcsbUJBQW1CLENBQUMsV0FBVyxDQUFDLENBQUE7UUFDdkQsNEJBQTRCLEdBQUcsb0JBQW9CLENBQUMsR0FBRyxDQUFDLDZCQUE2QixDQUFDLENBQUE7UUFDdEYsV0FBVyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFBO1FBQ3JDLFdBQVcsQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsb0JBQW9CLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQTtRQUNuRSxXQUFXLENBQUMsR0FBRyxDQUFDLDZCQUE2QixDQUFDLG9CQUFvQixFQUFFLFVBQVUsQ0FBQyxDQUFDLENBQUE7SUFDakYsQ0FBQyxDQUFDLENBQUE7SUFFRixRQUFRLENBQUMsR0FBRyxFQUFFO1FBQ2IsV0FBVyxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ3RCLENBQUMsQ0FBQyxDQUFBO0lBRUYsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxrRUFBa0U7SUFDbEUsSUFBSSxDQUFDLElBQUksQ0FBQyxxRUFBcUUsRUFBRSxHQUFHLEVBQUU7UUFDckYsMkhBQTJIO1FBRTNILFNBQVMsd0JBQXdCLENBQUMsU0FBaUIsRUFBRSxVQUFrQjtZQUN0RSxNQUFNLEtBQUssR0FBRyxFQUFFLENBQUMsV0FBVyxDQUFDLFNBQVMsRUFBRSxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1lBQ2hFLE1BQU0sc0JBQXNCLEdBQWEsRUFBRSxDQUFBO1lBQzNDLEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxFQUFFLENBQUM7Z0JBQzFCLElBQUksSUFBSSxDQUFDLFdBQVcsRUFBRSxFQUFFLENBQUM7b0JBQ3hCLHNCQUFzQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQTtnQkFDN0QsQ0FBQztxQkFBTSxDQUFDO29CQUNQLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtvQkFDcEQsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQTtvQkFDaEQsSUFBSSxhQUFhLEtBQUssS0FBSyxFQUFFLENBQUM7d0JBQzdCLFNBQVE7b0JBQ1QsQ0FBQztvQkFDRCxNQUFNLFlBQVksR0FBRyxFQUFFLENBQUMsWUFBWSxDQUFDLFlBQVksRUFBRSxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFBO29CQUN6RSxNQUFNLFlBQVksR0FBcUM7d0JBQ3RELE9BQU8sRUFBRSxDQUFDO3dCQUNWLFlBQVksRUFBRSxLQUFLO3FCQUNuQixDQUFBO29CQUNELE1BQU0sS0FBSyxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQzVCLG9CQUFvQixDQUFDLG9CQUFvQixFQUFFLFlBQVksRUFBRSxVQUFVLEVBQUUsWUFBWSxDQUFDLENBQ2xGLENBQUE7b0JBQ0QsTUFBTSxTQUFTLEdBQUcsS0FBSyxDQUFDLFlBQVksRUFBRSxDQUFBO29CQUN0QyxNQUFNLGNBQWMsR0FBMkIsRUFBRSxDQUFBO29CQUNqRCxLQUFLLElBQUksSUFBSSxHQUFHLENBQUMsRUFBRSxJQUFJLElBQUksU0FBUyxHQUFHLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxDQUFDO3dCQUNsRDs7Ozs7OzswQkFPRTt3QkFDRixNQUFNLFdBQVcsR0FBRyxLQUFLLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFBO3dCQUM5QyxNQUFNLGtCQUFrQixHQUFHLFdBQVcsQ0FBQyxJQUFJLEVBQUUsQ0FBQTt3QkFDN0MsSUFBSSxrQkFBa0IsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7NEJBQ3JDLFNBQVE7d0JBQ1QsQ0FBQzt3QkFDRCxNQUFNLGFBQWEsR0FBRyx5QkFBeUIsQ0FDOUMsS0FBSyxFQUNMLDRCQUE0QixFQUM1QixJQUFJLEVBQ0osSUFBSSxHQUFHLENBQUMsQ0FDUixDQUFBO3dCQUNEOzs7MEJBR0U7d0JBQ0YsY0FBYyxDQUFDLElBQUksQ0FBQyxHQUFHLGFBQWEsQ0FBQyxDQUFBO29CQUN0QyxDQUFDO29CQUNELEtBQUssQ0FBQyxVQUFVLENBQUMsY0FBYyxDQUFDLENBQUE7b0JBQ2hDLEtBQUssQ0FBQyxVQUFVLENBQUMsc0JBQXNCLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFBO29CQUN6RCxFQUFFLENBQUMsYUFBYSxDQUFDLFlBQVksRUFBRSxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQTtnQkFDakQsQ0FBQztZQUNGLENBQUM7WUFDRCxLQUFLLE1BQU0sU0FBUyxJQUFJLHNCQUFzQixFQUFFLENBQUM7Z0JBQ2hELHdCQUF3QixDQUFDLFNBQVMsRUFBRSxVQUFVLENBQUMsQ0FBQTtZQUNoRCxDQUFDO1FBQ0YsQ0FBQztRQUVELHdCQUF3QixDQUFDLHVDQUF1QyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQzVFLE1BQU0sTUFBTSxHQUFHLFFBQVEsQ0FBQyxrRUFBa0UsRUFBRTtZQUMzRixRQUFRLEVBQUUsT0FBTztTQUNqQixDQUFDLENBQUE7UUFDRixPQUFPLENBQUMsR0FBRyxDQUFDLDJCQUEyQixFQUFFLE1BQU0sQ0FBQyxDQUFBO0lBQ2pELENBQUMsQ0FBQyxDQUFBO0lBRUYsMERBQTBEO0lBRTFEOzs7Ozs7Ozs7Ozs7Ozs7O09BZ0JHO0lBRUgsSUFBSSxDQUFDLGNBQWMsRUFBRSxHQUFHLEVBQUU7UUFDekIsMERBQTBEO1FBQzFELDJGQUEyRjtRQUMzRiw4REFBOEQ7UUFFOUQsNkRBQTZEO1FBRTdELE1BQU0sWUFBWSxHQUFHLENBQUMsa0JBQWtCLEVBQUUsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQzVELE1BQU0sTUFBTSxHQUE4QjtZQUN6QztnQkFDQyxFQUFFLFVBQVUsRUFBRSxDQUFDLEVBQUUsaUJBQWlCLGlDQUF5QixFQUFFO2dCQUM3RCxFQUFFLFVBQVUsRUFBRSxDQUFDLEVBQUUsaUJBQWlCLGlDQUF5QixFQUFFO2dCQUM3RCxFQUFFLFVBQVUsRUFBRSxDQUFDLEVBQUUsaUJBQWlCLGlDQUF5QixFQUFFO2dCQUM3RCxFQUFFLFVBQVUsRUFBRSxDQUFDLEVBQUUsaUJBQWlCLGlDQUF5QixFQUFFO2dCQUM3RCxFQUFFLFVBQVUsRUFBRSxFQUFFLEVBQUUsaUJBQWlCLGlDQUF5QixFQUFFO2dCQUM5RCxFQUFFLFVBQVUsRUFBRSxFQUFFLEVBQUUsaUJBQWlCLGlDQUF5QixFQUFFO2dCQUM5RCxFQUFFLFVBQVUsRUFBRSxFQUFFLEVBQUUsaUJBQWlCLGtDQUEwQixFQUFFO2dCQUMvRCxFQUFFLFVBQVUsRUFBRSxFQUFFLEVBQUUsaUJBQWlCLGtDQUEwQixFQUFFO2dCQUMvRCxFQUFFLFVBQVUsRUFBRSxFQUFFLEVBQUUsaUJBQWlCLGtDQUEwQixFQUFFO2dCQUMvRCxFQUFFLFVBQVUsRUFBRSxFQUFFLEVBQUUsaUJBQWlCLGlDQUF5QixFQUFFO2dCQUM5RCxFQUFFLFVBQVUsRUFBRSxFQUFFLEVBQUUsaUJBQWlCLGlDQUF5QixFQUFFO2FBQzlEO1lBQ0Q7Z0JBQ0MsRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUFFLGlCQUFpQixpQ0FBeUIsRUFBRTtnQkFDN0QsRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUFFLGlCQUFpQixpQ0FBeUIsRUFBRTthQUM3RDtTQUNELENBQUE7UUFDRCxXQUFXLENBQUMsR0FBRyxDQUFDLDJCQUEyQixDQUFDLG9CQUFvQixFQUFFLE1BQU0sRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFBO1FBQ3RGLE1BQU0sS0FBSyxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQzVCLG9CQUFvQixDQUFDLG9CQUFvQixFQUFFLFlBQVksRUFBRSxVQUFVLEVBQUUsT0FBTyxDQUFDLENBQzdFLENBQUE7UUFDRCwrQkFBK0IsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzVDLE1BQU0sY0FBYyxHQUFHLHlCQUF5QixDQUMvQyxLQUFLLEVBQ0wsNEJBQTRCLEVBQzVCLENBQUMsRUFDRCxLQUFLLENBQUMsWUFBWSxFQUFFLENBQ3BCLENBQUE7UUFDRCxNQUFNLENBQUMsZUFBZSxDQUFDLGNBQWMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDaEQsTUFBTSxTQUFTLEdBQUcsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ25DLE1BQU0sQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsRUFBRTtZQUNsRCxlQUFlLEVBQUUsQ0FBQztZQUNsQixXQUFXLEVBQUUsQ0FBQztZQUNkLGFBQWEsRUFBRSxDQUFDO1lBQ2hCLFNBQVMsRUFBRSxDQUFDO1NBQ1osQ0FBQyxDQUFBO1FBQ0YsTUFBTSxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFBO0lBQzNDLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHFCQUFxQixFQUFFLEdBQUcsRUFBRTtRQUNoQyxXQUFXO1FBQ1gsMkZBQTJGO1FBQzNGLGVBQWU7UUFDZixxQ0FBcUM7UUFDckMscUNBQXFDO1FBRXJDLDRFQUE0RTtRQUM1RSx1RkFBdUY7UUFFdkYsSUFBSSxZQUFZLEdBQUcsQ0FBQyxlQUFlLEVBQUUsaUJBQWlCLEVBQUUsU0FBUyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQzdFLElBQUksS0FBSyxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQzFCLG9CQUFvQixDQUFDLG9CQUFvQixFQUFFLFlBQVksRUFBRSxVQUFVLEVBQUUsT0FBTyxDQUFDLENBQzdFLENBQUE7UUFDRCxJQUFJLGNBQWMsR0FBRyx5QkFBeUIsQ0FDN0MsS0FBSyxFQUNMLDRCQUE0QixFQUM1QixDQUFDLEVBQ0QsS0FBSyxDQUFDLFlBQVksRUFBRSxDQUNwQixDQUFBO1FBQ0QsTUFBTSxDQUFDLGVBQWUsQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2hELElBQUksU0FBUyxHQUFHLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNqQyxNQUFNLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLEVBQUU7WUFDbEQsZUFBZSxFQUFFLENBQUM7WUFDbEIsV0FBVyxFQUFFLENBQUM7WUFDZCxhQUFhLEVBQUUsQ0FBQztZQUNoQixTQUFTLEVBQUUsQ0FBQztTQUNaLENBQUMsQ0FBQTtRQUNGLE1BQU0sQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUUxQyxZQUFZLEdBQUcsQ0FBQyxlQUFlLEVBQUUsYUFBYSxFQUFFLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNqRSxLQUFLLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FDdEIsb0JBQW9CLENBQUMsb0JBQW9CLEVBQUUsWUFBWSxFQUFFLFVBQVUsRUFBRSxPQUFPLENBQUMsQ0FDN0UsQ0FBQTtRQUNELGNBQWMsR0FBRyx5QkFBeUIsQ0FDekMsS0FBSyxFQUNMLDRCQUE0QixFQUM1QixDQUFDLEVBQ0QsS0FBSyxDQUFDLFlBQVksRUFBRSxDQUNwQixDQUFBO1FBQ0QsTUFBTSxDQUFDLGVBQWUsQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2hELFNBQVMsR0FBRyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDN0IsTUFBTSxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxFQUFFO1lBQ2xELGVBQWUsRUFBRSxDQUFDO1lBQ2xCLFdBQVcsRUFBRSxDQUFDO1lBQ2QsYUFBYSxFQUFFLENBQUM7WUFDaEIsU0FBUyxFQUFFLENBQUM7U0FDWixDQUFDLENBQUE7UUFDRixNQUFNLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUE7SUFDL0MsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsY0FBYyxFQUFFLEdBQUcsRUFBRTtRQUN6QiwwREFBMEQ7UUFDMUQsMkZBQTJGO1FBQzNGLHdJQUF3STtRQUV4SSxzSkFBc0o7UUFDdEosNElBQTRJO1FBQzVJLGdFQUFnRTtRQUVoRSxNQUFNLFlBQVksR0FBRyxDQUFDLGNBQWMsRUFBRSxPQUFPLEVBQUUsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQzlELE1BQU0sS0FBSyxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQzVCLG9CQUFvQixDQUFDLG9CQUFvQixFQUFFLFlBQVksRUFBRSxVQUFVLEVBQUUsT0FBTyxDQUFDLENBQzdFLENBQUE7UUFDRCxNQUFNLGNBQWMsR0FBRyx5QkFBeUIsQ0FDL0MsS0FBSyxFQUNMLDRCQUE0QixFQUM1QixDQUFDLEVBQ0QsS0FBSyxDQUFDLFlBQVksRUFBRSxDQUNwQixDQUFBO1FBQ0QsTUFBTSxDQUFDLGVBQWUsQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2hELE1BQU0sU0FBUyxHQUFHLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNuQyxNQUFNLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLEVBQUU7WUFDbEQsZUFBZSxFQUFFLENBQUM7WUFDbEIsV0FBVyxFQUFFLENBQUM7WUFDZCxhQUFhLEVBQUUsQ0FBQztZQUNoQixTQUFTLEVBQUUsQ0FBQztTQUNaLENBQUMsQ0FBQTtRQUNGLE1BQU0sQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQTtJQUMvQyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxlQUFlLEVBQUUsR0FBRyxFQUFFO1FBQzFCLDJEQUEyRDtRQUMzRCw2REFBNkQ7UUFDN0QsbUhBQW1IO1FBRW5ILDJLQUEySztRQUMzSyx5REFBeUQ7UUFFekQsTUFBTSxZQUFZLEdBQUcsQ0FBQyxnQkFBZ0IsRUFBRSxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDekQsTUFBTSxNQUFNLEdBQThCO1lBQ3pDO2dCQUNDLEVBQUUsVUFBVSxFQUFFLENBQUMsRUFBRSxpQkFBaUIsaUNBQXlCLEVBQUU7Z0JBQzdELEVBQUUsVUFBVSxFQUFFLENBQUMsRUFBRSxpQkFBaUIsaUNBQXlCLEVBQUU7Z0JBQzdELEVBQUUsVUFBVSxFQUFFLENBQUMsRUFBRSxpQkFBaUIsaUNBQXlCLEVBQUU7Z0JBQzdELEVBQUUsVUFBVSxFQUFFLENBQUMsRUFBRSxpQkFBaUIsaUNBQXlCLEVBQUU7Z0JBQzdELEVBQUUsVUFBVSxFQUFFLENBQUMsRUFBRSxpQkFBaUIsaUNBQXlCLEVBQUU7Z0JBQzdELEVBQUUsVUFBVSxFQUFFLENBQUMsRUFBRSxpQkFBaUIsaUNBQXlCLEVBQUU7Z0JBQzdELEVBQUUsVUFBVSxFQUFFLEVBQUUsRUFBRSxpQkFBaUIsaUNBQXlCLEVBQUU7Z0JBQzlELEVBQUUsVUFBVSxFQUFFLEVBQUUsRUFBRSxpQkFBaUIsaUNBQXlCLEVBQUU7Z0JBQzlELEVBQUUsVUFBVSxFQUFFLEVBQUUsRUFBRSxpQkFBaUIsaUNBQXlCLEVBQUU7Z0JBQzlELEVBQUUsVUFBVSxFQUFFLEVBQUUsRUFBRSxpQkFBaUIsaUNBQXlCLEVBQUU7Z0JBQzlELEVBQUUsVUFBVSxFQUFFLEVBQUUsRUFBRSxpQkFBaUIsaUNBQXlCLEVBQUU7YUFDOUQ7WUFDRDtnQkFDQyxFQUFFLFVBQVUsRUFBRSxDQUFDLEVBQUUsaUJBQWlCLGlDQUF5QixFQUFFO2dCQUM3RCxFQUFFLFVBQVUsRUFBRSxDQUFDLEVBQUUsaUJBQWlCLGlDQUF5QixFQUFFO2FBQzdEO1NBQ0QsQ0FBQTtRQUNELFdBQVcsQ0FBQyxHQUFHLENBQUMsMkJBQTJCLENBQUMsb0JBQW9CLEVBQUUsTUFBTSxFQUFFLFVBQVUsQ0FBQyxDQUFDLENBQUE7UUFDdEYsTUFBTSxLQUFLLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FDNUIsb0JBQW9CLENBQUMsb0JBQW9CLEVBQUUsWUFBWSxFQUFFLFVBQVUsRUFBRSxPQUFPLENBQUMsQ0FDN0UsQ0FBQTtRQUNELCtCQUErQixDQUFDLEtBQUssRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDNUMsTUFBTSxjQUFjLEdBQUcseUJBQXlCLENBQy9DLEtBQUssRUFDTCw0QkFBNEIsRUFDNUIsQ0FBQyxFQUNELEtBQUssQ0FBQyxZQUFZLEVBQUUsQ0FDcEIsQ0FBQTtRQUNELE1BQU0sQ0FBQyxlQUFlLENBQUMsY0FBYyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNoRCxNQUFNLFNBQVMsR0FBRyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDbkMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxFQUFFO1lBQ2xELGVBQWUsRUFBRSxDQUFDO1lBQ2xCLFdBQVcsRUFBRSxDQUFDO1lBQ2QsYUFBYSxFQUFFLENBQUM7WUFDaEIsU0FBUyxFQUFFLENBQUM7U0FDWixDQUFDLENBQUE7UUFDRixNQUFNLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUE7SUFDM0MsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsY0FBYyxFQUFFLEdBQUcsRUFBRTtRQUN6QiwwREFBMEQ7UUFDMUQsMkZBQTJGO1FBRTNGLDZGQUE2RjtRQUM3RixrRUFBa0U7UUFFbEUsd0lBQXdJO1FBQ3hJLGlJQUFpSTtRQUNqSSw0SUFBNEk7UUFFNUksTUFBTSxZQUFZLEdBQUcsQ0FBQyxrQkFBa0IsRUFBRSxpQkFBaUIsRUFBRSxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDN0UsTUFBTSxLQUFLLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FDNUIsb0JBQW9CLENBQUMsb0JBQW9CLEVBQUUsWUFBWSxFQUFFLFVBQVUsRUFBRSxPQUFPLENBQUMsQ0FDN0UsQ0FBQTtRQUNELE1BQU0sY0FBYyxHQUFHLHlCQUF5QixDQUMvQyxLQUFLLEVBQ0wsNEJBQTRCLEVBQzVCLENBQUMsRUFDRCxLQUFLLENBQUMsWUFBWSxFQUFFLENBQ3BCLENBQUE7UUFDRCxNQUFNLENBQUMsZUFBZSxDQUFDLGNBQWMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDakQsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsc0VBQXNFLEVBQUUsR0FBRyxFQUFFO1FBQ2pGLDJEQUEyRDtRQUUzRCxNQUFNLE1BQU0sR0FBOEI7WUFDekM7Z0JBQ0MsRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUFFLGlCQUFpQixpQ0FBeUIsRUFBRTtnQkFDN0QsRUFBRSxVQUFVLEVBQUUsRUFBRSxFQUFFLGlCQUFpQixrQ0FBMEIsRUFBRTthQUMvRDtZQUNELENBQUMsRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUFFLGlCQUFpQixrQ0FBMEIsRUFBRSxDQUFDO1lBQ2hFLENBQUMsRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUFFLGlCQUFpQixrQ0FBMEIsRUFBRSxDQUFDO1lBQ2hFLENBQUMsRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUFFLGlCQUFpQixrQ0FBMEIsRUFBRSxDQUFDO1NBQ2hFLENBQUE7UUFDRCxXQUFXLENBQUMsR0FBRyxDQUFDLDJCQUEyQixDQUFDLG9CQUFvQixFQUFFLE1BQU0sRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFBO1FBQ3RGLE1BQU0sWUFBWSxHQUFHO1lBQ3BCLHdCQUF3QjtZQUN4Qiw2QkFBNkI7WUFDN0IseUJBQXlCO1lBQ3pCLHdCQUF3QjtTQUN4QixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNaLE1BQU0sS0FBSyxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQzVCLG9CQUFvQixDQUFDLG9CQUFvQixFQUFFLFlBQVksRUFBRSxVQUFVLEVBQUUsT0FBTyxDQUFDLENBQzdFLENBQUE7UUFDRCwrQkFBK0IsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzVDLE1BQU0sY0FBYyxHQUFHLHlCQUF5QixDQUMvQyxLQUFLLEVBQ0wsNEJBQTRCLEVBQzVCLENBQUMsRUFDRCxLQUFLLENBQUMsWUFBWSxFQUFFLENBQ3BCLENBQUE7UUFDRCxNQUFNLENBQUMsZUFBZSxDQUFDLGNBQWMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDakQsQ0FBQyxDQUFDLENBQUE7SUFFRixxREFBcUQ7SUFFckQsSUFBSSxDQUFDLElBQUksQ0FBQyw0Q0FBNEMsRUFBRSxHQUFHLEVBQUU7UUFDNUQsNkhBQTZIO1FBQzdILDZHQUE2RztRQUU3RyxNQUFNLFlBQVksR0FBRztZQUNwQixlQUFlO1lBQ2YsYUFBYTtZQUNiLHVCQUF1QjtZQUN2QixPQUFPO1lBQ1AsR0FBRztTQUNILENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ1osTUFBTSxLQUFLLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FDNUIsb0JBQW9CLENBQUMsb0JBQW9CLEVBQUUsWUFBWSxFQUFFLFVBQVUsRUFBRSxPQUFPLENBQUMsQ0FDN0UsQ0FBQTtRQUNELE1BQU0sY0FBYyxHQUFHLHlCQUF5QixDQUMvQyxLQUFLLEVBQ0wsNEJBQTRCLEVBQzVCLENBQUMsRUFDRCxLQUFLLENBQUMsWUFBWSxFQUFFLENBQ3BCLENBQUE7UUFDRCxNQUFNLENBQUMsZUFBZSxDQUFDLGNBQWMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDakQsQ0FBQyxDQUFDLENBQUE7SUFFRiwrQkFBK0I7SUFFL0IsSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsR0FBRyxFQUFFO1FBQzlCLDBEQUEwRDtRQUMxRCw2SEFBNkg7UUFDN0gsNkdBQTZHO1FBRTdHLElBQUksWUFBWSxHQUFHLENBQUMsa0JBQWtCLEVBQUUsdUJBQXVCLEVBQUUsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ2hGLElBQUksS0FBSyxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQzFCLG9CQUFvQixDQUFDLG9CQUFvQixFQUFFLFlBQVksRUFBRSxVQUFVLEVBQUUsT0FBTyxDQUFDLENBQzdFLENBQUE7UUFDRCxJQUFJLGNBQWMsR0FBRyx5QkFBeUIsQ0FDN0MsS0FBSyxFQUNMLDRCQUE0QixFQUM1QixDQUFDLEVBQ0QsS0FBSyxDQUFDLFlBQVksRUFBRSxDQUNwQixDQUFBO1FBQ0QsTUFBTSxDQUFDLGVBQWUsQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRWhELFlBQVksR0FBRyxDQUFDLGtCQUFrQixFQUFFLHdCQUF3QixFQUFFLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUM3RSxLQUFLLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FDdEIsb0JBQW9CLENBQUMsb0JBQW9CLEVBQUUsWUFBWSxFQUFFLFVBQVUsRUFBRSxPQUFPLENBQUMsQ0FDN0UsQ0FBQTtRQUNELGNBQWMsR0FBRyx5QkFBeUIsQ0FDekMsS0FBSyxFQUNMLDRCQUE0QixFQUM1QixDQUFDLEVBQ0QsS0FBSyxDQUFDLFlBQVksRUFBRSxDQUNwQixDQUFBO1FBQ0QsTUFBTSxDQUFDLGVBQWUsQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQ2pELENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsR0FBRyxFQUFFO1FBQy9CLDJEQUEyRDtRQUMzRCw0REFBNEQ7UUFDNUQscUlBQXFJO1FBRXJJLHdEQUF3RDtRQUV4RCxNQUFNLFlBQVksR0FBRyxDQUFDLHFCQUFxQixFQUFFLFNBQVMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNsRSxNQUFNLEtBQUssR0FBRyxXQUFXLENBQUMsR0FBRyxDQUM1QixvQkFBb0IsQ0FBQyxvQkFBb0IsRUFBRSxZQUFZLEVBQUUsVUFBVSxFQUFFLE9BQU8sQ0FBQyxDQUM3RSxDQUFBO1FBQ0QsTUFBTSxjQUFjLEdBQUcseUJBQXlCLENBQy9DLEtBQUssRUFDTCw0QkFBNEIsRUFDNUIsQ0FBQyxFQUNELEtBQUssQ0FBQyxZQUFZLEVBQUUsQ0FDcEIsQ0FBQTtRQUNELE1BQU0sQ0FBQyxlQUFlLENBQUMsY0FBYyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUNqRCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxJQUFJLENBQUMsZUFBZSxFQUFFLEdBQUcsRUFBRTtRQUMvQiwyREFBMkQ7UUFDM0QsaURBQWlEO1FBRWpELE1BQU0sWUFBWSxHQUFHLENBQUMsSUFBSSxFQUFFLHVCQUF1QixFQUFFLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUN0RSxNQUFNLEtBQUssR0FBRyxXQUFXLENBQUMsR0FBRyxDQUM1QixvQkFBb0IsQ0FBQyxvQkFBb0IsRUFBRSxZQUFZLEVBQUUsVUFBVSxFQUFFLE9BQU8sQ0FBQyxDQUM3RSxDQUFBO1FBQ0QsTUFBTSxjQUFjLEdBQUcseUJBQXlCLENBQy9DLEtBQUssRUFDTCw0QkFBNEIsRUFDNUIsQ0FBQyxFQUNELEtBQUssQ0FBQyxZQUFZLEVBQUUsQ0FDcEIsQ0FBQTtRQUNELE1BQU0sQ0FBQyxlQUFlLENBQUMsY0FBYyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUNqRCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxJQUFJLENBQUMsd0ZBQXdGLEVBQUUsR0FBRyxFQUFFO1FBQ3hHLDBEQUEwRDtRQUUxRCxNQUFNLFlBQVksR0FBRztZQUNwQiw4REFBOEQ7WUFDOUQsMkJBQTJCO1lBQzNCLDhCQUE4QjtZQUM5QixZQUFZO1lBQ1osR0FBRztTQUNILENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ1osTUFBTSxLQUFLLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FDNUIsb0JBQW9CLENBQUMsb0JBQW9CLEVBQUUsWUFBWSxFQUFFLFVBQVUsRUFBRSxPQUFPLENBQUMsQ0FDN0UsQ0FBQTtRQUNELE1BQU0sY0FBYyxHQUFHLHlCQUF5QixDQUMvQyxLQUFLLEVBQ0wsNEJBQTRCLEVBQzVCLENBQUMsRUFDRCxLQUFLLENBQUMsWUFBWSxFQUFFLENBQ3BCLENBQUE7UUFDRCxNQUFNLENBQUMsZUFBZSxDQUFDLGNBQWMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDakQsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDLENBQUMsQ0FBQSJ9