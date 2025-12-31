/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { URI } from '../../../../../base/common/uri.js';
import { mock } from '../../../../../base/test/common/mock.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { FileService } from '../../../../../platform/files/common/fileService.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { IRemoteAuthorityResolverService } from '../../../../../platform/remote/common/remoteAuthorityResolver.js';
import { IStorageService, } from '../../../../../platform/storage/common/storage.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { IWorkspaceTrustEnablementService, } from '../../../../../platform/workspace/common/workspaceTrust.js';
import { Workspace } from '../../../../../platform/workspace/test/common/testWorkspace.js';
import { Memento } from '../../../../common/memento.js';
import { IWorkbenchEnvironmentService } from '../../../environment/common/environmentService.js';
import { IUriIdentityService } from '../../../../../platform/uriIdentity/common/uriIdentity.js';
import { UriIdentityService } from '../../../../../platform/uriIdentity/common/uriIdentityService.js';
import { WorkspaceTrustEnablementService, WorkspaceTrustManagementService, WORKSPACE_TRUST_STORAGE_KEY, } from '../../common/workspaceTrust.js';
import { TestContextService, TestStorageService, TestWorkspaceTrustEnablementService, } from '../../../../test/common/workbenchTestServices.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
suite('Workspace Trust', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let instantiationService;
    let configurationService;
    let environmentService;
    setup(async () => {
        instantiationService = store.add(new TestInstantiationService());
        configurationService = new TestConfigurationService();
        instantiationService.stub(IConfigurationService, configurationService);
        environmentService = {};
        instantiationService.stub(IWorkbenchEnvironmentService, environmentService);
        const fileService = store.add(new FileService(new NullLogService()));
        const uriIdentityService = store.add(new UriIdentityService(fileService));
        instantiationService.stub(IUriIdentityService, uriIdentityService);
        instantiationService.stub(IRemoteAuthorityResolverService, new (class extends mock() {
        })());
    });
    suite('Enablement', () => {
        test('workspace trust enabled', async () => {
            await configurationService.setUserConfiguration('security', getUserSettings(true, true));
            const testObject = store.add(instantiationService.createInstance(WorkspaceTrustEnablementService));
            assert.strictEqual(testObject.isWorkspaceTrustEnabled(), true);
        });
        test('workspace trust disabled (user setting)', async () => {
            await configurationService.setUserConfiguration('security', getUserSettings(false, true));
            const testObject = store.add(instantiationService.createInstance(WorkspaceTrustEnablementService));
            assert.strictEqual(testObject.isWorkspaceTrustEnabled(), false);
        });
        test('workspace trust disabled (--disable-workspace-trust)', () => {
            instantiationService.stub(IWorkbenchEnvironmentService, {
                ...environmentService,
                disableWorkspaceTrust: true,
            });
            const testObject = store.add(instantiationService.createInstance(WorkspaceTrustEnablementService));
            assert.strictEqual(testObject.isWorkspaceTrustEnabled(), false);
        });
    });
    suite('Management', () => {
        let storageService;
        let workspaceService;
        teardown(() => {
            Memento.clear(1 /* StorageScope.WORKSPACE */);
        });
        setup(() => {
            storageService = store.add(new TestStorageService());
            instantiationService.stub(IStorageService, storageService);
            workspaceService = new TestContextService();
            instantiationService.stub(IWorkspaceContextService, workspaceService);
            instantiationService.stub(IWorkspaceTrustEnablementService, new TestWorkspaceTrustEnablementService());
        });
        test('empty workspace - trusted', async () => {
            await configurationService.setUserConfiguration('security', getUserSettings(true, true));
            workspaceService.setWorkspace(new Workspace('empty-workspace'));
            const testObject = await initializeTestObject();
            assert.strictEqual(true, testObject.isWorkspaceTrusted());
        });
        test('empty workspace - untrusted', async () => {
            await configurationService.setUserConfiguration('security', getUserSettings(true, false));
            workspaceService.setWorkspace(new Workspace('empty-workspace'));
            const testObject = await initializeTestObject();
            assert.strictEqual(false, testObject.isWorkspaceTrusted());
        });
        test('empty workspace - trusted, open trusted file', async () => {
            await configurationService.setUserConfiguration('security', getUserSettings(true, true));
            const trustInfo = {
                uriTrustInfo: [{ uri: URI.parse('file:///Folder'), trusted: true }],
            };
            storageService.store(WORKSPACE_TRUST_STORAGE_KEY, JSON.stringify(trustInfo), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
            environmentService.filesToOpenOrCreate = [
                { fileUri: URI.parse('file:///Folder/file.txt') },
            ];
            instantiationService.stub(IWorkbenchEnvironmentService, { ...environmentService });
            workspaceService.setWorkspace(new Workspace('empty-workspace'));
            const testObject = await initializeTestObject();
            assert.strictEqual(true, testObject.isWorkspaceTrusted());
        });
        test('empty workspace - trusted, open untrusted file', async () => {
            await configurationService.setUserConfiguration('security', getUserSettings(true, true));
            environmentService.filesToOpenOrCreate = [
                { fileUri: URI.parse('file:///Folder/foo.txt') },
            ];
            instantiationService.stub(IWorkbenchEnvironmentService, { ...environmentService });
            workspaceService.setWorkspace(new Workspace('empty-workspace'));
            const testObject = await initializeTestObject();
            assert.strictEqual(false, testObject.isWorkspaceTrusted());
        });
        async function initializeTestObject() {
            const workspaceTrustManagementService = store.add(instantiationService.createInstance(WorkspaceTrustManagementService));
            await workspaceTrustManagementService.workspaceTrustInitialized;
            return workspaceTrustManagementService;
        }
    });
    function getUserSettings(enabled, emptyWindow) {
        return { workspace: { trust: { emptyWindow, enabled } } };
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlVHJ1c3QudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy93b3Jrc3BhY2VzL3Rlc3QvY29tbW9uL3dvcmtzcGFjZVRydXN0LnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDOUQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDckcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUE7QUFDeEgsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQ2pGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxDQUFBO0FBQ3hILE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsK0JBQStCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQTtBQUNsSCxPQUFPLEVBQ04sZUFBZSxHQUdmLE1BQU0sbURBQW1ELENBQUE7QUFDMUQsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDaEcsT0FBTyxFQUNOLGdDQUFnQyxHQUVoQyxNQUFNLDREQUE0RCxDQUFBO0FBQ25FLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQTtBQUMxRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDdkQsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDaEcsT0FBTyxFQUFFLG1CQUFtQixFQUFF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