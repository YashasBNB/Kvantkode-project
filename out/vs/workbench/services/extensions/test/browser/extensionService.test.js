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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uU2VydmljZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2V4dGVuc2lvbnMvdGVzdC9icm93c2VyL2V4dGVuc2lvblNlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDOUQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDckcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUE7QUFDeEgsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sa0VBQWtFLENBQUE7QUFDcEcsT0FBTyxFQUVOLG1CQUFtQixHQUNuQixNQUFNLDJEQUEyRCxDQUFBO0FBTWxFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUM1RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNyRyxPQUFPLEVBRU4sY0FBYyxHQUNkLE1BQU0sK0VBQStFLENBQUE7QUFDdEYsT0FBTyxFQUFFLFdBQVcsRUFBRSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUN2RixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw2REFBNkQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw2RUFBNkUsQ0FBQTtB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QUFJLENBQUMsRUFDbkIsS0FBSyxFQUNMLEtBQUssMENBRUwsRUFDRCxJQUFJLENBQ0osQ0FBQTtRQUNELE1BQU0sQ0FBQyxlQUFlLENBQ3JCLDhCQUE4QixDQUFDLG1CQUFtQixDQUNqRCxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsRUFDbkIsS0FBSyxFQUNMLElBQUksMENBRUosbUNBRUQsQ0FBQTtRQUNELE1BQU0sQ0FBQyxlQUFlLENBQ3JCLDhCQUE4QixDQUFDLG1CQUFtQixDQUNqRCxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsRUFDbkIsSUFBSSxFQUNKLEtBQUssMENBRUwsRUFDRCxJQUFJLENBQ0osQ0FBQTtRQUNELE1BQU0sQ0FBQyxlQUFlLENBQ3JCLDhCQUE4QixDQUFDLG1CQUFtQixDQUNqRCxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsRUFDbkIsSUFBSSxFQUNKLElBQUksMENBRUosbUNBRUQsQ0FBQTtRQUVELE1BQU0sQ0FBQyxlQUFlLENBQ3JCLDhCQUE4QixDQUFDLG1CQUFtQixDQUNqRCxDQUFDLEtBQUssRUFBRSxXQUFXLENBQUMsRUFDcEIsS0FBSyxFQUNMLEtBQUssMENBRUwsRUFDRCxJQUFJLENBQ0osQ0FBQTtRQUNELE1BQU0sQ0FBQyxlQUFlLENBQ3JCLDhCQUE4QixDQUFDLG1CQUFtQixDQUNqRCxDQUFDLEtBQUssRUFBRSxXQUFXLENBQUMsRUFDcEIsS0FBSyxFQUNMLElBQUksMENBRUosMkNBRUQsQ0FBQTtRQUNELE1BQU0sQ0FBQyxlQUFlLENBQ3JCLDhCQUE4QixDQUFDLG1CQUFtQixDQUNqRCxDQUFDLEtBQUssRUFBRSxXQUFXLENBQUMsRUFDcEIsSUFBSSxFQUNKLEtBQUssMENBRUwsMkNBRUQsQ0FBQTtRQUNELE1BQU0sQ0FBQyxlQUFlLENBQ3JCLDhCQUE4QixDQUFDLG1CQUFtQixDQUNqRCxDQUFDLEtBQUssRUFBRSxXQUFXLENBQUMsRUFDcEIsSUFBSSxFQUNKLElBQUksMENBRUosMkNBRUQsQ0FBQTtRQUNELE1BQU0sQ0FBQyxlQUFlLENBQ3JCLDhC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