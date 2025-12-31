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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc1ZpZXdzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9leHRlbnNpb25zL3Rlc3QvZWxlY3Ryb24tc2FuZGJveC9leHRlbnNpb25zVmlld3MudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxDQUFBO0FBQ3hILE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQ3hFLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQ3hGLE9BQU8sRUFDTiwyQkFBMkIsRUFDM0Isd0JBQXdCLEVBSXhCLGlCQUFpQixHQUVqQixNQUFNLDJFQUEyRSxDQUFBO0FBQ2xGLE9BQU8sRUFDTixvQ0FBb0MsRUFFcEMsaUNBQWlDLEVBR2pDLG9DQUFvQyxHQUNwQyxNQUFNLHdFQUF3RSxDQUFBO0FBQy9FLE9BQU8sRUFDTixnQ0FBZ0MsR0FFaEMsTUFBTSxrRkFBa0YsQ0FBQTtBQUN6RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQTtBQUNySCxPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSwwRkFBMEYsQ0FBQTtBQUN6SSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQTtBQUN2SCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDdkUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFB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