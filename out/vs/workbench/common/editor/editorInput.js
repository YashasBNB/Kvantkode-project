/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../base/common/event.js';
import { EditorResourceAccessor, AbstractEditorInput, isEditorInput, } from '../editor.js';
import { isEqual } from '../../../base/common/resources.js';
/**
 * Editor inputs are lightweight objects that can be passed to the workbench API to open inside the editor part.
 * Each editor input is mapped to an editor that is capable of opening it through the Platform facade.
 */
export class EditorInput extends AbstractEditorInput {
    constructor() {
        super(...arguments);
        this._onDidChangeDirty = this._register(new Emitter());
        this._onDidChangeLabel = this._register(new Emitter());
        this._onDidChangeCapabilities = this._register(new Emitter());
        this._onWillDispose = this._register(new Emitter());
        /**
         * Triggered when this input changes its dirty state.
         */
        this.onDidChangeDirty = this._onDidChangeDirty.event;
        /**
         * Triggered when this input changes its label
         */
        this.onDidChangeLabel = this._onDidChangeLabel.event;
        /**
         * Triggered when this input changes its capabilities.
         */
        this.onDidChangeCapabilities = this._onDidChangeCapabilities.event;
        /**
         * Triggered when this input is about to be disposed.
         */
        this.onWillDispose = this._onWillDispose.event;
    }
    /**
     * Identifies the type of editor this input represents
     * This ID is registered with the {@link EditorResolverService} to allow
     * for resolving an untyped input to a typed one
     */
    get editorId() {
        return undefined;
    }
    /**
     * The capabilities of the input.
     */
    get capabilities() {
        return 2 /* EditorInputCapabilities.Readonly */;
    }
    /**
     * Figure out if the input has the provided capability.
     */
    hasCapability(capability) {
        if (capability === 0 /* EditorInputCapabilities.None */) {
            return this.capabilities === 0 /* EditorInputCapabilities.None */;
        }
        return (this.capabilities & capability) !== 0;
    }
    isReadonly() {
        return this.hasCapability(2 /* EditorInputCapabilities.Readonly */);
    }
    /**
     * Returns the display name of this input.
     */
    getName() {
        return `Editor ${this.typeId}`;
    }
    /**
     * Returns the display description of this input.
     */
    getDescription(verbosity) {
        return undefined;
    }
    /**
     * Returns the display title of this input.
     */
    getTitle(verbosity) {
        return this.getName();
    }
    /**
     * Returns the extra classes to apply to the label of this input.
     */
    getLabelExtraClasses() {
        return [];
    }
    /**
     * Returns the aria label to be read out by a screen reader.
     */
    getAriaLabel() {
        return this.getTitle(0 /* Verbosity.SHORT */);
    }
    /**
     * Returns the icon which represents this editor input.
     * If undefined, the default icon will be used.
     */
    getIcon() {
        return undefined;
    }
    /**
     * Returns a descriptor suitable for telemetry events.
     *
     * Subclasses should extend if they can contribute.
     */
    getTelemetryDescriptor() {
        /* __GDPR__FRAGMENT__
            "EditorTelemetryDescriptor" : {
                "typeId" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
            }
        */
        return { typeId: this.typeId };
    }
    /**
     * Returns if this input is dirty or not.
     */
    isDirty() {
        return false;
    }
    /**
     * Returns if the input has unsaved changes.
     */
    isModified() {
        return this.isDirty();
    }
    /**
     * Returns if this input is currently being saved or soon to be
     * saved. Based on this assumption the editor may for example
     * decide to not signal the dirty state to the user assuming that
     * the save is scheduled to happen anyway.
     */
    isSaving() {
        return false;
    }
    /**
     * Returns a type of `IDisposable` that represents the resolved input.
     * Subclasses should override to provide a meaningful model or return
     * `null` if the editor does not require a model.
     *
     * The `options` parameter are passed down from the editor when the
     * input is resolved as part of it.
     */
    async resolve() {
        return null;
    }
    /**
     * Saves the editor. The provided groupId helps implementors
     * to e.g. preserve view state of the editor and re-open it
     * in the correct group after saving.
     *
     * @returns the resulting editor input (typically the same) of
     * this operation or `undefined` to indicate that the operation
     * failed or was canceled.
     */
    async save(group, options) {
        return this;
    }
    /**
     * Saves the editor to a different location. The provided `group`
     * helps implementors to e.g. preserve view state of the editor
     * and re-open it in the correct group after saving.
     *
     * @returns the resulting editor input (typically a different one)
     * of this operation or `undefined` to indicate that the operation
     * failed or was canceled.
     */
    async saveAs(group, options) {
        return this;
    }
    /**
     * Reverts this input from the provided group.
     */
    async revert(group, options) { }
    /**
     * Called to determine how to handle a resource that is renamed that matches
     * the editors resource (or is a child of).
     *
     * Implementors are free to not implement this method to signal no intent
     * to participate. If an editor is returned though, it will replace the
     * current one with that editor and optional options.
     */
    async rename(group, target) {
        return undefined;
    }
    /**
     * Returns a copy of the current editor input. Used when we can't just reuse the input
     */
    copy() {
        return this;
    }
    /**
     * Indicates if this editor can be moved to another group. By default
     * editors can freely be moved around groups. If an editor cannot be
     * moved, a message should be returned to show to the user.
     *
     * @returns `true` if the editor can be moved to the target group, or
     * a string with a message to show to the user if the editor cannot be
     * moved.
     */
    canMove(sourceGroup, targetGroup) {
        return true;
    }
    /**
     * Returns if the other object matches this input.
     */
    matches(otherInput) {
        // Typed inputs: via  === check
        if (isEditorInput(otherInput)) {
            return this === otherInput;
        }
        // Untyped inputs: go into properties
        const otherInputEditorId = otherInput.options?.override;
        // If the overrides are both defined and don't match that means they're separate inputs
        if (this.editorId !== otherInputEditorId &&
            otherInputEditorId !== undefined &&
            this.editorId !== undefined) {
            return false;
        }
        return isEqual(this.resource, EditorResourceAccessor.getCanonicalUri(otherInput));
    }
    /**
     * If a editor was registered onto multiple editor panes, this method
     * will be asked to return the preferred one to use.
     *
     * @param editorPanes a list of editor pane descriptors that are candidates
     * for the editor to open in.
     */
    prefersEditorPane(editorPanes) {
        return editorPanes.at(0);
    }
    /**
     * Returns a representation of this typed editor input as untyped
     * resource editor input that e.g. can be used to serialize the
     * editor input into a form that it can be restored.
     *
     * May return `undefined` if an untyped representation is not supported.
     */
    toUntyped(options) {
        return undefined;
    }
    /**
     * Returns if this editor is disposed.
     */
    isDisposed() {
        return this._store.isDisposed;
    }
    dispose() {
        if (!this.isDisposed()) {
            this._onWillDispose.fire();
        }
        super.dispose();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9ySW5wdXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29tbW9uL2VkaXRvci9lZGl0b3JJbnB1dC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFFdkQsT0FBTyxFQVVOLHNCQUFzQixFQUN0QixtQkFBbUIsRUFDbkIsYUFBYSxHQUViLE1BQU0sY0FBYyxDQUFBO0FBQ3JCLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQThDM0Q7OztHQUdHO0FBQ0gsTUFBTSxPQUFnQixXQUFZLFNBQVEsbUJBQW1CO0lBQTdEOztRQUNvQixzQkFBaUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFRLENBQUMsQ0FBQTtRQUN2RCxzQkFBaUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFRLENBQUMsQ0FBQTtRQUN2RCw2QkFBd0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFRLENBQUMsQ0FBQTtRQUVoRSxtQkFBYyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFBO1FBRXJFOztXQUVHO1FBQ00scUJBQWdCLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEtBQUssQ0FBQTtRQUV4RDs7V0FFRztRQUNNLHFCQUFnQixHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUE7UUFFeEQ7O1dBRUc7UUFDTSw0QkFBdUIsR0FBRyxJQUFJLENBQUMsd0JBQXdCLENBQUMsS0FBSyxDQUFBO1FBRXRFOztXQUVHO1FBQ00sa0JBQWEsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQTtJQTBSbkQsQ0FB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