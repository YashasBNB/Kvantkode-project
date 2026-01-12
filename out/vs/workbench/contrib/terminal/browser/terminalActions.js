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
import { Action } from '../../../../base/common/actions.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { KeyChord } from '../../../../base/common/keyCodes.js';
import { Schemas } from '../../../../base/common/network.js';
import { isWindows } from '../../../../base/common/platform.js';
import { isObject, isString } from '../../../../base/common/types.js';
import { URI } from '../../../../base/common/uri.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { localize, localize2 } from '../../../../nls.js';
import { CONTEXT_ACCESSIBILITY_MODE_ENABLED } from '../../../../platform/accessibility/common/accessibility.js';
import { Action2, registerAction2, MenuId, } from '../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { IListService } from '../../../../platform/list/browser/listService.js';
import { INotificationService, Severity, } from '../../../../platform/notification/common/notification.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IQuickInputService, } from '../../../../platform/quickinput/common/quickInput.js';
import { TerminalExitReason, TerminalLocation, } from '../../../../platform/terminal/common/terminal.js';
import { IWorkspaceContextService, } from '../../../../platform/workspace/common/workspace.js';
import { PICK_WORKSPACE_FOLDER_COMMAND_ID } from '../../../browser/actions/workspaceCommands.js';
import { CLOSE_EDITOR_COMMAND_ID } from '../../../browser/parts/editor/editorCommands.js';
import { ITerminalConfigurationService, ITerminalEditorService, ITerminalGroupService, ITerminalInstanceService, ITerminalService, } from './terminal.js';
import { ITerminalProfileResolverService, ITerminalProfileService, TERMINAL_VIEW_ID, } from '../common/terminal.js';
import { TerminalContextKeys } from '../common/terminalContextKey.js';
import { createProfileSchemaEnums } from '../../../../platform/terminal/common/terminalProfiles.js';
import { terminalStrings } from '../common/terminalStrings.js';
import { IConfigurationResolverService } from '../../../services/configurationResolver/common/configurationResolver.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { IHistoryService } from '../../../services/history/common/history.js';
import { IPreferencesService } from '../../../services/preferences/common/preferences.js';
import { IRemoteAgentService } from '../../../services/remote/common/remoteAgentService.js';
import { SIDE_GROUP } from '../../../services/editor/common/editorService.js';
import { isAbsolute } from '../../../../base/common/path.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { getIconId, getColorClass, getUriClasses } from './terminalIcon.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { dirname } from '../../../../base/common/resources.js';
import { getIconClasses } from '../../../../editor/common/services/getIconClasses.js';
import { FileKind } from '../../../../platform/files/common/files.js';
import { killTerminalIcon, newTerminalIcon } from './terminalIcons.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { accessibleViewCurrentProviderId, accessibleViewIsShown, accessibleViewOnLastLine, } from '../../accessibility/browser/accessibilityConfiguration.js';
import { isKeyboardEvent, isMouseEvent, isPointerEvent } from '../../../../base/browser/dom.js';
import { editorGroupToColumn } from '../../../services/editor/common/editorGroupColumn.js';
import { InstanceContext } from './terminalContextMenu.js';
import { TerminalTabList } from './terminalTabsList.js';
import { ConfigurationResolverExpression } from '../../../services/configurationResolver/common/configurationResolverExpression.js';
export const switchTerminalActionViewItemSeparator = '\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500';
export const switchTerminalShowTabsTitle = localize('showTerminalTabs', 'Show Tabs');
const category = terminalStrings.actionCategory;
// Some terminal context keys get complicated. Since normalizing and/or context keys can be
// expensive this is done once per context key and shared.
const sharedWhenClause = (() => {
    const terminalAvailable = ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated);
    return {
        terminalAvailable,
        terminalAvailable_and_opened: ContextKeyExpr.and(terminalAvailable, TerminalContextKeys.isOpen),
        terminalAvailable_and_editorActive: ContextKeyExpr.and(terminalAvailable, TerminalContextKeys.terminalEditorActive),
        terminalAvailable_and_singularSelection: ContextKeyExpr.and(terminalAvailable, TerminalContextKeys.tabsSingularSelection),
        focusInAny_and_normalBuffer: ContextKeyExpr.and(TerminalContextKeys.focusInAny, TerminalContextKeys.altBufferActive.negate()),
    };
})();
export async function getCwdForSplit(instance, folders, commandService, configService) {
    switch (configService.config.splitCwd) {
        case 'workspaceRoot':
            if (folders !== undefined && commandService !== undefined) {
                if (folders.length === 1) {
                    return folders[0].uri;
                }
                else if (folders.length > 1) {
                    // Only choose a path when there's more than 1 folder
                    const options = {
                        placeHolder: localize('workbench.action.terminal.newWorkspacePlaceholder', 'Select current working directory for new terminal'),
                    };
                    const workspace = await commandService.executeCommand(PICK_WORKSPACE_FOLDER_COMMAND_ID, [
                        options,
                    ]);
                    if (!workspace) {
                        // Don't split the instance if the workspace picker was canceled
                        return undefined;
                    }
                    return Promise.resolve(workspace.uri);
                }
            }
            return '';
        case 'initial':
            return instance.getInitialCwd();
        case 'inherited':
            return instance.getCwd();
    }
}
export const terminalSendSequenceCommand = async (accessor, args) => {
    const instance = accessor.get(ITerminalService).activeInstance;
    if (instance) {
        const text = isObject(args) && 'text' in args ? toOptionalString(args.text) : undefined;
        if (!text) {
            return;
        }
        const configurationResolverService = accessor.get(IConfigurationResolverService);
        const workspaceContextService = accessor.get(IWorkspaceContextService);
        const historyService = accessor.get(IHistoryService);
        const activeWorkspaceRootUri = historyService.getLastActiveWorkspaceRoot(instance.isRemote ? Schemas.vscodeRemote : Schemas.file);
        const lastActiveWorkspaceRoot = activeWorkspaceRootUri
            ? (workspaceContextService.getWorkspaceFolder(activeWorkspaceRootUri) ?? undefined)
            : undefined;
        const resolvedText = await configurationResolverService.resolveAsync(lastActiveWorkspaceRoot, text);
        instance.sendText(resolvedText, false);
    }
};
let TerminalLaunchHelpAction = class TerminalLaunchHelpAction extends Action {
    constructor(_openerService) {
        super('workbench.action.terminal.launchHelp', localize('terminalLaunchHelp', 'Open Help'));
        this._openerService = _openerService;
    }
    async run() {
        this._openerService.open('https://aka.ms/vscode-troubleshoot-terminal-launch');
    }
};
TerminalLaunchHelpAction = __decorate([
    __param(0, IOpenerService)
], TerminalLaunchHelpAction);
export { TerminalLaunchHelpAction };
/**
 * A wrapper function around registerAction2 to help make registering terminal actions more concise.
 * The following default options are used if undefined:
 *
 * - `f1`: true
 * - `category`: Terminal
 * - `precondition`: TerminalContextKeys.processSupported
 */
export function registerTerminalAction(options) {
    // Set defaults
    options.f1 = options.f1 ?? true;
    options.category = options.category ?? category;
    options.precondition = options.precondition ?? TerminalContextKeys.processSupported;
    // Remove run function from options so it's not passed through to registerAction2
    const runFunc = options.run;
    const strictOptions = options;
    delete strictOptions['run'];
    // Register
    return registerAction2(class extends Action2 {
        constructor() {
            super(strictOptions);
        }
        run(accessor, args, args2) {
            return runFunc(getTerminalServices(accessor), accessor, args, args2);
        }
    });
}
function parseActionArgs(args) {
    if (Array.isArray(args)) {
        if (args.every((e) => e instanceof InstanceContext)) {
            return args;
        }
    }
    else if (args instanceof InstanceContext) {
        return [args];
    }
    return undefined;
}
/**
 * A wrapper around {@link registerTerminalAction} that runs a callback for all currently selected
 * instances provided in the action context. This falls back to the active instance if there are no
 * contextual instances provided.
 */
export function registerContextualInstanceAction(options) {
    const originalRun = options.run;
    return registerTerminalAction({
        ...options,
        run: async (c, accessor, focusedInstanceArgs, allInstanceArgs) => {
            let instances = getSelectedInstances2(accessor, allInstanceArgs);
            if (!instances) {
                const activeInstance = (options.activeInstanceType === 'view'
                    ? c.groupService
                    : options.activeInstanceType === 'editor'
                        ? c.editorService
                        : c.service).activeInstance;
                if (!activeInstance) {
                    return;
                }
                instances = [activeInstance];
            }
            const results = [];
            for (const instance of instances) {
                results.push(originalRun(instance, c, accessor, focusedInstanceArgs));
            }
            await Promise.all(results);
            if (options.runAfter) {
                options.runAfter(instances, c, accessor, focusedInstanceArgs);
            }
        },
    });
}
/**
 * A wrapper around {@link registerTerminalAction} that ensures an active instance exists and
 * provides it to the run function.
 */
export function registerActiveInstanceAction(options) {
    const originalRun = options.run;
    return registerTerminalAction({
        ...options,
        run: (c, accessor, args) => {
            const activeInstance = c.service.activeInstance;
            if (activeInstance) {
                return originalRun(activeInstance, c, accessor, args);
            }
        },
    });
}
/**
 * A wrapper around {@link registerTerminalAction} that ensures an active terminal
 * exists and provides it to the run function.
 *
 * This includes detached xterm terminals that are not managed by an {@link ITerminalInstance}.
 */
export function registerActiveXtermAction(options) {
    const originalRun = options.run;
    return registerTerminalAction({
        ...options,
        run: (c, accessor, args) => {
            const activeDetached = Iterable.find(c.service.detachedInstances, (d) => d.xterm.isFocused);
            if (activeDetached) {
                return originalRun(activeDetached.xterm, accessor, activeDetached, args);
            }
            const activeInstance = c.service.activeInstance;
            if (activeInstance?.xterm) {
                return originalRun(activeInstance.xterm, accessor, activeInstance, args);
            }
        },
    });
}
function getTerminalServices(accessor) {
    return {
        service: accessor.get(ITerminalService),
        configService: accessor.get(ITerminalConfigurationService),
        groupService: accessor.get(ITerminalGroupService),
        instanceService: accessor.get(ITerminalInstanceService),
        editorService: accessor.get(ITerminalEditorService),
        profileService: accessor.get(ITerminalProfileService),
        profileResolverService: accessor.get(ITerminalProfileResolverService),
    };
}
export function registerTerminalActions() {
    registerTerminalAction({
        id: "workbench.action.terminal.newInActiveWorkspace" /* TerminalCommandId.NewInActiveWorkspace */,
        title: localize2('workbench.action.terminal.newInActiveWorkspace', 'Create New Terminal (In Active Workspace)'),
        run: async (c) => {
            if (c.service.isProcessSupportRegistered) {
                const instance = await c.service.createTerminal({ location: c.service.defaultLocation });
                if (!instance) {
                    return;
                }
                c.service.setActiveInstance(instance);
                await focusActiveTerminal(instance, c);
            }
        },
    });
    // Register new with profile command
    refreshTerminalActions([]);
    registerTerminalAction({
        id: "workbench.action.createTerminalEditor" /* TerminalCommandId.CreateTerminalEditor */,
        title: localize2('workbench.action.terminal.createTerminalEditor', 'Create New Terminal in Editor Area'),
        run: async (c, _, args) => {
            const options = isObject(args) && 'location' in args
                ? args
                : { location: TerminalLocation.Editor };
            const instance = await c.service.createTerminal(options);
            await instance.focusWhenReady();
        },
    });
    registerTerminalAction({
        id: "workbench.action.createTerminalEditorSameGroup" /* TerminalCommandId.CreateTerminalEditorSameGroup */,
        title: localize2('workbench.action.terminal.createTerminalEditor', 'Create New Terminal in Editor Area'),
        f1: false,
        run: async (c, accessor, args) => {
            // Force the editor into the same editor group if it's locked. This command is only ever
            // called when a terminal is the active editor
            const editorGroupsService = accessor.get(IEditorGroupsService);
            const instance = await c.service.createTerminal({
                location: {
                    viewColumn: editorGroupToColumn(editorGroupsService, editorGroupsService.activeGroup),
                },
            });
            await instance.focusWhenReady();
        },
    });
    registerTerminalAction({
        id: "workbench.action.createTerminalEditorSide" /* TerminalCommandId.CreateTerminalEditorSide */,
        title: localize2('workbench.action.terminal.createTerminalEditorSide', 'Create New Terminal in Editor Area to the Side'),
        run: async (c) => {
            const instance = await c.service.createTerminal({
                location: { viewColumn: SIDE_GROUP },
            });
            await instance.focusWhenReady();
        },
    });
    registerContextualInstanceAction({
        id: "workbench.action.terminal.moveToEditor" /* TerminalCommandId.MoveToEditor */,
        title: terminalStrings.moveToEditor,
        precondition: sharedWhenClause.terminalAvailable_and_opened,
        activeInstanceType: 'view',
        run: (instance, c) => c.service.moveToEditor(instance),
        runAfter: (instances) => instances.at(-1)?.focus(),
    });
    registerContextualInstanceAction({
        id: "workbench.action.terminal.moveIntoNewWindow" /* TerminalCommandId.MoveIntoNewWindow */,
        title: terminalStrings.moveIntoNewWindow,
        precondition: sharedWhenClause.terminalAvailable_and_opened,
        run: (instance, c) => c.service.moveIntoNewEditor(instance),
        runAfter: (instances) => instances.at(-1)?.focus(),
    });
    registerTerminalAction({
        id: "workbench.action.terminal.moveToTerminalPanel" /* TerminalCommandId.MoveToTerminalPanel */,
        title: terminalStrings.moveToTerminalPanel,
        precondition: sharedWhenClause.terminalAvailable_and_editorActive,
        run: (c, _, args) => {
            const source = toOptionalUri(args) ?? c.editorService.activeInstance;
            if (source) {
                c.service.moveToTerminalView(source);
            }
        },
    });
    registerTerminalAction({
        id: "workbench.action.terminal.focusPreviousPane" /* TerminalCommandId.FocusPreviousPane */,
        title: localize2('workbench.action.terminal.focusPreviousPane', 'Focus Previous Terminal in Terminal Group'),
        keybinding: {
            primary: 512 /* KeyMod.Alt */ | 15 /* KeyCode.LeftArrow */,
            secondary: [512 /* KeyMod.Alt */ | 16 /* KeyCode.UpArrow */],
            mac: {
                primary: 512 /* KeyMod.Alt */ | 2048 /* KeyMod.CtrlCmd */ | 15 /* KeyCode.LeftArrow */,
                secondary: [512 /* KeyMod.Alt */ | 2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */],
            },
            when: TerminalContextKeys.focus,
            weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        },
        precondition: sharedWhenClause.terminalAvailable,
        run: async (c) => {
            c.groupService.activeGroup?.focusPreviousPane();
            await c.groupService.showPanel(true);
        },
    });
    registerTerminalAction({
        id: "workbench.action.terminal.focusNextPane" /* TerminalCommandId.FocusNextPane */,
        title: localize2('workbench.action.terminal.focusNextPane', 'Focus Next Terminal in Terminal Group'),
        keybinding: {
            primary: 512 /* KeyMod.Alt */ | 17 /* KeyCode.RightArrow */,
            secondary: [512 /* KeyMod.Alt */ | 18 /* KeyCode.DownArrow */],
            mac: {
                primary: 512 /* KeyMod.Alt */ | 2048 /* KeyMod.CtrlCmd */ | 17 /* KeyCode.RightArrow */,
                secondary: [512 /* KeyMod.Alt */ | 2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */],
            },
            when: TerminalContextKeys.focus,
            weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        },
        precondition: sharedWhenClause.terminalAvailable,
        run: async (c) => {
            c.groupService.activeGroup?.focusNextPane();
            await c.groupService.showPanel(true);
        },
    });
    registerTerminalAction({
        id: "workbench.action.terminal.resizePaneLeft" /* TerminalCommandId.ResizePaneLeft */,
        title: localize2('workbench.action.terminal.resizePaneLeft', 'Resize Terminal Left'),
        keybinding: {
            linux: { primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 15 /* KeyCode.LeftArrow */ },
            mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 256 /* KeyMod.WinCtrl */ | 15 /* KeyCode.LeftArrow */ },
            when: TerminalContextKeys.focus,
            weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        },
        precondition: sharedWhenClause.terminalAvailable,
        run: (c) => c.groupService.activeGroup?.resizePane(0 /* Direction.Left */),
    });
    registerTerminalAction({
        id: "workbench.action.terminal.resizePaneRight" /* TerminalCommandId.ResizePaneRight */,
        title: localize2('workbench.action.terminal.resizePaneRight', 'Resize Terminal Right'),
        keybinding: {
            linux: { primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 17 /* KeyCode.RightArrow */ },
            mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 256 /* KeyMod.WinCtrl */ | 17 /* KeyCode.RightArrow */ },
            when: TerminalContextKeys.focus,
            weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        },
        precondition: sharedWhenClause.terminalAvailable,
        run: (c) => c.groupService.activeGroup?.resizePane(1 /* Direction.Right */),
    });
    registerTerminalAction({
        id: "workbench.action.terminal.resizePaneUp" /* TerminalCommandId.ResizePaneUp */,
        title: localize2('workbench.action.terminal.resizePaneUp', 'Resize Terminal Up'),
        keybinding: {
            mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 256 /* KeyMod.WinCtrl */ | 16 /* KeyCode.UpArrow */ },
            when: TerminalContextKeys.focus,
            weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        },
        precondition: sharedWhenClause.terminalAvailable,
        run: (c) => c.groupService.activeGroup?.resizePane(2 /* Direction.Up */),
    });
    registerTerminalAction({
        id: "workbench.action.terminal.resizePaneDown" /* TerminalCommandId.ResizePaneDown */,
        title: localize2('workbench.action.terminal.resizePaneDown', 'Resize Terminal Down'),
        keybinding: {
            mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 256 /* KeyMod.WinCtrl */ | 18 /* KeyCode.DownArrow */ },
            when: TerminalContextKeys.focus,
            weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        },
        precondition: sharedWhenClause.terminalAvailable,
        run: (c) => c.groupService.activeGroup?.resizePane(3 /* Direction.Down */),
    });
    registerTerminalAction({
        id: "workbench.action.terminal.focus" /* TerminalCommandId.Focus */,
        title: terminalStrings.focus,
        keybinding: {
            when: ContextKeyExpr.and(CONTEXT_ACCESSIBILITY_MODE_ENABLED, accessibleViewOnLastLine, accessibleViewCurrentProviderId.isEqualTo("terminal" /* AccessibleViewProviderId.Terminal */)),
            primary: 2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */,
            weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        },
        precondition: sharedWhenClause.terminalAvailable,
        run: async (c) => {
            const instance = c.service.activeInstance ||
                (await c.service.createTerminal({ location: TerminalLocation.Panel }));
            if (!instance) {
                return;
            }
            c.service.setActiveInstance(instance);
            focusActiveTerminal(instance, c);
        },
    });
    registerTerminalAction({
        id: "workbench.action.terminal.focusTabs" /* TerminalCommandId.FocusTabs */,
        title: localize2('workbench.action.terminal.focus.tabsView', 'Focus Terminal Tabs View'),
        keybinding: {
            primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 93 /* KeyCode.Backslash */,
            weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            when: ContextKeyExpr.or(TerminalContextKeys.tabsFocus, TerminalContextKeys.focus),
        },
        precondition: sharedWhenClause.terminalAvailable,
        run: (c) => c.groupService.focusTabs(),
    });
    registerTerminalAction({
        id: "workbench.action.terminal.focusNext" /* TerminalCommandId.FocusNext */,
        title: localize2('workbench.action.terminal.focusNext', 'Focus Next Terminal Group'),
        precondition: sharedWhenClause.terminalAvailable,
        keybinding: {
            primary: 2048 /* KeyMod.CtrlCmd */ | 12 /* KeyCode.PageDown */,
            mac: {
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 94 /* KeyCode.BracketRight */,
            },
            when: ContextKeyExpr.and(TerminalContextKeys.focus, TerminalContextKeys.editorFocus.negate()),
            weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        },
        run: async (c) => {
            c.groupService.setActiveGroupToNext();
            await c.groupService.showPanel(true);
        },
    });
    registerTerminalAction({
        id: "workbench.action.terminal.focusPrevious" /* TerminalCommandId.FocusPrevious */,
        title: localize2('workbench.action.terminal.focusPrevious', 'Focus Previous Terminal Group'),
        precondition: sharedWhenClause.terminalAvailable,
        keybinding: {
            primary: 2048 /* KeyMod.CtrlCmd */ | 11 /* KeyCode.PageUp */,
            mac: {
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 92 /* KeyCode.BracketLeft */,
            },
            when: ContextKeyExpr.and(TerminalContextKeys.focus, TerminalContextKeys.editorFocus.negate()),
            weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        },
        run: async (c) => {
            c.groupService.setActiveGroupToPrevious();
            await c.groupService.showPanel(true);
        },
    });
    registerTerminalAction({
        id: "workbench.action.terminal.runSelectedText" /* TerminalCommandId.RunSelectedText */,
        title: localize2('workbench.action.terminal.runSelectedText', 'Run Selected Text In Active Terminal'),
        run: async (c, accessor) => {
            const codeEditorService = accessor.get(ICodeEditorService);
            const editor = codeEditorService.getActiveCodeEditor();
            if (!editor || !editor.hasModel()) {
                return;
            }
            const instance = await c.service.getActiveOrCreateInstance({ acceptsInput: true });
            const selection = editor.getSelection();
            let text;
            if (selection.isEmpty()) {
                text = editor.getModel().getLineContent(selection.selectionStartLineNumber).trim();
            }
            else {
                const endOfLinePreference = isWindows ? 1 /* EndOfLinePreference.LF */ : 2 /* EndOfLinePreference.CRLF */;
                text = editor.getModel().getValueInRange(selection, endOfLinePreference);
            }
            instance.sendText(text, true, true);
            await c.service.revealActiveTerminal(true);
        },
    });
    registerTerminalAction({
        id: "workbench.action.terminal.runActiveFile" /* TerminalCommandId.RunActiveFile */,
        title: localize2('workbench.action.terminal.runActiveFile', 'Run Active File In Active Terminal'),
        precondition: sharedWhenClause.terminalAvailable,
        run: async (c, accessor) => {
            const codeEditorService = accessor.get(ICodeEditorService);
            const notificationService = accessor.get(INotificationService);
            const workbenchEnvironmentService = accessor.get(IWorkbenchEnvironmentService);
            const editor = codeEditorService.getActiveCodeEditor();
            if (!editor || !editor.hasModel()) {
                return;
            }
            const instance = await c.service.getActiveOrCreateInstance({ acceptsInput: true });
            const isRemote = instance
                ? instance.isRemote
                : workbenchEnvironmentService.remoteAuthority
                    ? true
                    : false;
            const uri = editor.getModel().uri;
            if ((!isRemote && uri.scheme !== Schemas.file && uri.scheme !== Schemas.vscodeUserData) ||
                (isRemote && uri.scheme !== Schemas.vscodeRemote)) {
                notificationService.warn(localize('workbench.action.terminal.runActiveFile.noFile', 'Only files on disk can be run in the terminal'));
                return;
            }
            // TODO: Convert this to ctrl+c, ctrl+v for pwsh?
            await instance.sendPath(uri, true);
            return c.groupService.showPanel();
        },
    });
    registerActiveXtermAction({
        id: "workbench.action.terminal.scrollDown" /* TerminalCommandId.ScrollDownLine */,
        title: localize2('workbench.action.terminal.scrollDown', 'Scroll Down (Line)'),
        keybinding: {
            primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 12 /* KeyCode.PageDown */,
            linux: { primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 18 /* KeyCode.DownArrow */ },
            when: sharedWhenClause.focusInAny_and_normalBuffer,
            weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        },
        precondition: sharedWhenClause.terminalAvailable,
        run: (xterm) => xterm.scrollDownLine(),
    });
    registerActiveXtermAction({
        id: "workbench.action.terminal.scrollDownPage" /* TerminalCommandId.ScrollDownPage */,
        title: localize2('workbench.action.terminal.scrollDownPage', 'Scroll Down (Page)'),
        keybinding: {
            primary: 1024 /* KeyMod.Shift */ | 12 /* KeyCode.PageDown */,
            mac: { primary: 12 /* KeyCode.PageDown */ },
            when: sharedWhenClause.focusInAny_and_normalBuffer,
            weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        },
        precondition: sharedWhenClause.terminalAvailable,
        run: (xterm) => xterm.scrollDownPage(),
    });
    registerActiveXtermAction({
        id: "workbench.action.terminal.scrollToBottom" /* TerminalCommandId.ScrollToBottom */,
        title: localize2('workbench.action.terminal.scrollToBottom', 'Scroll to Bottom'),
        keybinding: {
            primary: 2048 /* KeyMod.CtrlCmd */ | 13 /* KeyCode.End */,
            linux: { primary: 1024 /* KeyMod.Shift */ | 13 /* KeyCode.End */ },
            when: sharedWhenClause.focusInAny_and_normalBuffer,
            weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        },
        precondition: sharedWhenClause.terminalAvailable,
        run: (xterm) => xterm.scrollToBottom(),
    });
    registerActiveXtermAction({
        id: "workbench.action.terminal.scrollUp" /* TerminalCommandId.ScrollUpLine */,
        title: localize2('workbench.action.terminal.scrollUp', 'Scroll Up (Line)'),
        keybinding: {
            primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 11 /* KeyCode.PageUp */,
            linux: { primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 16 /* KeyCode.UpArrow */ },
            when: sharedWhenClause.focusInAny_and_normalBuffer,
            weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        },
        precondition: sharedWhenClause.terminalAvailable,
        run: (xterm) => xterm.scrollUpLine(),
    });
    registerActiveXtermAction({
        id: "workbench.action.terminal.scrollUpPage" /* TerminalCommandId.ScrollUpPage */,
        title: localize2('workbench.action.terminal.scrollUpPage', 'Scroll Up (Page)'),
        f1: true,
        keybinding: {
            primary: 1024 /* KeyMod.Shift */ | 11 /* KeyCode.PageUp */,
            mac: { primary: 11 /* KeyCode.PageUp */ },
            when: sharedWhenClause.focusInAny_and_normalBuffer,
            weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        },
        precondition: sharedWhenClause.terminalAvailable,
        run: (xterm) => xterm.scrollUpPage(),
    });
    registerActiveXtermAction({
        id: "workbench.action.terminal.scrollToTop" /* TerminalCommandId.ScrollToTop */,
        title: localize2('workbench.action.terminal.scrollToTop', 'Scroll to Top'),
        keybinding: {
            primary: 2048 /* KeyMod.CtrlCmd */ | 14 /* KeyCode.Home */,
            linux: { primary: 1024 /* KeyMod.Shift */ | 14 /* KeyCode.Home */ },
            when: sharedWhenClause.focusInAny_and_normalBuffer,
            weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        },
        precondition: sharedWhenClause.terminalAvailable,
        run: (xterm) => xterm.scrollToTop(),
    });
    registerActiveXtermAction({
        id: "workbench.action.terminal.clearSelection" /* TerminalCommandId.ClearSelection */,
        title: localize2('workbench.action.terminal.clearSelection', 'Clear Selection'),
        keybinding: {
            primary: 9 /* KeyCode.Escape */,
            when: ContextKeyExpr.and(TerminalContextKeys.focusInAny, TerminalContextKeys.textSelected, TerminalContextKeys.notFindVisible),
            weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        },
        precondition: sharedWhenClause.terminalAvailable,
        run: (xterm) => {
            if (xterm.hasSelection()) {
                xterm.clearSelection();
            }
        },
    });
    registerTerminalAction({
        id: "workbench.action.terminal.changeIcon" /* TerminalCommandId.ChangeIcon */,
        title: terminalStrings.changeIcon,
        precondition: sharedWhenClause.terminalAvailable,
        run: (c, _, args) => getResourceOrActiveInstance(c, args)?.changeIcon(),
    });
    registerTerminalAction({
        id: "workbench.action.terminal.changeIconActiveTab" /* TerminalCommandId.ChangeIconActiveTab */,
        title: terminalStrings.changeIcon,
        f1: false,
        precondition: sharedWhenClause.terminalAvailable_and_singularSelection,
        run: async (c, accessor, args) => {
            let icon;
            if (c.groupService.lastAccessedMenu === 'inline-tab') {
                getResourceOrActiveInstance(c, args)?.changeIcon();
                return;
            }
            for (const terminal of getSelectedInstances(accessor) ?? []) {
                icon = await terminal.changeIcon(icon);
            }
        },
    });
    registerTerminalAction({
        id: "workbench.action.terminal.changeColor" /* TerminalCommandId.ChangeColor */,
        title: terminalStrings.changeColor,
        precondition: sharedWhenClause.terminalAvailable,
        run: (c, _, args) => getResourceOrActiveInstance(c, args)?.changeColor(),
    });
    registerTerminalAction({
        id: "workbench.action.terminal.changeColorActiveTab" /* TerminalCommandId.ChangeColorActiveTab */,
        title: terminalStrings.changeColor,
        f1: false,
        precondition: sharedWhenClause.terminalAvailable_and_singularSelection,
        run: async (c, accessor, args) => {
            let color;
            let i = 0;
            if (c.groupService.lastAccessedMenu === 'inline-tab') {
                getResourceOrActiveInstance(c, args)?.changeColor();
                return;
            }
            for (const terminal of getSelectedInstances(accessor) ?? []) {
                const skipQuickPick = i !== 0;
                // Always show the quickpick on the first iteration
                color = await terminal.changeColor(color, skipQuickPick);
                i++;
            }
        },
    });
    registerTerminalAction({
        id: "workbench.action.terminal.rename" /* TerminalCommandId.Rename */,
        title: terminalStrings.rename,
        precondition: sharedWhenClause.terminalAvailable,
        run: (c, accessor, args) => renameWithQuickPick(c, accessor, args),
    });
    registerTerminalAction({
        id: "workbench.action.terminal.renameActiveTab" /* TerminalCommandId.RenameActiveTab */,
        title: terminalStrings.rename,
        f1: false,
        keybinding: {
            primary: 60 /* KeyCode.F2 */,
            mac: {
                primary: 3 /* KeyCode.Enter */,
            },
            when: ContextKeyExpr.and(TerminalContextKeys.tabsFocus),
            weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        },
        precondition: sharedWhenClause.terminalAvailable_and_singularSelection,
        run: async (c, accessor) => {
            const terminalGroupService = accessor.get(ITerminalGroupService);
            const notificationService = accessor.get(INotificationService);
            const instances = getSelectedInstances(accessor);
            const firstInstance = instances?.[0];
            if (!firstInstance) {
                return;
            }
            if (terminalGroupService.lastAccessedMenu === 'inline-tab') {
                return renameWithQuickPick(c, accessor, firstInstance);
            }
            c.service.setEditingTerminal(firstInstance);
            c.service.setEditable(firstInstance, {
                validationMessage: (value) => validateTerminalName(value),
                onFinish: async (value, success) => {
                    // Cancel editing first as instance.rename will trigger a rerender automatically
                    c.service.setEditable(firstInstance, null);
                    c.service.setEditingTerminal(undefined);
                    if (success) {
                        const promises = [];
                        for (const instance of instances) {
                            promises.push((async () => {
                                await instance.rename(value);
                            })());
                        }
                        try {
                            await Promise.all(promises);
                        }
                        catch (e) {
                            notificationService.error(e);
                        }
                    }
                },
            });
        },
    });
    registerActiveInstanceAction({
        id: "workbench.action.terminal.detachSession" /* TerminalCommandId.DetachSession */,
        title: localize2('workbench.action.terminal.detachSession', 'Detach Session'),
        run: (activeInstance) => activeInstance.detachProcessAndDispose(TerminalExitReason.User),
    });
    registerTerminalAction({
        id: "workbench.action.terminal.attachToSession" /* TerminalCommandId.AttachToSession */,
        title: localize2('workbench.action.terminal.attachToSession', 'Attach to Session'),
        run: async (c, accessor) => {
            const quickInputService = accessor.get(IQuickInputService);
            const labelService = accessor.get(ILabelService);
            const remoteAgentService = accessor.get(IRemoteAgentService);
            const notificationService = accessor.get(INotificationService);
            const remoteAuthority = remoteAgentService.getConnection()?.remoteAuthority ?? undefined;
            const backend = await accessor.get(ITerminalInstanceService).getBackend(remoteAuthority);
            if (!backend) {
                throw new Error(`No backend registered for remote authority '${remoteAuthority}'`);
            }
            const terms = await backend.listProcesses();
            backend.reduceConnectionGraceTime();
            const unattachedTerms = terms.filter((term) => !c.service.isAttachedToTerminal(term));
            const items = unattachedTerms.map((term) => {
                const cwdLabel = labelService.getUriLabel(URI.file(term.cwd));
                return {
                    label: term.title,
                    detail: term.workspaceName ? `${term.workspaceName} \u2E31 ${cwdLabel}` : cwdLabel,
                    description: term.pid ? String(term.pid) : '',
                    term,
                };
            });
            if (items.length === 0) {
                notificationService.info(localize('noUnattachedTerminals', 'There are no unattached terminals to attach to'));
                return;
            }
            const selected = await quickInputService.pick(items, {
                canPickMany: false,
            });
            if (selected) {
                const instance = await c.service.createTerminal({
                    config: { attachPersistentProcess: selected.term },
                });
                c.service.setActiveInstance(instance);
                await focusActiveTerminal(instance, c);
            }
        },
    });
    registerActiveInstanceAction({
        id: "workbench.action.terminal.scrollToPreviousCommand" /* TerminalCommandId.ScrollToPreviousCommand */,
        title: terminalStrings.scrollToPreviousCommand,
        keybinding: {
            primary: 2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */,
            when: ContextKeyExpr.and(TerminalContextKeys.focus, CONTEXT_ACCESSIBILITY_MODE_ENABLED.negate()),
            weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        },
        precondition: sharedWhenClause.terminalAvailable,
        icon: Codicon.arrowUp,
        menu: [
            {
                id: MenuId.ViewTitle,
                group: 'navigation',
                order: 4,
                when: ContextKeyExpr.equals('view', TERMINAL_VIEW_ID),
                isHiddenByDefault: true,
            },
        ],
        run: (activeInstance) => activeInstance.xterm?.markTracker.scrollToPreviousMark(undefined, undefined, activeInstance.capabilities.has(2 /* TerminalCapability.CommandDetection */)),
    });
    registerActiveInstanceAction({
        id: "workbench.action.terminal.scrollToNextCommand" /* TerminalCommandId.ScrollToNextCommand */,
        title: terminalStrings.scrollToNextCommand,
        keybinding: {
            primary: 2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */,
            when: ContextKeyExpr.and(TerminalContextKeys.focus, CONTEXT_ACCESSIBILITY_MODE_ENABLED.negate()),
            weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        },
        precondition: sharedWhenClause.terminalAvailable,
        icon: Codicon.arrowDown,
        menu: [
            {
                id: MenuId.ViewTitle,
                group: 'navigation',
                order: 4,
                when: ContextKeyExpr.equals('view', TERMINAL_VIEW_ID),
                isHiddenByDefault: true,
            },
        ],
        run: (activeInstance) => {
            activeInstance.xterm?.markTracker.scrollToNextMark();
            activeInstance.focus();
        },
    });
    registerActiveInstanceAction({
        id: "workbench.action.terminal.selectToPreviousCommand" /* TerminalCommandId.SelectToPreviousCommand */,
        title: localize2('workbench.action.terminal.selectToPreviousCommand', 'Select to Previous Command'),
        keybinding: {
            primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 16 /* KeyCode.UpArrow */,
            when: TerminalContextKeys.focus,
            weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        },
        precondition: sharedWhenClause.terminalAvailable,
        run: (activeInstance) => {
            activeInstance.xterm?.markTracker.selectToPreviousMark();
            activeInstance.focus();
        },
    });
    registerActiveInstanceAction({
        id: "workbench.action.terminal.selectToNextCommand" /* TerminalCommandId.SelectToNextCommand */,
        title: localize2('workbench.action.terminal.selectToNextCommand', 'Select to Next Command'),
        keybinding: {
            primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 18 /* KeyCode.DownArrow */,
            when: TerminalContextKeys.focus,
            weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        },
        precondition: sharedWhenClause.terminalAvailable,
        run: (activeInstance) => {
            activeInstance.xterm?.markTracker.selectToNextMark();
            activeInstance.focus();
        },
    });
    registerActiveXtermAction({
        id: "workbench.action.terminal.selectToPreviousLine" /* TerminalCommandId.SelectToPreviousLine */,
        title: localize2('workbench.action.terminal.selectToPreviousLine', 'Select to Previous Line'),
        precondition: sharedWhenClause.terminalAvailable,
        run: async (xterm, _, instance) => {
            xterm.markTracker.selectToPreviousLine();
            (instance || xterm).focus();
        },
    });
    registerActiveXtermAction({
        id: "workbench.action.terminal.selectToNextLine" /* TerminalCommandId.SelectToNextLine */,
        title: localize2('workbench.action.terminal.selectToNextLine', 'Select to Next Line'),
        precondition: sharedWhenClause.terminalAvailable,
        run: async (xterm, _, instance) => {
            xterm.markTracker.selectToNextLine();
            (instance || xterm).focus();
        },
    });
    registerTerminalAction({
        id: "workbench.action.terminal.sendSequence" /* TerminalCommandId.SendSequence */,
        title: terminalStrings.sendSequence,
        f1: false,
        metadata: {
            description: terminalStrings.sendSequence.value,
            args: [
                {
                    name: 'args',
                    schema: {
                        type: 'object',
                        required: ['text'],
                        properties: {
                            text: {
                                description: localize('sendSequence', 'The sequence of text to send to the terminal'),
                                type: 'string',
                            },
                        },
                    },
                },
            ],
        },
        run: (c, accessor, args) => terminalSendSequenceCommand(accessor, args),
    });
    registerTerminalAction({
        id: "workbench.action.terminal.newWithCwd" /* TerminalCommandId.NewWithCwd */,
        title: terminalStrings.newWithCwd,
        metadata: {
            description: terminalStrings.newWithCwd.value,
            args: [
                {
                    name: 'args',
                    schema: {
                        type: 'object',
                        required: ['cwd'],
                        properties: {
                            cwd: {
                                description: localize('workbench.action.terminal.newWithCwd.cwd', 'The directory to start the terminal at'),
                                type: 'string',
                            },
                        },
                    },
                },
            ],
        },
        run: async (c, _, args) => {
            const cwd = isObject(args) && 'cwd' in args ? toOptionalString(args.cwd) : undefined;
            const instance = await c.service.createTerminal({ cwd });
            if (!instance) {
                return;
            }
            c.service.setActiveInstance(instance);
            await focusActiveTerminal(instance, c);
        },
    });
    registerActiveInstanceAction({
        id: "workbench.action.terminal.renameWithArg" /* TerminalCommandId.RenameWithArgs */,
        title: terminalStrings.renameWithArgs,
        metadata: {
            description: terminalStrings.renameWithArgs.value,
            args: [
                {
                    name: 'args',
                    schema: {
                        type: 'object',
                        required: ['name'],
                        properties: {
                            name: {
                                description: localize('workbench.action.terminal.renameWithArg.name', 'The new name for the terminal'),
                                type: 'string',
                                minLength: 1,
                            },
                        },
                    },
                },
            ],
        },
        precondition: sharedWhenClause.terminalAvailable,
        run: async (activeInstance, c, accessor, args) => {
            const notificationService = accessor.get(INotificationService);
            const name = isObject(args) && 'name' in args ? toOptionalString(args.name) : undefined;
            if (!name) {
                notificationService.warn(localize('workbench.action.terminal.renameWithArg.noName', 'No name argument provided'));
                return;
            }
            activeInstance.rename(name);
        },
    });
    registerActiveInstanceAction({
        id: "workbench.action.terminal.relaunch" /* TerminalCommandId.Relaunch */,
        title: localize2('workbench.action.terminal.relaunch', 'Relaunch Active Terminal'),
        run: (activeInstance) => activeInstance.relaunch(),
    });
    registerTerminalAction({
        id: "workbench.action.terminal.split" /* TerminalCommandId.Split */,
        title: terminalStrings.split,
        precondition: ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.webExtensionContributedProfile),
        keybinding: {
            primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 26 /* KeyCode.Digit5 */,
            weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            mac: {
                primary: 2048 /* KeyMod.CtrlCmd */ | 93 /* KeyCode.Backslash */,
                secondary: [256 /* KeyMod.WinCtrl */ | 1024 /* KeyMod.Shift */ | 26 /* KeyCode.Digit5 */],
            },
            when: TerminalContextKeys.focus,
        },
        icon: Codicon.splitHorizontal,
        run: async (c, accessor, args) => {
            const optionsOrProfile = isObject(args)
                ? args
                : undefined;
            const commandService = accessor.get(ICommandService);
            const workspaceContextService = accessor.get(IWorkspaceContextService);
            const options = convertOptionsOrProfileToOptions(optionsOrProfile);
            const activeInstance = (await c.service.getInstanceHost(options?.location)).activeInstance;
            if (!activeInstance) {
                return;
            }
            const cwd = await getCwdForSplit(activeInstance, workspaceContextService.getWorkspace().folders, commandService, c.configService);
            if (cwd === undefined) {
                return;
            }
            const instance = await c.service.createTerminal({
                location: { parentTerminal: activeInstance },
                config: options?.config,
                cwd,
            });
            await focusActiveTerminal(instance, c);
        },
    });
    registerTerminalAction({
        id: "workbench.action.terminal.splitActiveTab" /* TerminalCommandId.SplitActiveTab */,
        title: terminalStrings.split,
        f1: false,
        keybinding: {
            primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 26 /* KeyCode.Digit5 */,
            mac: {
                primary: 2048 /* KeyMod.CtrlCmd */ | 93 /* KeyCode.Backslash */,
                secondary: [256 /* KeyMod.WinCtrl */ | 1024 /* KeyMod.Shift */ | 26 /* KeyCode.Digit5 */],
            },
            weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            when: TerminalContextKeys.tabsFocus,
        },
        run: async (c, accessor) => {
            const instances = getSelectedInstances(accessor);
            if (instances) {
                const promises = [];
                for (const t of instances) {
                    promises.push((async () => {
                        await c.service.createTerminal({ location: { parentTerminal: t } });
                        await c.groupService.showPanel(true);
                    })());
                }
                await Promise.all(promises);
            }
        },
    });
    registerContextualInstanceAction({
        id: "workbench.action.terminal.unsplit" /* TerminalCommandId.Unsplit */,
        title: terminalStrings.unsplit,
        precondition: sharedWhenClause.terminalAvailable,
        run: async (instance, c) => {
            const group = c.groupService.getGroupForInstance(instance);
            if (group && group?.terminalInstances.length > 1) {
                c.groupService.unsplitInstance(instance);
            }
        },
    });
    registerTerminalAction({
        id: "workbench.action.terminal.joinActiveTab" /* TerminalCommandId.JoinActiveTab */,
        title: localize2('workbench.action.terminal.joinInstance', 'Join Terminals'),
        precondition: ContextKeyExpr.and(sharedWhenClause.terminalAvailable, TerminalContextKeys.tabsSingularSelection.toNegated()),
        run: async (c, accessor) => {
            const instances = getSelectedInstances(accessor);
            if (instances && instances.length > 1) {
                c.groupService.joinInstances(instances);
            }
        },
    });
    registerTerminalAction({
        id: "workbench.action.terminal.join" /* TerminalCommandId.Join */,
        title: localize2('workbench.action.terminal.join', 'Join Terminals...'),
        precondition: sharedWhenClause.terminalAvailable,
        run: async (c, accessor) => {
            const themeService = accessor.get(IThemeService);
            const notificationService = accessor.get(INotificationService);
            const quickInputService = accessor.get(IQuickInputService);
            const picks = [];
            if (c.groupService.instances.length <= 1) {
                notificationService.warn(localize('workbench.action.terminal.join.insufficientTerminals', 'Insufficient terminals for the join action'));
                return;
            }
            const otherInstances = c.groupService.instances.filter((i) => i.instanceId !== c.groupService.activeInstance?.instanceId);
            for (const terminal of otherInstances) {
                const group = c.groupService.getGroupForInstance(terminal);
                if (group?.terminalInstances.length === 1) {
                    const iconId = getIconId(accessor, terminal);
                    const label = `$(${iconId}): ${terminal.title}`;
                    const iconClasses = [];
                    const colorClass = getColorClass(terminal);
                    if (colorClass) {
                        iconClasses.push(colorClass);
                    }
                    const uriClasses = getUriClasses(terminal, themeService.getColorTheme().type);
                    if (uriClasses) {
                        iconClasses.push(...uriClasses);
                    }
                    picks.push({
                        terminal,
                        label,
                        iconClasses,
                    });
                }
            }
            if (picks.length === 0) {
                notificationService.warn(localize('workbench.action.terminal.join.onlySplits', 'All terminals are joined already'));
                return;
            }
            const result = await quickInputService.pick(picks, {});
            if (result) {
                c.groupService.joinInstances([result.terminal, c.groupService.activeInstance]);
            }
        },
    });
    registerActiveInstanceAction({
        id: "workbench.action.terminal.splitInActiveWorkspace" /* TerminalCommandId.SplitInActiveWorkspace */,
        title: localize2('workbench.action.terminal.splitInActiveWorkspace', 'Split Terminal (In Active Workspace)'),
        run: async (instance, c) => {
            const newInstance = await c.service.createTerminal({ location: { parentTerminal: instance } });
            if (newInstance?.target !== TerminalLocation.Editor) {
                await c.groupService.showPanel(true);
            }
        },
    });
    registerActiveXtermAction({
        id: "workbench.action.terminal.selectAll" /* TerminalCommandId.SelectAll */,
        title: localize2('workbench.action.terminal.selectAll', 'Select All'),
        precondition: sharedWhenClause.terminalAvailable,
        keybinding: [
            {
                // Don't use ctrl+a by default as that would override the common go to start
                // of prompt shell binding
                primary: 0,
                // Technically this doesn't need to be here as it will fall back to this
                // behavior anyway when handed to xterm.js, having this handled by VS Code
                // makes it easier for users to see how it works though.
                mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 31 /* KeyCode.KeyA */ },
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: TerminalContextKeys.focusInAny,
            },
        ],
        run: (xterm) => xterm.selectAll(),
    });
    registerTerminalAction({
        id: "workbench.action.terminal.new" /* TerminalCommandId.New */,
        title: localize2('workbench.action.terminal.new', 'Create New Terminal'),
        precondition: ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.webExtensionContributedProfile),
        icon: newTerminalIcon,
        keybinding: {
            primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 91 /* KeyCode.Backquote */,
            mac: { primary: 256 /* KeyMod.WinCtrl */ | 1024 /* KeyMod.Shift */ | 91 /* KeyCode.Backquote */ },
            weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        },
        run: async (c, accessor, args) => {
            let eventOrOptions = isObject(args)
                ? args
                : undefined;
            const workspaceContextService = accessor.get(IWorkspaceContextService);
            const commandService = accessor.get(ICommandService);
            const folders = workspaceContextService.getWorkspace().folders;
            if (eventOrOptions &&
                isMouseEvent(eventOrOptions) &&
                (eventOrOptions.altKey || eventOrOptions.ctrlKey)) {
                await c.service.createTerminal({ location: { splitActiveTerminal: true } });
                return;
            }
            if (c.service.isProcessSupportRegistered) {
                eventOrOptions = !eventOrOptions || isMouseEvent(eventOrOptions) ? {} : eventOrOptions;
                let instance;
                if (folders.length <= 1) {
                    // Allow terminal service to handle the path when there is only a
                    // single root
                    instance = await c.service.createTerminal(eventOrOptions);
                }
                else {
                    const cwd = (await pickTerminalCwd(accessor))?.cwd;
                    if (!cwd) {
                        // Don't create the instance if the workspace picker was canceled
                        return;
                    }
                    eventOrOptions.cwd = cwd;
                    instance = await c.service.createTerminal(eventOrOptions);
                }
                c.service.setActiveInstance(instance);
                await focusActiveTerminal(instance, c);
            }
            else {
                if (c.profileService.contributedProfiles.length > 0) {
                    commandService.executeCommand("workbench.action.terminal.newWithProfile" /* TerminalCommandId.NewWithProfile */);
                }
                else {
                    commandService.executeCommand("workbench.action.terminal.toggleTerminal" /* TerminalCommandId.Toggle */);
                }
            }
        },
    });
    async function killInstance(c, instance) {
        if (!instance) {
            return;
        }
        await c.service.safeDisposeTerminal(instance);
        if (c.groupService.instances.length > 0) {
            await c.groupService.showPanel(true);
        }
    }
    registerTerminalAction({
        id: "workbench.action.terminal.kill" /* TerminalCommandId.Kill */,
        title: localize2('workbench.action.terminal.kill', 'Kill the Active Terminal Instance'),
        precondition: ContextKeyExpr.or(sharedWhenClause.terminalAvailable, TerminalContextKeys.isOpen),
        icon: killTerminalIcon,
        run: async (c) => killInstance(c, c.groupService.activeInstance),
    });
    registerTerminalAction({
        id: "workbench.action.terminal.killViewOrEditor" /* TerminalCommandId.KillViewOrEditor */,
        title: terminalStrings.kill,
        f1: false, // This is an internal command used for context menus
        precondition: ContextKeyExpr.or(sharedWhenClause.terminalAvailable, TerminalContextKeys.isOpen),
        run: async (c) => killInstance(c, c.service.activeInstance),
    });
    registerTerminalAction({
        id: "workbench.action.terminal.killAll" /* TerminalCommandId.KillAll */,
        title: localize2('workbench.action.terminal.killAll', 'Kill All Terminals'),
        precondition: ContextKeyExpr.or(sharedWhenClause.terminalAvailable, TerminalContextKeys.isOpen),
        icon: Codicon.trash,
        run: async (c) => {
            const disposePromises = [];
            for (const instance of c.service.instances) {
                disposePromises.push(c.service.safeDisposeTerminal(instance));
            }
            await Promise.all(disposePromises);
        },
    });
    registerTerminalAction({
        id: "workbench.action.terminal.killEditor" /* TerminalCommandId.KillEditor */,
        title: localize2('workbench.action.terminal.killEditor', 'Kill the Active Terminal in Editor Area'),
        precondition: sharedWhenClause.terminalAvailable,
        keybinding: {
            primary: 2048 /* KeyMod.CtrlCmd */ | 53 /* KeyCode.KeyW */,
            win: { primary: 2048 /* KeyMod.CtrlCmd */ | 62 /* KeyCode.F4 */, secondary: [2048 /* KeyMod.CtrlCmd */ | 53 /* KeyCode.KeyW */] },
            weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            when: ContextKeyExpr.and(TerminalContextKeys.focus, TerminalContextKeys.editorFocus),
        },
        run: (c, accessor) => accessor.get(ICommandService).executeCommand(CLOSE_EDITOR_COMMAND_ID),
    });
    registerTerminalAction({
        id: "workbench.action.terminal.killActiveTab" /* TerminalCommandId.KillActiveTab */,
        title: terminalStrings.kill,
        f1: false,
        precondition: ContextKeyExpr.or(sharedWhenClause.terminalAvailable, TerminalContextKeys.isOpen),
        keybinding: {
            primary: 20 /* KeyCode.Delete */,
            mac: {
                primary: 2048 /* KeyMod.CtrlCmd */ | 1 /* KeyCode.Backspace */,
                secondary: [20 /* KeyCode.Delete */],
            },
            weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            when: TerminalContextKeys.tabsFocus,
        },
        run: async (c, accessor) => {
            const disposePromises = [];
            for (const terminal of getSelectedInstances(accessor, true) ?? []) {
                disposePromises.push(c.service.safeDisposeTerminal(terminal));
            }
            await Promise.all(disposePromises);
            c.groupService.focusTabs();
        },
    });
    registerTerminalAction({
        id: "workbench.action.terminal.focusHover" /* TerminalCommandId.FocusHover */,
        title: terminalStrings.focusHover,
        precondition: ContextKeyExpr.or(sharedWhenClause.terminalAvailable, TerminalContextKeys.isOpen),
        keybinding: {
            primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 39 /* KeyCode.KeyI */),
            weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            when: ContextKeyExpr.or(TerminalContextKeys.tabsFocus, TerminalContextKeys.focus),
        },
        run: (c) => c.groupService.focusHover(),
    });
    registerActiveInstanceAction({
        id: "workbench.action.terminal.clear" /* TerminalCommandId.Clear */,
        title: localize2('workbench.action.terminal.clear', 'Clear'),
        precondition: sharedWhenClause.terminalAvailable,
        keybinding: [
            {
                primary: 0,
                mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */ },
                // Weight is higher than work workbench contributions so the keybinding remains
                // highest priority when chords are registered afterwards
                weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1,
                // Disable the keybinding when accessibility mode is enabled as chords include
                // important screen reader keybindings such as cmd+k, cmd+i to show the hover
                when: ContextKeyExpr.or(ContextKeyExpr.and(TerminalContextKeys.focus, CONTEXT_ACCESSIBILITY_MODE_ENABLED.negate()), ContextKeyExpr.and(CONTEXT_ACCESSIBILITY_MODE_ENABLED, accessibleViewIsShown, accessibleViewCurrentProviderId.isEqualTo("terminal" /* AccessibleViewProviderId.Terminal */))),
            },
        ],
        run: (activeInstance) => activeInstance.clearBuffer(),
    });
    registerTerminalAction({
        id: "workbench.action.terminal.selectDefaultShell" /* TerminalCommandId.SelectDefaultProfile */,
        title: localize2('workbench.action.terminal.selectDefaultShell', 'Select Default Profile'),
        run: (c) => c.service.showProfileQuickPick('setDefault'),
    });
    registerTerminalAction({
        id: "workbench.action.terminal.openSettings" /* TerminalCommandId.ConfigureTerminalSettings */,
        title: localize2('workbench.action.terminal.openSettings', 'Configure Terminal Settings'),
        precondition: sharedWhenClause.terminalAvailable,
        run: (c, accessor) => accessor
            .get(IPreferencesService)
            .openSettings({ jsonEditor: false, query: '@feature:terminal' }),
    });
    registerActiveInstanceAction({
        id: "workbench.action.terminal.setDimensions" /* TerminalCommandId.SetDimensions */,
        title: localize2('workbench.action.terminal.setFixedDimensions', 'Set Fixed Dimensions'),
        precondition: sharedWhenClause.terminalAvailable_and_opened,
        run: (activeInstance) => activeInstance.setFixedDimensions(),
    });
    registerContextualInstanceAction({
        id: "workbench.action.terminal.sizeToContentWidth" /* TerminalCommandId.SizeToContentWidth */,
        title: terminalStrings.toggleSizeToContentWidth,
        precondition: sharedWhenClause.terminalAvailable_and_opened,
        keybinding: {
            primary: 512 /* KeyMod.Alt */ | 56 /* KeyCode.KeyZ */,
            weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            when: TerminalContextKeys.focus,
        },
        run: (instance) => instance.toggleSizeToContentWidth(),
    });
    registerTerminalAction({
        id: "workbench.action.terminal.switchTerminal" /* TerminalCommandId.SwitchTerminal */,
        title: localize2('workbench.action.terminal.switchTerminal', 'Switch Terminal'),
        precondition: sharedWhenClause.terminalAvailable,
        run: async (c, accessor, args) => {
            const item = toOptionalString(args);
            if (!item) {
                return;
            }
            if (item === switchTerminalActionViewItemSeparator) {
                c.service.refreshActiveGroup();
                return;
            }
            if (item === switchTerminalShowTabsTitle) {
                accessor.get(IConfigurationService).updateValue("terminal.integrated.tabs.enabled" /* TerminalSettingId.TabsEnabled */, true);
                return;
            }
            const terminalIndexRe = /^([0-9]+): /;
            const indexMatches = terminalIndexRe.exec(item);
            if (indexMatches) {
                c.groupService.setActiveGroupByIndex(Number(indexMatches[1]) - 1);
                return c.groupService.showPanel(true);
            }
            const quickSelectProfiles = c.profileService.availableProfiles;
            // Remove 'New ' from the selected item to get the profile name
            const profileSelection = item.substring(4);
            if (quickSelectProfiles) {
                const profile = quickSelectProfiles.find((profile) => profile.profileName === profileSelection);
                if (profile) {
                    const instance = await c.service.createTerminal({
                        config: profile,
                    });
                    c.service.setActiveInstance(instance);
                }
                else {
                    console.warn(`No profile with name "${profileSelection}"`);
                }
            }
            else {
                console.warn(`Unmatched terminal item: "${item}"`);
            }
        },
    });
}
function getSelectedInstances2(accessor, args) {
    const terminalService = accessor.get(ITerminalService);
    const result = [];
    const context = parseActionArgs(args);
    if (context && context.length > 0) {
        for (const instanceContext of context) {
            const instance = terminalService.getInstanceFromId(instanceContext.instanceId);
            if (instance) {
                result.push(instance);
            }
        }
        if (result.length > 0) {
            return result;
        }
    }
    return undefined;
}
function getSelectedInstances(accessor, args, args2) {
    const listService = accessor.get(IListService);
    const terminalService = accessor.get(ITerminalService);
    const terminalGroupService = accessor.get(ITerminalGroupService);
    const result = [];
    // Assign list only if it's an instance of TerminalTabList (#234791)
    const list = listService.lastFocusedList instanceof TerminalTabList ? listService.lastFocusedList : undefined;
    // Get selected tab list instance(s)
    const selections = list?.getSelection();
    // Get inline tab instance if there are not tab list selections #196578
    if (terminalGroupService.lastAccessedMenu === 'inline-tab' && !selections?.length) {
        const instance = terminalGroupService.activeInstance;
        return instance ? [terminalGroupService.activeInstance] : undefined;
    }
    if (!list || !selections) {
        return undefined;
    }
    const focused = list.getFocus();
    if (focused.length === 1 && !selections.includes(focused[0])) {
        // focused length is always a max of 1
        // if the focused one is not in the selected list, return that item
        result.push(terminalService.getInstanceFromIndex(focused[0]));
        return result;
    }
    // multi-select
    for (const selection of selections) {
        result.push(terminalService.getInstanceFromIndex(selection));
    }
    return result.filter((r) => !!r);
}
export function validateTerminalName(name) {
    if (!name || name.trim().length === 0) {
        return {
            content: localize('emptyTerminalNameInfo', 'Providing no name will reset it to the default value'),
            severity: Severity.Info,
        };
    }
    return null;
}
function convertOptionsOrProfileToOptions(optionsOrProfile) {
    if (isObject(optionsOrProfile) && 'profileName' in optionsOrProfile) {
        return {
            config: optionsOrProfile,
            location: optionsOrProfile.location,
        };
    }
    return optionsOrProfile;
}
let newWithProfileAction;
export function refreshTerminalActions(detectedProfiles) {
    const profileEnum = createProfileSchemaEnums(detectedProfiles);
    newWithProfileAction?.dispose();
    // TODO: Use new register function
    newWithProfileAction = registerAction2(class extends Action2 {
        constructor() {
            super({
                id: "workbench.action.terminal.newWithProfile" /* TerminalCommandId.NewWithProfile */,
                title: localize2('workbench.action.terminal.newWithProfile', 'Create New Terminal (With Profile)'),
                f1: true,
                precondition: ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.webExtensionContributedProfile),
                metadata: {
                    description: "workbench.action.terminal.newWithProfile" /* TerminalCommandId.NewWithProfile */,
                    args: [
                        {
                            name: 'args',
                            schema: {
                                type: 'object',
                                required: ['profileName'],
                                properties: {
                                    profileName: {
                                        description: localize('workbench.action.terminal.newWithProfile.profileName', 'The name of the profile to create'),
                                        type: 'string',
                                        enum: profileEnum.values,
                                        markdownEnumDescriptions: profileEnum.markdownDescriptions,
                                    },
                                    location: {
                                        description: localize('newWithProfile.location', 'Where to create the terminal'),
                                        type: 'string',
                                        enum: ['view', 'editor'],
                                        enumDescriptions: [
                                            localize('newWithProfile.location.view', 'Create the terminal in the terminal view'),
                                            localize('newWithProfile.location.editor', 'Create the terminal in the editor'),
                                        ],
                                    },
                                },
                            },
                        },
                    ],
                },
            });
        }
        async run(accessor, eventOrOptionsOrProfile, profile) {
            const c = getTerminalServices(accessor);
            const workspaceContextService = accessor.get(IWorkspaceContextService);
            const commandService = accessor.get(ICommandService);
            let event;
            let options;
            let instance;
            let cwd;
            if (isObject(eventOrOptionsOrProfile) &&
                eventOrOptionsOrProfile &&
                'profileName' in eventOrOptionsOrProfile) {
                const config = c.profileService.availableProfiles.find((profile) => profile.profileName === eventOrOptionsOrProfile.profileName);
                if (!config) {
                    throw new Error(`Could not find terminal profile "${eventOrOptionsOrProfile.profileName}"`);
                }
                options = { config };
                if ('location' in eventOrOptionsOrProfile) {
                    switch (eventOrOptionsOrProfile.location) {
                        case 'editor':
                            options.location = TerminalLocation.Editor;
                            break;
                        case 'view':
                            options.location = TerminalLocation.Panel;
                            break;
                    }
                }
            }
            else if (isMouseEvent(eventOrOptionsOrProfile) ||
                isPointerEvent(eventOrOptionsOrProfile) ||
                isKeyboardEvent(eventOrOptionsOrProfile)) {
                event = eventOrOptionsOrProfile;
                options = profile ? { config: profile } : undefined;
            }
            else {
                options = convertOptionsOrProfileToOptions(eventOrOptionsOrProfile);
            }
            // split terminal
            if (event && (event.altKey || event.ctrlKey)) {
                const parentTerminal = c.service.activeInstance;
                if (parentTerminal) {
                    await c.service.createTerminal({
                        location: { parentTerminal },
                        config: options?.config,
                    });
                    return;
                }
            }
            const folders = workspaceContextService.getWorkspace().folders;
            if (folders.length > 1) {
                // multi-root workspace, create root picker
                const options = {
                    placeHolder: localize('workbench.action.terminal.newWorkspacePlaceholder', 'Select current working directory for new terminal'),
                };
                const workspace = await commandService.executeCommand(PICK_WORKSPACE_FOLDER_COMMAND_ID, [
                    options,
                ]);
                if (!workspace) {
                    // Don't create the instance if the workspace picker was canceled
                    return;
                }
                cwd = workspace.uri;
            }
            if (options) {
                options.cwd = cwd;
                instance = await c.service.createTerminal(options);
            }
            else {
                instance = await c.service.showProfileQuickPick('createInstance', cwd);
            }
            if (instance) {
                c.service.setActiveInstance(instance);
                await focusActiveTerminal(instance, c);
            }
        }
    });
    return newWithProfileAction;
}
function getResourceOrActiveInstance(c, resource) {
    return c.service.getInstanceFromResource(toOptionalUri(resource)) || c.service.activeInstance;
}
async function pickTerminalCwd(accessor, cancel) {
    const quickInputService = accessor.get(IQuickInputService);
    const labelService = accessor.get(ILabelService);
    const contextService = accessor.get(IWorkspaceContextService);
    const modelService = accessor.get(IModelService);
    const languageService = accessor.get(ILanguageService);
    const configurationService = accessor.get(IConfigurationService);
    const configurationResolverService = accessor.get(IConfigurationResolverService);
    const folders = contextService.getWorkspace().folders;
    if (!folders.length) {
        return;
    }
    const folderCwdPairs = await Promise.all(folders.map((e) => resolveWorkspaceFolderCwd(e, configurationService, configurationResolverService)));
    const shrinkedPairs = shrinkWorkspaceFolderCwdPairs(folderCwdPairs);
    if (shrinkedPairs.length === 1) {
        return shrinkedPairs[0];
    }
    const folderPicks = shrinkedPairs.map((pair) => {
        const label = pair.folder.name;
        const description = pair.isOverridden
            ? localize('workbench.action.terminal.overriddenCwdDescription', '(Overriden) {0}', labelService.getUriLabel(pair.cwd, { relative: !pair.isAbsolute }))
            : labelService.getUriLabel(dirname(pair.cwd), { relative: true });
        return {
            label,
            description: description !== label ? description : undefined,
            pair: pair,
            iconClasses: getIconClasses(modelService, languageService, pair.cwd, FileKind.ROOT_FOLDER),
        };
    });
    const options = {
        placeHolder: localize('workbench.action.terminal.newWorkspacePlaceholder', 'Select current working directory for new terminal'),
        matchOnDescription: true,
        canPickMany: false,
    };
    const token = cancel || CancellationToken.None;
    const pick = await quickInputService.pick(folderPicks, options, token);
    return pick?.pair;
}
async function resolveWorkspaceFolderCwd(folder, configurationService, configurationResolverService) {
    const cwdConfig = configurationService.getValue("terminal.integrated.cwd" /* TerminalSettingId.Cwd */, { resource: folder.uri });
    if (!isString(cwdConfig) || cwdConfig.length === 0) {
        return { folder, cwd: folder.uri, isAbsolute: false, isOverridden: false };
    }
    const resolvedCwdConfig = await configurationResolverService.resolveAsync(folder, cwdConfig);
    return isAbsolute(resolvedCwdConfig) ||
        resolvedCwdConfig.startsWith(ConfigurationResolverExpression.VARIABLE_LHS)
        ? {
            folder,
            isAbsolute: true,
            isOverridden: true,
            cwd: URI.from({ ...folder.uri, path: resolvedCwdConfig }),
        }
        : {
            folder,
            isAbsolute: false,
            isOverridden: true,
            cwd: URI.joinPath(folder.uri, resolvedCwdConfig),
        };
}
/**
 * Drops repeated CWDs, if any, by keeping the one which best matches the workspace folder. It also preserves the original order.
 */
export function shrinkWorkspaceFolderCwdPairs(pairs) {
    const map = new Map();
    for (const pair of pairs) {
        const key = pair.cwd.toString();
        const value = map.get(key);
        if (!value || key === pair.folder.uri.toString()) {
            map.set(key, pair);
        }
    }
    const selectedPairs = new Set(map.values());
    const selectedPairsInOrder = pairs.filter((x) => selectedPairs.has(x));
    return selectedPairsInOrder;
}
async function focusActiveTerminal(instance, c) {
    if (instance.target === TerminalLocation.Editor) {
        await c.editorService.revealActiveEditor();
        await instance.focusWhenReady(true);
    }
    else {
        await c.groupService.showPanel(true);
    }
}
async function renameWithQuickPick(c, accessor, resource) {
    let instance = resource;
    // Check if the 'instance' does not exist or if 'instance.rename' is not defined
    if (!instance || !instance?.rename) {
        // If not, obtain the resource instance using 'getResourceOrActiveInstance'
        instance = getResourceOrActiveInstance(c, resource);
    }
    if (instance) {
        const title = await accessor.get(IQuickInputService).input({
            value: instance.title,
            prompt: localize('workbench.action.terminal.rename.prompt', 'Enter terminal name'),
        });
        if (title) {
            instance.rename(title);
        }
    }
}
function toOptionalUri(obj) {
    return URI.isUri(obj) ? obj : undefined;
}
function toOptionalString(obj) {
    return isString(obj) ? obj : undefined;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxBY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbC9icm93c2VyL3Rlcm1pbmFsQWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDM0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxRQUFRLEVBQW1CLE1BQU0scUNBQXFDLENBQUE7QUFDL0UsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUUvRCxPQUFPLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUU3RixPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQ3hELE9BQU8sRUFBRSxrQ0FBa0MsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQy9HLE9BQU8sRUFDTixPQUFPLEVBQ1AsZUFBZSxFQUVmLE1BQU0sR0FDTixNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNsRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFHckYsT0FBTyxFQUFFLGFBQWEsRUFBRSxN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