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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uRW5hYmxlbWVudFNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9leHRlbnNpb25NYW5hZ2VtZW50L3Rlc3QvYnJvd3Nlci9leHRlbnNpb25FbmFibGVtZW50U2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEtBQUssS0FBSyxNQUFNLE9BQU8sQ0FBQTtBQUM5QixPQUFPLEVBQ04sMkJBQTJCLEVBUTNCLHlCQUF5QixFQUN6QiwwQkFBMEIsR0FFMUIsTUFBTSwyRUFBMkUsQ0FBQTtBQUNsRixPQUFPLEVBRU4saUNBQWlDLEVBRWpDLG9DQUFvQyxHQUlwQyxNQUFNLHFDQUFxQyxDQUFBO0FBQzVDLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQ3hGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxDQUFBO0FBQ3hILE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDcEUsT0FBTyxFQUVOLHdCQUF3QixHQUV4QixNQUFNLHVEQUF1RCxDQUFBO0FBQzlELE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ2hHLE9BQU8sRUFDTixlQUFlLEVBQ2Ysc0JBQXNCLEdBQ3RCLE1BQU0sbURBQW1ELENBQUE7QUFRMUQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDdkUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sK0VBQStFLENBQUE7QUFDakgsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDckcsT0FBTyxFQUFFLEdB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