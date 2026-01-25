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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2lkZUJ5U2lkZUVkaXRvcklucHV0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29tbW9uL2VkaXRvci9zaWRlQnlTaWRlRWRpdG9ySW5wdXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUdyRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFFMUMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQ3hFLE9BQU8sRUFLTixnQkFBZ0IsRUFLaEIsK0JBQStCLEVBQy9CLGlCQUFpQixFQUNqQix5QkFBeUIsRUFFekIsc0JBQXNCLEVBRXRCLGFBQWEsRUFDYixxQkFBcUIsRUFFckIsMEJBQTBCLEVBQzFCLDhCQUE4QixHQUM5QixNQUFNLGNBQWMsQ0FBQTtBQUNyQixPQUFPLEVBQUUsV0FBVyxFQUF5QixNQUFNLGtCQUFrQixDQUFBO0FBQ3JFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUU5RTs7R0FFRztBQUNJLElBQU0scUJBQXFCLEdBQTNCLE1BQU0scUJBQXNCLFNBQVEsV0FBVzs7YUFDckMsT0FBRSxHQUFXLDhDQUE4QyxBQUF6RCxDQUF5RDtJQUUzRSxJQUFhLE1BQU07UUFDbEIsT0FBTyx1QkFBcUIsQ0FBQyxFQUFFLENBQUE7SUFDaEMsQ0FBQztJQUVELElBQWEsWUFBWTtRQUN4QixtREFBbUQ7UUFDbkQsSUFBSSxZQUFZLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUE7UUFFNUMsbURBQW1EO1FBQ25ELHNDQUFzQztRQUN0QyxZQUFZLElBQUksaURBQXdDLENBQUE7UUFFeEQsNkNBQTZDO1FBQzdDLElBQUksSUFB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