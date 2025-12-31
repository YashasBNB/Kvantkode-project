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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFyYW1ldGVySGludHNNb2RlbC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvcGFyYW1ldGVySGludHMvdGVzdC9icm93c2VyL3BhcmFtZXRlckhpbnRzTW9kZWwudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFFMUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUMzRixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUdsRyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUN2RixPQUFPLEtBQUssU0FBUyxNQUFNLGlDQUFpQyxDQUFBO0FBRTVELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtRUFBbUUsQ0FBQTtBQUNyRyxPQUFPLEVBQ04sc0JBQXNCLEVBQ3RCLGVBQWUsR0FDZixNQUFNLG1EQUFtRCxDQUFBO0FBQzFELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBRWpH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