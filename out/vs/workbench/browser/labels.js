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
import { localize } from '../../nls.js';
import { URI } from '../../base/common/uri.js';
import { dirname, isEqual, basenameOrAuthority } from '../../base/common/resources.js';
import { IconLabel, } from '../../base/browser/ui/iconLabel/iconLabel.js';
import { ILanguageService } from '../../editor/common/languages/language.js';
import { IWorkspaceContextService } from '../../platform/workspace/common/workspace.js';
import { IConfigurationService } from '../../platform/configuration/common/configuration.js';
import { IModelService } from '../../editor/common/services/model.js';
import { ITextFileService } from '../services/textfile/common/textfiles.js';
import { IDecorationsService, } from '../services/decorations/common/decorations.js';
import { Schemas } from '../../base/common/network.js';
import { FileKind, FILES_ASSOCIATIONS_CONFIG } from '../../platform/files/common/files.js';
import { IThemeService } from '../../platform/theme/common/themeService.js';
import { Event, Emitter } from '../../base/common/event.js';
import { ILabelService } from '../../platform/label/common/label.js';
import { getIconClasses } from '../../editor/common/services/getIconClasses.js';
import { Disposable, dispose, MutableDisposable } from '../../base/common/lifecycle.js';
import { IInstantiationService } from '../../platform/instantiation/common/instantiation.js';
import { normalizeDriveLetter } from '../../base/common/labels.js';
import { INotebookDocumentService, extractCellOutputDetails, } from '../services/notebook/common/notebookDocumentService.js';
function toResource(props) {
    if (!props || !props.resource) {
        return undefined;
    }
    if (URI.isUri(props.resource)) {
        return props.resource;
    }
    return props.resource.primary;
}
export const DEFAULT_LABELS_CONTAINER = {
    onDidChangeVisibility: Event.None,
};
let ResourceLabels = class ResourceLabels extends Disposable {
    constructor(container, instantiationService, configurationService, modelService, workspaceService, languageService, decorationsService, themeService, labelService, textFileService) {
        super();
        this.instantiationService = instantiationService;
        this.configurationService = configurationService;
        this.modelService = modelService;
        this.workspaceService = workspaceService;
        this.languageService = languageService;
        this.decorationsService = decorationsService;
        this.themeService = themeService;
        this.labelService = labelService;
        this.textFileService = textFileService;
        this._onDidChangeDecorations = this._register(new Emitter());
        this.onDidChangeDecorations = this._onDidChangeDecorations.event;
        this.widgets = [];
        this.labels = [];
        this.registerListeners(container);
    }
    registerListeners(container) {
        // notify when visibility changes
        this._register(container.onDidChangeVisibility((visible) => {
            this.widgets.forEach((widget) => widget.notifyVisibilityChanged(visible));
        }));
        // notify when extensions are registered with potentially new languages
        this._register(this.languageService.onDidChange(() => this.widgets.forEach((widget) => widget.notifyExtensionsRegistered())));
        // notify when model language changes
        this._register(this.modelService.onModelLanguageChanged((e) => {
            if (!e.model.uri) {
                return; // we need the resource to compare
            }
            this.widgets.forEach((widget) => widget.notifyModelLanguageChanged(e.model));
        }));
        // notify when model is added
        this._register(this.modelService.onModelAdded((model) => {
            if (!model.uri) {
                return; // we need the resource to compare
            }
            this.widgets.forEach((widget) => widget.notifyModelAdded(model));
        }));
        // notify when workspace folders changes
        this._register(this.workspaceService.onDidChangeWorkspaceFolders(() => {
            this.widgets.forEach((widget) => widget.notifyWorkspaceFoldersChange());
        }));
        // notify when file decoration changes
        this._register(this.decorationsService.onDidChangeDecorations((e) => {
            let notifyDidChangeDecorations = false;
            this.widgets.forEach((widget) => {
                if (widget.notifyFileDecorationsChanges(e)) {
                    notifyDidChangeDecorations = true;
                }
            });
            if (notifyDidChangeDecorations) {
                this._onDidChangeDecorations.fire();
            }
        }));
        // notify when theme changes
        this._register(this.themeService.onDidColorThemeChange(() => this.widgets.forEach((widget) => widget.notifyThemeChange())));
        // notify when files.associations changes
        this._register(this.configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration(FILES_ASSOCIATIONS_CONFIG)) {
                this.widgets.forEach((widget) => widget.notifyFileAssociationsChange());
            }
        }));
        // notify when label formatters change
        this._register(this.labelService.onDidChangeFormatters((e) => {
            this.widgets.forEach((widget) => widget.notifyFormattersChange(e.scheme));
        }));
        // notify when untitled labels change
        this._register(this.textFileService.untitled.onDidChangeLabel((model) => {
            this.widgets.forEach((widget) => widget.notifyUntitledLabelChange(model.resource));
        }));
    }
    get(index) {
        return this.labels[index];
    }
    create(container, options) {
        const widget = this.instantiationService.createInstance(ResourceLabelWidget, container, options);
        // Only expose a handle to the outside
        const label = {
            element: widget.element,
            onDidRender: widget.onDidRender,
            setLabel: (label, description, options) => widget.setLabel(label, description, options),
            setResource: (label, options) => widget.setResource(label, options),
            setFile: (resource, options) => widget.setFile(resource, options),
            clear: () => widget.clear(),
            dispose: () => this.disposeWidget(widget),
        };
        // Store
        this.labels.push(label);
        this.widgets.push(widget);
        return label;
    }
    disposeWidget(widget) {
        const index = this.widgets.indexOf(widget);
        if (index > -1) {
            this.widgets.splice(index, 1);
            this.labels.splice(index, 1);
        }
        dispose(widget);
    }
    clear() {
        this.widgets = dispose(this.widgets);
        this.labels = [];
    }
    dispose() {
        super.dispose();
        this.clear();
    }
};
ResourceLabels = __decorate([
    __param(1, IInstantiationService),
    __param(2, IConfigurationService),
    __param(3, IModelService),
    __param(4, IWorkspaceContextService),
    __param(5, ILanguageService),
    __param(6, IDecorationsService),
    __param(7, IThemeService),
    __param(8, ILabelService),
    __param(9, ITextFileService)
], ResourceLabels);
export { ResourceLabels };
/**
 * Note: please consider to use `ResourceLabels` if you are in need
 * of more than one label for your widget.
 */
let ResourceLabel = class ResourceLabel extends ResourceLabels {
    get element() {
        return this.label;
    }
    constructor(container, options, instantiationService, configurationService, modelService, workspaceService, languageService, decorationsService, themeService, labelService, textFileService) {
        super(DEFAULT_LABELS_CONTAINER, instantiationService, configurationService, modelService, workspaceService, languageService, decorationsService, themeService, labelService, textFileService);
        this.label = this._register(this.create(container, options));
    }
};
ResourceLabel = __decorate([
    __param(2, IInstantiationService),
    __param(3, IConfigurationService),
    __param(4, IModelService),
    __param(5, IWorkspaceContextService),
    __param(6, ILanguageService),
    __param(7, IDecorationsService),
    __param(8, IThemeService),
    __param(9, ILabelService),
    __param(10, ITextFileService)
], ResourceLabel);
export { ResourceLabel };
var Redraw;
(function (Redraw) {
    Redraw[Redraw["Basic"] = 1] = "Basic";
    Redraw[Redraw["Full"] = 2] = "Full";
})(Redraw || (Redraw = {}));
let ResourceLabelWidget = class ResourceLabelWidget extends IconLabel {
    constructor(container, options, languageService, modelService, decorationsService, labelService, textFileService, contextService, notebookDocumentService) {
        super(container, options);
        this.languageService = languageService;
        this.modelService = modelService;
        this.decorationsService = decorationsService;
        this.labelService = labelService;
        this.textFileService = textFileService;
        this.contextService = contextService;
        this.notebookDocumentService = notebookDocumentService;
        this._onDidRender = this._register(new Emitter());
        this.onDidRender = this._onDidRender.event;
        this.label = undefined;
        this.decoration = this._register(new MutableDisposable());
        this.options = undefined;
        this.computedIconClasses = undefined;
        this.computedLanguageId = undefined;
        this.computedPathLabel = undefined;
        this.computedWorkspaceFolderLabel = undefined;
        this.needsRedraw = undefined;
        this.isHidden = false;
    }
    notifyVisibilityChanged(visible) {
        if (visible === this.isHidden) {
            this.isHidden = !visible;
            if (visible && this.needsRedraw) {
                this.render({
                    updateIcon: this.needsRedraw === Redraw.Full,
                    updateDecoration: this.needsRedraw === Redraw.Full,
                });
                this.needsRedraw = undefined;
            }
        }
    }
    notifyModelLanguageChanged(model) {
        this.handleModelEvent(model);
    }
    notifyModelAdded(model) {
        this.handleModelEvent(model);
    }
    handleModelEvent(model) {
        const resource = toResource(this.label);
        if (!resource) {
            return; // only update if resource exists
        }
        if (isEqual(model.uri, resource)) {
            if (this.computedLanguageId !== model.getLanguageId()) {
                this.computedLanguageId = model.getLanguageId();
                this.render({ updateIcon: true, updateDecoration: false }); // update if the language id of the model has changed from our last known state
            }
        }
    }
    notifyFileDecorationsChanges(e) {
        if (!this.options) {
            return false;
        }
        const resource = toResource(this.label);
        if (!resource) {
            return false;
        }
        if (this.options.fileDecorations && e.affectsResource(resource)) {
            return this.render({ updateIcon: false, updateDecoration: true });
        }
        return false;
    }
    notifyExtensionsRegistered() {
        this.render({ updateIcon: true, updateDecoration: false });
    }
    notifyThemeChange() {
        this.render({ updateIcon: false, updateDecoration: false });
    }
    notifyFileAssociationsChange() {
        this.render({ updateIcon: true, updateDecoration: false });
    }
    notifyFormattersChange(scheme) {
        if (toResource(this.label)?.scheme === scheme) {
            this.render({ updateIcon: false, updateDecoration: false });
        }
    }
    notifyUntitledLabelChange(resource) {
        if (isEqual(resource, toResource(this.label))) {
            this.render({ updateIcon: false, updateDecoration: false });
        }
    }
    notifyWorkspaceFoldersChange() {
        if (typeof this.computedWorkspaceFolderLabel === 'string') {
            const resource = toResource(this.label);
            if (URI.isUri(resource) && this.label?.name === this.computedWorkspaceFolderLabel) {
                this.setFile(resource, this.options);
            }
        }
    }
    setFile(resource, options) {
        const hideLabel = options?.hideLabel;
        let name;
        if (!hideLabel) {
            if (options?.fileKind === FileKind.ROOT_FOLDER) {
                const workspaceFolder = this.contextService.getWorkspaceFolder(resource);
                if (workspaceFolder) {
                    name = workspaceFolder.name;
                    this.computedWorkspaceFolderLabel = name;
                }
            }
            if (!name) {
                name = normalizeDriveLetter(basenameOrAuthority(resource));
            }
        }
        let description;
        if (!options?.hidePath) {
            const descriptionCandidate = this.labelService.getUriLabel(dirname(resource), {
                relative: true,
            });
            if (descriptionCandidate && descriptionCandidate !== '.') {
                // omit description if its not significant: a relative path
                // of '.' just indicates that there is no parent to the path
                // https://github.com/microsoft/vscode/issues/208692
                description = descriptionCandidate;
            }
        }
        this.setResource({ resource, name, description, range: options?.range }, options);
    }
    setResource(label, options = Object.create(null)) {
        const resource = toResource(label);
        const isSideBySideEditor = label?.resource && !URI.isUri(label.resource);
        if (!options.forceLabel && !isSideBySideEditor && resource?.scheme === Schemas.untitled) {
            // Untitled labels are very dynamic because they may change
            // whenever the content changes (unless a path is associated).
            // As such we always ask the actual editor for it's name and
            // description to get latest in case name/description are
            // provided. If they are not provided from the label we got
            // we assume that the client does not want to display them
            // and as such do not override.
            //
            // We do not touch the label if it represents a primary-secondary
            // because in that case we expect it to carry a proper label
            // and description.
            const untitledModel = this.textFileService.untitled.get(resource);
            if (untitledModel && !untitledModel.hasAssociatedFilePath) {
                if (typeof label.name === 'string') {
                    label.name = untitledModel.name;
                }
                if (typeof label.description === 'string') {
                    const untitledDescription = untitledModel.resource.path;
                    if (label.name !== untitledDescription) {
                        label.description = untitledDescription;
                    }
                    else {
                        label.description = undefined;
                    }
                }
                const untitledTitle = untitledModel.resource.path;
                if (untitledModel.name !== untitledTitle) {
                    options.title = `${untitledModel.name} • ${untitledTitle}`;
                }
                else {
                    options.title = untitledTitle;
                }
            }
        }
        if (!options.forceLabel &&
            !isSideBySideEditor &&
            resource?.scheme === Schemas.vscodeNotebookCell) {
            // Notebook cells are embeded in a notebook document
            // As such we always ask the actual notebook document
            // for its position in the document.
            const notebookDocument = this.notebookDocumentService.getNotebook(resource);
            const cellIndex = notebookDocument?.getCellIndex(resource);
            if (notebookDocument && cellIndex !== undefined && typeof label.name === 'string') {
                options.title = localize('notebookCellLabel', '{0} • Cell {1}', label.name, `${cellIndex + 1}`);
            }
            if (typeof label.name === 'string' &&
                notebookDocument &&
                cellIndex !== undefined &&
                typeof label.name === 'string') {
                label.name = localize('notebookCellLabel', '{0} • Cell {1}', label.name, `${cellIndex + 1}`);
            }
        }
        if (!options.forceLabel &&
            !isSideBySideEditor &&
            resource?.scheme === Schemas.vscodeNotebookCellOutput) {
            const notebookDocument = this.notebookDocumentService.getNotebook(resource);
            const outputUriData = extractCellOutputDetails(resource);
            if (outputUriData?.cellFragment) {
                if (!outputUriData.notebook) {
                    return;
                }
                const cellUri = outputUriData.notebook.with({
                    scheme: Schemas.vscodeNotebookCell,
                    fragment: outputUriData.cellFragment,
                });
                const cellIndex = notebookDocument?.getCellIndex(cellUri);
                const outputIndex = outputUriData.outputIndex;
                if (cellIndex !== undefined &&
                    outputIndex !== undefined &&
                    typeof label.name === 'string') {
                    label.name = localize('notebookCellOutputLabel', '{0} • Cell {1} • Output {2}', label.name, `${cellIndex + 1}`, `${outputIndex + 1}`);
                }
                else if (cellIndex !== undefined && typeof label.name === 'string') {
                    label.name = localize('notebookCellOutputLabelSimple', '{0} • Cell {1} • Output', label.name, `${cellIndex + 1}`);
                }
            }
        }
        const hasResourceChanged = this.hasResourceChanged(label);
        const hasPathLabelChanged = hasResourceChanged || this.hasPathLabelChanged(label);
        const hasFileKindChanged = this.hasFileKindChanged(options);
        const hasIconChanged = this.hasIconChanged(options);
        this.label = label;
        this.options = options;
        if (hasResourceChanged) {
            this.computedLanguageId = undefined; // reset computed language since resource changed
        }
        if (hasPathLabelChanged) {
            this.computedPathLabel = undefined; // reset path label due to resource/path-label change
        }
        this.render({
            updateIcon: hasResourceChanged || hasFileKindChanged || hasIconChanged,
            updateDecoration: hasResourceChanged || hasFileKindChanged,
        });
    }
    hasFileKindChanged(newOptions) {
        const newFileKind = newOptions?.fileKind;
        const oldFileKind = this.options?.fileKind;
        return newFileKind !== oldFileKind; // same resource but different kind (file, folder)
    }
    hasResourceChanged(newLabel) {
        const newResource = toResource(newLabel);
        const oldResource = toResource(this.label);
        if (newResource && oldResource) {
            return newResource.toString() !== oldResource.toString();
        }
        if (!newResource && !oldResource) {
            return false;
        }
        return true;
    }
    hasPathLabelChanged(newLabel) {
        const newResource = toResource(newLabel);
        return !!newResource && this.computedPathLabel !== this.labelService.getUriLabel(newResource);
    }
    hasIconChanged(newOptions) {
        return this.options?.icon !== newOptions?.icon;
    }
    clear() {
        this.label = undefined;
        this.options = undefined;
        this.computedLanguageId = undefined;
        this.computedIconClasses = undefined;
        this.computedPathLabel = undefined;
        this.setLabel('');
    }
    render(options) {
        if (this.isHidden) {
            if (this.needsRedraw !== Redraw.Full) {
                this.needsRedraw =
                    options.updateIcon || options.updateDecoration ? Redraw.Full : Redraw.Basic;
            }
            return false;
        }
        if (options.updateIcon) {
            this.computedIconClasses = undefined;
        }
        if (!this.label) {
            return false;
        }
        const iconLabelOptions = {
            title: '',
            italic: this.options?.italic,
            strikethrough: this.options?.strikethrough,
            matches: this.options?.matches,
            descriptionMatches: this.options?.descriptionMatches,
            extraClasses: [],
            separator: this.options?.separator,
            domId: this.options?.domId,
            disabledCommand: this.options?.disabledCommand,
            labelEscapeNewLines: this.options?.labelEscapeNewLines,
            descriptionTitle: this.options?.descriptionTitle,
        };
        const resource = toResource(this.label);
        if (this.options?.title !== undefined) {
            iconLabelOptions.title = this.options.title;
        }
        if (resource &&
            resource.scheme !== Schemas.data /* do not accidentally inline Data URIs */ &&
            (!this.options?.title ||
                (typeof this.options.title !== 'string' &&
                    !this.options.title.markdownNotSupportedFallback))) {
            if (!this.computedPathLabel) {
                this.computedPathLabel = this.labelService.getUriLabel(resource);
            }
            if (!iconLabelOptions.title || typeof iconLabelOptions.title === 'string') {
                iconLabelOptions.title = this.computedPathLabel;
            }
            else if (!iconLabelOptions.title.markdownNotSupportedFallback) {
                iconLabelOptions.title.markdownNotSupportedFallback = this.computedPathLabel;
            }
        }
        if (this.options && !this.options.hideIcon) {
            if (!this.computedIconClasses) {
                this.computedIconClasses = getIconClasses(this.modelService, this.languageService, resource, this.options.fileKind, this.options.icon);
            }
            if (URI.isUri(this.options.icon)) {
                iconLabelOptions.iconPath = this.options.icon;
            }
            iconLabelOptions.extraClasses = this.computedIconClasses.slice(0);
        }
        if (this.options?.extraClasses) {
            iconLabelOptions.extraClasses.push(...this.options.extraClasses);
        }
        if (this.options?.fileDecorations && resource) {
            if (options.updateDecoration) {
                this.decoration.value = this.decorationsService.getDecoration(resource, this.options.fileKind !== FileKind.FILE);
            }
            const decoration = this.decoration.value;
            if (decoration) {
                if (decoration.tooltip) {
                    if (typeof iconLabelOptions.title === 'string') {
                        iconLabelOptions.title = `${iconLabelOptions.title} • ${decoration.tooltip}`;
                    }
                    else if (typeof iconLabelOptions.title?.markdown === 'string') {
                        const title = `${iconLabelOptions.title.markdown} • ${decoration.tooltip}`;
                        iconLabelOptions.title = { markdown: title, markdownNotSupportedFallback: title };
                    }
                }
                if (decoration.strikethrough) {
                    iconLabelOptions.strikethrough = true;
                }
                if (this.options.fileDecorations.colors) {
                    iconLabelOptions.extraClasses.push(decoration.labelClassName);
                }
                if (this.options.fileDecorations.badges) {
                    iconLabelOptions.extraClasses.push(decoration.badgeClassName);
                    iconLabelOptions.extraClasses.push(decoration.iconClassName);
                }
            }
        }
        if (this.label.range) {
            iconLabelOptions.suffix =
                this.label.range.startLineNumber !== this.label.range.endLineNumber
                    ? `:${this.label.range.startLineNumber}-${this.label.range.endLineNumber}`
                    : `:${this.label.range.startLineNumber}`;
        }
        this.setLabel(this.label.name ?? '', this.label.description, iconLabelOptions);
        this._onDidRender.fire();
        return true;
    }
    dispose() {
        super.dispose();
        this.label = undefined;
        this.options = undefined;
        this.computedLanguageId = undefined;
        this.computedIconClasses = undefined;
        this.computedPathLabel = undefined;
        this.computedWorkspaceFolderLabel = undefined;
    }
};
ResourceLabelWidget = __decorate([
    __param(2, ILanguageService),
    __param(3, IModelService),
    __param(4, IDecorationsService),
    __param(5, ILabelService),
    __param(6, ITextFileService),
    __param(7, IWorkspaceContextService),
    __param(8, INotebookDocumentService)
], ResourceLabelWidget);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFiZWxzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvbGFiZWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxjQUFjLENBQUE7QUFDdkMsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQzlDLE9BQU8sRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDdEYsT0FBTyxFQUNOLFNBQVMsR0FHVCxNQUFNLDhDQUE4QyxDQUFBO0FBQ3JELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQzVFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQzVGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUMzRSxPQUFPLEVBRU4sbUJBQW1CLEdBRW5CLE1BQU0sK0NBQStDLENBQUE7QUFDdEQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ3RELE9BQU8sRUFBRSxRQUFRLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUUxRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDM0UsT0FBTyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDcEUsT0FBTyxFQUFFLGNB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