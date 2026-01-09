/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { timeout } from '../../../../../base/common/async.js';
import { Event } from '../../../../../base/common/event.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { mock } from '../../../../../base/test/common/mock.js';
import { runWithFakedTimers } from '../../../../../base/test/common/timeTravelScheduler.js';
import { Range } from '../../../../common/core/range.js';
import { IEditorWorkerService } from '../../../../common/services/editorWorker.js';
import { GhostTextContext } from './utils.js';
import { SnippetController2 } from '../../../snippet/browser/snippetController2.js';
import { SuggestController } from '../../../suggest/browser/suggestController.js';
import { ISuggestMemoryService } from '../../../suggest/browser/suggestMemory.js';
import { withAsyncTestCodeEditor, } from '../../../../test/browser/testCodeEditor.js';
import { IMenuService } from '../../../../../platform/actions/common/actions.js';
import { ServiceCollection } from '../../../../../platform/instantiation/common/serviceCollection.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
import { MockKeybindingService } from '../../../../../platform/keybinding/test/common/mockKeybindingService.js';
import { ILogService, NullLogService } from '../../../../../platform/log/common/log.js';
import { InMemoryStorageService, IStorageService, } from '../../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { NullTelemetryService } from '../../../../../platform/telemetry/common/telemetryUtils.js';
import assert from 'assert';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { LanguageFeaturesService } from '../../../../common/services/languageFeaturesService.js';
import { ILanguageFeaturesService } from '../../../../common/services/languageFeatures.js';
import { InlineCompletionsController } from '../../browser/controller/inlineCompletionsController.js';
import { autorun } from '../../../../../base/common/observable.js';
import { setUnexpectedErrorHandler } from '../../../../../base/common/errors.js';
import { IAccessibilitySignalService } from '../../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
suite('Suggest Widget Model', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    setup(() => {
        setUnexpectedErrorHandler(function (err) {
            throw err;
        });
    });
    // This test is skipped because the fix for this causes https://github.com/microsoft/vscode/issues/166023
    test.skip('Active', async () => {
        await withAsyncTestCodeEditorAndInlineCompletionsModel('', { fakeClock: true, provider }, async ({ editor, editorViewModel, context, model }) => {
            let last = undefined;
            const history = new Array();
            const d = autorun((reader) => {
                /** @description debug */
                const selectedSuggestItem = !!model.debugGetSelectedSuggestItem().read(reader);
                if (last !== selectedSuggestItem) {
                    last = selectedSuggestItem;
                    history.push(last);
                }
            });
            context.keyboardType('h');
            const suggestController = editor.getContribution(SuggestController.ID);
            suggestController.triggerSuggest();
            await timeout(1000);
            assert.deepStrictEqual(history.splice(0), [false, true]);
            context.keyboardType('.');
            await timeout(1000);
            // No flicker here
            assert.deepStrictEqual(history.splice(0), []);
            suggestController.cancelSuggestWidget();
            await timeout(1000);
            assert.deepStrictEqual(history.splice(0), [false]);
            d.dispose();
        });
    });
    test('Ghost Text', async () => {
        await withAsyncTestCodeEditorAndInlineCompletionsModel('', { fakeClock: true, provider, suggest: { preview: true } }, async ({ editor, editorViewModel, context, model }) => {
            context.keyboardType('h');
            const suggestController = editor.getContribution(SuggestController.ID);
            suggestController.triggerSuggest();
            await timeout(1000);
            assert.deepStrictEqual(context.getAndClearViewStates(), ['', 'h[ello]']);
            context.keyboardType('.');
            await timeout(1000);
            assert.deepStrictEqual(context.getAndClearViewStates(), ['h', 'hello.[hello]']);
            suggestController.cancelSuggestWidget();
            await timeout(1000);
            assert.deepStrictEqual(context.getAndClearViewStates(), ['hello.']);
        });
    });
});
const provider = {
    _debugDisplayName: 'test',
    triggerCharacters: ['.'],
    async provideCompletionItems(model, pos) {
        const word = model.getWordAtPosition(pos);
        const range = word
            ? {
                startLineNumber: 1,
                startColumn: word.startColumn,
                endLineNumber: 1,
                endColumn: word.endColumn,
            }
            : Range.fromPositions(pos);
        return {
            suggestions: [
                {
                    insertText: 'hello',
                    kind: 18 /* CompletionItemKind.Text */,
                    label: 'hello',
                    range,
                    commitCharacters: ['.'],
                },
            ],
        };
    },
};
async function withAsyncTestCodeEditorAndInlineCompletionsModel(text, options, callback) {
    await runWithFakedTimers({ useFakeTimers: options.fakeClock }, async () => {
        const disposableStore = new DisposableStore();
        try {
            const serviceCollection = new ServiceCollection([ITelemetryService, NullTelemetryService], [ILogService, new NullLogService()], [IStorageService, disposableStore.add(new InMemoryStorageService())], [IKeybindingService, new MockKeybindingService()], [
                IEditorWorkerService,
                new (class extends mock() {
                    computeWordRanges() {
                        return Promise.resolve({});
                    }
                })(),
            ], [
                ISuggestMemoryService,
                new (class extends mock() {
                    memorize() { }
                    select() {
                        return 0;
                    }
                })(),
            ], [
                IMenuService,
                new (class extends mock() {
                    createMenu() {
                        return new (class extends mock() {
                            constructor() {
                                super(...arguments);
                                this.onDidChange = Event.None;
                            }
                            dispose() { }
                        })();
                    }
                })(),
            ], [ILabelService, new (class extends mock() {
                })()], [IWorkspaceContextService, new (class extends mock() {
                })()], [
                IAccessibilitySignalService,
                {
                    playSignal: async () => { },
                    isSoundEnabled(signal) {
                        return false;
                    },
                },
            ]);
            if (options.provider) {
                const languageFeaturesService = new LanguageFeaturesService();
                serviceCollection.set(ILanguageFeaturesService, languageFeaturesService);
                disposableStore.add(languageFeaturesService.completionProvider.register({ pattern: '**' }, options.provider));
            }
            await withAsyncTestCodeEditor(text, { ...options, serviceCollection }, async (editor, editorViewModel, instantiationService) => {
                editor.registerAndInstantiateContribution(SnippetController2.ID, SnippetController2);
                editor.registerAndInstantiateContribution(SuggestController.ID, SuggestController);
                editor.registerAndInstantiateContribution(InlineCompletionsController.ID, InlineCompletionsController);
                const model = InlineCompletionsController.get(editor)?.model.get();
                const context = new GhostTextContext(model, editor);
                await callback({ editor, editorViewModel, model, context });
                context.dispose();
            });
        }
        finally {
            disposableStore.dispose();
        }
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3VnZ2VzdFdpZGdldE1vZGVsLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2lubGluZUNvbXBsZXRpb25zL3Rlc3QvYnJvd3Nlci9zdWdnZXN0V2lkZ2V0TW9kZWwudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDN0QsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDOUQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDM0YsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRXhELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBRWxGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLFlBQVksQ0FBQTtBQUM3QyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNuRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUNqRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUNqRixPQUFPLEVBR04sdUJBQXVCLEdBQ3ZCLE1BQU0sNENBQTRDLENBQUE7QUFDbkQsT0FBTyxFQUFTLFlBQVksRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1FQUFtRSxDQUFBO0FBQ3JHLE9BQU8sRUFBRSxrQkFBa0Is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