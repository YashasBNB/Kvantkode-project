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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdFNlc3Npb25zLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9lZGl0U2Vzc2lvbnMvdGVzdC9icm93c2VyL2VkaXRTZXNzaW9ucy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDNUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxvRUFBb0UsQ0FBQTtBQUMvRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQTtBQUN4SCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDMUUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDckYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQzFGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDOUQsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUE7QUFDeEgsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDckcsT0FBTyxFQUNOLHdCQUF3QixHQUV4QixNQUFNLHVEQUF1RCxDQUFBO0FBQzlELE9BQU8sRUFBRSxJ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