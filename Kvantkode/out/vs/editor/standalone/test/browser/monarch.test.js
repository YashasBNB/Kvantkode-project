/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { Token, TokenizationRegistry } from '../../../common/languages.js';
import { LanguageService } from '../../../common/services/languageService.js';
import { StandaloneConfigurationService } from '../../browser/standaloneServices.js';
import { compile } from '../../common/monarch/monarchCompile.js';
import { MonarchTokenizer } from '../../common/monarch/monarchLexer.js';
import { NullLogService } from '../../../../platform/log/common/log.js';
suite('Monarch', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    function createMonarchTokenizer(languageService, languageId, language, configurationService) {
        return new MonarchTokenizer(languageService, null, languageId, compile(languageId, language), configurationService);
    }
    function getTokens(tokenizer, lines) {
        const actualTokens = [];
        let state = tokenizer.getInitialState();
        for (const line of lines) {
            const result = tokenizer.tokenize(line, true, state);
            actualTokens.push(result.tokens);
            state = result.endState;
        }
        return actualTokens;
    }
    test('Ensure @rematch and nextEmbedded can be used together in Monarch grammar', () => {
        const disposables = new DisposableStore();
        const languageService = disposables.add(new LanguageService());
        const configurationService = new StandaloneConfigurationService(new NullLogService());
        disposables.add(languageService.registerLanguage({ id: 'sql' }));
        disposables.add(TokenizationRegistry.register('sql', disposables.add(createMonarchTokenizer(languageService, 'sql', {
            tokenizer: {
                root: [[/./, 'token']],
            },
        }, configurationService))));
        const SQL_QUERY_START = '(SELECT|INSERT|UPDATE|DELETE|CREATE|REPLACE|ALTER|WITH)';
        const tokenizer = disposables.add(createMonarchTokenizer(languageService, 'test1', {
            tokenizer: {
                root: [
                    [
                        `(\"\"\")${SQL_QUERY_START}`,
                        [
                            { token: 'string.quote' },
                            { token: '@rematch', next: '@endStringWithSQL', nextEmbedded: 'sql' },
                        ],
                    ],
                    [/(""")$/, [{ token: 'string.quote', next: '@maybeStringIsSQL' }]],
                ],
                maybeStringIsSQL: [
                    [
                        /(.*)/,
                        {
                            cases: {
                                [`${SQL_QUERY_START}\\b.*`]: {
                                    token: '@rematch',
                                    next: '@endStringWithSQL',
                                    nextEmbedded: 'sql',
                                },
                                '@default': { token: '@rematch', switchTo: '@endDblDocString' },
                            },
                        },
                    ],
                ],
                endDblDocString: [
                    ["[^']+", 'string'],
                    ["\\\\'", 'string'],
                    ["'''", 'string', '@popall'],
                    ["'", 'string'],
                ],
                endStringWithSQL: [
                    [/"""/, { token: 'string.quote', next: '@popall', nextEmbedded: '@pop' }],
                ],
            },
        }, configurationService));
        const lines = [
            `mysql_query("""SELECT * FROM table_name WHERE ds = '<DATEID>'""")`,
            `mysql_query("""`,
            `SELECT *`,
            `FROM table_name`,
            `WHERE ds = '<DATEID>'`,
            `""")`,
        ];
        const actualTokens = getTokens(tokenizer, lines);
        assert.deepStrictEqual(actualTokens, [
            [
                new Token(0, 'source.test1', 'test1'),
                new Token(12, 'string.quote.test1', 'test1'),
                new Token(15, 'token.sql', 'sql'),
                new Token(61, 'string.quote.test1', 'test1'),
                new Token(64, 'source.test1', 'test1'),
            ],
            [new Token(0, 'source.test1', 'test1'), new Token(12, 'string.quote.test1', 'test1')],
            [new Token(0, 'token.sql', 'sql')],
            [new Token(0, 'token.sql', 'sql')],
            [new Token(0, 'token.sql', 'sql')],
            [new Token(0, 'string.quote.test1', 'test1'), new Token(3, 'source.test1', 'test1')],
        ]);
        disposables.dispose();
    });
    test('microsoft/monaco-editor#1235: Empty Line Handling', () => {
        const disposables = new DisposableStore();
        const configurationService = new StandaloneConfigurationService(new NullLogService());
        const languageService = disposables.add(new LanguageService());
        const tokenizer = disposables.add(createMonarchTokenizer(languageService, 'test', {
            tokenizer: {
                root: [{ include: '@comments' }],
                comments: [
                    [/\/\/$/, 'comment'], // empty single-line comment
                    [/\/\//, 'comment', '@comment_cpp'],
                ],
                comment_cpp: [
                    [/(?:[^\\]|(?:\\.))+$/, 'comment', '@pop'],
                    [/.+$/, 'comment'],
                    [/$/, 'comment', '@pop'],
                    // No possible rule to detect an empty line and @pop?
                ],
            },
        }, configurationService));
        const lines = [
            `// This comment \\`,
            `   continues on the following line`,
            ``,
            `// This comment does NOT continue \\\\`,
            `   because the escape char was itself escaped`,
            ``,
            `// This comment DOES continue because \\\\\\`,
            `   the 1st '\\' escapes the 2nd; the 3rd escapes EOL`,
            ``,
            `// This comment continues to the following line \\`,
            ``,
            `But the line was empty. This line should not be commented.`,
        ];
        const actualTokens = getTokens(tokenizer, lines);
        assert.deepStrictEqual(actualTokens, [
            [new Token(0, 'comment.test', 'test')],
            [new Token(0, 'comment.test', 'test')],
            [],
            [new Token(0, 'comment.test', 'test')],
            [new Token(0, 'source.test', 'test')],
            [],
            [new Token(0, 'comment.test', 'test')],
            [new Token(0, 'comment.test', 'test')],
            [],
            [new Token(0, 'comment.test', 'test')],
            [],
            [new Token(0, 'source.test', 'test')],
        ]);
        disposables.dispose();
    });
    test('microsoft/monaco-editor#2265: Exit a state at end of line', () => {
        const disposables = new DisposableStore();
        const configurationService = new StandaloneConfigurationService(new NullLogService());
        const languageService = disposables.add(new LanguageService());
        const tokenizer = disposables.add(createMonarchTokenizer(languageService, 'test', {
            includeLF: true,
            tokenizer: {
                root: [
                    [/^\*/, '', '@inner'],
                    [/\:\*/, '', '@inner'],
                    [/[^*:]+/, 'string'],
                    [/[*:]/, 'string'],
                ],
                inner: [
                    [/\n/, '', '@pop'],
                    [/\d+/, 'number'],
                    [/[^\d]+/, ''],
                ],
            },
        }, configurationService));
        const lines = [`PRINT 10 * 20`, `*FX200, 3`, `PRINT 2*3:*FX200, 3`];
        const actualTokens = getTokens(tokenizer, lines);
        assert.deepStrictEqual(actualTokens, [
            [new Token(0, 'string.test', 'test')],
            [
                new Token(0, '', 'test'),
                new Token(3, 'number.test', 'test'),
                new Token(6, '', 'test'),
                new Token(8, 'number.test', 'test'),
            ],
            [
                new Token(0, 'string.test', 'test'),
                new Token(9, '', 'test'),
                new Token(13, 'number.test', 'test'),
                new Token(16, '', 'test'),
                new Token(18, 'number.test', 'test'),
            ],
        ]);
        disposables.dispose();
    });
    test('issue #115662: monarchCompile function need an extra option which can control replacement', () => {
        const disposables = new DisposableStore();
        const configurationService = new StandaloneConfigurationService(new NullLogService());
        const languageService = disposables.add(new LanguageService());
        const tokenizer1 = disposables.add(createMonarchTokenizer(languageService, 'test', {
            ignoreCase: false,
            uselessReplaceKey1: '@uselessReplaceKey2',
            uselessReplaceKey2: '@uselessReplaceKey3',
            uselessReplaceKey3: '@uselessReplaceKey4',
            uselessReplaceKey4: '@uselessReplaceKey5',
            uselessReplaceKey5: '@ham',
            tokenizer: {
                root: [
                    {
                        regex: /@\w+/.test('@ham')
                            ? new RegExp(`^${'@uselessReplaceKey1'}$`)
                            : new RegExp(`^${'@ham'}$`),
                        action: { token: 'ham' },
                    },
                ],
            },
        }, configurationService));
        const tokenizer2 = disposables.add(createMonarchTokenizer(languageService, 'test', {
            ignoreCase: false,
            tokenizer: {
                root: [
                    {
                        regex: /@@ham/,
                        action: { token: 'ham' },
                    },
                ],
            },
        }, configurationService));
        const lines = [`@ham`];
        const actualTokens1 = getTokens(tokenizer1, lines);
        assert.deepStrictEqual(actualTokens1, [[new Token(0, 'ham.test', 'test')]]);
        const actualTokens2 = getTokens(tokenizer2, lines);
        assert.deepStrictEqual(actualTokens2, [[new Token(0, 'ham.test', 'test')]]);
        disposables.dispose();
    });
    test('microsoft/monaco-editor#2424: Allow to target @@', () => {
        const disposables = new DisposableStore();
        const configurationService = new StandaloneConfigurationService(new NullLogService());
        const languageService = disposables.add(new LanguageService());
        const tokenizer = disposables.add(createMonarchTokenizer(languageService, 'test', {
            ignoreCase: false,
            tokenizer: {
                root: [
                    {
                        regex: /@@@@/,
                        action: { token: 'ham' },
                    },
                ],
            },
        }, configurationService));
        const lines = [`@@`];
        const actualTokens = getTokens(tokenizer, lines);
        assert.deepStrictEqual(actualTokens, [[new Token(0, 'ham.test', 'test')]]);
        disposables.dispose();
    });
    test('microsoft/monaco-editor#3025: Check maxTokenizationLineLength before tokenizing', async () => {
        const disposables = new DisposableStore();
        const configurationService = new StandaloneConfigurationService(new NullLogService());
        const languageService = disposables.add(new LanguageService());
        // Set maxTokenizationLineLength to 4 so that "ham" works but "hamham" would fail
        await configurationService.updateValue('editor.maxTokenizationLineLength', 4);
        const tokenizer = disposables.add(createMonarchTokenizer(languageService, 'test', {
            tokenizer: {
                root: [
                    {
                        regex: /ham/,
                        action: { token: 'ham' },
                    },
                ],
            },
        }, configurationService));
        const lines = [
            'ham', // length 3, should be tokenized
            'hamham', // length 6, should NOT be tokenized
        ];
        const actualTokens = getTokens(tokenizer, lines);
        assert.deepStrictEqual(actualTokens, [
            [new Token(0, 'ham.test', 'test')],
            [new Token(0, '', 'test')],
        ]);
        disposables.dispose();
    });
    test('microsoft/monaco-editor#3128: allow state access within rules', () => {
        const disposables = new DisposableStore();
        const configurationService = new StandaloneConfigurationService(new NullLogService());
        const languageService = disposables.add(new LanguageService());
        const tokenizer = disposables.add(createMonarchTokenizer(languageService, 'test', {
            ignoreCase: false,
            encoding: /u|u8|U|L/,
            tokenizer: {
                root: [
                    // C++ 11 Raw String
                    [/@encoding?R\"(?:([^ ()\\\t]*))\(/, { token: 'string.raw.begin', next: '@raw.$1' }],
                ],
                raw: [
                    [/.*\)$S2\"/, 'string.raw', '@pop'],
                    [/.*/, 'string.raw'],
                ],
            },
        }, configurationService));
        const lines = [
            `int main(){`,
            ``,
            `	auto s = R""""(`,
            `	Hello World`,
            `	)"""";`,
            ``,
            `	std::cout << "hello";`,
            ``,
            `}`,
        ];
        const actualTokens = getTokens(tokenizer, lines);
        assert.deepStrictEqual(actualTokens, [
            [new Token(0, 'source.test', 'test')],
            [],
            [new Token(0, 'source.test', 'test'), new Token(10, 'string.raw.begin.test', 'test')],
            [new Token(0, 'string.raw.test', 'test')],
            [new Token(0, 'string.raw.test', 'test'), new Token(6, 'source.test', 'test')],
            [],
            [new Token(0, 'source.test', 'test')],
            [],
            [new Token(0, 'source.test', 'test')],
        ]);
        disposables.dispose();
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9uYXJjaC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3Ivc3RhbmRhbG9uZS90ZXN0L2Jyb3dzZXIvbW9uYXJjaC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDdEUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0YsT0FBTyxFQUFFLEtBQUssRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBRTFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUNwRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDaEUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFHdkUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBRXZFLEtBQUssQ0FBQyxTQUFTLEVBQUUsR0FBRyxFQUFFO0lBQ3JCLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsU0FBUyxzQkFBc0IsQ0FDOUIsZUFBaUMsRUFDakMsVUFBa0IsRUFDbEIsUUFBMEIsRUFDMUIsb0JBQTJDO1FBRTNDLE9BQU8sSUFBSSxnQkFBZ0IsQ0FDMUIsZUFBZSxFQUNmLElBQUssRUFDTCxVQUFVLEVBQ1YsT0FBTyxDQUFDLFVBQVUsRUFBRSxRQUFRLENBQUMsRUFDN0Isb0JBQW9CLENBQ3BCLENBQUE7SUFDRixDQUFDO0lBRUQsU0FBUyxTQUFTLENBQUMsU0FBMkIsRUFBRSxLQUFl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