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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvblNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9jb25maWd1cmF0aW9uL3Rlc3QvYnJvd3Nlci9jb25maWd1cmF0aW9uU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEtBQUssS0FBSyxNQUFNLE9BQU8sQ0FBQTtBQUM5QixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdkQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQzlFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFBO0FBQy9GLE9BQU8sRUFFTixVQUFVLElBQUksdUJBQXVCLEVBRXJDLDBCQUEwQixHQUMxQixNQUFNLHVFQUF1RSxDQUFBO0FBQzlFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBRXhFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUM1RSxPQUFPLEVBQ04sd0JBQXdCLEdBS3hCLE1BQU0sdURBQXVELENBQUE7QUFDOUQsT0FBTyxFQUVOLHFCQUFxQixHQUVyQixNQUFNLCtEQUErRCxDQUFBO0FBQ3RFLE9BQU8sRUFDTiw2QkFBNkIsRUFDN0Isd0JBQXdCLEVBQ3hCLHNCQUFzQixFQUN0QixtQkFBbUIsR0FDbkIsTUFBTSxtREFBbUQsQ0FBQTtBQUUxRCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUM1RixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrREFB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