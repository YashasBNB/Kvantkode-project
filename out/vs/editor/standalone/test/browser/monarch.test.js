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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9uYXJjaC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3N0YW5kYWxvbmUvdGVzdC9icm93c2VyL21vbmFyY2gudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9GLE9BQU8sRUFBRSxLQUFLLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUUxRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDN0UsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDcEYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBR3ZFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUV2RSxLQUFLLENBQUMsU0FBUyxFQUFFLEdBQUcsRUFBRTtJQUNyQix1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLFNBQVMsc0JBQXNCLENBQzlCLGVBQWlDLEVBQ2pDLFVBQWtCLEVBQ2xCLFFBQTBCLEVBQzFCLG9CQUEyQztRQUUzQyxPQUFPLElBQUksZ0JBQWdCLENBQzFCLGVBQWUsRUFDZixJQUFLLEVBQ0wsVUFBVSxFQUNWLE9BQU8sQ0FBQyxVQUFVLEVBQUUsUUFBUSxDQUFDLEVBQzdCLG9CQUFvQixDQUNwQixDQUFBO0lBQ0YsQ0FBQztJQUVELFNBQVMsU0FBUyxDQUFDLFNBQTJCLEVBQUUsS0FBZTtRQUM5RCxNQUFNLFlBQVksR0FBYyxF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