/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { promiseWithResolvers } from '../../../../../base/common/async.js';
import { assertType } from '../../../../../base/common/types.js';
import { URI } from '../../../../../base/common/uri.js';
import { runWithFakedTimers } from '../../../../../base/test/common/timeTravelScheduler.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { MockContextKeyService } from '../../../../../platform/keybinding/test/common/mockKeybindingService.js';
import { MarkerService } from '../../../../../platform/markers/common/markerService.js';
import { LanguageFeatureRegistry } from '../../../../common/languageFeatureRegistry.js';
import { createTestCodeEditor } from '../../../../test/browser/testCodeEditor.js';
import { createTextModel } from '../../../../test/common/testTextModel.js';
import { CodeActionModel } from '../../browser/codeActionModel.js';
const testProvider = {
    provideCodeActions() {
        return {
            actions: [{ title: 'test', command: { id: 'test-command', title: 'test', arguments: [] } }],
            dispose() {
                /* noop*/
            },
        };
    },
};
suite('CodeActionModel', () => {
    const languageId = 'foo-lang';
    const uri = URI.parse('untitled:path');
    let model;
    let markerService;
    let editor;
    let registry;
    setup(() => {
        markerService = new MarkerService();
        model = createTextModel('foobar  foo bar\nfarboo far boo', languageId, undefined, uri);
        editor = createTestCodeEditor(model);
        editor.setPosition({ lineNumber: 1, column: 1 });
        registry = new LanguageFeatureRegistry();
    });
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    teardown(() => {
        editor.dispose();
        model.dispose();
        markerService.dispose();
    });
    test('Oracle -> marker added', async () => {
        const { promise: donePromise, resolve: done } = promiseWithResolvers();
        await runWithFakedTimers({ useFakeTimers: true }, () => {
            const reg = registry.register(languageId, testProvider);
            store.add(reg);
            const contextKeys = new MockContextKeyService();
            const model = store.add(new CodeActionModel(editor, registry, markerService, contextKeys, undefined));
            store.add(model.onDidChangeState((e) => {
                assertType(e.type === 1 /* CodeActionsState.Type.Triggered */);
                assert.strictEqual(e.trigger.type, 2 /* languages.CodeActionTriggerType.Auto */);
                assert.ok(e.actions);
                e.actions.then((fixes) => {
                    model.dispose();
                    assert.strictEqual(fixes.validActions.length, 1);
                    done();
                }, done);
            }));
            // start here
            markerService.changeOne('fake', uri, [
                {
                    startLineNumber: 1,
                    startColumn: 1,
                    endLineNumber: 1,
                    endColumn: 6,
                    message: 'error',
                    severity: 1,
                    code: '',
                    source: '',
                },
            ]);
            return donePromise;
        });
    });
    test('Oracle -> position changed', async () => {
        await runWithFakedTimers({ useFakeTimers: true }, () => {
            const reg = registry.register(languageId, testProvider);
            store.add(reg);
            markerService.changeOne('fake', uri, [
                {
                    startLineNumber: 1,
                    startColumn: 1,
                    endLineNumber: 1,
                    endColumn: 6,
                    message: 'error',
                    severity: 1,
                    code: '',
                    source: '',
                },
            ]);
            editor.setPosition({ lineNumber: 2, column: 1 });
            return new Promise((resolve, reject) => {
                const contextKeys = new MockContextKeyService();
                const model = store.add(new CodeActionModel(editor, registry, markerService, contextKeys, undefined));
                store.add(model.onDidChangeState((e) => {
                    assertType(e.type === 1 /* CodeActionsState.Type.Triggered */);
                    assert.strictEqual(e.trigger.type, 2 /* languages.CodeActionTriggerType.Auto */);
                    assert.ok(e.actions);
                    e.actions.then((fixes) => {
                        model.dispose();
                        assert.strictEqual(fixes.validActions.length, 1);
                        resolve(undefined);
                    }, reject);
                }));
                // start here
                editor.setPosition({ lineNumber: 1, column: 1 });
            });
        });
    });
    test('Oracle -> should only auto trigger once for cursor and marker update right after each other', async () => {
        const { promise: donePromise, resolve: done } = promiseWithResolvers();
        await runWithFakedTimers({ useFakeTimers: true }, () => {
            const reg = registry.register(languageId, testProvider);
            store.add(reg);
            let triggerCount = 0;
            const contextKeys = new MockContextKeyService();
            const model = store.add(new CodeActionModel(editor, registry, markerService, contextKeys, undefined));
            store.add(model.onDidChangeState((e) => {
                assertType(e.type === 1 /* CodeActionsState.Type.Triggered */);
                assert.strictEqual(e.trigger.type, 2 /* languages.CodeActionTriggerType.Auto */);
                ++triggerCount;
                // give time for second trigger before completing test
                setTimeout(() => {
                    model.dispose();
                    assert.strictEqual(triggerCount, 1);
                    done();
                }, 0);
            }, 5 /*delay*/));
            markerService.changeOne('fake', uri, [
                {
                    startLineNumber: 1,
                    startColumn: 1,
                    endLineNumber: 1,
                    endColumn: 6,
                    message: 'error',
                    severity: 1,
                    code: '',
                    source: '',
                },
            ]);
            editor.setSelection({ startLineNumber: 1, startColumn: 1, endLineNumber: 4, endColumn: 1 });
            return donePromise;
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZUFjdGlvbk1vZGVsLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9jb2RlQWN0aW9uL3Rlc3QvYnJvd3Nlci9jb2RlQWN0aW9uTW9kZWwudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDMUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUMzRixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNsRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx5RUFBeUUsQ0FBQTtBQUMvRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0seURBQXlELENBQUE7QUFFdkYsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFHdkYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDakYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxlQUFlLEVBQW9CLE1BQU0sa0NBQWtDLENBQUE7QUFFcEYsTUFBTSxZQUFZLEdBQUc7SUFDcEIsa0JBQWtCO1FBQ2pCLE9BQU87WUFDTixPQUFPLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLEVBQUUsRUFBRSxFQUFFLGNBQWMsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxFQUFF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