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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3VnZ2VzdFdpZGdldE1vZGVsLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9pbmxpbmVDb21wbGV0aW9ucy90ZXN0L2Jyb3dzZXIvc3VnZ2VzdFdpZGdldE1vZGVsLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDekUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzlELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBQzNGLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUV4RCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUVsRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxZQUFZLENBQUE7QUFDN0MsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDbkYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDakYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDakYsT0FBTyxFQUdOLHVCQUF1QixHQUN2QixNQUFNLDRDQUE0QyxDQUFBO0FBQ25ELE9BQU8sRUFBUyxZQUFZLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUN2RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtRUFBbUUsQ0FBQTtBQUNyRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtB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