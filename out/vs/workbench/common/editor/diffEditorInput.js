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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlmZkVkaXRvcklucHV0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbW1vbi9lZGl0b3IvZGlmZkVkaXRvcklucHV0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFDMUMsT0FBTyxFQUNOLHVDQUF1QyxFQUN2QyxxQkFBcUIsR0FDckIsTUFBTSw0QkFBNEIsQ0FBQTtBQUduQyxPQUFPLEVBQ04sbUJBQW1CLEVBQ25CLHFCQUFxQixFQU1yQix5QkFBeUIsR0FJekIsTUFBTSxjQUFjLENBQUE7QUFDckIsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sc0JBQXNCLENBQUE7QUFDMUQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNCQUFzQixDQUFBO0FBQ3RELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBRTlELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDeEQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFnQmpGOzs7R0FHRztBQUNJLElBQU0sZUFBZSxHQUFyQixNQUFNLGVBQWdCLFNBQVEscUJBQXFCOzthQUNoQyxPQUFFLEdBQVcsbUNBQW1DLEFBQTlDLENBQThDO0lBRXpFLElBQWEsTUFBTTtRQUNsQixPQUFPLGlCQUFlLENBQUMsRUFBRSxDQUFBO0lBQzFCLENBQUM7SUFFRCxJQUFhLFFBQVE7UUFDcEIsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsS0FBSyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxD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