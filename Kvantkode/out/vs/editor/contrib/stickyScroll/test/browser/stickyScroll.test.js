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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RpY2t5U2Nyb2xsLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL3N0aWNreVNjcm9sbC90ZXN0L2Jyb3dzZXIvc3RpY2t5U2Nyb2xsLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3BGLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ2hGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1FQUFtRSxDQUFBO0FBQ3JHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQzFGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUVoRyxPQUFPLEVBQ04sbUJBQW1CLEVBQ25CLDJCQUEyQixHQUMzQixNQUFNLHVDQUF1QyxDQUFBO0FBRTlDLE9BQU8sRUFBRSxXQUFXLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDdkYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDaEcsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzlELE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQzdHLE9BQU8sRUFDTiwrQkFBK0IsRUFDL0IsOEJBQThCLEdBQzlCLE1BQU0sd0RBQXdELENBQUE7QUFDL0QsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sbUVBQW1FLENBQUE7QUFDcEgsT0FB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