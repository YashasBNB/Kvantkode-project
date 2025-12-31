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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvZWRpdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxjQUFjLENBQUE7QUFDdkMsT0FBTyxFQUNOLHNCQUFzQixFQUN0QixnQkFBZ0IsRUFDaEIsZ0JBQWdCLEVBRWhCLGtCQUFrQixHQUVsQixNQUFNLHFCQUFxQixDQUFBO0FBRzVCLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQVFyRSxPQUFPLEVBQWUsWUFBWSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDMUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQ3JELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUN0RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUUxRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFFdEQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3hELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQTJCcEQ7OztHQUdHO0FBQ0gsTUFBTSxPQUFPLG9CQUFvQjthQUNSLDRCQUF1QixHQUFHLElBQUksR0FBRyxFQUFVLENBQUE7SUFDbkUsTUFBTSxDQUFDLHdCQUF3QixDQUFDLE1BQWM7UUFDN0MsT0FBTyxvQkFBb0IsQ0FBQyx1QkFBdUIsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUE7SUFDaEUsQ0FBQzthQUV1QixpQ0FBNEIsR0FDbkQsSUFBSSxPQUFPLEVB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