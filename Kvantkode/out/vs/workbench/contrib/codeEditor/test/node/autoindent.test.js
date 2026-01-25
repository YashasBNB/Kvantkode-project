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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0b2luZGVudC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jb2RlRWRpdG9yL3Rlc3Qvbm9kZS9hdXRvaW5kZW50LnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEVBQUUsTUFBTSxJQUFJLENBQUE7QUFDeEIsT0FBTyxLQUFLLElBQUksTUFBTSxNQUFNLENBQUE7QUFDNUIsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxlQUFlLEVBQWUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN0RixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSx5RUFBeUUsQ0FBQTtBQUN2SCxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQTtBQUMzRyxPQUFPLEVBRU4sbUJBQW1CLEVBQ25CLG9CQUFvQixHQUNwQixNQUFNLG9EQUFvRCxDQUFBO0FBRTNELE9BQU8sRUFFTixnQ0FBZ0MsR0FDaEMsTUFBTSxxREFBcUQsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFHMUQsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sd0VBQXdFLENBQUE7QUFDL0csT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGVBQWUsQ0FBQTtBQUN4QyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUNyRixPQUFPLEVBQ04seUJBQXlCLEVBR3pCLG9CQUFvQixHQUNwQixNQUFNLDJDQUEyQyxDQUFBO0FBQ2xELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQU1sRixPQUFPLEVBQUUsVUFB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