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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVzb3VyY2VFZGl0b3JJbnB1dC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbW1vbi9lZGl0b3IvcmVzb3VyY2VFZGl0b3JJbnB1dC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQVFoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sa0JBQWtCLENBQUE7QUFFOUMsT0FBTyxFQUNOLFFBQVEsRUFFUixZQUFZLEVBQ1osNkJBQTZCLEdBQzdCLE1BQU0seUNBQXlDLENBQUE7QUFDaEQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDcEUsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sdUVBQXVFLENBQUE7QUFFbEgsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxpQ0FBaUMsRUFBRSxNQUFNLDhEQUE4RCxDQUFBO0FBQ2hILE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBRXBHOztHQUVHO0FBQ0ksSUFBZSwyQkFBMkIsR0FBMUMsTUFBZSwyQkFDckIsU0FBUSxXQUFXO0lBR25CLElBQWEsWUFBWTtRQUN4QixJQUFJLFlBQVksbURBQTBDLENBQUE7UUFFMUQsSUFBSSxJQUFJLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztZQUNqRCxJQUFJLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7Z0JBQzlELFlBQVksNENBQW9DLENBQUE7WUFDakQsQ0FBQztRQUNGLENBQUM7YUFBTSxDQUFDO1lBQ1AsWUFBWSw0Q0FBb0MsQ0FBQTtRQUNqRCxDQUFDO1FBRUQsSUFBSSxDQUFDLENBQUMsWUFBWSwyQ0FBbUMsQ0FBQyxFQUFFLENBQUM7WUFDeEQsWUFBWSx1REFBNkMsQ0FBQTtRQUMxRCxDQUFDO1FBRUQsT0FBTyxZQUFZLENBQUE7SUFDcEIsQ0FBQztJQUdELElBQUksaUJBQWlCO1FBQ3BCLE9BQU8sSUFBSSxDQUFDLGtCQUFrQixDQUFBO0lBQy9CLENBQUM7SUFFRCxZQUNVLFFBQWEsRUFDdEIsaUJBQWtDLEVBQ25CLFlBQThDLEVBQy9DLFdBQTRDLEVBRTFELHlCQUF3RSxFQUV4RSxnQ0FBc0YsRUFFdEYsd0JBQXNFO1FBRXRFLEtBQUssRUFBRSxDQUFBO1FBWEUsYUFBUSxHQUFSLFFBQVEsQ0FBSztRQUVZLGlCQUFZLEdBQVosWUFBWSxDQUFlO1FBQzVCLGdCQUFXLEdBQVgsV0FBVyxDQUFjO1FBRXZDLDhCQUF5QixHQUF6Qix5QkFBeUIsQ0FBNEI7UUFFckQscUNBQWdDLEdBQWhDLGdDQUFnQyxDQUFtQztRQUVuRSw2QkFBd0IsR0FBeEIsd0JBQXdCLENBQTJCO1FBMEQvRCxVQUFLLEdBQXVCLFNBQVMsQ0FBQTtRQXVCckMsc0JBQWlCLEdBQXVCLFNBQVMsQ0FBQTtRQVdqRCx1QkFBa0IsR0FBdUIsU0FBUyxDQUFBO1FBV2xELHFCQUFnQixHQUF1QixTQUFTLENBQUE7UUFTaEQsZ0JBQVcsR0FBdUIsU0FBUyxDQUFBO1FBUzNDLGlCQUFZLEdBQXVCLFNBQVMsQ0FBQTtRQVM1QyxlQUFVLEdBQXVCLFNBQVMsQ0FBQTtRQTlIakQsSUFBSSxDQUFDLGtCQUFrQixHQUFHLGlCQUFpQixJQUFJLFFBQVEsQ0FBQTtRQUV2RCxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQTtJQUN6QixDQUFDO0lBRU8saUJBQWlCO1FBQ3hCLG1EQUFtRDtRQUNuRCxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUMzRixJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxXQUFXLENBQUMsMENBQTBDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUNqRSxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FDM0IsQ0FDRCxDQUFBO1FBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsV0FBVyxDQUFDLHlDQUF5QyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FDaEUsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQzNCLENBQ0QsQ0FBQTtRQUNELElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ25GLElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLHlCQUF5QixDQUFDLG1CQUFtQixDQUFDLEdBQUcsRUFBRSxDQUN2RCxJQUFJLENBQUMsd0JBQXdCLENBQUMsSUFBSSxFQUFFLENBQ3BDLENBQ0QsQ0FBQTtJQUNGLENBQUM7SUFFTyxZQUFZLENBQUMsTUFBYztRQUNsQyxJQUFJLE1BQU0sS0FBSyxJQUFJLENBQUMsa0JBQWtCLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDL0MsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFBO1FBQ25CLENBQUM7SUFDRixDQUFDO0lBRU8sV0FBVztRQUNsQixzQ0FBc0M7UUFDdEMsSUFBSSxDQUFDLEtBQUssR0FBRyxTQUFTLENBQUE7UUFDdEIsSUFBSSxDQUFDLGlCQUFpQixHQUFHLFNBQVMsQ0FBQTtRQUNsQyxJQUFJLENBQUMsa0JBQWtCLEdBQUcsU0FBUyxDQUFBO1FBQ25DLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxTQUFTLENBQUE7UUFDakMsSUFBSSxDQUFDLFdBQVcsR0FBRyxTQUFTLENBQUE7UUFDNUIsSUFBSSxDQUFDLFlBQVksR0FBRyxTQUFTLENBQUE7UUFDN0IsSUFBSSxDQUFDLFVBQVUsR0FBRyxTQUFTLENBQUE7UUFFM0IsNkJBQTZCO1FBQzdCLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtJQUM5QixDQUFDO0lBRUQsb0JBQW9CLENBQUMsaUJBQXNCO1FBQzFDLElBQUksQ0FBQyxPQUFPLENBQUMsaUJBQWlCLEVBQUUsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEVBQUUsQ0FBQztZQUMxRCxJQUFJLENBQUMsa0JBQWtCLEdBQUcsaUJBQWlCLENBQUE7WUFFM0MsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFBO1FBQ25CLENBQUM7SUFDRixDQUFDO0lBR1EsT0FBTztRQUNmLElBQUksT0FBTyxJQUFJLENBQUMsS0FBSyxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQ3BDLElBQUksQ0FBQyxLQUFLO2dCQUNULElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDO29CQUM5RCxJQUFJLENBQUMsWUFBWSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO1FBQ2hFLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUE7SUFDbEIsQ0FBQztJQUVRLGNBQWMsQ0FBQyxTQUFTLDJCQUFtQjtRQUNuRCxRQUFRLFNBQVMsRUFBRSxDQUFDO1lBQ25CO2dCQUNDLE9BQU8sSUFBSSxDQUFDLGdCQUFnQixDQUFBO1lBQzdCO2dCQUNDLE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQTtZQUM1Qiw4QkFBc0I7WUFDdEI7Z0JBQ0MsT0FBTyxJQUFJLENBQUMsaUJBQWlCLENBQUE7UUFDL0IsQ0FBQztJQUNGLENBQUM7SUFHRCxJQUFZLGdCQUFnQjtRQUMzQixJQUFJLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQ2hELElBQUksQ0FBQyxpQkFBaUIsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLG1CQUFtQixDQUM3RCxPQUFPLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQ2hDLENBQUE7UUFDRixDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUMsaUJBQWlCLENBQUE7SUFDOUIsQ0FBQztJQUdELElBQVksaUJBQWlCO1FBQzVCLElBQUksT0FBTyxJQUFJLENBQUMsa0JBQWtCLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDakQsSUFBSSxDQUFDLGtCQUFrQixHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsRUFBRTtnQkFDekYsUUFBUSxFQUFFLElBQUk7YUFDZCxDQUFDLENBQUE7UUFDSCxDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUMsa0JBQWtCLENBQUE7SUFDL0IsQ0FBQztJQUdELElBQVksZUFBZTtRQUMxQixJQUFJLE9BQU8sSUFBSSxDQUFDLGdCQUFnQixLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQy9DLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQTtRQUN4RixDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUMsZ0JBQWdCLENBQUE7SUFDN0IsQ0FBQztJQUdELElBQVksVUFBVTtRQUNyQixJQUFJLE9BQU8sSUFBSSxDQUFDLFdBQVcsS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUMxQyxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUNsQyxDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFBO0lBQ3hCLENBQUM7SUFHRCxJQUFZLFdBQVc7UUFDdEIsSUFBSSxPQUFPLElBQUksQ0FBQyxZQUFZLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDM0MsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUMvRixDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFBO0lBQ3pCLENBQUM7SUFHRCxJQUFZLFNBQVM7UUFDcEIsSUFBSSxPQUFPLElBQUksQ0FBQyxVQUFVLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDekMsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtRQUN6RSxDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFBO0lBQ3ZCLENBQUM7SUFFUSxRQUFRLENBQUMsU0FBcUI7UUFDdEMsUUFBUSxTQUFTLEVBQUUsQ0FBQztZQUNuQjtnQkFDQyxPQUFPLElBQUksQ0FBQyxVQUFVLENBQUE7WUFDdkI7Z0JBQ0MsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFBO1lBQ3RCLFFBQVE7WUFDUjtnQkFDQyxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUE7UUFDekIsQ0FBQztJQUNGLENBQUM7SUFFUSxVQUFVO1FBQ2xCLE9BQU8sSUFBSSxDQUFDLHlCQUF5QixDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUE7SUFDaEUsQ0FBQztJQUVTLFlBQVksQ0FBQyxPQUF3QztRQUM5RCxJQUFJLE9BQU8sRUFBRSxNQUFNLEVBQUUsQ0FBQztZQUNyQixPQUFPLE9BQU8sQ0FBQyxNQUFNLENBQUEsQ0FBQyxrQ0FBa0M7UUFDekQsQ0FBQztRQUVELCtFQUErRTtRQUMvRSxrRkFBa0Y7UUFDbEYsaUZBQWlGO1FBQ2pGLG1CQUFtQjtRQUVuQixNQUFNLGdCQUFnQixHQUFHLDZCQUE2QixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUNyRSxJQUFJLG1CQUFtQixHQUF1QixTQUFTLENBQUE7UUFFdkQsTUFBTSxxQkFBcUIsR0FBRyxJQUFJLENBQUMsZ0NBQWdDLENBQUMsT0FBTyxDQUMxRSxJQUFJLENBQUMsUUFBUSxFQUNiLElBQUksRUFDSix1Q0FBdUMsQ0FDdkMsQ0FBQTtRQUNELElBQUksWUFBWSxDQUFDLHFCQUFxQixDQUFDLEVBQUUsQ0FBQztZQUN6QyxtQkFBbUIsR0FBRyxxQkFBcUIsQ0FBQyxLQUFLLEdBQUcsUUFBUSxDQUFDLEVBQUUsQ0FBQSxDQUFDLGtCQUFrQjtRQUNuRixDQUFDO1FBRUQsT0FBTztZQUNOLElBQUksRUFBRSxtQkFBbUIsSUFBSSxnQkFBZ0I7U0FDN0MsQ0FBQTtJQUNGLENBQUM7Q0FDRCxDQUFBO0FBMU5xQiwyQkFBMkI7SUE4QjlDLFdBQUEsYUFBYSxDQUFBO0lBQ2IsV0FBQSxZQUFZLENBQUE7SUFDWixXQUFBLDBCQUEwQixDQUFBO0lBRTFCLFdBQUEsaUNBQWlDLENBQUE7SUFFakMsV0FBQSx5QkFBeUIsQ0FBQTtHQXBDTiwyQkFBMkIsQ0EwTmhEIn0=