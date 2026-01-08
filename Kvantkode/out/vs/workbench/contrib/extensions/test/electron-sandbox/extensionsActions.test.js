/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { generateUuid } from '../../../../../base/common/uuid.js';
import { IExtensionsWorkbenchService, ExtensionContainers } from '../../common/extensions.js';
import * as ExtensionsActions from '../../browser/extensionsActions.js';
import { ExtensionsWorkbenchService } from '../../browser/extensionsWorkbenchService.js';
import { IExtensionManagementService, IExtensionGalleryService, IExtensionTipsService, getTargetPlatform, } from '../../../../../platform/extensionManagement/common/extensionManagement.js';
import { IWorkbenchExtensionEnablementService, IExtensionManagementServerService, IWorkbenchExtensionManagementService, } from '../../../../services/extensionManagement/common/extensionManagement.js';
import { IExtensionRecommendationsService } from '../../../../services/extensionRecommendations/common/extensionRecommendations.js';
import { getGalleryExtensionId } from '../../../../../platform/extensionManagement/common/extensionManagementUtil.js';
import { TestExtensionEnablementService } from '../../../../services/extensionManagement/test/browser/extensionEnablementService.test.js';
import { ExtensionGalleryService } from '../../../../../platform/extensionManagement/common/extensionGalleryService.js';
import { IURLService } from '../../../../../platform/url/common/url.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { Emitter, Event } from '../../../../../base/common/event.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { NullTelemetryService } from '../../../../../platform/telemetry/common/telemetryUtils.js';
import { IExtensionService, toExtensionDescription, } from '../../../../services/extensions/common/extensions.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { TestContextService, TestWorkspaceTrustManagementService, } from '../../../../test/common/workbenchTestServices.js';
import { TestExtensionTipsService, TestSharedProcessService, } from '../../../../test/electron-sandbox/workbenchTestServices.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { ILogService, NullLogService } from '../../../../../platform/log/common/log.js';
import { NativeURLService } from '../../../../../platform/url/common/urlService.js';
import { URI } from '../../../../../base/common/uri.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { IRemoteAgentService } from '../../../../services/remote/common/remoteAgentService.js';
import { RemoteAgentService } from '../../../../services/remote/electron-sandbox/remoteAgentService.js';
import { ISharedProcessService } from '../../../../../platform/ipc/electron-sandbox/services.js';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { IProductService } from '../../../../../platform/product/common/productService.js';
import { Schemas } from '../../../../../base/common/network.js';
import { IProgressService } from '../../../../../platform/progress/common/progress.js';
import { ProgressService } from '../../../../services/progress/browser/progressService.js';
import { ILifecycleService } from '../../../../services/lifecycle/common/lifecycle.js';
import { TestEnvironmentService, TestLifecycleService, } from '../../../../test/browser/workbenchTestServices.js';
import { INativeWorkbenchEnvironmentService } from '../../../../services/environment/electron-sandbox/environmentService.js';
import { IWorkbenchEnvironmentService } from '../../../../services/environment/common/environmentService.js';
import { IUserDataSyncEnablementService } from '../../../../../platform/userDataSync/common/userDataSync.js';
import { UserDataSyncEnablementService } from '../../../../../platform/userDataSync/common/userDataSyncEnablementService.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { MockContextKeyService } from '../../../../../platform/keybinding/test/common/mockKeybindingService.js';
import { IWorkspaceTrustManagementService } from '../../../../../platform/workspace/common/workspaceTrust.js';
import { IEnvironmentService, INativeEnvironmentService, } from '../../../../../platform/environment/common/environment.js';
import { platform } from '../../../../../base/common/platform.js';
import { arch } from '../../../../../base/common/process.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { IUpdateService, State } from '../../../../../platform/update/common/update.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { FileService } from '../../../../../platform/files/common/fileService.js';
import { IUserDataProfileService } from '../../../../services/userDataProfile/common/userDataProfile.js';
import { UserDataProfileService } from '../../../../services/userDataProfile/common/userDataProfileService.js';
import { toUserDataProfile } from '../../../../../platform/userDataProfile/common/userDataProfile.js';
let instantiationService;
let installEvent, didInstallEvent, uninstallEvent, didUninstallEvent;
function setupTest(disposables) {
    installEvent = disposables.add(new Emitter());
    didInstallEvent = disposables.add(new Emitter());
    uninstallEvent = disposables.add(new Emitter());
    didUninstallEvent = disposables.add(new Emitter());
    instantiationService = disposables.add(new TestInstantiationService());
    instantiationService.stub(IEnvironmentService, TestEnvironmentService);
    instantiationService.stub(IWorkbenchEnvironmentService, TestEnvironmentService);
    instantiationService.stub(ITelemetryService, NullTelemetryService);
    instantiationService.stub(ILogService, NullLogService);
    instantiationService.stub(IWorkspaceContextService, new TestContextService());
    instantiationService.stub(IFileService, disposables.add(new FileService(new NullLogService())));
    instantiationService.stub(IConfigurationService, new TestConfigurationService());
    instantiationService.stub(IProgressService, ProgressService);
    instantiationService.stub(IProductService, {});
    instantiationService.stub(IContextKeyService, new MockContextKeyService());
    instantiationService.stub(IExtensionGalleryService, ExtensionGalleryService);
    instantiationService.stub(ISharedProcessService, TestSharedProcessService);
    instantiationService.stub(IWorkbenchExtensionManagementService, {
        onDidInstallExtensions: didInstallEvent.event,
        onInstallExtension: installEvent.event,
        onUninstallExtension: uninstallEvent.event,
        onDidUninstallExtension: didUninstallEvent.event,
        onDidUpdateExtensionMetadata: Event.None,
        onDidChangeProfile: Event.None,
        onProfileAwareDidInstallExtensions: Event.None,
        async getInstalled() {
            return [];
        },
        async getInstalledWorkspaceExtensions() {
            return [];
        },
        async getExtensionsControlManifest() {
            return { malicious: [], deprecated: {}, search: [], publisherMapping: {} };
        },
        async updateMetadata(local, metadata) {
            local.identifier.uuid = metadata.id;
            local.publisherDisplayName = metadata.publisherDisplayName;
            local.publisherId = metadata.publisherId;
            return local;
        },
        async canInstall() {
            return true;
        },
        async getTargetPlatform() {
            return getTargetPlatform(platform, arch);
        },
    });
    instantiationService.stub(IRemoteAgentService, RemoteAgentService);
    const localExtensionManagementServer = {
        extensionManagementService: instantiationService.get(IExtensionManagementService),
        label: 'local',
        id: 'vscode-local',
    };
    instantiationService.stub(IExtensionManagementServerService, {
        get localExtensionManagementServer() {
            return localExtensionManagementServer;
        },
        getExtensionManagementServer(extension) {
            if (extension.location.scheme === Schemas.file) {
                return localExtensionManagementServer;
            }
            throw new Error(`Invalid Extension ${extension.location}`);
        },
    });
    instantiationService.stub(IUserDataProfileService, disposables.add(new UserDataProfileService(toUserDataProfile('test', 'test', URI.file('foo'), URI.file('cache')))));
    instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
    instantiationService.stub(ILabelService, {
        onDidChangeFormatters: disposables.add(new Emitter()).event,
    });
    instantiationService.stub(ILifecycleService, disposables.add(new TestLifecycleService()));
    instantiationService.stub(IExtensionTipsService, disposables.add(instantiationService.createInstance(TestExtensionTipsService)));
    instantiationService.stub(IExtensionRecommendationsService, {});
    instantiationService.stub(IURLService, NativeURLService);
    instantiationService.stub(IExtensionGalleryService, 'isEnabled', true);
    instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage());
    instantiationService.stubPromise(IExtensionGalleryService, 'getExtensions', []);
    instantiationService.stub(IExtensionService, {
        extensions: [],
        onDidChangeExtensions: Event.None,
        canAddExtension: (extension) => false,
        canRemoveExtension: (extension) => false,
        whenInstalledExtensionsRegistered: () => Promise.resolve(true),
    });
    (instantiationService.get(IWorkbenchExtensionEnablementService)).reset();
    instantiationService.stub(IUserDataSyncEnablementService, disposables.add(instantiationService.createInstance(UserDataSyncEnablementService)));
    instantiationService.stub(IUpdateService, {
        onStateChange: Event.None,
        state: State.Uninitialized,
    });
    instantiationService.set(IExtensionsWorkbenchService, disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService)));
    instantiationService.stub(IWorkspaceTrustManagementService, disposables.add(new TestWorkspaceTrustManagementService()));
}
suite('ExtensionsActions', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    setup(() => setupTest(disposables));
    test('Install action is disabled when there is no extension', () => {
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.InstallAction, {
            installPreReleaseVersion: false,
        }));
        assert.ok(!testObject.enabled);
    });
    test('Test Install action when state is installed', () => {
        const workbenchService = instantiationService.get(IExtensionsWorkbenchService);
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.InstallAction, {
            installPreReleaseVersion: false,
        }));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const local = aLocalExtension('a');
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
        return workbenchService.queryLocal().then(() => {
            instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: local.identifier })));
            return workbenchService.queryGallery(CancellationToken.None).then((paged) => {
                testObject.extension = paged.firstPage[0];
                assert.ok(!testObject.enabled);
                assert.strictEqual('Install', testObject.label);
                assert.strictEqual('extension-action label prominent install hide', testObject.class);
            });
        });
    });
    test('Test InstallingLabelAction when state is installing', () => {
        const workbenchService = instantiationService.get(IExtensionsWorkbenchService);
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.InstallingLabelAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const gallery = aGalleryExtension('a');
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(gallery));
        return workbenchService.queryGallery(CancellationToken.None).then((paged) => {
            testObject.extension = paged.firstPage[0];
            installEvent.fire({ identifier: gallery.identifier, source: gallery, profileLocation: null });
            assert.ok(!testObject.enabled);
            assert.strictEqual('Installing', testObject.label);
            assert.strictEqual('extension-action label install installing', testObject.class);
        });
    });
    test('Test Install action when state is uninstalled', async () => {
        const workbenchService = instantiationService.get(IExtensionsWorkbenchService);
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.InstallAction, {
            installPreReleaseVersion: false,
        }));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const gallery = aGalleryExtension('a');
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(gallery));
        const paged = await workbenchService.queryGallery(CancellationToken.None);
        const promise = Event.toPromise(Event.filter(testObject.onDidChange, (e) => e.enabled === true));
        testObject.extension = paged.firstPage[0];
        await promise;
        assert.ok(testObject.enabled);
        assert.strictEqual('Install', testObject.label);
    });
    test('Test Install action when extension is system action', () => {
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.InstallAction, {
            installPreReleaseVersion: false,
        }));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const local = aLocalExtension('a', {}, { type: 0 /* ExtensionType.System */ });
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
        return instantiationService
            .get(IExtensionsWorkbenchService)
            .queryLocal()
            .then((extensions) => {
            uninstallEvent.fire({ identifier: local.identifier, profileLocation: null });
            didUninstallEvent.fire({ identifier: local.identifier, profileLocation: null });
            testObject.extension = extensions[0];
            assert.ok(!testObject.enabled);
        });
    });
    test('Test Install action when extension doesnot has gallery', () => {
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.InstallAction, {
            installPreReleaseVersion: false,
        }));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const local = aLocalExtension('a');
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
        return instantiationService
            .get(IExtensionsWorkbenchService)
            .queryLocal()
            .then((extensions) => {
            uninstallEvent.fire({ identifier: local.identifier, profileLocation: null });
            didUninstallEvent.fire({ identifier: local.identifier, profileLocation: null });
            testObject.extension = extensions[0];
            assert.ok(!testObject.enabled);
        });
    });
    test('Uninstall action is disabled when there is no extension', () => {
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.UninstallAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        assert.ok(!testObject.enabled);
    });
    test('Test Uninstall action when state is uninstalling', () => {
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.UninstallAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const local = aLocalExtension('a');
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
        return instantiationService
            .get(IExtensionsWorkbenchService)
            .queryLocal()
            .then((extensions) => {
            testObject.extension = extensions[0];
            uninstallEvent.fire({ identifier: local.identifier, profileLocation: null });
            assert.ok(!testObject.enabled);
            assert.strictEqual('Uninstalling', testObject.label);
            assert.strictEqual('extension-action label uninstall uninstalling', testObject.class);
        });
    });
    test('Test Uninstall action when state is installed and is user extension', () => {
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.UninstallAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const local = aLocalExtension('a');
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
        return instantiationService
            .get(IExtensionsWorkbenchService)
            .queryLocal()
            .then((extensions) => {
            testObject.extension = extensions[0];
            assert.ok(testObject.enabled);
            assert.strictEqual('Uninstall', testObject.label);
            assert.strictEqual('extension-action label uninstall', testObject.class);
        });
    });
    test('Test Uninstall action when state is installed and is system extension', () => {
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.UninstallAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const local = aLocalExtension('a', {}, { type: 0 /* ExtensionType.System */ });
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
        return instantiationService
            .get(IExtensionsWorkbenchService)
            .queryLocal()
            .then((extensions) => {
            testObject.extension = extensions[0];
            assert.ok(!testObject.enabled);
            assert.strictEqual('Uninstall', testObject.label);
            assert.strictEqual('extension-action label uninstall', testObject.class);
        });
    });
    test('Test Uninstall action when state is installing and is user extension', () => {
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.UninstallAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const local = aLocalExtension('a');
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
        return instantiationService
            .get(IExtensionsWorkbenchService)
            .queryLocal()
            .then((extensions) => {
            const gallery = aGalleryExtension('a');
            const extension = extensions[0];
            extension.gallery = gallery;
            installEvent.fire({
                identifier: gallery.identifier,
                source: gallery,
                profileLocation: null,
            });
            testObject.extension = extension;
            assert.ok(!testObject.enabled);
        });
    });
    test('Test Uninstall action after extension is installed', async () => {
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.UninstallAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const gallery = aGalleryExtension('a');
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(gallery));
        const paged = await instantiationService
            .get(IExtensionsWorkbenchService)
            .queryGallery(CancellationToken.None);
        testObject.extension = paged.firstPage[0];
        installEvent.fire({ identifier: gallery.identifier, source: gallery, profileLocation: null });
        const promise = Event.toPromise(testObject.onDidChange);
        didInstallEvent.fire([
            {
                identifier: gallery.identifier,
                source: gallery,
                operation: 2 /* InstallOperation.Install */,
                local: aLocalExtension('a', gallery, gallery),
                profileLocation: null,
            },
        ]);
        await promise;
        assert.ok(testObject.enabled);
        assert.strictEqual('Uninstall', testObject.label);
        assert.strictEqual('extension-action label uninstall', testObject.class);
    });
    test('Test UpdateAction when there is no extension', () => {
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.UpdateAction, false));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        assert.ok(!testObject.enabled);
    });
    test('Test UpdateAction when extension is uninstalled', () => {
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.UpdateAction, false));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const gallery = aGalleryExtension('a', { version: '1.0.0' });
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(gallery));
        return instantiationService
            .get(IExtensionsWorkbenchService)
            .queryGallery(CancellationToken.None)
            .then((paged) => {
            testObject.extension = paged.firstPage[0];
            assert.ok(!testObject.enabled);
        });
    });
    test('Test UpdateAction when extension is installed and not outdated', () => {
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.UpdateAction, false));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const local = aLocalExtension('a', { version: '1.0.0' });
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
        return instantiationService
            .get(IExtensionsWorkbenchService)
            .queryLocal()
            .then((extensions) => {
            testObject.extension = extensions[0];
            instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', {
                identifier: local.identifier,
                version: local.manifest.version,
            })));
            return instantiationService
                .get(IExtensionsWorkbenchService)
                .queryGallery(CancellationToken.None)
                .then((extensions) => assert.ok(!testObject.enabled));
        });
    });
    test('Test UpdateAction when extension is installed outdated and system extension', () => {
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.UpdateAction, false));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const local = aLocalExtension('a', { version: '1.0.0' }, { type: 0 /* ExtensionType.System */ });
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
        return instantiationService
            .get(IExtensionsWorkbenchService)
            .queryLocal()
            .then((extensions) => {
            testObject.extension = extensions[0];
            instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: local.identifier, version: '1.0.1' })));
            return instantiationService
                .get(IExtensionsWorkbenchService)
                .queryGallery(CancellationToken.None)
                .then((extensions) => assert.ok(!testObject.enabled));
        });
    });
    test('Test UpdateAction when extension is installed outdated and user extension', () => {
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.UpdateAction, false));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const local = aLocalExtension('a', { version: '1.0.0' });
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
        const workbenchService = instantiationService.get(IExtensionsWorkbenchService);
        return workbenchService.queryLocal().then(async (extensions) => {
            testObject.extension = extensions[0];
            const gallery = aGalleryExtension('a', { identifier: local.identifier, version: '1.0.1' });
            instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(gallery));
            instantiationService.stubPromise(IExtensionGalleryService, 'getCompatibleExtension', gallery);
            instantiationService.stubPromise(IExtensionGalleryService, 'getExtensions', [gallery]);
            assert.ok(!testObject.enabled);
            return new Promise((c) => {
                disposables.add(testObject.onDidChange(() => {
                    if (testObject.enabled) {
                        c();
                    }
                }));
                instantiationService.get(IExtensionsWorkbenchService).queryGallery(CancellationToken.None);
            });
        });
    });
    test('Test UpdateAction when extension is installing and outdated and user extension', async () => {
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.UpdateAction, false));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const local = aLocalExtension('a', { version: '1.0.0' });
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
        const extensions = await instantiationService.get(IExtensionsWorkbenchService).queryLocal();
        testObject.extension = extensions[0];
        const gallery = aGalleryExtension('a', { identifier: local.identifier, version: '1.0.1' });
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(gallery));
        instantiationService.stubPromise(IExtensionGalleryService, 'getCompatibleExtension', gallery);
        instantiationService.stubPromise(IExtensionGalleryService, 'getExtensions', [gallery]);
        await new Promise((c) => {
            disposables.add(testObject.onDidChange(() => {
                if (testObject.enabled) {
                    c();
                }
            }));
            instantiationService.get(IExtensionsWorkbenchService).queryGallery(CancellationToken.None);
        });
        await new Promise((c) => {
            disposables.add(testObject.onDidChange(() => {
                if (!testObject.enabled) {
                    c();
                }
            }));
            installEvent.fire({ identifier: local.identifier, source: gallery, profileLocation: null });
        });
    });
    test('Test ManageExtensionAction when there is no extension', () => {
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.ManageExtensionAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        assert.ok(!testObject.enabled);
    });
    test('Test ManageExtensionAction when extension is installed', () => {
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.ManageExtensionAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const local = aLocalExtension('a');
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
        return instantiationService
            .get(IExtensionsWorkbenchService)
            .queryLocal()
            .then((extensions) => {
            testObject.extension = extensions[0];
            assert.ok(testObject.enabled);
            assert.strictEqual('extension-action icon manage codicon codicon-extensions-manage', testObject.class);
            assert.strictEqual('Manage', testObject.tooltip);
        });
    });
    test('Test ManageExtensionAction when extension is uninstalled', () => {
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.ManageExtensionAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const gallery = aGalleryExtension('a');
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(gallery));
        return instantiationService
            .get(IExtensionsWorkbenchService)
            .queryGallery(CancellationToken.None)
            .then((page) => {
            testObject.extension = page.firstPage[0];
            assert.ok(!testObject.enabled);
            assert.strictEqual('extension-action icon manage codicon codicon-extensions-manage hide', testObject.class);
            assert.strictEqual('Manage', testObject.tooltip);
        });
    });
    test('Test ManageExtensionAction when extension is installing', () => {
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.ManageExtensionAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const gallery = aGalleryExtension('a');
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(gallery));
        return instantiationService
            .get(IExtensionsWorkbenchService)
            .queryGallery(CancellationToken.None)
            .then((page) => {
            testObject.extension = page.firstPage[0];
            installEvent.fire({
                identifier: gallery.identifier,
                source: gallery,
                profileLocation: null,
            });
            assert.ok(!testObject.enabled);
            assert.strictEqual('extension-action icon manage codicon codicon-extensions-manage hide', testObject.class);
            assert.strictEqual('Manage', testObject.tooltip);
        });
    });
    test('Test ManageExtensionAction when extension is queried from gallery and installed', async () => {
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.ManageExtensionAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const gallery = aGalleryExtension('a');
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(gallery));
        const paged = await instantiationService
            .get(IExtensionsWorkbenchService)
            .queryGallery(CancellationToken.None);
        testObject.extension = paged.firstPage[0];
        installEvent.fire({ identifier: gallery.identifier, source: gallery, profileLocation: null });
        const promise = Event.toPromise(testObject.onDidChange);
        didInstallEvent.fire([
            {
                identifier: gallery.identifier,
                source: gallery,
                operation: 2 /* InstallOperation.Install */,
                local: aLocalExtension('a', gallery, gallery),
                profileLocation: null,
            },
        ]);
        await promise;
        assert.ok(testObject.enabled);
        assert.strictEqual('extension-action icon manage codicon codicon-extensions-manage', testObject.class);
        assert.strictEqual('Manage', testObject.tooltip);
    });
    test('Test ManageExtensionAction when extension is system extension', () => {
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.ManageExtensionAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const local = aLocalExtension('a', {}, { type: 0 /* ExtensionType.System */ });
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
        return instantiationService
            .get(IExtensionsWorkbenchService)
            .queryLocal()
            .then((extensions) => {
            testObject.extension = extensions[0];
            assert.ok(testObject.enabled);
            assert.strictEqual('extension-action icon manage codicon codicon-extensions-manage', testObject.class);
            assert.strictEqual('Manage', testObject.tooltip);
        });
    });
    test('Test ManageExtensionAction when extension is uninstalling', () => {
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.ManageExtensionAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const local = aLocalExtension('a');
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
        return instantiationService
            .get(IExtensionsWorkbenchService)
            .queryLocal()
            .then((extensions) => {
            testObject.extension = extensions[0];
            uninstallEvent.fire({ identifier: local.identifier, profileLocation: null });
            assert.ok(!testObject.enabled);
            assert.strictEqual('extension-action icon manage codicon codicon-extensions-manage', testObject.class);
            assert.strictEqual('Manage', testObject.tooltip);
        });
    });
    test('Test EnableForWorkspaceAction when there is no extension', () => {
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.EnableForWorkspaceAction));
        assert.ok(!testObject.enabled);
    });
    test('Test EnableForWorkspaceAction when there extension is not disabled', () => {
        const local = aLocalExtension('a');
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
        return instantiationService
            .get(IExtensionsWorkbenchService)
            .queryLocal()
            .then((extensions) => {
            const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.EnableForWorkspaceAction));
            testObject.extension = extensions[0];
            assert.ok(!testObject.enabled);
        });
    });
    test('Test EnableForWorkspaceAction when the extension is disabled globally', () => {
        const local = aLocalExtension('a');
        return instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([local], 9 /* EnablementState.DisabledGlobally */)
            .then(() => {
            instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
            return instantiationService
                .get(IExtensionsWorkbenchService)
                .queryLocal()
                .then((extensions) => {
                const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.EnableForWorkspaceAction));
                testObject.extension = extensions[0];
                assert.ok(testObject.enabled);
            });
        });
    });
    test('Test EnableForWorkspaceAction when extension is disabled for workspace', () => {
        const local = aLocalExtension('a');
        return instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([local], 10 /* EnablementState.DisabledWorkspace */)
            .then(() => {
            instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
            return instantiationService
                .get(IExtensionsWorkbenchService)
                .queryLocal()
                .then((extensions) => {
                const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.EnableForWorkspaceAction));
                testObject.extension = extensions[0];
                assert.ok(testObject.enabled);
            });
        });
    });
    test('Test EnableForWorkspaceAction when the extension is disabled globally and workspace', () => {
        const local = aLocalExtension('a');
        return instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([local], 9 /* EnablementState.DisabledGlobally */)
            .then(() => instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([local], 10 /* EnablementState.DisabledWorkspace */))
            .then(() => {
            instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
            return instantiationService
                .get(IExtensionsWorkbenchService)
                .queryLocal()
                .then((extensions) => {
                const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.EnableForWorkspaceAction));
                testObject.extension = extensions[0];
                assert.ok(testObject.enabled);
            });
        });
    });
    test('Test EnableGloballyAction when there is no extension', () => {
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.EnableGloballyAction));
        assert.ok(!testObject.enabled);
    });
    test('Test EnableGloballyAction when the extension is not disabled', () => {
        const local = aLocalExtension('a');
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
        return instantiationService
            .get(IExtensionsWorkbenchService)
            .queryLocal()
            .then((extensions) => {
            const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.EnableGloballyAction));
            testObject.extension = extensions[0];
            assert.ok(!testObject.enabled);
        });
    });
    test('Test EnableGloballyAction when the extension is disabled for workspace', () => {
        const local = aLocalExtension('a');
        return instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([local], 10 /* EnablementState.DisabledWorkspace */)
            .then(() => {
            instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
            return instantiationService
                .get(IExtensionsWorkbenchService)
                .queryLocal()
                .then((extensions) => {
                const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.EnableGloballyAction));
                testObject.extension = extensions[0];
                assert.ok(!testObject.enabled);
            });
        });
    });
    test('Test EnableGloballyAction when the extension is disabled globally', () => {
        const local = aLocalExtension('a');
        return instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([local], 9 /* EnablementState.DisabledGlobally */)
            .then(() => {
            instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
            return instantiationService
                .get(IExtensionsWorkbenchService)
                .queryLocal()
                .then((extensions) => {
                const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.EnableGloballyAction));
                testObject.extension = extensions[0];
                assert.ok(testObject.enabled);
            });
        });
    });
    test('Test EnableGloballyAction when the extension is disabled in both', () => {
        const local = aLocalExtension('a');
        return instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([local], 9 /* EnablementState.DisabledGlobally */)
            .then(() => instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([local], 10 /* EnablementState.DisabledWorkspace */))
            .then(() => {
            instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
            return instantiationService
                .get(IExtensionsWorkbenchService)
                .queryLocal()
                .then((extensions) => {
                const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.EnableGloballyAction));
                testObject.extension = extensions[0];
                assert.ok(testObject.enabled);
            });
        });
    });
    test('Test EnableAction when there is no extension', () => {
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.EnableDropDownAction));
        assert.ok(!testObject.enabled);
    });
    test('Test EnableDropDownAction when extension is installed and enabled', () => {
        const local = aLocalExtension('a');
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
        return instantiationService
            .get(IExtensionsWorkbenchService)
            .queryLocal()
            .then((extensions) => {
            const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.EnableDropDownAction));
            testObject.extension = extensions[0];
            assert.ok(!testObject.enabled);
        });
    });
    test('Test EnableDropDownAction when extension is installed and disabled globally', () => {
        const local = aLocalExtension('a');
        return instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([local], 9 /* EnablementState.DisabledGlobally */)
            .then(() => {
            instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
            return instantiationService
                .get(IExtensionsWorkbenchService)
                .queryLocal()
                .then((extensions) => {
                const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.EnableDropDownAction));
                testObject.extension = extensions[0];
                assert.ok(testObject.enabled);
            });
        });
    });
    test('Test EnableDropDownAction when extension is installed and disabled for workspace', () => {
        const local = aLocalExtension('a');
        return instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([local], 10 /* EnablementState.DisabledWorkspace */)
            .then(() => {
            instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
            return instantiationService
                .get(IExtensionsWorkbenchService)
                .queryLocal()
                .then((extensions) => {
                const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.EnableDropDownAction));
                testObject.extension = extensions[0];
                assert.ok(testObject.enabled);
            });
        });
    });
    test('Test EnableDropDownAction when extension is uninstalled', () => {
        const gallery = aGalleryExtension('a');
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(gallery));
        return instantiationService
            .get(IExtensionsWorkbenchService)
            .queryGallery(CancellationToken.None)
            .then((page) => {
            const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.EnableDropDownAction));
            testObject.extension = page.firstPage[0];
            assert.ok(!testObject.enabled);
        });
    });
    test('Test EnableDropDownAction when extension is installing', () => {
        const gallery = aGalleryExtension('a');
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(gallery));
        return instantiationService
            .get(IExtensionsWorkbenchService)
            .queryGallery(CancellationToken.None)
            .then((page) => {
            const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.EnableDropDownAction));
            testObject.extension = page.firstPage[0];
            disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
            installEvent.fire({
                identifier: gallery.identifier,
                source: gallery,
                profileLocation: null,
            });
            assert.ok(!testObject.enabled);
        });
    });
    test('Test EnableDropDownAction when extension is uninstalling', () => {
        const local = aLocalExtension('a');
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
        return instantiationService
            .get(IExtensionsWorkbenchService)
            .queryLocal()
            .then((extensions) => {
            const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.EnableDropDownAction));
            testObject.extension = extensions[0];
            uninstallEvent.fire({ identifier: local.identifier, profileLocation: null });
            assert.ok(!testObject.enabled);
        });
    });
    test('Test DisableForWorkspaceAction when there is no extension', () => {
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.DisableForWorkspaceAction));
        assert.ok(!testObject.enabled);
    });
    test('Test DisableForWorkspaceAction when the extension is disabled globally', () => {
        const local = aLocalExtension('a');
        return instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([local], 9 /* EnablementState.DisabledGlobally */)
            .then(() => {
            instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
            return instantiationService
                .get(IExtensionsWorkbenchService)
                .queryLocal()
                .then((extensions) => {
                const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.DisableForWorkspaceAction));
                testObject.extension = extensions[0];
                assert.ok(!testObject.enabled);
            });
        });
    });
    test('Test DisableForWorkspaceAction when the extension is disabled workspace', () => {
        const local = aLocalExtension('a');
        return instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([local], 9 /* EnablementState.DisabledGlobally */)
            .then(() => {
            instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
            return instantiationService
                .get(IExtensionsWorkbenchService)
                .queryLocal()
                .then((extensions) => {
                const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.DisableForWorkspaceAction));
                testObject.extension = extensions[0];
                assert.ok(!testObject.enabled);
            });
        });
    });
    test('Test DisableForWorkspaceAction when extension is enabled', () => {
        const local = aLocalExtension('a');
        instantiationService.stub(IExtensionService, {
            extensions: [toExtensionDescription(local)],
            onDidChangeExtensions: Event.None,
            whenInstalledExtensionsRegistered: () => Promise.resolve(true),
        });
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
        return instantiationService
            .get(IExtensionsWorkbenchService)
            .queryLocal()
            .then((extensions) => {
            const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.DisableForWorkspaceAction));
            testObject.extension = extensions[0];
            assert.ok(testObject.enabled);
        });
    });
    test('Test DisableGloballyAction when there is no extension', () => {
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.DisableGloballyAction));
        assert.ok(!testObject.enabled);
    });
    test('Test DisableGloballyAction when the extension is disabled globally', () => {
        const local = aLocalExtension('a');
        return instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([local], 9 /* EnablementState.DisabledGlobally */)
            .then(() => {
            instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
            return instantiationService
                .get(IExtensionsWorkbenchService)
                .queryLocal()
                .then((extensions) => {
                const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.DisableGloballyAction));
                testObject.extension = extensions[0];
                assert.ok(!testObject.enabled);
            });
        });
    });
    test('Test DisableGloballyAction when the extension is disabled for workspace', () => {
        const local = aLocalExtension('a');
        return instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([local], 10 /* EnablementState.DisabledWorkspace */)
            .then(() => {
            instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
            return instantiationService
                .get(IExtensionsWorkbenchService)
                .queryLocal()
                .then((extensions) => {
                const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.DisableGloballyAction));
                testObject.extension = extensions[0];
                assert.ok(!testObject.enabled);
            });
        });
    });
    test('Test DisableGloballyAction when the extension is enabled', () => {
        const local = aLocalExtension('a');
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
        instantiationService.stub(IExtensionService, {
            extensions: [toExtensionDescription(local)],
            onDidChangeExtensions: Event.None,
            whenInstalledExtensionsRegistered: () => Promise.resolve(true),
        });
        return instantiationService
            .get(IExtensionsWorkbenchService)
            .queryLocal()
            .then((extensions) => {
            const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.DisableGloballyAction));
            testObject.extension = extensions[0];
            assert.ok(testObject.enabled);
        });
    });
    test('Test DisableGloballyAction when extension is installed and enabled', () => {
        const local = aLocalExtension('a');
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
        instantiationService.stub(IExtensionService, {
            extensions: [toExtensionDescription(local)],
            onDidChangeExtensions: Event.None,
            whenInstalledExtensionsRegistered: () => Promise.resolve(true),
        });
        return instantiationService
            .get(IExtensionsWorkbenchService)
            .queryLocal()
            .then((extensions) => {
            const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.DisableGloballyAction));
            testObject.extension = extensions[0];
            assert.ok(testObject.enabled);
        });
    });
    test('Test DisableGloballyAction when extension is installed and disabled globally', () => {
        const local = aLocalExtension('a');
        instantiationService.stub(IExtensionService, {
            extensions: [toExtensionDescription(local)],
            onDidChangeExtensions: Event.None,
            whenInstalledExtensionsRegistered: () => Promise.resolve(true),
        });
        return instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([local], 9 /* EnablementState.DisabledGlobally */)
            .then(() => {
            instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
            return instantiationService
                .get(IExtensionsWorkbenchService)
                .queryLocal()
                .then((extensions) => {
                const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.DisableGloballyAction));
                testObject.extension = extensions[0];
                assert.ok(!testObject.enabled);
            });
        });
    });
    test('Test DisableGloballyAction when extension is uninstalled', () => {
        const gallery = aGalleryExtension('a');
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(gallery));
        instantiationService.stub(IExtensionService, {
            extensions: [toExtensionDescription(aLocalExtension('a'))],
            onDidChangeExtensions: Event.None,
            whenInstalledExtensionsRegistered: () => Promise.resolve(true),
        });
        return instantiationService
            .get(IExtensionsWorkbenchService)
            .queryGallery(CancellationToken.None)
            .then((page) => {
            const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.DisableGloballyAction));
            testObject.extension = page.firstPage[0];
            assert.ok(!testObject.enabled);
        });
    });
    test('Test DisableGloballyAction when extension is installing', () => {
        const gallery = aGalleryExtension('a');
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(gallery));
        instantiationService.stub(IExtensionService, {
            extensions: [toExtensionDescription(aLocalExtension('a'))],
            onDidChangeExtensions: Event.None,
            whenInstalledExtensionsRegistered: () => Promise.resolve(true),
        });
        return instantiationService
            .get(IExtensionsWorkbenchService)
            .queryGallery(CancellationToken.None)
            .then((page) => {
            const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.DisableGloballyAction));
            testObject.extension = page.firstPage[0];
            disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
            installEvent.fire({
                identifier: gallery.identifier,
                source: gallery,
                profileLocation: null,
            });
            assert.ok(!testObject.enabled);
        });
    });
    test('Test DisableGloballyAction when extension is uninstalling', () => {
        const local = aLocalExtension('a');
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
        instantiationService.stub(IExtensionService, {
            extensions: [toExtensionDescription(local)],
            onDidChangeExtensions: Event.None,
            whenInstalledExtensionsRegistered: () => Promise.resolve(true),
        });
        return instantiationService
            .get(IExtensionsWorkbenchService)
            .queryLocal()
            .then((extensions) => {
            const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.DisableGloballyAction));
            testObject.extension = extensions[0];
            disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
            uninstallEvent.fire({ identifier: local.identifier, profileLocation: null });
            assert.ok(!testObject.enabled);
        });
    });
});
suite('ExtensionRuntimeStateAction', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    setup(() => setupTest(disposables));
    test('Test Runtime State when there is no extension', () => {
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.ExtensionRuntimeStateAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        assert.ok(!testObject.enabled);
    });
    test('Test Runtime State when extension state is installing', async () => {
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.ExtensionRuntimeStateAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const workbenchService = instantiationService.get(IExtensionsWorkbenchService);
        const gallery = aGalleryExtension('a');
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(gallery));
        const paged = await workbenchService.queryGallery(CancellationToken.None);
        testObject.extension = paged.firstPage[0];
        installEvent.fire({ identifier: gallery.identifier, source: gallery, profileLocation: null });
        assert.ok(!testObject.enabled);
    });
    test('Test Runtime State when extension state is uninstalling', async () => {
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.ExtensionRuntimeStateAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const local = aLocalExtension('a');
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
        const extensions = await instantiationService.get(IExtensionsWorkbenchService).queryLocal();
        testObject.extension = extensions[0];
        uninstallEvent.fire({ identifier: local.identifier, profileLocation: null });
        assert.ok(!testObject.enabled);
    });
    test('Test Runtime State when extension is newly installed', async () => {
        const onDidChangeExtensionsEmitter = new Emitter();
        instantiationService.stub(IExtensionService, {
            extensions: [toExtensionDescription(aLocalExtension('b'))],
            onDidChangeExtensions: onDidChangeExtensionsEmitter.event,
            canAddExtension: (extension) => false,
            whenInstalledExtensionsRegistered: () => Promise.resolve(true),
        });
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.ExtensionRuntimeStateAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const gallery = aGalleryExtension('a');
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(gallery));
        const paged = await instantiationService
            .get(IExtensionsWorkbenchService)
            .queryGallery(CancellationToken.None);
        testObject.extension = paged.firstPage[0];
        assert.ok(!testObject.enabled);
        installEvent.fire({ identifier: gallery.identifier, source: gallery, profileLocation: null });
        const promise = Event.toPromise(testObject.onDidChange);
        didInstallEvent.fire([
            {
                identifier: gallery.identifier,
                source: gallery,
                operation: 2 /* InstallOperation.Install */,
                local: aLocalExtension('a', gallery, gallery),
                profileLocation: null,
            },
        ]);
        await promise;
        assert.ok(testObject.enabled);
        assert.strictEqual(testObject.tooltip, `Please restart extensions to enable this extension.`);
    });
    test('Test Runtime State when extension is newly installed and ext host restart is not required', async () => {
        const onDidChangeExtensionsEmitter = new Emitter();
        instantiationService.stub(IExtensionService, {
            extensions: [toExtensionDescription(aLocalExtension('b'))],
            onDidChangeExtensions: onDidChangeExtensionsEmitter.event,
            canAddExtension: (extension) => true,
            whenInstalledExtensionsRegistered: () => Promise.resolve(true),
        });
        instantiationService.set(IExtensionsWorkbenchService, disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService)));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.ExtensionRuntimeStateAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const gallery = aGalleryExtension('a');
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(gallery));
        const paged = await instantiationService
            .get(IExtensionsWorkbenchService)
            .queryGallery(CancellationToken.None);
        testObject.extension = paged.firstPage[0];
        assert.ok(!testObject.enabled);
        installEvent.fire({ identifier: gallery.identifier, source: gallery, profileLocation: null });
        didInstallEvent.fire([
            {
                identifier: gallery.identifier,
                source: gallery,
                operation: 2 /* InstallOperation.Install */,
                local: aLocalExtension('a', gallery, gallery),
                profileLocation: null,
            },
        ]);
        assert.ok(!testObject.enabled);
    });
    test('Test Runtime State when extension is installed and uninstalled', async () => {
        instantiationService.stub(IExtensionService, {
            extensions: [toExtensionDescription(aLocalExtension('b'))],
            onDidChangeExtensions: Event.None,
            canRemoveExtension: (extension) => false,
            canAddExtension: (extension) => false,
            whenInstalledExtensionsRegistered: () => Promise.resolve(true),
        });
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.ExtensionRuntimeStateAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const gallery = aGalleryExtension('a');
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(gallery));
        const paged = await instantiationService
            .get(IExtensionsWorkbenchService)
            .queryGallery(CancellationToken.None);
        testObject.extension = paged.firstPage[0];
        const identifier = gallery.identifier;
        installEvent.fire({ identifier, source: gallery, profileLocation: null });
        didInstallEvent.fire([
            {
                identifier,
                source: gallery,
                operation: 2 /* InstallOperation.Install */,
                local: aLocalExtension('a', gallery, { identifier }),
                profileLocation: null,
            },
        ]);
        uninstallEvent.fire({ identifier, profileLocation: null });
        didUninstallEvent.fire({ identifier, profileLocation: null });
        assert.ok(!testObject.enabled);
    });
    test('Test Runtime State when extension is uninstalled', async () => {
        instantiationService.stub(IExtensionService, {
            extensions: [toExtensionDescription(aLocalExtension('a', { version: '1.0.0' }))],
            onDidChangeExtensions: Event.None,
            canRemoveExtension: (extension) => false,
            canAddExtension: (extension) => false,
            whenInstalledExtensionsRegistered: () => Promise.resolve(true),
        });
        instantiationService.set(IExtensionsWorkbenchService, disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService)));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.ExtensionRuntimeStateAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const local = aLocalExtension('a');
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
        const extensions = await instantiationService.get(IExtensionsWorkbenchService).queryLocal();
        testObject.extension = extensions[0];
        uninstallEvent.fire({ identifier: local.identifier, profileLocation: null });
        didUninstallEvent.fire({ identifier: local.identifier, profileLocation: null });
        assert.ok(testObject.enabled);
        assert.strictEqual(testObject.tooltip, `Please restart extensions to complete the uninstallation of this extension.`);
    });
    test('Test Runtime State when extension is uninstalled and can be removed', async () => {
        const local = aLocalExtension('a');
        instantiationService.stub(IExtensionService, {
            extensions: [toExtensionDescription(local)],
            onDidChangeExtensions: Event.None,
            canRemoveExtension: (extension) => true,
            canAddExtension: (extension) => true,
            whenInstalledExtensionsRegistered: () => Promise.resolve(true),
        });
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.ExtensionRuntimeStateAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
        const extensions = await instantiationService.get(IExtensionsWorkbenchService).queryLocal();
        testObject.extension = extensions[0];
        uninstallEvent.fire({ identifier: local.identifier, profileLocation: null });
        didUninstallEvent.fire({ identifier: local.identifier, profileLocation: null });
        assert.ok(!testObject.enabled);
    });
    test('Test Runtime State when extension is uninstalled and installed', async () => {
        instantiationService.stub(IExtensionService, {
            extensions: [toExtensionDescription(aLocalExtension('a', { version: '1.0.0' }))],
            onDidChangeExtensions: Event.None,
            canRemoveExtension: (extension) => false,
            canAddExtension: (extension) => false,
            whenInstalledExtensionsRegistered: () => Promise.resolve(true),
        });
        instantiationService.set(IExtensionsWorkbenchService, disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService)));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.ExtensionRuntimeStateAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const local = aLocalExtension('a');
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
        const extensions = await instantiationService.get(IExtensionsWorkbenchService).queryLocal();
        testObject.extension = extensions[0];
        uninstallEvent.fire({ identifier: local.identifier, profileLocation: null });
        didUninstallEvent.fire({ identifier: local.identifier, profileLocation: null });
        const gallery = aGalleryExtension('a');
        const identifier = gallery.identifier;
        installEvent.fire({ identifier, source: gallery, profileLocation: null });
        didInstallEvent.fire([
            {
                identifier,
                source: gallery,
                operation: 2 /* InstallOperation.Install */,
                local,
                profileLocation: null,
            },
        ]);
        assert.ok(!testObject.enabled);
    });
    test('Test Runtime State when extension is updated while running', async () => {
        instantiationService.stub(IExtensionService, {
            extensions: [toExtensionDescription(aLocalExtension('a', { version: '1.0.1' }))],
            onDidChangeExtensions: Event.None,
            canRemoveExtension: (extension) => true,
            canAddExtension: (extension) => false,
            whenInstalledExtensionsRegistered: () => Promise.resolve(true),
        });
        instantiationService.set(IExtensionsWorkbenchService, disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService)));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.ExtensionRuntimeStateAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const local = aLocalExtension('a', { version: '1.0.1' });
        const workbenchService = instantiationService.get(IExtensionsWorkbenchService);
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
        const extensions = await workbenchService.queryLocal();
        testObject.extension = extensions[0];
        return new Promise((c) => {
            disposables.add(testObject.onDidChange(() => {
                if (testObject.enabled &&
                    testObject.tooltip === `Please restart extensions to enable the updated extension.`) {
                    c();
                }
            }));
            const gallery = aGalleryExtension('a', { uuid: local.identifier.id, version: '1.0.2' });
            installEvent.fire({ identifier: gallery.identifier, source: gallery, profileLocation: null });
            didInstallEvent.fire([
                {
                    identifier: gallery.identifier,
                    source: gallery,
                    operation: 2 /* InstallOperation.Install */,
                    local: aLocalExtension('a', gallery, gallery),
                    profileLocation: null,
                },
            ]);
        });
    });
    test('Test Runtime State when extension is updated when not running', async () => {
        instantiationService.stub(IExtensionService, {
            extensions: [toExtensionDescription(aLocalExtension('b'))],
            onDidChangeExtensions: Event.None,
            canRemoveExtension: (extension) => false,
            canAddExtension: (extension) => false,
            whenInstalledExtensionsRegistered: () => Promise.resolve(true),
        });
        const local = aLocalExtension('a', { version: '1.0.1' });
        await instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([local], 9 /* EnablementState.DisabledGlobally */);
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.ExtensionRuntimeStateAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const workbenchService = instantiationService.get(IExtensionsWorkbenchService);
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
        const extensions = await workbenchService.queryLocal();
        testObject.extension = extensions[0];
        const gallery = aGalleryExtension('a', { identifier: local.identifier, version: '1.0.2' });
        installEvent.fire({ identifier: gallery.identifier, source: gallery, profileLocation: null });
        didInstallEvent.fire([
            {
                identifier: gallery.identifier,
                source: gallery,
                operation: 3 /* InstallOperation.Update */,
                local: aLocalExtension('a', gallery, gallery),
                profileLocation: null,
            },
        ]);
        assert.ok(!testObject.enabled);
    });
    test('Test Runtime State when extension is disabled when running', async () => {
        instantiationService.stub(IExtensionService, {
            extensions: [toExtensionDescription(aLocalExtension('a'))],
            onDidChangeExtensions: Event.None,
            canRemoveExtension: (extension) => false,
            canAddExtension: (extension) => false,
            whenInstalledExtensionsRegistered: () => Promise.resolve(true),
        });
        instantiationService.set(IExtensionsWorkbenchService, disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService)));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.ExtensionRuntimeStateAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const local = aLocalExtension('a');
        const workbenchService = instantiationService.get(IExtensionsWorkbenchService);
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
        const extensions = await workbenchService.queryLocal();
        testObject.extension = extensions[0];
        await workbenchService.setEnablement(extensions[0], 9 /* EnablementState.DisabledGlobally */);
        await testObject.update();
        assert.ok(testObject.enabled);
        assert.strictEqual(`Please restart extensions to disable this extension.`, testObject.tooltip);
    });
    test('Test Runtime State when extension enablement is toggled when running', async () => {
        instantiationService.stub(IExtensionService, {
            extensions: [toExtensionDescription(aLocalExtension('a', { version: '1.0.0' }))],
            onDidChangeExtensions: Event.None,
            canRemoveExtension: (extension) => false,
            canAddExtension: (extension) => false,
            whenInstalledExtensionsRegistered: () => Promise.resolve(true),
        });
        instantiationService.set(IExtensionsWorkbenchService, disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService)));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.ExtensionRuntimeStateAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const local = aLocalExtension('a');
        const workbenchService = instantiationService.get(IExtensionsWorkbenchService);
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
        const extensions = await workbenchService.queryLocal();
        testObject.extension = extensions[0];
        await workbenchService.setEnablement(extensions[0], 9 /* EnablementState.DisabledGlobally */);
        await workbenchService.setEnablement(extensions[0], 11 /* EnablementState.EnabledGlobally */);
        assert.ok(!testObject.enabled);
    });
    test('Test Runtime State when extension is enabled when not running', async () => {
        instantiationService.stub(IExtensionService, {
            extensions: [toExtensionDescription(aLocalExtension('b'))],
            onDidChangeExtensions: Event.None,
            canRemoveExtension: (extension) => false,
            canAddExtension: (extension) => false,
            whenInstalledExtensionsRegistered: () => Promise.resolve(true),
        });
        const local = aLocalExtension('a');
        await instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([local], 9 /* EnablementState.DisabledGlobally */);
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.ExtensionRuntimeStateAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const workbenchService = instantiationService.get(IExtensionsWorkbenchService);
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
        const extensions = await workbenchService.queryLocal();
        testObject.extension = extensions[0];
        await workbenchService.setEnablement(extensions[0], 11 /* EnablementState.EnabledGlobally */);
        await testObject.update();
        assert.ok(testObject.enabled);
        assert.strictEqual(`Please restart extensions to enable this extension.`, testObject.tooltip);
    });
    test('Test Runtime State when extension enablement is toggled when not running', async () => {
        instantiationService.stub(IExtensionService, {
            extensions: [toExtensionDescription(aLocalExtension('b'))],
            onDidChangeExtensions: Event.None,
            canRemoveExtension: (extension) => false,
            canAddExtension: (extension) => false,
            whenInstalledExtensionsRegistered: () => Promise.resolve(true),
        });
        const local = aLocalExtension('a');
        await instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([local], 9 /* EnablementState.DisabledGlobally */);
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.ExtensionRuntimeStateAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const workbenchService = instantiationService.get(IExtensionsWorkbenchService);
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
        const extensions = await workbenchService.queryLocal();
        testObject.extension = extensions[0];
        await workbenchService.setEnablement(extensions[0], 11 /* EnablementState.EnabledGlobally */);
        await workbenchService.setEnablement(extensions[0], 9 /* EnablementState.DisabledGlobally */);
        assert.ok(!testObject.enabled);
    });
    test('Test Runtime State when extension is updated when not running and enabled', async () => {
        instantiationService.stub(IExtensionService, {
            extensions: [toExtensionDescription(aLocalExtension('a'))],
            onDidChangeExtensions: Event.None,
            canRemoveExtension: (extension) => false,
            canAddExtension: (extension) => false,
            whenInstalledExtensionsRegistered: () => Promise.resolve(true),
        });
        const local = aLocalExtension('a', { version: '1.0.1' });
        await instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([local], 9 /* EnablementState.DisabledGlobally */);
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.ExtensionRuntimeStateAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const workbenchService = instantiationService.get(IExtensionsWorkbenchService);
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
        const extensions = await workbenchService.queryLocal();
        testObject.extension = extensions[0];
        const gallery = aGalleryExtension('a', { identifier: local.identifier, version: '1.0.2' });
        installEvent.fire({ identifier: gallery.identifier, source: gallery, profileLocation: null });
        didInstallEvent.fire([
            {
                identifier: gallery.identifier,
                source: gallery,
                operation: 2 /* InstallOperation.Install */,
                local: aLocalExtension('a', gallery, gallery),
                profileLocation: null,
            },
        ]);
        await workbenchService.setEnablement(extensions[0], 11 /* EnablementState.EnabledGlobally */);
        await testObject.update();
        assert.ok(testObject.enabled);
        assert.strictEqual(`Please restart extensions to enable this extension.`, testObject.tooltip);
    });
    test('Test Runtime State when a localization extension is newly installed', async () => {
        instantiationService.stub(IExtensionService, {
            extensions: [toExtensionDescription(aLocalExtension('b'))],
            onDidChangeExtensions: Event.None,
            canRemoveExtension: (extension) => false,
            canAddExtension: (extension) => false,
            whenInstalledExtensionsRegistered: () => Promise.resolve(true),
        });
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.ExtensionRuntimeStateAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const gallery = aGalleryExtension('a');
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(gallery));
        const paged = await instantiationService
            .get(IExtensionsWorkbenchService)
            .queryGallery(CancellationToken.None);
        testObject.extension = paged.firstPage[0];
        assert.ok(!testObject.enabled);
        installEvent.fire({ identifier: gallery.identifier, source: gallery, profileLocation: null });
        didInstallEvent.fire([
            {
                identifier: gallery.identifier,
                source: gallery,
                operation: 2 /* InstallOperation.Install */,
                local: aLocalExtension('a', {
                    ...gallery,
                    ...{
                        contributes: {
                            localizations: [{ languageId: 'de', translations: [] }],
                        },
                    },
                }, gallery),
                profileLocation: null,
            },
        ]);
        assert.ok(!testObject.enabled);
    });
    test('Test Runtime State when a localization extension is updated while running', async () => {
        instantiationService.stub(IExtensionService, {
            extensions: [toExtensionDescription(aLocalExtension('a', { version: '1.0.1' }))],
            onDidChangeExtensions: Event.None,
            canRemoveExtension: (extension) => false,
            canAddExtension: (extension) => false,
            whenInstalledExtensionsRegistered: () => Promise.resolve(true),
        });
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.ExtensionRuntimeStateAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const local = aLocalExtension('a', {
            version: '1.0.1',
            contributes: {
                localizations: [{ languageId: 'de', translations: [] }],
            },
        });
        const workbenchService = instantiationService.get(IExtensionsWorkbenchService);
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
        const extensions = await workbenchService.queryLocal();
        testObject.extension = extensions[0];
        const gallery = aGalleryExtension('a', { uuid: local.identifier.id, version: '1.0.2' });
        installEvent.fire({ identifier: gallery.identifier, source: gallery, profileLocation: null });
        didInstallEvent.fire([
            {
                identifier: gallery.identifier,
                source: gallery,
                operation: 2 /* InstallOperation.Install */,
                local: aLocalExtension('a', {
                    ...gallery,
                    ...{
                        contributes: {
                            localizations: [{ languageId: 'de', translations: [] }],
                        },
                    },
                }, gallery),
                profileLocation: null,
            },
        ]);
        assert.ok(!testObject.enabled);
    });
    test('Test Runtime State when extension is not installed but extension from different server is installed and running', async () => {
        // multi server setup
        const gallery = aGalleryExtension('a');
        const localExtension = aLocalExtension('a', { extensionKind: ['workspace'] }, { location: URI.file('pub.a') });
        const remoteExtension = aLocalExtension('a', { extensionKind: ['workspace'] }, { location: URI.file('pub.a').with({ scheme: Schemas.vscodeRemote }) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localExtension]), createExtensionManagementService([remoteExtension]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        const onDidChangeExtensionsEmitter = new Emitter();
        instantiationService.stub(IExtensionService, {
            extensions: [toExtensionDescription(remoteExtension)],
            onDidChangeExtensions: onDidChangeExtensionsEmitter.event,
            canAddExtension: (extension) => false,
            whenInstalledExtensionsRegistered: () => Promise.resolve(true),
        });
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.ExtensionRuntimeStateAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(gallery));
        await workbenchService.queryGallery(CancellationToken.None);
        const extensions = await workbenchService.queryLocal(extensionManagementServerService.localExtensionManagementServer);
        testObject.extension = extensions[0];
        assert.ok(testObject.extension);
        assert.ok(!testObject.enabled);
    });
    test('Test Runtime State when extension is uninstalled but extension from different server is installed and running', async () => {
        // multi server setup
        const gallery = aGalleryExtension('a');
        const localExtension = aLocalExtension('a', { extensionKind: ['workspace'] }, { location: URI.file('pub.a') });
        const remoteExtension = aLocalExtension('a', { extensionKind: ['workspace'] }, { location: URI.file('pub.a').with({ scheme: Schemas.vscodeRemote }) });
        const localExtensionManagementService = createExtensionManagementService([localExtension]);
        const uninstallEvent = new Emitter();
        const onDidUninstallEvent = new Emitter();
        localExtensionManagementService.onUninstallExtension = uninstallEvent.event;
        localExtensionManagementService.onDidUninstallExtension = onDidUninstallEvent.event;
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, localExtensionManagementService, createExtensionManagementService([remoteExtension]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        const onDidChangeExtensionsEmitter = new Emitter();
        instantiationService.stub(IExtensionService, {
            extensions: [toExtensionDescription(remoteExtension)],
            onDidChangeExtensions: onDidChangeExtensionsEmitter.event,
            canAddExtension: (extension) => false,
            whenInstalledExtensionsRegistered: () => Promise.resolve(true),
        });
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.ExtensionRuntimeStateAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(gallery));
        await workbenchService.queryGallery(CancellationToken.None);
        const extensions = await workbenchService.queryLocal(extensionManagementServerService.localExtensionManagementServer);
        testObject.extension = extensions[0];
        assert.ok(testObject.extension);
        assert.ok(!testObject.enabled);
        uninstallEvent.fire({ identifier: localExtension.identifier, profileLocation: null });
        didUninstallEvent.fire({ identifier: localExtension.identifier, profileLocation: null });
        assert.ok(!testObject.enabled);
    });
    test('Test Runtime State when workspace extension is disabled on local server and installed in remote server', async () => {
        // multi server setup
        const gallery = aGalleryExtension('a');
        const remoteExtensionManagementService = createExtensionManagementService([]);
        const onDidInstallEvent = new Emitter();
        remoteExtensionManagementService.onDidInstallExtensions = onDidInstallEvent.event;
        const localExtension = aLocalExtension('a', { extensionKind: ['workspace'] }, { location: URI.file('pub.a') });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localExtension]), remoteExtensionManagementService);
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        const onDidChangeExtensionsEmitter = new Emitter();
        instantiationService.stub(IExtensionService, {
            extensions: [],
            onDidChangeExtensions: onDidChangeExtensionsEmitter.event,
            canAddExtension: (extension) => false,
            whenInstalledExtensionsRegistered: () => Promise.resolve(true),
        });
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.ExtensionRuntimeStateAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(gallery));
        await workbenchService.queryGallery(CancellationToken.None);
        const extensions = await workbenchService.queryLocal(extensionManagementServerService.localExtensionManagementServer);
        testObject.extension = extensions[0];
        assert.ok(testObject.extension);
        assert.ok(!testObject.enabled);
        const remoteExtension = aLocalExtension('a', { extensionKind: ['workspace'] }, { location: URI.file('pub.a').with({ scheme: Schemas.vscodeRemote }) });
        const promise = Event.toPromise(testObject.onDidChange);
        onDidInstallEvent.fire([
            {
                identifier: remoteExtension.identifier,
                local: remoteExtension,
                operation: 2 /* InstallOperation.Install */,
                profileLocation: null,
            },
        ]);
        await promise;
        assert.ok(testObject.enabled);
        assert.strictEqual(testObject.tooltip, `Please reload window to enable this extension.`);
    });
    test('Test Runtime State when ui extension is disabled on remote server and installed in local server', async () => {
        // multi server setup
        const gallery = aGalleryExtension('a');
        const localExtensionManagementService = createExtensionManagementService([]);
        const onDidInstallEvent = new Emitter();
        localExtensionManagementService.onDidInstallExtensions = onDidInstallEvent.event;
        const remoteExtension = aLocalExtension('a', { extensionKind: ['ui'] }, { location: URI.file('pub.a').with({ scheme: Schemas.vscodeRemote }) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, localExtensionManagementService, createExtensionManagementService([remoteExtension]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        const onDidChangeExtensionsEmitter = new Emitter();
        instantiationService.stub(IExtensionService, {
            extensions: [],
            onDidChangeExtensions: onDidChangeExtensionsEmitter.event,
            canAddExtension: (extension) => false,
            whenInstalledExtensionsRegistered: () => Promise.resolve(true),
        });
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.ExtensionRuntimeStateAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(gallery));
        await workbenchService.queryGallery(CancellationToken.None);
        const extensions = await workbenchService.queryLocal(extensionManagementServerService.remoteExtensionManagementServer);
        testObject.extension = extensions[0];
        assert.ok(testObject.extension);
        assert.ok(!testObject.enabled);
        const localExtension = aLocalExtension('a', { extensionKind: ['ui'] }, { location: URI.file('pub.a') });
        const promise = Event.toPromise(Event.filter(testObject.onDidChange, () => testObject.enabled));
        onDidInstallEvent.fire([
            {
                identifier: localExtension.identifier,
                local: localExtension,
                operation: 2 /* InstallOperation.Install */,
                profileLocation: null,
            },
        ]);
        await promise;
        assert.ok(testObject.enabled);
        assert.strictEqual(testObject.tooltip, `Please reload window to enable this extension.`);
    });
    test('Test Runtime State for remote ui extension is disabled when it is installed and enabled in local server', async () => {
        // multi server setup
        const gallery = aGalleryExtension('a');
        const localExtension = aLocalExtension('a', { extensionKind: ['ui'] }, { location: URI.file('pub.a') });
        const localExtensionManagementService = createExtensionManagementService([localExtension]);
        const onDidInstallEvent = new Emitter();
        localExtensionManagementService.onDidInstallExtensions = onDidInstallEvent.event;
        const remoteExtension = aLocalExtension('a', { extensionKind: ['ui'] }, { location: URI.file('pub.a').with({ scheme: Schemas.vscodeRemote }) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, localExtensionManagementService, createExtensionManagementService([remoteExtension]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        const onDidChangeExtensionsEmitter = new Emitter();
        instantiationService.stub(IExtensionService, {
            extensions: [toExtensionDescription(localExtension)],
            onDidChangeExtensions: onDidChangeExtensionsEmitter.event,
            canAddExtension: (extension) => false,
            whenInstalledExtensionsRegistered: () => Promise.resolve(true),
        });
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.ExtensionRuntimeStateAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(gallery));
        await workbenchService.queryGallery(CancellationToken.None);
        const extensions = await workbenchService.queryLocal(extensionManagementServerService.remoteExtensionManagementServer);
        testObject.extension = extensions[0];
        assert.ok(testObject.extension);
        assert.ok(!testObject.enabled);
    });
    test('Test Runtime State for remote workspace+ui extension is enabled when it is installed and enabled in local server', async () => {
        // multi server setup
        const gallery = aGalleryExtension('a');
        const localExtension = aLocalExtension('a', { extensionKind: ['workspace', 'ui'] }, { location: URI.file('pub.a') });
        const localExtensionManagementService = createExtensionManagementService([localExtension]);
        const onDidInstallEvent = new Emitter();
        localExtensionManagementService.onDidInstallExtensions = onDidInstallEvent.event;
        const remoteExtension = aLocalExtension('a', { extensionKind: ['workspace', 'ui'] }, { location: URI.file('pub.a').with({ scheme: Schemas.vscodeRemote }) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, localExtensionManagementService, createExtensionManagementService([remoteExtension]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        const onDidChangeExtensionsEmitter = new Emitter();
        instantiationService.stub(IExtensionService, {
            extensions: [toExtensionDescription(localExtension)],
            onDidChangeExtensions: onDidChangeExtensionsEmitter.event,
            canAddExtension: (extension) => false,
            whenInstalledExtensionsRegistered: () => Promise.resolve(true),
        });
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.ExtensionRuntimeStateAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(gallery));
        await workbenchService.queryGallery(CancellationToken.None);
        const extensions = await workbenchService.queryLocal(extensionManagementServerService.remoteExtensionManagementServer);
        testObject.extension = extensions[0];
        assert.ok(testObject.extension);
        assert.ok(testObject.enabled);
    });
    test('Test Runtime State for local ui+workspace extension is enabled when it is installed and enabled in remote server', async () => {
        // multi server setup
        const gallery = aGalleryExtension('a');
        const localExtension = aLocalExtension('a', { extensionKind: ['ui', 'workspace'] }, { location: URI.file('pub.a') });
        const remoteExtension = aLocalExtension('a', { extensionKind: ['ui', 'workspace'] }, { location: URI.file('pub.a').with({ scheme: Schemas.vscodeRemote }) });
        const remoteExtensionManagementService = createExtensionManagementService([remoteExtension]);
        const onDidInstallEvent = new Emitter();
        remoteExtensionManagementService.onDidInstallExtensions = onDidInstallEvent.event;
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localExtension]), remoteExtensionManagementService);
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        const onDidChangeExtensionsEmitter = new Emitter();
        instantiationService.stub(IExtensionService, {
            extensions: [toExtensionDescription(remoteExtension)],
            onDidChangeExtensions: onDidChangeExtensionsEmitter.event,
            canAddExtension: (extension) => false,
            whenInstalledExtensionsRegistered: () => Promise.resolve(true),
        });
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.ExtensionRuntimeStateAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(gallery));
        await workbenchService.queryGallery(CancellationToken.None);
        const extensions = await workbenchService.queryLocal(extensionManagementServerService.localExtensionManagementServer);
        testObject.extension = extensions[0];
        assert.ok(testObject.extension);
        assert.ok(testObject.enabled);
    });
    test('Test Runtime State for local workspace+ui extension is enabled when it is installed in both servers but running in local server', async () => {
        // multi server setup
        const gallery = aGalleryExtension('a');
        const localExtension = aLocalExtension('a', { extensionKind: ['workspace', 'ui'] }, { location: URI.file('pub.a') });
        const localExtensionManagementService = createExtensionManagementService([localExtension]);
        const onDidInstallEvent = new Emitter();
        localExtensionManagementService.onDidInstallExtensions = onDidInstallEvent.event;
        const remoteExtension = aLocalExtension('a', { extensionKind: ['workspace', 'ui'] }, { location: URI.file('pub.a').with({ scheme: Schemas.vscodeRemote }) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, localExtensionManagementService, createExtensionManagementService([remoteExtension]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        const onDidChangeExtensionsEmitter = new Emitter();
        instantiationService.stub(IExtensionService, {
            extensions: [toExtensionDescription(localExtension)],
            onDidChangeExtensions: onDidChangeExtensionsEmitter.event,
            canAddExtension: (extension) => false,
            whenInstalledExtensionsRegistered: () => Promise.resolve(true),
        });
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.ExtensionRuntimeStateAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(gallery));
        await workbenchService.queryGallery(CancellationToken.None);
        const extensions = await workbenchService.queryLocal(extensionManagementServerService.localExtensionManagementServer);
        testObject.extension = extensions[0];
        assert.ok(testObject.extension);
        assert.ok(testObject.enabled);
    });
    test('Test Runtime State for remote ui+workspace extension is enabled when it is installed on both servers but running in remote server', async () => {
        // multi server setup
        const gallery = aGalleryExtension('a');
        const localExtension = aLocalExtension('a', { extensionKind: ['ui', 'workspace'] }, { location: URI.file('pub.a') });
        const remoteExtension = aLocalExtension('a', { extensionKind: ['ui', 'workspace'] }, { location: URI.file('pub.a').with({ scheme: Schemas.vscodeRemote }) });
        const remoteExtensionManagementService = createExtensionManagementService([remoteExtension]);
        const onDidInstallEvent = new Emitter();
        remoteExtensionManagementService.onDidInstallExtensions = onDidInstallEvent.event;
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localExtension]), remoteExtensionManagementService);
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        const onDidChangeExtensionsEmitter = new Emitter();
        instantiationService.stub(IExtensionService, {
            extensions: [toExtensionDescription(remoteExtension)],
            onDidChangeExtensions: onDidChangeExtensionsEmitter.event,
            canAddExtension: (extension) => false,
            whenInstalledExtensionsRegistered: () => Promise.resolve(true),
        });
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.ExtensionRuntimeStateAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(gallery));
        await workbenchService.queryGallery(CancellationToken.None);
        const extensions = await workbenchService.queryLocal(extensionManagementServerService.remoteExtensionManagementServer);
        testObject.extension = extensions[0];
        assert.ok(testObject.extension);
        assert.ok(testObject.enabled);
    });
    test('Test Runtime State when ui+workspace+web extension is installed in web and remote and running in remote', async () => {
        // multi server setup
        const gallery = aGalleryExtension('a');
        const webExtension = aLocalExtension('a', { extensionKind: ['ui', 'workspace'], browser: 'browser.js' }, { location: URI.file('pub.a').with({ scheme: Schemas.vscodeUserData }) });
        const remoteExtension = aLocalExtension('a', { extensionKind: ['ui', 'workspace'], browser: 'browser.js' }, { location: URI.file('pub.a').with({ scheme: Schemas.vscodeRemote }) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, null, createExtensionManagementService([remoteExtension]), createExtensionManagementService([webExtension]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        instantiationService.stub(IExtensionService, {
            extensions: [toExtensionDescription(remoteExtension)],
            onDidChangeExtensions: Event.None,
            canAddExtension: (extension) => false,
            whenInstalledExtensionsRegistered: () => Promise.resolve(true),
        });
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.ExtensionRuntimeStateAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(gallery));
        await workbenchService.queryGallery(CancellationToken.None);
        const extensions = await workbenchService.queryLocal(extensionManagementServerService.remoteExtensionManagementServer);
        testObject.extension = extensions[0];
        assert.ok(testObject.extension);
        assert.ok(!testObject.enabled);
    });
    test('Test Runtime State when workspace+ui+web extension is installed in web and local and running in local', async () => {
        // multi server setup
        const gallery = aGalleryExtension('a');
        const webExtension = aLocalExtension('a', { extensionKind: ['workspace', 'ui'], browser: 'browser.js' }, { location: URI.file('pub.a').with({ scheme: Schemas.vscodeUserData }) });
        const localExtension = aLocalExtension('a', { extensionKind: ['workspace', 'ui'], browser: 'browser.js' }, { location: URI.file('pub.a') });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localExtension]), null, createExtensionManagementService([webExtension]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        instantiationService.stub(IExtensionService, {
            extensions: [toExtensionDescription(localExtension)],
            onDidChangeExtensions: Event.None,
            canAddExtension: (extension) => false,
            whenInstalledExtensionsRegistered: () => Promise.resolve(true),
        });
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.ExtensionRuntimeStateAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(gallery));
        await workbenchService.queryGallery(CancellationToken.None);
        const extensions = await workbenchService.queryLocal(extensionManagementServerService.remoteExtensionManagementServer);
        testObject.extension = extensions[0];
        assert.ok(testObject.extension);
        assert.ok(!testObject.enabled);
    });
});
suite('RemoteInstallAction', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    setup(() => setupTest(disposables));
    test('Test remote install action is enabled for local workspace extension', async () => {
        // multi server setup
        const localWorkspaceExtension = aLocalExtension('a', { extensionKind: ['workspace'] }, { location: URI.file(`pub.a`) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localWorkspaceExtension]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: localWorkspaceExtension.identifier })));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.RemoteInstallAction, false));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const extensions = await workbenchService.queryLocal(extensionManagementServerService.localExtensionManagementServer);
        await workbenchService.queryGallery(CancellationToken.None);
        testObject.extension = extensions[0];
        assert.ok(testObject.enabled);
        assert.strictEqual('Install in remote', testObject.label);
        assert.strictEqual('extension-action label prominent install-other-server', testObject.class);
    });
    test('Test remote install action when installing local workspace extension', async () => {
        // multi server setup
        const remoteExtensionManagementService = createExtensionManagementService();
        const onInstallExtension = new Emitter();
        remoteExtensionManagementService.onInstallExtension = onInstallExtension.event;
        const localWorkspaceExtension = aLocalExtension('a', { extensionKind: ['workspace'] }, { location: URI.file(`pub.a`) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localWorkspaceExtension]), remoteExtensionManagementService);
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.stub(IExtensionsWorkbenchService, workbenchService, 'open', undefined);
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        const gallery = aGalleryExtension('a', { identifier: localWorkspaceExtension.identifier });
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(gallery));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.RemoteInstallAction, false));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const extensions = await workbenchService.queryLocal(extensionManagementServerService.localExtensionManagementServer);
        await workbenchService.queryGallery(CancellationToken.None);
        testObject.extension = extensions[0];
        assert.ok(testObject.enabled);
        assert.strictEqual('Install in remote', testObject.label);
        assert.strictEqual('extension-action label prominent install-other-server', testObject.class);
        onInstallExtension.fire({
            identifier: localWorkspaceExtension.identifier,
            source: gallery,
            profileLocation: null,
        });
        assert.ok(testObject.enabled);
        assert.strictEqual('Installing', testObject.label);
        assert.strictEqual('extension-action label install-other-server installing', testObject.class);
    });
    test('Test remote install action when installing local workspace extension is finished', async () => {
        // multi server setup
        const remoteExtensionManagementService = createExtensionManagementService();
        const onInstallExtension = new Emitter();
        remoteExtensionManagementService.onInstallExtension = onInstallExtension.event;
        const onDidInstallEvent = new Emitter();
        remoteExtensionManagementService.onDidInstallExtensions = onDidInstallEvent.event;
        const localWorkspaceExtension = aLocalExtension('a', { extensionKind: ['workspace'] }, { location: URI.file(`pub.a`) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localWorkspaceExtension]), remoteExtensionManagementService);
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.stub(IExtensionsWorkbenchService, workbenchService, 'open', undefined);
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        const gallery = aGalleryExtension('a', { identifier: localWorkspaceExtension.identifier });
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(gallery));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.RemoteInstallAction, false));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const extensions = await workbenchService.queryLocal(extensionManagementServerService.localExtensionManagementServer);
        await workbenchService.queryGallery(CancellationToken.None);
        testObject.extension = extensions[0];
        assert.ok(testObject.enabled);
        assert.strictEqual('Install in remote', testObject.label);
        assert.strictEqual('extension-action label prominent install-other-server', testObject.class);
        onInstallExtension.fire({
            identifier: localWorkspaceExtension.identifier,
            source: gallery,
            profileLocation: null,
        });
        assert.ok(testObject.enabled);
        assert.strictEqual('Installing', testObject.label);
        assert.strictEqual('extension-action label install-other-server installing', testObject.class);
        const installedExtension = aLocalExtension('a', { extensionKind: ['workspace'] }, { location: URI.file(`pub.a`).with({ scheme: Schemas.vscodeRemote }) });
        const promise = Event.toPromise(testObject.onDidChange);
        onDidInstallEvent.fire([
            {
                identifier: installedExtension.identifier,
                local: installedExtension,
                operation: 2 /* InstallOperation.Install */,
                profileLocation: null,
            },
        ]);
        await promise;
        assert.ok(!testObject.enabled);
    });
    test('Test remote install action is enabled for disabled local workspace extension', async () => {
        // multi server setup
        const localWorkspaceExtension = aLocalExtension('a', { extensionKind: ['workspace'] }, { location: URI.file(`pub.a`) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localWorkspaceExtension]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        const remoteWorkspaceExtension = aLocalExtension('a', { extensionKind: ['workspace'] }, { location: URI.file(`pub.a`).with({ scheme: Schemas.vscodeRemote }) });
        await instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([remoteWorkspaceExtension], 9 /* EnablementState.DisabledGlobally */);
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: localWorkspaceExtension.identifier })));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.RemoteInstallAction, false));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const extensions = await workbenchService.queryLocal(extensionManagementServerService.localExtensionManagementServer);
        await workbenchService.queryGallery(CancellationToken.None);
        testObject.extension = extensions[0];
        assert.ok(testObject.enabled);
        assert.strictEqual('Install in remote', testObject.label);
        assert.strictEqual('extension-action label prominent install-other-server', testObject.class);
    });
    test('Test remote install action is enabled local workspace+ui extension', async () => {
        // multi server setup
        const localWorkspaceExtension = aLocalExtension('a', { extensionKind: ['workspace', 'ui'] }, { location: URI.file(`pub.a`) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localWorkspaceExtension]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        await instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([localWorkspaceExtension], 9 /* EnablementState.DisabledGlobally */);
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: localWorkspaceExtension.identifier })));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.RemoteInstallAction, false));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const extensions = await workbenchService.queryLocal(extensionManagementServerService.localExtensionManagementServer);
        await workbenchService.queryGallery(CancellationToken.None);
        testObject.extension = extensions[0];
        assert.ok(testObject.enabled);
        assert.strictEqual('Install in remote', testObject.label);
        assert.strictEqual('extension-action label prominent install-other-server', testObject.class);
    });
    test('Test remote install action is enabled for local ui+workapace extension if can install is true', async () => {
        // multi server setup
        const localWorkspaceExtension = aLocalExtension('a', { extensionKind: ['ui', 'workspace'] }, { location: URI.file(`pub.a`) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localWorkspaceExtension]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        await instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([localWorkspaceExtension], 9 /* EnablementState.DisabledGlobally */);
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: localWorkspaceExtension.identifier })));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.RemoteInstallAction, true));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const extensions = await workbenchService.queryLocal(extensionManagementServerService.localExtensionManagementServer);
        await workbenchService.queryGallery(CancellationToken.None);
        testObject.extension = extensions[0];
        assert.ok(testObject.enabled);
        assert.strictEqual('Install in remote', testObject.label);
        assert.strictEqual('extension-action label prominent install-other-server', testObject.class);
    });
    test('Test remote install action is disabled for local ui+workapace extension if can install is false', async () => {
        // multi server setup
        const localWorkspaceExtension = aLocalExtension('a', { extensionKind: ['ui', 'workspace'] }, { location: URI.file(`pub.a`) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localWorkspaceExtension]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        await instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([localWorkspaceExtension], 9 /* EnablementState.DisabledGlobally */);
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: localWorkspaceExtension.identifier })));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.RemoteInstallAction, false));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const extensions = await workbenchService.queryLocal(extensionManagementServerService.localExtensionManagementServer);
        await workbenchService.queryGallery(CancellationToken.None);
        testObject.extension = extensions[0];
        assert.ok(!testObject.enabled);
    });
    test('Test remote install action is disabled when extension is not set', async () => {
        // multi server setup
        const localWorkspaceExtension = aLocalExtension('a', { extensionKind: ['workspace'] }, { location: URI.file(`pub.a`) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localWorkspaceExtension]));
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: localWorkspaceExtension.identifier })));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.RemoteInstallAction, false));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        await workbenchService.queryLocal(extensionManagementServerService.localExtensionManagementServer);
        await workbenchService.queryGallery(CancellationToken.None);
        assert.ok(!testObject.enabled);
    });
    test('Test remote install action is disabled for extension which is not installed', async () => {
        // multi server setup
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService);
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a')));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.RemoteInstallAction, false));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const pager = await workbenchService.queryGallery(CancellationToken.None);
        testObject.extension = pager.firstPage[0];
        assert.ok(testObject.extension);
        assert.ok(!testObject.enabled);
    });
    test('Test remote install action is disabled for local workspace extension which is disabled in env', async () => {
        // multi server setup
        const localWorkspaceExtension = aLocalExtension('a', { extensionKind: ['workspace'] }, { location: URI.file(`pub.a`) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localWorkspaceExtension]));
        const environmentService = { disableExtensions: true };
        instantiationService.stub(IEnvironmentService, environmentService);
        instantiationService.stub(INativeEnvironmentService, environmentService);
        instantiationService.stub(IWorkbenchEnvironmentService, environmentService);
        instantiationService.stub(INativeWorkbenchEnvironmentService, environmentService);
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: localWorkspaceExtension.identifier })));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.RemoteInstallAction, false));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const extensions = await workbenchService.queryLocal(extensionManagementServerService.localExtensionManagementServer);
        await workbenchService.queryGallery(CancellationToken.None);
        testObject.extension = extensions[0];
        assert.ok(testObject.extension);
        assert.ok(!testObject.enabled);
    });
    test('Test remote install action is disabled when remote server is not available', async () => {
        // single server setup
        const workbenchService = instantiationService.get(IExtensionsWorkbenchService);
        const extensionManagementServerService = instantiationService.get(IExtensionManagementServerService);
        const localWorkspaceExtension = aLocalExtension('a', { extensionKind: ['workspace'] }, { location: URI.file(`pub.a`) });
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [
            localWorkspaceExtension,
        ]);
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: localWorkspaceExtension.identifier })));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.RemoteInstallAction, false));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const extensions = await workbenchService.queryLocal(extensionManagementServerService.localExtensionManagementServer);
        await workbenchService.queryGallery(CancellationToken.None);
        testObject.extension = extensions[0];
        assert.ok(testObject.extension);
        assert.ok(!testObject.enabled);
    });
    test('Test remote install action is disabled for local workspace extension if it is uninstalled locally', async () => {
        // multi server setup
        const extensionManagementService = instantiationService.get(IExtensionManagementService);
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, extensionManagementService);
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        const localWorkspaceExtension = aLocalExtension('a', { extensionKind: ['workspace'] }, { location: URI.file(`pub.a`) });
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [
            localWorkspaceExtension,
        ]);
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: localWorkspaceExtension.identifier })));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.RemoteInstallAction, false));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const extensions = await workbenchService.queryLocal(extensionManagementServerService.localExtensionManagementServer);
        await workbenchService.queryGallery(CancellationToken.None);
        testObject.extension = extensions[0];
        assert.ok(testObject.enabled);
        assert.strictEqual('Install in remote', testObject.label);
        uninstallEvent.fire({ identifier: localWorkspaceExtension.identifier, profileLocation: null });
        assert.ok(!testObject.enabled);
    });
    test('Test remote install action is disabled for local workspace extension if it is installed in remote', async () => {
        // multi server setup
        const localWorkspaceExtension = aLocalExtension('a', { extensionKind: ['workspace'] }, { location: URI.file(`pub.a`) });
        const remoteWorkspaceExtension = aLocalExtension('a', { extensionKind: ['workspace'] }, { location: URI.file(`pub.a`).with({ scheme: Schemas.vscodeRemote }) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localWorkspaceExtension]), createExtensionManagementService([remoteWorkspaceExtension]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: localWorkspaceExtension.identifier })));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.RemoteInstallAction, false));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const extensions = await workbenchService.queryLocal(extensionManagementServerService.localExtensionManagementServer);
        await workbenchService.queryGallery(CancellationToken.None);
        testObject.extension = extensions[0];
        assert.ok(testObject.extension);
        assert.ok(!testObject.enabled);
    });
    test('Test remote install action is enabled for local workspace extension if it has not gallery', async () => {
        // multi server setup
        const localWorkspaceExtension = aLocalExtension('a', { extensionKind: ['workspace'] }, { location: URI.file(`pub.a`) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localWorkspaceExtension]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: localWorkspaceExtension.identifier })));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.RemoteInstallAction, false));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const extensions = await workbenchService.queryLocal(extensionManagementServerService.localExtensionManagementServer);
        testObject.extension = extensions[0];
        assert.ok(testObject.extension);
        assert.ok(testObject.enabled);
    });
    test('Test remote install action is disabled for local workspace system extension', async () => {
        // multi server setup
        const localWorkspaceSystemExtension = aLocalExtension('a', { extensionKind: ['workspace'] }, { location: URI.file(`pub.a`), type: 0 /* ExtensionType.System */ });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localWorkspaceSystemExtension]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: localWorkspaceSystemExtension.identifier })));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.RemoteInstallAction, false));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const extensions = await workbenchService.queryLocal(extensionManagementServerService.localExtensionManagementServer);
        testObject.extension = extensions[0];
        assert.ok(testObject.extension);
        assert.ok(!testObject.enabled);
    });
    test('Test remote install action is disabled for local ui extension if it is not installed in remote', async () => {
        // multi server setup
        const localUIExtension = aLocalExtension('a', { extensionKind: ['ui'] }, { location: URI.file(`pub.a`) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localUIExtension]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: localUIExtension.identifier })));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.RemoteInstallAction, false));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const extensions = await workbenchService.queryLocal(extensionManagementServerService.localExtensionManagementServer);
        testObject.extension = extensions[0];
        assert.ok(testObject.extension);
        assert.ok(!testObject.enabled);
    });
    test('Test remote install action is disabled for local ui extension if it is also installed in remote', async () => {
        // multi server setup
        const localUIExtension = aLocalExtension('a', { extensionKind: ['ui'] }, { location: URI.file(`pub.a`) });
        const remoteUIExtension = aLocalExtension('a', { extensionKind: ['ui'] }, { location: URI.file(`pub.a`).with({ scheme: Schemas.vscodeRemote }) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localUIExtension]), createExtensionManagementService([remoteUIExtension]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: localUIExtension.identifier })));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.RemoteInstallAction, false));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const extensions = await workbenchService.queryLocal(extensionManagementServerService.localExtensionManagementServer);
        testObject.extension = extensions[0];
        assert.ok(testObject.extension);
        assert.ok(!testObject.enabled);
    });
    test('Test remote install action is enabled for locally installed language pack extension', async () => {
        // multi server setup
        const languagePackExtension = aLocalExtension('a', {
            contributes: {
                localizations: [{ languageId: 'de', translations: [] }],
            },
        }, { location: URI.file(`pub.a`) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([languagePackExtension]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: languagePackExtension.identifier })));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.RemoteInstallAction, false));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const extensions = await workbenchService.queryLocal(extensionManagementServerService.localExtensionManagementServer);
        await workbenchService.queryGallery(CancellationToken.None);
        testObject.extension = extensions[0];
        assert.ok(testObject.enabled);
        assert.strictEqual('Install in remote', testObject.label);
        assert.strictEqual('extension-action label prominent install-other-server', testObject.class);
    });
    test('Test remote install action is disabled if local language pack extension is uninstalled', async () => {
        // multi server setup
        const extensionManagementService = instantiationService.get(IExtensionManagementService);
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, extensionManagementService);
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        const languagePackExtension = aLocalExtension('a', {
            contributes: {
                localizations: [{ languageId: 'de', translations: [] }],
            },
        }, { location: URI.file(`pub.a`) });
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [
            languagePackExtension,
        ]);
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: languagePackExtension.identifier })));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.RemoteInstallAction, false));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const extensions = await workbenchService.queryLocal(extensionManagementServerService.localExtensionManagementServer);
        await workbenchService.queryGallery(CancellationToken.None);
        testObject.extension = extensions[0];
        assert.ok(testObject.enabled);
        assert.strictEqual('Install in remote', testObject.label);
        uninstallEvent.fire({ identifier: languagePackExtension.identifier, profileLocation: null });
        assert.ok(!testObject.enabled);
    });
});
suite('LocalInstallAction', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    setup(() => setupTest(disposables));
    test('Test local install action is enabled for remote ui extension', async () => {
        // multi server setup
        const remoteUIExtension = aLocalExtension('a', { extensionKind: ['ui'] }, { location: URI.file(`pub.a`).with({ scheme: Schemas.vscodeRemote }) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService(), createExtensionManagementService([remoteUIExtension]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: remoteUIExtension.identifier })));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.LocalInstallAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const extensions = await workbenchService.queryLocal(extensionManagementServerService.remoteExtensionManagementServer);
        await workbenchService.queryGallery(CancellationToken.None);
        testObject.extension = extensions[0];
        assert.ok(testObject.enabled);
        assert.strictEqual('Install Locally', testObject.label);
        assert.strictEqual('extension-action label prominent install-other-server', testObject.class);
    });
    test('Test local install action is enabled for remote ui+workspace extension', async () => {
        // multi server setup
        const remoteUIExtension = aLocalExtension('a', { extensionKind: ['ui', 'workspace'] }, { location: URI.file(`pub.a`).with({ scheme: Schemas.vscodeRemote }) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService(), createExtensionManagementService([remoteUIExtension]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: remoteUIExtension.identifier })));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.LocalInstallAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const extensions = await workbenchService.queryLocal(extensionManagementServerService.remoteExtensionManagementServer);
        await workbenchService.queryGallery(CancellationToken.None);
        testObject.extension = extensions[0];
        assert.ok(testObject.enabled);
        assert.strictEqual('Install Locally', testObject.label);
        assert.strictEqual('extension-action label prominent install-other-server', testObject.class);
    });
    test('Test local install action when installing remote ui extension', async () => {
        // multi server setup
        const localExtensionManagementService = createExtensionManagementService();
        const onInstallExtension = new Emitter();
        localExtensionManagementService.onInstallExtension = onInstallExtension.event;
        const remoteUIExtension = aLocalExtension('a', { extensionKind: ['ui'] }, { location: URI.file(`pub.a`).with({ scheme: Schemas.vscodeRemote }) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, localExtensionManagementService, createExtensionManagementService([remoteUIExtension]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.stub(IExtensionsWorkbenchService, workbenchService, 'open', undefined);
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        const gallery = aGalleryExtension('a', { identifier: remoteUIExtension.identifier });
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(gallery));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.LocalInstallAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const extensions = await workbenchService.queryLocal(extensionManagementServerService.remoteExtensionManagementServer);
        await workbenchService.queryGallery(CancellationToken.None);
        testObject.extension = extensions[0];
        assert.ok(testObject.enabled);
        assert.strictEqual('Install Locally', testObject.label);
        assert.strictEqual('extension-action label prominent install-other-server', testObject.class);
        onInstallExtension.fire({
            identifier: remoteUIExtension.identifier,
            source: gallery,
            profileLocation: null,
        });
        assert.ok(testObject.enabled);
        assert.strictEqual('Installing', testObject.label);
        assert.strictEqual('extension-action label install-other-server installing', testObject.class);
    });
    test('Test local install action when installing remote ui extension is finished', async () => {
        // multi server setup
        const localExtensionManagementService = createExtensionManagementService();
        const onInstallExtension = new Emitter();
        localExtensionManagementService.onInstallExtension = onInstallExtension.event;
        const onDidInstallEvent = new Emitter();
        localExtensionManagementService.onDidInstallExtensions = onDidInstallEvent.event;
        const remoteUIExtension = aLocalExtension('a', { extensionKind: ['ui'] }, { location: URI.file(`pub.a`).with({ scheme: Schemas.vscodeRemote }) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, localExtensionManagementService, createExtensionManagementService([remoteUIExtension]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.stub(IExtensionsWorkbenchService, workbenchService, 'open', undefined);
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        const gallery = aGalleryExtension('a', { identifier: remoteUIExtension.identifier });
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(gallery));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.LocalInstallAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const extensions = await workbenchService.queryLocal(extensionManagementServerService.remoteExtensionManagementServer);
        await workbenchService.queryGallery(CancellationToken.None);
        testObject.extension = extensions[0];
        assert.ok(testObject.enabled);
        assert.strictEqual('Install Locally', testObject.label);
        assert.strictEqual('extension-action label prominent install-other-server', testObject.class);
        onInstallExtension.fire({
            identifier: remoteUIExtension.identifier,
            source: gallery,
            profileLocation: null,
        });
        assert.ok(testObject.enabled);
        assert.strictEqual('Installing', testObject.label);
        assert.strictEqual('extension-action label install-other-server installing', testObject.class);
        const installedExtension = aLocalExtension('a', { extensionKind: ['ui'] }, { location: URI.file(`pub.a`) });
        const promise = Event.toPromise(testObject.onDidChange);
        onDidInstallEvent.fire([
            {
                identifier: installedExtension.identifier,
                local: installedExtension,
                operation: 2 /* InstallOperation.Install */,
                profileLocation: null,
            },
        ]);
        await promise;
        assert.ok(!testObject.enabled);
    });
    test('Test local install action is enabled for disabled remote ui extension', async () => {
        // multi server setup
        const remoteUIExtension = aLocalExtension('a', { extensionKind: ['ui'] }, { location: URI.file(`pub.a`).with({ scheme: Schemas.vscodeRemote }) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService(), createExtensionManagementService([remoteUIExtension]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        const localUIExtension = aLocalExtension('a', { extensionKind: ['ui'] }, { location: URI.file(`pub.a`) });
        await instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([localUIExtension], 9 /* EnablementState.DisabledGlobally */);
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: remoteUIExtension.identifier })));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.LocalInstallAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const extensions = await workbenchService.queryLocal(extensionManagementServerService.remoteExtensionManagementServer);
        await workbenchService.queryGallery(CancellationToken.None);
        testObject.extension = extensions[0];
        assert.ok(testObject.enabled);
        assert.strictEqual('Install Locally', testObject.label);
        assert.strictEqual('extension-action label prominent install-other-server', testObject.class);
    });
    test('Test local install action is disabled when extension is not set', async () => {
        // multi server setup
        const remoteUIExtension = aLocalExtension('a', { extensionKind: ['ui'] }, { location: URI.file(`pub.a`).with({ scheme: Schemas.vscodeRemote }) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService(), createExtensionManagementService([remoteUIExtension]));
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: remoteUIExtension.identifier })));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.LocalInstallAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        await workbenchService.queryLocal(extensionManagementServerService.remoteExtensionManagementServer);
        await workbenchService.queryGallery(CancellationToken.None);
        assert.ok(!testObject.enabled);
    });
    test('Test local install action is disabled for extension which is not installed', async () => {
        // multi server setup
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService);
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a')));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.LocalInstallAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const pager = await workbenchService.queryGallery(CancellationToken.None);
        testObject.extension = pager.firstPage[0];
        assert.ok(testObject.extension);
        assert.ok(!testObject.enabled);
    });
    test('Test local install action is disabled for remote ui extension which is disabled in env', async () => {
        // multi server setup
        const remoteUIExtension = aLocalExtension('a', { extensionKind: ['ui'] }, { location: URI.file(`pub.a`).with({ scheme: Schemas.vscodeRemote }) });
        const environmentService = { disableExtensions: true };
        instantiationService.stub(IEnvironmentService, environmentService);
        instantiationService.stub(INativeEnvironmentService, environmentService);
        instantiationService.stub(IWorkbenchEnvironmentService, environmentService);
        instantiationService.stub(INativeWorkbenchEnvironmentService, environmentService);
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService(), createExtensionManagementService([remoteUIExtension]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: remoteUIExtension.identifier })));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.LocalInstallAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const extensions = await workbenchService.queryLocal(extensionManagementServerService.remoteExtensionManagementServer);
        await workbenchService.queryGallery(CancellationToken.None);
        testObject.extension = extensions[0];
        assert.ok(testObject.extension);
        assert.ok(!testObject.enabled);
    });
    test('Test local install action is disabled when local server is not available', async () => {
        // single server setup
        const remoteUIExtension = aLocalExtension('a', { extensionKind: ['ui'] }, { location: URI.file(`pub.a`).with({ scheme: Schemas.vscodeRemote }) });
        const extensionManagementServerService = aSingleRemoteExtensionManagementServerService(instantiationService, createExtensionManagementService([remoteUIExtension]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: remoteUIExtension.identifier })));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.LocalInstallAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const extensions = await workbenchService.queryLocal(extensionManagementServerService.remoteExtensionManagementServer);
        await workbenchService.queryGallery(CancellationToken.None);
        testObject.extension = extensions[0];
        assert.ok(testObject.extension);
        assert.ok(!testObject.enabled);
    });
    test('Test local install action is disabled for remote ui extension if it is installed in local', async () => {
        // multi server setup
        const localUIExtension = aLocalExtension('a', { extensionKind: ['ui'] }, { location: URI.file(`pub.a`) });
        const remoteUIExtension = aLocalExtension('a', { extensionKind: ['ui'] }, { location: URI.file(`pub.a`).with({ scheme: Schemas.vscodeRemote }) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localUIExtension]), createExtensionManagementService([remoteUIExtension]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: localUIExtension.identifier })));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.LocalInstallAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const extensions = await workbenchService.queryLocal(extensionManagementServerService.remoteExtensionManagementServer);
        await workbenchService.queryGallery(CancellationToken.None);
        testObject.extension = extensions[0];
        assert.ok(testObject.extension);
        assert.ok(!testObject.enabled);
    });
    test('Test local install action is disabled for remoteUI extension if it is uninstalled locally', async () => {
        // multi server setup
        const extensionManagementService = instantiationService.get(IExtensionManagementService);
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService(), extensionManagementService);
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        const remoteUIExtension = aLocalExtension('a', { extensionKind: ['ui'] }, { location: URI.file(`pub.a`).with({ scheme: Schemas.vscodeRemote }) });
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [
            remoteUIExtension,
        ]);
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: remoteUIExtension.identifier })));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.LocalInstallAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const extensions = await workbenchService.queryLocal(extensionManagementServerService.remoteExtensionManagementServer);
        await workbenchService.queryGallery(CancellationToken.None);
        testObject.extension = extensions[0];
        assert.ok(testObject.enabled);
        assert.strictEqual('Install Locally', testObject.label);
        uninstallEvent.fire({ identifier: remoteUIExtension.identifier, profileLocation: null });
        assert.ok(!testObject.enabled);
    });
    test('Test local install action is enabled for remote UI extension if it has gallery', async () => {
        // multi server setup
        const remoteUIExtension = aLocalExtension('a', { extensionKind: ['ui'] }, { location: URI.file(`pub.a`).with({ scheme: Schemas.vscodeRemote }) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService(), createExtensionManagementService([remoteUIExtension]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: remoteUIExtension.identifier })));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.LocalInstallAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const extensions = await workbenchService.queryLocal(extensionManagementServerService.remoteExtensionManagementServer);
        testObject.extension = extensions[0];
        assert.ok(testObject.extension);
        assert.ok(testObject.enabled);
    });
    test('Test local install action is disabled for remote UI system extension', async () => {
        // multi server setup
        const remoteUISystemExtension = aLocalExtension('a', { extensionKind: ['ui'] }, {
            location: URI.file(`pub.a`).with({ scheme: Schemas.vscodeRemote }),
            type: 0 /* ExtensionType.System */,
        });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService(), createExtensionManagementService([remoteUISystemExtension]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: remoteUISystemExtension.identifier })));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.LocalInstallAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const extensions = await workbenchService.queryLocal(extensionManagementServerService.remoteExtensionManagementServer);
        testObject.extension = extensions[0];
        assert.ok(testObject.extension);
        assert.ok(!testObject.enabled);
    });
    test('Test local install action is disabled for remote workspace extension if it is not installed in local', async () => {
        // multi server setup
        const remoteWorkspaceExtension = aLocalExtension('a', { extensionKind: ['workspace'] }, { location: URI.file(`pub.a`).with({ scheme: Schemas.vscodeRemote }) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService(), createExtensionManagementService([remoteWorkspaceExtension]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: remoteWorkspaceExtension.identifier })));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.LocalInstallAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const extensions = await workbenchService.queryLocal(extensionManagementServerService.remoteExtensionManagementServer);
        testObject.extension = extensions[0];
        assert.ok(testObject.extension);
        assert.ok(!testObject.enabled);
    });
    test('Test local install action is disabled for remote workspace extension if it is also installed in local', async () => {
        // multi server setup
        const localWorkspaceExtension = aLocalExtension('a', { extensionKind: ['workspae'] }, { location: URI.file(`pub.a`) });
        const remoteWorkspaceExtension = aLocalExtension('a', { extensionKind: ['workspace'] }, { location: URI.file(`pub.a`).with({ scheme: Schemas.vscodeRemote }) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localWorkspaceExtension]), createExtensionManagementService([remoteWorkspaceExtension]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: localWorkspaceExtension.identifier })));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.LocalInstallAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const extensions = await workbenchService.queryLocal(extensionManagementServerService.remoteExtensionManagementServer);
        testObject.extension = extensions[0];
        assert.ok(testObject.extension);
        assert.ok(!testObject.enabled);
    });
    test('Test local install action is enabled for remotely installed language pack extension', async () => {
        // multi server setup
        const languagePackExtension = aLocalExtension('a', {
            contributes: {
                localizations: [{ languageId: 'de', translations: [] }],
            },
        }, { location: URI.file(`pub.a`).with({ scheme: Schemas.vscodeRemote }) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService(), createExtensionManagementService([languagePackExtension]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: languagePackExtension.identifier })));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.LocalInstallAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const extensions = await workbenchService.queryLocal(extensionManagementServerService.remoteExtensionManagementServer);
        await workbenchService.queryGallery(CancellationToken.None);
        testObject.extension = extensions[0];
        assert.ok(testObject.enabled);
        assert.strictEqual('Install Locally', testObject.label);
        assert.strictEqual('extension-action label prominent install-other-server', testObject.class);
    });
    test('Test local install action is disabled if remote language pack extension is uninstalled', async () => {
        // multi server setup
        const extensionManagementService = instantiationService.get(IExtensionManagementService);
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService(), extensionManagementService);
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposables.add(new TestExtensionEnablementService(instantiationService)));
        const languagePackExtension = aLocalExtension('a', {
            contributes: {
                localizations: [{ languageId: 'de', translations: [] }],
            },
        }, { location: URI.file(`pub.a`).with({ scheme: Schemas.vscodeRemote }) });
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [
            languagePackExtension,
        ]);
        const workbenchService = disposables.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        instantiationService.set(IExtensionsWorkbenchService, workbenchService);
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: languagePackExtension.identifier })));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsActions.LocalInstallAction));
        disposables.add(instantiationService.createInstance(ExtensionContainers, [testObject]));
        const extensions = await workbenchService.queryLocal(extensionManagementServerService.remoteExtensionManagementServer);
        await workbenchService.queryGallery(CancellationToken.None);
        testObject.extension = extensions[0];
        assert.ok(testObject.enabled);
        assert.strictEqual('Install Locally', testObject.label);
        uninstallEvent.fire({ identifier: languagePackExtension.identifier, profileLocation: null });
        assert.ok(!testObject.enabled);
    });
});
function aLocalExtension(name = 'someext', manifest = {}, properties = {}) {
    manifest = { name, publisher: 'pub', version: '1.0.0', ...manifest };
    properties = {
        type: 1 /* ExtensionType.User */,
        location: URI.file(`pub.${name}`),
        identifier: { id: getGalleryExtensionId(manifest.publisher, manifest.name) },
        ...properties,
        isValid: properties.isValid ?? true,
    };
    properties.isBuiltin = properties.type === 0 /* ExtensionType.System */;
    return Object.create({ manifest, ...properties });
}
function aGalleryExtension(name, properties = {}, galleryExtensionProperties = {}, assets = {}) {
    const targetPlatform = getTargetPlatform(platform, arch);
    const galleryExtension = (Object.create({
        name,
        publisher: 'pub',
        version: '1.0.0',
        allTargetPlatforms: [targetPlatform],
        properties: {},
        assets: {},
        isSigned: true,
        ...properties,
    }));
    galleryExtension.properties = {
        ...galleryExtension.properties,
        dependencies: [],
        targetPlatform,
        ...galleryExtensionProperties,
    };
    galleryExtension.assets = { ...galleryExtension.assets, ...assets };
    galleryExtension.identifier = {
        id: getGalleryExtensionId(galleryExtension.publisher, galleryExtension.name),
        uuid: generateUuid(),
    };
    galleryExtension.hasReleaseVersion = true;
    return galleryExtension;
}
function aPage(...objects) {
    return {
        firstPage: objects,
        total: objects.length,
        pageSize: objects.length,
        getPage: () => null,
    };
}
function aSingleRemoteExtensionManagementServerService(instantiationService, remoteExtensionManagementService) {
    const remoteExtensionManagementServer = {
        id: 'vscode-remote',
        label: 'remote',
        extensionManagementService: remoteExtensionManagementService || createExtensionManagementService(),
    };
    return {
        _serviceBrand: undefined,
        localExtensionManagementServer: null,
        remoteExtensionManagementServer,
        webExtensionManagementServer: null,
        getExtensionManagementServer: (extension) => {
            if (extension.location.scheme === Schemas.vscodeRemote) {
                return remoteExtensionManagementServer;
            }
            return null;
        },
        getExtensionInstallLocation(extension) {
            const server = this.getExtensionManagementServer(extension);
            return server === remoteExtensionManagementServer
                ? 2 /* ExtensionInstallLocation.Remote */
                : 1 /* ExtensionInstallLocation.Local */;
        },
    };
}
function aMultiExtensionManagementServerService(instantiationService, localExtensionManagementService, remoteExtensionManagementService, webExtensionManagementService) {
    const localExtensionManagementServer = localExtensionManagementService === null
        ? null
        : {
            id: 'vscode-local',
            label: 'local',
            extensionManagementService: localExtensionManagementService || createExtensionManagementService(),
        };
    const remoteExtensionManagementServer = remoteExtensionManagementService === null
        ? null
        : {
            id: 'vscode-remote',
            label: 'remote',
            extensionManagementService: remoteExtensionManagementService || createExtensionManagementService(),
        };
    const webExtensionManagementServer = webExtensionManagementService
        ? {
            id: 'vscode-web',
            label: 'web',
            extensionManagementService: webExtensionManagementService,
        }
        : null;
    return {
        _serviceBrand: undefined,
        localExtensionManagementServer,
        remoteExtensionManagementServer,
        webExtensionManagementServer,
        getExtensionManagementServer: (extension) => {
            if (extension.location.scheme === Schemas.file) {
                return localExtensionManagementServer;
            }
            if (extension.location.scheme === Schemas.vscodeRemote) {
                return remoteExtensionManagementServer;
            }
            if (extension.location.scheme === Schemas.vscodeUserData) {
                return webExtensionManagementServer;
            }
            throw new Error('');
        },
        getExtensionInstallLocation(extension) {
            const server = this.getExtensionManagementServer(extension);
            if (server === null) {
                return null;
            }
            if (server === remoteExtensionManagementServer) {
                return 2 /* ExtensionInstallLocation.Remote */;
            }
            if (server === webExtensionManagementServer) {
                return 3 /* ExtensionInstallLocation.Web */;
            }
            return 1 /* ExtensionInstallLocation.Local */;
        },
    };
}
function createExtensionManagementService(installed = []) {
    return {
        onInstallExtension: Event.None,
        onDidInstallExtensions: Event.None,
        onUninstallExtension: Event.None,
        onDidUninstallExtension: Event.None,
        onDidChangeProfile: Event.None,
        onDidUpdateExtensionMetadata: Event.None,
        onProfileAwareDidInstallExtensions: Event.None,
        getInstalled: () => Promise.resolve(installed),
        canInstall: async (extension) => {
            return true;
        },
        installFromGallery: (extension) => Promise.reject(new Error('not supported')),
        updateMetadata: async (local, metadata, profileLocation) => {
            local.identifier.uuid = metadata.id;
            local.publisherDisplayName = metadata.publisherDisplayName;
            local.publisherId = metadata.publisherId;
            return local;
        },
        async getTargetPlatform() {
            return getTargetPlatform(platform, arch);
        },
        async getExtensionsControlManifest() {
            return {
                malicious: [],
                deprecated: {},
                search: [],
                publisherMapping: {},
            };
        },
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc0FjdGlvbnMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZXh0ZW5zaW9ucy90ZXN0L2VsZWN0cm9uLXNhbmRib3gvZXh0ZW5zaW9uc0FjdGlvbnMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQzdGLE9BQU8sS0FBSyxpQkFBaUIsTUFBTSxvQ0FBb0MsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUN4RixPQUFPLEVBQ04sMkJBQTJCLEVBQzNCLHdCQUF3QixFQU94QixxQkFBcUIsRUFFckIsaUJBQWlCLEdBSWpCLE1BQU0sMkVBQTJFLENBQUE7QUFDbEYsT0FBTyxFQUNOLG9DQUFvQyxFQUVwQyxpQ0FBaUMsRUFJakMsb0NBQW9DLEdBQ3BDLE1BQU0sd0VBQXdFLENBQUE7QUFDL0UsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sa0ZBQWtGLENBQUE7QUFDbkksT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0VBQStFLENBQUE7QUFDckgsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0sMEZBQTBGLENBQUE7QUFDekksT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sK0VBQStFLENBQUE7QUFDdkgsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxDQUFBO0FBQ3hILE9BQU8sRUFB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