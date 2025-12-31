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
import { Event } from '../../base/common/event.js';
import { Disposable } from '../../base/common/lifecycle.js';
import { IContextKeyService, setConstant as setConstantContextKey, } from '../../platform/contextkey/common/contextkey.js';
import { InputFocusedContext, IsMacContext, IsLinuxContext, IsWindowsContext, IsWebContext, IsMacNativeContext, IsDevelopmentContext, IsIOSContext, ProductQualityContext, IsMobileContext, } from '../../platform/contextkey/common/contextkeys.js';
import { SplitEditorsVertically, InEditorZenModeContext, AuxiliaryBarVisibleContext, SideBarVisibleContext, PanelAlignmentContext, PanelMaximizedContext, PanelVisibleContext, EmbedderIdentifierContext, EditorTabsVisibleContext, IsMainEditorCenteredLayoutContext, MainEditorAreaVisibleContext, DirtyWorkingCopiesContext, EmptyWorkspaceSupportContext, EnterMultiRootWorkspaceSupportContext, HasWebFileSystemAccess, IsMainWindowFullscreenContext, OpenFolderWorkspaceSupportContext, RemoteNameContext, VirtualWorkspaceContext, WorkbenchStateContext, WorkspaceFolderCountContext, PanelPositionContext, TemporaryWorkspaceContext, TitleBarVisibleContext, TitleBarStyleContext, IsAuxiliaryWindowFocusedContext, ActiveEditorGroupEmptyContext, ActiveEditorGroupIndexContext, ActiveEditorGroupLastContext, ActiveEditorGroupLockedContext, MultipleEditorGroupsContext, EditorsVisibleContext, } from '../common/contextkeys.js';
import { trackFocus, addDisposableListener, EventType, onDidRegisterWindow, getActiveWindow, isEditableElement, } from '../../base/browser/dom.js';
import { preferredSideBySideGroupDirection, IEditorGroupsService, } from '../services/editor/common/editorGroupsService.js';
import { IConfigurationService } from '../../platform/configuration/common/configuration.js';
import { IWorkbenchEnvironmentService } from '../services/environment/common/environmentService.js';
import { IWorkspaceContextService, isTemporaryWorkspace, } from '../../platform/workspace/common/workspace.js';
import { IWorkbenchLayoutService, positionToString, } from '../services/layout/browser/layoutService.js';
import { getRemoteName } from '../../platform/remote/common/remoteHosts.js';
import { getVirtualWorkspaceScheme } from '../../platform/workspace/common/virtualWorkspace.js';
import { IWorkingCopyService } from '../services/workingCopy/common/workingCopyService.js';
import { isNative } from '../../base/common/platform.js';
import { IPaneCompositePartService } from '../services/panecomposite/browser/panecomposite.js';
import { WebFileSystemAccess } from '../../platform/files/browser/webFileSystemAccess.js';
import { IProductService } from '../../platform/product/common/productService.js';
import { getTitleBarStyle } from '../../platform/window/common/window.js';
import { mainWindow } from '../../base/browser/window.js';
import { isFullscreen, onDidChangeFullscreen } from '../../base/browser/browser.js';
import { IEditorService } from '../services/editor/common/editorService.js';
let WorkbenchContextKeysHandler = class WorkbenchContextKeysHandler extends Disposable {
    constructor(contextKeyService, contextService, configurationService, environmentService, productService, editorGroupService, editorService, layoutService, paneCompositeService, workingCopyService) {
        super();
        this.contextKeyService = contextKeyService;
        this.contextService = contextService;
        this.configurationService = configurationService;
        this.environmentService = environmentService;
        this.productService = productService;
        this.editorGroupService = editorGroupService;
        this.editorService = editorService;
        this.layoutService = layoutService;
        this.paneCompositeService = paneCompositeService;
        this.workingCopyService = workingCopyService;
        // Platform
        IsMacContext.bindTo(this.contextKeyService);
        IsLinuxContext.bindTo(this.contextKeyService);
        IsWindowsContext.bindTo(this.contextKeyService);
        IsWebContext.bindTo(this.contextKeyService);
        IsMacNativeContext.bindTo(this.contextKeyService);
        IsIOSContext.bindTo(this.contextKeyService);
        IsMobileContext.bindTo(this.contextKeyService);
        RemoteNameContext.bindTo(this.contextKeyService).set(getRemoteName(this.environmentService.remoteAuthority) || '');
        this.virtualWorkspaceContext = VirtualWorkspaceContext.bindTo(this.contextKeyService);
        this.temporaryWorkspaceContext = TemporaryWorkspaceContext.bindTo(this.contextKeyService);
        this.updateWorkspaceContextKeys();
        // Capabilities
        HasWebFileSystemAccess.bindTo(this.contextKeyService).set(WebFileSystemAccess.supported(mainWindow));
        // Development
        const isDevelopment = !this.environmentService.isBuilt || this.environmentService.isExtensionDevelopment;
        IsDevelopmentContext.bindTo(this.contextKeyService).set(isDevelopment);
        setConstantContextKey(IsDevelopmentContext.key, isDevelopment);
        // Product Service
        ProductQualityContext.bindTo(this.contextKeyService).set(this.productService.quality || '');
        EmbedderIdentifierContext.bindTo(this.contextKeyService).set(productService.embedderIdentifier);
        // Editor Groups
        this.activeEditorGroupEmpty = ActiveEditorGroupEmptyContext.bindTo(this.contextKeyService);
        this.activeEditorGroupIndex = ActiveEditorGroupIndexContext.bindTo(this.contextKeyService);
        this.activeEditorGroupLast = ActiveEditorGroupLastContext.bindTo(this.contextKeyService);
        this.activeEditorGroupLocked = ActiveEditorGroupLockedContext.bindTo(this.contextKeyService);
        this.multipleEditorGroupsContext = MultipleEditorGroupsContext.bindTo(this.contextKeyService);
        // Editors
        this.editorsVisibleContext = EditorsVisibleContext.bindTo(this.contextKeyService);
        // Working Copies
        this.dirtyWorkingCopiesContext = DirtyWorkingCopiesContext.bindTo(this.contextKeyService);
        this.dirtyWorkingCopiesContext.set(this.workingCopyService.hasDirty);
        // Inputs
        this.inputFocusedContext = InputFocusedContext.bindTo(this.contextKeyService);
        // Workbench State
        this.workbenchStateContext = WorkbenchStateContext.bindTo(this.contextKeyService);
        this.updateWorkbenchStateContextKey();
        // Workspace Folder Count
        this.workspaceFolderCountContext = WorkspaceFolderCountContext.bindTo(this.contextKeyService);
        this.updateWorkspaceFolderCountContextKey();
        // Opening folder support: support for opening a folder workspace
        // (e.g. "Open Folder...") is limited in web when not connected
        // to a remote.
        this.openFolderWorkspaceSupportContext = OpenFolderWorkspaceSupportContext.bindTo(this.contextKeyService);
        this.openFolderWorkspaceSupportContext.set(isNative || typeof this.environmentService.remoteAuthority === 'string');
        // Empty workspace support: empty workspaces require built-in file system
        // providers to be available that allow to enter a workspace or open loose
        // files. This condition is met:
        // - desktop: always
        // -     web: only when connected to a remote
        this.emptyWorkspaceSupportContext = EmptyWorkspaceSupportContext.bindTo(this.contextKeyService);
        this.emptyWorkspaceSupportContext.set(isNative || typeof this.environmentService.remoteAuthority === 'string');
        // Entering a multi root workspace support: support for entering a multi-root
        // workspace (e.g. "Open Workspace from File...", "Duplicate Workspace", "Save Workspace")
        // is driven by the ability to resolve a workspace configuration file (*.code-workspace)
        // with a built-in file system provider.
        // This condition is met:
        // - desktop: always
        // -     web: only when connected to a remote
        this.enterMultiRootWorkspaceSupportContext = EnterMultiRootWorkspaceSupportContext.bindTo(this.contextKeyService);
        this.enterMultiRootWorkspaceSupportContext.set(isNative || typeof this.environmentService.remoteAuthority === 'string');
        // Editor Layout
        this.splitEditorsVerticallyContext = SplitEditorsVertically.bindTo(this.contextKeyService);
        this.updateSplitEditorsVerticallyContext();
        // Window
        this.isMainWindowFullscreenContext = IsMainWindowFullscreenContext.bindTo(this.contextKeyService);
        this.isAuxiliaryWindowFocusedContext = IsAuxiliaryWindowFocusedContext.bindTo(this.contextKeyService);
        // Zen Mode
        this.inZenModeContext = InEditorZenModeContext.bindTo(this.contextKeyService);
        // Centered Layout (Main Editor)
        this.isMainEditorCenteredLayoutContext = IsMainEditorCenteredLayoutContext.bindTo(this.contextKeyService);
        // Editor Area
        this.mainEditorAreaVisibleContext = MainEditorAreaVisibleContext.bindTo(this.contextKeyService);
        this.editorTabsVisibleContext = EditorTabsVisibleContext.bindTo(this.contextKeyService);
        // Sidebar
        this.sideBarVisibleContext = SideBarVisibleContext.bindTo(this.contextKeyService);
        // Title Bar
        this.titleAreaVisibleContext = TitleBarVisibleContext.bindTo(this.contextKeyService);
        this.titleBarStyleContext = TitleBarStyleContext.bindTo(this.contextKeyService);
        this.updateTitleBarContextKeys();
        // Panel
        this.panelPositionContext = PanelPositionContext.bindTo(this.contextKeyService);
        this.panelPositionContext.set(positionToString(this.layoutService.getPanelPosition()));
        this.panelVisibleContext = PanelVisibleContext.bindTo(this.contextKeyService);
        this.panelVisibleContext.set(this.layoutService.isVisible("workbench.parts.panel" /* Parts.PANEL_PART */));
        this.panelMaximizedContext = PanelMaximizedContext.bindTo(this.contextKeyService);
        this.panelMaximizedContext.set(this.layoutService.isPanelMaximized());
        this.panelAlignmentContext = PanelAlignmentContext.bindTo(this.contextKeyService);
        this.panelAlignmentContext.set(this.layoutService.getPanelAlignment());
        // Auxiliary Bar
        this.auxiliaryBarVisibleContext = AuxiliaryBarVisibleContext.bindTo(this.contextKeyService);
        this.auxiliaryBarVisibleContext.set(this.layoutService.isVisible("workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */));
        this.registerListeners();
    }
    registerListeners() {
        this.editorGroupService.whenReady.then(() => {
            this.updateEditorAreaContextKeys();
            this.updateActiveEditorGroupContextKeys();
            this.updateVisiblePanesContextKeys();
        });
        this._register(this.editorService.onDidActiveEditorChange(() => this.updateActiveEditorGroupContextKeys()));
        this._register(this.editorService.onDidVisibleEditorsChange(() => this.updateVisiblePanesContextKeys()));
        this._register(this.editorGroupService.onDidAddGroup(() => this.updateEditorGroupsContextKeys()));
        this._register(this.editorGroupService.onDidRemoveGroup(() => this.updateEditorGroupsContextKeys()));
        this._register(this.editorGroupService.onDidChangeGroupIndex(() => this.updateActiveEditorGroupContextKeys()));
        this._register(this.editorGroupService.onDidChangeGroupLocked(() => this.updateActiveEditorGroupContextKeys()));
        this._register(this.editorGroupService.onDidChangeEditorPartOptions(() => this.updateEditorAreaContextKeys()));
        this._register(Event.runAndSubscribe(onDidRegisterWindow, ({ window, disposables }) => disposables.add(addDisposableListener(window, EventType.FOCUS_IN, () => this.updateInputContextKeys(window.document), true)), { window: mainWindow, disposables: this._store }));
        this._register(this.contextService.onDidChangeWorkbenchState(() => this.updateWorkbenchStateContextKey()));
        this._register(this.contextService.onDidChangeWorkspaceFolders(() => {
            this.updateWorkspaceFolderCountContextKey();
            this.updateWorkspaceContextKeys();
        }));
        this._register(this.configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('workbench.editor.openSideBySideDirection')) {
                this.updateSplitEditorsVerticallyContext();
            }
        }));
        this._register(this.layoutService.onDidChangeZenMode((enabled) => this.inZenModeContext.set(enabled)));
        this._register(this.layoutService.onDidChangeActiveContainer(() => this.isAuxiliaryWindowFocusedContext.set(this.layoutService.activeContainer !== this.layoutService.mainContainer)));
        this._register(onDidChangeFullscreen((windowId) => {
            if (windowId === mainWindow.vscodeWindowId) {
                this.isMainWindowFullscreenContext.set(isFullscreen(mainWindow));
            }
        }));
        this._register(this.layoutService.onDidChangeMainEditorCenteredLayout((centered) => this.isMainEditorCenteredLayoutContext.set(centered)));
        this._register(this.layoutService.onDidChangePanelPosition((position) => this.panelPositionContext.set(position)));
        this._register(this.layoutService.onDidChangePanelAlignment((alignment) => this.panelAlignmentContext.set(alignment)));
        this._register(this.paneCompositeService.onDidPaneCompositeClose(() => this.updateSideBarContextKeys()));
        this._register(this.paneCompositeService.onDidPaneCompositeOpen(() => this.updateSideBarContextKeys()));
        this._register(this.layoutService.onDidChangePartVisibility(() => {
            this.mainEditorAreaVisibleContext.set(this.layoutService.isVisible("workbench.parts.editor" /* Parts.EDITOR_PART */, mainWindow));
            this.panelVisibleContext.set(this.layoutService.isVisible("workbench.parts.panel" /* Parts.PANEL_PART */));
            this.panelMaximizedContext.set(this.layoutService.isPanelMaximized());
            this.auxiliaryBarVisibleContext.set(this.layoutService.isVisible("workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */));
            this.updateTitleBarContextKeys();
        }));
        this._register(this.workingCopyService.onDidChangeDirty((workingCopy) => this.dirtyWorkingCopiesContext.set(workingCopy.isDirty() || this.workingCopyService.hasDirty)));
    }
    updateVisiblePanesContextKeys() {
        const visibleEditorPanes = this.editorService.visibleEditorPanes;
        if (visibleEditorPanes.length > 0) {
            this.editorsVisibleContext.set(true);
        }
        else {
            this.editorsVisibleContext.reset();
        }
    }
    // Context keys depending on the state of the editor group itself
    updateActiveEditorGroupContextKeys() {
        if (!this.editorService.activeEditor) {
            this.activeEditorGroupEmpty.set(true);
        }
        else {
            this.activeEditorGroupEmpty.reset();
        }
        const activeGroup = this.editorGroupService.activeGroup;
        this.activeEditorGroupIndex.set(activeGroup.index + 1); // not zero-indexed
        this.activeEditorGroupLocked.set(activeGroup.isLocked);
        this.updateEditorGroupsContextKeys();
    }
    // Context keys depending on the state of other editor groups
    updateEditorGroupsContextKeys() {
        const groupCount = this.editorGroupService.count;
        if (groupCount > 1) {
            this.multipleEditorGroupsContext.set(true);
        }
        else {
            this.multipleEditorGroupsContext.reset();
        }
        const activeGroup = this.editorGroupService.activeGroup;
        this.activeEditorGroupLast.set(activeGroup.index === groupCount - 1);
    }
    updateEditorAreaContextKeys() {
        this.editorTabsVisibleContext.set(this.editorGroupService.partOptions.showTabs === 'multiple');
    }
    updateInputContextKeys(ownerDocument) {
        function activeElementIsInput() {
            return !!ownerDocument.activeElement && isEditableElement(ownerDocument.activeElement);
        }
        const isInputFocused = activeElementIsInput();
        this.inputFocusedContext.set(isInputFocused);
        if (isInputFocused) {
            const tracker = trackFocus(ownerDocument.activeElement);
            Event.once(tracker.onDidBlur)(() => {
                // Ensure we are only updating the context key if we are
                // still in the same document that we are tracking. This
                // fixes a race condition in multi-window setups where
                // the blur event arrives in the inactive window overwriting
                // the context key of the active window. This is because
                // blur events from the focus tracker are emitted with a
                // timeout of 0.
                if (getActiveWindow().document === ownerDocument) {
                    this.inputFocusedContext.set(activeElementIsInput());
                }
                tracker.dispose();
            });
        }
    }
    updateWorkbenchStateContextKey() {
        this.workbenchStateContext.set(this.getWorkbenchStateString());
    }
    updateWorkspaceFolderCountContextKey() {
        this.workspaceFolderCountContext.set(this.contextService.getWorkspace().folders.length);
    }
    updateSplitEditorsVerticallyContext() {
        const direction = preferredSideBySideGroupDirection(this.configurationService);
        this.splitEditorsVerticallyContext.set(direction === 1 /* GroupDirection.DOWN */);
    }
    getWorkbenchStateString() {
        switch (this.contextService.getWorkbenchState()) {
            case 1 /* WorkbenchState.EMPTY */:
                return 'empty';
            case 2 /* WorkbenchState.FOLDER */:
                return 'folder';
            case 3 /* WorkbenchState.WORKSPACE */:
                return 'workspace';
        }
    }
    updateSideBarContextKeys() {
        this.sideBarVisibleContext.set(this.layoutService.isVisible("workbench.parts.sidebar" /* Parts.SIDEBAR_PART */));
    }
    updateTitleBarContextKeys() {
        this.titleAreaVisibleContext.set(this.layoutService.isVisible("workbench.parts.titlebar" /* Parts.TITLEBAR_PART */, mainWindow));
        this.titleBarStyleContext.set(getTitleBarStyle(this.configurationService));
    }
    updateWorkspaceContextKeys() {
        this.virtualWorkspaceContext.set(getVirtualWorkspaceScheme(this.contextService.getWorkspace()) || '');
        this.temporaryWorkspaceContext.set(isTemporaryWorkspace(this.contextService.getWorkspace()));
    }
};
WorkbenchContextKeysHandler = __decorate([
    __param(0, IContextKeyService),
    __param(1, IWorkspaceContextService),
    __param(2, IConfigurationService),
    __param(3, IWorkbenchEnvironmentService),
    __param(4, IProductService),
    __param(5, IEditorGroupsService),
    __param(6, IEditorService),
    __param(7, IWorkbenchLayoutService),
    __param(8, IPaneCompositePartService),
    __param(9, IWorkingCopyService)
], WorkbenchContextKeysHandler);
export { WorkbenchContextKeysHandler };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGV4dGtleXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci9jb250ZXh0a2V5cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDbEQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQzNELE9BQU8sRUFDTixrQkFBa0IsRUFFbEIsV0FBVyxJQUFJLHFCQUFxQixHQUNwQyxNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFDTixtQkFBbUIsRUFDbkIsWUFBWSxFQUNaLGNBQWMsRUFDZCxnQkFBZ0IsRUFDaEIsWUFBWSxFQUNaLGtCQUFrQixFQUNsQixvQkFBb0IsRUFDcEIsWUFBWSxFQUNaLHFCQUFxQixFQUNyQixlQUFlLEdBQ2YsTUFBTSxpREFBaUQsQ0FBQTtBQUN4RCxPQUFPLEVBQ04sc0JBQXNCLEVBQ3RCLHNCQUFzQixFQUN0QiwwQkFBMEIsRUFDMUIscUJBQXFCLEVBQ3JCLHFCQUFxQixFQUNyQixxQkFBcUIsRUFDckIsbUJBQW1CLEVBQ25CLHlCQUF5QixFQUN6Qix3QkFBd0IsRUFDeEIsaUNBQWlDLEVBQ2pDLDRCQUE0QixFQUM1Qix5QkFBeUIsRUFDekIsNEJBQTRCLEVBQzVCLHFDQUFxQyxFQUNyQyxzQkFBc0IsRUFDdEIsNkJBQTZCLEVBQzdCLGlDQUFpQyxFQUNqQyxpQkFBaUIsRUFDakIsdUJBQXVCLEVBQ3ZCLHFCQUFxQixFQUNyQiwyQkFBMkIsRUFDM0Isb0JBQW9CLEVBQ3BCLHlCQUF5QixFQUN6QixzQkFBc0IsRUFDdEIsb0JBQW9CLEVBQ3BCLCtCQUErQixFQUMvQiw2QkFBNkIsRUFDN0IsNkJBQTZCLEVBQzdCLDRCQUE0QixFQUM1Qiw4QkFBOEIsRUFD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