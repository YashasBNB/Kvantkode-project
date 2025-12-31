/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Event } from '../../../../base/common/event.js';
import { DisposableStore, ImmortalReference, } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { mock } from '../../../../base/test/common/mock.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { IBulkEditService } from '../../../../editor/browser/services/bulkEditService.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { EditOperation } from '../../../../editor/common/core/editOperation.js';
import { Position } from '../../../../editor/common/core/position.js';
import { Range } from '../../../../editor/common/core/range.js';
import { IEditorWorkerService } from '../../../../editor/common/services/editorWorker.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ModelService } from '../../../../editor/common/services/modelService.js';
import { ITextModelService, } from '../../../../editor/common/services/resolverService.js';
import { TestCodeEditorService } from '../../../../editor/test/browser/editorTestServices.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../platform/configuration/test/common/testConfigurationService.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { TestDialogService } from '../../../../platform/dialogs/test/common/testDialogService.js';
import { IEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { InstantiationService } from '../../../../platform/instantiation/common/instantiationService.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { ILogService, NullLogService } from '../../../../platform/log/common/log.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { TestNotificationService } from '../../../../platform/notification/test/common/testNotificationService.js';
import { TestThemeService } from '../../../../platform/theme/test/common/testThemeService.js';
import { IUndoRedoService } from '../../../../platform/undoRedo/common/undoRedo.js';
import { UndoRedoService } from '../../../../platform/undoRedo/common/undoRedoService.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { UriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentityService.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { MainThreadBulkEdits } from '../../browser/mainThreadBulkEdits.js';
import { SingleProxyRPCProtocol } from '../common/testRPCProtocol.js';
import { BulkEditService } from '../../../contrib/bulkEdit/browser/bulkEditService.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { SerializableObjectWithBuffers } from '../../../services/extensions/common/proxyIdentifier.js';
import { LabelService } from '../../../services/label/common/labelService.js';
import { ILifecycleService } from '../../../services/lifecycle/common/lifecycle.js';
import { IPaneCompositePartService } from '../../../services/panecomposite/browser/panecomposite.js';
import { ITextFileService } from '../../../services/textfile/common/textfiles.js';
import { IWorkingCopyFileService, } from '../../../services/workingCopy/common/workingCopyFileService.js';
import { IWorkingCopyService } from '../../../services/workingCopy/common/workingCopyService.js';
import { TestEditorGroupsService, TestEditorService, TestEnvironmentService, TestFileService, TestLifecycleService, TestWorkingCopyService, } from '../../../test/browser/workbenchTestServices.js';
import { TestContextService, TestTextResourcePropertiesService, } from '../../../test/common/workbenchTestServices.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { LanguageService } from '../../../../editor/common/services/languageService.js';
import { ILanguageConfigurationService } from '../../../../editor/common/languages/languageConfigurationRegistry.js';
import { TestLanguageConfigurationService } from '../../../../editor/test/common/modes/testLanguageConfigurationService.js';
suite('MainThreadEditors', () => {
    let disposables;
    const resource = URI.parse('foo:bar');
    let modelService;
    let bulkEdits;
    const movedResources = new Map();
    const copiedResources = new Map();
    const createdResources = new Set();
    const deletedResources = new Set();
    setup(() => {
        disposables = new DisposableStore();
        movedResources.clear();
        copiedResources.clear();
        createdResources.clear();
        deletedResources.clear();
        const configService = new TestConfigurationService();
        const dialogService = new TestDialogService();
        const notificationService = new TestNotificationService();
        const undoRedoService = new UndoRedoService(dialogService, notificationService);
        const themeService = new TestThemeService();
        const services = new ServiceCollection();
        services.set(IBulkEditService, new SyncDescriptor(BulkEditService));
        services.set(ILabelService, new SyncDescriptor(LabelService));
        services.set(ILogService, new NullLogService());
        services.set(IWorkspaceContextService, new TestContextService());
        services.set(IEnvironmentService, TestEnvironmentService);
        services.set(IWorkbenchEnvironmentService, TestEnvironmentService);
        services.set(IConfigurationService, configService);
        services.set(IDialogService, dialogService);
        services.set(INotificationService, notificationService);
        services.set(IUndoRedoService, undoRedoService);
        services.set(IModelService, modelService);
        services.set(ICodeEditorService, new TestCodeEditorService(themeService));
        services.set(IFileService, new TestFileService());
        services.set(IUriIdentityService, new SyncDescriptor(UriIdentityService));
        services.set(IEditorService, disposables.add(new TestEditorService()));
        services.set(ILifecycleService, new TestLifecycleService());
        services.set(IWorkingCopyService, new TestWorkingCopyService());
        services.set(IEditorGroupsService, new TestEditorGroupsService());
        services.set(ITextFileService, new (class extends mock() {
            constructor() {
                super(...arguments);
                this.files = {
                    onDidSave: Event.None,
                    onDidRevert: Event.None,
                    onDidChangeDirty: Event.None,
                };
            }
            isDirty() {
                return false;
            }
            create(operations) {
                for (const o of operations) {
                    createdResources.add(o.resource);
                }
                return Promise.resolve(Object.create(null));
            }
            async getEncodedReadable(resource, value) {
                return undefined;
            }
        })());
        services.set(IWorkingCopyFileService, new (class extends mock() {
            constructor() {
                super(...arguments);
                this.onDidRunWorkingCopyFileOperation = Event.None;
            }
            createFolder(operations) {
                this.create(operations);
            }
            create(operations) {
                for (const operation of operations) {
                    createdResources.add(operation.resource);
                }
                return Promise.resolve(Object.create(null));
            }
            move(operations) {
                const { source, target } = operations[0].file;
                movedResources.set(source, target);
                return Promise.resolve(Object.create(null));
            }
            copy(operations) {
                const { source, target } = operations[0].file;
                copiedResources.set(source, target);
                return Promise.resolve(Object.create(null));
            }
            delete(operations) {
                for (const operation of operations) {
                    deletedResources.add(operation.resource);
                }
                return Promise.resolve(undefined);
            }
        })());
        services.set(ITextModelService, new (class extends mock() {
            createModelReference(resource) {
                const textEditorModel = new (class extends mock() {
                    constructor() {
                        super(...arguments);
                        this.textEditorModel = modelService.getModel(resource);
                    }
                })();
                textEditorModel.isReadonly = () => false;
                return Promise.resolve(new ImmortalReference(textEditorModel));
            }
        })());
        services.set(IEditorWorkerService, new (class extends mock() {
        })());
        services.set(IPaneCompositePartService, new (class extends mock() {
            constructor() {
                super(...arguments);
                this.onDidPaneCompositeOpen = Event.None;
                this.onDidPaneCompositeClose = Event.None;
            }
            getActivePaneComposite() {
                return undefined;
            }
        })());
        services.set(ILanguageService, disposables.add(new LanguageService()));
        services.set(ILanguageConfigurationService, new TestLanguageConfigurationService());
        const instaService = new InstantiationService(services);
        modelService = new ModelService(configService, new TestTextResourcePropertiesService(configService), undoRedoService, instaService);
        bulkEdits = instaService.createInstance(MainThreadBulkEdits, SingleProxyRPCProtocol(null));
    });
    teardown(() => {
        disposables.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test(`applyWorkspaceEdit returns false if model is changed by user`, () => {
        const model = disposables.add(modelService.createModel('something', null, resource));
        const workspaceResourceEdit = {
            resource: resource,
            versionId: model.getVersionId(),
            textEdit: {
                text: 'asdfg',
                range: new Range(1, 1, 1, 1),
            },
        };
        // Act as if the user edited the model
        model.applyEdits([EditOperation.insert(new Position(0, 0), 'something')]);
        return bulkEdits
            .$tryApplyWorkspaceEdit(new SerializableObjectWithBuffers({ edits: [workspaceResourceEdit] }))
            .then((result) => {
            assert.strictEqual(result, false);
        });
    });
    test(`issue #54773: applyWorkspaceEdit checks model version in race situation`, () => {
        const model = disposables.add(modelService.createModel('something', null, resource));
        const workspaceResourceEdit1 = {
            resource: resource,
            versionId: model.getVersionId(),
            textEdit: {
                text: 'asdfg',
                range: new Range(1, 1, 1, 1),
            },
        };
        const workspaceResourceEdit2 = {
            resource: resource,
            versionId: model.getVersionId(),
            textEdit: {
                text: 'asdfg',
                range: new Range(1, 1, 1, 1),
            },
        };
        const p1 = bulkEdits
            .$tryApplyWorkspaceEdit(new SerializableObjectWithBuffers({ edits: [workspaceResourceEdit1] }))
            .then((result) => {
            // first edit request succeeds
            assert.strictEqual(result, true);
        });
        const p2 = bulkEdits
            .$tryApplyWorkspaceEdit(new SerializableObjectWithBuffers({ edits: [workspaceResourceEdit2] }))
            .then((result) => {
            // second edit request fails
            assert.strictEqual(result, false);
        });
        return Promise.all([p1, p2]);
    });
    test(`applyWorkspaceEdit with only resource edit`, () => {
        return bulkEdits
            .$tryApplyWorkspaceEdit(new SerializableObjectWithBuffers({
            edits: [
                { oldResource: resource, newResource: resource, options: undefined },
                { oldResource: undefined, newResource: resource, options: undefined },
                { oldResource: resource, newResource: undefined, options: undefined },
            ],
        }))
            .then((result) => {
            assert.strictEqual(result, true);
            assert.strictEqual(movedResources.get(resource), resource);
            assert.strictEqual(createdResources.has(resource), true);
            assert.strictEqual(deletedResources.has(resource), true);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZEVkaXRvcnMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvdGVzdC9icm93c2VyL21haW5UaHJlYWRFZGl0b3JzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN4RCxPQUFPLEVBQ04sZUFBZSxFQUVmLGlCQUFpQixHQUNqQixNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDM0QsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0YsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDekYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDN0YsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQy9FLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFFL0QsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDekYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUNqRixPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0sdURBQXVELENBQUE7QUFDOUQsT0FBTyxFQUFFLHFCQUFxQixFQUFF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