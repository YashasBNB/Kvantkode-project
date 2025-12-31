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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uUmVjb21tZW5kYXRpb25zU2VydmljZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZXh0ZW5zaW9ucy90ZXN0L2VsZWN0cm9uLXNhbmRib3gvZXh0ZW5zaW9uUmVjb21tZW5kYXRpb25zU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxLQUFLLE1BQU0sT0FBTyxDQUFBO0FBQzlCLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEtBQUssSUFBSSxNQUFNLG9DQUFvQyxDQUFBO0FBQzFELE9BQU8sRUFDTix3QkFBd0IsRUFHeEIsMkJBQTJCLEVBQzNCLHFCQUFxQixFQUNyQixpQkFBaUIsR0FDakIsTUFBTSwyRUFBMkUsQ0FBQTtBQUNsRixPQUFPLEVBQ04sb0NBQW9DLEVBQ3BDLG9DQUFvQyxHQUNwQyxNQUFNLHdFQUF3RSxDQUFBO0FBQy9FLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLCtFQUErRSxDQUFBO0FBQ3ZILE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxDQUFBO0FBQ3hILE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDcEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDekYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDakcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDaEcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDeEYsT0FBTyxFQUNOLGtCQUFrQixFQUNsQixrQkFBa0IsRUFDbEIsa0JBQWtCLEdBQ2xCLE1BQU0s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