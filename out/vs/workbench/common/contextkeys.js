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
var ResourceContextKey_1;
import { DisposableStore } from '../../base/common/lifecycle.js';
import { localize } from '../../nls.js';
import { IContextKeyService, RawContextKey, } from '../../platform/contextkey/common/contextkey.js';
import { basename, dirname, extname, isEqual } from '../../base/common/resources.js';
import { ILanguageService } from '../../editor/common/languages/language.js';
import { IFileService } from '../../platform/files/common/files.js';
import { IModelService } from '../../editor/common/services/model.js';
import { Schemas } from '../../base/common/network.js';
import { DEFAULT_EDITOR_ASSOCIATION } from './editor.js';
//#region < --- Workbench --- >
export const WorkbenchStateContext = new RawContextKey('workbenchState', undefined, {
    type: 'string',
    description: localize('workbenchState', "The kind of workspace opened in the window, either 'empty' (no workspace), 'folder' (single folder) or 'workspace' (multi-root workspace)"),
});
export const WorkspaceFolderCountContext = new RawContextKey('workspaceFolderCount', 0, localize('workspaceFolderCount', 'The number of root folders in the workspace'));
export const OpenFolderWorkspaceSupportContext = new RawContextKey('openFolderWorkspaceSupport', true, true);
export const EnterMultiRootWorkspaceSupportContext = new RawContextKey('enterMultiRootWorkspaceSupport', true, true);
export const EmptyWorkspaceSupportContext = new RawContextKey('emptyWorkspaceSupport', true, true);
export const DirtyWorkingCopiesContext = new RawContextKey('dirtyWorkingCopies', false, localize('dirtyWorkingCopies', 'Whether there are any working copies with unsaved changes'));
export const RemoteNameContext = new RawContextKey('remoteName', '', localize('remoteName', 'The name of the remote the window is connected to or an empty string if not connected to any remote'));
export const VirtualWorkspaceContext = new RawContextKey('virtualWorkspace', '', localize('virtualWorkspace', 'The scheme of the current workspace is from a virtual file system or an empty string.'));
export const TemporaryWorkspaceContext = new RawContextKey('temporaryWorkspace', false, localize('temporaryWorkspace', 'The scheme of the current workspace is from a temporary file system.'));
export const IsMainWindowFullscreenContext = new RawContextKey('isFullscreen', false, localize('isFullscreen', 'Whether the main window is in fullscreen mode'));
export const IsAuxiliaryWindowFocusedContext = new RawContextKey('isAuxiliaryWindowFocusedContext', false, localize('isAuxiliaryWindowFocusedContext', 'Whether an auxiliary window is focused'));
export const HasWebFileSystemAccess = new RawContextKey('hasWebFileSystemAccess', false, true); // Support for FileSystemAccess web APIs (https://wicg.github.io/file-system-access)
export const EmbedderIdentifierContext = new RawContextKey('embedderIdentifier', undefined, localize('embedderIdentifier', 'The identifier of the embedder according to the product service, if one is defined'));
//#endregion
//#region < --- Editor --- >
// Editor State Context Keys
export const ActiveEditorDirtyContext = new RawContextKey('activeEditorIsDirty', false, localize('activeEditorIsDirty', 'Whether the active editor has unsaved changes'));
export const ActiveEditorPinnedContext = new RawContextKey('activeEditorIsNotPreview', false, localize('activeEditorIsNotPreview', 'Whether the active editor is not in preview mode'));
export const ActiveEditorFirstInGroupContext = new RawContextKey('activeEditorIsFirstInGroup', false, localize('activeEditorIsFirstInGroup', 'Whether the active editor is the first one in its group'));
export const ActiveEditorLastInGroupContext = new RawContextKey('activeEditorIsLastInGroup', false, localize('activeEditorIsLastInGroup', 'Whether the active editor is the last one in its group'));
export const ActiveEditorStickyContext = new RawContextKey('activeEditorIsPinned', false, localize('activeEditorIsPinned', 'Whether the active editor is pinned'));
export const ActiveEditorReadonlyContext = new RawContextKey('activeEditorIsReadonly', false, localize('activeEditorIsReadonly', 'Whether the active editor is read-only'));
export const ActiveCompareEditorCanSwapContext = new RawContextKey('activeCompareEditorCanSwap', false, localize('activeCompareEditorCanSwap', 'Whether the active compare editor can swap sides'));
export const ActiveEditorCanToggleReadonlyContext = new RawContextKey('activeEditorCanToggleReadonly', true, localize('activeEditorCanToggleReadonly', 'Whether the active editor can toggle between being read-only or writeable'));
export const ActiveEditorCanRevertContext = new RawContextKey('activeEditorCanRevert', false, localize('activeEditorCanRevert', 'Whether the active editor can revert'));
export const ActiveEditorCanSplitInGroupContext = new RawContextKey('activeEditorCanSplitInGroup', true);
// Editor Kind Context Keys
export const ActiveEditorContext = new RawContextKey('activeEditor', null, {
    type: 'string',
    description: localize('activeEditor', 'The identifier of the active editor'),
});
export const ActiveEditorAvailableEditorIdsContext = new RawContextKey('activeEditorAvailableEditorIds', '', localize('activeEditorAvailableEditorIds', 'The available editor identifiers that are usable for the active editor'));
export const TextCompareEditorVisibleContext = new RawContextKey('textCompareEditorVisible', false, localize('textCompareEditorVisible', 'Whether a text compare editor is visible'));
export const TextCompareEditorActiveContext = new RawContextKey('textCompareEditorActive', false, localize('textCompareEditorActive', 'Whether a text compare editor is active'));
export const SideBySideEditorActiveContext = new RawContextKey('sideBySideEditorActive', false, localize('sideBySideEditorActive', 'Whether a side by side editor is active'));
// Editor Group Context Keys
export const EditorGroupEditorsCountContext = new RawContextKey('groupEditorsCount', 0, localize('groupEditorsCount', 'The number of opened editor groups'));
export const ActiveEditorGroupEmptyContext = new RawContextKey('activeEditorGroupEmpty', false, localize('activeEditorGroupEmpty', 'Whether the active editor group is empty'));
export const ActiveEditorGroupIndexContext = new RawContextKey('activeEditorGroupIndex', 0, localize('activeEditorGroupIndex', 'The index of the active editor group'));
export const ActiveEditorGroupLastContext = new RawContextKey('activeEditorGroupLast', false, localize('activeEditorGroupLast', 'Whether the active editor group is the last group'));
export const ActiveEditorGroupLockedContext = new RawContextKey('activeEditorGroupLocked', false, localize('activeEditorGroupLocked', 'Whether the active editor group is locked'));
export const MultipleEditorGroupsContext = new RawContextKey('multipleEditorGroups', false, localize('multipleEditorGroups', 'Whether there are multiple editor groups opened'));
export const SingleEditorGroupsContext = MultipleEditorGroupsContext.toNegated();
export const MultipleEditorsSelectedInGroupContext = new RawContextKey('multipleEditorsSelectedInGroup', false, localize('multipleEditorsSelectedInGroup', 'Whether multiple editors have been selected in an editor group'));
export const TwoEditorsSelectedInGroupContext = new RawContextKey('twoEditorsSelectedInGroup', false, localize('twoEditorsSelectedInGroup', 'Whether exactly two editors have been selected in an editor group'));
export const SelectedEditorsInGroupFileOrUntitledResourceContextKey = new RawContextKey('SelectedEditorsInGroupFileOrUntitledResourceContextKey', true, localize('SelectedEditorsInGroupFileOrUntitledResourceContextKey', 'Whether all selected editors in a group have a file or untitled resource associated'));
// Editor Part Context Keys
export const EditorPartMultipleEditorGroupsContext = new RawContextKey('editorPartMultipleEditorGroups', false, localize('editorPartMultipleEditorGroups', 'Whether there are multiple editor groups opened in an editor part'));
export const EditorPartSingleEditorGroupsContext = EditorPartMultipleEditorGroupsContext.toNegated();
export const EditorPartMaximizedEditorGroupContext = new RawContextKey('editorPartMaximizedEditorGroup', false, localize('editorPartEditorGroupMaximized', 'Editor Part has a maximized group'));
export const IsAuxiliaryEditorPartContext = new RawContextKey('isAuxiliaryEditorPart', false, localize('isAuxiliaryEditorPart', 'Editor Part is in an auxiliary window'));
// Editor Layout Context Keys
export const EditorsVisibleContext = new RawContextKey('editorIsOpen', false, localize('editorIsOpen', 'Whether an editor is open'));
export const InEditorZenModeContext = new RawContextKey('inZenMode', false, localize('inZenMode', 'Whether Zen mode is enabled'));
export const IsMainEditorCenteredLayoutContext = new RawContextKey('isCenteredLayout', false, localize('isMainEditorCenteredLayout', 'Whether centered layout is enabled for the main editor'));
export const SplitEditorsVertically = new RawContextKey('splitEditorsVertically', false, localize('splitEditorsVertically', 'Whether editors split vertically'));
export const MainEditorAreaVisibleContext = new RawContextKey('mainEditorAreaVisible', true, localize('mainEditorAreaVisible', 'Whether the editor area in the main window is visible'));
export const EditorTabsVisibleContext = new RawContextKey('editorTabsVisible', true, localize('editorTabsVisible', 'Whether editor tabs are visible'));
//#endregion
//#region < --- Side Bar --- >
export const SideBarVisibleContext = new RawContextKey('sideBarVisible', false, localize('sideBarVisible', 'Whether the sidebar is visible'));
export const SidebarFocusContext = new RawContextKey('sideBarFocus', false, localize('sideBarFocus', 'Whether the sidebar has keyboard focus'));
export const ActiveViewletContext = new RawContextKey('activeViewlet', '', localize('activeViewlet', 'The identifier of the active viewlet'));
//#endregion
//#region < --- Status Bar --- >
export const StatusBarFocused = new RawContextKey('statusBarFocused', false, localize('statusBarFocused', 'Whether the status bar has keyboard focus'));
//#endregion
//#region < --- Title Bar --- >
export const TitleBarStyleContext = new RawContextKey('titleBarStyle', 'custom', localize('titleBarStyle', 'Style of the window title bar'));
export const TitleBarVisibleContext = new RawContextKey('titleBarVisible', false, localize('titleBarVisible', 'Whether the title bar is visible'));
//#endregion
//#region < --- Banner --- >
export const BannerFocused = new RawContextKey('bannerFocused', false, localize('bannerFocused', 'Whether the banner has keyboard focus'));
//#endregion
//#region < --- Notifications --- >
export const NotificationFocusedContext = new RawContextKey('notificationFocus', true, localize('notificationFocus', 'Whether a notification has keyboard focus'));
export const NotificationsCenterVisibleContext = new RawContextKey('notificationCenterVisible', false, localize('notificationCenterVisible', 'Whether the notifications center is visible'));
export const NotificationsToastsVisibleContext = new RawContextKey('notificationToastsVisible', false, localize('notificationToastsVisible', 'Whether a notification toast is visible'));
//#endregion
//#region < --- Auxiliary Bar --- >
export const ActiveAuxiliaryContext = new RawContextKey('activeAuxiliary', '', localize('activeAuxiliary', 'The identifier of the active auxiliary panel'));
export const AuxiliaryBarFocusContext = new RawContextKey('auxiliaryBarFocus', false, localize('auxiliaryBarFocus', 'Whether the auxiliary bar has keyboard focus'));
export const AuxiliaryBarVisibleContext = new RawContextKey('auxiliaryBarVisible', false, localize('auxiliaryBarVisible', 'Whether the auxiliary bar is visible'));
//#endregion
//#region < --- Panel --- >
export const ActivePanelContext = new RawContextKey('activePanel', '', localize('activePanel', 'The identifier of the active panel'));
export const PanelFocusContext = new RawContextKey('panelFocus', false, localize('panelFocus', 'Whether the panel has keyboard focus'));
export const PanelPositionContext = new RawContextKey('panelPosition', 'bottom', localize('panelPosition', "The position of the panel, always 'bottom'"));
export const PanelAlignmentContext = new RawContextKey('panelAlignment', 'center', localize('panelAlignment', "The alignment of the panel, either 'center', 'left', 'right' or 'justify'"));
export const PanelVisibleContext = new RawContextKey('panelVisible', false, localize('panelVisible', 'Whether the panel is visible'));
export const PanelMaximizedContext = new RawContextKey('panelMaximized', false, localize('panelMaximized', 'Whether the panel is maximized'));
//#endregion
//#region < --- Views --- >
export const FocusedViewContext = new RawContextKey('focusedView', '', localize('focusedView', 'The identifier of the view that has keyboard focus'));
export function getVisbileViewContextKey(viewId) {
    return `view.${viewId}.visible`;
}
//#endregion
//#region < --- Resources --- >
let ResourceContextKey = class ResourceContextKey {
    static { ResourceContextKey_1 = this; }
    // NOTE: DO NOT CHANGE THE DEFAULT VALUE TO ANYTHING BUT
    // UNDEFINED! IT IS IMPORTANT THAT DEFAULTS ARE INHERITED
    // FROM THE PARENT CONTEXT AND ONLY UNDEFINED DOES THIS
    static { this.Scheme = new RawContextKey('resourceScheme', undefined, {
        type: 'string',
        description: localize('resourceScheme', 'The scheme of the resource'),
    }); }
    static { this.Filename = new RawContextKey('resourceFilename', undefined, {
        type: 'string',
        description: localize('resourceFilename', 'The file name of the resource'),
    }); }
    static { this.Dirname = new RawContextKey('resourceDirname', undefined, {
        type: 'string',
        description: localize('resourceDirname', 'The folder name the resource is contained in'),
    }); }
    static { this.Path = new RawContextKey('resourcePath', undefined, {
        type: 'string',
        description: localize('resourcePath', 'The full path of the resource'),
    }); }
    static { this.LangId = new RawContextKey('resourceLangId', undefined, {
        type: 'string',
        description: localize('resourceLangId', 'The language identifier of the resource'),
    }); }
    static { this.Resource = new RawContextKey('resource', undefined, {
        type: 'URI',
        description: localize('resource', 'The full value of the resource including scheme and path'),
    }); }
    static { this.Extension = new RawContextKey('resourceExtname', undefined, {
        type: 'string',
        description: localize('resourceExtname', 'The extension name of the resource'),
    }); }
    static { this.HasResource = new RawContextKey('resourceSet', undefined, {
        type: 'boolean',
        description: localize('resourceSet', 'Whether a resource is present or not'),
    }); }
    static { this.IsFileSystemResource = new RawContextKey('isFileSystemResource', undefined, {
        type: 'boolean',
        description: localize('isFileSystemResource', 'Whether the resource is backed by a file system provider'),
    }); }
    constructor(_contextKeyService, _fileService, _languageService, _modelService) {
        this._contextKeyService = _contextKeyService;
        this._fileService = _fileService;
        this._languageService = _languageService;
        this._modelService = _modelService;
        this._disposables = new DisposableStore();
        this._schemeKey = ResourceContextKey_1.Scheme.bindTo(this._contextKeyService);
        this._filenameKey = ResourceContextKey_1.Filename.bindTo(this._contextKeyService);
        this._dirnameKey = ResourceContextKey_1.Dirname.bindTo(this._contextKeyService);
        this._pathKey = ResourceContextKey_1.Path.bindTo(this._contextKeyService);
        this._langIdKey = ResourceContextKey_1.LangId.bindTo(this._contextKeyService);
        this._resourceKey = ResourceContextKey_1.Resource.bindTo(this._contextKeyService);
        this._extensionKey = ResourceContextKey_1.Extension.bindTo(this._contextKeyService);
        this._hasResource = ResourceContextKey_1.HasResource.bindTo(this._contextKeyService);
        this._isFileSystemResource = ResourceContextKey_1.IsFileSystemResource.bindTo(this._contextKeyService);
        this._disposables.add(_fileService.onDidChangeFileSystemProviderRegistrations(() => {
            const resource = this.get();
            this._isFileSystemResource.set(Boolean(resource && _fileService.hasProvider(resource)));
        }));
        this._disposables.add(_modelService.onModelAdded((model) => {
            if (isEqual(model.uri, this.get())) {
                this._setLangId();
            }
        }));
        this._disposables.add(_modelService.onModelLanguageChanged((e) => {
            if (isEqual(e.model.uri, this.get())) {
                this._setLangId();
            }
        }));
    }
    dispose() {
        this._disposables.dispose();
    }
    _setLangId() {
        const value = this.get();
        if (!value) {
            this._langIdKey.set(null);
            return;
        }
        const langId = this._modelService.getModel(value)?.getLanguageId() ??
            this._languageService.guessLanguageIdByFilepathOrFirstLine(value);
        this._langIdKey.set(langId);
    }
    set(value) {
        value = value ?? undefined;
        if (isEqual(this._value, value)) {
            return;
        }
        this._value = value;
        this._contextKeyService.bufferChangeEvents(() => {
            this._resourceKey.set(value ? value.toString() : null);
            this._schemeKey.set(value ? value.scheme : null);
            this._filenameKey.set(value ? basename(value) : null);
            this._dirnameKey.set(value ? this.uriToPath(dirname(value)) : null);
            this._pathKey.set(value ? this.uriToPath(value) : null);
            this._setLangId();
            this._extensionKey.set(value ? extname(value) : null);
            this._hasResource.set(Boolean(value));
            this._isFileSystemResource.set(value ? this._fileService.hasProvider(value) : false);
        });
    }
    uriToPath(uri) {
        if (uri.scheme === Schemas.file) {
            return uri.fsPath;
        }
        return uri.path;
    }
    reset() {
        this._value = undefined;
        this._contextKeyService.bufferChangeEvents(() => {
            this._resourceKey.reset();
            this._schemeKey.reset();
            this._filenameKey.reset();
            this._dirnameKey.reset();
            this._pathKey.reset();
            this._langIdKey.reset();
            this._extensionKey.reset();
            this._hasResource.reset();
            this._isFileSystemResource.reset();
        });
    }
    get() {
        return this._value;
    }
};
ResourceContextKey = ResourceContextKey_1 = __decorate([
    __param(0, IContextKeyService),
    __param(1, IFileService),
    __param(2, ILanguageService),
    __param(3, IModelService)
], ResourceContextKey);
export { ResourceContextKey };
//#endregion
export function applyAvailableEditorIds(contextKey, editor, editorResolverService) {
    if (!editor) {
        contextKey.set('');
        return;
    }
    const editorResource = editor.resource;
    if (editorResource?.scheme === Schemas.untitled &&
        editor.editorId !== DEFAULT_EDITOR_ASSOCIATION.id) {
        // Non text editor untitled files cannot be easily serialized between extensions
        // so instead we disable this context key to prevent common commands that act on the active editor
        contextKey.set('');
    }
    else {
        const editors = editorResource
            ? editorResolverService.getEditors(editorResource).map((editor) => editor.id)
            : [];
        contextKey.set(editors.join(','));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGV4dGtleXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29tbW9uL2NvbnRleHRrZXlzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFFaEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGNBQWMsQ0FBQTtBQUN2QyxPQUFPLEVBQ04sa0JBQWtCLEVBRWxCLGFBQWEsR0FDYixNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUM1RSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDbkUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUd0RCxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxhQUFhLENBQUE7QUFFeEQsK0JBQStCO0FBRS9CLE1BQU0sQ0FBQyxNQUFNLHFCQUFxQixHQUFHLElBQUksYUFBYSxDQUFTLGdCQUFnQixFQUFFLFNBQVMsRUFBRTtJQUMzRixJQUFJLEVBQUUsUUFBUTtJQUNkLFdBQVcsRUFBRSxRQUFRLENBQ3BCLGdCQUFnQixFQUNoQiwySUFBMkksQ0FDM0k7Q0FDRCxDQUFDLENBQUE7QUFDRixNQUFNLENBQUMsTUFBTSwyQkFBMkIsR0FBRyxJQUFJLGFBQWEsQ0FDM0Qsc0JBQXNCLEVBQ3RCLENBQUMsRUFDRCxRQUFRLENBQUMsc0JBQXNCLEVBQUUsNkNBQTZDLENBQUMs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