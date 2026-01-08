/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Barrier, timeout } from '../../../../../base/common/async.js';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { Emitter, Event } from '../../../../../base/common/event.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { mock } from '../../../../../base/test/common/mock.js';
import { runWithFakedTimers } from '../../../../../base/test/common/timeTravelScheduler.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { Range } from '../../../../common/core/range.js';
import { ILanguageService } from '../../../../common/languages/language.js';
import { ILanguageConfigurationService } from '../../../../common/languages/languageConfigurationRegistry.js';
import { LanguageFeatureDebounceService } from '../../../../common/services/languageFeatureDebounce.js';
import { LanguageFeaturesService } from '../../../../common/services/languageFeaturesService.js';
import { LanguageService } from '../../../../common/services/languageService.js';
import { ModelService } from '../../../../common/services/modelService.js';
import { SemanticTokensStylingService } from '../../../../common/services/semanticTokensStylingService.js';
import { DocumentSemanticTokensFeature } from '../../browser/documentSemanticTokens.js';
import { getDocumentSemanticTokens, isSemanticTokens } from '../../common/getSemanticTokens.js';
import { TestLanguageConfigurationService } from '../../../../test/common/modes/testLanguageConfigurationService.js';
import { TestTextResourcePropertiesService } from '../../../../test/common/services/testTextResourcePropertiesService.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { TestDialogService } from '../../../../../platform/dialogs/test/common/testDialogService.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { TestNotificationService } from '../../../../../platform/notification/test/common/testNotificationService.js';
import { ColorScheme } from '../../../../../platform/theme/common/theme.js';
import { TestColorTheme, TestThemeService, } from '../../../../../platform/theme/test/common/testThemeService.js';
import { UndoRedoService } from '../../../../../platform/undoRedo/common/undoRedoService.js';
suite('ModelSemanticColoring', () => {
    const disposables = new DisposableStore();
    let modelService;
    let languageService;
    let languageFeaturesService;
    setup(() => {
        const configService = new TestConfigurationService({ editor: { semanticHighlighting: true } });
        const themeService = new TestThemeService();
        themeService.setTheme(new TestColorTheme({}, ColorScheme.DARK, true));
        const logService = new NullLogService();
        languageFeaturesService = new LanguageFeaturesService();
        languageService = disposables.add(new LanguageService(false));
        const semanticTokensStylingService = disposables.add(new SemanticTokensStylingService(themeService, logService, languageService));
        const instantiationService = new TestInstantiationService();
        instantiationService.set(ILanguageService, languageService);
        instantiationService.set(ILanguageConfigurationService, new TestLanguageConfigurationService());
        modelService = disposables.add(new ModelService(configService, new TestTextResourcePropertiesService(configService), new UndoRedoService(new TestDialogService(), new TestNotificationService()), instantiationService));
        const envService = new (class extends mock() {
            constructor() {
                super(...arguments);
                this.isBuilt = true;
                this.isExtensionDevelopment = false;
            }
        })();
        disposables.add(new DocumentSemanticTokensFeature(semanticTokensStylingService, modelService, themeService, configService, new LanguageFeatureDebounceService(logService, envService), languageFeaturesService));
    });
    teardown(() => {
        disposables.clear();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('DocumentSemanticTokens should be fetched when the result is empty if there are pending changes', async () => {
        await runWithFakedTimers({}, async () => {
            disposables.add(languageService.registerLanguage({ id: 'testMode' }));
            const inFirstCall = new Barrier();
            const delayFirstResult = new Barrier();
            const secondResultProvided = new Barrier();
            let callCount = 0;
            disposables.add(languageFeaturesService.documentSemanticTokensProvider.register('testMode', new (class {
                getLegend() {
                    return { tokenTypes: ['class'], tokenModifiers: [] };
                }
                async provideDocumentSemanticTokens(model, lastResultId, token) {
                    callCount++;
                    if (callCount === 1) {
                        assert.ok('called once');
                        inFirstCall.open();
                        await delayFirstResult.wait();
                        await timeout(0); // wait for the simple scheduler to fire to check that we do actually get rescheduled
                        return null;
                    }
                    if (callCount === 2) {
                        assert.ok('called twice');
                        secondResultProvided.open();
                        return null;
                    }
                    assert.fail('Unexpected call');
                }
                releaseDocumentSemanticTokens(resultId) { }
            })()));
            const textModel = disposables.add(modelService.createModel('Hello world', languageService.createById('testMode')));
            // pretend the text model is attached to an editor (so that semantic tokens are computed)
            textModel.onBeforeAttached();
            // wait for the provider to be called
            await inFirstCall.wait();
            // the provider is now in the provide call
            // change the text buffer while the provider is running
            textModel.applyEdits([{ range: new Range(1, 1, 1, 1), text: 'x' }]);
            // let the provider finish its first result
            delayFirstResult.open();
            // we need to check that the provider is called again, even if it returns null
            await secondResultProvided.wait();
            // assert that it got called twice
            assert.strictEqual(callCount, 2);
        });
    });
    test('issue #149412: VS Code hangs when bad semantic token data is received', async () => {
        await runWithFakedTimers({}, async () => {
            disposables.add(languageService.registerLanguage({ id: 'testMode' }));
            let lastResult = null;
            disposables.add(languageFeaturesService.documentSemanticTokensProvider.register('testMode', new (class {
                getLegend() {
                    return { tokenTypes: ['class'], tokenModifiers: [] };
                }
                async provideDocumentSemanticTokens(model, lastResultId, token) {
                    if (!lastResultId) {
                        // this is the first call
                        lastResult = {
                            resultId: '1',
                            data: new Uint32Array([4294967293, 0, 7, 16, 0, 1, 4, 3, 11, 1]),
                        };
                    }
                    else {
                        // this is the second call
                        lastResult = {
                            resultId: '2',
                            edits: [
                                {
                                    start: 4294967276,
                                    deleteCount: 0,
                                    data: new Uint32Array([2, 0, 3, 11, 0]),
                                },
                            ],
                        };
                    }
                    return lastResult;
                }
                releaseDocumentSemanticTokens(resultId) { }
            })()));
            const textModel = disposables.add(modelService.createModel('', languageService.createById('testMode')));
            // pretend the text model is attached to an editor (so that semantic tokens are computed)
            textModel.onBeforeAttached();
            // wait for the semantic tokens to be fetched
            await Event.toPromise(textModel.onDidChangeTokens);
            assert.strictEqual(lastResult.resultId, '1');
            // edit the text
            textModel.applyEdits([{ range: new Range(1, 1, 1, 1), text: 'foo' }]);
            // wait for the semantic tokens to be fetched again
            await Event.toPromise(textModel.onDidChangeTokens);
            assert.strictEqual(lastResult.resultId, '2');
        });
    });
    test("issue #161573: onDidChangeSemanticTokens doesn't consistently trigger provideDocumentSemanticTokens", async () => {
        await runWithFakedTimers({}, async () => {
            disposables.add(languageService.registerLanguage({ id: 'testMode' }));
            const emitter = new Emitter();
            let requestCount = 0;
            disposables.add(languageFeaturesService.documentSemanticTokensProvider.register('testMode', new (class {
                constructor() {
                    this.onDidChange = emitter.event;
                }
                getLegend() {
                    return { tokenTypes: ['class'], tokenModifiers: [] };
                }
                async provideDocumentSemanticTokens(model, lastResultId, token) {
                    requestCount++;
                    if (requestCount === 1) {
                        await timeout(1000);
                        // send a change event
                        emitter.fire();
                        await timeout(1000);
                        return null;
                    }
                    return null;
                }
                releaseDocumentSemanticTokens(resultId) { }
            })()));
            const textModel = disposables.add(modelService.createModel('', languageService.createById('testMode')));
            // pretend the text model is attached to an editor (so that semantic tokens are computed)
            textModel.onBeforeAttached();
            await timeout(5000);
            assert.deepStrictEqual(requestCount, 2);
        });
    });
    test('DocumentSemanticTokens should be pick the token provider with actual items', async () => {
        await runWithFakedTimers({}, async () => {
            let callCount = 0;
            disposables.add(languageService.registerLanguage({ id: 'testMode2' }));
            disposables.add(languageFeaturesService.documentSemanticTokensProvider.register('testMode2', new (class {
                getLegend() {
                    return { tokenTypes: ['class1'], tokenModifiers: [] };
                }
                async provideDocumentSemanticTokens(model, lastResultId, token) {
                    callCount++;
                    // For a secondary request return a different value
                    if (lastResultId) {
                        return {
                            data: new Uint32Array([2, 1, 1, 1, 1, 0, 2, 1, 1, 1]),
                        };
                    }
                    return {
                        resultId: '1',
                        data: new Uint32Array([0, 1, 1, 1, 1, 0, 2, 1, 1, 1]),
                    };
                }
                releaseDocumentSemanticTokens(resultId) { }
            })()));
            disposables.add(languageFeaturesService.documentSemanticTokensProvider.register('testMode2', new (class {
                getLegend() {
                    return { tokenTypes: ['class2'], tokenModifiers: [] };
                }
                async provideDocumentSemanticTokens(model, lastResultId, token) {
                    callCount++;
                    return null;
                }
                releaseDocumentSemanticTokens(resultId) { }
            })()));
            function toArr(arr) {
                const result = [];
                for (let i = 0; i < arr.length; i++) {
                    result[i] = arr[i];
                }
                return result;
            }
            const textModel = modelService.createModel('Hello world 2', languageService.createById('testMode2'));
            try {
                let result = await getDocumentSemanticTokens(languageFeaturesService.documentSemanticTokensProvider, textModel, null, null, CancellationToken.None);
                assert.ok(result, `We should have tokens (1)`);
                assert.ok(result.tokens, `Tokens are found from multiple providers (1)`);
                assert.ok(isSemanticTokens(result.tokens), `Tokens are full (1)`);
                assert.ok(result.tokens.resultId, `Token result id found from multiple providers (1)`);
                assert.deepStrictEqual(toArr(result.tokens.data), [0, 1, 1, 1, 1, 0, 2, 1, 1, 1], `Token data returned for multiple providers (1)`);
                assert.deepStrictEqual(callCount, 2, `Called both token providers (1)`);
                assert.deepStrictEqual(result.provider.getLegend(), { tokenTypes: ['class1'], tokenModifiers: [] }, `Legend matches the tokens (1)`);
                // Make a second request. Make sure we get the secondary value
                result = await getDocumentSemanticTokens(languageFeaturesService.documentSemanticTokensProvider, textModel, result.provider, result.tokens.resultId, CancellationToken.None);
                assert.ok(result, `We should have tokens (2)`);
                assert.ok(result.tokens, `Tokens are found from multiple providers (2)`);
                assert.ok(isSemanticTokens(result.tokens), `Tokens are full (2)`);
                assert.ok(!result.tokens.resultId, `Token result id found from multiple providers (2)`);
                assert.deepStrictEqual(toArr(result.tokens.data), [2, 1, 1, 1, 1, 0, 2, 1, 1, 1], `Token data returned for multiple providers (2)`);
                assert.deepStrictEqual(callCount, 4, `Called both token providers (2)`);
                assert.deepStrictEqual(result.provider.getLegend(), { tokenTypes: ['class1'], tokenModifiers: [] }, `Legend matches the tokens (2)`);
            }
            finally {
                disposables.clear();
                // Wait for scheduler to finish
                await timeout(0);
                // Now dispose the text model
                textModel.dispose();
            }
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9jdW1lbnRTZW1hbnRpY1Rva2Vucy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9zZW1hbnRpY1Rva2Vucy90ZXN0L2Jyb3dzZXIvZG9jdW1lbnRTZW1hbnRpY1Rva2Vucy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQzlFLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDcEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUMzRixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFPeEQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDM0UsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFFN0csT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFFdkcsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBRWhGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFB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