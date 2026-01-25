/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import assert from 'assert';
import { Event } from '../../../../../base/common/event.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { mock } from '../../../../../base/test/common/mock.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { TestDialogService } from '../../../../../platform/dialogs/test/common/testDialogService.js';
import { IEnvironmentService, } from '../../../../../platform/environment/common/environment.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { createServices, } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { ILogService, NullLogService } from '../../../../../platform/log/common/log.js';
import { INotificationService } from '../../../../../platform/notification/common/notification.js';
import { TestNotificationService } from '../../../../../platform/notification/test/common/testNotificationService.js';
import product from '../../../../../platform/product/common/product.js';
import { IProductService } from '../../../../../platform/product/common/productService.js';
import { RemoteAuthorityResolverService } from '../../../../../platform/remote/browser/remoteAuthorityResolverService.js';
import { IRemoteAuthorityResolverService, } from '../../../../../platform/remote/common/remoteAuthorityResolver.js';
import { IRemoteExtensionsScannerService } from '../../../../../platform/remote/common/remoteExtensionsScanner.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { NullTelemetryService } from '../../../../../platform/telemetry/common/telemetryUtils.js';
import { IUriIdentityService } from '../../../../../platform/uriIdentity/common/uriIdentity.js';
import { UriIdentityService } from '../../../../../platform/uriIdentity/common/uriIdentityService.js';
import { IUserDataProfilesService, UserDataProfilesService, } from '../../../../../platform/userDataProfile/common/userDataProfile.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { IWorkspaceTrustEnablementService } from '../../../../../platform/workspace/common/workspaceTrust.js';
import { IWorkbenchEnvironmentService } from '../../../environment/common/environmentService.js';
import { IWebExtensionsScannerService, IWorkbenchExtensionEnablementService, IWorkbenchExtensionManagementService, } from '../../../extensionManagement/common/extensionManagement.js';
import { BrowserExtensionHostKindPicker } from '../../browser/extensionService.js';
import { AbstractExtensionService, } from '../../common/abstractExtensionService.js';
import { ExtensionManifestPropertiesService, IExtensionManifestPropertiesService, } from '../../common/extensionManifestPropertiesService.js';
import { IExtensionService } from '../../common/extensions.js';
import { ExtensionsProposedApi } from '../../common/extensionsProposedApi.js';
import { ILifecycleService } from '../../../lifecycle/common/lifecycle.js';
import { IRemoteAgentService } from '../../../remote/common/remoteAgentService.js';
import { IUserDataProfileService } from '../../../userDataProfile/common/userDataProfile.js';
import { WorkspaceTrustEnablementService } from '../../../workspaces/common/workspaceTrust.js';
import { TestEnvironmentService, TestFileService, TestLifecycleService, TestRemoteAgentService, TestRemoteExtensionsScannerService, TestUserDataProfileService, TestWebExtensionsScannerService, TestWorkbenchExtensionEnablementService, TestWorkbenchExtensionManagementService, } from '../../../../test/browser/workbenchTestServices.js';
import { TestContextService } from '../../../../test/common/workbenchTestServices.js';
suite('BrowserExtensionService', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('pickRunningLocation', () => {
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation([], false, false, 0 /* ExtensionRunningPreference.None */), null);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation([], false, true, 0 /* ExtensionRunningPreference.None */), null);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation([], true, false, 0 /* ExtensionRunningPreference.None */), null);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation([], true, true, 0 /* ExtensionRunningPreference.None */), null);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['ui'], false, false, 0 /* ExtensionRunningPreference.None */), null);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['ui'], false, true, 0 /* ExtensionRunningPreference.None */), 3 /* ExtensionHostKind.Remote */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['ui'], true, false, 0 /* ExtensionRunningPreference.None */), null);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['ui'], true, true, 0 /* ExtensionRunningPreference.None */), 3 /* ExtensionHostKind.Remote */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['workspace'], false, false, 0 /* ExtensionRunningPreference.None */), null);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['workspace'], false, true, 0 /* ExtensionRunningPreference.None */), 3 /* ExtensionHostKind.Remote */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['workspace'], true, false, 0 /* ExtensionRunningPreference.None */), null);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['workspace'], true, true, 0 /* ExtensionRunningPreference.None */), 3 /* ExtensionHostKind.Remote */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['web'], false, false, 0 /* ExtensionRunningPreference.None */), null);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['web'], false, true, 0 /* ExtensionRunningPreference.None */), 2 /* ExtensionHostKind.LocalWebWorker */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['web'], true, false, 0 /* ExtensionRunningPreference.None */), 2 /* ExtensionHostKind.LocalWebWorker */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['web'], true, true, 0 /* ExtensionRunningPreference.None */), 2 /* ExtensionHostKind.LocalWebWorker */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['ui', 'workspace'], false, false, 0 /* ExtensionRunningPreference.None */), null);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['ui', 'workspace'], false, true, 0 /* ExtensionRunningPreference.None */), 3 /* ExtensionHostKind.Remote */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['ui', 'workspace'], true, false, 0 /* ExtensionRunningPreference.None */), null);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['ui', 'workspace'], true, true, 0 /* ExtensionRunningPreference.None */), 3 /* ExtensionHostKind.Remote */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['workspace', 'ui'], false, false, 0 /* ExtensionRunningPreference.None */), null);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['workspace', 'ui'], false, true, 0 /* ExtensionRunningPreference.None */), 3 /* ExtensionHostKind.Remote */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['workspace', 'ui'], true, false, 0 /* ExtensionRunningPreference.None */), null);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['workspace', 'ui'], true, true, 0 /* ExtensionRunningPreference.None */), 3 /* ExtensionHostKind.Remote */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['web', 'workspace'], false, false, 0 /* ExtensionRunningPreference.None */), null);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['web', 'workspace'], false, true, 0 /* ExtensionRunningPreference.None */), 2 /* ExtensionHostKind.LocalWebWorker */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['web', 'workspace'], true, false, 0 /* ExtensionRunningPreference.None */), 2 /* ExtensionHostKind.LocalWebWorker */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['web', 'workspace'], true, true, 0 /* ExtensionRunningPreference.None */), 2 /* ExtensionHostKind.LocalWebWorker */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['workspace', 'web'], false, false, 0 /* ExtensionRunningPreference.None */), null);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['workspace', 'web'], false, true, 0 /* ExtensionRunningPreference.None */), 3 /* ExtensionHostKind.Remote */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['workspace', 'web'], true, false, 0 /* ExtensionRunningPreference.None */), 2 /* ExtensionHostKind.LocalWebWorker */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['workspace', 'web'], true, true, 0 /* ExtensionRunningPreference.None */), 3 /* ExtensionHostKind.Remote */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['ui', 'web'], false, false, 0 /* ExtensionRunningPreference.None */), null);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['ui', 'web'], false, true, 0 /* ExtensionRunningPreference.None */), 2 /* ExtensionHostKind.LocalWebWorker */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['ui', 'web'], true, false, 0 /* ExtensionRunningPreference.None */), 2 /* ExtensionHostKind.LocalWebWorker */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['ui', 'web'], true, true, 0 /* ExtensionRunningPreference.None */), 2 /* ExtensionHostKind.LocalWebWorker */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['web', 'ui'], false, false, 0 /* ExtensionRunningPreference.None */), null);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['web', 'ui'], false, true, 0 /* ExtensionRunningPreference.None */), 2 /* ExtensionHostKind.LocalWebWorker */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['web', 'ui'], true, false, 0 /* ExtensionRunningPreference.None */), 2 /* ExtensionHostKind.LocalWebWorker */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['web', 'ui'], true, true, 0 /* ExtensionRunningPreference.None */), 2 /* ExtensionHostKind.LocalWebWorker */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['ui', 'web', 'workspace'], false, false, 0 /* ExtensionRunningPreference.None */), null);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['ui', 'web', 'workspace'], false, true, 0 /* ExtensionRunningPreference.None */), 2 /* ExtensionHostKind.LocalWebWorker */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['ui', 'web', 'workspace'], true, false, 0 /* ExtensionRunningPreference.None */), 2 /* ExtensionHostKind.LocalWebWorker */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['ui', 'web', 'workspace'], true, true, 0 /* ExtensionRunningPreference.None */), 2 /* ExtensionHostKind.LocalWebWorker */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['ui', 'workspace', 'web'], false, false, 0 /* ExtensionRunningPreference.None */), null);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['ui', 'workspace', 'web'], false, true, 0 /* ExtensionRunningPreference.None */), 3 /* ExtensionHostKind.Remote */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['ui', 'workspace', 'web'], true, false, 0 /* ExtensionRunningPreference.None */), 2 /* ExtensionHostKind.LocalWebWorker */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['ui', 'workspace', 'web'], true, true, 0 /* ExtensionRunningPreference.None */), 3 /* ExtensionHostKind.Remote */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['web', 'ui', 'workspace'], false, false, 0 /* ExtensionRunningPreference.None */), null);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['web', 'ui', 'workspace'], false, true, 0 /* ExtensionRunningPreference.None */), 2 /* ExtensionHostKind.LocalWebWorker */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['web', 'ui', 'workspace'], true, false, 0 /* ExtensionRunningPreference.None */), 2 /* ExtensionHostKind.LocalWebWorker */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['web', 'ui', 'workspace'], true, true, 0 /* ExtensionRunningPreference.None */), 2 /* ExtensionHostKind.LocalWebWorker */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['web', 'workspace', 'ui'], false, false, 0 /* ExtensionRunningPreference.None */), null);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['web', 'workspace', 'ui'], false, true, 0 /* ExtensionRunningPreference.None */), 2 /* ExtensionHostKind.LocalWebWorker */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['web', 'workspace', 'ui'], true, false, 0 /* ExtensionRunningPreference.None */), 2 /* ExtensionHostKind.LocalWebWorker */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['web', 'workspace', 'ui'], true, true, 0 /* ExtensionRunningPreference.None */), 2 /* ExtensionHostKind.LocalWebWorker */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['workspace', 'ui', 'web'], false, false, 0 /* ExtensionRunningPreference.None */), null);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['workspace', 'ui', 'web'], false, true, 0 /* ExtensionRunningPreference.None */), 3 /* ExtensionHostKind.Remote */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['workspace', 'ui', 'web'], true, false, 0 /* ExtensionRunningPreference.None */), 2 /* ExtensionHostKind.LocalWebWorker */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['workspace', 'ui', 'web'], true, true, 0 /* ExtensionRunningPreference.None */), 3 /* ExtensionHostKind.Remote */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['workspace', 'web', 'ui'], false, false, 0 /* ExtensionRunningPreference.None */), null);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['workspace', 'web', 'ui'], false, true, 0 /* ExtensionRunningPreference.None */), 3 /* ExtensionHostKind.Remote */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['workspace', 'web', 'ui'], true, false, 0 /* ExtensionRunningPreference.None */), 2 /* ExtensionHostKind.LocalWebWorker */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['workspace', 'web', 'ui'], true, true, 0 /* ExtensionRunningPreference.None */), 3 /* ExtensionHostKind.Remote */);
    });
});
suite('ExtensionService', () => {
    let MyTestExtensionService = class MyTestExtensionService extends AbstractExtensionService {
        constructor(instantiationService, notificationService, environmentService, telemetryService, extensionEnablementService, fileService, productService, extensionManagementService, contextService, configurationService, extensionManifestPropertiesService, logService, remoteAgentService, remoteExtensionsScannerService, lifecycleService, remoteAuthorityResolverService) {
            const extensionsProposedApi = instantiationService.createInstance(ExtensionsProposedApi);
            const extensionHostFactory = new (class {
                createExtensionHost(runningLocations, runningLocation, isInitialStart) {
                    return new (class extends mock() {
                        constructor() {
                            super(...arguments);
                            this.runningLocation = runningLocation;
                        }
                    })();
                }
            })();
            super({ allowRemoteExtensionsInLocalWebWorker: false, hasLocalProcess: true }, extensionsProposedApi, extensionHostFactory, null, instantiationService, notificationService, environmentService, telemetryService, extensionEnablementService, fileService, productService, extensionManagementService, contextService, configurationService, extensionManifestPropertiesService, logService, remoteAgentService, remoteExtensionsScannerService, lifecycleService, remoteAuthorityResolverService, new TestDialogService());
            this._extHostId = 0;
            this.order = [];
        }
        _pickExtensionHostKind(extensionId, extensionKinds, isInstalledLocally, isInstalledRemotely, preference) {
            throw new Error('Method not implemented.');
        }
        _doCreateExtensionHostManager(extensionHost, initialActivationEvents) {
            const order = this.order;
            const extensionHostId = ++this._extHostId;
            order.push(`create ${extensionHostId}`);
            return new (class extends mock() {
                constructor() {
                    super(...arguments);
                    this.onDidExit = Event.None;
                    this.onDidChangeResponsiveState = Event.None;
                }
                disconnect() {
                    return Promise.resolve();
                }
                dispose() {
                    order.push(`dispose ${extensionHostId}`);
                }
                representsRunningLocation(runningLocation) {
                    return extensionHost.runningLocation.equals(runningLocation);
                }
            })();
        }
        _resolveExtensions() {
            throw new Error('Method not implemented.');
        }
        _scanSingleExtension(extension) {
            throw new Error('Method not implemented.');
        }
        _onExtensionHostExit(code) {
            throw new Error('Method not implemented.');
        }
        _resolveAuthority(remoteAuthority) {
            throw new Error('Method not implemented.');
        }
    };
    MyTestExtensionService = __decorate([
        __param(0, IInstantiationService),
        __param(1, INotificationService),
        __param(2, IWorkbenchEnvironmentService),
        __param(3, ITelemetryService),
        __param(4, IWorkbenchExtensionEnablementService),
        __param(5, IFileService),
        __param(6, IProductService),
        __param(7, IWorkbenchExtensionManagementService),
        __param(8, IWorkspaceContextService),
        __param(9, IConfigurationService),
        __param(10, IExtensionManifestPropertiesService),
        __param(11, ILogService),
        __param(12, IRemoteAgentService),
        __param(13, IRemoteExtensionsScannerService),
        __param(14, ILifecycleService),
        __param(15, IRemoteAuthorityResolverService)
    ], MyTestExtensionService);
    let disposables;
    let instantiationService;
    let extService;
    setup(() => {
        disposables = new DisposableStore();
        const testProductService = { _serviceBrand: undefined, ...product };
        disposables.add((instantiationService = createServices(disposables, [
            // custom
            [IExtensionService, MyTestExtensionService],
            // default
            [ILifecycleService, TestLifecycleService],
            [IWorkbenchExtensionManagementService, TestWorkbenchExtensionManagementService],
            [INotificationService, TestNotificationService],
            [IRemoteAgentService, TestRemoteAgentService],
            [ILogService, NullLogService],
            [IWebExtensionsScannerService, TestWebExtensionsScannerService],
            [IExtensionManifestPropertiesService, ExtensionManifestPropertiesService],
            [IConfigurationService, TestConfigurationService],
            [IWorkspaceContextService, TestContextService],
            [IProductService, testProductService],
            [IFileService, TestFileService],
            [IWorkbenchExtensionEnablementService, TestWorkbenchExtensionEnablementService],
            [ITelemetryService, NullTelemetryService],
            [IEnvironmentService, TestEnvironmentService],
            [IWorkspaceTrustEnablementService, WorkspaceTrustEnablementService],
            [IUserDataProfilesService, UserDataProfilesService],
            [IUserDataProfileService, TestUserDataProfileService],
            [IUriIdentityService, UriIdentityService],
            [IRemoteExtensionsScannerService, TestRemoteExtensionsScannerService],
            [
                IRemoteAuthorityResolverService,
                new RemoteAuthorityResolverService(false, undefined, undefined, undefined, testProductService, new NullLogService()),
            ],
        ])));
        extService = instantiationService.get(IExtensionService);
    });
    teardown(async () => {
        disposables.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('issue #152204: Remote extension host not disposed after closing vscode client', async () => {
        await extService.startExtensionHosts();
        await extService.stopExtensionHosts('foo');
        assert.deepStrictEqual(extService.order, [
            'create 1',
            'create 2',
            'create 3',
            'dispose 3',
            'dispose 2',
            'dispose 1',
        ]);
    });
    test('Extension host disposed when awaited', async () => {
        await extService.startExtensionHosts();
        await extService.stopExtensionHosts('foo');
        assert.deepStrictEqual(extService.order, [
            'create 1',
            'create 2',
            'create 3',
            'dispose 3',
            'dispose 2',
            'dispose 1',
        ]);
    });
    test('Extension host not disposed when vetoed (sync)', async () => {
        await extService.startExtensionHosts();
        disposables.add(extService.onWillStop((e) => e.veto(true, 'test 1')));
        disposables.add(extService.onWillStop((e) => e.veto(false, 'test 2')));
        await extService.stopExtensionHosts('foo');
        assert.deepStrictEqual(extService.order, ['create 1', 'create 2', 'create 3']);
    });
    test('Extension host not disposed when vetoed (async)', async () => {
        await extService.startExtensionHosts();
        disposables.add(extService.onWillStop((e) => e.veto(false, 'test 1')));
        disposables.add(extService.onWillStop((e) => e.veto(Promise.resolve(true), 'test 2')));
        disposables.add(extService.onWillStop((e) => e.veto(Promise.resolve(false), 'test 3')));
        await extService.stopExtensionHosts('foo');
        assert.deepStrictEqual(extService.order, ['create 1', 'create 2', 'create 3']);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uU2VydmljZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZXh0ZW5zaW9ucy90ZXN0L2Jyb3dzZXIvZXh0ZW5zaW9uU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDM0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNsRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNyRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQTtBQUN4SCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQTtBQUNwRyxPQUFPLEVBRU4sbUJBQW1CLEdBQ25CLE1BQU0sMkRBQTJELENBQUE7QUFNbEUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQzVFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ3JHLE9BQU8sRUFFTixjQUFjLEdBQ2QsTUFBTSwrRUFBK0UsQ0FBQTtBQUN0RixPQUFPLEVBQUUsV0FBVyxFQUFFLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDZEQUE2RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDZFQUE2RSxDQUFBO0FBQ3JILE9BQU8sT0FBTyxNQUFNLG1EQUFtRCxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUMxRixPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSwwRUFBMEUsQ0FBQTtBQUN6SCxPQUFPLEVBQ04sK0JBQStCLEdBRS9CLE1BQU0sa0VBQWtFLENBQUE7QUFDekUsT0FBTyxFQUFFLCtCQUErQixFQUFFLE1BQU0sa0VBQWtFLENBQUE7QUFDbEgsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDekYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDakcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFDL0YsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sa0VBQWtFLENBQUE7QUFDckcsT0FBTyxFQUNOLHdCQUF3QixFQUN4Qix1QkFBdUIsR0FDdkIsTUFBTSxtRUFBbUUsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUNoRyxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUM3RyxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNoRyxPQUFPLEVBQ04sNEJBQTRCLEVBQzVCLG9DQUFvQyxFQUNwQyxvQ0FBb0MsR0FDcEMsTUFBTSw0REFBNEQsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNsRixPQUFPLEVBQ04sd0JBQXdCLEdBR3hCLE1BQU0sMENBQTBDLENBQUE7QUFHakQsT0FBTyxFQUNOLGtDQUFrQyxFQUNsQyxtQ0FBbUMsR0FDbkMsTUFBTSxvREFBb0QsQ0FBQTtBQUczRCxPQUFPLEVBQWtCLGlCQUFpQixFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDOUUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDN0UsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDMUUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDbEYsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDNUYsT0FBTyxFQUFFLCtCQUErQixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDOUYsT0FBTyxFQUNOLHNCQUFzQixFQUN0QixlQUFlLEVBQ2Ysb0JBQW9CLEVBQ3BCLHNCQUFzQixFQUN0QixrQ0FBa0MsRUFDbEMsMEJBQTBCLEVBQzFCLCtCQUErQixFQUMvQix1Q0FBdUMsRUFDdkMsdUNBQXVDLEdBQ3ZDLE1BQU0sbURBQW1ELENBQUE7QUFDMUQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFFckYsS0FBSyxDQUFDLHlCQUF5QixFQUFFLEdBQUcsRUFBRTtJQUNyQyx1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxHQUFHLEVBQUU7UUFDaEMsTUFBTSxDQUFDLGVBQWUsQ0FDckIsOEJBQThCLENBQUMsbUJBQW1CLENBQ2pELEVBQUUsRUFDRixLQUFLLEVBQ0wsS0FBSywwQ0FFTCxFQUNELElBQUksQ0FDSixDQUFBO1FBQ0QsTUFBTSxDQUFDLGVBQWUsQ0FDckIsOEJBQThCLENBQUMsbUJBQW1CLENBQ2pELEVBQUUsRUFDRixLQUFLLEVBQ0wsSUFBSSwwQ0FFSixFQUNELElBQUksQ0FDSixDQUFBO1FBQ0QsTUFBTSxDQUFDLGVBQWUsQ0FDckIsOEJBQThCLENBQUMsbUJBQW1CLENBQ2pELEVBQUUsRUFDRixJQUFJLEVBQ0osS0FBSywwQ0FFTCxFQUNELElBQUksQ0FDSixDQUFBO1FBQ0QsTUFBTSxDQUFDLGVBQWUsQ0FDckIsOEJBQThCLENBQUMsbUJBQW1CLENBQ2pELEVBQUUsRUFDRixJQUFJLEVBQ0osSUFBSSwwQ0FFSixFQUNELElBQUksQ0FDSixDQUFBO1FBRUQsTUFBTSxDQUFDLGVBQWUsQ0FDckIsOEJBQThCLENBQUMsbUJBQW1CLENBQ2pELENBQUMsSUFBSSxDQUFDLEVBQ04sS0FBSyxFQUNMLEtBQUssMENBRUwsRUFDRCxJQUFJLENBQ0osQ0FBQTtRQUNELE1BQU0sQ0FBQyxlQUFlLENBQ3JCLDhCQUE4QixDQUFDLG1CQUFtQixDQUNqRCxDQUFDLElBQUksQ0FBQyxFQUNOLEtBQUssRUFDTCxJQUFJLDBDQUVKLG1DQUVELENBQUE7UUFDRCxNQUFNLENBQUMsZUFBZSxDQUNyQiw4QkFBOEIsQ0FBQyxtQkFBbUIsQ0FDakQsQ0FBQyxJQUFJLENBQUMsRUFDTixJQUFJLEVBQ0osS0FBSywwQ0FFTCxFQUNELElBQUksQ0FDSixDQUFBO1FBQ0QsTUFBTSxDQUFDLGVBQWUsQ0FDckIsOEJBQThCLENBQUMsbUJBQW1CLENBQ2pELENBQUMsSUFBSSxDQUFDLEVBQ04sSUFBSSxFQUNKLElBQUksMENBRUosbUNBRUQsQ0FBQTtRQUVELE1BQU0sQ0FBQyxlQUFlLENBQ3JCLDhCQUE4QixDQUFDLG1CQUFtQixDQUNqRCxDQUFDLFdBQVcsQ0FBQyxFQUNiLEtBQUssRUFDTCxLQUFLLDBDQUVMLEVBQ0QsSUFBSSxDQUNKLENBQUE7UUFDRCxNQUFNLENBQUMsZUFBZSxDQUNyQiw4QkFBOEIsQ0FBQyxtQkFBbUIsQ0FDakQsQ0FBQyxXQUFXLENBQUMsRUFDYixLQUFLLEVBQ0wsSUFBSSwwQ0FFSixtQ0FFRCxDQUFBO1FBQ0QsTUFBTSxDQUFDLGVBQWUsQ0FDckIsOEJBQThCLENBQUMsbUJBQW1CLENBQ2pELENBQUMsV0FBVyxDQUFDLEVBQ2IsSUFBSSxFQUNKLEtBQUssMENBRUwsRUFDRCxJQUFJLENBQ0osQ0FBQTtRQUNELE1BQU0sQ0FBQyxlQUFlLENBQ3JCLDhCQUE4QixDQUFDLG1CQUFtQixDQUNqRCxDQUFDLFdBQVcsQ0FBQyxFQUNiLElBQUksRUFDSixJQUFJLDBDQUVKLG1DQUVELENBQUE7UUFFRCxNQUFNLENBQUMsZUFBZSxDQUNyQiw4QkFBOEIsQ0FBQyxtQkFBbUIsQ0FDakQsQ0FBQyxLQUFLLENBQUMsRUFDUCxLQUFLLEVBQ0wsS0FBSywwQ0FFTCxFQUNELElBQUksQ0FDSixDQUFBO1FBQ0QsTUFBTSxDQUFDLGVBQWUsQ0FDckIsOEJBQThCLENBQUMsbUJBQW1CLENBQ2pELENBQUMsS0FBSyxDQUFDLEVBQ1AsS0FBSyxFQUNMLElBQUksMENBRUosMkNBRUQsQ0FBQTtRQUNELE1BQU0sQ0FBQyxlQUFlLENBQ3JCLDhCQUE4QixDQUFDLG1CQUFtQixDQUNqRCxDQUFDLEtBQUssQ0FBQyxFQUNQLElBQUksRUFDSixLQUFLLDBDQUVMLDJDQUVELENBQUE7UUFDRCxNQUFNLENBQUMsZUFBZSxDQUNyQiw4QkFBOEIsQ0FBQyxtQkFBbUIsQ0FDakQsQ0FBQyxLQUFLLENBQUMsRUFDUCxJQUFJLEVBQ0osSUFBSSwwQ0FFSiwyQ0FFRCxDQUFBO1FBRUQsTUFBTSxDQUFDLGVBQWUsQ0FDckIsOEJBQThCLENBQUMsbUJBQW1CLENBQ2pELENBQUMsSUFBSSxFQUFFLFdBQVcsQ0FBQyxFQUNuQixLQUFLLEVBQ0wsS0FBSywwQ0FFTCxFQUNELElBQUksQ0FDSixDQUFBO1FBQ0QsTUFBTSxDQUFDLGVBQWUsQ0FDckIsOEJBQThCLENBQUMsbUJBQW1CLENBQ2pELENBQUMsSUFBSSxFQUFFLFdBQVcsQ0FBQyxFQUNuQixLQUFLLEVBQ0wsSUFBSSwwQ0FFSixtQ0FFRCxDQUFBO1FBQ0QsTUFBTSxDQUFDLGVBQWUsQ0FDckIsOEJBQThCLENBQUMsbUJBQW1CLENBQ2pELENBQUMsSUFBSSxFQUFFLFdBQVcsQ0FBQyxFQUNuQixJQUFJLEVBQ0osS0FBSywwQ0FFTCxFQUNELElBQUksQ0FDSixDQUFBO1FBQ0QsTUFBTSxDQUFDLGVBQWUsQ0FDckIsOEJBQThCLENBQUMsbUJBQW1CLENBQ2pELENBQUMsSUFBSSxFQUFFLFdBQVcsQ0FBQyxFQUNuQixJQUFJLEVBQ0osSUFBSSwwQ0FFSixtQ0FFRCxDQUFBO1FBQ0QsTUFBTSxDQUFDLGVBQWUsQ0FDckIsOEJBQThCLENBQUMsbUJBQW1CLENBQ2pELENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxFQUNuQixLQUFLLEVBQ0wsS0FBSywwQ0FFTCxFQUNELElBQUksQ0FDSixDQUFBO1FBQ0QsTUFBTSxDQUFDLGVBQWUsQ0FDckIsOEJBQThCLENBQUMsbUJBQW1CLENBQ2pELENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxFQUNuQixLQUFLLEVBQ0wsSUFBSSwwQ0FFSixtQ0FFRCxDQUFBO1FBQ0QsTUFBTSxDQUFDLGVBQWUsQ0FDckIsOEJBQThCLENBQUMsbUJBQW1CLENBQ2pELENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxFQUNuQixJQUFJLEVBQ0osS0FBSywwQ0FFTCxFQUNELElBQUksQ0FDSixDQUFBO1FBQ0QsTUFBTSxDQUFDLGVBQWUsQ0FDckIsOEJBQThCLENBQUMsbUJBQW1CLENBQ2pELENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxFQUNuQixJQUFJLEVBQ0osSUFBSSwwQ0FFSixtQ0FFRCxDQUFBO1FBRUQsTUFBTSxDQUFDLGVBQWUsQ0FDckIsOEJBQThCLENBQUMsbUJBQW1CLENBQ2pELENBQUMsS0FBSyxFQUFFLFdBQVcsQ0FBQyxFQUNwQixLQUFLLEVBQ0wsS0FBSywwQ0FFTCxFQUNELElBQUksQ0FDSixDQUFBO1FBQ0QsTUFBTSxDQUFDLGVBQWUsQ0FDckIsOEJBQThCLENBQUMsbUJBQW1CLENBQ2pELENBQUMsS0FBSyxFQUFFLFdBQVcsQ0FBQyxFQUNwQixLQUFLLEVBQ0wsSUFBSSwwQ0FFSiwyQ0FFRCxDQUFBO1FBQ0QsTUFBTSxDQUFDLGVBQWUsQ0FDckIsOEJBQThCLENBQUMsbUJBQW1CLENBQ2pELENBQUMsS0FBSyxFQUFFLFdBQVcsQ0FBQyxFQUNwQixJQUFJLEVBQ0osS0FBSywwQ0FFTCwyQ0FFRCxDQUFBO1FBQ0QsTUFBTSxDQUFDLGVBQWUsQ0FDckIsOEJBQThCLENBQUMsbUJBQW1CLENBQ2pELENBQUMsS0FBSyxFQUFFLFdBQVcsQ0FBQyxFQUNwQixJQUFJLEVBQ0osSUFBSSwwQ0FFSiwyQ0FFRCxDQUFBO1FBQ0QsTUFBTSxDQUFDLGVBQWUsQ0FD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