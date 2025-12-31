/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { withAsyncTestCodeEditor } from '../../../../test/browser/testCodeEditor.js';
import { StickyScrollController } from '../../browser/stickyScrollController.js';
import { ServiceCollection } from '../../../../../platform/instantiation/common/serviceCollection.js';
import { ILanguageFeaturesService } from '../../../../common/services/languageFeatures.js';
import { createTextModel } from '../../../../test/common/testTextModel.js';
import { LanguageFeaturesService } from '../../../../common/services/languageFeaturesService.js';
import { StickyLineCandidate, StickyLineCandidateProvider, } from '../../browser/stickyScrollProvider.js';
import { ILogService, NullLogService } from '../../../../../platform/log/common/log.js';
import { IContextMenuService } from '../../../../../platform/contextview/browser/contextView.js';
import { mock } from '../../../../../base/test/common/mock.js';
import { ILanguageConfigurationService } from '../../../../common/languages/languageConfigurationRegistry.js';
import { ILanguageFeatureDebounceService, LanguageFeatureDebounceService, } from '../../../../common/services/languageFeatureDebounce.js';
import { TestLanguageConfigurationService } from '../../../../test/common/modes/testLanguageConfigurationService.js';
import { SyncDescriptor } from '../../../../../platform/instantiation/common/descriptors.js';
import { runWithFakedTimers } from '../../../../../base/test/common/timeTravelScheduler.js';
import { IEnvironmentService } from '../../../../../platform/environment/common/environment.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
suite('Sticky Scroll Tests', () => {
    const disposables = new DisposableStore();
    const serviceCollection = new ServiceCollection([ILanguageFeaturesService, new LanguageFeaturesService()], [ILogService, new NullLogService()], [IContextMenuService, new (class extends mock() {
        })()], [ILanguageConfigurationService, new TestLanguageConfigurationService()], [
        IEnvironmentService,
        new (class extends mock() {
            constructor() {
                super(...arguments);
                this.isBuilt = true;
                this.isExtensionDevelopment = false;
            }
        })(),
    ], [ILanguageFeatureDebounceService, new SyncDescriptor(LanguageFeatureDebounceService)]);
    const text = [
        'function foo() {',
        '',
        '}',
        '/* comment related to TestClass',
        ' end of the comment */',
        '@classDecorator',
        'class TestClass {',
        '// comment related to the function functionOfClass',
        'functionOfClass(){',
        'function function1(){',
        '}',
        '}}',
        'function bar() { function insideBar() {}',
        '}',
    ].join('\n');
    setup(() => {
        disposables.clear();
    });
    teardown(() => {
        disposables.clear();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    function documentSymbolProviderForTestModel() {
        return {
            provideDocumentSymbols() {
                return [
                    {
                        name: 'foo',
                        detail: 'foo',
                        kind: 11 /* SymbolKind.Function */,
                        tags: [],
                        range: { startLineNumber: 1, endLineNumber: 3, startColumn: 1, endColumn: 1 },
                        selectionRange: { startLineNumber: 1, endLineNumber: 1, startColumn: 1, endColumn: 1 },
                    },
                    {
                        name: 'TestClass',
                        detail: 'TestClass',
                        kind: 4 /* SymbolKind.Class */,
                        tags: [],
                        range: { startLineNumber: 4, endLineNumber: 12, startColumn: 1, endColumn: 1 },
                        selectionRange: { startLineNumber: 7, endLineNumber: 7, startColumn: 1, endColumn: 1 },
                        children: [
                            {
                                name: 'functionOfClass',
                                detail: 'functionOfClass',
                                kind: 11 /* SymbolKind.Function */,
                                tags: [],
                                range: { startLineNumber: 8, endLineNumber: 12, startColumn: 1, endColumn: 1 },
                                selectionRange: {
                                    startLineNumber: 9,
                                    endLineNumber: 9,
                                    startColumn: 1,
                                    endColumn: 1,
                                },
                                children: [
                                    {
                                        name: 'function1',
                                        detail: 'function1',
                                        kind: 11 /* SymbolKind.Function */,
                                        tags: [],
                                        range: { startLineNumber: 10, endLineNumber: 11, startColumn: 1, endColumn: 1 },
                                        selectionRange: {
                                            startLineNumber: 10,
                                            endLineNumber: 10,
                                            startColumn: 1,
                                            endColumn: 1,
                                        },
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        name: 'bar',
                        detail: 'bar',
                        kind: 11 /* SymbolKind.Function */,
                        tags: [],
                        range: { startLineNumber: 13, endLineNumber: 14, startColumn: 1, endColumn: 1 },
                        selectionRange: {
                            startLineNumber: 13,
                            endLineNumber: 13,
                            startColumn: 1,
                            endColumn: 1,
                        },
                        children: [
                            {
                                name: 'insideBar',
                                detail: 'insideBar',
                                kind: 11 /* SymbolKind.Function */,
                                tags: [],
                                range: { startLineNumber: 13, endLineNumber: 13, startColumn: 1, endColumn: 1 },
                                selectionRange: {
                                    startLineNumber: 13,
                                    endLineNumber: 13,
                                    startColumn: 1,
                                    endColumn: 1,
                                },
                            },
                        ],
                    },
                ];
            },
        };
    }
    test('Testing the function getCandidateStickyLinesIntersecting', () => {
        return runWithFakedTimers({ useFakeTimers: true }, async () => {
            const model = createTextModel(text);
            await withAsyncTestCodeEditor(model, {
                stickyScroll: {
                    enabled: true,
                    maxLineCount: 5,
                    defaultModel: 'outlineModel',
                },
                envConfig: {
                    outerHeight: 500,
                },
                serviceCollection: serviceCollection,
            }, async (editor, _viewModel, instantiationService) => {
                const languageService = instantiationService.get(ILanguageFeaturesService);
                const languageConfigurationService = instantiationService.get(ILanguageConfigurationService);
                disposables.add(languageService.documentSymbolProvider.register('*', documentSymbolProviderForTestModel()));
                const provider = new StickyLineCandidateProvider(editor, languageService, languageConfigurationService);
                await provider.update();
                assert.deepStrictEqual(provider.getCandidateStickyLinesIntersecting({ startLineNumber: 1, endLineNumber: 4 }), [new StickyLineCandidate(1, 2, 0, 19)]);
                assert.deepStrictEqual(provider.getCandidateStickyLinesIntersecting({ startLineNumber: 8, endLineNumber: 10 }), [
                    new StickyLineCandidate(7, 11, 0, 19),
                    new StickyLineCandidate(9, 11, 19, 19),
                    new StickyLineCandidate(10, 10, 38, 19),
                ]);
                assert.deepStrictEqual(provider.getCandidateStickyLinesIntersecting({
                    startLineNumber: 10,
                    endLineNumber: 13,
                }), [
                    new StickyLineCandidate(7, 11, 0, 19),
                    new StickyLineCandidate(9, 11, 19, 19),
                    new StickyLineCandidate(10, 10, 38, 19),
                ]);
                provider.dispose();
                model.dispose();
            });
        });
    });
    test('issue #157180: Render the correct line corresponding to the scope definition', () => {
        return runWithFakedTimers({ useFakeTimers: true }, async () => {
            const model = createTextModel(text);
            await withAsyncTestCodeEditor(model, {
                stickyScroll: {
                    enabled: true,
                    maxLineCount: 5,
                    defaultModel: 'outlineModel',
                },
                envConfig: {
                    outerHeight: 500,
                },
                serviceCollection,
            }, async (editor, _viewModel, instantiationService) => {
                const stickyScrollController = editor.registerAndInstantiateContribution(StickyScrollController.ID, StickyScrollController);
                const lineHeight = editor.getOption(68 /* EditorOption.lineHeight */);
                const languageService = instantiationService.get(ILanguageFeaturesService);
                disposables.add(languageService.documentSymbolProvider.register('*', documentSymbolProviderForTestModel()));
                await stickyScrollController.stickyScrollCandidateProvider.update();
                let state;
                editor.setScrollTop(1);
                state = stickyScrollController.findScrollWidgetState();
                assert.deepStrictEqual(state.startLineNumbers, [1]);
                editor.setScrollTop(lineHeight + 1);
                state = stickyScrollController.findScrollWidgetState();
                assert.deepStrictEqual(state.startLineNumbers, [1]);
                editor.setScrollTop(4 * lineHeight + 1);
                state = stickyScrollController.findScrollWidgetState();
                assert.deepStrictEqual(state.startLineNumbers, []);
                editor.setScrollTop(8 * lineHeight + 1);
                state = stickyScrollController.findScrollWidgetState();
                assert.deepStrictEqual(state.startLineNumbers, [7, 9]);
                editor.setScrollTop(9 * lineHeight + 1);
                state = stickyScrollController.findScrollWidgetState();
                assert.deepStrictEqual(state.startLineNumbers, [7, 9]);
                editor.setScrollTop(10 * lineHeight + 1);
                state = stickyScrollController.findScrollWidgetState();
                assert.deepStrictEqual(state.startLineNumbers, [7]);
                stickyScrollController.dispose();
                stickyScrollController.stickyScrollCandidateProvider.dispose();
                model.dispose();
            });
        });
    });
    test('issue #156268 : Do not reveal sticky lines when they are in a folded region ', () => {
        return runWithFakedTimers({ useFakeTimers: true }, async () => {
            const model = createTextModel(text);
            await withAsyncTestCodeEditor(model, {
                stickyScroll: {
                    enabled: true,
                    maxLineCount: 5,
                    defaultModel: 'outlineModel',
                },
                envConfig: {
                    outerHeight: 500,
                },
                serviceCollection,
            }, async (editor, viewModel, instantiationService) => {
                const stickyScrollController = editor.registerAndInstantiateContribution(StickyScrollController.ID, StickyScrollController);
                const lineHeight = editor.getOption(68 /* EditorOption.lineHeight */);
                const languageService = instantiationService.get(ILanguageFeaturesService);
                disposables.add(languageService.documentSymbolProvider.register('*', documentSymbolProviderForTestModel()));
                await stickyScrollController.stickyScrollCandidateProvider.update();
                editor.setHiddenAreas([
                    { startLineNumber: 2, endLineNumber: 2, startColumn: 1, endColumn: 1 },
                    { startLineNumber: 10, endLineNumber: 11, startColumn: 1, endColumn: 1 },
                ]);
                let state;
                editor.setScrollTop(1);
                state = stickyScrollController.findScrollWidgetState();
                assert.deepStrictEqual(state.startLineNumbers, [1]);
                editor.setScrollTop(lineHeight + 1);
                state = stickyScrollController.findScrollWidgetState();
                assert.deepStrictEqual(state.startLineNumbers, []);
                editor.setScrollTop(6 * lineHeight + 1);
                state = stickyScrollController.findScrollWidgetState();
                assert.deepStrictEqual(state.startLineNumbers, [7, 9]);
                editor.setScrollTop(7 * lineHeight + 1);
                state = stickyScrollController.findScrollWidgetState();
                assert.deepStrictEqual(state.startLineNumbers, [7]);
                editor.setScrollTop(10 * lineHeight + 1);
                state = stickyScrollController.findScrollWidgetState();
                assert.deepStrictEqual(state.startLineNumbers, []);
                stickyScrollController.dispose();
                stickyScrollController.stickyScrollCandidateProvider.dispose();
                model.dispose();
            });
        });
    });
    const textWithScopesWithSameStartingLines = [
        'class TestClass { foo() {',
        'function bar(){',
        '',
        '}}',
        '}',
        '',
    ].join('\n');
    function documentSymbolProviderForSecondTestModel() {
        return {
            provideDocumentSymbols() {
                return [
                    {
                        name: 'TestClass',
                        detail: 'TestClass',
                        kind: 4 /* SymbolKind.Class */,
                        tags: [],
                        range: { startLineNumber: 1, endLineNumber: 5, startColumn: 1, endColumn: 1 },
                        selectionRange: { startLineNumber: 1, endLineNumber: 1, startColumn: 1, endColumn: 1 },
                        children: [
                            {
                                name: 'foo',
                                detail: 'foo',
                                kind: 11 /* SymbolKind.Function */,
                                tags: [],
                                range: { startLineNumber: 1, endLineNumber: 4, startColumn: 1, endColumn: 1 },
                                selectionRange: {
                                    startLineNumber: 1,
                                    endLineNumber: 1,
                                    startColumn: 1,
                                    endColumn: 1,
                                },
                                children: [
                                    {
                                        name: 'bar',
                                        detail: 'bar',
                                        kind: 11 /* SymbolKind.Function */,
                                        tags: [],
                                        range: { startLineNumber: 2, endLineNumber: 4, startColumn: 1, endColumn: 1 },
                                        selectionRange: {
                                            startLineNumber: 2,
                                            endLineNumber: 2,
                                            startColumn: 1,
                                            endColumn: 1,
                                        },
                                        children: [],
                                    },
                                ],
                            },
                        ],
                    },
                ];
            },
        };
    }
    test('issue #159271 : render the correct widget state when the child scope starts on the same line as the parent scope', () => {
        return runWithFakedTimers({ useFakeTimers: true }, async () => {
            const model = createTextModel(textWithScopesWithSameStartingLines);
            await withAsyncTestCodeEditor(model, {
                stickyScroll: {
                    enabled: true,
                    maxLineCount: 5,
                    defaultModel: 'outlineModel',
                },
                envConfig: {
                    outerHeight: 500,
                },
                serviceCollection,
            }, async (editor, _viewModel, instantiationService) => {
                const stickyScrollController = editor.registerAndInstantiateContribution(StickyScrollController.ID, StickyScrollController);
                await stickyScrollController.stickyScrollCandidateProvider.update();
                const lineHeight = editor.getOption(68 /* EditorOption.lineHeight */);
                const languageService = instantiationService.get(ILanguageFeaturesService);
                disposables.add(languageService.documentSymbolProvider.register('*', documentSymbolProviderForSecondTestModel()));
                await stickyScrollController.stickyScrollCandidateProvider.update();
                let state;
                editor.setScrollTop(1);
                state = stickyScrollController.findScrollWidgetState();
                assert.deepStrictEqual(state.startLineNumbers, [1, 2]);
                editor.setScrollTop(lineHeight + 1);
                state = stickyScrollController.findScrollWidgetState();
                assert.deepStrictEqual(state.startLineNumbers, [1, 2]);
                editor.setScrollTop(2 * lineHeight + 1);
                state = stickyScrollController.findScrollWidgetState();
                assert.deepStrictEqual(state.startLineNumbers, [1]);
                editor.setScrollTop(3 * lineHeight + 1);
                state = stickyScrollController.findScrollWidgetState();
                assert.deepStrictEqual(state.startLineNumbers, [1]);
                editor.setScrollTop(4 * lineHeight + 1);
                state = stickyScrollController.findScrollWidgetState();
                assert.deepStrictEqual(state.startLineNumbers, []);
                stickyScrollController.dispose();
                stickyScrollController.stickyScrollCandidateProvider.dispose();
                model.dispose();
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RpY2t5U2Nyb2xsLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9zdGlja3lTY3JvbGwvdGVzdC9icm93c2VyL3N0aWNreVNjcm9sbC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNwRixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNoRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtRUFBbUUsQ0FBQTtBQUNyRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUMxRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDMUUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFFaEcsT0FBTyxFQUNOLG1CQUFtQixFQUNuQiwyQkFBMkIsR0FDM0IsTUFBTSx1Q0FBdUMsQ0FBQTtBQUU5QyxPQUFPLEVBQUUsV0FBVyxFQUFFLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2hHLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUM3RyxPQUFPLEVBQ04sK0JBQStCLEVBQy9CLDhCQUE4QixHQUM5QixNQUFNLHdEQUF3RCxDQUFBO0FBQy9ELE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLG1FQUFtRSxDQUFBO0FBQ3BILE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw2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