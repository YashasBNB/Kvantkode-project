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
import { EditorInput } from './editorInput.js';
import { ByteSize, IFileService, getLargeFileConfirmationLimit, } from '../../../platform/files/common/files.js';
import { ILabelService } from '../../../platform/label/common/label.js';
import { dirname, isEqual } from '../../../base/common/resources.js';
import { IFilesConfigurationService } from '../../services/filesConfiguration/common/filesConfigurationService.js';
import { isConfigured } from '../../../platform/configuration/common/configuration.js';
import { ITextResourceConfigurationService } from '../../../editor/common/services/textResourceConfiguration.js';
import { ICustomEditorLabelService } from '../../services/editor/common/customEditorLabelService.js';
/**
 * The base class for all editor inputs that open resources.
 */
let AbstractResourceEditorInput = class AbstractResourceEditorInput extends EditorInput {
    get capabilities() {
        let capabilities = 32 /* EditorInputCapabilities.CanSplitInGroup */;
        if (this.fileService.hasProvider(this.resource)) {
            if (this.filesConfigurationService.isReadonly(this.resource)) {
                capabilities |= 2 /* EditorInputCapabilities.Readonly */;
            }
        }
        else {
            capabilities |= 4 /* EditorInputCapabilities.Untitled */;
        }
        if (!(capabilities & 2 /* EditorInputCapabilities.Readonly */)) {
            capabilities |= 128 /* EditorInputCapabilities.CanDropIntoEditor */;
        }
        return capabilities;
    }
    get preferredResource() {
        return this._preferredResource;
    }
    constructor(resource, preferredResource, labelService, fileService, filesConfigurationService, textResourceConfigurationService, customEditorLabelService) {
        super();
        this.resource = resource;
        this.labelService = labelService;
        this.fileService = fileService;
        this.filesConfigurationService = filesConfigurationService;
        this.textResourceConfigurationService = textResourceConfigurationService;
        this.customEditorLabelService = customEditorLabelService;
        this._name = undefined;
        this._shortDescription = undefined;
        this._mediumDescription = undefined;
        this._longDescription = undefined;
        this._shortTitle = undefined;
        this._mediumTitle = undefined;
        this._longTitle = undefined;
        this._preferredResource = preferredResource || resource;
        this.registerListeners();
    }
    registerListeners() {
        // Clear our labels on certain label related events
        this._register(this.labelService.onDidChangeFormatters((e) => this.onLabelEvent(e.scheme)));
        this._register(this.fileService.onDidChangeFileSystemProviderRegistrations((e) => this.onLabelEvent(e.scheme)));
        this._register(this.fileService.onDidChangeFileSystemProviderCapabilities((e) => this.onLabelEvent(e.scheme)));
        this._register(this.customEditorLabelService.onDidChange(() => this.updateLabel()));
        this._register(this.filesConfigurationService.onDidChangeReadonly(() => this._onDidChangeCapabilities.fire()));
    }
    onLabelEvent(scheme) {
        if (scheme === this._preferredResource.scheme) {
            this.updateLabel();
        }
    }
    updateLabel() {
        // Clear any cached labels from before
        this._name = undefined;
        this._shortDescription = undefined;
        this._mediumDescription = undefined;
        this._longDescription = undefined;
        this._shortTitle = undefined;
        this._mediumTitle = undefined;
        this._longTitle = undefined;
        // Trigger recompute of label
        this._onDidChangeLabel.fire();
    }
    setPreferredResource(preferredResource) {
        if (!isEqual(preferredResource, this._preferredResource)) {
            this._preferredResource = preferredResource;
            this.updateLabel();
        }
    }
    getName() {
        if (typeof this._name !== 'string') {
            this._name =
                this.customEditorLabelService.getName(this._preferredResource) ??
                    this.labelService.getUriBasenameLabel(this._preferredResource);
        }
        return this._name;
    }
    getDescription(verbosity = 1 /* Verbosity.MEDIUM */) {
        switch (verbosity) {
            case 0 /* Verbosity.SHORT */:
                return this.shortDescription;
            case 2 /* Verbosity.LONG */:
                return this.longDescription;
            case 1 /* Verbosity.MEDIUM */:
            default:
                return this.mediumDescription;
        }
    }
    get shortDescription() {
        if (typeof this._shortDescription !== 'string') {
            this._shortDescription = this.labelService.getUriBasenameLabel(dirname(this._preferredResource));
        }
        return this._shortDescription;
    }
    get mediumDescription() {
        if (typeof this._mediumDescription !== 'string') {
            this._mediumDescription = this.labelService.getUriLabel(dirname(this._preferredResource), {
                relative: true,
            });
        }
        return this._mediumDescription;
    }
    get longDescription() {
        if (typeof this._longDescription !== 'string') {
            this._longDescription = this.labelService.getUriLabel(dirname(this._preferredResource));
        }
        return this._longDescription;
    }
    get shortTitle() {
        if (typeof this._shortTitle !== 'string') {
            this._shortTitle = this.getName();
        }
        return this._shortTitle;
    }
    get mediumTitle() {
        if (typeof this._mediumTitle !== 'string') {
            this._mediumTitle = this.labelService.getUriLabel(this._preferredResource, { relative: true });
        }
        return this._mediumTitle;
    }
    get longTitle() {
        if (typeof this._longTitle !== 'string') {
            this._longTitle = this.labelService.getUriLabel(this._preferredResource);
        }
        return this._longTitle;
    }
    getTitle(verbosity) {
        switch (verbosity) {
            case 0 /* Verbosity.SHORT */:
                return this.shortTitle;
            case 2 /* Verbosity.LONG */:
                return this.longTitle;
            default:
            case 1 /* Verbosity.MEDIUM */:
                return this.mediumTitle;
        }
    }
    isReadonly() {
        return this.filesConfigurationService.isReadonly(this.resource);
    }
    ensureLimits(options) {
        if (options?.limits) {
            return options.limits; // respect passed in limits if any
        }
        // We want to determine the large file configuration based on the best defaults
        // for the resource but also respecting user settings. We only apply user settings
        // if explicitly configured by the user. Otherwise we pick the best limit for the
        // resource scheme.
        const defaultSizeLimit = getLargeFileConfirmationLimit(this.resource);
        let configuredSizeLimit = undefined;
        const configuredSizeLimitMb = this.textResourceConfigurationService.inspect(this.resource, null, 'workbench.editorLargeFileConfirmation');
        if (isConfigured(configuredSizeLimitMb)) {
            configuredSizeLimit = configuredSizeLimitMb.value * ByteSize.MB; // normalize to MB
        }
        return {
            size: configuredSizeLimit ?? defaultSizeLimit,
        };
    }
};
AbstractResourceEditorInput = __decorate([
    __param(2, ILabelService),
    __param(3, IFileService),
    __param(4, IFilesConfigurationService),
    __param(5, ITextResourceConfigurationService),
    __param(6, ICustomEditorLabelService)
], AbstractResourceEditorInput);
export { AbstractResourceEditorInput };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVzb3VyY2VFZGl0b3JJbnB1dC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb21tb24vZWRpdG9yL3Jlc291cmNlRWRpdG9ySW5wdXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFRaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGtCQUFrQixDQUFBO0FBRTlDLE9BQU8sRUFDTixRQUFRLEVBRVIsWUFBWSxFQUNaLDZCQUE2QixHQUM3QixNQUFNLHlDQUF5QyxDQUFBO0FBQ2hELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLHVFQUF1RSxDQUFBO0FBRWxILE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUN0RixPQUFPLEVBQUUsaUNBQWlDLEVBQUUsTUFBTSw4REFBOEQsQ0FBQTtBQUNoSCxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUVwRzs7R0FFRztBQUNJLElBQWUsMkJBQTJCLEdBQTFDLE1BQWUsMkJBQ3JCLFNBQVEsV0FBVztJQUduQixJQUFhLFlBQVk7UUFDeEIsSUFBSSxZQUFZLG1EQUEwQyxDQUFBO1FBRTFELElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7WUFDakQsSUFBSSxJQUFJLENBQUMseUJBQXlCLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO2dCQUM5RCxZQUFZLDRDQUFvQyxDQUFBO1lBQ2pELENBQUM7UUFDRixDQUFDO2FBQU0sQ0FBQztZ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