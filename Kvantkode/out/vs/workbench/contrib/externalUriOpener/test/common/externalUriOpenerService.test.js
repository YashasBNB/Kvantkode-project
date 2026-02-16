/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { Disposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { URI } from '../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { ExternalUriOpenerPriority } from '../../../../../editor/common/languages.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { IOpenerService } from '../../../../../platform/opener/common/opener.js';
import { IQuickInputService, } from '../../../../../platform/quickinput/common/quickInput.js';
import { ExternalUriOpenerService, } from '../../common/externalUriOpenerService.js';
class MockQuickInputService {
    constructor(pickIndex) {
        this.pickIndex = pickIndex;
    }
    async pick(picks, options, token) {
        const resolvedPicks = await picks;
        const item = resolvedPicks[this.pickIndex];
        if (item.type === 'separator') {
            return undefined;
        }
        return item;
    }
}
suite('ExternalUriOpenerService', () => {
    let disposables;
    let instantiationService;
    setup(() => {
        disposables = new DisposableStore();
        instantiationService = disposables.add(new TestInstantiationService());
        instantiationService.stub(IConfigurationService, new TestConfigurationService());
        instantiationService.stub(IOpenerService, {
            registerExternalOpener: () => {
                return Disposable.None;
            },
        });
    });
    teardown(() => {
        disposables.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('Should not open if there are no openers', async () => {
        const externalUriOpenerService = disposables.add(instantiationService.createInstance(ExternalUriOpenerService));
        externalUriOpenerService.registerExternalOpenerProvider(new (class {
            async *getOpeners(_targetUri) {
                // noop
            }
        })());
        const uri = URI.parse('http://contoso.com');
        const didOpen = await externalUriOpenerService.openExternal(uri.toString(), { sourceUri: uri }, CancellationToken.None);
        assert.strictEqual(didOpen, false);
    });
    test('Should prompt if there is at least one enabled opener', async () => {
        instantiationService.stub(IQuickInputService, new MockQuickInputService(0));
        const externalUriOpenerService = disposables.add(instantiationService.createInstance(ExternalUriOpenerService));
        let openedWithEnabled = false;
        externalUriOpenerService.registerExternalOpenerProvider(new (class {
            async *getOpeners(_targetUri) {
                yield {
                    id: 'disabled-id',
                    label: 'disabled',
                    canOpen: async () => ExternalUriOpenerPriority.None,
                    openExternalUri: async () => true,
                };
                yield {
                    id: 'enabled-id',
                    label: 'enabled',
                    canOpen: async () => ExternalUriOpenerPriority.Default,
                    openExternalUri: async () => {
                        openedWithEnabled = true;
                        return true;
                    },
                };
            }
        })());
        const uri = URI.parse('http://contoso.com');
        const didOpen = await externalUriOpenerService.openExternal(uri.toString(), { sourceUri: uri }, CancellationToken.None);
        assert.strictEqual(didOpen, true);
        assert.strictEqual(openedWithEnabled, true);
    });
    test('Should automatically pick single preferred opener without prompt', async () => {
        const externalUriOpenerService = disposables.add(instantiationService.createInstance(ExternalUriOpenerService));
        let openedWithPreferred = false;
        externalUriOpenerService.registerExternalOpenerProvider(new (class {
            async *getOpeners(_targetUri) {
                yield {
                    id: 'other-id',
                    label: 'other',
                    canOpen: async () => ExternalUriOpenerPriority.Default,
                    openExternalUri: async () => {
                        return true;
                    },
                };
                yield {
                    id: 'preferred-id',
                    label: 'preferred',
                    canOpen: async () => ExternalUriOpenerPriority.Preferred,
                    openExternalUri: async () => {
                        openedWithPreferred = true;
                        return true;
                    },
                };
            }
        })());
        const uri = URI.parse('http://contoso.com');
        const didOpen = await externalUriOpenerService.openExternal(uri.toString(), { sourceUri: uri }, CancellationToken.None);
        assert.strictEqual(didOpen, true);
        assert.strictEqual(openedWithPreferred, true);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZXJuYWxVcmlPcGVuZXJTZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2V4dGVybmFsVXJpT3BlbmVyL3Rlc3QvY29tbW9uL2V4dGVybmFsVXJpT3BlbmVyU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNsRyxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUNyRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNyRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQTtBQUN4SCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQTtBQUN4SCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0saURBQWlELENBQUE7QUFDaEYsT0FBTyxFQUVOLGtCQUFrQixHQUdsQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFDTix3QkFBd0IsR0FHeEIsTUFBTSwwQ0FBMEMsQ0FBQTtBQUVqRCxNQUFNLHFCQUFxQjtJQUMxQixZQUE2QixTQUFpQjtRQUFqQixjQUFTLEdBQVQsU0FBUyxDQUFRO0lBQUcsQ0FBQztJQVkzQyxLQUFLLENBQUMsSUFBSSxD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