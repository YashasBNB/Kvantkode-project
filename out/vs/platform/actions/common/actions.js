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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vYWN0aW9ucy9jb21tb24vYWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFXLGFBQWEsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3hFLE9BQU8sRUFBUyxnQkFBZ0IsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3ZFLE9BQU8sRUFDTixlQUFlLEVBQ2YsT0FBTyxFQUVQLGVBQWUsRUFDZixZQUFZLEdBQ1osTUFBTSxtQ0FBbUMsQ0FBQTtBQUMxQyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDL0QsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBUTdELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNyRixPQUFPLEVBQ04sY0FBYyxFQUVkLGtCQUFrQixHQUNsQixNQUFNLHVDQUF1QyxDQUFBO0FBQzlDLE9BQU8sRUFBRSxlQUFlLEVBQW9CLE1BQU0sNkNBQTZDLENBQUE7QUFDL0YsT0FBTyxFQUVOLG1CQUFtQixHQUNuQixNQUFNLGdEQUFnRCxDQUFBO0FBeUJ2RCxNQUFNLFVBQVUsV0FBVyxDQUFDLElBQVM7SUFDcEMsT0FBUSxJQUFrQixDQUFDLE9BQU8sS0FBSyxTQUFTLENBQUE7QUFDakQsQ0FBQztBQUVELE1BQU0sVUFBVSxjQUFjLENBQUMsSUFBUztJQUN2QyxPQUFRLElBQXFCLENBQUMsT0FBTyxLQUFLLFNBQVMsQ0FBQTtBQUNwRCxDQUFDO0FBRUQsTUFBTSxPQUFPLE1BQU07YUFDTSxlQUFVLEdBQUcsSUFBSSxHQUFHLEVBQWtCLENBQUE7YUFFOUMsbUJBQWMs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