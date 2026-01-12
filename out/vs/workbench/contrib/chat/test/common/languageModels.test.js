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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VNb2RlbHMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC90ZXN0L2NvbW1vbi9sYW5ndWFnZU1vZGVscy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ25HLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3BGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDOUQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQzFFLE9BQU8sRUFHTiwyQkFBMkIsRUFDM0IscUJBQXFCLEdBQ3JCLE1BQU0sZ0NBQWdDLENBQUE7QUFDdkMsT0FBTyxFQUVOLHdCQUF3QixHQUN4QixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDhEQUE4RCxDQUFBO0FBQ2pHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHlFQUF5RSxDQUFBO0FBRS9HLEtBQUssQ0FBQyxnQkFBZ0IsRUFBRTtJQUN2QixJQUFJLGNBQXFDLENBQUE7SUFFekMsTUFBTSxLQUFLLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtJQUNuQyxNQUFNLGdCQUFnQixHQUFHLElBQUksR0FBRyxFQUFVLENBQUE7SUFFMUMsS0FBSyxDQUFDO1FBQ0wsY0FBYyxHQUFHLElB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