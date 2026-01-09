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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlVHJ1c3QudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3dvcmtzcGFjZXMvdGVzdC9jb21tb24vd29ya3NwYWNlVHJ1c3QudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNyRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQTtBQUN4SCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scURBQXFELENBQUE7QUFDakYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUE7QUFDeEgsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQzFFLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLGtFQUFrRSxDQUFBO0FBQ2xILE9BQU8sRUFDTixlQUFlLEdBR2YsTUFBTSxtREFBbUQsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUNoRyxPQUFPLEVBQ04sZ0NBQWdDLEdBRWhDLE1BQU0sNERBQTRELENBQUE7QUFDbkUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGdFQUFnRSxDQUFBO0FBQzFGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNo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