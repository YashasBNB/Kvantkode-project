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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9jdW1lbnRTZW1hbnRpY1Rva2Vucy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvc2VtYW50aWNUb2tlbnMvdGVzdC9icm93c2VyL2RvY3VtZW50U2VtYW50aWNUb2tlbnMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDOUQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDM0YsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBT3hELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQzNFLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBRTdHLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBRXZHLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBQ2hHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUVoRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNkNB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