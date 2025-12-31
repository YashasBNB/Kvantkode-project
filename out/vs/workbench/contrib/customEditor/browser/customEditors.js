/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import './media/customEditor.css';
import { coalesce } from '../../../../base/common/arrays.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable, DisposableStore, toDisposable, } from '../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../base/common/network.js';
import { extname, isEqual } from '../../../../base/common/resources.js';
import { assertIsDefined } from '../../../../base/common/types.js';
import { URI } from '../../../../base/common/uri.js';
import { RedoCommand, UndoCommand } from '../../../../editor/browser/editorExtensions.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { DEFAULT_EDITOR_ASSOCIATION, EditorExtensions, } from '../../../common/editor.js';
import { DiffEditorInput } from '../../../common/editor/diffEditorInput.js';
import { CONTEXT_ACTIVE_CUSTOM_EDITOR_ID, CONTEXT_FOCUSED_CUSTOM_EDITOR_IS_EDITABLE, CustomEditorInfoCollection, } from '../common/customEditor.js';
import { CustomEditorModelManager } from '../common/customEditorModelManager.js';
import { IEditorGroupsService, } from '../../../services/editor/common/editorGroupsService.js';
import { IEditorResolverService, RegisteredEditorPriority, } from '../../../services/editor/common/editorResolverService.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { ContributedCustomEditors } from '../common/contributedCustomEditors.js';
import { CustomEditorInput } from './customEditorInput.js';
let CustomEditorService = class CustomEditorService extends Disposable {
    constructor(fileService, storageService, editorService, editorGroupService, instantiationService, uriIdentityService, editorResolverService) {
        super();
        this.editorService = editorService;
        this.editorGroupService = editorGroupService;
        this.instantiationService = instantiationService;
        this.uriIdentityService = uriIdentityService;
        this.editorResolverService = editorResolverService;
        this._untitledCounter = 0;
        this._editorResolverDisposables = this._register(new DisposableStore());
        this._editorCapabilities = new Map();
        this._onDidChangeEditorTypes = this._register(new Emitter());
        this.onDidChangeEditorTypes = this._onDidChangeEditorTypes.event;
        this._fileEditorFactory = Registry.as(EditorExtensions.EditorFactory).getFileEditorFactory();
        this._models = new CustomEditorModelManager(this.uriIdentityService);
        this._contributedEditors = this._register(new ContributedCustomEditors(storageService));
        // Register the contribution points only emitting one change from the resolver
        this.editorResolverService.bufferChangeEvents(this.registerContributionPoints.bind(this));
        this._register(this._contributedEditors.onChange(() => {
            // Register the contribution points only emitting one change from the resolver
            this.editorResolverService.bufferChangeEvents(this.registerContributionPoints.bind(this));
            this._onDidChangeEditorTypes.fire();
        }));
        // Register group context key providers.
        // These set the context keys for each editor group and the global context
        const activeCustomEditorContextKeyProvider = {
            contextKey: CONTEXT_ACTIVE_CUSTOM_EDITOR_ID,
            getGroupContextKeyValue: (group) => this.getActiveCustomEditorId(group),
            onDidChange: this.onDidChangeEditorTypes,
        };
        const customEditorIsEditableContextKeyProvider = {
            contextKey: CONTEXT_FOCUSED_CUSTOM_EDITOR_IS_EDITABLE,
            getGroupContextKeyValue: (group) => this.getCustomEditorIsEditable(group),
            onDidChange: this.onDidChangeEditorTypes,
        };
        this._register(this.editorGroupService.registerContextKeyProvider(activeCustomEditorContextKeyProvider));
        this._register(this.editorGroupService.registerContextKeyProvider(customEditorIsEditableContextKeyProvider));
        this._register(fileService.onDidRunOperation((e) => {
            if (e.isOperation(2 /* FileOperation.MOVE */)) {
                this.handleMovedFileInOpenedFileEditors(e.resource, this.uriIdentityService.asCanonicalUri(e.target.resource));
            }
        }));
        const PRIORITY = 105;
        this._register(UndoCommand.addImplementation(PRIORITY, 'custom-editor', () => {
            return this.withActiveCustomEditor((editor) => editor.undo());
        }));
        this._register(RedoCommand.addImplementation(PRIORITY, 'custom-editor', () => {
            return this.withActiveCustomEditor((editor) => editor.redo());
        }));
    }
    getEditorTypes() {
        return [...this._contributedEditors];
    }
    withActiveCustomEditor(f) {
        const activeEditor = this.editorService.activeEditor;
        if (activeEditor instanceof CustomEditorInput) {
            const result = f(activeEditor);
            if (result) {
                return result;
            }
            return true;
        }
        return false;
    }
    registerContributionPoints() {
        // Clear all previous contributions we know
        this._editorResolverDisposables.clear();
        for (const contributedEditor of this._contributedEditors) {
            for (const globPattern of contributedEditor.selector) {
                if (!globPattern.filenamePattern) {
                    continue;
                }
                this._editorResolverDisposables.add(this.editorResolverService.registerEditor(globPattern.filenamePattern, {
                    id: contributedEditor.id,
                    label: contributedEditor.displayName,
                    detail: contributedEditor.providerDisplayName,
                    priority: contributedEditor.priority,
                }, {
                    singlePerResource: () => !(this.getCustomEditorCapabilities(contributedEditor.id)
                        ?.supportsMultipleEditorsPerDocument ?? false),
                }, {
                    createEditorInput: ({ resource }, group) => {
                        return {
                            editor: CustomEditorInput.create(this.instantiationService, resource, contributedEditor.id, group.id),
                        };
                    },
                    createUntitledEditorInput: ({ resource }, group) => {
                        return {
                            editor: CustomEditorInput.create(this.instantiationService, resource ??
                                URI.from({
                                    scheme: Schemas.untitled,
                                    authority: `Untitled-${this._untitledCounter++}`,
                                }), contributedEditor.id, group.id),
                        };
                    },
                    createDiffEditorInput: (diffEditorInput, group) => {
                        return {
                            editor: this.createDiffEditorInput(diffEditorInput, contributedEditor.id, group),
                        };
                    },
                }));
            }
        }
    }
    createDiffEditorInput(editor, editorID, group) {
        const modifiedOverride = CustomEditorInput.create(this.instantiationService, assertIsDefined(editor.modified.resource), editorID, group.id, { customClasses: 'modified' });
        const originalOverride = CustomEditorInput.create(this.instantiationService, assertIsDefined(editor.original.resource), editorID, group.id, { customClasses: 'original' });
        return this.instantiationService.createInstance(DiffEditorInput, editor.label, editor.description, originalOverride, modifiedOverride, true);
    }
    get models() {
        return this._models;
    }
    getCustomEditor(viewType) {
        return this._contributedEditors.get(viewType);
    }
    getContributedCustomEditors(resource) {
        return new CustomEditorInfoCollection(this._contributedEditors.getContributedEditors(resource));
    }
    getUserConfiguredCustomEditors(resource) {
        const resourceAssocations = this.editorResolverService.getAssociationsForResource(resource);
        return new CustomEditorInfoCollection(coalesce(resourceAssocations.map((association) => this._contributedEditors.get(association.viewType))));
    }
    getAllCustomEditors(resource) {
        return new CustomEditorInfoCollection([
            ...this.getUserConfiguredCustomEditors(resource).allEditors,
            ...this.getContributedCustomEditors(resource).allEditors,
        ]);
    }
    registerCustomEditorCapabilities(viewType, options) {
        if (this._editorCapabilities.has(viewType)) {
            throw new Error(`Capabilities for ${viewType} already set`);
        }
        this._editorCapabilities.set(viewType, options);
        return toDisposable(() => {
            this._editorCapabilities.delete(viewType);
        });
    }
    getCustomEditorCapabilities(viewType) {
        return this._editorCapabilities.get(viewType);
    }
    getActiveCustomEditorId(group) {
        const activeEditorPane = group.activeEditorPane;
        const resource = activeEditorPane?.input?.resource;
        if (!resource) {
            return '';
        }
        return activeEditorPane?.input instanceof CustomEditorInput
            ? activeEditorPane.input.viewType
            : '';
    }
    getCustomEditorIsEditable(group) {
        const activeEditorPane = group.activeEditorPane;
        const resource = activeEditorPane?.input?.resource;
        if (!resource) {
            return false;
        }
        return activeEditorPane?.input instanceof CustomEditorInput;
    }
    async handleMovedFileInOpenedFileEditors(oldResource, newResource) {
        if (extname(oldResource).toLowerCase() === extname(newResource).toLowerCase()) {
            return;
        }
        const possibleEditors = this.getAllCustomEditors(newResource);
        // See if we have any non-optional custom editor for this resource
        if (!possibleEditors.allEditors.some((editor) => editor.priority !== RegisteredEditorPriority.option)) {
            return;
        }
        // If so, check all editors to see if there are any file editors open for the new resource
        const editorsToReplace = new Map();
        for (const group of this.editorGroupService.groups) {
            for (const editor of group.editors) {
                if (this._fileEditorFactory.isFileEditor(editor) &&
                    !(editor instanceof CustomEditorInput) &&
                    isEqual(editor.resource, newResource)) {
                    let entry = editorsToReplace.get(group.id);
                    if (!entry) {
                        entry = [];
                        editorsToReplace.set(group.id, entry);
                    }
                    entry.push(editor);
                }
            }
        }
        if (!editorsToReplace.size) {
            return;
        }
        for (const [group, entries] of editorsToReplace) {
            this.editorService.replaceEditors(entries.map((editor) => {
                let replacement;
                if (possibleEditors.defaultEditor) {
                    const viewType = possibleEditors.defaultEditor.id;
                    replacement = CustomEditorInput.create(this.instantiationService, newResource, viewType, group);
                }
                else {
                    replacement = {
                        resource: newResource,
                        options: { override: DEFAULT_EDITOR_ASSOCIATION.id },
                    };
                }
                return {
                    editor,
                    replacement,
                    options: {
                        preserveFocus: true,
                    },
                };
            }), group);
        }
    }
};
CustomEditorService = __decorate([
    __param(0, IFileService),
    __param(1, IStorageService),
    __param(2, IEditorService),
    __param(3, IEditorGroupsService),
    __param(4, IInstantiationService),
    __param(5, IUriIdentityService),
    __param(6, IEditorResolverService)
], CustomEditorService);
export { CustomEditorService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3VzdG9tRWRpdG9ycy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2N1c3RvbUVkaXRvci9icm93c2VyL2N1c3RvbUVkaXRvcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTywwQkFBMEIsQ0FBQTtBQUNqQyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDNUQsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFDTixVQUFVLEVBQ1YsZUFBZSxFQUVmLFlBQVksR0FDWixNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLFdBQVcsRUFBRSxXQUFXLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUV6RixPQUFPLEVBQWlCLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3hGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDaEYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDNUYsT0FBTyxFQUNOLDBCQUEwQixFQUMxQixnQkFBZ0IsR0FJaEIsTUFBTSwyQkFBMkIs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