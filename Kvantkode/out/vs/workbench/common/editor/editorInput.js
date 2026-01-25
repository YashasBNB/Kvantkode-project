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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9ySW5wdXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb21tb24vZWRpdG9yL2VkaXRvcklucHV0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUV2RCxPQUFPLEVBVU4sc0JBQXNCLEVBQ3RCLG1CQUFtQixFQUNuQixhQUFhLEdBRWIsTUFBTSxjQUFjLENBQUE7QUFDckIsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBOEMzRDs7O0dBR0c7QUFDSCxNQUFNLE9BQWdCLFdBQVksU0FBUSxtQkFBbUI7SUFBN0Q7O1FBQ29CLHNCQUFpQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFBO1FBQ3ZELHNCQUFpQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFBO1FBQ3ZELDZCQUF3QixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFBO1FBRWhFLG1CQUFjLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBUSxDQUFDLENBQUE7UUFFckU7O1dBRUc7UUFDTSxxQkFBZ0IsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFBO1FBRXhEOztXQUVHO1FBQ00scUJBQWdCLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEtBQUssQ0FBQTtRQUV4RDs7V0FFRztRQUNNLDRCQUF1QixHQUFHLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxLQUFLLENBQUE7UUFFdEU7O1dBRUc7UUFDTSxrQkFBYSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFBO0lBMFJu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