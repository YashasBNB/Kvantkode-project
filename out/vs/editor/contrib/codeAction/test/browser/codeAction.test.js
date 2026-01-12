/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { HierarchicalKind } from '../../../../../base/common/hierarchicalKind.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { URI } from '../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { Range } from '../../../../common/core/range.js';
import { LanguageFeatureRegistry } from '../../../../common/languageFeatureRegistry.js';
import { getCodeActions } from '../../browser/codeAction.js';
import { CodeActionItem, CodeActionKind, CodeActionTriggerSource } from '../../common/types.js';
import { createTextModel } from '../../../../test/common/testTextModel.js';
import { MarkerSeverity } from '../../../../../platform/markers/common/markers.js';
import { Progress } from '../../../../../platform/progress/common/progress.js';
function staticCodeActionProvider(...actions) {
    return new (class {
        provideCodeActions() {
            return {
                actions: actions,
                dispose: () => { },
            };
        }
    })();
}
suite('CodeAction', () => {
    const langId = 'fooLang';
    const uri = URI.parse('untitled:path');
    let model;
    let registry;
    const disposables = new DisposableStore();
    const testData = {
        diagnostics: {
            abc: {
                title: 'bTitle',
                diagnostics: [
                    {
                        startLineNumber: 1,
                        startColumn: 1,
                        endLineNumber: 2,
                        endColumn: 1,
                        severity: MarkerSeverity.Error,
                        message: 'abc',
                    },
                ],
            },
            bcd: {
                title: 'aTitle',
                diagnostics: [
                    {
                        startLineNumber: 1,
                        startColumn: 1,
                        endLineNumber: 2,
                        endColumn: 1,
                        severity: MarkerSeverity.Error,
                        message: 'bcd',
                    },
                ],
            },
        },
        command: {
            abc: {
                command: new (class {
                })(),
                title: 'Extract to inner function in function "test"',
            },
        },
        spelling: {
            bcd: {
                diagnostics: [],
                edit: new (class {
                })(),
                title: 'abc',
            },
        },
        tsLint: {
            abc: {
                $ident: 'funny' + 57,
                arguments: [],
                id: '_internal_command_delegation',
                title: 'abc',
            },
            bcd: {
                $ident: 'funny' + 47,
                arguments: [],
                id: '_internal_command_delegation',
                title: 'bcd',
            },
        },
    };
    setup(() => {
        registry = new LanguageFeatureRegistry();
        disposables.clear();
        model = createTextModel('test1\ntest2\ntest3', langId, undefined, uri);
        disposables.add(model);
    });
    teardown(() => {
        disposables.clear();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('CodeActions are sorted by type, #38623', async () => {
        const provider = staticCodeActionProvider(testData.command.abc, testData.diagnostics.bcd, testData.spelling.bcd, testData.tsLint.bcd, testData.tsLint.abc, testData.diagnostics.abc);
        disposables.add(registry.register('fooLang', provider));
        const expected = [
            // CodeActions with a diagnostics array are shown first without further sorting
            new CodeActionItem(testData.diagnostics.bcd, provider),
            new CodeActionItem(testData.diagnostics.abc, provider),
            // CodeActions without diagnostics are shown in the given order without any further sorting
            new CodeActionItem(testData.command.abc, provider),
            new CodeActionItem(testData.spelling.bcd, provider),
            new CodeActionItem(testData.tsLint.bcd, provider),
            new CodeActionItem(testData.tsLint.abc, provider),
        ];
        const { validActions: actions } = disposables.add(await getCodeActions(registry, model, new Range(1, 1, 2, 1), {
            type: 1 /* languages.CodeActionTriggerType.Invoke */,
            triggerAction: CodeActionTriggerSource.Default,
        }, Progress.None, CancellationToken.None));
        assert.strictEqual(actions.length, 6);
        assert.deepStrictEqual(actions, expected);
    });
    test('getCodeActions should filter by scope', async () => {
        const provider = staticCodeActionProvider({ title: 'a', kind: 'a' }, { title: 'b', kind: 'b' }, { title: 'a.b', kind: 'a.b' });
        disposables.add(registry.register('fooLang', provider));
        {
            const { validActions: actions } = disposables.add(await getCodeActions(registry, model, new Range(1, 1, 2, 1), {
                type: 2 /* languages.CodeActionTriggerType.Auto */,
                triggerAction: CodeActionTriggerSource.Default,
                filter: { include: new HierarchicalKind('a') },
            }, Progress.None, CancellationToken.None));
            assert.strictEqual(actions.length, 2);
            assert.strictEqual(actions[0].action.title, 'a');
            assert.strictEqual(actions[1].action.title, 'a.b');
        }
        {
            const { validActions: actions } = disposables.add(await getCodeActions(registry, model, new Range(1, 1, 2, 1), {
                type: 2 /* languages.CodeActionTriggerType.Auto */,
                triggerAction: CodeActionTriggerSource.Default,
                filter: { include: new HierarchicalKind('a.b') },
            }, Progress.None, CancellationToken.None));
            assert.strictEqual(actions.length, 1);
            assert.strictEqual(actions[0].action.title, 'a.b');
        }
        {
            const { validActions: actions } = disposables.add(await getCodeActions(registry, model, new Range(1, 1, 2, 1), {
                type: 2 /* languages.CodeActionTriggerType.Auto */,
                triggerAction: CodeActionTriggerSource.Default,
                filter: { include: new HierarchicalKind('a.b.c') },
            }, Progress.None, CancellationToken.None));
            assert.strictEqual(actions.length, 0);
        }
    });
    test('getCodeActions should forward requested scope to providers', async () => {
        const provider = new (class {
            provideCodeActions(_model, _range, context, _token) {
                return {
                    actions: [{ title: context.only || '', kind: context.only }],
                    dispose: () => { },
                };
            }
        })();
        disposables.add(registry.register('fooLang', provider));
        const { validActions: actions } = disposables.add(await getCodeActions(registry, model, new Range(1, 1, 2, 1), {
            type: 2 /* languages.CodeActionTriggerType.Auto */,
            triggerAction: CodeActionTriggerSource.Default,
            filter: { include: new HierarchicalKind('a') },
        }, Progress.None, CancellationToken.None));
        assert.strictEqual(actions.length, 1);
        assert.strictEqual(actions[0].action.title, 'a');
    });
    test('getCodeActions should not return source code action by default', async () => {
        const provider = staticCodeActionProvider({ title: 'a', kind: CodeActionKind.Source.value }, { title: 'b', kind: 'b' });
        disposables.add(registry.register('fooLang', provider));
        {
            const { validActions: actions } = disposables.add(await getCodeActions(registry, model, new Range(1, 1, 2, 1), {
                type: 2 /* languages.CodeActionTriggerType.Auto */,
                triggerAction: CodeActionTriggerSource.SourceAction,
            }, Progress.None, CancellationToken.None));
            assert.strictEqual(actions.length, 1);
            assert.strictEqual(actions[0].action.title, 'b');
        }
        {
            const { validActions: actions } = disposables.add(await getCodeActions(registry, model, new Range(1, 1, 2, 1), {
                type: 2 /* languages.CodeActionTriggerType.Auto */,
                triggerAction: CodeActionTriggerSource.Default,
                filter: { include: CodeActionKind.Source, includeSourceActions: true },
            }, Progress.None, CancellationToken.None));
            assert.strictEqual(actions.length, 1);
            assert.strictEqual(actions[0].action.title, 'a');
        }
    });
    test('getCodeActions should support filtering out some requested source code actions #84602', async () => {
        const provider = staticCodeActionProvider({ title: 'a', kind: CodeActionKind.Source.value }, { title: 'b', kind: CodeActionKind.Source.append('test').value }, { title: 'c', kind: 'c' });
        disposables.add(registry.register('fooLang', provider));
        {
            const { validActions: actions } = disposables.add(await getCodeActions(registry, model, new Range(1, 1, 2, 1), {
                type: 2 /* languages.CodeActionTriggerType.Auto */,
                triggerAction: CodeActionTriggerSource.SourceAction,
                filter: {
                    include: CodeActionKind.Source.append('test'),
                    excludes: [CodeActionKind.Source],
                    includeSourceActions: true,
                },
            }, Progress.None, CancellationToken.None));
            assert.strictEqual(actions.length, 1);
            assert.strictEqual(actions[0].action.title, 'b');
        }
    });
    test('getCodeActions no invoke a provider that has been excluded #84602', async () => {
        const baseType = CodeActionKind.Refactor;
        const subType = CodeActionKind.Refactor.append('sub');
        disposables.add(registry.register('fooLang', staticCodeActionProvider({ title: 'a', kind: baseType.value })));
        let didInvoke = false;
        disposables.add(registry.register('fooLang', new (class {
            constructor() {
                this.providedCodeActionKinds = [subType.value];
            }
            provideCodeActions() {
                didInvoke = true;
                return {
                    actions: [{ title: 'x', kind: subType.value }],
                    dispose: () => { },
                };
            }
        })()));
        {
            const { validActions: actions } = disposables.add(await getCodeActions(registry, model, new Range(1, 1, 2, 1), {
                type: 2 /* languages.CodeActionTriggerType.Auto */,
                triggerAction: CodeActionTriggerSource.Refactor,
                filter: {
                    include: baseType,
                    excludes: [subType],
                },
            }, Progress.None, CancellationToken.None));
            assert.strictEqual(didInvoke, false);
            assert.strictEqual(actions.length, 1);
            assert.strictEqual(actions[0].action.title, 'a');
        }
    });
    test('getCodeActions should not invoke code action providers filtered out by providedCodeActionKinds', async () => {
        let wasInvoked = false;
        const provider = new (class {
            constructor() {
                this.providedCodeActionKinds = [CodeActionKind.Refactor.value];
            }
            provideCodeActions() {
                wasInvoked = true;
                return { actions: [], dispose: () => { } };
            }
        })();
        disposables.add(registry.register('fooLang', provider));
        const { validActions: actions } = disposables.add(await getCodeActions(registry, model, new Range(1, 1, 2, 1), {
            type: 2 /* languages.CodeActionTriggerType.Auto */,
            triggerAction: CodeActionTriggerSource.Refactor,
            filter: {
                include: CodeActionKind.QuickFix,
            },
        }, Progress.None, CancellationToken.None));
        assert.strictEqual(actions.length, 0);
        assert.strictEqual(wasInvoked, false);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZUFjdGlvbi50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9jb2RlQWN0aW9uL3Rlc3QvYnJvd3Nlci9jb2RlQWN0aW9uLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQzlFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdkQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3hELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBR3ZGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsY0FBYyxFQUFFLGNBQWMsRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQy9GLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUMxRSxPQUFPLEVBQWUsY0FBYyxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDL0YsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBRTlFLFNBQVMsd0JBQXdCLENBQ2hDLEdBQUcsT0FBK0I7SUFFbEMsT0FBTyxJQUFJLENBQUM7UUFDWCxrQkFBa0I7WUFDakIsT0FBTztnQkFDTixPQUFPLEVBQUUsT0FBTztnQkFD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