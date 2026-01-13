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
var DiffEditorInput_1;
import { localize } from '../../../nls.js';
import { AbstractSideBySideEditorInputSerializer, SideBySideEditorInput, } from './sideBySideEditorInput.js';
import { TEXT_DIFF_EDITOR_ID, BINARY_DIFF_EDITOR_ID, isResourceDiffEditorInput, } from '../editor.js';
import { BaseTextEditorModel } from './textEditorModel.js';
import { DiffEditorModel } from './diffEditorModel.js';
import { TextDiffEditorModel } from './textDiffEditorModel.js';
import { IEditorService } from '../../services/editor/common/editorService.js';
import { shorten } from '../../../base/common/labels.js';
import { isResolvedEditorModel } from '../../../platform/editor/common/editor.js';
/**
 * The base editor input for the diff editor. It is made up of two editor inputs, the original version
 * and the modified version.
 */
let DiffEditorInput = class DiffEditorInput extends SideBySideEditorInput {
    static { DiffEditorInput_1 = this; }
    static { this.ID = 'workbench.editors.diffEditorInput'; }
    get typeId() {
        return DiffEditorInput_1.ID;
    }
    get editorId() {
        return this.modified.editorId === this.original.editorId ? this.modified.editorId : undefined;
    }
    get capabilities() {
        let capabilities = super.capabilities;
        // Force description capability depends on labels
        if (this.labels.forceDescription) {
            capabilities |= 64 /* EditorInputCapabilities.ForceDescription */;
        }
        return capabilities;
    }
    constructor(preferredName, preferredDescription, original, modified, forceOpenAsBinary, editorService) {
        super(preferredName, preferredDescription, original, modified, editorService);
        this.original = original;
        this.modified = modified;
        this.forceOpenAsBinary = forceOpenAsBinary;
        this.cachedModel = undefined;
        this.labels = this.computeLabels();
    }
    computeLabels() {
        // Name
        let name;
        let forceDescription = false;
        if (this.preferredName) {
            name = this.preferredName;
        }
        else {
            const originalName = this.original.getName();
            const modifiedName = this.modified.getName();
            name = localize('sideBySideLabels', '{0} ↔ {1}', originalName, modifiedName);
            // Enforce description when the names are identical
            forceDescription = originalName === modifiedName;
        }
        // Description
        let shortDescription;
        let mediumDescription;
        let longDescription;
        if (this.preferredDescription) {
            shortDescription = this.preferredDescription;
            mediumDescription = this.preferredDescription;
            longDescription = this.preferredDescription;
        }
        else {
            shortDescription = this.computeLabel(this.original.getDescription(0 /* Verbosity.SHORT */), this.modified.getDescription(0 /* Verbosity.SHORT */));
            longDescription = this.computeLabel(this.original.getDescription(2 /* Verbosity.LONG */), this.modified.getDescription(2 /* Verbosity.LONG */));
            // Medium Description: try to be verbose by computing
            // a label that resembles the difference between the two
            const originalMediumDescription = this.original.getDescription(1 /* Verbosity.MEDIUM */);
            const modifiedMediumDescription = this.modified.getDescription(1 /* Verbosity.MEDIUM */);
            if (typeof originalMediumDescription === 'string' &&
                typeof modifiedMediumDescription === 'string' && // we can only `shorten` when both sides are strings...
                (originalMediumDescription || modifiedMediumDescription) // ...however never when both sides are empty strings
            ) {
                const [shortenedOriginalMediumDescription, shortenedModifiedMediumDescription] = shorten([
                    originalMediumDescription,
                    modifiedMediumDescription,
                ]);
                mediumDescription = this.computeLabel(shortenedOriginalMediumDescription, shortenedModifiedMediumDescription);
            }
        }
        // Title
        let shortTitle = this.computeLabel(this.original.getTitle(0 /* Verbosity.SHORT */) ?? this.original.getName(), this.modified.getTitle(0 /* Verbosity.SHORT */) ?? this.modified.getName(), ' ↔ ');
        let mediumTitle = this.computeLabel(this.original.getTitle(1 /* Verbosity.MEDIUM */) ?? this.original.getName(), this.modified.getTitle(1 /* Verbosity.MEDIUM */) ?? this.modified.getName(), ' ↔ ');
        let longTitle = this.computeLabel(this.original.getTitle(2 /* Verbosity.LONG */) ?? this.original.getName(), this.modified.getTitle(2 /* Verbosity.LONG */) ?? this.modified.getName(), ' ↔ ');
        const preferredTitle = this.getPreferredTitle();
        if (preferredTitle) {
            shortTitle = `${preferredTitle} (${shortTitle})`;
            mediumTitle = `${preferredTitle} (${mediumTitle})`;
            longTitle = `${preferredTitle} (${longTitle})`;
        }
        return {
            name,
            shortDescription,
            mediumDescription,
            longDescription,
            forceDescription,
            shortTitle,
            mediumTitle,
            longTitle,
        };
    }
    computeLabel(originalLabel, modifiedLabel, separator = ' - ') {
        if (!originalLabel || !modifiedLabel) {
            return undefined;
        }
        if (originalLabel === modifiedLabel) {
            return modifiedLabel;
        }
        return `${originalLabel}${separator}${modifiedLabel}`;
    }
    getName() {
        return this.labels.name;
    }
    getDescription(verbosity = 1 /* Verbosity.MEDIUM */) {
        switch (verbosity) {
            case 0 /* Verbosity.SHORT */:
                return this.labels.shortDescription;
            case 2 /* Verbosity.LONG */:
                return this.labels.longDescription;
            case 1 /* Verbosity.MEDIUM */:
            default:
                return this.labels.mediumDescription;
        }
    }
    getTitle(verbosity) {
        switch (verbosity) {
            case 0 /* Verbosity.SHORT */:
                return this.labels.shortTitle;
            case 2 /* Verbosity.LONG */:
                return this.labels.longTitle;
            default:
            case 1 /* Verbosity.MEDIUM */:
                return this.labels.mediumTitle;
        }
    }
    async resolve() {
        // Create Model - we never reuse our cached model if refresh is true because we cannot
        // decide for the inputs within if the cached model can be reused or not. There may be
        // inputs that need to be loaded again and thus we always recreate the model and dispose
        // the previous one - if any.
        const resolvedModel = await this.createModel();
        this.cachedModel?.dispose();
        this.cachedModel = resolvedModel;
        return this.cachedModel;
    }
    prefersEditorPane(editorPanes) {
        if (this.forceOpenAsBinary) {
            return editorPanes.find((editorPane) => editorPane.typeId === BINARY_DIFF_EDITOR_ID);
        }
        return editorPanes.find((editorPane) => editorPane.typeId === TEXT_DIFF_EDITOR_ID);
    }
    async createModel() {
        // Join resolve call over two inputs and build diff editor model
        const [originalEditorModel, modifiedEditorModel] = await Promise.all([
            this.original.resolve(),
            this.modified.resolve(),
        ]);
        // If both are text models, return textdiffeditor model
        if (modifiedEditorModel instanceof BaseTextEditorModel &&
            originalEditorModel instanceof BaseTextEditorModel) {
            return new TextDiffEditorModel(originalEditorModel, modifiedEditorModel);
        }
        // Otherwise return normal diff model
        return new DiffEditorModel(isResolvedEditorModel(originalEditorModel) ? originalEditorModel : undefined, isResolvedEditorModel(modifiedEditorModel) ? modifiedEditorModel : undefined);
    }
    toUntyped(options) {
        const untyped = super.toUntyped(options);
        if (untyped) {
            return {
                ...untyped,
                modified: untyped.primary,
                original: untyped.secondary,
            };
        }
        return undefined;
    }
    matches(otherInput) {
        if (this === otherInput) {
            return true;
        }
        if (otherInput instanceof DiffEditorInput_1) {
            return (this.modified.matches(otherInput.modified) &&
                this.original.matches(otherInput.original) &&
                otherInput.forceOpenAsBinary === this.forceOpenAsBinary);
        }
        if (isResourceDiffEditorInput(otherInput)) {
            return (this.modified.matches(otherInput.modified) && this.original.matches(otherInput.original));
        }
        return false;
    }
    dispose() {
        // Free the diff editor model but do not propagate the dispose() call to the two inputs
        // We never created the two inputs (original and modified) so we can not dispose
        // them without sideeffects.
        if (this.cachedModel) {
            this.cachedModel.dispose();
            this.cachedModel = undefined;
        }
        super.dispose();
    }
};
DiffEditorInput = DiffEditorInput_1 = __decorate([
    __param(5, IEditorService)
], DiffEditorInput);
export { DiffEditorInput };
export class DiffEditorInputSerializer extends AbstractSideBySideEditorInputSerializer {
    createEditorInput(instantiationService, name, description, secondaryInput, primaryInput) {
        return instantiationService.createInstance(DiffEditorInput, name, description, secondaryInput, primaryInput, undefined);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlmZkVkaXRvcklucHV0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29tbW9uL2VkaXRvci9kaWZmRWRpdG9ySW5wdXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUMxQyxPQUFPLEVBQ04sdUNBQXVDLEVBQ3ZDLHFCQUFxQixHQUNyQixNQUFNLDRCQUE0QixDQUFBO0FBR25DLE9BQU8sRUFDTixtQkFBbUIsRUFDbkIscUJBQXFCLEVBTXJCLHlCQUF5QixHQUl6QixNQUFNLGNBQWMsQ0FBQTtBQUNyQixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0JBQXNCLENBQUE7QUFDdEQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFFOUQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQzlFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN4RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQWdCakY7OztHQUdHO0FBQ0ksSUFBTSxlQUFlLEdBQXJCLE1BQU0sZUFBZ0IsU0FBUSxxQkFBcUI7O2FBQ2hDLE9BQUUsR0FBVyxtQ0FBbUMsQUFBOUMsQ0FBOEM7SUFFekUsSUFBYSxNQUFNO1FBQ2xCLE9BQU8saUJBQWUsQ0FBQyxFQUFFLENBQUE7SUFDMUIsQ0FBQztJQUVELElBQWEsUUFBUTtRQUNwQixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxLQUFLLElBQUksQ0FBQyxRQUFRLENBQUMsUUFB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