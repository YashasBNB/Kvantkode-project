/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { promiseWithResolvers } from '../../../../../base/common/async.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { URI } from '../../../../../base/common/uri.js';
import { runWithFakedTimers } from '../../../../../base/test/common/timeTravelScheduler.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { LanguageFeatureRegistry } from '../../../../common/languageFeatureRegistry.js';
import * as languages from '../../../../common/languages.js';
import { ParameterHintsModel } from '../../browser/parameterHintsModel.js';
import { createTestCodeEditor } from '../../../../test/browser/testCodeEditor.js';
import { createTextModel } from '../../../../test/common/testTextModel.js';
import { ServiceCollection } from '../../../../../platform/instantiation/common/serviceCollection.js';
import { InMemoryStorageService, IStorageService, } from '../../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { NullTelemetryService } from '../../../../../platform/telemetry/common/telemetryUtils.js';
const mockFile = URI.parse('test:somefile.ttt');
const mockFileSelector = { scheme: 'test' };
const emptySigHelp = {
    signatures: [
        {
            label: 'none',
            parameters: [],
        },
    ],
    activeParameter: 0,
    activeSignature: 0,
};
const emptySigHelpResult = {
    value: emptySigHelp,
    dispose: () => { },
};
suite('ParameterHintsModel', () => {
    const disposables = new DisposableStore();
    let registry;
    setup(() => {
        disposables.clear();
        registry = new LanguageFeatureRegistry();
    });
    teardown(() => {
        disposables.clear();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    function createMockEditor(fileContents) {
        const textModel = disposables.add(createTextModel(fileContents, undefined, undefined, mockFile));
        const editor = disposables.add(createTestCodeEditor(textModel, {
            serviceCollection: new ServiceCollection([ITelemetryService, NullTelemetryService], [IStorageService, disposables.add(new InMemoryStorageService())]),
        }));
        return editor;
    }
    function getNextHint(model) {
        return new Promise((resolve) => {
            const sub = disposables.add(model.onChangedHints((e) => {
                sub.dispose();
                return resolve(e ? { value: e, dispose: () => { } } : undefined);
            }));
        });
    }
    test('Provider should get trigger character on type', async () => {
        const { promise: donePromise, resolve: done } = promiseWithResolvers();
        const triggerChar = '(';
        const editor = createMockEditor('');
        disposables.add(new ParameterHintsModel(editor, registry));
        disposables.add(registry.register(mockFileSelector, new (class {
            constructor() {
                this.signatureHelpTriggerCharacters = [triggerChar];
                this.signatureHelpRetriggerCharacters = [];
            }
            provideSignatureHelp(_model, _position, _token, context) {
                assert.strictEqual(context.triggerKind, languages.SignatureHelpTriggerKind.TriggerCharacter);
                assert.strictEqual(context.triggerCharacter, triggerChar);
                done();
                return undefined;
            }
        })()));
        await runWithFakedTimers({ useFakeTimers: true }, async () => {
            editor.trigger('keyboard', "type" /* Handler.Type */, { text: triggerChar });
            await donePromise;
        });
    });
    test('Provider should be retriggered if already active', async () => {
        const { promise: donePromise, resolve: done } = promiseWithResolvers();
        const triggerChar = '(';
        const editor = createMockEditor('');
        disposables.add(new ParameterHintsModel(editor, registry));
        let invokeCount = 0;
        disposables.add(registry.register(mockFileSelector, new (class {
            constructor() {
                this.signatureHelpTriggerCharacters = [triggerChar];
                this.signatureHelpRetriggerCharacters = [];
            }
            provideSignatureHelp(_model, _position, _token, context) {
                ++invokeCount;
                try {
                    if (invokeCount === 1) {
                        assert.strictEqual(context.triggerKind, languages.SignatureHelpTriggerKind.TriggerCharacter);
                        assert.strictEqual(context.triggerCharacter, triggerChar);
                        assert.strictEqual(context.isRetrigger, false);
                        assert.strictEqual(context.activeSignatureHelp, undefined);
                        // Retrigger
                        setTimeout(() => editor.trigger('keyboard', "type" /* Handler.Type */, { text: triggerChar }), 0);
                    }
                    else {
                        assert.strictEqual(invokeCount, 2);
                        assert.strictEqual(context.triggerKind, languages.SignatureHelpTriggerKind.TriggerCharacter);
                        assert.strictEqual(context.isRetrigger, true);
                        assert.strictEqual(context.triggerCharacter, triggerChar);
                        assert.strictEqual(context.activeSignatureHelp, emptySigHelp);
                        done();
                    }
                    return emptySigHelpResult;
                }
                catch (err) {
                    console.error(err);
                    throw err;
                }
            }
        })()));
        await runWithFakedTimers({ useFakeTimers: true }, async () => {
            editor.trigger('keyboard', "type" /* Handler.Type */, { text: triggerChar });
            await donePromise;
        });
    });
    test('Provider should not be retriggered if previous help is canceled first', async () => {
        const { promise: donePromise, resolve: done } = promiseWithResolvers();
        const triggerChar = '(';
        const editor = createMockEditor('');
        const hintModel = disposables.add(new ParameterHintsModel(editor, registry));
        let invokeCount = 0;
        disposables.add(registry.register(mockFileSelector, new (class {
            constructor() {
                this.signatureHelpTriggerCharacters = [triggerChar];
                this.signatureHelpRetriggerCharacters = [];
            }
            provideSignatureHelp(_model, _position, _token, context) {
                try {
                    ++invokeCount;
                    if (invokeCount === 1) {
                        assert.strictEqual(context.triggerKind, languages.SignatureHelpTriggerKind.TriggerCharacter);
                        assert.strictEqual(context.triggerCharacter, triggerChar);
                        assert.strictEqual(context.isRetrigger, false);
                        assert.strictEqual(context.activeSignatureHelp, undefined);
                        // Cancel and retrigger
                        hintModel.cancel();
                        editor.trigger('keyboard', "type" /* Handler.Type */, { text: triggerChar });
                    }
                    else {
                        assert.strictEqual(invokeCount, 2);
                        assert.strictEqual(context.triggerKind, languages.SignatureHelpTriggerKind.TriggerCharacter);
                        assert.strictEqual(context.triggerCharacter, triggerChar);
                        assert.strictEqual(context.isRetrigger, true);
                        assert.strictEqual(context.activeSignatureHelp, undefined);
                        done();
                    }
                    return emptySigHelpResult;
                }
                catch (err) {
                    console.error(err);
                    throw err;
                }
            }
        })()));
        await runWithFakedTimers({ useFakeTimers: true }, () => {
            editor.trigger('keyboard', "type" /* Handler.Type */, { text: triggerChar });
            return donePromise;
        });
    });
    test('Provider should get last trigger character when triggered multiple times and only be invoked once', async () => {
        const { promise: donePromise, resolve: done } = promiseWithResolvers();
        const editor = createMockEditor('');
        disposables.add(new ParameterHintsModel(editor, registry, 5));
        let invokeCount = 0;
        disposables.add(registry.register(mockFileSelector, new (class {
            constructor() {
                this.signatureHelpTriggerCharacters = ['a', 'b', 'c'];
                this.signatureHelpRetriggerCharacters = [];
            }
            provideSignatureHelp(_model, _position, _token, context) {
                try {
                    ++invokeCount;
                    assert.strictEqual(context.triggerKind, languages.SignatureHelpTriggerKind.TriggerCharacter);
                    assert.strictEqual(context.isRetrigger, false);
                    assert.strictEqual(context.triggerCharacter, 'c');
                    // Give some time to allow for later triggers
                    setTimeout(() => {
                        assert.strictEqual(invokeCount, 1);
                        done();
                    }, 50);
                    return undefined;
                }
                catch (err) {
                    console.error(err);
                    throw err;
                }
            }
        })()));
        await runWithFakedTimers({ useFakeTimers: true }, async () => {
            editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'a' });
            editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'b' });
            editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'c' });
            await donePromise;
        });
    });
    test('Provider should be retriggered if already active', async () => {
        const { promise: donePromise, resolve: done } = promiseWithResolvers();
        const editor = createMockEditor('');
        disposables.add(new ParameterHintsModel(editor, registry, 5));
        let invokeCount = 0;
        disposables.add(registry.register(mockFileSelector, new (class {
            constructor() {
                this.signatureHelpTriggerCharacters = ['a', 'b'];
                this.signatureHelpRetriggerCharacters = [];
            }
            provideSignatureHelp(_model, _position, _token, context) {
                try {
                    ++invokeCount;
                    if (invokeCount === 1) {
                        assert.strictEqual(context.triggerKind, languages.SignatureHelpTriggerKind.TriggerCharacter);
                        assert.strictEqual(context.triggerCharacter, 'a');
                        // retrigger after delay for widget to show up
                        setTimeout(() => editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'b' }), 50);
                    }
                    else if (invokeCount === 2) {
                        assert.strictEqual(context.triggerKind, languages.SignatureHelpTriggerKind.TriggerCharacter);
                        assert.ok(context.isRetrigger);
                        assert.strictEqual(context.triggerCharacter, 'b');
                        done();
                    }
                    else {
                        assert.fail('Unexpected invoke');
                    }
                    return emptySigHelpResult;
                }
                catch (err) {
                    console.error(err);
                    throw err;
                }
            }
        })()));
        await runWithFakedTimers({ useFakeTimers: true }, () => {
            editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'a' });
            return donePromise;
        });
    });
    test('Should cancel existing request when new request comes in', async () => {
        const editor = createMockEditor('abc def');
        const hintsModel = disposables.add(new ParameterHintsModel(editor, registry));
        let didRequestCancellationOf = -1;
        let invokeCount = 0;
        const longRunningProvider = new (class {
            constructor() {
                this.signatureHelpTriggerCharacters = [];
                this.signatureHelpRetriggerCharacters = [];
            }
            provideSignatureHelp(_model, _position, token) {
                try {
                    const count = invokeCount++;
                    disposables.add(token.onCancellationRequested(() => {
                        didRequestCancellationOf = count;
                    }));
                    // retrigger on first request
                    if (count === 0) {
                        hintsModel.trigger({ triggerKind: languages.SignatureHelpTriggerKind.Invoke }, 0);
                    }
                    return new Promise((resolve) => {
                        setTimeout(() => {
                            resolve({
                                value: {
                                    signatures: [
                                        {
                                            label: '' + count,
                                            parameters: [],
                                        },
                                    ],
                                    activeParameter: 0,
                                    activeSignature: 0,
                                },
                                dispose: () => { },
                            });
                        }, 100);
                    });
                }
                catch (err) {
                    console.error(err);
                    throw err;
                }
            }
        })();
        disposables.add(registry.register(mockFileSelector, longRunningProvider));
        await runWithFakedTimers({ useFakeTimers: true }, async () => {
            hintsModel.trigger({ triggerKind: languages.SignatureHelpTriggerKind.Invoke }, 0);
            assert.strictEqual(-1, didRequestCancellationOf);
            return new Promise((resolve, reject) => disposables.add(hintsModel.onChangedHints((newParamterHints) => {
                try {
                    assert.strictEqual(0, didRequestCancellationOf);
                    assert.strictEqual('1', newParamterHints.signatures[0].label);
                    resolve();
                }
                catch (e) {
                    reject(e);
                }
            })));
        });
    });
    test('Provider should be retriggered by retrigger character', async () => {
        const { promise: donePromise, resolve: done } = promiseWithResolvers();
        const triggerChar = 'a';
        const retriggerChar = 'b';
        const editor = createMockEditor('');
        disposables.add(new ParameterHintsModel(editor, registry, 5));
        let invokeCount = 0;
        disposables.add(registry.register(mockFileSelector, new (class {
            constructor() {
                this.signatureHelpTriggerCharacters = [triggerChar];
                this.signatureHelpRetriggerCharacters = [retriggerChar];
            }
            provideSignatureHelp(_model, _position, _token, context) {
                try {
                    ++invokeCount;
                    if (invokeCount === 1) {
                        assert.strictEqual(context.triggerKind, languages.SignatureHelpTriggerKind.TriggerCharacter);
                        assert.strictEqual(context.triggerCharacter, triggerChar);
                        // retrigger after delay for widget to show up
                        setTimeout(() => editor.trigger('keyboard', "type" /* Handler.Type */, { text: retriggerChar }), 50);
                    }
                    else if (invokeCount === 2) {
                        assert.strictEqual(context.triggerKind, languages.SignatureHelpTriggerKind.TriggerCharacter);
                        assert.ok(context.isRetrigger);
                        assert.strictEqual(context.triggerCharacter, retriggerChar);
                        done();
                    }
                    else {
                        assert.fail('Unexpected invoke');
                    }
                    return emptySigHelpResult;
                }
                catch (err) {
                    console.error(err);
                    throw err;
                }
            }
        })()));
        await runWithFakedTimers({ useFakeTimers: true }, async () => {
            // This should not trigger anything
            editor.trigger('keyboard', "type" /* Handler.Type */, { text: retriggerChar });
            // But a trigger character should
            editor.trigger('keyboard', "type" /* Handler.Type */, { text: triggerChar });
            return donePromise;
        });
    });
    test('should use first result from multiple providers', async () => {
        const triggerChar = 'a';
        const firstProviderId = 'firstProvider';
        const secondProviderId = 'secondProvider';
        const paramterLabel = 'parameter';
        const editor = createMockEditor('');
        const model = disposables.add(new ParameterHintsModel(editor, registry, 5));
        disposables.add(registry.register(mockFileSelector, new (class {
            constructor() {
                this.signatureHelpTriggerCharacters = [triggerChar];
                this.signatureHelpRetriggerCharacters = [];
            }
            async provideSignatureHelp(_model, _position, _token, context) {
                try {
                    if (!context.isRetrigger) {
                        // retrigger after delay for widget to show up
                        setTimeout(() => editor.trigger('keyboard', "type" /* Handler.Type */, { text: triggerChar }), 50);
                        return {
                            value: {
                                activeParameter: 0,
                                activeSignature: 0,
                                signatures: [
                                    {
                                        label: firstProviderId,
                                        parameters: [{ label: paramterLabel }],
                                    },
                                ],
                            },
                            dispose: () => { },
                        };
                    }
                    return undefined;
                }
                catch (err) {
                    console.error(err);
                    throw err;
                }
            }
        })()));
        disposables.add(registry.register(mockFileSelector, new (class {
            constructor() {
                this.signatureHelpTriggerCharacters = [triggerChar];
                this.signatureHelpRetriggerCharacters = [];
            }
            async provideSignatureHelp(_model, _position, _token, context) {
                if (context.isRetrigger) {
                    return {
                        value: {
                            activeParameter: 0,
                            activeSignature: context.activeSignatureHelp
                                ? context.activeSignatureHelp.activeSignature + 1
                                : 0,
                            signatures: [
                                {
                                    label: secondProviderId,
                                    parameters: context.activeSignatureHelp
                                        ? context.activeSignatureHelp.signatures[0].parameters
                                        : [],
                                },
                            ],
                        },
                        dispose: () => { },
                    };
                }
                return undefined;
            }
        })()));
        await runWithFakedTimers({ useFakeTimers: true }, async () => {
            editor.trigger('keyboard', "type" /* Handler.Type */, { text: triggerChar });
            const firstHint = (await getNextHint(model)).value;
            assert.strictEqual(firstHint.signatures[0].label, firstProviderId);
            assert.strictEqual(firstHint.activeSignature, 0);
            assert.strictEqual(firstHint.signatures[0].parameters[0].label, paramterLabel);
            const secondHint = (await getNextHint(model)).value;
            assert.strictEqual(secondHint.signatures[0].label, secondProviderId);
            assert.strictEqual(secondHint.activeSignature, 1);
            assert.strictEqual(secondHint.signatures[0].parameters[0].label, paramterLabel);
        });
    });
    test('Quick typing should use the first trigger character', async () => {
        const editor = createMockEditor('');
        const model = disposables.add(new ParameterHintsModel(editor, registry, 50));
        const triggerCharacter = 'a';
        let invokeCount = 0;
        disposables.add(registry.register(mockFileSelector, new (class {
            constructor() {
                this.signatureHelpTriggerCharacters = [triggerCharacter];
                this.signatureHelpRetriggerCharacters = [];
            }
            provideSignatureHelp(_model, _position, _token, context) {
                try {
                    ++invokeCount;
                    if (invokeCount === 1) {
                        assert.strictEqual(context.triggerKind, languages.SignatureHelpTriggerKind.TriggerCharacter);
                        assert.strictEqual(context.triggerCharacter, triggerCharacter);
                    }
                    else {
                        assert.fail('Unexpected invoke');
                    }
                    return emptySigHelpResult;
                }
                catch (err) {
                    console.error(err);
                    throw err;
                }
            }
        })()));
        await runWithFakedTimers({ useFakeTimers: true }, async () => {
            editor.trigger('keyboard', "type" /* Handler.Type */, { text: triggerCharacter });
            editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'x' });
            await getNextHint(model);
        });
    });
    test('Retrigger while a pending resolve is still going on should preserve last active signature #96702', async () => {
        const { promise: donePromise, resolve: done } = promiseWithResolvers();
        const editor = createMockEditor('');
        const model = disposables.add(new ParameterHintsModel(editor, registry, 50));
        const triggerCharacter = 'a';
        const retriggerCharacter = 'b';
        let invokeCount = 0;
        disposables.add(registry.register(mockFileSelector, new (class {
            constructor() {
                this.signatureHelpTriggerCharacters = [triggerCharacter];
                this.signatureHelpRetriggerCharacters = [retriggerCharacter];
            }
            async provideSignatureHelp(_model, _position, _token, context) {
                try {
                    ++invokeCount;
                    if (invokeCount === 1) {
                        assert.strictEqual(context.triggerKind, languages.SignatureHelpTriggerKind.TriggerCharacter);
                        assert.strictEqual(context.triggerCharacter, triggerCharacter);
                        setTimeout(() => editor.trigger('keyboard', "type" /* Handler.Type */, { text: retriggerCharacter }), 50);
                    }
                    else if (invokeCount === 2) {
                        // Trigger again while we wait for resolve to take place
                        setTimeout(() => editor.trigger('keyboard', "type" /* Handler.Type */, { text: retriggerCharacter }), 50);
                        await new Promise((resolve) => setTimeout(resolve, 1000));
                    }
                    else if (invokeCount === 3) {
                        // Make sure that in a retrigger during a pending resolve, we still have the old active signature.
                        assert.strictEqual(context.activeSignatureHelp, emptySigHelp);
                        done();
                    }
                    else {
                        assert.fail('Unexpected invoke');
                    }
                    return emptySigHelpResult;
                }
                catch (err) {
                    console.error(err);
                    done(err);
                    throw err;
                }
            }
        })()));
        await runWithFakedTimers({ useFakeTimers: true }, async () => {
            editor.trigger('keyboard', "type" /* Handler.Type */, { text: triggerCharacter });
            await getNextHint(model);
            await getNextHint(model);
            await donePromise;
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFyYW1ldGVySGludHNNb2RlbC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9wYXJhbWV0ZXJIaW50cy90ZXN0L2Jyb3dzZXIvcGFyYW1ldGVySGludHNNb2RlbC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUUxRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDekUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBQzNGLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBR2xHLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQ3ZGLE9BQU8sS0FBSyxTQUFTLE1BQU0saUNBQWlDLENBQUE7QUFFNUQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDMUUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDakYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1FQUFtRSxDQUFBO0FBQ3JHLE9BQU8sRUFDTixzQkFBc0IsRUFDdEIsZUFBZSxHQUNmLE1BQU0sbURBQW1ELENBQUE7QUFDMUQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDekYsT0FBTyxFQUFFLG9CQUFvQixFQUFF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