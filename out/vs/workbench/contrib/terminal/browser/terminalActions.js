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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxBY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWwvYnJvd3Nlci90ZXJtaW5hbEFjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsUUFBUSxFQUFtQixNQUFNLHFDQUFxQyxDQUFBO0FBQy9FLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFFL0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFFN0YsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsa0NBQWtDLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUMvRyxPQUFPLEVBQ04sT0FBTyxFQUNQLGVBQWUsRUFFZixNQUFNLEdBQ04sTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDbEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBR3JGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw0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