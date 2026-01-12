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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc1dvcmtiZW5jaFNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZXh0ZW5zaW9ucy90ZXN0L2VsZWN0cm9uLXNhbmRib3gvZXh0ZW5zaW9uc1dvcmtiZW5jaFNlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssS0FBSyxNQUFNLE9BQU8sQ0FBQTtBQUM5QixPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ2pFLE9BQU8sRUFFTixnQ0FBZ0MsRUFDaEMsMEJBQTBCLEdBQzFCLE1BQU0sNEJBQTRCLENBQUE7QUFDbkMsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDeEYsT0FBTyxFQUNOLDJCQUEyQixFQUMzQix3QkFBd0IsRUFPeEIscUJBQXFCLEVBRXJCLGlCQUFpQixHQUlqQixNQUFNLDJFQUEyRSxDQUFBO0FBQ2xGLE9BQU8sRUFDTixvQ0FBb0MsRUFFcEMsaUNBQWlDLEVBR2pDLG9DQUFvQyxHQUNwQyxNQUFNLHdFQUF3RSxDQUFBO0FBQy9FLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLGtGQUFrRixDQUFBO0FBQ25JLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtFQUErRSxDQUFBO0FBQ3JILE9BQU8sRUFDTixrQ0FBa0MsRUFDbEMsOEJBQThCLEdBQzlCLE1BQU0sMEZBQTBGLENBQUE7QUFDakcsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sK0VBQStFLENBQUE7QUFDdkgsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxN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