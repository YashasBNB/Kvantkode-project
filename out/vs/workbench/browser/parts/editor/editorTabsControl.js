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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yVGFic0NvbnRyb2wuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci9wYXJ0cy9lZGl0b3IvZWRpdG9yVGFic0NvbnRyb2wudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sK0JBQStCLENBQUE7QUFDdEMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUMvRCxPQUFPLEVBQ04sQ0FBQyxFQUVELGVBQWUsRUFDZixTQUFTLEVBQ1QsWUFBWSxHQUNaLE1BQU0saUNBQWlDLENBQUE7QUFDeEMsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDM0UsT0FBTyxFQUdOLGNBQWMsR0FDZCxNQUFNLG9EQUFvRCxDQUFBO0FBQzNELE9BQU8sRUFBVyxZQUFZLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUUxRSxPQUFPLEVBQUUsZUFBZSxFQUFlLE1BQU0sc0NBQXNDLENBQUE7QUFDbkYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0saUVBQWlFLENBQUE7QUFDdEcsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZFLE9BQU8sRUFDTixrQkFBa0IsR0FFbEIsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUM3RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUN6RixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUMvRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUN6RixPQUFPLEVBQUUsYUFBYSxFQUFFLFFBQVEsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQzNGLE9BQU8sRUFDTiw0QkFBNEIsRUFFNUIsbUJBQW1CLEVBQ25CLG1CQUFtQixHQUNuQixNQUFNLGNBQWMsQ0FBQTtBQUNyQixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFPNUMsT0FBTyxFQUVOLHNCQUFzQixFQUV0QixnQkFBZ0IsR0FNaEIsTUFBTSwyQkFBMkIsQ0FBQTtBQUVsQyxPQUFPLEVBQ04sa0JBQWtCLEVBQ2xCLHlCQUF5QixFQUN6Qix5QkFBeUIsRUFDekIsOEJBQThCLEVBQzlCLGtDQUFrQyxFQUNsQyw2QkFBNkIsRUFDN0IsK0JBQStCLEVBQy9CLHFDQUFxQyxFQUNyQyx1QkFBdUIsRUFDdkIsOEJBQThCLEdBQzlCLE1BQU0sZ0NBQWdDLENBQUE7QUFFdkMsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUN2RixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUNsRixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUVoRixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUdqRyxPQUFPLEVBQUUsK0JBQStCLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUtyRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDakUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdFQUFnRSxDQUFBO0FBRWxHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUV2RSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFFdkUsTUFBTSxPQUFPLGlDQUFrQyxTQUFRLFlBQVk7SUFDbEUsWUFBb0IsT0FBK0I7UUFDbEQsS0FBSyxFQUFFLENBQUE7UUFEWSxZQUFPLEdBQVAsT0FBTyxDQUF3QjtJQUVuRCxDQUFDO0lBRVEsR0FBRyxDQUFDLE1BQWUsRUFBRSxPQUFxQztRQUNsRSwyREFBMkQ7UUFDM0QsNERBQTREO1FBQzVELGNBQWM7UUFFZCxJQUFJLGFBQWEsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFBO1FBQ2hDLElBQUksT0FBTyxFQUFFLGFBQWEsRUFBRSxDQUFDO1lBQzVCLGFBQWEsR0FBRztnQkFDZixHQUFHLElBQUksQ0FBQyxPQUFPO2dCQUNmLGFBQWEsRUFBRSxJQUFJO2FBQ25CLENBQUE7UUFDRixDQUFDO1FBRUQsT0FBTyxLQUFLLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxhQUFhLENBQUMsQ0FBQTtJQUN4QyxDQUFDO0NBQ0Q7QUEwQk0sSUFBZSxpQkFBaUIsR0FBaEMsTUFBZSxpQkFBa0IsU0FBUSxRQUFROzthQU8vQixzQkFBaUIsR0FBRztRQUMzQyxNQUFNLEVBQUUsRUFBVztRQUNuQixPQUFPLEVBQUUsRUFBVztLQUNwQixBQUh3QyxDQUd4QztJQXVCRCxZQUNvQixNQUFtQixFQUNuQixlQUFpQyxFQUNqQyxVQUE2QixFQUM3QixTQUEyQixFQUMzQixTQUFvQyxFQUNsQyxrQkFBMEQsRUFDeEQsb0JBQXFELEVBQ3hELGlCQUF3RCxFQUN4RCxpQkFBc0QsRUFDcEQsbUJBQTBELEVBQzVELGlCQUErQyxFQUNwRCxZQUEyQixFQUNsQixxQkFBOEQsRUFDeEUsV0FBMEM7UUFFeEQsS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFBO1FBZkEsV0FBTSxHQUFOLE1BQU0sQ0FBYTtRQUNuQixvQkFBZSxHQUFmLGVBQWUsQ0FBa0I7UUFDakMsZUFBVSxHQUFWLFVBQVUsQ0FBbUI7UUFDN0IsY0FBUyxHQUFULFNBQVMsQ0FBa0I7UUFDM0IsY0FBUyxHQUFULFNBQVMsQ0FBMkI7UUFDZix1QkFBa0IsR0FBbEIsa0JBQWtCLENBQXFCO1FBQzlDLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFDckMsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFvQjtRQUN2QyxzQkFBaUIsR0FBakIsaUJBQWlCLENBQW9CO1FBQ25DLHdCQUFtQixHQUFuQixtQkFBbUIsQ0FBc0I7UUFDbEQsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFvQjtRQUUxQiwwQkFBcUIsR0FBckIscUJBQXFCLENBQXdCO1FBQ3ZELGdCQUFXLEdBQVgsV0FBVyxDQUFjO1FBOUN0QyxtQkFBYyxHQUFHLHNCQUFzQixDQUFDLFdBQVcsRUFBMkIsQ0FBQTtRQUM5RSxrQkFBYSxHQUMvQixzQkFBc0IsQ0FBQyxXQUFXLEVBQWdDLENBQUE7UUFDaEQsc0JBQWlCLEdBQ25DLHNCQUFzQixDQUFDLFdBQVcsRUFBOEIsQ0FBQTtRQVNoRCxvQ0FBK0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksZUFBZSxFQUFFLENBQUMsQ0FBQTtRQUN2RSw2QkFBd0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksZUFBZSxFQUFFLENBQUMsQ0FBQTtRQW9DaEYsSUFBSSxDQUFDLDRCQUE0QixHQUFHLEtBQUssQ0FBQTtRQUV6QyxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBRXJDLGVBQWU7UUFDZixJQUFJLENBQUMsNEJBQTRCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDakQsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsQ0FDOUMsQ0FBQTtRQUNELE1BQU0sMEJBQTBCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDaEQsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFdBQVcsQ0FDcEMsSUFBSSxpQkFBaUIsQ0FBQyxDQUFDLGtCQUFrQixFQUFFLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDLENBQzlFLENBQ0QsQ0FBQTtRQUVELElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDcEMsMEJBQTBCLENBQUMsY0FBYyxDQUFDLGtCQUFrQixDQUFDLENBQzdELENBQUE7UUFFRCxJQUFJLENBQUMsbUJBQW1CLEdBQUcseUJBQXlCLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxDQUFBO1FBQzlGLElBQUksQ0FBQyxvQkFBb0IsR0FBRywrQkFBK0IsQ0FBQyxNQUFNLENBQ2pFLElBQUksQ0FBQyw0QkFBNEIsQ0FDakMsQ0FBQTtRQUNELElBQUksQ0FBQyxtQkFBbUIsR0FBRyw4QkFBOEIsQ0FBQyxNQUFNLENBQy9ELElBQUksQ0FBQyw0QkFBNEIsQ0FDakMsQ0FBQTtRQUNELElBQUksQ0FBQyxtQkFBbUIsR0FBRyx5QkFBeUIsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLDRCQUE0QixDQUFDLENBQUE7UUFDOUYsSUFBSSxDQUFDLHdCQUF3QixHQUFHLHFDQUFxQyxDQUFDLE1BQU0sQ0FDM0UsSUFBSSxDQUFDLDRCQUE0QixDQUNqQyxDQUFBO1FBRUQsSUFBSSxDQUFDLDRCQUE0QixHQUFHLGtDQUFrQyxDQUFDLE1BQU0sQ0FDNUUsSUFBSSxDQUFDLDRCQUE0QixDQUNqQyxDQUFBO1FBQ0QsSUFBSSxDQUFDLHVCQUF1QixHQUFHLDZCQUE2QixDQUFDLE1BQU0sQ0FDbEUsSUFBSSxDQUFDLDRCQUE0QixDQUNqQyxDQUFBO1FBRUQsSUFBSSxDQUFDLGtCQUFrQixHQUFHLDhCQUE4QixDQUFDLE1BQU0sQ0FDOUQsSUFBSSxDQUFDLDRCQUE0QixDQUNqQyxDQUFBO0lBQ0YsQ0FBQztJQUVTLE1BQU0sQ0FBQyxNQUFtQjtRQUNuQyxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUE7UUFDdEIsT0FBTyxNQUFNLENBQUE7SUFDZCxDQUFDO0lBRUQsSUFBWSxvQkFBb0I7UUFDL0IsT0FBTyxDQUNOLElBQUksQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLHFCQUFxQixLQUFLLFNBQVM7WUFDL0QsSUFBSSxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsUUFBUSxLQUFLLE1BQU0sQ0FDL0MsQ0FBQTtJQUNGLENBQUM7SUFFUywwQkFBMEIsQ0FBQyxNQUFtQixFQUFFLE9BQWlCO1FBQzFFLElBQUksQ0FBQyw2QkFBNkIsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDN0MsSUFBSSxDQUFDLDZCQUE2QixDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsR0FBRyxPQUFPLENBQUMsQ0FBQTtRQUM1RCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxDQUFBO1FBRXRELElBQUksQ0FBQyxtQ0FBbUMsQ0FBQyxJQUFJLENBQUMsNkJBQTZCLENBQUMsQ0FBQTtJQUM3RSxDQUFDO0lBRU8sbUNBQW1DLENBQUMsU0FBc0I7UUFDakUsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUE7UUFDdEQsTUFBTSxvQkFBb0IsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFBO1FBRXhELHdEQUF3RDtRQUN4RCxJQUFJLG9CQUFvQixJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztZQUNuRCxJQUFJLENBQUMsNEJBQTRCLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDN0MsQ0FBQztRQUNELHVEQUF1RDthQUNsRCxJQUFJLENBQUMsb0JBQW9CLElBQUksb0JBQW9CLEVBQUUsQ0FBQztZQUN4RCxJQUFJLENBQUMsb0JBQW9CLEVBQUUsVUFBVSxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUE7WUFDaEQsSUFBSSxDQUFDLG9CQUFvQixHQUFHLFNBQVMsQ0FBQTtZQUNyQyxJQUFJLENBQUMsK0JBQStCLENBQUMsS0FBSyxFQUFFLENBQUE7WUFDNUMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLEtBQUssRUFBRSxDQUFBO1FBQ3RDLENBQUM7UUFFRCxTQUFTLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFBO0lBQzVELENBQUM7SUFFTyw0QkFBNEIsQ0FBQyxTQUFzQjtRQUMxRCxNQUFNLE9BQU8sR0FBMkIsRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLEVBQUUsQ0FBQTtRQUV0RSxpQkFBaUI7UUFDakIsSUFBSSxDQUFDLG9CQUFvQixHQUFHLElBQUksQ0FBQywrQkFBK0IsQ0FBQyxHQUFHLENBQ25FLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLEVBQUUsU0FBUyxFQUFFO1lBQ3JFLHNCQUFzQixFQUFFLENBQUMsTUFBTSxFQUFFLE9BQU8sRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUM7WUFDekYsV0FBVyx1Q0FBK0I7WUFDMUMsU0FBUyxFQUFFLFFBQVEsQ0FBQyx3QkFBd0IsRUFBRSxnQkFBZ0IsQ0FBQztZQUMvRCxhQUFhLEVBQUUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDO1lBQ3JELFlBQVksRUFBRSxJQUFJLENBQUMsK0JBQStCLENBQUMsR0FBRyxDQUNyRCxJQUFJLGlDQUFpQyxDQUFDLE9BQU8sQ0FBQyxDQUM5QztZQUNELHVCQUF1QixFQUFFLEdBQUcsRUFBRSw4QkFBc0I7WUFDcEQsNEJBQTRCLEVBQUUsSUFBSSxDQUFDLDRCQUE0QjtZQUMvRCxlQUFlLEVBQUUsWUFBWTtZQUM3QixTQUFTLEVBQUUsTUFBTSxDQUFDLFdBQVc7WUFDN0IsZ0JBQWdCLEVBQUUsRUFBRSxRQUFRLEVBQUUsQ0FBQyxFQUFFLFFBQVEsRUFBRSwrQkFBK0IsRUFBRTtZQUM1RSxxQkFBcUIsRUFBRSxJQUFJO1NBQzNCLENBQUMsQ0FDRixDQUFBO1FBRUQsVUFBVTtRQUNWLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFBO1FBRTNDLHNCQUFzQjtRQUN0QixJQUFJLENBQUMsK0JBQStCLENBQUMsR0FBRyxDQUN2QyxJQUFJLENBQUMsb0JBQW9CLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQ3JELG1CQUFtQjtZQUNuQixJQUFJLENBQUMsQ0FBQyxLQUFLLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDOUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDeEMsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7SUFDRixDQUFDO0lBRU8sc0JBQXNCLENBQzdCLE1BQWUsRUFDZixPQUFtQztRQUVuQyxNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsZ0JBQWdCLENBQUE7UUFFeEQsc0JBQXNCO1FBQ3RCLElBQUksZ0JBQWdCLFlBQVksVUFBVSxFQUFFLENBQUM7WUFDNUMsTUFBTSxNQUFNLEdBQUcsZ0JBQWdCLENBQUMsaUJBQWlCLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFBO1lBRWxFLElBQUksTUFBTSxFQUFFLENBQUM7Z0JBQ1osT0FBTyxNQUFNLENBQUE7WUFDZCxDQUFDO1FBQ0YsQ0FBQztRQUVELG1CQUFtQjtRQUNuQixPQUFPLG9CQUFvQixDQUFDLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxNQUFNLEVBQUU7WUFDOUQsR0FBRyxPQUFPO1lBQ1YsV0FBVyxFQUFFLElBQUksQ0FBQyw0QkFBNEI7U0FDOUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVTLDBCQUEwQjtRQUNuQyxJQUFJLENBQUMsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7WUFDaEMsT0FBTTtRQUNQLENBQUM7UUFFRCxJQUFJLENBQUMsd0JBQXdCLENBQUMsS0FBSyxFQUFFLENBQUE7UUFFckMsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsd0JBQXdCLENBQUMsQ0FBQTtRQUN2RixJQUFJLENBQUMsd0JBQXdCLENBQUMsR0FBRyxDQUNoQyxhQUFhLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQywwQkFBMEIsRUFBRSxDQUFDLENBQ2xFLENBQUE7UUFFRCxNQUFNLG9CQUFvQixHQUFHLGVBQWUsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQTtRQUN2RSxNQUFNLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDL0Usb0JBQW9CLENBQUMsVUFBVSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsRUFBRSxjQUFjLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQTtJQUNwRixDQUFDO0lBR08sbUNBQW1DO1FBQzFDLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsRUFBRSx1QkFBdUIsSUFBSSxJQUFJLENBQUMsaUJBQWlCLENBQUE7SUFDMUYsQ0FBQztJQUVTLHlCQUF5QjtRQUNsQyxJQUFJLENBQUMsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7WUFDaEMsT0FBTTtRQUNQLENBQUM7UUFFRCxNQUFNLG9CQUFvQixHQUFHLGVBQWUsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQTtRQUN2RSxvQkFBb0IsQ0FBQyxVQUFVLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFBO0lBQ3hDLENBQUM7SUFFUyxnQkFBZ0IsQ0FBQyxDQUFZLEVBQUUsT0FBb0I7UUFDNUQsSUFBSSxDQUFDLENBQUMsTUFBTSxLQUFLLE9BQU8sRUFBRSxDQUFDO1lBQzFCLE9BQU8sS0FBSyxDQUFBLENBQUMsMENBQTBDO1FBQ3hELENBQUM7UUFFRCxNQUFNLG9CQUFvQixHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUV6RCwrQkFBK0I7UUFDL0IsSUFBSSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQ3pCLENBQUMsSUFBSSw0QkFBNEIsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQ3JELDRCQUE0QixDQUFDLFNBQVMsQ0FDdEMsQ0FBQTtRQUNELElBQUksQ0FBQyxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ3BCLENBQUMsQ0FBQyxZQUFZLENBQUMsYUFBYSxHQUFHLFVBQVUsQ0FBQTtRQUMxQyxDQUFDO1FBRUQsaURBQWlEO1FBQ2pELElBQUksZUFBZSxHQUFHLEtBQUssQ0FBQTtRQUMzQixJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLFFBQVEsS0FBSyxVQUFVLEVBQUUsQ0FBQztZQUN6RCxlQUFlLEdBQUcsSUFBSSxDQUFDLDJCQUEyQixDQUNqRCxJQUFJLENBQUMsU0FBUyxDQUFDLFVBQVUsaUNBQXlCLEVBQ2xELENBQUMsRUFDRCxvQkFBb0IsQ0FDcEIsQ0FBQTtRQUNGLENBQUM7UUFFRCx3Q0FBd0M7YUFDbkMsQ0FBQztZQUNMLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxZQUFZLEVBQUUsQ0FBQztnQkFDakMsZUFBZSxHQUFHLElBQUksQ0FBQywyQkFBMkIsQ0FDakQsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxFQUM3QixDQUFDLEVBQ0Qsb0JBQW9CLENBQ3BCLENBQUE7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELDZEQUE2RDtRQUM3RCxJQUFJLENBQUMsZUFBZSxJQUFJLFNBQVMsRUFBRSxDQUFDO1lBQ25DLENBQUMsQ0FBQyxZQUFZLEVBQUUsT0FBTyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQTtRQUMxRSxDQUFDO1FBRUQsYUFBYTtRQUNiLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUNqQyxJQUFJLEtBQUssR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxPQUFPLEVBQUUsQ0FBQTtZQUNqRCxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLFFBQVEsS0FBSyxVQUFVLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQ3JGLEtBQUssR0FBRyxRQUFRLENBQUMsb0JBQW9CLEVBQUUsWUFBWSxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQTtZQUN0RixDQUFDO1lBRUQsY0FBYyxDQUFDLENBQUMsRUFBRSxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDbEMsQ0FBQztRQUVELE9BQU8sb0JBQW9CLENBQUE7SUFDNUIsQ0FBQztJQUVTLEtBQUssQ0FBQyxjQUFjLENBQzdCLENBQVksRUFDWixpQkFBd0MsRUFDeEMsT0FBb0IsRUFDcEIsb0JBQTZCO1FBRTdCLElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLDRCQUE0QixDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBRXBFLElBQUksQ0FBQyxDQUFDLE1BQU0sS0FBSyxPQUFPLElBQUksQ0FBQyxvQkFBb0IsSUFBSSxtQkFBbUIsRUFBRSxFQUFFLENBQUM7WUFDNUUsT0FBTSxDQUFDLHlDQUF5QztRQUNqRCxDQUFDO1FBRUQsTUFBTSxtQkFBbUIsR0FBRyxNQUFNLElBQUksQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDbkYsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUM7WUFDMUIsT0FBTTtRQUNQLENBQUM7UUFFRCxNQUFNLFdBQVcsR0FBRyxtQkFBbUIsQ0FBQyxXQUFXLENBQUE7UUFDbkQsSUFBSSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxXQUFXLENBQUMsRUFBRSxFQUFFO1lBQzFELElBQUksRUFBRSxJQUFJLENBQUMsZUFBZSxDQUFDLGlCQUFpQixJQUFJLENBQUMsRUFBRSxXQUFXLENBQUMsRUFBRSxDQUFDO2dCQUNqRSxDQUFDO2dCQUNELENBQUMsb0NBQTRCO1NBQzlCLENBQUMsQ0FBQTtRQUVGLFdBQVcsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtJQUNwQixDQUFDO0lBRVMsS0FBSyxDQUFDLGdDQUFnQyxDQUMvQyxDQUFZLEVBQ1osYUFBMEI7UUFFMUIsTUFBTSxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsR0FBRyxDQUFDLE1BQU0sSUFBSSxDQUFDLFdBQVcsQ0FBQyxvQkFBb0IsRUFBRSxDQUFDLElBQUk7WUFDN0UsS0FBSyxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxPQUFPLEVBQUU7U0FDckMsQ0FBQTtRQUNELE1BQU0sTUFBTSxHQUFHLGVBQWUsRUFBRSxDQUFBO1FBQ2hDLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxlQUFlLEtBQUssU0FBUyxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQztZQUNqRixJQUNDLEtBQUssQ0FBQyxDQUFDLElBQUksTUFBTSxDQUFDLE9BQU87Z0JBQ3pCLEtBQUssQ0FBQyxDQUFDLElBQUksTUFBTSxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUMsVUFBVTtnQkFDN0MsS0FBSyxDQUFDLENBQUMsSUFBSSxNQUFNLENBQUMsT0FBTztnQkFDekIsS0FBSyxDQUFDLENBQUMsSUFBSSxNQUFNLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQyxXQUFXLEVBQzdDLENBQUM7Z0JBQ0YsT0FBTSxDQUFDLHdIQUF3SDtZQUNoSSxDQUFDO1FBQ0YsQ0FBQztRQUVELE1BQU0sT0FBTyxHQUFHLGFBQWEsQ0FBQyxXQUFXLEdBQUcsQ0FBQyxDQUFBO1FBQzdDLE1BQU0sT0FBTyxHQUNaLEVBQUUsQ0FBQyx3REFBd0QsR0FBRyxhQUFhLENBQUMsWUFBWSxHQUFHLENBQUMsQ0FBQTtRQUU3RixNQUFNLE1BQU0sR0FBRztZQUNkLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQyxHQUFHLE9BQU87WUFDcEIsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDLEdBQUcsT0FBTztTQUNwQixDQUFBO1FBRUQsSUFBSSxPQUFPLEVBQUUsQ0FBQztZQUNiLElBQUksTUFBTSxDQUFDLENBQUMsR0FBRyxPQUFPLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQzFCLE1BQU0sQ0FBQyxDQUFDLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQSxDQUFDLCtCQUErQjtZQUNyRCxDQUFDO1lBRUQsSUFBSSxNQUFNLENBQUMsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxDQUFDLEVBQUUsQ0FBQztnQkFDMUIsTUFBTSxDQUFDLENBQUMsR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFBLENBQUMsOEJBQThCO1lBQ3BELENBQUM7UUFDRixDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFDLHlCQUF5QixDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQTtJQUNsRSxDQUFDO0lBRVMsb0JBQW9CLENBQUMsQ0FBWTtRQUMxQyxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLGdCQUFnQixFQUFFLENBQUM7WUFDbEQsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUE7UUFDakIsQ0FBQztRQUVELE9BQU8sQ0FBQyxDQUFDLE1BQU0sQ0FBQTtJQUNoQixDQUFDO0lBRVMsZUFBZSxDQUN4QixDQUFZLEVBQ1osV0FBNEIsRUFDNUIsWUFBMEI7UUFFMUIsSUFBSSxZQUFZLEVBQUUsYUFBYSwyQ0FBbUMsRUFBRSxDQUFDO1lBQ3BFLE9BQU8sSUFBSSxDQUFBLENBQUMsb0NBQW9DO1FBQ2pELENBQUM7UUFFRCxNQUFNLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxNQUFNLElBQUksV0FBVyxDQUFDLENBQUE7UUFFdkUsT0FBTyxDQUFDLE1BQU0sSUFBSSxXQUFXLEtBQUssSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUE7SUFDcEQsQ0FBQztJQUVTLDJCQUEyQixDQUNwQyxPQUErQixFQUMvQixDQUFZLEVBQ1osdUJBQWdDO1FBRWhDLElBQUksT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3BCLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQ3ZDLG1CQUFtQixFQUNuQixPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFDakUsQ0FBQyxFQUNELEVBQUUsdUJBQXVCLEVBQUUsQ0FDM0IsQ0FBQTtZQUVELE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQztRQUVELE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUVTLGdCQUFnQixDQUFDLE1BQW1CLEVBQUUsQ0FBUSxFQUFFLElBQWlCO1FBQzFFLDBFQUEwRTtRQUMxRSxJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FDdkIsc0JBQXNCLENBQUMsY0FBYyxDQUFDLE1BQU0sRUFBRTtZQUM3QyxpQkFBaUIsRUFBRSxnQkFBZ0IsQ0FBQyxPQUFPO1NBQzNDLENBQUMsQ0FDRixDQUFBO1FBQ0QsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO1FBQzdELElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtRQUM3RCxJQUFJLENBQUMsbUJBQW1CLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7UUFDM0QsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO1FBQzdELElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUNwRCxJQUFJLENBQUMsNEJBQTRCLENBQUMsR0FBRyxDQUNwQyxNQUFNLENBQUMsYUFBYSxrREFBeUMsQ0FDN0QsQ0FBQTtRQUNELElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLE1BQU0sS0FBSyxxQkFBcUIsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUM1RSx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsd0JBQXdCLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxDQUFBO1FBRTFGLHFCQUFxQjtRQUNyQixJQUFJLE1BQU0sR0FBcUMsSUFBSSxDQUFBO1FBQ25ELElBQUksWUFBWSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDckIsTUFBTSxHQUFHLElBQUksa0JBQWtCLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3BELENBQUM7UUFFRCxVQUFVO1FBQ1YsSUFBSSxDQUFDLGtCQUFrQixDQUFDLGVBQWUsQ0FBQztZQUN2QyxTQUFTLEVBQUUsR0FBRyxFQUFFLENBQUMsTUFBTTtZQUN2QixNQUFNLEVBQUUsTUFBTSxDQUFDLGtCQUFrQjtZQUNqQyxpQkFBaUIsRUFBRSxFQUFFLGlCQUFpQixFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLEVBQUUsRUFBRTtZQUMvRSxpQkFBaUIsRUFBRSxJQUFJLENBQUMsNEJBQTRCO1lBQ3BELGlCQUFpQixFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUM7Z0JBQ3pCLE9BQU8sRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUU7Z0JBQzFCLFdBQVcsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQzthQUNwRCxDQUFDO1lBQ0YsYUFBYSxFQUFFLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FDekIsSUFBSSxDQUFDLGlCQUFpQixDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLDRCQUE0QixDQUFDO1lBQ3RGLE1BQU0sRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsRUFBRSxnQ0FBZ0M7U0FDbkYsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVTLGFBQWEsQ0FBQyxNQUFlO1FBQ3RDLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFDLGdCQUFnQixDQUM3QyxNQUFNLENBQUMsRUFBRSxFQUNULElBQUksQ0FBQyxtQ0FBbUMsRUFBRSxDQUMxQyxDQUFBO0lBQ0YsQ0FBQztJQUVTLGtCQUFrQixDQUFDLE1BQWU7UUFDM0MsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUU3QyxPQUFPLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsUUFBUSxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQTtJQUNyRSxDQUFDO0lBRUQsSUFBYyxTQUFTO1FBQ3RCLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsU0FBUyxLQUFLLFNBQVM7WUFDekQsQ0FBQyxDQUFDLG1CQUFpQixDQUFDLGlCQUFpQixDQUFDLE1BQU07WUFDNUMsQ0FBQyxDQUFDLG1CQUFpQixDQUFDLGlCQUFpQixDQUFDLE9BQU8sQ0FBQTtJQUMvQyxDQUFDO0lBRVMsYUFBYSxDQUFDLE1BQW1CO1FBQzFDLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxRQUFRLHdCQUFnQixDQUFBO1FBQzdDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO1lBQ3RDLE9BQU87Z0JBQ04sUUFBUSxFQUFFLElBQUksY0FBYyxDQUFDLEVBQUUsRUFBRSxFQUFFLGlCQUFpQixFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLENBQUM7cUJBQzVFLFVBQVUsQ0FBQyxLQUFLLENBQUM7cUJBQ2pCLGNBQWMsQ0FDZCxtSUFBbUksQ0FDbkk7Z0JBQ0YsNEJBQTRCLEVBQUUsS0FBSyxHQUFHLFlBQVk7YUFDbEQsQ0FBQTtRQUNGLENBQUM7UUFDRCxPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFFUyxlQUFlO1FBQ3hCLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQywyQkFBMkIsRUFBRSxHQUFHLElBQUksQ0FBQyxTQUFTLElBQUksQ0FBQyxDQUFBO0lBQ2xGLENBQUM7SUFFRCxhQUFhLENBQUMsVUFBOEIsRUFBRSxVQUE4QjtRQUMzRSxvQkFBb0I7UUFDcEIsSUFBSSxVQUFVLENBQUMsU0FBUyxLQUFLLFVBQVUsQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNuRCxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUE7UUFDdkIsQ0FBQztRQUVELGdDQUFnQztRQUNoQyxJQUNDLFVBQVUsQ0FBQyxxQkFBcUIsS0FBSyxVQUFVLENBQUMscUJBQXFCO1lBQ3JFLFVBQVUsQ0FBQyxRQUFRLEtBQUssVUFBVSxDQUFDLFFBQVEsRUFDMUMsQ0FBQztZQUNGLElBQUksSUFBSSxDQUFDLDZCQUE2QixFQUFFLENBQUM7Z0JBQ3hDLElBQUksQ0FBQyxtQ0FBbUMsQ0FBQyxJQUFJLENBQUMsNkJBQTZCLENBQUMsQ0FBQTtnQkFDNUUsSUFBSSxDQUFDLDBCQUEwQixFQUFFLENBQUE7WUFDbEMsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDOztBQS9kb0IsaUJBQWlCO0lBdUNwQyxXQUFBLG1CQUFtQixDQUFBO0lBQ25CLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEsb0JBQW9CLENBQUE7SUFDcEIsWUFBQSxrQkFBa0IsQ0FBQTtJQUNsQixZQUFBLGFBQWEsQ0FBQTtJQUNiLFlBQUEsc0JBQXNCLENBQUE7SUFDdEIsWUFBQSxZQUFZLENBQUE7R0EvQ08saUJBQWlCLENBOGZ0QyJ9