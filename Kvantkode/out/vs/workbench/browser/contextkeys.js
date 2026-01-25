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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGV4dGtleXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL2NvbnRleHRrZXlzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUNsRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDM0QsT0FBTyxFQUNOLGtCQUFrQixFQUVsQixXQUFXLElBQUkscUJBQXFCLEdBQ3BDLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUNOLG1CQUFtQixFQUNuQixZQUFZLEVBQ1osY0FBYyxFQUNkLGdCQUFnQixFQUNoQixZQUFZLEVBQ1osa0JBQWtCLEVBQ2xCLG9CQUFvQixFQUNwQixZQUFZLEVBQ1oscUJBQXFCLEVBQ3JCLGVBQWUsR0FDZixNQUFNLGlEQUFpRCxDQUFBO0FBQ3hELE9BQU8sRUFDTixzQkFBc0IsRUFDdEIsc0JBQXNCLEVBQ3RCLDBCQUEwQixFQUMxQixxQkFBcUIsRUFDckIscUJBQXFCLEVBQ3JCLHFCQUFxQixFQUNyQixtQkFBbUIsRUFDbkIseUJBQXlCLEVBQ3pCLHdCQUF3QixFQUN4QixpQ0FBaUMsRUFDakMsNEJBQTRCLEVBQzVCLHlCQUF5QixFQUN6Qiw0QkFBNEIsRUFDNUIscUNBQXFDLEVBQ3JDLHNCQUFzQixFQUN0Qiw2QkFBNkIsRUFDN0IsaUNBQWlDLEVBQ2pDLGlCQUFpQixFQUNqQix1QkFBdUIsRUFDdkIscUJBQXFCLEVBQ3JCLDJCQUEyQixFQUMzQixvQkFBb0IsRUFDcEIseUJBQXlCLEVBQ3pCLHNCQUFzQixFQUN0QixvQkFBb0IsRUFDcEIsK0JBQStCLEVBQy9CLDZCQUE2QixFQUM3Qiw2QkFBNkIsRUFDN0IsNEJBQTRCLEVBQzVCLDhCQUE4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