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
import { localize } from '../../../../nls.js';
import { isFalsyOrWhitespace } from '../../../../base/common/strings.js';
import * as resources from '../../../../base/common/resources.js';
import { ExtensionsRegistry, } from '../../extensions/common/extensionsRegistry.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { MenuId, MenuRegistry, } from '../../../../platform/actions/common/actions.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { index } from '../../../../base/common/arrays.js';
import { isProposedApiEnabled } from '../../extensions/common/extensions.js';
import { Extensions as ExtensionFeaturesExtensions, } from '../../extensionManagement/common/extensionFeatures.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { platform } from '../../../../base/common/process.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
const apiMenus = [
    {
        key: 'commandPalette',
        id: MenuId.CommandPalette,
        description: localize('menus.commandPalette', 'The Command Palette'),
        supportsSubmenus: false,
    },
    {
        key: 'touchBar',
        id: MenuId.TouchBarContext,
        description: localize('menus.touchBar', 'The touch bar (macOS only)'),
        supportsSubmenus: false,
    },
    {
        key: 'editor/title',
        id: MenuId.EditorTitle,
        description: localize('menus.editorTitle', 'The editor title menu'),
    },
    {
        key: 'editor/title/run',
        id: MenuId.EditorTitleRun,
        description: localize('menus.editorTitleRun', 'Run submenu inside the editor title menu'),
    },
    {
        key: 'editor/context',
        id: MenuId.EditorContext,
        description: localize('menus.editorContext', 'The editor context menu'),
    },
    {
        key: 'editor/context/copy',
        id: MenuId.EditorContextCopy,
        description: localize('menus.editorContextCopyAs', "'Copy as' submenu in the editor context menu"),
    },
    {
        key: 'editor/context/share',
        id: MenuId.EditorContextShare,
        description: localize('menus.editorContextShare', "'Share' submenu in the editor context menu"),
        proposed: 'contribShareMenu',
    },
    {
        key: 'explorer/context',
        id: MenuId.ExplorerContext,
        description: localize('menus.explorerContext', 'The file explorer context menu'),
    },
    {
        key: 'explorer/context/share',
        id: MenuId.ExplorerContextShare,
        description: localize('menus.explorerContextShare', "'Share' submenu in the file explorer context menu"),
        proposed: 'contribShareMenu',
    },
    {
        key: 'editor/title/context',
        id: MenuId.EditorTitleContext,
        description: localize('menus.editorTabContext', 'The editor tabs context menu'),
    },
    {
        key: 'editor/title/context/share',
        id: MenuId.EditorTitleContextShare,
        description: localize('menus.editorTitleContextShare', "'Share' submenu inside the editor title context menu"),
        proposed: 'contribShareMenu',
    },
    {
        key: 'debug/callstack/context',
        id: MenuId.DebugCallStackContext,
        description: localize('menus.debugCallstackContext', 'The debug callstack view context menu'),
    },
    {
        key: 'debug/variables/context',
        id: MenuId.DebugVariablesContext,
        description: localize('menus.debugVariablesContext', 'The debug variables view context menu'),
    },
    {
        key: 'debug/toolBar',
        id: MenuId.DebugToolBar,
        description: localize('menus.debugToolBar', 'The debug toolbar menu'),
    },
    {
        key: 'debug/createConfiguration',
        id: MenuId.DebugCreateConfiguration,
        proposed: 'contribDebugCreateConfiguration',
        description: localize('menus.debugCreateConfiguation', 'The debug create configuration menu'),
    },
    {
        key: 'notebook/variables/context',
        id: MenuId.NotebookVariablesContext,
        description: localize('menus.notebookVariablesContext', 'The notebook variables view context menu'),
    },
    {
        key: 'menuBar/home',
        id: MenuId.MenubarHomeMenu,
        description: localize('menus.home', 'The home indicator context menu (web only)'),
        proposed: 'contribMenuBarHome',
        supportsSubmenus: false,
    },
    {
        key: 'menuBar/edit/copy',
        id: MenuId.MenubarCopy,
        description: localize('menus.opy', "'Copy as' submenu in the top level Edit menu"),
    },
    {
        key: 'scm/title',
        id: MenuId.SCMTitle,
        description: localize('menus.scmTitle', 'The Source Control title menu'),
    },
    {
        key: 'scm/sourceControl',
        id: MenuId.SCMSourceControl,
        description: localize('menus.scmSourceControl', 'The Source Control menu'),
    },
    {
        key: 'scm/sourceControl/title',
        id: MenuId.SCMSourceControlTitle,
        description: localize('menus.scmSourceControlTitle', 'The Source Control title menu'),
        proposed: 'contribSourceControlTitleMenu',
    },
    {
        key: 'scm/resourceState/context',
        id: MenuId.SCMResourceContext,
        description: localize('menus.resourceStateContext', 'The Source Control resource state context menu'),
    },
    {
        key: 'scm/resourceFolder/context',
        id: MenuId.SCMResourceFolderContext,
        description: localize('menus.resourceFolderContext', 'The Source Control resource folder context menu'),
    },
    {
        key: 'scm/resourceGroup/context',
        id: MenuId.SCMResourceGroupContext,
        description: localize('menus.resourceGroupContext', 'The Source Control resource group context menu'),
    },
    {
        key: 'scm/change/title',
        id: MenuId.SCMChangeContext,
        description: localize('menus.changeTitle', 'The Source Control inline change menu'),
    },
    {
        key: 'scm/inputBox',
        id: MenuId.SCMInputBox,
        description: localize('menus.input', 'The Source Control input box menu'),
        proposed: 'contribSourceControlInputBoxMenu',
    },
    {
        key: 'scm/history/title',
        id: MenuId.SCMHistoryTitle,
        description: localize('menus.scmHistoryTitle', 'The Source Control History title menu'),
        proposed: 'contribSourceControlHistoryTitleMenu',
    },
    {
        key: 'scm/historyItem/context',
        id: MenuId.SCMHistoryItemContext,
        description: localize('menus.historyItemContext', 'The Source Control history item context menu'),
        proposed: 'contribSourceControlHistoryItemMenu',
    },
    {
        key: 'scm/historyItem/hover',
        id: MenuId.SCMHistoryItemHover,
        description: localize('menus.historyItemHover', 'The Source Control history item hover menu'),
        proposed: 'contribSourceControlHistoryItemMenu',
    },
    {
        key: 'scm/historyItemRef/context',
        id: MenuId.SCMHistoryItemRefContext,
        description: localize('menus.historyItemRefContext', 'The Source Control history item reference context menu'),
        proposed: 'contribSourceControlHistoryItemMenu',
    },
    {
        key: 'statusBar/remoteIndicator',
        id: MenuId.StatusBarRemoteIndicatorMenu,
        description: localize('menus.statusBarRemoteIndicator', 'The remote indicator menu in the status bar'),
        supportsSubmenus: false,
    },
    {
        key: 'terminal/context',
        id: MenuId.TerminalInstanceContext,
        description: localize('menus.terminalContext', 'The terminal context menu'),
    },
    {
        key: 'terminal/title/context',
        id: MenuId.TerminalTabContext,
        description: localize('menus.terminalTabContext', 'The terminal tabs context menu'),
    },
    {
        key: 'view/title',
        id: MenuId.ViewTitle,
        description: localize('view.viewTitle', 'The contributed view title menu'),
    },
    {
        key: 'viewContainer/title',
        id: MenuId.ViewContainerTitle,
        description: localize('view.containerTitle', 'The contributed view container title menu'),
        proposed: 'contribViewContainerTitle',
    },
    {
        key: 'view/item/context',
        id: MenuId.ViewItemContext,
        description: localize('view.itemContext', 'The contributed view item context menu'),
    },
    {
        key: 'comments/comment/editorActions',
        id: MenuId.CommentEditorActions,
        description: localize('commentThread.editorActions', 'The contributed comment editor actions'),
        proposed: 'contribCommentEditorActionsMenu',
    },
    {
        key: 'comments/commentThread/title',
        id: MenuId.CommentThreadTitle,
        description: localize('commentThread.title', 'The contributed comment thread title menu'),
    },
    {
        key: 'comments/commentThread/context',
        id: MenuId.CommentThreadActions,
        description: localize('commentThread.actions', 'The contributed comment thread context menu, rendered as buttons below the comment editor'),
        supportsSubmenus: false,
    },
    {
        key: 'comments/commentThread/additionalActions',
        id: MenuId.CommentThreadAdditionalActions,
        description: localize('commentThread.actions', 'The contributed comment thread context menu, rendered as buttons below the comment editor'),
        supportsSubmenus: true,
        proposed: 'contribCommentThreadAdditionalMenu',
    },
    {
        key: 'comments/commentThread/title/context',
        id: MenuId.CommentThreadTitleContext,
        description: localize('commentThread.titleContext', "The contributed comment thread title's peek context menu, rendered as a right click menu on the comment thread's peek title."),
        proposed: 'contribCommentPeekContext',
    },
    {
        key: 'comments/comment/title',
        id: MenuId.CommentTitle,
        description: localize('comment.title', 'The contributed comment title menu'),
    },
    {
        key: 'comments/comment/context',
        id: MenuId.CommentActions,
        description: localize('comment.actions', 'The contributed comment context menu, rendered as buttons below the comment editor'),
        supportsSubmenus: false,
    },
    {
        key: 'comments/commentThread/comment/context',
        id: MenuId.CommentThreadCommentContext,
        description: localize('comment.commentContext', "The contributed comment context menu, rendered as a right click menu on the an individual comment in the comment thread's peek view."),
        proposed: 'contribCommentPeekContext',
    },
    {
        key: 'commentsView/commentThread/context',
        id: MenuId.CommentsViewThreadActions,
        description: localize('commentsView.threadActions', 'The contributed comment thread context menu in the comments view'),
        proposed: 'contribCommentsViewThreadMenus',
    },
    {
        key: 'notebook/toolbar',
        id: MenuId.NotebookToolbar,
        description: localize('notebook.toolbar', 'The contributed notebook toolbar menu'),
    },
    {
        key: 'notebook/kernelSource',
        id: MenuId.NotebookKernelSource,
        description: localize('notebook.kernelSource', 'The contributed notebook kernel sources menu'),
        proposed: 'notebookKernelSource',
    },
    {
        key: 'notebook/cell/title',
        id: MenuId.NotebookCellTitle,
        description: localize('notebook.cell.title', 'The contributed notebook cell title menu'),
    },
    {
        key: 'notebook/cell/execute',
        id: MenuId.NotebookCellExecute,
        description: localize('notebook.cell.execute', 'The contributed notebook cell execution menu'),
    },
    {
        key: 'interactive/toolbar',
        id: MenuId.InteractiveToolbar,
        description: localize('interactive.toolbar', 'The contributed interactive toolbar menu'),
    },
    {
        key: 'interactive/cell/title',
        id: MenuId.InteractiveCellTitle,
        description: localize('interactive.cell.title', 'The contributed interactive cell title menu'),
    },
    {
        key: 'issue/reporter',
        id: MenuId.IssueReporter,
        description: localize('issue.reporter', 'The contributed issue reporter menu'),
    },
    {
        key: 'testing/item/context',
        id: MenuId.TestItem,
        description: localize('testing.item.context', 'The contributed test item menu'),
    },
    {
        key: 'testing/item/gutter',
        id: MenuId.TestItemGutter,
        description: localize('testing.item.gutter.title', 'The menu for a gutter decoration for a test item'),
    },
    {
        key: 'testing/profiles/context',
        id: MenuId.TestProfilesContext,
        description: localize('testing.profiles.context.title', 'The menu for configuring testing profiles.'),
    },
    {
        key: 'testing/item/result',
        id: MenuId.TestPeekElement,
        description: localize('testing.item.result.title', 'The menu for an item in the Test Results view or peek.'),
    },
    {
        key: 'testing/message/context',
        id: MenuId.TestMessageContext,
        description: localize('testing.message.context.title', 'A prominent button overlaying editor content where the message is displayed'),
    },
    {
        key: 'testing/message/content',
        id: MenuId.TestMessageContent,
        description: localize('testing.message.content.title', 'Context menu for the message in the results tree'),
    },
    {
        key: 'extension/context',
        id: MenuId.ExtensionContext,
        description: localize('menus.extensionContext', 'The extension context menu'),
    },
    {
        key: 'timeline/title',
        id: MenuId.TimelineTitle,
        description: localize('view.timelineTitle', 'The Timeline view title menu'),
    },
    {
        key: 'timeline/item/context',
        id: MenuId.TimelineItemContext,
        description: localize('view.timelineContext', 'The Timeline view item context menu'),
    },
    {
        key: 'ports/item/context',
        id: MenuId.TunnelContext,
        description: localize('view.tunnelContext', 'The Ports view item context menu'),
    },
    {
        key: 'ports/item/origin/inline',
        id: MenuId.TunnelOriginInline,
        description: localize('view.tunnelOriginInline', 'The Ports view item origin inline menu'),
    },
    {
        key: 'ports/item/port/inline',
        id: MenuId.TunnelPortInline,
        description: localize('view.tunnelPortInline', 'The Ports view item port inline menu'),
    },
    {
        key: 'file/newFile',
        id: MenuId.NewFile,
        description: localize('file.newFile', "The 'New File...' quick pick, shown on welcome page and File menu."),
        supportsSubmenus: false,
    },
    {
        key: 'webview/context',
        id: MenuId.WebviewContext,
        description: localize('webview.context', 'The webview context menu'),
    },
    {
        key: 'file/share',
        id: MenuId.MenubarShare,
        description: localize('menus.share', 'Share submenu shown in the top level File menu.'),
        proposed: 'contribShareMenu',
    },
    {
        key: 'editor/inlineCompletions/actions',
        id: MenuId.InlineCompletionsActions,
        description: localize('inlineCompletions.actions', 'The actions shown when hovering on an inline completion'),
        supportsSubmenus: false,
        proposed: 'inlineCompletionsAdditions',
    },
    {
        key: 'editor/content',
        id: MenuId.EditorContent,
        description: localize('merge.toolbar', 'The prominent button in an editor, overlays its content'),
        proposed: 'contribEditorContentMenu',
    },
    {
        key: 'editor/lineNumber/context',
        id: MenuId.EditorLineNumberContext,
        description: localize('editorLineNumberContext', 'The contributed editor line number context menu'),
    },
    {
        key: 'mergeEditor/result/title',
        id: MenuId.MergeInputResultToolbar,
        description: localize('menus.mergeEditorResult', 'The result toolbar of the merge editor'),
        proposed: 'contribMergeEditorMenus',
    },
    {
        key: 'multiDiffEditor/resource/title',
        id: MenuId.MultiDiffEditorFileToolbar,
        description: localize('menus.multiDiffEditorResource', 'The resource toolbar in the multi diff editor'),
        proposed: 'contribMultiDiffEditorMenus',
    },
    {
        key: 'diffEditor/gutter/hunk',
        id: MenuId.DiffEditorHunkToolbar,
        description: localize('menus.diffEditorGutterToolBarMenus', 'The gutter toolbar in the diff editor'),
        proposed: 'contribDiffEditorGutterToolBarMenus',
    },
    {
        key: 'diffEditor/gutter/selection',
        id: MenuId.DiffEditorSelectionToolbar,
        description: localize('menus.diffEditorGutterToolBarMenus', 'The gutter toolbar in the diff editor'),
        proposed: 'contribDiffEditorGutterToolBarMenus',
    },
    {
        key: 'searchPanel/aiResults/commands',
        id: MenuId.SearchActionMenu,
        description: localize('searchPanel.aiResultsCommands', 'The commands that will contribute to the menu rendered as buttons next to the AI search title'),
    },
    {
        key: 'chat/modelPicker',
        id: MenuId.ChatModelPicker,
        description: localize('menus.chatModelPicker', 'The chat model picker dropdown menu'),
        supportsSubmenus: false,
        proposed: 'chatParticipantPrivate',
    },
];
var schema;
(function (schema) {
    // --- menus, submenus contribution point
    function isMenuItem(item) {
        return typeof item.command === 'string';
    }
    schema.isMenuItem = isMenuItem;
    function isValidMenuItem(item, collector) {
        if (typeof item.command !== 'string') {
            collector.error(localize('requirestring', 'property `{0}` is mandatory and must be of type `string`', 'command'));
            return false;
        }
        if (item.alt && typeof item.alt !== 'string') {
            collector.error(localize('optstring', 'property `{0}` can be omitted or must be of type `string`', 'alt'));
            return false;
        }
        if (item.when && typeof item.when !== 'string') {
            collector.error(localize('optstring', 'property `{0}` can be omitted or must be of type `string`', 'when'));
            return false;
        }
        if (item.group && typeof item.group !== 'string') {
            collector.error(localize('optstring', 'property `{0}` can be omitted or must be of type `string`', 'group'));
            return false;
        }
        return true;
    }
    schema.isValidMenuItem = isValidMenuItem;
    function isValidSubmenuItem(item, collector) {
        if (typeof item.submenu !== 'string') {
            collector.error(localize('requirestring', 'property `{0}` is mandatory and must be of type `string`', 'submenu'));
            return false;
        }
        if (item.when && typeof item.when !== 'string') {
            collector.error(localize('optstring', 'property `{0}` can be omitted or must be of type `string`', 'when'));
            return false;
        }
        if (item.group && typeof item.group !== 'string') {
            collector.error(localize('optstring', 'property `{0}` can be omitted or must be of type `string`', 'group'));
            return false;
        }
        return true;
    }
    schema.isValidSubmenuItem = isValidSubmenuItem;
    function isValidItems(items, collector) {
        if (!Array.isArray(items)) {
            collector.error(localize('requirearray', 'submenu items must be an array'));
            return false;
        }
        for (const item of items) {
            if (isMenuItem(item)) {
                if (!isValidMenuItem(item, collector)) {
                    return false;
                }
            }
            else {
                if (!isValidSubmenuItem(item, collector)) {
                    return false;
                }
            }
        }
        return true;
    }
    schema.isValidItems = isValidItems;
    function isValidSubmenu(submenu, collector) {
        if (typeof submenu !== 'object') {
            collector.error(localize('require', 'submenu items must be an object'));
            return false;
        }
        if (typeof submenu.id !== 'string') {
            collector.error(localize('requirestring', 'property `{0}` is mandatory and must be of type `string`', 'id'));
            return false;
        }
        if (typeof submenu.label !== 'string') {
            collector.error(localize('requirestring', 'property `{0}` is mandatory and must be of type `string`', 'label'));
            return false;
        }
        return true;
    }
    schema.isValidSubmenu = isValidSubmenu;
    const menuItem = {
        type: 'object',
        required: ['command'],
        properties: {
            command: {
                description: localize('vscode.extension.contributes.menuItem.command', "Identifier of the command to execute. The command must be declared in the 'commands'-section"),
                type: 'string',
            },
            alt: {
                description: localize('vscode.extension.contributes.menuItem.alt', "Identifier of an alternative command to execute. The command must be declared in the 'commands'-section"),
                type: 'string',
            },
            when: {
                description: localize('vscode.extension.contributes.menuItem.when', 'Condition which must be true to show this item'),
                type: 'string',
            },
            group: {
                description: localize('vscode.extension.contributes.menuItem.group', 'Group into which this item belongs'),
                type: 'string',
            },
        },
    };
    const submenuItem = {
        type: 'object',
        required: ['submenu'],
        properties: {
            submenu: {
                description: localize('vscode.extension.contributes.menuItem.submenu', 'Identifier of the submenu to display in this item.'),
                type: 'string',
            },
            when: {
                description: localize('vscode.extension.contributes.menuItem.when', 'Condition which must be true to show this item'),
                type: 'string',
            },
            group: {
                description: localize('vscode.extension.contributes.menuItem.group', 'Group into which this item belongs'),
                type: 'string',
            },
        },
    };
    const submenu = {
        type: 'object',
        required: ['id', 'label'],
        properties: {
            id: {
                description: localize('vscode.extension.contributes.submenu.id', 'Identifier of the menu to display as a submenu.'),
                type: 'string',
            },
            label: {
                description: localize('vscode.extension.contributes.submenu.label', 'The label of the menu item which leads to this submenu.'),
                type: 'string',
            },
            icon: {
                description: localize({
                    key: 'vscode.extension.contributes.submenu.icon',
                    comment: ['do not translate or change `\\$(zap)`, \\ in front of $ is important.'],
                }, '(Optional) Icon which is used to represent the submenu in the UI. Either a file path, an object with file paths for dark and light themes, or a theme icon references, like `\\$(zap)`'),
                anyOf: [
                    {
                        type: 'string',
                    },
                    {
                        type: 'object',
                        properties: {
                            light: {
                                description: localize('vscode.extension.contributes.submenu.icon.light', 'Icon path when a light theme is used'),
                                type: 'string',
                            },
                            dark: {
                                description: localize('vscode.extension.contributes.submenu.icon.dark', 'Icon path when a dark theme is used'),
                                type: 'string',
                            },
                        },
                    },
                ],
            },
        },
    };
    schema.menusContribution = {
        description: localize('vscode.extension.contributes.menus', 'Contributes menu items to the editor'),
        type: 'object',
        properties: index(apiMenus, (menu) => menu.key, (menu) => ({
            markdownDescription: menu.proposed
                ? localize('proposed', 'Proposed API, requires `enabledApiProposal: ["{0}"]` - {1}', menu.proposed, menu.description)
                : menu.description,
            type: 'array',
            items: menu.supportsSubmenus === false ? menuItem : { oneOf: [menuItem, submenuItem] },
        })),
        additionalProperties: {
            description: 'Submenu',
            type: 'array',
            items: { oneOf: [menuItem, submenuItem] },
        },
    };
    schema.submenusContribution = {
        description: localize('vscode.extension.contributes.submenus', 'Contributes submenu items to the editor'),
        type: 'array',
        items: submenu,
    };
    function isValidCommand(command, collector) {
        if (!command) {
            collector.error(localize('nonempty', 'expected non-empty value.'));
            return false;
        }
        if (isFalsyOrWhitespace(command.command)) {
            collector.error(localize('requirestring', 'property `{0}` is mandatory and must be of type `string`', 'command'));
            return false;
        }
        if (!isValidLocalizedString(command.title, collector, 'title')) {
            return false;
        }
        if (command.shortTitle &&
            !isValidLocalizedString(command.shortTitle, collector, 'shortTitle')) {
            return false;
        }
        if (command.enablement && typeof command.enablement !== 'string') {
            collector.error(localize('optstring', 'property `{0}` can be omitted or must be of type `string`', 'precondition'));
            return false;
        }
        if (command.category && !isValidLocalizedString(command.category, collector, 'category')) {
            return false;
        }
        if (!isValidIcon(command.icon, collector)) {
            return false;
        }
        return true;
    }
    schema.isValidCommand = isValidCommand;
    function isValidIcon(icon, collector) {
        if (typeof icon === 'undefined') {
            return true;
        }
        if (typeof icon === 'string') {
            return true;
        }
        else if (typeof icon.dark === 'string' && typeof icon.light === 'string') {
            return true;
        }
        collector.error(localize('opticon', 'property `icon` can be omitted or must be either a string or a literal like `{dark, light}`'));
        return false;
    }
    function isValidLocalizedString(localized, collector, propertyName) {
        if (typeof localized === 'undefined') {
            collector.error(localize('requireStringOrObject', 'property `{0}` is mandatory and must be of type `string` or `object`', propertyName));
            return false;
        }
        else if (typeof localized === 'string' && isFalsyOrWhitespace(localized)) {
            collector.error(localize('requirestring', 'property `{0}` is mandatory and must be of type `string`', propertyName));
            return false;
        }
        else if (typeof localized !== 'string' &&
            (isFalsyOrWhitespace(localized.original) || isFalsyOrWhitespace(localized.value))) {
            collector.error(localize('requirestrings', 'properties `{0}` and `{1}` are mandatory and must be of type `string`', `${propertyName}.value`, `${propertyName}.original`));
            return false;
        }
        return true;
    }
    const commandType = {
        type: 'object',
        required: ['command', 'title'],
        properties: {
            command: {
                description: localize('vscode.extension.contributes.commandType.command', 'Identifier of the command to execute'),
                type: 'string',
            },
            title: {
                description: localize('vscode.extension.contributes.commandType.title', 'Title by which the command is represented in the UI'),
                type: 'string',
            },
            shortTitle: {
                markdownDescription: localize('vscode.extension.contributes.commandType.shortTitle', '(Optional) Short title by which the command is represented in the UI. Menus pick either `title` or `shortTitle` depending on the context in which they show commands.'),
                type: 'string',
            },
            category: {
                description: localize('vscode.extension.contributes.commandType.category', '(Optional) Category string by which the command is grouped in the UI'),
                type: 'string',
            },
            enablement: {
                description: localize('vscode.extension.contributes.commandType.precondition', '(Optional) Condition which must be true to enable the command in the UI (menu and keybindings). Does not prevent executing the command by other means, like the `executeCommand`-api.'),
                type: 'string',
            },
            icon: {
                description: localize({
                    key: 'vscode.extension.contributes.commandType.icon',
                    comment: ['do not translate or change `\\$(zap)`, \\ in front of $ is important.'],
                }, '(Optional) Icon which is used to represent the command in the UI. Either a file path, an object with file paths for dark and light themes, or a theme icon references, like `\\$(zap)`'),
                anyOf: [
                    {
                        type: 'string',
                    },
                    {
                        type: 'object',
                        properties: {
                            light: {
                                description: localize('vscode.extension.contributes.commandType.icon.light', 'Icon path when a light theme is used'),
                                type: 'string',
                            },
                            dark: {
                                description: localize('vscode.extension.contributes.commandType.icon.dark', 'Icon path when a dark theme is used'),
                                type: 'string',
                            },
                        },
                    },
                ],
            },
        },
    };
    schema.commandsContribution = {
        description: localize('vscode.extension.contributes.commands', 'Contributes commands to the command palette.'),
        oneOf: [
            commandType,
            {
                type: 'array',
                items: commandType,
            },
        ],
    };
})(schema || (schema = {}));
const _commandRegistrations = new DisposableStore();
export const commandsExtensionPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'commands',
    jsonSchema: schema.commandsContribution,
    activationEventsGenerator: (contribs, result) => {
        for (const contrib of contribs) {
            if (contrib.command) {
                result.push(`onCommand:${contrib.command}`);
            }
        }
    },
});
commandsExtensionPoint.setHandler((extensions) => {
    function handleCommand(userFriendlyCommand, extension) {
        if (!schema.isValidCommand(userFriendlyCommand, extension.collector)) {
            return;
        }
        const { icon, enablement, category, title, shortTitle, command } = userFriendlyCommand;
        let absoluteIcon;
        if (icon) {
            if (typeof icon === 'string') {
                absoluteIcon = ThemeIcon.fromString(icon) ?? {
                    dark: resources.joinPath(extension.description.extensionLocation, icon),
                    light: resources.joinPath(extension.description.extensionLocation, icon),
                };
            }
            else {
                absoluteIcon = {
                    dark: resources.joinPath(extension.description.extensionLocation, icon.dark),
                    light: resources.joinPath(extension.description.extensionLocation, icon.light),
                };
            }
        }
        const existingCmd = MenuRegistry.getCommand(command);
        if (existingCmd) {
            if (existingCmd.source) {
                extension.collector.info(localize('dup1', 'Command `{0}` already registered by {1} ({2})', userFriendlyCommand.command, existingCmd.source.title, existingCmd.source.id));
            }
            else {
                extension.collector.info(localize('dup0', 'Command `{0}` already registered', userFriendlyCommand.command));
            }
        }
        _commandRegistrations.add(MenuRegistry.addCommand({
            id: command,
            title,
            source: {
                id: extension.description.identifier.value,
                title: extension.description.displayName ?? extension.description.name,
            },
            shortTitle,
            tooltip: title,
            category,
            precondition: ContextKeyExpr.deserialize(enablement),
            icon: absoluteIcon,
        }));
    }
    // remove all previous command registrations
    _commandRegistrations.clear();
    for (const extension of extensions) {
        const { value } = extension;
        if (Array.isArray(value)) {
            for (const command of value) {
                handleCommand(command, extension);
            }
        }
        else {
            handleCommand(value, extension);
        }
    }
});
const _submenus = new Map();
const submenusExtensionPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'submenus',
    jsonSchema: schema.submenusContribution,
});
submenusExtensionPoint.setHandler((extensions) => {
    _submenus.clear();
    for (const extension of extensions) {
        const { value, collector } = extension;
        for (const [, submenuInfo] of Object.entries(value)) {
            if (!schema.isValidSubmenu(submenuInfo, collector)) {
                continue;
            }
            if (!submenuInfo.id) {
                collector.warn(localize('submenuId.invalid.id', '`{0}` is not a valid submenu identifier', submenuInfo.id));
                continue;
            }
            if (_submenus.has(submenuInfo.id)) {
                collector.info(localize('submenuId.duplicate.id', 'The `{0}` submenu was already previously registered.', submenuInfo.id));
                continue;
            }
            if (!submenuInfo.label) {
                collector.warn(localize('submenuId.invalid.label', '`{0}` is not a valid submenu label', submenuInfo.label));
                continue;
            }
            let absoluteIcon;
            if (submenuInfo.icon) {
                if (typeof submenuInfo.icon === 'string') {
                    absoluteIcon = ThemeIcon.fromString(submenuInfo.icon) || {
                        dark: resources.joinPath(extension.description.extensionLocation, submenuInfo.icon),
                    };
                }
                else {
                    absoluteIcon = {
                        dark: resources.joinPath(extension.description.extensionLocation, submenuInfo.icon.dark),
                        light: resources.joinPath(extension.description.extensionLocation, submenuInfo.icon.light),
                    };
                }
            }
            const item = {
                id: MenuId.for(`api:${submenuInfo.id}`),
                label: submenuInfo.label,
                icon: absoluteIcon,
            };
            _submenus.set(submenuInfo.id, item);
        }
    }
});
const _apiMenusByKey = new Map(apiMenus.map((menu) => [menu.key, menu]));
const _menuRegistrations = new DisposableStore();
const _submenuMenuItems = new Map();
const menusExtensionPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'menus',
    jsonSchema: schema.menusContribution,
    deps: [submenusExtensionPoint],
});
menusExtensionPoint.setHandler((extensions) => {
    // remove all previous menu registrations
    _menuRegistrations.clear();
    _submenuMenuItems.clear();
    for (const extension of extensions) {
        const { value, collector } = extension;
        for (const entry of Object.entries(value)) {
            if (!schema.isValidItems(entry[1], collector)) {
                continue;
            }
            let menu = _apiMenusByKey.get(entry[0]);
            if (!menu) {
                const submenu = _submenus.get(entry[0]);
                if (submenu) {
                    menu = {
                        key: entry[0],
                        id: submenu.id,
                        description: '',
                    };
                }
            }
            if (!menu) {
                continue;
            }
            if (menu.proposed && !isProposedApiEnabled(extension.description, menu.proposed)) {
                collector.error(localize('proposedAPI.invalid', '{0} is a proposed menu identifier. It requires \'package.json#enabledApiProposals: ["{1}"]\' and is only available when running out of dev or with the following command line switch: --enable-proposed-api {2}', entry[0], menu.proposed, extension.description.identifier.value));
                continue;
            }
            for (const menuItem of entry[1]) {
                let item;
                if (schema.isMenuItem(menuItem)) {
                    const command = MenuRegistry.getCommand(menuItem.command);
                    const alt = (menuItem.alt && MenuRegistry.getCommand(menuItem.alt)) || undefined;
                    if (!command) {
                        collector.error(localize('missing.command', "Menu item references a command `{0}` which is not defined in the 'commands' section.", menuItem.command));
                        continue;
                    }
                    if (menuItem.alt && !alt) {
                        collector.warn(localize('missing.altCommand', "Menu item references an alt-command `{0}` which is not defined in the 'commands' section.", menuItem.alt));
                    }
                    if (menuItem.command === menuItem.alt) {
                        collector.info(localize('dupe.command', 'Menu item references the same command as default and alt-command'));
                    }
                    item = { command, alt, group: undefined, order: undefined, when: undefined };
                }
                else {
                    if (menu.supportsSubmenus === false) {
                        collector.error(localize('unsupported.submenureference', "Menu item references a submenu for a menu which doesn't have submenu support."));
                        continue;
                    }
                    const submenu = _submenus.get(menuItem.submenu);
                    if (!submenu) {
                        collector.error(localize('missing.submenu', "Menu item references a submenu `{0}` which is not defined in the 'submenus' section.", menuItem.submenu));
                        continue;
                    }
                    let submenuRegistrations = _submenuMenuItems.get(menu.id.id);
                    if (!submenuRegistrations) {
                        submenuRegistrations = new Set();
                        _submenuMenuItems.set(menu.id.id, submenuRegistrations);
                    }
                    if (submenuRegistrations.has(submenu.id.id)) {
                        collector.warn(localize('submenuItem.duplicate', 'The `{0}` submenu was already contributed to the `{1}` menu.', menuItem.submenu, entry[0]));
                        continue;
                    }
                    submenuRegistrations.add(submenu.id.id);
                    item = {
                        submenu: submenu.id,
                        icon: submenu.icon,
                        title: submenu.label,
                        group: undefined,
                        order: undefined,
                        when: undefined,
                    };
                }
                if (menuItem.group) {
                    const idx = menuItem.group.lastIndexOf('@');
                    if (idx > 0) {
                        item.group = menuItem.group.substr(0, idx);
                        item.order = Number(menuItem.group.substr(idx + 1)) || undefined;
                    }
                    else {
                        item.group = menuItem.group;
                    }
                }
                if (menu.id === MenuId.ViewContainerTitle &&
                    !menuItem.when?.includes('viewContainer == workbench.view.debug')) {
                    // Not a perfect check but enough to communicate that this proposed extension point is currently only for the debug view container
                    collector.error(localize('viewContainerTitle.when', 'The {0} menu contribution must check {1} in its {2} clause.', '`viewContainer/title`', '`viewContainer == workbench.view.debug`', '"when"'));
                    continue;
                }
                item.when = ContextKeyExpr.deserialize(menuItem.when);
                _menuRegistrations.add(MenuRegistry.appendMenuItem(menu.id, item));
            }
        }
    }
});
let CommandsTableRenderer = class CommandsTableRenderer extends Disposable {
    constructor(_keybindingService) {
        super();
        this._keybindingService = _keybindingService;
        this.type = 'table';
    }
    shouldRender(manifest) {
        return !!manifest.contributes?.commands;
    }
    render(manifest) {
        const rawCommands = manifest.contributes?.commands || [];
        const commands = rawCommands.map((c) => ({
            id: c.command,
            title: c.title,
            keybindings: [],
            menus: [],
        }));
        const byId = index(commands, (c) => c.id);
        const menus = manifest.contributes?.menus || {};
        // Add to commandPalette array any commands not explicitly contributed to it
        const implicitlyOnCommandPalette = index(commands, (c) => c.id);
        if (menus['commandPalette']) {
            for (const command of menus['commandPalette']) {
                delete implicitlyOnCommandPalette[command.command];
            }
        }
        if (Object.keys(implicitlyOnCommandPalette).length) {
            if (!menus['commandPalette']) {
                menus['commandPalette'] = [];
            }
            for (const command in implicitlyOnCommandPalette) {
                menus['commandPalette'].push({ command });
            }
        }
        for (const context in menus) {
            for (const menu of menus[context]) {
                // This typically happens for the commandPalette context
                if (menu.when === 'false') {
                    continue;
                }
                if (menu.command) {
                    let command = byId[menu.command];
                    if (command) {
                        if (!command.menus.includes(context)) {
                            command.menus.push(context);
                        }
                    }
                    else {
                        command = { id: menu.command, title: '', keybindings: [], menus: [context] };
                        byId[command.id] = command;
                        commands.push(command);
                    }
                }
            }
        }
        const rawKeybindings = manifest.contributes?.keybindings
            ? Array.isArray(manifest.contributes.keybindings)
                ? manifest.contributes.keybindings
                : [manifest.contributes.keybindings]
            : [];
        rawKeybindings.forEach((rawKeybinding) => {
            const keybinding = this.resolveKeybinding(rawKeybinding);
            if (!keybinding) {
                return;
            }
            let command = byId[rawKeybinding.command];
            if (command) {
                command.keybindings.push(keybinding);
            }
            else {
                command = { id: rawKeybinding.command, title: '', keybindings: [keybinding], menus: [] };
                byId[command.id] = command;
                commands.push(command);
            }
        });
        if (!commands.length) {
            return { data: { headers: [], rows: [] }, dispose: () => { } };
        }
        const headers = [
            localize('command name', 'ID'),
            localize('command title', 'Title'),
            localize('keyboard shortcuts', 'Keyboard Shortcuts'),
            localize('menuContexts', 'Menu Contexts'),
        ];
        const rows = commands
            .sort((a, b) => a.id.localeCompare(b.id))
            .map((command) => {
            return [
                new MarkdownString().appendMarkdown(`\`${command.id}\``),
                typeof command.title === 'string' ? command.title : command.title.value,
                command.keybindings,
                new MarkdownString().appendMarkdown(`${command.menus
                    .sort((a, b) => a.localeCompare(b))
                    .map((menu) => `\`${menu}\``)
                    .join('&nbsp;')}`),
            ];
        });
        return {
            data: {
                headers,
                rows,
            },
            dispose: () => { },
        };
    }
    resolveKeybinding(rawKeyBinding) {
        let key;
        switch (platform) {
            case 'win32':
                key = rawKeyBinding.win;
                break;
            case 'linux':
                key = rawKeyBinding.linux;
                break;
            case 'darwin':
                key = rawKeyBinding.mac;
                break;
        }
        return this._keybindingService.resolveUserBinding(key ?? rawKeyBinding.key)[0];
    }
};
CommandsTableRenderer = __decorate([
    __param(0, IKeybindingService)
], CommandsTableRenderer);
Registry.as(ExtensionFeaturesExtensions.ExtensionFeaturesRegistry).registerExtensionFeature({
    id: 'commands',
    label: localize('commands', 'Commands'),
    access: {
        canToggle: false,
    },
    renderer: new SyncDescriptor(CommandsTableRenderer),
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVudXNFeHRlbnNpb25Qb2ludC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2FjdGlvbnMvY29tbW9uL21lbnVzRXh0ZW5zaW9uUG9pbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ3hFLE9BQU8sS0FBSyxTQUFTLE1BQU0sc0NBQXNDLENBQUE7QUFFakUsT0FBTyxFQUdOLGtCQUFrQixHQUNsQixNQUFNLCtDQUErQyxDQUFBO0FBQ3RELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUNyRixPQUFPLEVBQ04sTUFBTSxFQUNOLFlBQVksR0FHWixNQUFNLGdEQUFnRCxDQUFBO0FBRXZELE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDbEYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUU1RSxPQUFPLEVBTU4sVUFBVSxJQUFJLDJCQUEyQixHQUN6QyxNQUFNLHVEQUF1RCxDQUFBO0FBSzlELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDekYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzdELE9BQU8sRUFB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