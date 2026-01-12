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
var EditorTabsControl_1;
import './media/editortabscontrol.css';
import { localize } from '../../../../nls.js';
import { DataTransfers } from '../../../../base/browser/dnd.js';
import { $, getActiveWindow, getWindow, isMouseEvent, } from '../../../../base/browser/dom.js';
import { StandardMouseEvent } from '../../../../base/browser/mouseEvent.js';
import { prepareActions, } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { ActionRunner } from '../../../../base/common/actions.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { createActionViewItem } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { MenuId } from '../../../../platform/actions/common/actions.js';
import { IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { IThemeService, Themable } from '../../../../platform/theme/common/themeService.js';
import { DraggedEditorGroupIdentifier, fillEditorsDragData, isWindowDraggedOver, } from '../../dnd.js';
import { EditorPane } from './editorPane.js';
import { EditorResourceAccessor, SideBySideEditor, } from '../../../common/editor.js';
import { ResourceContextKey, ActiveEditorPinnedContext, ActiveEditorStickyContext, ActiveEditorGroupLockedContext, ActiveEditorCanSplitInGroupContext, SideBySideEditorActiveContext, ActiveEditorFirstInGroupContext, ActiveEditorAvailableEditorIdsContext, applyAvailableEditorIds, ActiveEditorLastInGroupContext, } from '../../../common/contextkeys.js';
import { assertIsDefined } from '../../../../base/common/types.js';
import { isFirefox } from '../../../../base/browser/browser.js';
import { isCancellationError } from '../../../../base/common/errors.js';
import { SideBySideEditorInput } from '../../../common/editor/sideBySideEditorInput.js';
import { WorkbenchToolBar } from '../../../../platform/actions/browser/toolbar.js';
import { LocalSelectionTransfer } from '../../../../platform/dnd/browser/dnd.js';
import { IEditorResolverService } from '../../../services/editor/common/editorResolverService.js';
import { EDITOR_CORE_NAVIGATION_COMMANDS } from './editorCommands.js';
import { isMacintosh } from '../../../../base/common/platform.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { applyDragImage } from '../../../../base/browser/ui/dnd/dnd.js';
export class EditorCommandsContextActionRunner extends ActionRunner {
    constructor(context) {
        super();
        this.context = context;
    }
    run(action, context) {
        // Even though we have a fixed context for editor commands,
        // allow to preserve the context that is given to us in case
        // it applies.
        let mergedContext = this.context;
        if (context?.preserveFocus) {
            mergedContext = {
                ...this.context,
                preserveFocus: true,
            };
        }
        return super.run(action, mergedContext);
    }
}
let EditorTabsControl = class EditorTabsControl extends Themable {
    static { EditorTabsControl_1 = this; }
    static { this.EDITOR_TAB_HEIGHT = {
        normal: 35,
        compact: 22,
    }; }
    constructor(parent, editorPartsView, groupsView, groupView, tabsModel, contextMenuService, instantiationService, contextKeyService, keybindingService, notificationService, quickInputService, themeService, editorResolverService, hostService) {
        super(themeService);
        this.parent = parent;
        this.editorPartsView = editorPartsView;
        this.groupsView = groupsView;
        this.groupView = groupView;
        this.tabsModel = tabsModel;
        this.contextMenuService = contextMenuService;
        this.instantiationService = instantiationService;
        this.contextKeyService = contextKeyService;
        this.keybindingService = keybindingService;
        this.notificationService = notificationService;
        this.quickInputService = quickInputService;
        this.editorResolverService = editorResolverService;
        this.hostService = hostService;
        this.editorTransfer = LocalSelectionTransfer.getInstance();
        this.groupTransfer = LocalSelectionTransfer.getInstance();
        this.treeItemsTransfer = LocalSelectionTransfer.getInstance();
        this.editorActionsToolbarDisposables = this._register(new DisposableStore());
        this.editorActionsDisposables = this._register(new DisposableStore());
        this.renderDropdownAsChildElement = false;
        const container = this.create(parent);
        // Context Keys
        this.contextMenuContextKeyService = this._register(this.contextKeyService.createScoped(container));
        const scopedInstantiationService = this._register(this.instantiationService.createChild(new ServiceCollection([IContextKeyService, this.contextMenuContextKeyService])));
        this.resourceContext = this._register(scopedInstantiationService.createInstance(ResourceContextKey));
        this.editorPinnedContext = ActiveEditorPinnedContext.bindTo(this.contextMenuContextKeyService);
        this.editorIsFirstContext = ActiveEditorFirstInGroupContext.bindTo(this.contextMenuContextKeyService);
        this.editorIsLastContext = ActiveEditorLastInGroupContext.bindTo(this.contextMenuContextKeyService);
        this.editorStickyContext = ActiveEditorStickyContext.bindTo(this.contextMenuContextKeyService);
        this.editorAvailableEditorIds = ActiveEditorAvailableEditorIdsContext.bindTo(this.contextMenuContextKeyService);
        this.editorCanSplitInGroupContext = ActiveEditorCanSplitInGroupContext.bindTo(this.contextMenuContextKeyService);
        this.sideBySideEditorContext = SideBySideEditorActiveContext.bindTo(this.contextMenuContextKeyService);
        this.groupLockedContext = ActiveEditorGroupLockedContext.bindTo(this.contextMenuContextKeyService);
    }
    create(parent) {
        this.updateTabHeight();
        return parent;
    }
    get editorActionsEnabled() {
        return (this.groupsView.partOptions.editorActionsLocation === 'default' &&
            this.groupsView.partOptions.showTabs !== 'none');
    }
    createEditorActionsToolBar(parent, classes) {
        this.editorActionsToolbarContainer = $('div');
        this.editorActionsToolbarContainer.classList.add(...classes);
        parent.appendChild(this.editorActionsToolbarContainer);
        this.handleEditorActionToolBarVisibility(this.editorActionsToolbarContainer);
    }
    handleEditorActionToolBarVisibility(container) {
        const editorActionsEnabled = this.editorActionsEnabled;
        const editorActionsVisible = !!this.editorActionsToolbar;
        // Create toolbar if it is enabled (and not yet created)
        if (editorActionsEnabled && !editorActionsVisible) {
            this.doCreateEditorActionsToolBar(container);
        }
        // Remove toolbar if it is not enabled (and is visible)
        else if (!editorActionsEnabled && editorActionsVisible) {
            this.editorActionsToolbar?.getElement().remove();
            this.editorActionsToolbar = undefined;
            this.editorActionsToolbarDisposables.clear();
            this.editorActionsDisposables.clear();
        }
        container.classList.toggle('hidden', !editorActionsEnabled);
    }
    doCreateEditorActionsToolBar(container) {
        const context = { groupId: this.groupView.id };
        // Toolbar Widget
        this.editorActionsToolbar = this.editorActionsToolbarDisposables.add(this.instantiationService.createInstance(WorkbenchToolBar, container, {
            actionViewItemProvider: (action, options) => this.actionViewItemProvider(action, options),
            orientation: 0 /* ActionsOrientation.HORIZONTAL */,
            ariaLabel: localize('ariaLabelEditorActions', 'Editor actions'),
            getKeyBinding: (action) => this.getKeybinding(action),
            actionRunner: this.editorActionsToolbarDisposables.add(new EditorCommandsContextActionRunner(context)),
            anchorAlignmentProvider: () => 1 /* AnchorAlignment.RIGHT */,
            renderDropdownAsChildElement: this.renderDropdownAsChildElement,
            telemetrySource: 'editorPart',
            resetMenu: MenuId.EditorTitle,
            overflowBehavior: { maxItems: 9, exempted: EDITOR_CORE_NAVIGATION_COMMANDS },
            highlightToggledItems: true,
        }));
        // Context
        this.editorActionsToolbar.context = context;
        // Action Run Handling
        this.editorActionsToolbarDisposables.add(this.editorActionsToolbar.actionRunner.onDidRun((e) => {
            // Notify for Error
            if (e.error && !isCancellationError(e.error)) {
                this.notificationService.error(e.error);
            }
        }));
    }
    actionViewItemProvider(action, options) {
        const activeEditorPane = this.groupView.activeEditorPane;
        // Check Active Editor
        if (activeEditorPane instanceof EditorPane) {
            const result = activeEditorPane.getActionViewItem(action, options);
            if (result) {
                return result;
            }
        }
        // Check extensions
        return createActionViewItem(this.instantiationService, action, {
            ...options,
            menuAsChild: this.renderDropdownAsChildElement,
        });
    }
    updateEditorActionsToolbar() {
        if (!this.editorActionsEnabled) {
            return;
        }
        this.editorActionsDisposables.clear();
        const editorActions = this.groupView.createEditorActions(this.editorActionsDisposables);
        this.editorActionsDisposables.add(editorActions.onDidChange(() => this.updateEditorActionsToolbar()));
        const editorActionsToolbar = assertIsDefined(this.editorActionsToolbar);
        const { primary, secondary } = this.prepareEditorActions(editorActions.actions);
        editorActionsToolbar.setActions(prepareActions(primary), prepareActions(secondary));
    }
    getEditorPaneAwareContextKeyService() {
        return this.groupView.activeEditorPane?.scopedContextKeyService ?? this.contextKeyService;
    }
    clearEditorActionsToolbar() {
        if (!this.editorActionsEnabled) {
            return;
        }
        const editorActionsToolbar = assertIsDefined(this.editorActionsToolbar);
        editorActionsToolbar.setActions([], []);
    }
    onGroupDragStart(e, element) {
        if (e.target !== element) {
            return false; // only if originating from tabs container
        }
        const isNewWindowOperation = this.isNewWindowOperation(e);
        // Set editor group as transfer
        this.groupTransfer.setData([new DraggedEditorGroupIdentifier(this.groupView.id)], DraggedEditorGroupIdentifier.prototype);
        if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = 'copyMove';
        }
        // Drag all tabs of the group if tabs are enabled
        let hasDataTransfer = false;
        if (this.groupsView.partOptions.showTabs === 'multiple') {
            hasDataTransfer = this.doFillResourceDataTransfers(this.groupView.getEditors(1 /* EditorsOrder.SEQUENTIAL */), e, isNewWindowOperation);
        }
        // Otherwise only drag the active editor
        else {
            if (this.groupView.activeEditor) {
                hasDataTransfer = this.doFillResourceDataTransfers([this.groupView.activeEditor], e, isNewWindowOperation);
            }
        }
        // Firefox: requires to set a text data transfer to get going
        if (!hasDataTransfer && isFirefox) {
            e.dataTransfer?.setData(DataTransfers.TEXT, String(this.groupView.label));
        }
        // Drag Image
        if (this.groupView.activeEditor) {
            let label = this.groupView.activeEditor.getName();
            if (this.groupsView.partOptions.showTabs === 'multiple' && this.groupView.count > 1) {
                label = localize('draggedEditorGroup', '{0} (+{1})', label, this.groupView.count - 1);
            }
            applyDragImage(e, element, label);
        }
        return isNewWindowOperation;
    }
    async onGroupDragEnd(e, previousDragEvent, element, isNewWindowOperation) {
        this.groupTransfer.clearData(DraggedEditorGroupIdentifier.prototype);
        if (e.target !== element || !isNewWindowOperation || isWindowDraggedOver()) {
            return; // drag to open in new window is disabled
        }
        const auxiliaryEditorPart = await this.maybeCreateAuxiliaryEditorPartAt(e, element);
        if (!auxiliaryEditorPart) {
            return;
        }
        const targetGroup = auxiliaryEditorPart.activeGroup;
        this.groupsView.mergeGroup(this.groupView, targetGroup.id, {
            mode: this.isMoveOperation(previousDragEvent ?? e, targetGroup.id)
                ? 1 /* MergeGroupMode.MOVE_EDITORS */
                : 0 /* MergeGroupMode.COPY_EDITORS */,
        });
        targetGroup.focus();
    }
    async maybeCreateAuxiliaryEditorPartAt(e, offsetElement) {
        const { point, display } = (await this.hostService.getCursorScreenPoint()) ?? {
            point: { x: e.screenX, y: e.screenY },
        };
        const window = getActiveWindow();
        if (window.document.visibilityState === 'visible' && window.document.hasFocus()) {
            if (point.x >= window.screenX &&
                point.x <= window.screenX + window.outerWidth &&
                point.y >= window.screenY &&
                point.y <= window.screenY + window.outerHeight) {
                return; // refuse to create as long as the mouse was released over active focused window to reduce chance of opening by accident
            }
        }
        const offsetX = offsetElement.offsetWidth / 2;
        const offsetY = 30 /* take title bar height into account (approximation) */ + offsetElement.offsetHeight / 2;
        const bounds = {
            x: point.x - offsetX,
            y: point.y - offsetY,
        };
        if (display) {
            if (bounds.x < display.x) {
                bounds.x = display.x; // prevent overflow to the left
            }
            if (bounds.y < display.y) {
                bounds.y = display.y; // prevent overflow to the top
            }
        }
        return this.editorPartsView.createAuxiliaryEditorPart({ bounds });
    }
    isNewWindowOperation(e) {
        if (this.groupsView.partOptions.dragToOpenWindow) {
            return !e.altKey;
        }
        return e.altKey;
    }
    isMoveOperation(e, sourceGroup, sourceEditor) {
        if (sourceEditor?.hasCapability(8 /* EditorInputCapabilities.Singleton */)) {
            return true; // Singleton editors cannot be split
        }
        const isCopy = (e.ctrlKey && !isMacintosh) || (e.altKey && isMacintosh);
        return !isCopy || sourceGroup === this.groupView.id;
    }
    doFillResourceDataTransfers(editors, e, disableStandardTransfer) {
        if (editors.length) {
            this.instantiationService.invokeFunction(fillEditorsDragData, editors.map((editor) => ({ editor, groupId: this.groupView.id })), e, { disableStandardTransfer });
            return true;
        }
        return false;
    }
    onTabContextMenu(editor, e, node) {
        // Update contexts based on editor picked and remember previous to restore
        this.resourceContext.set(EditorResourceAccessor.getOriginalUri(editor, {
            supportSideBySide: SideBySideEditor.PRIMARY,
        }));
        this.editorPinnedContext.set(this.tabsModel.isPinned(editor));
        this.editorIsFirstContext.set(this.tabsModel.isFirst(editor));
        this.editorIsLastContext.set(this.tabsModel.isLast(editor));
        this.editorStickyContext.set(this.tabsModel.isSticky(editor));
        this.groupLockedContext.set(this.tabsModel.isLocked);
        this.editorCanSplitInGroupContext.set(editor.hasCapability(32 /* EditorInputCapabilities.CanSplitInGroup */));
        this.sideBySideEditorContext.set(editor.typeId === SideBySideEditorInput.ID);
        applyAvailableEditorIds(this.editorAvailableEditorIds, editor, this.editorResolverService);
        // Find target anchor
        let anchor = node;
        if (isMouseEvent(e)) {
            anchor = new StandardMouseEvent(getWindow(node), e);
        }
        // Show it
        this.contextMenuService.showContextMenu({
            getAnchor: () => anchor,
            menuId: MenuId.EditorTitleContext,
            menuActionOptions: { shouldForwardArgs: true, arg: this.resourceContext.get() },
            contextKeyService: this.contextMenuContextKeyService,
            getActionsContext: () => ({
                groupId: this.groupView.id,
                editorIndex: this.groupView.getIndexOfEditor(editor),
            }),
            getKeyBinding: (action) => this.keybindingService.lookupKeybinding(action.id, this.contextMenuContextKeyService),
            onHide: () => this.groupsView.activeGroup.focus(), // restore focus to active group
        });
    }
    getKeybinding(action) {
        return this.keybindingService.lookupKeybinding(action.id, this.getEditorPaneAwareContextKeyService());
    }
    getKeybindingLabel(action) {
        const keybinding = this.getKeybinding(action);
        return keybinding ? (keybinding.getLabel() ?? undefined) : undefined;
    }
    get tabHeight() {
        return this.groupsView.partOptions.tabHeight !== 'compact'
            ? EditorTabsControl_1.EDITOR_TAB_HEIGHT.normal
            : EditorTabsControl_1.EDITOR_TAB_HEIGHT.compact;
    }
    getHoverTitle(editor) {
        const title = editor.getTitle(2 /* Verbosity.LONG */);
        if (!this.tabsModel.isPinned(editor)) {
            return {
                markdown: new MarkdownString('', { supportThemeIcons: true, isTrusted: true })
                    .appendText(title)
                    .appendMarkdown(' (_preview_ [$(gear)](command:workbench.action.openSettings?%5B%22workbench.editor.enablePreview%22%5D "Configure Preview Mode"))'),
                markdownNotSupportedFallback: title + ' (preview)',
            };
        }
        return title;
    }
    updateTabHeight() {
        this.parent.style.setProperty('--editor-group-tab-height', `${this.tabHeight}px`);
    }
    updateOptions(oldOptions, newOptions) {
        // Update tab height
        if (oldOptions.tabHeight !== newOptions.tabHeight) {
            this.updateTabHeight();
        }
        // Update Editor Actions Toolbar
        if (oldOptions.editorActionsLocation !== newOptions.editorActionsLocation ||
            oldOptions.showTabs !== newOptions.showTabs) {
            if (this.editorActionsToolbarContainer) {
                this.handleEditorActionToolBarVisibility(this.editorActionsToolbarContainer);
                this.updateEditorActionsToolbar();
            }
        }
    }
};
EditorTabsControl = EditorTabsControl_1 = __decorate([
    __param(5, IContextMenuService),
    __param(6, IInstantiationService),
    __param(7, IContextKeyService),
    __param(8, IKeybindingService),
    __param(9, INotificationService),
    __param(10, IQuickInputService),
    __param(11, IThemeService),
    __param(12, IEditorResolverService),
    __param(13, IHostService)
], EditorTabsControl);
export { EditorTabsControl };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yVGFic0NvbnRyb2wuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL3BhcnRzL2VkaXRvci9lZGl0b3JUYWJzQ29udHJvbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTywrQkFBK0IsQ0FBQTtBQUN0QyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQy9ELE9BQU8sRUFDTixDQUFDLEVBRUQsZUFBZSxFQUNmLFNBQVMsRUFDVCxZQUFZLEdBQ1osTUFBTSxpQ0FBaUMsQ0FBQTtBQUN4QyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUMzRSxPQUFPLEVBR04sY0FBYyxHQUNkLE1BQU0sb0RBQW9ELENBQUE7QUFDM0QsT0FBTyxFQUFXLFlBQVksRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBRTFFLE9BQU8sRUFBRSxlQUFlLEVBQWUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNuRixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQTtBQUN0RyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDdkUsT0FBTyxFQUNOLGtCQUFrQixHQUVsQixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQzdGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQy9G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