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
var BulkEditPane_1;
import { ButtonBar } from '../../../../../base/browser/ui/button/button.js';
import { CachedFunction, LRUCachedFunction } from '../../../../../base/common/cache.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { URI } from '../../../../../base/common/uri.js';
import './bulkEdit.css';
import { ITextModelService } from '../../../../../editor/common/services/resolverService.js';
import { localize } from '../../../../../nls.js';
import { MenuId } from '../../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IContextKeyService, RawContextKey, } from '../../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../../platform/contextview/browser/contextView.js';
import { IDialogService } from '../../../../../platform/dialogs/common/dialogs.js';
import { IHoverService } from '../../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { WorkbenchAsyncDataTree, } from '../../../../../platform/list/browser/listService.js';
import { IOpenerService } from '../../../../../platform/opener/common/opener.js';
import { IStorageService, } from '../../../../../platform/storage/common/storage.js';
import { defaultButtonStyles } from '../../../../../platform/theme/browser/defaultStyles.js';
import { IThemeService } from '../../../../../platform/theme/common/themeService.js';
import { ResourceLabels } from '../../../../browser/labels.js';
import { ViewPane } from '../../../../browser/parts/views/viewPane.js';
import { IViewDescriptorService } from '../../../../common/views.js';
import { BulkEditPreviewProvider, BulkFileOperations, } from './bulkEditPreview.js';
import { BulkEditAccessibilityProvider, BulkEditDataSource, BulkEditDelegate, BulkEditIdentityProvider, BulkEditNaviLabelProvider, BulkEditSorter, CategoryElement, CategoryElementRenderer, compareBulkFileOperations, FileElement, FileElementRenderer, TextEditElement, TextEditElementRenderer, } from './bulkEditTree.js';
import { ACTIVE_GROUP, IEditorService, SIDE_GROUP, } from '../../../../services/editor/common/editorService.js';
var State;
(function (State) {
    State["Data"] = "data";
    State["Message"] = "message";
})(State || (State = {}));
let BulkEditPane = class BulkEditPane extends ViewPane {
    static { BulkEditPane_1 = this; }
    static { this.ID = 'refactorPreview'; }
    static { this.Schema = 'vscode-bulkeditpreview-multieditor'; }
    static { this.ctxHasCategories = new RawContextKey('refactorPreview.hasCategories', false); }
    static { this.ctxGroupByFile = new RawContextKey('refactorPreview.groupByFile', true); }
    static { this.ctxHasCheckedChanges = new RawContextKey('refactorPreview.hasCheckedChanges', true); }
    static { this._memGroupByFile = `${this.ID}.groupByFile`; }
    constructor(options, _instaService, _editorService, _labelService, _textModelService, _dialogService, _contextMenuService, _storageService, contextKeyService, viewDescriptorService, keybindingService, contextMenuService, configurationService, openerService, themeService, hoverService) {
        super({ ...options, titleMenuId: MenuId.BulkEditTitle }, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, _instaService, openerService, themeService, hoverService);
        this._instaService = _instaService;
        this._editorService = _editorService;
        this._labelService = _labelService;
        this._textModelService = _textModelService;
        this._dialogService = _dialogService;
        this._contextMenuService = _contextMenuService;
        this._storageService = _storageService;
        this._treeViewStates = new Map();
        this._disposables = new DisposableStore();
        this._sessionDisposables = new DisposableStore();
        this._computeResourceDiffEditorInputs = new LRUCachedFunction(async (fileOperations) => {
            const computeDiffEditorInput = new CachedFunction(async (fileOperation) => {
                const fileOperationUri = fileOperation.uri;
                const previewUri = this._currentProvider.asPreviewUri(fileOperationUri);
                // delete
                if (fileOperation.type & 4 /* BulkFileOperationType.Delete */) {
                    return {
                        original: { resource: URI.revive(previewUri) },
                        modified: { resource: undefined },
                        goToFileResource: fileOperation.uri,
                    };
                }
                // rename, create, edits
                else {
                    let leftResource;
                    try {
                        ;
                        (await this._textModelService.createModelReference(fileOperationUri)).dispose();
                        leftResource = fileOperationUri;
                    }
                    catch {
                        leftResource = BulkEditPreviewProvider.emptyPreview;
                    }
                    return {
                        original: { resource: URI.revive(leftResource) },
                        modified: { resource: URI.revive(previewUri) },
                        goToFileResource: leftResource,
                    };
                }
            });
            const sortedFileOperations = fileOperations.slice().sort(compareBulkFileOperations);
            const resources = [];
            for (const operation of sortedFileOperations) {
                resources.push(await computeDiffEditorInput.get(operation));
            }
            const getResourceDiffEditorInputIdOfOperation = async (operation) => {
                const resource = await computeDiffEditorInput.get(operation);
                return { original: resource.original.resource, modified: resource.modified.resource };
            };
            return {
                resources,
                getResourceDiffEditorInputIdOfOperation,
            };
        });
        this.element.classList.add('bulk-edit-panel', 'show-file-icons');
        this._ctxHasCategories = BulkEditPane_1.ctxHasCategories.bindTo(contextKeyService);
        this._ctxGroupByFile = BulkEditPane_1.ctxGroupByFile.bindTo(contextKeyService);
        this._ctxHasCheckedChanges = BulkEditPane_1.ctxHasCheckedChanges.bindTo(contextKeyService);
    }
    dispose() {
        this._tree.dispose();
        this._disposables.dispose();
        super.dispose();
    }
    renderBody(parent) {
        super.renderBody(parent);
        const resourceLabels = this._instaService.createInstance(ResourceLabels, {
            onDidChangeVisibility: this.onDidChangeBodyVisibility,
        });
        this._disposables.add(resourceLabels);
        const contentContainer = document.createElement('div');
        contentContainer.className = 'content';
        parent.appendChild(contentContainer);
        // tree
        const treeContainer = document.createElement('div');
        contentContainer.appendChild(treeContainer);
        this._treeDataSource = this._instaService.createInstance(BulkEditDataSource);
        this._treeDataSource.groupByFile = this._storageService.getBoolean(BulkEditPane_1._memGroupByFile, 0 /* StorageScope.PROFILE */, true);
        this._ctxGroupByFile.set(this._treeDataSource.groupByFile);
        this._tree = this._instaService.createInstance((WorkbenchAsyncDataTree), this.id, treeContainer, new BulkEditDelegate(), [
            this._instaService.createInstance(TextEditElementRenderer),
            this._instaService.createInstance(FileElementRenderer, resourceLabels),
            this._instaService.createInstance(CategoryElementRenderer),
        ], this._treeDataSource, {
            accessibilityProvider: this._instaService.createInstance(BulkEditAccessibilityProvider),
            identityProvider: new BulkEditIdentityProvider(),
            expandOnlyOnTwistieClick: true,
            multipleSelectionSupport: false,
            keyboardNavigationLabelProvider: new BulkEditNaviLabelProvider(),
            sorter: new BulkEditSorter(),
            selectionNavigation: true,
        });
        this._disposables.add(this._tree.onContextMenu(this._onContextMenu, this));
        this._disposables.add(this._tree.onDidOpen((e) => this._openElementInMultiDiffEditor(e)));
        // buttons
        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'buttons';
        contentContainer.appendChild(buttonsContainer);
        const buttonBar = new ButtonBar(buttonsContainer);
        this._disposables.add(buttonBar);
        const btnConfirm = buttonBar.addButton({ supportIcons: true, ...defaultButtonStyles });
        btnConfirm.label = localize('ok', 'Apply');
        btnConfirm.onDidClick(() => this.accept(), this, this._disposables);
        const btnCancel = buttonBar.addButton({ ...defaultButtonStyles, secondary: true });
        btnCancel.label = localize('cancel', 'Discard');
        btnCancel.onDidClick(() => this.discard(), this, this._disposables);
        // message
        this._message = document.createElement('span');
        this._message.className = 'message';
        this._message.innerText = localize('empty.msg', 'Invoke a code action, like rename, to see a preview of its changes here.');
        parent.appendChild(this._message);
        //
        this._setState("message" /* State.Message */);
    }
    layoutBody(height, width) {
        super.layoutBody(height, width);
        const treeHeight = height - 50;
        this._tree.getHTMLElement().parentElement.style.height = `${treeHeight}px`;
        this._tree.layout(treeHeight, width);
    }
    _setState(state) {
        this.element.dataset['state'] = state;
    }
    async setInput(edit, token) {
        this._setState("data" /* State.Data */);
        this._sessionDisposables.clear();
        this._treeViewStates.clear();
        if (this._currentResolve) {
            this._currentResolve(undefined);
            this._currentResolve = undefined;
        }
        const input = await this._instaService.invokeFunction(BulkFileOperations.create, edit);
        this._currentProvider = this._instaService.createInstance(BulkEditPreviewProvider, input);
        this._sessionDisposables.add(this._currentProvider);
        this._sessionDisposables.add(input);
        //
        const hasCategories = input.categories.length > 1;
        this._ctxHasCategories.set(hasCategories);
        this._treeDataSource.groupByFile = !hasCategories || this._treeDataSource.groupByFile;
        this._ctxHasCheckedChanges.set(input.checked.checkedCount > 0);
        this._currentInput = input;
        return new Promise((resolve) => {
            token.onCancellationRequested(() => resolve(undefined));
            this._currentResolve = resolve;
            this._setTreeInput(input);
            // refresh when check state changes
            this._sessionDisposables.add(input.checked.onDidChange(() => {
                this._tree.updateChildren();
                this._ctxHasCheckedChanges.set(input.checked.checkedCount > 0);
            }));
        });
    }
    hasInput() {
        return Boolean(this._currentInput);
    }
    async _setTreeInput(input) {
        const viewState = this._treeViewStates.get(this._treeDataSource.groupByFile);
        await this._tree.setInput(input, viewState);
        this._tree.domFocus();
        if (viewState) {
            return;
        }
        // async expandAll (max=10) is the default when no view state is given
        const expand = [...this._tree.getNode(input).children].slice(0, 10);
        while (expand.length > 0) {
            const { element } = expand.shift();
            if (element instanceof FileElement) {
                await this._tree.expand(element, true);
            }
            if (element instanceof CategoryElement) {
                await this._tree.expand(element, true);
                expand.push(...this._tree.getNode(element).children);
            }
        }
    }
    accept() {
        const conflicts = this._currentInput?.conflicts.list();
        if (!conflicts || conflicts.length === 0) {
            this._done(true);
            return;
        }
        let message;
        if (conflicts.length === 1) {
            message = localize('conflict.1', "Cannot apply refactoring because '{0}' has changed in the meantime.", this._labelService.getUriLabel(conflicts[0], { relative: true }));
        }
        else {
            message = localize('conflict.N', 'Cannot apply refactoring because {0} other files have changed in the meantime.', conflicts.length);
        }
        this._dialogService.warn(message).finally(() => this._done(false));
    }
    discard() {
        this._done(false);
    }
    _done(accept) {
        this._currentResolve?.(accept ? this._currentInput?.getWorkspaceEdit() : undefined);
        this._currentInput = undefined;
        this._setState("message" /* State.Message */);
        this._sessionDisposables.clear();
    }
    toggleChecked() {
        const [first] = this._tree.getFocus();
        if ((first instanceof FileElement || first instanceof TextEditElement) && !first.isDisabled()) {
            first.setChecked(!first.isChecked());
        }
        else if (first instanceof CategoryElement) {
            first.setChecked(!first.isChecked());
        }
    }
    groupByFile() {
        if (!this._treeDataSource.groupByFile) {
            this.toggleGrouping();
        }
    }
    groupByType() {
        if (this._treeDataSource.groupByFile) {
            this.toggleGrouping();
        }
    }
    toggleGrouping() {
        const input = this._tree.getInput();
        if (input) {
            // (1) capture view state
            const oldViewState = this._tree.getViewState();
            this._treeViewStates.set(this._treeDataSource.groupByFile, oldViewState);
            // (2) toggle and update
            this._treeDataSource.groupByFile = !this._treeDataSource.groupByFile;
            this._setTreeInput(input);
            // (3) remember preference
            this._storageService.store(BulkEditPane_1._memGroupByFile, this._treeDataSource.groupByFile, 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
            this._ctxGroupByFile.set(this._treeDataSource.groupByFile);
        }
    }
    async _openElementInMultiDiffEditor(e) {
        const fileOperations = this._currentInput?.fileOperations;
        if (!fileOperations) {
            return;
        }
        let selection = undefined;
        let fileElement;
        if (e.element instanceof TextEditElement) {
            fileElement = e.element.parent;
            selection = e.element.edit.textEdit.textEdit.range;
        }
        else if (e.element instanceof FileElement) {
            fileElement = e.element;
            selection = e.element.edit.textEdits[0]?.textEdit.textEdit.range;
        }
        else {
            // invalid event
            return;
        }
        const result = await this._computeResourceDiffEditorInputs.get(fileOperations);
        const resourceId = await result.getResourceDiffEditorInputIdOfOperation(fileElement.edit);
        const options = {
            ...e.editorOptions,
            viewState: {
                revealData: {
                    resource: resourceId,
                    range: selection,
                },
            },
        };
        const multiDiffSource = URI.from({ scheme: BulkEditPane_1.Schema });
        const label = 'Refactor Preview';
        this._editorService.openEditor({
            multiDiffSource,
            label,
            options,
            isTransient: true,
            description: label,
            resources: result.resources,
        }, e.sideBySide ? SIDE_GROUP : ACTIVE_GROUP);
    }
    _onContextMenu(e) {
        this._contextMenuService.showContextMenu({
            menuId: MenuId.BulkEditContext,
            contextKeyService: this.contextKeyService,
            getAnchor: () => e.anchor,
        });
    }
};
BulkEditPane = BulkEditPane_1 = __decorate([
    __param(1, IInstantiationService),
    __param(2, IEditorService),
    __param(3, ILabelService),
    __param(4, ITextModelService),
    __param(5, IDialogService),
    __param(6, IContextMenuService),
    __param(7, IStorageService),
    __param(8, IContextKeyService),
    __param(9, IViewDescriptorService),
    __param(10, IKeybindingService),
    __param(11, IContextMenuService),
    __param(12, IConfigurationService),
    __param(13, IOpenerService),
    __param(14, IThemeService),
    __param(15, IHoverService)
], BulkEditPane);
export { BulkEditPane };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVsa0VkaXRQYW5lLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvYnVsa0VkaXQvYnJvd3Nlci9wcmV2aWV3L2J1bGtFZGl0UGFuZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBRzNFLE9BQU8sRUFBRSxjQUFjLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUd2RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFFekUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3ZELE9BQU8sZ0JBQWdCLENBQUE7QUFPdkIsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDNUYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQ2hELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUMxRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNyRyxPQUFPLEVBRU4sa0JBQWtCLEVBQ2xCLGFBQWEsR0FDYixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2hHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNsRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDOUUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDckcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFDNUYsT0FBTyxFQUFFLGFB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