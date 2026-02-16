/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as sinon from 'sinon';
import { IExtensionManagementService, IAllowedExtensionsService, AllowedExtensionsConfigKey, } from '../../../../../platform/extensionManagement/common/extensionManagement.js';
import { IExtensionManagementServerService, IWorkbenchExtensionManagementService, } from '../../common/extensionManagement.js';
import { ExtensionEnablementService } from '../../browser/extensionEnablementService.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { Emitter, Event } from '../../../../../base/common/event.js';
import { IWorkspaceContextService, } from '../../../../../platform/workspace/common/workspace.js';
import { IWorkbenchEnvironmentService } from '../../../environment/common/environmentService.js';
import { IStorageService, InMemoryStorageService, } from '../../../../../platform/storage/common/storage.js';
import { isUndefinedOrNull } from '../../../../../base/common/types.js';
import { areSameExtensions } from '../../../../../platform/extensionManagement/common/extensionManagementUtil.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { URI } from '../../../../../base/common/uri.js';
import { Schemas } from '../../../../../base/common/network.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { TestLifecycleService } from '../../../../test/browser/workbenchTestServices.js';
import { GlobalExtensionEnablementService } from '../../../../../platform/extensionManagement/common/extensionEnablementService.js';
import { IUserDataSyncAccountService, UserDataSyncAccountService, } from '../../../../../platform/userDataSync/common/userDataSyncAccount.js';
import { IUserDataSyncEnablementService } from '../../../../../platform/userDataSync/common/userDataSync.js';
import { ILifecycleService } from '../../../lifecycle/common/lifecycle.js';
import { INotificationService } from '../../../../../platform/notification/common/notification.js';
import { TestNotificationService } from '../../../../../platform/notification/test/common/testNotificationService.js';
import { IHostService } from '../../../host/browser/host.js';
import { mock } from '../../../../../base/test/common/mock.js';
import { IWorkspaceTrustManagementService, } from '../../../../../platform/workspace/common/workspaceTrust.js';
import { ExtensionManifestPropertiesService, IExtensionManifestPropertiesService, } from '../../../extensions/common/extensionManifestPropertiesService.js';
import { TestContextService, TestProductService, TestWorkspaceTrustEnablementService, TestWorkspaceTrustManagementService, } from '../../../../test/common/workbenchTestServices.js';
import { TestWorkspace } from '../../../../../platform/workspace/test/common/testWorkspace.js';
import { ExtensionManagementService } from '../../common/extensionManagementService.js';
import { ILogService, NullLogService } from '../../../../../platform/log/common/log.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { FileService } from '../../../../../platform/files/common/fileService.js';
import { IProductService } from '../../../../../platform/product/common/productService.js';
import { AllowedExtensionsService } from '../../../../../platform/extensionManagement/common/allowedExtensionsService.js';
function createStorageService(instantiationService, disposableStore) {
    let service = instantiationService.get(IStorageService);
    if (!service) {
        let workspaceContextService = instantiationService.get(IWorkspaceContextService);
        if (!workspaceContextService) {
            workspaceContextService = instantiationService.stub(IWorkspaceContextService, {
                getWorkbenchState: () => 2 /* WorkbenchState.FOLDER */,
                getWorkspace: () => TestWorkspace,
            });
        }
        service = instantiationService.stub(IStorageService, disposableStore.add(new InMemoryStorageService()));
    }
    return service;
}
export class TestExtensionEnablementService extends ExtensionEnablementService {
    constructor(instantiationService) {
        const disposables = new DisposableStore();
        const storageService = createStorageService(instantiationService, disposables);
        const extensionManagementServerService = instantiationService.get(IExtensionManagementServerService) ||
            instantiationService.stub(IExtensionManagementServerService, anExtensionManagementServerService({
                id: 'local',
                label: 'local',
                extensionManagementService: {
                    onInstallExtension: disposables.add(new Emitter()).event,
                    onDidInstallExtensions: disposables.add(new Emitter()).event,
                    onUninstallExtension: disposables.add(new Emitter()).event,
                    onDidUninstallExtension: disposables.add(new Emitter())
                        .event,
                    onDidChangeProfile: disposables.add(new Emitter()).event,
                    onDidUpdateExtensionMetadata: disposables.add(new Emitter()).event,
                    onProfileAwareDidInstallExtensions: Event.None,
                },
            }, null, null));
        const extensionManagementService = disposables.add(instantiationService.createInstance(ExtensionManagementService));
        const workbenchExtensionManagementService = instantiationService.get(IWorkbenchExtensionManagementService) ||
            instantiationService.stub(IWorkbenchExtensionManagementService, extensionManagementService);
        const workspaceTrustManagementService = instantiationService.get(IWorkspaceTrustManagementService) ||
            instantiationService.stub(IWorkspaceTrustManagementService, disposables.add(new TestWorkspaceTrustManagementService()));
        super(storageService, disposables.add(new GlobalExtensionEnablementService(storageService, extensionManagementService)), instantiationService.get(IWorkspaceContextService) || new TestContextService(), instantiationService.get(IWorkbenchEnvironmentService) ||
            instantiationService.stub(IWorkbenchEnvironmentService, {}), workbenchExtensionManagementService, instantiationService.get(IConfigurationService), extensionManagementServerService, instantiationService.get(IUserDataSyncEnablementService) ||
            instantiationService.stub(IUserDataSyncEnablementService, {
                isEnabled() {
                    return false;
                },
            }), instantiationService.get(IUserDataSyncAccountService) ||
            instantiationService.stub(IUserDataSyncAccountService, UserDataSyncAccountService), instantiationService.get(ILifecycleService) ||
            instantiationService.stub(ILifecycleService, disposables.add(new TestLifecycleService())), instantiationService.get(INotificationService) ||
            instantiationService.stub(INotificationService, new TestNotificationService()), instantiationService.get(IHostService), new (class extends mock() {
            isDisabledByBisect() {
                return false;
            }
        })(), instantiationService.stub(IAllowedExtensionsService, disposables.add(new AllowedExtensionsService(instantiationService.get(IProductService), instantiationService.get(IConfigurationService)))), workspaceTrustManagementService, new (class extends mock() {
            requestWorkspaceTrust(options) {
                return Promise.resolve(true);
            }
        })(), instantiationService.get(IExtensionManifestPropertiesService) ||
            instantiationService.stub(IExtensionManifestPropertiesService, disposables.add(new ExtensionManifestPropertiesService(TestProductService, new TestConfigurationService(), new TestWorkspaceTrustEnablementService(), new NullLogService()))), instantiationService, new NullLogService());
        this._register(disposables);
    }
    async waitUntilInitialized() {
        await this.extensionsManager.whenInitialized();
    }
    reset() {
        let extensions = this.globalExtensionEnablementService.getDisabledExtensions();
        for (const e of this._getWorkspaceDisabledExtensions()) {
            if (!extensions.some((r) => areSameExtensions(r, e))) {
                extensions.push(e);
            }
        }
        const workspaceEnabledExtensions = this._getWorkspaceEnabledExtensions();
        if (workspaceEnabledExtensions.length) {
            extensions = extensions.filter((r) => !workspaceEnabledExtensions.some((e) => areSameExtensions(e, r)));
        }
        extensions.forEach((d) => this.setEnablement([aLocalExtension(d.id)], 11 /* EnablementState.EnabledGlobally */));
    }
}
suite('ExtensionEnablementService Test', () => {
    const disposableStore = ensureNoDisposablesAreLeakedInTestSuite();
    let instantiationService;
    let testObject;
    const didInstallEvent = new Emitter();
    const didUninstallEvent = new Emitter();
    const didChangeProfileExtensionsEvent = new Emitter();
    const installed = [];
    const malicious = [];
    setup(() => {
        installed.splice(0, installed.length);
        instantiationService = disposableStore.add(new TestInstantiationService());
        instantiationService.stub(IFileService, disposableStore.add(new FileService(new NullLogService())));
        instantiationService.stub(IProductService, TestProductService);
        const testConfigurationService = new TestConfigurationService();
        testConfigurationService.setUserConfiguration(AllowedExtensionsConfigKey, {
            '*': true,
            unallowed: false,
        });
        instantiationService.stub(IConfigurationService, testConfigurationService);
        instantiationService.stub(IWorkspaceContextService, new TestContextService());
        instantiationService.stub(IExtensionManagementServerService, anExtensionManagementServerService({
            id: 'local',
            label: 'local',
            extensionManagementService: {
                onDidInstallExtensions: didInstallEvent.event,
                onDidUninstallExtension: didUninstallEvent.event,
                onDidChangeProfile: didChangeProfileExtensionsEvent.event,
                onProfileAwareDidInstallExtensions: Event.None,
                getInstalled: () => Promise.resolve(installed),
                async getExtensionsControlManifest() {
                    return {
                        malicious,
                        deprecated: {},
                        search: [],
                    };
                },
            },
        }, null, null));
        instantiationService.stub(ILogService, NullLogService);
        instantiationService.stub(IWorkbenchExtensionManagementService, disposableStore.add(instantiationService.createInstance(ExtensionManagementService)));
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
    });
    test('test disable an extension globally', async () => {
        const extension = aLocalExtension('pub.a');
        await testObject.setEnablement([extension], 9 /* EnablementState.DisabledGlobally */);
        assert.ok(!testObject.isEnabled(extension));
        assert.strictEqual(testObject.getEnablementState(extension), 9 /* EnablementState.DisabledGlobally */);
    });
    test('test disable an extension globally should return truthy promise', () => {
        return testObject
            .setEnablement([aLocalExtension('pub.a')], 9 /* EnablementState.DisabledGlobally */)
            .then((value) => assert.ok(value));
    });
    test('test disable an extension globally triggers the change event', async () => {
        const target = sinon.spy();
        disposableStore.add(testObject.onEnablementChanged(target));
        await testObject.setEnablement([aLocalExtension('pub.a')], 9 /* EnablementState.DisabledGlobally */);
        assert.ok(target.calledOnce);
        assert.deepStrictEqual(target.args[0][0][0].identifier, { id: 'pub.a' });
    });
    test('test disable an extension globally again should return a falsy promise', () => {
        return testObject
            .setEnablement([aLocalExtension('pub.a')], 9 /* EnablementState.DisabledGlobally */)
            .then(() => testObject.setEnablement([aLocalExtension('pub.a')], 9 /* EnablementState.DisabledGlobally */))
            .then((value) => assert.ok(!value[0]));
    });
    test('test state of globally disabled extension', () => {
        return testObject
            .setEnablement([aLocalExtension('pub.a')], 9 /* EnablementState.DisabledGlobally */)
            .then(() => assert.strictEqual(testObject.getEnablementState(aLocalExtension('pub.a')), 9 /* EnablementState.DisabledGlobally */));
    });
    test('test state of globally enabled extension', () => {
        return testObject
            .setEnablement([aLocalExtension('pub.a')], 9 /* EnablementState.DisabledGlobally */)
            .then(() => testObject.setEnablement([aLocalExtension('pub.a')], 11 /* EnablementState.EnabledGlobally */))
            .then(() => assert.strictEqual(testObject.getEnablementState(aLocalExtension('pub.a')), 11 /* EnablementState.EnabledGlobally */));
    });
    test('test disable an extension for workspace', async () => {
        const extension = aLocalExtension('pub.a');
        await testObject.setEnablement([extension], 10 /* EnablementState.DisabledWorkspace */);
        assert.ok(!testObject.isEnabled(extension));
        assert.strictEqual(testObject.getEnablementState(extension), 10 /* EnablementState.DisabledWorkspace */);
    });
    test('test disable an extension for workspace returns a truthy promise', () => {
        return testObject
            .setEnablement([aLocalExtension('pub.a')], 10 /* EnablementState.DisabledWorkspace */)
            .then((value) => assert.ok(value));
    });
    test('test disable an extension for workspace again should return a falsy promise', () => {
        return testObject
            .setEnablement([aLocalExtension('pub.a')], 10 /* EnablementState.DisabledWorkspace */)
            .then(() => testObject.setEnablement([aLocalExtension('pub.a')], 10 /* EnablementState.DisabledWorkspace */))
            .then((value) => assert.ok(!value[0]));
    });
    test('test state of workspace disabled extension', () => {
        return testObject
            .setEnablement([aLocalExtension('pub.a')], 10 /* EnablementState.DisabledWorkspace */)
            .then(() => assert.strictEqual(testObject.getEnablementState(aLocalExtension('pub.a')), 10 /* EnablementState.DisabledWorkspace */));
    });
    test('test state of workspace and globally disabled extension', () => {
        return testObject
            .setEnablement([aLocalExtension('pub.a')], 9 /* EnablementState.DisabledGlobally */)
            .then(() => testObject.setEnablement([aLocalExtension('pub.a')], 10 /* EnablementState.DisabledWorkspace */))
            .then(() => assert.strictEqual(testObject.getEnablementState(aLocalExtension('pub.a')), 10 /* EnablementState.DisabledWorkspace */));
    });
    test('test state of workspace enabled extension', () => {
        return testObject
            .setEnablement([aLocalExtension('pub.a')], 10 /* EnablementState.DisabledWorkspace */)
            .then(() => testObject.setEnablement([aLocalExtension('pub.a')], 12 /* EnablementState.EnabledWorkspace */))
            .then(() => assert.strictEqual(testObject.getEnablementState(aLocalExtension('pub.a')), 12 /* EnablementState.EnabledWorkspace */));
    });
    test('test state of globally disabled and workspace enabled extension', () => {
        return testObject
            .setEnablement([aLocalExtension('pub.a')], 9 /* EnablementState.DisabledGlobally */)
            .then(() => testObject.setEnablement([aLocalExtension('pub.a')], 10 /* EnablementState.DisabledWorkspace */))
            .then(() => testObject.setEnablement([aLocalExtension('pub.a')], 12 /* EnablementState.EnabledWorkspace */))
            .then(() => assert.strictEqual(testObject.getEnablementState(aLocalExtension('pub.a')), 12 /* EnablementState.EnabledWorkspace */));
    });
    test('test state of an extension when disabled for workspace from workspace enabled', () => {
        return testObject
            .setEnablement([aLocalExtension('pub.a')], 10 /* EnablementState.DisabledWorkspace */)
            .then(() => testObject.setEnablement([aLocalExtension('pub.a')], 12 /* EnablementState.EnabledWorkspace */))
            .then(() => testObject.setEnablement([aLocalExtension('pub.a')], 10 /* EnablementState.DisabledWorkspace */))
            .then(() => assert.strictEqual(testObject.getEnablementState(aLocalExtension('pub.a')), 10 /* EnablementState.DisabledWorkspace */));
    });
    test('test state of an extension when disabled globally from workspace enabled', () => {
        return testObject
            .setEnablement([aLocalExtension('pub.a')], 10 /* EnablementState.DisabledWorkspace */)
            .then(() => testObject.setEnablement([aLocalExtension('pub.a')], 12 /* EnablementState.EnabledWorkspace */))
            .then(() => testObject.setEnablement([aLocalExtension('pub.a')], 9 /* EnablementState.DisabledGlobally */))
            .then(() => assert.strictEqual(testObject.getEnablementState(aLocalExtension('pub.a')), 9 /* EnablementState.DisabledGlobally */));
    });
    test('test state of an extension when disabled globally from workspace disabled', () => {
        return testObject
            .setEnablement([aLocalExtension('pub.a')], 10 /* EnablementState.DisabledWorkspace */)
            .then(() => testObject.setEnablement([aLocalExtension('pub.a')], 9 /* EnablementState.DisabledGlobally */))
            .then(() => assert.strictEqual(testObject.getEnablementState(aLocalExtension('pub.a')), 9 /* EnablementState.DisabledGlobally */));
    });
    test('test state of an extension when enabled globally from workspace enabled', () => {
        return testObject
            .setEnablement([aLocalExtension('pub.a')], 10 /* EnablementState.DisabledWorkspace */)
            .then(() => testObject.setEnablement([aLocalExtension('pub.a')], 12 /* EnablementState.EnabledWorkspace */))
            .then(() => testObject.setEnablement([aLocalExtension('pub.a')], 11 /* EnablementState.EnabledGlobally */))
            .then(() => assert.strictEqual(testObject.getEnablementState(aLocalExtension('pub.a')), 11 /* EnablementState.EnabledGlobally */));
    });
    test('test state of an extension when enabled globally from workspace disabled', () => {
        return testObject
            .setEnablement([aLocalExtension('pub.a')], 10 /* EnablementState.DisabledWorkspace */)
            .then(() => testObject.setEnablement([aLocalExtension('pub.a')], 11 /* EnablementState.EnabledGlobally */))
            .then(() => assert.strictEqual(testObject.getEnablementState(aLocalExtension('pub.a')), 11 /* EnablementState.EnabledGlobally */));
    });
    test('test disable an extension for workspace and then globally', async () => {
        const extension = aLocalExtension('pub.a');
        await testObject.setEnablement([extension], 10 /* EnablementState.DisabledWorkspace */);
        await testObject.setEnablement([extension], 9 /* EnablementState.DisabledGlobally */);
        assert.ok(!testObject.isEnabled(extension));
        assert.strictEqual(testObject.getEnablementState(extension), 9 /* EnablementState.DisabledGlobally */);
    });
    test('test disable an extension for workspace and then globally return a truthy promise', () => {
        return testObject
            .setEnablement([aLocalExtension('pub.a')], 10 /* EnablementState.DisabledWorkspace */)
            .then(() => testObject.setEnablement([aLocalExtension('pub.a')], 9 /* EnablementState.DisabledGlobally */))
            .then((value) => assert.ok(value));
    });
    test('test disable an extension for workspace and then globally trigger the change event', () => {
        const target = sinon.spy();
        return testObject
            .setEnablement([aLocalExtension('pub.a')], 10 /* EnablementState.DisabledWorkspace */)
            .then(() => disposableStore.add(testObject.onEnablementChanged(target)))
            .then(() => testObject.setEnablement([aLocalExtension('pub.a')], 9 /* EnablementState.DisabledGlobally */))
            .then(() => {
            assert.ok(target.calledOnce);
            assert.deepStrictEqual(target.args[0][0][0].identifier, { id: 'pub.a' });
        });
    });
    test('test disable an extension globally and then for workspace', async () => {
        const extension = aLocalExtension('pub.a');
        await testObject.setEnablement([extension], 9 /* EnablementState.DisabledGlobally */);
        await testObject.setEnablement([extension], 10 /* EnablementState.DisabledWorkspace */);
        assert.ok(!testObject.isEnabled(extension));
        assert.strictEqual(testObject.getEnablementState(extension), 10 /* EnablementState.DisabledWorkspace */);
    });
    test('test disable an extension globally and then for workspace return a truthy promise', () => {
        return testObject
            .setEnablement([aLocalExtension('pub.a')], 9 /* EnablementState.DisabledGlobally */)
            .then(() => testObject.setEnablement([aLocalExtension('pub.a')], 10 /* EnablementState.DisabledWorkspace */))
            .then((value) => assert.ok(value));
    });
    test('test disable an extension globally and then for workspace triggers the change event', () => {
        const target = sinon.spy();
        return testObject
            .setEnablement([aLocalExtension('pub.a')], 9 /* EnablementState.DisabledGlobally */)
            .then(() => disposableStore.add(testObject.onEnablementChanged(target)))
            .then(() => testObject.setEnablement([aLocalExtension('pub.a')], 10 /* EnablementState.DisabledWorkspace */))
            .then(() => {
            assert.ok(target.calledOnce);
            assert.deepStrictEqual(target.args[0][0][0].identifier, { id: 'pub.a' });
        });
    });
    test('test disable an extension for workspace when there is no workspace throws error', () => {
        instantiationService.stub(IWorkspaceContextService, 'getWorkbenchState', 1 /* WorkbenchState.EMPTY */);
        return testObject
            .setEnablement([aLocalExtension('pub.a')], 10 /* EnablementState.DisabledWorkspace */)
            .then(() => assert.fail('should throw an error'), (error) => assert.ok(error));
    });
    test('test enable an extension globally', async () => {
        const extension = aLocalExtension('pub.a');
        await testObject.setEnablement([extension], 9 /* EnablementState.DisabledGlobally */);
        await testObject.setEnablement([extension], 11 /* EnablementState.EnabledGlobally */);
        assert.ok(testObject.isEnabled(extension));
        assert.strictEqual(testObject.getEnablementState(extension), 11 /* EnablementState.EnabledGlobally */);
    });
    test('test enable an extension globally return truthy promise', async () => {
        await testObject.setEnablement([aLocalExtension('pub.a')], 9 /* EnablementState.DisabledGlobally */);
        const value = await testObject.setEnablement([aLocalExtension('pub.a')], 11 /* EnablementState.EnabledGlobally */);
        assert.strictEqual(value[0], true);
    });
    test('test enable an extension globally triggers change event', () => {
        const target = sinon.spy();
        return testObject
            .setEnablement([aLocalExtension('pub.a')], 9 /* EnablementState.DisabledGlobally */)
            .then(() => disposableStore.add(testObject.onEnablementChanged(target)))
            .then(() => testObject.setEnablement([aLocalExtension('pub.a')], 11 /* EnablementState.EnabledGlobally */))
            .then(() => {
            assert.ok(target.calledOnce);
            assert.deepStrictEqual(target.args[0][0][0].identifier, { id: 'pub.a' });
        });
    });
    test('test enable an extension globally when already enabled return falsy promise', () => {
        return testObject
            .setEnablement([aLocalExtension('pub.a')], 11 /* EnablementState.EnabledGlobally */)
            .then((value) => assert.ok(!value[0]));
    });
    test('test enable an extension for workspace', async () => {
        const extension = aLocalExtension('pub.a');
        await testObject.setEnablement([extension], 10 /* EnablementState.DisabledWorkspace */);
        await testObject.setEnablement([extension], 12 /* EnablementState.EnabledWorkspace */);
        assert.ok(testObject.isEnabled(extension));
        assert.strictEqual(testObject.getEnablementState(extension), 12 /* EnablementState.EnabledWorkspace */);
    });
    test('test enable an extension for workspace return truthy promise', () => {
        return testObject
            .setEnablement([aLocalExtension('pub.a')], 10 /* EnablementState.DisabledWorkspace */)
            .then(() => testObject.setEnablement([aLocalExtension('pub.a')], 12 /* EnablementState.EnabledWorkspace */))
            .then((value) => assert.ok(value));
    });
    test('test enable an extension for workspace triggers change event', () => {
        const target = sinon.spy();
        return testObject
            .setEnablement([aLocalExtension('pub.b')], 10 /* EnablementState.DisabledWorkspace */)
            .then(() => disposableStore.add(testObject.onEnablementChanged(target)))
            .then(() => testObject.setEnablement([aLocalExtension('pub.b')], 12 /* EnablementState.EnabledWorkspace */))
            .then(() => {
            assert.ok(target.calledOnce);
            assert.deepStrictEqual(target.args[0][0][0].identifier, { id: 'pub.b' });
        });
    });
    test('test enable an extension for workspace when already enabled return truthy promise', () => {
        return testObject
            .setEnablement([aLocalExtension('pub.a')], 12 /* EnablementState.EnabledWorkspace */)
            .then((value) => assert.ok(value));
    });
    test('test enable an extension for workspace when disabled in workspace and gloablly', async () => {
        const extension = aLocalExtension('pub.a');
        await testObject.setEnablement([extension], 10 /* EnablementState.DisabledWorkspace */);
        await testObject.setEnablement([extension], 9 /* EnablementState.DisabledGlobally */);
        await testObject.setEnablement([extension], 12 /* EnablementState.EnabledWorkspace */);
        assert.ok(testObject.isEnabled(extension));
        assert.strictEqual(testObject.getEnablementState(extension), 12 /* EnablementState.EnabledWorkspace */);
    });
    test('test enable an extension globally when disabled in workspace and gloablly', async () => {
        const extension = aLocalExtension('pub.a');
        await testObject.setEnablement([extension], 12 /* EnablementState.EnabledWorkspace */);
        await testObject.setEnablement([extension], 10 /* EnablementState.DisabledWorkspace */);
        await testObject.setEnablement([extension], 9 /* EnablementState.DisabledGlobally */);
        await testObject.setEnablement([extension], 11 /* EnablementState.EnabledGlobally */);
        assert.ok(testObject.isEnabled(extension));
        assert.strictEqual(testObject.getEnablementState(extension), 11 /* EnablementState.EnabledGlobally */);
    });
    test('test enable an extension also enables dependencies', async () => {
        installed.push(...[
            aLocalExtension2('pub.a', { extensionDependencies: ['pub.b'] }),
            aLocalExtension('pub.b'),
        ]);
        const target = installed[0];
        const dep = installed[1];
        await testObject.waitUntilInitialized();
        await testObject.setEnablement([dep, target], 9 /* EnablementState.DisabledGlobally */);
        await testObject.setEnablement([target], 11 /* EnablementState.EnabledGlobally */);
        assert.ok(testObject.isEnabled(target));
        assert.ok(testObject.isEnabled(dep));
        assert.strictEqual(testObject.getEnablementState(target), 11 /* EnablementState.EnabledGlobally */);
        assert.strictEqual(testObject.getEnablementState(dep), 11 /* EnablementState.EnabledGlobally */);
    });
    test('test enable an extension in workspace with a dependency extension that has auth providers', async () => {
        installed.push(...[
            aLocalExtension2('pub.a', { extensionDependencies: ['pub.b'] }),
            aLocalExtension('pub.b', { authentication: [{ id: 'a', label: 'a' }] }),
        ]);
        const target = installed[0];
        await testObject.waitUntilInitialized();
        await testObject.setEnablement([target], 10 /* EnablementState.DisabledWorkspace */);
        await testObject.setEnablement([target], 12 /* EnablementState.EnabledWorkspace */);
        assert.ok(testObject.isEnabled(target));
        assert.strictEqual(testObject.getEnablementState(target), 12 /* EnablementState.EnabledWorkspace */);
    });
    test('test enable an extension with a dependency extension that cannot be enabled', async () => {
        instantiationService.stub(IExtensionManagementServerService, anExtensionManagementServerService(anExtensionManagementServer('vscode-local', instantiationService), anExtensionManagementServer('vscode-remote', instantiationService), null));
        const localWorkspaceDepExtension = aLocalExtension2('pub.b', { extensionKind: ['workspace'] }, { location: URI.file(`pub.b`) });
        const remoteWorkspaceExtension = aLocalExtension2('pub.a', { extensionKind: ['workspace'], extensionDependencies: ['pub.b'] }, { location: URI.file(`pub.a`).with({ scheme: Schemas.vscodeRemote }) });
        const remoteWorkspaceDepExtension = aLocalExtension2('pub.b', { extensionKind: ['workspace'] }, { location: URI.file(`pub.b`).with({ scheme: Schemas.vscodeRemote }) });
        installed.push(localWorkspaceDepExtension, remoteWorkspaceExtension, remoteWorkspaceDepExtension);
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        await testObject.waitUntilInitialized();
        await testObject.setEnablement([remoteWorkspaceExtension], 9 /* EnablementState.DisabledGlobally */);
        await testObject.setEnablement([remoteWorkspaceExtension], 11 /* EnablementState.EnabledGlobally */);
        assert.ok(testObject.isEnabled(remoteWorkspaceExtension));
        assert.strictEqual(testObject.getEnablementState(remoteWorkspaceExtension), 11 /* EnablementState.EnabledGlobally */);
    });
    test('test enable an extension also enables packed extensions', async () => {
        installed.push(...[aLocalExtension2('pub.a', { extensionPack: ['pub.b'] }), aLocalExtension('pub.b')]);
        const target = installed[0];
        const dep = installed[1];
        await testObject.setEnablement([dep, target], 9 /* EnablementState.DisabledGlobally */);
        await testObject.setEnablement([target], 11 /* EnablementState.EnabledGlobally */);
        assert.ok(testObject.isEnabled(target));
        assert.ok(testObject.isEnabled(dep));
        assert.strictEqual(testObject.getEnablementState(target), 11 /* EnablementState.EnabledGlobally */);
        assert.strictEqual(testObject.getEnablementState(dep), 11 /* EnablementState.EnabledGlobally */);
    });
    test('test remove an extension from disablement list when uninstalled', async () => {
        const extension = aLocalExtension('pub.a');
        installed.push(extension);
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        await testObject.setEnablement([extension], 10 /* EnablementState.DisabledWorkspace */);
        await testObject.setEnablement([extension], 9 /* EnablementState.DisabledGlobally */);
        didUninstallEvent.fire({ identifier: { id: 'pub.a' }, profileLocation: null });
        assert.ok(testObject.isEnabled(extension));
        assert.strictEqual(testObject.getEnablementState(extension), 11 /* EnablementState.EnabledGlobally */);
    });
    test('test isEnabled return false extension is disabled globally', () => {
        return testObject
            .setEnablement([aLocalExtension('pub.a')], 9 /* EnablementState.DisabledGlobally */)
            .then(() => assert.ok(!testObject.isEnabled(aLocalExtension('pub.a'))));
    });
    test('test isEnabled return false extension is disabled in workspace', () => {
        return testObject
            .setEnablement([aLocalExtension('pub.a')], 10 /* EnablementState.DisabledWorkspace */)
            .then(() => assert.ok(!testObject.isEnabled(aLocalExtension('pub.a'))));
    });
    test('test isEnabled return true extension is not disabled', () => {
        return testObject
            .setEnablement([aLocalExtension('pub.a')], 10 /* EnablementState.DisabledWorkspace */)
            .then(() => testObject.setEnablement([aLocalExtension('pub.c')], 9 /* EnablementState.DisabledGlobally */))
            .then(() => assert.ok(testObject.isEnabled(aLocalExtension('pub.b'))));
    });
    test('test canChangeEnablement return false for language packs', () => {
        assert.strictEqual(testObject.canChangeEnablement(aLocalExtension('pub.a', {
            localizations: [{ languageId: 'gr', translations: [{ id: 'vscode', path: 'path' }] }],
        })), false);
    });
    test('test canChangeEnablement return true for auth extension', () => {
        assert.strictEqual(testObject.canChangeEnablement(aLocalExtension('pub.a', { authentication: [{ id: 'a', label: 'a' }] })), true);
    });
    test('test canChangeEnablement return true for auth extension when user data sync account does not depends on it', () => {
        instantiationService.stub(IUserDataSyncAccountService, {
            account: { authenticationProviderId: 'b' },
        });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        assert.strictEqual(testObject.canChangeEnablement(aLocalExtension('pub.a', { authentication: [{ id: 'a', label: 'a' }] })), true);
    });
    test('test canChangeEnablement return true for auth extension when user data sync account depends on it but auto sync is off', () => {
        instantiationService.stub(IUserDataSyncAccountService, {
            account: { authenticationProviderId: 'a' },
        });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        assert.strictEqual(testObject.canChangeEnablement(aLocalExtension('pub.a', { authentication: [{ id: 'a', label: 'a' }] })), true);
    });
    test('test canChangeEnablement return false for auth extension and user data sync account depends on it and auto sync is on', () => {
        instantiationService.stub(IUserDataSyncEnablementService, {
            isEnabled() {
                return true;
            },
        });
        instantiationService.stub(IUserDataSyncAccountService, {
            account: { authenticationProviderId: 'a' },
        });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        assert.strictEqual(testObject.canChangeEnablement(aLocalExtension('pub.a', { authentication: [{ id: 'a', label: 'a' }] })), false);
    });
    test('test canChangeWorkspaceEnablement return true', () => {
        assert.strictEqual(testObject.canChangeWorkspaceEnablement(aLocalExtension('pub.a')), true);
    });
    test('test canChangeWorkspaceEnablement return false if there is no workspace', () => {
        instantiationService.stub(IWorkspaceContextService, 'getWorkbenchState', 1 /* WorkbenchState.EMPTY */);
        assert.strictEqual(testObject.canChangeWorkspaceEnablement(aLocalExtension('pub.a')), false);
    });
    test('test canChangeWorkspaceEnablement return false for auth extension', () => {
        assert.strictEqual(testObject.canChangeWorkspaceEnablement(aLocalExtension('pub.a', { authentication: [{ id: 'a', label: 'a' }] })), false);
    });
    test('test canChangeEnablement return false when extensions are disabled in environment', () => {
        instantiationService.stub(IWorkbenchEnvironmentService, { disableExtensions: true });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        assert.strictEqual(testObject.canChangeEnablement(aLocalExtension('pub.a')), false);
    });
    test('test canChangeEnablement return false when the extension is disabled in environment', () => {
        instantiationService.stub(IWorkbenchEnvironmentService, { disableExtensions: ['pub.a'] });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        assert.strictEqual(testObject.canChangeEnablement(aLocalExtension('pub.a')), false);
    });
    test('test canChangeEnablement return true for system extensions when extensions are disabled in environment', () => {
        instantiationService.stub(IWorkbenchEnvironmentService, { disableExtensions: true });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        const extension = aLocalExtension('pub.a', undefined, 0 /* ExtensionType.System */);
        assert.strictEqual(testObject.canChangeEnablement(extension), true);
    });
    test('test canChangeEnablement return false for system extension when extension is disabled in environment', () => {
        instantiationService.stub(IWorkbenchEnvironmentService, { disableExtensions: ['pub.a'] });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        const extension = aLocalExtension('pub.a', undefined, 0 /* ExtensionType.System */);
        assert.ok(!testObject.canChangeEnablement(extension));
    });
    test('test extension is disabled when disabled in environment', async () => {
        const extension = aLocalExtension('pub.a');
        installed.push(extension);
        instantiationService.stub(IWorkbenchEnvironmentService, { disableExtensions: ['pub.a'] });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        assert.ok(!testObject.isEnabled(extension));
        assert.deepStrictEqual(testObject.getEnablementState(extension), 2 /* EnablementState.DisabledByEnvironment */);
    });
    test('test extension is enabled globally when enabled in environment', async () => {
        const extension = aLocalExtension('pub.a');
        installed.push(extension);
        instantiationService.stub(IWorkbenchEnvironmentService, {
            enableExtensions: ['pub.a'],
        });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        assert.ok(testObject.isEnabled(extension));
        assert.deepStrictEqual(testObject.getEnablementState(extension), 11 /* EnablementState.EnabledGlobally */);
    });
    test('test extension is enabled workspace when enabled in environment', async () => {
        const extension = aLocalExtension('pub.a');
        installed.push(extension);
        await testObject.setEnablement([extension], 12 /* EnablementState.EnabledWorkspace */);
        instantiationService.stub(IWorkbenchEnvironmentService, {
            enableExtensions: ['pub.a'],
        });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        assert.ok(testObject.isEnabled(extension));
        assert.deepStrictEqual(testObject.getEnablementState(extension), 12 /* EnablementState.EnabledWorkspace */);
    });
    test('test extension is enabled by environment when disabled globally', async () => {
        const extension = aLocalExtension('pub.a');
        installed.push(extension);
        await testObject.setEnablement([extension], 9 /* EnablementState.DisabledGlobally */);
        instantiationService.stub(IWorkbenchEnvironmentService, {
            enableExtensions: ['pub.a'],
        });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        assert.ok(testObject.isEnabled(extension));
        assert.deepStrictEqual(testObject.getEnablementState(extension), 3 /* EnablementState.EnabledByEnvironment */);
    });
    test('test extension is enabled by environment when disabled workspace', async () => {
        const extension = aLocalExtension('pub.a');
        installed.push(extension);
        await testObject.setEnablement([extension], 10 /* EnablementState.DisabledWorkspace */);
        instantiationService.stub(IWorkbenchEnvironmentService, {
            enableExtensions: ['pub.a'],
        });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        assert.ok(testObject.isEnabled(extension));
        assert.deepStrictEqual(testObject.getEnablementState(extension), 3 /* EnablementState.EnabledByEnvironment */);
    });
    test('test extension is disabled by environment when also enabled in environment', async () => {
        const extension = aLocalExtension('pub.a');
        installed.push(extension);
        testObject.setEnablement([extension], 10 /* EnablementState.DisabledWorkspace */);
        instantiationService.stub(IWorkbenchEnvironmentService, {
            disableExtensions: true,
            enableExtensions: ['pub.a'],
        });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        assert.ok(!testObject.isEnabled(extension));
        assert.deepStrictEqual(testObject.getEnablementState(extension), 2 /* EnablementState.DisabledByEnvironment */);
    });
    test('test canChangeEnablement return false when the extension is enabled in environment', () => {
        instantiationService.stub(IWorkbenchEnvironmentService, {
            enableExtensions: ['pub.a'],
        });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        assert.strictEqual(testObject.canChangeEnablement(aLocalExtension('pub.a')), false);
    });
    test('test extension does not support vitrual workspace is not enabled in virtual workspace', async () => {
        const extension = aLocalExtension2('pub.a', { capabilities: { virtualWorkspaces: false } });
        instantiationService.stub(IWorkspaceContextService, 'getWorkspace', {
            folders: [{ uri: URI.file('worskapceA').with({ scheme: 'virtual' }) }],
        });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        assert.ok(!testObject.isEnabled(extension));
        assert.deepStrictEqual(testObject.getEnablementState(extension), 5 /* EnablementState.DisabledByVirtualWorkspace */);
    });
    test('test web extension from web extension management server and does not support vitrual workspace is enabled in virtual workspace', async () => {
        instantiationService.stub(IExtensionManagementServerService, anExtensionManagementServerService(null, anExtensionManagementServer('vscode-remote', instantiationService), anExtensionManagementServer('web', instantiationService)));
        const extension = aLocalExtension2('pub.a', { capabilities: { virtualWorkspaces: false }, browser: 'browser.js' }, { location: URI.file(`pub.a`).with({ scheme: 'web' }) });
        instantiationService.stub(IWorkspaceContextService, 'getWorkspace', {
            folders: [{ uri: URI.file('worskapceA').with({ scheme: 'virtual' }) }],
        });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        assert.ok(testObject.isEnabled(extension));
        assert.deepStrictEqual(testObject.getEnablementState(extension), 11 /* EnablementState.EnabledGlobally */);
    });
    test('test web extension from remote extension management server and does not support vitrual workspace is disabled in virtual workspace', async () => {
        instantiationService.stub(IExtensionManagementServerService, anExtensionManagementServerService(null, anExtensionManagementServer('vscode-remote', instantiationService), anExtensionManagementServer('web', instantiationService)));
        const extension = aLocalExtension2('pub.a', { capabilities: { virtualWorkspaces: false }, browser: 'browser.js' }, { location: URI.file(`pub.a`).with({ scheme: 'vscode-remote' }) });
        instantiationService.stub(IWorkspaceContextService, 'getWorkspace', {
            folders: [{ uri: URI.file('worskapceA').with({ scheme: 'virtual' }) }],
        });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        assert.ok(!testObject.isEnabled(extension));
        assert.deepStrictEqual(testObject.getEnablementState(extension), 5 /* EnablementState.DisabledByVirtualWorkspace */);
    });
    test('test enable a remote workspace extension and local ui extension that is a dependency of remote', async () => {
        instantiationService.stub(IExtensionManagementServerService, anExtensionManagementServerService(anExtensionManagementServer('vscode-local', instantiationService), anExtensionManagementServer('vscode-remote', instantiationService), null));
        const localUIExtension = aLocalExtension2('pub.a', { main: 'main.js', extensionKind: ['ui'] }, { location: URI.file(`pub.a`) });
        const remoteUIExtension = aLocalExtension2('pub.a', { main: 'main.js', extensionKind: ['ui'] }, { location: URI.file(`pub.a`).with({ scheme: 'vscode-remote' }) });
        const target = aLocalExtension2('pub.b', { main: 'main.js', extensionDependencies: ['pub.a'] }, { location: URI.file(`pub.b`).with({ scheme: 'vscode-remote' }) });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        installed.push(localUIExtension, remoteUIExtension, target);
        await testObject.setEnablement([target, localUIExtension], 9 /* EnablementState.DisabledGlobally */);
        await testObject.setEnablement([target, localUIExtension], 11 /* EnablementState.EnabledGlobally */);
        assert.ok(testObject.isEnabled(target));
        assert.ok(testObject.isEnabled(localUIExtension));
        assert.strictEqual(testObject.getEnablementState(target), 11 /* EnablementState.EnabledGlobally */);
        assert.strictEqual(testObject.getEnablementState(localUIExtension), 11 /* EnablementState.EnabledGlobally */);
    });
    test('test enable a remote workspace extension also enables its dependency in local', async () => {
        instantiationService.stub(IExtensionManagementServerService, anExtensionManagementServerService(anExtensionManagementServer('vscode-local', instantiationService), anExtensionManagementServer('vscode-remote', instantiationService), null));
        const localUIExtension = aLocalExtension2('pub.a', { main: 'main.js', extensionKind: ['ui'] }, { location: URI.file(`pub.a`) });
        const remoteUIExtension = aLocalExtension2('pub.a', { main: 'main.js', extensionKind: ['ui'] }, { location: URI.file(`pub.a`).with({ scheme: 'vscode-remote' }) });
        const target = aLocalExtension2('pub.b', { main: 'main.js', extensionDependencies: ['pub.a'] }, { location: URI.file(`pub.b`).with({ scheme: 'vscode-remote' }) });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        installed.push(localUIExtension, remoteUIExtension, target);
        await testObject.setEnablement([target, localUIExtension], 9 /* EnablementState.DisabledGlobally */);
        await testObject.setEnablement([target], 11 /* EnablementState.EnabledGlobally */);
        assert.ok(testObject.isEnabled(target));
        assert.ok(testObject.isEnabled(localUIExtension));
        assert.strictEqual(testObject.getEnablementState(target), 11 /* EnablementState.EnabledGlobally */);
        assert.strictEqual(testObject.getEnablementState(localUIExtension), 11 /* EnablementState.EnabledGlobally */);
    });
    test('test canChangeEnablement return false when extension is disabled in virtual workspace', () => {
        const extension = aLocalExtension2('pub.a', { capabilities: { virtualWorkspaces: false } });
        instantiationService.stub(IWorkspaceContextService, 'getWorkspace', {
            folders: [{ uri: URI.file('worskapceA').with({ scheme: 'virtual' }) }],
        });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        assert.ok(!testObject.canChangeEnablement(extension));
    });
    test('test extension does not support vitrual workspace is enabled in normal workspace', async () => {
        const extension = aLocalExtension2('pub.a', { capabilities: { virtualWorkspaces: false } });
        instantiationService.stub(IWorkspaceContextService, 'getWorkspace', {
            folders: [{ uri: URI.file('worskapceA') }],
        });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        assert.ok(testObject.isEnabled(extension));
        assert.deepStrictEqual(testObject.getEnablementState(extension), 11 /* EnablementState.EnabledGlobally */);
    });
    test('test extension supports virtual workspace is enabled in virtual workspace', async () => {
        const extension = aLocalExtension2('pub.a', { capabilities: { virtualWorkspaces: true } });
        instantiationService.stub(IWorkspaceContextService, 'getWorkspace', {
            folders: [{ uri: URI.file('worskapceA').with({ scheme: 'virtual' }) }],
        });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        assert.ok(testObject.isEnabled(extension));
        assert.deepStrictEqual(testObject.getEnablementState(extension), 11 /* EnablementState.EnabledGlobally */);
    });
    test('test extension does not support untrusted workspaces is disabled in untrusted workspace', () => {
        const extension = aLocalExtension2('pub.a', {
            main: 'main.js',
            capabilities: { untrustedWorkspaces: { supported: false, description: 'hello' } },
        });
        instantiationService.stub(IWorkspaceTrustManagementService, {
            isWorkspaceTrusted() {
                return false;
            },
        });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        assert.strictEqual(testObject.getEnablementState(extension), 0 /* EnablementState.DisabledByTrustRequirement */);
    });
    test('test canChangeEnablement return true when extension is disabled by workspace trust', () => {
        const extension = aLocalExtension2('pub.a', {
            main: 'main.js',
            capabilities: { untrustedWorkspaces: { supported: false, description: 'hello' } },
        });
        instantiationService.stub(IWorkspaceTrustManagementService, {
            isWorkspaceTrusted() {
                return false;
            },
        });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        assert.ok(testObject.canChangeEnablement(extension));
    });
    test('test extension supports untrusted workspaces is enabled in untrusted workspace', () => {
        const extension = aLocalExtension2('pub.a', {
            main: 'main.js',
            capabilities: { untrustedWorkspaces: { supported: true } },
        });
        instantiationService.stub(IWorkspaceTrustManagementService, {
            isWorkspaceTrusted() {
                return false;
            },
        });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        assert.strictEqual(testObject.getEnablementState(extension), 11 /* EnablementState.EnabledGlobally */);
    });
    test('test extension does not support untrusted workspaces is enabled in trusted workspace', () => {
        const extension = aLocalExtension2('pub.a', {
            main: 'main.js',
            capabilities: { untrustedWorkspaces: { supported: false, description: '' } },
        });
        instantiationService.stub(IWorkspaceTrustManagementService, {
            isWorkspaceTrusted() {
                return true;
            },
        });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        assert.strictEqual(testObject.getEnablementState(extension), 11 /* EnablementState.EnabledGlobally */);
    });
    test('test extension supports untrusted workspaces is enabled in trusted workspace', () => {
        const extension = aLocalExtension2('pub.a', {
            main: 'main.js',
            capabilities: { untrustedWorkspaces: { supported: true } },
        });
        instantiationService.stub(IWorkspaceTrustManagementService, {
            isWorkspaceTrusted() {
                return true;
            },
        });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        assert.strictEqual(testObject.getEnablementState(extension), 11 /* EnablementState.EnabledGlobally */);
    });
    test('test extension without any value for virtual worksapce is enabled in virtual workspace', async () => {
        const extension = aLocalExtension2('pub.a');
        instantiationService.stub(IWorkspaceContextService, 'getWorkspace', {
            folders: [{ uri: URI.file('worskapceA').with({ scheme: 'virtual' }) }],
        });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        assert.ok(testObject.isEnabled(extension));
        assert.deepStrictEqual(testObject.getEnablementState(extension), 11 /* EnablementState.EnabledGlobally */);
    });
    test('test local workspace extension is disabled by kind', async () => {
        instantiationService.stub(IExtensionManagementServerService, aMultiExtensionManagementServerService(instantiationService));
        const localWorkspaceExtension = aLocalExtension2('pub.a', { extensionKind: ['workspace'] }, { location: URI.file(`pub.a`) });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        assert.ok(!testObject.isEnabled(localWorkspaceExtension));
        assert.deepStrictEqual(testObject.getEnablementState(localWorkspaceExtension), 1 /* EnablementState.DisabledByExtensionKind */);
    });
    test('test local workspace + ui extension is enabled by kind', async () => {
        instantiationService.stub(IExtensionManagementServerService, aMultiExtensionManagementServerService(instantiationService));
        const localWorkspaceExtension = aLocalExtension2('pub.a', { extensionKind: ['workspace', 'ui'] }, { location: URI.file(`pub.a`) });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        assert.ok(testObject.isEnabled(localWorkspaceExtension));
        assert.deepStrictEqual(testObject.getEnablementState(localWorkspaceExtension), 11 /* EnablementState.EnabledGlobally */);
    });
    test('test local ui extension is not disabled by kind', async () => {
        instantiationService.stub(IExtensionManagementServerService, aMultiExtensionManagementServerService(instantiationService));
        const localWorkspaceExtension = aLocalExtension2('pub.a', { extensionKind: ['ui'] }, { location: URI.file(`pub.a`) });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        assert.ok(testObject.isEnabled(localWorkspaceExtension));
        assert.deepStrictEqual(testObject.getEnablementState(localWorkspaceExtension), 11 /* EnablementState.EnabledGlobally */);
    });
    test('test canChangeEnablement return true when the local workspace extension is disabled by kind', () => {
        instantiationService.stub(IExtensionManagementServerService, aMultiExtensionManagementServerService(instantiationService));
        const localWorkspaceExtension = aLocalExtension2('pub.a', { extensionKind: ['workspace'] }, { location: URI.file(`pub.a`) });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        assert.strictEqual(testObject.canChangeEnablement(localWorkspaceExtension), false);
    });
    test('test canChangeEnablement return true for local ui extension', () => {
        instantiationService.stub(IExtensionManagementServerService, aMultiExtensionManagementServerService(instantiationService));
        const localWorkspaceExtension = aLocalExtension2('pub.a', { extensionKind: ['ui'] }, { location: URI.file(`pub.a`) });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        assert.strictEqual(testObject.canChangeEnablement(localWorkspaceExtension), true);
    });
    test('test remote ui extension is disabled by kind', async () => {
        instantiationService.stub(IExtensionManagementServerService, aMultiExtensionManagementServerService(instantiationService));
        const localWorkspaceExtension = aLocalExtension2('pub.a', { extensionKind: ['ui'] }, { location: URI.file(`pub.a`).with({ scheme: Schemas.vscodeRemote }) });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        assert.ok(!testObject.isEnabled(localWorkspaceExtension));
        assert.deepStrictEqual(testObject.getEnablementState(localWorkspaceExtension), 1 /* EnablementState.DisabledByExtensionKind */);
    });
    test('test remote ui+workspace extension is disabled by kind', async () => {
        instantiationService.stub(IExtensionManagementServerService, aMultiExtensionManagementServerService(instantiationService));
        const localWorkspaceExtension = aLocalExtension2('pub.a', { extensionKind: ['ui', 'workspace'] }, { location: URI.file(`pub.a`).with({ scheme: Schemas.vscodeRemote }) });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        assert.ok(testObject.isEnabled(localWorkspaceExtension));
        assert.deepStrictEqual(testObject.getEnablementState(localWorkspaceExtension), 11 /* EnablementState.EnabledGlobally */);
    });
    test('test remote ui extension is disabled by kind when there is no local server', async () => {
        instantiationService.stub(IExtensionManagementServerService, anExtensionManagementServerService(null, anExtensionManagementServer('vscode-remote', instantiationService), null));
        const localWorkspaceExtension = aLocalExtension2('pub.a', { extensionKind: ['ui'] }, { location: URI.file(`pub.a`).with({ scheme: Schemas.vscodeRemote }) });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        assert.ok(!testObject.isEnabled(localWorkspaceExtension));
        assert.deepStrictEqual(testObject.getEnablementState(localWorkspaceExtension), 1 /* EnablementState.DisabledByExtensionKind */);
    });
    test('test remote workspace extension is not disabled by kind', async () => {
        instantiationService.stub(IExtensionManagementServerService, aMultiExtensionManagementServerService(instantiationService));
        const localWorkspaceExtension = aLocalExtension2('pub.a', { extensionKind: ['workspace'] }, { location: URI.file(`pub.a`).with({ scheme: Schemas.vscodeRemote }) });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        assert.ok(testObject.isEnabled(localWorkspaceExtension));
        assert.deepStrictEqual(testObject.getEnablementState(localWorkspaceExtension), 11 /* EnablementState.EnabledGlobally */);
    });
    test('test canChangeEnablement return true when the remote ui extension is disabled by kind', () => {
        instantiationService.stub(IExtensionManagementServerService, aMultiExtensionManagementServerService(instantiationService));
        const localWorkspaceExtension = aLocalExtension2('pub.a', { extensionKind: ['ui'] }, { location: URI.file(`pub.a`).with({ scheme: Schemas.vscodeRemote }) });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        assert.strictEqual(testObject.canChangeEnablement(localWorkspaceExtension), false);
    });
    test('test canChangeEnablement return true for remote workspace extension', () => {
        instantiationService.stub(IExtensionManagementServerService, aMultiExtensionManagementServerService(instantiationService));
        const localWorkspaceExtension = aLocalExtension2('pub.a', { extensionKind: ['workspace'] }, { location: URI.file(`pub.a`).with({ scheme: Schemas.vscodeRemote }) });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        assert.strictEqual(testObject.canChangeEnablement(localWorkspaceExtension), true);
    });
    test('test web extension on local server is disabled by kind when web worker is not enabled', async () => {
        instantiationService.stub(IExtensionManagementServerService, aMultiExtensionManagementServerService(instantiationService));
        const localWorkspaceExtension = aLocalExtension2('pub.a', { browser: 'browser.js' }, { location: URI.file(`pub.a`) });
        (instantiationService.get(IConfigurationService)).setUserConfiguration('extensions', { webWorker: false });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        assert.strictEqual(testObject.isEnabled(localWorkspaceExtension), false);
        assert.deepStrictEqual(testObject.getEnablementState(localWorkspaceExtension), 1 /* EnablementState.DisabledByExtensionKind */);
    });
    test('test web extension on local server is not disabled by kind when web worker is enabled', async () => {
        instantiationService.stub(IExtensionManagementServerService, aMultiExtensionManagementServerService(instantiationService));
        const localWorkspaceExtension = aLocalExtension2('pub.a', { browser: 'browser.js' }, { location: URI.file(`pub.a`) });
        (instantiationService.get(IConfigurationService)).setUserConfiguration('extensions', { webWorker: true });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        assert.strictEqual(testObject.isEnabled(localWorkspaceExtension), true);
        assert.deepStrictEqual(testObject.getEnablementState(localWorkspaceExtension), 11 /* EnablementState.EnabledGlobally */);
    });
    test('test web extension on remote server is disabled by kind when web worker is not enabled', async () => {
        instantiationService.stub(IExtensionManagementServerService, anExtensionManagementServerService(anExtensionManagementServer('vscode-local', instantiationService), anExtensionManagementServer('vscode-remote', instantiationService), null));
        const localWorkspaceExtension = aLocalExtension2('pub.a', { browser: 'browser.js' }, { location: URI.file(`pub.a`).with({ scheme: 'vscode-remote' }) });
        (instantiationService.get(IConfigurationService)).setUserConfiguration('extensions', { webWorker: false });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        assert.strictEqual(testObject.isEnabled(localWorkspaceExtension), false);
        assert.deepStrictEqual(testObject.getEnablementState(localWorkspaceExtension), 1 /* EnablementState.DisabledByExtensionKind */);
    });
    test('test web extension on remote server is disabled by kind when web worker is enabled', async () => {
        instantiationService.stub(IExtensionManagementServerService, anExtensionManagementServerService(anExtensionManagementServer('vscode-local', instantiationService), anExtensionManagementServer('vscode-remote', instantiationService), null));
        const localWorkspaceExtension = aLocalExtension2('pub.a', { browser: 'browser.js' }, { location: URI.file(`pub.a`).with({ scheme: 'vscode-remote' }) });
        (instantiationService.get(IConfigurationService)).setUserConfiguration('extensions', { webWorker: true });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        assert.strictEqual(testObject.isEnabled(localWorkspaceExtension), false);
        assert.deepStrictEqual(testObject.getEnablementState(localWorkspaceExtension), 1 /* EnablementState.DisabledByExtensionKind */);
    });
    test('test web extension on remote server is enabled in web', async () => {
        instantiationService.stub(IExtensionManagementServerService, anExtensionManagementServerService(anExtensionManagementServer('vscode-local', instantiationService), anExtensionManagementServer('vscode-remote', instantiationService), anExtensionManagementServer('web', instantiationService)));
        const localWorkspaceExtension = aLocalExtension2('pub.a', { browser: 'browser.js' }, { location: URI.file(`pub.a`).with({ scheme: 'vscode-remote' }) });
        (instantiationService.get(IConfigurationService)).setUserConfiguration('extensions', { webWorker: false });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        assert.strictEqual(testObject.isEnabled(localWorkspaceExtension), true);
        assert.deepStrictEqual(testObject.getEnablementState(localWorkspaceExtension), 11 /* EnablementState.EnabledGlobally */);
    });
    test('test web extension on web server is not disabled by kind', async () => {
        instantiationService.stub(IExtensionManagementServerService, anExtensionManagementServerService(anExtensionManagementServer('vscode-local', instantiationService), anExtensionManagementServer('vscode-remote', instantiationService), anExtensionManagementServer('web', instantiationService)));
        const webExtension = aLocalExtension2('pub.a', { browser: 'browser.js' }, { location: URI.file(`pub.a`).with({ scheme: 'web' }) });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        assert.strictEqual(testObject.isEnabled(webExtension), true);
        assert.deepStrictEqual(testObject.getEnablementState(webExtension), 11 /* EnablementState.EnabledGlobally */);
    });
    test('test state of multipe extensions', async () => {
        installed.push(...[
            aLocalExtension('pub.a'),
            aLocalExtension('pub.b'),
            aLocalExtension('pub.c'),
            aLocalExtension('pub.d'),
            aLocalExtension('pub.e'),
        ]);
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        await testObject.waitUntilInitialized();
        await testObject.setEnablement([installed[0]], 9 /* EnablementState.DisabledGlobally */);
        await testObject.setEnablement([installed[1]], 10 /* EnablementState.DisabledWorkspace */);
        await testObject.setEnablement([installed[2]], 12 /* EnablementState.EnabledWorkspace */);
        await testObject.setEnablement([installed[3]], 11 /* EnablementState.EnabledGlobally */);
        assert.deepStrictEqual(testObject.getEnablementStates(installed), [
            9 /* EnablementState.DisabledGlobally */,
            10 /* EnablementState.DisabledWorkspace */,
            12 /* EnablementState.EnabledWorkspace */,
            11 /* EnablementState.EnabledGlobally */,
            11 /* EnablementState.EnabledGlobally */,
        ]);
    });
    test('test extension is disabled by dependency if it has a dependency that is disabled', async () => {
        installed.push(...[
            aLocalExtension2('pub.a'),
            aLocalExtension2('pub.b', { extensionDependencies: ['pub.a'] }),
        ]);
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        await testObject.waitUntilInitialized();
        await testObject.setEnablement([installed[0]], 9 /* EnablementState.DisabledGlobally */);
        assert.strictEqual(testObject.getEnablementState(installed[1]), 8 /* EnablementState.DisabledByExtensionDependency */);
    });
    test('test extension is disabled by dependency if it has a dependency that is disabled by virtual workspace', async () => {
        installed.push(...[
            aLocalExtension2('pub.a', { capabilities: { virtualWorkspaces: false } }),
            aLocalExtension2('pub.b', {
                extensionDependencies: ['pub.a'],
                capabilities: { virtualWorkspaces: true },
            }),
        ]);
        instantiationService.stub(IWorkspaceContextService, 'getWorkspace', {
            folders: [{ uri: URI.file('worskapceA').with({ scheme: 'virtual' }) }],
        });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        await testObject.waitUntilInitialized();
        assert.strictEqual(testObject.getEnablementState(installed[0]), 5 /* EnablementState.DisabledByVirtualWorkspace */);
        assert.strictEqual(testObject.getEnablementState(installed[1]), 8 /* EnablementState.DisabledByExtensionDependency */);
    });
    test('test canChangeEnablement return false when extension is disabled by dependency if it has a dependency that is disabled by virtual workspace', async () => {
        installed.push(...[
            aLocalExtension2('pub.a', { capabilities: { virtualWorkspaces: false } }),
            aLocalExtension2('pub.b', {
                extensionDependencies: ['pub.a'],
                capabilities: { virtualWorkspaces: true },
            }),
        ]);
        instantiationService.stub(IWorkspaceContextService, 'getWorkspace', {
            folders: [{ uri: URI.file('worskapceA').with({ scheme: 'virtual' }) }],
        });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        await testObject.waitUntilInitialized();
        assert.ok(!testObject.canChangeEnablement(installed[1]));
    });
    test('test extension is disabled by dependency if it has a dependency that is disabled by workspace trust', async () => {
        installed.push(...[
            aLocalExtension2('pub.a', {
                main: 'hello.js',
                capabilities: { untrustedWorkspaces: { supported: false, description: '' } },
            }),
            aLocalExtension2('pub.b', {
                extensionDependencies: ['pub.a'],
                capabilities: { untrustedWorkspaces: { supported: true } },
            }),
        ]);
        instantiationService.stub(IWorkspaceTrustManagementService, {
            isWorkspaceTrusted() {
                return false;
            },
        });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        await testObject.waitUntilInitialized();
        assert.strictEqual(testObject.getEnablementState(installed[0]), 0 /* EnablementState.DisabledByTrustRequirement */);
        assert.strictEqual(testObject.getEnablementState(installed[1]), 8 /* EnablementState.DisabledByExtensionDependency */);
    });
    test('test extension is not disabled by dependency if it has a dependency that is disabled by extension kind', async () => {
        instantiationService.stub(IExtensionManagementServerService, anExtensionManagementServerService(anExtensionManagementServer('vscode-local', instantiationService), anExtensionManagementServer('vscode-remote', instantiationService), null));
        const localUIExtension = aLocalExtension2('pub.a', { extensionKind: ['ui'] }, { location: URI.file(`pub.a`) });
        const remoteUIExtension = aLocalExtension2('pub.a', { extensionKind: ['ui'] }, { location: URI.file(`pub.a`).with({ scheme: Schemas.vscodeRemote }) });
        const remoteWorkspaceExtension = aLocalExtension2('pub.n', { extensionKind: ['workspace'], extensionDependencies: ['pub.a'] }, { location: URI.file(`pub.a`).with({ scheme: Schemas.vscodeRemote }) });
        installed.push(localUIExtension, remoteUIExtension, remoteWorkspaceExtension);
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        await testObject.waitUntilInitialized();
        assert.strictEqual(testObject.getEnablementState(localUIExtension), 11 /* EnablementState.EnabledGlobally */);
        assert.strictEqual(testObject.getEnablementState(remoteUIExtension), 1 /* EnablementState.DisabledByExtensionKind */);
        assert.strictEqual(testObject.getEnablementState(remoteWorkspaceExtension), 11 /* EnablementState.EnabledGlobally */);
    });
    test('test canChangeEnablement return false when extension is disabled by dependency if it has a dependency that is disabled by workspace trust', async () => {
        installed.push(...[
            aLocalExtension2('pub.a', {
                main: 'hello.js',
                capabilities: { untrustedWorkspaces: { supported: false, description: '' } },
            }),
            aLocalExtension2('pub.b', {
                extensionDependencies: ['pub.a'],
                capabilities: { untrustedWorkspaces: { supported: true } },
            }),
        ]);
        instantiationService.stub(IWorkspaceTrustManagementService, {
            isWorkspaceTrusted() {
                return false;
            },
        });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        await testObject.waitUntilInitialized();
        assert.deepEqual(testObject.canChangeEnablement(installed[1]), false);
    });
    test('test canChangeEnablement return false when extension is disabled by dependency if it has a dependency that is disabled globally', async () => {
        installed.push(...[
            aLocalExtension2('pub.a', {}),
            aLocalExtension2('pub.b', { extensionDependencies: ['pub.a'] }),
        ]);
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        await testObject.waitUntilInitialized();
        await testObject.setEnablement([installed[0]], 9 /* EnablementState.DisabledGlobally */);
        assert.deepEqual(testObject.canChangeEnablement(installed[1]), false);
    });
    test('test canChangeEnablement return false when extension is disabled by dependency if it has a dependency that is disabled workspace', async () => {
        installed.push(...[
            aLocalExtension2('pub.a', {}),
            aLocalExtension2('pub.b', { extensionDependencies: ['pub.a'] }),
        ]);
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        await testObject.waitUntilInitialized();
        await testObject.setEnablement([installed[0]], 10 /* EnablementState.DisabledWorkspace */);
        assert.deepEqual(testObject.canChangeEnablement(installed[1]), false);
    });
    test('test extension is not disabled by dependency even if it has a dependency that is disabled when installed extensions are not set', async () => {
        await testObject.setEnablement([aLocalExtension2('pub.a')], 9 /* EnablementState.DisabledGlobally */);
        assert.strictEqual(testObject.getEnablementState(aLocalExtension2('pub.b', { extensionDependencies: ['pub.a'] })), 11 /* EnablementState.EnabledGlobally */);
    });
    test('test extension is disabled by dependency if it has a dependency that is disabled when all extensions are passed', async () => {
        installed.push(...[
            aLocalExtension2('pub.a'),
            aLocalExtension2('pub.b', { extensionDependencies: ['pub.a'] }),
        ]);
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        await testObject.waitUntilInitialized();
        await testObject.setEnablement([installed[0]], 9 /* EnablementState.DisabledGlobally */);
        assert.deepStrictEqual(testObject.getEnablementStates(installed), [
            9 /* EnablementState.DisabledGlobally */,
            8 /* EnablementState.DisabledByExtensionDependency */,
        ]);
    });
    test('test extension is not disabled when it has a missing dependency', async () => {
        const target = aLocalExtension2('pub.b', { extensionDependencies: ['pub.a'] });
        installed.push(target);
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        await testObject.waitUntilInitialized();
        assert.strictEqual(testObject.getEnablementState(target), 11 /* EnablementState.EnabledGlobally */);
    });
    test('test extension is not disabled when it has a dependency in another server', async () => {
        instantiationService.stub(IExtensionManagementServerService, aMultiExtensionManagementServerService(instantiationService));
        const target = aLocalExtension2('pub.a', { extensionDependencies: ['pub.b'], extensionKind: ['ui'] }, { location: URI.file(`pub.a`) });
        const depdencyOnAnotherServer = aLocalExtension2('pub.b', {}, { location: URI.file(`pub.b`).with({ scheme: Schemas.vscodeRemote }) });
        installed.push(...[target, depdencyOnAnotherServer]);
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        await testObject.waitUntilInitialized();
        assert.strictEqual(testObject.getEnablementState(target), 11 /* EnablementState.EnabledGlobally */);
    });
    test('test extension is enabled when it has a dependency in another server which is disabled', async () => {
        instantiationService.stub(IExtensionManagementServerService, aMultiExtensionManagementServerService(instantiationService));
        const target = aLocalExtension2('pub.a', { extensionDependencies: ['pub.b'], extensionKind: ['ui'] }, { location: URI.file(`pub.a`) });
        const depdencyOnAnotherServer = aLocalExtension2('pub.b', {}, { location: URI.file(`pub.b`).with({ scheme: Schemas.vscodeRemote }) });
        installed.push(...[target, depdencyOnAnotherServer]);
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        await testObject.waitUntilInitialized();
        await testObject.setEnablement([depdencyOnAnotherServer], 9 /* EnablementState.DisabledGlobally */);
        assert.strictEqual(testObject.getEnablementState(target), 11 /* EnablementState.EnabledGlobally */);
    });
    test('test extension is enabled when it has a dependency in another server which is disabled and with no exports and no main and no browser entrypoints', async () => {
        instantiationService.stub(IExtensionManagementServerService, aMultiExtensionManagementServerService(instantiationService));
        const target = aLocalExtension2('pub.a', { extensionDependencies: ['pub.b'], extensionKind: ['ui'] }, { location: URI.file(`pub.a`) });
        const depdencyOnAnotherServer = aLocalExtension2('pub.b', { api: 'none' }, { location: URI.file(`pub.b`).with({ scheme: Schemas.vscodeRemote }) });
        installed.push(...[target, depdencyOnAnotherServer]);
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        await testObject.waitUntilInitialized();
        await testObject.setEnablement([depdencyOnAnotherServer], 9 /* EnablementState.DisabledGlobally */);
        assert.strictEqual(testObject.getEnablementState(target), 11 /* EnablementState.EnabledGlobally */);
    });
    test('test extension is disabled by dependency when it has a dependency in another server  which is disabled and with no exports and has main entry point', async () => {
        instantiationService.stub(IExtensionManagementServerService, aMultiExtensionManagementServerService(instantiationService));
        const target = aLocalExtension2('pub.a', { extensionDependencies: ['pub.b'], extensionKind: ['ui'] }, { location: URI.file(`pub.a`) });
        const depdencyOnAnotherServer = aLocalExtension2('pub.b', { api: 'none', main: 'main.js' }, { location: URI.file(`pub.b`).with({ scheme: Schemas.vscodeRemote }) });
        installed.push(...[target, depdencyOnAnotherServer]);
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        await testObject.waitUntilInitialized();
        await testObject.setEnablement([depdencyOnAnotherServer], 9 /* EnablementState.DisabledGlobally */);
        assert.strictEqual(testObject.getEnablementState(target), 8 /* EnablementState.DisabledByExtensionDependency */);
    });
    test('test extension is disabled by dependency when it has a dependency in another server  which is disabled and with no exports and has browser entry point', async () => {
        instantiationService.stub(IExtensionManagementServerService, aMultiExtensionManagementServerService(instantiationService));
        const target = aLocalExtension2('pub.a', { extensionDependencies: ['pub.b'] }, { location: URI.file(`pub.a`).with({ scheme: Schemas.vscodeRemote }) });
        const depdencyOnAnotherServer = aLocalExtension2('pub.b', { api: 'none', browser: 'browser.js', extensionKind: 'ui' }, { location: URI.file(`pub.b`) });
        installed.push(...[target, depdencyOnAnotherServer]);
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        await testObject.waitUntilInitialized();
        await testObject.setEnablement([depdencyOnAnotherServer], 9 /* EnablementState.DisabledGlobally */);
        assert.strictEqual(testObject.getEnablementState(target), 8 /* EnablementState.DisabledByExtensionDependency */);
    });
    test('test extension is disabled by invalidity', async () => {
        const target = aLocalExtension2('pub.b', {}, { isValid: false });
        assert.strictEqual(testObject.getEnablementState(target), 6 /* EnablementState.DisabledByInvalidExtension */);
    });
    test('test extension is disabled by dependency when it has a dependency that is invalid', async () => {
        const target = aLocalExtension2('pub.b', { extensionDependencies: ['pub.a'] });
        installed.push(...[target, aLocalExtension2('pub.a', {}, { isValid: false })]);
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        await testObject.waitUntilInitialized();
        assert.strictEqual(testObject.getEnablementState(target), 8 /* EnablementState.DisabledByExtensionDependency */);
    });
    test('test extension is enabled when its dependency becomes valid', async () => {
        const extension = aLocalExtension2('pub.b', { extensionDependencies: ['pub.a'] });
        installed.push(...[extension, aLocalExtension2('pub.a', {}, { isValid: false })]);
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        await testObject.waitUntilInitialized();
        assert.strictEqual(testObject.getEnablementState(extension), 8 /* EnablementState.DisabledByExtensionDependency */);
        const target = sinon.spy();
        disposableStore.add(testObject.onEnablementChanged(target));
        const validExtension = aLocalExtension2('pub.a');
        didInstallEvent.fire([
            {
                identifier: validExtension.identifier,
                operation: 2 /* InstallOperation.Install */,
                source: validExtension.location,
                profileLocation: validExtension.location,
                local: validExtension,
            },
        ]);
        assert.strictEqual(testObject.getEnablementState(extension), 11 /* EnablementState.EnabledGlobally */);
        assert.deepStrictEqual(target.args[0][0][0].identifier, { id: 'pub.b' });
    });
    test('test override workspace to trusted when getting extensions enablements', async () => {
        const extension = aLocalExtension2('pub.a', {
            main: 'main.js',
            capabilities: { untrustedWorkspaces: { supported: false, description: 'hello' } },
        });
        instantiationService.stub(IWorkspaceTrustManagementService, {
            isWorkspaceTrusted() {
                return false;
            },
        });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        assert.strictEqual(testObject.getEnablementStates([extension], { trusted: true })[0], 11 /* EnablementState.EnabledGlobally */);
    });
    test('test override workspace to not trusted when getting extensions enablements', async () => {
        const extension = aLocalExtension2('pub.a', {
            main: 'main.js',
            capabilities: { untrustedWorkspaces: { supported: false, description: 'hello' } },
        });
        instantiationService.stub(IWorkspaceTrustManagementService, {
            isWorkspaceTrusted() {
                return true;
            },
        });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        assert.strictEqual(testObject.getEnablementStates([extension], { trusted: false })[0], 0 /* EnablementState.DisabledByTrustRequirement */);
    });
    test('test update extensions enablements on trust change triggers change events for extensions depending on workspace trust', async () => {
        installed.push(...[
            aLocalExtension2('pub.a', {
                main: 'main.js',
                capabilities: { untrustedWorkspaces: { supported: false, description: 'hello' } },
            }),
            aLocalExtension2('pub.b', {
                main: 'main.js',
                capabilities: { untrustedWorkspaces: { supported: true } },
            }),
            aLocalExtension2('pub.c', {
                main: 'main.js',
                capabilities: { untrustedWorkspaces: { supported: false, description: 'hello' } },
            }),
            aLocalExtension2('pub.d', {
                main: 'main.js',
                capabilities: { untrustedWorkspaces: { supported: true } },
            }),
        ]);
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        const target = sinon.spy();
        disposableStore.add(testObject.onEnablementChanged(target));
        await testObject.updateExtensionsEnablementsWhenWorkspaceTrustChanges();
        assert.strictEqual(target.args[0][0].length, 2);
        assert.deepStrictEqual(target.args[0][0][0].identifier, { id: 'pub.a' });
        assert.deepStrictEqual(target.args[0][0][1].identifier, { id: 'pub.c' });
    });
    test('test adding an extension that was disabled', async () => {
        const extension = aLocalExtension('pub.a');
        installed.push(extension);
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        await testObject.setEnablement([extension], 9 /* EnablementState.DisabledGlobally */);
        const target = sinon.spy();
        disposableStore.add(testObject.onEnablementChanged(target));
        didChangeProfileExtensionsEvent.fire({ added: [extension], removed: [] });
        assert.ok(!testObject.isEnabled(extension));
        assert.strictEqual(testObject.getEnablementState(extension), 9 /* EnablementState.DisabledGlobally */);
        assert.strictEqual(target.args[0][0].length, 1);
        assert.deepStrictEqual(target.args[0][0][0].identifier, { id: 'pub.a' });
    });
    test('test extension is disabled by allowed list', async () => {
        const target = aLocalExtension2('unallowed.extension');
        assert.strictEqual(testObject.getEnablementState(target), 7 /* EnablementState.DisabledByAllowlist */);
    });
    test('test extension is disabled by malicious', async () => {
        malicious.push({ id: 'malicious.extensionA' });
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        await testObject.waitUntilInitialized();
        const target = aLocalExtension2('malicious.extensionA');
        assert.strictEqual(testObject.getEnablementState(target), 4 /* EnablementState.DisabledByMalicious */);
    });
    test('test installed malicious extension triggers change event', async () => {
        testObject.dispose();
        malicious.push({ id: 'malicious.extensionB' });
        const local = aLocalExtension2('malicious.extensionB');
        installed.push(local);
        testObject = disposableStore.add(new TestExtensionEnablementService(instantiationService));
        assert.strictEqual(testObject.getEnablementState(local), 11 /* EnablementState.EnabledGlobally */);
        const promise = Event.toPromise(testObject.onEnablementChanged);
        const result = await promise;
        assert.deepStrictEqual(result[0], local);
        assert.strictEqual(testObject.getEnablementState(local), 4 /* EnablementState.DisabledByMalicious */);
    });
});
function anExtensionManagementServer(authority, instantiationService) {
    return {
        id: authority,
        label: authority,
        extensionManagementService: instantiationService.get(IExtensionManagementService),
    };
}
function aMultiExtensionManagementServerService(instantiationService) {
    const localExtensionManagementServer = anExtensionManagementServer('vscode-local', instantiationService);
    const remoteExtensionManagementServer = anExtensionManagementServer('vscode-remote', instantiationService);
    return anExtensionManagementServerService(localExtensionManagementServer, remoteExtensionManagementServer, null);
}
export function anExtensionManagementServerService(localExtensionManagementServer, remoteExtensionManagementServer, webExtensionManagementServer) {
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
            return webExtensionManagementServer;
        },
        getExtensionInstallLocation(extension) {
            const server = this.getExtensionManagementServer(extension);
            return server === remoteExtensionManagementServer
                ? 2 /* ExtensionInstallLocation.Remote */
                : server === webExtensionManagementServer
                    ? 3 /* ExtensionInstallLocation.Web */
                    : 1 /* ExtensionInstallLocation.Local */;
        },
    };
}
function aLocalExtension(id, contributes, type) {
    return aLocalExtension2(id, contributes ? { contributes } : {}, isUndefinedOrNull(type) ? {} : { type });
}
function aLocalExtension2(id, manifest = {}, properties = {}) {
    const [publisher, name] = id.split('.');
    manifest = { name, publisher, ...manifest };
    properties = {
        identifier: { id },
        location: URI.file(`pub.${name}`),
        galleryIdentifier: { id, uuid: undefined },
        type: 1 /* ExtensionType.User */,
        ...properties,
        isValid: properties.isValid ?? true,
    };
    properties.isBuiltin = properties.type === 0 /* ExtensionType.System */;
    return Object.create({ manifest, ...properties });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uRW5hYmxlbWVudFNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2V4dGVuc2lvbk1hbmFnZW1lbnQvdGVzdC9icm93c2VyL2V4dGVuc2lvbkVuYWJsZW1lbnRTZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sS0FBSyxLQUFLLE1BQU0sT0FBTyxDQUFBO0FBQzlCLE9BQU8sRUFDTiwyQkFBMkIsRUFRM0IseUJBQXlCLEVBQ3pCLDBCQUEwQixHQUUxQixNQUFNLDJFQUEyRSxDQUFBO0FBQ2xGLE9BQU8sRUFFTixpQ0FBaUMsRUFFakMsb0NBQW9DLEdBSXBDLE1BQU0scUNBQXFDLENBQUE7QUFDNUMsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDeEYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUE7QUFDeEgsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUNwRSxPQUFPLEVBRU4sd0JBQXdCLEdBRXhCLE1BQU0sdURBQXVELENBQUE7QUFDOUQsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDaEcsT0FBTyxFQUNOLGVBQWUsRUFDZixzQkFBc0IsR0FDdEIsTUFBTSxtREFBbUQsQ0FBQTtBQVExRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQTtBQUNqSCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0Qs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