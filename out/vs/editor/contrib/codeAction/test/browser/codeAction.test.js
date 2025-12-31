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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZUFjdGlvbi50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvY29kZUFjdGlvbi90ZXN0L2Jyb3dzZXIvY29kZUFjdGlvbi50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNqRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDekUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3ZELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUd2RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDNUQsT0FBTyxFQUFFLGNBQWMsRUFBRSxjQUFjLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUMvRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDMUUsT0FBTyxFQUFlLGNBQWMsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQy9GLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUU5RSxTQUFTLHdCQUF3QixDQUNoQyxHQUFHLE9BQStCO0lBRWxDLE9BQU8sSUFBSSxDQUFDO1FBQ1gsa0JBQWtCO1lBQ2pCLE9BQU87Z0JBQ04sT0FBTyxFQUFFLE9BQU87Z0JBQ2hCLE9B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