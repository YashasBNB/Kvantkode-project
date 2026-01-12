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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3VzdG9tRWRpdG9ycy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY3VzdG9tRWRpdG9yL2Jyb3dzZXIvY3VzdG9tRWRpdG9ycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLDBCQUEwQixDQUFBO0FBQ2pDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUNOLFVBQVUsRUFDVixlQUFlLEVBRWYsWUFBWSxHQUNaLE1BQU0sc0NBQXNDLENBQUE7QUFDN0MsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDdkUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsV0FBVyxFQUFFLFdBQVcsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBRXpGLE9BQU8sRUFBaUIsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDeEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQzNFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNoRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUM1RixPQUFPLEVBQ04sMEJBQTBCLEVBQzFCLGdCQUFnQixHQUloQixNQUFNLDJC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