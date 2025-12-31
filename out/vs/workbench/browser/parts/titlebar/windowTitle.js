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
var WindowTitle_1;
import { localize } from '../../../../nls.js';
import { dirname, basename } from '../../../../base/common/resources.js';
import { IConfigurationService, } from '../../../../platform/configuration/common/configuration.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { EditorResourceAccessor, SideBySideEditor } from '../../../common/editor.js';
import { IBrowserWorkbenchEnvironmentService } from '../../../services/environment/browser/environmentService.js';
import { IWorkspaceContextService, } from '../../../../platform/workspace/common/workspace.js';
import { isWindows, isWeb, isMacintosh, isNative } from '../../../../base/common/platform.js';
import { trim } from '../../../../base/common/strings.js';
import { template } from '../../../../base/common/labels.js';
import { ILabelService, } from '../../../../platform/label/common/label.js';
import { Emitter } from '../../../../base/common/event.js';
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { Schemas } from '../../../../base/common/network.js';
import { getVirtualWorkspaceLocation } from '../../../../platform/workspace/common/virtualWorkspace.js';
import { IUserDataProfileService } from '../../../services/userDataProfile/common/userDataProfile.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { isCodeEditor, isDiffEditor, } from '../../../../editor/browser/editorBrowser.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { getWindowById } from '../../../../base/browser/dom.js';
import { IDecorationsService } from '../../../services/decorations/common/decorations.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
var WindowSettingNames;
(function (WindowSettingNames) {
    WindowSettingNames["titleSeparator"] = "window.titleSeparator";
    WindowSettingNames["title"] = "window.title";
})(WindowSettingNames || (WindowSettingNames = {}));
export const defaultWindowTitle = (() => {
    if (isMacintosh && isNative) {
        return '${activeEditorShort}${separator}${rootName}${separator}${profileName}'; // macOS has native dirty indicator
    }
    const base = '${dirty}${activeEditorShort}${separator}${rootName}${separator}${profileName}${separator}${appName}';
    if (isWeb) {
        return base + '${separator}${remoteName}'; // Web: always show remote name
    }
    return base;
})();
export const defaultWindowTitleSeparator = isMacintosh ? ' \u2014 ' : ' - ';
let WindowTitle = class WindowTitle extends Disposable {
    static { WindowTitle_1 = this; }
    static { this.NLS_USER_IS_ADMIN = isWindows
        ? localize('userIsAdmin', '[Administrator]')
        : localize('userIsSudo', '[Superuser]'); }
    static { this.NLS_EXTENSION_HOST = localize('devExtensionWindowTitlePrefix', '[Extension Development Host]'); }
    static { this.TITLE_DIRTY = '\u25cf '; }
    get value() {
        return this.title ?? '';
    }
    get workspaceName() {
        return this.labelService.getWorkspaceLabel(this.contextService.getWorkspace());
    }
    get fileName() {
        const activeEditor = this.editorService.activeEditor;
        if (!activeEditor) {
            return undefined;
        }
        const fileName = activeEditor.getTitle(0 /* Verbosity.SHORT */);
        const dirty = activeEditor?.isDirty() && !activeEditor.isSaving() ? WindowTitle_1.TITLE_DIRTY : '';
        return `${dirty}${fileName}`;
    }
    constructor(targetWindow, editorGroupsContainer, configurationService, contextKeyService, editorService, environmentService, contextService, labelService, userDataProfileService, productService, viewsService, decorationsService, accessibilityService) {
        super();
        this.configurationService = configurationService;
        this.contextKeyService = contextKeyService;
        this.environmentService = environmentService;
        this.contextService = contextService;
        this.labelService = labelService;
        this.userDataProfileService = userDataProfileService;
        this.productService = productService;
        this.viewsService = viewsService;
        this.decorationsService = decorationsService;
        this.accessibilityService = accessibilityService;
        this.properties = {
            isPure: true,
            isAdmin: false,
            prefix: undefined,
        };
        this.variables = new Map();
        this.activeEditorListeners = this._register(new DisposableStore());
        this.titleUpdater = this._register(new RunOnceScheduler(() => this.doUpdateTitle(), 0));
        this.onDidChangeEmitter = new Emitter();
        this.onDidChange = this.onDidChangeEmitter.event;
        this.titleIncludesFocusedView = false;
        this.titleIncludesEditorState = false;
        this.editorService = editorService.createScoped(editorGroupsContainer, this._store);
        this.windowId = targetWindow.vscodeWindowId;
        this.checkTitleVariables();
        this.registerListeners();
    }
    registerListeners() {
        this._register(this.configurationService.onDidChangeConfiguration((e) => this.onConfigurationChanged(e)));
        this._register(this.editorService.onDidActiveEditorChange(() => this.onActiveEditorChange()));
        this._register(this.contextService.onDidChangeWorkspaceFolders(() => this.titleUpdater.schedule()));
        this._register(this.contextService.onDidChangeWorkbenchState(() => this.titleUpdater.schedule()));
        this._register(this.contextService.onDidChangeWorkspaceName(() => this.titleUpdater.schedule()));
        this._register(this.labelService.onDidChangeFormatters(() => this.titleUpdater.schedule()));
        this._register(this.userDataProfileService.onDidChangeCurrentProfile(() => this.titleUpdater.schedule()));
        this._register(this.viewsService.onDidChangeFocusedView(() => {
            if (this.titleIncludesFocusedView) {
                this.titleUpdater.schedule();
            }
        }));
        this._register(this.contextKeyService.onDidChangeContext((e) => {
            if (e.affectsSome(this.variables)) {
                this.titleUpdater.schedule();
            }
        }));
        this._register(this.accessibilityService.onDidChangeScreenReaderOptimized(() => this.titleUpdater.schedule()));
    }
    onConfigurationChanged(event) {
        const affectsTitleConfiguration = event.affectsConfiguration("window.title" /* WindowSettingNames.title */);
        if (affectsTitleConfiguration) {
            this.checkTitleVariables();
        }
        if (affectsTitleConfiguration ||
            event.affectsConfiguration("window.titleSeparator" /* WindowSettingNames.titleSeparator */)) {
            this.titleUpdater.schedule();
        }
    }
    checkTitleVariables() {
        const titleTemplate = this.configurationService.getValue("window.title" /* WindowSettingNames.title */);
        if (typeof titleTemplate === 'string') {
            this.titleIncludesFocusedView = titleTemplate.includes('${focusedView}');
            this.titleIncludesEditorState = titleTemplate.includes('${activeEditorState}');
        }
    }
    onActiveEditorChange() {
        // Dispose old listeners
        this.activeEditorListeners.clear();
        // Calculate New Window Title
        this.titleUpdater.schedule();
        // Apply listener for dirty and label changes
        const activeEditor = this.editorService.activeEditor;
        if (activeEditor) {
            this.activeEditorListeners.add(activeEditor.onDidChangeDirty(() => this.titleUpdater.schedule()));
            this.activeEditorListeners.add(activeEditor.onDidChangeLabel(() => this.titleUpdater.schedule()));
        }
        // Apply listeners for tracking focused code editor
        if (this.titleIncludesFocusedView) {
            const activeTextEditorControl = this.editorService.activeTextEditorControl;
            const textEditorControls = [];
            if (isCodeEditor(activeTextEditorControl)) {
                textEditorControls.push(activeTextEditorControl);
            }
            else if (isDiffEditor(activeTextEditorControl)) {
                textEditorControls.push(activeTextEditorControl.getOriginalEditor(), activeTextEditorControl.getModifiedEditor());
            }
            for (const textEditorControl of textEditorControls) {
                this.activeEditorListeners.add(textEditorControl.onDidBlurEditorText(() => this.titleUpdater.schedule()));
                this.activeEditorListeners.add(textEditorControl.onDidFocusEditorText(() => this.titleUpdater.schedule()));
            }
        }
        // Apply listener for decorations to track editor state
        if (this.titleIncludesEditorState) {
            this.activeEditorListeners.add(this.decorationsService.onDidChangeDecorations(() => this.titleUpdater.schedule()));
        }
    }
    doUpdateTitle() {
        const title = this.getFullWindowTitle();
        if (title !== this.title) {
            // Always set the native window title to identify us properly to the OS
            let nativeTitle = title;
            if (!trim(nativeTitle)) {
                nativeTitle = this.productService.nameLong;
            }
            const window = getWindowById(this.windowId, true).window;
            if (!window.document.title && isMacintosh && nativeTitle === this.productService.nameLong) {
                // TODO@electron macOS: if we set a window title for
                // the first time and it matches the one we set in
                // `windowImpl.ts` somehow the window does not appear
                // in the "Windows" menu. As such, we set the title
                // briefly to something different to ensure macOS
                // recognizes we have a window.
                // See: https://github.com/microsoft/vscode/issues/191288
                window.document.title = `${this.productService.nameLong} ${WindowTitle_1.TITLE_DIRTY}`;
            }
            window.document.title = nativeTitle;
            this.title = title;
            this.onDidChangeEmitter.fire();
        }
    }
    getFullWindowTitle() {
        const { prefix, suffix } = this.getTitleDecorations();
        let title = this.getWindowTitle() || this.productService.nameLong;
        if (prefix) {
            title = `${prefix} ${title}`;
        }
        if (suffix) {
            title = `${title} ${suffix}`;
        }
        // Replace non-space whitespace
        return title.replace(/[^\S ]/g, ' ');
    }
    getTitleDecorations() {
        let prefix;
        let suffix;
        if (this.properties.prefix) {
            prefix = this.properties.prefix;
        }
        if (this.environmentService.isExtensionDevelopment) {
            prefix = !prefix
                ? WindowTitle_1.NLS_EXTENSION_HOST
                : `${WindowTitle_1.NLS_EXTENSION_HOST} - ${prefix}`;
        }
        if (this.properties.isAdmin) {
            suffix = WindowTitle_1.NLS_USER_IS_ADMIN;
        }
        return { prefix, suffix };
    }
    updateProperties(properties) {
        const isAdmin = typeof properties.isAdmin === 'boolean' ? properties.isAdmin : this.properties.isAdmin;
        const isPure = typeof properties.isPure === 'boolean' ? properties.isPure : this.properties.isPure;
        const prefix = typeof properties.prefix === 'string' ? properties.prefix : this.properties.prefix;
        if (isAdmin !== this.properties.isAdmin ||
            isPure !== this.properties.isPure ||
            prefix !== this.properties.prefix) {
            this.properties.isAdmin = isAdmin;
            this.properties.isPure = isPure;
            this.properties.prefix = prefix;
            this.titleUpdater.schedule();
        }
    }
    registerVariables(variables) {
        let changed = false;
        for (const { name, contextKey } of variables) {
            if (!this.variables.has(contextKey)) {
                this.variables.set(contextKey, name);
                changed = true;
            }
        }
        if (changed) {
            this.titleUpdater.schedule();
        }
    }
    /**
     * Possible template values:
     *
     * {activeEditorLong}: e.g. /Users/Development/myFolder/myFileFolder/myFile.txt
     * {activeEditorMedium}: e.g. myFolder/myFileFolder/myFile.txt
     * {activeEditorShort}: e.g. myFile.txt
     * {activeFolderLong}: e.g. /Users/Development/myFolder/myFileFolder
     * {activeFolderMedium}: e.g. myFolder/myFileFolder
     * {activeFolderShort}: e.g. myFileFolder
     * {rootName}: e.g. myFolder1, myFolder2, myFolder3
     * {rootPath}: e.g. /Users/Development
     * {folderName}: e.g. myFolder
     * {folderPath}: e.g. /Users/Development/myFolder
     * {appName}: e.g. VS Code
     * {remoteName}: e.g. SSH
     * {dirty}: indicator
     * {focusedView}: e.g. Terminal
     * {separator}: conditional separator
     * {activeEditorState}: e.g. Modified
     */
    getWindowTitle() {
        const editor = this.editorService.activeEditor;
        const workspace = this.contextService.getWorkspace();
        // Compute root
        let root;
        if (workspace.configuration) {
            root = workspace.configuration;
        }
        else if (workspace.folders.length) {
            root = workspace.folders[0].uri;
        }
        // Compute active editor folder
        const editorResource = EditorResourceAccessor.getOriginalUri(editor, {
            supportSideBySide: SideBySideEditor.PRIMARY,
        });
        let editorFolderResource = editorResource ? dirname(editorResource) : undefined;
        if (editorFolderResource?.path === '.') {
            editorFolderResource = undefined;
        }
        // Compute folder resource
        // Single Root Workspace: always the root single workspace in this case
        // Otherwise: root folder of the currently active file if any
        let folder = undefined;
        if (this.contextService.getWorkbenchState() === 2 /* WorkbenchState.FOLDER */) {
            folder = workspace.folders[0];
        }
        else if (editorResource) {
            folder = this.contextService.getWorkspaceFolder(editorResource) ?? undefined;
        }
        // Compute remote
        // vscode-remtoe: use as is
        // otherwise figure out if we have a virtual folder opened
        let remoteName = undefined;
        if (this.environmentService.remoteAuthority && !isWeb) {
            remoteName = this.labelService.getHostLabel(Schemas.vscodeRemote, this.environmentService.remoteAuthority);
        }
        else {
            const virtualWorkspaceLocation = getVirtualWorkspaceLocation(workspace);
            if (virtualWorkspaceLocation) {
                remoteName = this.labelService.getHostLabel(virtualWorkspaceLocation.scheme, virtualWorkspaceLocation.authority);
            }
        }
        // Variables
        const activeEditorShort = editor ? editor.getTitle(0 /* Verbosity.SHORT */) : '';
        const activeEditorMedium = editor ? editor.getTitle(1 /* Verbosity.MEDIUM */) : activeEditorShort;
        const activeEditorLong = editor ? editor.getTitle(2 /* Verbosity.LONG */) : activeEditorMedium;
        const activeFolderShort = editorFolderResource ? basename(editorFolderResource) : '';
        const activeFolderMedium = editorFolderResource
            ? this.labelService.getUriLabel(editorFolderResource, { relative: true })
            : '';
        const activeFolderLong = editorFolderResource
            ? this.labelService.getUriLabel(editorFolderResource)
            : '';
        const rootName = this.labelService.getWorkspaceLabel(workspace);
        const rootNameShort = this.labelService.getWorkspaceLabel(workspace, {
            verbose: 0 /* LabelVerbosity.SHORT */,
        });
        const rootPath = root ? this.labelService.getUriLabel(root) : '';
        const folderName = folder ? folder.name : '';
        const folderPath = folder ? this.labelService.getUriLabel(folder.uri) : '';
        const dirty = editor?.isDirty() && !editor.isSaving() ? WindowTitle_1.TITLE_DIRTY : '';
        const appName = this.productService.nameLong;
        const profileName = this.userDataProfileService.currentProfile.isDefault
            ? ''
            : this.userDataProfileService.currentProfile.name;
        const focusedView = this.viewsService.getFocusedViewName();
        const activeEditorState = editorResource
            ? this.decorationsService.getDecoration(editorResource, false)?.tooltip
            : undefined;
        const variables = {};
        for (const [contextKey, name] of this.variables) {
            variables[name] = this.contextKeyService.getContextKeyValue(contextKey) ?? '';
        }
        let titleTemplate = this.configurationService.getValue("window.title" /* WindowSettingNames.title */);
        if (typeof titleTemplate !== 'string') {
            titleTemplate = defaultWindowTitle;
        }
        if (!this.titleIncludesEditorState &&
            this.accessibilityService.isScreenReaderOptimized() &&
            this.configurationService.getValue('accessibility.windowTitleOptimized')) {
            titleTemplate += '${separator}${activeEditorState}';
        }
        let separator = this.configurationService.getValue("window.titleSeparator" /* WindowSettingNames.titleSeparator */);
        if (typeof separator !== 'string') {
            separator = defaultWindowTitleSeparator;
        }
        return template(titleTemplate, {
            ...variables,
            activeEditorShort,
            activeEditorLong,
            activeEditorMedium,
            activeFolderShort,
            activeFolderMedium,
            activeFolderLong,
            rootName,
            rootPath,
            rootNameShort,
            folderName,
            folderPath,
            dirty,
            appName,
            remoteName,
            profileName,
            focusedView,
            activeEditorState,
            separator: { label: separator },
        });
    }
    isCustomTitleFormat() {
        if (this.accessibilityService.isScreenReaderOptimized() || this.titleIncludesEditorState) {
            return true;
        }
        const title = this.configurationService.inspect("window.title" /* WindowSettingNames.title */);
        const titleSeparator = this.configurationService.inspect("window.titleSeparator" /* WindowSettingNames.titleSeparator */);
        return (title.value !== title.defaultValue || titleSeparator.value !== titleSeparator.defaultValue);
    }
};
WindowTitle = WindowTitle_1 = __decorate([
    __param(2, IConfigurationService),
    __param(3, IContextKeyService),
    __param(4, IEditorService),
    __param(5, IBrowserWorkbenchEnvironmentService),
    __param(6, IWorkspaceContextService),
    __param(7, ILabelService),
    __param(8, IUserDataProfileService),
    __param(9, IProductService),
    __param(10, IViewsService),
    __param(11, IDecorationsService),
    __param(12, IAccessibilityService)
], WindowTitle);
export { WindowTitle };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2luZG93VGl0bGUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci9wYXJ0cy90aXRsZWJhci93aW5kb3dUaXRsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFeEUsT0FBTyxFQUNOLHFCQUFxQixHQUVyQixNQUFNLDREQUE0RCxDQUFBO0FBQ25FLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNqRixPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxzQkFBc0IsRUFBYSxnQkFBZ0IsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBQy9GLE9BQU8sRUFBRSxtQ0FBbUMsRUFBRSxNQUFNLDZEQUE2RCxDQUFBO0FBQ2pILE9BQU8sRUFDTix3QkFBd0IsR0FHeEIsTUFBTSxvREFBb0QsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxXQUFXLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFFN0YsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBRXpELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM1RCxPQUFPLEVBQ04sYUFBYSxHQUViLE1BQU0sNENBQTRDLENBQUE7QUFDbkQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ25FLE9BQU8sRUFB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