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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZXJuYWxVcmlPcGVuZXJTZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9leHRlcm5hbFVyaU9wZW5lci90ZXN0L2NvbW1vbi9leHRlcm5hbFVyaU9wZW5lclNlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDOUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNyRixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdkQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbEcsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDckYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDckcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUE7QUFDeEgsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUE7QUFDeEgsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQ2hGLE9BQU8sRUFFTixrQkFBa0IsR0FHbEIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQ04sd0JBQXdCLEdBR3hCLE1BQU0sMENBQTBDLENBQUE7QUFFakQsTUFBTSxxQkFBcUI7SUFDMUIsWUFBNkIsU0FBaUI7UUFBakIsY0FBUyxHQUFULFNBQVMsQ0FBUTtJQUFHLENBQUM7SUFZM0MsS0FBSyxDQUFDLElBQUksQ0FDaEIsS0FBeUQsRUFDekQsT0FBOEMs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