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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc0FjdGlvbnMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2V4dGVuc2lvbnMvdGVzdC9lbGVjdHJvbi1zYW5kYm94L2V4dGVuc2lvbnNBY3Rpb25zLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUM3RixPQUFPLEtBQUssaUJBQWlCLE1BQU0sb0NBQW9DLENBQUE7QUFDdkUsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDeEYsT0FBTyxFQUNOLDJCQUEyQixFQUMzQix3QkFBd0IsRUFPeEIscUJBQXFCLEVBRXJCLGlCQUFpQixHQUlqQixNQUFNLDJFQUEyRSxDQUFBO0FBQ2xGLE9BQU8sRUFDTixvQ0FBb0MsRUFFcEMsaUNBQWlDLEVBSWpDLG9DQUFvQyxHQUNwQyxNQUFNLHdFQUF3RSxDQUFBO0FBQy9FLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLGtGQUFrRixDQUFBO0FBQ25JLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtFQUErRSxDQUFBO0FBQ3JILE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLDBGQUEwRixDQUFBO0FBQ3pJLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLCtFQUErRSxDQUFBO0FBQ3ZILE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQTtBQUN4SCxPQUFPLEVBQUUsT0FB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