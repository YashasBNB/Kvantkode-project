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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGV4dGtleXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb21tb24vY29udGV4dGtleXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUVoRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sY0FBYyxDQUFBO0FBQ3ZDLE9BQU8sRUFDTixrQkFBa0IsRUFFbEIsYUFBYSxHQUNiLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQzVFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDckUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBR3RELE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLGFBQWEsQ0FBQTtBQUV4RCwrQkFBK0I7QUFFL0IsTUFBTSxDQUFDLE1BQU0scUJBQXFCLEdBQUcsSUFBSSxhQUFhLENBQVMsZ0JBQWdCLEVBQUUsU0FBUyxFQUFFO0lBQzNGLElBQUksRUFBRSxRQUFRO0lBQ2QsV0FBVyxFQUFFLFFBQVEsQ0FDcEIsZ0JBQWdCLEVBQ2hCLDJJQUEySSxDQUMzSTtDQUNELENBQUMsQ0FBQTtBQUNGLE1BQU0sQ0FBQyxNQUFNLDJCQUEyQixHQUFHLElBQUksYUFBYSxDQUMzRCxzQkFBc0IsRUFDdEIsQ0FBQyxFQUNELFFBQVEsQ0FBQyxz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