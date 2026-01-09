/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as sinon from 'sinon';
import assert from 'assert';
import * as uuid from '../../../../../base/common/uuid.js';
import { IExtensionGalleryService, IExtensionManagementService, IExtensionTipsService, getTargetPlatform, } from '../../../../../platform/extensionManagement/common/extensionManagement.js';
import { IWorkbenchExtensionEnablementService, IWorkbenchExtensionManagementService, } from '../../../../services/extensionManagement/common/extensionManagement.js';
import { ExtensionGalleryService } from '../../../../../platform/extensionManagement/common/extensionGalleryService.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { Emitter, Event } from '../../../../../base/common/event.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { NullTelemetryService } from '../../../../../platform/telemetry/common/telemetryUtils.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { TestLifecycleService } from '../../../../test/browser/workbenchTestServices.js';
import { TestContextService, TestProductService, TestStorageService, } from '../../../../test/common/workbenchTestServices.js';
import { TestExtensionTipsService, TestSharedProcessService, } from '../../../../test/electron-sandbox/workbenchTestServices.js';
import { TestNotificationService } from '../../../../../platform/notification/test/common/testNotificationService.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { URI } from '../../../../../base/common/uri.js';
import { testWorkspace } from '../../../../../platform/workspace/test/common/testWorkspace.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { getGalleryExtensionId } from '../../../../../platform/extensionManagement/common/extensionManagementUtil.js';
import { IEnvironmentService } from '../../../../../platform/environment/common/environment.js';
import { ConfigurationKey, IExtensionsWorkbenchService } from '../../common/extensions.js';
import { TestExtensionEnablementService } from '../../../../services/extensionManagement/test/browser/extensionEnablementService.test.js';
import { IURLService } from '../../../../../platform/url/common/url.js';
import { IModelService } from '../../../../../editor/common/services/model.js';
import { ILifecycleService } from '../../../../services/lifecycle/common/lifecycle.js';
import { INotificationService, } from '../../../../../platform/notification/common/notification.js';
import { NativeURLService } from '../../../../../platform/url/common/urlService.js';
import { IStorageService, } from '../../../../../platform/storage/common/storage.js';
import { ISharedProcessService } from '../../../../../platform/ipc/electron-sandbox/services.js';
import { FileService } from '../../../../../platform/files/common/fileService.js';
import { NullLogService, ILogService } from '../../../../../platform/log/common/log.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { IProductService } from '../../../../../platform/product/common/productService.js';
import { ExtensionRecommendationsService } from '../../browser/extensionRecommendationsService.js';
import { NoOpWorkspaceTagsService } from '../../../tags/browser/workspaceTagsService.js';
import { IWorkspaceTagsService } from '../../../tags/common/workspaceTags.js';
import { ExtensionsWorkbenchService } from '../../browser/extensionsWorkbenchService.js';
import { IExtensionService } from '../../../../services/extensions/common/extensions.js';
import { IWorkspaceExtensionsConfigService, WorkspaceExtensionsConfigService, } from '../../../../services/extensionRecommendations/common/workspaceExtensionsConfig.js';
import { IExtensionIgnoredRecommendationsService } from '../../../../services/extensionRecommendations/common/extensionRecommendations.js';
import { ExtensionIgnoredRecommendationsService } from '../../../../services/extensionRecommendations/common/extensionIgnoredRecommendationsService.js';
import { IExtensionRecommendationNotificationService } from '../../../../../platform/extensionRecommendations/common/extensionRecommendations.js';
import { ExtensionRecommendationNotificationService } from '../../browser/extensionRecommendationNotificationService.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { MockContextKeyService } from '../../../../../platform/keybinding/test/common/mockKeybindingService.js';
import { InMemoryFileSystemProvider } from '../../../../../platform/files/common/inMemoryFilesystemProvider.js';
import { joinPath } from '../../../../../base/common/resources.js';
import { VSBuffer } from '../../../../../base/common/buffer.js';
import { platform } from '../../../../../base/common/platform.js';
import { arch } from '../../../../../base/common/process.js';
import { runWithFakedTimers } from '../../../../../base/test/common/timeTravelScheduler.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { timeout } from '../../../../../base/common/async.js';
import { IUpdateService, State } from '../../../../../platform/update/common/update.js';
import { IUriIdentityService } from '../../../../../platform/uriIdentity/common/uriIdentity.js';
import { UriIdentityService } from '../../../../../platform/uriIdentity/common/uriIdentityService.js';
const ROOT = URI.file('tests').with({ scheme: 'vscode-tests' });
const mockExtensionGallery = [
    aGalleryExtension('MockExtension1', {
        displayName: 'Mock Extension 1',
        version: '1.5',
        publisherId: 'mockPublisher1Id',
        publisher: 'mockPublisher1',
        publisherDisplayName: 'Mock Publisher 1',
        description: 'Mock Description',
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
    }),
    aGalleryExtension('MockExtension2', {
        displayName: 'Mock Extension 2',
        version: '1.5',
        publisherId: 'mockPublisher2Id',
        publisher: 'mockPublisher2',
        publisherDisplayName: 'Mock Publisher 2',
        description: 'Mock Description',
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
    }),
];
const mockExtensionLocal = [
    {
        type: 1 /* ExtensionType.User */,
        identifier: mockExtensionGallery[0].identifier,
        manifest: {
            name: mockExtensionGallery[0].name,
            publisher: mockExtensionGallery[0].publisher,
            version: mockExtensionGallery[0].version,
        },
        metadata: null,
        path: 'somepath',
        readmeUrl: 'some readmeUrl',
        changelogUrl: 'some changelogUrl',
    },
    {
        type: 1 /* ExtensionType.User */,
        identifier: mockExtensionGallery[1].identifier,
        manifest: {
            name: mockExtensionGallery[1].name,
            publisher: mockExtensionGallery[1].publisher,
            version: mockExtensionGallery[1].version,
        },
        metadata: null,
        path: 'somepath',
        readmeUrl: 'some readmeUrl',
        changelogUrl: 'some changelogUrl',
    },
];
const mockTestData = {
    recommendedExtensions: [
        'mockPublisher1.mockExtension1',
        'MOCKPUBLISHER2.mockextension2',
        'badlyformattedextension',
        'MOCKPUBLISHER2.mockextension2',
        'unknown.extension',
    ],
    validRecommendedExtensions: ['mockPublisher1.mockExtension1', 'MOCKPUBLISHER2.mockextension2'],
};
function aPage(...objects) {
    return {
        firstPage: objects,
        total: objects.length,
        pageSize: objects.length,
        getPage: () => null,
    };
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
        uuid: uuid.generateUuid(),
    };
    return galleryExtension;
}
suite('ExtensionRecommendationsService Test', () => {
    let disposableStore;
    let workspaceService;
    let instantiationService;
    let testConfigurationService;
    let testObject;
    let prompted;
    let promptedEmitter;
    let onModelAddedEvent;
    teardown(async () => {
        disposableStore.dispose();
        await timeout(0); // allow for async disposables to complete
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    setup(() => {
        disposableStore = new DisposableStore();
        instantiationService = disposableStore.add(new TestInstantiationService());
        promptedEmitter = disposableStore.add(new Emitter());
        instantiationService.stub(IExtensionGalleryService, ExtensionGalleryService);
        instantiationService.stub(ISharedProcessService, TestSharedProcessService);
        instantiationService.stub(ILifecycleService, disposableStore.add(new TestLifecycleService()));
        testConfigurationService = new TestConfigurationService();
        instantiationService.stub(IConfigurationService, testConfigurationService);
        instantiationService.stub(IProductService, TestProductService);
        instantiationService.stub(ILogService, NullLogService);
        const fileService = new FileService(instantiationService.get(ILogService));
        instantiationService.stub(IFileService, disposableStore.add(fileService));
        const fileSystemProvider = disposableStore.add(new InMemoryFileSystemProvider());
        disposableStore.add(fileService.registerProvider(ROOT.scheme, fileSystemProvider));
        instantiationService.stub(IUriIdentityService, disposableStore.add(new UriIdentityService(instantiationService.get(IFileService))));
        instantiationService.stub(INotificationService, new TestNotificationService());
        instantiationService.stub(IContextKeyService, new MockContextKeyService());
        instantiationService.stub(IWorkbenchExtensionManagementService, {
            onInstallExtension: Event.None,
            onDidInstallExtensions: Event.None,
            onUninstallExtension: Event.None,
            onDidUninstallExtension: Event.None,
            onDidUpdateExtensionMetadata: Event.None,
            onDidChangeProfile: Event.None,
            onProfileAwareDidInstallExtensions: Event.None,
            async getInstalled() {
                return [];
            },
            async canInstall() {
                return true;
            },
            async getExtensionsControlManifest() {
                return { malicious: [], deprecated: {}, search: [], publisherMapping: {} };
            },
            async getTargetPlatform() {
                return getTargetPlatform(platform, arch);
            },
        });
        instantiationService.stub(IExtensionService, {
            onDidChangeExtensions: Event.None,
            extensions: [],
            async whenInstalledExtensionsRegistered() {
                return true;
            },
        });
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposableStore.add(new TestExtensionEnablementService(instantiationService)));
        instantiationService.stub(ITelemetryService, NullTelemetryService);
        instantiationService.stub(IURLService, NativeURLService);
        instantiationService.stub(IWorkspaceTagsService, new NoOpWorkspaceTagsService());
        instantiationService.stub(IStorageService, disposableStore.add(new TestStorageService()));
        instantiationService.stub(ILogService, new NullLogService());
        instantiationService.stub(IProductService, {
            extensionRecommendations: {
                'ms-python.python': {
                    onFileOpen: [
                        {
                            pathGlob: '{**/*.py}',
                            important: true,
                        },
                    ],
                },
                'ms-vscode.PowerShell': {
                    onFileOpen: [
                        {
                            pathGlob: '{**/*.ps,**/*.ps1}',
                            important: true,
                        },
                    ],
                },
                'ms-dotnettools.csharp': {
                    onFileOpen: [
                        {
                            pathGlob: '{**/*.cs,**/project.json,**/global.json,**/*.csproj,**/*.sln,**/appsettings.json}',
                        },
                    ],
                },
                'msjsdiag.debugger-for-chrome': {
                    onFileOpen: [
                        {
                            pathGlob: '{**/*.ts,**/*.tsx,**/*.js,**/*.jsx,**/*.es6,**/*.mjs,**/*.cjs,**/.babelrc}',
                        },
                    ],
                },
                'lukehoban.Go': {
                    onFileOpen: [
                        {
                            pathGlob: '**/*.go',
                        },
                    ],
                },
            },
        });
        instantiationService.stub(IUpdateService, {
            onStateChange: Event.None,
            state: State.Uninitialized,
        });
        instantiationService.set(IExtensionsWorkbenchService, disposableStore.add(instantiationService.createInstance(ExtensionsWorkbenchService)));
        instantiationService.stub(IExtensionTipsService, disposableStore.add(instantiationService.createInstance(TestExtensionTipsService)));
        onModelAddedEvent = new Emitter();
        instantiationService.stub(IEnvironmentService, {});
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', []);
        instantiationService.stub(IExtensionGalleryService, 'isEnabled', true);
        instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage(...mockExtensionGallery));
        instantiationService.stubPromise(IExtensionGalleryService, 'getExtensions', mockExtensionGallery);
        prompted = false;
        class TestNotificationService2 extends TestNotificationService {
            prompt(severity, message, choices, options) {
                prompted = true;
                promptedEmitter.fire();
                return super.prompt(severity, message, choices, options);
            }
        }
        instantiationService.stub(INotificationService, new TestNotificationService2());
        testConfigurationService.setUserConfiguration(ConfigurationKey, {
            ignoreRecommendations: false,
        });
        instantiationService.stub(IModelService, {
            getModels() {
                return [];
            },
            onModelAdded: onModelAddedEvent.event,
        });
    });
    function setUpFolderWorkspace(folderName, recommendedExtensions, ignoredRecommendations = []) {
        return setUpFolder(folderName, recommendedExtensions, ignoredRecommendations);
    }
    async function setUpFolder(folderName, recommendedExtensions, ignoredRecommendations = []) {
        const fileService = instantiationService.get(IFileService);
        const folderDir = joinPath(ROOT, folderName);
        const workspaceSettingsDir = joinPath(folderDir, '.vscode');
        await fileService.createFolder(workspaceSettingsDir);
        const configPath = joinPath(workspaceSettingsDir, 'extensions.json');
        await fileService.writeFile(configPath, VSBuffer.fromString(JSON.stringify({
            recommendations: recommendedExtensions,
            unwantedRecommendations: ignoredRecommendations,
        }, null, '\t')));
        const myWorkspace = testWorkspace(folderDir);
        instantiationService.stub(IFileService, fileService);
        workspaceService = new TestContextService(myWorkspace);
        instantiationService.stub(IWorkspaceContextService, workspaceService);
        instantiationService.stub(IWorkspaceExtensionsConfigService, disposableStore.add(instantiationService.createInstance(WorkspaceExtensionsConfigService)));
        instantiationService.stub(IExtensionIgnoredRecommendationsService, disposableStore.add(instantiationService.createInstance(ExtensionIgnoredRecommendationsService)));
        instantiationService.stub(IExtensionRecommendationNotificationService, disposableStore.add(instantiationService.createInstance(ExtensionRecommendationNotificationService)));
    }
    function testNoPromptForValidRecommendations(recommendations) {
        return setUpFolderWorkspace('myFolder', recommendations).then(() => {
            testObject = disposableStore.add(instantiationService.createInstance(ExtensionRecommendationsService));
            return testObject.activationPromise.then(() => {
                assert.strictEqual(Object.keys(testObject.getAllRecommendationsWithReason()).length, recommendations.length);
                assert.ok(!prompted);
            });
        });
    }
    function testNoPromptOrRecommendationsForValidRecommendations(recommendations) {
        return setUpFolderWorkspace('myFolder', mockTestData.validRecommendedExtensions).then(() => {
            testObject = disposableStore.add(instantiationService.createInstance(ExtensionRecommendationsService));
            assert.ok(!prompted);
            return testObject.getWorkspaceRecommendations().then(() => {
                assert.strictEqual(Object.keys(testObject.getAllRecommendationsWithReason()).length, 0);
                assert.ok(!prompted);
            });
        });
    }
    test('ExtensionRecommendationsService: No Prompt for valid workspace recommendations when galleryService is absent', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const galleryQuerySpy = sinon.spy();
        instantiationService.stub(IExtensionGalleryService, {
            query: galleryQuerySpy,
            isEnabled: () => false,
        });
        return testNoPromptOrRecommendationsForValidRecommendations(mockTestData.validRecommendedExtensions).then(() => assert.ok(galleryQuerySpy.notCalled));
    }));
    test('ExtensionRecommendationsService: No Prompt for valid workspace recommendations during extension development', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        instantiationService.stub(IEnvironmentService, {
            extensionDevelopmentLocationURI: [URI.file('/folder/file')],
            isExtensionDevelopment: true,
        });
        return testNoPromptOrRecommendationsForValidRecommendations(mockTestData.validRecommendedExtensions);
    }));
    test('ExtensionRecommendationsService: No workspace recommendations or prompts when extensions.json has empty array', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        return testNoPromptForValidRecommendations([]);
    }));
    test('ExtensionRecommendationsService: Prompt for valid workspace recommendations', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await setUpFolderWorkspace('myFolder', mockTestData.recommendedExtensions);
        testObject = disposableStore.add(instantiationService.createInstance(ExtensionRecommendationsService));
        await Event.toPromise(promptedEmitter.event);
        const recommendations = Object.keys(testObject.getAllRecommendationsWithReason());
        const expected = [...mockTestData.validRecommendedExtensions, 'unknown.extension'];
        assert.strictEqual(recommendations.length, expected.length);
        expected.forEach((x) => {
            assert.strictEqual(recommendations.indexOf(x.toLowerCase()) > -1, true);
        });
    }));
    test('ExtensionRecommendationsService: No Prompt for valid workspace recommendations if they are already installed', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', mockExtensionLocal);
        return testNoPromptForValidRecommendations(mockTestData.validRecommendedExtensions);
    }));
    test('ExtensionRecommendationsService: No Prompt for valid workspace recommendations with casing mismatch if they are already installed', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', mockExtensionLocal);
        return testNoPromptForValidRecommendations(mockTestData.validRecommendedExtensions.map((x) => x.toUpperCase()));
    }));
    test('ExtensionRecommendationsService: No Prompt for valid workspace recommendations if ignoreRecommendations is set', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        testConfigurationService.setUserConfiguration(ConfigurationKey, {
            ignoreRecommendations: true,
        });
        return testNoPromptForValidRecommendations(mockTestData.validRecommendedExtensions);
    }));
    test('ExtensionRecommendationsService: No Prompt for valid workspace recommendations if showRecommendationsOnlyOnDemand is set', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        testConfigurationService.setUserConfiguration(ConfigurationKey, {
            showRecommendationsOnlyOnDemand: true,
        });
        return setUpFolderWorkspace('myFolder', mockTestData.validRecommendedExtensions).then(() => {
            testObject = disposableStore.add(instantiationService.createInstance(ExtensionRecommendationsService));
            return testObject.activationPromise.then(() => {
                assert.ok(!prompted);
            });
        });
    }));
    test('ExtensionRecommendationsService: No Prompt for valid workspace recommendations if ignoreRecommendations is set for current workspace', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        instantiationService
            .get(IStorageService)
            .store('extensionsAssistant/workspaceRecommendationsIgnore', true, 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        return testNoPromptForValidRecommendations(mockTestData.validRecommendedExtensions);
    }));
    test('ExtensionRecommendationsService: No Recommendations of globally ignored recommendations', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        instantiationService
            .get(IStorageService)
            .store('extensionsAssistant/workspaceRecommendationsIgnore', true, 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        instantiationService
            .get(IStorageService)
            .store('extensionsAssistant/recommendations', '["ms-dotnettools.csharp", "ms-python.python", "ms-vscode.vscode-typescript-tslint-plugin"]', 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        instantiationService
            .get(IStorageService)
            .store('extensionsAssistant/ignored_recommendations', '["ms-dotnettools.csharp", "mockpublisher2.mockextension2"]', 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        return setUpFolderWorkspace('myFolder', mockTestData.validRecommendedExtensions).then(() => {
            testObject = disposableStore.add(instantiationService.createInstance(ExtensionRecommendationsService));
            return testObject.activationPromise.then(() => {
                const recommendations = testObject.getAllRecommendationsWithReason();
                assert.ok(!recommendations['ms-dotnettools.csharp']); // stored recommendation that has been globally ignored
                assert.ok(recommendations['ms-python.python']); // stored recommendation
                assert.ok(recommendations['mockpublisher1.mockextension1']); // workspace recommendation
                assert.ok(!recommendations['mockpublisher2.mockextension2']); // workspace recommendation that has been globally ignored
            });
        });
    }));
    test('ExtensionRecommendationsService: No Recommendations of workspace ignored recommendations', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const ignoredRecommendations = ['ms-dotnettools.csharp', 'mockpublisher2.mockextension2']; // ignore a stored recommendation and a workspace recommendation.
        const storedRecommendations = '["ms-dotnettools.csharp", "ms-python.python"]';
        instantiationService
            .get(IStorageService)
            .store('extensionsAssistant/workspaceRecommendationsIgnore', true, 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        instantiationService
            .get(IStorageService)
            .store('extensionsAssistant/recommendations', storedRecommendations, 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        return setUpFolderWorkspace('myFolder', mockTestData.validRecommendedExtensions, ignoredRecommendations).then(() => {
            testObject = disposableStore.add(instantiationService.createInstance(ExtensionRecommendationsService));
            return testObject.activationPromise.then(() => {
                const recommendations = testObject.getAllRecommendationsWithReason();
                assert.ok(!recommendations['ms-dotnettools.csharp']); // stored recommendation that has been workspace ignored
                assert.ok(recommendations['ms-python.python']); // stored recommendation
                assert.ok(recommendations['mockpublisher1.mockextension1']); // workspace recommendation
                assert.ok(!recommendations['mockpublisher2.mockextension2']); // workspace recommendation that has been workspace ignored
            });
        });
    }));
    test('ExtensionRecommendationsService: Able to retrieve collection of all ignored recommendations', async () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const storageService = instantiationService.get(IStorageService);
        const workspaceIgnoredRecommendations = ['ms-dotnettools.csharp']; // ignore a stored recommendation and a workspace recommendation.
        const storedRecommendations = '["ms-dotnettools.csharp", "ms-python.python"]';
        const globallyIgnoredRecommendations = '["mockpublisher2.mockextension2"]'; // ignore a workspace recommendation.
        storageService.store('extensionsAssistant/workspaceRecommendationsIgnore', true, 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        storageService.store('extensionsAssistant/recommendations', storedRecommendations, 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        storageService.store('extensionsAssistant/ignored_recommendations', globallyIgnoredRecommendations, 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        await setUpFolderWorkspace('myFolder', mockTestData.validRecommendedExtensions, workspaceIgnoredRecommendations);
        testObject = disposableStore.add(instantiationService.createInstance(ExtensionRecommendationsService));
        await testObject.activationPromise;
        const recommendations = testObject.getAllRecommendationsWithReason();
        assert.deepStrictEqual(Object.keys(recommendations), [
            'ms-python.python',
            'mockpublisher1.mockextension1',
        ]);
    }));
    test('ExtensionRecommendationsService: Able to dynamically ignore/unignore global recommendations', async () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const storageService = instantiationService.get(IStorageService);
        const storedRecommendations = '["ms-dotnettools.csharp", "ms-python.python"]';
        const globallyIgnoredRecommendations = '["mockpublisher2.mockextension2"]'; // ignore a workspace recommendation.
        storageService.store('extensionsAssistant/workspaceRecommendationsIgnore', true, 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        storageService.store('extensionsAssistant/recommendations', storedRecommendations, 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        storageService.store('extensionsAssistant/ignored_recommendations', globallyIgnoredRecommendations, 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        await setUpFolderWorkspace('myFolder', mockTestData.validRecommendedExtensions);
        const extensionIgnoredRecommendationsService = instantiationService.get(IExtensionIgnoredRecommendationsService);
        testObject = disposableStore.add(instantiationService.createInstance(ExtensionRecommendationsService));
        await testObject.activationPromise;
        let recommendations = testObject.getAllRecommendationsWithReason();
        assert.ok(recommendations['ms-python.python']);
        assert.ok(recommendations['mockpublisher1.mockextension1']);
        assert.ok(!recommendations['mockpublisher2.mockextension2']);
        extensionIgnoredRecommendationsService.toggleGlobalIgnoredRecommendation('mockpublisher1.mockextension1', true);
        recommendations = testObject.getAllRecommendationsWithReason();
        assert.ok(recommendations['ms-python.python']);
        assert.ok(!recommendations['mockpublisher1.mockextension1']);
        assert.ok(!recommendations['mockpublisher2.mockextension2']);
        extensionIgnoredRecommendationsService.toggleGlobalIgnoredRecommendation('mockpublisher1.mockextension1', false);
        recommendations = testObject.getAllRecommendationsWithReason();
        assert.ok(recommendations['ms-python.python']);
        assert.ok(recommendations['mockpublisher1.mockextension1']);
        assert.ok(!recommendations['mockpublisher2.mockextension2']);
    }));
    test('test global extensions are modified and recommendation change event is fired when an extension is ignored', async () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const storageService = instantiationService.get(IStorageService);
        const changeHandlerTarget = sinon.spy();
        const ignoredExtensionId = 'Some.Extension';
        storageService.store('extensionsAssistant/workspaceRecommendationsIgnore', true, 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        storageService.store('extensionsAssistant/ignored_recommendations', '["ms-vscode.vscode"]', 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        await setUpFolderWorkspace('myFolder', []);
        testObject = disposableStore.add(instantiationService.createInstance(ExtensionRecommendationsService));
        const extensionIgnoredRecommendationsService = instantiationService.get(IExtensionIgnoredRecommendationsService);
        disposableStore.add(extensionIgnoredRecommendationsService.onDidChangeGlobalIgnoredRecommendation(changeHandlerTarget));
        extensionIgnoredRecommendationsService.toggleGlobalIgnoredRecommendation(ignoredExtensionId, true);
        await testObject.activationPromise;
        assert.ok(changeHandlerTarget.calledOnce);
        assert.ok(changeHandlerTarget
            .getCall(0)
            .calledWithMatch({ extensionId: ignoredExtensionId.toLowerCase(), isRecommended: false }));
    }));
    test('ExtensionRecommendationsService: Get file based recommendations from storage (old format)', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const storedRecommendations = '["ms-dotnettools.csharp", "ms-python.python", "ms-vscode.vscode-typescript-tslint-plugin"]';
        instantiationService
            .get(IStorageService)
            .store('extensionsAssistant/recommendations', storedRecommendations, 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        return setUpFolderWorkspace('myFolder', []).then(() => {
            testObject = disposableStore.add(instantiationService.createInstance(ExtensionRecommendationsService));
            return testObject.activationPromise.then(() => {
                const recommendations = testObject.getFileBasedRecommendations();
                assert.strictEqual(recommendations.length, 2);
                assert.ok(recommendations.some((extensionId) => extensionId === 'ms-dotnettools.csharp')); // stored recommendation that exists in product.extensionTips
                assert.ok(recommendations.some((extensionId) => extensionId === 'ms-python.python')); // stored recommendation that exists in product.extensionImportantTips
                assert.ok(recommendations.every((extensionId) => extensionId !== 'ms-vscode.vscode-typescript-tslint-plugin')); // stored recommendation that is no longer in neither product.extensionTips nor product.extensionImportantTips
            });
        });
    }));
    test('ExtensionRecommendationsService: Get file based recommendations from storage (new format)', async () => {
        const milliSecondsInADay = 1000 * 60 * 60 * 24;
        const now = Date.now();
        const tenDaysOld = 10 * milliSecondsInADay;
        const storedRecommendations = `{"ms-dotnettools.csharp": ${now}, "ms-python.python": ${now}, "ms-vscode.vscode-typescript-tslint-plugin": ${now}, "lukehoban.Go": ${tenDaysOld}}`;
        instantiationService
            .get(IStorageService)
            .store('extensionsAssistant/recommendations', storedRecommendations, 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        await setUpFolderWorkspace('myFolder', []);
        testObject = disposableStore.add(instantiationService.createInstance(ExtensionRecommendationsService));
        await testObject.activationPromise;
        const recommendations = testObject.getFileBasedRecommendations();
        assert.strictEqual(recommendations.length, 2);
        assert.ok(recommendations.some((extensionId) => extensionId === 'ms-dotnettools.csharp')); // stored recommendation that exists in product.extensionTips
        assert.ok(recommendations.some((extensionId) => extensionId === 'ms-python.python')); // stored recommendation that exists in product.extensionImportantTips
        assert.ok(recommendations.every((extensionId) => extensionId !== 'ms-vscode.vscode-typescript-tslint-plugin')); // stored recommendation that is no longer in neither product.extensionTips nor product.extensionImportantTips
        assert.ok(recommendations.every((extensionId) => extensionId !== 'lukehoban.Go')); //stored recommendation that is older than a week
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uUmVjb21tZW5kYXRpb25zU2VydmljZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9leHRlbnNpb25zL3Rlc3QvZWxlY3Ryb24tc2FuZGJveC9leHRlbnNpb25SZWNvbW1lbmRhdGlvbnNTZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEtBQUssTUFBTSxPQUFPLENBQUE7QUFDOUIsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sS0FBSyxJQUFJLE1BQU0sb0NBQW9DLENBQUE7QUFDMUQsT0FBTyxFQUNOLHdCQUF3QixFQUd4QiwyQkFBMkIsRUFDM0IscUJBQXFCLEVBQ3JCLGlCQUFpQixHQUNqQixNQUFNLDJFQUEyRSxDQUFBO0FBQ2xGLE9BQU8sRUFDTixvQ0FBb0MsRUFDcEMsb0NBQW9DLEdBQ3BDLE1BQU0sd0VBQXdFLENBQUE7QUFDL0UsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sK0VBQStFLENBQUE7QUFDdkgsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUE7QUFDeEgsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUN6RixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNqRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUNoRyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUN4RixPQUFPLEVBQ04sa0JBQWtCLEVBQ2xCLGtCQUFrQixF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