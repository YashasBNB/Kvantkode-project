/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { FileService } from '../../../../../platform/files/common/fileService.js';
import { Schemas } from '../../../../../base/common/network.js';
import { InMemoryFileSystemProvider } from '../../../../../platform/files/common/inMemoryFilesystemProvider.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { EditSessionsContribution } from '../../browser/editSessions.contribution.js';
import { ProgressService } from '../../../../services/progress/browser/progressService.js';
import { IProgressService } from '../../../../../platform/progress/common/progress.js';
import { ISCMService } from '../../../scm/common/scm.js';
import { SCMService } from '../../../scm/common/scmService.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IWorkspaceContextService, } from '../../../../../platform/workspace/common/workspace.js';
import { mock } from '../../../../../base/test/common/mock.js';
import * as sinon from 'sinon';
import assert from 'assert';
import { ChangeType, FileType, IEditSessionsLogService, IEditSessionsStorageService, } from '../../common/editSessions.js';
import { URI } from '../../../../../base/common/uri.js';
import { joinPath } from '../../../../../base/common/resources.js';
import { INotificationService } from '../../../../../platform/notification/common/notification.js';
import { TestNotificationService } from '../../../../../platform/notification/test/common/testNotificationService.js';
import { TestEnvironmentService } from '../../../../test/browser/workbenchTestServices.js';
import { IEnvironmentService } from '../../../../../platform/environment/common/environment.js';
import { MockContextKeyService } from '../../../../../platform/keybinding/test/common/mockKeybindingService.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { IThemeService } from '../../../../../platform/theme/common/themeService.js';
import { Event } from '../../../../../base/common/event.js';
import { IViewDescriptorService } from '../../../../common/views.js';
import { ITextModelService } from '../../../../../editor/common/services/resolverService.js';
import { ILifecycleService } from '../../../../services/lifecycle/common/lifecycle.js';
import { IDialogService } from '../../../../../platform/dialogs/common/dialogs.js';
import { IEditorService, } from '../../../../services/editor/common/editorService.js';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { NullTelemetryService } from '../../../../../platform/telemetry/common/telemetryUtils.js';
import { IRemoteAgentService } from '../../../../services/remote/common/remoteAgentService.js';
import { IExtensionService } from '../../../../services/extensions/common/extensions.js';
import { IEditSessionIdentityService } from '../../../../../platform/workspace/common/editSessions.js';
import { IUserDataProfilesService } from '../../../../../platform/userDataProfile/common/userDataProfile.js';
import { IProductService } from '../../../../../platform/product/common/productService.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { TestStorageService } from '../../../../test/common/workbenchTestServices.js';
import { IUriIdentityService } from '../../../../../platform/uriIdentity/common/uriIdentity.js';
import { UriIdentityService } from '../../../../../platform/uriIdentity/common/uriIdentityService.js';
import { IWorkspaceIdentityService, WorkspaceIdentityService, } from '../../../../services/workspaces/common/workspaceIdentityService.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
const folderName = 'test-folder';
const folderUri = URI.file(`/${folderName}`);
suite('Edit session sync', () => {
    let instantiationService;
    let editSessionsContribution;
    let fileService;
    let sandbox;
    const disposables = new DisposableStore();
    suiteSetup(() => {
        sandbox = sinon.createSandbox();
        instantiationService = new TestInstantiationService();
        // Set up filesystem
        const logService = new NullLogService();
        fileService = disposables.add(new FileService(logService));
        const fileSystemProvider = disposables.add(new InMemoryFileSystemProvider());
        fileService.registerProvider(Schemas.file, fileSystemProvider);
        // Stub out all services
        instantiationService.stub(IEditSessionsLogService, logService);
        instantiationService.stub(IFileService, fileService);
        instantiationService.stub(ILifecycleService, new (class extends mock() {
            constructor() {
                super(...arguments);
                this.onWillShutdown = Event.None;
            }
        })());
        instantiationService.stub(INotificationService, new TestNotificationService());
        instantiationService.stub(IProductService, {
            'editSessions.store': {
                url: 'https://test.com',
                canSwitch: true,
                authenticationProviders: {},
            },
        });
        instantiationService.stub(IStorageService, new TestStorageService());
        instantiationService.stub(IUriIdentityService, new UriIdentityService(fileService));
        instantiationService.stub(IEditSessionsStorageService, new (class extends mock() {
            constructor() {
                super(...arguments);
                this.onDidSignIn = Event.None;
                this.onDidSignOut = Event.None;
            }
        })());
        instantiationService.stub(IExtensionService, new (class extends mock() {
            constructor() {
                super(...arguments);
                this.onDidChangeExtensions = Event.None;
            }
        })());
        instantiationService.stub(IProgressService, ProgressService);
        instantiationService.stub(ISCMService, SCMService);
        instantiationService.stub(IEnvironmentService, TestEnvironmentService);
        instantiationService.stub(ITelemetryService, NullTelemetryService);
        instantiationService.stub(IDialogService, new (class extends mock() {
            async prompt(prompt) {
                const result = prompt.buttons?.[0].run({ checkboxChecked: false });
                return { result };
            }
            async confirm() {
                return { confirmed: false };
            }
        })());
        instantiationService.stub(IRemoteAgentService, new (class extends mock() {
            async getEnvironment() {
                return null;
            }
        })());
        instantiationService.stub(IConfigurationService, new TestConfigurationService({
            workbench: { experimental: { editSessions: { enabled: true } } },
        }));
        instantiationService.stub(IWorkspaceContextService, new (class extends mock() {
            getWorkspace() {
                return {
                    id: 'workspace-id',
                    folders: [
                        {
                            uri: folderUri,
                            name: folderName,
                            index: 0,
                            toResource: (relativePath) => joinPath(folderUri, relativePath),
                        },
                    ],
                };
            }
            getWorkbenchState() {
                return 2 /* WorkbenchState.FOLDER */;
            }
        })());
        // Stub repositories
        instantiationService.stub(ISCMService, '_repositories', new Map());
        instantiationService.stub(IContextKeyService, new MockContextKeyService());
        instantiationService.stub(IThemeService, new (class extends mock() {
            constructor() {
                super(...arguments);
                this.onDidColorThemeChange = Event.None;
                this.onDidFileIconThemeChange = Event.None;
            }
        })());
        instantiationService.stub(IViewDescriptorService, {
            onDidChangeLocation: Event.None,
        });
        instantiationService.stub(ITextModelService, new (class extends mock() {
            constructor() {
                super(...arguments);
                this.registerTextModelContentProvider = () => ({ dispose: () => { } });
            }
        })());
        instantiationService.stub(IEditorService, new (class extends mock() {
            constructor() {
                super(...arguments);
                this.saveAll = async (_options) => {
                    return { success: true, editors: [] };
                };
            }
        })());
        instantiationService.stub(IEditSessionIdentityService, new (class extends mock() {
            async getEditSessionIdentifier() {
                return 'test-identity';
            }
        })());
        instantiationService.set(IWorkspaceIdentityService, instantiationService.createInstance(WorkspaceIdentityService));
        instantiationService.stub(IUserDataProfilesService, new (class extends mock() {
            constructor() {
                super(...arguments);
                this.defaultProfile = {
                    id: 'default',
                    name: 'Default',
                    isDefault: true,
                    location: URI.file('location'),
                    globalStorageHome: URI.file('globalStorageHome'),
                    settingsResource: URI.file('settingsResource'),
                    keybindingsResource: URI.file('keybindingsResource'),
                    tasksResource: URI.file('tasksResource'),
                    snippetsHome: URI.file('snippetsHome'),
                    promptsHome: URI.file('promptsHome'),
                    extensionsResource: URI.file('extensionsResource'),
                    cacheHome: URI.file('cacheHome'),
                };
            }
        })());
        editSessionsContribution = instantiationService.createInstance(EditSessionsContribution);
    });
    teardown(() => {
        sinon.restore();
        disposables.clear();
    });
    suiteTeardown(() => {
        disposables.dispose();
    });
    test('Can apply edit session', async function () {
        const fileUri = joinPath(folderUri, 'dir1', 'README.md');
        const fileContents = '# readme';
        const editSession = {
            version: 1,
            folders: [
                {
                    name: folderName,
                    workingChanges: [
                        {
                            relativeFilePath: 'dir1/README.md',
                            fileType: FileType.File,
                            contents: fileContents,
                            type: ChangeType.Addition,
                        },
                    ],
                },
            ],
        };
        // Stub sync service to return edit session data
        const readStub = sandbox.stub().returns({ content: JSON.stringify(editSession), ref: '0' });
        instantiationService.stub(IEditSessionsStorageService, 'read', readStub);
        // Create root folder
        await fileService.createFolder(folderUri);
        // Resume edit session
        await editSessionsContribution.resumeEditSession();
        // Verify edit session was correctly applied
        assert.equal((await fileService.readFile(fileUri)).value.toString(), fileContents);
    });
    test('Edit session not stored if there are no edits', async function () {
        const writeStub = sandbox.stub();
        instantiationService.stub(IEditSessionsStorageService, 'write', writeStub);
        // Create root folder
        await fileService.createFolder(folderUri);
        await editSessionsContribution.storeEditSession(true, CancellationToken.None);
        // Verify that we did not attempt to write the edit session
        assert.equal(writeStub.called, false);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdFNlc3Npb25zLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2VkaXRTZXNzaW9ucy90ZXN0L2Jyb3dzZXIvZWRpdFNlc3Npb25zLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUM1RSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scURBQXFELENBQUE7QUFDakYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9ELE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLG9FQUFvRSxDQUFBO0FBQy9HLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxDQUFBO0FBQ3hILE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNyRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDMUYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0scURBQXFELENBQUE7QUFDdEYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQ3hELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQTtBQUN4SCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNyRyxPQUFPLEVBQ04sd0JBQXdCLEdBRXhCLE1BQU0sdURBQXVELENBQUE7QUFDOUQsT0FBTyxF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