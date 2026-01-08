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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZUFjdGlvbk1vZGVsLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2NvZGVBY3Rpb24vdGVzdC9icm93c2VyL2NvZGVBY3Rpb25Nb2RlbC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDaEUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBQzNGLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHlFQUF5RSxDQUFBO0FBQy9HLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUV2RixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUd2RixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNqRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDMUUsT0FBTyxFQUFFLGVBQWUsRUFBb0IsTUFBTSxrQ0FBa0MsQ0FBQTtBQUVwRixNQUFNLFlBQVksR0FBRztJQUNwQixrQkFBa0I7UUFDakIsT0FBTztZQUNOLE9BQU8sRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFLEVBQUUsY0FBYyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUM7WUFDM0YsT0FBTztnQkFDTixTQUFTO1lBQ1YsQ0FBQztTQUNELENBQUE7SUFDRixDQUFDO0NBQ0QsQ0FBQTtBQUVELEtBQUssQ0FBQyxpQkFBaUIsRUFBRSxHQUFHLEVBQUU7SUFDN0IsTUFBTSxVQUFVLEdBQUcsVUFBVSxDQUFBO0lBQzdCLE1BQU0sR0FBRyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUE7SUFDdEMsSUFBSSxLQUFnQixDQUFBO0lBQ3BCLElBQUksYUFBNEIsQ0FBQTtJQUNoQyxJQUFJLE1BQW1CLENBQUE7SUFDdkIsSUFBSSxRQUErRCxDQUFBO0lBRW5FLEtBQUssQ0FBQyxHQUFHLEVBQUU7UUFDVixhQUFhLEdBQUcsSUFBSSxhQUFhLEVBQUUsQ0FBQTtRQUNuQyxLQUFLLEdBQUcsZUFBZSxDQUFDLGlDQUFpQyxFQUFFLFVBQVUsRUFBRSxTQUFTLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFDdEYsTUFBTSxHQUFHLG9CQUFvQixDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ3BDLE1BQU0sQ0FBQyxXQUFXLENBQUMsRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQ2hELFFBQVEsR0FBRyxJQUFJLHVCQUF1QixFQUFFLENBQUE7SUFDekMsQ0FBQyxDQUFDLENBQUE7SUFFRixNQUFNLEtBQUssR0FBRyx1Q0FBdUMsRUFBRSxDQUFBO0lBRXZELFFBQVEsQ0FBQyxHQUFHLEVBQUU7UUFDYixNQUFNLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDaEIsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQ2YsYUFBYSxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ3hCLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHdCQUF3QixFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3pDLE1BQU0sRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsR0FBRyxvQkFBb0IsRUFBUSxDQUFBO1FBRTVFLE1BQU0sa0JBQWtCLENBQUMsRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLEVBQUUsR0FBRyxFQUFFO1lBQ3RELE1BQU0sR0FBRyxHQUFHLFFBQVEsQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLFlBQVksQ0FBQyxDQUFBO1lBQ3ZELEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUE7WUFFZCxNQUFNLFdBQVcsR0FBRyxJQUFJLHFCQUFxQixFQUFFLENBQUE7WUFDL0MsTUFBTSxLQUFLLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FDdEIsSUFBSSxlQUFlLENBQUMsTUFBTSxFQUFFLFFBQVEsRUFBRSxhQUFhLEVBQUUsV0FBVyxFQUFFLFNBQVMsQ0FBQyxDQUM1RSxDQUFBO1lBQ0QsS0FBSyxDQUFDLEdBQUcsQ0FDUixLQUFLLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUF5QixFQUFFLEVBQUU7Z0JBQ3BELFVBQVUsQ0FBQyxDQUFDLENBQUMsSUFBSSw0Q0FBb0MsQ0FBQyxDQUFBO2dCQUV0RCxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSwrQ0FBdUMsQ0FBQTtnQkFDeEUsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUE7Z0JBRXBCLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUU7b0JBQ3hCLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQTtvQkFDZixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO29CQUNoRCxJQUFJLEVBQUUsQ0FBQTtnQkFDUCxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDVCxDQUFDLENBQUMsQ0FDRixDQUFBO1lBRUQsYUFBYTtZQUNiLGFBQWEsQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRTtnQkFDcEM7b0JBQ0MsZUFBZSxFQUFFLENBQUM7b0JBQ2xCLFdBQVcsRUFBRSxDQUFDO29CQUNkLGFBQWEsRUFBRSxDQUFDO29CQUNoQixTQUFTLEVBQUUsQ0FBQztvQkFDWixPQUFPLEVBQUUsT0FBTztvQkFDaEIsUUFBUSxFQUFFLENBQUM7b0JBQ1gsSUFBSSxFQUFFLEVBQUU7b0JBQ1IsTUFBTSxFQUFFLEVBQUU7aUJBQ1Y7YUFDRCxDQUFDLENBQUE7WUFDRixPQUFPLFdBQVcsQ0FBQTtRQUNuQixDQUFDLENBQUMsQ0FBQTtJQUNILENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDRCQUE0QixFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzdDLE1BQU0sa0JBQWtCLENBQUMsRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLEVBQUUsR0FBRyxFQUFFO1lBQ3RELE1BQU0sR0FBRyxHQUFHLFFBQVEsQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLFlBQVksQ0FBQyxDQUFBO1lBQ3ZELEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUE7WUFFZCxhQUFhLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUU7Z0JBQ3BDO29CQUNDLGVBQWUsRUFBRSxDQUFDO29CQUNsQixXQUFXLEVBQUUsQ0FBQztvQkFDZCxhQUFhLEVBQUUsQ0FBQztvQkFDaEIsU0FBUyxFQUFFLENBQUM7b0JBQ1osT0FBTyxFQUFFLE9BQU87b0JBQ2hCLFFBQVEsRUFBRSxDQUFDO29CQUNYLElBQUksRUFBRSxFQUFFO29CQUNSLE1BQU0sRUFBRSxFQUFFO2lCQUNWO2FBQ0QsQ0FBQyxDQUFBO1lBRUYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxFQUFFLFVBQVUsRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUE7WUFFaEQsT0FBTyxJQUFJLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRTtnQkFDdEMsTUFBTSxXQUFXLEdBQUcsSUFBSSxxQkFBcUIsRUFBRSxDQUFBO2dCQUMvQyxNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsR0FBRyxDQUN0QixJQUFJLGVBQWUsQ0FBQyxNQUFNLEVBQUUsUUFBUSxFQUFFLGFBQWEsRUFBRSxXQUFXLEVBQUUsU0FBUyxDQUFDLENBQzVFLENBQUE7Z0JBQ0QsS0FBSyxDQUFDLEdBQUcsQ0FDUixLQUFLLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUF5QixFQUFFLEVBQUU7b0JBQ3BELFVBQVUsQ0FBQyxDQUFDLENBQUMsSUFBSSw0Q0FBb0MsQ0FBQyxDQUFBO29CQUV0RCxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSwrQ0FBdUMsQ0FBQTtvQkFDeEUsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUE7b0JBQ3BCLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUU7d0JBQ3hCLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQTt3QkFDZixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO3dCQUNoRCxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUE7b0JBQ25CLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQTtnQkFDWCxDQUFDLENBQUMsQ0FDRixDQUFBO2dCQUNELGFBQWE7Z0JBQ2IsTUFBTSxDQUFDLFdBQVcsQ0FBQyxFQUFFLFVBQVUsRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUE7WUFDakQsQ0FBQyxDQUFDLENBQUE7UUFDSCxDQUFDLENBQUMsQ0FBQTtJQUNILENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDZGQUE2RixFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzlHLE1BQU0sRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsR0FBRyxvQkFBb0IsRUFBUSxDQUFBO1FBQzVFLE1BQU0sa0JBQWtCLENBQUMsRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLEVBQUUsR0FBRyxFQUFFO1lBQ3RELE1BQU0sR0FBRyxHQUFHLFFBQVEsQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLFlBQVksQ0FBQyxDQUFBO1lBQ3ZELEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUE7WUFFZCxJQUFJLFlBQVksR0FBRyxDQUFDLENBQUE7WUFDcEIsTUFBTSxXQUFXLEdBQUcsSUFBSSxxQkFBcUIsRUFBRSxDQUFBO1lBQy9DLE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQ3RCLElBQUksZUFBZSxDQUFDLE1BQU0sRUFBRSxRQUFRLEVBQUUsYUFBYSxFQUFFLFdBQVcsRUFBRSxTQUFTLENBQUMsQ0FDNUUsQ0FBQTtZQUNELEtBQUssQ0FBQyxHQUFHLENBQ1IsS0FBSyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBeUIsRUFBRSxFQUFFO2dCQUNwRCxVQUFVLENBQUMsQ0FBQyxDQUFDLElBQUksNENBQW9DLENBQUMsQ0FBQTtnQkFFdEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksK0NBQXVDLENBQUE7Z0JBQ3hFLEVBQUUsWUFBWSxDQUFBO2dCQUVkLHNEQUFzRDtnQkFDdEQsVUFBVSxDQUFDLEdBQUcsRUFBRTtvQkFDZixLQUFLLENBQUMsT0FBTyxFQUFFLENBQUE7b0JBQ2YsTUFBTSxDQUFDLFdBQVcsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLENBQUE7b0JBQ25DLElBQUksRUFBRSxDQUFBO2dCQUNQLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUNOLENBQUMsRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDLENBQ2YsQ0FBQTtZQUVELGFBQWEsQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRTtnQkFDcEM7b0JBQ0MsZUFBZSxFQUFFLENBQUM7b0JBQ2xCLFdBQVcsRUFBRSxDQUFDO29CQUNkLGFBQWEsRUFBRSxDQUFDO29CQUNoQixTQUFTLEVBQUUsQ0FBQztvQkFDWixPQUFPLEVBQUUsT0FBTztvQkFDaEIsUUFBUSxFQUFFLENBQUM7b0JBQ1gsSUFBSSxFQUFFLEVBQUU7b0JBQ1IsTUFBTSxFQUFFLEVBQUU7aUJBQ1Y7YUFDRCxDQUFDLENBQUE7WUFFRixNQUFNLENBQUMsWUFBWSxDQUFDLEVBQUUsZUFBZSxFQUFFLENBQUMsRUFBRSxXQUFXLEVBQUUsQ0FBQyxFQUFFLGFBQWEsRUFBRSxDQUFDLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUE7WUFFM0YsT0FBTyxXQUFXLENBQUE7UUFDbkIsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQTtBQUNILENBQUMsQ0FBQyxDQUFBIn0=