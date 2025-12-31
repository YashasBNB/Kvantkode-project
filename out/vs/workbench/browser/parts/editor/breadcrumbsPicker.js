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
import { compareFileNames } from '../../../../base/common/comparers.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { Emitter } from '../../../../base/common/event.js';
import { createMatches } from '../../../../base/common/filters.js';
import * as glob from '../../../../base/common/glob.js';
import { DisposableStore, MutableDisposable, Disposable, } from '../../../../base/common/lifecycle.js';
import { posix, relative } from '../../../../base/common/path.js';
import { basename, dirname, isEqual } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import './media/breadcrumbscontrol.css';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { FileKind, IFileService } from '../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { WorkbenchDataTree, WorkbenchAsyncDataTree, } from '../../../../platform/list/browser/listService.js';
import { breadcrumbsPickerBackground, widgetBorder, widgetShadow, } from '../../../../platform/theme/common/colorRegistry.js';
import { isWorkspace, isWorkspaceFolder, IWorkspaceContextService, } from '../../../../platform/workspace/common/workspace.js';
import { ResourceLabels, DEFAULT_LABELS_CONTAINER } from '../../labels.js';
import { BreadcrumbsConfig } from './breadcrumbs.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { localize } from '../../../../nls.js';
import { IEditorService, SIDE_GROUP } from '../../../services/editor/common/editorService.js';
import { ITextResourceConfigurationService } from '../../../../editor/common/services/textResourceConfiguration.js';
let BreadcrumbsPicker = class BreadcrumbsPicker {
    constructor(parent, resource, _instantiationService, _themeService, _configurationService) {
        this.resource = resource;
        this._instantiationService = _instantiationService;
        this._themeService = _themeService;
        this._configurationService = _configurationService;
        this._disposables = new DisposableStore();
        this._fakeEvent = new UIEvent('fakeEvent');
        this._onWillPickElement = new Emitter();
        this.onWillPickElement = this._onWillPickElement.event;
        this._previewDispoables = new MutableDisposable();
        this._domNode = document.createElement('div');
        this._domNode.className = 'monaco-breadcrumbs-picker show-file-icons';
        parent.appendChild(this._domNode);
    }
    dispose() {
        this._disposables.dispose();
        this._previewDispoables.dispose();
        this._onWillPickElement.dispose();
        this._domNode.remove();
        setTimeout(() => this._tree.dispose(), 0); // tree cannot be disposed while being opened...
    }
    async show(input, maxHeight, width, arrowSize, arrowOffset) {
        const theme = this._themeService.getColorTheme();
        const color = theme.getColor(breadcrumbsPickerBackground);
        this._arrow = document.createElement('div');
        this._arrow.className = 'arrow';
        this._arrow.style.borderColor = `transparent transparent ${color ? color.toString() : ''}`;
        this._domNode.appendChild(this._arrow);
        this._treeContainer = document.createElement('div');
        this._treeContainer.style.background = color ? color.toString() : '';
        this._treeContainer.style.paddingTop = '2px';
        this._treeContainer.style.borderRadius = '3px';
        this._treeContainer.style.boxShadow = `0 0 8px 2px ${this._themeService.getColorTheme().getColor(widgetShadow)}`;
        this._treeContainer.style.border = `1px solid ${this._themeService.getColorTheme().getColor(widgetBorder)}`;
        this._domNode.appendChild(this._treeContainer);
        this._layoutInfo = { maxHeight, width, arrowSize, arrowOffset, inputHeight: 0 };
        this._tree = this._createTree(this._treeContainer, input);
        this._disposables.add(this._tree.onDidOpen(async (e) => {
            const { element, editorOptions, sideBySide } = e;
            const didReveal = await this._revealElement(element, { ...editorOptions, preserveFocus: false }, sideBySide);
            if (!didReveal) {
                return;
            }
        }));
        this._disposables.add(this._tree.onDidChangeFocus((e) => {
            this._previewDispoables.value = this._previewElement(e.elements[0]);
        }));
        this._disposables.add(this._tree.onDidChangeContentHeight(() => {
            this._layout();
        }));
        this._domNode.focus();
        try {
            await this._setInput(input);
            this._layout();
        }
        catch (err) {
            onUnexpectedError(err);
        }
    }
    _layout() {
        const headerHeight = 2 * this._layoutInfo.arrowSize;
        const treeHeight = Math.min(this._layoutInfo.maxHeight - headerHeight, this._tree.contentHeight);
        const totalHeight = treeHeight + headerHeight;
        this._domNode.style.height = `${totalHeight}px`;
        this._domNode.style.width = `${this._layoutInfo.width}px`;
        this._arrow.style.top = `-${2 * this._layoutInfo.arrowSize}px`;
        this._arrow.style.borderWidth = `${this._layoutInfo.arrowSize}px`;
        this._arrow.style.marginLeft = `${this._layoutInfo.arrowOffset}px`;
        this._treeContainer.style.height = `${treeHeight}px`;
        this._treeContainer.style.width = `${this._layoutInfo.width}px`;
        this._tree.layout(treeHeight, this._layoutInfo.width);
    }
    restoreViewState() { }
};
BreadcrumbsPicker = __decorate([
    __param(2, IInstantiationService),
    __param(3, IThemeService),
    __param(4, IConfigurationService)
], BreadcrumbsPicker);
export { BreadcrumbsPicker };
//#region - Files
class FileVirtualDelegate {
    getHeight(_element) {
        return 22;
    }
    getTemplateId(_element) {
        return 'FileStat';
    }
}
class FileIdentityProvider {
    getId(element) {
        if (URI.isUri(element)) {
            return element.toString();
        }
        else if (isWorkspace(element)) {
            return element.id;
        }
        else if (isWorkspaceFolder(element)) {
            return element.uri.toString();
        }
        else {
            return element.resource.toString();
        }
    }
}
let FileDataSource = class FileDataSource {
    constructor(_fileService) {
        this._fileService = _fileService;
    }
    hasChildren(element) {
        return (URI.isUri(element) ||
            isWorkspace(element) ||
            isWorkspaceFolder(element) ||
            element.isDirectory);
    }
    async getChildren(element) {
        if (isWorkspace(element)) {
            return element.folders;
        }
        let uri;
        if (isWorkspaceFolder(element)) {
            uri = element.uri;
        }
        else if (URI.isUri(element)) {
            uri = element;
        }
        else {
            uri = element.resource;
        }
        const stat = await this._fileService.resolve(uri);
        return stat.children ?? [];
    }
};
FileDataSource = __decorate([
    __param(0, IFileService)
], FileDataSource);
let FileRenderer = class FileRenderer {
    constructor(_labels, _configService) {
        this._labels = _labels;
        this._configService = _configService;
        this.templateId = 'FileStat';
    }
    renderTemplate(container) {
        return this._labels.create(container, { supportHighlights: true });
    }
    renderElement(node, index, templateData) {
        const fileDecorations = this._configService.getValue('explorer.decorations');
        const { element } = node;
        let resource;
        let fileKind;
        if (isWorkspaceFolder(element)) {
            resource = element.uri;
            fileKind = FileKind.ROOT_FOLDER;
        }
        else {
            resource = element.resource;
            fileKind = element.isDirectory ? FileKind.FOLDER : FileKind.FILE;
        }
        templateData.setFile(resource, {
            fileKind,
            hidePath: true,
            fileDecorations: fileDecorations,
            matches: createMatches(node.filterData),
            extraClasses: ['picker-item'],
        });
    }
    disposeTemplate(templateData) {
        templateData.dispose();
    }
};
FileRenderer = __decorate([
    __param(1, IConfigurationService)
], FileRenderer);
class FileNavigationLabelProvider {
    getKeyboardNavigationLabel(element) {
        return element.name;
    }
}
class FileAccessibilityProvider {
    getWidgetAriaLabel() {
        return localize('breadcrumbs', 'Breadcrumbs');
    }
    getAriaLabel(element) {
        return element.name;
    }
}
let FileFilter = class FileFilter {
    constructor(_workspaceService, configService) {
        this._workspaceService = _workspaceService;
        this._cachedExpressions = new Map();
        this._disposables = new DisposableStore();
        const config = BreadcrumbsConfig.FileExcludes.bindTo(configService);
        const update = () => {
            _workspaceService.getWorkspace().folders.forEach((folder) => {
                const excludesConfig = config.getValue({ resource: folder.uri });
                if (!excludesConfig) {
                    return;
                }
                // adjust patterns to be absolute in case they aren't
                // free floating (**/)
                const adjustedConfig = {};
                for (const pattern in excludesConfig) {
                    if (typeof excludesConfig[pattern] !== 'boolean') {
                        continue;
                    }
                    const patternAbs = pattern.indexOf('**/') !== 0 ? posix.join(folder.uri.path, pattern) : pattern;
                    adjustedConfig[patternAbs] = excludesConfig[pattern];
                }
                this._cachedExpressions.set(folder.uri.toString(), glob.parse(adjustedConfig));
            });
        };
        update();
        this._disposables.add(config);
        this._disposables.add(config.onDidChange(update));
        this._disposables.add(_workspaceService.onDidChangeWorkspaceFolders(update));
    }
    dispose() {
        this._disposables.dispose();
    }
    filter(element, _parentVisibility) {
        if (isWorkspaceFolder(element)) {
            // not a file
            return true;
        }
        const folder = this._workspaceService.getWorkspaceFolder(element.resource);
        if (!folder || !this._cachedExpressions.has(folder.uri.toString())) {
            // no folder or no filer
            return true;
        }
        const expression = this._cachedExpressions.get(folder.uri.toString());
        return !expression(relative(folder.uri.path, element.resource.path), basename(element.resource));
    }
};
FileFilter = __decorate([
    __param(0, IWorkspaceContextService),
    __param(1, IConfigurationService)
], FileFilter);
export class FileSorter {
    compare(a, b) {
        if (isWorkspaceFolder(a) && isWorkspaceFolder(b)) {
            return a.index - b.index;
        }
        if (a.isDirectory === b.isDirectory) {
            // same type -> compare on names
            return compareFileNames(a.name, b.name);
        }
        else if (a.isDirectory) {
            return -1;
        }
        else {
            return 1;
        }
    }
}
let BreadcrumbsFilePicker = class BreadcrumbsFilePicker extends BreadcrumbsPicker {
    constructor(parent, resource, instantiationService, themeService, configService, _workspaceService, _editorService) {
        super(parent, resource, instantiationService, themeService, configService);
        this._workspaceService = _workspaceService;
        this._editorService = _editorService;
    }
    _createTree(container) {
        // tree icon theme specials
        this._treeContainer.classList.add('file-icon-themable-tree');
        this._treeContainer.classList.add('show-file-icons');
        const onFileIconThemeChange = (fileIconTheme) => {
            this._treeContainer.classList.toggle('align-icons-and-twisties', fileIconTheme.hasFileIcons && !fileIconTheme.hasFolderIcons);
            this._treeContainer.classList.toggle('hide-arrows', fileIconTheme.hidesExplorerArrows === true);
        };
        this._disposables.add(this._themeService.onDidFileIconThemeChange(onFileIconThemeChange));
        onFileIconThemeChange(this._themeService.getFileIconTheme());
        const labels = this._instantiationService.createInstance(ResourceLabels, DEFAULT_LABELS_CONTAINER /* TODO@Jo visibility propagation */);
        this._disposables.add(labels);
        return this._instantiationService.createInstance((WorkbenchAsyncDataTree), 'BreadcrumbsFilePicker', container, new FileVirtualDelegate(), [this._instantiationService.createInstance(FileRenderer, labels)], this._instantiationService.createInstance(FileDataSource), {
            multipleSelectionSupport: false,
            sorter: new FileSorter(),
            filter: this._instantiationService.createInstance(FileFilter),
            identityProvider: new FileIdentityProvider(),
            keyboardNavigationLabelProvider: new FileNavigationLabelProvider(),
            accessibilityProvider: this._instantiationService.createInstance(FileAccessibilityProvider),
            showNotFoundMessage: false,
            overrideStyles: {
                listBackground: breadcrumbsPickerBackground,
            },
        });
    }
    async _setInput(element) {
        const { uri, kind } = element;
        let input;
        if (kind === FileKind.ROOT_FOLDER) {
            input = this._workspaceService.getWorkspace();
        }
        else {
            input = dirname(uri);
        }
        const tree = this._tree;
        await tree.setInput(input);
        let focusElement;
        for (const { element } of tree.getNode().children) {
            if (isWorkspaceFolder(element) && isEqual(element.uri, uri)) {
                focusElement = element;
                break;
            }
            else if (isEqual(element.resource, uri)) {
                focusElement = element;
                break;
            }
        }
        if (focusElement) {
            tree.reveal(focusElement, 0.5);
            tree.setFocus([focusElement], this._fakeEvent);
        }
        tree.domFocus();
    }
    _previewElement(_element) {
        return Disposable.None;
    }
    async _revealElement(element, options, sideBySide) {
        if (!isWorkspaceFolder(element) && element.isFile) {
            this._onWillPickElement.fire();
            await this._editorService.openEditor({ resource: element.resource, options }, sideBySide ? SIDE_GROUP : undefined);
            return true;
        }
        return false;
    }
};
BreadcrumbsFilePicker = __decorate([
    __param(2, IInstantiationService),
    __param(3, IThemeService),
    __param(4, IConfigurationService),
    __param(5, IWorkspaceContextService),
    __param(6, IEditorService)
], BreadcrumbsFilePicker);
export { BreadcrumbsFilePicker };
//#endregion
//#region - Outline
let OutlineTreeSorter = class OutlineTreeSorter {
    constructor(comparator, uri, configService) {
        this.comparator = comparator;
        this._order = configService.getValue(uri, 'breadcrumbs.symbolSortOrder');
    }
    compare(a, b) {
        if (this._order === 'name') {
            return this.comparator.compareByName(a, b);
        }
        else if (this._order === 'type') {
            return this.comparator.compareByType(a, b);
        }
        else {
            return this.comparator.compareByPosition(a, b);
        }
    }
};
OutlineTreeSorter = __decorate([
    __param(2, ITextResourceConfigurationService)
], OutlineTreeSorter);
export class BreadcrumbsOutlinePicker extends BreadcrumbsPicker {
    _createTree(container, input) {
        const { config } = input.outline;
        return this._instantiationService.createInstance((WorkbenchDataTree), 'BreadcrumbsOutlinePicker', container, config.delegate, config.renderers, config.treeDataSource, {
            ...config.options,
            sorter: this._instantiationService.createInstance(OutlineTreeSorter, config.comparator, undefined),
            collapseByDefault: true,
            expandOnlyOnTwistieClick: true,
            multipleSelectionSupport: false,
            showNotFoundMessage: false,
        });
    }
    _setInput(input) {
        const viewState = input.outline.captureViewState();
        this.restoreViewState = () => {
            viewState.dispose();
        };
        const tree = this._tree;
        tree.setInput(input.outline);
        if (input.element !== input.outline) {
            tree.reveal(input.element, 0.5);
            tree.setFocus([input.element], this._fakeEvent);
        }
        tree.domFocus();
        return Promise.resolve();
    }
    _previewElement(element) {
        const outline = this._tree.getInput();
        return outline.preview(element);
    }
    async _revealElement(element, options, sideBySide) {
        this._onWillPickElement.fire();
        const outline = this._tree.getInput();
        await outline.reveal(element, options, sideBySide, false);
        return true;
    }
}
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJlYWRjcnVtYnNQaWNrZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci9wYXJ0cy9lZGl0b3IvYnJlYWRjcnVtYnNQaWNrZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDdkUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDckUsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxhQUFhLEVBQWMsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM5RSxPQUFPLEtBQUssSUFBSSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3ZELE9BQU8sRUFFTixlQUFlLEVBQ2YsaUJBQWlCLEVBQ2pCLFVBQVUsR0FDVixNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDakUsT0FBTyxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakYsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sZ0NBQWdDLENBQUE7QUFDdkMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxZQUFZLEVBQWEsTUFBTSw0Q0FBNEMsQ0FBQTtBQUM5RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQ04saUJBQWlCLEVBQ2pCLHNCQUFzQixHQUN0QixNQUFNLGtEQUFrRCxDQUFBO0FBQ3pELE9BQU8sRUFDTiwy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