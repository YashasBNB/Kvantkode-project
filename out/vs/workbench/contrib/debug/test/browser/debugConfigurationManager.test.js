/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { Event } from '../../../../../base/common/event.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { URI } from '../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { ContextKeyService } from '../../../../../platform/contextkey/browser/contextKeyService.js';
import { FileService } from '../../../../../platform/files/common/fileService.js';
import { ServiceCollection } from '../../../../../platform/instantiation/common/serviceCollection.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { UriIdentityService } from '../../../../../platform/uriIdentity/common/uriIdentityService.js';
import { ConfigurationManager } from '../../browser/debugConfigurationManager.js';
import { DebugConfigurationProviderTriggerKind, } from '../../common/debug.js';
import { IPreferencesService } from '../../../../services/preferences/common/preferences.js';
import { TestQuickInputService } from '../../../../test/browser/workbenchTestServices.js';
import { TestHistoryService, TestContextService, TestExtensionService, TestStorageService, } from '../../../../test/common/workbenchTestServices.js';
suite('debugConfigurationManager', () => {
    const configurationProviderType = 'custom-type';
    let _debugConfigurationManager;
    let disposables;
    const adapterManager = {
        getDebugAdapterDescriptor(session, config) {
            return Promise.resolve(undefined);
        },
        activateDebuggers(activationEvent, debugType) {
            return Promise.resolve();
        },
        get onDidDebuggersExtPointRead() {
            return Event.None;
        },
    };
    const preferencesService = {
        userSettingsResource: URI.file('/tmp/settings.json'),
    };
    const configurationService = new TestConfigurationService();
    setup(() => {
        disposables = new DisposableStore();
        const fileService = disposables.add(new FileService(new NullLogService()));
        const instantiationService = disposables.add(new TestInstantiationService(new ServiceCollection([IPreferencesService, preferencesService], [IConfigurationService, configurationService])));
        _debugConfigurationManager = new ConfigurationManager(adapterManager, new TestContextService(), configurationService, new TestQuickInputService(), instantiationService, new TestStorageService(), new TestExtensionService(), new TestHistoryService(), new UriIdentityService(fileService), new ContextKeyService(configurationService), new NullLogService());
    });
    teardown(() => disposables.dispose());
    ensureNoDisposablesAreLeakedInTestSuite();
    test('resolves configuration based on type', async () => {
        disposables.add(_debugConfigurationManager.registerDebugConfigurationProvider({
            type: configurationProviderType,
            resolveDebugConfiguration: (folderUri, config, token) => {
                assert.strictEqual(config.type, configurationProviderType);
                return Promise.resolve({
                    ...config,
                    configurationResolved: true,
                });
            },
            triggerKind: DebugConfigurationProviderTriggerKind.Initial,
        }));
        const initialConfig = {
            type: configurationProviderType,
            request: 'launch',
            name: 'configName',
        };
        const resultConfig = await _debugConfigurationManager.resolveConfigurationByProviders(undefined, configurationProviderType, initialConfig, CancellationToken.None);
        assert.strictEqual(resultConfig.configurationResolved, true, 'Configuration should be updated by test provider');
    });
    test('resolves configuration from second provider if type changes', async () => {
        const secondProviderType = 'second-provider';
        disposables.add(_debugConfigurationManager.registerDebugConfigurationProvider({
            type: configurationProviderType,
            resolveDebugConfiguration: (folderUri, config, token) => {
                assert.strictEqual(config.type, configurationProviderType);
                return Promise.resolve({
                    ...config,
                    type: secondProviderType,
                });
            },
            triggerKind: DebugConfigurationProviderTriggerKind.Initial,
        }));
        disposables.add(_debugConfigurationManager.registerDebugConfigurationProvider({
            type: secondProviderType,
            resolveDebugConfiguration: (folderUri, config, token) => {
                assert.strictEqual(config.type, secondProviderType);
                return Promise.resolve({
                    ...config,
                    configurationResolved: true,
                });
            },
            triggerKind: DebugConfigurationProviderTriggerKind.Initial,
        }));
        const initialConfig = {
            type: configurationProviderType,
            request: 'launch',
            name: 'configName',
        };
        const resultConfig = await _debugConfigurationManager.resolveConfigurationByProviders(undefined, configurationProviderType, initialConfig, CancellationToken.None);
        assert.strictEqual(resultConfig.type, secondProviderType);
        assert.strictEqual(resultConfig.configurationResolved, true, 'Configuration should be updated by test provider');
    });
    teardown(() => disposables.clear());
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdDb25maWd1cmF0aW9uTWFuYWdlci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvdGVzdC9icm93c2VyL2RlYnVnQ29uZmlndXJhdGlvbk1hbmFnZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDOUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdkQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDckcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUE7QUFDeEgsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0saUVBQWlFLENBQUE7QUFDbkcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1FQUFtRSxDQUFBO0FBQ3JHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxDQUFBO0FBQ3hILE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQTtBQUNyRyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNqRixP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