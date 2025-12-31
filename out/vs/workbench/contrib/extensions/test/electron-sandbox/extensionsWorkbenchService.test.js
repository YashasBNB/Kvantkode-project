/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as sinon from 'sinon';
import assert from 'assert';
import { generateUuid } from '../../../../../base/common/uuid.js';
import { AutoCheckUpdatesConfigurationKey, AutoUpdateConfigurationKey, } from '../../common/extensions.js';
import { ExtensionsWorkbenchService } from '../../browser/extensionsWorkbenchService.js';
import { IExtensionManagementService, IExtensionGalleryService, IExtensionTipsService, getTargetPlatform, } from '../../../../../platform/extensionManagement/common/extensionManagement.js';
import { IWorkbenchExtensionEnablementService, IExtensionManagementServerService, IWorkbenchExtensionManagementService, } from '../../../../services/extensionManagement/common/extensionManagement.js';
import { IExtensionRecommendationsService } from '../../../../services/extensionRecommendations/common/extensionRecommendations.js';
import { getGalleryExtensionId } from '../../../../../platform/extensionManagement/common/extensionManagementUtil.js';
import { anExtensionManagementServerService, TestExtensionEnablementService, } from '../../../../services/extensionManagement/test/browser/extensionEnablementService.test.js';
import { ExtensionGalleryService } from '../../../../../platform/extensionManagement/common/extensionGalleryService.js';
import { IURLService } from '../../../../../platform/url/common/url.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { Event, Emitter } from '../../../../../base/common/event.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { NullTelemetryService } from '../../../../../platform/telemetry/common/telemetryUtils.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { TestExtensionTipsService, TestSharedProcessService, } from '../../../../test/electron-sandbox/workbenchTestServices.js';
import { IConfigurationService, } from '../../../../../platform/configuration/common/configuration.js';
import { ILogService, NullLogService } from '../../../../../platform/log/common/log.js';
import { IProgressService } from '../../../../../platform/progress/common/progress.js';
import { ProgressService } from '../../../../services/progress/browser/progressService.js';
import { INotificationService } from '../../../../../platform/notification/common/notification.js';
import { NativeURLService } from '../../../../../platform/url/common/urlService.js';
import { URI } from '../../../../../base/common/uri.js';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { IRemoteAgentService } from '../../../../services/remote/common/remoteAgentService.js';
import { RemoteAgentService } from '../../../../services/remote/electron-sandbox/remoteAgentService.js';
import { ISharedProcessService } from '../../../../../platform/ipc/electron-sandbox/services.js';
import { TestContextService } from '../../../../test/common/workbenchTestServices.js';
import { IProductService } from '../../../../../platform/product/common/productService.js';
import { ILifecycleService } from '../../../../services/lifecycle/common/lifecycle.js';
import { TestLifecycleService } from '../../../../test/browser/workbenchTestServices.js';
import { Schemas } from '../../../../../base/common/network.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { MockContextKeyService } from '../../../../../platform/keybinding/test/common/mockKeybindingService.js';
import { platform } from '../../../../../base/common/platform.js';
import { arch } from '../../../../../base/common/process.js';
import { IExtensionService } from '../../../../services/extensions/common/extensions.js';
import { toDisposable } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { IUpdateService, State } from '../../../../../platform/update/common/update.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { FileService } from '../../../../../platform/files/common/fileService.js';
import { UserDataProfileService } from '../../../../services/userDataProfile/common/userDataProfileService.js';
import { IUserDataProfileService } from '../../../../services/userDataProfile/common/userDataProfile.js';
import { toUserDataProfile } from '../../../../../platform/userDataProfile/common/userDataProfile.js';
import { IDialogService } from '../../../../../platform/dialogs/common/dialogs.js';
suite('ExtensionsWorkbenchServiceTest', () => {
    let instantiationService;
    let testObject;
    const disposableStore = ensureNoDisposablesAreLeakedInTestSuite();
    let installEvent, didInstallEvent, uninstallEvent, didUninstallEvent;
    setup(async () => {
        disposableStore.add(toDisposable(() => sinon.restore()));
        installEvent = disposableStore.add(new Emitter());
        didInstallEvent = disposableStore.add(new Emitter());
        uninstallEvent = disposableStore.add(new Emitter());
        didUninstallEvent = disposableStore.add(new Emitter());
        instantiationService = disposableStore.add(new TestInstantiationService());
        instantiationService.stub(ITelemetryService, NullTelemetryService);
        instantiationService.stub(ILogService, NullLogService);
        instantiationService.stub(IFileService, disposableStore.add(new FileService(new NullLogService())));
        instantiationService.stub(IProgressService, ProgressService);
        instantiationService.stub(IProductService, {});
        instantiationService.stub(IExtensionGalleryService, ExtensionGalleryService);
        instantiationService.stub(IURLService, NativeURLService);
        instantiationService.stub(ISharedProcessService, TestSharedProcessService);
        instantiationService.stub(IContextKeyService, new MockContextKeyService());
        instantiationService.stub(IWorkspaceContextService, new TestContextService());
        stubConfiguration();
        instantiationService.stub(IRemoteAgentService, RemoteAgentService);
        instantiationService.stub(IUserDataProfileService, disposableStore.add(new UserDataProfileService(toUserDataProfile('test', 'test', URI.file('foo'), URI.file('cache')))));
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
            getTargetPlatform: async () => getTargetPlatform(platform, arch),
            async resetPinnedStateForAllUserExtensions(pinned) { },
        });
        instantiationService.stub(IExtensionManagementServerService, anExtensionManagementServerService({
            id: 'local',
            label: 'local',
            extensionManagementService: instantiationService.get(IExtensionManagementService),
        }, null, null));
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposableStore.add(new TestExtensionEnablementService(instantiationService)));
        instantiationService.stub(ILifecycleService, disposableStore.add(new TestLifecycleService()));
        instantiationService.stub(IExtensionTipsService, disposableStore.add(instantiationService.createInstance(TestExtensionTipsService)));
        instantiationService.stub(IExtensionRecommendationsService, {});
        instantiationService.stub(INotificationService, { prompt: () => null });
        instantiationService.stub(IExtensionService, {
            onDidChangeExtensions: Event.None,
            extensions: [],
            async whenInstalledExtensionsRegistered() {
                return true;
            },
        });
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', []);
        instantiationService.stub(IExtensionGalleryService, 'isEnabled', true);
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage());
        instantiationService.stubPromise(IExtensionGalleryService, 'getExtensions', []);
        instantiationService.stubPromise(INotificationService, 'prompt', 0);
        (instantiationService.get(IWorkbenchExtensionEnablementService)).reset();
        instantiationService.stub(IUpdateService, {
            onStateChange: Event.None,
            state: State.Uninitialized,
        });
    });
    test('test gallery extension', async () => {
        const expected = aGalleryExtension('expectedName', {
            displayName: 'expectedDisplayName',
            version: '1.5.0',
            publisherId: 'expectedPublisherId',
            publisher: 'expectedPublisher',
            publisherDisplayName: 'expectedPublisherDisplayName',
            description: 'expectedDescription',
            installCount: 1000,
            rating: 4,
            ratingCount: 100,
        }, {
            dependencies: ['pub.1', 'pub.2'],
        }, {
            manifest: { uri: 'uri:manifest', fallbackUri: 'fallback:manifest' },
            readme: { uri: 'uri:readme', fallbackUri: 'fallback:readme' },
            changelog: { uri: 'uri:changelog', fallbackUri: 'fallback:changlog' },
            download: { uri: 'uri:download', fallbackUri: 'fallback:download' },
            icon: { uri: 'uri:icon', fallbackUri: 'fallback:icon' },
            license: { uri: 'uri:license', fallbackUri: 'fallback:license' },
            repository: { uri: 'uri:repository', fallbackUri: 'fallback:repository' },
            signature: { uri: 'uri:signature', fallbackUri: 'fallback:signature' },
            coreTranslations: [],
        });
        testObject = await aWorkbenchService();
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(expected));
        return testObject.queryGallery(CancellationToken.None).then((pagedResponse) => {
            assert.strictEqual(1, pagedResponse.firstPage.length);
            const actual = pagedResponse.firstPage[0];
            assert.strictEqual(1 /* ExtensionType.User */, actual.type);
            assert.strictEqual('expectedName', actual.name);
            assert.strictEqual('expectedDisplayName', actual.displayName);
            assert.strictEqual('expectedpublisher.expectedname', actual.identifier.id);
            assert.strictEqual('expectedPublisher', actual.publisher);
            assert.strictEqual('expectedPublisherDisplayName', actual.publisherDisplayName);
            assert.strictEqual('1.5.0', actual.version);
            assert.strictEqual('1.5.0', actual.latestVersion);
            assert.strictEqual('expectedDescription', actual.description);
            assert.strictEqual('uri:icon', actual.iconUrl);
            assert.strictEqual('fallback:icon', actual.iconUrlFallback);
            assert.strictEqual('uri:license', actual.licenseUrl);
            assert.strictEqual(3 /* ExtensionState.Uninstalled */, actual.state);
            assert.strictEqual(1000, actual.installCount);
            assert.strictEqual(4, actual.rating);
            assert.strictEqual(100, actual.ratingCount);
            assert.strictEqual(false, actual.outdated);
            assert.deepStrictEqual(['pub.1', 'pub.2'], actual.dependencies);
        });
    });
    test('test for empty installed extensions', async () => {
        testObject = await aWorkbenchService();
        assert.deepStrictEqual([], testObject.local);
    });
    test('test for installed extensions', async () => {
        const expected1 = aLocalExtension('local1', {
            publisher: 'localPublisher1',
            version: '1.1.0',
            displayName: 'localDisplayName1',
            description: 'localDescription1',
            icon: 'localIcon1',
            extensionDependencies: ['pub.1', 'pub.2'],
        }, {
            type: 1 /* ExtensionType.User */,
            readmeUrl: 'localReadmeUrl1',
            changelogUrl: 'localChangelogUrl1',
            location: URI.file('localPath1'),
        });
        const expected2 = aLocalExtension('local2', {
            publisher: 'localPublisher2',
            version: '1.2.0',
            displayName: 'localDisplayName2',
            description: 'localDescription2',
        }, {
            type: 0 /* ExtensionType.System */,
            readmeUrl: 'localReadmeUrl2',
            changelogUrl: 'localChangelogUrl2',
        });
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [
            expected1,
            expected2,
        ]);
        testObject = await aWorkbenchService();
        const actuals = testObject.local;
        assert.strictEqual(2, actuals.length);
        let actual = actuals[0];
        assert.strictEqual(1 /* ExtensionType.User */, actual.type);
        assert.strictEqual('local1', actual.name);
        assert.strictEqual('localDisplayName1', actual.displayName);
        assert.strictEqual('localpublisher1.local1', actual.identifier.id);
        assert.strictEqual('localPublisher1', actual.publisher);
        assert.strictEqual('1.1.0', actual.version);
        assert.strictEqual('1.1.0', actual.latestVersion);
        assert.strictEqual('localDescription1', actual.description);
        assert.ok(actual.iconUrl === 'file:///localPath1/localIcon1' ||
            actual.iconUrl === 'vscode-file://vscode-app/localPath1/localIcon1');
        assert.ok(actual.iconUrlFallback === 'file:///localPath1/localIcon1' ||
            actual.iconUrlFallback === 'vscode-file://vscode-app/localPath1/localIcon1');
        assert.strictEqual(undefined, actual.licenseUrl);
        assert.strictEqual(1 /* ExtensionState.Installed */, actual.state);
        assert.strictEqual(undefined, actual.installCount);
        assert.strictEqual(undefined, actual.rating);
        assert.strictEqual(undefined, actual.ratingCount);
        assert.strictEqual(false, actual.outdated);
        assert.deepStrictEqual(['pub.1', 'pub.2'], actual.dependencies);
        actual = actuals[1];
        assert.strictEqual(0 /* ExtensionType.System */, actual.type);
        assert.strictEqual('local2', actual.name);
        assert.strictEqual('localDisplayName2', actual.displayName);
        assert.strictEqual('localpublisher2.local2', actual.identifier.id);
        assert.strictEqual('localPublisher2', actual.publisher);
        assert.strictEqual('1.2.0', actual.version);
        assert.strictEqual('1.2.0', actual.latestVersion);
        assert.strictEqual('localDescription2', actual.description);
        assert.strictEqual(undefined, actual.licenseUrl);
        assert.strictEqual(1 /* ExtensionState.Installed */, actual.state);
        assert.strictEqual(undefined, actual.installCount);
        assert.strictEqual(undefined, actual.rating);
        assert.strictEqual(undefined, actual.ratingCount);
        assert.strictEqual(false, actual.outdated);
        assert.deepStrictEqual([], actual.dependencies);
    });
    test('test installed extensions get syncs with gallery', async () => {
        const local1 = aLocalExtension('local1', {
            publisher: 'localPublisher1',
            version: '1.1.0',
            displayName: 'localDisplayName1',
            description: 'localDescription1',
            icon: 'localIcon1',
            extensionDependencies: ['pub.1', 'pub.2'],
        }, {
            type: 1 /* ExtensionType.User */,
            readmeUrl: 'localReadmeUrl1',
            changelogUrl: 'localChangelogUrl1',
            location: URI.file('localPath1'),
        });
        const local2 = aLocalExtension('local2', {
            publisher: 'localPublisher2',
            version: '1.2.0',
            displayName: 'localDisplayName2',
            description: 'localDescription2',
        }, {
            type: 0 /* ExtensionType.System */,
            readmeUrl: 'localReadmeUrl2',
            changelogUrl: 'localChangelogUrl2',
        });
        const gallery1 = aGalleryExtension(local1.manifest.name, {
            identifier: local1.identifier,
            displayName: 'expectedDisplayName',
            version: '1.5.0',
            publisherId: 'expectedPublisherId',
            publisher: local1.manifest.publisher,
            publisherDisplayName: 'expectedPublisherDisplayName',
            description: 'expectedDescription',
            installCount: 1000,
            rating: 4,
            ratingCount: 100,
        }, {
            dependencies: ['pub.1'],
        }, {
            manifest: { uri: 'uri:manifest', fallbackUri: 'fallback:manifest' },
            readme: { uri: 'uri:readme', fallbackUri: 'fallback:readme' },
            changelog: { uri: 'uri:changelog', fallbackUri: 'fallback:changlog' },
            download: { uri: 'uri:download', fallbackUri: 'fallback:download' },
            icon: { uri: 'uri:icon', fallbackUri: 'fallback:icon' },
            license: { uri: 'uri:license', fallbackUri: 'fallback:license' },
            repository: { uri: 'uri:repository', fallbackUri: 'fallback:repository' },
            signature: { uri: 'uri:signature', fallbackUri: 'fallback:signature' },
            coreTranslations: [],
        });
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local1, local2]);
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(gallery1));
        instantiationService.stubPromise(IExtensionGalleryService, 'getCompatibleExtension', gallery1);
        instantiationService.stubPromise(IExtensionGalleryService, 'getExtensions', [gallery1]);
        testObject = await aWorkbenchService();
        await testObject.queryLocal();
        return Event.toPromise(testObject.onChange).then(() => {
            const actuals = testObject.local;
            assert.strictEqual(2, actuals.length);
            let actual = actuals[0];
            assert.strictEqual(1 /* ExtensionType.User */, actual.type);
            assert.strictEqual('local1', actual.name);
            assert.strictEqual('expectedDisplayName', actual.displayName);
            assert.strictEqual('localpublisher1.local1', actual.identifier.id);
            assert.strictEqual('localPublisher1', actual.publisher);
            assert.strictEqual('1.1.0', actual.version);
            assert.strictEqual('1.5.0', actual.latestVersion);
            assert.strictEqual('expectedDescription', actual.description);
            assert.strictEqual('uri:icon', actual.iconUrl);
            assert.strictEqual('fallback:icon', actual.iconUrlFallback);
            assert.strictEqual(1 /* ExtensionState.Installed */, actual.state);
            assert.strictEqual('uri:license', actual.licenseUrl);
            assert.strictEqual(1000, actual.installCount);
            assert.strictEqual(4, actual.rating);
            assert.strictEqual(100, actual.ratingCount);
            assert.strictEqual(true, actual.outdated);
            assert.deepStrictEqual(['pub.1'], actual.dependencies);
            actual = actuals[1];
            assert.strictEqual(0 /* ExtensionType.System */, actual.type);
            assert.strictEqual('local2', actual.name);
            assert.strictEqual('localDisplayName2', actual.displayName);
            assert.strictEqual('localpublisher2.local2', actual.identifier.id);
            assert.strictEqual('localPublisher2', actual.publisher);
            assert.strictEqual('1.2.0', actual.version);
            assert.strictEqual('1.2.0', actual.latestVersion);
            assert.strictEqual('localDescription2', actual.description);
            assert.strictEqual(undefined, actual.licenseUrl);
            assert.strictEqual(1 /* ExtensionState.Installed */, actual.state);
            assert.strictEqual(undefined, actual.installCount);
            assert.strictEqual(undefined, actual.rating);
            assert.strictEqual(undefined, actual.ratingCount);
            assert.strictEqual(false, actual.outdated);
            assert.deepStrictEqual([], actual.dependencies);
        });
    });
    test('test extension state computation', async () => {
        const gallery = aGalleryExtension('gallery1');
        testObject = await aWorkbenchService();
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(gallery));
        return testObject.queryGallery(CancellationToken.None).then((page) => {
            const extension = page.firstPage[0];
            assert.strictEqual(3 /* ExtensionState.Uninstalled */, extension.state);
            const identifier = gallery.identifier;
            // Installing
            installEvent.fire({ identifier, source: gallery, profileLocation: null });
            const local = testObject.local;
            assert.strictEqual(1, local.length);
            const actual = local[0];
            assert.strictEqual(`${gallery.publisher}.${gallery.name}`, actual.identifier.id);
            assert.strictEqual(0 /* ExtensionState.Installing */, actual.state);
            // Installed
            didInstallEvent.fire([
                {
                    identifier,
                    source: gallery,
                    operation: 2 /* InstallOperation.Install */,
                    local: aLocalExtension(gallery.name, gallery, { identifier }),
                    profileLocation: null,
                },
            ]);
            assert.strictEqual(1 /* ExtensionState.Installed */, actual.state);
            assert.strictEqual(1, testObject.local.length);
            testObject.uninstall(actual);
            // Uninstalling
            uninstallEvent.fire({ identifier, profileLocation: null });
            assert.strictEqual(2 /* ExtensionState.Uninstalling */, actual.state);
            // Uninstalled
            didUninstallEvent.fire({ identifier, profileLocation: null });
            assert.strictEqual(3 /* ExtensionState.Uninstalled */, actual.state);
            assert.strictEqual(0, testObject.local.length);
        });
    });
    test('test extension doesnot show outdated for system extensions', async () => {
        const local = aLocalExtension('a', { version: '1.0.1' }, { type: 0 /* ExtensionType.System */ });
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension(local.manifest.name, { identifier: local.identifier, version: '1.0.2' })));
        testObject = await aWorkbenchService();
        await testObject.queryLocal();
        assert.ok(!testObject.local[0].outdated);
    });
    test('test canInstall returns false for extensions with out gallery', async () => {
        const local = aLocalExtension('a', { version: '1.0.1' }, { type: 0 /* ExtensionType.System */ });
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
        testObject = await aWorkbenchService();
        const target = testObject.local[0];
        testObject.uninstall(target);
        uninstallEvent.fire({ identifier: local.identifier, profileLocation: null });
        didUninstallEvent.fire({ identifier: local.identifier, profileLocation: null });
        assert.ok((await testObject.canInstall(target)) !== true);
    });
    test('test canInstall returns false for a system extension', async () => {
        const local = aLocalExtension('a', { version: '1.0.1' }, { type: 0 /* ExtensionType.System */ });
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension(local.manifest.name, { identifier: local.identifier })));
        testObject = await aWorkbenchService();
        const target = testObject.local[0];
        assert.ok((await testObject.canInstall(target)) !== true);
    });
    test('test canInstall returns true for extensions with gallery', async () => {
        const local = aLocalExtension('a', { version: '1.0.1' }, { type: 1 /* ExtensionType.User */ });
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
        const gallery = aGalleryExtension(local.manifest.name, { identifier: local.identifier });
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(gallery));
        instantiationService.stubPromise(IExtensionGalleryService, 'getCompatibleExtension', gallery);
        instantiationService.stubPromise(IExtensionGalleryService, 'getExtensions', [gallery]);
        testObject = await aWorkbenchService();
        const target = testObject.local[0];
        await Event.toPromise(Event.filter(testObject.onChange, (e) => !!e?.gallery));
        assert.equal(await testObject.canInstall(target), true);
    });
    test('test onchange event is triggered while installing', async () => {
        const gallery = aGalleryExtension('gallery1');
        testObject = await aWorkbenchService();
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(gallery));
        const page = await testObject.queryGallery(CancellationToken.None);
        const extension = page.firstPage[0];
        assert.strictEqual(3 /* ExtensionState.Uninstalled */, extension.state);
        installEvent.fire({ identifier: gallery.identifier, source: gallery, profileLocation: null });
        const promise = Event.toPromise(testObject.onChange);
        // Installed
        didInstallEvent.fire([
            {
                identifier: gallery.identifier,
                source: gallery,
                operation: 2 /* InstallOperation.Install */,
                local: aLocalExtension(gallery.name, gallery, gallery),
                profileLocation: null,
            },
        ]);
        await promise;
    });
    test('test onchange event is triggered when installation is finished', async () => {
        const gallery = aGalleryExtension('gallery1');
        testObject = await aWorkbenchService();
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(gallery));
        const target = sinon.spy();
        return testObject.queryGallery(CancellationToken.None).then((page) => {
            const extension = page.firstPage[0];
            assert.strictEqual(3 /* ExtensionState.Uninstalled */, extension.state);
            disposableStore.add(testObject.onChange(target));
            // Installing
            installEvent.fire({ identifier: gallery.identifier, source: gallery, profileLocation: null });
            assert.ok(target.calledOnce);
        });
    });
    test('test onchange event is triggered while uninstalling', async () => {
        const local = aLocalExtension('a', {}, { type: 0 /* ExtensionType.System */ });
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
        testObject = await aWorkbenchService();
        const target = sinon.spy();
        testObject.uninstall(testObject.local[0]);
        disposableStore.add(testObject.onChange(target));
        uninstallEvent.fire({ identifier: local.identifier, profileLocation: null });
        assert.ok(target.calledOnce);
    });
    test('test onchange event is triggered when uninstalling is finished', async () => {
        const local = aLocalExtension('a', {}, { type: 0 /* ExtensionType.System */ });
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
        testObject = await aWorkbenchService();
        const target = sinon.spy();
        testObject.uninstall(testObject.local[0]);
        uninstallEvent.fire({ identifier: local.identifier, profileLocation: null });
        disposableStore.add(testObject.onChange(target));
        didUninstallEvent.fire({ identifier: local.identifier, profileLocation: null });
        assert.ok(target.calledOnce);
    });
    test('test uninstalled extensions are always enabled', async () => {
        return instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([aLocalExtension('b')], 9 /* EnablementState.DisabledGlobally */)
            .then(() => instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([aLocalExtension('c')], 10 /* EnablementState.DisabledWorkspace */))
            .then(async () => {
            testObject = await aWorkbenchService();
            instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a')));
            return testObject.queryGallery(CancellationToken.None).then((pagedResponse) => {
                const actual = pagedResponse.firstPage[0];
                assert.strictEqual(actual.enablementState, 11 /* EnablementState.EnabledGlobally */);
            });
        });
    });
    test('test enablement state installed enabled extension', async () => {
        return instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([aLocalExtension('b')], 9 /* EnablementState.DisabledGlobally */)
            .then(() => instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([aLocalExtension('c')], 10 /* EnablementState.DisabledWorkspace */))
            .then(async () => {
            instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [
                aLocalExtension('a'),
            ]);
            testObject = await aWorkbenchService();
            const actual = testObject.local[0];
            assert.strictEqual(actual.enablementState, 11 /* EnablementState.EnabledGlobally */);
        });
    });
    test('test workspace disabled extension', async () => {
        const extensionA = aLocalExtension('a');
        return instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([aLocalExtension('b')], 9 /* EnablementState.DisabledGlobally */)
            .then(() => instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([aLocalExtension('d')], 9 /* EnablementState.DisabledGlobally */))
            .then(() => instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([extensionA], 10 /* EnablementState.DisabledWorkspace */))
            .then(() => instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([aLocalExtension('e')], 10 /* EnablementState.DisabledWorkspace */))
            .then(async () => {
            instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [extensionA]);
            testObject = await aWorkbenchService();
            const actual = testObject.local[0];
            assert.strictEqual(actual.enablementState, 10 /* EnablementState.DisabledWorkspace */);
        });
    });
    test('test globally disabled extension', async () => {
        const localExtension = aLocalExtension('a');
        return instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([localExtension], 9 /* EnablementState.DisabledGlobally */)
            .then(() => instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([aLocalExtension('d')], 9 /* EnablementState.DisabledGlobally */))
            .then(() => instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([aLocalExtension('c')], 10 /* EnablementState.DisabledWorkspace */))
            .then(async () => {
            instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [
                localExtension,
            ]);
            testObject = await aWorkbenchService();
            const actual = testObject.local[0];
            assert.strictEqual(actual.enablementState, 9 /* EnablementState.DisabledGlobally */);
        });
    });
    test('test enablement state is updated for user extensions', async () => {
        return instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([aLocalExtension('c')], 9 /* EnablementState.DisabledGlobally */)
            .then(() => instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([aLocalExtension('b')], 10 /* EnablementState.DisabledWorkspace */))
            .then(async () => {
            instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [
                aLocalExtension('a'),
            ]);
            testObject = await aWorkbenchService();
            return testObject
                .setEnablement(testObject.local[0], 10 /* EnablementState.DisabledWorkspace */)
                .then(() => {
                const actual = testObject.local[0];
                assert.strictEqual(actual.enablementState, 10 /* EnablementState.DisabledWorkspace */);
            });
        });
    });
    test('test enable extension globally when extension is disabled for workspace', async () => {
        const localExtension = aLocalExtension('a');
        return instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([localExtension], 10 /* EnablementState.DisabledWorkspace */)
            .then(async () => {
            instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [
                localExtension,
            ]);
            testObject = await aWorkbenchService();
            return testObject
                .setEnablement(testObject.local[0], 11 /* EnablementState.EnabledGlobally */)
                .then(() => {
                const actual = testObject.local[0];
                assert.strictEqual(actual.enablementState, 11 /* EnablementState.EnabledGlobally */);
            });
        });
    });
    test('test disable extension globally', async () => {
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [
            aLocalExtension('a'),
        ]);
        testObject = await aWorkbenchService();
        return testObject
            .setEnablement(testObject.local[0], 9 /* EnablementState.DisabledGlobally */)
            .then(() => {
            const actual = testObject.local[0];
            assert.strictEqual(actual.enablementState, 9 /* EnablementState.DisabledGlobally */);
        });
    });
    test('test system extensions can be disabled', async () => {
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [
            aLocalExtension('a', {}, { type: 0 /* ExtensionType.System */ }),
        ]);
        testObject = await aWorkbenchService();
        return testObject
            .setEnablement(testObject.local[0], 9 /* EnablementState.DisabledGlobally */)
            .then(() => {
            const actual = testObject.local[0];
            assert.strictEqual(actual.enablementState, 9 /* EnablementState.DisabledGlobally */);
        });
    });
    test('test enablement state is updated on change from outside', async () => {
        const localExtension = aLocalExtension('a');
        return instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([aLocalExtension('c')], 9 /* EnablementState.DisabledGlobally */)
            .then(() => instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([aLocalExtension('b')], 10 /* EnablementState.DisabledWorkspace */))
            .then(async () => {
            instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [
                localExtension,
            ]);
            testObject = await aWorkbenchService();
            return instantiationService
                .get(IWorkbenchExtensionEnablementService)
                .setEnablement([localExtension], 9 /* EnablementState.DisabledGlobally */)
                .then(() => {
                const actual = testObject.local[0];
                assert.strictEqual(actual.enablementState, 9 /* EnablementState.DisabledGlobally */);
            });
        });
    });
    test('test disable extension with dependencies disable only itself', async () => {
        const extensionA = aLocalExtension('a', { extensionDependencies: ['pub.b'] });
        const extensionB = aLocalExtension('b');
        const extensionC = aLocalExtension('c');
        return instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([extensionA], 11 /* EnablementState.EnabledGlobally */)
            .then(() => instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([extensionB], 11 /* EnablementState.EnabledGlobally */))
            .then(() => instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([extensionC], 11 /* EnablementState.EnabledGlobally */))
            .then(async () => {
            instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [
                extensionA,
                extensionB,
                extensionC,
            ]);
            testObject = await aWorkbenchService();
            return testObject
                .setEnablement(testObject.local[0], 9 /* EnablementState.DisabledGlobally */)
                .then(() => {
                assert.strictEqual(testObject.local[0].enablementState, 9 /* EnablementState.DisabledGlobally */);
                assert.strictEqual(testObject.local[1].enablementState, 11 /* EnablementState.EnabledGlobally */);
            });
        });
    });
    test('test disable extension pack disables the pack', async () => {
        const extensionA = aLocalExtension('a', { extensionPack: ['pub.b'] });
        const extensionB = aLocalExtension('b');
        const extensionC = aLocalExtension('c');
        return instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([extensionA], 11 /* EnablementState.EnabledGlobally */)
            .then(() => instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([extensionB], 11 /* EnablementState.EnabledGlobally */))
            .then(() => instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([extensionC], 11 /* EnablementState.EnabledGlobally */))
            .then(async () => {
            instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [
                extensionA,
                extensionB,
                extensionC,
            ]);
            testObject = await aWorkbenchService();
            return testObject
                .setEnablement(testObject.local[0], 9 /* EnablementState.DisabledGlobally */)
                .then(() => {
                assert.strictEqual(testObject.local[0].enablementState, 9 /* EnablementState.DisabledGlobally */);
                assert.strictEqual(testObject.local[1].enablementState, 9 /* EnablementState.DisabledGlobally */);
            });
        });
    });
    test('test disable extension pack disable all', async () => {
        const extensionA = aLocalExtension('a', { extensionPack: ['pub.b'] });
        const extensionB = aLocalExtension('b');
        const extensionC = aLocalExtension('c');
        return instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([extensionA], 11 /* EnablementState.EnabledGlobally */)
            .then(() => instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([extensionB], 11 /* EnablementState.EnabledGlobally */))
            .then(() => instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([extensionC], 11 /* EnablementState.EnabledGlobally */))
            .then(async () => {
            instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [
                extensionA,
                extensionB,
                extensionC,
            ]);
            testObject = await aWorkbenchService();
            return testObject
                .setEnablement(testObject.local[0], 9 /* EnablementState.DisabledGlobally */)
                .then(() => {
                assert.strictEqual(testObject.local[0].enablementState, 9 /* EnablementState.DisabledGlobally */);
                assert.strictEqual(testObject.local[1].enablementState, 9 /* EnablementState.DisabledGlobally */);
            });
        });
    });
    test('test disable extension fails if extension is a dependent of other', async () => {
        const extensionA = aLocalExtension('a', { extensionDependencies: ['pub.b'] });
        const extensionB = aLocalExtension('b');
        const extensionC = aLocalExtension('c');
        instantiationService.stub(INotificationService, {
            prompt(severity, message, choices, options) {
                options.onCancel();
                return null;
            },
        });
        return instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([extensionA], 11 /* EnablementState.EnabledGlobally */)
            .then(() => instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([extensionB], 11 /* EnablementState.EnabledGlobally */))
            .then(() => instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([extensionC], 11 /* EnablementState.EnabledGlobally */))
            .then(async () => {
            instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [
                extensionA,
                extensionB,
                extensionC,
            ]);
            testObject = await aWorkbenchService();
            return testObject.setEnablement(testObject.local[1], 9 /* EnablementState.DisabledGlobally */).then(() => assert.fail('Should fail'), (error) => assert.ok(true));
        });
    });
    test('test disable extension disables all dependents when chosen to disable all', async () => {
        const extensionA = aLocalExtension('a', { extensionDependencies: ['pub.b'] });
        const extensionB = aLocalExtension('b');
        const extensionC = aLocalExtension('c');
        instantiationService.stub(IDialogService, {
            prompt() {
                return Promise.resolve({ result: true });
            },
        });
        return instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([extensionA], 11 /* EnablementState.EnabledGlobally */)
            .then(() => instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([extensionB], 11 /* EnablementState.EnabledGlobally */))
            .then(() => instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([extensionC], 11 /* EnablementState.EnabledGlobally */))
            .then(async () => {
            instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [
                extensionA,
                extensionB,
                extensionC,
            ]);
            testObject = await aWorkbenchService();
            await testObject.setEnablement(testObject.local[1], 9 /* EnablementState.DisabledGlobally */);
            assert.strictEqual(testObject.local[0].enablementState, 9 /* EnablementState.DisabledGlobally */);
            assert.strictEqual(testObject.local[1].enablementState, 9 /* EnablementState.DisabledGlobally */);
        });
    });
    test('test disable extension when extension is part of a pack', async () => {
        const extensionA = aLocalExtension('a', { extensionPack: ['pub.b'] });
        const extensionB = aLocalExtension('b');
        const extensionC = aLocalExtension('c');
        return instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([extensionA], 11 /* EnablementState.EnabledGlobally */)
            .then(() => instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([extensionB], 11 /* EnablementState.EnabledGlobally */))
            .then(() => instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([extensionC], 11 /* EnablementState.EnabledGlobally */))
            .then(async () => {
            instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [
                extensionA,
                extensionB,
                extensionC,
            ]);
            testObject = await aWorkbenchService();
            return testObject
                .setEnablement(testObject.local[1], 9 /* EnablementState.DisabledGlobally */)
                .then(() => {
                assert.strictEqual(testObject.local[1].enablementState, 9 /* EnablementState.DisabledGlobally */);
            });
        });
    });
    test('test disable both dependency and dependent do not promot and do not fail', async () => {
        const extensionA = aLocalExtension('a', { extensionDependencies: ['pub.b'] });
        const extensionB = aLocalExtension('b');
        const extensionC = aLocalExtension('c');
        return instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([extensionA], 11 /* EnablementState.EnabledGlobally */)
            .then(() => instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([extensionB], 11 /* EnablementState.EnabledGlobally */))
            .then(() => instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([extensionC], 11 /* EnablementState.EnabledGlobally */))
            .then(async () => {
            instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [
                extensionA,
                extensionB,
                extensionC,
            ]);
            const target = sinon.spy();
            testObject = await aWorkbenchService();
            return testObject
                .setEnablement([testObject.local[1], testObject.local[0]], 9 /* EnablementState.DisabledGlobally */)
                .then(() => {
                assert.ok(!target.called);
                assert.strictEqual(testObject.local[0].enablementState, 9 /* EnablementState.DisabledGlobally */);
                assert.strictEqual(testObject.local[1].enablementState, 9 /* EnablementState.DisabledGlobally */);
            });
        });
    });
    test('test enable both dependency and dependent do not promot and do not fail', async () => {
        const extensionA = aLocalExtension('a', { extensionDependencies: ['pub.b'] });
        const extensionB = aLocalExtension('b');
        const extensionC = aLocalExtension('c');
        return instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([extensionA], 9 /* EnablementState.DisabledGlobally */)
            .then(() => instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([extensionB], 9 /* EnablementState.DisabledGlobally */))
            .then(() => instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([extensionC], 9 /* EnablementState.DisabledGlobally */))
            .then(async () => {
            instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [
                extensionA,
                extensionB,
                extensionC,
            ]);
            const target = sinon.spy();
            testObject = await aWorkbenchService();
            return testObject
                .setEnablement([testObject.local[1], testObject.local[0]], 11 /* EnablementState.EnabledGlobally */)
                .then(() => {
                assert.ok(!target.called);
                assert.strictEqual(testObject.local[0].enablementState, 11 /* EnablementState.EnabledGlobally */);
                assert.strictEqual(testObject.local[1].enablementState, 11 /* EnablementState.EnabledGlobally */);
            });
        });
    });
    test('test disable extension does not fail if its dependency is a dependent of other but chosen to disable only itself', async () => {
        const extensionA = aLocalExtension('a', { extensionDependencies: ['pub.b'] });
        const extensionB = aLocalExtension('b');
        const extensionC = aLocalExtension('c', { extensionDependencies: ['pub.b'] });
        return instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([extensionA], 11 /* EnablementState.EnabledGlobally */)
            .then(() => instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([extensionB], 11 /* EnablementState.EnabledGlobally */))
            .then(() => instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([extensionC], 11 /* EnablementState.EnabledGlobally */))
            .then(async () => {
            instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [
                extensionA,
                extensionB,
                extensionC,
            ]);
            testObject = await aWorkbenchService();
            return testObject
                .setEnablement(testObject.local[0], 9 /* EnablementState.DisabledGlobally */)
                .then(() => {
                assert.strictEqual(testObject.local[0].enablementState, 9 /* EnablementState.DisabledGlobally */);
            });
        });
    });
    test('test disable extension if its dependency is a dependent of other disabled extension', async () => {
        const extensionA = aLocalExtension('a', { extensionDependencies: ['pub.b'] });
        const extensionB = aLocalExtension('b');
        const extensionC = aLocalExtension('c', { extensionDependencies: ['pub.b'] });
        return instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([extensionA], 11 /* EnablementState.EnabledGlobally */)
            .then(() => instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([extensionB], 11 /* EnablementState.EnabledGlobally */))
            .then(() => instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([extensionC], 9 /* EnablementState.DisabledGlobally */))
            .then(async () => {
            instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [
                extensionA,
                extensionB,
                extensionC,
            ]);
            testObject = await aWorkbenchService();
            return testObject
                .setEnablement(testObject.local[0], 9 /* EnablementState.DisabledGlobally */)
                .then(() => {
                assert.strictEqual(testObject.local[0].enablementState, 9 /* EnablementState.DisabledGlobally */);
            });
        });
    });
    test('test disable extension if its dependencys dependency is itself', async () => {
        const extensionA = aLocalExtension('a', { extensionDependencies: ['pub.b'] });
        const extensionB = aLocalExtension('b', { extensionDependencies: ['pub.a'] });
        const extensionC = aLocalExtension('c');
        instantiationService.stub(INotificationService, {
            prompt(severity, message, choices, options) {
                options.onCancel();
                return null;
            },
        });
        return instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([extensionA], 11 /* EnablementState.EnabledGlobally */)
            .then(() => instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([extensionB], 11 /* EnablementState.EnabledGlobally */))
            .then(() => instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([extensionC], 11 /* EnablementState.EnabledGlobally */))
            .then(async () => {
            instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [
                extensionA,
                extensionB,
                extensionC,
            ]);
            testObject = await aWorkbenchService();
            return testObject.setEnablement(testObject.local[0], 9 /* EnablementState.DisabledGlobally */).then(() => assert.fail('An extension with dependent should not be disabled'), () => null);
        });
    });
    test('test disable extension if its dependency is dependent and is disabled', async () => {
        const extensionA = aLocalExtension('a', { extensionDependencies: ['pub.b'] });
        const extensionB = aLocalExtension('b');
        const extensionC = aLocalExtension('c', { extensionDependencies: ['pub.b'] });
        return instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([extensionA], 11 /* EnablementState.EnabledGlobally */)
            .then(() => instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([extensionB], 9 /* EnablementState.DisabledGlobally */))
            .then(() => instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([extensionC], 11 /* EnablementState.EnabledGlobally */))
            .then(async () => {
            instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [
                extensionA,
                extensionB,
                extensionC,
            ]);
            testObject = await aWorkbenchService();
            return testObject
                .setEnablement(testObject.local[0], 9 /* EnablementState.DisabledGlobally */)
                .then(() => assert.strictEqual(testObject.local[0].enablementState, 9 /* EnablementState.DisabledGlobally */));
        });
    });
    test('test disable extension with cyclic dependencies', async () => {
        const extensionA = aLocalExtension('a', { extensionDependencies: ['pub.b'] });
        const extensionB = aLocalExtension('b', { extensionDependencies: ['pub.c'] });
        const extensionC = aLocalExtension('c', { extensionDependencies: ['pub.a'] });
        instantiationService.stub(INotificationService, {
            prompt(severity, message, choices, options) {
                options.onCancel();
                return null;
            },
        });
        return instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([extensionA], 11 /* EnablementState.EnabledGlobally */)
            .then(() => instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([extensionB], 11 /* EnablementState.EnabledGlobally */))
            .then(() => instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([extensionC], 11 /* EnablementState.EnabledGlobally */))
            .then(async () => {
            instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [
                extensionA,
                extensionB,
                extensionC,
            ]);
            testObject = await aWorkbenchService();
            return testObject.setEnablement(testObject.local[0], 9 /* EnablementState.DisabledGlobally */).then(() => assert.fail('An extension with dependent should not be disabled'), () => null);
        });
    });
    test('test enable extension with dependencies enable all', async () => {
        const extensionA = aLocalExtension('a', { extensionDependencies: ['pub.b'] });
        const extensionB = aLocalExtension('b');
        const extensionC = aLocalExtension('c');
        return instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([extensionA], 9 /* EnablementState.DisabledGlobally */)
            .then(() => instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([extensionB], 9 /* EnablementState.DisabledGlobally */))
            .then(() => instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([extensionC], 9 /* EnablementState.DisabledGlobally */))
            .then(async () => {
            instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [
                extensionA,
                extensionB,
                extensionC,
            ]);
            testObject = await aWorkbenchService();
            return testObject
                .setEnablement(testObject.local[0], 11 /* EnablementState.EnabledGlobally */)
                .then(() => {
                assert.strictEqual(testObject.local[0].enablementState, 11 /* EnablementState.EnabledGlobally */);
                assert.strictEqual(testObject.local[1].enablementState, 11 /* EnablementState.EnabledGlobally */);
            });
        });
    });
    test('test enable extension with dependencies does not prompt if dependency is enabled already', async () => {
        const extensionA = aLocalExtension('a', { extensionDependencies: ['pub.b'] });
        const extensionB = aLocalExtension('b');
        const extensionC = aLocalExtension('c');
        return instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([extensionA], 9 /* EnablementState.DisabledGlobally */)
            .then(() => instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([extensionB], 11 /* EnablementState.EnabledGlobally */))
            .then(() => instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([extensionC], 9 /* EnablementState.DisabledGlobally */))
            .then(async () => {
            instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [
                extensionA,
                extensionB,
                extensionC,
            ]);
            const target = sinon.spy();
            testObject = await aWorkbenchService();
            return testObject
                .setEnablement(testObject.local[0], 11 /* EnablementState.EnabledGlobally */)
                .then(() => {
                assert.ok(!target.called);
                assert.strictEqual(testObject.local[0].enablementState, 11 /* EnablementState.EnabledGlobally */);
            });
        });
    });
    test('test enable extension with dependency does not prompt if both are enabled', async () => {
        const extensionA = aLocalExtension('a', { extensionDependencies: ['pub.b'] });
        const extensionB = aLocalExtension('b');
        const extensionC = aLocalExtension('c');
        return instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([extensionA], 9 /* EnablementState.DisabledGlobally */)
            .then(() => instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([extensionB], 9 /* EnablementState.DisabledGlobally */))
            .then(() => instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([extensionC], 9 /* EnablementState.DisabledGlobally */))
            .then(async () => {
            instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [
                extensionA,
                extensionB,
                extensionC,
            ]);
            const target = sinon.spy();
            testObject = await aWorkbenchService();
            return testObject
                .setEnablement([testObject.local[1], testObject.local[0]], 11 /* EnablementState.EnabledGlobally */)
                .then(() => {
                assert.ok(!target.called);
                assert.strictEqual(testObject.local[0].enablementState, 11 /* EnablementState.EnabledGlobally */);
                assert.strictEqual(testObject.local[1].enablementState, 11 /* EnablementState.EnabledGlobally */);
            });
        });
    });
    test('test enable extension with cyclic dependencies', async () => {
        const extensionA = aLocalExtension('a', { extensionDependencies: ['pub.b'] });
        const extensionB = aLocalExtension('b', { extensionDependencies: ['pub.c'] });
        const extensionC = aLocalExtension('c', { extensionDependencies: ['pub.a'] });
        return instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([extensionA], 9 /* EnablementState.DisabledGlobally */)
            .then(() => instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([extensionB], 9 /* EnablementState.DisabledGlobally */))
            .then(() => instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([extensionC], 9 /* EnablementState.DisabledGlobally */))
            .then(async () => {
            instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [
                extensionA,
                extensionB,
                extensionC,
            ]);
            testObject = await aWorkbenchService();
            return testObject
                .setEnablement(testObject.local[0], 11 /* EnablementState.EnabledGlobally */)
                .then(() => {
                assert.strictEqual(testObject.local[0].enablementState, 11 /* EnablementState.EnabledGlobally */);
                assert.strictEqual(testObject.local[1].enablementState, 11 /* EnablementState.EnabledGlobally */);
                assert.strictEqual(testObject.local[2].enablementState, 11 /* EnablementState.EnabledGlobally */);
            });
        });
    });
    test('test change event is fired when disablement flags are changed', async () => {
        return instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([aLocalExtension('c')], 9 /* EnablementState.DisabledGlobally */)
            .then(() => instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([aLocalExtension('b')], 10 /* EnablementState.DisabledWorkspace */))
            .then(async () => {
            instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [
                aLocalExtension('a'),
            ]);
            testObject = await aWorkbenchService();
            const target = sinon.spy();
            disposableStore.add(testObject.onChange(target));
            return testObject
                .setEnablement(testObject.local[0], 9 /* EnablementState.DisabledGlobally */)
                .then(() => assert.ok(target.calledOnce));
        });
    });
    test('test change event is fired when disablement flags are changed from outside', async () => {
        const localExtension = aLocalExtension('a');
        return instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([aLocalExtension('c')], 9 /* EnablementState.DisabledGlobally */)
            .then(() => instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([aLocalExtension('b')], 10 /* EnablementState.DisabledWorkspace */))
            .then(async () => {
            instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [
                localExtension,
            ]);
            testObject = await aWorkbenchService();
            const target = sinon.spy();
            disposableStore.add(testObject.onChange(target));
            return instantiationService
                .get(IWorkbenchExtensionEnablementService)
                .setEnablement([localExtension], 9 /* EnablementState.DisabledGlobally */)
                .then(() => assert.ok(target.calledOnce));
        });
    });
    test('test updating an extension does not re-eanbles it when disabled globally', async () => {
        testObject = await aWorkbenchService();
        const local = aLocalExtension('pub.a');
        await instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([local], 9 /* EnablementState.DisabledGlobally */);
        didInstallEvent.fire([
            {
                local,
                identifier: local.identifier,
                operation: 3 /* InstallOperation.Update */,
                profileLocation: null,
            },
        ]);
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
        const actual = await testObject.queryLocal();
        assert.strictEqual(actual[0].enablementState, 9 /* EnablementState.DisabledGlobally */);
    });
    test('test updating an extension does not re-eanbles it when workspace disabled', async () => {
        testObject = await aWorkbenchService();
        const local = aLocalExtension('pub.a');
        await instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([local], 10 /* EnablementState.DisabledWorkspace */);
        didInstallEvent.fire([
            {
                local,
                identifier: local.identifier,
                operation: 3 /* InstallOperation.Update */,
                profileLocation: null,
            },
        ]);
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [local]);
        const actual = await testObject.queryLocal();
        assert.strictEqual(actual[0].enablementState, 10 /* EnablementState.DisabledWorkspace */);
    });
    test('test user extension is preferred when the same extension exists as system and user extension', async () => {
        testObject = await aWorkbenchService();
        const userExtension = aLocalExtension('pub.a');
        const systemExtension = aLocalExtension('pub.a', {}, { type: 0 /* ExtensionType.System */ });
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [
            systemExtension,
            userExtension,
        ]);
        const actual = await testObject.queryLocal();
        assert.strictEqual(actual.length, 1);
        assert.strictEqual(actual[0].local, userExtension);
    });
    test('test user extension is disabled when the same extension exists as system and user extension and system extension is disabled', async () => {
        testObject = await aWorkbenchService();
        const systemExtension = aLocalExtension('pub.a', {}, { type: 0 /* ExtensionType.System */ });
        await instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([systemExtension], 9 /* EnablementState.DisabledGlobally */);
        const userExtension = aLocalExtension('pub.a');
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [
            systemExtension,
            userExtension,
        ]);
        const actual = await testObject.queryLocal();
        assert.strictEqual(actual.length, 1);
        assert.strictEqual(actual[0].local, userExtension);
        assert.strictEqual(actual[0].enablementState, 9 /* EnablementState.DisabledGlobally */);
    });
    test('Test local ui extension is chosen if it exists only in local server', async () => {
        // multi server setup
        const extensionKind = ['ui'];
        const localExtension = aLocalExtension('a', { extensionKind }, { location: URI.file(`pub.a`) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localExtension]), createExtensionManagementService([]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposableStore.add(new TestExtensionEnablementService(instantiationService)));
        testObject = await aWorkbenchService();
        const actual = await testObject.queryLocal();
        assert.strictEqual(actual.length, 1);
        assert.strictEqual(actual[0].local, localExtension);
    });
    test('Test local workspace extension is chosen if it exists only in local server', async () => {
        // multi server setup
        const extensionKind = ['workspace'];
        const localExtension = aLocalExtension('a', { extensionKind }, { location: URI.file(`pub.a`) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localExtension]), createExtensionManagementService([]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposableStore.add(new TestExtensionEnablementService(instantiationService)));
        testObject = await aWorkbenchService();
        const actual = await testObject.queryLocal();
        assert.strictEqual(actual.length, 1);
        assert.strictEqual(actual[0].local, localExtension);
    });
    test('Test local web extension is chosen if it exists only in local server', async () => {
        // multi server setup
        const extensionKind = ['web'];
        const localExtension = aLocalExtension('a', { extensionKind }, { location: URI.file(`pub.a`) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localExtension]), createExtensionManagementService([]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposableStore.add(new TestExtensionEnablementService(instantiationService)));
        testObject = await aWorkbenchService();
        const actual = await testObject.queryLocal();
        assert.strictEqual(actual.length, 1);
        assert.strictEqual(actual[0].local, localExtension);
    });
    test('Test local ui,workspace extension is chosen if it exists only in local server', async () => {
        // multi server setup
        const extensionKind = ['ui', 'workspace'];
        const localExtension = aLocalExtension('a', { extensionKind }, { location: URI.file(`pub.a`) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localExtension]), createExtensionManagementService([]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposableStore.add(new TestExtensionEnablementService(instantiationService)));
        testObject = await aWorkbenchService();
        const actual = await testObject.queryLocal();
        assert.strictEqual(actual.length, 1);
        assert.strictEqual(actual[0].local, localExtension);
    });
    test('Test local workspace,ui extension is chosen if it exists only in local server', async () => {
        // multi server setup
        const extensionKind = ['workspace', 'ui'];
        const localExtension = aLocalExtension('a', { extensionKind }, { location: URI.file(`pub.a`) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localExtension]), createExtensionManagementService([]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposableStore.add(new TestExtensionEnablementService(instantiationService)));
        testObject = await aWorkbenchService();
        const actual = await testObject.queryLocal();
        assert.strictEqual(actual.length, 1);
        assert.strictEqual(actual[0].local, localExtension);
    });
    test('Test local ui,workspace,web extension is chosen if it exists only in local server', async () => {
        // multi server setup
        const extensionKind = ['ui', 'workspace', 'web'];
        const localExtension = aLocalExtension('a', { extensionKind }, { location: URI.file(`pub.a`) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localExtension]), createExtensionManagementService([]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposableStore.add(new TestExtensionEnablementService(instantiationService)));
        testObject = await aWorkbenchService();
        const actual = await testObject.queryLocal();
        assert.strictEqual(actual.length, 1);
        assert.strictEqual(actual[0].local, localExtension);
    });
    test('Test local ui,web,workspace extension is chosen if it exists only in local server', async () => {
        // multi server setup
        const extensionKind = ['ui', 'web', 'workspace'];
        const localExtension = aLocalExtension('a', { extensionKind }, { location: URI.file(`pub.a`) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localExtension]), createExtensionManagementService([]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposableStore.add(new TestExtensionEnablementService(instantiationService)));
        testObject = await aWorkbenchService();
        const actual = await testObject.queryLocal();
        assert.strictEqual(actual.length, 1);
        assert.strictEqual(actual[0].local, localExtension);
    });
    test('Test local web,ui,workspace extension is chosen if it exists only in local server', async () => {
        // multi server setup
        const extensionKind = ['web', 'ui', 'workspace'];
        const localExtension = aLocalExtension('a', { extensionKind }, { location: URI.file(`pub.a`) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localExtension]), createExtensionManagementService([]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposableStore.add(new TestExtensionEnablementService(instantiationService)));
        testObject = await aWorkbenchService();
        const actual = await testObject.queryLocal();
        assert.strictEqual(actual.length, 1);
        assert.strictEqual(actual[0].local, localExtension);
    });
    test('Test local web,workspace,ui extension is chosen if it exists only in local server', async () => {
        // multi server setup
        const extensionKind = ['web', 'workspace', 'ui'];
        const localExtension = aLocalExtension('a', { extensionKind }, { location: URI.file(`pub.a`) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localExtension]), createExtensionManagementService([]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposableStore.add(new TestExtensionEnablementService(instantiationService)));
        testObject = await aWorkbenchService();
        const actual = await testObject.queryLocal();
        assert.strictEqual(actual.length, 1);
        assert.strictEqual(actual[0].local, localExtension);
    });
    test('Test local workspace,web,ui extension is chosen if it exists only in local server', async () => {
        // multi server setup
        const extensionKind = ['workspace', 'web', 'ui'];
        const localExtension = aLocalExtension('a', { extensionKind }, { location: URI.file(`pub.a`) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localExtension]), createExtensionManagementService([]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposableStore.add(new TestExtensionEnablementService(instantiationService)));
        testObject = await aWorkbenchService();
        const actual = await testObject.queryLocal();
        assert.strictEqual(actual.length, 1);
        assert.strictEqual(actual[0].local, localExtension);
    });
    test('Test local workspace,ui,web extension is chosen if it exists only in local server', async () => {
        // multi server setup
        const extensionKind = ['workspace', 'ui', 'web'];
        const localExtension = aLocalExtension('a', { extensionKind }, { location: URI.file(`pub.a`) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localExtension]), createExtensionManagementService([]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposableStore.add(new TestExtensionEnablementService(instantiationService)));
        testObject = await aWorkbenchService();
        const actual = await testObject.queryLocal();
        assert.strictEqual(actual.length, 1);
        assert.strictEqual(actual[0].local, localExtension);
    });
    test('Test local UI extension is chosen if it exists in both servers', async () => {
        // multi server setup
        const extensionKind = ['ui'];
        const localExtension = aLocalExtension('a', { extensionKind }, { location: URI.file(`pub.a`) });
        const remoteExtension = aLocalExtension('a', { extensionKind }, { location: URI.file(`pub.a`).with({ scheme: Schemas.vscodeRemote }) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localExtension]), createExtensionManagementService([remoteExtension]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposableStore.add(new TestExtensionEnablementService(instantiationService)));
        testObject = await aWorkbenchService();
        const actual = await testObject.queryLocal();
        assert.strictEqual(actual.length, 1);
        assert.strictEqual(actual[0].local, localExtension);
    });
    test('Test local ui,workspace extension is chosen if it exists in both servers', async () => {
        // multi server setup
        const extensionKind = ['ui', 'workspace'];
        const localExtension = aLocalExtension('a', { extensionKind }, { location: URI.file(`pub.a`) });
        const remoteExtension = aLocalExtension('a', { extensionKind }, { location: URI.file(`pub.a`).with({ scheme: Schemas.vscodeRemote }) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localExtension]), createExtensionManagementService([remoteExtension]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposableStore.add(new TestExtensionEnablementService(instantiationService)));
        testObject = await aWorkbenchService();
        const actual = await testObject.queryLocal();
        assert.strictEqual(actual.length, 1);
        assert.strictEqual(actual[0].local, localExtension);
    });
    test('Test remote workspace extension is chosen if it exists in remote server', async () => {
        // multi server setup
        const extensionKind = ['workspace'];
        const remoteExtension = aLocalExtension('a', { extensionKind }, { location: URI.file(`pub.a`).with({ scheme: Schemas.vscodeRemote }) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService(), createExtensionManagementService([remoteExtension]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposableStore.add(new TestExtensionEnablementService(instantiationService)));
        testObject = await aWorkbenchService();
        const actual = await testObject.queryLocal();
        assert.strictEqual(actual.length, 1);
        assert.strictEqual(actual[0].local, remoteExtension);
    });
    test('Test remote workspace extension is chosen if it exists in both servers', async () => {
        // multi server setup
        const extensionKind = ['workspace'];
        const localExtension = aLocalExtension('a', { extensionKind }, { location: URI.file(`pub.a`) });
        const remoteExtension = aLocalExtension('a', { extensionKind }, { location: URI.file(`pub.a`).with({ scheme: Schemas.vscodeRemote }) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localExtension]), createExtensionManagementService([remoteExtension]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposableStore.add(new TestExtensionEnablementService(instantiationService)));
        testObject = await aWorkbenchService();
        const actual = await testObject.queryLocal();
        assert.strictEqual(actual.length, 1);
        assert.strictEqual(actual[0].local, remoteExtension);
    });
    test('Test remote workspace extension is chosen if it exists in both servers and local is disabled', async () => {
        // multi server setup
        const extensionKind = ['workspace'];
        const localExtension = aLocalExtension('a', { extensionKind }, { location: URI.file(`pub.a`) });
        const remoteExtension = aLocalExtension('a', { extensionKind }, { location: URI.file(`pub.a`).with({ scheme: Schemas.vscodeRemote }) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localExtension]), createExtensionManagementService([remoteExtension]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposableStore.add(new TestExtensionEnablementService(instantiationService)));
        await instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([remoteExtension], 9 /* EnablementState.DisabledGlobally */);
        testObject = await aWorkbenchService();
        const actual = await testObject.queryLocal();
        assert.strictEqual(actual.length, 1);
        assert.strictEqual(actual[0].local, remoteExtension);
        assert.strictEqual(actual[0].enablementState, 9 /* EnablementState.DisabledGlobally */);
    });
    test('Test remote workspace extension is chosen if it exists in both servers and remote is disabled in workspace', async () => {
        // multi server setup
        const extensionKind = ['workspace'];
        const localExtension = aLocalExtension('a', { extensionKind }, { location: URI.file(`pub.a`) });
        const remoteExtension = aLocalExtension('a', { extensionKind }, { location: URI.file(`pub.a`).with({ scheme: Schemas.vscodeRemote }) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localExtension]), createExtensionManagementService([remoteExtension]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposableStore.add(new TestExtensionEnablementService(instantiationService)));
        await instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([remoteExtension], 10 /* EnablementState.DisabledWorkspace */);
        testObject = await aWorkbenchService();
        const actual = await testObject.queryLocal();
        assert.strictEqual(actual.length, 1);
        assert.strictEqual(actual[0].local, remoteExtension);
        assert.strictEqual(actual[0].enablementState, 10 /* EnablementState.DisabledWorkspace */);
    });
    test('Test local ui, workspace extension is chosen if it exists in both servers and local is disabled', async () => {
        // multi server setup
        const extensionKind = ['ui', 'workspace'];
        const localExtension = aLocalExtension('a', { extensionKind }, { location: URI.file(`pub.a`) });
        const remoteExtension = aLocalExtension('a', { extensionKind }, { location: URI.file(`pub.a`).with({ scheme: Schemas.vscodeRemote }) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localExtension]), createExtensionManagementService([remoteExtension]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposableStore.add(new TestExtensionEnablementService(instantiationService)));
        await instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([localExtension], 9 /* EnablementState.DisabledGlobally */);
        testObject = await aWorkbenchService();
        const actual = await testObject.queryLocal();
        assert.strictEqual(actual.length, 1);
        assert.strictEqual(actual[0].local, localExtension);
        assert.strictEqual(actual[0].enablementState, 9 /* EnablementState.DisabledGlobally */);
    });
    test('Test local ui, workspace extension is chosen if it exists in both servers and local is disabled in workspace', async () => {
        // multi server setup
        const extensionKind = ['ui', 'workspace'];
        const localExtension = aLocalExtension('a', { extensionKind }, { location: URI.file(`pub.a`) });
        const remoteExtension = aLocalExtension('a', { extensionKind }, { location: URI.file(`pub.a`).with({ scheme: Schemas.vscodeRemote }) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localExtension]), createExtensionManagementService([remoteExtension]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposableStore.add(new TestExtensionEnablementService(instantiationService)));
        await instantiationService
            .get(IWorkbenchExtensionEnablementService)
            .setEnablement([localExtension], 10 /* EnablementState.DisabledWorkspace */);
        testObject = await aWorkbenchService();
        const actual = await testObject.queryLocal();
        assert.strictEqual(actual.length, 1);
        assert.strictEqual(actual[0].local, localExtension);
        assert.strictEqual(actual[0].enablementState, 10 /* EnablementState.DisabledWorkspace */);
    });
    test('Test local web extension is chosen if it exists in both servers', async () => {
        // multi server setup
        const extensionKind = ['web'];
        const localExtension = aLocalExtension('a', { extensionKind }, { location: URI.file(`pub.a`) });
        const remoteExtension = aLocalExtension('a', { extensionKind }, { location: URI.file(`pub.a`).with({ scheme: Schemas.vscodeRemote }) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localExtension]), createExtensionManagementService([remoteExtension]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposableStore.add(new TestExtensionEnablementService(instantiationService)));
        testObject = await aWorkbenchService();
        const actual = await testObject.queryLocal();
        assert.strictEqual(actual.length, 1);
        assert.strictEqual(actual[0].local, localExtension);
    });
    test('Test remote web extension is chosen if it exists only in remote', async () => {
        // multi server setup
        const extensionKind = ['web'];
        const remoteExtension = aLocalExtension('a', { extensionKind }, { location: URI.file(`pub.a`).with({ scheme: Schemas.vscodeRemote }) });
        const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([]), createExtensionManagementService([remoteExtension]));
        instantiationService.stub(IExtensionManagementServerService, extensionManagementServerService);
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposableStore.add(new TestExtensionEnablementService(instantiationService)));
        testObject = await aWorkbenchService();
        const actual = await testObject.queryLocal();
        assert.strictEqual(actual.length, 1);
        assert.strictEqual(actual[0].local, remoteExtension);
    });
    test('Test disable autoupdate for extension when auto update is enabled for all', async () => {
        const extension1 = aLocalExtension('a');
        const extension2 = aLocalExtension('b');
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [
            extension1,
            extension2,
        ]);
        instantiationService.stub(IExtensionManagementService, 'updateMetadata', (local, metadata) => {
            local.pinned = !!metadata.pinned;
            return local;
        });
        testObject = await aWorkbenchService();
        assert.strictEqual(testObject.local[0].local?.pinned, undefined);
        assert.strictEqual(testObject.local[1].local?.pinned, undefined);
        await testObject.updateAutoUpdateEnablementFor(testObject.local[0], false);
        assert.strictEqual(testObject.local[0].local?.pinned, undefined);
        assert.strictEqual(testObject.local[1].local?.pinned, undefined);
        assert.deepStrictEqual(testObject.getEnabledAutoUpdateExtensions(), []);
        assert.deepStrictEqual(testObject.getDisabledAutoUpdateExtensions(), ['pub.a']);
    });
    test('Test disable autoupdate for extension when auto update is enabled for enabled extensions', async () => {
        stubConfiguration('onlyEnabledExtensions');
        const extension1 = aLocalExtension('a');
        const extension2 = aLocalExtension('b');
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [
            extension1,
            extension2,
        ]);
        instantiationService.stub(IExtensionManagementService, 'updateMetadata', (local, metadata) => {
            local.pinned = !!metadata.pinned;
            return local;
        });
        testObject = await aWorkbenchService();
        assert.strictEqual(testObject.local[0].local?.pinned, undefined);
        assert.strictEqual(testObject.local[1].local?.pinned, undefined);
        await testObject.updateAutoUpdateEnablementFor(testObject.local[0], false);
        assert.strictEqual(testObject.local[0].local?.pinned, undefined);
        assert.strictEqual(testObject.local[1].local?.pinned, undefined);
        assert.deepStrictEqual(testObject.getEnabledAutoUpdateExtensions(), []);
        assert.deepStrictEqual(testObject.getDisabledAutoUpdateExtensions(), ['pub.a']);
    });
    test('Test enable autoupdate for extension when auto update is enabled for all', async () => {
        const extension1 = aLocalExtension('a');
        const extension2 = aLocalExtension('b');
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [
            extension1,
            extension2,
        ]);
        instantiationService.stub(IExtensionManagementService, 'updateMetadata', (local, metadata) => {
            local.pinned = !!metadata.pinned;
            return local;
        });
        testObject = await aWorkbenchService();
        assert.strictEqual(testObject.local[0].local?.pinned, undefined);
        assert.strictEqual(testObject.local[1].local?.pinned, undefined);
        await testObject.updateAutoUpdateEnablementFor(testObject.local[0], false);
        await testObject.updateAutoUpdateEnablementFor(testObject.local[0], true);
        assert.strictEqual(testObject.local[0].local?.pinned, undefined);
        assert.strictEqual(testObject.local[1].local?.pinned, undefined);
        assert.deepStrictEqual(testObject.getEnabledAutoUpdateExtensions(), []);
        assert.deepStrictEqual(testObject.getDisabledAutoUpdateExtensions(), []);
    });
    test('Test enable autoupdate for pinned extension when auto update is enabled', async () => {
        const extension1 = aLocalExtension('a', undefined, { pinned: true });
        const extension2 = aLocalExtension('b');
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [
            extension1,
            extension2,
        ]);
        instantiationService.stub(IExtensionManagementService, 'updateMetadata', (local, metadata) => {
            local.pinned = !!metadata.pinned;
            return local;
        });
        testObject = await aWorkbenchService();
        assert.strictEqual(testObject.local[0].local?.pinned, true);
        assert.strictEqual(testObject.local[1].local?.pinned, undefined);
        await testObject.updateAutoUpdateEnablementFor(testObject.local[0], true);
        assert.strictEqual(testObject.local[0].local?.pinned, false);
        assert.strictEqual(testObject.local[1].local?.pinned, undefined);
        assert.deepStrictEqual(testObject.getEnabledAutoUpdateExtensions(), []);
        assert.deepStrictEqual(testObject.getDisabledAutoUpdateExtensions(), []);
    });
    test('Test updateAutoUpdateEnablementFor throws error when auto update is disabled', async () => {
        stubConfiguration(false);
        const extension1 = aLocalExtension('a');
        const extension2 = aLocalExtension('b');
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [
            extension1,
            extension2,
        ]);
        testObject = await aWorkbenchService();
        try {
            await testObject.updateAutoUpdateEnablementFor(testObject.local[0], true);
            assert.fail('error expected');
        }
        catch (error) {
            // expected
        }
    });
    test('Test updateAutoUpdateEnablementFor throws error for publisher when auto update is enabled', async () => {
        const extension1 = aLocalExtension('a');
        const extension2 = aLocalExtension('b');
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [
            extension1,
            extension2,
        ]);
        testObject = await aWorkbenchService();
        try {
            await testObject.updateAutoUpdateEnablementFor(testObject.local[0].publisher, true);
            assert.fail('error expected');
        }
        catch (error) {
            // expected
        }
    });
    test('Test enable autoupdate for extension when auto update is disabled', async () => {
        stubConfiguration(false);
        const extension1 = aLocalExtension('a', undefined, { pinned: true });
        const extension2 = aLocalExtension('b', undefined, { pinned: true });
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [
            extension1,
            extension2,
        ]);
        instantiationService.stub(IExtensionManagementService, 'updateMetadata', (local, metadata) => {
            local.pinned = !!metadata.pinned;
            return local;
        });
        testObject = await aWorkbenchService();
        assert.strictEqual(testObject.local[0].local?.pinned, true);
        assert.strictEqual(testObject.local[1].local?.pinned, true);
        await testObject.updateAutoUpdateEnablementFor(testObject.local[0], true);
        assert.strictEqual(testObject.local[0].local?.pinned, true);
        assert.strictEqual(testObject.local[1].local?.pinned, true);
        assert.deepStrictEqual(testObject.getEnabledAutoUpdateExtensions(), ['pub.a']);
        assert.deepStrictEqual(testObject.getDisabledAutoUpdateExtensions(), []);
    });
    test('Test reset autoupdate extensions state when auto update is disabled', async () => {
        instantiationService.stub(IDialogService, {
            confirm: () => Promise.resolve({ confirmed: true }),
        });
        const extension1 = aLocalExtension('a', undefined, { pinned: true });
        const extension2 = aLocalExtension('b', undefined, { pinned: true });
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [
            extension1,
            extension2,
        ]);
        instantiationService.stub(IExtensionManagementService, 'updateMetadata', (local, metadata) => {
            local.pinned = !!metadata.pinned;
            return local;
        });
        testObject = await aWorkbenchService();
        await testObject.updateAutoUpdateEnablementFor(testObject.local[0], false);
        assert.deepStrictEqual(testObject.getEnabledAutoUpdateExtensions(), []);
        assert.deepStrictEqual(testObject.getDisabledAutoUpdateExtensions(), ['pub.a']);
        await testObject.updateAutoUpdateForAllExtensions(false);
        assert.deepStrictEqual(testObject.getEnabledAutoUpdateExtensions(), []);
        assert.deepStrictEqual(testObject.getDisabledAutoUpdateExtensions(), []);
    });
    test('Test reset autoupdate extensions state when auto update is enabled', async () => {
        stubConfiguration(false);
        instantiationService.stub(IDialogService, {
            confirm: () => Promise.resolve({ confirmed: true }),
        });
        const extension1 = aLocalExtension('a', undefined, { pinned: true });
        const extension2 = aLocalExtension('b', undefined, { pinned: true });
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [
            extension1,
            extension2,
        ]);
        instantiationService.stub(IExtensionManagementService, 'updateMetadata', (local, metadata) => {
            local.pinned = !!metadata.pinned;
            return local;
        });
        testObject = await aWorkbenchService();
        await testObject.updateAutoUpdateEnablementFor(testObject.local[0], true);
        assert.deepStrictEqual(testObject.getEnabledAutoUpdateExtensions(), ['pub.a']);
        assert.deepStrictEqual(testObject.getDisabledAutoUpdateExtensions(), []);
        await testObject.updateAutoUpdateForAllExtensions(true);
        assert.deepStrictEqual(testObject.getEnabledAutoUpdateExtensions(), []);
        assert.deepStrictEqual(testObject.getDisabledAutoUpdateExtensions(), []);
    });
    async function aWorkbenchService() {
        const workbenchService = disposableStore.add(instantiationService.createInstance(ExtensionsWorkbenchService));
        await workbenchService.queryLocal();
        return workbenchService;
    }
    function stubConfiguration(autoUpdateValue, autoCheckUpdatesValue) {
        const values = {
            [AutoUpdateConfigurationKey]: autoUpdateValue ?? true,
            [AutoCheckUpdatesConfigurationKey]: autoCheckUpdatesValue ?? true,
        };
        const emitter = disposableStore.add(new Emitter());
        instantiationService.stub(IConfigurationService, {
            onDidChangeConfiguration: emitter.event,
            getValue: (key) => {
                return key ? values[key] : undefined;
            },
            updateValue: async (key, value) => {
                values[key] = value;
                emitter.fire({
                    affectedKeys: new Set([key]),
                    source: 2 /* ConfigurationTarget.USER */,
                    change: { keys: [], overrides: [] },
                    affectsConfiguration(configuration, overrides) {
                        return true;
                    },
                });
            },
            inspect: (key) => {
                return {};
            },
        });
    }
    function aLocalExtension(name = 'someext', manifest = {}, properties = {}) {
        manifest = { name, publisher: 'pub', version: '1.0.0', ...manifest };
        properties = {
            type: 1 /* ExtensionType.User */,
            location: URI.file(`pub.${name}`),
            identifier: { id: getGalleryExtensionId(manifest.publisher, manifest.name) },
            ...properties,
            isValid: properties.isValid ?? true,
        };
        return Object.create({ manifest, ...properties });
    }
    const noAssets = {
        changelog: null,
        download: null,
        icon: null,
        license: null,
        manifest: null,
        readme: null,
        repository: null,
        signature: null,
        coreTranslations: [],
    };
    function aGalleryExtension(name, properties = {}, galleryExtensionProperties = {}, assets = noAssets) {
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
    function aMultiExtensionManagementServerService(instantiationService, localExtensionManagementService, remoteExtensionManagementService) {
        const localExtensionManagementServer = {
            id: 'vscode-local',
            label: 'local',
            extensionManagementService: localExtensionManagementService || createExtensionManagementService(),
        };
        const remoteExtensionManagementServer = {
            id: 'vscode-remote',
            label: 'remote',
            extensionManagementService: remoteExtensionManagementService || createExtensionManagementService(),
        };
        return anExtensionManagementServerService(localExtensionManagementServer, remoteExtensionManagementServer, null);
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
            installFromGallery: (extension) => Promise.reject(new Error('not supported')),
            updateMetadata: async (local, metadata, profileLocation) => {
                local.identifier.uuid = metadata.id;
                local.publisherDisplayName = metadata.publisherDisplayName;
                local.publisherId = metadata.publisherId;
                return local;
            },
            getTargetPlatform: async () => getTargetPlatform(platform, arch),
            async getExtensionsControlManifest() {
                return {
                    malicious: [],
                    deprecated: {},
                    search: [],
                    publisherMapping: {},
                };
            },
            async resetPinnedStateForAllUserExtensions(pinned) { },
        };
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc1dvcmtiZW5jaFNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2V4dGVuc2lvbnMvdGVzdC9lbGVjdHJvbi1zYW5kYm94L2V4dGVuc2lvbnNXb3JrYmVuY2hTZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEtBQUssTUFBTSxPQUFPLENBQUE7QUFDOUIsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUNqRSxPQUFPLEVBRU4sZ0NBQWdDLEVBQ2hDLDBCQUEwQixHQUMxQixNQUFNLDRCQUE0QixDQUFBO0FBQ25DLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQ3hGLE9BQU8sRUFDTiwyQkFBMkIsRUFDM0Isd0JBQXdCLEVBT3hCLHFCQUFxQixFQUVyQixpQkFBaUIsR0FJakIsTUFBTSwyRUFBMkUsQ0FBQTtBQUNsRixPQUFPLEVBQ04sb0NBQW9DLEVBRXBDLGlDQUFpQyxFQUdqQyxvQ0FBb0MsR0FDcEMsTUFBTSx3RUFBd0UsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSxrRkFBa0YsQ0FBQTtBQUNuSSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQTtBQUNySCxPQUFPLEVBQ04sa0NBQWtDLEVBQ2xDLDhCQUE4QixHQUM5QixNQUFNLDBGQUEwRixDQUFBO0FBQ2pHLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLCtFQUErRSxDQUFBO0FBQ3ZILE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwr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