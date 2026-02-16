/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { generateUuid } from '../../../../../base/common/uuid.js';
import { ExtensionsListView } from '../../browser/extensionsViews.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { IExtensionsWorkbenchService } from '../../common/extensions.js';
import { ExtensionsWorkbenchService } from '../../browser/extensionsWorkbenchService.js';
import { IExtensionManagementService, IExtensionGalleryService, getTargetPlatform, } from '../../../../../platform/extensionManagement/common/extensionManagement.js';
import { IWorkbenchExtensionEnablementService, IExtensionManagementServerService, IWorkbenchExtensionManagementService, } from '../../../../services/extensionManagement/common/extensionManagement.js';
import { IExtensionRecommendationsService, } from '../../../../services/extensionRecommendations/common/extensionRecommendations.js';
import { getGalleryExtensionId } from '../../../../../platform/extensionManagement/common/extensionManagementUtil.js';
import { TestExtensionEnablementService } from '../../../../services/extensionManagement/test/browser/extensionEnablementService.test.js';
import { ExtensionGalleryService } from '../../../../../platform/extensionManagement/common/extensionGalleryService.js';
import { IURLService } from '../../../../../platform/url/common/url.js';
import { Event } from '../../../../../base/common/event.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { NullTelemetryService } from '../../../../../platform/telemetry/common/telemetryUtils.js';
import { IExtensionService, toExtensionDescription, } from '../../../../services/extensions/common/extensions.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { TestMenuService } from '../../../../test/browser/workbenchTestServices.js';
import { TestSharedProcessService } from '../../../../test/electron-sandbox/workbenchTestServices.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { ILogService, NullLogService } from '../../../../../platform/log/common/log.js';
import { NativeURLService } from '../../../../../platform/url/common/urlService.js';
import { URI } from '../../../../../base/common/uri.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { IRemoteAgentService } from '../../../../services/remote/common/remoteAgentService.js';
import { RemoteAgentService } from '../../../../services/remote/electron-sandbox/remoteAgentService.js';
import { ISharedProcessService } from '../../../../../platform/ipc/electron-sandbox/services.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { MockContextKeyService } from '../../../../../platform/keybinding/test/common/mockKeybindingService.js';
import { IMenuService } from '../../../../../platform/actions/common/actions.js';
import { TestContextService } from '../../../../test/common/workbenchTestServices.js';
import { IViewDescriptorService } from '../../../../common/views.js';
import { Schemas } from '../../../../../base/common/network.js';
import { platform } from '../../../../../base/common/platform.js';
import { arch } from '../../../../../base/common/process.js';
import { IProductService } from '../../../../../platform/product/common/productService.js';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { IUpdateService, State } from '../../../../../platform/update/common/update.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { FileService } from '../../../../../platform/files/common/fileService.js';
import { IUserDataProfileService } from '../../../../services/userDataProfile/common/userDataProfile.js';
import { UserDataProfileService } from '../../../../services/userDataProfile/common/userDataProfileService.js';
import { toUserDataProfile } from '../../../../../platform/userDataProfile/common/userDataProfile.js';
suite('ExtensionsViews Tests', () => {
    const disposableStore = ensureNoDisposablesAreLeakedInTestSuite();
    let instantiationService;
    let testableView;
    const localEnabledTheme = aLocalExtension('first-enabled-extension', { categories: ['Themes', 'random'] }, { installedTimestamp: 123456 });
    const localEnabledLanguage = aLocalExtension('second-enabled-extension', { categories: ['Programming languages'], version: '1.0.0' }, { installedTimestamp: Date.now(), updated: false });
    const localDisabledTheme = aLocalExtension('first-disabled-extension', { categories: ['themes'] }, { installedTimestamp: 234567 });
    const localDisabledLanguage = aLocalExtension('second-disabled-extension', { categories: ['programming languages'] }, { installedTimestamp: Date.now() - 50000, updated: true });
    const localRandom = aLocalExtension('random-enabled-extension', { categories: ['random'] }, { installedTimestamp: 345678 });
    const builtInTheme = aLocalExtension('my-theme', { categories: ['Themes'], contributes: { themes: ['my-theme'] } }, { type: 0 /* ExtensionType.System */, installedTimestamp: 222 });
    const builtInBasic = aLocalExtension('my-lang', {
        categories: ['Programming Languages'],
        contributes: { grammars: [{ language: 'my-language' }] },
    }, { type: 0 /* ExtensionType.System */, installedTimestamp: 666666 });
    let queryPage = aPage([]);
    const galleryExtensions = [];
    const workspaceRecommendationA = aGalleryExtension('workspace-recommendation-A');
    const workspaceRecommendationB = aGalleryExtension('workspace-recommendation-B');
    const configBasedRecommendationA = aGalleryExtension('configbased-recommendation-A');
    const configBasedRecommendationB = aGalleryExtension('configbased-recommendation-B');
    const fileBasedRecommendationA = aGalleryExtension('filebased-recommendation-A');
    const fileBasedRecommendationB = aGalleryExtension('filebased-recommendation-B');
    const otherRecommendationA = aGalleryExtension('other-recommendation-A');
    setup(async () => {
        instantiationService = disposableStore.add(new TestInstantiationService());
        instantiationService.stub(ITelemetryService, NullTelemetryService);
        instantiationService.stub(ILogService, NullLogService);
        instantiationService.stub(IFileService, disposableStore.add(new FileService(new NullLogService())));
        instantiationService.stub(IProductService, {});
        instantiationService.stub(IWorkspaceContextService, new TestContextService());
        instantiationService.stub(IConfigurationService, new TestConfigurationService());
        instantiationService.stub(IExtensionGalleryService, ExtensionGalleryService);
        instantiationService.stub(ISharedProcessService, TestSharedProcessService);
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
            async getInstalledWorkspaceExtensions() {
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
            async updateMetadata(local) {
                return local;
            },
        });
        instantiationService.stub(IRemoteAgentService, RemoteAgentService);
        instantiationService.stub(IContextKeyService, new MockContextKeyService());
        instantiationService.stub(IMenuService, new TestMenuService());
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
        instantiationService.stub(IWorkbenchExtensionEnablementService, disposableStore.add(new TestExtensionEnablementService(instantiationService)));
        instantiationService.stub(IUserDataProfileService, disposableStore.add(new UserDataProfileService(toUserDataProfile('test', 'test', URI.file('foo'), URI.file('cache')))));
        const reasons = {};
        reasons[workspaceRecommendationA.identifier.id] = {
            reasonId: 0 /* ExtensionRecommendationReason.Workspace */,
        };
        reasons[workspaceRecommendationB.identifier.id] = {
            reasonId: 0 /* ExtensionRecommendationReason.Workspace */,
        };
        reasons[fileBasedRecommendationA.identifier.id] = {
            reasonId: 1 /* ExtensionRecommendationReason.File */,
        };
        reasons[fileBasedRecommendationB.identifier.id] = {
            reasonId: 1 /* ExtensionRecommendationReason.File */,
        };
        reasons[otherRecommendationA.identifier.id] = {
            reasonId: 2 /* ExtensionRecommendationReason.Executable */,
        };
        reasons[configBasedRecommendationA.identifier.id] = {
            reasonId: 3 /* ExtensionRecommendationReason.WorkspaceConfig */,
        };
        instantiationService.stub(IExtensionRecommendationsService, {
            getWorkspaceRecommendations() {
                return Promise.resolve([
                    workspaceRecommendationA.identifier.id,
                    workspaceRecommendationB.identifier.id,
                ]);
            },
            getConfigBasedRecommendations() {
                return Promise.resolve({
                    important: [configBasedRecommendationA.identifier.id],
                    others: [configBasedRecommendationB.identifier.id],
                });
            },
            getImportantRecommendations() {
                return Promise.resolve([]);
            },
            getFileBasedRecommendations() {
                return [fileBasedRecommendationA.identifier.id, fileBasedRecommendationB.identifier.id];
            },
            getOtherRecommendations() {
                return Promise.resolve([
                    configBasedRecommendationB.identifier.id,
                    otherRecommendationA.identifier.id,
                ]);
            },
            getAllRecommendationsWithReason() {
                return reasons;
            },
        });
        instantiationService.stub(IURLService, NativeURLService);
        instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', [
            localEnabledTheme,
            localEnabledLanguage,
            localRandom,
            localDisabledTheme,
            localDisabledLanguage,
            builtInTheme,
            builtInBasic,
        ]);
        instantiationService.stubPromise(IExtensionManagementService, 'getExtensgetExtensionsControlManifestionsReport', {});
        instantiationService.stub(IExtensionGalleryService, {
            query: async () => {
                return queryPage;
            },
            getCompatibleExtension: async (gallery) => {
                return gallery;
            },
            getExtensions: async (infos) => {
                const result = [];
                for (const info of infos) {
                    const extension = galleryExtensions.find((e) => e.identifier.id === info.id);
                    if (extension) {
                        result.push(extension);
                    }
                }
                return result;
            },
            isEnabled: () => true,
            isExtensionCompatible: async () => true,
        });
        instantiationService.stub(IViewDescriptorService, {
            getViewLocationById() {
                return 0 /* ViewContainerLocation.Sidebar */;
            },
            onDidChangeLocation: Event.None,
        });
        instantiationService.stub(IExtensionService, {
            onDidChangeExtensions: Event.None,
            extensions: [
                toExtensionDescription(localEnabledTheme),
                toExtensionDescription(localEnabledLanguage),
                toExtensionDescription(localRandom),
                toExtensionDescription(builtInTheme),
                toExtensionDescription(builtInBasic),
            ],
            canAddExtension: (extension) => true,
            whenInstalledExtensionsRegistered: () => Promise.resolve(true),
        });
        await (instantiationService.get(IWorkbenchExtensionEnablementService)).setEnablement([localDisabledTheme], 9 /* EnablementState.DisabledGlobally */);
        await (instantiationService.get(IWorkbenchExtensionEnablementService)).setEnablement([localDisabledLanguage], 9 /* EnablementState.DisabledGlobally */);
        instantiationService.stub(IUpdateService, {
            onStateChange: Event.None,
            state: State.Uninitialized,
        });
        instantiationService.set(IExtensionsWorkbenchService, disposableStore.add(instantiationService.createInstance(ExtensionsWorkbenchService)));
        testableView = disposableStore.add(instantiationService.createInstance(ExtensionsListView, {}, { id: '', title: '' }));
        queryPage = aPage([]);
        galleryExtensions.splice(0, galleryExtensions.length, ...[
            workspaceRecommendationA,
            workspaceRecommendationB,
            configBasedRecommendationA,
            configBasedRecommendationB,
            fileBasedRecommendationA,
            fileBasedRecommendationB,
            otherRecommendationA,
        ]);
    });
    test('Test query types', () => {
        assert.strictEqual(ExtensionsListView.isBuiltInExtensionsQuery('@builtin'), true);
        assert.strictEqual(ExtensionsListView.isLocalExtensionsQuery('@installed'), true);
        assert.strictEqual(ExtensionsListView.isLocalExtensionsQuery('@enabled'), true);
        assert.strictEqual(ExtensionsListView.isLocalExtensionsQuery('@disabled'), true);
        assert.strictEqual(ExtensionsListView.isLocalExtensionsQuery('@outdated'), true);
        assert.strictEqual(ExtensionsListView.isLocalExtensionsQuery('@updates'), true);
        assert.strictEqual(ExtensionsListView.isLocalExtensionsQuery('@sort:name'), true);
        assert.strictEqual(ExtensionsListView.isLocalExtensionsQuery('@sort:updateDate'), true);
        assert.strictEqual(ExtensionsListView.isLocalExtensionsQuery('@installed searchText'), true);
        assert.strictEqual(ExtensionsListView.isLocalExtensionsQuery('@enabled searchText'), true);
        assert.strictEqual(ExtensionsListView.isLocalExtensionsQuery('@disabled searchText'), true);
        assert.strictEqual(ExtensionsListView.isLocalExtensionsQuery('@outdated searchText'), true);
        assert.strictEqual(ExtensionsListView.isLocalExtensionsQuery('@updates searchText'), true);
    });
    test('Test empty query equates to sort by install count', async () => {
        const target = (instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage()));
        await testableView.show('');
        assert.ok(target.calledOnce);
        const options = target.args[0][0];
        assert.strictEqual(options.sortBy, "InstallCount" /* SortBy.InstallCount */);
    });
    test('Test non empty query without sort doesnt use sortBy', async () => {
        const target = (instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage()));
        await testableView.show('some extension');
        assert.ok(target.calledOnce);
        const options = target.args[0][0];
        assert.strictEqual(options.sortBy, undefined);
    });
    test('Test query with sort uses sortBy', async () => {
        const target = (instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage()));
        await testableView.show('some extension @sort:rating');
        assert.ok(target.calledOnce);
        const options = target.args[0][0];
        assert.strictEqual(options.sortBy, "WeightedRating" /* SortBy.WeightedRating */);
    });
    test('Test default view actions required sorting', async () => {
        queryPage = aPage([
            aGalleryExtension(localEnabledLanguage.manifest.name, {
                ...localEnabledLanguage.manifest,
                version: '1.0.1',
                identifier: localDisabledLanguage.identifier,
            }),
        ]);
        const workbenchService = instantiationService.get(IExtensionsWorkbenchService);
        const extension = (await workbenchService.queryLocal()).find((ex) => ex.identifier.id === localEnabledLanguage.identifier.id);
        await new Promise((c) => {
            const disposable = workbenchService.onChange(() => {
                if (extension?.outdated) {
                    disposable.dispose();
                    c();
                }
            });
            instantiationService.get(IExtensionsWorkbenchService).queryGallery(CancellationToken.None);
        });
        const result = await testableView.show('@installed');
        assert.strictEqual(result.length, 5, 'Unexpected number of results for @installed query');
        const actual = [
            result.get(0).name,
            result.get(1).name,
            result.get(2).name,
            result.get(3).name,
            result.get(4).name,
        ];
        const expected = [
            localEnabledLanguage.manifest.name,
            localEnabledTheme.manifest.name,
            localRandom.manifest.name,
            localDisabledTheme.manifest.name,
            localDisabledLanguage.manifest.name,
        ];
        for (let i = 0; i < result.length; i++) {
            assert.strictEqual(actual[i], expected[i], 'Unexpected extension for @installed query with outadted extension.');
        }
    });
    test('Test installed query results', async () => {
        await testableView.show('@installed').then((result) => {
            assert.strictEqual(result.length, 5, 'Unexpected number of results for @installed query');
            const actual = [
                result.get(0).name,
                result.get(1).name,
                result.get(2).name,
                result.get(3).name,
                result.get(4).name,
            ].sort();
            const expected = [
                localDisabledTheme.manifest.name,
                localEnabledTheme.manifest.name,
                localRandom.manifest.name,
                localDisabledLanguage.manifest.name,
                localEnabledLanguage.manifest.name,
            ];
            for (let i = 0; i < result.length; i++) {
                assert.strictEqual(actual[i], expected[i], 'Unexpected extension for @installed query.');
            }
        });
        await testableView.show('@installed first').then((result) => {
            assert.strictEqual(result.length, 2, 'Unexpected number of results for @installed query');
            assert.strictEqual(result.get(0).name, localEnabledTheme.manifest.name, 'Unexpected extension for @installed query with search text.');
            assert.strictEqual(result.get(1).name, localDisabledTheme.manifest.name, 'Unexpected extension for @installed query with search text.');
        });
        await testableView.show('@disabled').then((result) => {
            assert.strictEqual(result.length, 2, 'Unexpected number of results for @disabled query');
            assert.strictEqual(result.get(0).name, localDisabledTheme.manifest.name, 'Unexpected extension for @disabled query.');
            assert.strictEqual(result.get(1).name, localDisabledLanguage.manifest.name, 'Unexpected extension for @disabled query.');
        });
        await testableView.show('@enabled').then((result) => {
            assert.strictEqual(result.length, 3, 'Unexpected number of results for @enabled query');
            assert.strictEqual(result.get(0).name, localEnabledTheme.manifest.name, 'Unexpected extension for @enabled query.');
            assert.strictEqual(result.get(1).name, localRandom.manifest.name, 'Unexpected extension for @enabled query.');
            assert.strictEqual(result.get(2).name, localEnabledLanguage.manifest.name, 'Unexpected extension for @enabled query.');
        });
        await testableView.show('@builtin category:themes').then((result) => {
            assert.strictEqual(result.length, 1, 'Unexpected number of results for @builtin category:themes query');
            assert.strictEqual(result.get(0).name, builtInTheme.manifest.name, 'Unexpected extension for @builtin:themes query.');
        });
        await testableView.show('@builtin category:"programming languages"').then((result) => {
            assert.strictEqual(result.length, 1, 'Unexpected number of results for @builtin:basics query');
            assert.strictEqual(result.get(0).name, builtInBasic.manifest.name, 'Unexpected extension for @builtin:basics query.');
        });
        await testableView.show('@builtin').then((result) => {
            assert.strictEqual(result.length, 2, 'Unexpected number of results for @builtin query');
            assert.strictEqual(result.get(0).name, builtInBasic.manifest.name, 'Unexpected extension for @builtin query.');
            assert.strictEqual(result.get(1).name, builtInTheme.manifest.name, 'Unexpected extension for @builtin query.');
        });
        await testableView.show('@builtin my-theme').then((result) => {
            assert.strictEqual(result.length, 1, 'Unexpected number of results for @builtin query');
            assert.strictEqual(result.get(0).name, builtInTheme.manifest.name, 'Unexpected extension for @builtin query.');
        });
    });
    test('Test installed query with category', async () => {
        await testableView.show('@installed category:themes').then((result) => {
            assert.strictEqual(result.length, 2, 'Unexpected number of results for @installed query with category');
            assert.strictEqual(result.get(0).name, localEnabledTheme.manifest.name, 'Unexpected extension for @installed query with category.');
            assert.strictEqual(result.get(1).name, localDisabledTheme.manifest.name, 'Unexpected extension for @installed query with category.');
        });
        await testableView.show('@installed category:"themes"').then((result) => {
            assert.strictEqual(result.length, 2, 'Unexpected number of results for @installed query with quoted category');
            assert.strictEqual(result.get(0).name, localEnabledTheme.manifest.name, 'Unexpected extension for @installed query with quoted category.');
            assert.strictEqual(result.get(1).name, localDisabledTheme.manifest.name, 'Unexpected extension for @installed query with quoted category.');
        });
        await testableView.show('@installed category:"programming languages"').then((result) => {
            assert.strictEqual(result.length, 2, 'Unexpected number of results for @installed query with quoted category including space');
            assert.strictEqual(result.get(0).name, localEnabledLanguage.manifest.name, 'Unexpected extension for @installed query with quoted category including space.');
            assert.strictEqual(result.get(1).name, localDisabledLanguage.manifest.name, 'Unexpected extension for @installed query with quoted category inlcuding space.');
        });
        await testableView.show('@installed category:themes category:random').then((result) => {
            assert.strictEqual(result.length, 3, 'Unexpected number of results for @installed query with multiple category');
            assert.strictEqual(result.get(0).name, localEnabledTheme.manifest.name, 'Unexpected extension for @installed query with multiple category.');
            assert.strictEqual(result.get(1).name, localRandom.manifest.name, 'Unexpected extension for @installed query with multiple category.');
            assert.strictEqual(result.get(2).name, localDisabledTheme.manifest.name, 'Unexpected extension for @installed query with multiple category.');
        });
        await testableView.show('@enabled category:themes').then((result) => {
            assert.strictEqual(result.length, 1, 'Unexpected number of results for @enabled query with category');
            assert.strictEqual(result.get(0).name, localEnabledTheme.manifest.name, 'Unexpected extension for @enabled query with category.');
        });
        await testableView.show('@enabled category:"themes"').then((result) => {
            assert.strictEqual(result.length, 1, 'Unexpected number of results for @enabled query with quoted category');
            assert.strictEqual(result.get(0).name, localEnabledTheme.manifest.name, 'Unexpected extension for @enabled query with quoted category.');
        });
        await testableView.show('@enabled category:"programming languages"').then((result) => {
            assert.strictEqual(result.length, 1, 'Unexpected number of results for @enabled query with quoted category inlcuding space');
            assert.strictEqual(result.get(0).name, localEnabledLanguage.manifest.name, 'Unexpected extension for @enabled query with quoted category including space.');
        });
        await testableView.show('@disabled category:themes').then((result) => {
            assert.strictEqual(result.length, 1, 'Unexpected number of results for @disabled query with category');
            assert.strictEqual(result.get(0).name, localDisabledTheme.manifest.name, 'Unexpected extension for @disabled query with category.');
        });
        await testableView.show('@disabled category:"themes"').then((result) => {
            assert.strictEqual(result.length, 1, 'Unexpected number of results for @disabled query with quoted category');
            assert.strictEqual(result.get(0).name, localDisabledTheme.manifest.name, 'Unexpected extension for @disabled query with quoted category.');
        });
        await testableView.show('@disabled category:"programming languages"').then((result) => {
            assert.strictEqual(result.length, 1, 'Unexpected number of results for @disabled query with quoted category inlcuding space');
            assert.strictEqual(result.get(0).name, localDisabledLanguage.manifest.name, 'Unexpected extension for @disabled query with quoted category including space.');
        });
    });
    test('Test local query with sorting order', async () => {
        await testableView.show('@recentlyUpdated').then((result) => {
            assert.strictEqual(result.length, 1, 'Unexpected number of results for @recentlyUpdated');
            assert.strictEqual(result.get(0).name, localDisabledLanguage.manifest.name, 'Unexpected default sort order of extensions for @recentlyUpdate query');
        });
        await testableView.show('@installed @sort:updateDate').then((result) => {
            assert.strictEqual(result.length, 5, 'Unexpected number of results for @sort:updateDate. Expected all localy installed Extension which are not builtin');
            const actual = [
                result.get(0).local?.installedTimestamp,
                result.get(1).local?.installedTimestamp,
                result.get(2).local?.installedTimestamp,
                result.get(3).local?.installedTimestamp,
                result.get(4).local?.installedTimestamp,
            ];
            const expected = [
                localEnabledLanguage.installedTimestamp,
                localDisabledLanguage.installedTimestamp,
                localRandom.installedTimestamp,
                localDisabledTheme.installedTimestamp,
                localEnabledTheme.installedTimestamp,
            ];
            for (let i = 0; i < result.length; i++) {
                assert.strictEqual(actual[i], expected[i], 'Unexpected extension sorting for @sort:updateDate query.');
            }
        });
    });
    test('Test @recommended:workspace query', () => {
        const workspaceRecommendedExtensions = [
            workspaceRecommendationA,
            workspaceRecommendationB,
            configBasedRecommendationA,
        ];
        return testableView.show('@recommended:workspace').then((result) => {
            assert.strictEqual(result.length, workspaceRecommendedExtensions.length);
            for (let i = 0; i < workspaceRecommendedExtensions.length; i++) {
                assert.strictEqual(result.get(i).identifier.id, workspaceRecommendedExtensions[i].identifier.id);
            }
        });
    });
    test('Test @recommended query', async () => {
        const allRecommendedExtensions = [
            fileBasedRecommendationA,
            fileBasedRecommendationB,
            configBasedRecommendationB,
            otherRecommendationA,
        ];
        const result = await testableView.show('@recommended');
        assert.strictEqual(result.length, allRecommendedExtensions.length);
        for (let i = 0; i < allRecommendedExtensions.length; i++) {
            assert.strictEqual(result.get(i).identifier.id, allRecommendedExtensions[i].identifier.id);
        }
    });
    test('Test @recommended:all query', async () => {
        const allRecommendedExtensions = [
            workspaceRecommendationA,
            workspaceRecommendationB,
            configBasedRecommendationA,
            fileBasedRecommendationA,
            fileBasedRecommendationB,
            configBasedRecommendationB,
            otherRecommendationA,
        ];
        const result = await testableView.show('@recommended:all');
        assert.strictEqual(result.length, allRecommendedExtensions.length);
        for (let i = 0; i < allRecommendedExtensions.length; i++) {
            assert.strictEqual(result.get(i).identifier.id, allRecommendedExtensions[i].identifier.id);
        }
    });
    test('Test search', async () => {
        const results = [
            fileBasedRecommendationA,
            workspaceRecommendationA,
            otherRecommendationA,
            workspaceRecommendationB,
        ];
        queryPage = aPage(results);
        const result = await testableView.show('search-me');
        assert.strictEqual(result.length, results.length);
        for (let i = 0; i < results.length; i++) {
            assert.strictEqual(result.get(i).identifier.id, results[i].identifier.id);
        }
    });
    test('Test preferred search experiment', async () => {
        queryPage = aPage([
            fileBasedRecommendationA,
            workspaceRecommendationA,
            otherRecommendationA,
            workspaceRecommendationB,
        ], 5);
        const notInFirstPage = aGalleryExtension('not-in-first-page');
        galleryExtensions.push(notInFirstPage);
        const expected = [
            workspaceRecommendationA,
            notInFirstPage,
            workspaceRecommendationB,
            fileBasedRecommendationA,
            otherRecommendationA,
        ];
        instantiationService.stubPromise(IWorkbenchExtensionManagementService, 'getExtensionsControlManifest', {
            malicious: [],
            deprecated: {},
            search: [
                {
                    query: 'search-me',
                    preferredResults: [
                        workspaceRecommendationA.identifier.id,
                        notInFirstPage.identifier.id,
                        workspaceRecommendationB.identifier.id,
                    ],
                },
            ],
        });
        const testObject = disposableStore.add(instantiationService.createInstance(ExtensionsListView, {}, { id: '', title: '' }));
        const result = await testObject.show('search-me');
        assert.strictEqual(result.length, expected.length);
        for (let i = 0; i < expected.length; i++) {
            assert.strictEqual(result.get(i).identifier.id, expected[i].identifier.id);
        }
    });
    test('Skip preferred search experiment when user defines sort order', async () => {
        const realResults = [
            fileBasedRecommendationA,
            workspaceRecommendationA,
            otherRecommendationA,
            workspaceRecommendationB,
        ];
        queryPage = aPage(realResults);
        const result = await testableView.show('search-me @sort:installs');
        assert.strictEqual(result.length, realResults.length);
        for (let i = 0; i < realResults.length; i++) {
            assert.strictEqual(result.get(i).identifier.id, realResults[i].identifier.id);
        }
    });
    function aLocalExtension(name = 'someext', manifest = {}, properties = {}) {
        manifest = { name, publisher: 'pub', version: '1.0.0', ...manifest };
        properties = {
            type: 1 /* ExtensionType.User */,
            location: URI.file(`pub.${name}`),
            identifier: { id: getGalleryExtensionId(manifest.publisher, manifest.name) },
            metadata: {
                id: getGalleryExtensionId(manifest.publisher, manifest.name),
                publisherId: manifest.publisher,
                publisherDisplayName: 'somename',
            },
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
    function aPage(objects = [], total) {
        return {
            firstPage: objects,
            total: total ?? objects.length,
            pageSize: objects.length,
            getPage: () => null,
        };
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc1ZpZXdzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2V4dGVuc2lvbnMvdGVzdC9lbGVjdHJvbi1zYW5kYm94L2V4dGVuc2lvbnNWaWV3cy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDakUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDckUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUE7QUFDeEgsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDeEUsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDeEYsT0FBTyxFQUNOLDJCQUEyQixFQUMzQix3QkFBd0IsRUFJeEIsaUJBQWlCLEdBRWpCLE1BQU0sMkVBQTJFLENBQUE7QUFDbEYsT0FBTyxFQUNOLG9DQUFvQyxFQUVwQyxpQ0FBaUMsRUFHakMsb0NBQW9DLEdBQ3BDLE1BQU0sd0VBQXdFLENBQUE7QUFDL0UsT0FBTyxFQUNOLGdDQUFnQyxHQUVoQyxNQUFNLGtGQUFrRixDQUFBO0FBQ3pGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtFQUErRSxDQUFBO0FBQ3JILE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLDBGQUEwRixDQUFBO0FBQ3pJLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLCtFQUErRSxDQUFBO0FBQ3ZILE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsS0FB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