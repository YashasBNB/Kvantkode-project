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
var MenuItemAction_1;
import { SubmenuAction } from '../../../base/common/actions.js';
import { MicrotaskEmitter } from '../../../base/common/event.js';
import { DisposableStore, dispose, markAsSingleton, toDisposable, } from '../../../base/common/lifecycle.js';
import { LinkedList } from '../../../base/common/linkedList.js';
import { ThemeIcon } from '../../../base/common/themables.js';
import { CommandsRegistry, ICommandService } from '../../commands/common/commands.js';
import { ContextKeyExpr, IContextKeyService, } from '../../contextkey/common/contextkey.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { KeybindingsRegistry, } from '../../keybinding/common/keybindingsRegistry.js';
export function isIMenuItem(item) {
    return item.command !== undefined;
}
export function isISubmenuItem(item) {
    return item.submenu !== undefined;
}
export class MenuId {
    static { this._instances = new Map(); }
    static { this.CommandPalette = new MenuId('CommandPalette'); }
    static { this.DebugBreakpointsContext = new MenuId('DebugBreakpointsContext'); }
    static { this.DebugCallStackContext = new MenuId('DebugCallStackContext'); }
    static { this.DebugConsoleContext = new MenuId('DebugConsoleContext'); }
    static { this.DebugVariablesContext = new MenuId('DebugVariablesContext'); }
    static { this.NotebookVariablesContext = new MenuId('NotebookVariablesContext'); }
    static { this.DebugHoverContext = new MenuId('DebugHoverContext'); }
    static { this.DebugWatchContext = new MenuId('DebugWatchContext'); }
    static { this.DebugToolBar = new MenuId('DebugToolBar'); }
    static { this.DebugToolBarStop = new MenuId('DebugToolBarStop'); }
    static { this.DebugCallStackToolbar = new MenuId('DebugCallStackToolbar'); }
    static { this.DebugCreateConfiguration = new MenuId('DebugCreateConfiguration'); }
    static { this.EditorContext = new MenuId('EditorContext'); }
    static { this.SimpleEditorContext = new MenuId('SimpleEditorContext'); }
    static { this.EditorContent = new MenuId('EditorContent'); }
    static { this.EditorLineNumberContext = new MenuId('EditorLineNumberContext'); }
    static { this.EditorContextCopy = new MenuId('EditorContextCopy'); }
    static { this.EditorContextPeek = new MenuId('EditorContextPeek'); }
    static { this.EditorContextShare = new MenuId('EditorContextShare'); }
    static { this.EditorTitle = new MenuId('EditorTitle'); }
    static { this.EditorTitleRun = new MenuId('EditorTitleRun'); }
    static { this.EditorTitleContext = new MenuId('EditorTitleContext'); }
    static { this.EditorTitleContextShare = new MenuId('EditorTitleContextShare'); }
    static { this.EmptyEditorGroup = new MenuId('EmptyEditorGroup'); }
    static { this.EmptyEditorGroupContext = new MenuId('EmptyEditorGroupContext'); }
    static { this.EditorTabsBarContext = new MenuId('EditorTabsBarContext'); }
    static { this.EditorTabsBarShowTabsSubmenu = new MenuId('EditorTabsBarShowTabsSubmenu'); }
    static { this.EditorTabsBarShowTabsZenModeSubmenu = new MenuId('EditorTabsBarShowTabsZenModeSubmenu'); }
    static { this.EditorActionsPositionSubmenu = new MenuId('EditorActionsPositionSubmenu'); }
    static { this.ExplorerContext = new MenuId('ExplorerContext'); }
    static { this.ExplorerContextShare = new MenuId('ExplorerContextShare'); }
    static { this.ExtensionContext = new MenuId('ExtensionContext'); }
    static { this.ExtensionEditorContextMenu = new MenuId('ExtensionEditorContextMenu'); }
    static { this.GlobalActivity = new MenuId('GlobalActivity'); }
    static { this.CommandCenter = new MenuId('CommandCenter'); }
    static { this.CommandCenterCenter = new MenuId('CommandCenterCenter'); }
    static { this.LayoutControlMenuSubmenu = new MenuId('LayoutControlMenuSubmenu'); }
    static { this.LayoutControlMenu = new MenuId('LayoutControlMenu'); }
    static { this.MenubarMainMenu = new MenuId('MenubarMainMenu'); }
    static { this.MenubarAppearanceMenu = new MenuId('MenubarAppearanceMenu'); }
    static { this.MenubarDebugMenu = new MenuId('MenubarDebugMenu'); }
    static { this.MenubarEditMenu = new MenuId('MenubarEditMenu'); }
    static { this.MenubarCopy = new MenuId('MenubarCopy'); }
    static { this.MenubarFileMenu = new MenuId('MenubarFileMenu'); }
    static { this.MenubarGoMenu = new MenuId('MenubarGoMenu'); }
    static { this.MenubarHelpMenu = new MenuId('MenubarHelpMenu'); }
    static { this.MenubarLayoutMenu = new MenuId('MenubarLayoutMenu'); }
    static { this.MenubarNewBreakpointMenu = new MenuId('MenubarNewBreakpointMenu'); }
    static { this.PanelAlignmentMenu = new MenuId('PanelAlignmentMenu'); }
    static { this.PanelPositionMenu = new MenuId('PanelPositionMenu'); }
    static { this.ActivityBarPositionMenu = new MenuId('ActivityBarPositionMenu'); }
    static { this.MenubarPreferencesMenu = new MenuId('MenubarPreferencesMenu'); }
    static { this.MenubarRecentMenu = new MenuId('MenubarRecentMenu'); }
    static { this.MenubarSelectionMenu = new MenuId('MenubarSelectionMenu'); }
    static { this.MenubarShare = new MenuId('MenubarShare'); }
    static { this.MenubarSwitchEditorMenu = new MenuId('MenubarSwitchEditorMenu'); }
    static { this.MenubarSwitchGroupMenu = new MenuId('MenubarSwitchGroupMenu'); }
    static { this.MenubarTerminalMenu = new MenuId('MenubarTerminalMenu'); }
    static { this.MenubarTerminalSuggestStatusMenu = new MenuId('MenubarTerminalSuggestStatusMenu'); }
    static { this.MenubarViewMenu = new MenuId('MenubarViewMenu'); }
    static { this.MenubarHomeMenu = new MenuId('MenubarHomeMenu'); }
    static { this.OpenEditorsContext = new MenuId('OpenEditorsContext'); }
    static { this.OpenEditorsContextShare = new MenuId('OpenEditorsContextShare'); }
    static { this.ProblemsPanelContext = new MenuId('ProblemsPanelContext'); }
    static { this.SCMInputBox = new MenuId('SCMInputBox'); }
    static { this.SCMChangeContext = new MenuId('SCMChangeContext'); }
    static { this.SCMResourceContext = new MenuId('SCMResourceContext'); }
    static { this.SCMResourceContextShare = new MenuId('SCMResourceContextShare'); }
    static { this.SCMResourceFolderContext = new MenuId('SCMResourceFolderContext'); }
    static { this.SCMResourceGroupContext = new MenuId('SCMResourceGroupContext'); }
    static { this.SCMSourceControl = new MenuId('SCMSourceControl'); }
    static { this.SCMSourceControlInline = new MenuId('SCMSourceControlInline'); }
    static { this.SCMSourceControlTitle = new MenuId('SCMSourceControlTitle'); }
    static { this.SCMHistoryTitle = new MenuId('SCMHistoryTitle'); }
    static { this.SCMHistoryItemContext = new MenuId('SCMHistoryItemContext'); }
    static { this.SCMHistoryItemHover = new MenuId('SCMHistoryItemHover'); }
    static { this.SCMHistoryItemRefContext = new MenuId('SCMHistoryItemRefContext'); }
    static { this.SCMTitle = new MenuId('SCMTitle'); }
    static { this.SearchContext = new MenuId('SearchContext'); }
    static { this.SearchActionMenu = new MenuId('SearchActionContext'); }
    static { this.StatusBarWindowIndicatorMenu = new MenuId('StatusBarWindowIndicatorMenu'); }
    static { this.StatusBarRemoteIndicatorMenu = new MenuId('StatusBarRemoteIndicatorMenu'); }
    static { this.StickyScrollContext = new MenuId('StickyScrollContext'); }
    static { this.TestItem = new MenuId('TestItem'); }
    static { this.TestItemGutter = new MenuId('TestItemGutter'); }
    static { this.TestProfilesContext = new MenuId('TestProfilesContext'); }
    static { this.TestMessageContext = new MenuId('TestMessageContext'); }
    static { this.TestMessageContent = new MenuId('TestMessageContent'); }
    static { this.TestPeekElement = new MenuId('TestPeekElement'); }
    static { this.TestPeekTitle = new MenuId('TestPeekTitle'); }
    static { this.TestCallStack = new MenuId('TestCallStack'); }
    static { this.TestCoverageFilterItem = new MenuId('TestCoverageFilterItem'); }
    static { this.TouchBarContext = new MenuId('TouchBarContext'); }
    static { this.TitleBar = new MenuId('TitleBar'); }
    static { this.TitleBarContext = new MenuId('TitleBarContext'); }
    static { this.TitleBarTitleContext = new MenuId('TitleBarTitleContext'); }
    static { this.TunnelContext = new MenuId('TunnelContext'); }
    static { this.TunnelPrivacy = new MenuId('TunnelPrivacy'); }
    static { this.TunnelProtocol = new MenuId('TunnelProtocol'); }
    static { this.TunnelPortInline = new MenuId('TunnelInline'); }
    static { this.TunnelTitle = new MenuId('TunnelTitle'); }
    static { this.TunnelLocalAddressInline = new MenuId('TunnelLocalAddressInline'); }
    static { this.TunnelOriginInline = new MenuId('TunnelOriginInline'); }
    static { this.ViewItemContext = new MenuId('ViewItemContext'); }
    static { this.ViewContainerTitle = new MenuId('ViewContainerTitle'); }
    static { this.ViewContainerTitleContext = new MenuId('ViewContainerTitleContext'); }
    static { this.ViewTitle = new MenuId('ViewTitle'); }
    static { this.ViewTitleContext = new MenuId('ViewTitleContext'); }
    static { this.CommentEditorActions = new MenuId('CommentEditorActions'); }
    static { this.CommentThreadTitle = new MenuId('CommentThreadTitle'); }
    static { this.CommentThreadActions = new MenuId('CommentThreadActions'); }
    static { this.CommentThreadAdditionalActions = new MenuId('CommentThreadAdditionalActions'); }
    static { this.CommentThreadTitleContext = new MenuId('CommentThreadTitleContext'); }
    static { this.CommentThreadCommentContext = new MenuId('CommentThreadCommentContext'); }
    static { this.CommentTitle = new MenuId('CommentTitle'); }
    static { this.CommentActions = new MenuId('CommentActions'); }
    static { this.CommentsViewThreadActions = new MenuId('CommentsViewThreadActions'); }
    static { this.InteractiveToolbar = new MenuId('InteractiveToolbar'); }
    static { this.InteractiveCellTitle = new MenuId('InteractiveCellTitle'); }
    static { this.InteractiveCellDelete = new MenuId('InteractiveCellDelete'); }
    static { this.InteractiveCellExecute = new MenuId('InteractiveCellExecute'); }
    static { this.InteractiveInputExecute = new MenuId('InteractiveInputExecute'); }
    static { this.InteractiveInputConfig = new MenuId('InteractiveInputConfig'); }
    static { this.ReplInputExecute = new MenuId('ReplInputExecute'); }
    static { this.IssueReporter = new MenuId('IssueReporter'); }
    static { this.NotebookToolbar = new MenuId('NotebookToolbar'); }
    static { this.NotebookToolbarContext = new MenuId('NotebookToolbarContext'); }
    static { this.NotebookStickyScrollContext = new MenuId('NotebookStickyScrollContext'); }
    static { this.NotebookCellTitle = new MenuId('NotebookCellTitle'); }
    static { this.NotebookCellDelete = new MenuId('NotebookCellDelete'); }
    static { this.NotebookCellInsert = new MenuId('NotebookCellInsert'); }
    static { this.NotebookCellBetween = new MenuId('NotebookCellBetween'); }
    static { this.NotebookCellListTop = new MenuId('NotebookCellTop'); }
    static { this.NotebookCellExecute = new MenuId('NotebookCellExecute'); }
    static { this.NotebookCellExecuteGoTo = new MenuId('NotebookCellExecuteGoTo'); }
    static { this.NotebookCellExecutePrimary = new MenuId('NotebookCellExecutePrimary'); }
    static { this.NotebookDiffCellInputTitle = new MenuId('NotebookDiffCellInputTitle'); }
    static { this.NotebookDiffDocumentMetadata = new MenuId('NotebookDiffDocumentMetadata'); }
    static { this.NotebookDiffCellMetadataTitle = new MenuId('NotebookDiffCellMetadataTitle'); }
    static { this.NotebookDiffCellOutputsTitle = new MenuId('NotebookDiffCellOutputsTitle'); }
    static { this.NotebookOutputToolbar = new MenuId('NotebookOutputToolbar'); }
    static { this.NotebookOutlineFilter = new MenuId('NotebookOutlineFilter'); }
    static { this.NotebookOutlineActionMenu = new MenuId('NotebookOutlineActionMenu'); }
    static { this.NotebookEditorLayoutConfigure = new MenuId('NotebookEditorLayoutConfigure'); }
    static { this.NotebookKernelSource = new MenuId('NotebookKernelSource'); }
    static { this.BulkEditTitle = new MenuId('BulkEditTitle'); }
    static { this.BulkEditContext = new MenuId('BulkEditContext'); }
    static { this.TimelineItemContext = new MenuId('TimelineItemContext'); }
    static { this.TimelineTitle = new MenuId('TimelineTitle'); }
    static { this.TimelineTitleContext = new MenuId('TimelineTitleContext'); }
    static { this.TimelineFilterSubMenu = new MenuId('TimelineFilterSubMenu'); }
    static { this.AccountsContext = new MenuId('AccountsContext'); }
    static { this.SidebarTitle = new MenuId('SidebarTitle'); }
    static { this.PanelTitle = new MenuId('PanelTitle'); }
    static { this.AuxiliaryBarTitle = new MenuId('AuxiliaryBarTitle'); }
    static { this.AuxiliaryBarHeader = new MenuId('AuxiliaryBarHeader'); }
    static { this.TerminalInstanceContext = new MenuId('TerminalInstanceContext'); }
    static { this.TerminalEditorInstanceContext = new MenuId('TerminalEditorInstanceContext'); }
    static { this.TerminalNewDropdownContext = new MenuId('TerminalNewDropdownContext'); }
    static { this.TerminalTabContext = new MenuId('TerminalTabContext'); }
    static { this.TerminalTabEmptyAreaContext = new MenuId('TerminalTabEmptyAreaContext'); }
    static { this.TerminalStickyScrollContext = new MenuId('TerminalStickyScrollContext'); }
    static { this.WebviewContext = new MenuId('WebviewContext'); }
    static { this.InlineCompletionsActions = new MenuId('InlineCompletionsActions'); }
    static { this.InlineEditsActions = new MenuId('InlineEditsActions'); }
    static { this.NewFile = new MenuId('NewFile'); }
    static { this.MergeInput1Toolbar = new MenuId('MergeToolbar1Toolbar'); }
    static { this.MergeInput2Toolbar = new MenuId('MergeToolbar2Toolbar'); }
    static { this.MergeBaseToolbar = new MenuId('MergeBaseToolbar'); }
    static { this.MergeInputResultToolbar = new MenuId('MergeToolbarResultToolbar'); }
    static { this.InlineSuggestionToolbar = new MenuId('InlineSuggestionToolbar'); }
    static { this.InlineEditToolbar = new MenuId('InlineEditToolbar'); }
    static { this.ChatContext = new MenuId('ChatContext'); }
    static { this.ChatCodeBlock = new MenuId('ChatCodeblock'); }
    static { this.ChatCompareBlock = new MenuId('ChatCompareBlock'); }
    static { this.ChatMessageTitle = new MenuId('ChatMessageTitle'); }
    static { this.ChatMessageFooter = new MenuId('ChatMessageFooter'); }
    static { this.ChatExecute = new MenuId('ChatExecute'); }
    static { this.ChatExecuteSecondary = new MenuId('ChatExecuteSecondary'); }
    static { this.ChatInput = new MenuId('ChatInput'); }
    static { this.ChatInputSide = new MenuId('ChatInputSide'); }
    static { this.ChatModelPicker = new MenuId('ChatModelPicker'); }
    static { this.ChatEditingWidgetToolbar = new MenuId('ChatEditingWidgetToolbar'); }
    static { this.ChatEditingEditorContent = new MenuId('ChatEditingEditorContent'); }
    static { this.ChatEditingEditorHunk = new MenuId('ChatEditingEditorHunk'); }
    static { this.ChatEditingDeletedNotebookCell = new MenuId('ChatEditingDeletedNotebookCell'); }
    static { this.ChatInputAttachmentToolbar = new MenuId('ChatInputAttachmentToolbar'); }
    static { this.ChatEditingWidgetModifiedFilesToolbar = new MenuId('ChatEditingWidgetModifiedFilesToolbar'); }
    static { this.ChatInputResourceAttachmentContext = new MenuId('ChatInputResourceAttachmentContext'); }
    static { this.ChatInputSymbolAttachmentContext = new MenuId('ChatInputSymbolAttachmentContext'); }
    static { this.ChatInlineResourceAnchorContext = new MenuId('ChatInlineResourceAnchorContext'); }
    static { this.ChatInlineSymbolAnchorContext = new MenuId('ChatInlineSymbolAnchorContext'); }
    static { this.ChatEditingCodeBlockContext = new MenuId('ChatEditingCodeBlockContext'); }
    static { this.ChatTitleBarMenu = new MenuId('ChatTitleBarMenu'); }
    static { this.ChatAttachmentsContext = new MenuId('ChatAttachmentsContext'); }
    static { this.AccessibleView = new MenuId('AccessibleView'); }
    static { this.MultiDiffEditorFileToolbar = new MenuId('MultiDiffEditorFileToolbar'); }
    static { this.DiffEditorHunkToolbar = new MenuId('DiffEditorHunkToolbar'); }
    static { this.DiffEditorSelectionToolbar = new MenuId('DiffEditorSelectionToolbar'); }
    /**
     * Create or reuse a `MenuId` with the given identifier
     */
    static for(identifier) {
        return MenuId._instances.get(identifier) ?? new MenuId(identifier);
    }
    /**
     * Create a new `MenuId` with the unique identifier. Will throw if a menu
     * with the identifier already exists, use `MenuId.for(ident)` or a unique
     * identifier
     */
    constructor(identifier) {
        if (MenuId._instances.has(identifier)) {
            throw new TypeError(`MenuId with identifier '${identifier}' already exists. Use MenuId.for(ident) or a unique identifier`);
        }
        MenuId._instances.set(identifier, this);
        this.id = identifier;
    }
}
export const IMenuService = createDecorator('menuService');
class MenuRegistryChangeEvent {
    static { this._all = new Map(); }
    static for(id) {
        let value = this._all.get(id);
        if (!value) {
            value = new MenuRegistryChangeEvent(id);
            this._all.set(id, value);
        }
        return value;
    }
    static merge(events) {
        const ids = new Set();
        for (const item of events) {
            if (item instanceof MenuRegistryChangeEvent) {
                ids.add(item.id);
            }
        }
        return ids;
    }
    constructor(id) {
        this.id = id;
        this.has = (candidate) => candidate === id;
    }
}
export const MenuRegistry = new (class {
    constructor() {
        this._commands = new Map();
        this._menuItems = new Map();
        this._onDidChangeMenu = new MicrotaskEmitter({
            merge: MenuRegistryChangeEvent.merge,
        });
        this.onDidChangeMenu = this._onDidChangeMenu.event;
    }
    addCommand(command) {
        this._commands.set(command.id, command);
        this._onDidChangeMenu.fire(MenuRegistryChangeEvent.for(MenuId.CommandPalette));
        return markAsSingleton(toDisposable(() => {
            if (this._commands.delete(command.id)) {
                this._onDidChangeMenu.fire(MenuRegistryChangeEvent.for(MenuId.CommandPalette));
            }
        }));
    }
    getCommand(id) {
        return this._commands.get(id);
    }
    getCommands() {
        const map = new Map();
        this._commands.forEach((value, key) => map.set(key, value));
        return map;
    }
    appendMenuItem(id, item) {
        let list = this._menuItems.get(id);
        if (!list) {
            list = new LinkedList();
            this._menuItems.set(id, list);
        }
        const rm = list.push(item);
        this._onDidChangeMenu.fire(MenuRegistryChangeEvent.for(id));
        return markAsSingleton(toDisposable(() => {
            rm();
            this._onDidChangeMenu.fire(MenuRegistryChangeEvent.for(id));
        }));
    }
    appendMenuItems(items) {
        const result = new DisposableStore();
        for (const { id, item } of items) {
            result.add(this.appendMenuItem(id, item));
        }
        return result;
    }
    getMenuItems(id) {
        let result;
        if (this._menuItems.has(id)) {
            result = [...this._menuItems.get(id)];
        }
        else {
            result = [];
        }
        if (id === MenuId.CommandPalette) {
            // CommandPalette is special because it shows
            // all commands by default
            this._appendImplicitItems(result);
        }
        return result;
    }
    _appendImplicitItems(result) {
        const set = new Set();
        for (const item of result) {
            if (isIMenuItem(item)) {
                set.add(item.command.id);
                if (item.alt) {
                    set.add(item.alt.id);
                }
            }
        }
        this._commands.forEach((command, id) => {
            if (!set.has(id)) {
                result.push({ command });
            }
        });
    }
})();
export class SubmenuItemAction extends SubmenuAction {
    constructor(item, hideActions, actions) {
        super(`submenuitem.${item.submenu.id}`, typeof item.title === 'string' ? item.title : item.title.value, actions, 'submenu');
        this.item = item;
        this.hideActions = hideActions;
    }
}
// implements IAction, does NOT extend Action, so that no one
// subscribes to events of Action or modified properties
let MenuItemAction = MenuItemAction_1 = class MenuItemAction {
    static label(action, options) {
        return options?.renderShortTitle && action.shortTitle
            ? typeof action.shortTitle === 'string'
                ? action.shortTitle
                : action.shortTitle.value
            : typeof action.title === 'string'
                ? action.title
                : action.title.value;
    }
    constructor(item, alt, options, hideActions, menuKeybinding, contextKeyService, _commandService) {
        this.hideActions = hideActions;
        this.menuKeybinding = menuKeybinding;
        this._commandService = _commandService;
        this.id = item.id;
        this.label = MenuItemAction_1.label(item, options);
        this.tooltip = (typeof item.tooltip === 'string' ? item.tooltip : item.tooltip?.value) ?? '';
        this.enabled = !item.precondition || contextKeyService.contextMatchesRules(item.precondition);
        this.checked = undefined;
        let icon;
        if (item.toggled) {
            const toggled = (item.toggled.condition
                ? item.toggled
                : { condition: item.toggled });
            this.checked = contextKeyService.contextMatchesRules(toggled.condition);
            if (this.checked && toggled.tooltip) {
                this.tooltip = typeof toggled.tooltip === 'string' ? toggled.tooltip : toggled.tooltip.value;
            }
            if (this.checked && ThemeIcon.isThemeIcon(toggled.icon)) {
                icon = toggled.icon;
            }
            if (this.checked && toggled.title) {
                this.label = typeof toggled.title === 'string' ? toggled.title : toggled.title.value;
            }
        }
        if (!icon) {
            icon = ThemeIcon.isThemeIcon(item.icon) ? item.icon : undefined;
        }
        this.item = item;
        this.alt = alt
            ? new MenuItemAction_1(alt, undefined, options, hideActions, undefined, contextKeyService, _commandService)
            : undefined;
        this._options = options;
        this.class = icon && ThemeIcon.asClassName(icon);
    }
    run(...args) {
        let runArgs = [];
        if (this._options?.arg) {
            runArgs = [...runArgs, this._options.arg];
        }
        if (this._options?.shouldForwardArgs) {
            runArgs = [...runArgs, ...args];
        }
        return this._commandService.executeCommand(this.id, ...runArgs);
    }
};
MenuItemAction = MenuItemAction_1 = __decorate([
    __param(5, IContextKeyService),
    __param(6, ICommandService)
], MenuItemAction);
export { MenuItemAction };
export class Action2 {
    constructor(desc) {
        this.desc = desc;
    }
}
export function registerAction2(ctor) {
    const disposables = []; // not using `DisposableStore` to reduce startup perf cost
    const action = new ctor();
    const { f1, menu, keybinding, ...command } = action.desc;
    if (CommandsRegistry.getCommand(command.id)) {
        throw new Error(`Cannot register two commands with the same id: ${command.id}`);
    }
    // command
    disposables.push(CommandsRegistry.registerCommand({
        id: command.id,
        handler: (accessor, ...args) => action.run(accessor, ...args),
        metadata: command.metadata ?? { description: action.desc.title },
    }));
    // menu
    if (Array.isArray(menu)) {
        for (const item of menu) {
            disposables.push(MenuRegistry.appendMenuItem(item.id, {
                command: {
                    ...command,
                    precondition: item.precondition === null ? undefined : command.precondition,
                },
                ...item,
            }));
        }
    }
    else if (menu) {
        disposables.push(MenuRegistry.appendMenuItem(menu.id, {
            command: {
                ...command,
                precondition: menu.precondition === null ? undefined : command.precondition,
            },
            ...menu,
        }));
    }
    if (f1) {
        disposables.push(MenuRegistry.appendMenuItem(MenuId.CommandPalette, { command, when: command.precondition }));
        disposables.push(MenuRegistry.addCommand(command));
    }
    // keybinding
    if (Array.isArray(keybinding)) {
        for (const item of keybinding) {
            disposables.push(KeybindingsRegistry.registerKeybindingRule({
                ...item,
                id: command.id,
                when: command.precondition
                    ? ContextKeyExpr.and(command.precondition, item.when)
                    : item.when,
            }));
        }
    }
    else if (keybinding) {
        disposables.push(KeybindingsRegistry.registerKeybindingRule({
            ...keybinding,
            id: command.id,
            when: command.precondition
                ? ContextKeyExpr.and(command.precondition, keybinding.when)
                : keybinding.when,
        }));
    }
    return {
        dispose() {
            dispose(disposables);
        },
    };
}
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2FjdGlvbnMvY29tbW9uL2FjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBVyxhQUFhLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN4RSxPQUFPLEVBQVMsZ0JBQWdCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUN2RSxPQUFPLEVBQ04sZUFBZSxFQUNmLE9BQU8sRUFFUCxlQUFlLEVBQ2YsWUFBWSxHQUNaLE1BQU0sbUNBQW1DLENBQUE7QUFDMUMsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQVE3RCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDckYsT0FBTyxFQUNOLGNBQWMsRUFFZCxrQkFBa0IsR0FDbEIsTUFBTSx1Q0FBdUMsQ0FBQTtBQUM5QyxPQUFPLEVBQUUsZUFBZSxFQUFvQixNQUFNLDZDQUE2QyxDQUFBO0FBQy9GLE9BQU8sRUFFTixtQkFBbUIsR0FDbkIsTUFBTSxnREFBZ0QsQ0FBQTtBQXlCdkQsTUFBTSxVQUFVLFdBQVcsQ0FBQyxJQUFTO0lBQ3BDLE9BQVEsSUFBa0IsQ0FBQyxPQUFPLEtBQUssU0FBUyxDQUFBO0FBQ2pELENBQUM7QUFFRCxNQUFNLFVBQVUsY0FBYyxDQUFDLElBQVM7SUFDdkMsT0FBUSxJQUFxQixDQUFDLE9BQU8sS0FBSyxTQUFTLENBQUE7QUFDcEQsQ0FBQztBQUVELE1BQU0sT0FBTyxNQUFNO2FBQ00sZUFBVSxHQUFHLElBQUksR0FBRyxFQUFrQixDQUFBO2FBRTlDLG1CQUFjLEdBQUcsSUFBSSxNQUFNLENBQUMsZ0JB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