/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../nls.js';
import { EditorResourceAccessor, EditorExtensions, SideBySideEditor, EditorCloseContext, } from '../common/editor.js';
import { Registry } from '../../platform/registry/common/platform.js';
import { toDisposable } from '../../base/common/lifecycle.js';
import { Promises } from '../../base/common/async.js';
import { IEditorService } from '../services/editor/common/editorService.js';
import { IUriIdentityService } from '../../platform/uriIdentity/common/uriIdentity.js';
import { IWorkingCopyService } from '../services/workingCopy/common/workingCopyService.js';
import { Schemas } from '../../base/common/network.js';
import { Iterable } from '../../base/common/iterator.js';
import { Emitter } from '../../base/common/event.js';
/**
 * A lightweight descriptor of an editor pane. The descriptor is deferred so that heavy editor
 * panes can load lazily in the workbench.
 */
export class EditorPaneDescriptor {
    static { this.instantiatedEditorPanes = new Set(); }
    static didInstantiateEditorPane(typeId) {
        return EditorPaneDescriptor.instantiatedEditorPanes.has(typeId);
    }
    static { this._onWillInstantiateEditorPane = new Emitter(); }
    static { this.onWillInstantiateEditorPane = EditorPaneDescriptor._onWillInstantiateEditorPane.event; }
    static create(ctor, typeId, name) {
        return new EditorPaneDescriptor(ctor, typeId, name);
    }
    constructor(ctor, typeId, name) {
        this.ctor = ctor;
        this.typeId = typeId;
        this.name = name;
    }
    instantiate(instantiationService, group) {
        EditorPaneDescriptor._onWillInstantiateEditorPane.fire({ typeId: this.typeId });
        const pane = instantiationService.createInstance(this.ctor, group);
        EditorPaneDescriptor.instantiatedEditorPanes.add(this.typeId);
        return pane;
    }
    describes(editorPane) {
        return editorPane.getId() === this.typeId;
    }
}
export class EditorPaneRegistry {
    constructor() {
        this.mapEditorPanesToEditors = new Map();
        //#endregion
    }
    registerEditorPane(editorPaneDescriptor, editorDescriptors) {
        this.mapEditorPanesToEditors.set(editorPaneDescriptor, editorDescriptors);
        return toDisposable(() => {
            this.mapEditorPanesToEditors.delete(editorPaneDescriptor);
        });
    }
    getEditorPane(editor) {
        const descriptors = this.findEditorPaneDescriptors(editor);
        if (descriptors.length === 0) {
            return undefined;
        }
        if (descriptors.length === 1) {
            return descriptors[0];
        }
        return editor.prefersEditorPane(descriptors);
    }
    findEditorPaneDescriptors(editor, byInstanceOf) {
        const matchingEditorPaneDescriptors = [];
        for (const editorPane of this.mapEditorPanesToEditors.keys()) {
            const editorDescriptors = this.mapEditorPanesToEditors.get(editorPane) || [];
            for (const editorDescriptor of editorDescriptors) {
                const editorClass = editorDescriptor.ctor;
                // Direct check on constructor type (ignores prototype chain)
                if (!byInstanceOf && editor.constructor === editorClass) {
                    matchingEditorPaneDescriptors.push(editorPane);
                    break;
                }
                // Normal instanceof check
                else if (byInstanceOf && editor instanceof editorClass) {
                    matchingEditorPaneDescriptors.push(editorPane);
                    break;
                }
            }
        }
        // If no descriptors found, continue search using instanceof and prototype chain
        if (!byInstanceOf && matchingEditorPaneDescriptors.length === 0) {
            return this.findEditorPaneDescriptors(editor, true);
        }
        return matchingEditorPaneDescriptors;
    }
    //#region Used for tests only
    getEditorPaneByType(typeId) {
        return Iterable.find(this.mapEditorPanesToEditors.keys(), (editor) => editor.typeId === typeId);
    }
    getEditorPanes() {
        return Array.from(this.mapEditorPanesToEditors.keys());
    }
    getEditors() {
        const editorClasses = [];
        for (const editorPane of this.mapEditorPanesToEditors.keys()) {
            const editorDescriptors = this.mapEditorPanesToEditors.get(editorPane);
            if (editorDescriptors) {
                editorClasses.push(...editorDescriptors.map((editorDescriptor) => editorDescriptor.ctor));
            }
        }
        return editorClasses;
    }
}
Registry.add(EditorExtensions.EditorPane, new EditorPaneRegistry());
//#endregion
//#region Editor Close Tracker
export function whenEditorClosed(accessor, resources) {
    const editorService = accessor.get(IEditorService);
    const uriIdentityService = accessor.get(IUriIdentityService);
    const workingCopyService = accessor.get(IWorkingCopyService);
    return new Promise((resolve) => {
        let remainingResources = [...resources];
        // Observe any editor closing from this moment on
        const listener = editorService.onDidCloseEditor(async (event) => {
            if (event.context === EditorCloseContext.MOVE) {
                return; // ignore move events where the editor will open in another group
            }
            let primaryResource = EditorResourceAccessor.getOriginalUri(event.editor, {
                supportSideBySide: SideBySideEditor.PRIMARY,
            });
            let secondaryResource = EditorResourceAccessor.getOriginalUri(event.editor, {
                supportSideBySide: SideBySideEditor.SECONDARY,
            });
            // Specially handle an editor getting replaced: if the new active editor
            // matches any of the resources from the closed editor, ignore those
            // resources because they were actually not closed, but replaced.
            // (see https://github.com/microsoft/vscode/issues/134299)
            if (event.context === EditorCloseContext.REPLACE) {
                const newPrimaryResource = EditorResourceAccessor.getOriginalUri(editorService.activeEditor, { supportSideBySide: SideBySideEditor.PRIMARY });
                const newSecondaryResource = EditorResourceAccessor.getOriginalUri(editorService.activeEditor, { supportSideBySide: SideBySideEditor.SECONDARY });
                if (uriIdentityService.extUri.isEqual(primaryResource, newPrimaryResource)) {
                    primaryResource = undefined;
                }
                if (uriIdentityService.extUri.isEqual(secondaryResource, newSecondaryResource)) {
                    secondaryResource = undefined;
                }
            }
            // Remove from resources to wait for being closed based on the
            // resources from editors that got closed
            remainingResources = remainingResources.filter((resource) => {
                // Closing editor matches resource directly: remove from remaining
                if (uriIdentityService.extUri.isEqual(resource, primaryResource) ||
                    uriIdentityService.extUri.isEqual(resource, secondaryResource)) {
                    return false;
                }
                // Closing editor is untitled with associated resource
                // that matches resource directly: remove from remaining
                // but only if the editor was not replaced, otherwise
                // saving an untitled with associated resource would
                // release the `--wait` call.
                // (see https://github.com/microsoft/vscode/issues/141237)
                if (event.context !== EditorCloseContext.REPLACE) {
                    if ((primaryResource?.scheme === Schemas.untitled &&
                        uriIdentityService.extUri.isEqual(resource, primaryResource.with({ scheme: resource.scheme }))) ||
                        (secondaryResource?.scheme === Schemas.untitled &&
                            uriIdentityService.extUri.isEqual(resource, secondaryResource.with({ scheme: resource.scheme })))) {
                        return false;
                    }
                }
                // Editor is not yet closed, so keep it in waiting mode
                return true;
            });
            // All resources to wait for being closed are closed
            if (remainingResources.length === 0) {
                // If auto save is configured with the default delay (1s) it is possible
                // to close the editor while the save still continues in the background. As such
                // we have to also check if the editors to track for are dirty and if so wait
                // for them to get saved.
                const dirtyResources = resources.filter((resource) => workingCopyService.isDirty(resource));
                if (dirtyResources.length > 0) {
                    await Promises.settled(dirtyResources.map(async (resource) => await new Promise((resolve) => {
                        if (!workingCopyService.isDirty(resource)) {
                            return resolve(); // return early if resource is not dirty
                        }
                        // Otherwise resolve promise when resource is saved
                        const listener = workingCopyService.onDidChangeDirty((workingCopy) => {
                            if (!workingCopy.isDirty() &&
                                uriIdentityService.extUri.isEqual(resource, workingCopy.resource)) {
                                listener.dispose();
                                return resolve();
                            }
                        });
                    })));
                }
                listener.dispose();
                return resolve();
            }
        });
    });
}
//#endregion
//#region ARIA
export function computeEditorAriaLabel(input, index, group, groupCount) {
    let ariaLabel = input.getAriaLabel();
    if (group && !group.isPinned(input)) {
        ariaLabel = localize('preview', '{0}, preview', ariaLabel);
    }
    if (group?.isSticky(index ?? input)) {
        ariaLabel = localize('pinned', '{0}, pinned', ariaLabel);
    }
    // Apply group information to help identify in
    // which group we are (only if more than one group
    // is actually opened)
    if (group && typeof groupCount === 'number' && groupCount > 1) {
        ariaLabel = `${ariaLabel}, ${group.ariaLabel}`;
    }
    return ariaLabel;
}
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci9lZGl0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGNBQWMsQ0FBQTtBQUN2QyxPQUFPLEVBQ04sc0JBQXNCLEVBQ3RCLGdCQUFnQixFQUNoQixnQkFBZ0IsRUFFaEIsa0JBQWtCLEdBRWxCLE1BQU0scUJBQXFCLENBQUE7QUFHNUIsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBUXJFLE9BQU8sRUFBZSxZQUFZLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDckQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBRTFGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUV0RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDeEQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBMkJwRDs7O0dBR0c7QUFDSCxNQUFNLE9BQU8sb0JBQW9CO2FBQ1IsNEJBQXVCLEdBQUcsSUFBSSxHQUFHLEVBQVUsQ0FBQTtJQUNuRSxNQUFNLENBQUMsd0JBQXdCLENBQUMsTUFBYztRQUM3QyxPQUFPLG9CQUFvQixDQUFDLHVCQUF1QixDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUNoRSxDQUFDO2FBRXVCLGlDQUE0QixHQUNuRCxJQUFJLE9B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