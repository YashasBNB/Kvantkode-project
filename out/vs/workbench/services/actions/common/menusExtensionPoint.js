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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVudXNFeHRlbnNpb25Qb2ludC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9hY3Rpb25zL2NvbW1vbi9tZW51c0V4dGVuc2lvblBvaW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUN4RSxPQUFPLEtBQUssU0FBUyxNQUFNLHNDQUFzQyxDQUFBO0FBRWpFLE9BQU8sRUFHTixrQkFBa0IsR0FDbEIsTUFBTSwrQ0FBK0MsQ0FBQTtBQUN0RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDckYsT0FBTyxFQUNOLE1BQU0sRUFDTixZQUFZLEdBR1osTUFBTSxnREFBZ0QsQ0FBQTtBQUV2RCxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDekQsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFFNUUsT0FBTyxFQU1OLFVBQVUsSUFBSSwyQkFBMkIsR0FDekMsTUFBTSx1REFBdUQsQ0FBQTtBQUs5RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDM0UsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0NBQXdD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