/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { AsyncIterableSource, DeferredPromise, timeout } from '../../../../../base/common/async.js';
import { CancellationTokenSource } from '../../../../../base/common/cancellation.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { mock } from '../../../../../base/test/common/mock.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { languageModelExtensionPoint, LanguageModelsService, } from '../../common/languageModels.js';
import { nullExtensionDescription, } from '../../../../services/extensions/common/extensions.js';
import { ExtensionsRegistry } from '../../../../services/extensions/common/extensionsRegistry.js';
import { MockContextKeyService } from '../../../../../platform/keybinding/test/common/mockKeybindingService.js';
suite('LanguageModels', function () {
    let languageModels;
    const store = new DisposableStore();
    const activationEvents = new Set();
    setup(function () {
        languageModels = new LanguageModelsService(new (class extends mock() {
            activateByEvent(name) {
                activationEvents.add(name);
                return Promise.resolve();
            }
        })(), new NullLogService(), new MockContextKeyService());
        const ext = ExtensionsRegistry.getExtensionPoints().find((e) => e.name === languageModelExtensionPoint.name);
        ext.acceptUsers([
            {
                description: { ...nullExtensionDescription, enabledApiProposals: ['chatProvider'] },
                value: { vendor: 'test-vendor' },
                collector: null,
            },
        ]);
        store.add(languageModels.registerLanguageModelChat('1', {
            metadata: {
                extension: nullExtensionDescription.identifier,
                name: 'Pretty Name',
                vendor: 'test-vendor',
                family: 'test-family',
                version: 'test-version',
                id: 'test-id',
                maxInputTokens: 100,
                maxOutputTokens: 100,
            },
            sendChatRequest: async () => {
                throw new Error();
            },
            provideTokenCount: async () => {
                throw new Error();
            },
        }));
        store.add(languageModels.registerLanguageModelChat('12', {
            metadata: {
                extension: nullExtensionDescription.identifier,
                name: 'Pretty Name',
                vendor: 'test-vendor',
                family: 'test2-family',
                version: 'test2-version',
                id: 'test-id',
                maxInputTokens: 100,
                maxOutputTokens: 100,
            },
            sendChatRequest: async () => {
                throw new Error();
            },
            provideTokenCount: async () => {
                throw new Error();
            },
        }));
    });
    teardown(function () {
        languageModels.dispose();
        activationEvents.clear();
        store.clear();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('empty selector returns all', async function () {
        const result1 = await languageModels.selectLanguageModels({});
        assert.deepStrictEqual(result1.length, 2);
        assert.deepStrictEqual(result1[0], '1');
        assert.deepStrictEqual(result1[1], '12');
    });
    test('no warning that a matching model was not found #213716', async function () {
        const result1 = await languageModels.selectLanguageModels({ vendor: 'test-vendor' });
        assert.deepStrictEqual(result1.length, 2);
        const result2 = await languageModels.selectLanguageModels({
            vendor: 'test-vendor',
            family: 'FAKE',
        });
        assert.deepStrictEqual(result2.length, 0);
    });
    test('sendChatRequest returns a response-stream', async function () {
        store.add(languageModels.registerLanguageModelChat('actual', {
            metadata: {
                extension: nullExtensionDescription.identifier,
                name: 'Pretty Name',
                vendor: 'test-vendor',
                family: 'actual-family',
                version: 'actual-version',
                id: 'actual-lm',
                maxInputTokens: 100,
                maxOutputTokens: 100,
            },
            sendChatRequest: async (messages, _from, _options, token) => {
                // const message = messages.at(-1);
                const defer = new DeferredPromise();
                const stream = new AsyncIterableSource();
                (async () => {
                    while (!token.isCancellationRequested) {
                        stream.emitOne({ index: 0, part: { type: 'text', value: Date.now().toString() } });
                        await timeout(10);
                    }
                    defer.complete(undefined);
                })();
                return {
                    stream: stream.asyncIterable,
                    result: defer.p,
                };
            },
            provideTokenCount: async () => {
                throw new Error();
            },
        }));
        const models = await languageModels.selectLanguageModels({ id: 'actual-lm' });
        assert.ok(models.length === 1);
        const first = models[0];
        const cts = new CancellationTokenSource();
        const request = await languageModels.sendChatRequest(first, nullExtensionDescription.identifier, [{ role: 1 /* ChatMessageRole.User */, content: [{ type: 'text', value: 'hello' }] }], {}, cts.token);
        assert.ok(request);
        cts.dispose(true);
        await request.result;
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VNb2RlbHMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvdGVzdC9jb21tb24vbGFuZ3VhZ2VNb2RlbHMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLG1CQUFtQixFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUNuRyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNwRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDekUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzlELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUMxRSxPQUFPLEVBR04sMkJBQTJCLEVBQzNCLHFCQUFxQixHQUNyQixNQUFNLGdDQUFnQyxDQUFBO0FBQ3ZDLE9BQU8sRUFFTix3QkFBd0IsR0FDeEIsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQTtBQUNqRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx5RUFBeUUsQ0FBQTtBQUUvRyxLQUFLLENBQUMsZ0JBQWdCLEVBQUU7SUFDdkIsSUFBSSxjQUFxQyxDQUFBO0lBRXpDLE1BQU0sS0FBSyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7SUFDbkMsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLEdBQUcsRUFBVSxDQUFBO0lBRTFDLEtBQUssQ0FBQztRQUNMLGNBQWMsR0FBRyxJQUFJLHFC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