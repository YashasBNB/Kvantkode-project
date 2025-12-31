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
var SideBySideEditorInput_1;
import { Event } from '../../../base/common/event.js';
import { localize } from '../../../nls.js';
import { Registry } from '../../../platform/registry/common/platform.js';
import { EditorExtensions, isResourceSideBySideEditorInput, isDiffEditorInput, isResourceDiffEditorInput, findViewStateForEditor, isEditorInput, isResourceEditorInput, isResourceMergeEditorInput, isResourceMultiDiffEditorInput, } from '../editor.js';
import { EditorInput } from './editorInput.js';
import { IEditorService } from '../../services/editor/common/editorService.js';
/**
 * Side by side editor inputs that have a primary and secondary side.
 */
let SideBySideEditorInput = class SideBySideEditorInput extends EditorInput {
    static { SideBySideEditorInput_1 = this; }
    static { this.ID = 'workbench.editorinputs.sidebysideEditorInput'; }
    get typeId() {
        return SideBySideEditorInput_1.ID;
    }
    get capabilities() {
        // Use primary capabilities as main capabilities...
        let capabilities = this.primary.capabilities;
        // ...with the exception of `CanSplitInGroup` which
        // is only relevant to single editors.
        capabilities &= ~32 /* EditorInputCapabilities.CanSplitInGroup */;
        // Trust: should be considered for both sides
        if (this.secondary.hasCapability(16 /* EditorInputCapabilities.RequiresTrust */)) {
            capabilities |= 16 /* EditorInputCapabilities.RequiresTrust */;
        }
        // Singleton: should be considered for both sides
        if (this.secondary.hasCapability(8 /* EditorInputCapabilities.Singleton */)) {
            capabilities |= 8 /* EditorInputCapabilities.Singleton */;
        }
        // Indicate we show more than one editor
        capabilities |= 256 /* EditorInputCapabilities.MultipleEditors */;
        return capabilities;
    }
    get resource() {
        if (this.hasIdenticalSides) {
            // pretend to be just primary side when being asked for a resource
            // in case both sides are the same. this can help when components
            // want to identify this input among others (e.g. in history).
            return this.primary.resource;
        }
        return undefined;
    }
    constructor(preferredName, preferredDescription, secondary, primary, editorService) {
        super();
        this.preferredName = preferredName;
        this.preferredDescription = preferredDescription;
        this.secondary = secondary;
        this.primary = primary;
        this.editorService = editorService;
        this.hasIdenticalSides = this.primary.matches(this.secondary);
        this.registerListeners();
    }
    registerListeners() {
        // When the primary or secondary input gets disposed, dispose this diff editor input
        this._register(Event.once(Event.any(this.primary.onWillDispose, this.secondary.onWillDispose))(() => {
            if (!this.isDisposed()) {
                this.dispose();
            }
        }));
        // Re-emit some events from the primary side to the outside
        this._register(this.primary.onDidChangeDirty(() => this._onDidChangeDirty.fire()));
        // Re-emit some events from both sides to the outside
        this._register(this.primary.onDidChangeCapabilities(() => this._onDidChangeCapabilities.fire()));
        this._register(this.secondary.onDidChangeCapabilities(() => this._onDidChangeCapabilities.fire()));
        this._register(this.primary.onDidChangeLabel(() => this._onDidChangeLabel.fire()));
        this._register(this.secondary.onDidChangeLabel(() => this._onDidChangeLabel.fire()));
    }
    getName() {
        const preferredName = this.getPreferredName();
        if (preferredName) {
            return preferredName;
        }
        if (this.hasIdenticalSides) {
            return this.primary.getName(); // keep name concise when same editor is opened side by side
        }
        return localize('sideBySideLabels', '{0} - {1}', this.secondary.getName(), this.primary.getName());
    }
    getPreferredName() {
        return this.preferredName;
    }
    getDescription(verbosity) {
        const preferredDescription = this.getPreferredDescription();
        if (preferredDescription) {
            return preferredDescription;
        }
        if (this.hasIdenticalSides) {
            return this.primary.getDescription(verbosity);
        }
        return super.getDescription(verbosity);
    }
    getPreferredDescription() {
        return this.preferredDescription;
    }
    getTitle(verbosity) {
        let title;
        if (this.hasIdenticalSides) {
            title = this.primary.getTitle(verbosity) ?? this.getName();
        }
        else {
            title = super.getTitle(verbosity);
        }
        const preferredTitle = this.getPreferredTitle();
        if (preferredTitle) {
            title = `${preferredTitle} (${title})`;
        }
        return title;
    }
    getPreferredTitle() {
        if (this.preferredName && this.preferredDescription) {
            return `${this.preferredName} ${this.preferredDescription}`;
        }
        if (this.preferredName || this.preferredDescription) {
            return this.preferredName ?? this.preferredDescription;
        }
        return undefined;
    }
    getLabelExtraClasses() {
        if (this.hasIdenticalSides) {
            return this.primary.getLabelExtraClasses();
        }
        return super.getLabelExtraClasses();
    }
    getAriaLabel() {
        if (this.hasIdenticalSides) {
            return this.primary.getAriaLabel();
        }
        return super.getAriaLabel();
    }
    getTelemetryDescriptor() {
        const descriptor = this.primary.getTelemetryDescriptor();
        return { ...descriptor, ...super.getTelemetryDescriptor() };
    }
    isDirty() {
        return this.primary.isDirty();
    }
    isSaving() {
        return this.primary.isSaving();
    }
    async save(group, options) {
        const primarySaveResult = await this.primary.save(group, options);
        return this.saveResultToEditor(primarySaveResult);
    }
    async saveAs(group, options) {
        const primarySaveResult = await this.primary.saveAs(group, options);
        return this.saveResultToEditor(primarySaveResult);
    }
    saveResultToEditor(primarySaveResult) {
        if (!primarySaveResult || !this.hasIdenticalSides) {
            return primarySaveResult;
        }
        if (this.primary.matches(primarySaveResult)) {
            return this;
        }
        if (primarySaveResult instanceof EditorInput) {
            return new SideBySideEditorInput_1(this.preferredName, this.preferredDescription, primarySaveResult, primarySaveResult, this.editorService);
        }
        if (!isResourceDiffEditorInput(primarySaveResult) &&
            !isResourceMultiDiffEditorInput(primarySaveResult) &&
            !isResourceSideBySideEditorInput(primarySaveResult) &&
            !isResourceMergeEditorInput(primarySaveResult)) {
            return {
                primary: primarySaveResult,
                secondary: primarySaveResult,
                label: this.preferredName,
                description: this.preferredDescription,
            };
        }
        return undefined;
    }
    revert(group, options) {
        return this.primary.revert(group, options);
    }
    async rename(group, target) {
        if (!this.hasIdenticalSides) {
            return; // currently only enabled when both sides are identical
        }
        // Forward rename to primary side
        const renameResult = await this.primary.rename(group, target);
        if (!renameResult) {
            return undefined;
        }
        // Build a side-by-side result from the rename result
        if (isEditorInput(renameResult.editor)) {
            return {
                editor: new SideBySideEditorInput_1(this.preferredName, this.preferredDescription, renameResult.editor, renameResult.editor, this.editorService),
                options: {
                    ...renameResult.options,
                    viewState: findViewStateForEditor(this, group, this.editorService),
                },
            };
        }
        if (isResourceEditorInput(renameResult.editor)) {
            return {
                editor: {
                    label: this.preferredName,
                    description: this.preferredDescription,
                    primary: renameResult.editor,
                    secondary: renameResult.editor,
                    options: {
                        ...renameResult.options,
                        viewState: findViewStateForEditor(this, group, this.editorService),
                    },
                },
            };
        }
        return undefined;
    }
    isReadonly() {
        return this.primary.isReadonly();
    }
    toUntyped(options) {
        const primaryResourceEditorInput = this.primary.toUntyped(options);
        const secondaryResourceEditorInput = this.secondary.toUntyped(options);
        // Prevent nested side by side editors which are unsupported
        if (primaryResourceEditorInput &&
            secondaryResourceEditorInput &&
            !isResourceDiffEditorInput(primaryResourceEditorInput) &&
            !isResourceDiffEditorInput(secondaryResourceEditorInput) &&
            !isResourceMultiDiffEditorInput(primaryResourceEditorInput) &&
            !isResourceMultiDiffEditorInput(secondaryResourceEditorInput) &&
            !isResourceSideBySideEditorInput(primaryResourceEditorInput) &&
            !isResourceSideBySideEditorInput(secondaryResourceEditorInput) &&
            !isResourceMergeEditorInput(primaryResourceEditorInput) &&
            !isResourceMergeEditorInput(secondaryResourceEditorInput)) {
            const untypedInput = {
                label: this.preferredName,
                description: this.preferredDescription,
                primary: primaryResourceEditorInput,
                secondary: secondaryResourceEditorInput,
            };
            if (typeof options?.preserveViewState === 'number') {
                untypedInput.options = {
                    viewState: findViewStateForEditor(this, options.preserveViewState, this.editorService),
                };
            }
            return untypedInput;
        }
        return undefined;
    }
    matches(otherInput) {
        if (this === otherInput) {
            return true;
        }
        if (isDiffEditorInput(otherInput) || isResourceDiffEditorInput(otherInput)) {
            return false; // prevent subclass from matching
        }
        if (otherInput instanceof SideBySideEditorInput_1) {
            return (this.primary.matches(otherInput.primary) && this.secondary.matches(otherInput.secondary));
        }
        if (isResourceSideBySideEditorInput(otherInput)) {
            return (this.primary.matches(otherInput.primary) && this.secondary.matches(otherInput.secondary));
        }
        return false;
    }
};
SideBySideEditorInput = SideBySideEditorInput_1 = __decorate([
    __param(4, IEditorService)
], SideBySideEditorInput);
export { SideBySideEditorInput };
export class AbstractSideBySideEditorInputSerializer {
    canSerialize(editorInput) {
        const input = editorInput;
        if (input.primary && input.secondary) {
            const [secondaryInputSerializer, primaryInputSerializer] = this.getSerializers(input.secondary.typeId, input.primary.typeId);
            return !!(secondaryInputSerializer?.canSerialize(input.secondary) &&
                primaryInputSerializer?.canSerialize(input.primary));
        }
        return false;
    }
    serialize(editorInput) {
        const input = editorInput;
        if (input.primary && input.secondary) {
            const [secondaryInputSerializer, primaryInputSerializer] = this.getSerializers(input.secondary.typeId, input.primary.typeId);
            if (primaryInputSerializer && secondaryInputSerializer) {
                const primarySerialized = primaryInputSerializer.serialize(input.primary);
                const secondarySerialized = secondaryInputSerializer.serialize(input.secondary);
                if (primarySerialized && secondarySerialized) {
                    const serializedEditorInput = {
                        name: input.getPreferredName(),
                        description: input.getPreferredDescription(),
                        primarySerialized,
                        secondarySerialized,
                        primaryTypeId: input.primary.typeId,
                        secondaryTypeId: input.secondary.typeId,
                    };
                    return JSON.stringify(serializedEditorInput);
                }
            }
        }
        return undefined;
    }
    deserialize(instantiationService, serializedEditorInput) {
        const deserialized = JSON.parse(serializedEditorInput);
        const [secondaryInputSerializer, primaryInputSerializer] = this.getSerializers(deserialized.secondaryTypeId, deserialized.primaryTypeId);
        if (primaryInputSerializer && secondaryInputSerializer) {
            const primaryInput = primaryInputSerializer.deserialize(instantiationService, deserialized.primarySerialized);
            const secondaryInput = secondaryInputSerializer.deserialize(instantiationService, deserialized.secondarySerialized);
            if (primaryInput instanceof EditorInput && secondaryInput instanceof EditorInput) {
                return this.createEditorInput(instantiationService, deserialized.name, deserialized.description, secondaryInput, primaryInput);
            }
        }
        return undefined;
    }
    getSerializers(secondaryEditorInputTypeId, primaryEditorInputTypeId) {
        const registry = Registry.as(EditorExtensions.EditorFactory);
        return [
            registry.getEditorSerializer(secondaryEditorInputTypeId),
            registry.getEditorSerializer(primaryEditorInputTypeId),
        ];
    }
}
export class SideBySideEditorInputSerializer extends AbstractSideBySideEditorInputSerializer {
    createEditorInput(instantiationService, name, description, secondaryInput, primaryInput) {
        return instantiationService.createInstance(SideBySideEditorInput, name, description, secondaryInput, primaryInput);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2lkZUJ5U2lkZUVkaXRvcklucHV0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbW1vbi9lZGl0b3Ivc2lkZUJ5U2lkZUVkaXRvcklucHV0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFHckQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBRTFDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUN4RSxPQUFPLEVBS04sZ0JBQWdCLEVBS2hCLCtCQUErQixFQUMvQixpQkFBaUIsRUFDakIseUJBQXlCLEVBRXpCLHNCQUFzQixFQUV0QixhQUFhLEVBQ2IscUJBQXFCLEVBRXJCLDBCQUEwQixFQUMxQiw4QkFBOEIsR0FDOUIsTUFBTSxjQUFjLENBQUE7QUFDckIsT0FBTyxFQUFFLFdBQVcsRUFBeUIsTUFBTSxrQkFBa0IsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFFOUU7O0dBRUc7QUFDSSxJQUFNLHFCQUFxQixHQUEzQixNQUFNLHFCQUFzQixTQUFRLFdBQVc7O2FBQ3JDLE9BQUUsR0FBVyw4Q0FBOEMsQUFBekQsQ0FBeUQ7SUFFM0UsSUFBYSxNQUFNO1FBQ2xCLE9BQU8sdUJBQXFCLENBQUMsRUFBRSxDQUFBO0lBQ2hDLENBQUM7SUFFRCxJQUFhLFlBQVk7UUFDeEIsbURBQW1EO1FBQ25ELElBQUksWUFBWSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFBO1FBRTVDLG1EQUFtRDtRQUNuRCxzQ0FBc0M7UUFDdEMsWUFBWSxJQUFJLGlEQUF3QyxDQUFBO1FBRXhELDZDQUE2QztRQUM3QyxJQUFJLElBQUksQ0FB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