/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as sinon from 'sinon';
import { URI } from '../../../../../base/common/uri.js';
import { Registry } from '../../../../../platform/registry/common/platform.js';
import { IEnvironmentService } from '../../../../../platform/environment/common/environment.js';
import { Extensions as ConfigurationExtensions, keyFromOverrideIdentifiers, } from '../../../../../platform/configuration/common/configurationRegistry.js';
import { WorkspaceService } from '../../browser/configurationService.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { IWorkspaceContextService, } from '../../../../../platform/workspace/common/workspace.js';
import { IConfigurationService, } from '../../../../../platform/configuration/common/configuration.js';
import { workbenchInstantiationService, RemoteFileSystemProvider, TestEnvironmentService, TestTextFileService, } from '../../../../test/browser/workbenchTestServices.js';
import { ITextFileService } from '../../../textfile/common/textfiles.js';
import { ITextModelService } from '../../../../../editor/common/services/resolverService.js';
import { TextModelResolverService } from '../../../textmodelResolver/common/textModelResolverService.js';
import { IJSONEditingService } from '../../common/jsonEditing.js';
import { JSONEditingService } from '../../common/jsonEditingService.js';
import { Schemas } from '../../../../../base/common/network.js';
import { joinPath, dirname, basename } from '../../../../../base/common/resources.js';
import { isLinux, isMacintosh } from '../../../../../base/common/platform.js';
import { IRemoteAgentService } from '../../../remote/common/remoteAgentService.js';
import { FileService } from '../../../../../platform/files/common/fileService.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { APPLY_ALL_PROFILES_SETTING } from '../../common/configuration.js';
import { SignService } from '../../../../../platform/sign/browser/signService.js';
import { FileUserDataProvider } from '../../../../../platform/userData/common/fileUserDataProvider.js';
import { IKeybindingEditingService, KeybindingsEditingService, } from '../../../keybinding/common/keybindingEditing.js';
import { IWorkbenchEnvironmentService } from '../../../environment/common/environmentService.js';
import { timeout } from '../../../../../base/common/async.js';
import { VSBuffer } from '../../../../../base/common/buffer.js';
import { Event } from '../../../../../base/common/event.js';
import { UriIdentityService } from '../../../../../platform/uriIdentity/common/uriIdentityService.js';
import { InMemoryFileSystemProvider } from '../../../../../platform/files/common/inMemoryFilesystemProvider.js';
import { RemoteAgentService } from '../../../remote/browser/remoteAgentService.js';
import { RemoteAuthorityResolverService } from '../../../../../platform/remote/browser/remoteAuthorityResolverService.js';
import { hash } from '../../../../../base/common/hash.js';
import { TestProductService } from '../../../../test/common/workbenchTestServices.js';
import { IUserDataProfilesService, toUserDataProfile, UserDataProfilesService, } from '../../../../../platform/userDataProfile/common/userDataProfile.js';
import { NullPolicyService } from '../../../../../platform/policy/common/policy.js';
import { FilePolicyService } from '../../../../../platform/policy/common/filePolicyService.js';
import { runWithFakedTimers } from '../../../../../base/test/common/timeTravelScheduler.js';
import { UserDataProfileService } from '../../../userDataProfile/common/userDataProfileService.js';
import { IUserDataProfileService } from '../../../userDataProfile/common/userDataProfile.js';
import { RemoteSocketFactoryService } from '../../../../../platform/remote/common/remoteSocketFactoryService.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
function convertToWorkspacePayload(folder) {
    return {
        id: hash(folder.toString()).toString(16),
        uri: folder,
    };
}
class ConfigurationCache {
    needsCaching(resource) {
        return false;
    }
    async read() {
        return '';
    }
    async write() { }
    async remove() { }
}
const ROOT = URI.file('tests').with({ scheme: 'vscode-tests' });
suite('WorkspaceContextService - Folder', () => {
    const folderName = 'Folder A';
    let folder;
    let testObject;
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    setup(async () => {
        const logService = new NullLogService();
        const fileService = disposables.add(new FileService(logService));
        const fileSystemProvider = disposables.add(new InMemoryFileSystemProvider());
        disposables.add(fileService.registerProvider(ROOT.scheme, fileSystemProvider));
        folder = joinPath(ROOT, folderName);
        await fileService.createFolder(folder);
        const environmentService = TestEnvironmentService;
        const uriIdentityService = disposables.add(new UriIdentityService(fileService));
        const userDataProfilesService = disposables.add(new UserDataProfilesService(environmentService, fileService, uriIdentityService, logService));
        disposables.add(fileService.registerProvider(Schemas.vscodeUserData, disposables.add(new FileUserDataProvider(ROOT.scheme, fileSystemProvider, Schemas.vscodeUserData, userDataProfilesService, uriIdentityService, new NullLogService()))));
        const userDataProfileService = disposables.add(new UserDataProfileService(userDataProfilesService.defaultProfile));
        testObject = disposables.add(new WorkspaceService({ configurationCache: new ConfigurationCache() }, environmentService, userDataProfileService, userDataProfilesService, fileService, disposables.add(new RemoteAgentService(new RemoteSocketFactoryService(), userDataProfileService, environmentService, TestProductService, disposables.add(new RemoteAuthorityResolverService(false, undefined, undefined, undefined, TestProductService, logService)), new SignService(TestProductService), new NullLogService())), uriIdentityService, new NullLogService(), new NullPolicyService()));
        await testObject.initialize(convertToWorkspacePayload(folder));
    });
    test('getWorkspace()', () => {
        const actual = testObject.getWorkspace();
        assert.strictEqual(actual.folders.length, 1);
        assert.strictEqual(actual.folders[0].uri.path, folder.path);
        assert.strictEqual(actual.folders[0].name, folderName);
        assert.strictEqual(actual.folders[0].index, 0);
        assert.ok(!actual.configuration);
    });
    test('getWorkbenchState()', () => {
        const actual = testObject.getWorkbenchState();
        assert.strictEqual(actual, 2 /* WorkbenchState.FOLDER */);
    });
    test('getWorkspaceFolder()', () => {
        const actual = testObject.getWorkspaceFolder(joinPath(folder, 'a'));
        assert.strictEqual(actual, testObject.getWorkspace().folders[0]);
    });
    test('getWorkspaceFolder() - queries in workspace folder', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const logService = new NullLogService();
        const fileService = disposables.add(new FileService(logService));
        const fileSystemProvider = disposables.add(new InMemoryFileSystemProvider());
        disposables.add(fileService.registerProvider(ROOT.scheme, fileSystemProvider));
        const folder = joinPath(ROOT, folderName).with({ query: 'myquery=1' });
        await fileService.createFolder(folder);
        const environmentService = TestEnvironmentService;
        const uriIdentityService = disposables.add(new UriIdentityService(fileService));
        const userDataProfilesService = disposables.add(new UserDataProfilesService(environmentService, fileService, uriIdentityService, logService));
        disposables.add(fileService.registerProvider(Schemas.vscodeUserData, disposables.add(new FileUserDataProvider(ROOT.scheme, fileSystemProvider, Schemas.vscodeUserData, userDataProfilesService, uriIdentityService, new NullLogService()))));
        const userDataProfileService = disposables.add(new UserDataProfileService(userDataProfilesService.defaultProfile));
        const testObject = disposables.add(new WorkspaceService({ configurationCache: new ConfigurationCache() }, environmentService, userDataProfileService, userDataProfilesService, fileService, disposables.add(new RemoteAgentService(new RemoteSocketFactoryService(), userDataProfileService, environmentService, TestProductService, disposables.add(new RemoteAuthorityResolverService(false, undefined, undefined, undefined, TestProductService, logService)), new SignService(TestProductService), new NullLogService())), uriIdentityService, new NullLogService(), new NullPolicyService()));
        await testObject.initialize(convertToWorkspacePayload(folder));
        const actual = testObject.getWorkspaceFolder(joinPath(folder, 'a'));
        assert.strictEqual(actual, testObject.getWorkspace().folders[0]);
    }));
    test('getWorkspaceFolder() - queries in resource', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const logService = new NullLogService();
        const fileService = disposables.add(new FileService(logService));
        const fileSystemProvider = disposables.add(new InMemoryFileSystemProvider());
        disposables.add(fileService.registerProvider(ROOT.scheme, fileSystemProvider));
        const folder = joinPath(ROOT, folderName);
        await fileService.createFolder(folder);
        const environmentService = TestEnvironmentService;
        const uriIdentityService = disposables.add(new UriIdentityService(fileService));
        const userDataProfilesService = disposables.add(new UserDataProfilesService(environmentService, fileService, uriIdentityService, logService));
        disposables.add(fileService.registerProvider(Schemas.vscodeUserData, disposables.add(new FileUserDataProvider(ROOT.scheme, fileSystemProvider, Schemas.vscodeUserData, userDataProfilesService, uriIdentityService, new NullLogService()))));
        const userDataProfileService = disposables.add(new UserDataProfileService(userDataProfilesService.defaultProfile));
        const testObject = disposables.add(new WorkspaceService({ configurationCache: new ConfigurationCache() }, environmentService, userDataProfileService, userDataProfilesService, fileService, disposables.add(new RemoteAgentService(new RemoteSocketFactoryService(), userDataProfileService, environmentService, TestProductService, disposables.add(new RemoteAuthorityResolverService(false, undefined, undefined, undefined, TestProductService, logService)), new SignService(TestProductService), new NullLogService())), uriIdentityService, new NullLogService(), new NullPolicyService()));
        await testObject.initialize(convertToWorkspacePayload(folder));
        const actual = testObject.getWorkspaceFolder(joinPath(folder, 'a').with({ query: 'myquery=1' }));
        assert.strictEqual(actual, testObject.getWorkspace().folders[0]);
    }));
    test('isCurrentWorkspace() => true', () => {
        assert.ok(testObject.isCurrentWorkspace(folder));
    });
    test('isCurrentWorkspace() => false', () => {
        assert.ok(!testObject.isCurrentWorkspace(joinPath(dirname(folder), 'abc')));
    });
    test('workspace is complete', () => testObject.getCompleteWorkspace());
});
suite('WorkspaceContextService - Workspace', () => {
    let testObject;
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    setup(async () => {
        const logService = new NullLogService();
        const fileService = disposables.add(new FileService(logService));
        const fileSystemProvider = disposables.add(new InMemoryFileSystemProvider());
        disposables.add(fileService.registerProvider(ROOT.scheme, fileSystemProvider));
        const appSettingsHome = joinPath(ROOT, 'user');
        const folderA = joinPath(ROOT, 'a');
        const folderB = joinPath(ROOT, 'b');
        const configResource = joinPath(ROOT, 'vsctests.code-workspace');
        const workspace = { folders: [{ path: folderA.path }, { path: folderB.path }] };
        await fileService.createFolder(appSettingsHome);
        await fileService.createFolder(folderA);
        await fileService.createFolder(folderB);
        await fileService.writeFile(configResource, VSBuffer.fromString(JSON.stringify(workspace, null, '\t')));
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        const environmentService = TestEnvironmentService;
        const remoteAgentService = disposables.add(disposables.add(instantiationService.createInstance(RemoteAgentService)));
        instantiationService.stub(IRemoteAgentService, remoteAgentService);
        const uriIdentityService = disposables.add(new UriIdentityService(fileService));
        const userDataProfilesService = instantiationService.stub(IUserDataProfilesService, disposables.add(new UserDataProfilesService(environmentService, fileService, uriIdentityService, logService)));
        disposables.add(fileService.registerProvider(Schemas.vscodeUserData, disposables.add(new FileUserDataProvider(ROOT.scheme, fileSystemProvider, Schemas.vscodeUserData, userDataProfilesService, uriIdentityService, new NullLogService()))));
        testObject = disposables.add(new WorkspaceService({ configurationCache: new ConfigurationCache() }, environmentService, disposables.add(new UserDataProfileService(userDataProfilesService.defaultProfile)), userDataProfilesService, fileService, remoteAgentService, uriIdentityService, new NullLogService(), new NullPolicyService()));
        instantiationService.stub(IWorkspaceContextService, testObject);
        instantiationService.stub(IConfigurationService, testObject);
        instantiationService.stub(IEnvironmentService, environmentService);
        await testObject.initialize(getWorkspaceIdentifier(configResource));
        testObject.acquireInstantiationService(instantiationService);
    });
    test('workspace folders', () => {
        const actual = testObject.getWorkspace().folders;
        assert.strictEqual(actual.length, 2);
        assert.strictEqual(basename(actual[0].uri), 'a');
        assert.strictEqual(basename(actual[1].uri), 'b');
    });
    test('getWorkbenchState()', () => {
        const actual = testObject.getWorkbenchState();
        assert.strictEqual(actual, 3 /* WorkbenchState.WORKSPACE */);
    });
    test('workspace is complete', () => testObject.getCompleteWorkspace());
});
suite('WorkspaceContextService - Workspace Editing', () => {
    let testObject, fileService;
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    setup(async () => {
        const logService = new NullLogService();
        fileService = disposables.add(new FileService(logService));
        const fileSystemProvider = disposables.add(new InMemoryFileSystemProvider());
        disposables.add(fileService.registerProvider(ROOT.scheme, fileSystemProvider));
        const appSettingsHome = joinPath(ROOT, 'user');
        const folderA = joinPath(ROOT, 'a');
        const folderB = joinPath(ROOT, 'b');
        const configResource = joinPath(ROOT, 'vsctests.code-workspace');
        const workspace = { folders: [{ path: folderA.path }, { path: folderB.path }] };
        await fileService.createFolder(appSettingsHome);
        await fileService.createFolder(folderA);
        await fileService.createFolder(folderB);
        await fileService.writeFile(configResource, VSBuffer.fromString(JSON.stringify(workspace, null, '\t')));
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        const environmentService = TestEnvironmentService;
        const remoteAgentService = disposables.add(instantiationService.createInstance(RemoteAgentService));
        instantiationService.stub(IRemoteAgentService, remoteAgentService);
        const uriIdentityService = disposables.add(new UriIdentityService(fileService));
        const userDataProfilesService = instantiationService.stub(IUserDataProfilesService, disposables.add(new UserDataProfilesService(environmentService, fileService, uriIdentityService, logService)));
        disposables.add(fileService.registerProvider(Schemas.vscodeUserData, disposables.add(new FileUserDataProvider(ROOT.scheme, fileSystemProvider, Schemas.vscodeUserData, userDataProfilesService, uriIdentityService, new NullLogService()))));
        testObject = disposables.add(new WorkspaceService({ configurationCache: new ConfigurationCache() }, environmentService, disposables.add(new UserDataProfileService(userDataProfilesService.defaultProfile)), userDataProfilesService, fileService, remoteAgentService, uriIdentityService, new NullLogService(), new NullPolicyService()));
        instantiationService.stub(IFileService, fileService);
        instantiationService.stub(IWorkspaceContextService, testObject);
        instantiationService.stub(IConfigurationService, testObject);
        instantiationService.stub(IEnvironmentService, environmentService);
        await testObject.initialize(getWorkspaceIdentifier(configResource));
        instantiationService.stub(ITextFileService, disposables.add(instantiationService.createInstance(TestTextFileService)));
        instantiationService.stub(ITextModelService, disposables.add(instantiationService.createInstance(TextModelResolverService)));
        instantiationService.stub(IJSONEditingService, instantiationService.createInstance(JSONEditingService));
        testObject.acquireInstantiationService(instantiationService);
    });
    test('add folders', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await testObject.addFolders([{ uri: joinPath(ROOT, 'd') }, { uri: joinPath(ROOT, 'c') }]);
        const actual = testObject.getWorkspace().folders;
        assert.strictEqual(actual.length, 4);
        assert.strictEqual(basename(actual[0].uri), 'a');
        assert.strictEqual(basename(actual[1].uri), 'b');
        assert.strictEqual(basename(actual[2].uri), 'd');
        assert.strictEqual(basename(actual[3].uri), 'c');
    }));
    test('add folders (at specific index)', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await testObject.addFolders([{ uri: joinPath(ROOT, 'd') }, { uri: joinPath(ROOT, 'c') }], 0);
        const actual = testObject.getWorkspace().folders;
        assert.strictEqual(actual.length, 4);
        assert.strictEqual(basename(actual[0].uri), 'd');
        assert.strictEqual(basename(actual[1].uri), 'c');
        assert.strictEqual(basename(actual[2].uri), 'a');
        assert.strictEqual(basename(actual[3].uri), 'b');
    }));
    test('add folders (at specific wrong index)', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await testObject.addFolders([{ uri: joinPath(ROOT, 'd') }, { uri: joinPath(ROOT, 'c') }], 10);
        const actual = testObject.getWorkspace().folders;
        assert.strictEqual(actual.length, 4);
        assert.strictEqual(basename(actual[0].uri), 'a');
        assert.strictEqual(basename(actual[1].uri), 'b');
        assert.strictEqual(basename(actual[2].uri), 'd');
        assert.strictEqual(basename(actual[3].uri), 'c');
    }));
    test('add folders (with name)', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await testObject.addFolders([
            { uri: joinPath(ROOT, 'd'), name: 'DDD' },
            { uri: joinPath(ROOT, 'c'), name: 'CCC' },
        ]);
        const actual = testObject.getWorkspace().folders;
        assert.strictEqual(actual.length, 4);
        assert.strictEqual(basename(actual[0].uri), 'a');
        assert.strictEqual(basename(actual[1].uri), 'b');
        assert.strictEqual(basename(actual[2].uri), 'd');
        assert.strictEqual(basename(actual[3].uri), 'c');
        assert.strictEqual(actual[2].name, 'DDD');
        assert.strictEqual(actual[3].name, 'CCC');
    }));
    test('add folders triggers change event', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const target = sinon.spy();
        disposables.add(testObject.onWillChangeWorkspaceFolders(target));
        disposables.add(testObject.onDidChangeWorkspaceFolders(target));
        const addedFolders = [{ uri: joinPath(ROOT, 'd') }, { uri: joinPath(ROOT, 'c') }];
        await testObject.addFolders(addedFolders);
        assert.strictEqual(target.callCount, 2, `Should be called only once but called ${target.callCount} times`);
        const actual_1 = target.args[1][0];
        assert.deepStrictEqual(actual_1.added.map((r) => r.uri.toString()), addedFolders.map((a) => a.uri.toString()));
        assert.deepStrictEqual(actual_1.removed, []);
        assert.deepStrictEqual(actual_1.changed, []);
    }));
    test('remove folders', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await testObject.removeFolders([testObject.getWorkspace().folders[0].uri]);
        const actual = testObject.getWorkspace().folders;
        assert.strictEqual(actual.length, 1);
        assert.strictEqual(basename(actual[0].uri), 'b');
    }));
    test('remove folders triggers change event', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const target = sinon.spy();
        disposables.add(testObject.onWillChangeWorkspaceFolders(target));
        disposables.add(testObject.onDidChangeWorkspaceFolders(target));
        const removedFolder = testObject.getWorkspace().folders[0];
        await testObject.removeFolders([removedFolder.uri]);
        assert.strictEqual(target.callCount, 2, `Should be called only once but called ${target.callCount} times`);
        const actual_1 = target.args[1][0];
        assert.deepStrictEqual(actual_1.added, []);
        assert.deepStrictEqual(actual_1.removed.map((r) => r.uri.toString()), [removedFolder.uri.toString()]);
        assert.deepStrictEqual(actual_1.changed.map((c) => c.uri.toString()), [testObject.getWorkspace().folders[0].uri.toString()]);
    }));
    test('remove folders and add them back by writing into the file', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const folders = testObject.getWorkspace().folders;
        await testObject.removeFolders([folders[0].uri]);
        const promise = new Promise((resolve, reject) => {
            disposables.add(testObject.onDidChangeWorkspaceFolders((actual) => {
                try {
                    assert.deepStrictEqual(actual.added.map((r) => r.uri.toString()), [folders[0].uri.toString()]);
                    resolve();
                }
                catch (error) {
                    reject(error);
                }
            }));
        });
        const workspace = { folders: [{ path: folders[0].uri.path }, { path: folders[1].uri.path }] };
        await fileService.writeFile(testObject.getWorkspace().configuration, VSBuffer.fromString(JSON.stringify(workspace, null, '\t')));
        await promise;
    }));
    test('update folders (remove last and add to end)', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const target = sinon.spy();
        disposables.add(testObject.onWillChangeWorkspaceFolders(target));
        disposables.add(testObject.onDidChangeWorkspaceFolders(target));
        const addedFolders = [{ uri: joinPath(ROOT, 'd') }, { uri: joinPath(ROOT, 'c') }];
        const removedFolders = [testObject.getWorkspace().folders[1]].map((f) => f.uri);
        await testObject.updateFolders(addedFolders, removedFolders);
        assert.strictEqual(target.callCount, 2, `Should be called only once but called ${target.callCount} times`);
        const actual_1 = target.args[1][0];
        assert.deepStrictEqual(actual_1.added.map((r) => r.uri.toString()), addedFolders.map((a) => a.uri.toString()));
        assert.deepStrictEqual(actual_1.removed.map((r_1) => r_1.uri.toString()), removedFolders.map((a_1) => a_1.toString()));
        assert.deepStrictEqual(actual_1.changed, []);
    }));
    test('update folders (rename first via add and remove)', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const target = sinon.spy();
        disposables.add(testObject.onWillChangeWorkspaceFolders(target));
        disposables.add(testObject.onDidChangeWorkspaceFolders(target));
        const addedFolders = [{ uri: joinPath(ROOT, 'a'), name: 'The Folder' }];
        const removedFolders = [testObject.getWorkspace().folders[0]].map((f) => f.uri);
        await testObject.updateFolders(addedFolders, removedFolders, 0);
        assert.strictEqual(target.callCount, 2, `Should be called only once but called ${target.callCount} times`);
        const actual_1 = target.args[1][0];
        assert.deepStrictEqual(actual_1.added, []);
        assert.deepStrictEqual(actual_1.removed, []);
        assert.deepStrictEqual(actual_1.changed.map((r) => r.uri.toString()), removedFolders.map((a) => a.toString()));
    }));
    test('update folders (remove first and add to end)', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const target = sinon.spy();
        disposables.add(testObject.onWillChangeWorkspaceFolders(target));
        disposables.add(testObject.onDidChangeWorkspaceFolders(target));
        const addedFolders = [{ uri: joinPath(ROOT, 'd') }, { uri: joinPath(ROOT, 'c') }];
        const removedFolders = [testObject.getWorkspace().folders[0]].map((f) => f.uri);
        const changedFolders = [testObject.getWorkspace().folders[1]].map((f) => f.uri);
        await testObject.updateFolders(addedFolders, removedFolders);
        assert.strictEqual(target.callCount, 2, `Should be called only once but called ${target.callCount} times`);
        const actual_1 = target.args[1][0];
        assert.deepStrictEqual(actual_1.added.map((r) => r.uri.toString()), addedFolders.map((a) => a.uri.toString()));
        assert.deepStrictEqual(actual_1.removed.map((r_1) => r_1.uri.toString()), removedFolders.map((a_1) => a_1.toString()));
        assert.deepStrictEqual(actual_1.changed.map((r_2) => r_2.uri.toString()), changedFolders.map((a_2) => a_2.toString()));
    }));
    test('reorder folders trigger change event', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const target = sinon.spy();
        disposables.add(testObject.onWillChangeWorkspaceFolders(target));
        disposables.add(testObject.onDidChangeWorkspaceFolders(target));
        const workspace = {
            folders: [
                { path: testObject.getWorkspace().folders[1].uri.path },
                { path: testObject.getWorkspace().folders[0].uri.path },
            ],
        };
        await fileService.writeFile(testObject.getWorkspace().configuration, VSBuffer.fromString(JSON.stringify(workspace, null, '\t')));
        await testObject.reloadConfiguration();
        assert.strictEqual(target.callCount, 2, `Should be called only once but called ${target.callCount} times`);
        const actual_1 = target.args[1][0];
        assert.deepStrictEqual(actual_1.added, []);
        assert.deepStrictEqual(actual_1.removed, []);
        assert.deepStrictEqual(actual_1.changed.map((c) => c.uri.toString()), testObject
            .getWorkspace()
            .folders.map((f) => f.uri.toString())
            .reverse());
    }));
    test('rename folders trigger change event', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const target = sinon.spy();
        disposables.add(testObject.onWillChangeWorkspaceFolders(target));
        disposables.add(testObject.onDidChangeWorkspaceFolders(target));
        const workspace = {
            folders: [
                { path: testObject.getWorkspace().folders[0].uri.path, name: '1' },
                { path: testObject.getWorkspace().folders[1].uri.path },
            ],
        };
        fileService.writeFile(testObject.getWorkspace().configuration, VSBuffer.fromString(JSON.stringify(workspace, null, '\t')));
        await testObject.reloadConfiguration();
        assert.strictEqual(target.callCount, 2, `Should be called only once but called ${target.callCount} times`);
        const actual_1 = target.args[1][0];
        assert.deepStrictEqual(actual_1.added, []);
        assert.deepStrictEqual(actual_1.removed, []);
        assert.deepStrictEqual(actual_1.changed.map((c) => c.uri.toString()), [testObject.getWorkspace().folders[0].uri.toString()]);
    }));
});
suite('WorkspaceService - Initialization', () => {
    let configResource, testObject, fileService, environmentService, userDataProfileService;
    const configurationRegistry = Registry.as(ConfigurationExtensions.Configuration);
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    suiteSetup(() => {
        configurationRegistry.registerConfiguration({
            id: '_test',
            type: 'object',
            properties: {
                'initialization.testSetting1': {
                    type: 'string',
                    default: 'isSet',
                    scope: 5 /* ConfigurationScope.RESOURCE */,
                },
                'initialization.testSetting2': {
                    type: 'string',
                    default: 'isSet',
                    scope: 5 /* ConfigurationScope.RESOURCE */,
                },
            },
        });
    });
    setup(async () => {
        const logService = new NullLogService();
        fileService = disposables.add(new FileService(logService));
        const fileSystemProvider = disposables.add(new InMemoryFileSystemProvider());
        disposables.add(fileService.registerProvider(ROOT.scheme, fileSystemProvider));
        const appSettingsHome = joinPath(ROOT, 'user');
        const folderA = joinPath(ROOT, 'a');
        const folderB = joinPath(ROOT, 'b');
        configResource = joinPath(ROOT, 'vsctests.code-workspace');
        const workspace = { folders: [{ path: folderA.path }, { path: folderB.path }] };
        await fileService.createFolder(appSettingsHome);
        await fileService.createFolder(folderA);
        await fileService.createFolder(folderB);
        await fileService.writeFile(configResource, VSBuffer.fromString(JSON.stringify(workspace, null, '\t')));
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        environmentService = TestEnvironmentService;
        const remoteAgentService = disposables.add(instantiationService.createInstance(RemoteAgentService));
        instantiationService.stub(IRemoteAgentService, remoteAgentService);
        const uriIdentityService = disposables.add(new UriIdentityService(fileService));
        const userDataProfilesService = instantiationService.stub(IUserDataProfilesService, disposables.add(new UserDataProfilesService(environmentService, fileService, uriIdentityService, logService)));
        disposables.add(fileService.registerProvider(Schemas.vscodeUserData, disposables.add(new FileUserDataProvider(ROOT.scheme, fileSystemProvider, Schemas.vscodeUserData, userDataProfilesService, uriIdentityService, new NullLogService()))));
        userDataProfileService = instantiationService.stub(IUserDataProfileService, disposables.add(new UserDataProfileService(userDataProfilesService.defaultProfile)));
        testObject = disposables.add(new WorkspaceService({ configurationCache: new ConfigurationCache() }, environmentService, userDataProfileService, userDataProfilesService, fileService, remoteAgentService, uriIdentityService, new NullLogService(), new NullPolicyService()));
        instantiationService.stub(IFileService, fileService);
        instantiationService.stub(IWorkspaceContextService, testObject);
        instantiationService.stub(IConfigurationService, testObject);
        instantiationService.stub(IEnvironmentService, environmentService);
        await testObject.initialize({ id: '' });
        instantiationService.stub(ITextFileService, disposables.add(instantiationService.createInstance(TestTextFileService)));
        instantiationService.stub(ITextModelService, disposables.add(instantiationService.createInstance(TextModelResolverService)));
        testObject.acquireInstantiationService(instantiationService);
    });
    (isMacintosh ? test.skip : test)('initialize a folder workspace from an empty workspace with no configuration changes', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "initialization.testSetting1": "userValue" }'));
        await testObject.reloadConfiguration();
        const target = sinon.spy();
        disposables.add(testObject.onDidChangeWorkbenchState(target));
        disposables.add(testObject.onDidChangeWorkspaceName(target));
        disposables.add(testObject.onWillChangeWorkspaceFolders(target));
        disposables.add(testObject.onDidChangeWorkspaceFolders(target));
        disposables.add(testObject.onDidChangeConfiguration(target));
        const folder = joinPath(ROOT, 'a');
        await testObject.initialize(convertToWorkspacePayload(folder));
        assert.strictEqual(testObject.getValue('initialization.testSetting1'), 'userValue');
        assert.strictEqual(target.callCount, 4);
        assert.deepStrictEqual(target.args[0], [2 /* WorkbenchState.FOLDER */]);
        assert.deepStrictEqual(target.args[1], [undefined]);
        assert.deepStrictEqual(target.args[3][0].added.map((f) => f.uri.toString()), [folder.toString()]);
        assert.deepStrictEqual(target.args[3][0].removed, []);
        assert.deepStrictEqual(target.args[3][0].changed, []);
    }));
    (isMacintosh ? test.skip : test)('initialize a folder workspace from an empty workspace with configuration changes', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "initialization.testSetting1": "userValue" }'));
        await testObject.reloadConfiguration();
        const target = sinon.spy();
        disposables.add(testObject.onDidChangeWorkbenchState(target));
        disposables.add(testObject.onDidChangeWorkspaceName(target));
        disposables.add(testObject.onWillChangeWorkspaceFolders(target));
        disposables.add(testObject.onDidChangeWorkspaceFolders(target));
        disposables.add(testObject.onDidChangeConfiguration(target));
        const folder = joinPath(ROOT, 'a');
        await fileService.writeFile(joinPath(folder, '.vscode', 'settings.json'), VSBuffer.fromString('{ "initialization.testSetting1": "workspaceValue" }'));
        await testObject.initialize(convertToWorkspacePayload(folder));
        assert.strictEqual(testObject.getValue('initialization.testSetting1'), 'workspaceValue');
        assert.strictEqual(target.callCount, 5);
        assert.deepStrictEqual([...target.args[0][0].affectedKeys], ['initialization.testSetting1']);
        assert.deepStrictEqual(target.args[1], [2 /* WorkbenchState.FOLDER */]);
        assert.deepStrictEqual(target.args[2], [undefined]);
        assert.deepStrictEqual(target.args[4][0].added.map((f) => f.uri.toString()), [folder.toString()]);
        assert.deepStrictEqual(target.args[4][0].removed, []);
        assert.deepStrictEqual(target.args[4][0].changed, []);
    }));
    (isMacintosh ? test.skip : test)('initialize a multi root workspace from an empty workspace with no configuration changes', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "initialization.testSetting1": "userValue" }'));
        await testObject.reloadConfiguration();
        const target = sinon.spy();
        disposables.add(testObject.onDidChangeWorkbenchState(target));
        disposables.add(testObject.onDidChangeWorkspaceName(target));
        disposables.add(testObject.onWillChangeWorkspaceFolders(target));
        disposables.add(testObject.onDidChangeWorkspaceFolders(target));
        disposables.add(testObject.onDidChangeConfiguration(target));
        await testObject.initialize(getWorkspaceIdentifier(configResource));
        assert.strictEqual(target.callCount, 4);
        assert.deepStrictEqual(target.args[0], [3 /* WorkbenchState.WORKSPACE */]);
        assert.deepStrictEqual(target.args[1], [undefined]);
        assert.deepStrictEqual(target.args[3][0].added.map((folder) => folder.uri.toString()), [joinPath(ROOT, 'a').toString(), joinPath(ROOT, 'b').toString()]);
        assert.deepStrictEqual(target.args[3][0].removed, []);
        assert.deepStrictEqual(target.args[3][0].changed, []);
    }));
    (isMacintosh ? test.skip : test)('initialize a multi root workspace from an empty workspace with configuration changes', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "initialization.testSetting1": "userValue" }'));
        await testObject.reloadConfiguration();
        const target = sinon.spy();
        disposables.add(testObject.onDidChangeWorkbenchState(target));
        disposables.add(testObject.onDidChangeWorkspaceName(target));
        disposables.add(testObject.onWillChangeWorkspaceFolders(target));
        disposables.add(testObject.onDidChangeWorkspaceFolders(target));
        disposables.add(testObject.onDidChangeConfiguration(target));
        await fileService.writeFile(joinPath(ROOT, 'a', '.vscode', 'settings.json'), VSBuffer.fromString('{ "initialization.testSetting1": "workspaceValue1" }'));
        await fileService.writeFile(joinPath(ROOT, 'b', '.vscode', 'settings.json'), VSBuffer.fromString('{ "initialization.testSetting2": "workspaceValue2" }'));
        await testObject.initialize(getWorkspaceIdentifier(configResource));
        assert.strictEqual(target.callCount, 5);
        assert.deepStrictEqual([...target.args[0][0].affectedKeys], ['initialization.testSetting1', 'initialization.testSetting2']);
        assert.deepStrictEqual(target.args[1], [3 /* WorkbenchState.WORKSPACE */]);
        assert.deepStrictEqual(target.args[2], [undefined]);
        assert.deepStrictEqual(target.args[4][0].added.map((folder) => folder.uri.toString()), [joinPath(ROOT, 'a').toString(), joinPath(ROOT, 'b').toString()]);
        assert.deepStrictEqual(target.args[4][0].removed, []);
        assert.deepStrictEqual(target.args[4][0].changed, []);
    }));
    (isMacintosh ? test.skip : test)('initialize a folder workspace from a folder workspace with no configuration changes', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await testObject.initialize(convertToWorkspacePayload(joinPath(ROOT, 'a')));
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "initialization.testSetting1": "userValue" }'));
        await testObject.reloadConfiguration();
        const target = sinon.spy();
        disposables.add(testObject.onDidChangeWorkbenchState(target));
        disposables.add(testObject.onDidChangeWorkspaceName(target));
        disposables.add(testObject.onWillChangeWorkspaceFolders(target));
        disposables.add(testObject.onDidChangeWorkspaceFolders(target));
        disposables.add(testObject.onDidChangeConfiguration(target));
        await testObject.initialize(convertToWorkspacePayload(joinPath(ROOT, 'b')));
        assert.strictEqual(testObject.getValue('initialization.testSetting1'), 'userValue');
        assert.strictEqual(target.callCount, 2);
        assert.deepStrictEqual(target.args[1][0].added.map((folder_1) => folder_1.uri.toString()), [joinPath(ROOT, 'b').toString()]);
        assert.deepStrictEqual(target.args[1][0].removed.map((folder_2) => folder_2.uri.toString()), [joinPath(ROOT, 'a').toString()]);
        assert.deepStrictEqual(target.args[1][0].changed, []);
    }));
    (isMacintosh ? test.skip : test)('initialize a folder workspace from a folder workspace with configuration changes', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await testObject.initialize(convertToWorkspacePayload(joinPath(ROOT, 'a')));
        const target = sinon.spy();
        disposables.add(testObject.onDidChangeWorkbenchState(target));
        disposables.add(testObject.onDidChangeWorkspaceName(target));
        disposables.add(testObject.onWillChangeWorkspaceFolders(target));
        disposables.add(testObject.onDidChangeWorkspaceFolders(target));
        disposables.add(testObject.onDidChangeConfiguration(target));
        await fileService.writeFile(joinPath(ROOT, 'b', '.vscode', 'settings.json'), VSBuffer.fromString('{ "initialization.testSetting1": "workspaceValue2" }'));
        await testObject.initialize(convertToWorkspacePayload(joinPath(ROOT, 'b')));
        assert.strictEqual(testObject.getValue('initialization.testSetting1'), 'workspaceValue2');
        assert.strictEqual(target.callCount, 3);
        assert.deepStrictEqual([...target.args[0][0].affectedKeys], ['initialization.testSetting1']);
        assert.deepStrictEqual(target.args[2][0].added.map((folder_1) => folder_1.uri.toString()), [joinPath(ROOT, 'b').toString()]);
        assert.deepStrictEqual(target.args[2][0].removed.map((folder_2) => folder_2.uri.toString()), [joinPath(ROOT, 'a').toString()]);
        assert.deepStrictEqual(target.args[2][0].changed, []);
    }));
    (isMacintosh ? test.skip : test)('initialize a multi folder workspace from a folder workspacce triggers change events in the right order', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await testObject.initialize(convertToWorkspacePayload(joinPath(ROOT, 'a')));
        const target = sinon.spy();
        disposables.add(testObject.onDidChangeWorkbenchState(target));
        disposables.add(testObject.onDidChangeWorkspaceName(target));
        disposables.add(testObject.onWillChangeWorkspaceFolders(target));
        disposables.add(testObject.onDidChangeWorkspaceFolders(target));
        disposables.add(testObject.onDidChangeConfiguration(target));
        await fileService.writeFile(joinPath(ROOT, 'a', '.vscode', 'settings.json'), VSBuffer.fromString('{ "initialization.testSetting1": "workspaceValue2" }'));
        await testObject.initialize(getWorkspaceIdentifier(configResource));
        assert.strictEqual(target.callCount, 5);
        assert.deepStrictEqual([...target.args[0][0].affectedKeys], ['initialization.testSetting1']);
        assert.deepStrictEqual(target.args[1], [3 /* WorkbenchState.WORKSPACE */]);
        assert.deepStrictEqual(target.args[2], [undefined]);
        assert.deepStrictEqual(target.args[4][0].added.map((folder_1) => folder_1.uri.toString()), [joinPath(ROOT, 'b').toString()]);
        assert.deepStrictEqual(target.args[4][0].removed, []);
        assert.deepStrictEqual(target.args[4][0].changed, []);
    }));
});
suite('WorkspaceConfigurationService - Folder', () => {
    let testObject, workspaceService, fileService, environmentService, userDataProfileService, instantiationService;
    const configurationRegistry = Registry.as(ConfigurationExtensions.Configuration);
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    suiteSetup(() => {
        configurationRegistry.registerConfiguration({
            id: '_test',
            type: 'object',
            properties: {
                'configurationService.folder.applicationSetting': {
                    type: 'string',
                    default: 'isSet',
                    scope: 1 /* ConfigurationScope.APPLICATION */,
                },
                'configurationService.folder.machineSetting': {
                    type: 'string',
                    default: 'isSet',
                    scope: 2 /* ConfigurationScope.MACHINE */,
                },
                'configurationService.folder.applicationMachineSetting': {
                    type: 'string',
                    default: 'isSet',
                    scope: 3 /* ConfigurationScope.APPLICATION_MACHINE */,
                },
                'configurationService.folder.machineOverridableSetting': {
                    type: 'string',
                    default: 'isSet',
                    scope: 7 /* ConfigurationScope.MACHINE_OVERRIDABLE */,
                },
                'configurationService.folder.testSetting': {
                    type: 'string',
                    default: 'isSet',
                    scope: 5 /* ConfigurationScope.RESOURCE */,
                },
                'configurationService.folder.languageSetting': {
                    type: 'string',
                    default: 'isSet',
                    scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
                },
                'configurationService.folder.restrictedSetting': {
                    type: 'string',
                    default: 'isSet',
                    restricted: true,
                },
                'configurationService.folder.policySetting': {
                    type: 'string',
                    default: 'isSet',
                    policy: {
                        name: 'configurationService.folder.policySetting',
                        minimumVersion: '1.0.0',
                    },
                },
                'configurationService.folder.policyObjectSetting': {
                    type: 'object',
                    default: {},
                    policy: {
                        name: 'configurationService.folder.policyObjectSetting',
                        minimumVersion: '1.0.0',
                    },
                },
            },
        });
        configurationRegistry.registerDefaultConfigurations([
            {
                overrides: {
                    '[jsonc]': {
                        'configurationService.folder.languageSetting': 'languageValue',
                    },
                },
            },
        ]);
    });
    setup(async () => {
        const logService = new NullLogService();
        fileService = disposables.add(new FileService(logService));
        const fileSystemProvider = disposables.add(new InMemoryFileSystemProvider());
        disposables.add(fileService.registerProvider(ROOT.scheme, fileSystemProvider));
        const folder = joinPath(ROOT, 'a');
        await fileService.createFolder(folder);
        instantiationService = workbenchInstantiationService(undefined, disposables);
        environmentService = TestEnvironmentService;
        environmentService.policyFile = joinPath(folder, 'policies.json');
        const remoteAgentService = disposables.add(instantiationService.createInstance(RemoteAgentService));
        instantiationService.stub(IRemoteAgentService, remoteAgentService);
        const uriIdentityService = disposables.add(new UriIdentityService(fileService));
        const userDataProfilesService = instantiationService.stub(IUserDataProfilesService, disposables.add(new UserDataProfilesService(environmentService, fileService, uriIdentityService, logService)));
        disposables.add(fileService.registerProvider(Schemas.vscodeUserData, disposables.add(new FileUserDataProvider(ROOT.scheme, fileSystemProvider, Schemas.vscodeUserData, userDataProfilesService, uriIdentityService, new NullLogService()))));
        userDataProfileService = instantiationService.stub(IUserDataProfileService, disposables.add(new UserDataProfileService(userDataProfilesService.defaultProfile)));
        workspaceService = testObject = disposables.add(new WorkspaceService({ configurationCache: new ConfigurationCache() }, environmentService, userDataProfileService, userDataProfilesService, fileService, remoteAgentService, uriIdentityService, new NullLogService(), disposables.add(new FilePolicyService(environmentService.policyFile, fileService, logService))));
        instantiationService.stub(IFileService, fileService);
        instantiationService.stub(IWorkspaceContextService, testObject);
        instantiationService.stub(IConfigurationService, testObject);
        instantiationService.stub(IEnvironmentService, environmentService);
        await workspaceService.initialize(convertToWorkspacePayload(folder));
        instantiationService.stub(IKeybindingEditingService, disposables.add(instantiationService.createInstance(KeybindingsEditingService)));
        instantiationService.stub(ITextFileService, disposables.add(instantiationService.createInstance(TestTextFileService)));
        instantiationService.stub(ITextModelService, (disposables.add(instantiationService.createInstance(TextModelResolverService))));
        workspaceService.acquireInstantiationService(instantiationService);
    });
    test('defaults', () => {
        assert.deepStrictEqual(testObject.getValue('configurationService'), {
            folder: {
                applicationSetting: 'isSet',
                machineSetting: 'isSet',
                applicationMachineSetting: 'isSet',
                machineOverridableSetting: 'isSet',
                testSetting: 'isSet',
                languageSetting: 'isSet',
                restrictedSetting: 'isSet',
                policySetting: 'isSet',
                policyObjectSetting: {},
            },
        });
    });
    test('globals override defaults', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.folder.testSetting": "userValue" }'));
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.folder.testSetting'), 'userValue');
    }));
    test('globals', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "testworkbench.editor.tabs": true }'));
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('testworkbench.editor.tabs'), true);
    }));
    test('workspace settings', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(joinPath(workspaceService.getWorkspace().folders[0].uri, '.vscode', 'settings.json'), VSBuffer.fromString('{ "testworkbench.editor.icons": true }'));
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('testworkbench.editor.icons'), true);
    }));
    test('workspace settings override user settings', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.folder.testSetting": "userValue" }'));
        await fileService.writeFile(joinPath(workspaceService.getWorkspace().folders[0].uri, '.vscode', 'settings.json'), VSBuffer.fromString('{ "configurationService.folder.testSetting": "workspaceValue" }'));
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.folder.testSetting'), 'workspaceValue');
    }));
    test('machine overridable settings override user Settings', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.folder.machineOverridableSetting": "userValue" }'));
        await fileService.writeFile(joinPath(workspaceService.getWorkspace().folders[0].uri, '.vscode', 'settings.json'), VSBuffer.fromString('{ "configurationService.folder.machineOverridableSetting": "workspaceValue" }'));
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.folder.machineOverridableSetting'), 'workspaceValue');
    }));
    test('workspace settings override user settings after defaults are registered ', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.folder.newSetting": "userValue" }'));
        await fileService.writeFile(joinPath(workspaceService.getWorkspace().folders[0].uri, '.vscode', 'settings.json'), VSBuffer.fromString('{ "configurationService.folder.newSetting": "workspaceValue" }'));
        await testObject.reloadConfiguration();
        configurationRegistry.registerConfiguration({
            id: '_test',
            type: 'object',
            properties: {
                'configurationService.folder.newSetting': {
                    type: 'string',
                    default: 'isSet',
                },
            },
        });
        assert.strictEqual(testObject.getValue('configurationService.folder.newSetting'), 'workspaceValue');
    }));
    test('machine overridable settings override user settings after defaults are registered ', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.folder.newMachineOverridableSetting": "userValue" }'));
        await fileService.writeFile(joinPath(workspaceService.getWorkspace().folders[0].uri, '.vscode', 'settings.json'), VSBuffer.fromString('{ "configurationService.folder.newMachineOverridableSetting": "workspaceValue" }'));
        await testObject.reloadConfiguration();
        configurationRegistry.registerConfiguration({
            id: '_test',
            type: 'object',
            properties: {
                'configurationService.folder.newMachineOverridableSetting': {
                    type: 'string',
                    default: 'isSet',
                    scope: 7 /* ConfigurationScope.MACHINE_OVERRIDABLE */,
                },
            },
        });
        assert.strictEqual(testObject.getValue('configurationService.folder.newMachineOverridableSetting'), 'workspaceValue');
    }));
    test('application settings are not read from workspace', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.folder.applicationSetting": "userValue" }'));
        await fileService.writeFile(joinPath(workspaceService.getWorkspace().folders[0].uri, '.vscode', 'settings.json'), VSBuffer.fromString('{ "configurationService.folder.applicationSetting": "workspaceValue" }'));
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.folder.applicationSetting'), 'userValue');
    }));
    test('application settings are not read from workspace when workspace folder uri is passed', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.folder.applicationSetting": "userValue" }'));
        await fileService.writeFile(joinPath(workspaceService.getWorkspace().folders[0].uri, '.vscode', 'settings.json'), VSBuffer.fromString('{ "configurationService.folder.applicationSetting": "workspaceValue" }'));
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.folder.applicationSetting', {
            resource: workspaceService.getWorkspace().folders[0].uri,
        }), 'userValue');
    }));
    test('machine settings are not read from workspace', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.folder.machineSetting": "userValue" }'));
        await fileService.writeFile(joinPath(workspaceService.getWorkspace().folders[0].uri, '.vscode', 'settings.json'), VSBuffer.fromString('{ "configurationService.folder.machineSetting": "workspaceValue" }'));
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.folder.machineSetting', {
            resource: workspaceService.getWorkspace().folders[0].uri,
        }), 'userValue');
    }));
    test('machine settings are not read from workspace when workspace folder uri is passed', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.folder.machineSetting": "userValue" }'));
        await fileService.writeFile(joinPath(workspaceService.getWorkspace().folders[0].uri, '.vscode', 'settings.json'), VSBuffer.fromString('{ "configurationService.folder.machineSetting": "workspaceValue" }'));
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.folder.machineSetting', {
            resource: workspaceService.getWorkspace().folders[0].uri,
        }), 'userValue');
    }));
    test('application machine overridable settings are not read from workspace', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.folder.applicationMachineSetting": "userValue" }'));
        await fileService.writeFile(joinPath(workspaceService.getWorkspace().folders[0].uri, '.vscode', 'settings.json'), VSBuffer.fromString('{ "configurationService.folder.applicationMachineSetting": "workspaceValue" }'));
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.folder.applicationMachineSetting'), 'userValue');
    }));
    test('application machine overridable settings are not read from workspace when workspace folder uri is passed', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.folder.applicationMachineSetting": "userValue" }'));
        await fileService.writeFile(joinPath(workspaceService.getWorkspace().folders[0].uri, '.vscode', 'settings.json'), VSBuffer.fromString('{ "configurationService.folder.applicationMachineSetting": "workspaceValue" }'));
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.folder.applicationMachineSetting', {
            resource: workspaceService.getWorkspace().folders[0].uri,
        }), 'userValue');
    }));
    test('get application scope settings are loaded after defaults are registered', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.folder.applicationSetting-2": "userValue" }'));
        await fileService.writeFile(joinPath(workspaceService.getWorkspace().folders[0].uri, '.vscode', 'settings.json'), VSBuffer.fromString('{ "configurationService.folder.applicationSetting-2": "workspaceValue" }'));
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.folder.applicationSetting-2'), 'workspaceValue');
        configurationRegistry.registerConfiguration({
            id: '_test',
            type: 'object',
            properties: {
                'configurationService.folder.applicationSetting-2': {
                    type: 'string',
                    default: 'isSet',
                    scope: 1 /* ConfigurationScope.APPLICATION */,
                },
            },
        });
        assert.strictEqual(testObject.getValue('configurationService.folder.applicationSetting-2'), 'userValue');
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.folder.applicationSetting-2'), 'userValue');
    }));
    test('get application scope settings are not loaded after defaults are registered when workspace folder uri is passed', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.folder.applicationSetting-3": "userValue" }'));
        await fileService.writeFile(joinPath(workspaceService.getWorkspace().folders[0].uri, '.vscode', 'settings.json'), VSBuffer.fromString('{ "configurationService.folder.applicationSetting-3": "workspaceValue" }'));
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.folder.applicationSetting-3', {
            resource: workspaceService.getWorkspace().folders[0].uri,
        }), 'workspaceValue');
        configurationRegistry.registerConfiguration({
            id: '_test',
            type: 'object',
            properties: {
                'configurationService.folder.applicationSetting-3': {
                    type: 'string',
                    default: 'isSet',
                    scope: 1 /* ConfigurationScope.APPLICATION */,
                },
            },
        });
        assert.strictEqual(testObject.getValue('configurationService.folder.applicationSetting-3', {
            resource: workspaceService.getWorkspace().folders[0].uri,
        }), 'userValue');
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.folder.applicationSetting-3', {
            resource: workspaceService.getWorkspace().folders[0].uri,
        }), 'userValue');
    }));
    test('get application machine overridable scope settings are loaded after defaults are registered', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.folder.applicationMachineSetting-2": "userValue" }'));
        await fileService.writeFile(joinPath(workspaceService.getWorkspace().folders[0].uri, '.vscode', 'settings.json'), VSBuffer.fromString('{ "configurationService.folder.applicationMachineSetting-2": "workspaceValue" }'));
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.folder.applicationMachineSetting-2'), 'workspaceValue');
        configurationRegistry.registerConfiguration({
            id: '_test',
            type: 'object',
            properties: {
                'configurationService.folder.applicationMachineSetting-2': {
                    type: 'string',
                    default: 'isSet',
                    scope: 1 /* ConfigurationScope.APPLICATION */,
                },
            },
        });
        assert.strictEqual(testObject.getValue('configurationService.folder.applicationMachineSetting-2'), 'userValue');
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.folder.applicationMachineSetting-2'), 'userValue');
    }));
    test('get application machine overridable scope settings are loaded after defaults are registered when workspace folder uri is passed', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.folder.applicationMachineSetting-3": "userValue" }'));
        await fileService.writeFile(joinPath(workspaceService.getWorkspace().folders[0].uri, '.vscode', 'settings.json'), VSBuffer.fromString('{ "configurationService.folder.applicationMachineSetting-3": "workspaceValue" }'));
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.folder.applicationMachineSetting-3', {
            resource: workspaceService.getWorkspace().folders[0].uri,
        }), 'workspaceValue');
        configurationRegistry.registerConfiguration({
            id: '_test',
            type: 'object',
            properties: {
                'configurationService.folder.applicationMachineSetting-3': {
                    type: 'string',
                    default: 'isSet',
                    scope: 1 /* ConfigurationScope.APPLICATION */,
                },
            },
        });
        assert.strictEqual(testObject.getValue('configurationService.folder.applicationMachineSetting-3', {
            resource: workspaceService.getWorkspace().folders[0].uri,
        }), 'userValue');
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.folder.applicationMachineSetting-3', {
            resource: workspaceService.getWorkspace().folders[0].uri,
        }), 'userValue');
    }));
    test('get machine scope settings are not loaded after defaults are registered', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.folder.machineSetting-2": "userValue" }'));
        await fileService.writeFile(joinPath(workspaceService.getWorkspace().folders[0].uri, '.vscode', 'settings.json'), VSBuffer.fromString('{ "configurationService.folder.machineSetting-2": "workspaceValue" }'));
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.folder.machineSetting-2'), 'workspaceValue');
        configurationRegistry.registerConfiguration({
            id: '_test',
            type: 'object',
            properties: {
                'configurationService.folder.machineSetting-2': {
                    type: 'string',
                    default: 'isSet',
                    scope: 2 /* ConfigurationScope.MACHINE */,
                },
            },
        });
        assert.strictEqual(testObject.getValue('configurationService.folder.machineSetting-2'), 'userValue');
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.folder.machineSetting-2'), 'userValue');
    }));
    test('get machine scope settings are not loaded after defaults are registered when workspace folder uri is passed', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.folder.machineSetting-3": "userValue" }'));
        await fileService.writeFile(joinPath(workspaceService.getWorkspace().folders[0].uri, '.vscode', 'settings.json'), VSBuffer.fromString('{ "configurationService.folder.machineSetting-3": "workspaceValue" }'));
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.folder.machineSetting-3', {
            resource: workspaceService.getWorkspace().folders[0].uri,
        }), 'workspaceValue');
        configurationRegistry.registerConfiguration({
            id: '_test',
            type: 'object',
            properties: {
                'configurationService.folder.machineSetting-3': {
                    type: 'string',
                    default: 'isSet',
                    scope: 2 /* ConfigurationScope.MACHINE */,
                },
            },
        });
        assert.strictEqual(testObject.getValue('configurationService.folder.machineSetting-3', {
            resource: workspaceService.getWorkspace().folders[0].uri,
        }), 'userValue');
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.folder.machineSetting-3', {
            resource: workspaceService.getWorkspace().folders[0].uri,
        }), 'userValue');
    }));
    test('policy value override all', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const result = await runWithFakedTimers({ useFakeTimers: true }, async () => {
            const promise = Event.toPromise(testObject.onDidChangeConfiguration);
            await fileService.writeFile(environmentService.policyFile, VSBuffer.fromString('{ "configurationService.folder.policySetting": "policyValue" }'));
            return promise;
        });
        assert.deepStrictEqual([...result.affectedKeys], ['configurationService.folder.policySetting']);
        assert.strictEqual(testObject.getValue('configurationService.folder.policySetting'), 'policyValue');
        assert.strictEqual(testObject.inspect('configurationService.folder.policySetting').policyValue, 'policyValue');
    }));
    test('policy settings when policy value is not set', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.folder.policySetting": "userValue" }'));
        await fileService.writeFile(joinPath(workspaceService.getWorkspace().folders[0].uri, '.vscode', 'settings.json'), VSBuffer.fromString('{ "configurationService.folder.policySetting": "workspaceValue" }'));
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.folder.policySetting'), 'workspaceValue');
        assert.strictEqual(testObject.inspect('configurationService.folder.policySetting').policyValue, undefined);
    }));
    test('policy value override all for object type setting', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await runWithFakedTimers({ useFakeTimers: true }, async () => {
            const promise = Event.toPromise(testObject.onDidChangeConfiguration);
            await fileService.writeFile(environmentService.policyFile, VSBuffer.fromString('{ "configurationService.folder.policyObjectSetting": {"a": true} }'));
            return promise;
        });
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.folder.policyObjectSetting": {"b": true} }'));
        await testObject.reloadConfiguration();
        assert.deepStrictEqual(testObject.getValue('configurationService.folder.policyObjectSetting'), { a: true });
    }));
    test('reload configuration emits events after global configuraiton changes', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "testworkbench.editor.tabs": true }'));
        const target = sinon.spy();
        disposables.add(testObject.onDidChangeConfiguration(target));
        await testObject.reloadConfiguration();
        assert.ok(target.called);
    }));
    test('reload configuration emits events after workspace configuraiton changes', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(joinPath(workspaceService.getWorkspace().folders[0].uri, '.vscode', 'settings.json'), VSBuffer.fromString('{ "configurationService.folder.testSetting": "workspaceValue" }'));
        const target = sinon.spy();
        disposables.add(testObject.onDidChangeConfiguration(target));
        await testObject.reloadConfiguration();
        assert.ok(target.called);
    }));
    test('reload configuration should not emit event if no changes', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "testworkbench.editor.tabs": true }'));
        await fileService.writeFile(joinPath(workspaceService.getWorkspace().folders[0].uri, '.vscode', 'settings.json'), VSBuffer.fromString('{ "configurationService.folder.testSetting": "workspaceValue" }'));
        await testObject.reloadConfiguration();
        const target = sinon.spy();
        disposables.add(testObject.onDidChangeConfiguration(() => {
            target();
        }));
        await testObject.reloadConfiguration();
        assert.ok(!target.called);
    }));
    test('inspect', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        let actual = testObject.inspect('something.missing');
        assert.strictEqual(actual.defaultValue, undefined);
        assert.strictEqual(actual.application, undefined);
        assert.strictEqual(actual.userValue, undefined);
        assert.strictEqual(actual.workspaceValue, undefined);
        assert.strictEqual(actual.workspaceFolderValue, undefined);
        assert.strictEqual(actual.value, undefined);
        actual = testObject.inspect('configurationService.folder.testSetting');
        assert.strictEqual(actual.defaultValue, 'isSet');
        assert.strictEqual(actual.application, undefined);
        assert.strictEqual(actual.userValue, undefined);
        assert.strictEqual(actual.workspaceValue, undefined);
        assert.strictEqual(actual.workspaceFolderValue, undefined);
        assert.strictEqual(actual.value, 'isSet');
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.folder.testSetting": "userValue" }'));
        await testObject.reloadConfiguration();
        actual = testObject.inspect('configurationService.folder.testSetting');
        assert.strictEqual(actual.defaultValue, 'isSet');
        assert.strictEqual(actual.application, undefined);
        assert.strictEqual(actual.userValue, 'userValue');
        assert.strictEqual(actual.workspaceValue, undefined);
        assert.strictEqual(actual.workspaceFolderValue, undefined);
        assert.strictEqual(actual.value, 'userValue');
        await fileService.writeFile(joinPath(workspaceService.getWorkspace().folders[0].uri, '.vscode', 'settings.json'), VSBuffer.fromString('{ "configurationService.folder.testSetting": "workspaceValue" }'));
        await testObject.reloadConfiguration();
        actual = testObject.inspect('configurationService.folder.testSetting');
        assert.strictEqual(actual.defaultValue, 'isSet');
        assert.strictEqual(actual.application, undefined);
        assert.strictEqual(actual.userValue, 'userValue');
        assert.strictEqual(actual.workspaceValue, 'workspaceValue');
        assert.strictEqual(actual.workspaceFolderValue, undefined);
        assert.strictEqual(actual.value, 'workspaceValue');
        await fileService.writeFile(joinPath(workspaceService.getWorkspace().folders[0].uri, '.vscode', 'tasks.json'), VSBuffer.fromString('{ "configurationService.tasks.testSetting": "tasksValue" }'));
        await testObject.reloadConfiguration();
        actual = testObject.inspect('tasks');
        assert.strictEqual(actual.defaultValue, undefined);
        assert.strictEqual(actual.application, undefined);
        assert.deepStrictEqual(actual.userValue, {});
        assert.deepStrictEqual(actual.workspaceValue, {
            configurationService: {
                tasks: {
                    testSetting: 'tasksValue',
                },
            },
        });
        assert.strictEqual(actual.workspaceFolderValue, undefined);
        assert.deepStrictEqual(actual.value, {
            configurationService: {
                tasks: {
                    testSetting: 'tasksValue',
                },
            },
        });
    }));
    test('inspect restricted settings', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        testObject.updateWorkspaceTrust(false);
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.folder.restrictedSetting": "userRestrictedValue" }'));
        await testObject.reloadConfiguration();
        let actual = testObject.inspect('configurationService.folder.restrictedSetting');
        assert.strictEqual(actual.defaultValue, 'isSet');
        assert.strictEqual(actual.application, undefined);
        assert.strictEqual(actual.userValue, 'userRestrictedValue');
        assert.strictEqual(actual.workspaceValue, undefined);
        assert.strictEqual(actual.workspaceFolderValue, undefined);
        assert.strictEqual(actual.value, 'userRestrictedValue');
        testObject.updateWorkspaceTrust(true);
        await testObject.reloadConfiguration();
        actual = testObject.inspect('configurationService.folder.restrictedSetting');
        assert.strictEqual(actual.defaultValue, 'isSet');
        assert.strictEqual(actual.application, undefined);
        assert.strictEqual(actual.userValue, 'userRestrictedValue');
        assert.strictEqual(actual.workspaceValue, undefined);
        assert.strictEqual(actual.workspaceFolderValue, undefined);
        assert.strictEqual(actual.value, 'userRestrictedValue');
        testObject.updateWorkspaceTrust(false);
        await fileService.writeFile(joinPath(workspaceService.getWorkspace().folders[0].uri, '.vscode', 'settings.json'), VSBuffer.fromString('{ "configurationService.folder.restrictedSetting": "workspaceRestrictedValue" }'));
        await testObject.reloadConfiguration();
        actual = testObject.inspect('configurationService.folder.restrictedSetting');
        assert.strictEqual(actual.defaultValue, 'isSet');
        assert.strictEqual(actual.application, undefined);
        assert.strictEqual(actual.userValue, 'userRestrictedValue');
        assert.strictEqual(actual.workspaceValue, 'workspaceRestrictedValue');
        assert.strictEqual(actual.workspaceFolderValue, undefined);
        assert.strictEqual(actual.value, 'userRestrictedValue');
        await fileService.writeFile(joinPath(workspaceService.getWorkspace().folders[0].uri, '.vscode', 'tasks.json'), VSBuffer.fromString('{ "configurationService.tasks.testSetting": "tasksValue" }'));
        await testObject.reloadConfiguration();
        actual = testObject.inspect('tasks');
        assert.strictEqual(actual.defaultValue, undefined);
        assert.strictEqual(actual.application, undefined);
        assert.deepStrictEqual(actual.userValue, {});
        assert.deepStrictEqual(actual.workspaceValue, {
            configurationService: {
                tasks: {
                    testSetting: 'tasksValue',
                },
            },
        });
        assert.strictEqual(actual.workspaceFolderValue, undefined);
        assert.deepStrictEqual(actual.value, {
            configurationService: {
                tasks: {
                    testSetting: 'tasksValue',
                },
            },
        });
        testObject.updateWorkspaceTrust(true);
        await testObject.reloadConfiguration();
        actual = testObject.inspect('configurationService.folder.restrictedSetting');
        assert.strictEqual(actual.defaultValue, 'isSet');
        assert.strictEqual(actual.application, undefined);
        assert.strictEqual(actual.userValue, 'userRestrictedValue');
        assert.strictEqual(actual.workspaceValue, 'workspaceRestrictedValue');
        assert.strictEqual(actual.workspaceFolderValue, undefined);
        assert.strictEqual(actual.value, 'workspaceRestrictedValue');
        await fileService.writeFile(joinPath(workspaceService.getWorkspace().folders[0].uri, '.vscode', 'tasks.json'), VSBuffer.fromString('{ "configurationService.tasks.testSetting": "tasksValue" }'));
        await testObject.reloadConfiguration();
        actual = testObject.inspect('tasks');
        assert.strictEqual(actual.defaultValue, undefined);
        assert.strictEqual(actual.application, undefined);
        assert.deepStrictEqual(actual.userValue, {});
        assert.deepStrictEqual(actual.workspaceValue, {
            configurationService: {
                tasks: {
                    testSetting: 'tasksValue',
                },
            },
        });
        assert.strictEqual(actual.workspaceFolderValue, undefined);
        assert.deepStrictEqual(actual.value, {
            configurationService: {
                tasks: {
                    testSetting: 'tasksValue',
                },
            },
        });
    }));
    test('inspect restricted settings after change', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        testObject.updateWorkspaceTrust(false);
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.folder.restrictedSetting": "userRestrictedValue" }'));
        await testObject.reloadConfiguration();
        const promise = Event.toPromise(testObject.onDidChangeConfiguration);
        await fileService.writeFile(joinPath(workspaceService.getWorkspace().folders[0].uri, '.vscode', 'settings.json'), VSBuffer.fromString('{ "configurationService.folder.restrictedSetting": "workspaceRestrictedValue" }'));
        const event = await promise;
        const actual = testObject.inspect('configurationService.folder.restrictedSetting');
        assert.strictEqual(actual.defaultValue, 'isSet');
        assert.strictEqual(actual.application, undefined);
        assert.strictEqual(actual.userValue, 'userRestrictedValue');
        assert.strictEqual(actual.workspaceValue, 'workspaceRestrictedValue');
        assert.strictEqual(actual.workspaceFolderValue, undefined);
        assert.strictEqual(actual.value, 'userRestrictedValue');
        assert.strictEqual(event.affectsConfiguration('configurationService.folder.restrictedSetting'), true);
    }));
    test('keys', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        let actual = testObject.keys();
        assert.ok(actual.default.indexOf('configurationService.folder.testSetting') !== -1);
        assert.deepStrictEqual(actual.user, []);
        assert.deepStrictEqual(actual.workspace, []);
        assert.deepStrictEqual(actual.workspaceFolder, []);
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.folder.testSetting": "userValue" }'));
        await testObject.reloadConfiguration();
        actual = testObject.keys();
        assert.ok(actual.default.indexOf('configurationService.folder.testSetting') !== -1);
        assert.deepStrictEqual(actual.user, ['configurationService.folder.testSetting']);
        assert.deepStrictEqual(actual.workspace, []);
        assert.deepStrictEqual(actual.workspaceFolder, []);
        await fileService.writeFile(joinPath(workspaceService.getWorkspace().folders[0].uri, '.vscode', 'settings.json'), VSBuffer.fromString('{ "configurationService.folder.testSetting": "workspaceValue" }'));
        await testObject.reloadConfiguration();
        actual = testObject.keys();
        assert.ok(actual.default.indexOf('configurationService.folder.testSetting') !== -1);
        assert.deepStrictEqual(actual.user, ['configurationService.folder.testSetting']);
        assert.deepStrictEqual(actual.workspace, ['configurationService.folder.testSetting']);
        assert.deepStrictEqual(actual.workspaceFolder, []);
    }));
    test('update user configuration', () => {
        return testObject
            .updateValue('configurationService.folder.testSetting', 'value', 2 /* ConfigurationTarget.USER */)
            .then(() => assert.strictEqual(testObject.getValue('configurationService.folder.testSetting'), 'value'));
    });
    test('update workspace configuration', () => {
        return testObject
            .updateValue('tasks.service.testSetting', 'value', 5 /* ConfigurationTarget.WORKSPACE */)
            .then(() => assert.strictEqual(testObject.getValue("tasks.service.testSetting" /* TasksSchemaProperties.ServiceTestSetting */), 'value'));
    });
    test('update resource configuration', () => {
        return testObject
            .updateValue('configurationService.folder.testSetting', 'value', { resource: workspaceService.getWorkspace().folders[0].uri }, 6 /* ConfigurationTarget.WORKSPACE_FOLDER */)
            .then(() => assert.strictEqual(testObject.getValue('configurationService.folder.testSetting'), 'value'));
    });
    test('update language configuration using configuration overrides', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await testObject.updateValue('configurationService.folder.languageSetting', 'abcLangValue', {
            overrideIdentifier: 'abclang',
        });
        assert.strictEqual(testObject.getValue('configurationService.folder.languageSetting', {
            overrideIdentifier: 'abclang',
        }), 'abcLangValue');
    }));
    test('update language configuration using configuration update overrides', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await testObject.updateValue('configurationService.folder.languageSetting', 'abcLangValue', {
            overrideIdentifiers: ['abclang'],
        });
        assert.strictEqual(testObject.getValue('configurationService.folder.languageSetting', {
            overrideIdentifier: 'abclang',
        }), 'abcLangValue');
    }));
    test('update language configuration for multiple languages', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await testObject.updateValue('configurationService.folder.languageSetting', 'multiLangValue', { overrideIdentifiers: ['xyzlang', 'deflang'] }, 2 /* ConfigurationTarget.USER */);
        assert.strictEqual(testObject.getValue('configurationService.folder.languageSetting', {
            overrideIdentifier: 'deflang',
        }), 'multiLangValue');
        assert.strictEqual(testObject.getValue('configurationService.folder.languageSetting', {
            overrideIdentifier: 'xyzlang',
        }), 'multiLangValue');
        assert.deepStrictEqual(testObject.getValue(keyFromOverrideIdentifiers(['deflang', 'xyzlang'])), { 'configurationService.folder.languageSetting': 'multiLangValue' });
    }));
    test('update language configuration for multiple languages when already set', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "[deflang][xyzlang]": { "configurationService.folder.languageSetting": "userValue" }}'));
        await testObject.updateValue('configurationService.folder.languageSetting', 'multiLangValue', { overrideIdentifiers: ['xyzlang', 'deflang'] }, 2 /* ConfigurationTarget.USER */);
        assert.strictEqual(testObject.getValue('configurationService.folder.languageSetting', {
            overrideIdentifier: 'deflang',
        }), 'multiLangValue');
        assert.strictEqual(testObject.getValue('configurationService.folder.languageSetting', {
            overrideIdentifier: 'xyzlang',
        }), 'multiLangValue');
        assert.deepStrictEqual(testObject.getValue(keyFromOverrideIdentifiers(['deflang', 'xyzlang'])), { 'configurationService.folder.languageSetting': 'multiLangValue' });
        const actualContent = (await fileService.readFile(userDataProfileService.currentProfile.settingsResource)).value.toString();
        assert.deepStrictEqual(JSON.parse(actualContent), {
            '[deflang][xyzlang]': { 'configurationService.folder.languageSetting': 'multiLangValue' },
        });
    }));
    test('update resource language configuration', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await testObject.updateValue('configurationService.folder.languageSetting', 'value', { resource: workspaceService.getWorkspace().folders[0].uri }, 6 /* ConfigurationTarget.WORKSPACE_FOLDER */);
        assert.strictEqual(testObject.getValue('configurationService.folder.languageSetting'), 'value');
    }));
    test('update resource language configuration for a language using configuration overrides', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        assert.strictEqual(testObject.getValue('configurationService.folder.languageSetting', {
            resource: workspaceService.getWorkspace().folders[0].uri,
            overrideIdentifier: 'jsonc',
        }), 'languageValue');
        await testObject.updateValue('configurationService.folder.languageSetting', 'languageValueUpdated', { resource: workspaceService.getWorkspace().folders[0].uri, overrideIdentifier: 'jsonc' }, 6 /* ConfigurationTarget.WORKSPACE_FOLDER */);
        assert.strictEqual(testObject.getValue('configurationService.folder.languageSetting', {
            resource: workspaceService.getWorkspace().folders[0].uri,
            overrideIdentifier: 'jsonc',
        }), 'languageValueUpdated');
    }));
    test('update resource language configuration for a language using configuration update overrides', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        assert.strictEqual(testObject.getValue('configurationService.folder.languageSetting', {
            resource: workspaceService.getWorkspace().folders[0].uri,
            overrideIdentifier: 'jsonc',
        }), 'languageValue');
        await testObject.updateValue('configurationService.folder.languageSetting', 'languageValueUpdated', {
            resource: workspaceService.getWorkspace().folders[0].uri,
            overrideIdentifiers: ['jsonc'],
        }, 6 /* ConfigurationTarget.WORKSPACE_FOLDER */);
        assert.strictEqual(testObject.getValue('configurationService.folder.languageSetting', {
            resource: workspaceService.getWorkspace().folders[0].uri,
            overrideIdentifier: 'jsonc',
        }), 'languageValueUpdated');
    }));
    test('update application setting into workspace configuration in a workspace is not supported', () => {
        return testObject
            .updateValue('configurationService.folder.applicationSetting', 'workspaceValue', {}, 5 /* ConfigurationTarget.WORKSPACE */, { donotNotifyError: true })
            .then(() => assert.fail('Should not be supported'), (e) => assert.strictEqual(e.code, 1 /* ConfigurationEditingErrorCode.ERROR_INVALID_WORKSPACE_CONFIGURATION_APPLICATION */));
    });
    test('update application machine overridable setting into workspace configuration in a workspace is not supported', () => {
        return testObject
            .updateValue('configurationService.folder.applicationMachineSetting', 'workspaceValue', {}, 5 /* ConfigurationTarget.WORKSPACE */, { donotNotifyError: true })
            .then(() => assert.fail('Should not be supported'), (e) => assert.strictEqual(e.code, 1 /* ConfigurationEditingErrorCode.ERROR_INVALID_WORKSPACE_CONFIGURATION_APPLICATION */));
    });
    test('update machine setting into workspace configuration in a workspace is not supported', () => {
        return testObject
            .updateValue('configurationService.folder.machineSetting', 'workspaceValue', {}, 5 /* ConfigurationTarget.WORKSPACE */, { donotNotifyError: true })
            .then(() => assert.fail('Should not be supported'), (e) => assert.strictEqual(e.code, 2 /* ConfigurationEditingErrorCode.ERROR_INVALID_WORKSPACE_CONFIGURATION_MACHINE */));
    });
    test('update tasks configuration', () => {
        return testObject
            .updateValue('tasks', { version: '1.0.0', tasks: [{ taskName: 'myTask' }] }, 5 /* ConfigurationTarget.WORKSPACE */)
            .then(() => assert.deepStrictEqual(testObject.getValue("tasks" /* TasksSchemaProperties.Tasks */), {
            version: '1.0.0',
            tasks: [{ taskName: 'myTask' }],
        }));
    });
    test('update user configuration should trigger change event before promise is resolve', () => {
        const target = sinon.spy();
        disposables.add(testObject.onDidChangeConfiguration(target));
        return testObject
            .updateValue('configurationService.folder.testSetting', 'value', 2 /* ConfigurationTarget.USER */)
            .then(() => assert.ok(target.called));
    });
    test('update workspace configuration should trigger change event before promise is resolve', () => {
        const target = sinon.spy();
        disposables.add(testObject.onDidChangeConfiguration(target));
        return testObject
            .updateValue('configurationService.folder.testSetting', 'value', 5 /* ConfigurationTarget.WORKSPACE */)
            .then(() => assert.ok(target.called));
    });
    test('update memory configuration', () => {
        return testObject
            .updateValue('configurationService.folder.testSetting', 'memoryValue', 8 /* ConfigurationTarget.MEMORY */)
            .then(() => assert.strictEqual(testObject.getValue('configurationService.folder.testSetting'), 'memoryValue'));
    });
    test('update memory configuration should trigger change event before promise is resolve', () => {
        const target = sinon.spy();
        disposables.add(testObject.onDidChangeConfiguration(target));
        return testObject
            .updateValue('configurationService.folder.testSetting', 'memoryValue', 8 /* ConfigurationTarget.MEMORY */)
            .then(() => assert.ok(target.called));
    });
    test('remove setting from all targets', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const key = 'configurationService.folder.testSetting';
        await testObject.updateValue(key, 'workspaceValue', 5 /* ConfigurationTarget.WORKSPACE */);
        await testObject.updateValue(key, 'userValue', 2 /* ConfigurationTarget.USER */);
        await testObject.updateValue(key, undefined);
        await testObject.reloadConfiguration();
        const actual = testObject.inspect(key, {
            resource: workspaceService.getWorkspace().folders[0].uri,
        });
        assert.strictEqual(actual.userValue, undefined);
        assert.strictEqual(actual.workspaceValue, undefined);
        assert.strictEqual(actual.workspaceFolderValue, undefined);
    }));
    test('update user configuration to default value when target is not passed', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await testObject.updateValue('configurationService.folder.testSetting', 'value', 2 /* ConfigurationTarget.USER */);
        await testObject.updateValue('configurationService.folder.testSetting', 'isSet');
        assert.strictEqual(testObject.inspect('configurationService.folder.testSetting').userValue, undefined);
    }));
    test('update user configuration to default value when target is passed', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await testObject.updateValue('configurationService.folder.testSetting', 'value', 2 /* ConfigurationTarget.USER */);
        await testObject.updateValue('configurationService.folder.testSetting', 'isSet', 2 /* ConfigurationTarget.USER */);
        assert.strictEqual(testObject.inspect('configurationService.folder.testSetting').userValue, 'isSet');
    }));
    test('update task configuration should trigger change event before promise is resolve', () => {
        const target = sinon.spy();
        disposables.add(testObject.onDidChangeConfiguration(target));
        return testObject
            .updateValue('tasks', { version: '1.0.0', tasks: [{ taskName: 'myTask' }] }, 5 /* ConfigurationTarget.WORKSPACE */)
            .then(() => assert.ok(target.called));
    });
    test('no change event when there are no global tasks', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const target = sinon.spy();
        disposables.add(testObject.onDidChangeConfiguration(target));
        await timeout(5);
        assert.ok(target.notCalled);
    }));
    test('change event when there are global tasks', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(joinPath(environmentService.userRoamingDataHome, 'tasks.json'), VSBuffer.fromString('{ "version": "1.0.0", "tasks": [{ "taskName": "myTask" }'));
        const promise = Event.toPromise(testObject.onDidChangeConfiguration);
        await testObject.reloadLocalUserConfiguration();
        await promise;
    }));
    test('creating workspace settings', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.folder.testSetting": "userValue" }'));
        await testObject.reloadConfiguration();
        await new Promise((c, e) => {
            const disposable = testObject.onDidChangeConfiguration((e) => {
                assert.ok(e.affectsConfiguration('configurationService.folder.testSetting'));
                assert.strictEqual(testObject.getValue('configurationService.folder.testSetting'), 'workspaceValue');
                disposable.dispose();
                c();
            });
            fileService
                .writeFile(joinPath(workspaceService.getWorkspace().folders[0].uri, '.vscode', 'settings.json'), VSBuffer.fromString('{ "configurationService.folder.testSetting": "workspaceValue" }'))
                .catch(e);
        });
    }));
    test('deleting workspace settings', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.folder.testSetting": "userValue" }'));
        const workspaceSettingsResource = joinPath(workspaceService.getWorkspace().folders[0].uri, '.vscode', 'settings.json');
        await fileService.writeFile(workspaceSettingsResource, VSBuffer.fromString('{ "configurationService.folder.testSetting": "workspaceValue" }'));
        await testObject.reloadConfiguration();
        const e = await new Promise((c, e) => {
            Event.once(testObject.onDidChangeConfiguration)(c);
            fileService.del(workspaceSettingsResource).catch(e);
        });
        assert.ok(e.affectsConfiguration('configurationService.folder.testSetting'));
        assert.strictEqual(testObject.getValue('configurationService.folder.testSetting'), 'userValue');
    }));
    test('restricted setting is read from workspace when workspace is trusted', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        testObject.updateWorkspaceTrust(true);
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.folder.restrictedSetting": "userValue" }'));
        await fileService.writeFile(joinPath(workspaceService.getWorkspace().folders[0].uri, '.vscode', 'settings.json'), VSBuffer.fromString('{ "configurationService.folder.restrictedSetting": "workspaceValue" }'));
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.folder.restrictedSetting', {
            resource: workspaceService.getWorkspace().folders[0].uri,
        }), 'workspaceValue');
        assert.ok(testObject.restrictedSettings.default.includes('configurationService.folder.restrictedSetting'));
        assert.strictEqual(testObject.restrictedSettings.userLocal, undefined);
        assert.strictEqual(testObject.restrictedSettings.userRemote, undefined);
        assert.deepStrictEqual(testObject.restrictedSettings.workspace, [
            'configurationService.folder.restrictedSetting',
        ]);
        assert.strictEqual(testObject.restrictedSettings.workspaceFolder?.size, 1);
        assert.deepStrictEqual(testObject.restrictedSettings.workspaceFolder?.get(workspaceService.getWorkspace().folders[0].uri), ['configurationService.folder.restrictedSetting']);
    }));
    test('restricted setting is not read from workspace when workspace is changed to trusted', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        testObject.updateWorkspaceTrust(true);
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.folder.restrictedSetting": "userValue" }'));
        await fileService.writeFile(joinPath(workspaceService.getWorkspace().folders[0].uri, '.vscode', 'settings.json'), VSBuffer.fromString('{ "configurationService.folder.restrictedSetting": "workspaceValue" }'));
        await testObject.reloadConfiguration();
        testObject.updateWorkspaceTrust(false);
        assert.strictEqual(testObject.getValue('configurationService.folder.restrictedSetting', {
            resource: workspaceService.getWorkspace().folders[0].uri,
        }), 'userValue');
        assert.ok(testObject.restrictedSettings.default.includes('configurationService.folder.restrictedSetting'));
        assert.strictEqual(testObject.restrictedSettings.userLocal, undefined);
        assert.strictEqual(testObject.restrictedSettings.userRemote, undefined);
        assert.deepStrictEqual(testObject.restrictedSettings.workspace, [
            'configurationService.folder.restrictedSetting',
        ]);
        assert.strictEqual(testObject.restrictedSettings.workspaceFolder?.size, 1);
        assert.deepStrictEqual(testObject.restrictedSettings.workspaceFolder?.get(workspaceService.getWorkspace().folders[0].uri), ['configurationService.folder.restrictedSetting']);
    }));
    test('change event is triggered when workspace is changed to untrusted', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        testObject.updateWorkspaceTrust(true);
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.folder.restrictedSetting": "userValue" }'));
        await fileService.writeFile(joinPath(workspaceService.getWorkspace().folders[0].uri, '.vscode', 'settings.json'), VSBuffer.fromString('{ "configurationService.folder.restrictedSetting": "workspaceValue" }'));
        await testObject.reloadConfiguration();
        const promise = Event.toPromise(testObject.onDidChangeConfiguration);
        testObject.updateWorkspaceTrust(false);
        const event = await promise;
        assert.ok(event.affectedKeys.has('configurationService.folder.restrictedSetting'));
        assert.ok(event.affectsConfiguration('configurationService.folder.restrictedSetting'));
    }));
    test('restricted setting is not read from workspace when workspace is not trusted', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        testObject.updateWorkspaceTrust(false);
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.folder.restrictedSetting": "userValue" }'));
        await fileService.writeFile(joinPath(workspaceService.getWorkspace().folders[0].uri, '.vscode', 'settings.json'), VSBuffer.fromString('{ "configurationService.folder.restrictedSetting": "workspaceValue" }'));
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.folder.restrictedSetting', {
            resource: workspaceService.getWorkspace().folders[0].uri,
        }), 'userValue');
        assert.ok(testObject.restrictedSettings.default.includes('configurationService.folder.restrictedSetting'));
        assert.strictEqual(testObject.restrictedSettings.userLocal, undefined);
        assert.strictEqual(testObject.restrictedSettings.userRemote, undefined);
        assert.deepStrictEqual(testObject.restrictedSettings.workspace, [
            'configurationService.folder.restrictedSetting',
        ]);
        assert.strictEqual(testObject.restrictedSettings.workspaceFolder?.size, 1);
        assert.deepStrictEqual(testObject.restrictedSettings.workspaceFolder?.get(workspaceService.getWorkspace().folders[0].uri), ['configurationService.folder.restrictedSetting']);
    }));
    test('restricted setting is read when workspace is changed to trusted', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        testObject.updateWorkspaceTrust(false);
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.folder.restrictedSetting": "userValue" }'));
        await fileService.writeFile(joinPath(workspaceService.getWorkspace().folders[0].uri, '.vscode', 'settings.json'), VSBuffer.fromString('{ "configurationService.folder.restrictedSetting": "workspaceValue" }'));
        await testObject.reloadConfiguration();
        testObject.updateWorkspaceTrust(true);
        assert.strictEqual(testObject.getValue('configurationService.folder.restrictedSetting', {
            resource: workspaceService.getWorkspace().folders[0].uri,
        }), 'workspaceValue');
        assert.ok(testObject.restrictedSettings.default.includes('configurationService.folder.restrictedSetting'));
        assert.strictEqual(testObject.restrictedSettings.userLocal, undefined);
        assert.strictEqual(testObject.restrictedSettings.userRemote, undefined);
        assert.deepStrictEqual(testObject.restrictedSettings.workspace, [
            'configurationService.folder.restrictedSetting',
        ]);
        assert.strictEqual(testObject.restrictedSettings.workspaceFolder?.size, 1);
        assert.deepStrictEqual(testObject.restrictedSettings.workspaceFolder?.get(workspaceService.getWorkspace().folders[0].uri), ['configurationService.folder.restrictedSetting']);
    }));
    test('change event is triggered when workspace is changed to trusted', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        testObject.updateWorkspaceTrust(false);
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.folder.restrictedSetting": "userValue" }'));
        await fileService.writeFile(joinPath(workspaceService.getWorkspace().folders[0].uri, '.vscode', 'settings.json'), VSBuffer.fromString('{ "configurationService.folder.restrictedSetting": "workspaceValue" }'));
        await testObject.reloadConfiguration();
        const promise = Event.toPromise(testObject.onDidChangeConfiguration);
        testObject.updateWorkspaceTrust(true);
        const event = await promise;
        assert.ok(event.affectedKeys.has('configurationService.folder.restrictedSetting'));
        assert.ok(event.affectsConfiguration('configurationService.folder.restrictedSetting'));
    }));
    test('adding an restricted setting triggers change event', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.folder.restrictedSetting": "userValue" }'));
        testObject.updateWorkspaceTrust(false);
        const promise = Event.toPromise(testObject.onDidChangeRestrictedSettings);
        await fileService.writeFile(joinPath(workspaceService.getWorkspace().folders[0].uri, '.vscode', 'settings.json'), VSBuffer.fromString('{ "configurationService.folder.restrictedSetting": "workspaceValue" }'));
        return promise;
    }));
    test('remove an unregistered setting', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const key = 'configurationService.folder.unknownSetting';
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.folder.unknownSetting": "userValue" }'));
        await fileService.writeFile(joinPath(workspaceService.getWorkspace().folders[0].uri, '.vscode', 'settings.json'), VSBuffer.fromString('{ "configurationService.folder.unknownSetting": "workspaceValue" }'));
        await testObject.reloadConfiguration();
        await testObject.updateValue(key, undefined);
        const actual = testObject.inspect(key, {
            resource: workspaceService.getWorkspace().folders[0].uri,
        });
        assert.strictEqual(actual.userValue, undefined);
        assert.strictEqual(actual.workspaceValue, undefined);
        assert.strictEqual(actual.workspaceFolderValue, undefined);
    }));
});
suite('WorkspaceConfigurationService - Profiles', () => {
    let testObject, workspaceService, fileService, environmentService, userDataProfileService, instantiationService;
    const configurationRegistry = Registry.as(ConfigurationExtensions.Configuration);
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    suiteSetup(() => {
        configurationRegistry.registerConfiguration({
            id: '_test',
            type: 'object',
            properties: {
                [APPLY_ALL_PROFILES_SETTING]: {
                    type: 'array',
                    default: [],
                    scope: 1 /* ConfigurationScope.APPLICATION */,
                },
                'configurationService.profiles.applicationSetting': {
                    type: 'string',
                    default: 'isSet',
                    scope: 1 /* ConfigurationScope.APPLICATION */,
                },
                'configurationService.profiles.applicationMachineSetting': {
                    type: 'string',
                    default: 'isSet',
                    scope: 3 /* ConfigurationScope.APPLICATION_MACHINE */,
                },
                'configurationService.profiles.testSetting': {
                    type: 'string',
                    default: 'isSet',
                },
                'configurationService.profiles.applicationSetting2': {
                    type: 'string',
                    default: 'isSet',
                    scope: 1 /* ConfigurationScope.APPLICATION */,
                },
                'configurationService.profiles.testSetting2': {
                    type: 'string',
                    default: 'isSet',
                },
            },
        });
    });
    setup(async () => {
        const logService = new NullLogService();
        fileService = disposables.add(new FileService(logService));
        const fileSystemProvider = disposables.add(new InMemoryFileSystemProvider());
        disposables.add(fileService.registerProvider(ROOT.scheme, fileSystemProvider));
        const folder = joinPath(ROOT, 'a');
        await fileService.createFolder(folder);
        instantiationService = workbenchInstantiationService(undefined, disposables);
        environmentService = TestEnvironmentService;
        environmentService.policyFile = joinPath(folder, 'policies.json');
        const remoteAgentService = disposables.add(instantiationService.createInstance(RemoteAgentService));
        instantiationService.stub(IRemoteAgentService, remoteAgentService);
        const uriIdentityService = disposables.add(new UriIdentityService(fileService));
        const userDataProfilesService = instantiationService.stub(IUserDataProfilesService, disposables.add(new UserDataProfilesService(environmentService, fileService, uriIdentityService, logService)));
        disposables.add(fileService.registerProvider(Schemas.vscodeUserData, disposables.add(new FileUserDataProvider(ROOT.scheme, fileSystemProvider, Schemas.vscodeUserData, userDataProfilesService, uriIdentityService, new NullLogService()))));
        userDataProfileService = instantiationService.stub(IUserDataProfileService, disposables.add(new UserDataProfileService(toUserDataProfile('custom', 'custom', joinPath(environmentService.userRoamingDataHome, 'profiles', 'temp'), joinPath(environmentService.cacheHome, 'profilesCache')))));
        workspaceService = testObject = disposables.add(new WorkspaceService({ configurationCache: new ConfigurationCache() }, environmentService, userDataProfileService, userDataProfilesService, fileService, remoteAgentService, uriIdentityService, new NullLogService(), disposables.add(new FilePolicyService(environmentService.policyFile, fileService, logService))));
        instantiationService.stub(IFileService, fileService);
        instantiationService.stub(IWorkspaceContextService, testObject);
        instantiationService.stub(IConfigurationService, testObject);
        instantiationService.stub(IEnvironmentService, environmentService);
        await fileService.writeFile(userDataProfilesService.defaultProfile.settingsResource, VSBuffer.fromString('{ "configurationService.profiles.applicationSetting2": "applicationValue", "configurationService.profiles.testSetting2": "userValue" }'));
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.profiles.applicationSetting2": "profileValue", "configurationService.profiles.testSetting2": "profileValue" }'));
        await workspaceService.initialize(convertToWorkspacePayload(folder));
        instantiationService.stub(IKeybindingEditingService, disposables.add(instantiationService.createInstance(KeybindingsEditingService)));
        instantiationService.stub(ITextFileService, disposables.add(instantiationService.createInstance(TestTextFileService)));
        instantiationService.stub(ITextModelService, disposables.add(instantiationService.createInstance(TextModelResolverService)));
        workspaceService.acquireInstantiationService(instantiationService);
    });
    test('initialize', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        assert.strictEqual(testObject.getValue('configurationService.profiles.applicationSetting2'), 'applicationValue');
        assert.strictEqual(testObject.getValue('configurationService.profiles.testSetting2'), 'profileValue');
    }));
    test('inspect', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        let actual = testObject.inspect('something.missing');
        assert.strictEqual(actual.defaultValue, undefined);
        assert.strictEqual(actual.application, undefined);
        assert.strictEqual(actual.userValue, undefined);
        assert.strictEqual(actual.workspaceValue, undefined);
        assert.strictEqual(actual.workspaceFolderValue, undefined);
        assert.strictEqual(actual.value, undefined);
        actual = testObject.inspect('configurationService.profiles.applicationSetting');
        assert.strictEqual(actual.defaultValue, 'isSet');
        assert.strictEqual(actual.application, undefined);
        assert.strictEqual(actual.userValue, undefined);
        assert.strictEqual(actual.workspaceValue, undefined);
        assert.strictEqual(actual.workspaceFolderValue, undefined);
        assert.strictEqual(actual.value, 'isSet');
        await fileService.writeFile(instantiationService.get(IUserDataProfilesService).defaultProfile.settingsResource, VSBuffer.fromString('{ "configurationService.profiles.applicationSetting": "applicationValue" }'));
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.profiles.applicationSetting": "profileValue" }'));
        await testObject.reloadConfiguration();
        actual = testObject.inspect('configurationService.profiles.applicationSetting');
        assert.strictEqual(actual.defaultValue, 'isSet');
        assert.strictEqual(actual.applicationValue, 'applicationValue');
        assert.strictEqual(actual.userValue, 'profileValue');
        assert.strictEqual(actual.workspaceValue, undefined);
        assert.strictEqual(actual.workspaceFolderValue, undefined);
        assert.strictEqual(actual.value, 'applicationValue');
        await fileService.writeFile(instantiationService.get(IUserDataProfilesService).defaultProfile.settingsResource, VSBuffer.fromString('{ "configurationService.profiles.testSetting": "applicationValue" }'));
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.profiles.testSetting": "profileValue" }'));
        await testObject.reloadConfiguration();
        actual = testObject.inspect('configurationService.profiles.testSetting');
        assert.strictEqual(actual.defaultValue, 'isSet');
        assert.strictEqual(actual.applicationValue, undefined);
        assert.strictEqual(actual.userValue, 'profileValue');
        assert.strictEqual(actual.workspaceValue, undefined);
        assert.strictEqual(actual.workspaceFolderValue, undefined);
        assert.strictEqual(actual.value, 'profileValue');
    }));
    test('update application scope setting', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await testObject.updateValue('configurationService.profiles.applicationSetting', 'applicationValue');
        assert.deepStrictEqual(JSON.parse((await fileService.readFile(instantiationService.get(IUserDataProfilesService).defaultProfile.settingsResource)).value.toString()), {
            'configurationService.profiles.applicationSetting': 'applicationValue',
            'configurationService.profiles.applicationSetting2': 'applicationValue',
            'configurationService.profiles.testSetting2': 'userValue',
        });
        assert.strictEqual(testObject.getValue('configurationService.profiles.applicationSetting'), 'applicationValue');
    }));
    test('update application machine setting', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await testObject.updateValue('configurationService.profiles.applicationMachineSetting', 'applicationValue');
        assert.deepStrictEqual(JSON.parse((await fileService.readFile(instantiationService.get(IUserDataProfilesService).defaultProfile.settingsResource)).value.toString()), {
            'configurationService.profiles.applicationMachineSetting': 'applicationValue',
            'configurationService.profiles.applicationSetting2': 'applicationValue',
            'configurationService.profiles.testSetting2': 'userValue',
        });
        assert.strictEqual(testObject.getValue('configurationService.profiles.applicationMachineSetting'), 'applicationValue');
    }));
    test('update normal setting', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await testObject.updateValue('configurationService.profiles.testSetting', 'profileValue');
        assert.deepStrictEqual(JSON.parse((await fileService.readFile(userDataProfileService.currentProfile.settingsResource)).value.toString()), {
            'configurationService.profiles.testSetting': 'profileValue',
            'configurationService.profiles.testSetting2': 'profileValue',
            'configurationService.profiles.applicationSetting2': 'profileValue',
        });
        assert.strictEqual(testObject.getValue('configurationService.profiles.testSetting'), 'profileValue');
    }));
    test('registering normal setting after init', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(instantiationService.get(IUserDataProfilesService).defaultProfile.settingsResource, VSBuffer.fromString('{ "configurationService.profiles.testSetting3": "defaultProfile" }'));
        await testObject.reloadConfiguration();
        configurationRegistry.registerConfiguration({
            id: '_test',
            type: 'object',
            properties: {
                'configurationService.profiles.testSetting3': {
                    type: 'string',
                    default: 'isSet',
                },
            },
        });
        assert.strictEqual(testObject.getValue('configurationService.profiles.testSetting3'), 'isSet');
    }));
    test('registering application scope setting after init', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(instantiationService.get(IUserDataProfilesService).defaultProfile.settingsResource, VSBuffer.fromString('{ "configurationService.profiles.applicationSetting3": "defaultProfile" }'));
        await testObject.reloadConfiguration();
        configurationRegistry.registerConfiguration({
            id: '_test',
            type: 'object',
            properties: {
                'configurationService.profiles.applicationSetting3': {
                    type: 'string',
                    default: 'isSet',
                    scope: 1 /* ConfigurationScope.APPLICATION */,
                },
            },
        });
        assert.strictEqual(testObject.getValue('configurationService.profiles.applicationSetting3'), 'defaultProfile');
    }));
    test('non registering setting should not be read from default profile', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(instantiationService.get(IUserDataProfilesService).defaultProfile.settingsResource, VSBuffer.fromString('{ "configurationService.profiles.nonregistered": "defaultProfile" }'));
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.profiles.nonregistered'), undefined);
    }));
    test('initialize with custom all profiles settings', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await testObject.updateValue(APPLY_ALL_PROFILES_SETTING, ['configurationService.profiles.testSetting2'], 3 /* ConfigurationTarget.USER_LOCAL */);
        await testObject.initialize(convertToWorkspacePayload(joinPath(ROOT, 'a')));
        assert.strictEqual(testObject.getValue('configurationService.profiles.applicationSetting2'), 'applicationValue');
        assert.strictEqual(testObject.getValue('configurationService.profiles.testSetting2'), 'userValue');
    }));
    test('update all profiles settings', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const promise = Event.toPromise(testObject.onDidChangeConfiguration);
        await testObject.updateValue(APPLY_ALL_PROFILES_SETTING, ['configurationService.profiles.testSetting2'], 3 /* ConfigurationTarget.USER_LOCAL */);
        const changeEvent = await promise;
        assert.deepStrictEqual([...changeEvent.affectedKeys], [APPLY_ALL_PROFILES_SETTING, 'configurationService.profiles.testSetting2']);
        assert.strictEqual(testObject.getValue('configurationService.profiles.testSetting2'), 'userValue');
    }));
    test('setting applied to all profiles is registered later', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(instantiationService.get(IUserDataProfilesService).defaultProfile.settingsResource, VSBuffer.fromString('{ "configurationService.profiles.testSetting4": "userValue" }'));
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.profiles.testSetting4": "profileValue" }'));
        await testObject.updateValue(APPLY_ALL_PROFILES_SETTING, ['configurationService.profiles.testSetting4'], 3 /* ConfigurationTarget.USER_LOCAL */);
        assert.strictEqual(testObject.getValue('configurationService.profiles.testSetting4'), 'userValue');
        configurationRegistry.registerConfiguration({
            id: '_test',
            type: 'object',
            properties: {
                'configurationService.profiles.testSetting4': {
                    type: 'string',
                    default: 'isSet',
                },
            },
        });
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.profiles.testSetting4'), 'userValue');
    }));
    test('update setting that is applied to all profiles', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await testObject.updateValue(APPLY_ALL_PROFILES_SETTING, ['configurationService.profiles.testSetting2'], 3 /* ConfigurationTarget.USER_LOCAL */);
        const promise = Event.toPromise(testObject.onDidChangeConfiguration);
        await testObject.updateValue('configurationService.profiles.testSetting2', 'updatedValue', 3 /* ConfigurationTarget.USER_LOCAL */);
        const changeEvent = await promise;
        assert.deepStrictEqual([...changeEvent.affectedKeys], ['configurationService.profiles.testSetting2']);
        assert.strictEqual(testObject.getValue('configurationService.profiles.testSetting2'), 'updatedValue');
    }));
    test('test isSettingAppliedToAllProfiles', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        assert.strictEqual(testObject.isSettingAppliedForAllProfiles('configurationService.profiles.applicationSetting2'), true);
        assert.strictEqual(testObject.isSettingAppliedForAllProfiles('configurationService.profiles.testSetting2'), false);
        await testObject.updateValue(APPLY_ALL_PROFILES_SETTING, ['configurationService.profiles.testSetting2'], 3 /* ConfigurationTarget.USER_LOCAL */);
        assert.strictEqual(testObject.isSettingAppliedForAllProfiles('configurationService.profiles.testSetting2'), true);
    }));
    test('switch to default profile', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(instantiationService.get(IUserDataProfilesService).defaultProfile.settingsResource, VSBuffer.fromString('{ "configurationService.profiles.applicationSetting": "applicationValue", "configurationService.profiles.testSetting": "userValue" }'));
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.profiles.applicationSetting": "profileValue", "configurationService.profiles.testSetting": "profileValue" }'));
        await testObject.reloadConfiguration();
        const promise = Event.toPromise(testObject.onDidChangeConfiguration);
        await userDataProfileService.updateCurrentProfile(instantiationService.get(IUserDataProfilesService).defaultProfile);
        const changeEvent = await promise;
        assert.deepStrictEqual([...changeEvent.affectedKeys], ['configurationService.profiles.testSetting']);
        assert.strictEqual(testObject.getValue('configurationService.profiles.applicationSetting'), 'applicationValue');
        assert.strictEqual(testObject.getValue('configurationService.profiles.testSetting'), 'userValue');
    }));
    test('switch to non default profile', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(instantiationService.get(IUserDataProfilesService).defaultProfile.settingsResource, VSBuffer.fromString('{ "configurationService.profiles.applicationSetting": "applicationValue", "configurationService.profiles.testSetting": "userValue" }'));
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.profiles.applicationSetting": "profileValue", "configurationService.profiles.testSetting": "profileValue" }'));
        await testObject.reloadConfiguration();
        const profile = toUserDataProfile('custom2', 'custom2', joinPath(environmentService.userRoamingDataHome, 'profiles', 'custom2'), joinPath(environmentService.cacheHome, 'profilesCache'));
        await fileService.writeFile(profile.settingsResource, VSBuffer.fromString('{ "configurationService.profiles.applicationSetting": "profileValue2", "configurationService.profiles.testSetting": "profileValue2" }'));
        const promise = Event.toPromise(testObject.onDidChangeConfiguration);
        await userDataProfileService.updateCurrentProfile(profile);
        const changeEvent = await promise;
        assert.deepStrictEqual([...changeEvent.affectedKeys], ['configurationService.profiles.testSetting']);
        assert.strictEqual(testObject.getValue('configurationService.profiles.applicationSetting'), 'applicationValue');
        assert.strictEqual(testObject.getValue('configurationService.profiles.testSetting'), 'profileValue2');
    }));
    test('switch to non default profile using settings from default profile', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(instantiationService.get(IUserDataProfilesService).defaultProfile.settingsResource, VSBuffer.fromString('{ "configurationService.profiles.applicationSetting": "applicationValue", "configurationService.profiles.testSetting": "userValue" }'));
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.profiles.applicationSetting": "profileValue", "configurationService.profiles.testSetting": "profileValue" }'));
        await testObject.reloadConfiguration();
        const profile = toUserDataProfile('custom3', 'custom3', joinPath(environmentService.userRoamingDataHome, 'profiles', 'custom2'), joinPath(environmentService.cacheHome, 'profilesCache'), { useDefaultFlags: { settings: true } }, instantiationService.get(IUserDataProfilesService).defaultProfile);
        await fileService.writeFile(profile.settingsResource, VSBuffer.fromString('{ "configurationService.profiles.applicationSetting": "applicationValue2", "configurationService.profiles.testSetting": "profileValue2" }'));
        const promise = Event.toPromise(testObject.onDidChangeConfiguration);
        await userDataProfileService.updateCurrentProfile(profile);
        const changeEvent = await promise;
        assert.deepStrictEqual([...changeEvent.affectedKeys], [
            'configurationService.profiles.applicationSetting',
            'configurationService.profiles.testSetting',
        ]);
        assert.strictEqual(testObject.getValue('configurationService.profiles.applicationSetting'), 'applicationValue2');
        assert.strictEqual(testObject.getValue('configurationService.profiles.testSetting'), 'profileValue2');
    }));
    test('In non-default profile, changing application settings shall include only application scope settings in the change event', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(instantiationService.get(IUserDataProfilesService).defaultProfile.settingsResource, VSBuffer.fromString('{}'));
        await testObject.reloadConfiguration();
        const promise = Event.toPromise(testObject.onDidChangeConfiguration);
        await fileService.writeFile(instantiationService.get(IUserDataProfilesService).defaultProfile.settingsResource, VSBuffer.fromString('{ "configurationService.profiles.applicationSetting": "applicationValue", "configurationService.profiles.testSetting": "applicationValue" }'));
        const changeEvent = await promise;
        assert.deepStrictEqual([...changeEvent.affectedKeys], ['configurationService.profiles.applicationSetting']);
        assert.strictEqual(testObject.getValue('configurationService.profiles.applicationSetting'), 'applicationValue');
        assert.strictEqual(testObject.getValue('configurationService.profiles.testSetting'), 'isSet');
    }));
    test('switch to default profile with settings applied to all profiles', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await testObject.updateValue(APPLY_ALL_PROFILES_SETTING, ['configurationService.profiles.testSetting2'], 3 /* ConfigurationTarget.USER_LOCAL */);
        await userDataProfileService.updateCurrentProfile(instantiationService.get(IUserDataProfilesService).defaultProfile);
        assert.strictEqual(testObject.getValue('configurationService.profiles.applicationSetting2'), 'applicationValue');
        assert.strictEqual(testObject.getValue('configurationService.profiles.testSetting2'), 'userValue');
    }));
    test('switch to non default profile with settings applied to all profiles', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await testObject.updateValue(APPLY_ALL_PROFILES_SETTING, ['configurationService.profiles.testSetting2'], 3 /* ConfigurationTarget.USER_LOCAL */);
        const profile = toUserDataProfile('custom2', 'custom2', joinPath(environmentService.userRoamingDataHome, 'profiles', 'custom2'), joinPath(environmentService.cacheHome, 'profilesCache'));
        await fileService.writeFile(profile.settingsResource, VSBuffer.fromString('{ "configurationService.profiles.testSetting": "profileValue", "configurationService.profiles.testSetting2": "profileValue2" }'));
        const promise = Event.toPromise(testObject.onDidChangeConfiguration);
        await userDataProfileService.updateCurrentProfile(profile);
        const changeEvent = await promise;
        assert.deepStrictEqual([...changeEvent.affectedKeys], ['configurationService.profiles.testSetting']);
        assert.strictEqual(testObject.getValue('configurationService.profiles.applicationSetting2'), 'applicationValue');
        assert.strictEqual(testObject.getValue('configurationService.profiles.testSetting2'), 'userValue');
        assert.strictEqual(testObject.getValue('configurationService.profiles.testSetting'), 'profileValue');
    }));
    test('switch to non default from default profile with settings applied to all profiles', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await testObject.updateValue(APPLY_ALL_PROFILES_SETTING, ['configurationService.profiles.testSetting2'], 3 /* ConfigurationTarget.USER_LOCAL */);
        await userDataProfileService.updateCurrentProfile(instantiationService.get(IUserDataProfilesService).defaultProfile);
        const profile = toUserDataProfile('custom2', 'custom2', joinPath(environmentService.userRoamingDataHome, 'profiles', 'custom2'), joinPath(environmentService.cacheHome, 'profilesCache'));
        await fileService.writeFile(profile.settingsResource, VSBuffer.fromString('{ "configurationService.profiles.testSetting": "profileValue", "configurationService.profiles.testSetting2": "profileValue2" }'));
        const promise = Event.toPromise(testObject.onDidChangeConfiguration);
        await userDataProfileService.updateCurrentProfile(profile);
        const changeEvent = await promise;
        assert.deepStrictEqual([...changeEvent.affectedKeys], ['configurationService.profiles.testSetting']);
        assert.strictEqual(testObject.getValue('configurationService.profiles.applicationSetting2'), 'applicationValue');
        assert.strictEqual(testObject.getValue('configurationService.profiles.testSetting2'), 'userValue');
        assert.strictEqual(testObject.getValue('configurationService.profiles.testSetting'), 'profileValue');
    }));
});
suite('WorkspaceConfigurationService-Multiroot', () => {
    let workspaceContextService, jsonEditingServce, testObject, fileService, environmentService, userDataProfileService;
    const configurationRegistry = Registry.as(ConfigurationExtensions.Configuration);
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    suiteSetup(() => {
        configurationRegistry.registerConfiguration({
            id: '_test',
            type: 'object',
            properties: {
                'configurationService.workspace.testSetting': {
                    type: 'string',
                    default: 'isSet',
                },
                'configurationService.workspace.applicationSetting': {
                    type: 'string',
                    default: 'isSet',
                    scope: 1 /* ConfigurationScope.APPLICATION */,
                },
                'configurationService.workspace.machineSetting': {
                    type: 'string',
                    default: 'isSet',
                    scope: 2 /* ConfigurationScope.MACHINE */,
                },
                'configurationService.workspace.machineOverridableSetting': {
                    type: 'string',
                    default: 'isSet',
                    scope: 7 /* ConfigurationScope.MACHINE_OVERRIDABLE */,
                },
                'configurationService.workspace.testResourceSetting': {
                    type: 'string',
                    default: 'isSet',
                    scope: 5 /* ConfigurationScope.RESOURCE */,
                },
                'configurationService.workspace.testLanguageSetting': {
                    type: 'string',
                    default: 'isSet',
                    scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
                },
                'configurationService.workspace.testRestrictedSetting1': {
                    type: 'string',
                    default: 'isSet',
                    restricted: true,
                    scope: 5 /* ConfigurationScope.RESOURCE */,
                },
                'configurationService.workspace.testRestrictedSetting2': {
                    type: 'string',
                    default: 'isSet',
                    restricted: true,
                    scope: 5 /* ConfigurationScope.RESOURCE */,
                },
            },
        });
    });
    setup(async () => {
        const logService = new NullLogService();
        fileService = disposables.add(new FileService(logService));
        const fileSystemProvider = disposables.add(new InMemoryFileSystemProvider());
        disposables.add(fileService.registerProvider(ROOT.scheme, fileSystemProvider));
        const appSettingsHome = joinPath(ROOT, 'user');
        const folderA = joinPath(ROOT, 'a');
        const folderB = joinPath(ROOT, 'b');
        const configResource = joinPath(ROOT, 'vsctests.code-workspace');
        const workspace = { folders: [{ path: folderA.path }, { path: folderB.path }] };
        await fileService.createFolder(appSettingsHome);
        await fileService.createFolder(folderA);
        await fileService.createFolder(folderB);
        await fileService.writeFile(configResource, VSBuffer.fromString(JSON.stringify(workspace, null, '\t')));
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        environmentService = TestEnvironmentService;
        const remoteAgentService = disposables.add(instantiationService.createInstance(RemoteAgentService));
        instantiationService.stub(IRemoteAgentService, remoteAgentService);
        const uriIdentityService = disposables.add(new UriIdentityService(fileService));
        const userDataProfilesService = instantiationService.stub(IUserDataProfilesService, disposables.add(new UserDataProfilesService(environmentService, fileService, uriIdentityService, logService)));
        disposables.add(fileService.registerProvider(Schemas.vscodeUserData, disposables.add(new FileUserDataProvider(ROOT.scheme, fileSystemProvider, Schemas.vscodeUserData, userDataProfilesService, uriIdentityService, new NullLogService()))));
        userDataProfileService = instantiationService.stub(IUserDataProfileService, disposables.add(new UserDataProfileService(userDataProfilesService.defaultProfile)));
        const workspaceService = disposables.add(new WorkspaceService({ configurationCache: new ConfigurationCache() }, environmentService, userDataProfileService, userDataProfilesService, fileService, remoteAgentService, uriIdentityService, new NullLogService(), new NullPolicyService()));
        instantiationService.stub(IFileService, fileService);
        instantiationService.stub(IWorkspaceContextService, workspaceService);
        instantiationService.stub(IConfigurationService, workspaceService);
        instantiationService.stub(IWorkbenchEnvironmentService, environmentService);
        instantiationService.stub(IEnvironmentService, environmentService);
        await workspaceService.initialize(getWorkspaceIdentifier(configResource));
        instantiationService.stub(IKeybindingEditingService, disposables.add(instantiationService.createInstance(KeybindingsEditingService)));
        instantiationService.stub(ITextFileService, disposables.add(instantiationService.createInstance(TestTextFileService)));
        instantiationService.stub(ITextModelService, disposables.add(instantiationService.createInstance(TextModelResolverService)));
        jsonEditingServce = instantiationService.createInstance(JSONEditingService);
        instantiationService.stub(IJSONEditingService, jsonEditingServce);
        workspaceService.acquireInstantiationService(instantiationService);
        workspaceContextService = workspaceService;
        testObject = workspaceService;
    });
    test('application settings are not read from workspace', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.workspace.applicationSetting": "userValue" }'));
        await jsonEditingServce.write(workspaceContextService.getWorkspace().configuration, [
            {
                path: ['settings'],
                value: { 'configurationService.workspace.applicationSetting': 'workspaceValue' },
            },
        ], true);
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.workspace.applicationSetting'), 'userValue');
    }));
    test('application settings are not read from workspace when folder is passed', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.workspace.applicationSetting": "userValue" }'));
        await jsonEditingServce.write(workspaceContextService.getWorkspace().configuration, [
            {
                path: ['settings'],
                value: { 'configurationService.workspace.applicationSetting': 'workspaceValue' },
            },
        ], true);
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.workspace.applicationSetting', {
            resource: workspaceContextService.getWorkspace().folders[0].uri,
        }), 'userValue');
    }));
    test('machine settings are not read from workspace', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.folder.machineSetting": "userValue" }'));
        await jsonEditingServce.write(workspaceContextService.getWorkspace().configuration, [
            {
                path: ['settings'],
                value: { 'configurationService.workspace.machineSetting': 'workspaceValue' },
            },
        ], true);
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.folder.machineSetting'), 'userValue');
    }));
    test('machine settings are not read from workspace when folder is passed', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.folder.machineSetting": "userValue" }'));
        await jsonEditingServce.write(workspaceContextService.getWorkspace().configuration, [
            {
                path: ['settings'],
                value: { 'configurationService.workspace.machineSetting': 'workspaceValue' },
            },
        ], true);
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.folder.machineSetting', {
            resource: workspaceContextService.getWorkspace().folders[0].uri,
        }), 'userValue');
    }));
    test('get application scope settings are not loaded after defaults are registered', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.workspace.newSetting": "userValue" }'));
        await jsonEditingServce.write(workspaceContextService.getWorkspace().configuration, [
            {
                path: ['settings'],
                value: { 'configurationService.workspace.newSetting': 'workspaceValue' },
            },
        ], true);
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.workspace.newSetting'), 'workspaceValue');
        configurationRegistry.registerConfiguration({
            id: '_test',
            type: 'object',
            properties: {
                'configurationService.workspace.newSetting': {
                    type: 'string',
                    default: 'isSet',
                    scope: 1 /* ConfigurationScope.APPLICATION */,
                },
            },
        });
        assert.strictEqual(testObject.getValue('configurationService.workspace.newSetting'), 'userValue');
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.workspace.newSetting'), 'userValue');
    }));
    test('get application scope settings are not loaded after defaults are registered when workspace folder is passed', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.workspace.newSetting-2": "userValue" }'));
        await jsonEditingServce.write(workspaceContextService.getWorkspace().configuration, [
            {
                path: ['settings'],
                value: { 'configurationService.workspace.newSetting-2': 'workspaceValue' },
            },
        ], true);
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.workspace.newSetting-2', {
            resource: workspaceContextService.getWorkspace().folders[0].uri,
        }), 'workspaceValue');
        configurationRegistry.registerConfiguration({
            id: '_test',
            type: 'object',
            properties: {
                'configurationService.workspace.newSetting-2': {
                    type: 'string',
                    default: 'isSet',
                    scope: 1 /* ConfigurationScope.APPLICATION */,
                },
            },
        });
        assert.strictEqual(testObject.getValue('configurationService.workspace.newSetting-2', {
            resource: workspaceContextService.getWorkspace().folders[0].uri,
        }), 'userValue');
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.workspace.newSetting-2', {
            resource: workspaceContextService.getWorkspace().folders[0].uri,
        }), 'userValue');
    }));
    test('workspace settings override user settings after defaults are registered for machine overridable settings ', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.workspace.newMachineOverridableSetting": "userValue" }'));
        await jsonEditingServce.write(workspaceContextService.getWorkspace().configuration, [
            {
                path: ['settings'],
                value: {
                    'configurationService.workspace.newMachineOverridableSetting': 'workspaceValue',
                },
            },
        ], true);
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.workspace.newMachineOverridableSetting'), 'workspaceValue');
        configurationRegistry.registerConfiguration({
            id: '_test',
            type: 'object',
            properties: {
                'configurationService.workspace.newMachineOverridableSetting': {
                    type: 'string',
                    default: 'isSet',
                    scope: 7 /* ConfigurationScope.MACHINE_OVERRIDABLE */,
                },
            },
        });
        assert.strictEqual(testObject.getValue('configurationService.workspace.newMachineOverridableSetting'), 'workspaceValue');
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.workspace.newMachineOverridableSetting'), 'workspaceValue');
    }));
    test('application settings are not read from workspace folder', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.workspace.applicationSetting": "userValue" }'));
        await fileService.writeFile(workspaceContextService.getWorkspace().folders[0].toResource('.vscode/settings.json'), VSBuffer.fromString('{ "configurationService.workspace.applicationSetting": "workspaceFolderValue" }'));
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.workspace.applicationSetting'), 'userValue');
    }));
    test('application settings are not read from workspace folder when workspace folder is passed', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.workspace.applicationSetting": "userValue" }'));
        await fileService.writeFile(workspaceContextService.getWorkspace().folders[0].toResource('.vscode/settings.json'), VSBuffer.fromString('{ "configurationService.workspace.applicationSetting": "workspaceFolderValue" }'));
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.workspace.applicationSetting', {
            resource: workspaceContextService.getWorkspace().folders[0].uri,
        }), 'userValue');
    }));
    test('machine settings are not read from workspace folder', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.workspace.machineSetting": "userValue" }'));
        await fileService.writeFile(workspaceContextService.getWorkspace().folders[0].toResource('.vscode/settings.json'), VSBuffer.fromString('{ "configurationService.workspace.machineSetting": "workspaceFolderValue" }'));
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.workspace.machineSetting'), 'userValue');
    }));
    test('machine settings are not read from workspace folder when workspace folder is passed', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.workspace.machineSetting": "userValue" }'));
        await fileService.writeFile(workspaceContextService.getWorkspace().folders[0].toResource('.vscode/settings.json'), VSBuffer.fromString('{ "configurationService.workspace.machineSetting": "workspaceFolderValue" }'));
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.workspace.machineSetting', {
            resource: workspaceContextService.getWorkspace().folders[0].uri,
        }), 'userValue');
    }));
    test('application settings are not read from workspace folder after defaults are registered', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.workspace.testNewApplicationSetting": "userValue" }'));
        await fileService.writeFile(workspaceContextService.getWorkspace().folders[0].toResource('.vscode/settings.json'), VSBuffer.fromString('{ "configurationService.workspace.testNewApplicationSetting": "workspaceFolderValue" }'));
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.workspace.testNewApplicationSetting', {
            resource: workspaceContextService.getWorkspace().folders[0].uri,
        }), 'workspaceFolderValue');
        configurationRegistry.registerConfiguration({
            id: '_test',
            type: 'object',
            properties: {
                'configurationService.workspace.testNewApplicationSetting': {
                    type: 'string',
                    default: 'isSet',
                    scope: 1 /* ConfigurationScope.APPLICATION */,
                },
            },
        });
        assert.strictEqual(testObject.getValue('configurationService.workspace.testNewApplicationSetting', {
            resource: workspaceContextService.getWorkspace().folders[0].uri,
        }), 'userValue');
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.workspace.testNewApplicationSetting', {
            resource: workspaceContextService.getWorkspace().folders[0].uri,
        }), 'userValue');
    }));
    test('machine settings are not read from workspace folder after defaults are registered', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.workspace.testNewMachineSetting": "userValue" }'));
        await fileService.writeFile(workspaceContextService.getWorkspace().folders[0].toResource('.vscode/settings.json'), VSBuffer.fromString('{ "configurationService.workspace.testNewMachineSetting": "workspaceFolderValue" }'));
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.workspace.testNewMachineSetting', {
            resource: workspaceContextService.getWorkspace().folders[0].uri,
        }), 'workspaceFolderValue');
        configurationRegistry.registerConfiguration({
            id: '_test',
            type: 'object',
            properties: {
                'configurationService.workspace.testNewMachineSetting': {
                    type: 'string',
                    default: 'isSet',
                    scope: 2 /* ConfigurationScope.MACHINE */,
                },
            },
        });
        assert.strictEqual(testObject.getValue('configurationService.workspace.testNewMachineSetting', {
            resource: workspaceContextService.getWorkspace().folders[0].uri,
        }), 'userValue');
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.workspace.testNewMachineSetting', {
            resource: workspaceContextService.getWorkspace().folders[0].uri,
        }), 'userValue');
    }));
    test('resource setting in folder is read after it is registered later', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(workspaceContextService.getWorkspace().folders[0].toResource('.vscode/settings.json'), VSBuffer.fromString('{ "configurationService.workspace.testNewResourceSetting2": "workspaceFolderValue" }'));
        await jsonEditingServce.write(workspaceContextService.getWorkspace().configuration, [
            {
                path: ['settings'],
                value: { 'configurationService.workspace.testNewResourceSetting2': 'workspaceValue' },
            },
        ], true);
        await testObject.reloadConfiguration();
        configurationRegistry.registerConfiguration({
            id: '_test',
            type: 'object',
            properties: {
                'configurationService.workspace.testNewResourceSetting2': {
                    type: 'string',
                    default: 'isSet',
                    scope: 5 /* ConfigurationScope.RESOURCE */,
                },
            },
        });
        assert.strictEqual(testObject.getValue('configurationService.workspace.testNewResourceSetting2', {
            resource: workspaceContextService.getWorkspace().folders[0].uri,
        }), 'workspaceFolderValue');
    }));
    test('resource language setting in folder is read after it is registered later', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(workspaceContextService.getWorkspace().folders[0].toResource('.vscode/settings.json'), VSBuffer.fromString('{ "configurationService.workspace.testNewResourceLanguageSetting2": "workspaceFolderValue" }'));
        await jsonEditingServce.write(workspaceContextService.getWorkspace().configuration, [
            {
                path: ['settings'],
                value: {
                    'configurationService.workspace.testNewResourceLanguageSetting2': 'workspaceValue',
                },
            },
        ], true);
        await testObject.reloadConfiguration();
        configurationRegistry.registerConfiguration({
            id: '_test',
            type: 'object',
            properties: {
                'configurationService.workspace.testNewResourceLanguageSetting2': {
                    type: 'string',
                    default: 'isSet',
                    scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
                },
            },
        });
        assert.strictEqual(testObject.getValue('configurationService.workspace.testNewResourceLanguageSetting2', {
            resource: workspaceContextService.getWorkspace().folders[0].uri,
        }), 'workspaceFolderValue');
    }));
    test('machine overridable setting in folder is read after it is registered later', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(workspaceContextService.getWorkspace().folders[0].toResource('.vscode/settings.json'), VSBuffer.fromString('{ "configurationService.workspace.testNewMachineOverridableSetting2": "workspaceFolderValue" }'));
        await jsonEditingServce.write(workspaceContextService.getWorkspace().configuration, [
            {
                path: ['settings'],
                value: {
                    'configurationService.workspace.testNewMachineOverridableSetting2': 'workspaceValue',
                },
            },
        ], true);
        await testObject.reloadConfiguration();
        configurationRegistry.registerConfiguration({
            id: '_test',
            type: 'object',
            properties: {
                'configurationService.workspace.testNewMachineOverridableSetting2': {
                    type: 'string',
                    default: 'isSet',
                    scope: 7 /* ConfigurationScope.MACHINE_OVERRIDABLE */,
                },
            },
        });
        assert.strictEqual(testObject.getValue('configurationService.workspace.testNewMachineOverridableSetting2', {
            resource: workspaceContextService.getWorkspace().folders[0].uri,
        }), 'workspaceFolderValue');
    }));
    test('inspect', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        let actual = testObject.inspect('something.missing');
        assert.strictEqual(actual.defaultValue, undefined);
        assert.strictEqual(actual.userValue, undefined);
        assert.strictEqual(actual.workspaceValue, undefined);
        assert.strictEqual(actual.workspaceFolderValue, undefined);
        assert.strictEqual(actual.value, undefined);
        actual = testObject.inspect('configurationService.workspace.testResourceSetting');
        assert.strictEqual(actual.defaultValue, 'isSet');
        assert.strictEqual(actual.userValue, undefined);
        assert.strictEqual(actual.workspaceValue, undefined);
        assert.strictEqual(actual.workspaceFolderValue, undefined);
        assert.strictEqual(actual.value, 'isSet');
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.workspace.testResourceSetting": "userValue" }'));
        await testObject.reloadConfiguration();
        actual = testObject.inspect('configurationService.workspace.testResourceSetting');
        assert.strictEqual(actual.defaultValue, 'isSet');
        assert.strictEqual(actual.userValue, 'userValue');
        assert.strictEqual(actual.workspaceValue, undefined);
        assert.strictEqual(actual.workspaceFolderValue, undefined);
        assert.strictEqual(actual.value, 'userValue');
        await jsonEditingServce.write(workspaceContextService.getWorkspace().configuration, [
            {
                path: ['settings'],
                value: { 'configurationService.workspace.testResourceSetting': 'workspaceValue' },
            },
        ], true);
        await testObject.reloadConfiguration();
        actual = testObject.inspect('configurationService.workspace.testResourceSetting');
        assert.strictEqual(actual.defaultValue, 'isSet');
        assert.strictEqual(actual.userValue, 'userValue');
        assert.strictEqual(actual.workspaceValue, 'workspaceValue');
        assert.strictEqual(actual.workspaceFolderValue, undefined);
        assert.strictEqual(actual.value, 'workspaceValue');
        await fileService.writeFile(workspaceContextService.getWorkspace().folders[0].toResource('.vscode/settings.json'), VSBuffer.fromString('{ "configurationService.workspace.testResourceSetting": "workspaceFolderValue" }'));
        await testObject.reloadConfiguration();
        actual = testObject.inspect('configurationService.workspace.testResourceSetting', {
            resource: workspaceContextService.getWorkspace().folders[0].uri,
        });
        assert.strictEqual(actual.defaultValue, 'isSet');
        assert.strictEqual(actual.userValue, 'userValue');
        assert.strictEqual(actual.workspaceValue, 'workspaceValue');
        assert.strictEqual(actual.workspaceFolderValue, 'workspaceFolderValue');
        assert.strictEqual(actual.value, 'workspaceFolderValue');
    }));
    test('inspect restricted settings', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        testObject.updateWorkspaceTrust(false);
        await jsonEditingServce.write(workspaceContextService.getWorkspace().configuration, [
            {
                path: ['settings'],
                value: {
                    'configurationService.workspace.testRestrictedSetting1': 'workspaceRestrictedValue',
                },
            },
        ], true);
        await testObject.reloadConfiguration();
        let actual = testObject.inspect('configurationService.workspace.testRestrictedSetting1', {
            resource: workspaceContextService.getWorkspace().folders[0].uri,
        });
        assert.strictEqual(actual.defaultValue, 'isSet');
        assert.strictEqual(actual.application, undefined);
        assert.strictEqual(actual.userValue, undefined);
        assert.strictEqual(actual.workspaceValue, 'workspaceRestrictedValue');
        assert.strictEqual(actual.workspaceFolderValue, undefined);
        assert.strictEqual(actual.value, 'isSet');
        testObject.updateWorkspaceTrust(true);
        await testObject.reloadConfiguration();
        actual = testObject.inspect('configurationService.workspace.testRestrictedSetting1', {
            resource: workspaceContextService.getWorkspace().folders[0].uri,
        });
        assert.strictEqual(actual.defaultValue, 'isSet');
        assert.strictEqual(actual.application, undefined);
        assert.strictEqual(actual.userValue, undefined);
        assert.strictEqual(actual.workspaceValue, 'workspaceRestrictedValue');
        assert.strictEqual(actual.workspaceFolderValue, undefined);
        assert.strictEqual(actual.value, 'workspaceRestrictedValue');
        testObject.updateWorkspaceTrust(false);
        await fileService.writeFile(workspaceContextService.getWorkspace().folders[0].toResource('.vscode/settings.json'), VSBuffer.fromString('{ "configurationService.workspace.testRestrictedSetting1": "workspaceFolderRestrictedValue" }'));
        await testObject.reloadConfiguration();
        actual = testObject.inspect('configurationService.workspace.testRestrictedSetting1', {
            resource: workspaceContextService.getWorkspace().folders[0].uri,
        });
        assert.strictEqual(actual.defaultValue, 'isSet');
        assert.strictEqual(actual.application, undefined);
        assert.strictEqual(actual.userValue, undefined);
        assert.strictEqual(actual.workspaceValue, 'workspaceRestrictedValue');
        assert.strictEqual(actual.workspaceFolderValue, 'workspaceFolderRestrictedValue');
        assert.strictEqual(actual.value, 'isSet');
        testObject.updateWorkspaceTrust(true);
        await testObject.reloadConfiguration();
        actual = testObject.inspect('configurationService.workspace.testRestrictedSetting1', {
            resource: workspaceContextService.getWorkspace().folders[0].uri,
        });
        assert.strictEqual(actual.defaultValue, 'isSet');
        assert.strictEqual(actual.application, undefined);
        assert.strictEqual(actual.userValue, undefined);
        assert.strictEqual(actual.workspaceValue, 'workspaceRestrictedValue');
        assert.strictEqual(actual.workspaceFolderValue, 'workspaceFolderRestrictedValue');
        assert.strictEqual(actual.value, 'workspaceFolderRestrictedValue');
    }));
    test('inspect restricted settings after change', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        testObject.updateWorkspaceTrust(false);
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.workspace.testRestrictedSetting1": "userRestrictedValue" }'));
        await testObject.reloadConfiguration();
        let promise = Event.toPromise(testObject.onDidChangeConfiguration);
        await jsonEditingServce.write(workspaceContextService.getWorkspace().configuration, [
            {
                path: ['settings'],
                value: {
                    'configurationService.workspace.testRestrictedSetting1': 'workspaceRestrictedValue',
                },
            },
        ], true);
        let event = await promise;
        let actual = testObject.inspect('configurationService.workspace.testRestrictedSetting1', {
            resource: workspaceContextService.getWorkspace().folders[0].uri,
        });
        assert.strictEqual(actual.defaultValue, 'isSet');
        assert.strictEqual(actual.application, undefined);
        assert.strictEqual(actual.userValue, 'userRestrictedValue');
        assert.strictEqual(actual.workspaceValue, 'workspaceRestrictedValue');
        assert.strictEqual(actual.workspaceFolderValue, undefined);
        assert.strictEqual(actual.value, 'userRestrictedValue');
        assert.strictEqual(event.affectsConfiguration('configurationService.workspace.testRestrictedSetting1'), true);
        promise = Event.toPromise(testObject.onDidChangeConfiguration);
        await fileService.writeFile(workspaceContextService.getWorkspace().folders[0].toResource('.vscode/settings.json'), VSBuffer.fromString('{ "configurationService.workspace.testRestrictedSetting1": "workspaceFolderRestrictedValue" }'));
        event = await promise;
        actual = testObject.inspect('configurationService.workspace.testRestrictedSetting1', {
            resource: workspaceContextService.getWorkspace().folders[0].uri,
        });
        assert.strictEqual(actual.defaultValue, 'isSet');
        assert.strictEqual(actual.application, undefined);
        assert.strictEqual(actual.userValue, 'userRestrictedValue');
        assert.strictEqual(actual.workspaceValue, 'workspaceRestrictedValue');
        assert.strictEqual(actual.workspaceFolderValue, 'workspaceFolderRestrictedValue');
        assert.strictEqual(actual.value, 'userRestrictedValue');
        assert.strictEqual(event.affectsConfiguration('configurationService.workspace.testRestrictedSetting1'), true);
    }));
    test('get launch configuration', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const expectedLaunchConfiguration = {
            version: '0.1.0',
            configurations: [
                {
                    type: 'node',
                    request: 'launch',
                    name: 'Gulp Build',
                    program: '${workspaceFolder}/node_modules/gulp/bin/gulp.js',
                    stopOnEntry: true,
                    args: ['watch-extension:json-client'],
                    cwd: '${workspaceFolder}',
                },
            ],
        };
        await jsonEditingServce.write(workspaceContextService.getWorkspace().configuration, [{ path: ['launch'], value: expectedLaunchConfiguration }], true);
        await testObject.reloadConfiguration();
        const actual = testObject.getValue('launch');
        assert.deepStrictEqual(actual, expectedLaunchConfiguration);
    }));
    test('inspect launch configuration', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const expectedLaunchConfiguration = {
            version: '0.1.0',
            configurations: [
                {
                    type: 'node',
                    request: 'launch',
                    name: 'Gulp Build',
                    program: '${workspaceFolder}/node_modules/gulp/bin/gulp.js',
                    stopOnEntry: true,
                    args: ['watch-extension:json-client'],
                    cwd: '${workspaceFolder}',
                },
            ],
        };
        await jsonEditingServce.write(workspaceContextService.getWorkspace().configuration, [{ path: ['launch'], value: expectedLaunchConfiguration }], true);
        await testObject.reloadConfiguration();
        const actual = testObject.inspect('launch').workspaceValue;
        assert.deepStrictEqual(actual, expectedLaunchConfiguration);
    }));
    test('get tasks configuration', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const expectedTasksConfiguration = {
            version: '2.0.0',
            tasks: [
                {
                    label: 'Run Dev',
                    type: 'shell',
                    command: './scripts/code.sh',
                    windows: {
                        command: '.\\scripts\\code.bat',
                    },
                    problemMatcher: [],
                },
            ],
        };
        await jsonEditingServce.write(workspaceContextService.getWorkspace().configuration, [{ path: ['tasks'], value: expectedTasksConfiguration }], true);
        await testObject.reloadConfiguration();
        const actual = testObject.getValue("tasks" /* TasksSchemaProperties.Tasks */);
        assert.deepStrictEqual(actual, expectedTasksConfiguration);
    }));
    test('inspect tasks configuration', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const expectedTasksConfiguration = {
            version: '2.0.0',
            tasks: [
                {
                    label: 'Run Dev',
                    type: 'shell',
                    command: './scripts/code.sh',
                    windows: {
                        command: '.\\scripts\\code.bat',
                    },
                    problemMatcher: [],
                },
            ],
        };
        await jsonEditingServce.write(workspaceContextService.getWorkspace().configuration, [{ path: ['tasks'], value: expectedTasksConfiguration }], true);
        await testObject.reloadConfiguration();
        const actual = testObject.inspect('tasks').workspaceValue;
        assert.deepStrictEqual(actual, expectedTasksConfiguration);
    }));
    test('update user configuration', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await testObject.updateValue('configurationService.workspace.testSetting', 'userValue', 2 /* ConfigurationTarget.USER */);
        assert.strictEqual(testObject.getValue('configurationService.workspace.testSetting'), 'userValue');
    }));
    test('update user configuration should trigger change event before promise is resolve', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const target = sinon.spy();
        disposables.add(testObject.onDidChangeConfiguration(target));
        await testObject.updateValue('configurationService.workspace.testSetting', 'userValue', 2 /* ConfigurationTarget.USER */);
        assert.ok(target.called);
    }));
    test('update workspace configuration', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await testObject.updateValue('configurationService.workspace.testSetting', 'workspaceValue', 5 /* ConfigurationTarget.WORKSPACE */);
        assert.strictEqual(testObject.getValue('configurationService.workspace.testSetting'), 'workspaceValue');
    }));
    test('update workspace configuration should trigger change event before promise is resolve', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const target = sinon.spy();
        disposables.add(testObject.onDidChangeConfiguration(target));
        await testObject.updateValue('configurationService.workspace.testSetting', 'workspaceValue', 5 /* ConfigurationTarget.WORKSPACE */);
        assert.ok(target.called);
    }));
    test('update application setting into workspace configuration in a workspace is not supported', () => {
        return testObject
            .updateValue('configurationService.workspace.applicationSetting', 'workspaceValue', {}, 5 /* ConfigurationTarget.WORKSPACE */, { donotNotifyError: true })
            .then(() => assert.fail('Should not be supported'), (e) => assert.strictEqual(e.code, 1 /* ConfigurationEditingErrorCode.ERROR_INVALID_WORKSPACE_CONFIGURATION_APPLICATION */));
    });
    test('update machine setting into workspace configuration in a workspace is not supported', () => {
        return testObject
            .updateValue('configurationService.workspace.machineSetting', 'workspaceValue', {}, 5 /* ConfigurationTarget.WORKSPACE */, { donotNotifyError: true })
            .then(() => assert.fail('Should not be supported'), (e) => assert.strictEqual(e.code, 2 /* ConfigurationEditingErrorCode.ERROR_INVALID_WORKSPACE_CONFIGURATION_MACHINE */));
    });
    test('update workspace folder configuration', () => {
        const workspace = workspaceContextService.getWorkspace();
        return testObject
            .updateValue('configurationService.workspace.testResourceSetting', 'workspaceFolderValue', { resource: workspace.folders[0].uri }, 6 /* ConfigurationTarget.WORKSPACE_FOLDER */)
            .then(() => assert.strictEqual(testObject.getValue('configurationService.workspace.testResourceSetting', {
            resource: workspace.folders[0].uri,
        }), 'workspaceFolderValue'));
    });
    test('update resource language configuration in workspace folder', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const workspace = workspaceContextService.getWorkspace();
        await testObject.updateValue('configurationService.workspace.testLanguageSetting', 'workspaceFolderValue', { resource: workspace.folders[0].uri }, 6 /* ConfigurationTarget.WORKSPACE_FOLDER */);
        assert.strictEqual(testObject.getValue('configurationService.workspace.testLanguageSetting', {
            resource: workspace.folders[0].uri,
        }), 'workspaceFolderValue');
    }));
    test('update workspace folder configuration should trigger change event before promise is resolve', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const workspace = workspaceContextService.getWorkspace();
        const target = sinon.spy();
        disposables.add(testObject.onDidChangeConfiguration(target));
        await testObject.updateValue('configurationService.workspace.testResourceSetting', 'workspaceFolderValue', { resource: workspace.folders[0].uri }, 6 /* ConfigurationTarget.WORKSPACE_FOLDER */);
        assert.ok(target.called);
    }));
    test('update workspace folder configuration second time should trigger change event before promise is resolve', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const workspace = workspaceContextService.getWorkspace();
        await testObject.updateValue('configurationService.workspace.testResourceSetting', 'workspaceFolderValue', { resource: workspace.folders[0].uri }, 6 /* ConfigurationTarget.WORKSPACE_FOLDER */);
        const target = sinon.spy();
        disposables.add(testObject.onDidChangeConfiguration(target));
        await testObject.updateValue('configurationService.workspace.testResourceSetting', 'workspaceFolderValue2', { resource: workspace.folders[0].uri }, 6 /* ConfigurationTarget.WORKSPACE_FOLDER */);
        assert.ok(target.called);
    }));
    test('update machine overridable setting in folder', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const workspace = workspaceContextService.getWorkspace();
        await testObject.updateValue('configurationService.workspace.machineOverridableSetting', 'workspaceFolderValue', { resource: workspace.folders[0].uri }, 6 /* ConfigurationTarget.WORKSPACE_FOLDER */);
        assert.strictEqual(testObject.getValue('configurationService.workspace.machineOverridableSetting', {
            resource: workspace.folders[0].uri,
        }), 'workspaceFolderValue');
    }));
    test('update memory configuration', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await testObject.updateValue('configurationService.workspace.testSetting', 'memoryValue', 8 /* ConfigurationTarget.MEMORY */);
        assert.strictEqual(testObject.getValue('configurationService.workspace.testSetting'), 'memoryValue');
    }));
    test('update memory configuration should trigger change event before promise is resolve', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const target = sinon.spy();
        disposables.add(testObject.onDidChangeConfiguration(target));
        await testObject.updateValue('configurationService.workspace.testSetting', 'memoryValue', 8 /* ConfigurationTarget.MEMORY */);
        assert.ok(target.called);
    }));
    test('remove setting from all targets', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const workspace = workspaceContextService.getWorkspace();
        const key = 'configurationService.workspace.testResourceSetting';
        await testObject.updateValue(key, 'workspaceFolderValue', { resource: workspace.folders[0].uri }, 6 /* ConfigurationTarget.WORKSPACE_FOLDER */);
        await testObject.updateValue(key, 'workspaceValue', 5 /* ConfigurationTarget.WORKSPACE */);
        await testObject.updateValue(key, 'userValue', 2 /* ConfigurationTarget.USER */);
        await testObject.updateValue(key, undefined, { resource: workspace.folders[0].uri });
        await testObject.reloadConfiguration();
        const actual = testObject.inspect(key, { resource: workspace.folders[0].uri });
        assert.strictEqual(actual.userValue, undefined);
        assert.strictEqual(actual.workspaceValue, undefined);
        assert.strictEqual(actual.workspaceFolderValue, undefined);
    }));
    test('update tasks configuration in a folder', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const workspace = workspaceContextService.getWorkspace();
        await testObject.updateValue('tasks', { version: '1.0.0', tasks: [{ taskName: 'myTask' }] }, { resource: workspace.folders[0].uri }, 6 /* ConfigurationTarget.WORKSPACE_FOLDER */);
        assert.deepStrictEqual(testObject.getValue("tasks" /* TasksSchemaProperties.Tasks */, { resource: workspace.folders[0].uri }), { version: '1.0.0', tasks: [{ taskName: 'myTask' }] });
    }));
    test('update launch configuration in a workspace', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const workspace = workspaceContextService.getWorkspace();
        await testObject.updateValue('launch', { version: '1.0.0', configurations: [{ name: 'myLaunch' }] }, { resource: workspace.folders[0].uri }, 5 /* ConfigurationTarget.WORKSPACE */, { donotNotifyError: true });
        assert.deepStrictEqual(testObject.getValue('launch'), {
            version: '1.0.0',
            configurations: [{ name: 'myLaunch' }],
        });
    }));
    test('update tasks configuration in a workspace', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const workspace = workspaceContextService.getWorkspace();
        const tasks = { version: '2.0.0', tasks: [{ label: 'myTask' }] };
        await testObject.updateValue('tasks', tasks, { resource: workspace.folders[0].uri }, 5 /* ConfigurationTarget.WORKSPACE */, { donotNotifyError: true });
        assert.deepStrictEqual(testObject.getValue("tasks" /* TasksSchemaProperties.Tasks */), tasks);
    }));
    test('configuration of newly added folder is available on configuration change event', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const workspaceService = testObject;
        const uri = workspaceService.getWorkspace().folders[1].uri;
        await workspaceService.removeFolders([uri]);
        await fileService.writeFile(joinPath(uri, '.vscode', 'settings.json'), VSBuffer.fromString('{ "configurationService.workspace.testResourceSetting": "workspaceFolderValue" }'));
        return new Promise((c, e) => {
            disposables.add(testObject.onDidChangeConfiguration(() => {
                try {
                    assert.strictEqual(testObject.getValue('configurationService.workspace.testResourceSetting', {
                        resource: uri,
                    }), 'workspaceFolderValue');
                    c();
                }
                catch (error) {
                    e(error);
                }
            }));
            workspaceService.addFolders([{ uri }]);
        });
    }));
    test('restricted setting is read from workspace folders when workspace is trusted', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        testObject.updateWorkspaceTrust(true);
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.workspace.testRestrictedSetting1": "userValue", "configurationService.workspace.testRestrictedSetting2": "userValue" }'));
        await jsonEditingServce.write(workspaceContextService.getWorkspace().configuration, [
            {
                path: ['settings'],
                value: { 'configurationService.workspace.testRestrictedSetting1': 'workspaceValue' },
            },
        ], true);
        await fileService.writeFile(joinPath(testObject.getWorkspace().folders[1].uri, '.vscode', 'settings.json'), VSBuffer.fromString('{ "configurationService.workspace.testRestrictedSetting2": "workspaceFolder2Value" }'));
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.workspace.testRestrictedSetting1', {
            resource: testObject.getWorkspace().folders[0].uri,
        }), 'workspaceValue');
        assert.strictEqual(testObject.getValue('configurationService.workspace.testRestrictedSetting2', {
            resource: testObject.getWorkspace().folders[1].uri,
        }), 'workspaceFolder2Value');
        assert.ok(testObject.restrictedSettings.default.includes('configurationService.workspace.testRestrictedSetting1'));
        assert.ok(testObject.restrictedSettings.default.includes('configurationService.workspace.testRestrictedSetting2'));
        assert.strictEqual(testObject.restrictedSettings.userLocal, undefined);
        assert.strictEqual(testObject.restrictedSettings.userRemote, undefined);
        assert.deepStrictEqual(testObject.restrictedSettings.workspace, [
            'configurationService.workspace.testRestrictedSetting1',
        ]);
        assert.strictEqual(testObject.restrictedSettings.workspaceFolder?.size, 1);
        assert.strictEqual(testObject.restrictedSettings.workspaceFolder?.get(testObject.getWorkspace().folders[0].uri), undefined);
        assert.deepStrictEqual(testObject.restrictedSettings.workspaceFolder?.get(testObject.getWorkspace().folders[1].uri), ['configurationService.workspace.testRestrictedSetting2']);
    }));
    test('restricted setting is not read from workspace when workspace is not trusted', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        testObject.updateWorkspaceTrust(false);
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.workspace.testRestrictedSetting1": "userValue", "configurationService.workspace.testRestrictedSetting2": "userValue" }'));
        await jsonEditingServce.write(workspaceContextService.getWorkspace().configuration, [
            {
                path: ['settings'],
                value: { 'configurationService.workspace.testRestrictedSetting1': 'workspaceValue' },
            },
        ], true);
        await fileService.writeFile(joinPath(testObject.getWorkspace().folders[1].uri, '.vscode', 'settings.json'), VSBuffer.fromString('{ "configurationService.workspace.testRestrictedSetting2": "workspaceFolder2Value" }'));
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.getValue('configurationService.workspace.testRestrictedSetting1', {
            resource: testObject.getWorkspace().folders[0].uri,
        }), 'userValue');
        assert.strictEqual(testObject.getValue('configurationService.workspace.testRestrictedSetting2', {
            resource: testObject.getWorkspace().folders[1].uri,
        }), 'userValue');
        assert.ok(testObject.restrictedSettings.default.includes('configurationService.workspace.testRestrictedSetting1'));
        assert.ok(testObject.restrictedSettings.default.includes('configurationService.workspace.testRestrictedSetting2'));
        assert.strictEqual(testObject.restrictedSettings.userLocal, undefined);
        assert.strictEqual(testObject.restrictedSettings.userRemote, undefined);
        assert.deepStrictEqual(testObject.restrictedSettings.workspace, [
            'configurationService.workspace.testRestrictedSetting1',
        ]);
        assert.strictEqual(testObject.restrictedSettings.workspaceFolder?.size, 1);
        assert.strictEqual(testObject.restrictedSettings.workspaceFolder?.get(testObject.getWorkspace().folders[0].uri), undefined);
        assert.deepStrictEqual(testObject.restrictedSettings.workspaceFolder?.get(testObject.getWorkspace().folders[1].uri), ['configurationService.workspace.testRestrictedSetting2']);
    }));
    test('remove an unregistered setting', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const key = 'configurationService.workspace.unknownSetting';
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.workspace.unknownSetting": "userValue" }'));
        await jsonEditingServce.write(workspaceContextService.getWorkspace().configuration, [
            {
                path: ['settings'],
                value: { 'configurationService.workspace.unknownSetting': 'workspaceValue' },
            },
        ], true);
        await fileService.writeFile(joinPath(workspaceContextService.getWorkspace().folders[0].uri, '.vscode', 'settings.json'), VSBuffer.fromString('{ "configurationService.workspace.unknownSetting": "workspaceFolderValue1" }'));
        await fileService.writeFile(joinPath(workspaceContextService.getWorkspace().folders[1].uri, '.vscode', 'settings.json'), VSBuffer.fromString('{ "configurationService.workspace.unknownSetting": "workspaceFolderValue2" }'));
        await testObject.reloadConfiguration();
        await testObject.updateValue(key, undefined, {
            resource: workspaceContextService.getWorkspace().folders[0].uri,
        });
        let actual = testObject.inspect(key, {
            resource: workspaceContextService.getWorkspace().folders[0].uri,
        });
        assert.strictEqual(actual.userValue, undefined);
        assert.strictEqual(actual.workspaceValue, undefined);
        assert.strictEqual(actual.workspaceFolderValue, undefined);
        await testObject.updateValue(key, undefined, {
            resource: workspaceContextService.getWorkspace().folders[1].uri,
        });
        actual = testObject.inspect(key, {
            resource: workspaceContextService.getWorkspace().folders[1].uri,
        });
        assert.strictEqual(actual.userValue, undefined);
        assert.strictEqual(actual.workspaceValue, undefined);
        assert.strictEqual(actual.workspaceFolderValue, undefined);
    }));
});
suite('WorkspaceConfigurationService - Remote Folder', () => {
    let testObject, folder, machineSettingsResource, remoteSettingsResource, fileSystemProvider, resolveRemoteEnvironment, instantiationService, fileService, environmentService, userDataProfileService;
    const remoteAuthority = 'configuraiton-tests';
    const configurationRegistry = Registry.as(ConfigurationExtensions.Configuration);
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    suiteSetup(() => {
        configurationRegistry.registerConfiguration({
            id: '_test',
            type: 'object',
            properties: {
                'configurationService.remote.applicationSetting': {
                    type: 'string',
                    default: 'isSet',
                    scope: 1 /* ConfigurationScope.APPLICATION */,
                },
                'configurationService.remote.machineSetting': {
                    type: 'string',
                    default: 'isSet',
                    scope: 2 /* ConfigurationScope.MACHINE */,
                },
                'configurationService.remote.applicationMachineSetting': {
                    type: 'string',
                    default: 'isSet',
                    scope: 3 /* ConfigurationScope.APPLICATION_MACHINE */,
                },
                'configurationService.remote.machineOverridableSetting': {
                    type: 'string',
                    default: 'isSet',
                    scope: 7 /* ConfigurationScope.MACHINE_OVERRIDABLE */,
                },
                'configurationService.remote.testSetting': {
                    type: 'string',
                    default: 'isSet',
                    scope: 5 /* ConfigurationScope.RESOURCE */,
                },
            },
        });
    });
    setup(async () => {
        const logService = new NullLogService();
        fileService = disposables.add(new FileService(logService));
        fileSystemProvider = disposables.add(new InMemoryFileSystemProvider());
        disposables.add(fileService.registerProvider(ROOT.scheme, fileSystemProvider));
        const appSettingsHome = joinPath(ROOT, 'user');
        folder = joinPath(ROOT, 'a');
        await fileService.createFolder(folder);
        await fileService.createFolder(appSettingsHome);
        machineSettingsResource = joinPath(ROOT, 'machine-settings.json');
        remoteSettingsResource = machineSettingsResource.with({
            scheme: Schemas.vscodeRemote,
            authority: remoteAuthority,
        });
        instantiationService = workbenchInstantiationService(undefined, disposables);
        environmentService = TestEnvironmentService;
        const remoteEnvironmentPromise = new Promise((c) => (resolveRemoteEnvironment = () => c({ settingsPath: remoteSettingsResource })));
        const remoteAgentService = instantiationService.stub(IRemoteAgentService, { getEnvironment: () => remoteEnvironmentPromise });
        const configurationCache = {
            read: () => Promise.resolve(''),
            write: () => Promise.resolve(),
            remove: () => Promise.resolve(),
            needsCaching: () => false,
        };
        const uriIdentityService = disposables.add(new UriIdentityService(fileService));
        const userDataProfilesService = instantiationService.stub(IUserDataProfilesService, disposables.add(new UserDataProfilesService(environmentService, fileService, uriIdentityService, logService)));
        disposables.add(fileService.registerProvider(Schemas.vscodeUserData, disposables.add(new FileUserDataProvider(ROOT.scheme, fileSystemProvider, Schemas.vscodeUserData, userDataProfilesService, uriIdentityService, new NullLogService()))));
        userDataProfileService = instantiationService.stub(IUserDataProfileService, disposables.add(new UserDataProfileService(userDataProfilesService.defaultProfile)));
        testObject = disposables.add(new WorkspaceService({ configurationCache, remoteAuthority }, environmentService, userDataProfileService, userDataProfilesService, fileService, remoteAgentService, uriIdentityService, new NullLogService(), new NullPolicyService()));
        instantiationService.stub(IWorkspaceContextService, testObject);
        instantiationService.stub(IConfigurationService, testObject);
        instantiationService.stub(IEnvironmentService, environmentService);
        instantiationService.stub(IFileService, fileService);
    });
    async function initialize() {
        await testObject.initialize(convertToWorkspacePayload(folder));
        instantiationService.stub(ITextFileService, disposables.add(instantiationService.createInstance(TestTextFileService)));
        instantiationService.stub(ITextModelService, (disposables.add(instantiationService.createInstance(TextModelResolverService))));
        instantiationService.stub(IJSONEditingService, instantiationService.createInstance(JSONEditingService));
        testObject.acquireInstantiationService(instantiationService);
    }
    function registerRemoteFileSystemProvider() {
        disposables.add(instantiationService
            .get(IFileService)
            .registerProvider(Schemas.vscodeRemote, new RemoteFileSystemProvider(fileSystemProvider, remoteAuthority)));
    }
    function registerRemoteFileSystemProviderOnActivation() {
        const disposable = disposables.add(instantiationService.get(IFileService).onWillActivateFileSystemProvider((e) => {
            if (e.scheme === Schemas.vscodeRemote) {
                disposable.dispose();
                e.join(Promise.resolve().then(() => registerRemoteFileSystemProvider()));
            }
        }));
    }
    test('remote machine settings override globals', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(machineSettingsResource, VSBuffer.fromString('{ "configurationService.remote.machineSetting": "remoteValue" }'));
        registerRemoteFileSystemProvider();
        resolveRemoteEnvironment();
        await initialize();
        assert.strictEqual(testObject.getValue('configurationService.remote.machineSetting'), 'remoteValue');
    }));
    test('remote machine settings override globals after remote provider is registered on activation', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(machineSettingsResource, VSBuffer.fromString('{ "configurationService.remote.machineSetting": "remoteValue" }'));
        resolveRemoteEnvironment();
        registerRemoteFileSystemProviderOnActivation();
        await initialize();
        assert.strictEqual(testObject.getValue('configurationService.remote.machineSetting'), 'remoteValue');
    }));
    test('remote machine settings override globals after remote environment is resolved', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(machineSettingsResource, VSBuffer.fromString('{ "configurationService.remote.machineSetting": "remoteValue" }'));
        registerRemoteFileSystemProvider();
        await initialize();
        const promise = new Promise((c, e) => {
            disposables.add(testObject.onDidChangeConfiguration((event) => {
                try {
                    assert.strictEqual(event.source, 2 /* ConfigurationTarget.USER */);
                    assert.deepStrictEqual([...event.affectedKeys], ['configurationService.remote.machineSetting']);
                    assert.strictEqual(testObject.getValue('configurationService.remote.machineSetting'), 'remoteValue');
                    c();
                }
                catch (error) {
                    e(error);
                }
            }));
        });
        resolveRemoteEnvironment();
        return promise;
    }));
    test('remote settings override globals after remote provider is registered on activation and remote environment is resolved', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(machineSettingsResource, VSBuffer.fromString('{ "configurationService.remote.machineSetting": "remoteValue" }'));
        registerRemoteFileSystemProviderOnActivation();
        await initialize();
        const promise = new Promise((c, e) => {
            disposables.add(testObject.onDidChangeConfiguration((event) => {
                try {
                    assert.strictEqual(event.source, 2 /* ConfigurationTarget.USER */);
                    assert.deepStrictEqual([...event.affectedKeys], ['configurationService.remote.machineSetting']);
                    assert.strictEqual(testObject.getValue('configurationService.remote.machineSetting'), 'remoteValue');
                    c();
                }
                catch (error) {
                    e(error);
                }
            }));
        });
        resolveRemoteEnvironment();
        return promise;
    }));
    test('machine settings in local user settings does not override defaults', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.remote.machineSetting": "globalValue" }'));
        registerRemoteFileSystemProvider();
        resolveRemoteEnvironment();
        await initialize();
        assert.strictEqual(testObject.getValue('configurationService.remote.machineSetting'), 'isSet');
    }));
    test('remote application machine settings override globals', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(machineSettingsResource, VSBuffer.fromString('{ "configurationService.remote.applicationMachineSetting": "remoteValue" }'));
        registerRemoteFileSystemProvider();
        resolveRemoteEnvironment();
        await initialize();
        assert.strictEqual(testObject.getValue('configurationService.remote.applicationMachineSetting'), 'remoteValue');
    }));
    test('remote application machine settings override globals after remote provider is registered on activation', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(machineSettingsResource, VSBuffer.fromString('{ "configurationService.remote.applicationMachineSetting": "remoteValue" }'));
        resolveRemoteEnvironment();
        registerRemoteFileSystemProviderOnActivation();
        await initialize();
        assert.strictEqual(testObject.getValue('configurationService.remote.applicationMachineSetting'), 'remoteValue');
    }));
    test('remote application machine settings override globals after remote environment is resolved', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(machineSettingsResource, VSBuffer.fromString('{ "configurationService.remote.applicationMachineSetting": "remoteValue" }'));
        registerRemoteFileSystemProvider();
        await initialize();
        const promise = new Promise((c, e) => {
            disposables.add(testObject.onDidChangeConfiguration((event) => {
                try {
                    assert.strictEqual(event.source, 2 /* ConfigurationTarget.USER */);
                    assert.deepStrictEqual([...event.affectedKeys], ['configurationService.remote.applicationMachineSetting']);
                    assert.strictEqual(testObject.getValue('configurationService.remote.applicationMachineSetting'), 'remoteValue');
                    c();
                }
                catch (error) {
                    e(error);
                }
            }));
        });
        resolveRemoteEnvironment();
        return promise;
    }));
    test('remote application machine settings override globals after remote provider is registered on activation and remote environment is resolved', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(machineSettingsResource, VSBuffer.fromString('{ "configurationService.remote.applicationMachineSetting": "remoteValue" }'));
        registerRemoteFileSystemProviderOnActivation();
        await initialize();
        const promise = new Promise((c, e) => {
            disposables.add(testObject.onDidChangeConfiguration((event) => {
                try {
                    assert.strictEqual(event.source, 2 /* ConfigurationTarget.USER */);
                    assert.deepStrictEqual([...event.affectedKeys], ['configurationService.remote.applicationMachineSetting']);
                    assert.strictEqual(testObject.getValue('configurationService.remote.applicationMachineSetting'), 'remoteValue');
                    c();
                }
                catch (error) {
                    e(error);
                }
            }));
        });
        resolveRemoteEnvironment();
        return promise;
    }));
    test('application machine settings in local user settings does not override defaults', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.remote.applicationMachineSetting": "globalValue" }'));
        registerRemoteFileSystemProvider();
        resolveRemoteEnvironment();
        await initialize();
        assert.strictEqual(testObject.getValue('configurationService.remote.applicationMachineSetting'), 'isSet');
    }));
    test('machine overridable settings in local user settings does not override defaults', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.remote.machineOverridableSetting": "globalValue" }'));
        registerRemoteFileSystemProvider();
        resolveRemoteEnvironment();
        await initialize();
        assert.strictEqual(testObject.getValue('configurationService.remote.machineOverridableSetting'), 'isSet');
    }));
    test('non machine setting is written in local settings', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        registerRemoteFileSystemProvider();
        resolveRemoteEnvironment();
        await initialize();
        await testObject.updateValue('configurationService.remote.applicationSetting', 'applicationValue');
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.inspect('configurationService.remote.applicationSetting').userLocalValue, 'applicationValue');
    }));
    test('machine setting is written in remote settings', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        registerRemoteFileSystemProvider();
        resolveRemoteEnvironment();
        await initialize();
        await testObject.updateValue('configurationService.remote.machineSetting', 'machineValue');
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.inspect('configurationService.remote.machineSetting').userRemoteValue, 'machineValue');
    }));
    test('application machine setting is written in remote settings', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        registerRemoteFileSystemProvider();
        resolveRemoteEnvironment();
        await initialize();
        await testObject.updateValue('configurationService.remote.applicationMachineSetting', 'machineValue');
        await testObject.reloadConfiguration();
        const actual = testObject.inspect('configurationService.remote.applicationMachineSetting');
        assert.strictEqual(actual.userRemoteValue, 'machineValue');
    }));
    test('machine overridable setting is written in remote settings', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        registerRemoteFileSystemProvider();
        resolveRemoteEnvironment();
        await initialize();
        await testObject.updateValue('configurationService.remote.machineOverridableSetting', 'machineValue');
        await testObject.reloadConfiguration();
        assert.strictEqual(testObject.inspect('configurationService.remote.machineOverridableSetting').userRemoteValue, 'machineValue');
    }));
    test('machine settings in local user settings does not override defaults after defalts are registered ', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.remote.newMachineSetting": "userValue" }'));
        registerRemoteFileSystemProvider();
        resolveRemoteEnvironment();
        await initialize();
        configurationRegistry.registerConfiguration({
            id: '_test',
            type: 'object',
            properties: {
                'configurationService.remote.newMachineSetting': {
                    type: 'string',
                    default: 'isSet',
                    scope: 2 /* ConfigurationScope.MACHINE */,
                },
            },
        });
        assert.strictEqual(testObject.getValue('configurationService.remote.newMachineSetting'), 'isSet');
    }));
    test('machine overridable settings in local user settings does not override defaults after defaults are registered ', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "configurationService.remote.newMachineOverridableSetting": "userValue" }'));
        registerRemoteFileSystemProvider();
        resolveRemoteEnvironment();
        await initialize();
        configurationRegistry.registerConfiguration({
            id: '_test',
            type: 'object',
            properties: {
                'configurationService.remote.newMachineOverridableSetting': {
                    type: 'string',
                    default: 'isSet',
                    scope: 7 /* ConfigurationScope.MACHINE_OVERRIDABLE */,
                },
            },
        });
        assert.strictEqual(testObject.getValue('configurationService.remote.newMachineOverridableSetting'), 'isSet');
    }));
});
function getWorkspaceId(configPath) {
    let workspaceConfigPath = configPath.toString();
    if (!isLinux) {
        workspaceConfigPath = workspaceConfigPath.toLowerCase(); // sanitize for platform file system
    }
    return hash(workspaceConfigPath).toString(16);
}
function getWorkspaceIdentifier(configPath) {
    return {
        configPath,
        id: getWorkspaceId(configPath),
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvblNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2NvbmZpZ3VyYXRpb24vdGVzdC9icm93c2VyL2NvbmZpZ3VyYXRpb25TZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sS0FBSyxLQUFLLE1BQU0sT0FBTyxDQUFBO0FBQzlCLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scURBQXFELENBQUE7QUFDOUUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFDL0YsT0FBTyxFQUVOLFVBQVUsSUFBSSx1QkFBdUIsRUFFckMsMEJBQTBCLEdBQzFCLE1BQU0sdUVBQXVFLENBQUE7QUFDOUUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFFeEUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQzVFLE9BQU8sRUFDTix3QkFBd0IsR0FLeEIsTUFBTSx1REFBdUQsQ0FBQTtBQUM5RCxPQUFPLEVBRU4scUJBQXFCLEdBRXJCLE1BQU0sK0RBQStELENBQUE7QUFDdEUsT0FBTyxFQUNOLDZCQUE2QixFQUM3Qix3QkFBd0IsRUFDeEIsc0JBQXNCLEVBQ3RCLG1CQUFtQixHQUNuQixNQUFNLG1EQUFtRCxDQUFBO0FBRTFELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQzVGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ3hHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ2pFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNyRixPQUFPLEVBQUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUNqRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFFMUUsT0FBTyxFQUFFLDBCQUEwQixFQUF1QixNQUFNLCtCQUErQixDQUFBO0FBQy9GLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUNqRixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQTtBQUN0RyxPQUFPLEVBQ04seUJBQXlCLEVBQ3pCLHlCQUF5QixHQUN6QixNQUFNLGlEQUFpRCxDQUFBO0FBQ3hELE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ2hHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDL0QsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGtFQUFrRSxDQUFBO0FBQ3JHLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLG9FQUFvRSxDQUFBO0FBSy9HLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQ2xGLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLDBFQUEwRSxDQUFBO0FBQ3pILE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNyRixPQUFPLEVBQ04sd0JBQXdCLEVBQ3hCLGlCQUFpQixFQUNqQix1QkFBdUIsR0FDdkIsTUFBTSxtRUFBbUUsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUNuRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUM5RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUMzRixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUU1RixPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxxRUFBcUUsQ0FBQTtBQUNoSCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUVsRyxTQUFTLHlCQUF5QixDQUFDLE1BQVc7SUFDN0MsT0FBTztRQUNOLEVBQUUsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztRQUN4QyxHQUFHLEVBQUUsTUFBTTtLQUNYLENBQUE7QUFDRixDQUFDO0FBRUQsTUFBTSxrQkFBa0I7SUFDdkIsWUFBWSxDQUFDLFFBQWE7UUFDekIsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBQ0QsS0FBSyxDQUFDLElBQUk7UUFDVCxPQUFPLEVBQUUsQ0FBQTtJQUNWLENBQUM7SUFDRCxLQUFLLENBQUMsS0FBSyxLQUFtQixDQUFDO0lBQy9CLEtBQUssQ0FBQyxNQUFNLEtBQW1CLENBQUM7Q0FDaEM7QUFFRCxNQUFNLElBQUksR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxjQUFjLEVBQUUsQ0FBQyxDQUFBO0FBRS9ELEtBQUssQ0FBQyxrQ0FBa0MsRUFBRSxHQUFHLEVBQUU7SUFDOUMsTUFBTSxVQUFVLEdBQUcsVUFBVSxDQUFBO0lBQzdCLElBQUksTUFBVyxDQUFBO0lBQ2YsSUFBSSxVQUE0QixDQUFBO0lBQ2hDLE1BQU0sV0FBVyxHQUFHLHVDQUF1QyxFQUFFLENBQUE7SUFFN0QsS0FBSyxDQUFDLEtBQUssSUFBSSxFQUFFO1FBQ2hCLE1BQU0sVUFBVSxHQUFHLElBQUksY0FBYyxFQUFFLENBQUE7UUFDdkMsTUFBTSxXQUFXLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLFdBQVcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFBO1FBQ2hFLE1BQU0sa0JBQWtCLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLDBCQUEwQixFQUFFLENBQUMsQ0FBQTtRQUM1RSxXQUFXLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLGtCQUFrQixDQUFDLENBQUMsQ0FBQTtRQUU5RSxNQUFNLEdBQUcsUUFBUSxDQUFDLElBQUksRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUNuQyxNQUFNLFdBQVcsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUE7UUFFdEMsTUFBTSxrQkFBa0IsR0FBRyxzQkFBc0IsQ0FBQTtRQUNqRCxNQUFNLGtCQUFrQixHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxrQkFBa0IsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFBO1FBQy9FLE1BQU0sdUJBQXVCLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FDOUMsSUFBSSx1QkFBdUIsQ0FBQyxrQkFBa0IsRUFBRSxXQUFXLEVBQUUsa0JBQWtCLEVBQUUsVUFBVSxDQUFDLENBQzVGLENBQUE7UUFDRCxXQUFXLENBQUMsR0FBRyxDQUNkLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FDM0IsT0FBTyxDQUFDLGNBQWMsRUFDdEIsV0FBVyxDQUFDLEdBQUcsQ0FDZCxJQUFJLG9CQUFvQixDQUN2QixJQUFJLENBQUMsTUFBTSxFQUNYLGtCQUFrQixFQUNsQixPQUFPLENBQUMsY0FBYyxFQUN0Qix1QkFBdUIsRUFDdkIsa0JBQWtCLEVBQ2xCLElBQUksY0FBYyxFQUFFLENBQ3BCLENBQ0QsQ0FDRCxDQUNELENBQUE7UUFDRCxNQUFNLHNCQUFzQixHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQzdDLElBQUksc0JBQXNCLENBQUMsdUJBQXVCLENBQUMsY0FBYyxDQUFDLENBQ2xFLENBQUE7UUFDRCxVQUFVLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FDM0IsSUFBSSxnQkFBZ0IsQ0FDbkIsRUFBRSxrQkFBa0IsRUFBRSxJQUFJLGtCQUFrQixFQUFFLEVBQUUsRUFDaEQsa0JBQWtCLEVBQ2xCLHNCQUFzQixFQUN0Qix1QkFBdUIsRUFDdkIsV0FBVyxFQUNYLFdBQVcsQ0FBQyxHQUFHLENBQ2QsSUFBSSxrQkFBa0IsQ0FDckIsSUFBSSwwQkFBMEIsRUFBRSxFQUNoQyxzQkFBc0IsRUFDdEIsa0JBQWtCLEVBQ2xCLGtCQUFrQixFQUNsQixXQUFXLENBQUMsR0FBRyxDQUNkLElBQUksOEJBQThCLENBQ2pDLEtBQUssRUFDTCxTQUFTLEVBQ1QsU0FBUyxFQUNULFNBQVMsRUFDVCxrQkFBa0IsRUFDbEIsVUFBVSxDQUNWLENBQ0QsRUFDRCxJQUFJLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxFQUNuQyxJQUFJLGNBQWMsRUFBRSxDQUNwQixDQUNELEVBQ0Qsa0JBQWtCLEVBQ2xCLElBQUksY0FBYyxFQUFFLEVBQ3BCLElBQUksaUJBQWlCLEVBQUUsQ0FDdkIsQ0FDRCxDQUFBO1FBQ0QsTUFBeUIsVUFBVyxDQUFDLFVBQVUsQ0FBQyx5QkFBeUIsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO0lBQ25GLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGdCQUFnQixFQUFFLEdBQUcsRUFBRTtRQUMzQixNQUFNLE1BQU0sR0FBRyxVQUFVLENBQUMsWUFBWSxFQUFFLENBQUE7UUFFeEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUM1QyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDM0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUN0RCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzlDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDLENBQUE7SUFDakMsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMscUJBQXFCLEVBQUUsR0FBRyxFQUFFO1FBQ2hDLE1BQU0sTUFBTSxHQUFHLFVBQVUsQ0FBQyxpQkFBaUIsRUFBRSxDQUFBO1FBRTdDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxnQ0FBd0IsQ0FBQTtJQUNsRCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxzQkFBc0IsRUFBRSxHQUFHLEVBQUU7UUFDakMsTUFBTSxNQUFNLEdBQUcsVUFBVSxDQUFDLGtCQUFrQixDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUVuRSxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxVQUFVLENBQUMsWUFBWSxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDakUsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsb0RBQW9ELEVBQUUsR0FBRyxFQUFFLENBQy9ELGtCQUFrQixDQUFPLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzVELE1BQU0sVUFBVSxHQUFHLElBQUksY0FBYyxFQUFFLENBQUE7UUFDdkMsTUFBTSxXQUFXLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLFdBQVcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFBO1FBQ2hFLE1BQU0sa0JBQWtCLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLDBCQUEwQixFQUFFLENBQUMsQ0FBQTtRQUM1RSxXQUFXLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLGtCQUFrQixDQUFDLENBQUMsQ0FBQTtRQUU5RSxNQUFNLE1BQU0sR0FBRyxRQUFRLENBQUMsSUFBSSxFQUFFLFVBQVUsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxXQUFXLEVBQUUsQ0FBQyxDQUFBO1FBQ3RFLE1BQU0sV0FBVyxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUV0QyxNQUFNLGtCQUFrQixHQUFHLHNCQUFzQixDQUFBO1FBQ2pELE1BQU0sa0JBQWtCLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLGtCQUFrQixDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUE7UUFDL0UsTUFBTSx1QkFBdUIsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUM5QyxJQUFJLHVCQUF1QixDQUMxQixrQkFBa0IsRUFDbEIsV0FBVyxFQUNYLGtCQUFrQixFQUNsQixVQUFVLENBQ1YsQ0FDRCxDQUFBO1FBQ0QsV0FBVyxDQUFDLEdBQUcsQ0FDZCxXQUFXLENBQUMsZ0JBQWdCLENBQzNCLE9BQU8sQ0FBQyxjQUFjLEVBQ3RCLFdBQVcsQ0FBQyxHQUFHLENBQ2QsSUFBSSxvQkFBb0IsQ0FDdkIsSUFBSSxDQUFDLE1BQU0sRUFDWCxrQkFBa0IsRUFDbEIsT0FBTyxDQUFDLGNBQWMsRUFDdEIsdUJBQXVCLEVBQ3ZCLGtCQUFrQixFQUNsQixJQUFJLGNBQWMsRUFBRSxDQUNwQixDQUNELENBQ0QsQ0FDRCxDQUFBO1FBQ0QsTUFBTSxzQkFBc0IsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUM3QyxJQUFJLHNCQUFzQixDQUFDLHVCQUF1QixDQUFDLGNBQWMsQ0FBQyxDQUNsRSxDQUFBO1FBQ0QsTUFBTSxVQUFVLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FDakMsSUFBSSxnQkFBZ0IsQ0FDbkIsRUFBRSxrQkFBa0IsRUFBRSxJQUFJLGtCQUFrQixFQUFFLEVBQUUsRUFDaEQsa0JBQWtCLEVBQ2xCLHNCQUFzQixFQUN0Qix1QkFBdUIsRUFDdkIsV0FBVyxFQUNYLFdBQVcsQ0FBQyxHQUFHLENBQ2QsSUFBSSxrQkFBa0IsQ0FDckIsSUFBSSwwQkFBMEIsRUFBRSxFQUNoQyxzQkFBc0IsRUFDdEIsa0JBQWtCLEVBQ2xCLGtCQUFrQixFQUNsQixXQUFXLENBQUMsR0FBRyxDQUNkLElBQUksOEJBQThCLENBQ2pDLEtBQUssRUFDTCxTQUFTLEVBQ1QsU0FBUyxFQUNULFNBQVMsRUFDVCxrQkFBa0IsRUFDbEIsVUFBVSxDQUNWLENBQ0QsRUFDRCxJQUFJLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxFQUNuQyxJQUFJLGNBQWMsRUFBRSxDQUNwQixDQUNELEVBQ0Qsa0JBQWtCLEVBQ2xCLElBQUksY0FBYyxFQUFFLEVBQ3BCLElBQUksaUJBQWlCLEVBQUUsQ0FDdkIsQ0FDRCxDQUFBO1FBQ0QsTUFBeUIsVUFBVyxDQUFDLFVBQVUsQ0FBQyx5QkFBeUIsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO1FBRWxGLE1BQU0sTUFBTSxHQUFHLFVBQVUsQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFFbkUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsVUFBVSxDQUFDLFlBQVksRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ2pFLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFFSixJQUFJLENBQUMsNENBQTRDLEVBQUUsR0FBRyxFQUFFLENBQ3ZELGtCQUFrQixDQUFPLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzVELE1BQU0sVUFBVSxHQUFHLElBQUksY0FBYyxFQUFFLENBQUE7UUFDdkMsTUFBTSxXQUFXLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLFdBQVcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFBO1FBQ2hFLE1BQU0sa0JBQWtCLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLDBCQUEwQixFQUFFLENBQUMsQ0FBQTtRQUM1RSxXQUFXLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLGtCQUFrQixDQUFDLENBQUMsQ0FBQTtRQUU5RSxNQUFNLE1BQU0sR0FBRyxRQUFRLENBQUMsSUFBSSxFQUFFLFVBQVUsQ0FBQyxDQUFBO1FBQ3pDLE1BQU0sV0FBVyxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUV0QyxNQUFNLGtCQUFrQixHQUFHLHNCQUFzQixDQUFBO1FBQ2pELE1BQU0sa0JBQWtCLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLGtCQUFrQixDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUE7UUFDL0UsTUFBTSx1QkFBdUIsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUM5QyxJQUFJLHVCQUF1QixDQUMxQixrQkFBa0IsRUFDbEIsV0FBVyxFQUNYLGtCQUFrQixFQUNsQixVQUFVLENBQ1YsQ0FDRCxDQUFBO1FBQ0QsV0FBVyxDQUFDLEdBQUcsQ0FDZCxXQUFXLENBQUMsZ0JBQWdCLENBQzNCLE9BQU8sQ0FBQyxjQUFjLEVBQ3RCLFdBQVcsQ0FBQyxHQUFHLENBQ2QsSUFBSSxvQkFBb0IsQ0FDdkIsSUFBSSxDQUFDLE1BQU0sRUFDWCxrQkFBa0IsRUFDbEIsT0FBTyxDQUFDLGNBQWMsRUFDdEIsdUJBQXVCLEVBQ3ZCLGtCQUFrQixFQUNsQixJQUFJLGNBQWMsRUFBRSxDQUNwQixDQUNELENBQ0QsQ0FDRCxDQUFBO1FBQ0QsTUFBTSxzQkFBc0IsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUM3QyxJQUFJLHNCQUFzQixDQUFDLHVCQUF1QixDQUFDLGNBQWMsQ0FBQyxDQUNsRSxDQUFBO1FBQ0QsTUFBTSxVQUFVLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FDakMsSUFBSSxnQkFBZ0IsQ0FDbkIsRUFBRSxrQkFBa0IsRUFBRSxJQUFJLGtCQUFrQixFQUFFLEVBQUUsRUFDaEQsa0JBQWtCLEVBQ2xCLHNCQUFzQixFQUN0Qix1QkFBdUIsRUFDdkIsV0FBVyxFQUNYLFdBQVcsQ0FBQyxHQUFHLENBQ2QsSUFBSSxrQkFBa0IsQ0FDckIsSUFBSSwwQkFBMEIsRUFBRSxFQUNoQyxzQkFBc0IsRUFDdEIsa0JBQWtCLEVBQ2xCLGtCQUFrQixFQUNsQixXQUFXLENBQUMsR0FBRyxDQUNkLElBQUksOEJBQThCLENBQ2pDLEtBQUssRUFDTCxTQUFTLEVBQ1QsU0FBUyxFQUNULFNBQVMsRUFDVCxrQkFBa0IsRUFDbEIsVUFBVSxDQUNWLENBQ0QsRUFDRCxJQUFJLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxFQUNuQyxJQUFJLGNBQWMsRUFBRSxDQUNwQixDQUNELEVBQ0Qsa0JBQWtCLEVBQ2xCLElBQUksY0FBYyxFQUFFLEVBQ3BCLElBQUksaUJBQWlCLEVBQUUsQ0FDdkIsQ0FDRCxDQUFBO1FBQ0QsTUFBTSxVQUFVLENBQUMsVUFBVSxDQUFDLHlCQUF5QixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7UUFFOUQsTUFBTSxNQUFNLEdBQUcsVUFBVSxDQUFDLGtCQUFrQixDQUMzQyxRQUFRLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxXQUFXLEVBQUUsQ0FBQyxDQUNsRCxDQUFBO1FBRUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsVUFBVSxDQUFDLFlBQVksRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ2pFLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFFSixJQUFJLENBQUMsOEJBQThCLEVBQUUsR0FBRyxFQUFFO1FBQ3pDLE1BQU0sQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7SUFDakQsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsK0JBQStCLEVBQUUsR0FBRyxFQUFFO1FBQzFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxVQUFVLENBQUMsa0JBQWtCLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDNUUsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsdUJBQXVCLEVBQUUsR0FBRyxFQUFFLENBQUMsVUFBVSxDQUFDLG9CQUFvQixFQUFFLENBQUMsQ0FBQTtBQUN2RSxDQUFDLENBQUMsQ0FBQTtBQUVGLEtBQUssQ0FBQyxxQ0FBcUMsRUFBRSxHQUFHLEVBQUU7SUFDakQsSUFBSSxVQUE0QixDQUFBO0lBQ2hDLE1BQU0sV0FBVyxHQUFHLHVDQUF1QyxFQUFFLENBQUE7SUFFN0QsS0FBSyxDQUFDLEtBQUssSUFBSSxFQUFFO1FBQ2hCLE1BQU0sVUFBVSxHQUFHLElBQUksY0FBYyxFQUFFLENBQUE7UUFDdkMsTUFBTSxXQUFXLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLFdBQVcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFBO1FBQ2hFLE1BQU0sa0JBQWtCLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLDBCQUEwQixFQUFFLENBQUMsQ0FBQTtRQUM1RSxXQUFXLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLGtCQUFrQixDQUFDLENBQUMsQ0FBQTtRQUU5RSxNQUFNLGVBQWUsR0FBRyxRQUFRLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQzlDLE1BQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFDbkMsTUFBTSxPQUFPLEdBQUcsUUFBUSxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUNuQyxNQUFNLGNBQWMsR0FBRyxRQUFRLENBQUMsSUFBSSxFQUFFLHlCQUF5QixDQUFDLENBQUE7UUFDaEUsTUFBTSxTQUFTLEdBQUcsRUFBRSxPQUFPLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxPQUFPLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsQ0FBQTtRQUUvRSxNQUFNLFdBQVcsQ0FBQyxZQUFZLENBQUMsZUFBZSxDQUFDLENBQUE7UUFDL0MsTUFBTSxXQUFXLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQ3ZDLE1BQU0sV0FBVyxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUN2QyxNQUFNLFdBQVcsQ0FBQyxTQUFTLENBQzFCLGNBQWMsRUFDZCxRQUFRLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsU0FBUyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUMxRCxDQUFBO1FBRUQsTUFBTSxvQkFBb0IsR0FBRyw2QkFBNkIsQ0FBQyxTQUFTLEVBQUUsV0FBVyxDQUFDLENBQUE7UUFDbEYsTUFBTSxrQkFBa0IsR0FBRyxzQkFBc0IsQ0FBQTtRQUNqRCxNQUFNLGtCQUFrQixHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQ3pDLFdBQVcsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FDeEUsQ0FBQTtRQUNELG9CQUFvQixDQUFDLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxrQkFBa0IsQ0FBQyxDQUFBO1FBQ2xFLE1BQU0sa0JBQWtCLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLGtCQUFrQixDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUE7UUFDL0UsTUFBTSx1QkFBdUIsR0FBRyxvQkFBb0IsQ0FBQyxJQUFJLENBQ3hELHdCQUF3QixFQUN4QixXQUFXLENBQUMsR0FBRyxDQUNkLElBQUksdUJBQXVCLENBQzFCLGtCQUFrQixFQUNsQixXQUFXLEVBQ1gsa0JBQWtCLEVBQ2xCLFVBQVUsQ0FDVixDQUNELENBQ0QsQ0FBQTtRQUNELFdBQVcsQ0FBQyxHQUFHLENBQ2QsV0FBVyxDQUFDLGdCQUFnQixDQUMzQixPQUFPLENBQUMsY0FBYyxFQUN0QixXQUFXLENBQUMsR0FBRyxDQUNkLElBQUksb0JBQW9CLENBQ3ZCLElBQUksQ0FBQyxNQUFNLEVBQ1gsa0JBQWtCLEVBQ2xCLE9BQU8sQ0FBQyxjQUFjLEVBQ3RCLHVCQUF1QixFQUN2QixrQkFBa0IsRUFDbEIsSUFBSSxjQUFjLEVBQUUsQ0FDcEIsQ0FDRCxDQUNELENBQ0QsQ0FBQTtRQUNELFVBQVUsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUMzQixJQUFJLGdCQUFnQixDQUNuQixFQUFFLGtCQUFrQixFQUFFLElBQUksa0JBQWtCLEVBQUUsRUFBRSxFQUNoRCxrQkFBa0IsRUFDbEIsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLHNCQUFzQixDQUFDLHVCQUF1QixDQUFDLGNBQWMsQ0FBQyxDQUFDLEVBQ25GLHVCQUF1QixFQUN2QixXQUFXLEVBQ1gsa0JBQWtCLEVBQ2xCLGtCQUFrQixFQUNsQixJQUFJLGNBQWMsRUFBRSxFQUNwQixJQUFJLGlCQUFpQixFQUFFLENBQ3ZCLENBQ0QsQ0FBQTtRQUVELG9CQUFvQixDQUFDLElBQUksQ0FBQyx3QkFBd0IsRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUMvRCxvQkFBb0IsQ0FBQyxJQUFJLENBQUMscUJBQXFCLEVBQUUsVUFBVSxDQUFDLENBQUE7UUFDNUQsb0JBQW9CLENBQUMsSUFBSSxDQUFDLG1CQUFtQixFQUFFLGtCQUFrQixDQUFDLENBQUE7UUFFbEUsTUFBTSxVQUFVLENBQUMsVUFBVSxDQUFDLHNCQUFzQixDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUE7UUFDbkUsVUFBVSxDQUFDLDJCQUEyQixDQUFDLG9CQUFvQixDQUFDLENBQUE7SUFDN0QsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsbUJBQW1CLEVBQUUsR0FBRyxFQUFFO1FBQzlCLE1BQU0sTUFBTSxHQUFHLFVBQVUsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxPQUFPLENBQUE7UUFFaEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3BDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUNoRCxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUE7SUFDakQsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMscUJBQXFCLEVBQUUsR0FBRyxFQUFFO1FBQ2hDLE1BQU0sTUFBTSxHQUFHLFVBQVUsQ0FBQyxpQkFBaUIsRUFBRSxDQUFBO1FBRTdDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxtQ0FBMkIsQ0FBQTtJQUNyRCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyx1QkFBdUIsRUFBRSxHQUFHLEVBQUUsQ0FBQyxVQUFVLENBQUMsb0JBQW9CLEVBQUUsQ0FBQyxDQUFBO0FBQ3ZFLENBQUMsQ0FBQyxDQUFBO0FBRUYsS0FBSyxDQUFDLDZDQUE2QyxFQUFFLEdBQUcsRUFBRTtJQUN6RCxJQUFJLFVBQTRCLEVBQUUsV0FBeUIsQ0FBQTtJQUMzRCxNQUFNLFdBQVcsR0FBRyx1Q0FBdUMsRUFBRSxDQUFBO0lBRTdELEtBQUssQ0FBQyxLQUFLLElBQUksRUFBRTtRQUNoQixNQUFNLFVBQVUsR0FBRyxJQUFJLGNBQWMsRUFBRSxDQUFBO1FBQ3ZDLFdBQVcsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksV0FBVyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUE7UUFDMUQsTUFBTSxrQkFBa0IsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksMEJBQTBCLEVBQUUsQ0FBQyxDQUFBO1FBQzVFLFdBQVcsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsa0JBQWtCLENBQUMsQ0FBQyxDQUFBO1FBRTlFLE1BQU0sZUFBZSxHQUFHLFFBQVEsQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDOUMsTUFBTSxPQUFPLEdBQUcsUUFBUSxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUNuQyxNQUFNLE9BQU8sR0FBRyxRQUFRLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBQ25DLE1BQU0sY0FBYyxHQUFHLFFBQVEsQ0FBQyxJQUFJLEVBQUUseUJBQXlCLENBQUMsQ0FBQTtRQUNoRSxNQUFNLFNBQVMsR0FBRyxFQUFFLE9BQU8sRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLE9BQU8sQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxDQUFBO1FBRS9FLE1BQU0sV0FBVyxDQUFDLFlBQVksQ0FBQyxlQUFlLENBQUMsQ0FBQTtRQUMvQyxNQUFNLFdBQVcsQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDdkMsTUFBTSxXQUFXLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQ3ZDLE1BQU0sV0FBVyxDQUFDLFNBQVMsQ0FDMUIsY0FBYyxFQUNkLFFBQVEsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQzFELENBQUE7UUFFRCxNQUFNLG9CQUFvQixHQUFHLDZCQUE2QixDQUFDLFNBQVMsRUFBRSxXQUFXLENBQUMsQ0FBQTtRQUNsRixNQUFNLGtCQUFrQixHQUFHLHNCQUFzQixDQUFBO1FBQ2pELE1BQU0sa0JBQWtCLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FDekMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLGtCQUFrQixDQUFDLENBQ3ZELENBQUE7UUFDRCxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLEVBQUUsa0JBQWtCLENBQUMsQ0FBQTtRQUNsRSxNQUFNLGtCQUFrQixHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxrQkFBa0IsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFBO1FBQy9FLE1BQU0sdUJBQXVCLEdBQUcsb0JBQW9CLENBQUMsSUFBSSxDQUN4RCx3QkFBd0IsRUFDeEIsV0FBVyxDQUFDLEdBQUcsQ0FDZCxJQUFJLHVCQUF1QixDQUMxQixrQkFBa0IsRUFDbEIsV0FBVyxFQUNYLGtCQUFrQixFQUNsQixVQUFVLENBQ1YsQ0FDRCxDQUNELENBQUE7UUFDRCxXQUFXLENBQUMsR0FBRyxDQUNkLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FDM0IsT0FBTyxDQUFDLGNBQWMsRUFDdEIsV0FBVyxDQUFDLEdBQUcsQ0FDZCxJQUFJLG9CQUFvQixDQUN2QixJQUFJLENBQUMsTUFBTSxFQUNYLGtCQUFrQixFQUNsQixPQUFPLENBQUMsY0FBYyxFQUN0Qix1QkFBdUIsRUFDdkIsa0JBQWtCLEVBQ2xCLElBQUksY0FBYyxFQUFFLENBQ3BCLENBQ0QsQ0FDRCxDQUNELENBQUE7UUFDRCxVQUFVLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FDM0IsSUFBSSxnQkFBZ0IsQ0FDbkIsRUFBRSxrQkFBa0IsRUFBRSxJQUFJLGtCQUFrQixFQUFFLEVBQUUsRUFDaEQsa0JBQWtCLEVBQ2xCLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxzQkFBc0IsQ0FBQyx1QkFBdUIsQ0FBQyxjQUFjLENBQUMsQ0FBQyxFQUNuRix1QkFBdUIsRUFDdkIsV0FBVyxFQUNYLGtCQUFrQixFQUNsQixrQkFBa0IsRUFDbEIsSUFBSSxjQUFjLEVBQUUsRUFDcEIsSUFBSSxpQkFBaUIsRUFBRSxDQUN2QixDQUNELENBQUE7UUFFRCxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLFdBQVcsQ0FBQyxDQUFBO1FBQ3BELG9CQUFvQixDQUFDLElBQUksQ0FBQyx3QkFBd0IsRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUMvRCxvQkFBb0IsQ0FBQyxJQUFJLENBQUMscUJBQXFCLEVBQUUsVUFBVSxDQUFDLENBQUE7UUFDNUQsb0JBQW9CLENBQUMsSUFBSSxDQUFDLG1CQUFtQixFQUFFLGtCQUFrQixDQUFDLENBQUE7UUFFbEUsTUFBTSxVQUFVLENBQUMsVUFBVSxDQUFDLHNCQUFzQixDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUE7UUFDbkUsb0JBQW9CLENBQUMsSUFBSSxDQUN4QixnQkFBZ0IsRUFDaEIsV0FBVyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUN6RSxDQUFBO1FBQ0Qsb0JBQW9CLENBQUMsSUFBSSxDQUN4QixpQkFBaUIsRUFDakIsV0FBVyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUM5RSxDQUFBO1FBQ0Qsb0JBQW9CLENBQUMsSUFBSSxDQUN4QixtQkFBbUIsRUFDbkIsb0JBQW9CLENBQUMsY0FBYyxDQUFDLGtCQUFrQixDQUFDLENBQ3ZELENBQUE7UUFDRCxVQUFVLENBQUMsMkJBQTJCLENBQUMsb0JBQW9CLENBQUMsQ0FBQTtJQUM3RCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxhQUFhLEVBQUUsR0FBRyxFQUFFLENBQ3hCLGtCQUFrQixDQUFPLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzVELE1BQU0sVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUUsR0FBRyxFQUFFLFFBQVEsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxRQUFRLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3pGLE1BQU0sTUFBTSxHQUFHLFVBQVUsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxPQUFPLENBQUE7UUFFaEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3BDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUNoRCxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFDaEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBQ2hELE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQTtJQUNqRCxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBRUosSUFBSSxDQUFDLGlDQUFpQyxFQUFFLEdBQUcsRUFBRSxDQUM1QyxrQkFBa0IsQ0FBTyxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsRUFBRSxLQUFLLElBQUksRUFBRTtRQUM1RCxNQUFNLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxRQUFRLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsUUFBUSxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDNUYsTUFBTSxNQUFNLEdBQUcsVUFBVSxDQUFDLFlBQVksRUFBRSxDQUFDLE9BQU8sQ0FBQTtRQUVoRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDcEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBQ2hELE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUNoRCxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFDaEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFBO0lBQ2pELENBQUMsQ0FBQyxDQUFDLENBQUE7SUFFSixJQUFJLENBQUMsdUNBQXVDLEVBQUUsR0FBRyxFQUFFLENBQ2xELGtCQUFrQixDQUFPLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzVELE1BQU0sVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUUsR0FBRyxFQUFFLFFBQVEsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxRQUFRLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUM3RixNQUFNLE1BQU0sR0FBRyxVQUFVLENBQUMsWUFBWSxFQUFFLENBQUMsT0FBTyxDQUFBO1FBRWhELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNwQyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFDaEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBQ2hELE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUNoRCxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUE7SUFDakQsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUVKLElBQUksQ0FBQyx5QkFBeUIsRUFBRSxHQUFHLEVBQUUsQ0FDcEMsa0JBQWtCLENBQU8sRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDNUQsTUFBTSxVQUFVLENBQUMsVUFBVSxDQUFDO1lBQzNCLEVBQUUsR0FBRyxFQUFFLFFBQVEsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRTtZQUN6QyxFQUFFLEdBQUcsRUFBRSxRQUFRLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUU7U0FDekMsQ0FBQyxDQUFBO1FBQ0YsTUFBTSxNQUFNLEdBQUcsVUFBVSxDQUFDLFlBQVksRUFBRSxDQUFDLE9BQU8sQ0FBQTtRQUVoRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDcEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBQ2hELE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUNoRCxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFDaEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBQ2hELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUN6QyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUE7SUFDMUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUVKLElBQUksQ0FBQyxtQ0FBbUMsRUFBRSxHQUFHLEVBQUUsQ0FDOUMsa0JBQWtCLENBQU8sRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDNUQsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFBO1FBQzFCLFdBQVcsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLDRCQUE0QixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7UUFDaEUsV0FBVyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsMkJBQTJCLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtRQUUvRCxNQUFNLFlBQVksR0FBRyxDQUFDLEVBQUUsR0FBRyxFQUFFLFFBQVEsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxRQUFRLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUNqRixNQUFNLFVBQVUsQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDLENBQUE7UUFFekMsTUFBTSxDQUFDLFdBQVcsQ0FDakIsTUFBTSxDQUFDLFNBQVMsRUFDaEIsQ0FBQyxFQUNELHlDQUF5QyxNQUFNLENBQUMsU0FBUyxRQUFRLENBQ2pFLENBQUE7UUFDRCxNQUFNLFFBQVEsR0FBaUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNoRSxNQUFNLENBQUMsZUFBZSxDQUNyQixRQUFRLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxFQUMzQyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQ3pDLENBQUE7UUFDRCxNQUFNLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDNUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFBO0lBQzdDLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFFSixJQUFJLENBQUMsZ0JBQWdCLEVBQUUsR0FBRyxFQUFFLENBQzNCLGtCQUFrQixDQUFPLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzVELE1BQU0sVUFBVSxDQUFDLGFBQWEsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUMxRSxNQUFNLE1BQU0sR0FBRyxVQUFVLENBQUMsWUFBWSxFQUFFLENBQUMsT0FBTyxDQUFBO1FBRWhELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNwQyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUE7SUFDakQsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUVKLElBQUksQ0FBQyxzQ0FBc0MsRUFBRSxHQUFHLEVBQUUsQ0FDakQsa0JBQWtCLENBQU8sRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDNUQsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFBO1FBQzFCLFdBQVcsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLDRCQUE0QixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7UUFDaEUsV0FBVyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsMkJBQTJCLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtRQUMvRCxNQUFNLGFBQWEsR0FBRyxVQUFVLENBQUMsWUFBWSxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQzFELE1BQU0sVUFBVSxDQUFDLGFBQWEsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBRW5ELE1BQU0sQ0FBQyxXQUFXLENBQ2pCLE1BQU0sQ0FBQyxTQUFTLEVBQ2hCLENBQUMsRUFDRCx5Q0FBeUMsTUFBTSxDQUFDLFNBQVMsUUFBUSxDQUNqRSxDQUFBO1FBQ0QsTUFBTSxRQUFRLEdBQWlDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDaEUsTUFBTSxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQzFDLE1BQU0sQ0FBQyxlQUFlLENBQ3JCLFFBQVEsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDLEVBQzdDLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUM5QixDQUFBO1FBQ0QsTUFBTSxDQUFDLGVBQWUsQ0FDckIsUUFBUSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUMsRUFDN0MsQ0FBQyxVQUFVLENBQUMsWUFBWSxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUNyRCxDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUVKLElBQUksQ0FBQywyREFBMkQsRUFBRSxHQUFHLEVBQUUsQ0FDdEUsa0JBQWtCLENBQU8sRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDNUQsTUFBTSxPQUFPLEdBQUcsVUFBVSxDQUFDLFlBQVksRUFBRSxDQUFDLE9BQU8sQ0FBQTtRQUNqRCxNQUFNLFVBQVUsQ0FBQyxhQUFhLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUVoRCxNQUFNLE9BQU8sR0FBRyxJQUFJLE9BQU8sQ0FBTyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRTtZQUNyRCxXQUFXLENBQUMsR0FBRyxDQUNkLFVBQVUsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFO2dCQUNqRCxJQUFJLENBQUM7b0JBQ0osTUFBTSxDQUFDLGVBQWUsQ0FDckIsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUMsRUFDekMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQzNCLENBQUE7b0JBQ0QsT0FBTyxFQUFFLENBQUE7Z0JBQ1YsQ0FBQztnQkFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO29CQUNoQixNQUFNLENBQUMsS0FBSyxDQUFDLENBQUE7Z0JBQ2QsQ0FBQztZQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFDRixDQUFDLENBQUMsQ0FBQTtRQUVGLE1BQU0sU0FBUyxHQUFHLEVBQUUsT0FBTyxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsQ0FBQTtRQUM3RixNQUFNLFdBQVcsQ0FBQyxTQUFTLENBQzFCLFVBQVUsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxhQUFjLEVBQ3hDLFFBQVEsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQzFELENBQUE7UUFDRCxNQUFNLE9BQU8sQ0FBQTtJQUNkLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFFSixJQUFJLENBQUMsNkNBQTZDLEVBQUUsR0FBRyxFQUFFLENBQ3hELGtCQUFrQixDQUFPLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzVELE1BQU0sTUFBTSxHQUFHLEtBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQTtRQUMxQixXQUFXLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyw0QkFBNEIsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO1FBQ2hFLFdBQVcsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLDJCQUEyQixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7UUFDL0QsTUFBTSxZQUFZLEdBQUcsQ0FBQyxFQUFFLEdBQUcsRUFBRSxRQUFRLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsUUFBUSxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDakYsTUFBTSxjQUFjLEdBQUcsQ0FBQyxVQUFVLENBQUMsWUFBWSxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDL0UsTUFBTSxVQUFVLENBQUMsYUFBYSxDQUFDLFlBQVksRUFBRSxjQUFjLENBQUMsQ0FBQTtRQUU1RCxNQUFNLENBQUMsV0FBVyxDQUNqQixNQUFNLENBQUMsU0FBUyxFQUNoQixDQUFDLEVBQ0QseUNBQXlDLE1BQU0sQ0FBQyxTQUFTLFFBQVEsQ0FDakUsQ0FBQTtRQUNELE1BQU0sUUFBUSxHQUFpQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ2hFLE1BQU0sQ0FBQyxlQUFlLENBQ3JCLFFBQVEsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDLEVBQzNDLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FDekMsQ0FBQTtRQUNELE1BQU0sQ0FBQyxlQUFlLENBQ3JCLFFBQVEsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDLEVBQ2pELGNBQWMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUMzQyxDQUFBO1FBQ0QsTUFBTSxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFBO0lBQzdDLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFFSixJQUFJLENBQUMsa0RBQWtELEVBQUUsR0FBRyxFQUFFLENBQzdELGtCQUFrQixDQUFPLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzVELE1BQU0sTUFBTSxHQUFHLEtBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQTtRQUMxQixXQUFXLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyw0QkFBNEIsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO1FBQ2hFLFdBQVcsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLDJCQUEyQixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7UUFDL0QsTUFBTSxZQUFZLEdBQUcsQ0FBQyxFQUFFLEdBQUcsRUFBRSxRQUFRLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxFQUFFLElBQUksRUFBRSxZQUFZLEVBQUUsQ0FBQyxDQUFBO1FBQ3ZFLE1BQU0sY0FBYyxHQUFHLENBQUMsVUFBVSxDQUFDLFlBQVksRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQy9FLE1BQU0sVUFBVSxDQUFDLGFBQWEsQ0FBQyxZQUFZLEVBQUUsY0FBYyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRS9ELE1BQU0sQ0FBQyxXQUFXLENBQ2pCLE1BQU0sQ0FBQyxTQUFTLEVBQ2hCLENBQUMsRUFDRCx5Q0FBeUMsTUFBTSxDQUFDLFNBQVMsUUFBUSxDQUNqRSxDQUFBO1FBQ0QsTUFBTSxRQUFRLEdBQWlDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDaEUsTUFBTSxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQzFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUM1QyxNQUFNLENBQUMsZUFBZSxDQUNyQixRQUFRLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxFQUM3QyxjQUFjLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FDdkMsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFFSixJQUFJLENBQUMsOENBQThDLEVBQUUsR0FBRyxFQUFFLENBQ3pELGtCQUFrQixDQUFPLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzVELE1BQU0sTUFBTSxHQUFHLEtBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQTtRQUMxQixXQUFXLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyw0QkFBNEIsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO1FBQ2hFLFdBQVcsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLDJCQUEyQixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7UUFDL0QsTUFBTSxZQUFZLEdBQUcsQ0FBQyxFQUFFLEdBQUcsRUFBRSxRQUFRLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsUUFBUSxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDakYsTUFBTSxjQUFjLEdBQUcsQ0FBQyxVQUFVLENBQUMsWUFBWSxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDL0UsTUFBTSxjQUFjLEdBQUcsQ0FBQyxVQUFVLENBQUMsWUFBWSxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDL0UsTUFBTSxVQUFVLENBQUMsYUFBYSxDQUFDLFlBQVksRUFBRSxjQUFjLENBQUMsQ0FBQTtRQUU1RCxNQUFNLENBQUMsV0FBVyxDQUNqQixNQUFNLENBQUMsU0FBUyxFQUNoQixDQUFDLEVBQ0QseUNBQXlDLE1BQU0sQ0FBQyxTQUFTLFFBQVEsQ0FDakUsQ0FBQTtRQUNELE1BQU0sUUFBUSxHQUFpQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ2hFLE1BQU0sQ0FBQyxlQUFlLENBQ3JCLFFBQVEsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDLEVBQzNDLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FDekMsQ0FBQTtRQUNELE1BQU0sQ0FBQyxlQUFlLENBQ3JCLFFBQVEsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDLEVBQ2pELGNBQWMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUMzQyxDQUFBO1FBQ0QsTUFBTSxDQUFDLGVBQWUsQ0FDckIsUUFBUSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUMsRUFDakQsY0FBYyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQzNDLENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQyxDQUFBO0lBRUosSUFBSSxDQUFDLHNDQUFzQyxFQUFFLEdBQUcsRUFBRSxDQUNqRCxrQkFBa0IsQ0FBTyxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsRUFBRSxLQUFLLElBQUksRUFBRTtRQUM1RCxNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsR0FBRyxFQUFFLENBQUE7UUFDMUIsV0FBVyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsNEJBQTRCLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtRQUNoRSxXQUFXLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQywyQkFBMkIsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO1FBQy9ELE1BQU0sU0FBUyxHQUFHO1lBQ2pCLE9BQU8sRUFBRTtnQkFDUixFQUFFLElBQUksRUFBRSxVQUFVLENBQUMsWUFBWSxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUU7Z0JBQ3ZELEVBQUUsSUFBSSxFQUFFLFVBQVUsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRTthQUN2RDtTQUNELENBQUE7UUFDRCxNQUFNLFdBQVcsQ0FBQyxTQUFTLENBQzFCLFVBQVUsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxhQUFjLEVBQ3hDLFFBQVEsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQzFELENBQUE7UUFDRCxNQUFNLFVBQVUsQ0FBQyxtQkFBbUIsRUFBRSxDQUFBO1FBRXRDLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLE1BQU0sQ0FBQyxTQUFTLEVBQ2hCLENBQUMsRUFDRCx5Q0FBeUMsTUFBTSxDQUFDLFNBQVMsUUFBUSxDQUNqRSxDQUFBO1FBQ0QsTUFBTSxRQUFRLEdBQWlDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDaEUsTUFBTSxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQzFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUM1QyxNQUFNLENBQUMsZUFBZSxDQUNyQixRQUFRLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxFQUM3QyxVQUFVO2FBQ1IsWUFBWSxFQUFFO2FBQ2QsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQzthQUNwQyxPQUFPLEVBQUUsQ0FDWCxDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUVKLElBQUksQ0FBQyxxQ0FBcUMsRUFBRSxHQUFHLEVBQUUsQ0FDaEQsa0JBQWtCLENBQU8sRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDNUQsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFBO1FBQzFCLFdBQVcsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLDRCQUE0QixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7UUFDaEUsV0FBVyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsMkJBQTJCLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtRQUMvRCxNQUFNLFNBQVMsR0FBRztZQUNqQixPQUFPLEVBQUU7Z0JBQ1IsRUFBRSxJQUFJLEVBQUUsVUFBVSxDQUFDLFlBQVksRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUU7Z0JBQ2xFLEVBQUUsSUFBSSxFQUFFLFVBQVUsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRTthQUN2RDtTQUNELENBQUE7UUFDRCxXQUFXLENBQUMsU0FBUyxDQUNwQixVQUFVLENBQUMsWUFBWSxFQUFFLENBQUMsYUFBYyxFQUN4QyxRQUFRLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsU0FBUyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUMxRCxDQUFBO1FBQ0QsTUFBTSxVQUFVLENBQUMsbUJBQW1CLEVBQUUsQ0FBQTtRQUV0QyxNQUFNLENBQUMsV0FBVyxDQUNqQixNQUFNLENBQUMsU0FBUyxFQUNoQixDQUFDLEVBQ0QseUNBQXlDLE1BQU0sQ0FBQyxTQUFTLFFBQVEsQ0FDakUsQ0FBQTtRQUNELE1BQU0sUUFBUSxHQUFpQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ2hFLE1BQU0sQ0FBQyxlQUFlLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUMxQyxNQUFNLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDNUMsTUFBTSxDQUFDLGVBQWUsQ0FDckIsUUFBUSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUMsRUFDN0MsQ0FBQyxVQUFVLENBQUMsWUFBWSxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUNyRCxDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQTtBQUNMLENBQUMsQ0FBQyxDQUFBO0FBRUYsS0FBSyxDQUFDLG1DQUFtQyxFQUFFLEdBQUcsRUFBRTtJQUMvQyxJQUFJLGNBQW1CLEVBQ3RCLFVBQTRCLEVBQzVCLFdBQXlCLEVBQ3pCLGtCQUFzRCxFQUN0RCxzQkFBK0MsQ0FBQTtJQUNoRCxNQUFNLHFCQUFxQixHQUFHLFFBQVEsQ0FBQyxFQUFFLENBQ3hDLHVCQUF1QixDQUFDLGFBQWEsQ0FDckMsQ0FBQTtJQUNELE1BQU0sV0FBVyxHQUFHLHVDQUF1QyxFQUFFLENBQUE7SUFFN0QsVUFBVSxDQUFDLEdBQUcsRUFBRTtRQUNmLHFCQUFxQixDQUFDLHFCQUFxQixDQUFDO1lBQzNDLEVBQUUsRUFBRSxPQUFPO1lBQ1gsSUFBSSxFQUFFLFFBQVE7WUFDZCxVQUFVLEVBQUU7Z0JBQ1gsNkJBQTZCLEVBQUU7b0JBQzlCLElBQUksRUFBRSxRQUFRO29CQUNkLE9BQU8sRUFBRSxPQUFPO29CQUNoQixLQUFLLHFDQUE2QjtpQkFDbEM7Z0JBQ0QsNkJBQTZCLEVBQUU7b0JBQzlCLElBQUksRUFBRSxRQUFRO29CQUNkLE9BQU8sRUFBRSxPQUFPO29CQUNoQixLQUFLLHFDQUE2QjtpQkFDbEM7YUFDRDtTQUNELENBQUMsQ0FBQTtJQUNILENBQUMsQ0FBQyxDQUFBO0lBRUYsS0FBSyxDQUFDLEtBQUssSUFBSSxFQUFFO1FBQ2hCLE1BQU0sVUFBVSxHQUFHLElBQUksY0FBYyxFQUFFLENBQUE7UUFDdkMsV0FBVyxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxXQUFXLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQTtRQUMxRCxNQUFNLGtCQUFrQixHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSwwQkFBMEIsRUFBRSxDQUFDLENBQUE7UUFDNUUsV0FBVyxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxrQkFBa0IsQ0FBQyxDQUFDLENBQUE7UUFFOUUsTUFBTSxlQUFlLEdBQUcsUUFBUSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUM5QyxNQUFNLE9BQU8sR0FBRyxRQUFRLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBQ25DLE1BQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFDbkMsY0FBYyxHQUFHLFFBQVEsQ0FBQyxJQUFJLEVBQUUseUJBQXlCLENBQUMsQ0FBQTtRQUMxRCxNQUFNLFNBQVMsR0FBRyxFQUFFLE9BQU8sRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLE9BQU8sQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxDQUFBO1FBRS9FLE1BQU0sV0FBVyxDQUFDLFlBQVksQ0FBQyxlQUFlLENBQUMsQ0FBQTtRQUMvQyxNQUFNLFdBQVcsQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDdkMsTUFBTSxXQUFXLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQ3ZDLE1BQU0sV0FBVyxDQUFDLFNBQVMsQ0FDMUIsY0FBYyxFQUNkLFFBQVEsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQzFELENBQUE7UUFFRCxNQUFNLG9CQUFvQixHQUFHLDZCQUE2QixDQUFDLFNBQVMsRUFBRSxXQUFXLENBQUMsQ0FBQTtRQUNsRixrQkFBa0IsR0FBRyxzQkFBc0IsQ0FBQTtRQUMzQyxNQUFNLGtCQUFrQixHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQ3pDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUN2RCxDQUFBO1FBQ0Qsb0JBQW9CLENBQUMsSUFBSSxDQUFDLG1CQUFtQixFQUFFLGtCQUFrQixDQUFDLENBQUE7UUFDbEUsTUFBTSxrQkFBa0IsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksa0JBQWtCLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQTtRQUMvRSxNQUFNLHVCQUF1QixHQUFHLG9CQUFvQixDQUFDLElBQUksQ0FDeEQsd0JBQXdCLEVBQ3hCLFdBQVcsQ0FBQyxHQUFHLENBQ2QsSUFBSSx1QkFBdUIsQ0FDMUIsa0JBQWtCLEVBQ2xCLFdBQVcsRUFDWCxrQkFBa0IsRUFDbEIsVUFBVSxDQUNWLENBQ0QsQ0FDRCxDQUFBO1FBQ0QsV0FBVyxDQUFDLEdBQUcsQ0FDZCxXQUFXLENBQUMsZ0JBQWdCLENBQzNCLE9BQU8sQ0FBQyxjQUFjLEVBQ3RCLFdBQVcsQ0FBQyxHQUFHLENBQ2QsSUFBSSxvQkFBb0IsQ0FDdkIsSUFBSSxDQUFDLE1BQU0sRUFDWCxrQkFBa0IsRUFDbEIsT0FBTyxDQUFDLGNBQWMsRUFDdEIsdUJBQXVCLEVBQ3ZCLGtCQUFrQixFQUNsQixJQUFJLGNBQWMsRUFBRSxDQUNwQixDQUNELENBQ0QsQ0FDRCxDQUFBO1FBQ0Qsc0JBQXNCLEdBQUcsb0JBQW9CLENBQUMsSUFBSSxDQUNqRCx1QkFBdUIsRUFDdkIsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLHNCQUFzQixDQUFDLHVCQUF1QixDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQ25GLENBQUE7UUFDRCxVQUFVLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FDM0IsSUFBSSxnQkFBZ0IsQ0FDbkIsRUFBRSxrQkFBa0IsRUFBRSxJQUFJLGtCQUFrQixFQUFFLEVBQUUsRUFDaEQsa0JBQWtCLEVBQ2xCLHNCQUFzQixFQUN0Qix1QkFBdUIsRUFDdkIsV0FBVyxFQUNYLGtCQUFrQixFQUNsQixrQkFBa0IsRUFDbEIsSUFBSSxjQUFjLEVBQUUsRUFDcEIsSUFBSSxpQkFBaUIsRUFBRSxDQUN2QixDQUNELENBQUE7UUFDRCxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLFdBQVcsQ0FBQyxDQUFBO1FBQ3BELG9CQUFvQixDQUFDLElBQUksQ0FBQyx3QkFBd0IsRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUMvRCxvQkFBb0IsQ0FBQyxJQUFJLENBQUMscUJBQXFCLEVBQUUsVUFBVSxDQUFDLENBQUE7UUFDNUQsb0JBQW9CLENBQUMsSUFBSSxDQUFDLG1CQUFtQixFQUFFLGtCQUFrQixDQUFDLENBQUE7UUFFbEUsTUFBTSxVQUFVLENBQUMsVUFBVSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDdkMsb0JBQW9CLENBQUMsSUFBSSxDQUN4QixnQkFBZ0IsRUFDaEIsV0FBVyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUN6RSxDQUFBO1FBQ0Qsb0JBQW9CLENBQUMsSUFBSSxDQUN4QixpQkFBaUIsRUFDakIsV0FBVyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUM5RSxDQUFBO1FBQ0QsVUFBVSxDQUFDLDJCQUEyQixDQUFDLG9CQUFvQixDQUFDLENBQUE7SUFDN0QsQ0FBQyxDQUFDLENBRUQ7SUFBQSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQ2hDLHFGQUFxRixFQUNyRixHQUFHLEVBQUUsQ0FDSixrQkFBa0IsQ0FBTyxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsRUFBRSxLQUFLLElBQUksRUFBRTtRQUM1RCxNQUFNLFdBQVcsQ0FBQyxTQUFTLENBQzFCLHNCQUFzQixDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsRUFDdEQsUUFBUSxDQUFDLFVBQVUsQ0FBQyxnREFBZ0QsQ0FBQyxDQUNyRSxDQUFBO1FBRUQsTUFBTSxVQUFVLENBQUMsbUJBQW1CLEVBQUUsQ0FBQTtRQUN0QyxNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsR0FBRyxFQUFFLENBQUE7UUFDMUIsV0FBVyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMseUJBQXlCLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtRQUM3RCxXQUFXLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyx3QkFBd0IsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO1FBQzVELFdBQVcsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLDRCQUE0QixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7UUFDaEUsV0FBVyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsMkJBQTJCLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtRQUMvRCxXQUFXLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyx3QkFBd0IsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO1FBRTVELE1BQU0sTUFBTSxHQUFHLFFBQVEsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFDbEMsTUFBTSxVQUFVLENBQUMsVUFBVSxDQUFDLHlCQUF5QixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7UUFFOUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLDZCQUE2QixDQUFDLEVBQUUsV0FBVyxDQUFDLENBQUE7UUFDbkYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3ZDLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSwrQkFBdUIsQ0FBQyxDQUFBO1FBQy9ELE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUE7UUFDbkQsTUFBTSxDQUFDLGVBQWUsQ0FDVSxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBRSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUMsRUFDcEYsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FDbkIsQ0FBQTtRQUNELE1BQU0sQ0FBQyxlQUFlLENBQWdDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFFLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ3JGLE1BQU0sQ0FBQyxlQUFlLENBQWdDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFFLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFBO0lBQ3RGLENBQUMsQ0FBQyxDQUNILENBRUE7SUFBQSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQ2hDLGtGQUFrRixFQUNsRixHQUFHLEVBQUUsQ0FDSixrQkFBa0IsQ0FBTyxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsRUFBRSxLQUFLLElBQUksRUFBRTtRQUM1RCxNQUFNLFdBQVcsQ0FBQyxTQUFTLENBQzFCLHNCQUFzQixDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsRUFDdEQsUUFBUSxDQUFDLFVBQVUsQ0FBQyxnREFBZ0QsQ0FBQyxDQUNyRSxDQUFBO1FBRUQsTUFBTSxVQUFVLENBQUMsbUJBQW1CLEVBQUUsQ0FBQTtRQUN0QyxNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsR0FBRyxFQUFFLENBQUE7UUFDMUIsV0FBVyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMseUJBQXlCLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtRQUM3RCxXQUFXLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyx3QkFBd0IsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO1FBQzVELFdBQVcsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLDRCQUE0QixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7UUFDaEUsV0FBVyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsMkJBQTJCLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtRQUMvRCxXQUFXLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyx3QkFBd0IsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO1FBRTVELE1BQU0sTUFBTSxHQUFHLFFBQVEsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFDbEMsTUFBTSxXQUFXLENBQUMsU0FBUyxDQUMxQixRQUFRLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxlQUFlLENBQUMsRUFDNUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxxREFBcUQsQ0FBQyxDQUMxRSxDQUFBO1FBQ0QsTUFBTSxVQUFVLENBQUMsVUFBVSxDQUFDLHlCQUF5QixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7UUFFOUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLDZCQUE2QixDQUFDLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQTtRQUN4RixNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDdkMsTUFBTSxDQUFDLGVBQWUsQ0FDckIsQ0FBQyxHQUErQixNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBRSxDQUFDLFlBQVksQ0FBQyxFQUNoRSxDQUFDLDZCQUE2QixDQUFDLENBQy9CLENBQUE7UUFDRCxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsK0JBQXVCLENBQUMsQ0FBQTtRQUMvRCxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFBO1FBQ25ELE1BQU0sQ0FBQyxlQUFlLENBQ1UsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDLEVBQ3BGLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQ25CLENBQUE7UUFDRCxNQUFNLENBQUMsZUFBZSxDQUFnQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBRSxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNyRixNQUFNLENBQUMsZUFBZSxDQUFnQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBRSxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQTtJQUN0RixDQUFDLENBQUMsQ0FDSCxDQUVBO0lBQUEsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUNoQyx5RkFBeUYsRUFDekYsR0FBRyxFQUFFLENBQ0osa0JBQWtCLENBQU8sRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDNUQsTUFBTSxXQUFXLENBQUMsU0FBUyxDQUMxQixzQkFBc0IsQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLEVBQ3RELFFBQVEsQ0FBQyxVQUFVLENBQUMsZ0RBQWdELENBQUMsQ0FDckUsQ0FBQTtRQUVELE1BQU0sVUFBVSxDQUFDLG1CQUFtQixFQUFFLENBQUE7UUFDdEMsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFBO1FBQzFCLFdBQVcsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLHlCQUF5QixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7UUFDN0QsV0FBVyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsd0JBQXdCLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtRQUM1RCxXQUFXLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyw0QkFBNEIsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO1FBQ2hFLFdBQVcsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLDJCQUEyQixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7UUFDL0QsV0FBVyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsd0JBQXdCLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtRQUU1RCxNQUFNLFVBQVUsQ0FBQyxVQUFVLENBQUMsc0JBQXNCLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQTtRQUVuRSxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDdkMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLGtDQUEwQixDQUFDLENBQUE7UUFDbEUsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQTtRQUNuRCxNQUFNLENBQUMsZUFBZSxDQUNVLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQ3RFLE1BQU0sQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLENBQ3JCLEVBQ0QsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLFFBQVEsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FDaEUsQ0FBQTtRQUNELE1BQU0sQ0FBQyxlQUFlLENBQWdDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFFLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ3JGLE1BQU0sQ0FBQyxlQUFlLENBQWdDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFFLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFBO0lBQ3RGLENBQUMsQ0FBQyxDQUNILENBRUE7SUFBQSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQ2hDLHNGQUFzRixFQUN0RixHQUFHLEVBQUUsQ0FDSixrQkFBa0IsQ0FBTyxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsRUFBRSxLQUFLLElBQUksRUFBRTtRQUM1RCxNQUFNLFdBQVcsQ0FBQyxTQUFTLENBQzFCLHNCQUFzQixDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsRUFDdEQsUUFBUSxDQUFDLFVBQVUsQ0FBQyxnREFBZ0QsQ0FBQyxDQUNyRSxDQUFBO1FBRUQsTUFBTSxVQUFVLENBQUMsbUJBQW1CLEVBQUUsQ0FBQTtRQUN0QyxNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsR0FBRyxFQUFFLENBQUE7UUFDMUIsV0FBVyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMseUJBQXlCLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtRQUM3RCxXQUFXLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyx3QkFBd0IsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO1FBQzVELFdBQVcsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLDRCQUE0QixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7UUFDaEUsV0FBVyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsMkJBQTJCLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtRQUMvRCxXQUFXLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyx3QkFBd0IsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO1FBRTVELE1BQU0sV0FBVyxDQUFDLFNBQVMsQ0FDMUIsUUFBUSxDQUFDLElBQUksRUFBRSxHQUFHLEVBQUUsU0FBUyxFQUFFLGVBQWUsQ0FBQyxFQUMvQyxRQUFRLENBQUMsVUFBVSxDQUFDLHNEQUFzRCxDQUFDLENBQzNFLENBQUE7UUFDRCxNQUFNLFdBQVcsQ0FBQyxTQUFTLENBQzFCLFFBQVEsQ0FBQyxJQUFJLEVBQUUsR0FBRyxFQUFFLFNBQVMsRUFBRSxlQUFlLENBQUMsRUFDL0MsUUFBUSxDQUFDLFVBQVUsQ0FBQyxzREFBc0QsQ0FBQyxDQUMzRSxDQUFBO1FBQ0QsTUFBTSxVQUFVLENBQUMsVUFBVSxDQUFDLHNCQUFzQixDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUE7UUFFbkUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3ZDLE1BQU0sQ0FBQyxlQUFlLENBQ3JCLENBQUMsR0FBK0IsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUUsQ0FBQyxZQUFZLENBQUMsRUFDaEUsQ0FBQyw2QkFBNkIsRUFBRSw2QkFBNkIsQ0FBQyxDQUM5RCxDQUFBO1FBQ0QsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLGtDQUEwQixDQUFDLENBQUE7UUFDbEUsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQTtRQUNuRCxNQUFNLENBQUMsZUFBZSxDQUNVLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQ3RFLE1BQU0sQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLENBQ3JCLEVBQ0QsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLFFBQVEsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FDaEUsQ0FBQTtRQUNELE1BQU0sQ0FBQyxlQUFlLENBQWdDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFFLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ3JGLE1BQU0sQ0FBQyxlQUFlLENBQWdDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFFLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFBO0lBQ3RGLENBQUMsQ0FBQyxDQUNILENBRUE7SUFBQSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQ2hDLHFGQUFxRixFQUNyRixHQUFHLEVBQUUsQ0FDSixrQkFBa0IsQ0FBTyxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsRUFBRSxLQUFLLElBQUksRUFBRTtRQUM1RCxNQUFNLFVBQVUsQ0FBQyxVQUFVLENBQUMseUJBQXlCLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDM0UsTUFBTSxXQUFXLENBQUMsU0FBUyxDQUMxQixzQkFBc0IsQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLEVBQ3RELFFBQVEsQ0FBQyxVQUFVLENBQUMsZ0RBQWdELENBQUMsQ0FDckUsQ0FBQTtRQUNELE1BQU0sVUFBVSxDQUFDLG1CQUFtQixFQUFFLENBQUE7UUFDdEMsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFBO1FBQzFCLFdBQVcsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLHlCQUF5QixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7UUFDN0QsV0FBVyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsd0JBQXdCLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtRQUM1RCxXQUFXLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyw0QkFBNEIsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO1FBQ2hFLFdBQVcsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLDJCQUEyQixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7UUFDL0QsV0FBVyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsd0JBQXdCLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtRQUU1RCxNQUFNLFVBQVUsQ0FBQyxVQUFVLENBQUMseUJBQXlCLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFM0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLDZCQUE2QixDQUFDLEVBQUUsV0FBVyxDQUFDLENBQUE7UUFDbkYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3ZDLE1BQU0sQ0FBQyxlQUFlLENBQ1UsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FDeEUsUUFBUSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FDdkIsRUFDRCxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FDaEMsQ0FBQTtRQUNELE1BQU0sQ0FBQyxlQUFlLENBQ1UsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUUsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FDMUUsUUFBUSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FDdkIsRUFDRCxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FDaEMsQ0FBQTtRQUNELE1BQU0sQ0FBQyxlQUFlLENBQWdDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFFLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFBO0lBQ3RGLENBQUMsQ0FBQyxDQUNILENBRUE7SUFBQSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQ2hDLGtGQUFrRixFQUNsRixHQUFHLEVBQUUsQ0FDSixrQkFBa0IsQ0FBTyxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsRUFBRSxLQUFLLElBQUksRUFBRTtRQUM1RCxNQUFNLFVBQVUsQ0FBQyxVQUFVLENBQUMseUJBQXlCLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDM0UsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFBO1FBQzFCLFdBQVcsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLHlCQUF5QixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7UUFDN0QsV0FBVyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsd0JBQXdCLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtRQUM1RCxXQUFXLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyw0QkFBNEIsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO1FBQ2hFLFdBQVcsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLDJCQUEyQixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7UUFDL0QsV0FBVyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsd0JBQXdCLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtRQUU1RCxNQUFNLFdBQVcsQ0FBQyxTQUFTLENBQzFCLFFBQVEsQ0FBQyxJQUFJLEVBQUUsR0FBRyxFQUFFLFNBQVMsRUFBRSxlQUFlLENBQUMsRUFDL0MsUUFBUSxDQUFDLFVBQVUsQ0FBQyxzREFBc0QsQ0FBQyxDQUMzRSxDQUFBO1FBQ0QsTUFBTSxVQUFVLENBQUMsVUFBVSxDQUFDLHlCQUF5QixDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBRTNFLE1BQU0sQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyw2QkFBNkIsQ0FBQyxFQUFFLGlCQUFpQixDQUFDLENBQUE7UUFDekYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3ZDLE1BQU0sQ0FBQyxlQUFlLENBQ3JCLENBQUMsR0FBK0IsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUUsQ0FBQyxZQUFZLENBQUMsRUFDaEUsQ0FBQyw2QkFBNkIsQ0FBQyxDQUMvQixDQUFBO1FBQ0QsTUFBTSxDQUFDLGVBQWUsQ0FDVSxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBRSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUN4RSxRQUFRLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUN2QixFQUNELENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUNoQyxDQUFBO1FBQ0QsTUFBTSxDQUFDLGVBQWUsQ0FDVSxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBRSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUMxRSxRQUFRLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUN2QixFQUNELENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUNoQyxDQUFBO1FBQ0QsTUFBTSxDQUFDLGVBQWUsQ0FBZ0MsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUUsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUE7SUFDdEYsQ0FBQyxDQUFDLENBQ0gsQ0FFQTtJQUFBLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FDaEMsd0dBQXdHLEVBQ3hHLEdBQUcsRUFBRSxDQUNKLGtCQUFrQixDQUFPLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzVELE1BQU0sVUFBVSxDQUFDLFVBQVUsQ0FBQyx5QkFBeUIsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUMzRSxNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsR0FBRyxFQUFFLENBQUE7UUFDMUIsV0FBVyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMseUJBQXlCLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtRQUM3RCxXQUFXLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyx3QkFBd0IsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO1FBQzVELFdBQVcsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLDRCQUE0QixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7UUFDaEUsV0FBVyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsMkJBQTJCLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtRQUMvRCxXQUFXLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyx3QkFBd0IsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO1FBRTVELE1BQU0sV0FBVyxDQUFDLFNBQVMsQ0FDMUIsUUFBUSxDQUFDLElBQUksRUFBRSxHQUFHLEVBQUUsU0FBUyxFQUFFLGVBQWUsQ0FBQyxFQUMvQyxRQUFRLENBQUMsVUFBVSxDQUFDLHNEQUFzRCxDQUFDLENBQzNFLENBQUE7UUFDRCxNQUFNLFVBQVUsQ0FBQyxVQUFVLENBQUMsc0JBQXNCLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQTtRQUVuRSxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDdkMsTUFBTSxDQUFDLGVBQWUsQ0FDckIsQ0FBQyxHQUErQixNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBRSxDQUFDLFlBQVksQ0FBQyxFQUNoRSxDQUFDLDZCQUE2QixDQUFDLENBQy9CLENBQUE7UUFDRCxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsa0NBQTBCLENBQUMsQ0FBQTtRQUNsRSxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFBO1FBQ25ELE1BQU0sQ0FBQyxlQUFlLENBQ1UsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FDeEUsUUFBUSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FDdkIsRUFDRCxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FDaEMsQ0FBQTtRQUNELE1BQU0sQ0FBQyxlQUFlLENBQWdDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFFLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ3JGLE1BQU0sQ0FBQyxlQUFlLENBQWdDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFFLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFBO0lBQ3RGLENBQUMsQ0FBQyxDQUNILENBQUE7QUFDRixDQUFDLENBQUMsQ0FBQTtBQUVGLEtBQUssQ0FBQyx3Q0FBd0MsRUFBRSxHQUFHLEVBQUU7SUFDcEQsSUFBSSxVQUE0QixFQUMvQixnQkFBa0MsRUFDbEMsV0FBeUIsRUFDekIsa0JBQXVELEVBQ3ZELHNCQUErQyxFQUMvQyxvQkFBOEMsQ0FBQTtJQUMvQyxNQUFNLHFCQUFxQixHQUFHLFFBQVEsQ0FBQyxFQUFFLENBQ3hDLHVCQUF1QixDQUFDLGFBQWEsQ0FDckMsQ0FBQTtJQUNELE1BQU0sV0FBVyxHQUFHLHVDQUF1QyxFQUFFLENBQUE7SUFFN0QsVUFBVSxDQUFDLEdBQUcsRUFBRTtRQUNmLHFCQUFxQixDQUFDLHFCQUFxQixDQUFDO1lBQzNDLEVBQUUsRUFBRSxPQUFPO1lBQ1gsSUFBSSxFQUFFLFFBQVE7WUFDZCxVQUFVLEVBQUU7Z0JBQ1gsZ0RBQWdELEVBQUU7b0JBQ2pELElBQUksRUFBRSxRQUFRO29CQUNkLE9BQU8sRUFBRSxPQUFPO29CQUNoQixLQUFLLHdDQUFnQztpQkFDckM7Z0JBQ0QsNENBQTRDLEVBQUU7b0JBQzdDLElBQUksRUFBRSxRQUFRO29CQUNkLE9BQU8sRUFBRSxPQUFPO29CQUNoQixLQUFLLG9DQUE0QjtpQkFDakM7Z0JBQ0QsdURBQXVELEVBQUU7b0JBQ3hELElBQUksRUFBRSxRQUFRO29CQUNkLE9BQU8sRUFBRSxPQUFPO29CQUNoQixLQUFLLGdEQUF3QztpQkFDN0M7Z0JBQ0QsdURBQXVELEVBQUU7b0JBQ3hELElBQUksRUFBRSxRQUFRO29CQUNkLE9BQU8sRUFBRSxPQUFPO29CQUNoQixLQUFLLGdEQUF3QztpQkFDN0M7Z0JBQ0QseUNBQXlDLEVBQUU7b0JBQzFDLElBQUksRUFBRSxRQUFRO29CQUNkLE9BQU8sRUFBRSxPQUFPO29CQUNoQixLQUFLLHFDQUE2QjtpQkFDbEM7Z0JBQ0QsNkNBQTZDLEVBQUU7b0JBQzlDLElBQUksRUFBRSxRQUFRO29CQUNkLE9BQU8sRUFBRSxPQUFPO29CQUNoQixLQUFLLGlEQUF5QztpQkFDOUM7Z0JBQ0QsK0NBQStDLEVBQUU7b0JBQ2hELElBQUksRUFBRSxRQUFRO29CQUNkLE9BQU8sRUFBRSxPQUFPO29CQUNoQixVQUFVLEVBQUUsSUFBSTtpQkFDaEI7Z0JBQ0QsMkNBQTJDLEVBQUU7b0JBQzVDLElBQUksRUFBRSxRQUFRO29CQUNkLE9BQU8sRUFBRSxPQUFPO29CQUNoQixNQUFNLEVBQUU7d0JBQ1AsSUFBSSxFQUFFLDJDQUEyQzt3QkFDakQsY0FBYyxFQUFFLE9BQU87cUJBQ3ZCO2lCQUNEO2dCQUNELGlEQUFpRCxFQUFFO29CQUNsRCxJQUFJLEVBQUUsUUFBUTtvQkFDZCxPQUFPLEVBQUUsRUFBRTtvQkFDWCxNQUFNLEVBQUU7d0JBQ1AsSUFBSSxFQUFFLGlEQUFpRDt3QkFDdkQsY0FBYyxFQUFFLE9BQU87cUJBQ3ZCO2lCQUNEO2FBQ0Q7U0FDRCxDQUFDLENBQUE7UUFFRixxQkFBcUIsQ0FBQyw2QkFBNkIsQ0FBQztZQUNuRDtnQkFDQyxTQUFTLEVBQUU7b0JBQ1YsU0FBUyxFQUFFO3dCQUNWLDZDQUE2QyxFQUFFLGVBQWU7cUJBQzlEO2lCQUNEO2FBQ0Q7U0FDRCxDQUFDLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQTtJQUVGLEtBQUssQ0FBQyxLQUFLLElBQUksRUFBRTtRQUNoQixNQUFNLFVBQVUsR0FBRyxJQUFJLGNBQWMsRUFBRSxDQUFBO1FBQ3ZDLFdBQVcsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksV0FBVyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUE7UUFDMUQsTUFBTSxrQkFBa0IsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksMEJBQTBCLEVBQUUsQ0FBQyxDQUFBO1FBQzVFLFdBQVcsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsa0JBQWtCLENBQUMsQ0FBQyxDQUFBO1FBRTlFLE1BQU0sTUFBTSxHQUFHLFFBQVEsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFDbEMsTUFBTSxXQUFXLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBRXRDLG9CQUFvQixHQUFHLDZCQUE2QixDQUFDLFNBQVMsRUFBRSxXQUFXLENBQUMsQ0FBQTtRQUM1RSxrQkFBa0IsR0FBRyxzQkFBc0IsQ0FBQTtRQUMzQyxrQkFBa0IsQ0FBQyxVQUFVLEdBQUcsUUFBUSxDQUFDLE1BQU0sRUFBRSxlQUFlLENBQUMsQ0FBQTtRQUNqRSxNQUFNLGtCQUFrQixHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQ3pDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUN2RCxDQUFBO1FBQ0Qsb0JBQW9CLENBQUMsSUFBSSxDQUFDLG1CQUFtQixFQUFFLGtCQUFrQixDQUFDLENBQUE7UUFDbEUsTUFBTSxrQkFBa0IsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksa0JBQWtCLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQTtRQUMvRSxNQUFNLHVCQUF1QixHQUFHLG9CQUFvQixDQUFDLElBQUksQ0FDeEQsd0JBQXdCLEVBQ3hCLFdBQVcsQ0FBQyxHQUFHLENBQ2QsSUFBSSx1QkFBdUIsQ0FDMUIsa0JBQWtCLEVBQ2xCLFdBQVcsRUFDWCxrQkFBa0IsRUFDbEIsVUFBVSxDQUNWLENBQ0QsQ0FDRCxDQUFBO1FBQ0QsV0FBVyxDQUFDLEdBQUcsQ0FDZCxXQUFXLENBQUMsZ0JBQWdCLENBQzNCLE9BQU8sQ0FBQyxjQUFjLEVBQ3RCLFdBQVcsQ0FBQyxHQUFHLENBQ2QsSUFBSSxvQkFBb0IsQ0FDdkIsSUFBSSxDQUFDLE1BQU0sRUFDWCxrQkFBa0IsRUFDbEIsT0FBTyxDQUFDLGNBQWMsRUFDdEIsdUJBQXVCLEVBQ3ZCLGtCQUFrQixFQUNsQixJQUFJLGNBQWMsRUFBRSxDQUNwQixDQUNELENBQ0QsQ0FDRCxDQUFBO1FBQ0Qsc0JBQXNCLEdBQUcsb0JBQW9CLENBQUMsSUFBSSxDQUNqRCx1QkFBdUIsRUFDdkIsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLHNCQUFzQixDQUFDLHVCQUF1QixDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQ25GLENBQUE7UUFDRCxnQkFBZ0IsR0FBRyxVQUFVLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FDOUMsSUFBSSxnQkFBZ0IsQ0FDbkIsRUFBRSxrQkFBa0IsRUFBRSxJQUFJLGtCQUFrQixFQUFFLEVBQUUsRUFDaEQsa0JBQWtCLEVBQ2xCLHNCQUFzQixFQUN0Qix1QkFBdUIsRUFDdkIsV0FBVyxFQUNYLGtCQUFrQixFQUNsQixrQkFBa0IsRUFDbEIsSUFBSSxjQUFjLEVBQUUsRUFDcEIsV0FBVyxDQUFDLEdBQUcsQ0FDZCxJQUFJLGlCQUFpQixDQUFDLGtCQUFrQixDQUFDLFVBQVUsRUFBRSxXQUFXLEVBQUUsVUFBVSxDQUFDLENBQzdFLENBQ0QsQ0FDRCxDQUFBO1FBQ0Qsb0JBQW9CLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxXQUFXLENBQUMsQ0FBQTtRQUNwRCxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsd0JBQXdCLEVBQUUsVUFBVSxDQUFDLENBQUE7UUFDL0Qsb0JBQW9CLENBQUMsSUFBSSxDQUFDLHFCQUFxQixFQUFFLFVBQVUsQ0FBQyxDQUFBO1FBQzVELG9CQUFvQixDQUFDLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxrQkFBa0IsQ0FBQyxDQUFBO1FBRWxFLE1BQU0sZ0JBQWdCLENBQUMsVUFBVSxDQUFDLHlCQUF5QixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7UUFDcEUsb0JBQW9CLENBQUMsSUFBSSxDQUN4Qix5QkFBeUIsRUFDekIsV0FBVyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMseUJBQXlCLENBQUMsQ0FBQyxDQUMvRSxDQUFBO1FBQ0Qsb0JBQW9CLENBQUMsSUFBSSxDQUN4QixnQkFBZ0IsRUFDaEIsV0FBVyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUN6RSxDQUFBO1FBQ0Qsb0JBQW9CLENBQUMsSUFBSSxDQUN4QixpQkFBaUIsRUFDRSxDQUNsQixXQUFXLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQzlFLENBQ0QsQ0FBQTtRQUNELGdCQUFnQixDQUFDLDJCQUEyQixDQUFDLG9CQUFvQixDQUFDLENBQUE7SUFDbkUsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsVUFBVSxFQUFFLEdBQUcsRUFBRTtRQUNyQixNQUFNLENBQUMsZUFBZSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsc0JBQXNCLENBQUMsRUFBRTtZQUNuRSxNQUFNLEVBQUU7Z0JBQ1Asa0JBQWtCLEVBQUUsT0FBTztnQkFDM0IsY0FBYyxFQUFFLE9BQU87Z0JBQ3ZCLHlCQUF5QixFQUFFLE9BQU87Z0JBQ2xDLHlCQUF5QixFQUFFLE9BQU87Z0JBQ2xDLFdBQVcsRUFBRSxPQUFPO2dCQUNwQixlQUFlLEVBQUUsT0FBTztnQkFDeEIsaUJBQWlCLEVBQUUsT0FBTztnQkFDMUIsYUFBYSxFQUFFLE9BQU87Z0JBQ3RCLG1CQUFtQixFQUFFLEVBQUU7YUFDdkI7U0FDRCxDQUFDLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQywyQkFBMkIsRUFBRSxHQUFHLEVBQUUsQ0FDdEMsa0JBQWtCLENBQU8sRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDNUQsTUFBTSxXQUFXLENBQUMsU0FBUyxDQUMxQixzQkFBc0IsQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLEVBQ3RELFFBQVEsQ0FBQyxVQUFVLENBQUMsNERBQTRELENBQUMsQ0FDakYsQ0FBQTtRQUNELE1BQU0sVUFBVSxDQUFDLG1CQUFtQixFQUFFLENBQUE7UUFDdEMsTUFBTSxDQUFDLFdBQVcsQ0FDakIsVUFBVSxDQUFDLFFBQVEsQ0FBQyx5Q0FBeUMsQ0FBQyxFQUM5RCxXQUFXLENBQ1gsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFFSixJQUFJLENBQUMsU0FBUyxFQUFFLEdBQUcsRUFBRSxDQUNwQixrQkFBa0IsQ0FBTyxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsRUFBRSxLQUFLLElBQUksRUFBRTtRQUM1RCxNQUFNLFdBQVcsQ0FBQyxTQUFTLENBQzFCLHNCQUFzQixDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsRUFDdEQsUUFBUSxDQUFDLFVBQVUsQ0FBQyx1Q0FBdUMsQ0FBQyxDQUM1RCxDQUFBO1FBQ0QsTUFBTSxVQUFVLENBQUMsbUJBQW1CLEVBQUUsQ0FBQTtRQUN0QyxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsMkJBQTJCLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtJQUMzRSxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBRUosSUFBSSxDQUFDLG9CQUFvQixFQUFFLEdBQUcsRUFBRSxDQUMvQixrQkFBa0IsQ0FBTyxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsRUFBRSxLQUFLLElBQUksRUFBRTtRQUM1RCxNQUFNLFdBQVcsQ0FBQyxTQUFTLENBQzFCLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLFNBQVMsRUFBRSxlQUFlLENBQUMsRUFDcEYsUUFBUSxDQUFDLFVBQVUsQ0FBQyx3Q0FBd0MsQ0FBQyxDQUM3RCxDQUFBO1FBQ0QsTUFBTSxVQUFVLENBQUMsbUJBQW1CLEVBQUUsQ0FBQTtRQUN0QyxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsNEJBQTRCLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtJQUM1RSxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBRUosSUFBSSxDQUFDLDJDQUEyQyxFQUFFLEdBQUcsRUFBRSxDQUN0RCxrQkFBa0IsQ0FBTyxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsRUFBRSxLQUFLLElBQUksRUFBRTtRQUM1RCxNQUFNLFdBQVcsQ0FBQyxTQUFTLENBQzFCLHNCQUFzQixDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsRUFDdEQsUUFBUSxDQUFDLFVBQVUsQ0FBQyw0REFBNEQsQ0FBQyxDQUNqRixDQUFBO1FBQ0QsTUFBTSxXQUFXLENBQUMsU0FBUyxDQUMxQixRQUFRLENBQUMsZ0JBQWdCLENBQUMsWUFBWSxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxTQUFTLEVBQUUsZUFBZSxDQUFDLEVBQ3BGLFFBQVEsQ0FBQyxVQUFVLENBQUMsaUVBQWlFLENBQUMsQ0FDdEYsQ0FBQTtRQUNELE1BQU0sVUFBVSxDQUFDLG1CQUFtQixFQUFFLENBQUE7UUFDdEMsTUFBTSxDQUFDLFdBQVcsQ0FDakIsVUFBVSxDQUFDLFFBQVEsQ0FBQyx5Q0FBeUMsQ0FBQyxFQUM5RCxnQkFBZ0IsQ0FDaEIsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFFSixJQUFJLENBQUMscURBQXFELEVBQUUsR0FBRyxFQUFFLENBQ2hFLGtCQUFrQixDQUFPLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzVELE1BQU0sV0FBVyxDQUFDLFNBQVMsQ0FDMUIsc0JBQXNCLENBQUMsY0FBYyxDQUFDLGdCQUFnQixFQUN0RCxRQUFRLENBQUMsVUFBVSxDQUNsQiwwRUFBMEUsQ0FDMUUsQ0FDRCxDQUFBO1FBQ0QsTUFBTSxXQUFXLENBQUMsU0FBUyxDQUMxQixRQUFRLENBQUMsZ0JBQWdCLENBQUMsWUFBWSxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxTQUFTLEVBQUUsZUFBZSxDQUFDLEVBQ3BGLFFBQVEsQ0FBQyxVQUFVLENBQ2xCLCtFQUErRSxDQUMvRSxDQUNELENBQUE7UUFDRCxNQUFNLFVBQVUsQ0FBQyxtQkFBbUIsRUFBRSxDQUFBO1FBQ3RDLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLFVBQVUsQ0FBQyxRQUFRLENBQUMsdURBQXVELENBQUMsRUFDNUUsZ0JBQWdCLENBQ2hCLENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQyxDQUFBO0lBRUosSUFBSSxDQUFDLDBFQUEwRSxFQUFFLEdBQUcsRUFBRSxDQUNyRixrQkFBa0IsQ0FBTyxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsRUFBRSxLQUFLLElBQUksRUFBRTtRQUM1RCxNQUFNLFdBQVcsQ0FBQyxTQUFTLENBQzFCLHNCQUFzQixDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsRUFDdEQsUUFBUSxDQUFDLFVBQVUsQ0FBQywyREFBMkQsQ0FBQyxDQUNoRixDQUFBO1FBQ0QsTUFBTSxXQUFXLENBQUMsU0FBUyxDQUMxQixRQUFRLENBQUMsZ0JBQWdCLENBQUMsWUFBWSxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxTQUFTLEVBQUUsZUFBZSxDQUFDLEVBQ3BGLFFBQVEsQ0FBQyxVQUFVLENBQUMsZ0VBQWdFLENBQUMsQ0FDckYsQ0FBQTtRQUNELE1BQU0sVUFBVSxDQUFDLG1CQUFtQixFQUFFLENBQUE7UUFDdEMscUJBQXFCLENBQUMscUJBQXFCLENBQUM7WUFDM0MsRUFBRSxFQUFFLE9BQU87WUFDWCxJQUFJLEVBQUUsUUFBUTtZQUNkLFVBQVUsRUFBRTtnQkFDWCx3Q0FBd0MsRUFBRTtvQkFDekMsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsT0FBTyxFQUFFLE9BQU87aUJBQ2hCO2FBQ0Q7U0FDRCxDQUFDLENBQUE7UUFDRixNQUFNLENBQUMsV0FBVyxDQUNqQixVQUFVLENBQUMsUUFBUSxDQUFDLHdDQUF3QyxDQUFDLEVBQzdELGdCQUFnQixDQUNoQixDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUVKLElBQUksQ0FBQyxvRkFBb0YsRUFBRSxHQUFHLEVBQUUsQ0FDL0Ysa0JBQWtCLENBQU8sRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDNUQsTUFBTSxXQUFXLENBQUMsU0FBUyxDQUMxQixzQkFBc0IsQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLEVBQ3RELFFBQVEsQ0FBQyxVQUFVLENBQ2xCLDZFQUE2RSxDQUM3RSxDQUNELENBQUE7UUFDRCxNQUFNLFdBQVcsQ0FBQyxTQUFTLENBQzFCLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLFNBQVMsRUFBRSxlQUFlLENBQUMsRUFDcEYsUUFBUSxDQUFDLFVBQVUsQ0FDbEIsa0ZBQWtGLENBQ2xGLENBQ0QsQ0FBQTtRQUNELE1BQU0sVUFBVSxDQUFDLG1CQUFtQixFQUFFLENBQUE7UUFDdEMscUJBQXFCLENBQUMscUJBQXFCLENBQUM7WUFDM0MsRUFBRSxFQUFFLE9BQU87WUFDWCxJQUFJLEVBQUUsUUFBUTtZQUNkLFVBQVUsRUFBRTtnQkFDWCwwREFBMEQsRUFBRTtvQkFDM0QsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsT0FBTyxFQUFFLE9BQU87b0JBQ2hCLEtBQUssZ0RBQXdDO2lCQUM3QzthQUNEO1NBQ0QsQ0FBQyxDQUFBO1FBQ0YsTUFBTSxDQUFDLFdBQVcsQ0FDakIsVUFBVSxDQUFDLFFBQVEsQ0FBQywwREFBMEQsQ0FBQyxFQUMvRSxnQkFBZ0IsQ0FDaEIsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFFSixJQUFJLENBQUMsa0RBQWtELEVBQUUsR0FBRyxFQUFFLENBQzdELGtCQUFrQixDQUFPLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzVELE1BQU0sV0FBVyxDQUFDLFNBQVMsQ0FDMUIsc0JBQXNCLENBQUMsY0FBYyxDQUFDLGdCQUFnQixFQUN0RCxRQUFRLENBQUMsVUFBVSxDQUFDLG1FQUFtRSxDQUFDLENBQ3hGLENBQUE7UUFDRCxNQUFNLFdBQVcsQ0FBQyxTQUFTLENBQzFCLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLFNBQVMsRUFBRSxlQUFlLENBQUMsRUFDcEYsUUFBUSxDQUFDLFVBQVUsQ0FDbEIsd0VBQXdFLENBQ3hFLENBQ0QsQ0FBQTtRQUVELE1BQU0sVUFBVSxDQUFDLG1CQUFtQixFQUFFLENBQUE7UUFFdEMsTUFBTSxDQUFDLFdBQVcsQ0FDakIsVUFBVSxDQUFDLFFBQVEsQ0FBQyxnREFBZ0QsQ0FBQyxFQUNyRSxXQUFXLENBQ1gsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFFSixJQUFJLENBQUMsc0ZBQXNGLEVBQUUsR0FBRyxFQUFFLENBQ2pHLGtCQUFrQixDQUFPLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzVELE1BQU0sV0FBVyxDQUFDLFNBQVMsQ0FDMUIsc0JBQXNCLENBQUMsY0FBYyxDQUFDLGdCQUFnQixFQUN0RCxRQUFRLENBQUMsVUFBVSxDQUFDLG1FQUFtRSxDQUFDLENBQ3hGLENBQUE7UUFDRCxNQUFNLFdBQVcsQ0FBQyxTQUFTLENBQzFCLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLFNBQVMsRUFBRSxlQUFlLENBQUMsRUFDcEYsUUFBUSxDQUFDLFVBQVUsQ0FDbEIsd0VBQXdFLENBQ3hFLENBQ0QsQ0FBQTtRQUVELE1BQU0sVUFBVSxDQUFDLG1CQUFtQixFQUFFLENBQUE7UUFFdEMsTUFBTSxDQUFDLFdBQVcsQ0FDakIsVUFBVSxDQUFDLFFBQVEsQ0FBQyxnREFBZ0QsRUFBRTtZQUNyRSxRQUFRLEVBQUUsZ0JBQWdCLENBQUMsWUFBWSxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUc7U0FDeEQsQ0FBQyxFQUNGLFdBQVcsQ0FDWCxDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUVKLElBQUksQ0FBQyw4Q0FBOEMsRUFBRSxHQUFHLEVBQUUsQ0FDekQsa0JBQWtCLENBQU8sRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDNUQsTUFBTSxXQUFXLENBQUMsU0FBUyxDQUMxQixzQkFBc0IsQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLEVBQ3RELFFBQVEsQ0FBQyxVQUFVLENBQUMsK0RBQStELENBQUMsQ0FDcEYsQ0FBQTtRQUNELE1BQU0sV0FBVyxDQUFDLFNBQVMsQ0FDMUIsUUFBUSxDQUFDLGdCQUFnQixDQUFDLFlBQVksRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsU0FBUyxFQUFFLGVBQWUsQ0FBQyxFQUNwRixRQUFRLENBQUMsVUFBVSxDQUFDLG9FQUFvRSxDQUFDLENBQ3pGLENBQUE7UUFFRCxNQUFNLFVBQVUsQ0FBQyxtQkFBbUIsRUFBRSxDQUFBO1FBRXRDLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLFVBQVUsQ0FBQyxRQUFRLENBQUMsNENBQTRDLEVBQUU7WUFDakUsUUFBUSxFQUFFLGdCQUFnQixDQUFDLFlBQVksRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHO1NBQ3hELENBQUMsRUFDRixXQUFXLENBQ1gsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFFSixJQUFJLENBQUMsa0ZBQWtGLEVBQUUsR0FBRyxFQUFFLENBQzdGLGtCQUFrQixDQUFPLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzVELE1BQU0sV0FBVyxDQUFDLFNBQVMsQ0FDMUIsc0JBQXNCLENBQUMsY0FBYyxDQUFDLGdCQUFnQixFQUN0RCxRQUFRLENBQUMsVUFBVSxDQUFDLCtEQUErRCxDQUFDLENBQ3BGLENBQUE7UUFDRCxNQUFNLFdBQVcsQ0FBQyxTQUFTLENBQzFCLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLFNBQVMsRUFBRSxlQUFlLENBQUMsRUFDcEYsUUFBUSxDQUFDLFVBQVUsQ0FBQyxvRUFBb0UsQ0FBQyxDQUN6RixDQUFBO1FBRUQsTUFBTSxVQUFVLENBQUMsbUJBQW1CLEVBQUUsQ0FBQTtRQUV0QyxNQUFNLENBQUMsV0FBVyxDQUNqQixVQUFVLENBQUMsUUFBUSxDQUFDLDRDQUE0QyxFQUFFO1lBQ2pFLFFBQVEsRUFBRSxnQkFBZ0IsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRztTQUN4RCxDQUFDLEVBQ0YsV0FBVyxDQUNYLENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQyxDQUFBO0lBRUosSUFBSSxDQUFDLHNFQUFzRSxFQUFFLEdBQUcsRUFBRSxDQUNqRixrQkFBa0IsQ0FBTyxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsRUFBRSxLQUFLLElBQUksRUFBRTtRQUM1RCxNQUFNLFdBQVcsQ0FBQyxTQUFTLENBQzFCLHNCQUFzQixDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsRUFDdEQsUUFBUSxDQUFDLFVBQVUsQ0FDbEIsMEVBQTBFLENBQzFFLENBQ0QsQ0FBQTtRQUNELE1BQU0sV0FBVyxDQUFDLFNBQVMsQ0FDMUIsUUFBUSxDQUFDLGdCQUFnQixDQUFDLFlBQVksRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsU0FBUyxFQUFFLGVBQWUsQ0FBQyxFQUNwRixRQUFRLENBQUMsVUFBVSxDQUNsQiwrRUFBK0UsQ0FDL0UsQ0FDRCxDQUFBO1FBRUQsTUFBTSxVQUFVLENBQUMsbUJBQW1CLEVBQUUsQ0FBQTtRQUV0QyxNQUFNLENBQUMsV0FBVyxDQUNqQixVQUFVLENBQUMsUUFBUSxDQUFDLHVEQUF1RCxDQUFDLEVBQzVFLFdBQVcsQ0FDWCxDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUVKLElBQUksQ0FBQywwR0FBMEcsRUFBRSxHQUFHLEVBQUUsQ0FDckgsa0JBQWtCLENBQU8sRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDNUQsTUFBTSxXQUFXLENBQUMsU0FBUyxDQUMxQixzQkFBc0IsQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLEVBQ3RELFFBQVEsQ0FBQyxVQUFVLENBQ2xCLDBFQUEwRSxDQUMxRSxDQUNELENBQUE7UUFDRCxNQUFNLFdBQVcsQ0FBQyxTQUFTLENBQzFCLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLFNBQVMsRUFBRSxlQUFlLENBQUMsRUFDcEYsUUFBUSxDQUFDLFVBQVUsQ0FDbEIsK0VBQStFLENBQy9FLENBQ0QsQ0FBQTtRQUVELE1BQU0sVUFBVSxDQUFDLG1CQUFtQixFQUFFLENBQUE7UUFFdEMsTUFBTSxDQUFDLFdBQVcsQ0FDakIsVUFBVSxDQUFDLFFBQVEsQ0FBQyx1REFBdUQsRUFBRTtZQUM1RSxRQUFRLEVBQUUsZ0JBQWdCLENBQUMsWUFBWSxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUc7U0FDeEQsQ0FBQyxFQUNGLFdBQVcsQ0FDWCxDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUVKLElBQUksQ0FBQyx5RUFBeUUsRUFBRSxHQUFHLEVBQUUsQ0FDcEYsa0JBQWtCLENBQU8sRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDNUQsTUFBTSxXQUFXLENBQUMsU0FBUyxDQUMxQixzQkFBc0IsQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLEVBQ3RELFFBQVEsQ0FBQyxVQUFVLENBQUMscUVBQXFFLENBQUMsQ0FDMUYsQ0FBQTtRQUNELE1BQU0sV0FBVyxDQUFDLFNBQVMsQ0FDMUIsUUFBUSxDQUFDLGdCQUFnQixDQUFDLFlBQVksRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsU0FBUyxFQUFFLGVBQWUsQ0FBQyxFQUNwRixRQUFRLENBQUMsVUFBVSxDQUNsQiwwRUFBMEUsQ0FDMUUsQ0FDRCxDQUFBO1FBRUQsTUFBTSxVQUFVLENBQUMsbUJBQW1CLEVBQUUsQ0FBQTtRQUN0QyxNQUFNLENBQUMsV0FBVyxDQUNqQixVQUFVLENBQUMsUUFBUSxDQUFDLGtEQUFrRCxDQUFDLEVBQ3ZFLGdCQUFnQixDQUNoQixDQUFBO1FBRUQscUJBQXFCLENBQUMscUJBQXFCLENBQUM7WUFDM0MsRUFBRSxFQUFFLE9BQU87WUFDWCxJQUFJLEVBQUUsUUFBUTtZQUNkLFVBQVUsRUFBRTtnQkFDWCxrREFBa0QsRUFBRTtvQkFDbkQsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsT0FBTyxFQUFFLE9BQU87b0JBQ2hCLEtBQUssd0NBQWdDO2lCQUNyQzthQUNEO1NBQ0QsQ0FBQyxDQUFBO1FBRUYsTUFBTSxDQUFDLFdBQVcsQ0FDakIsVUFBVSxDQUFDLFFBQVEsQ0FBQyxrREFBa0QsQ0FBQyxFQUN2RSxXQUFXLENBQ1gsQ0FBQTtRQUVELE1BQU0sVUFBVSxDQUFDLG1CQUFtQixFQUFFLENBQUE7UUFDdEMsTUFBTSxDQUFDLFdBQVcsQ0FDakIsVUFBVSxDQUFDLFFBQVEsQ0FBQyxrREFBa0QsQ0FBQyxFQUN2RSxXQUFXLENBQ1gsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFFSixJQUFJLENBQUMsaUhBQWlILEVBQUUsR0FBRyxFQUFFLENBQzVILGtCQUFrQixDQUFPLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzVELE1BQU0sV0FBVyxDQUFDLFNBQVMsQ0FDMUIsc0JBQXNCLENBQUMsY0FBYyxDQUFDLGdCQUFnQixFQUN0RCxRQUFRLENBQUMsVUFBVSxDQUFDLHFFQUFxRSxDQUFDLENBQzFGLENBQUE7UUFDRCxNQUFNLFdBQVcsQ0FBQyxTQUFTLENBQzFCLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLFNBQVMsRUFBRSxlQUFlLENBQUMsRUFDcEYsUUFBUSxDQUFDLFVBQVUsQ0FDbEIsMEVBQTBFLENBQzFFLENBQ0QsQ0FBQTtRQUVELE1BQU0sVUFBVSxDQUFDLG1CQUFtQixFQUFFLENBQUE7UUFDdEMsTUFBTSxDQUFDLFdBQVcsQ0FDakIsVUFBVSxDQUFDLFFBQVEsQ0FBQyxrREFBa0QsRUFBRTtZQUN2RSxRQUFRLEVBQUUsZ0JBQWdCLENBQUMsWUFBWSxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUc7U0FDeEQsQ0FBQyxFQUNGLGdCQUFnQixDQUNoQixDQUFBO1FBRUQscUJBQXFCLENBQUMscUJBQXFCLENBQUM7WUFDM0MsRUFBRSxFQUFFLE9BQU87WUFDWCxJQUFJLEVBQUUsUUFBUTtZQUNkLFVBQVUsRUFBRTtnQkFDWCxrREFBa0QsRUFBRTtvQkFDbkQsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsT0FBTyxFQUFFLE9BQU87b0JBQ2hCLEtBQUssd0NBQWdDO2lCQUNyQzthQUNEO1NBQ0QsQ0FBQyxDQUFBO1FBRUYsTUFBTSxDQUFDLFdBQVcsQ0FDakIsVUFBVSxDQUFDLFFBQVEsQ0FBQyxrREFBa0QsRUFBRTtZQUN2RSxRQUFRLEVBQUUsZ0JBQWdCLENBQUMsWUFBWSxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUc7U0FDeEQsQ0FBQyxFQUNGLFdBQVcsQ0FDWCxDQUFBO1FBRUQsTUFBTSxVQUFVLENBQUMsbUJBQW1CLEVBQUUsQ0FBQTtRQUN0QyxNQUFNLENBQUMsV0FBVyxDQUNqQixVQUFVLENBQUMsUUFBUSxDQUFDLGtEQUFrRCxFQUFFO1lBQ3ZFLFFBQVEsRUFBRSxnQkFBZ0IsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRztTQUN4RCxDQUFDLEVBQ0YsV0FBVyxDQUNYLENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQyxDQUFBO0lBRUosSUFBSSxDQUFDLDZGQUE2RixFQUFFLEdBQUcsRUFBRSxDQUN4RyxrQkFBa0IsQ0FBTyxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsRUFBRSxLQUFLLElBQUksRUFBRTtRQUM1RCxNQUFNLFdBQVcsQ0FBQyxTQUFTLENBQzFCLHNCQUFzQixDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsRUFDdEQsUUFBUSxDQUFDLFVBQVUsQ0FDbEIsNEVBQTRFLENBQzVFLENBQ0QsQ0FBQTtRQUNELE1BQU0sV0FBVyxDQUFDLFNBQVMsQ0FDMUIsUUFBUSxDQUFDLGdCQUFnQixDQUFDLFlBQVksRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsU0FBUyxFQUFFLGVBQWUsQ0FBQyxFQUNwRixRQUFRLENBQUMsVUFBVSxDQUNsQixpRkFBaUYsQ0FDakYsQ0FDRCxDQUFBO1FBRUQsTUFBTSxVQUFVLENBQUMsbUJBQW1CLEVBQUUsQ0FBQTtRQUN0QyxNQUFNLENBQUMsV0FBVyxDQUNqQixVQUFVLENBQUMsUUFBUSxDQUFDLHlEQUF5RCxDQUFDLEVBQzlFLGdCQUFnQixDQUNoQixDQUFBO1FBRUQscUJBQXFCLENBQUMscUJBQXFCLENBQUM7WUFDM0MsRUFBRSxFQUFFLE9BQU87WUFDWCxJQUFJLEVBQUUsUUFBUTtZQUNkLFVBQVUsRUFBRTtnQkFDWCx5REFBeUQsRUFBRTtvQkFDMUQsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsT0FBTyxFQUFFLE9BQU87b0JBQ2hCLEtBQUssd0NBQWdDO2lCQUNyQzthQUNEO1NBQ0QsQ0FBQyxDQUFBO1FBRUYsTUFBTSxDQUFDLFdBQVcsQ0FDakIsVUFBVSxDQUFDLFFBQVEsQ0FBQyx5REFBeUQsQ0FBQyxFQUM5RSxXQUFXLENBQ1gsQ0FBQTtRQUVELE1BQU0sVUFBVSxDQUFDLG1CQUFtQixFQUFFLENBQUE7UUFDdEMsTUFBTSxDQUFDLFdBQVcsQ0FDakIsVUFBVSxDQUFDLFFBQVEsQ0FBQyx5REFBeUQsQ0FBQyxFQUM5RSxXQUFXLENBQ1gsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFFSixJQUFJLENBQUMsaUlBQWlJLEVBQUUsR0FBRyxFQUFFLENBQzVJLGtCQUFrQixDQUFPLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzVELE1BQU0sV0FBVyxDQUFDLFNBQVMsQ0FDMUIsc0JBQXNCLENBQUMsY0FBYyxDQUFDLGdCQUFnQixFQUN0RCxRQUFRLENBQUMsVUFBVSxDQUNsQiw0RUFBNEUsQ0FDNUUsQ0FDRCxDQUFBO1FBQ0QsTUFBTSxXQUFXLENBQUMsU0FBUyxDQUMxQixRQUFRLENBQUMsZ0JBQWdCLENBQUMsWUFBWSxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxTQUFTLEVBQUUsZUFBZSxDQUFDLEVBQ3BGLFFBQVEsQ0FBQyxVQUFVLENBQ2xCLGlGQUFpRixDQUNqRixDQUNELENBQUE7UUFFRCxNQUFNLFVBQVUsQ0FBQyxtQkFBbUIsRUFBRSxDQUFBO1FBQ3RDLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLFVBQVUsQ0FBQyxRQUFRLENBQUMseURBQXlELEVBQUU7WUFDOUUsUUFBUSxFQUFFLGdCQUFnQixDQUFDLFlBQVksRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHO1NBQ3hELENBQUMsRUFDRixnQkFBZ0IsQ0FDaEIsQ0FBQTtRQUVELHFCQUFxQixDQUFDLHFCQUFxQixDQUFDO1lBQzNDLEVBQUUsRUFBRSxPQUFPO1lBQ1gsSUFBSSxFQUFFLFFBQVE7WUFDZCxVQUFVLEVBQUU7Z0JBQ1gseURBQXlELEVBQUU7b0JBQzFELElBQUksRUFBRSxRQUFRO29CQUNkLE9BQU8sRUFBRSxPQUFPO29CQUNoQixLQUFLLHdDQUFnQztpQkFDckM7YUFDRDtTQUNELENBQUMsQ0FBQTtRQUVGLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLFVBQVUsQ0FBQyxRQUFRLENBQUMseURBQXlELEVBQUU7WUFDOUUsUUFBUSxFQUFFLGdCQUFnQixDQUFDLFlBQVksRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHO1NBQ3hELENBQUMsRUFDRixXQUFXLENBQ1gsQ0FBQTtRQUVELE1BQU0sVUFBVSxDQUFDLG1CQUFtQixFQUFFLENBQUE7UUFDdEMsTUFBTSxDQUFDLFdBQVcsQ0FDakIsVUFBVSxDQUFDLFFBQVEsQ0FBQyx5REFBeUQsRUFBRTtZQUM5RSxRQUFRLEVBQUUsZ0JBQWdCLENBQUMsWUFBWSxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUc7U0FDeEQsQ0FBQyxFQUNGLFdBQVcsQ0FDWCxDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUVKLElBQUksQ0FBQyx5RUFBeUUsRUFBRSxHQUFHLEVBQUUsQ0FDcEYsa0JBQWtCLENBQU8sRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDNUQsTUFBTSxXQUFXLENBQUMsU0FBUyxDQUMxQixzQkFBc0IsQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLEVBQ3RELFFBQVEsQ0FBQyxVQUFVLENBQUMsaUVBQWlFLENBQUMsQ0FDdEYsQ0FBQTtRQUNELE1BQU0sV0FBVyxDQUFDLFNBQVMsQ0FDMUIsUUFBUSxDQUFDLGdCQUFnQixDQUFDLFlBQVksRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsU0FBUyxFQUFFLGVBQWUsQ0FBQyxFQUNwRixRQUFRLENBQUMsVUFBVSxDQUFDLHNFQUFzRSxDQUFDLENBQzNGLENBQUE7UUFFRCxNQUFNLFVBQVUsQ0FBQyxtQkFBbUIsRUFBRSxDQUFBO1FBQ3RDLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLFVBQVUsQ0FBQyxRQUFRLENBQUMsOENBQThDLENBQUMsRUFDbkUsZ0JBQWdCLENBQ2hCLENBQUE7UUFFRCxxQkFBcUIsQ0FBQyxxQkFBcUIsQ0FBQztZQUMzQyxFQUFFLEVBQUUsT0FBTztZQUNYLElBQUksRUFBRSxRQUFRO1lBQ2QsVUFBVSxFQUFFO2dCQUNYLDhDQUE4QyxFQUFFO29CQUMvQyxJQUFJLEVBQUUsUUFBUTtvQkFDZCxPQUFPLEVBQUUsT0FBTztvQkFDaEIsS0FBSyxvQ0FBNEI7aUJBQ2pDO2FBQ0Q7U0FDRCxDQUFDLENBQUE7UUFFRixNQUFNLENBQUMsV0FBVyxDQUNqQixVQUFVLENBQUMsUUFBUSxDQUFDLDhDQUE4QyxDQUFDLEVBQ25FLFdBQVcsQ0FDWCxDQUFBO1FBRUQsTUFBTSxVQUFVLENBQUMsbUJBQW1CLEVBQUUsQ0FBQTtRQUN0QyxNQUFNLENBQUMsV0FBVyxDQUNqQixVQUFVLENBQUMsUUFBUSxDQUFDLDhDQUE4QyxDQUFDLEVBQ25FLFdBQVcsQ0FDWCxDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUVKLElBQUksQ0FBQyw2R0FBNkcsRUFBRSxHQUFHLEVBQUUsQ0FDeEgsa0JBQWtCLENBQU8sRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDNUQsTUFBTSxXQUFXLENBQUMsU0FBUyxDQUMxQixzQkFBc0IsQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLEVBQ3RELFFBQVEsQ0FBQyxVQUFVLENBQUMsaUVBQWlFLENBQUMsQ0FDdEYsQ0FBQTtRQUNELE1BQU0sV0FBVyxDQUFDLFNBQVMsQ0FDMUIsUUFBUSxDQUFDLGdCQUFnQixDQUFDLFlBQVksRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsU0FBUyxFQUFFLGVBQWUsQ0FBQyxFQUNwRixRQUFRLENBQUMsVUFBVSxDQUFDLHNFQUFzRSxDQUFDLENBQzNGLENBQUE7UUFFRCxNQUFNLFVBQVUsQ0FBQyxtQkFBbUIsRUFBRSxDQUFBO1FBQ3RDLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLFVBQVUsQ0FBQyxRQUFRLENBQUMsOENBQThDLEVBQUU7WUFDbkUsUUFBUSxFQUFFLGdCQUFnQixDQUFDLFlBQVksRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHO1NBQ3hELENBQUMsRUFDRixnQkFBZ0IsQ0FDaEIsQ0FBQTtRQUVELHFCQUFxQixDQUFDLHFCQUFxQixDQUFDO1lBQzNDLEVBQUUsRUFBRSxPQUFPO1lBQ1gsSUFBSSxFQUFFLFFBQVE7WUFDZCxVQUFVLEVBQUU7Z0JBQ1gsOENBQThDLEVBQUU7b0JBQy9DLElBQUksRUFBRSxRQUFRO29CQUNkLE9BQU8sRUFBRSxPQUFPO29CQUNoQixLQUFLLG9DQUE0QjtpQkFDakM7YUFDRDtTQUNELENBQUMsQ0FBQTtRQUVGLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLFVBQVUsQ0FBQyxRQUFRLENBQUMsOENBQThDLEVBQUU7WUFDbkUsUUFBUSxFQUFFLGdCQUFnQixDQUFDLFlBQVksRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHO1NBQ3hELENBQUMsRUFDRixXQUFXLENBQ1gsQ0FBQTtRQUVELE1BQU0sVUFBVSxDQUFDLG1CQUFtQixFQUFFLENBQUE7UUFDdEMsTUFBTSxDQUFDLFdBQVcsQ0FDakIsVUFBVSxDQUFDLFFBQVEsQ0FBQyw4Q0FBOEMsRUFBRTtZQUNuRSxRQUFRLEVBQUUsZ0JBQWdCLENBQUMsWUFBWSxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUc7U0FDeEQsQ0FBQyxFQUNGLFdBQVcsQ0FDWCxDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUVKLElBQUksQ0FBQywyQkFBMkIsRUFBRSxHQUFHLEVBQUUsQ0FDdEMsa0JBQWtCLENBQU8sRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDNUQsTUFBTSxNQUFNLEdBQUcsTUFBTSxrQkFBa0IsQ0FBQyxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsRUFBRSxLQUFLLElBQUksRUFBRTtZQUMzRSxNQUFNLE9BQU8sR0FBRyxLQUFLLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFBO1lBQ3BFLE1BQU0sV0FBVyxDQUFDLFNBQVMsQ0FDMUIsa0JBQWtCLENBQUMsVUFBVyxFQUM5QixRQUFRLENBQUMsVUFBVSxDQUFDLGdFQUFnRSxDQUFDLENBQ3JGLENBQUE7WUFDRCxPQUFPLE9BQU8sQ0FBQTtRQUNmLENBQUMsQ0FBQyxDQUFBO1FBQ0YsTUFBTSxDQUFDLGVBQWUsQ0FDckIsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxZQUFZLENBQUMsRUFDeEIsQ0FBQywyQ0FBMkMsQ0FBQyxDQUM3QyxDQUFBO1FBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FDakIsVUFBVSxDQUFDLFFBQVEsQ0FBQywyQ0FBMkMsQ0FBQyxFQUNoRSxhQUFhLENBQ2IsQ0FBQTtRQUNELE1BQU0sQ0FBQyxXQUFXLENBQ2pCLFVBQVUsQ0FBQyxPQUFPLENBQUMsMkNBQTJDLENBQUMsQ0FBQyxXQUFXLEVBQzNFLGFBQWEsQ0FDYixDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUVKLElBQUksQ0FBQyw4Q0FBOEMsRUFBRSxHQUFHLEVBQUUsQ0FDekQsa0JBQWtCLENBQU8sRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDNUQsTUFBTSxXQUFXLENBQUMsU0FBUyxDQUMxQixzQkFBc0IsQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLEVBQ3RELFFBQVEsQ0FBQyxVQUFVLENBQUMsOERBQThELENBQUMsQ0FDbkYsQ0FBQTtRQUNELE1BQU0sV0FBVyxDQUFDLFNBQVMsQ0FDMUIsUUFBUSxDQUFDLGdCQUFnQixDQUFDLFlBQVksRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsU0FBUyxFQUFFLGVBQWUsQ0FBQyxFQUNwRixRQUFRLENBQUMsVUFBVSxDQUFDLG1FQUFtRSxDQUFDLENBQ3hGLENBQUE7UUFDRCxNQUFNLFVBQVUsQ0FBQyxtQkFBbUIsRUFBRSxDQUFBO1FBQ3RDLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLFVBQVUsQ0FBQyxRQUFRLENBQUMsMkNBQTJDLENBQUMsRUFDaEUsZ0JBQWdCLENBQ2hCLENBQUE7UUFDRCxNQUFNLENBQUMsV0FBVyxDQUNqQixVQUFVLENBQUMsT0FBTyxDQUFDLDJDQUEyQyxDQUFDLENBQUMsV0FBVyxFQUMzRSxTQUFTLENBQ1QsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFFSixJQUFJLENBQUMsbURBQW1ELEVBQUUsR0FBRyxFQUFFLENBQzlELGtCQUFrQixDQUFPLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzVELE1BQU0sa0JBQWtCLENBQUMsRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDNUQsTUFBTSxPQUFPLEdBQUcsS0FBSyxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsd0JBQXdCLENBQUMsQ0FBQTtZQUNwRSxNQUFNLFdBQVcsQ0FBQyxTQUFTLENBQzFCLGtCQUFrQixDQUFDLFVBQVcsRUFDOUIsUUFBUSxDQUFDLFVBQVUsQ0FBQyxvRUFBb0UsQ0FBQyxDQUN6RixDQUFBO1lBQ0QsT0FBTyxPQUFPLENBQUE7UUFDZixDQUFDLENBQUMsQ0FBQTtRQUVGLE1BQU0sV0FBVyxDQUFDLFNBQVMsQ0FDMUIsc0JBQXNCLENBQUMsY0FBYyxDQUFDLGdCQUFnQixFQUN0RCxRQUFRLENBQUMsVUFBVSxDQUFDLG9FQUFvRSxDQUFDLENBQ3pGLENBQUE7UUFDRCxNQUFNLFVBQVUsQ0FBQyxtQkFBbUIsRUFBRSxDQUFBO1FBRXRDLE1BQU0sQ0FBQyxlQUFlLENBQ3JCLFVBQVUsQ0FBQyxRQUFRLENBQUMsaURBQWlELENBQUMsRUFDdEUsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQ1gsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFFSixJQUFJLENBQUMsc0VBQXNFLEVBQUUsR0FBRyxFQUFFLENBQ2pGLGtCQUFrQixDQUFPLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzVELE1BQU0sV0FBVyxDQUFDLFNBQVMsQ0FDMUIsc0JBQXNCLENBQUMsY0FBYyxDQUFDLGdCQUFnQixFQUN0RCxRQUFRLENBQUMsVUFBVSxDQUFDLHVDQUF1QyxDQUFDLENBQzVELENBQUE7UUFDRCxNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsR0FBRyxFQUFFLENBQUE7UUFDMUIsV0FBVyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsd0JBQXdCLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtRQUM1RCxNQUFNLFVBQVUsQ0FBQyxtQkFBbUIsRUFBRSxDQUFBO1FBQ3RDLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBQ3pCLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFFSixJQUFJLENBQUMseUVBQXlFLEVBQUUsR0FBRyxFQUFFLENBQ3BGLGtCQUFrQixDQUFPLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzVELE1BQU0sV0FBVyxDQUFDLFNBQVMsQ0FDMUIsUUFBUSxDQUFDLGdCQUFnQixDQUFDLFlBQVksRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsU0FBUyxFQUFFLGVBQWUsQ0FBQyxFQUNwRixRQUFRLENBQUMsVUFBVSxDQUFDLGlFQUFpRSxDQUFDLENBQ3RGLENBQUE7UUFDRCxNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsR0FBRyxFQUFFLENBQUE7UUFDMUIsV0FBVyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsd0JBQXdCLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtRQUM1RCxNQUFNLFVBQVUsQ0FBQyxtQkFBbUIsRUFBRSxDQUFBO1FBQ3RDLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBQ3pCLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFFSixJQUFJLENBQUMsMERBQTBELEVBQUUsR0FBRyxFQUFFLENBQ3JFLGtCQUFrQixDQUFPLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzVELE1BQU0sV0FBVyxDQUFDLFNBQVMsQ0FDMUIsc0JBQXNCLENBQUMsY0FBYyxDQUFDLGdCQUFnQixFQUN0RCxRQUFRLENBQUMsVUFBVSxDQUFDLHVDQUF1QyxDQUFDLENBQzVELENBQUE7UUFDRCxNQUFNLFdBQVcsQ0FBQyxTQUFTLENBQzFCLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLFNBQVMsRUFBRSxlQUFlLENBQUMsRUFDcEYsUUFBUSxDQUFDLFVBQVUsQ0FBQyxpRUFBaUUsQ0FBQyxDQUN0RixDQUFBO1FBQ0QsTUFBTSxVQUFVLENBQUMsbUJBQW1CLEVBQUUsQ0FBQTtRQUN0QyxNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsR0FBRyxFQUFFLENBQUE7UUFDMUIsV0FBVyxDQUFDLEdBQUcsQ0FDZCxVQUFVLENBQUMsd0JBQXdCLENBQUMsR0FBRyxFQUFFO1lBQ3hDLE1BQU0sRUFBRSxDQUFBO1FBQ1QsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUNELE1BQU0sVUFBVSxDQUFDLG1CQUFtQixFQUFFLENBQUE7UUFDdEMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUMxQixDQUFDLENBQUMsQ0FBQyxDQUFBO0lBRUosSUFBSSxDQUFDLFNBQVMsRUFBRSxHQUFHLEVBQUUsQ0FDcEIsa0JBQWtCLENBQU8sRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDNUQsSUFBSSxNQUFNLEdBQUcsVUFBVSxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxDQUFBO1FBQ3BELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFlBQVksRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUNsRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDakQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQy9DLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLGNBQWMsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUNwRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxvQkFBb0IsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUMxRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFFM0MsTUFBTSxHQUFHLFVBQVUsQ0FBQyxPQUFPLENBQUMseUNBQXlDLENBQUMsQ0FBQTtRQUN0RSxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxZQUFZLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDaEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQ2pELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUMvQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDcEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsb0JBQW9CLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDMUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBRXpDLE1BQU0sV0FBVyxDQUFDLFNBQVMsQ0FDMUIsc0JBQXNCLENBQUMsY0FBYyxDQUFDLGdCQUFnQixFQUN0RCxRQUFRLENBQUMsVUFBVSxDQUFDLDREQUE0RCxDQUFDLENBQ2pGLENBQUE7UUFDRCxNQUFNLFVBQVUsQ0FBQyxtQkFBbUIsRUFBRSxDQUFBO1FBQ3RDLE1BQU0sR0FBRyxVQUFVLENBQUMsT0FBTyxDQUFDLHlDQUF5QyxDQUFDLENBQUE7UUFDdEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsWUFBWSxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBQ2hELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUNqRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsV0FBVyxDQUFDLENBQUE7UUFDakQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQ3BELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLG9CQUFvQixFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQzFELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxXQUFXLENBQUMsQ0FBQTtRQUU3QyxNQUFNLFdBQVcsQ0FBQyxTQUFTLENBQzFCLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLFNBQVMsRUFBRSxlQUFlLENBQUMsRUFDcEYsUUFBUSxDQUFDLFVBQVUsQ0FBQyxpRUFBaUUsQ0FBQyxDQUN0RixDQUFBO1FBQ0QsTUFBTSxVQUFVLENBQUMsbUJBQW1CLEVBQUUsQ0FBQTtRQUN0QyxNQUFNLEdBQUcsVUFBVSxDQUFDLE9BQU8sQ0FBQyx5Q0FBeUMsQ0FBQyxDQUFBO1FBQ3RFLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFlBQVksRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUNoRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDakQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLFdBQVcsQ0FBQyxDQUFBO1FBQ2pELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLGNBQWMsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFBO1FBQzNELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLG9CQUFvQixFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQzFELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxnQkFBZ0IsQ0FBQyxDQUFBO1FBRWxELE1BQU0sV0FBVyxDQUFDLFNBQVMsQ0FDMUIsUUFBUSxDQUFDLGdCQUFnQixDQUFDLFlBQVksRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsU0FBUyxFQUFFLFlBQVksQ0FBQyxFQUNqRixRQUFRLENBQUMsVUFBVSxDQUFDLDREQUE0RCxDQUFDLENBQ2pGLENBQUE7UUFDRCxNQUFNLFVBQVUsQ0FBQyxtQkFBbUIsRUFBRSxDQUFBO1FBQ3RDLE1BQU0sR0FBRyxVQUFVLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQ3BDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFlBQVksRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUNsRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDakQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQzVDLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLGNBQWMsRUFBRTtZQUM3QyxvQkFBb0IsRUFBRTtnQkFDckIsS0FBSyxFQUFFO29CQUNOLFdBQVcsRUFBRSxZQUFZO2lCQUN6QjthQUNEO1NBQ0QsQ0FBQyxDQUFBO1FBQ0YsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsb0JBQW9CLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDMUQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFO1lBQ3BDLG9CQUFvQixFQUFFO2dCQUNyQixLQUFLLEVBQUU7b0JBQ04sV0FBVyxFQUFFLFlBQVk7aUJBQ3pCO2FBQ0Q7U0FDRCxDQUFDLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBRUosSUFBSSxDQUFDLDZCQUE2QixFQUFFLEdBQUcsRUFBRSxDQUN4QyxrQkFBa0IsQ0FBTyxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsRUFBRSxLQUFLLElBQUksRUFBRTtRQUM1RCxVQUFVLENBQUMsb0JBQW9CLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDdEMsTUFBTSxXQUFXLENBQUMsU0FBUyxDQUMxQixzQkFBc0IsQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLEVBQ3RELFFBQVEsQ0FBQyxVQUFVLENBQ2xCLDRFQUE0RSxDQUM1RSxDQUNELENBQUE7UUFDRCxNQUFNLFVBQVUsQ0FBQyxtQkFBbUIsRUFBRSxDQUFBO1FBQ3RDLElBQUksTUFBTSxHQUFHLFVBQVUsQ0FBQyxPQUFPLENBQUMsK0NBQStDLENBQUMsQ0FBQTtRQUNoRixNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxZQUFZLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDaEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQ2pELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxxQkFBcUIsQ0FBQyxDQUFBO1FBQzNELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLGNBQWMsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUNwRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxvQkFBb0IsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUMxRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUscUJBQXFCLENBQUMsQ0FBQTtRQUV2RCxVQUFVLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDckMsTUFBTSxVQUFVLENBQUMsbUJBQW1CLEVBQUUsQ0FBQTtRQUN0QyxNQUFNLEdBQUcsVUFBVSxDQUFDLE9BQU8sQ0FBQywrQ0FBK0MsQ0FBQyxDQUFBO1FBQzVFLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFlBQVksRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUNoRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDakQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLHFCQUFxQixDQUFDLENBQUE7UUFDM0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQ3BELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLG9CQUFvQixFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQzFELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxxQkFBcUIsQ0FBQyxDQUFBO1FBRXZELFVBQVUsQ0FBQyxvQkFBb0IsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUN0QyxNQUFNLFdBQVcsQ0FBQyxTQUFTLENBQzFCLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLFNBQVMsRUFBRSxlQUFlLENBQUMsRUFDcEYsUUFBUSxDQUFDLFVBQVUsQ0FDbEIsaUZBQWlGLENBQ2pGLENBQ0QsQ0FBQTtRQUNELE1BQU0sVUFBVSxDQUFDLG1CQUFtQixFQUFFLENBQUE7UUFDdEMsTUFBTSxHQUFHLFVBQVUsQ0FBQyxPQUFPLENBQUMsK0NBQStDLENBQUMsQ0FBQTtRQUM1RSxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxZQUFZLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDaEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQ2pELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxxQkFBcUIsQ0FBQyxDQUFBO1FBQzNELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLGNBQWMsRUFBRSwwQkFBMEIsQ0FBQyxDQUFBO1FBQ3JFLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLG9CQUFvQixFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQzFELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxxQkFBcUIsQ0FBQyxDQUFBO1FBRXZELE1BQU0sV0FBVyxDQUFDLFNBQVMsQ0FDMUIsUUFBUSxDQUFDLGdCQUFnQixDQUFDLFlBQVksRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsU0FBUyxFQUFFLFlBQVksQ0FBQyxFQUNqRixRQUFRLENBQUMsVUFBVSxDQUFDLDREQUE0RCxDQUFDLENBQ2pGLENBQUE7UUFDRCxNQUFNLFVBQVUsQ0FBQyxtQkFBbUIsRUFBRSxDQUFBO1FBQ3RDLE1BQU0sR0FBRyxVQUFVLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQ3BDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFlBQVksRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUNsRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDakQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQzVDLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLGNBQWMsRUFBRTtZQUM3QyxvQkFBb0IsRUFBRTtnQkFDckIsS0FBSyxFQUFFO29CQUNOLFdBQVcsRUFBRSxZQUFZO2lCQUN6QjthQUNEO1NBQ0QsQ0FBQyxDQUFBO1FBQ0YsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsb0JBQW9CLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDMUQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFO1lBQ3BDLG9CQUFvQixFQUFFO2dCQUNyQixLQUFLLEVBQUU7b0JBQ04sV0FBVyxFQUFFLFlBQVk7aUJBQ3pCO2FBQ0Q7U0FDRCxDQUFDLENBQUE7UUFFRixVQUFVLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDckMsTUFBTSxVQUFVLENBQUMsbUJBQW1CLEVBQUUsQ0FBQTtRQUN0QyxNQUFNLEdBQUcsVUFBVSxDQUFDLE9BQU8sQ0FBQywrQ0FBK0MsQ0FBQyxDQUFBO1FBQzVFLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFlBQVksRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUNoRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDakQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLHFCQUFxQixDQUFDLENBQUE7UUFDM0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFLDBCQUEwQixDQUFDLENBQUE7UUFDckUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsb0JBQW9CLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDMUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLDBCQUEwQixDQUFDLENBQUE7UUFFNUQsTUFBTSxXQUFXLENBQUMsU0FBUyxDQUMxQixRQUFRLENBQUMsZ0JBQWdCLENBQUMsWUFBWSxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxTQUFTLEVBQUUsWUFBWSxDQUFDLEVBQ2pGLFFBQVEsQ0FBQyxVQUFVLENBQUMsNERBQTRELENBQUMsQ0FDakYsQ0FBQTtRQUNELE1BQU0sVUFBVSxDQUFDLG1CQUFtQixFQUFFLENBQUE7UUFDdEMsTUFBTSxHQUFHLFVBQVUsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDcEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsWUFBWSxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQ2xELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUNqRCxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDNUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFO1lBQzdDLG9CQUFvQixFQUFFO2dCQUNyQixLQUFLLEVBQUU7b0JBQ04sV0FBVyxFQUFFLFlBQVk7aUJBQ3pCO2FBQ0Q7U0FDRCxDQUFDLENBQUE7UUFDRixNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxvQkFBb0IsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUMxRCxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUU7WUFDcEMsb0JBQW9CLEVBQUU7Z0JBQ3JCLEtBQUssRUFBRTtvQkFDTixXQUFXLEVBQUUsWUFBWTtpQkFDekI7YUFDRDtTQUNELENBQUMsQ0FBQTtJQUNILENBQUMsQ0FBQyxDQUFDLENBQUE7SUFFSixJQUFJLENBQUMsMENBQTBDLEVBQUUsR0FBRyxFQUFFLENBQ3JELGtCQUFrQixDQUFPLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzVELFVBQVUsQ0FBQyxvQkFBb0IsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUN0QyxNQUFNLFdBQVcsQ0FBQyxTQUFTLENBQzFCLHNCQUFzQixDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsRUFDdEQsUUFBUSxDQUFDLFVBQVUsQ0FDbEIsNEVBQTRFLENBQzVFLENBQ0QsQ0FBQTtRQUNELE1BQU0sVUFBVSxDQUFDLG1CQUFtQixFQUFFLENBQUE7UUFFdEMsTUFBTSxPQUFPLEdBQUcsS0FBSyxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsd0JBQXdCLENBQUMsQ0FBQTtRQUNwRSxNQUFNLFdBQVcsQ0FBQyxTQUFTLENBQzFCLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLFNBQVMsRUFBRSxlQUFlLENBQUMsRUFDcEYsUUFBUSxDQUFDLFVBQVUsQ0FDbEIsaUZBQWlGLENBQ2pGLENBQ0QsQ0FBQTtRQUNELE1BQU0sS0FBSyxHQUFHLE1BQU0sT0FBTyxDQUFBO1FBRTNCLE1BQU0sTUFBTSxHQUFHLFVBQVUsQ0FBQyxPQUFPLENBQUMsK0NBQStDLENBQUMsQ0FBQTtRQUNsRixNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxZQUFZLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDaEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQ2pELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxxQkFBcUIsQ0FBQyxDQUFBO1FBQzNELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLGNBQWMsRUFBRSwwQkFBMEIsQ0FBQyxDQUFBO1FBQ3JFLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLG9CQUFvQixFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQzFELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxxQkFBcUIsQ0FBQyxDQUFBO1FBQ3ZELE1BQU0sQ0FBQyxXQUFXLENBQ2pCLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQywrQ0FBK0MsQ0FBQyxFQUMzRSxJQUFJLENBQ0osQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFFSixJQUFJLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRSxDQUNqQixrQkFBa0IsQ0FBTyxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsRUFBRSxLQUFLLElBQUksRUFBRTtRQUM1RCxJQUFJLE1BQU0sR0FBRyxVQUFVLENBQUMsSUFBSSxFQUFFLENBQUE7UUFDOUIsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyx5Q0FBeUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDbkYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ3ZDLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUM1QyxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxlQUFlLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFFbEQsTUFBTSxXQUFXLENBQUMsU0FBUyxDQUMxQixzQkFBc0IsQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLEVBQ3RELFFBQVEsQ0FBQyxVQUFVLENBQUMsNERBQTRELENBQUMsQ0FDakYsQ0FBQTtRQUNELE1BQU0sVUFBVSxDQUFDLG1CQUFtQixFQUFFLENBQUE7UUFDdEMsTUFBTSxHQUFHLFVBQVUsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUMxQixNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLHlDQUF5QyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNuRixNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQyx5Q0FBeUMsQ0FBQyxDQUFDLENBQUE7UUFDaEYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQzVDLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLGVBQWUsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUVsRCxNQUFNLFdBQVcsQ0FBQyxTQUFTLENBQzFCLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLFNBQVMsRUFBRSxlQUFlLENBQUMsRUFDcEYsUUFBUSxDQUFDLFVBQVUsQ0FBQyxpRUFBaUUsQ0FBQyxDQUN0RixDQUFBO1FBQ0QsTUFBTSxVQUFVLENBQUMsbUJBQW1CLEVBQUUsQ0FBQTtRQUN0QyxNQUFNLEdBQUcsVUFBVSxDQUFDLElBQUksRUFBRSxDQUFBO1FBQzFCLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMseUNBQXlDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ25GLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDLHlDQUF5QyxDQUFDLENBQUMsQ0FBQTtRQUNoRixNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQyx5Q0FBeUMsQ0FBQyxDQUFDLENBQUE7UUFDckYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsZUFBZSxFQUFFLEVBQUUsQ0FBQyxDQUFBO0lBQ25ELENBQUMsQ0FBQyxDQUFDLENBQUE7SUFFSixJQUFJLENBQUMsMkJBQTJCLEVBQUUsR0FBRyxFQUFFO1FBQ3RDLE9BQU8sVUFBVTthQUNmLFdBQVcsQ0FBQyx5Q0FBeUMsRUFBRSxPQUFPLG1DQUEyQjthQUN6RixJQUFJLENBQUMsR0FBRyxFQUFFLENBQ1YsTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLHlDQUF5QyxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQzNGLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxnQ0FBZ0MsRUFBRSxHQUFHLEVBQUU7UUFDM0MsT0FBTyxVQUFVO2FBQ2YsV0FBVyxDQUFDLDJCQUEyQixFQUFFLE9BQU8sd0NBQWdDO2FBQ2hGLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FDVixNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxRQUFRLDRFQUEwQyxFQUFFLE9BQU8sQ0FBQyxDQUMxRixDQUFBO0lBQ0gsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsK0JBQStCLEVBQUUsR0FBRyxFQUFFO1FBQzFDLE9BQU8sVUFBVTthQUNmLFdBQVcsQ0FDWCx5Q0FBeUMsRUFDekMsT0FBTyxFQUNQLEVBQUUsUUFBUSxFQUFFLGdCQUFnQixDQUFDLFlBQVksRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsK0NBRTVEO2FBQ0EsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUNWLE1BQU0sQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyx5Q0FBeUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUMzRixDQUFBO0lBQ0gsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsNkRBQTZELEVBQUUsR0FBRyxFQUFFLENBQ3hFLGtCQUFrQixDQUFPLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzVELE1BQU0sVUFBVSxDQUFDLFdBQVcsQ0FBQyw2Q0FBNkMsRUFBRSxjQUFjLEVBQUU7WUFDM0Ysa0JBQWtCLEVBQUUsU0FBUztTQUM3QixDQUFDLENBQUE7UUFDRixNQUFNLENBQUMsV0FBVyxDQUNqQixVQUFVLENBQUMsUUFBUSxDQUFDLDZDQUE2QyxFQUFFO1lBQ2xFLGtCQUFrQixFQUFFLFNBQVM7U0FDN0IsQ0FBQyxFQUNGLGNBQWMsQ0FDZCxDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUVKLElBQUksQ0FBQyxvRUFBb0UsRUFBRSxHQUFHLEVBQUUsQ0FDL0Usa0JBQWtCLENBQU8sRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDNUQsTUFBTSxVQUFVLENBQUMsV0FBVyxDQUFDLDZDQUE2QyxFQUFFLGNBQWMsRUFBRTtZQUMzRixtQkFBbUIsRUFBRSxDQUFDLFNBQVMsQ0FBQztTQUNoQyxDQUFDLENBQUE7UUFDRixNQUFNLENBQUMsV0FBVyxDQUNqQixVQUFVLENBQUMsUUFBUSxDQUFDLDZDQUE2QyxFQUFFO1lBQ2xFLGtCQUFrQixFQUFFLFNBQVM7U0FDN0IsQ0FBQyxFQUNGLGNBQWMsQ0FDZCxDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUVKLElBQUksQ0FBQyxzREFBc0QsRUFBRSxHQUFHLEVBQUUsQ0FDakUsa0JBQWtCLENBQU8sRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDNUQsTUFBTSxVQUFVLENBQUMsV0FBVyxDQUMzQiw2Q0FBNkMsRUFDN0MsZ0JBQWdCLEVBQ2hCLEVBQUUsbUJBQW1CLEVBQUUsQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDLEVBQUUsbUNBRS9DLENBQUE7UUFDRCxNQUFNLENBQUMsV0FBVyxDQUNqQixVQUFVLENBQUMsUUFBUSxDQUFDLDZDQUE2QyxFQUFFO1lBQ2xFLGtCQUFrQixFQUFFLFNBQVM7U0FDN0IsQ0FBQyxFQUNGLGdCQUFnQixDQUNoQixDQUFBO1FBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FDakIsVUFBVSxDQUFDLFFBQVEsQ0FBQyw2Q0FBNkMsRUFBRTtZQUNsRSxrQkFBa0IsRUFBRSxTQUFTO1NBQzdCLENBQUMsRUFDRixnQkFBZ0IsQ0FDaEIsQ0FBQTtRQUNELE1BQU0sQ0FBQyxlQUFlLENBQ3JCLFVBQVUsQ0FBQyxRQUFRLENBQUMsMEJBQTBCLENBQUMsQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUN2RSxFQUFFLDZDQUE2QyxFQUFFLGdCQUFnQixFQUFFLENBQ25FLENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQyxDQUFBO0lBRUosSUFBSSxDQUFDLHVFQUF1RSxFQUFFLEdBQUcsRUFBRSxDQUNsRixrQkFBa0IsQ0FBTyxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsRUFBRSxLQUFLLElBQUksRUFBRTtRQUM1RCxNQUFNLFdBQVcsQ0FBQyxTQUFTLENBQzFCLHNCQUFzQixDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsRUFDdEQsUUFBUSxDQUFDLFVBQVUsQ0FDbEIseUZBQXlGLENBQ3pGLENBQ0QsQ0FBQTtRQUNELE1BQU0sVUFBVSxDQUFDLFdBQVcsQ0FDM0IsNkNBQTZDLEVBQzdDLGdCQUFnQixFQUNoQixFQUFFLG1CQUFtQixFQUFFLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxFQUFFLG1DQUUvQyxDQUFBO1FBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FDakIsVUFBVSxDQUFDLFFBQVEsQ0FBQyw2Q0FBNkMsRUFBRTtZQUNsRSxrQkFBa0IsRUFBRSxTQUFTO1NBQzdCLENBQUMsRUFDRixnQkFBZ0IsQ0FDaEIsQ0FBQTtRQUNELE1BQU0sQ0FBQyxXQUFXLENBQ2pCLFVBQVUsQ0FBQyxRQUFRLENBQUMsNkNBQTZDLEVBQUU7WUFDbEUsa0JBQWtCLEVBQUUsU0FBUztTQUM3QixDQUFDLEVBQ0YsZ0JBQWdCLENBQ2hCLENBQUE7UUFDRCxNQUFNLENBQUMsZUFBZSxDQUNyQixVQUFVLENBQUMsUUFBUSxDQUFDLDBCQUEwQixDQUFDLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFDdkUsRUFBRSw2Q0FBNkMsRUFBRSxnQkFBZ0IsRUFBRSxDQUNuRSxDQUFBO1FBQ0QsTUFBTSxhQUFhLEdBQUcsQ0FDckIsTUFBTSxXQUFXLENBQUMsUUFBUSxDQUFDLHNCQUFzQixDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUNsRixDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQTtRQUNsQixNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLEVBQUU7WUFDakQsb0JBQW9CLEVBQUUsRUFBRSw2Q0FBNkMsRUFBRSxnQkFBZ0IsRUFBRTtTQUN6RixDQUFDLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBRUosSUFBSSxDQUFDLHdDQUF3QyxFQUFFLEdBQUcsRUFBRSxDQUNuRCxrQkFBa0IsQ0FBTyxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsRUFBRSxLQUFLLElBQUksRUFBRTtRQUM1RCxNQUFNLFVBQVUsQ0FBQyxXQUFXLENBQzNCLDZDQUE2QyxFQUM3QyxPQUFPLEVBQ1AsRUFBRSxRQUFRLEVBQUUsZ0JBQWdCLENBQUMsWUFBWSxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSwrQ0FFNUQsQ0FBQTtRQUNELE1BQU0sQ0FBQyxXQUFXLENBQ2pCLFVBQVUsQ0FBQyxRQUFRLENBQUMsNkNBQTZDLENBQUMsRUFDbEUsT0FBTyxDQUNQLENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQyxDQUFBO0lBRUosSUFBSSxDQUFDLHFGQUFxRixFQUFFLEdBQUcsRUFBRSxDQUNoRyxrQkFBa0IsQ0FBTyxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsRUFBRSxLQUFLLElBQUksRUFBRTtRQUM1RCxNQUFNLENBQUMsV0FBVyxDQUNqQixVQUFVLENBQUMsUUFBUSxDQUFDLDZDQUE2QyxFQUFFO1lBQ2xFLFFBQVEsRUFBRSxnQkFBZ0IsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRztZQUN4RCxrQkFBa0IsRUFBRSxPQUFPO1NBQzNCLENBQUMsRUFDRixlQUFlLENBQ2YsQ0FBQTtRQUNELE1BQU0sVUFBVSxDQUFDLFdBQVcsQ0FDM0IsNkNBQTZDLEVBQzdDLHNCQUFzQixFQUN0QixFQUFFLFFBQVEsRUFBRSxnQkFBZ0IsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLGtCQUFrQixFQUFFLE9BQU8sRUFBRSwrQ0FFekYsQ0FBQTtRQUNELE1BQU0sQ0FBQyxXQUFXLENBQ2pCLFVBQVUsQ0FBQyxRQUFRLENBQUMsNkNBQTZDLEVBQUU7WUFDbEUsUUFBUSxFQUFFLGdCQUFnQixDQUFDLFlBQVksRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHO1lBQ3hELGtCQUFrQixFQUFFLE9BQU87U0FDM0IsQ0FBQyxFQUNGLHNCQUFzQixDQUN0QixDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUVKLElBQUksQ0FBQyw0RkFBNEYsRUFBRSxHQUFHLEVBQUUsQ0FDdkcsa0JBQWtCLENBQU8sRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDNUQsTUFBTSxDQUFDLFdBQVcsQ0FDakIsVUFBVSxDQUFDLFFBQVEsQ0FBQyw2Q0FBNkMsRUFBRTtZQUNsRSxRQUFRLEVBQUUsZ0JBQWdCLENBQUMsWUFBWSxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUc7WUFDeEQsa0JBQWtCLEVBQUUsT0FBTztTQUMzQixDQUFDLEVBQ0YsZUFBZSxDQUNmLENBQUE7UUFDRCxNQUFNLFVBQVUsQ0FBQyxXQUFXLENBQzNCLDZDQUE2QyxFQUM3QyxzQkFBc0IsRUFDdEI7WUFDQyxRQUFRLEVBQUUsZ0JBQWdCLENBQUMsWUFBWSxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUc7WUFDeEQsbUJBQW1CLEVBQUUsQ0FBQyxPQUFPLENBQUM7U0FDOUIsK0NBRUQsQ0FBQTtRQUNELE1BQU0sQ0FBQyxXQUFXLENBQ2pCLFVBQVUsQ0FBQyxRQUFRLENBQUMsNkNBQTZDLEVBQUU7WUFDbEUsUUFBUSxFQUFFLGdCQUFnQixDQUFDLFlBQVksRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHO1lBQ3hELGtCQUFrQixFQUFFLE9BQU87U0FDM0IsQ0FBQyxFQUNGLHNCQUFzQixDQUN0QixDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUVKLElBQUksQ0FBQyx5RkFBeUYsRUFBRSxHQUFHLEVBQUU7UUFDcEcsT0FBTyxVQUFVO2FBQ2YsV0FBVyxDQUNYLGdEQUFnRCxFQUNoRCxnQkFBZ0IsRUFDaEIsRUFBRSx5Q0FFRixFQUFFLGdCQUFnQixFQUFFLElBQUksRUFBRSxDQUMxQjthQUNBLElBQUksQ0FDSixHQUFHLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLHlCQUF5QixDQUFDLEVBQzVDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FDTCxNQUFNLENBQUMsV0FBVyxDQUNqQixDQUFDLENBQUMsSUFBSSwwRkFFTixDQUNGLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyw2R0FBNkcsRUFBRSxHQUFHLEVBQUU7UUFDeEgsT0FBTyxVQUFVO2FBQ2YsV0FBVyxDQUNYLHVEQUF1RCxFQUN2RCxnQkFBZ0IsRUFDaEIsRUFBRSx5Q0FFRixFQUFFLGdCQUFnQixFQUFFLElBQUksRUFBRSxDQUMxQjthQUNBLElBQUksQ0FDSixHQUFHLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLHlCQUF5QixDQUFDLEVBQzVDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FDTCxNQUFNLENBQUMsV0FBVyxDQUNqQixDQUFDLENBQUMsSUFBSSwwRkFFTixDQUNGLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxxRkFBcUYsRUFBRSxHQUFHLEVBQUU7UUFDaEcsT0FBTyxVQUFVO2FBQ2YsV0FBVyxDQUNYLDRDQUE0QyxFQUM1QyxnQkFBZ0IsRUFDaEIsRUFBRSx5Q0FFRixFQUFFLGdCQUFnQixFQUFFLElBQUksRUFBRSxDQUMxQjthQUNBLElBQUksQ0FDSixHQUFHLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLHlCQUF5QixDQUFDLEVBQzVDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FDTCxNQUFNLENBQUMsV0FBVyxDQUNqQixDQUFDLENBQUMsSUFBSSxzRkFFTixDQUNGLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyw0QkFBNEIsRUFBRSxHQUFHLEVBQUU7UUFDdkMsT0FBTyxVQUFVO2FBQ2YsV0FBVyxDQUNYLE9BQU8sRUFDUCxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLENBQUMsRUFBRSx3Q0FFckQ7YUFDQSxJQUFJLENBQUMsR0FBRyxFQUFFLENBQ1YsTUFBTSxDQUFDLGVBQWUsQ0FBQyxVQUFVLENBQUMsUUFBUSwyQ0FBNkIsRUFBRTtZQUN4RSxPQUFPLEVBQUUsT0FBTztZQUNoQixLQUFLLEVBQUUsQ0FBQyxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsQ0FBQztTQUMvQixDQUFDLENBQ0YsQ0FBQTtJQUNILENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGlGQUFpRixFQUFFLEdBQUcsRUFBRTtRQUM1RixNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsR0FBRyxFQUFFLENBQUE7UUFDMUIsV0FBVyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsd0JBQXdCLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtRQUM1RCxPQUFPLFVBQVU7YUFDZixXQUFXLENBQUMseUNBQXlDLEVBQUUsT0FBTyxtQ0FBMkI7YUFDekYsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7SUFDdkMsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsc0ZBQXNGLEVBQUUsR0FBRyxFQUFFO1FBQ2pHLE1BQU0sTUFBTSxHQUFHLEtBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQTtRQUMxQixXQUFXLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyx3QkFBd0IsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO1FBQzVELE9BQU8sVUFBVTthQUNmLFdBQVcsQ0FDWCx5Q0FBeUMsRUFDekMsT0FBTyx3Q0FFUDthQUNBLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO0lBQ3ZDLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDZCQUE2QixFQUFFLEdBQUcsRUFBRTtRQUN4QyxPQUFPLFVBQVU7YUFDZixXQUFXLENBQ1gseUNBQXlDLEVBQ3pDLGFBQWEscUNBRWI7YUFDQSxJQUFJLENBQUMsR0FBRyxFQUFFLENBQ1YsTUFBTSxDQUFDLFdBQVcsQ0FDakIsVUFBVSxDQUFDLFFBQVEsQ0FBQyx5Q0FBeUMsQ0FBQyxFQUM5RCxhQUFhLENBQ2IsQ0FDRCxDQUFBO0lBQ0gsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsbUZBQW1GLEVBQUUsR0FBRyxFQUFFO1FBQzlGLE1BQU0sTUFBTSxHQUFHLEtBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQTtRQUMxQixXQUFXLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyx3QkFBd0IsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO1FBQzVELE9BQU8sVUFBVTthQUNmLFdBQVcsQ0FDWCx5Q0FBeUMsRUFDekMsYUFBYSxxQ0FFYjthQUNBLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO0lBQ3ZDLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGlDQUFpQyxFQUFFLEdBQUcsRUFBRSxDQUM1QyxrQkFBa0IsQ0FBTyxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsRUFBRSxLQUFLLElBQUksRUFBRTtRQUM1RCxNQUFNLEdBQUcsR0FBRyx5Q0FBeUMsQ0FBQTtRQUNyRCxNQUFNLFVBQVUsQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFLGdCQUFnQix3Q0FBZ0MsQ0FBQTtRQUNsRixNQUFNLFVBQVUsQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFLFdBQVcsbUNBQTJCLENBQUE7UUFFeEUsTUFBTSxVQUFVLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUM1QyxNQUFNLFVBQVUsQ0FBQyxtQkFBbUIsRUFBRSxDQUFBO1FBRXRDLE1BQU0sTUFBTSxHQUFHLFVBQVUsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFO1lBQ3RDLFFBQVEsRUFBRSxnQkFBZ0IsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRztTQUN4RCxDQUFDLENBQUE7UUFDRixNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDL0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQ3BELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLG9CQUFvQixFQUFFLFNBQVMsQ0FBQyxDQUFBO0lBQzNELENBQUMsQ0FBQyxDQUFDLENBQUE7SUFFSixJQUFJLENBQUMsc0VBQXNFLEVBQUUsR0FBRyxFQUFFLENBQ2pGLGtCQUFrQixDQUFPLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzVELE1BQU0sVUFBVSxDQUFDLFdBQVcsQ0FDM0IseUNBQXlDLEVBQ3pDLE9BQU8sbUNBRVAsQ0FBQTtRQUNELE1BQU0sVUFBVSxDQUFDLFdBQVcsQ0FBQyx5Q0FBeUMsRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUNoRixNQUFNLENBQUMsV0FBVyxDQUNqQixVQUFVLENBQUMsT0FBTyxDQUFDLHlDQUF5QyxDQUFDLENBQUMsU0FBUyxFQUN2RSxTQUFTLENBQ1QsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFFSixJQUFJLENBQUMsa0VBQWtFLEVBQUUsR0FBRyxFQUFFLENBQzdFLGtCQUFrQixDQUFPLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzVELE1BQU0sVUFBVSxDQUFDLFdBQVcsQ0FDM0IseUNBQXlDLEVBQ3pDLE9BQU8sbUNBRVAsQ0FBQTtRQUNELE1BQU0sVUFBVSxDQUFDLFdBQVcsQ0FDM0IseUNBQXlDLEVBQ3pDLE9BQU8sbUNBRVAsQ0FBQTtRQUNELE1BQU0sQ0FBQyxXQUFXLENBQ2pCLFVBQVUsQ0FBQyxPQUFPLENBQUMseUNBQXlDLENBQUMsQ0FBQyxTQUFTLEVBQ3ZFLE9BQU8sQ0FDUCxDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUVKLElBQUksQ0FBQyxpRkFBaUYsRUFBRSxHQUFHLEVBQUU7UUFDNUYsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFBO1FBQzFCLFdBQVcsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLHdCQUF3QixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7UUFDNUQsT0FBTyxVQUFVO2FBQ2YsV0FBVyxDQUNYLE9BQU8sRUFDUCxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLENBQUMsRUFBRSx3Q0FFckQ7YUFDQSxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtJQUN2QyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxnREFBZ0QsRUFBRSxHQUFHLEVBQUUsQ0FDM0Qsa0JBQWtCLENBQU8sRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDNUQsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFBO1FBQzFCLFdBQVcsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLHdCQUF3QixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7UUFDNUQsTUFBTSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDaEIsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUE7SUFDNUIsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUVKLElBQUksQ0FBQywwQ0FBMEMsRUFBRSxHQUFHLEVBQUUsQ0FDckQsa0JBQWtCLENBQU8sRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDNUQsTUFBTSxXQUFXLENBQUMsU0FBUyxDQUMxQixRQUFRLENBQUMsa0JBQWtCLENBQUMsbUJBQW1CLEVBQUUsWUFBWSxDQUFDLEVBQzlELFFBQVEsQ0FBQyxVQUFVLENBQUMsMERBQTBELENBQUMsQ0FDL0UsQ0FBQTtRQUNELE1BQU0sT0FBTyxHQUFHLEtBQUssQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLHdCQUF3QixDQUFDLENBQUE7UUFDcEUsTUFBTSxVQUFVLENBQUMsNEJBQTRCLEVBQUUsQ0FBQTtRQUMvQyxNQUFNLE9BQU8sQ0FBQTtJQUNkLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFFSixJQUFJLENBQUMsNkJBQTZCLEVBQUUsR0FBRyxFQUFFLENBQ3hDLGtCQUFrQixDQUFDLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3RELE1BQU0sV0FBVyxDQUFDLFNBQVMsQ0FDMUIsc0JBQXNCLENBQUMsY0FBYyxDQUFDLGdCQUFnQixFQUN0RCxRQUFRLENBQUMsVUFBVSxDQUFDLDREQUE0RCxDQUFDLENBQ2pGLENBQUE7UUFDRCxNQUFNLFVBQVUsQ0FBQyxtQkFBbUIsRUFBRSxDQUFBO1FBQ3RDLE1BQU0sSUFBSSxPQUFPLENBQU8sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDaEMsTUFBTSxVQUFVLEdBQUcsVUFBVSxDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7Z0JBQzVELE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLHlDQUF5QyxDQUFDLENBQUMsQ0FBQTtnQkFDNUUsTUFBTSxDQUFDLFdBQVcsQ0FDakIsVUFBVSxDQUFDLFFBQVEsQ0FBQyx5Q0FBeUMsQ0FBQyxFQUM5RCxnQkFBZ0IsQ0FDaEIsQ0FBQTtnQkFDRCxVQUFVLENBQUMsT0FBTyxFQUFFLENBQUE7Z0JBQ3BCLENBQUMsRUFBRSxDQUFBO1lBQ0osQ0FBQyxDQUFDLENBQUE7WUFDRixXQUFXO2lCQUNULFNBQVMsQ0FDVCxRQUFRLENBQUMsZ0JBQWdCLENBQUMsWUFBWSxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxTQUFTLEVBQUUsZUFBZSxDQUFDLEVBQ3BGLFFBQVEsQ0FBQyxVQUFVLENBQUMsaUVBQWlFLENBQUMsQ0FDdEY7aUJBQ0EsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ1gsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBRUosSUFBSSxDQUFDLDZCQUE2QixFQUFFLEdBQUcsRUFBRSxDQUN4QyxrQkFBa0IsQ0FBQyxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsRUFBRSxLQUFLLElBQUksRUFBRTtRQUN0RCxNQUFNLFdBQVcsQ0FBQyxTQUFTLENBQzFCLHNCQUFzQixDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsRUFDdEQsUUFBUSxDQUFDLFVBQVUsQ0FBQyw0REFBNEQsQ0FBQyxDQUNqRixDQUFBO1FBQ0QsTUFBTSx5QkFBeUIsR0FBRyxRQUFRLENBQ3pDLGdCQUFnQixDQUFDLFlBQVksRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQzlDLFNBQVMsRUFDVCxlQUFlLENBQ2YsQ0FBQTtRQUNELE1BQU0sV0FBVyxDQUFDLFNBQVMsQ0FDMUIseUJBQXlCLEVBQ3pCLFFBQVEsQ0FBQyxVQUFVLENBQUMsaUVBQWlFLENBQUMsQ0FDdEYsQ0FBQTtRQUNELE1BQU0sVUFBVSxDQUFDLG1CQUFtQixFQUFFLENBQUE7UUFDdEMsTUFBTSxDQUFDLEdBQUcsTUFBTSxJQUFJLE9BQU8sQ0FBNEIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDL0QsS0FBSyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNsRCxXQUFXLENBQUMsR0FBRyxDQUFDLHlCQUF5QixDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3BELENBQUMsQ0FBQyxDQUFBO1FBQ0YsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsb0JBQW9CLENBQUMseUNBQXlDLENBQUMsQ0FBQyxDQUFBO1FBQzVFLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLFVBQVUsQ0FBQyxRQUFRLENBQUMseUNBQXlDLENBQUMsRUFDOUQsV0FBVyxDQUNYLENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQyxDQUFBO0lBRUosSUFBSSxDQUFDLHFFQUFxRSxFQUFFLEdBQUcsRUFBRSxDQUNoRixrQkFBa0IsQ0FBTyxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsRUFBRSxLQUFLLElBQUksRUFBRTtRQUM1RCxVQUFVLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLENBQUE7UUFFckMsTUFBTSxXQUFXLENBQUMsU0FBUyxDQUMxQixzQkFBc0IsQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLEVBQ3RELFFBQVEsQ0FBQyxVQUFVLENBQUMsa0VBQWtFLENBQUMsQ0FDdkYsQ0FBQTtRQUNELE1BQU0sV0FBVyxDQUFDLFNBQVMsQ0FDMUIsUUFBUSxDQUFDLGdCQUFnQixDQUFDLFlBQVksRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsU0FBUyxFQUFFLGVBQWUsQ0FBQyxFQUNwRixRQUFRLENBQUMsVUFBVSxDQUNsQix1RUFBdUUsQ0FDdkUsQ0FDRCxDQUFBO1FBQ0QsTUFBTSxVQUFVLENBQUMsbUJBQW1CLEVBQUUsQ0FBQTtRQUV0QyxNQUFNLENBQUMsV0FBVyxDQUNqQixVQUFVLENBQUMsUUFBUSxDQUFDLCtDQUErQyxFQUFFO1lBQ3BFLFFBQVEsRUFBRSxnQkFBZ0IsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRztTQUN4RCxDQUFDLEVBQ0YsZ0JBQWdCLENBQ2hCLENBQUE7UUFDRCxNQUFNLENBQUMsRUFBRSxDQUNSLFVBQVUsQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUM3QywrQ0FBK0MsQ0FDL0MsQ0FDRCxDQUFBO1FBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsa0JBQWtCLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQ3RFLE1BQU0sQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLGtCQUFrQixDQUFDLFVBQVUsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUN2RSxNQUFNLENBQUMsZUFBZSxDQUFDLFVBQVUsQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLEVBQUU7WUFDL0QsK0NBQStDO1NBQy9DLENBQUMsQ0FBQTtRQUNGLE1BQU0sQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLGtCQUFrQixDQUFDLGVBQWUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDMUUsTUFBTSxDQUFDLGVBQWUsQ0FDckIsVUFBVSxDQUFDLGtCQUFrQixDQUFDLGVBQWUsRUFBRSxHQUFHLENBQ2pELGdCQUFnQixDQUFDLFlBQVksRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQzlDLEVBQ0QsQ0FBQywrQ0FBK0MsQ0FBQyxDQUNqRCxDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUVKLElBQUksQ0FBQyxvRkFBb0YsRUFBRSxHQUFHLEVBQUUsQ0FDL0Ysa0JBQWtCLENBQU8sRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDNUQsVUFBVSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxDQUFBO1FBRXJDLE1BQU0sV0FBVyxDQUFDLFNBQVMsQ0FDMUIsc0JBQXNCLENBQUMsY0FBYyxDQUFDLGdCQUFnQixFQUN0RCxRQUFRLENBQUMsVUFBVSxDQUFDLGtFQUFrRSxDQUFDLENBQ3ZGLENBQUE7UUFDRCxNQUFNLFdBQVcsQ0FBQyxTQUFTLENBQzFCLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLFNBQVMsRUFBRSxlQUFlLENBQUMsRUFDcEYsUUFBUSxDQUFDLFVBQVUsQ0FDbEIsdUVBQXVFLENBQ3ZFLENBQ0QsQ0FBQTtRQUNELE1BQU0sVUFBVSxDQUFDLG1CQUFtQixFQUFFLENBQUE7UUFFdEMsVUFBVSxDQUFDLG9CQUFvQixDQUFDLEtBQUssQ0FBQyxDQUFBO1FBRXRDLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLFVBQVUsQ0FBQyxRQUFRLENBQUMsK0NBQStDLEVBQUU7WUFDcEUsUUFBUSxFQUFFLGdCQUFnQixDQUFDLFlBQVksRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHO1NBQ3hELENBQUMsRUFDRixXQUFXLENBQ1gsQ0FBQTtRQUNELE1BQU0sQ0FBQyxFQUFFLENBQ1IsVUFBVSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQzdDLCtDQUErQyxDQUMvQyxDQUNELENBQUE7UUFDRCxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDdEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsa0JBQWtCLENBQUMsVUFBVSxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQ3ZFLE1BQU0sQ0FBQyxlQUFlLENBQUMsVUFBVSxDQUFDLGtCQUFrQixDQUFDLFNBQVMsRUFBRTtZQUMvRCwrQ0FBK0M7U0FDL0MsQ0FBQyxDQUFBO1FBQ0YsTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsa0JBQWtCLENBQUMsZUFBZSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMxRSxNQUFNLENBQUMsZUFBZSxDQUNyQixVQUFVLENBQUMsa0JBQWtCLENBQUMsZUFBZSxFQUFFLEdBQUcsQ0FDakQsZ0JBQWdCLENBQUMsWUFBWSxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FDOUMsRUFDRCxDQUFDLCtDQUErQyxDQUFDLENBQ2pELENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQyxDQUFBO0lBRUosSUFBSSxDQUFDLGtFQUFrRSxFQUFFLEdBQUcsRUFBRSxDQUM3RSxrQkFBa0IsQ0FBTyxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsRUFBRSxLQUFLLElBQUksRUFBRTtRQUM1RCxVQUFVLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLENBQUE7UUFFckMsTUFBTSxXQUFXLENBQUMsU0FBUyxDQUMxQixzQkFBc0IsQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLEVBQ3RELFFBQVEsQ0FBQyxVQUFVLENBQUMsa0VBQWtFLENBQUMsQ0FDdkYsQ0FBQTtRQUNELE1BQU0sV0FBVyxDQUFDLFNBQVMsQ0FDMUIsUUFBUSxDQUFDLGdCQUFnQixDQUFDLFlBQVksRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsU0FBUyxFQUFFLGVBQWUsQ0FBQyxFQUNwRixRQUFRLENBQUMsVUFBVSxDQUNsQix1RUFBdUUsQ0FDdkUsQ0FDRCxDQUFBO1FBQ0QsTUFBTSxVQUFVLENBQUMsbUJBQW1CLEVBQUUsQ0FBQTtRQUV0QyxNQUFNLE9BQU8sR0FBRyxLQUFLLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFBO1FBQ3BFLFVBQVUsQ0FBQyxvQkFBb0IsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUV0QyxNQUFNLEtBQUssR0FBRyxNQUFNLE9BQU8sQ0FBQTtRQUMzQixNQUFNLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLCtDQUErQyxDQUFDLENBQUMsQ0FBQTtRQUNsRixNQUFNLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQywrQ0FBK0MsQ0FBQyxDQUFDLENBQUE7SUFDdkYsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUVKLElBQUksQ0FBQyw2RUFBNkUsRUFBRSxHQUFHLEVBQUUsQ0FDeEYsa0JBQWtCLENBQU8sRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDNUQsVUFBVSxDQUFDLG9CQUFvQixDQUFDLEtBQUssQ0FBQyxDQUFBO1FBRXRDLE1BQU0sV0FBVyxDQUFDLFNBQVMsQ0FDMUIsc0JBQXNCLENBQUMsY0FBYyxDQUFDLGdCQUFnQixFQUN0RCxRQUFRLENBQUMsVUFBVSxDQUFDLGtFQUFrRSxDQUFDLENBQ3ZGLENBQUE7UUFDRCxNQUFNLFdBQVcsQ0FBQyxTQUFTLENBQzFCLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLFNBQVMsRUFBRSxlQUFlLENBQUMsRUFDcEYsUUFBUSxDQUFDLFVBQVUsQ0FDbEIsdUVBQXVFLENBQ3ZFLENBQ0QsQ0FBQTtRQUNELE1BQU0sVUFBVSxDQUFDLG1CQUFtQixFQUFFLENBQUE7UUFFdEMsTUFBTSxDQUFDLFdBQVcsQ0FDakIsVUFBVSxDQUFDLFFBQVEsQ0FBQywrQ0FBK0MsRUFBRTtZQUNwRSxRQUFRLEVBQUUsZ0JBQWdCLENBQUMsWUFBWSxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUc7U0FDeEQsQ0FBQyxFQUNGLFdBQVcsQ0FDWCxDQUFBO1FBQ0QsTUFBTSxDQUFDLEVBQUUsQ0FDUixVQUFVLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FDN0MsK0NBQStDLENBQy9DLENBQ0QsQ0FBQTtRQUNELE1BQU0sQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLGtCQUFrQixDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUN0RSxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxrQkFBa0IsQ0FBQyxVQUFVLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDdkUsTUFBTSxDQUFDLGVBQWUsQ0FBQyxVQUFVLENBQUMsa0JBQWtCLENBQUMsU0FBUyxFQUFFO1lBQy9ELCtDQUErQztTQUMvQyxDQUFDLENBQUE7UUFDRixNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxrQkFBa0IsQ0FBQyxlQUFlLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzFFLE1BQU0sQ0FBQyxlQUFlLENBQ3JCLFVBQVUsQ0FBQyxrQkFBa0IsQ0FBQyxlQUFlLEVBQUUsR0FBRyxDQUNqRCxnQkFBZ0IsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUM5QyxFQUNELENBQUMsK0NBQStDLENBQUMsQ0FDakQsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFFSixJQUFJLENBQUMsaUVBQWlFLEVBQUUsR0FBRyxFQUFFLENBQzVFLGtCQUFrQixDQUFPLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzVELFVBQVUsQ0FBQyxvQkFBb0IsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUV0QyxNQUFNLFdBQVcsQ0FBQyxTQUFTLENBQzFCLHNCQUFzQixDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsRUFDdEQsUUFBUSxDQUFDLFVBQVUsQ0FBQyxrRUFBa0UsQ0FBQyxDQUN2RixDQUFBO1FBQ0QsTUFBTSxXQUFXLENBQUMsU0FBUyxDQUMxQixRQUFRLENBQUMsZ0JBQWdCLENBQUMsWUFBWSxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxTQUFTLEVBQUUsZUFBZSxDQUFDLEVBQ3BGLFFBQVEsQ0FBQyxVQUFVLENBQ2xCLHVFQUF1RSxDQUN2RSxDQUNELENBQUE7UUFDRCxNQUFNLFVBQVUsQ0FBQyxtQkFBbUIsRUFBRSxDQUFBO1FBRXRDLFVBQVUsQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUVyQyxNQUFNLENBQUMsV0FBVyxDQUNqQixVQUFVLENBQUMsUUFBUSxDQUFDLCtDQUErQyxFQUFFO1lBQ3BFLFFBQVEsRUFBRSxnQkFBZ0IsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRztTQUN4RCxDQUFDLEVBQ0YsZ0JBQWdCLENBQ2hCLENBQUE7UUFDRCxNQUFNLENBQUMsRUFBRSxDQUNSLFVBQVUsQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUM3QywrQ0FBK0MsQ0FDL0MsQ0FDRCxDQUFBO1FBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsa0JBQWtCLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQ3RFLE1BQU0sQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLGtCQUFrQixDQUFDLFVBQVUsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUN2RSxNQUFNLENBQUMsZUFBZSxDQUFDLFVBQVUsQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLEVBQUU7WUFDL0QsK0NBQStDO1NBQy9DLENBQUMsQ0FBQTtRQUNGLE1BQU0sQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLGtCQUFrQixDQUFDLGVBQWUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDMUUsTUFBTSxDQUFDLGVBQWUsQ0FDckIsVUFBVSxDQUFDLGtCQUFrQixDQUFDLGVBQWUsRUFBRSxHQUFHLENBQ2pELGdCQUFnQixDQUFDLFlBQVksRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQzlDLEVBQ0QsQ0FBQywrQ0FBK0MsQ0FBQyxDQUNqRCxDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUVKLElBQUksQ0FBQyxnRUFBZ0UsRUFBRSxHQUFHLEVBQUUsQ0FDM0Usa0JBQWtCLENBQU8sRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDNUQsVUFBVSxDQUFDLG9CQUFvQixDQUFDLEtBQUssQ0FBQyxDQUFBO1FBRXRDLE1BQU0sV0FBVyxDQUFDLFNBQVMsQ0FDMUIsc0JBQXNCLENBQUMsY0FBYyxDQUFDLGdCQUFnQixFQUN0RCxRQUFRLENBQUMsVUFBVSxDQUFDLGtFQUFrRSxDQUFDLENBQ3ZGLENBQUE7UUFDRCxNQUFNLFdBQVcsQ0FBQyxTQUFTLENBQzFCLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLFNBQVMsRUFBRSxlQUFlLENBQUMsRUFDcEYsUUFBUSxDQUFDLFVBQVUsQ0FDbEIsdUVBQXVFLENBQ3ZFLENBQ0QsQ0FBQTtRQUNELE1BQU0sVUFBVSxDQUFDLG1CQUFtQixFQUFFLENBQUE7UUFFdEMsTUFBTSxPQUFPLEdBQUcsS0FBSyxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsd0JBQXdCLENBQUMsQ0FBQTtRQUNwRSxVQUFVLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLENBQUE7UUFFckMsTUFBTSxLQUFLLEdBQUcsTUFBTSxPQUFPLENBQUE7UUFDM0IsTUFBTSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQywrQ0FBK0MsQ0FBQyxDQUFDLENBQUE7UUFDbEYsTUFBTSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsb0JBQW9CLENBQUMsK0NBQStDLENBQUMsQ0FBQyxDQUFBO0lBQ3ZGLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFFSixJQUFJLENBQUMsb0RBQW9ELEVBQUUsR0FBRyxFQUFFLENBQy9ELGtCQUFrQixDQUFDLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3RELE1BQU0sV0FBVyxDQUFDLFNBQVMsQ0FDMUIsc0JBQXNCLENBQUMsY0FBYyxDQUFDLGdCQUFnQixFQUN0RCxRQUFRLENBQUMsVUFBVSxDQUFDLGtFQUFrRSxDQUFDLENBQ3ZGLENBQUE7UUFDRCxVQUFVLENBQUMsb0JBQW9CLENBQUMsS0FBSyxDQUFDLENBQUE7UUFFdEMsTUFBTSxPQUFPLEdBQUcsS0FBSyxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsNkJBQTZCLENBQUMsQ0FBQTtRQUN6RSxNQUFNLFdBQVcsQ0FBQyxTQUFTLENBQzFCLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLFNBQVMsRUFBRSxlQUFlLENBQUMsRUFDcEYsUUFBUSxDQUFDLFVBQVUsQ0FDbEIsdUVBQXVFLENBQ3ZFLENBQ0QsQ0FBQTtRQUVELE9BQU8sT0FBTyxDQUFBO0lBQ2YsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUVKLElBQUksQ0FBQyxnQ0FBZ0MsRUFBRSxHQUFHLEVBQUUsQ0FDM0Msa0JBQWtCLENBQU8sRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDNUQsTUFBTSxHQUFHLEdBQUcsNENBQTRDLENBQUE7UUFDeEQsTUFBTSxXQUFXLENBQUMsU0FBUyxDQUMxQixzQkFBc0IsQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLEVBQ3RELFFBQVEsQ0FBQyxVQUFVLENBQUMsK0RBQStELENBQUMsQ0FDcEYsQ0FBQTtRQUNELE1BQU0sV0FBVyxDQUFDLFNBQVMsQ0FDMUIsUUFBUSxDQUFDLGdCQUFnQixDQUFDLFlBQVksRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsU0FBUyxFQUFFLGVBQWUsQ0FBQyxFQUNwRixRQUFRLENBQUMsVUFBVSxDQUFDLG9FQUFvRSxDQUFDLENBQ3pGLENBQUE7UUFFRCxNQUFNLFVBQVUsQ0FBQyxtQkFBbUIsRUFBRSxDQUFBO1FBQ3RDLE1BQU0sVUFBVSxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFFNUMsTUFBTSxNQUFNLEdBQUcsVUFBVSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUU7WUFDdEMsUUFBUSxFQUFFLGdCQUFnQixDQUFDLFlBQVksRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHO1NBQ3hELENBQUMsQ0FBQTtRQUNGLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUMvQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDcEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsb0JBQW9CLEVBQUUsU0FBUyxDQUFDLENBQUE7SUFDM0QsQ0FBQyxDQUFDLENBQUMsQ0FBQTtBQUNMLENBQUMsQ0FBQyxDQUFBO0FBRUYsS0FBSyxDQUFDLDBDQUEwQyxFQUFFLEdBQUcsRUFBRTtJQUN0RCxJQUFJLFVBQTRCLEVBQy9CLGdCQUFrQyxFQUNsQyxXQUF5QixFQUN6QixrQkFBdUQsRUFDdkQsc0JBQStDLEVBQy9DLG9CQUE4QyxDQUFBO0lBQy9DLE1BQU0scUJBQXFCLEdBQUcsUUFBUSxDQUFDLEVBQUUsQ0FDeEMsdUJBQXVCLENBQUMsYUFBYSxDQUNyQyxDQUFBO0lBQ0QsTUFBTSxXQUFXLEdBQUcsdUNBQXVDLEVBQUUsQ0FBQTtJQUU3RCxVQUFVLENBQUMsR0FBRyxFQUFFO1FBQ2YscUJBQXFCLENBQUMscUJBQXFCLENBQUM7WUFDM0MsRUFBRSxFQUFFLE9BQU87WUFDWCxJQUFJLEVBQUUsUUFBUTtZQUNkLFVBQVUsRUFBRTtnQkFDWCxDQUFDLDBCQUEwQixDQUFDLEVBQUU7b0JBQzdCLElBQUksRUFBRSxPQUFPO29CQUNiLE9BQU8sRUFBRSxFQUFFO29CQUNYLEtBQUssd0NBQWdDO2lCQUNyQztnQkFDRCxrREFBa0QsRUFBRTtvQkFDbkQsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsT0FBTyxFQUFFLE9BQU87b0JBQ2hCLEtBQUssd0NBQWdDO2lCQUNyQztnQkFDRCx5REFBeUQsRUFBRTtvQkFDMUQsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsT0FBTyxFQUFFLE9BQU87b0JBQ2hCLEtBQUssZ0RBQXdDO2lCQUM3QztnQkFDRCwyQ0FBMkMsRUFBRTtvQkFDNUMsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsT0FBTyxFQUFFLE9BQU87aUJBQ2hCO2dCQUNELG1EQUFtRCxFQUFFO29CQUNwRCxJQUFJLEVBQUUsUUFBUTtvQkFDZCxPQUFPLEVBQUUsT0FBTztvQkFDaEIsS0FBSyx3Q0FBZ0M7aUJBQ3JDO2dCQUNELDRDQUE0QyxFQUFFO29CQUM3QyxJQUFJLEVBQUUsUUFBUTtvQkFDZCxPQUFPLEVBQUUsT0FBTztpQkFDaEI7YUFDRDtTQUNELENBQUMsQ0FBQTtJQUNILENBQUMsQ0FBQyxDQUFBO0lBRUYsS0FBSyxDQUFDLEtBQUssSUFBSSxFQUFFO1FBQ2hCLE1BQU0sVUFBVSxHQUFHLElBQUksY0FBYyxFQUFFLENBQUE7UUFDdkMsV0FBVyxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxXQUFXLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQTtRQUMxRCxNQUFNLGtCQUFrQixHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSwwQkFBMEIsRUFBRSxDQUFDLENBQUE7UUFDNUUsV0FBVyxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxrQkFBa0IsQ0FBQyxDQUFDLENBQUE7UUFFOUUsTUFBTSxNQUFNLEdBQUcsUUFBUSxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUNsQyxNQUFNLFdBQVcsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUE7UUFFdEMsb0JBQW9CLEdBQUcsNkJBQTZCLENBQUMsU0FBUyxFQUFFLFdBQVcsQ0FBQyxDQUFBO1FBQzVFLGtCQUFrQixHQUFHLHNCQUFzQixDQUFBO1FBQzNDLGtCQUFrQixDQUFDLFVBQVUsR0FBRyxRQUFRLENBQUMsTUFBTSxFQUFFLGVBQWUsQ0FBQyxDQUFBO1FBQ2pFLE1BQU0sa0JBQWtCLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FDekMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLGtCQUFrQixDQUFDLENBQ3ZELENBQUE7UUFDRCxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLEVBQUUsa0JBQWtCLENBQUMsQ0FBQTtRQUNsRSxNQUFNLGtCQUFrQixHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxrQkFBa0IsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFBO1FBQy9FLE1BQU0sdUJBQXVCLEdBQUcsb0JBQW9CLENBQUMsSUFBSSxDQUN4RCx3QkFBd0IsRUFDeEIsV0FBVyxDQUFDLEdBQUcsQ0FDZCxJQUFJLHVCQUF1QixDQUMxQixrQkFBa0IsRUFDbEIsV0FBVyxFQUNYLGtCQUFrQixFQUNsQixVQUFVLENBQ1YsQ0FDRCxDQUNELENBQUE7UUFDRCxXQUFXLENBQUMsR0FBRyxDQUNkLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FDM0IsT0FBTyxDQUFDLGNBQWMsRUFDdEIsV0FBVyxDQUFDLEdBQUcsQ0FDZCxJQUFJLG9CQUFvQixDQUN2QixJQUFJLENBQUMsTUFBTSxFQUNYLGtCQUFrQixFQUNsQixPQUFPLENBQUMsY0FBYyxFQUN0Qix1QkFBdUIsRUFDdkIsa0JBQWtCLEVBQ2xCLElBQUksY0FBYyxFQUFFLENBQ3BCLENBQ0QsQ0FDRCxDQUNELENBQUE7UUFDRCxzQkFBc0IsR0FBRyxvQkFBb0IsQ0FBQyxJQUFJLENBQ2pELHVCQUF1QixFQUN2QixXQUFXLENBQUMsR0FBRyxDQUNkLElBQUksc0JBQXNCLENBQ3pCLGlCQUFpQixDQUNoQixRQUFRLEVBQ1IsUUFBUSxFQUNSLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxtQkFBbUIsRUFBRSxVQUFVLEVBQUUsTUFBTSxDQUFDLEVBQ3BFLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLEVBQUUsZUFBZSxDQUFDLENBQ3ZELENBQ0QsQ0FDRCxDQUNELENBQUE7UUFDRCxnQkFBZ0IsR0FBRyxVQUFVLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FDOUMsSUFBSSxnQkFBZ0IsQ0FDbkIsRUFBRSxrQkFBa0IsRUFBRSxJQUFJLGtCQUFrQixFQUFFLEVBQUUsRUFDaEQsa0JBQWtCLEVBQ2xCLHNCQUFzQixFQUN0Qix1QkFBdUIsRUFDdkIsV0FBVyxFQUNYLGtCQUFrQixFQUNsQixrQkFBa0IsRUFDbEIsSUFBSSxjQUFjLEVBQUUsRUFDcEIsV0FBVyxDQUFDLEdBQUcsQ0FDZCxJQUFJLGlCQUFpQixDQUFDLGtCQUFrQixDQUFDLFVBQVUsRUFBRSxXQUFXLEVBQUUsVUFBVSxDQUFDLENBQzdFLENBQ0QsQ0FDRCxDQUFBO1FBQ0Qsb0JBQW9CLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxXQUFXLENBQUMsQ0FBQTtRQUNwRCxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsd0JBQXdCLEVBQUUsVUFBVSxDQUFDLENBQUE7UUFDL0Qsb0JBQW9CLENBQUMsSUFBSSxDQUFDLHFCQUFxQixFQUFFLFVBQVUsQ0FBQyxDQUFBO1FBQzVELG9CQUFvQixDQUFDLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxrQkFBa0IsQ0FBQyxDQUFBO1FBRWxFLE1BQU0sV0FBVyxDQUFDLFNBQVMsQ0FDMUIsdUJBQXVCLENBQUMsY0FBYyxDQUFDLGdCQUFnQixFQUN2RCxRQUFRLENBQUMsVUFBVSxDQUNsQix3SUFBd0ksQ0FDeEksQ0FDRCxDQUFBO1FBQ0QsTUFBTSxXQUFXLENBQUMsU0FBUyxDQUMxQixzQkFBc0IsQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLEVBQ3RELFFBQVEsQ0FBQyxVQUFVLENBQ2xCLHVJQUF1SSxDQUN2SSxDQUNELENBQUE7UUFDRCxNQUFNLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyx5QkFBeUIsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO1FBQ3BFLG9CQUFvQixDQUFDLElBQUksQ0FDeEIseUJBQXlCLEVBQ3pCLFdBQVcsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLHlCQUF5QixDQUFDLENBQUMsQ0FDL0UsQ0FBQTtRQUNELG9CQUFvQixDQUFDLElBQUksQ0FDeEIsZ0JBQWdCLEVBQ2hCLFdBQVcsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FDekUsQ0FBQTtRQUNELG9CQUFvQixDQUFDLElBQUksQ0FDeEIsaUJBQWlCLEVBQ2pCLFdBQVcsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FDOUUsQ0FBQTtRQUNELGdCQUFnQixDQUFDLDJCQUEyQixDQUFDLG9CQUFvQixDQUFDLENBQUE7SUFDbkUsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsWUFBWSxFQUFFLEdBQUcsRUFBRSxDQUN2QixrQkFBa0IsQ0FBTyxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsRUFBRSxLQUFLLElBQUksRUFBRTtRQUM1RCxNQUFNLENBQUMsV0FBVyxDQUNqQixVQUFVLENBQUMsUUFBUSxDQUFDLG1EQUFtRCxDQUFDLEVBQ3hFLGtCQUFrQixDQUNsQixDQUFBO1FBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FDakIsVUFBVSxDQUFDLFFBQVEsQ0FBQyw0Q0FBNEMsQ0FBQyxFQUNqRSxjQUFjLENBQ2QsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFFSixJQUFJLENBQUMsU0FBUyxFQUFFLEdBQUcsRUFBRSxDQUNwQixrQkFBa0IsQ0FBTyxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsRUFBRSxLQUFLLElBQUksRUFBRTtRQUM1RCxJQUFJLE1BQU0sR0FBRyxVQUFVLENBQUMsT0FBTyxDQUFDLG1CQUFtQixDQUFDLENBQUE7UUFDcEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsWUFBWSxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQ2xELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUNqRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDL0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQ3BELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLG9CQUFvQixFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQzFELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUUzQyxNQUFNLEdBQUcsVUFBVSxDQUFDLE9BQU8sQ0FBQyxrREFBa0QsQ0FBQyxDQUFBO1FBQy9FLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFlBQVksRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUNoRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDakQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQy9DLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLGNBQWMsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUNwRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxvQkFBb0IsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUMxRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFFekMsTUFBTSxXQUFXLENBQUMsU0FBUyxDQUMxQixvQkFBb0IsQ0FBQyxHQUFHLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLEVBQ2xGLFFBQVEsQ0FBQyxVQUFVLENBQ2xCLDRFQUE0RSxDQUM1RSxDQUNELENBQUE7UUFDRCxNQUFNLFdBQVcsQ0FBQyxTQUFTLENBQzFCLHNCQUFzQixDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsRUFDdEQsUUFBUSxDQUFDLFVBQVUsQ0FDbEIsd0VBQXdFLENBQ3hFLENBQ0QsQ0FBQTtRQUNELE1BQU0sVUFBVSxDQUFDLG1CQUFtQixFQUFFLENBQUE7UUFDdEMsTUFBTSxHQUFHLFVBQVUsQ0FBQyxPQUFPLENBQUMsa0RBQWtELENBQUMsQ0FBQTtRQUMvRSxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxZQUFZLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDaEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLEVBQUUsa0JBQWtCLENBQUMsQ0FBQTtRQUMvRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsY0FBYyxDQUFDLENBQUE7UUFDcEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQ3BELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLG9CQUFvQixFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQzFELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxrQkFBa0IsQ0FBQyxDQUFBO1FBRXBELE1BQU0sV0FBVyxDQUFDLFNBQVMsQ0FDMUIsb0JBQW9CLENBQUMsR0FBRyxDQUFDLHdCQUF3QixDQUFDLENBQUMsY0FBYyxDQUFDLGdCQUFnQixFQUNsRixRQUFRLENBQUMsVUFBVSxDQUFDLHFFQUFxRSxDQUFDLENBQzFGLENBQUE7UUFDRCxNQUFNLFdBQVcsQ0FBQyxTQUFTLENBQzFCLHNCQUFzQixDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsRUFDdEQsUUFBUSxDQUFDLFVBQVUsQ0FBQyxpRUFBaUUsQ0FBQyxDQUN0RixDQUFBO1FBQ0QsTUFBTSxVQUFVLENBQUMsbUJBQW1CLEVBQUUsQ0FBQTtRQUN0QyxNQUFNLEdBQUcsVUFBVSxDQUFDLE9BQU8sQ0FBQywyQ0FBMkMsQ0FBQyxDQUFBO1FBQ3hFLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFlBQVksRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUNoRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUN0RCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsY0FBYyxDQUFDLENBQUE7UUFDcEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQ3BELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLG9CQUFvQixFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQzFELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxjQUFjLENBQUMsQ0FBQTtJQUNqRCxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBRUosSUFBSSxDQUFDLGtDQUFrQyxFQUFFLEdBQUcsRUFBRSxDQUM3QyxrQkFBa0IsQ0FBTyxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsRUFBRSxLQUFLLElBQUksRUFBRTtRQUM1RCxNQUFNLFVBQVUsQ0FBQyxXQUFXLENBQzNCLGtEQUFrRCxFQUNsRCxrQkFBa0IsQ0FDbEIsQ0FBQTtRQUVELE1BQU0sQ0FBQyxlQUFlLENBQ3JCLElBQUksQ0FBQyxLQUFLLENBQ1QsQ0FDQyxNQUFNLFdBQVcsQ0FBQyxRQUFRLENBQ3pCLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsQ0FDbEYsQ0FDRCxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FDbEIsRUFDRDtZQUNDLGtEQUFrRCxFQUFFLGtCQUFrQjtZQUN0RSxtREFBbUQsRUFBRSxrQkFBa0I7WUFDdkUsNENBQTRDLEVBQUUsV0FBVztTQUN6RCxDQUNELENBQUE7UUFDRCxNQUFNLENBQUMsV0FBVyxDQUNqQixVQUFVLENBQUMsUUFBUSxDQUFDLGtEQUFrRCxDQUFDLEVBQ3ZFLGtCQUFrQixDQUNsQixDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUVKLElBQUksQ0FBQyxvQ0FBb0MsRUFBRSxHQUFHLEVBQUUsQ0FDL0Msa0JBQWtCLENBQU8sRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDNUQsTUFBTSxVQUFVLENBQUMsV0FBVyxDQUMzQix5REFBeUQsRUFDekQsa0JBQWtCLENBQ2xCLENBQUE7UUFFRCxNQUFNLENBQUMsZUFBZSxDQUNyQixJQUFJLENBQUMsS0FBSyxDQUNULENBQ0MsTUFBTSxXQUFXLENBQUMsUUFBUSxDQUN6QixvQkFBb0IsQ0FBQyxHQUFHLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLENBQ2xGLENBQ0QsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQ2xCLEVBQ0Q7WUFDQyx5REFBeUQsRUFBRSxrQkFBa0I7WUFDN0UsbURBQW1ELEVBQUUsa0JBQWtCO1lBQ3ZFLDRDQUE0QyxFQUFFLFdBQVc7U0FDekQsQ0FDRCxDQUFBO1FBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FDakIsVUFBVSxDQUFDLFFBQVEsQ0FBQyx5REFBeUQsQ0FBQyxFQUM5RSxrQkFBa0IsQ0FDbEIsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFFSixJQUFJLENBQUMsdUJBQXVCLEVBQUUsR0FBRyxFQUFFLENBQ2xDLGtCQUFrQixDQUFPLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzVELE1BQU0sVUFBVSxDQUFDLFdBQVcsQ0FBQywyQ0FBMkMsRUFBRSxjQUFjLENBQUMsQ0FBQTtRQUV6RixNQUFNLENBQUMsZUFBZSxDQUNyQixJQUFJLENBQUMsS0FBSyxDQUNULENBQ0MsTUFBTSxXQUFXLENBQUMsUUFBUSxDQUFDLHNCQUFzQixDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUNsRixDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FDbEIsRUFDRDtZQUNDLDJDQUEyQyxFQUFFLGNBQWM7WUFDM0QsNENBQTRDLEVBQUUsY0FBYztZQUM1RCxtREFBbUQsRUFBRSxjQUFjO1NBQ25FLENBQ0QsQ0FBQTtRQUNELE1BQU0sQ0FBQyxXQUFXLENBQ2pCLFVBQVUsQ0FBQyxRQUFRLENBQUMsMkNBQTJDLENBQUMsRUFDaEUsY0FBYyxDQUNkLENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQyxDQUFBO0lBRUosSUFBSSxDQUFDLHVDQUF1QyxFQUFFLEdBQUcsRUFBRSxDQUNsRCxrQkFBa0IsQ0FBTyxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsRUFBRSxLQUFLLElBQUksRUFBRTtRQUM1RCxNQUFNLFdBQVcsQ0FBQyxTQUFTLENBQzFCLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsRUFDbEYsUUFBUSxDQUFDLFVBQVUsQ0FBQyxvRUFBb0UsQ0FBQyxDQUN6RixDQUFBO1FBQ0QsTUFBTSxVQUFVLENBQUMsbUJBQW1CLEVBQUUsQ0FBQTtRQUV0QyxxQkFBcUIsQ0FBQyxxQkFBcUIsQ0FBQztZQUMzQyxFQUFFLEVBQUUsT0FBTztZQUNYLElBQUksRUFBRSxRQUFRO1lBQ2QsVUFBVSxFQUFFO2dCQUNYLDRDQUE0QyxFQUFFO29CQUM3QyxJQUFJLEVBQUUsUUFBUTtvQkFDZCxPQUFPLEVBQUUsT0FBTztpQkFDaEI7YUFDRDtTQUNELENBQUMsQ0FBQTtRQUVGLE1BQU0sQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyw0Q0FBNEMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFBO0lBQy9GLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFFSixJQUFJLENBQUMsa0RBQWtELEVBQUUsR0FBRyxFQUFFLENBQzdELGtCQUFrQixDQUFPLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzVELE1BQU0sV0FBVyxDQUFDLFNBQVMsQ0FDMUIsb0JBQW9CLENBQUMsR0FBRyxDQUFDLHdCQUF3QixDQUFDLENBQUMsY0FBYyxDQUFDLGdCQUFnQixFQUNsRixRQUFRLENBQUMsVUFBVSxDQUNsQiwyRUFBMkUsQ0FDM0UsQ0FDRCxDQUFBO1FBQ0QsTUFBTSxVQUFVLENBQUMsbUJBQW1CLEVBQUUsQ0FBQTtRQUV0QyxxQkFBcUIsQ0FBQyxxQkFBcUIsQ0FBQztZQUMzQyxFQUFFLEVBQUUsT0FBTztZQUNYLElBQUksRUFBRSxRQUFRO1lBQ2QsVUFBVSxFQUFFO2dCQUNYLG1EQUFtRCxFQUFFO29CQUNwRCxJQUFJLEVBQUUsUUFBUTtvQkFDZCxPQUFPLEVBQUUsT0FBTztvQkFDaEIsS0FBSyx3Q0FBZ0M7aUJBQ3JDO2FBQ0Q7U0FDRCxDQUFDLENBQUE7UUFFRixNQUFNLENBQUMsV0FBVyxDQUNqQixVQUFVLENBQUMsUUFBUSxDQUFDLG1EQUFtRCxDQUFDLEVBQ3hFLGdCQUFnQixDQUNoQixDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUVKLElBQUksQ0FBQyxpRUFBaUUsRUFBRSxHQUFHLEVBQUUsQ0FDNUUsa0JBQWtCLENBQU8sRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDNUQsTUFBTSxXQUFXLENBQUMsU0FBUyxDQUMxQixvQkFBb0IsQ0FBQyxHQUFHLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLEVBQ2xGLFFBQVEsQ0FBQyxVQUFVLENBQUMscUVBQXFFLENBQUMsQ0FDMUYsQ0FBQTtRQUNELE1BQU0sVUFBVSxDQUFDLG1CQUFtQixFQUFFLENBQUE7UUFDdEMsTUFBTSxDQUFDLFdBQVcsQ0FDakIsVUFBVSxDQUFDLFFBQVEsQ0FBQyw2Q0FBNkMsQ0FBQyxFQUNsRSxTQUFTLENBQ1QsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFFSixJQUFJLENBQUMsOENBQThDLEVBQUUsR0FBRyxFQUFFLENBQ3pELGtCQUFrQixDQUFPLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzVELE1BQU0sVUFBVSxDQUFDLFdBQVcsQ0FDM0IsMEJBQTBCLEVBQzFCLENBQUMsNENBQTRDLENBQUMseUNBRTlDLENBQUE7UUFFRCxNQUFNLFVBQVUsQ0FBQyxVQUFVLENBQUMseUJBQXlCLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFM0UsTUFBTSxDQUFDLFdBQVcsQ0FDakIsVUFBVSxDQUFDLFFBQVEsQ0FBQyxtREFBbUQsQ0FBQyxFQUN4RSxrQkFBa0IsQ0FDbEIsQ0FBQTtRQUNELE1BQU0sQ0FBQyxXQUFXLENBQ2pCLFVBQVUsQ0FBQyxRQUFRLENBQUMsNENBQTRDLENBQUMsRUFDakUsV0FBVyxDQUNYLENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQyxDQUFBO0lBRUosSUFBSSxDQUFDLDhCQUE4QixFQUFFLEdBQUcsRUFBRSxDQUN6QyxrQkFBa0IsQ0FBTyxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsRUFBRSxLQUFLLElBQUksRUFBRTtRQUM1RCxNQUFNLE9BQU8sR0FBRyxLQUFLLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFBO1FBQ3BFLE1BQU0sVUFBVSxDQUFDLFdBQVcsQ0FDM0IsMEJBQTBCLEVBQzFCLENBQUMsNENBQTRDLENBQUMseUNBRTlDLENBQUE7UUFFRCxNQUFNLFdBQVcsR0FBRyxNQUFNLE9BQU8sQ0FBQTtRQUNqQyxNQUFNLENBQUMsZUFBZSxDQUNyQixDQUFDLEdBQUcsV0FBVyxDQUFDLFlBQVksQ0FBQyxFQUM3QixDQUFDLDBCQUEwQixFQUFFLDRDQUE0QyxDQUFDLENBQzFFLENBQUE7UUFDRCxNQUFNLENBQUMsV0FBVyxDQUNqQixVQUFVLENBQUMsUUFBUSxDQUFDLDRDQUE0QyxDQUFDLEVBQ2pFLFdBQVcsQ0FDWCxDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUVKLElBQUksQ0FBQyxxREFBcUQsRUFBRSxHQUFHLEVBQUUsQ0FDaEUsa0JBQWtCLENBQU8sRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDNUQsTUFBTSxXQUFXLENBQUMsU0FBUyxDQUMxQixvQkFBb0IsQ0FBQyxHQUFHLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLEVBQ2xGLFFBQVEsQ0FBQyxVQUFVLENBQUMsK0RBQStELENBQUMsQ0FDcEYsQ0FBQTtRQUNELE1BQU0sV0FBVyxDQUFDLFNBQVMsQ0FDMUIsc0JBQXNCLENBQUMsY0FBYyxDQUFDLGdCQUFnQixFQUN0RCxRQUFRLENBQUMsVUFBVSxDQUFDLGtFQUFrRSxDQUFDLENBQ3ZGLENBQUE7UUFDRCxNQUFNLFVBQVUsQ0FBQyxXQUFXLENBQzNCLDBCQUEwQixFQUMxQixDQUFDLDRDQUE0QyxDQUFDLHlDQUU5QyxDQUFBO1FBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FDakIsVUFBVSxDQUFDLFFBQVEsQ0FBQyw0Q0FBNEMsQ0FBQyxFQUNqRSxXQUFXLENBQ1gsQ0FBQTtRQUVELHFCQUFxQixDQUFDLHFCQUFxQixDQUFDO1lBQzNDLEVBQUUsRUFBRSxPQUFPO1lBQ1gsSUFBSSxFQUFFLFFBQVE7WUFDZCxVQUFVLEVBQUU7Z0JBQ1gsNENBQTRDLEVBQUU7b0JBQzdDLElBQUksRUFBRSxRQUFRO29CQUNkLE9BQU8sRUFBRSxPQUFPO2lCQUNoQjthQUNEO1NBQ0QsQ0FBQyxDQUFBO1FBRUYsTUFBTSxVQUFVLENBQUMsbUJBQW1CLEVBQUUsQ0FBQTtRQUN0QyxNQUFNLENBQUMsV0FBVyxDQUNqQixVQUFVLENBQUMsUUFBUSxDQUFDLDRDQUE0QyxDQUFDLEVBQ2pFLFdBQVcsQ0FDWCxDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUVKLElBQUksQ0FBQyxnREFBZ0QsRUFBRSxHQUFHLEVBQUUsQ0FDM0Qsa0JBQWtCLENBQU8sRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDNUQsTUFBTSxVQUFVLENBQUMsV0FBVyxDQUMzQiwwQkFBMEIsRUFDMUIsQ0FBQyw0Q0FBNEMsQ0FBQyx5Q0FFOUMsQ0FBQTtRQUNELE1BQU0sT0FBTyxHQUFHLEtBQUssQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLHdCQUF3QixDQUFDLENBQUE7UUFDcEUsTUFBTSxVQUFVLENBQUMsV0FBVyxDQUMzQiw0Q0FBNEMsRUFDNUMsY0FBYyx5Q0FFZCxDQUFBO1FBRUQsTUFBTSxXQUFXLEdBQUcsTUFBTSxPQUFPLENBQUE7UUFDakMsTUFBTSxDQUFDLGVBQWUsQ0FDckIsQ0FBQyxHQUFHLFdBQVcsQ0FBQyxZQUFZLENBQUMsRUFDN0IsQ0FBQyw0Q0FBNEMsQ0FBQyxDQUM5QyxDQUFBO1FBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FDakIsVUFBVSxDQUFDLFFBQVEsQ0FBQyw0Q0FBNEMsQ0FBQyxFQUNqRSxjQUFjLENBQ2QsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFFSixJQUFJLENBQUMsb0NBQW9DLEVBQUUsR0FBRyxFQUFFLENBQy9DLGtCQUFrQixDQUFPLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzVELE1BQU0sQ0FBQyxXQUFXLENBQ2pCLFVBQVUsQ0FBQyw4QkFBOEIsQ0FDeEMsbURBQW1ELENBQ25ELEVBQ0QsSUFBSSxDQUNKLENBQUE7UUFDRCxNQUFNLENBQUMsV0FBVyxDQUNqQixVQUFVLENBQUMsOEJBQThCLENBQUMsNENBQTRDLENBQUMsRUFDdkYsS0FBSyxDQUNMLENBQUE7UUFFRCxNQUFNLFVBQVUsQ0FBQyxXQUFXLENBQzNCLDBCQUEwQixFQUMxQixDQUFDLDRDQUE0QyxDQUFDLHlDQUU5QyxDQUFBO1FBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FDakIsVUFBVSxDQUFDLDhCQUE4QixDQUFDLDRDQUE0QyxDQUFDLEVBQ3ZGLElBQUksQ0FDSixDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUVKLElBQUksQ0FBQywyQkFBMkIsRUFBRSxHQUFHLEVBQUUsQ0FDdEMsa0JBQWtCLENBQU8sRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDNUQsTUFBTSxXQUFXLENBQUMsU0FBUyxDQUMxQixvQkFBb0IsQ0FBQyxHQUFHLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLEVBQ2xGLFFBQVEsQ0FBQyxVQUFVLENBQ2xCLHNJQUFzSSxDQUN0SSxDQUNELENBQUE7UUFDRCxNQUFNLFdBQVcsQ0FBQyxTQUFTLENBQzFCLHNCQUFzQixDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsRUFDdEQsUUFBUSxDQUFDLFVBQVUsQ0FDbEIscUlBQXFJLENBQ3JJLENBQ0QsQ0FBQTtRQUNELE1BQU0sVUFBVSxDQUFDLG1CQUFtQixFQUFFLENBQUE7UUFFdEMsTUFBTSxPQUFPLEdBQUcsS0FBSyxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsd0JBQXdCLENBQUMsQ0FBQTtRQUNwRSxNQUFNLHNCQUFzQixDQUFDLG9CQUFvQixDQUNoRCxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxjQUFjLENBQ2pFLENBQUE7UUFFRCxNQUFNLFdBQVcsR0FBRyxNQUFNLE9BQU8sQ0FBQTtRQUNqQyxNQUFNLENBQUMsZUFBZSxDQUNyQixDQUFDLEdBQUcsV0FBVyxDQUFDLFlBQVksQ0FBQyxFQUM3QixDQUFDLDJDQUEyQyxDQUFDLENBQzdDLENBQUE7UUFDRCxNQUFNLENBQUMsV0FBVyxDQUNqQixVQUFVLENBQUMsUUFBUSxDQUFDLGtEQUFrRCxDQUFDLEVBQ3ZFLGtCQUFrQixDQUNsQixDQUFBO1FBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FDakIsVUFBVSxDQUFDLFFBQVEsQ0FBQywyQ0FBMkMsQ0FBQyxFQUNoRSxXQUFXLENBQ1gsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFFSixJQUFJLENBQUMsK0JBQStCLEVBQUUsR0FBRyxFQUFFLENBQzFDLGtCQUFrQixDQUFPLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzVELE1BQU0sV0FBVyxDQUFDLFNBQVMsQ0FDMUIsb0JBQW9CLENBQUMsR0FBRyxDQUFDLHdCQUF3QixDQUFDLENBQUMsY0FBYyxDQUFDLGdCQUFnQixFQUNsRixRQUFRLENBQUMsVUFBVSxDQUNsQixzSUFBc0ksQ0FDdEksQ0FDRCxDQUFBO1FBQ0QsTUFBTSxXQUFXLENBQUMsU0FBUyxDQUMxQixzQkFBc0IsQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLEVBQ3RELFFBQVEsQ0FBQyxVQUFVLENBQ2xCLHFJQUFxSSxDQUNySSxDQUNELENBQUE7UUFDRCxNQUFNLFVBQVUsQ0FBQyxtQkFBbUIsRUFBRSxDQUFBO1FBRXRDLE1BQU0sT0FBTyxHQUFHLGlCQUFpQixDQUNoQyxTQUFTLEVBQ1QsU0FBUyxFQUNULFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxtQkFBbUIsRUFBRSxVQUFVLEVBQUUsU0FBUyxDQUFDLEVBQ3ZFLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLEVBQUUsZUFBZSxDQUFDLENBQ3ZELENBQUE7UUFDRCxNQUFNLFdBQVcsQ0FBQyxTQUFTLENBQzFCLE9BQU8sQ0FBQyxnQkFBZ0IsRUFDeEIsUUFBUSxDQUFDLFVBQVUsQ0FDbEIsdUlBQXVJLENBQ3ZJLENBQ0QsQ0FBQTtRQUNELE1BQU0sT0FBTyxHQUFHLEtBQUssQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLHdCQUF3QixDQUFDLENBQUE7UUFDcEUsTUFBTSxzQkFBc0IsQ0FBQyxvQkFBb0IsQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUUxRCxNQUFNLFdBQVcsR0FBRyxNQUFNLE9BQU8sQ0FBQTtRQUNqQyxNQUFNLENBQUMsZUFBZSxDQUNyQixDQUFDLEdBQUcsV0FBVyxDQUFDLFlBQVksQ0FBQyxFQUM3QixDQUFDLDJDQUEyQyxDQUFDLENBQzdDLENBQUE7UUFDRCxNQUFNLENBQUMsV0FBVyxDQUNqQixVQUFVLENBQUMsUUFBUSxDQUFDLGtEQUFrRCxDQUFDLEVBQ3ZFLGtCQUFrQixDQUNsQixDQUFBO1FBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FDakIsVUFBVSxDQUFDLFFBQVEsQ0FBQywyQ0FBMkMsQ0FBQyxFQUNoRSxlQUFlLENBQ2YsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFFSixJQUFJLENBQUMsbUVBQW1FLEVBQUUsR0FBRyxFQUFFLENBQzlFLGtCQUFrQixDQUFPLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzVELE1BQU0sV0FBVyxDQUFDLFNBQVMsQ0FDMUIsb0JBQW9CLENBQUMsR0FBRyxDQUFDLHdCQUF3QixDQUFDLENBQUMsY0FBYyxDQUFDLGdCQUFnQixFQUNsRixRQUFRLENBQUMsVUFBVSxDQUNsQixzSUFBc0ksQ0FDdEksQ0FDRCxDQUFBO1FBQ0QsTUFBTSxXQUFXLENBQUMsU0FBUyxDQUMxQixzQkFBc0IsQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLEVBQ3RELFFBQVEsQ0FBQyxVQUFVLENBQ2xCLHFJQUFxSSxDQUNySSxDQUNELENBQUE7UUFDRCxNQUFNLFVBQVUsQ0FBQyxtQkFBbUIsRUFBRSxDQUFBO1FBRXRDLE1BQU0sT0FBTyxHQUFHLGlCQUFpQixDQUNoQyxTQUFTLEVBQ1QsU0FBUyxFQUNULFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxtQkFBbUIsRUFBRSxVQUFVLEVBQUUsU0FBUyxDQUFDLEVBQ3ZFLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLEVBQUUsZUFBZSxDQUFDLEVBQ3ZELEVBQUUsZUFBZSxFQUFFLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxFQUFFLEVBQ3ZDLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLGNBQWMsQ0FDakUsQ0FBQTtRQUNELE1BQU0sV0FBVyxDQUFDLFNBQVMsQ0FDMUIsT0FBTyxDQUFDLGdCQUFnQixFQUN4QixRQUFRLENBQUMsVUFBVSxDQUNsQiwySUFBMkksQ0FDM0ksQ0FDRCxDQUFBO1FBQ0QsTUFBTSxPQUFPLEdBQUcsS0FBSyxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsd0JBQXdCLENBQUMsQ0FBQTtRQUNwRSxNQUFNLHNCQUFzQixDQUFDLG9CQUFvQixDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBRTFELE1BQU0sV0FBVyxHQUFHLE1BQU0sT0FBTyxDQUFBO1FBQ2pDLE1BQU0sQ0FBQyxlQUFlLENBQ3JCLENBQUMsR0FBRyxXQUFXLENBQUMsWUFBWSxDQUFDLEVBQzdCO1lBQ0Msa0RBQWtEO1lBQ2xELDJDQUEyQztTQUMzQyxDQUNELENBQUE7UUFDRCxNQUFNLENBQUMsV0FBVyxDQUNqQixVQUFVLENBQUMsUUFBUSxDQUFDLGtEQUFrRCxDQUFDLEVBQ3ZFLG1CQUFtQixDQUNuQixDQUFBO1FBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FDakIsVUFBVSxDQUFDLFFBQVEsQ0FBQywyQ0FBMkMsQ0FBQyxFQUNoRSxlQUFlLENBQ2YsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFFSixJQUFJLENBQUMseUhBQXlILEVBQUUsR0FBRyxFQUFFLENBQ3BJLGtCQUFrQixDQUFPLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzVELE1BQU0sV0FBVyxDQUFDLFNBQVMsQ0FDMUIsb0JBQW9CLENBQUMsR0FBRyxDQUFDLHdCQUF3QixDQUFDLENBQUMsY0FBYyxDQUFDLGdCQUFnQixFQUNsRixRQUFRLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUN6QixDQUFBO1FBQ0QsTUFBTSxVQUFVLENBQUMsbUJBQW1CLEVBQUUsQ0FBQTtRQUV0QyxNQUFNLE9BQU8sR0FBRyxLQUFLLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFBO1FBQ3BFLE1BQU0sV0FBVyxDQUFDLFNBQVMsQ0FDMUIsb0JBQW9CLENBQUMsR0FBRyxDQUFDLHdCQUF3QixDQUFDLENBQUMsY0FBYyxDQUFDLGdCQUFnQixFQUNsRixRQUFRLENBQUMsVUFBVSxDQUNsQiw2SUFBNkksQ0FDN0ksQ0FDRCxDQUFBO1FBRUQsTUFBTSxXQUFXLEdBQUcsTUFBTSxPQUFPLENBQUE7UUFDakMsTUFBTSxDQUFDLGVBQWUsQ0FDckIsQ0FBQyxHQUFHLFdBQVcsQ0FBQyxZQUFZLENBQUMsRUFDN0IsQ0FBQyxrREFBa0QsQ0FBQyxDQUNwRCxDQUFBO1FBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FDakIsVUFBVSxDQUFDLFFBQVEsQ0FBQyxrREFBa0QsQ0FBQyxFQUN2RSxrQkFBa0IsQ0FDbEIsQ0FBQTtRQUNELE1BQU0sQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQywyQ0FBMkMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFBO0lBQzlGLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFFSixJQUFJLENBQUMsaUVBQWlFLEVBQUUsR0FBRyxFQUFFLENBQzVFLGtCQUFrQixDQUFPLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzVELE1BQU0sVUFBVSxDQUFDLFdBQVcsQ0FDM0IsMEJBQTBCLEVBQzFCLENBQUMsNENBQTRDLENBQUMseUNBRTlDLENBQUE7UUFFRCxNQUFNLHNCQUFzQixDQUFDLG9CQUFvQixDQUNoRCxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxjQUFjLENBQ2pFLENBQUE7UUFFRCxNQUFNLENBQUMsV0FBVyxDQUNqQixVQUFVLENBQUMsUUFBUSxDQUFDLG1EQUFtRCxDQUFDLEVBQ3hFLGtCQUFrQixDQUNsQixDQUFBO1FBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FDakIsVUFBVSxDQUFDLFFBQVEsQ0FBQyw0Q0FBNEMsQ0FBQyxFQUNqRSxXQUFXLENBQ1gsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFFSixJQUFJLENBQUMscUVBQXFFLEVBQUUsR0FBRyxFQUFFLENBQ2hGLGtCQUFrQixDQUFPLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzVELE1BQU0sVUFBVSxDQUFDLFdBQVcsQ0FDM0IsMEJBQTBCLEVBQzFCLENBQUMsNENBQTRDLENBQUMseUNBRTlDLENBQUE7UUFFRCxNQUFNLE9BQU8sR0FBRyxpQkFBaUIsQ0FDaEMsU0FBUyxFQUNULFNBQVMsRUFDVCxRQUFRLENBQUMsa0JBQWtCLENBQUMsbUJBQW1CLEVBQUUsVUFBVSxFQUFFLFNBQVMsQ0FBQyxFQUN2RSxRQUFRLENBQUMsa0JBQWtCLENBQUMsU0FBUyxFQUFFLGVBQWUsQ0FBQyxDQUN2RCxDQUFBO1FBQ0QsTUFBTSxXQUFXLENBQUMsU0FBUyxDQUMxQixPQUFPLENBQUMsZ0JBQWdCLEVBQ3hCLFFBQVEsQ0FBQyxVQUFVLENBQ2xCLGdJQUFnSSxDQUNoSSxDQUNELENBQUE7UUFDRCxNQUFNLE9BQU8sR0FBRyxLQUFLLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFBO1FBQ3BFLE1BQU0sc0JBQXNCLENBQUMsb0JBQW9CLENBQUMsT0FBTyxDQUFDLENBQUE7UUFFMUQsTUFBTSxXQUFXLEdBQUcsTUFBTSxPQUFPLENBQUE7UUFDakMsTUFBTSxDQUFDLGVBQWUsQ0FDckIsQ0FBQyxHQUFHLFdBQVcsQ0FBQyxZQUFZLENBQUMsRUFDN0IsQ0FBQywyQ0FBMkMsQ0FBQyxDQUM3QyxDQUFBO1FBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FDakIsVUFBVSxDQUFDLFFBQVEsQ0FBQyxtREFBbUQsQ0FBQyxFQUN4RSxrQkFBa0IsQ0FDbEIsQ0FBQTtRQUNELE1BQU0sQ0FBQyxXQUFXLENBQ2pCLFVBQVUsQ0FBQyxRQUFRLENBQUMsNENBQTRDLENBQUMsRUFDakUsV0FBVyxDQUNYLENBQUE7UUFDRCxNQUFNLENBQUMsV0FBVyxDQUNqQixVQUFVLENBQUMsUUFBUSxDQUFDLDJDQUEyQyxDQUFDLEVBQ2hFLGNBQWMsQ0FDZCxDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUVKLElBQUksQ0FBQyxrRkFBa0YsRUFBRSxHQUFHLEVBQUUsQ0FDN0Ysa0JBQWtCLENBQU8sRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDNUQsTUFBTSxVQUFVLENBQUMsV0FBVyxDQUMzQiwwQkFBMEIsRUFDMUIsQ0FBQyw0Q0FBNEMsQ0FBQyx5Q0FFOUMsQ0FBQTtRQUNELE1BQU0sc0JBQXNCLENBQUMsb0JBQW9CLENBQ2hELG9CQUFvQixDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLGNBQWMsQ0FDakUsQ0FBQTtRQUVELE1BQU0sT0FBTyxHQUFHLGlCQUFpQixDQUNoQyxTQUFTLEVBQ1QsU0FBUyxFQUNULFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxtQkFBbUIsRUFBRSxVQUFVLEVBQUUsU0FBUyxDQUFDLEVBQ3ZFLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLEVBQUUsZUFBZSxDQUFDLENBQ3ZELENBQUE7UUFDRCxNQUFNLFdBQVcsQ0FBQyxTQUFTLENBQzFCLE9BQU8sQ0FBQyxnQkFBZ0IsRUFDeEIsUUFBUSxDQUFDLFVBQVUsQ0FDbEIsZ0lBQWdJLENBQ2hJLENBQ0QsQ0FBQTtRQUNELE1BQU0sT0FBTyxHQUFHLEtBQUssQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLHdCQUF3QixDQUFDLENBQUE7UUFDcEUsTUFBTSxzQkFBc0IsQ0FBQyxvQkFBb0IsQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUUxRCxNQUFNLFdBQVcsR0FBRyxNQUFNLE9BQU8sQ0FBQTtRQUNqQyxNQUFNLENBQUMsZUFBZSxDQUNyQixDQUFDLEdBQUcsV0FBVyxDQUFDLFlBQVksQ0FBQyxFQUM3QixDQUFDLDJDQUEyQyxDQUFDLENBQzdDLENBQUE7UUFDRCxNQUFNLENBQUMsV0FBVyxDQUNqQixVQUFVLENBQUMsUUFBUSxDQUFDLG1EQUFtRCxDQUFDLEVBQ3hFLGtCQUFrQixDQUNsQixDQUFBO1FBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FDakIsVUFBVSxDQUFDLFFBQVEsQ0FBQyw0Q0FBNEMsQ0FBQyxFQUNqRSxXQUFXLENBQ1gsQ0FBQTtRQUNELE1BQU0sQ0FBQyxXQUFXLENBQ2pCLFVBQVUsQ0FBQyxRQUFRLENBQUMsMkNBQTJDLENBQUMsRUFDaEUsY0FBYyxDQUNkLENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQyxDQUFBO0FBQ0wsQ0FBQyxDQUFDLENBQUE7QUFFRixLQUFLLENBQUMseUNBQXlDLEVBQUUsR0FBRyxFQUFFO0lBQ3JELElBQUksdUJBQWlELEVBQ3BELGlCQUFzQyxFQUN0QyxVQUE0QixFQUM1QixXQUF5QixFQUN6QixrQkFBc0QsRUFDdEQsc0JBQStDLENBQUE7SUFDaEQsTUFBTSxxQkFBcUIsR0FBRyxRQUFRLENBQUMsRUFBRSxDQUN4Qyx1QkFBdUIsQ0FBQyxhQUFhLENBQ3JDLENBQUE7SUFDRCxNQUFNLFdBQVcsR0FBRyx1Q0FBdUMsRUFBRSxDQUFBO0lBRTdELFVBQVUsQ0FBQyxHQUFHLEVBQUU7UUFDZixxQkFBcUIsQ0FBQyxxQkFBcUIsQ0FBQztZQUMzQyxFQUFFLEVBQUUsT0FBTztZQUNYLElBQUksRUFBRSxRQUFRO1lBQ2QsVUFBVSxFQUFFO2dCQUNYLDRDQUE0QyxFQUFFO29CQUM3QyxJQUFJLEVBQUUsUUFBUTtvQkFDZCxPQUFPLEVBQUUsT0FBTztpQkFDaEI7Z0JBQ0QsbURBQW1ELEVBQUU7b0JBQ3BELElBQUksRUFBRSxRQUFRO29CQUNkLE9BQU8sRUFBRSxPQUFPO29CQUNoQixLQUFLLHdDQUFnQztpQkFDckM7Z0JBQ0QsK0NBQStDLEVBQUU7b0JBQ2hELElBQUksRUFBRSxRQUFRO29CQUNkLE9BQU8sRUFBRSxPQUFPO29CQUNoQixLQUFLLG9DQUE0QjtpQkFDakM7Z0JBQ0QsMERBQTBELEVBQUU7b0JBQzNELElBQUksRUFBRSxRQUFRO29CQUNkLE9BQU8sRUFBRSxPQUFPO29CQUNoQixLQUFLLGdEQUF3QztpQkFDN0M7Z0JBQ0Qsb0RBQW9ELEVBQUU7b0JBQ3JELElBQUksRUFBRSxRQUFRO29CQUNkLE9BQU8sRUFBRSxPQUFPO29CQUNoQixLQUFLLHFDQUE2QjtpQkFDbEM7Z0JBQ0Qsb0RBQW9ELEVBQUU7b0JBQ3JELElBQUksRUFBRSxRQUFRO29CQUNkLE9BQU8sRUFBRSxPQUFPO29CQUNoQixLQUFLLGlEQUF5QztpQkFDOUM7Z0JBQ0QsdURBQXVELEVBQUU7b0JBQ3hELElBQUksRUFBRSxRQUFRO29CQUNkLE9BQU8sRUFBRSxPQUFPO29CQUNoQixVQUFVLEVBQUUsSUFBSTtvQkFDaEIsS0FBSyxxQ0FBNkI7aUJBQ2xDO2dCQUNELHVEQUF1RCxFQUFFO29CQUN4RCxJQUFJLEVBQUUsUUFBUTtvQkFDZCxPQUFPLEVBQUUsT0FBTztvQkFDaEIsVUFBVSxFQUFFLElBQUk7b0JBQ2hCLEtBQUsscUNBQTZCO2lCQUNsQzthQUNEO1NBQ0QsQ0FBQyxDQUFBO0lBQ0gsQ0FBQyxDQUFDLENBQUE7SUFFRixLQUFLLENBQUMsS0FBSyxJQUFJLEVBQUU7UUFDaEIsTUFBTSxVQUFVLEdBQUcsSUFBSSxjQUFjLEVBQUUsQ0FBQTtRQUN2QyxXQUFXLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLFdBQVcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFBO1FBQzFELE1BQU0sa0JBQWtCLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLDBCQUEwQixFQUFFLENBQUMsQ0FBQTtRQUM1RSxXQUFXLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLGtCQUFrQixDQUFDLENBQUMsQ0FBQTtRQUU5RSxNQUFNLGVBQWUsR0FBRyxRQUFRLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQzlDLE1BQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFDbkMsTUFBTSxPQUFPLEdBQUcsUUFBUSxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUNuQyxNQUFNLGNBQWMsR0FBRyxRQUFRLENBQUMsSUFBSSxFQUFFLHlCQUF5QixDQUFDLENBQUE7UUFDaEUsTUFBTSxTQUFTLEdBQUcsRUFBRSxPQUFPLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxPQUFPLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsQ0FBQTtRQUUvRSxNQUFNLFdBQVcsQ0FBQyxZQUFZLENBQUMsZUFBZSxDQUFDLENBQUE7UUFDL0MsTUFBTSxXQUFXLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQ3ZDLE1BQU0sV0FBVyxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUN2QyxNQUFNLFdBQVcsQ0FBQyxTQUFTLENBQzFCLGNBQWMsRUFDZCxRQUFRLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsU0FBUyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUMxRCxDQUFBO1FBRUQsTUFBTSxvQkFBb0IsR0FBRyw2QkFBNkIsQ0FBQyxTQUFTLEVBQUUsV0FBVyxDQUFDLENBQUE7UUFDbEYsa0JBQWtCLEdBQUcsc0JBQXNCLENBQUE7UUFDM0MsTUFBTSxrQkFBa0IsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUN6QyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsa0JBQWtCLENBQUMsQ0FDdkQsQ0FBQTtRQUNELG9CQUFvQixDQUFDLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxrQkFBa0IsQ0FBQyxDQUFBO1FBQ2xFLE1BQU0sa0JBQWtCLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLGtCQUFrQixDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUE7UUFDL0UsTUFBTSx1QkFBdUIsR0FBRyxvQkFBb0IsQ0FBQyxJQUFJLENBQ3hELHdCQUF3QixFQUN4QixXQUFXLENBQUMsR0FBRyxDQUNkLElBQUksdUJBQXVCLENBQzFCLGtCQUFrQixFQUNsQixXQUFXLEVBQ1gsa0JBQWtCLEVBQ2xCLFVBQVUsQ0FDVixDQUNELENBQ0QsQ0FBQTtRQUNELFdBQVcsQ0FBQyxHQUFHLENBQ2QsV0FBVyxDQUFDLGdCQUFnQixDQUMzQixPQUFPLENBQUMsY0FBYyxFQUN0QixXQUFXLENBQUMsR0FBRyxDQUNkLElBQUksb0JBQW9CLENBQ3ZCLElBQUksQ0FBQyxNQUFNLEVBQ1gsa0JBQWtCLEVBQ2xCLE9BQU8sQ0FBQyxjQUFjLEVBQ3RCLHVCQUF1QixFQUN2QixrQkFBa0IsRUFDbEIsSUFBSSxjQUFjLEVBQUUsQ0FDcEIsQ0FDRCxDQUNELENBQ0QsQ0FBQTtRQUNELHNCQUFzQixHQUFHLG9CQUFvQixDQUFDLElBQUksQ0FDakQsdUJBQXVCLEVBQ3ZCLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxzQkFBc0IsQ0FBQyx1QkFBdUIsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUNuRixDQUFBO1FBQ0QsTUFBTSxnQkFBZ0IsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUN2QyxJQUFJLGdCQUFnQixDQUNuQixFQUFFLGtCQUFrQixFQUFFLElBQUksa0JBQWtCLEVBQUUsRUFBRSxFQUNoRCxrQkFBa0IsRUFDbEIsc0JBQXNCLEVBQ3RCLHVCQUF1QixFQUN2QixXQUFXLEVBQ1gsa0JBQWtCLEVBQ2xCLGtCQUFrQixFQUNsQixJQUFJLGNBQWMsRUFBRSxFQUNwQixJQUFJLGlCQUFpQixFQUFFLENBQ3ZCLENBQ0QsQ0FBQTtRQUVELG9CQUFvQixDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsV0FBVyxDQUFDLENBQUE7UUFDcEQsb0JBQW9CLENBQUMsSUFBSSxDQUFDLHdCQUF3QixFQUFFLGdCQUFnQixDQUFDLENBQUE7UUFDckUsb0JBQW9CLENBQUMsSUFBSSxDQUFDLHFCQUFxQixFQUFFLGdCQUFnQixDQUFDLENBQUE7UUFDbEUsb0JBQW9CLENBQUMsSUFBSSxDQUFDLDRCQUE0QixFQUFFLGtCQUFrQixDQUFDLENBQUE7UUFDM0Usb0JBQW9CLENBQUMsSUFBSSxDQUFDLG1CQUFtQixFQUFFLGtCQUFrQixDQUFDLENBQUE7UUFFbEUsTUFBTSxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsc0JBQXNCLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQTtRQUN6RSxvQkFBb0IsQ0FBQyxJQUFJLENBQ3hCLHlCQUF5QixFQUN6QixXQUFXLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDLENBQy9FLENBQUE7UUFDRCxvQkFBb0IsQ0FBQyxJQUFJLENBQ3hCLGdCQUFnQixFQUNoQixXQUFXLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQ3pFLENBQUE7UUFDRCxvQkFBb0IsQ0FBQyxJQUFJLENBQ3hCLGlCQUFpQixFQUNqQixXQUFXLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQzlFLENBQUE7UUFDRCxpQkFBaUIsR0FBRyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtRQUMzRSxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLEVBQUUsaUJBQWlCLENBQUMsQ0FBQTtRQUNqRSxnQkFBZ0IsQ0FBQywyQkFBMkIsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFBO1FBRWxFLHVCQUF1QixHQUFHLGdCQUFnQixDQUFBO1FBQzFDLFVBQVUsR0FBRyxnQkFBZ0IsQ0FBQTtJQUM5QixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxrREFBa0QsRUFBRSxHQUFHLEVBQUUsQ0FDN0Qsa0JBQWtCLENBQU8sRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDNUQsTUFBTSxXQUFXLENBQUMsU0FBUyxDQUMxQixzQkFBc0IsQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLEVBQ3RELFFBQVEsQ0FBQyxVQUFVLENBQUMsc0VBQXNFLENBQUMsQ0FDM0YsQ0FBQTtRQUNELE1BQU0saUJBQWlCLENBQUMsS0FBSyxDQUM1Qix1QkFBdUIsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxhQUFjLEVBQ3JEO1lBQ0M7Z0JBQ0MsSUFBSSxFQUFFLENBQUMsVUFBVSxDQUFDO2dCQUNsQixLQUFLLEVBQUUsRUFBRSxtREFBbUQsRUFBRSxnQkFBZ0IsRUFBRTthQUNoRjtTQUNELEVBQ0QsSUFBSSxDQUNKLENBQUE7UUFFRCxNQUFNLFVBQVUsQ0FBQyxtQkFBbUIsRUFBRSxDQUFBO1FBRXRDLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLFVBQVUsQ0FBQyxRQUFRLENBQUMsbURBQW1ELENBQUMsRUFDeEUsV0FBVyxDQUNYLENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQyxDQUFBO0lBRUosSUFBSSxDQUFDLHdFQUF3RSxFQUFFLEdBQUcsRUFBRSxDQUNuRixrQkFBa0IsQ0FBTyxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsRUFBRSxLQUFLLElBQUksRUFBRTtRQUM1RCxNQUFNLFdBQVcsQ0FBQyxTQUFTLENBQzFCLHNCQUFzQixDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsRUFDdEQsUUFBUSxDQUFDLFVBQVUsQ0FBQyxzRUFBc0UsQ0FBQyxDQUMzRixDQUFBO1FBQ0QsTUFBTSxpQkFBaUIsQ0FBQyxLQUFLLENBQzVCLHVCQUF1QixDQUFDLFlBQVksRUFBRSxDQUFDLGFBQWMsRUFDckQ7WUFDQztnQkFDQyxJQUFJLEVBQUUsQ0FBQyxVQUFVLENBQUM7Z0JBQ2xCLEtBQUssRUFBRSxFQUFFLG1EQUFtRCxFQUFFLGdCQUFnQixFQUFFO2FBQ2hGO1NBQ0QsRUFDRCxJQUFJLENBQ0osQ0FBQTtRQUVELE1BQU0sVUFBVSxDQUFDLG1CQUFtQixFQUFFLENBQUE7UUFFdEMsTUFBTSxDQUFDLFdBQVcsQ0FDakIsVUFBVSxDQUFDLFFBQVEsQ0FBQyxtREFBbUQsRUFBRTtZQUN4RSxRQUFRLEVBQUUsdUJBQXVCLENBQUMsWUFBWSxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUc7U0FDL0QsQ0FBQyxFQUNGLFdBQVcsQ0FDWCxDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUVKLElBQUksQ0FBQyw4Q0FBOEMsRUFBRSxHQUFHLEVBQUUsQ0FDekQsa0JBQWtCLENBQU8sRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDNUQsTUFBTSxXQUFXLENBQUMsU0FBUyxDQUMxQixzQkFBc0IsQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLEVBQ3RELFFBQVEsQ0FBQyxVQUFVLENBQUMsK0RBQStELENBQUMsQ0FDcEYsQ0FBQTtRQUNELE1BQU0saUJBQWlCLENBQUMsS0FBSyxDQUM1Qix1QkFBdUIsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxhQUFjLEVBQ3JEO1lBQ0M7Z0JBQ0MsSUFBSSxFQUFFLENBQUMsVUFBVSxDQUFDO2dCQUNsQixLQUFLLEVBQUUsRUFBRSwrQ0FBK0MsRUFBRSxnQkFBZ0IsRUFBRTthQUM1RTtTQUNELEVBQ0QsSUFBSSxDQUNKLENBQUE7UUFFRCxNQUFNLFVBQVUsQ0FBQyxtQkFBbUIsRUFBRSxDQUFBO1FBRXRDLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLFVBQVUsQ0FBQyxRQUFRLENBQUMsNENBQTRDLENBQUMsRUFDakUsV0FBVyxDQUNYLENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQyxDQUFBO0lBRUosSUFBSSxDQUFDLG9FQUFvRSxFQUFFLEdBQUcsRUFBRSxDQUMvRSxrQkFBa0IsQ0FBTyxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsRUFBRSxLQUFLLElBQUksRUFBRTtRQUM1RCxNQUFNLFdBQVcsQ0FBQyxTQUFTLENBQzFCLHNCQUFzQixDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsRUFDdEQsUUFBUSxDQUFDLFVBQVUsQ0FBQywrREFBK0QsQ0FBQyxDQUNwRixDQUFBO1FBQ0QsTUFBTSxpQkFBaUIsQ0FBQyxLQUFLLENBQzVCLHVCQUF1QixDQUFDLFlBQVksRUFBRSxDQUFDLGFBQWMsRUFDckQ7WUFDQztnQkFDQyxJQUFJLEVBQUUsQ0FBQyxVQUFVLENBQUM7Z0JBQ2xCLEtBQUssRUFBRSxFQUFFLCtDQUErQyxFQUFFLGdCQUFnQixFQUFFO2FBQzVFO1NBQ0QsRUFDRCxJQUFJLENBQ0osQ0FBQTtRQUVELE1BQU0sVUFBVSxDQUFDLG1CQUFtQixFQUFFLENBQUE7UUFFdEMsTUFBTSxDQUFDLFdBQVcsQ0FDakIsVUFBVSxDQUFDLFFBQVEsQ0FBQyw0Q0FBNEMsRUFBRTtZQUNqRSxRQUFRLEVBQUUsdUJBQXVCLENBQUMsWUFBWSxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUc7U0FDL0QsQ0FBQyxFQUNGLFdBQVcsQ0FDWCxDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUVKLElBQUksQ0FBQyw2RUFBNkUsRUFBRSxHQUFHLEVBQUUsQ0FDeEYsa0JBQWtCLENBQU8sRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDNUQsTUFBTSxXQUFXLENBQUMsU0FBUyxDQUMxQixzQkFBc0IsQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLEVBQ3RELFFBQVEsQ0FBQyxVQUFVLENBQUMsOERBQThELENBQUMsQ0FDbkYsQ0FBQTtRQUNELE1BQU0saUJBQWlCLENBQUMsS0FBSyxDQUM1Qix1QkFBdUIsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxhQUFjLEVBQ3JEO1lBQ0M7Z0JBQ0MsSUFBSSxFQUFFLENBQUMsVUFBVSxDQUFDO2dCQUNsQixLQUFLLEVBQUUsRUFBRSwyQ0FBMkMsRUFBRSxnQkFBZ0IsRUFBRTthQUN4RTtTQUNELEVBQ0QsSUFBSSxDQUNKLENBQUE7UUFFRCxNQUFNLFVBQVUsQ0FBQyxtQkFBbUIsRUFBRSxDQUFBO1FBQ3RDLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLFVBQVUsQ0FBQyxRQUFRLENBQUMsMkNBQTJDLENBQUMsRUFDaEUsZ0JBQWdCLENBQ2hCLENBQUE7UUFFRCxxQkFBcUIsQ0FBQyxxQkFBcUIsQ0FBQztZQUMzQyxFQUFFLEVBQUUsT0FBTztZQUNYLElBQUksRUFBRSxRQUFRO1lBQ2QsVUFBVSxFQUFFO2dCQUNYLDJDQUEyQyxFQUFFO29CQUM1QyxJQUFJLEVBQUUsUUFBUTtvQkFDZCxPQUFPLEVBQUUsT0FBTztvQkFDaEIsS0FBSyx3Q0FBZ0M7aUJBQ3JDO2FBQ0Q7U0FDRCxDQUFDLENBQUE7UUFFRixNQUFNLENBQUMsV0FBVyxDQUNqQixVQUFVLENBQUMsUUFBUSxDQUFDLDJDQUEyQyxDQUFDLEVBQ2hFLFdBQVcsQ0FDWCxDQUFBO1FBRUQsTUFBTSxVQUFVLENBQUMsbUJBQW1CLEVBQUUsQ0FBQTtRQUN0QyxNQUFNLENBQUMsV0FBVyxDQUNqQixVQUFVLENBQUMsUUFBUSxDQUFDLDJDQUEyQyxDQUFDLEVBQ2hFLFdBQVcsQ0FDWCxDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUVKLElBQUksQ0FBQyw2R0FBNkcsRUFBRSxHQUFHLEVBQUUsQ0FDeEgsa0JBQWtCLENBQU8sRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDNUQsTUFBTSxXQUFXLENBQUMsU0FBUyxDQUMxQixzQkFBc0IsQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLEVBQ3RELFFBQVEsQ0FBQyxVQUFVLENBQUMsZ0VBQWdFLENBQUMsQ0FDckYsQ0FBQTtRQUNELE1BQU0saUJBQWlCLENBQUMsS0FBSyxDQUM1Qix1QkFBdUIsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxhQUFjLEVBQ3JEO1lBQ0M7Z0JBQ0MsSUFBSSxFQUFFLENBQUMsVUFBVSxDQUFDO2dCQUNsQixLQUFLLEVBQUUsRUFBRSw2Q0FBNkMsRUFBRSxnQkFBZ0IsRUFBRTthQUMxRTtTQUNELEVBQ0QsSUFBSSxDQUNKLENBQUE7UUFFRCxNQUFNLFVBQVUsQ0FBQyxtQkFBbUIsRUFBRSxDQUFBO1FBQ3RDLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLFVBQVUsQ0FBQyxRQUFRLENBQUMsNkNBQTZDLEVBQUU7WUFDbEUsUUFBUSxFQUFFLHVCQUF1QixDQUFDLFlBQVksRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHO1NBQy9ELENBQUMsRUFDRixnQkFBZ0IsQ0FDaEIsQ0FBQTtRQUVELHFCQUFxQixDQUFDLHFCQUFxQixDQUFDO1lBQzNDLEVBQUUsRUFBRSxPQUFPO1lBQ1gsSUFBSSxFQUFFLFFBQVE7WUFDZCxVQUFVLEVBQUU7Z0JBQ1gsNkNBQTZDLEVBQUU7b0JBQzlDLElBQUksRUFBRSxRQUFRO29CQUNkLE9BQU8sRUFBRSxPQUFPO29CQUNoQixLQUFLLHdDQUFnQztpQkFDckM7YUFDRDtTQUNELENBQUMsQ0FBQTtRQUVGLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLFVBQVUsQ0FBQyxRQUFRLENBQUMsNkNBQTZDLEVBQUU7WUFDbEUsUUFBUSxFQUFFLHVCQUF1QixDQUFDLFlBQVksRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHO1NBQy9ELENBQUMsRUFDRixXQUFXLENBQ1gsQ0FBQTtRQUVELE1BQU0sVUFBVSxDQUFDLG1CQUFtQixFQUFFLENBQUE7UUFDdEMsTUFBTSxDQUFDLFdBQVcsQ0FDakIsVUFBVSxDQUFDLFFBQVEsQ0FBQyw2Q0FBNkMsRUFBRTtZQUNsRSxRQUFRLEVBQUUsdUJBQXVCLENBQUMsWUFBWSxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUc7U0FDL0QsQ0FBQyxFQUNGLFdBQVcsQ0FDWCxDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUVKLElBQUksQ0FBQywyR0FBMkcsRUFBRSxHQUFHLEVBQUUsQ0FDdEgsa0JBQWtCLENBQU8sRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDNUQsTUFBTSxXQUFXLENBQUMsU0FBUyxDQUMxQixzQkFBc0IsQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLEVBQ3RELFFBQVEsQ0FBQyxVQUFVLENBQ2xCLGdGQUFnRixDQUNoRixDQUNELENBQUE7UUFDRCxNQUFNLGlCQUFpQixDQUFDLEtBQUssQ0FDNUIsdUJBQXVCLENBQUMsWUFBWSxFQUFFLENBQUMsYUFBYyxFQUNyRDtZQUNDO2dCQUNDLElBQUksRUFBRSxDQUFDLFVBQVUsQ0FBQztnQkFDbEIsS0FBSyxFQUFFO29CQUNOLDZEQUE2RCxFQUFFLGdCQUFnQjtpQkFDL0U7YUFDRDtTQUNELEVBQ0QsSUFBSSxDQUNKLENBQUE7UUFFRCxNQUFNLFVBQVUsQ0FBQyxtQkFBbUIsRUFBRSxDQUFBO1FBQ3RDLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLFVBQVUsQ0FBQyxRQUFRLENBQUMsNkRBQTZELENBQUMsRUFDbEYsZ0JBQWdCLENBQ2hCLENBQUE7UUFFRCxxQkFBcUIsQ0FBQyxxQkFBcUIsQ0FBQztZQUMzQyxFQUFFLEVBQUUsT0FBTztZQUNYLElBQUksRUFBRSxRQUFRO1lBQ2QsVUFBVSxFQUFFO2dCQUNYLDZEQUE2RCxFQUFFO29CQUM5RCxJQUFJLEVBQUUsUUFBUTtvQkFDZCxPQUFPLEVBQUUsT0FBTztvQkFDaEIsS0FBSyxnREFBd0M7aUJBQzdDO2FBQ0Q7U0FDRCxDQUFDLENBQUE7UUFFRixNQUFNLENBQUMsV0FBVyxDQUNqQixVQUFVLENBQUMsUUFBUSxDQUFDLDZEQUE2RCxDQUFDLEVBQ2xGLGdCQUFnQixDQUNoQixDQUFBO1FBRUQsTUFBTSxVQUFVLENBQUMsbUJBQW1CLEVBQUUsQ0FBQTtRQUN0QyxNQUFNLENBQUMsV0FBVyxDQUNqQixVQUFVLENBQUMsUUFBUSxDQUFDLDZEQUE2RCxDQUFDLEVBQ2xGLGdCQUFnQixDQUNoQixDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUVKLElBQUksQ0FBQyx5REFBeUQsRUFBRSxHQUFHLEVBQUUsQ0FDcEUsa0JBQWtCLENBQU8sRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDNUQsTUFBTSxXQUFXLENBQUMsU0FBUyxDQUMxQixzQkFBc0IsQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLEVBQ3RELFFBQVEsQ0FBQyxVQUFVLENBQUMsc0VBQXNFLENBQUMsQ0FDM0YsQ0FBQTtRQUNELE1BQU0sV0FBVyxDQUFDLFNBQVMsQ0FDMUIsdUJBQXVCLENBQUMsWUFBWSxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyx1QkFBdUIsQ0FBQyxFQUNyRixRQUFRLENBQUMsVUFBVSxDQUNsQixpRkFBaUYsQ0FDakYsQ0FDRCxDQUFBO1FBRUQsTUFBTSxVQUFVLENBQUMsbUJBQW1CLEVBQUUsQ0FBQTtRQUV0QyxNQUFNLENBQUMsV0FBVyxDQUNqQixVQUFVLENBQUMsUUFBUSxDQUFDLG1EQUFtRCxDQUFDLEVBQ3hFLFdBQVcsQ0FDWCxDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUVKLElBQUksQ0FBQyx5RkFBeUYsRUFBRSxHQUFHLEVBQUUsQ0FDcEcsa0JBQWtCLENBQU8sRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDNUQsTUFBTSxXQUFXLENBQUMsU0FBUyxDQUMxQixzQkFBc0IsQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLEVBQ3RELFFBQVEsQ0FBQyxVQUFVLENBQUMsc0VBQXNFLENBQUMsQ0FDM0YsQ0FBQTtRQUNELE1BQU0sV0FBVyxDQUFDLFNBQVMsQ0FDMUIsdUJBQXVCLENBQUMsWUFBWSxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyx1QkFBdUIsQ0FBQyxFQUNyRixRQUFRLENBQUMsVUFBVSxDQUNsQixpRkFBaUYsQ0FDakYsQ0FDRCxDQUFBO1FBRUQsTUFBTSxVQUFVLENBQUMsbUJBQW1CLEVBQUUsQ0FBQTtRQUV0QyxNQUFNLENBQUMsV0FBVyxDQUNqQixVQUFVLENBQUMsUUFBUSxDQUFDLG1EQUFtRCxFQUFFO1lBQ3hFLFFBQVEsRUFBRSx1QkFBdUIsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRztTQUMvRCxDQUFDLEVBQ0YsV0FBVyxDQUNYLENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQyxDQUFBO0lBRUosSUFBSSxDQUFDLHFEQUFxRCxFQUFFLEdBQUcsRUFBRSxDQUNoRSxrQkFBa0IsQ0FBTyxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsRUFBRSxLQUFLLElBQUksRUFBRTtRQUM1RCxNQUFNLFdBQVcsQ0FBQyxTQUFTLENBQzFCLHNCQUFzQixDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsRUFDdEQsUUFBUSxDQUFDLFVBQVUsQ0FBQyxrRUFBa0UsQ0FBQyxDQUN2RixDQUFBO1FBQ0QsTUFBTSxXQUFXLENBQUMsU0FBUyxDQUMxQix1QkFBdUIsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLHVCQUF1QixDQUFDLEVBQ3JGLFFBQVEsQ0FBQyxVQUFVLENBQ2xCLDZFQUE2RSxDQUM3RSxDQUNELENBQUE7UUFFRCxNQUFNLFVBQVUsQ0FBQyxtQkFBbUIsRUFBRSxDQUFBO1FBRXRDLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLFVBQVUsQ0FBQyxRQUFRLENBQUMsK0NBQStDLENBQUMsRUFDcEUsV0FBVyxDQUNYLENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQyxDQUFBO0lBRUosSUFBSSxDQUFDLHFGQUFxRixFQUFFLEdBQUcsRUFBRSxDQUNoRyxrQkFBa0IsQ0FBTyxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsRUFBRSxLQUFLLElBQUksRUFBRTtRQUM1RCxNQUFNLFdBQVcsQ0FBQyxTQUFTLENBQzFCLHNCQUFzQixDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsRUFDdEQsUUFBUSxDQUFDLFVBQVUsQ0FBQyxrRUFBa0UsQ0FBQyxDQUN2RixDQUFBO1FBQ0QsTUFBTSxXQUFXLENBQUMsU0FBUyxDQUMxQix1QkFBdUIsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLHVCQUF1QixDQUFDLEVBQ3JGLFFBQVEsQ0FBQyxVQUFVLENBQ2xCLDZFQUE2RSxDQUM3RSxDQUNELENBQUE7UUFFRCxNQUFNLFVBQVUsQ0FBQyxtQkFBbUIsRUFBRSxDQUFBO1FBRXRDLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLFVBQVUsQ0FBQyxRQUFRLENBQUMsK0NBQStDLEVBQUU7WUFDcEUsUUFBUSxFQUFFLHVCQUF1QixDQUFDLFlBQVksRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHO1NBQy9ELENBQUMsRUFDRixXQUFXLENBQ1gsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFFSixJQUFJLENBQUMsdUZBQXVGLEVBQUUsR0FBRyxFQUFFLENBQ2xHLGtCQUFrQixDQUFPLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzVELE1BQU0sV0FBVyxDQUFDLFNBQVMsQ0FDMUIsc0JBQXNCLENBQUMsY0FBYyxDQUFDLGdCQUFnQixFQUN0RCxRQUFRLENBQUMsVUFBVSxDQUNsQiw2RUFBNkUsQ0FDN0UsQ0FDRCxDQUFBO1FBQ0QsTUFBTSxXQUFXLENBQUMsU0FBUyxDQUMxQix1QkFBdUIsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLHVCQUF1QixDQUFDLEVBQ3JGLFFBQVEsQ0FBQyxVQUFVLENBQ2xCLHdGQUF3RixDQUN4RixDQUNELENBQUE7UUFFRCxNQUFNLFVBQVUsQ0FBQyxtQkFBbUIsRUFBRSxDQUFBO1FBQ3RDLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLFVBQVUsQ0FBQyxRQUFRLENBQUMsMERBQTBELEVBQUU7WUFDL0UsUUFBUSxFQUFFLHVCQUF1QixDQUFDLFlBQVksRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHO1NBQy9ELENBQUMsRUFDRixzQkFBc0IsQ0FDdEIsQ0FBQTtRQUVELHFCQUFxQixDQUFDLHFCQUFxQixDQUFDO1lBQzNDLEVBQUUsRUFBRSxPQUFPO1lBQ1gsSUFBSSxFQUFFLFFBQVE7WUFDZCxVQUFVLEVBQUU7Z0JBQ1gsMERBQTBELEVBQUU7b0JBQzNELElBQUksRUFBRSxRQUFRO29CQUNkLE9BQU8sRUFBRSxPQUFPO29CQUNoQixLQUFLLHdDQUFnQztpQkFDckM7YUFDRDtTQUNELENBQUMsQ0FBQTtRQUVGLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLFVBQVUsQ0FBQyxRQUFRLENBQUMsMERBQTBELEVBQUU7WUFDL0UsUUFBUSxFQUFFLHVCQUF1QixDQUFDLFlBQVksRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHO1NBQy9ELENBQUMsRUFDRixXQUFXLENBQ1gsQ0FBQTtRQUVELE1BQU0sVUFBVSxDQUFDLG1CQUFtQixFQUFFLENBQUE7UUFDdEMsTUFBTSxDQUFDLFdBQVcsQ0FDakIsVUFBVSxDQUFDLFFBQVEsQ0FBQywwREFBMEQsRUFBRTtZQUMvRSxRQUFRLEVBQUUsdUJBQXVCLENBQUMsWUFBWSxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUc7U0FDL0QsQ0FBQyxFQUNGLFdBQVcsQ0FDWCxDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUVKLElBQUksQ0FBQyxtRkFBbUYsRUFBRSxHQUFHLEVBQUUsQ0FDOUYsa0JBQWtCLENBQU8sRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDNUQsTUFBTSxXQUFXLENBQUMsU0FBUyxDQUMxQixzQkFBc0IsQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLEVBQ3RELFFBQVEsQ0FBQyxVQUFVLENBQ2xCLHlFQUF5RSxDQUN6RSxDQUNELENBQUE7UUFDRCxNQUFNLFdBQVcsQ0FBQyxTQUFTLENBQzFCLHVCQUF1QixDQUFDLFlBQVksRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsdUJBQXVCLENBQUMsRUFDckYsUUFBUSxDQUFDLFVBQVUsQ0FDbEIsb0ZBQW9GLENBQ3BGLENBQ0QsQ0FBQTtRQUNELE1BQU0sVUFBVSxDQUFDLG1CQUFtQixFQUFFLENBQUE7UUFFdEMsTUFBTSxDQUFDLFdBQVcsQ0FDakIsVUFBVSxDQUFDLFFBQVEsQ0FBQyxzREFBc0QsRUFBRTtZQUMzRSxRQUFRLEVBQUUsdUJBQXVCLENBQUMsWUFBWSxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUc7U0FDL0QsQ0FBQyxFQUNGLHNCQUFzQixDQUN0QixDQUFBO1FBRUQscUJBQXFCLENBQUMscUJBQXFCLENBQUM7WUFDM0MsRUFBRSxFQUFFLE9BQU87WUFDWCxJQUFJLEVBQUUsUUFBUTtZQUNkLFVBQVUsRUFBRTtnQkFDWCxzREFBc0QsRUFBRTtvQkFDdkQsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsT0FBTyxFQUFFLE9BQU87b0JBQ2hCLEtBQUssb0NBQTRCO2lCQUNqQzthQUNEO1NBQ0QsQ0FBQyxDQUFBO1FBRUYsTUFBTSxDQUFDLFdBQVcsQ0FDakIsVUFBVSxDQUFDLFFBQVEsQ0FBQyxzREFBc0QsRUFBRTtZQUMzRSxRQUFRLEVBQUUsdUJBQXVCLENBQUMsWUFBWSxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUc7U0FDL0QsQ0FBQyxFQUNGLFdBQVcsQ0FDWCxDQUFBO1FBRUQsTUFBTSxVQUFVLENBQUMsbUJBQW1CLEVBQUUsQ0FBQTtRQUN0QyxNQUFNLENBQUMsV0FBVyxDQUNqQixVQUFVLENBQUMsUUFBUSxDQUFDLHNEQUFzRCxFQUFFO1lBQzNFLFFBQVEsRUFBRSx1QkFBdUIsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRztTQUMvRCxDQUFDLEVBQ0YsV0FBVyxDQUNYLENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQyxDQUFBO0lBRUosSUFBSSxDQUFDLGlFQUFpRSxFQUFFLEdBQUcsRUFBRSxDQUM1RSxrQkFBa0IsQ0FBTyxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsRUFBRSxLQUFLLElBQUksRUFBRTtRQUM1RCxNQUFNLFdBQVcsQ0FBQyxTQUFTLENBQzFCLHVCQUF1QixDQUFDLFlBQVksRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsdUJBQXVCLENBQUMsRUFDckYsUUFBUSxDQUFDLFVBQVUsQ0FDbEIsc0ZBQXNGLENBQ3RGLENBQ0QsQ0FBQTtRQUNELE1BQU0saUJBQWlCLENBQUMsS0FBSyxDQUM1Qix1QkFBdUIsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxhQUFjLEVBQ3JEO1lBQ0M7Z0JBQ0MsSUFBSSxFQUFFLENBQUMsVUFBVSxDQUFDO2dCQUNsQixLQUFLLEVBQUUsRUFBRSx3REFBd0QsRUFBRSxnQkFBZ0IsRUFBRTthQUNyRjtTQUNELEVBQ0QsSUFBSSxDQUNKLENBQUE7UUFDRCxNQUFNLFVBQVUsQ0FBQyxtQkFBbUIsRUFBRSxDQUFBO1FBQ3RDLHFCQUFxQixDQUFDLHFCQUFxQixDQUFDO1lBQzNDLEVBQUUsRUFBRSxPQUFPO1lBQ1gsSUFBSSxFQUFFLFFBQVE7WUFDZCxVQUFVLEVBQUU7Z0JBQ1gsd0RBQXdELEVBQUU7b0JBQ3pELElBQUksRUFBRSxRQUFRO29CQUNkLE9BQU8sRUFBRSxPQUFPO29CQUNoQixLQUFLLHFDQUE2QjtpQkFDbEM7YUFDRDtTQUNELENBQUMsQ0FBQTtRQUNGLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLFVBQVUsQ0FBQyxRQUFRLENBQUMsd0RBQXdELEVBQUU7WUFDN0UsUUFBUSxFQUFFLHVCQUF1QixDQUFDLFlBQVksRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHO1NBQy9ELENBQUMsRUFDRixzQkFBc0IsQ0FDdEIsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFFSixJQUFJLENBQUMsMEVBQTBFLEVBQUUsR0FBRyxFQUFFLENBQ3JGLGtCQUFrQixDQUFPLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzVELE1BQU0sV0FBVyxDQUFDLFNBQVMsQ0FDMUIsdUJBQXVCLENBQUMsWUFBWSxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyx1QkFBdUIsQ0FBQyxFQUNyRixRQUFRLENBQUMsVUFBVSxDQUNsQiw4RkFBOEYsQ0FDOUYsQ0FDRCxDQUFBO1FBQ0QsTUFBTSxpQkFBaUIsQ0FBQyxLQUFLLENBQzVCLHVCQUF1QixDQUFDLFlBQVksRUFBRSxDQUFDLGFBQWMsRUFDckQ7WUFDQztnQkFDQyxJQUFJLEVBQUUsQ0FBQyxVQUFVLENBQUM7Z0JBQ2xCLEtBQUssRUFBRTtvQkFDTixnRUFBZ0UsRUFBRSxnQkFBZ0I7aUJBQ2xGO2FBQ0Q7U0FDRCxFQUNELElBQUksQ0FDSixDQUFBO1FBQ0QsTUFBTSxVQUFVLENBQUMsbUJBQW1CLEVBQUUsQ0FBQTtRQUN0QyxxQkFBcUIsQ0FBQyxxQkFBcUIsQ0FBQztZQUMzQyxFQUFFLEVBQUUsT0FBTztZQUNYLElBQUksRUFBRSxRQUFRO1lBQ2QsVUFBVSxFQUFFO2dCQUNYLGdFQUFnRSxFQUFFO29CQUNqRSxJQUFJLEVBQUUsUUFBUTtvQkFDZCxPQUFPLEVBQUUsT0FBTztvQkFDaEIsS0FBSyxpREFBeUM7aUJBQzlDO2FBQ0Q7U0FDRCxDQUFDLENBQUE7UUFDRixNQUFNLENBQUMsV0FBVyxDQUNqQixVQUFVLENBQUMsUUFBUSxDQUFDLGdFQUFnRSxFQUFFO1lBQ3JGLFFBQVEsRUFBRSx1QkFBdUIsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRztTQUMvRCxDQUFDLEVBQ0Ysc0JBQXNCLENBQ3RCLENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQyxDQUFBO0lBRUosSUFBSSxDQUFDLDRFQUE0RSxFQUFFLEdBQUcsRUFBRSxDQUN2RixrQkFBa0IsQ0FBTyxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsRUFBRSxLQUFLLElBQUksRUFBRTtRQUM1RCxNQUFNLFdBQVcsQ0FBQyxTQUFTLENBQzFCLHVCQUF1QixDQUFDLFlBQVksRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsdUJBQXVCLENBQUMsRUFDckYsUUFBUSxDQUFDLFVBQVUsQ0FDbEIsZ0dBQWdHLENBQ2hHLENBQ0QsQ0FBQTtRQUNELE1BQU0saUJBQWlCLENBQUMsS0FBSyxDQUM1Qix1QkFBdUIsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxhQUFjLEVBQ3JEO1lBQ0M7Z0JBQ0MsSUFBSSxFQUFFLENBQUMsVUFBVSxDQUFDO2dCQUNsQixLQUFLLEVBQUU7b0JBQ04sa0VBQWtFLEVBQUUsZ0JBQWdCO2lCQUNwRjthQUNEO1NBQ0QsRUFDRCxJQUFJLENBQ0osQ0FBQTtRQUNELE1BQU0sVUFBVSxDQUFDLG1CQUFtQixFQUFFLENBQUE7UUFDdEMscUJBQXFCLENBQUMscUJBQXFCLENBQUM7WUFDM0MsRUFBRSxFQUFFLE9BQU87WUFDWCxJQUFJLEVBQUUsUUFBUTtZQUNkLFVBQVUsRUFBRTtnQkFDWCxrRUFBa0UsRUFBRTtvQkFDbkUsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsT0FBTyxFQUFFLE9BQU87b0JBQ2hCLEtBQUssZ0RBQXdDO2lCQUM3QzthQUNEO1NBQ0QsQ0FBQyxDQUFBO1FBQ0YsTUFBTSxDQUFDLFdBQVcsQ0FDakIsVUFBVSxDQUFDLFFBQVEsQ0FBQyxrRUFBa0UsRUFBRTtZQUN2RixRQUFRLEVBQUUsdUJBQXVCLENBQUMsWUFBWSxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUc7U0FDL0QsQ0FBQyxFQUNGLHNCQUFzQixDQUN0QixDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUVKLElBQUksQ0FBQyxTQUFTLEVBQUUsR0FBRyxFQUFFLENBQ3BCLGtCQUFrQixDQUFPLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzVELElBQUksTUFBTSxHQUFHLFVBQVUsQ0FBQyxPQUFPLENBQUMsbUJBQW1CLENBQUMsQ0FBQTtRQUNwRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxZQUFZLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDbEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQy9DLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLGNBQWMsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUNwRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxvQkFBb0IsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUMxRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFFM0MsTUFBTSxHQUFHLFVBQVUsQ0FBQyxPQUFPLENBQUMsb0RBQW9ELENBQUMsQ0FBQTtRQUNqRixNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxZQUFZLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDaEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQy9DLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLGNBQWMsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUNwRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxvQkFBb0IsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUMxRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFFekMsTUFBTSxXQUFXLENBQUMsU0FBUyxDQUMxQixzQkFBc0IsQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLEVBQ3RELFFBQVEsQ0FBQyxVQUFVLENBQ2xCLHVFQUF1RSxDQUN2RSxDQUNELENBQUE7UUFDRCxNQUFNLFVBQVUsQ0FBQyxtQkFBbUIsRUFBRSxDQUFBO1FBQ3RDLE1BQU0sR0FBRyxVQUFVLENBQUMsT0FBTyxDQUFDLG9EQUFvRCxDQUFDLENBQUE7UUFDakYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsWUFBWSxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBQ2hELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxXQUFXLENBQUMsQ0FBQTtRQUNqRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDcEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsb0JBQW9CLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDMUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLFdBQVcsQ0FBQyxDQUFBO1FBRTdDLE1BQU0saUJBQWlCLENBQUMsS0FBSyxDQUM1Qix1QkFBdUIsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxhQUFjLEVBQ3JEO1lBQ0M7Z0JBQ0MsSUFBSSxFQUFFLENBQUMsVUFBVSxDQUFDO2dCQUNsQixLQUFLLEVBQUUsRUFBRSxvREFBb0QsRUFBRSxnQkFBZ0IsRUFBRTthQUNqRjtTQUNELEVBQ0QsSUFBSSxDQUNKLENBQUE7UUFDRCxNQUFNLFVBQVUsQ0FBQyxtQkFBbUIsRUFBRSxDQUFBO1FBQ3RDLE1BQU0sR0FBRyxVQUFVLENBQUMsT0FBTyxDQUFDLG9EQUFvRCxDQUFDLENBQUE7UUFDakYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsWUFBWSxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBQ2hELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxXQUFXLENBQUMsQ0FBQTtRQUNqRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQTtRQUMzRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxvQkFBb0IsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUMxRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQTtRQUVsRCxNQUFNLFdBQVcsQ0FBQyxTQUFTLENBQzFCLHVCQUF1QixDQUFDLFlBQVksRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsdUJBQXVCLENBQUMsRUFDckYsUUFBUSxDQUFDLFVBQVUsQ0FDbEIsa0ZBQWtGLENBQ2xGLENBQ0QsQ0FBQTtRQUNELE1BQU0sVUFBVSxDQUFDLG1CQUFtQixFQUFFLENBQUE7UUFDdEMsTUFBTSxHQUFHLFVBQVUsQ0FBQyxPQUFPLENBQUMsb0RBQW9ELEVBQUU7WUFDakYsUUFBUSxFQUFFLHVCQUF1QixDQUFDLFlBQVksRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHO1NBQy9ELENBQUMsQ0FBQTtRQUNGLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFlBQVksRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUNoRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsV0FBVyxDQUFDLENBQUE7UUFDakQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFLGdCQUFnQixDQUFDLENBQUE7UUFDM0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsb0JBQW9CLEVBQUUsc0JBQXNCLENBQUMsQ0FBQTtRQUN2RSxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsc0JBQXNCLENBQUMsQ0FBQTtJQUN6RCxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBRUosSUFBSSxDQUFDLDZCQUE2QixFQUFFLEdBQUcsRUFBRSxDQUN4QyxrQkFBa0IsQ0FBTyxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsRUFBRSxLQUFLLElBQUksRUFBRTtRQUM1RCxVQUFVLENBQUMsb0JBQW9CLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDdEMsTUFBTSxpQkFBaUIsQ0FBQyxLQUFLLENBQzVCLHVCQUF1QixDQUFDLFlBQVksRUFBRSxDQUFDLGFBQWMsRUFDckQ7WUFDQztnQkFDQyxJQUFJLEVBQUUsQ0FBQyxVQUFVLENBQUM7Z0JBQ2xCLEtBQUssRUFBRTtvQkFDTix1REFBdUQsRUFBRSwwQkFBMEI7aUJBQ25GO2FBQ0Q7U0FDRCxFQUNELElBQUksQ0FDSixDQUFBO1FBQ0QsTUFBTSxVQUFVLENBQUMsbUJBQW1CLEVBQUUsQ0FBQTtRQUN0QyxJQUFJLE1BQU0sR0FBRyxVQUFVLENBQUMsT0FBTyxDQUFDLHVEQUF1RCxFQUFFO1lBQ3hGLFFBQVEsRUFBRSx1QkFBdUIsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRztTQUMvRCxDQUFDLENBQUE7UUFDRixNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxZQUFZLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDaEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQ2pELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUMvQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUUsMEJBQTBCLENBQUMsQ0FBQTtRQUNyRSxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxvQkFBb0IsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUMxRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFFekMsVUFBVSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ3JDLE1BQU0sVUFBVSxDQUFDLG1CQUFtQixFQUFFLENBQUE7UUFDdEMsTUFBTSxHQUFHLFVBQVUsQ0FBQyxPQUFPLENBQUMsdURBQXVELEVBQUU7WUFDcEYsUUFBUSxFQUFFLHVCQUF1QixDQUFDLFlBQVksRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHO1NBQy9ELENBQUMsQ0FBQTtRQUNGLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFlBQVksRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUNoRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDakQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQy9DLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLGNBQWMsRUFBRSwwQkFBMEIsQ0FBQyxDQUFBO1FBQ3JFLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLG9CQUFvQixFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQzFELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSwwQkFBMEIsQ0FBQyxDQUFBO1FBRTVELFVBQVUsQ0FBQyxvQkFBb0IsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUN0QyxNQUFNLFdBQVcsQ0FBQyxTQUFTLENBQzFCLHVCQUF1QixDQUFDLFlBQVksRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsdUJBQXVCLENBQUMsRUFDckYsUUFBUSxDQUFDLFVBQVUsQ0FDbEIsK0ZBQStGLENBQy9GLENBQ0QsQ0FBQTtRQUNELE1BQU0sVUFBVSxDQUFDLG1CQUFtQixFQUFFLENBQUE7UUFDdEMsTUFBTSxHQUFHLFVBQVUsQ0FBQyxPQUFPLENBQUMsdURBQXVELEVBQUU7WUFDcEYsUUFBUSxFQUFFLHVCQUF1QixDQUFDLFlBQVksRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHO1NBQy9ELENBQUMsQ0FBQTtRQUNGLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFlBQVksRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUNoRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDakQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQy9DLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLGNBQWMsRUFBRSwwQkFBMEIsQ0FBQyxDQUFBO1FBQ3JFLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLG9CQUFvQixFQUFFLGdDQUFnQyxDQUFDLENBQUE7UUFDakYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBRXpDLFVBQVUsQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNyQyxNQUFNLFVBQVUsQ0FBQyxtQkFBbUIsRUFBRSxDQUFBO1FBQ3RDLE1BQU0sR0FBRyxVQUFVLENBQUMsT0FBTyxDQUFDLHVEQUF1RCxFQUFFO1lBQ3BGLFFBQVEsRUFBRSx1QkFBdUIsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRztTQUMvRCxDQUFDLENBQUE7UUFDRixNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxZQUFZLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDaEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQ2pELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUMvQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUUsMEJBQTBCLENBQUMsQ0FBQTtRQUNyRSxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxvQkFBb0IsRUFBRSxnQ0FBZ0MsQ0FBQyxDQUFBO1FBQ2pGLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxnQ0FBZ0MsQ0FBQyxDQUFBO0lBQ25FLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFFSixJQUFJLENBQUMsMENBQTBDLEVBQUUsR0FBRyxFQUFFLENBQ3JELGtCQUFrQixDQUFPLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzVELFVBQVUsQ0FBQyxvQkFBb0IsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUN0QyxNQUFNLFdBQVcsQ0FBQyxTQUFTLENBQzFCLHNCQUFzQixDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsRUFDdEQsUUFBUSxDQUFDLFVBQVUsQ0FDbEIsb0ZBQW9GLENBQ3BGLENBQ0QsQ0FBQTtRQUNELE1BQU0sVUFBVSxDQUFDLG1CQUFtQixFQUFFLENBQUE7UUFFdEMsSUFBSSxPQUFPLEdBQUcsS0FBSyxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsd0JBQXdCLENBQUMsQ0FBQTtRQUNsRSxNQUFNLGlCQUFpQixDQUFDLEtBQUssQ0FDNUIsdUJBQXVCLENBQUMsWUFBWSxFQUFFLENBQUMsYUFBYyxFQUNyRDtZQUNDO2dCQUNDLElBQUksRUFBRSxDQUFDLFVBQVUsQ0FBQztnQkFDbEIsS0FBSyxFQUFFO29CQUNOLHVEQUF1RCxFQUFFLDBCQUEwQjtpQkFDbkY7YUFDRDtTQUNELEVBQ0QsSUFBSSxDQUNKLENBQUE7UUFDRCxJQUFJLEtBQUssR0FBRyxNQUFNLE9BQU8sQ0FBQTtRQUV6QixJQUFJLE1BQU0sR0FBRyxVQUFVLENBQUMsT0FBTyxDQUFDLHVEQUF1RCxFQUFFO1lBQ3hGLFFBQVEsRUFBRSx1QkFBdUIsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRztTQUMvRCxDQUFDLENBQUE7UUFDRixNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxZQUFZLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDaEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQ2pELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxxQkFBcUIsQ0FBQyxDQUFBO1FBQzNELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLGNBQWMsRUFBRSwwQkFBMEIsQ0FBQyxDQUFBO1FBQ3JFLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLG9CQUFvQixFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQzFELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxxQkFBcUIsQ0FBQyxDQUFBO1FBQ3ZELE1BQU0sQ0FBQyxXQUFXLENBQ2pCLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyx1REFBdUQsQ0FBQyxFQUNuRixJQUFJLENBQ0osQ0FBQTtRQUVELE9BQU8sR0FBRyxLQUFLLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFBO1FBQzlELE1BQU0sV0FBVyxDQUFDLFNBQVMsQ0FDMUIsdUJBQXVCLENBQUMsWUFBWSxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyx1QkFBdUIsQ0FBQyxFQUNyRixRQUFRLENBQUMsVUFBVSxDQUNsQiwrRkFBK0YsQ0FDL0YsQ0FDRCxDQUFBO1FBQ0QsS0FBSyxHQUFHLE1BQU0sT0FBTyxDQUFBO1FBRXJCLE1BQU0sR0FBRyxVQUFVLENBQUMsT0FBTyxDQUFDLHVEQUF1RCxFQUFFO1lBQ3BGLFFBQVEsRUFBRSx1QkFBdUIsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRztTQUMvRCxDQUFDLENBQUE7UUFDRixNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxZQUFZLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDaEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQ2pELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxxQkFBcUIsQ0FBQyxDQUFBO1FBQzNELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLGNBQWMsRUFBRSwwQkFBMEIsQ0FBQyxDQUFBO1FBQ3JFLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLG9CQUFvQixFQUFFLGdDQUFnQyxDQUFDLENBQUE7UUFDakYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLHFCQUFxQixDQUFDLENBQUE7UUFDdkQsTUFBTSxDQUFDLFdBQVcsQ0FDakIsS0FBSyxDQUFDLG9CQUFvQixDQUFDLHVEQUF1RCxDQUFDLEVBQ25GLElBQUksQ0FDSixDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUVKLElBQUksQ0FBQywwQkFBMEIsRUFBRSxHQUFHLEVBQUUsQ0FDckMsa0JBQWtCLENBQU8sRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDNUQsTUFBTSwyQkFBMkIsR0FBRztZQUNuQyxPQUFPLEVBQUUsT0FBTztZQUNoQixjQUFjLEVBQUU7Z0JBQ2Y7b0JBQ0MsSUFBSSxFQUFFLE1BQU07b0JBQ1osT0FBTyxFQUFFLFFBQVE7b0JBQ2pCLElBQUksRUFBRSxZQUFZO29CQUNsQixPQUFPLEVBQUUsa0RBQWtEO29CQUMzRCxXQUFXLEVBQUUsSUFBSTtvQkFDakIsSUFBSSxFQUFFLENBQUMsNkJBQTZCLENBQUM7b0JBQ3JDLEdBQUcsRUFBRSxvQkFBb0I7aUJBQ3pCO2FBQ0Q7U0FDRCxDQUFBO1FBQ0QsTUFBTSxpQkFBaUIsQ0FBQyxLQUFLLENBQzVCLHVCQUF1QixDQUFDLFlBQVksRUFBRSxDQUFDLGFBQWMsRUFDckQsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLFFBQVEsQ0FBQyxFQUFFLEtBQUssRUFBRSwyQkFBMkIsRUFBRSxDQUFDLEVBQzFELElBQUksQ0FDSixDQUFBO1FBQ0QsTUFBTSxVQUFVLENBQUMsbUJBQW1CLEVBQUUsQ0FBQTtRQUN0QyxNQUFNLE1BQU0sR0FBRyxVQUFVLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQzVDLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLDJCQUEyQixDQUFDLENBQUE7SUFDNUQsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUVKLElBQUksQ0FBQyw4QkFBOEIsRUFBRSxHQUFHLEVBQUUsQ0FDekMsa0JBQWtCLENBQU8sRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDNUQsTUFBTSwyQkFBMkIsR0FBRztZQUNuQyxPQUFPLEVBQUUsT0FBTztZQUNoQixjQUFjLEVBQUU7Z0JBQ2Y7b0JBQ0MsSUFBSSxFQUFFLE1BQU07b0JBQ1osT0FBTyxFQUFFLFFBQVE7b0JBQ2pCLElBQUksRUFBRSxZQUFZO29CQUNsQixPQUFPLEVBQUUsa0RBQWtEO29CQUMzRCxXQUFXLEVBQUUsSUFBSTtvQkFDakIsSUFBSSxFQUFFLENBQUMsNkJBQTZCLENBQUM7b0JBQ3JDLEdBQUcsRUFBRSxvQkFBb0I7aUJBQ3pCO2FBQ0Q7U0FDRCxDQUFBO1FBQ0QsTUFBTSxpQkFBaUIsQ0FBQyxLQUFLLENBQzVCLHVCQUF1QixDQUFDLFlBQVksRUFBRSxDQUFDLGFBQWMsRUFDckQsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLFFBQVEsQ0FBQyxFQUFFLEtBQUssRUFBRSwyQkFBMkIsRUFBRSxDQUFDLEVBQzFELElBQUksQ0FDSixDQUFBO1FBQ0QsTUFBTSxVQUFVLENBQUMsbUJBQW1CLEVBQUUsQ0FBQTtRQUN0QyxNQUFNLE1BQU0sR0FBRyxVQUFVLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLGNBQWMsQ0FBQTtRQUMxRCxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSwyQkFBMkIsQ0FBQyxDQUFBO0lBQzVELENBQUMsQ0FBQyxDQUFDLENBQUE7SUFFSixJQUFJLENBQUMseUJBQXlCLEVBQUUsR0FBRyxFQUFFLENBQ3BDLGtCQUFrQixDQUFPLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzVELE1BQU0sMEJBQTBCLEdBQUc7WUFDbEMsT0FBTyxFQUFFLE9BQU87WUFDaEIsS0FBSyxFQUFFO2dCQUNOO29CQUNDLEtBQUssRUFBRSxTQUFTO29CQUNoQixJQUFJLEVBQUUsT0FBTztvQkFDYixPQUFPLEVBQUUsbUJBQW1CO29CQUM1QixPQUFPLEVBQUU7d0JBQ1IsT0FBTyxFQUFFLHNCQUFzQjtxQkFDL0I7b0JBQ0QsY0FBYyxFQUFFLEVBQUU7aUJBQ2xCO2FBQ0Q7U0FDRCxDQUFBO1FBQ0QsTUFBTSxpQkFBaUIsQ0FBQyxLQUFLLENBQzVCLHVCQUF1QixDQUFDLFlBQVksRUFBRSxDQUFDLGFBQWMsRUFDckQsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLE9BQU8sQ0FBQyxFQUFFLEtBQUssRUFBRSwwQkFBMEIsRUFBRSxDQUFDLEVBQ3hELElBQUksQ0FDSixDQUFBO1FBQ0QsTUFBTSxVQUFVLENBQUMsbUJBQW1CLEVBQUUsQ0FBQTtRQUN0QyxNQUFNLE1BQU0sR0FBRyxVQUFVLENBQUMsUUFBUSwyQ0FBNkIsQ0FBQTtRQUMvRCxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSwwQkFBMEIsQ0FBQyxDQUFBO0lBQzNELENBQUMsQ0FBQyxDQUFDLENBQUE7SUFFSixJQUFJLENBQUMsNkJBQTZCLEVBQUUsR0FBRyxFQUFFLENBQ3hDLGtCQUFrQixDQUFPLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzVELE1BQU0sMEJBQTBCLEdBQUc7WUFDbEMsT0FBTyxFQUFFLE9BQU87WUFDaEIsS0FBSyxFQUFFO2dCQUNOO29CQUNDLEtBQUssRUFBRSxTQUFTO29CQUNoQixJQUFJLEVBQUUsT0FBTztvQkFDYixPQUFPLEVBQUUsbUJBQW1CO29CQUM1QixPQUFPLEVBQUU7d0JBQ1IsT0FBTyxFQUFFLHNCQUFzQjtxQkFDL0I7b0JBQ0QsY0FBYyxFQUFFLEVBQUU7aUJBQ2xCO2FBQ0Q7U0FDRCxDQUFBO1FBQ0QsTUFBTSxpQkFBaUIsQ0FBQyxLQUFLLENBQzVCLHVCQUF1QixDQUFDLFlBQVksRUFBRSxDQUFDLGFBQWMsRUFDckQsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLE9BQU8sQ0FBQyxFQUFFLEtBQUssRUFBRSwwQkFBMEIsRUFBRSxDQUFDLEVBQ3hELElBQUksQ0FDSixDQUFBO1FBQ0QsTUFBTSxVQUFVLENBQUMsbUJBQW1CLEVBQUUsQ0FBQTtRQUN0QyxNQUFNLE1BQU0sR0FBRyxVQUFVLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLGNBQWMsQ0FBQTtRQUN6RCxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSwwQkFBMEIsQ0FBQyxDQUFBO0lBQzNELENBQUMsQ0FBQyxDQUFDLENBQUE7SUFFSixJQUFJLENBQUMsMkJBQTJCLEVBQUUsR0FBRyxFQUFFLENBQ3RDLGtCQUFrQixDQUFPLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzVELE1BQU0sVUFBVSxDQUFDLFdBQVcsQ0FDM0IsNENBQTRDLEVBQzVDLFdBQVcsbUNBRVgsQ0FBQTtRQUNELE1BQU0sQ0FBQyxXQUFXLENBQ2pCLFVBQVUsQ0FBQyxRQUFRLENBQUMsNENBQTRDLENBQUMsRUFDakUsV0FBVyxDQUNYLENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQyxDQUFBO0lBRUosSUFBSSxDQUFDLGlGQUFpRixFQUFFLEdBQUcsRUFBRSxDQUM1RixrQkFBa0IsQ0FBTyxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsRUFBRSxLQUFLLElBQUksRUFBRTtRQUM1RCxNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsR0FBRyxFQUFFLENBQUE7UUFDMUIsV0FBVyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsd0JBQXdCLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtRQUM1RCxNQUFNLFVBQVUsQ0FBQyxXQUFXLENBQzNCLDRDQUE0QyxFQUM1QyxXQUFXLG1DQUVYLENBQUE7UUFDRCxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUN6QixDQUFDLENBQUMsQ0FBQyxDQUFBO0lBRUosSUFBSSxDQUFDLGdDQUFnQyxFQUFFLEdBQUcsRUFBRSxDQUMzQyxrQkFBa0IsQ0FBTyxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsRUFBRSxLQUFLLElBQUksRUFBRTtRQUM1RCxNQUFNLFVBQVUsQ0FBQyxXQUFXLENBQzNCLDRDQUE0QyxFQUM1QyxnQkFBZ0Isd0NBRWhCLENBQUE7UUFDRCxNQUFNLENBQUMsV0FBVyxDQUNqQixVQUFVLENBQUMsUUFBUSxDQUFDLDRDQUE0QyxDQUFDLEVBQ2pFLGdCQUFnQixDQUNoQixDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUVKLElBQUksQ0FBQyxzRkFBc0YsRUFBRSxHQUFHLEVBQUUsQ0FDakcsa0JBQWtCLENBQU8sRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDNUQsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFBO1FBQzFCLFdBQVcsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLHdCQUF3QixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7UUFDNUQsTUFBTSxVQUFVLENBQUMsV0FBVyxDQUMzQiw0Q0FBNEMsRUFDNUMsZ0JBQWdCLHdDQUVoQixDQUFBO1FBQ0QsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUE7SUFDekIsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUVKLElBQUksQ0FBQyx5RkFBeUYsRUFBRSxHQUFHLEVBQUU7UUFDcEcsT0FBTyxVQUFVO2FBQ2YsV0FBVyxDQUNYLG1EQUFtRCxFQUNuRCxnQkFBZ0IsRUFDaEIsRUFBRSx5Q0FFRixFQUFFLGdCQUFnQixFQUFFLElBQUksRUFBRSxDQUMxQjthQUNBLElBQUksQ0FDSixHQUFHLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLHlCQUF5QixDQUFDLEVBQzVDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FDTCxNQUFNLENBQUMsV0FBVyxDQUNqQixDQUFDLENBQUMsSUFBSSwwRkFFTixDQUNGLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxxRkFBcUYsRUFBRSxHQUFHLEVBQUU7UUFDaEcsT0FBTyxVQUFVO2FBQ2YsV0FBVyxDQUNYLCtDQUErQyxFQUMvQyxnQkFBZ0IsRUFDaEIsRUFBRSx5Q0FFRixFQUFFLGdCQUFnQixFQUFFLElBQUksRUFBRSxDQUMxQjthQUNBLElBQUksQ0FDSixHQUFHLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLHlCQUF5QixDQUFDLEVBQzVDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FDTCxNQUFNLENBQUMsV0FBVyxDQUNqQixDQUFDLENBQUMsSUFBSSxzRkFFTixDQUNGLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyx1Q0FBdUMsRUFBRSxHQUFHLEVBQUU7UUFDbEQsTUFBTSxTQUFTLEdBQUcsdUJBQXVCLENBQUMsWUFBWSxFQUFFLENBQUE7UUFDeEQsT0FBTyxVQUFVO2FBQ2YsV0FBVyxDQUNYLG9EQUFvRCxFQUNwRCxzQkFBc0IsRUFDdEIsRUFBRSxRQUFRLEVBQUUsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsK0NBRXRDO2FBQ0EsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUNWLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLFVBQVUsQ0FBQyxRQUFRLENBQUMsb0RBQW9ELEVBQUU7WUFDekUsUUFBUSxFQUFFLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRztTQUNsQyxDQUFDLEVBQ0Ysc0JBQXNCLENBQ3RCLENBQ0QsQ0FBQTtJQUNILENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDREQUE0RCxFQUFFLEdBQUcsRUFBRSxDQUN2RSxrQkFBa0IsQ0FBTyxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsRUFBRSxLQUFLLElBQUksRUFBRTtRQUM1RCxNQUFNLFNBQVMsR0FBRyx1QkFBdUIsQ0FBQyxZQUFZLEVBQUUsQ0FBQTtRQUN4RCxNQUFNLFVBQVUsQ0FBQyxXQUFXLENBQzNCLG9EQUFvRCxFQUNwRCxzQkFBc0IsRUFDdEIsRUFBRSxRQUFRLEVBQUUsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsK0NBRXRDLENBQUE7UUFDRCxNQUFNLENBQUMsV0FBVyxDQUNqQixVQUFVLENBQUMsUUFBUSxDQUFDLG9EQUFvRCxFQUFFO1lBQ3pFLFFBQVEsRUFBRSxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUc7U0FDbEMsQ0FBQyxFQUNGLHNCQUFzQixDQUN0QixDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUVKLElBQUksQ0FBQyw2RkFBNkYsRUFBRSxHQUFHLEVBQUUsQ0FDeEcsa0JBQWtCLENBQU8sRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDNUQsTUFBTSxTQUFTLEdBQUcsdUJBQXVCLENBQUMsWUFBWSxFQUFFLENBQUE7UUFDeEQsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFBO1FBQzFCLFdBQVcsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLHdCQUF3QixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7UUFDNUQsTUFBTSxVQUFVLENBQUMsV0FBVyxDQUMzQixvREFBb0QsRUFDcEQsc0JBQXNCLEVBQ3RCLEVBQUUsUUFBUSxFQUFFLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLCtDQUV0QyxDQUFBO1FBQ0QsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUE7SUFDekIsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUVKLElBQUksQ0FBQyx5R0FBeUcsRUFBRSxHQUFHLEVBQUUsQ0FDcEgsa0JBQWtCLENBQU8sRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDNUQsTUFBTSxTQUFTLEdBQUcsdUJBQXVCLENBQUMsWUFBWSxFQUFFLENBQUE7UUFDeEQsTUFBTSxVQUFVLENBQUMsV0FBVyxDQUMzQixvREFBb0QsRUFDcEQsc0JBQXNCLEVBQ3RCLEVBQUUsUUFBUSxFQUFFLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLCtDQUV0QyxDQUFBO1FBQ0QsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFBO1FBQzFCLFdBQVcsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLHdCQUF3QixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7UUFDNUQsTUFBTSxVQUFVLENBQUMsV0FBVyxDQUMzQixvREFBb0QsRUFDcEQsdUJBQXVCLEVBQ3ZCLEVBQUUsUUFBUSxFQUFFLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLCtDQUV0QyxDQUFBO1FBQ0QsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUE7SUFDekIsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUVKLElBQUksQ0FBQyw4Q0FBOEMsRUFBRSxHQUFHLEVBQUUsQ0FDekQsa0JBQWtCLENBQU8sRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDNUQsTUFBTSxTQUFTLEdBQUcsdUJBQXVCLENBQUMsWUFBWSxFQUFFLENBQUE7UUFDeEQsTUFBTSxVQUFVLENBQUMsV0FBVyxDQUMzQiwwREFBMEQsRUFDMUQsc0JBQXNCLEVBQ3RCLEVBQUUsUUFBUSxFQUFFLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLCtDQUV0QyxDQUFBO1FBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FDakIsVUFBVSxDQUFDLFFBQVEsQ0FBQywwREFBMEQsRUFBRTtZQUMvRSxRQUFRLEVBQUUsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHO1NBQ2xDLENBQUMsRUFDRixzQkFBc0IsQ0FDdEIsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFFSixJQUFJLENBQUMsNkJBQTZCLEVBQUUsR0FBRyxFQUFFLENBQ3hDLGtCQUFrQixDQUFPLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzVELE1BQU0sVUFBVSxDQUFDLFdBQVcsQ0FDM0IsNENBQTRDLEVBQzVDLGFBQWEscUNBRWIsQ0FBQTtRQUNELE1BQU0sQ0FBQyxXQUFXLENBQ2pCLFVBQVUsQ0FBQyxRQUFRLENBQUMsNENBQTRDLENBQUMsRUFDakUsYUFBYSxDQUNiLENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQyxDQUFBO0lBRUosSUFBSSxDQUFDLG1GQUFtRixFQUFFLEdBQUcsRUFBRSxDQUM5RixrQkFBa0IsQ0FBTyxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsRUFBRSxLQUFLLElBQUksRUFBRTtRQUM1RCxNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsR0FBRyxFQUFFLENBQUE7UUFDMUIsV0FBVyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsd0JBQXdCLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtRQUM1RCxNQUFNLFVBQVUsQ0FBQyxXQUFXLENBQzNCLDRDQUE0QyxFQUM1QyxhQUFhLHFDQUViLENBQUE7UUFDRCxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUN6QixDQUFDLENBQUMsQ0FBQyxDQUFBO0lBRUosSUFBSSxDQUFDLGlDQUFpQyxFQUFFLEdBQUcsRUFBRSxDQUM1QyxrQkFBa0IsQ0FBTyxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsRUFBRSxLQUFLLElBQUksRUFBRTtRQUM1RCxNQUFNLFNBQVMsR0FBRyx1QkFBdUIsQ0FBQyxZQUFZLEVBQUUsQ0FBQTtRQUN4RCxNQUFNLEdBQUcsR0FBRyxvREFBb0QsQ0FBQTtRQUNoRSxNQUFNLFVBQVUsQ0FBQyxXQUFXLENBQzNCLEdBQUcsRUFDSCxzQkFBc0IsRUFDdEIsRUFBRSxRQUFRLEVBQUUsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsK0NBRXRDLENBQUE7UUFDRCxNQUFNLFVBQVUsQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFLGdCQUFnQix3Q0FBZ0MsQ0FBQTtRQUNsRixNQUFNLFVBQVUsQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFLFdBQVcsbUNBQTJCLENBQUE7UUFFeEUsTUFBTSxVQUFVLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBRSxTQUFTLEVBQUUsRUFBRSxRQUFRLEVBQUUsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFBO1FBQ3BGLE1BQU0sVUFBVSxDQUFDLG1CQUFtQixFQUFFLENBQUE7UUFFdEMsTUFBTSxNQUFNLEdBQUcsVUFBVSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxRQUFRLEVBQUUsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFBO1FBQzlFLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUMvQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDcEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsb0JBQW9CLEVBQUUsU0FBUyxDQUFDLENBQUE7SUFDM0QsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUVKLElBQUksQ0FBQyx3Q0FBd0MsRUFBRSxHQUFHLEVBQUUsQ0FDbkQsa0JBQWtCLENBQU8sRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDNUQsTUFBTSxTQUFTLEdBQUcsdUJBQXVCLENBQUMsWUFBWSxFQUFFLENBQUE7UUFDeEQsTUFBTSxVQUFVLENBQUMsV0FBVyxDQUMzQixPQUFPLEVBQ1AsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxDQUFDLEVBQUUsRUFDckQsRUFBRSxRQUFRLEVBQUUsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsK0NBRXRDLENBQUE7UUFDRCxNQUFNLENBQUMsZUFBZSxDQUNyQixVQUFVLENBQUMsUUFBUSw0Q0FBOEIsRUFBRSxRQUFRLEVBQUUsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUN4RixFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLENBQUMsRUFBRSxDQUNyRCxDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUVKLElBQUksQ0FBQyw0Q0FBNEMsRUFBRSxHQUFHLEVBQUUsQ0FDdkQsa0JBQWtCLENBQU8sRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDNUQsTUFBTSxTQUFTLEdBQUcsdUJBQXVCLENBQUMsWUFBWSxFQUFFLENBQUE7UUFDeEQsTUFBTSxVQUFVLENBQUMsV0FBVyxDQUMzQixRQUFRLEVBQ1IsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLGNBQWMsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxDQUFDLEVBQUUsRUFDNUQsRUFBRSxRQUFRLEVBQUUsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUseUNBRXRDLEVBQUUsZ0JBQWdCLEVBQUUsSUFBSSxFQUFFLENBQzFCLENBQUE7UUFDRCxNQUFNLENBQUMsZUFBZSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEVBQUU7WUFDckQsT0FBTyxFQUFFLE9BQU87WUFDaEIsY0FBYyxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFLENBQUM7U0FDdEMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUVKLElBQUksQ0FBQywyQ0FBMkMsRUFBRSxHQUFHLEVBQUUsQ0FDdEQsa0JBQWtCLENBQU8sRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDNUQsTUFBTSxTQUFTLEdBQUcsdUJBQXVCLENBQUMsWUFBWSxFQUFFLENBQUE7UUFDeEQsTUFBTSxLQUFLLEdBQUcsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxDQUFDLEVBQUUsQ0FBQTtRQUNoRSxNQUFNLFVBQVUsQ0FBQyxXQUFXLENBQzNCLE9BQU8sRUFDUCxLQUFLLEVBQ0wsRUFBRSxRQUFRLEVBQUUsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUseUNBRXRDLEVBQUUsZ0JBQWdCLEVBQUUsSUFBSSxFQUFFLENBQzFCLENBQUE7UUFDRCxNQUFNLENBQUMsZUFBZSxDQUFDLFVBQVUsQ0FBQyxRQUFRLDJDQUE2QixFQUFFLEtBQUssQ0FBQyxDQUFBO0lBQ2hGLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFFSixJQUFJLENBQUMsZ0ZBQWdGLEVBQUUsR0FBRyxFQUFFLENBQzNGLGtCQUFrQixDQUFPLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzVELE1BQU0sZ0JBQWdCLEdBQXFCLFVBQVUsQ0FBQTtRQUNyRCxNQUFNLEdBQUcsR0FBRyxnQkFBZ0IsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFBO1FBQzFELE1BQU0sZ0JBQWdCLENBQUMsYUFBYSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUMzQyxNQUFNLFdBQVcsQ0FBQyxTQUFTLENBQzFCLFFBQVEsQ0FBQyxHQUFHLEVBQUUsU0FBUyxFQUFFLGVBQWUsQ0FBQyxFQUN6QyxRQUFRLENBQUMsVUFBVSxDQUNsQixrRkFBa0YsQ0FDbEYsQ0FDRCxDQUFBO1FBRUQsT0FBTyxJQUFJLE9BQU8sQ0FBTyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUNqQyxXQUFXLENBQUMsR0FBRyxDQUNkLFVBQVUsQ0FBQyx3QkFBd0IsQ0FBQyxHQUFHLEVBQUU7Z0JBQ3hDLElBQUksQ0FBQztvQkFDSixNQUFNLENBQUMsV0FBVyxDQUNqQixVQUFVLENBQUMsUUFBUSxDQUFDLG9EQUFvRCxFQUFFO3dCQUN6RSxRQUFRLEVBQUUsR0FBRztxQkFDYixDQUFDLEVBQ0Ysc0JBQXNCLENBQ3RCLENBQUE7b0JBQ0QsQ0FBQyxFQUFFLENBQUE7Z0JBQ0osQ0FBQztnQkFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO29CQUNoQixDQUFDLENBQUMsS0FBSyxDQUFDLENBQUE7Z0JBQ1QsQ0FBQztZQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7WUFDRCxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN2QyxDQUFDLENBQUMsQ0FBQTtJQUNILENBQUMsQ0FBQyxDQUFDLENBQUE7SUFFSixJQUFJLENBQUMsNkVBQTZFLEVBQUUsR0FBRyxFQUFFLENBQ3hGLGtCQUFrQixDQUFPLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzVELFVBQVUsQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUVyQyxNQUFNLFdBQVcsQ0FBQyxTQUFTLENBQzFCLHNCQUFzQixDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsRUFDdEQsUUFBUSxDQUFDLFVBQVUsQ0FDbEIsZ0pBQWdKLENBQ2hKLENBQ0QsQ0FBQTtRQUNELE1BQU0saUJBQWlCLENBQUMsS0FBSyxDQUM1Qix1QkFBdUIsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxhQUFjLEVBQ3JEO1lBQ0M7Z0JBQ0MsSUFBSSxFQUFFLENBQUMsVUFBVSxDQUFDO2dCQUNsQixLQUFLLEVBQUUsRUFBRSx1REFBdUQsRUFBRSxnQkFBZ0IsRUFBRTthQUNwRjtTQUNELEVBQ0QsSUFBSSxDQUNKLENBQUE7UUFDRCxNQUFNLFdBQVcsQ0FBQyxTQUFTLENBQzFCLFFBQVEsQ0FBQyxVQUFVLENBQUMsWUFBWSxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxTQUFTLEVBQUUsZUFBZSxDQUFDLEVBQzlFLFFBQVEsQ0FBQyxVQUFVLENBQ2xCLHNGQUFzRixDQUN0RixDQUNELENBQUE7UUFDRCxNQUFNLFVBQVUsQ0FBQyxtQkFBbUIsRUFBRSxDQUFBO1FBRXRDLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLFVBQVUsQ0FBQyxRQUFRLENBQUMsdURBQXVELEVBQUU7WUFDNUUsUUFBUSxFQUFFLFVBQVUsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRztTQUNsRCxDQUFDLEVBQ0YsZ0JBQWdCLENBQ2hCLENBQUE7UUFDRCxNQUFNLENBQUMsV0FBVyxDQUNqQixVQUFVLENBQUMsUUFBUSxDQUFDLHVEQUF1RCxFQUFFO1lBQzVFLFFBQVEsRUFBRSxVQUFVLENBQUMsWUFBWSxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUc7U0FDbEQsQ0FBQyxFQUNGLHVCQUF1QixDQUN2QixDQUFBO1FBQ0QsTUFBTSxDQUFDLEVBQUUsQ0FDUixVQUFVLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FDN0MsdURBQXVELENBQ3ZELENBQ0QsQ0FBQTtRQUNELE1BQU0sQ0FBQyxFQUFFLENBQ1IsVUFBVSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQzdDLHVEQUF1RCxDQUN2RCxDQUNELENBQUE7UUFDRCxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDdEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsa0JBQWtCLENBQUMsVUFBVSxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQ3ZFLE1BQU0sQ0FBQyxlQUFlLENBQUMsVUFBVSxDQUFDLGtCQUFrQixDQUFDLFNBQVMsRUFBRTtZQUMvRCx1REFBdUQ7U0FDdkQsQ0FBQyxDQUFBO1FBQ0YsTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsa0JBQWtCLENBQUMsZUFBZSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMxRSxNQUFNLENBQUMsV0FBVyxDQUNqQixVQUFVLENBQUMsa0JBQWtCLENBQUMsZUFBZSxFQUFFLEdBQUcsQ0FDakQsVUFBVSxDQUFDLFlBQVksRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQ3hDLEVBQ0QsU0FBUyxDQUNULENBQUE7UUFDRCxNQUFNLENBQUMsZUFBZSxDQUNyQixVQUFVLENBQUMsa0JBQWtCLENBQUMsZUFBZSxFQUFFLEdBQUcsQ0FDakQsVUFBVSxDQUFDLFlBQVksRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQ3hDLEVBQ0QsQ0FBQyx1REFBdUQsQ0FBQyxDQUN6RCxDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUVKLElBQUksQ0FBQyw2RUFBNkUsRUFBRSxHQUFHLEVBQUUsQ0FDeEYsa0JBQWtCLENBQU8sRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDNUQsVUFBVSxDQUFDLG9CQUFvQixDQUFDLEtBQUssQ0FBQyxDQUFBO1FBRXRDLE1BQU0sV0FBVyxDQUFDLFNBQVMsQ0FDMUIsc0JBQXNCLENBQUMsY0FBYyxDQUFDLGdCQUFnQixFQUN0RCxRQUFRLENBQUMsVUFBVSxDQUNsQixnSkFBZ0osQ0FDaEosQ0FDRCxDQUFBO1FBQ0QsTUFBTSxpQkFBaUIsQ0FBQyxLQUFLLENBQzVCLHVCQUF1QixDQUFDLFlBQVksRUFBRSxDQUFDLGFBQWMsRUFDckQ7WUFDQztnQkFDQyxJQUFJLEVBQUUsQ0FBQyxVQUFVLENBQUM7Z0JBQ2xCLEtBQUssRUFBRSxFQUFFLHVEQUF1RCxFQUFFLGdCQUFnQixFQUFFO2FBQ3BGO1NBQ0QsRUFDRCxJQUFJLENBQ0osQ0FBQTtRQUNELE1BQU0sV0FBVyxDQUFDLFNBQVMsQ0FDMUIsUUFBUSxDQUFDLFVBQVUsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLFNBQVMsRUFBRSxlQUFlLENBQUMsRUFDOUUsUUFBUSxDQUFDLFVBQVUsQ0FDbEIsc0ZBQXNGLENBQ3RGLENBQ0QsQ0FBQTtRQUNELE1BQU0sVUFBVSxDQUFDLG1CQUFtQixFQUFFLENBQUE7UUFFdEMsTUFBTSxDQUFDLFdBQVcsQ0FDakIsVUFBVSxDQUFDLFFBQVEsQ0FBQyx1REFBdUQsRUFBRTtZQUM1RSxRQUFRLEVBQUUsVUFBVSxDQUFDLFlBQVksRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHO1NBQ2xELENBQUMsRUFDRixXQUFXLENBQ1gsQ0FBQTtRQUNELE1BQU0sQ0FBQyxXQUFXLENBQ2pCLFVBQVUsQ0FBQyxRQUFRLENBQUMsdURBQXVELEVBQUU7WUFDNUUsUUFBUSxFQUFFLFVBQVUsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRztTQUNsRCxDQUFDLEVBQ0YsV0FBVyxDQUNYLENBQUE7UUFDRCxNQUFNLENBQUMsRUFBRSxDQUNSLFVBQVUsQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUM3Qyx1REFBdUQsQ0FDdkQsQ0FDRCxDQUFBO1FBQ0QsTUFBTSxDQUFDLEVBQUUsQ0FDUixVQUFVLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FDN0MsdURBQXVELENBQ3ZELENBQ0QsQ0FBQTtRQUNELE1BQU0sQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLGtCQUFrQixDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUN0RSxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxrQkFBa0IsQ0FBQyxVQUFVLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDdkUsTUFBTSxDQUFDLGVBQWUsQ0FBQyxVQUFVLENBQUMsa0JBQWtCLENBQUMsU0FBUyxFQUFFO1lBQy9ELHVEQUF1RDtTQUN2RCxDQUFDLENBQUE7UUFDRixNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxrQkFBa0IsQ0FBQyxlQUFlLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzFFLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLFVBQVUsQ0FBQyxrQkFBa0IsQ0FBQyxlQUFlLEVBQUUsR0FBRyxDQUNqRCxVQUFVLENBQUMsWUFBWSxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FDeEMsRUFDRCxTQUFTLENBQ1QsQ0FBQTtRQUNELE1BQU0sQ0FBQyxlQUFlLENBQ3JCLFVBQVUsQ0FBQyxrQkFBa0IsQ0FBQyxlQUFlLEVBQUUsR0FBRyxDQUNqRCxVQUFVLENBQUMsWUFBWSxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FDeEMsRUFDRCxDQUFDLHVEQUF1RCxDQUFDLENBQ3pELENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQyxDQUFBO0lBRUosSUFBSSxDQUFDLGdDQUFnQyxFQUFFLEdBQUcsRUFBRSxDQUMzQyxrQkFBa0IsQ0FBTyxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsRUFBRSxLQUFLLElBQUksRUFBRTtRQUM1RCxNQUFNLEdBQUcsR0FBRywrQ0FBK0MsQ0FBQTtRQUMzRCxNQUFNLFdBQVcsQ0FBQyxTQUFTLENBQzFCLHNCQUFzQixDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsRUFDdEQsUUFBUSxDQUFDLFVBQVUsQ0FBQyxrRUFBa0UsQ0FBQyxDQUN2RixDQUFBO1FBQ0QsTUFBTSxpQkFBaUIsQ0FBQyxLQUFLLENBQzVCLHVCQUF1QixDQUFDLFlBQVksRUFBRSxDQUFDLGFBQWMsRUFDckQ7WUFDQztnQkFDQyxJQUFJLEVBQUUsQ0FBQyxVQUFVLENBQUM7Z0JBQ2xCLEtBQUssRUFBRSxFQUFFLCtDQUErQyxFQUFFLGdCQUFnQixFQUFFO2FBQzVFO1NBQ0QsRUFDRCxJQUFJLENBQ0osQ0FBQTtRQUNELE1BQU0sV0FBVyxDQUFDLFNBQVMsQ0FDMUIsUUFBUSxDQUFDLHVCQUF1QixDQUFDLFlBQVksRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsU0FBUyxFQUFFLGVBQWUsQ0FBQyxFQUMzRixRQUFRLENBQUMsVUFBVSxDQUNsQiw4RUFBOEUsQ0FDOUUsQ0FDRCxDQUFBO1FBQ0QsTUFBTSxXQUFXLENBQUMsU0FBUyxDQUMxQixRQUFRLENBQUMsdUJBQXVCLENBQUMsWUFBWSxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxTQUFTLEVBQUUsZUFBZSxDQUFDLEVBQzNGLFFBQVEsQ0FBQyxVQUFVLENBQ2xCLDhFQUE4RSxDQUM5RSxDQUNELENBQUE7UUFFRCxNQUFNLFVBQVUsQ0FBQyxtQkFBbUIsRUFBRSxDQUFBO1FBQ3RDLE1BQU0sVUFBVSxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUUsU0FBUyxFQUFFO1lBQzVDLFFBQVEsRUFBRSx1QkFBdUIsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRztTQUMvRCxDQUFDLENBQUE7UUFFRixJQUFJLE1BQU0sR0FBRyxVQUFVLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRTtZQUNwQyxRQUFRLEVBQUUsdUJBQXVCLENBQUMsWUFBWSxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUc7U0FDL0QsQ0FBQyxDQUFBO1FBQ0YsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQy9DLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLGNBQWMsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUNwRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxvQkFBb0IsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUUxRCxNQUFNLFVBQVUsQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFLFNBQVMsRUFBRTtZQUM1QyxRQUFRLEVBQUUsdUJBQXVCLENBQUMsWUFBWSxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUc7U0FDL0QsQ0FBQyxDQUFBO1FBQ0YsTUFBTSxHQUFHLFVBQVUsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFO1lBQ2hDLFFBQVEsRUFBRSx1QkFBdUIsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRztTQUMvRCxDQUFDLENBQUE7UUFDRixNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDL0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQ3BELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLG9CQUFvQixFQUFFLFNBQVMsQ0FBQyxDQUFBO0lBQzNELENBQUMsQ0FBQyxDQUFDLENBQUE7QUFDTCxDQUFDLENBQUMsQ0FBQTtBQUVGLEtBQUssQ0FBQywrQ0FBK0MsRUFBRSxHQUFHLEVBQUU7SUFDM0QsSUFBSSxVQUE0QixFQUMvQixNQUFXLEVBQ1gsdUJBQTRCLEVBQzVCLHNCQUEyQixFQUMzQixrQkFBOEMsRUFDOUMsd0JBQW9DLEVBQ3BDLG9CQUE4QyxFQUM5QyxXQUF5QixFQUN6QixrQkFBc0QsRUFDdEQsc0JBQStDLENBQUE7SUFDaEQsTUFBTSxlQUFlLEdBQUcscUJBQXFCLENBQUE7SUFDN0MsTUFBTSxxQkFBcUIsR0FBRyxRQUFRLENBQUMsRUFBRSxDQUN4Qyx1QkFBdUIsQ0FBQyxhQUFhLENBQ3JDLENBQUE7SUFDRCxNQUFNLFdBQVcsR0FBRyx1Q0FBdUMsRUFBRSxDQUFBO0lBRTdELFVBQVUsQ0FBQyxHQUFHLEVBQUU7UUFDZixxQkFBcUIsQ0FBQyxxQkFBcUIsQ0FBQztZQUMzQyxFQUFFLEVBQUUsT0FBTztZQUNYLElBQUksRUFBRSxRQUFRO1lBQ2QsVUFBVSxFQUFFO2dCQUNYLGdEQUFnRCxFQUFFO29CQUNqRCxJQUFJLEVBQUUsUUFBUTtvQkFDZCxPQUFPLEVBQUUsT0FBTztvQkFDaEIsS0FBSyx3Q0FBZ0M7aUJBQ3JDO2dCQUNELDRDQUE0QyxFQUFFO29CQUM3QyxJQUFJLEVBQUUsUUFBUTtvQkFDZCxPQUFPLEVBQUUsT0FBTztvQkFDaEIsS0FBSyxvQ0FBNEI7aUJBQ2pDO2dCQUNELHVEQUF1RCxFQUFFO29CQUN4RCxJQUFJLEVBQUUsUUFBUTtvQkFDZCxPQUFPLEVBQUUsT0FBTztvQkFDaEIsS0FBSyxnREFBd0M7aUJBQzdDO2dCQUNELHVEQUF1RCxFQUFFO29CQUN4RCxJQUFJLEVBQUUsUUFBUTtvQkFDZCxPQUFPLEVBQUUsT0FBTztvQkFDaEIsS0FBSyxnREFBd0M7aUJBQzdDO2dCQUNELHlDQUF5QyxFQUFFO29CQUMxQyxJQUFJLEVBQUUsUUFBUTtvQkFDZCxPQUFPLEVBQUUsT0FBTztvQkFDaEIsS0FBSyxxQ0FBNkI7aUJBQ2xDO2FBQ0Q7U0FDRCxDQUFDLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQTtJQUVGLEtBQUssQ0FBQyxLQUFLLElBQUksRUFBRTtRQUNoQixNQUFNLFVBQVUsR0FBRyxJQUFJLGNBQWMsRUFBRSxDQUFBO1FBQ3ZDLFdBQVcsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksV0FBVyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUE7UUFDMUQsa0JBQWtCLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLDBCQUEwQixFQUFFLENBQUMsQ0FBQTtRQUN0RSxXQUFXLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLGtCQUFrQixDQUFDLENBQUMsQ0FBQTtRQUU5RSxNQUFNLGVBQWUsR0FBRyxRQUFRLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQzlDLE1BQU0sR0FBRyxRQUFRLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBQzVCLE1BQU0sV0FBVyxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUN0QyxNQUFNLFdBQVcsQ0FBQyxZQUFZLENBQUMsZUFBZSxDQUFDLENBQUE7UUFDL0MsdUJBQXVCLEdBQUcsUUFBUSxDQUFDLElBQUksRUFBRSx1QkFBdUIsQ0FBQyxDQUFBO1FBQ2pFLHNCQUFzQixHQUFHLHVCQUF1QixDQUFDLElBQUksQ0FBQztZQUNyRCxNQUFNLEVBQUUsT0FBTyxDQUFDLFlBQVk7WUFDNUIsU0FBUyxFQUFFLGVBQWU7U0FDMUIsQ0FBQyxDQUFBO1FBRUYsb0JBQW9CLEdBQUcsNkJBQTZCLENBQUMsU0FBUyxFQUFFLFdBQVcsQ0FBQyxDQUFBO1FBQzVFLGtCQUFrQixHQUFHLHNCQUFzQixDQUFBO1FBQzNDLE1BQU0sd0JBQXdCLEdBQUcsSUFBSSxPQUFPLENBQzNDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLHdCQUF3QixHQUFHLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLFlBQVksRUFBRSxzQkFBc0IsRUFBRSxDQUFDLENBQUMsQ0FDckYsQ0FBQTtRQUNELE1BQU0sa0JBQWtCLEdBQUcsb0JBQW9CLENBQUMsSUFBSSxDQUFDLG1CQUFtQixFQUV2RSxFQUFFLGNBQWMsRUFBRSxHQUFHLEVBQUUsQ0FBQyx3QkFBd0IsRUFBRSxDQUFDLENBQUE7UUFDcEQsTUFBTSxrQkFBa0IsR0FBd0I7WUFDL0MsSUFBSSxFQUFFLEdBQUcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQy9CLEtBQUssRUFBRSxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFO1lBQzlCLE1BQU0sRUFBRSxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFO1lBQy9CLFlBQVksRUFBRSxHQUFHLEVBQUUsQ0FBQyxLQUFLO1NBQ3pCLENBQUE7UUFDRCxNQUFNLGtCQUFrQixHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxrQkFBa0IsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFBO1FBQy9FLE1BQU0sdUJBQXVCLEdBQUcsb0JBQW9CLENBQUMsSUFBSSxDQUN4RCx3QkFBd0IsRUFDeEIsV0FBVyxDQUFDLEdBQUcsQ0FDZCxJQUFJLHVCQUF1QixDQUMxQixrQkFBa0IsRUFDbEIsV0FBVyxFQUNYLGtCQUFrQixFQUNsQixVQUFVLENBQ1YsQ0FDRCxDQUNELENBQUE7UUFDRCxXQUFXLENBQUMsR0FBRyxDQUNkLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FDM0IsT0FBTyxDQUFDLGNBQWMsRUFDdEIsV0FBVyxDQUFDLEdBQUcsQ0FDZCxJQUFJLG9CQUFvQixDQUN2QixJQUFJLENBQUMsTUFBTSxFQUNYLGtCQUFrQixFQUNsQixPQUFPLENBQUMsY0FBYyxFQUN0Qix1QkFBdUIsRUFDdkIsa0JBQWtCLEVBQ2xCLElBQUksY0FBYyxFQUFFLENBQ3BCLENBQ0QsQ0FDRCxDQUNELENBQUE7UUFDRCxzQkFBc0IsR0FBRyxvQkFBb0IsQ0FBQyxJQUFJLENBQ2pELHVCQUF1QixFQUN2QixXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksc0JBQXNCLENBQUMsdUJBQXVCLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FDbkYsQ0FBQTtRQUNELFVBQVUsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUMzQixJQUFJLGdCQUFnQixDQUNuQixFQUFFLGtCQUFrQixFQUFFLGVBQWUsRUFBRSxFQUN2QyxrQkFBa0IsRUFDbEIsc0JBQXNCLEVBQ3RCLHVCQUF1QixFQUN2QixXQUFXLEVBQ1gsa0JBQWtCLEVBQ2xCLGtCQUFrQixFQUNsQixJQUFJLGNBQWMsRUFBRSxFQUNwQixJQUFJLGlCQUFpQixFQUFFLENBQ3ZCLENBQ0QsQ0FBQTtRQUNELG9CQUFvQixDQUFDLElBQUksQ0FBQyx3QkFBd0IsRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUMvRCxvQkFBb0IsQ0FBQyxJQUFJLENBQUMscUJBQXFCLEVBQUUsVUFBVSxDQUFDLENBQUE7UUFDNUQsb0JBQW9CLENBQUMsSUFBSSxDQUFDLG1CQUFtQixFQUFFLGtCQUFrQixDQUFDLENBQUE7UUFDbEUsb0JBQW9CLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxXQUFXLENBQUMsQ0FBQTtJQUNyRCxDQUFDLENBQUMsQ0FBQTtJQUVGLEtBQUssVUFBVSxVQUFVO1FBQ3hCLE1BQU0sVUFBVSxDQUFDLFVBQVUsQ0FBQyx5QkFBeUIsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO1FBQzlELG9CQUFvQixDQUFDLElBQUksQ0FDeEIsZ0JBQWdCLEVBQ2hCLFdBQVcsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FDekUsQ0FBQTtRQUNELG9CQUFvQixDQUFDLElBQUksQ0FDeEIsaUJBQWlCLEVBQ0UsQ0FDbEIsV0FBVyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUM5RSxDQUNELENBQUE7UUFDRCxvQkFBb0IsQ0FBQyxJQUFJLENBQ3hCLG1CQUFtQixFQUNuQixvQkFBb0IsQ0FBQyxjQUFjLENBQUMsa0JBQWtCLENBQUMsQ0FDdkQsQ0FBQTtRQUNELFVBQVUsQ0FBQywyQkFBMkIsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFBO0lBQzdELENBQUM7SUFFRCxTQUFTLGdDQUFnQztRQUN4QyxXQUFXLENBQUMsR0FBRyxDQUNkLG9CQUFvQjthQUNsQixHQUFHLENBQUMsWUFBWSxDQUFDO2FBQ2pCLGdCQUFnQixDQUNoQixPQUFPLENBQUMsWUFBWSxFQUNwQixJQUFJLHdCQUF3QixDQUFDLGtCQUFrQixFQUFFLGVBQWUsQ0FBQyxDQUNqRSxDQUNGLENBQUE7SUFDRixDQUFDO0lBRUQsU0FBUyw0Q0FBNEM7UUFDcEQsTUFBTSxVQUFVLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FDakMsb0JBQW9CLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDLGdDQUFnQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDN0UsSUFBSSxDQUFDLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyxZQUFZLEVBQUUsQ0FBQztnQkFDdkMsVUFBVSxDQUFDLE9BQU8sRUFBRSxDQUFBO2dCQUNwQixDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsZ0NBQWdDLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDekUsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7SUFDRixDQUFDO0lBRUQsSUFBSSxDQUFDLDBDQUEwQyxFQUFFLEdBQUcsRUFBRSxDQUNyRCxrQkFBa0IsQ0FBTyxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsRUFBRSxLQUFLLElBQUksRUFBRTtRQUM1RCxNQUFNLFdBQVcsQ0FBQyxTQUFTLENBQzFCLHVCQUF1QixFQUN2QixRQUFRLENBQUMsVUFBVSxDQUFDLGlFQUFpRSxDQUFDLENBQ3RGLENBQUE7UUFDRCxnQ0FBZ0MsRUFBRSxDQUFBO1FBQ2xDLHdCQUF3QixFQUFFLENBQUE7UUFDMUIsTUFBTSxVQUFVLEVBQUUsQ0FBQTtRQUNsQixNQUFNLENBQUMsV0FBVyxDQUNqQixVQUFVLENBQUMsUUFBUSxDQUFDLDRDQUE0QyxDQUFDLEVBQ2pFLGFBQWEsQ0FDYixDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUVKLElBQUksQ0FBQyw0RkFBNEYsRUFBRSxHQUFHLEVBQUUsQ0FDdkcsa0JBQWtCLENBQU8sRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDNUQsTUFBTSxXQUFXLENBQUMsU0FBUyxDQUMxQix1QkFBdUIsRUFDdkIsUUFBUSxDQUFDLFVBQVUsQ0FBQyxpRUFBaUUsQ0FBQyxDQUN0RixDQUFBO1FBQ0Qsd0JBQXdCLEVBQUUsQ0FBQTtRQUMxQiw0Q0FBNEMsRUFBRSxDQUFBO1FBQzlDLE1BQU0sVUFBVSxFQUFFLENBQUE7UUFDbEIsTUFBTSxDQUFDLFdBQVcsQ0FDakIsVUFBVSxDQUFDLFFBQVEsQ0FBQyw0Q0FBNEMsQ0FBQyxFQUNqRSxhQUFhLENBQ2IsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFFSixJQUFJLENBQUMsK0VBQStFLEVBQUUsR0FBRyxFQUFFLENBQzFGLGtCQUFrQixDQUFPLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzVELE1BQU0sV0FBVyxDQUFDLFNBQVMsQ0FDMUIsdUJBQXVCLEVBQ3ZCLFFBQVEsQ0FBQyxVQUFVLENBQUMsaUVBQWlFLENBQUMsQ0FDdEYsQ0FBQTtRQUNELGdDQUFnQyxFQUFFLENBQUE7UUFDbEMsTUFBTSxVQUFVLEVBQUUsQ0FBQTtRQUNsQixNQUFNLE9BQU8sR0FBRyxJQUFJLE9BQU8sQ0FBTyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUMxQyxXQUFXLENBQUMsR0FBRyxDQUNkLFVBQVUsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFO2dCQUM3QyxJQUFJLENBQUM7b0JBQ0osTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsTUFBTSxtQ0FBMkIsQ0FBQTtvQkFDMUQsTUFBTSxDQUFDLGVBQWUsQ0FDckIsQ0FBQyxHQUFHLEtBQUssQ0FBQyxZQUFZLENBQUMsRUFDdkIsQ0FBQyw0Q0FBNEMsQ0FBQyxDQUM5QyxDQUFBO29CQUNELE1BQU0sQ0FBQyxXQUFXLENBQ2pCLFVBQVUsQ0FBQyxRQUFRLENBQUMsNENBQTRDLENBQUMsRUFDakUsYUFBYSxDQUNiLENBQUE7b0JBQ0QsQ0FBQyxFQUFFLENBQUE7Z0JBQ0osQ0FBQztnQkFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO29CQUNoQixDQUFDLENBQUMsS0FBSyxDQUFDLENBQUE7Z0JBQ1QsQ0FBQztZQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFDRixDQUFDLENBQUMsQ0FBQTtRQUNGLHdCQUF3QixFQUFFLENBQUE7UUFDMUIsT0FBTyxPQUFPLENBQUE7SUFDZixDQUFDLENBQUMsQ0FBQyxDQUFBO0lBRUosSUFBSSxDQUFDLHVIQUF1SCxFQUFFLEdBQUcsRUFBRSxDQUNsSSxrQkFBa0IsQ0FBTyxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsRUFBRSxLQUFLLElBQUksRUFBRTtRQUM1RCxNQUFNLFdBQVcsQ0FBQyxTQUFTLENBQzFCLHVCQUF1QixFQUN2QixRQUFRLENBQUMsVUFBVSxDQUFDLGlFQUFpRSxDQUFDLENBQ3RGLENBQUE7UUFDRCw0Q0FBNEMsRUFBRSxDQUFBO1FBQzlDLE1BQU0sVUFBVSxFQUFFLENBQUE7UUFDbEIsTUFBTSxPQUFPLEdBQUcsSUFBSSxPQUFPLENBQU8sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDMUMsV0FBVyxDQUFDLEdBQUcsQ0FDZCxVQUFVLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRTtnQkFDN0MsSUFBSSxDQUFDO29CQUNKLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLE1BQU0sbUNBQTJCLENBQUE7b0JBQzFELE1BQU0sQ0FBQyxlQUFlLENBQ3JCLENBQUMsR0FBRyxLQUFLLENBQUMsWUFBWSxDQUFDLEVBQ3ZCLENBQUMsNENBQTRDLENBQUMsQ0FDOUMsQ0FBQTtvQkFDRCxNQUFNLENBQUMsV0FBVyxDQUNqQixVQUFVLENBQUMsUUFBUSxDQUFDLDRDQUE0QyxDQUFDLEVBQ2pFLGFBQWEsQ0FDYixDQUFBO29CQUNELENBQUMsRUFBRSxDQUFBO2dCQUNKLENBQUM7Z0JBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztvQkFDaEIsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFBO2dCQUNULENBQUM7WUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO1FBQ0YsQ0FBQyxDQUFDLENBQUE7UUFDRix3QkFBd0IsRUFBRSxDQUFBO1FBQzFCLE9BQU8sT0FBTyxDQUFBO0lBQ2YsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUVKLElBQUksQ0FBQyxvRUFBb0UsRUFBRSxHQUFHLEVBQUUsQ0FDL0Usa0JBQWtCLENBQU8sRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDNUQsTUFBTSxXQUFXLENBQUMsU0FBUyxDQUMxQixzQkFBc0IsQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLEVBQ3RELFFBQVEsQ0FBQyxVQUFVLENBQUMsaUVBQWlFLENBQUMsQ0FDdEYsQ0FBQTtRQUNELGdDQUFnQyxFQUFFLENBQUE7UUFDbEMsd0JBQXdCLEVBQUUsQ0FBQTtRQUMxQixNQUFNLFVBQVUsRUFBRSxDQUFBO1FBQ2xCLE1BQU0sQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyw0Q0FBNEMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFBO0lBQy9GLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFFSixJQUFJLENBQUMsc0RBQXNELEVBQUUsR0FBRyxFQUFFLENBQ2pFLGtCQUFrQixDQUFPLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzVELE1BQU0sV0FBVyxDQUFDLFNBQVMsQ0FDMUIsdUJBQXVCLEVBQ3ZCLFFBQVEsQ0FBQyxVQUFVLENBQ2xCLDRFQUE0RSxDQUM1RSxDQUNELENBQUE7UUFDRCxnQ0FBZ0MsRUFBRSxDQUFBO1FBQ2xDLHdCQUF3QixFQUFFLENBQUE7UUFDMUIsTUFBTSxVQUFVLEVBQUUsQ0FBQTtRQUNsQixNQUFNLENBQUMsV0FBVyxDQUNqQixVQUFVLENBQUMsUUFBUSxDQUFDLHVEQUF1RCxDQUFDLEVBQzVFLGFBQWEsQ0FDYixDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUVKLElBQUksQ0FBQyx3R0FBd0csRUFBRSxHQUFHLEVBQUUsQ0FDbkgsa0JBQWtCLENBQU8sRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDNUQsTUFBTSxXQUFXLENBQUMsU0FBUyxDQUMxQix1QkFBdUIsRUFDdkIsUUFBUSxDQUFDLFVBQVUsQ0FDbEIsNEVBQTRFLENBQzVFLENBQ0QsQ0FBQTtRQUNELHdCQUF3QixFQUFFLENBQUE7UUFDMUIsNENBQTRDLEVBQUUsQ0FBQTtRQUM5QyxNQUFNLFVBQVUsRUFBRSxDQUFBO1FBQ2xCLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLFVBQVUsQ0FBQyxRQUFRLENBQUMsdURBQXVELENBQUMsRUFDNUUsYUFBYSxDQUNiLENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQyxDQUFBO0lBRUosSUFBSSxDQUFDLDJGQUEyRixFQUFFLEdBQUcsRUFBRSxDQUN0RyxrQkFBa0IsQ0FBTyxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsRUFBRSxLQUFLLElBQUksRUFBRTtRQUM1RCxNQUFNLFdBQVcsQ0FBQyxTQUFTLENBQzFCLHVCQUF1QixFQUN2QixRQUFRLENBQUMsVUFBVSxDQUNsQiw0RUFBNEUsQ0FDNUUsQ0FDRCxDQUFBO1FBQ0QsZ0NBQWdDLEVBQUUsQ0FBQTtRQUNsQyxNQUFNLFVBQVUsRUFBRSxDQUFBO1FBQ2xCLE1BQU0sT0FBTyxHQUFHLElBQUksT0FBTyxDQUFPLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQzFDLFdBQVcsQ0FBQyxHQUFHLENBQ2QsVUFBVSxDQUFDLHdCQUF3QixDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUU7Z0JBQzdDLElBQUksQ0FBQztvQkFDSixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxNQUFNLG1DQUEyQixDQUFBO29CQUMxRCxNQUFNLENBQUMsZUFBZSxDQUNyQixDQUFDLEdBQUcsS0FBSyxDQUFDLFlBQVksQ0FBQyxFQUN2QixDQUFDLHVEQUF1RCxDQUFDLENBQ3pELENBQUE7b0JBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FDakIsVUFBVSxDQUFDLFFBQVEsQ0FBQyx1REFBdUQsQ0FBQyxFQUM1RSxhQUFhLENBQ2IsQ0FBQTtvQkFDRCxDQUFDLEVBQUUsQ0FBQTtnQkFDSixDQUFDO2dCQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7b0JBQ2hCLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQTtnQkFDVCxDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUNGLENBQUMsQ0FBQyxDQUFBO1FBQ0Ysd0JBQXdCLEVBQUUsQ0FBQTtRQUMxQixPQUFPLE9BQU8sQ0FBQTtJQUNmLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFFSixJQUFJLENBQUMsMklBQTJJLEVBQUUsR0FBRyxFQUFFLENBQ3RKLGtCQUFrQixDQUFPLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzVELE1BQU0sV0FBVyxDQUFDLFNBQVMsQ0FDMUIsdUJBQXVCLEVBQ3ZCLFFBQVEsQ0FBQyxVQUFVLENBQ2xCLDRFQUE0RSxDQUM1RSxDQUNELENBQUE7UUFDRCw0Q0FBNEMsRUFBRSxDQUFBO1FBQzlDLE1BQU0sVUFBVSxFQUFFLENBQUE7UUFDbEIsTUFBTSxPQUFPLEdBQUcsSUFBSSxPQUFPLENBQU8sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDMUMsV0FBVyxDQUFDLEdBQUcsQ0FDZCxVQUFVLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRTtnQkFDN0MsSUFBSSxDQUFDO29CQUNKLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLE1BQU0sbUNBQTJCLENBQUE7b0JBQzFELE1BQU0sQ0FBQyxlQUFlLENBQ3JCLENBQUMsR0FBRyxLQUFLLENBQUMsWUFBWSxDQUFDLEVBQ3ZCLENBQUMsdURBQXVELENBQUMsQ0FDekQsQ0FBQTtvQkFDRCxNQUFNLENBQUMsV0FBVyxDQUNqQixVQUFVLENBQUMsUUFBUSxDQUFDLHVEQUF1RCxDQUFDLEVBQzVFLGFBQWEsQ0FDYixDQUFBO29CQUNELENBQUMsRUFBRSxDQUFBO2dCQUNKLENBQUM7Z0JBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztvQkFDaEIsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFBO2dCQUNULENBQUM7WUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO1FBQ0YsQ0FBQyxDQUFDLENBQUE7UUFDRix3QkFBd0IsRUFBRSxDQUFBO1FBQzFCLE9BQU8sT0FBTyxDQUFBO0lBQ2YsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUVKLElBQUksQ0FBQyxnRkFBZ0YsRUFBRSxHQUFHLEVBQUUsQ0FDM0Ysa0JBQWtCLENBQU8sRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDNUQsTUFBTSxXQUFXLENBQUMsU0FBUyxDQUMxQixzQkFBc0IsQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLEVBQ3RELFFBQVEsQ0FBQyxVQUFVLENBQ2xCLDRFQUE0RSxDQUM1RSxDQUNELENBQUE7UUFDRCxnQ0FBZ0MsRUFBRSxDQUFBO1FBQ2xDLHdCQUF3QixFQUFFLENBQUE7UUFDMUIsTUFBTSxVQUFVLEVBQUUsQ0FBQTtRQUNsQixNQUFNLENBQUMsV0FBVyxDQUNqQixVQUFVLENBQUMsUUFBUSxDQUFDLHVEQUF1RCxDQUFDLEVBQzVFLE9BQU8sQ0FDUCxDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUVKLElBQUksQ0FBQyxnRkFBZ0YsRUFBRSxHQUFHLEVBQUUsQ0FDM0Ysa0JBQWtCLENBQU8sRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDNUQsTUFBTSxXQUFXLENBQUMsU0FBUyxDQUMxQixzQkFBc0IsQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLEVBQ3RELFFBQVEsQ0FBQyxVQUFVLENBQ2xCLDRFQUE0RSxDQUM1RSxDQUNELENBQUE7UUFDRCxnQ0FBZ0MsRUFBRSxDQUFBO1FBQ2xDLHdCQUF3QixFQUFFLENBQUE7UUFDMUIsTUFBTSxVQUFVLEVBQUUsQ0FBQTtRQUNsQixNQUFNLENBQUMsV0FBVyxDQUNqQixVQUFVLENBQUMsUUFBUSxDQUFDLHVEQUF1RCxDQUFDLEVBQzVFLE9BQU8sQ0FDUCxDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUVKLElBQUksQ0FBQyxrREFBa0QsRUFBRSxHQUFHLEVBQUUsQ0FDN0Qsa0JBQWtCLENBQU8sRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDNUQsZ0NBQWdDLEVBQUUsQ0FBQTtRQUNsQyx3QkFBd0IsRUFBRSxDQUFBO1FBQzFCLE1BQU0sVUFBVSxFQUFFLENBQUE7UUFDbEIsTUFBTSxVQUFVLENBQUMsV0FBVyxDQUMzQixnREFBZ0QsRUFDaEQsa0JBQWtCLENBQ2xCLENBQUE7UUFDRCxNQUFNLFVBQVUsQ0FBQyxtQkFBbUIsRUFBRSxDQUFBO1FBQ3RDLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLFVBQVUsQ0FBQyxPQUFPLENBQUMsZ0RBQWdELENBQUMsQ0FBQyxjQUFjLEVBQ25GLGtCQUFrQixDQUNsQixDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUVKLElBQUksQ0FBQywrQ0FBK0MsRUFBRSxHQUFHLEVBQUUsQ0FDMUQsa0JBQWtCLENBQU8sRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDNUQsZ0NBQWdDLEVBQUUsQ0FBQTtRQUNsQyx3QkFBd0IsRUFBRSxDQUFBO1FBQzFCLE1BQU0sVUFBVSxFQUFFLENBQUE7UUFDbEIsTUFBTSxVQUFVLENBQUMsV0FBVyxDQUFDLDRDQUE0QyxFQUFFLGNBQWMsQ0FBQyxDQUFBO1FBQzFGLE1BQU0sVUFBVSxDQUFDLG1CQUFtQixFQUFFLENBQUE7UUFDdEMsTUFBTSxDQUFDLFdBQVcsQ0FDakIsVUFBVSxDQUFDLE9BQU8sQ0FBQyw0Q0FBNEMsQ0FBQyxDQUFDLGVBQWUsRUFDaEYsY0FBYyxDQUNkLENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQyxDQUFBO0lBRUosSUFBSSxDQUFDLDJEQUEyRCxFQUFFLEdBQUcsRUFBRSxDQUN0RSxrQkFBa0IsQ0FBTyxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsRUFBRSxLQUFLLElBQUksRUFBRTtRQUM1RCxnQ0FBZ0MsRUFBRSxDQUFBO1FBQ2xDLHdCQUF3QixFQUFFLENBQUE7UUFDMUIsTUFBTSxVQUFVLEVBQUUsQ0FBQTtRQUNsQixNQUFNLFVBQVUsQ0FBQyxXQUFXLENBQzNCLHVEQUF1RCxFQUN2RCxjQUFjLENBQ2QsQ0FBQTtRQUNELE1BQU0sVUFBVSxDQUFDLG1CQUFtQixFQUFFLENBQUE7UUFDdEMsTUFBTSxNQUFNLEdBQUcsVUFBVSxDQUFDLE9BQU8sQ0FBQyx1REFBdUQsQ0FBQyxDQUFBO1FBQzFGLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLGVBQWUsRUFBRSxjQUFjLENBQUMsQ0FBQTtJQUMzRCxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBRUosSUFBSSxDQUFDLDJEQUEyRCxFQUFFLEdBQUcsRUFBRSxDQUN0RSxrQkFBa0IsQ0FBTyxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsRUFBRSxLQUFLLElBQUksRUFBRTtRQUM1RCxnQ0FBZ0MsRUFBRSxDQUFBO1FBQ2xDLHdCQUF3QixFQUFFLENBQUE7UUFDMUIsTUFBTSxVQUFVLEVBQUUsQ0FBQTtRQUNsQixNQUFNLFVBQVUsQ0FBQyxXQUFXLENBQzNCLHVEQUF1RCxFQUN2RCxjQUFjLENBQ2QsQ0FBQTtRQUNELE1BQU0sVUFBVSxDQUFDLG1CQUFtQixFQUFFLENBQUE7UUFDdEMsTUFBTSxDQUFDLFdBQVcsQ0FDakIsVUFBVSxDQUFDLE9BQU8sQ0FBQyx1REFBdUQsQ0FBQyxDQUFDLGVBQWUsRUFDM0YsY0FBYyxDQUNkLENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQyxDQUFBO0lBRUosSUFBSSxDQUFDLGtHQUFrRyxFQUFFLEdBQUcsRUFBRSxDQUM3RyxrQkFBa0IsQ0FBTyxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsRUFBRSxLQUFLLElBQUksRUFBRTtRQUM1RCxNQUFNLFdBQVcsQ0FBQyxTQUFTLENBQzFCLHNCQUFzQixDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsRUFDdEQsUUFBUSxDQUFDLFVBQVUsQ0FBQyxrRUFBa0UsQ0FBQyxDQUN2RixDQUFBO1FBQ0QsZ0NBQWdDLEVBQUUsQ0FBQTtRQUNsQyx3QkFBd0IsRUFBRSxDQUFBO1FBQzFCLE1BQU0sVUFBVSxFQUFFLENBQUE7UUFDbEIscUJBQXFCLENBQUMscUJBQXFCLENBQUM7WUFDM0MsRUFBRSxFQUFFLE9BQU87WUFDWCxJQUFJLEVBQUUsUUFBUTtZQUNkLFVBQVUsRUFBRTtnQkFDWCwrQ0FBK0MsRUFBRTtvQkFDaEQsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsT0FBTyxFQUFFLE9BQU87b0JBQ2hCLEtBQUssb0NBQTRCO2lCQUNqQzthQUNEO1NBQ0QsQ0FBQyxDQUFBO1FBQ0YsTUFBTSxDQUFDLFdBQVcsQ0FDakIsVUFBVSxDQUFDLFFBQVEsQ0FBQywrQ0FBK0MsQ0FBQyxFQUNwRSxPQUFPLENBQ1AsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFFSixJQUFJLENBQUMsK0dBQStHLEVBQUUsR0FBRyxFQUFFLENBQzFILGtCQUFrQixDQUFPLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzVELE1BQU0sV0FBVyxDQUFDLFNBQVMsQ0FDMUIsc0JBQXNCLENBQUMsY0FBYyxDQUFDLGdCQUFnQixFQUN0RCxRQUFRLENBQUMsVUFBVSxDQUNsQiw2RUFBNkUsQ0FDN0UsQ0FDRCxDQUFBO1FBQ0QsZ0NBQWdDLEVBQUUsQ0FBQTtRQUNsQyx3QkFBd0IsRUFBRSxDQUFBO1FBQzFCLE1BQU0sVUFBVSxFQUFFLENBQUE7UUFDbEIscUJBQXFCLENBQUMscUJBQXFCLENBQUM7WUFDM0MsRUFBRSxFQUFFLE9BQU87WUFDWCxJQUFJLEVBQUUsUUFBUTtZQUNkLFVBQVUsRUFBRTtnQkFDWCwwREFBMEQsRUFBRTtvQkFDM0QsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsT0FBTyxFQUFFLE9BQU87b0JBQ2hCLEtBQUssZ0RBQXdDO2lCQUM3QzthQUNEO1NBQ0QsQ0FBQyxDQUFBO1FBQ0YsTUFBTSxDQUFDLFdBQVcsQ0FDakIsVUFBVSxDQUFDLFFBQVEsQ0FBQywwREFBMEQsQ0FBQyxFQUMvRSxPQUFPLENBQ1AsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFDLENBQUE7QUFDTCxDQUFDLENBQUMsQ0FBQTtBQUVGLFNBQVMsY0FBYyxDQUFDLFVBQWU7SUFDdEMsSUFBSSxtQkFBbUIsR0FBRyxVQUFVLENBQUMsUUFBUSxFQUFFLENBQUE7SUFDL0MsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2QsbUJBQW1CLEdBQUcsbUJBQW1CLENBQUMsV0FBVyxFQUFFLENBQUEsQ0FBQyxvQ0FBb0M7SUFDN0YsQ0FBQztJQUNELE9BQU8sSUFBSSxDQUFDLG1CQUFtQixDQUFDLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFBO0FBQzlDLENBQUM7QUFFRCxTQUFTLHNCQUFzQixDQUFDLFVBQWU7SUFDOUMsT0FBTztRQUNOLFVBQVU7UUFDVixFQUFFLEVBQUUsY0FBYyxDQUFDLFVBQVUsQ0FBQztLQUM5QixDQUFBO0FBQ0YsQ0FBQyJ9