/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { KeyChord } from '../../../../base/common/keyCodes.js';
import { Schemas, matchesScheme } from '../../../../base/common/network.js';
import { extname } from '../../../../base/common/resources.js';
import { isNumber, isObject, isString, isUndefined } from '../../../../base/common/types.js';
import { URI } from '../../../../base/common/uri.js';
import { isDiffEditor } from '../../../../editor/browser/editorBrowser.js';
import { EditorContextKeys } from '../../../../editor/common/editorContextKeys.js';
import { localize, localize2 } from '../../../../nls.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { CommandsRegistry, ICommandService, } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { EditorResolution, } from '../../../../platform/editor/common/editor.js';
import { IInstantiationService, } from '../../../../platform/instantiation/common/instantiation.js';
import { KeybindingsRegistry, } from '../../../../platform/keybinding/common/keybindingsRegistry.js';
import { IListService } from '../../../../platform/list/browser/listService.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { ActiveGroupEditorsByMostRecentlyUsedQuickAccess } from './editorQuickAccess.js';
import { SideBySideEditor } from './sideBySideEditor.js';
import { TextDiffEditor } from './textDiffEditor.js';
import { ActiveEditorCanSplitInGroupContext, ActiveEditorGroupEmptyContext, ActiveEditorGroupLockedContext, ActiveEditorStickyContext, MultipleEditorGroupsContext, SideBySideEditorActiveContext, TextCompareEditorActiveContext, } from '../../../common/contextkeys.js';
import { isEditorInputWithOptionsAndGroup, } from '../../../common/editor.js';
import { DiffEditorInput } from '../../../common/editor/diffEditorInput.js';
import { SideBySideEditorInput } from '../../../common/editor/sideBySideEditorInput.js';
import { columnToEditorGroup, } from '../../../services/editor/common/editorGroupColumn.js';
import { IEditorGroupsService, preferredSideBySideGroupDirection, } from '../../../services/editor/common/editorGroupsService.js';
import { IEditorResolverService } from '../../../services/editor/common/editorResolverService.js';
import { IEditorService, SIDE_GROUP } from '../../../services/editor/common/editorService.js';
import { IPathService } from '../../../services/path/common/pathService.js';
import { IUntitledTextEditorService } from '../../../services/untitled/common/untitledTextEditorService.js';
import { DIFF_FOCUS_OTHER_SIDE, DIFF_FOCUS_PRIMARY_SIDE, DIFF_FOCUS_SECONDARY_SIDE, DIFF_OPEN_SIDE, registerDiffEditorCommands, } from './diffEditorCommands.js';
import { resolveCommandsContext } from './editorCommandsContext.js';
import { prepareMoveCopyEditors } from './editor.js';
export const CLOSE_SAVED_EDITORS_COMMAND_ID = 'workbench.action.closeUnmodifiedEditors';
export const CLOSE_EDITORS_IN_GROUP_COMMAND_ID = 'workbench.action.closeEditorsInGroup';
export const CLOSE_EDITORS_AND_GROUP_COMMAND_ID = 'workbench.action.closeEditorsAndGroup';
export const CLOSE_EDITORS_TO_THE_RIGHT_COMMAND_ID = 'workbench.action.closeEditorsToTheRight';
export const CLOSE_EDITOR_COMMAND_ID = 'workbench.action.closeActiveEditor';
export const CLOSE_PINNED_EDITOR_COMMAND_ID = 'workbench.action.closeActivePinnedEditor';
export const CLOSE_EDITOR_GROUP_COMMAND_ID = 'workbench.action.closeGroup';
export const CLOSE_OTHER_EDITORS_IN_GROUP_COMMAND_ID = 'workbench.action.closeOtherEditors';
export const MOVE_ACTIVE_EDITOR_COMMAND_ID = 'moveActiveEditor';
export const COPY_ACTIVE_EDITOR_COMMAND_ID = 'copyActiveEditor';
export const LAYOUT_EDITOR_GROUPS_COMMAND_ID = 'layoutEditorGroups';
export const KEEP_EDITOR_COMMAND_ID = 'workbench.action.keepEditor';
export const TOGGLE_KEEP_EDITORS_COMMAND_ID = 'workbench.action.toggleKeepEditors';
export const TOGGLE_LOCK_GROUP_COMMAND_ID = 'workbench.action.toggleEditorGroupLock';
export const LOCK_GROUP_COMMAND_ID = 'workbench.action.lockEditorGroup';
export const UNLOCK_GROUP_COMMAND_ID = 'workbench.action.unlockEditorGroup';
export const SHOW_EDITORS_IN_GROUP = 'workbench.action.showEditorsInGroup';
export const REOPEN_WITH_COMMAND_ID = 'workbench.action.reopenWithEditor';
export const PIN_EDITOR_COMMAND_ID = 'workbench.action.pinEditor';
export const UNPIN_EDITOR_COMMAND_ID = 'workbench.action.unpinEditor';
export const SPLIT_EDITOR = 'workbench.action.splitEditor';
export const SPLIT_EDITOR_UP = 'workbench.action.splitEditorUp';
export const SPLIT_EDITOR_DOWN = 'workbench.action.splitEditorDown';
export const SPLIT_EDITOR_LEFT = 'workbench.action.splitEditorLeft';
export const SPLIT_EDITOR_RIGHT = 'workbench.action.splitEditorRight';
export const TOGGLE_MAXIMIZE_EDITOR_GROUP = 'workbench.action.toggleMaximizeEditorGroup';
export const SPLIT_EDITOR_IN_GROUP = 'workbench.action.splitEditorInGroup';
export const TOGGLE_SPLIT_EDITOR_IN_GROUP = 'workbench.action.toggleSplitEditorInGroup';
export const JOIN_EDITOR_IN_GROUP = 'workbench.action.joinEditorInGroup';
export const TOGGLE_SPLIT_EDITOR_IN_GROUP_LAYOUT = 'workbench.action.toggleSplitEditorInGroupLayout';
export const FOCUS_FIRST_SIDE_EDITOR = 'workbench.action.focusFirstSideEditor';
export const FOCUS_SECOND_SIDE_EDITOR = 'workbench.action.focusSecondSideEditor';
export const FOCUS_OTHER_SIDE_EDITOR = 'workbench.action.focusOtherSideEditor';
export const FOCUS_LEFT_GROUP_WITHOUT_WRAP_COMMAND_ID = 'workbench.action.focusLeftGroupWithoutWrap';
export const FOCUS_RIGHT_GROUP_WITHOUT_WRAP_COMMAND_ID = 'workbench.action.focusRightGroupWithoutWrap';
export const FOCUS_ABOVE_GROUP_WITHOUT_WRAP_COMMAND_ID = 'workbench.action.focusAboveGroupWithoutWrap';
export const FOCUS_BELOW_GROUP_WITHOUT_WRAP_COMMAND_ID = 'workbench.action.focusBelowGroupWithoutWrap';
export const OPEN_EDITOR_AT_INDEX_COMMAND_ID = 'workbench.action.openEditorAtIndex';
export const MOVE_EDITOR_INTO_NEW_WINDOW_COMMAND_ID = 'workbench.action.moveEditorToNewWindow';
export const COPY_EDITOR_INTO_NEW_WINDOW_COMMAND_ID = 'workbench.action.copyEditorToNewWindow';
export const MOVE_EDITOR_GROUP_INTO_NEW_WINDOW_COMMAND_ID = 'workbench.action.moveEditorGroupToNewWindow';
export const COPY_EDITOR_GROUP_INTO_NEW_WINDOW_COMMAND_ID = 'workbench.action.copyEditorGroupToNewWindow';
export const NEW_EMPTY_EDITOR_WINDOW_COMMAND_ID = 'workbench.action.newEmptyEditorWindow';
export const API_OPEN_EDITOR_COMMAND_ID = '_workbench.open';
export const API_OPEN_DIFF_EDITOR_COMMAND_ID = '_workbench.diff';
export const API_OPEN_WITH_EDITOR_COMMAND_ID = '_workbench.openWith';
export const EDITOR_CORE_NAVIGATION_COMMANDS = [
    SPLIT_EDITOR,
    CLOSE_EDITOR_COMMAND_ID,
    UNPIN_EDITOR_COMMAND_ID,
    UNLOCK_GROUP_COMMAND_ID,
    TOGGLE_MAXIMIZE_EDITOR_GROUP,
];
const isSelectedEditorsMoveCopyArg = function (arg) {
    if (!isObject(arg)) {
        return false;
    }
    if (!isString(arg.to)) {
        return false;
    }
    if (!isUndefined(arg.by) && !isString(arg.by)) {
        return false;
    }
    if (!isUndefined(arg.value) && !isNumber(arg.value)) {
        return false;
    }
    return true;
};
function registerActiveEditorMoveCopyCommand() {
    const moveCopyJSONSchema = {
        type: 'object',
        required: ['to'],
        properties: {
            to: {
                type: 'string',
                enum: ['left', 'right'],
            },
            by: {
                type: 'string',
                enum: ['tab', 'group'],
            },
            value: {
                type: 'number',
            },
        },
    };
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        id: MOVE_ACTIVE_EDITOR_COMMAND_ID,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        when: EditorContextKeys.editorTextFocus,
        primary: 0,
        handler: (accessor, args) => moveCopySelectedEditors(true, args, accessor),
        metadata: {
            description: localize('editorCommand.activeEditorMove.description', 'Move the active editor by tabs or groups'),
            args: [
                {
                    name: localize('editorCommand.activeEditorMove.arg.name', 'Active editor move argument'),
                    description: localize('editorCommand.activeEditorMove.arg.description', "Argument Properties:\n\t* 'to': String value providing where to move.\n\t* 'by': String value providing the unit for move (by tab or by group).\n\t* 'value': Number value providing how many positions or an absolute position to move."),
                    constraint: isSelectedEditorsMoveCopyArg,
                    schema: moveCopyJSONSchema,
                },
            ],
        },
    });
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        id: COPY_ACTIVE_EDITOR_COMMAND_ID,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        when: EditorContextKeys.editorTextFocus,
        primary: 0,
        handler: (accessor, args) => moveCopySelectedEditors(false, args, accessor),
        metadata: {
            description: localize('editorCommand.activeEditorCopy.description', 'Copy the active editor by groups'),
            args: [
                {
                    name: localize('editorCommand.activeEditorCopy.arg.name', 'Active editor copy argument'),
                    description: localize('editorCommand.activeEditorCopy.arg.description', "Argument Properties:\n\t* 'to': String value providing where to copy.\n\t* 'value': Number value providing how many positions or an absolute position to copy."),
                    constraint: isSelectedEditorsMoveCopyArg,
                    schema: moveCopyJSONSchema,
                },
            ],
        },
    });
    function moveCopySelectedEditors(isMove, args = Object.create(null), accessor) {
        args.to = args.to || 'right';
        args.by = args.by || 'tab';
        args.value = typeof args.value === 'number' ? args.value : 1;
        const activeGroup = accessor.get(IEditorGroupsService).activeGroup;
        const selectedEditors = activeGroup.selectedEditors;
        if (selectedEditors.length > 0) {
            switch (args.by) {
                case 'tab':
                    if (isMove) {
                        return moveTabs(args, activeGroup, selectedEditors);
                    }
                    break;
                case 'group':
                    return moveCopyActiveEditorToGroup(isMove, args, activeGroup, selectedEditors, accessor);
            }
        }
    }
    function moveTabs(args, group, editors) {
        const to = args.to;
        if (to === 'first' || to === 'right') {
            editors = [...editors].reverse();
        }
        else if (to === 'position' && (args.value ?? 1) < group.getIndexOfEditor(editors[0])) {
            editors = [...editors].reverse();
        }
        for (const editor of editors) {
            moveTab(args, group, editor);
        }
    }
    function moveTab(args, group, editor) {
        let index = group.getIndexOfEditor(editor);
        switch (args.to) {
            case 'first':
                index = 0;
                break;
            case 'last':
                index = group.count - 1;
                break;
            case 'left':
                index = index - (args.value ?? 1);
                break;
            case 'right':
                index = index + (args.value ?? 1);
                break;
            case 'center':
                index = Math.round(group.count / 2) - 1;
                break;
            case 'position':
                index = (args.value ?? 1) - 1;
                break;
        }
        index = index < 0 ? 0 : index >= group.count ? group.count - 1 : index;
        group.moveEditor(editor, group, { index });
    }
    function moveCopyActiveEditorToGroup(isMove, args, sourceGroup, editors, accessor) {
        const editorGroupsService = accessor.get(IEditorGroupsService);
        const configurationService = accessor.get(IConfigurationService);
        let targetGroup;
        switch (args.to) {
            case 'left':
                targetGroup = editorGroupsService.findGroup({ direction: 2 /* GroupDirection.LEFT */ }, sourceGroup);
                if (!targetGroup) {
                    targetGroup = editorGroupsService.addGroup(sourceGroup, 2 /* GroupDirection.LEFT */);
                }
                break;
            case 'right':
                targetGroup = editorGroupsService.findGroup({ direction: 3 /* GroupDirection.RIGHT */ }, sourceGroup);
                if (!targetGroup) {
                    targetGroup = editorGroupsService.addGroup(sourceGroup, 3 /* GroupDirection.RIGHT */);
                }
                break;
            case 'up':
                targetGroup = editorGroupsService.findGroup({ direction: 0 /* GroupDirection.UP */ }, sourceGroup);
                if (!targetGroup) {
                    targetGroup = editorGroupsService.addGroup(sourceGroup, 0 /* GroupDirection.UP */);
                }
                break;
            case 'down':
                targetGroup = editorGroupsService.findGroup({ direction: 1 /* GroupDirection.DOWN */ }, sourceGroup);
                if (!targetGroup) {
                    targetGroup = editorGroupsService.addGroup(sourceGroup, 1 /* GroupDirection.DOWN */);
                }
                break;
            case 'first':
                targetGroup = editorGroupsService.findGroup({ location: 0 /* GroupLocation.FIRST */ }, sourceGroup);
                break;
            case 'last':
                targetGroup = editorGroupsService.findGroup({ location: 1 /* GroupLocation.LAST */ }, sourceGroup);
                break;
            case 'previous':
                targetGroup = editorGroupsService.findGroup({ location: 3 /* GroupLocation.PREVIOUS */ }, sourceGroup);
                break;
            case 'next':
                targetGroup = editorGroupsService.findGroup({ location: 2 /* GroupLocation.NEXT */ }, sourceGroup);
                if (!targetGroup) {
                    targetGroup = editorGroupsService.addGroup(sourceGroup, preferredSideBySideGroupDirection(configurationService));
                }
                break;
            case 'center':
                targetGroup = editorGroupsService.getGroups(2 /* GroupsOrder.GRID_APPEARANCE */)[editorGroupsService.count / 2 - 1];
                break;
            case 'position':
                targetGroup = editorGroupsService.getGroups(2 /* GroupsOrder.GRID_APPEARANCE */)[(args.value ?? 1) - 1];
                break;
        }
        if (targetGroup) {
            const editorsWithOptions = prepareMoveCopyEditors(sourceGroup, editors);
            if (isMove) {
                sourceGroup.moveEditors(editorsWithOptions, targetGroup);
            }
            else if (sourceGroup.id !== targetGroup.id) {
                sourceGroup.copyEditors(editorsWithOptions, targetGroup);
            }
            targetGroup.focus();
        }
    }
}
function registerEditorGroupsLayoutCommands() {
    function applyEditorLayout(accessor, layout) {
        if (!layout || typeof layout !== 'object') {
            return;
        }
        const editorGroupsService = accessor.get(IEditorGroupsService);
        editorGroupsService.applyLayout(layout);
    }
    CommandsRegistry.registerCommand(LAYOUT_EDITOR_GROUPS_COMMAND_ID, (accessor, args) => {
        applyEditorLayout(accessor, args);
    });
    // API Commands
    CommandsRegistry.registerCommand({
        id: 'vscode.setEditorLayout',
        handler: (accessor, args) => applyEditorLayout(accessor, args),
        metadata: {
            description: `Set the editor layout. Editor layout is represented as a tree of groups in which the first group is the root group of the layout.
					The orientation of the first group is 0 (horizontal) by default unless specified otherwise. The other orientations are 1 (vertical).
					The orientation of subsequent groups is the opposite of the orientation of the group that contains it.
					Here are some examples: A layout representing 1 row and 2 columns: { orientation: 0, groups: [{}, {}] }.
					A layout representing 3 rows and 1 column: { orientation: 1, groups: [{}, {}, {}] }.
					A layout representing 3 rows and 1 column in which the second row has 2 columns: { orientation: 1, groups: [{}, { groups: [{}, {}] }, {}] }
					`,
            args: [
                {
                    name: 'args',
                    schema: {
                        type: 'object',
                        required: ['groups'],
                        properties: {
                            orientation: {
                                type: 'number',
                                default: 0,
                                description: `The orientation of the root group in the layout. 0 for horizontal, 1 for vertical.`,
                                enum: [0, 1],
                                enumDescriptions: [
                                    localize('editorGroupLayout.horizontal', 'Horizontal'),
                                    localize('editorGroupLayout.vertical', 'Vertical'),
                                ],
                            },
                            groups: {
                                $ref: '#/definitions/editorGroupsSchema',
                                default: [{}, {}],
                            },
                        },
                    },
                },
            ],
        },
    });
    CommandsRegistry.registerCommand({
        id: 'vscode.getEditorLayout',
        handler: (accessor) => {
            const editorGroupsService = accessor.get(IEditorGroupsService);
            return editorGroupsService.getLayout();
        },
        metadata: {
            description: 'Get Editor Layout',
            args: [],
            returns: 'An editor layout object, in the same format as vscode.setEditorLayout',
        },
    });
}
function registerOpenEditorAPICommands() {
    function mixinContext(context, options, column) {
        if (!context) {
            return [options, column];
        }
        return [
            { ...context.editorOptions, ...(options ?? Object.create(null)) },
            context.sideBySide ? SIDE_GROUP : column,
        ];
    }
    // partial, renderer-side API command to open editor
    // complements https://github.com/microsoft/vscode/blob/2b164efb0e6a5de3826bff62683eaeafe032284f/src/vs/workbench/api/common/extHostApiCommands.ts#L373
    CommandsRegistry.registerCommand({
        id: 'vscode.open',
        handler: (accessor, arg) => {
            accessor.get(ICommandService).executeCommand(API_OPEN_EDITOR_COMMAND_ID, arg);
        },
        metadata: {
            description: 'Opens the provided resource in the editor.',
            args: [{ name: 'Uri' }],
        },
    });
    CommandsRegistry.registerCommand(API_OPEN_EDITOR_COMMAND_ID, async function (accessor, resourceArg, columnAndOptions, label, context) {
        const editorService = accessor.get(IEditorService);
        const editorGroupsService = accessor.get(IEditorGroupsService);
        const openerService = accessor.get(IOpenerService);
        const pathService = accessor.get(IPathService);
        const configurationService = accessor.get(IConfigurationService);
        const untitledTextEditorService = accessor.get(IUntitledTextEditorService);
        const resourceOrString = typeof resourceArg === 'string' ? resourceArg : URI.from(resourceArg, true);
        const [columnArg, optionsArg] = columnAndOptions ?? [];
        // use editor options or editor view column or resource scheme
        // as a hint to use the editor service for opening directly
        if (optionsArg ||
            typeof columnArg === 'number' ||
            matchesScheme(resourceOrString, Schemas.untitled)) {
            const [options, column] = mixinContext(context, optionsArg, columnArg);
            const resource = URI.isUri(resourceOrString)
                ? resourceOrString
                : URI.parse(resourceOrString);
            let input;
            if (untitledTextEditorService.isUntitledWithAssociatedResource(resource)) {
                // special case for untitled: we are getting a resource with meaningful
                // path from an extension to use for the untitled editor. as such, we
                // have to assume it as an associated resource to use when saving. we
                // do so by setting the `forceUntitled: true` and changing the scheme
                // to a file based one. the untitled editor service takes care to
                // associate the path properly then.
                input = {
                    resource: resource.with({ scheme: pathService.defaultUriScheme }),
                    forceUntitled: true,
                    options,
                    label,
                };
            }
            else {
                // use any other resource as is
                input = { resource, options, label };
            }
            await editorService.openEditor(input, columnToEditorGroup(editorGroupsService, configurationService, column));
        }
        // do not allow to execute commands from here
        else if (matchesScheme(resourceOrString, Schemas.command)) {
            return;
        }
        // finally, delegate to opener service
        else {
            await openerService.open(resourceOrString, {
                openToSide: context?.sideBySide,
                editorOptions: context?.editorOptions,
            });
        }
    });
    // partial, renderer-side API command to open diff editor
    // complements https://github.com/microsoft/vscode/blob/2b164efb0e6a5de3826bff62683eaeafe032284f/src/vs/workbench/api/common/extHostApiCommands.ts#L397
    CommandsRegistry.registerCommand({
        id: 'vscode.diff',
        handler: (accessor, left, right, label) => {
            accessor
                .get(ICommandService)
                .executeCommand(API_OPEN_DIFF_EDITOR_COMMAND_ID, left, right, label);
        },
        metadata: {
            description: 'Opens the provided resources in the diff editor to compare their contents.',
            args: [
                { name: 'left', description: 'Left-hand side resource of the diff editor' },
                { name: 'right', description: 'Right-hand side resource of the diff editor' },
                { name: 'title', description: 'Human readable title for the diff editor' },
            ],
        },
    });
    CommandsRegistry.registerCommand(API_OPEN_DIFF_EDITOR_COMMAND_ID, async function (accessor, originalResource, modifiedResource, labelAndOrDescription, columnAndOptions, context) {
        const editorService = accessor.get(IEditorService);
        const editorGroupsService = accessor.get(IEditorGroupsService);
        const configurationService = accessor.get(IConfigurationService);
        const [columnArg, optionsArg] = columnAndOptions ?? [];
        const [options, column] = mixinContext(context, optionsArg, columnArg);
        let label = undefined;
        let description = undefined;
        if (typeof labelAndOrDescription === 'string') {
            label = labelAndOrDescription;
        }
        else if (labelAndOrDescription) {
            label = labelAndOrDescription.label;
            description = labelAndOrDescription.description;
        }
        await editorService.openEditor({
            original: { resource: URI.from(originalResource, true) },
            modified: { resource: URI.from(modifiedResource, true) },
            label,
            description,
            options,
        }, columnToEditorGroup(editorGroupsService, configurationService, column));
    });
    CommandsRegistry.registerCommand(API_OPEN_WITH_EDITOR_COMMAND_ID, async (accessor, resource, id, columnAndOptions) => {
        const editorService = accessor.get(IEditorService);
        const editorGroupsService = accessor.get(IEditorGroupsService);
        const configurationService = accessor.get(IConfigurationService);
        const [columnArg, optionsArg] = columnAndOptions ?? [];
        await editorService.openEditor({
            resource: URI.from(resource, true),
            options: { pinned: true, ...optionsArg, override: id },
        }, columnToEditorGroup(editorGroupsService, configurationService, columnArg));
    });
    // partial, renderer-side API command to open diff editor
    // complements https://github.com/microsoft/vscode/blob/2b164efb0e6a5de3826bff62683eaeafe032284f/src/vs/workbench/api/common/extHostApiCommands.ts#L397
    CommandsRegistry.registerCommand({
        id: 'vscode.changes',
        handler: (accessor, title, resources) => {
            accessor.get(ICommandService).executeCommand('_workbench.changes', title, resources);
        },
        metadata: {
            description: 'Opens a list of resources in the changes editor to compare their contents.',
            args: [
                { name: 'title', description: 'Human readable title for the diff editor' },
                { name: 'resources', description: 'List of resources to open in the changes editor' },
            ],
        },
    });
    CommandsRegistry.registerCommand('_workbench.changes', async (accessor, title, resources) => {
        const editorService = accessor.get(IEditorService);
        const editor = [];
        for (const [label, original, modified] of resources) {
            editor.push({
                resource: URI.revive(label),
                original: { resource: URI.revive(original) },
                modified: { resource: URI.revive(modified) },
            });
        }
        await editorService.openEditor({ resources: editor, label: title });
    });
    CommandsRegistry.registerCommand('_workbench.openMultiDiffEditor', async (accessor, options) => {
        const editorService = accessor.get(IEditorService);
        await editorService.openEditor({
            multiDiffSource: options.multiDiffSourceUri
                ? URI.revive(options.multiDiffSourceUri)
                : undefined,
            resources: options.resources?.map((r) => ({
                original: { resource: URI.revive(r.originalUri) },
                modified: { resource: URI.revive(r.modifiedUri) },
            })),
            label: options.title,
        });
    });
}
function registerOpenEditorAtIndexCommands() {
    const openEditorAtIndex = (accessor, editorIndex) => {
        const editorService = accessor.get(IEditorService);
        const activeEditorPane = editorService.activeEditorPane;
        if (activeEditorPane) {
            const editor = activeEditorPane.group.getEditorByIndex(editorIndex);
            if (editor) {
                editorService.openEditor(editor);
            }
        }
    };
    // This command takes in the editor index number to open as an argument
    CommandsRegistry.registerCommand({
        id: OPEN_EDITOR_AT_INDEX_COMMAND_ID,
        handler: openEditorAtIndex,
    });
    // Keybindings to focus a specific index in the tab folder if tabs are enabled
    for (let i = 0; i < 9; i++) {
        const editorIndex = i;
        const visibleIndex = i + 1;
        KeybindingsRegistry.registerCommandAndKeybindingRule({
            id: OPEN_EDITOR_AT_INDEX_COMMAND_ID + visibleIndex,
            weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            when: undefined,
            primary: 512 /* KeyMod.Alt */ | toKeyCode(visibleIndex),
            mac: { primary: 256 /* KeyMod.WinCtrl */ | toKeyCode(visibleIndex) },
            handler: (accessor) => openEditorAtIndex(accessor, editorIndex),
        });
    }
    function toKeyCode(index) {
        switch (index) {
            case 0:
                return 21 /* KeyCode.Digit0 */;
            case 1:
                return 22 /* KeyCode.Digit1 */;
            case 2:
                return 23 /* KeyCode.Digit2 */;
            case 3:
                return 24 /* KeyCode.Digit3 */;
            case 4:
                return 25 /* KeyCode.Digit4 */;
            case 5:
                return 26 /* KeyCode.Digit5 */;
            case 6:
                return 27 /* KeyCode.Digit6 */;
            case 7:
                return 28 /* KeyCode.Digit7 */;
            case 8:
                return 29 /* KeyCode.Digit8 */;
            case 9:
                return 30 /* KeyCode.Digit9 */;
        }
        throw new Error('invalid index');
    }
}
function registerFocusEditorGroupAtIndexCommands() {
    // Keybindings to focus a specific group (2-8) in the editor area
    for (let groupIndex = 1; groupIndex < 8; groupIndex++) {
        KeybindingsRegistry.registerCommandAndKeybindingRule({
            id: toCommandId(groupIndex),
            weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            when: undefined,
            primary: 2048 /* KeyMod.CtrlCmd */ | toKeyCode(groupIndex),
            handler: (accessor) => {
                const editorGroupsService = accessor.get(IEditorGroupsService);
                const configurationService = accessor.get(IConfigurationService);
                // To keep backwards compatibility (pre-grid), allow to focus a group
                // that does not exist as long as it is the next group after the last
                // opened group. Otherwise we return.
                if (groupIndex > editorGroupsService.count) {
                    return;
                }
                // Group exists: just focus
                const groups = editorGroupsService.getGroups(2 /* GroupsOrder.GRID_APPEARANCE */);
                if (groups[groupIndex]) {
                    return groups[groupIndex].focus();
                }
                // Group does not exist: create new by splitting the active one of the last group
                const direction = preferredSideBySideGroupDirection(configurationService);
                const lastGroup = editorGroupsService.findGroup({ location: 1 /* GroupLocation.LAST */ });
                if (!lastGroup) {
                    return;
                }
                const newGroup = editorGroupsService.addGroup(lastGroup, direction);
                // Focus
                newGroup.focus();
            },
        });
    }
    function toCommandId(index) {
        switch (index) {
            case 1:
                return 'workbench.action.focusSecondEditorGroup';
            case 2:
                return 'workbench.action.focusThirdEditorGroup';
            case 3:
                return 'workbench.action.focusFourthEditorGroup';
            case 4:
                return 'workbench.action.focusFifthEditorGroup';
            case 5:
                return 'workbench.action.focusSixthEditorGroup';
            case 6:
                return 'workbench.action.focusSeventhEditorGroup';
            case 7:
                return 'workbench.action.focusEighthEditorGroup';
        }
        throw new Error('Invalid index');
    }
    function toKeyCode(index) {
        switch (index) {
            case 1:
                return 23 /* KeyCode.Digit2 */;
            case 2:
                return 24 /* KeyCode.Digit3 */;
            case 3:
                return 25 /* KeyCode.Digit4 */;
            case 4:
                return 26 /* KeyCode.Digit5 */;
            case 5:
                return 27 /* KeyCode.Digit6 */;
            case 6:
                return 28 /* KeyCode.Digit7 */;
            case 7:
                return 29 /* KeyCode.Digit8 */;
        }
        throw new Error('Invalid index');
    }
}
export function splitEditor(editorGroupsService, direction, resolvedContext) {
    if (!resolvedContext.groupedEditors.length) {
        return;
    }
    // Only support splitting from one source group
    const { group, editors } = resolvedContext.groupedEditors[0];
    const preserveFocus = resolvedContext.preserveFocus;
    const newGroup = editorGroupsService.addGroup(group, direction);
    for (const editorToCopy of editors) {
        // Split editor (if it can be split)
        if (editorToCopy && !editorToCopy.hasCapability(8 /* EditorInputCapabilities.Singleton */)) {
            group.copyEditor(editorToCopy, newGroup, { preserveFocus });
        }
    }
    // Focus
    newGroup.focus();
}
function registerSplitEditorCommands() {
    ;
    [
        { id: SPLIT_EDITOR_UP, direction: 0 /* GroupDirection.UP */ },
        { id: SPLIT_EDITOR_DOWN, direction: 1 /* GroupDirection.DOWN */ },
        { id: SPLIT_EDITOR_LEFT, direction: 2 /* GroupDirection.LEFT */ },
        { id: SPLIT_EDITOR_RIGHT, direction: 3 /* GroupDirection.RIGHT */ },
    ].forEach(({ id, direction }) => {
        CommandsRegistry.registerCommand(id, function (accessor, ...args) {
            const resolvedContext = resolveCommandsContext(args, accessor.get(IEditorService), accessor.get(IEditorGroupsService), accessor.get(IListService));
            splitEditor(accessor.get(IEditorGroupsService), direction, resolvedContext);
        });
    });
}
function registerCloseEditorCommands() {
    // A special handler for "Close Editor" depending on context
    // - keybindining: do not close sticky editors, rather open the next non-sticky editor
    // - menu: always close editor, even sticky ones
    function closeEditorHandler(accessor, forceCloseStickyEditors, ...args) {
        const editorGroupsService = accessor.get(IEditorGroupsService);
        const editorService = accessor.get(IEditorService);
        let keepStickyEditors = undefined;
        if (forceCloseStickyEditors) {
            keepStickyEditors = false; // explicitly close sticky editors
        }
        else if (args.length) {
            keepStickyEditors = false; // we have a context, as such this command was used e.g. from the tab context menu
        }
        else {
            keepStickyEditors =
                editorGroupsService.partOptions.preventPinnedEditorClose === 'keyboard' ||
                    editorGroupsService.partOptions.preventPinnedEditorClose === 'keyboardAndMouse'; // respect setting otherwise
        }
        // Skip over sticky editor and select next if we are configured to do so
        if (keepStickyEditors) {
            const activeGroup = editorGroupsService.activeGroup;
            const activeEditor = activeGroup.activeEditor;
            if (activeEditor && activeGroup.isSticky(activeEditor)) {
                // Open next recently active in same group
                const nextNonStickyEditorInGroup = activeGroup.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */, { excludeSticky: true })[0];
                if (nextNonStickyEditorInGroup) {
                    return activeGroup.openEditor(nextNonStickyEditorInGroup);
                }
                // Open next recently active across all groups
                const nextNonStickyEditorInAllGroups = editorService.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */, { excludeSticky: true })[0];
                if (nextNonStickyEditorInAllGroups) {
                    return Promise.resolve(editorGroupsService
                        .getGroup(nextNonStickyEditorInAllGroups.groupId)
                        ?.openEditor(nextNonStickyEditorInAllGroups.editor));
                }
            }
        }
        // With context: proceed to close editors as instructed
        const resolvedContext = resolveCommandsContext(args, accessor.get(IEditorService), accessor.get(IEditorGroupsService), accessor.get(IListService));
        const preserveFocus = resolvedContext.preserveFocus;
        return Promise.all(resolvedContext.groupedEditors.map(async ({ group, editors }) => {
            const editorsToClose = editors.filter((editor) => !keepStickyEditors || !group.isSticky(editor));
            await group.closeEditors(editorsToClose, { preserveFocus });
        }));
    }
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        id: CLOSE_EDITOR_COMMAND_ID,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        when: undefined,
        primary: 2048 /* KeyMod.CtrlCmd */ | 53 /* KeyCode.KeyW */,
        win: { primary: 2048 /* KeyMod.CtrlCmd */ | 62 /* KeyCode.F4 */, secondary: [2048 /* KeyMod.CtrlCmd */ | 53 /* KeyCode.KeyW */] },
        handler: (accessor, ...args) => {
            return closeEditorHandler(accessor, false, ...args);
        },
    });
    CommandsRegistry.registerCommand(CLOSE_PINNED_EDITOR_COMMAND_ID, (accessor, ...args) => {
        return closeEditorHandler(accessor, true /* force close pinned editors */, ...args);
    });
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        id: CLOSE_EDITORS_IN_GROUP_COMMAND_ID,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        when: undefined,
        primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 53 /* KeyCode.KeyW */),
        handler: (accessor, ...args) => {
            const resolvedContext = resolveCommandsContext(args, accessor.get(IEditorService), accessor.get(IEditorGroupsService), accessor.get(IListService));
            return Promise.all(resolvedContext.groupedEditors.map(async ({ group }) => {
                await group.closeAllEditors({ excludeSticky: true });
            }));
        },
    });
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        id: CLOSE_EDITOR_GROUP_COMMAND_ID,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        when: ContextKeyExpr.and(ActiveEditorGroupEmptyContext, MultipleEditorGroupsContext),
        primary: 2048 /* KeyMod.CtrlCmd */ | 53 /* KeyCode.KeyW */,
        win: { primary: 2048 /* KeyMod.CtrlCmd */ | 62 /* KeyCode.F4 */, secondary: [2048 /* KeyMod.CtrlCmd */ | 53 /* KeyCode.KeyW */] },
        handler: (accessor, ...args) => {
            const editorGroupsService = accessor.get(IEditorGroupsService);
            const commandsContext = resolveCommandsContext(args, accessor.get(IEditorService), editorGroupsService, accessor.get(IListService));
            if (commandsContext.groupedEditors.length) {
                editorGroupsService.removeGroup(commandsContext.groupedEditors[0].group);
            }
        },
    });
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        id: CLOSE_SAVED_EDITORS_COMMAND_ID,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        when: undefined,
        primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 51 /* KeyCode.KeyU */),
        handler: (accessor, ...args) => {
            const resolvedContext = resolveCommandsContext(args, accessor.get(IEditorService), accessor.get(IEditorGroupsService), accessor.get(IListService));
            return Promise.all(resolvedContext.groupedEditors.map(async ({ group }) => {
                await group.closeEditors({ savedOnly: true, excludeSticky: true }, { preserveFocus: resolvedContext.preserveFocus });
            }));
        },
    });
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        id: CLOSE_OTHER_EDITORS_IN_GROUP_COMMAND_ID,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        when: undefined,
        primary: undefined,
        mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 50 /* KeyCode.KeyT */ },
        handler: (accessor, ...args) => {
            const resolvedContext = resolveCommandsContext(args, accessor.get(IEditorService), accessor.get(IEditorGroupsService), accessor.get(IListService));
            return Promise.all(resolvedContext.groupedEditors.map(async ({ group, editors }) => {
                const editorsToClose = group
                    .getEditors(1 /* EditorsOrder.SEQUENTIAL */, { excludeSticky: true })
                    .filter((editor) => !editors.includes(editor));
                for (const editorToKeep of editors) {
                    if (editorToKeep) {
                        group.pinEditor(editorToKeep);
                    }
                }
                await group.closeEditors(editorsToClose, { preserveFocus: resolvedContext.preserveFocus });
            }));
        },
    });
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        id: CLOSE_EDITORS_TO_THE_RIGHT_COMMAND_ID,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        when: undefined,
        primary: undefined,
        handler: async (accessor, ...args) => {
            const resolvedContext = resolveCommandsContext(args, accessor.get(IEditorService), accessor.get(IEditorGroupsService), accessor.get(IListService));
            if (resolvedContext.groupedEditors.length) {
                const { group, editors } = resolvedContext.groupedEditors[0];
                if (group.activeEditor) {
                    group.pinEditor(group.activeEditor);
                }
                await group.closeEditors({ direction: 1 /* CloseDirection.RIGHT */, except: editors[0], excludeSticky: true }, { preserveFocus: resolvedContext.preserveFocus });
            }
        },
    });
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        id: REOPEN_WITH_COMMAND_ID,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        when: undefined,
        primary: undefined,
        handler: async (accessor, ...args) => {
            const editorService = accessor.get(IEditorService);
            const editorResolverService = accessor.get(IEditorResolverService);
            const telemetryService = accessor.get(ITelemetryService);
            const resolvedContext = resolveCommandsContext(args, editorService, accessor.get(IEditorGroupsService), accessor.get(IListService));
            const editorReplacements = new Map();
            for (const { group, editors } of resolvedContext.groupedEditors) {
                for (const editor of editors) {
                    const untypedEditor = editor.toUntyped();
                    if (!untypedEditor) {
                        return; // Resolver can only resolve untyped editors
                    }
                    untypedEditor.options = {
                        ...editorService.activeEditorPane?.options,
                        override: EditorResolution.PICK,
                    };
                    const resolvedEditor = await editorResolverService.resolveEditor(untypedEditor, group);
                    if (!isEditorInputWithOptionsAndGroup(resolvedEditor)) {
                        return;
                    }
                    let editorReplacementsInGroup = editorReplacements.get(group);
                    if (!editorReplacementsInGroup) {
                        editorReplacementsInGroup = [];
                        editorReplacements.set(group, editorReplacementsInGroup);
                    }
                    editorReplacementsInGroup.push({
                        editor: editor,
                        replacement: resolvedEditor.editor,
                        forceReplaceDirty: editor.resource?.scheme === Schemas.untitled,
                        options: resolvedEditor.options,
                    });
                    telemetryService.publicLog2('workbenchEditorReopen', {
                        scheme: editor.resource?.scheme ?? '',
                        ext: editor.resource ? extname(editor.resource) : '',
                        from: editor.editorId ?? '',
                        to: resolvedEditor.editor.editorId ?? '',
                    });
                }
            }
            // Replace editor with resolved one and make active
            for (const [group, replacements] of editorReplacements) {
                await group.replaceEditors(replacements);
                await group.openEditor(replacements[0].replacement);
            }
        },
    });
    CommandsRegistry.registerCommand(CLOSE_EDITORS_AND_GROUP_COMMAND_ID, async (accessor, ...args) => {
        const editorGroupsService = accessor.get(IEditorGroupsService);
        const resolvedContext = resolveCommandsContext(args, accessor.get(IEditorService), editorGroupsService, accessor.get(IListService));
        if (resolvedContext.groupedEditors.length) {
            const { group } = resolvedContext.groupedEditors[0];
            await group.closeAllEditors();
            if (group.count === 0 &&
                editorGroupsService.getGroup(group.id) /* could be gone by now */) {
                editorGroupsService.removeGroup(group); // only remove group if it is now empty
            }
        }
    });
}
function registerFocusEditorGroupWihoutWrapCommands() {
    const commands = [
        {
            id: FOCUS_LEFT_GROUP_WITHOUT_WRAP_COMMAND_ID,
            direction: 2 /* GroupDirection.LEFT */,
        },
        {
            id: FOCUS_RIGHT_GROUP_WITHOUT_WRAP_COMMAND_ID,
            direction: 3 /* GroupDirection.RIGHT */,
        },
        {
            id: FOCUS_ABOVE_GROUP_WITHOUT_WRAP_COMMAND_ID,
            direction: 0 /* GroupDirection.UP */,
        },
        {
            id: FOCUS_BELOW_GROUP_WITHOUT_WRAP_COMMAND_ID,
            direction: 1 /* GroupDirection.DOWN */,
        },
    ];
    for (const command of commands) {
        CommandsRegistry.registerCommand(command.id, async (accessor) => {
            const editorGroupsService = accessor.get(IEditorGroupsService);
            const group = editorGroupsService.findGroup({ direction: command.direction }, editorGroupsService.activeGroup, false) ?? editorGroupsService.activeGroup;
            group.focus();
        });
    }
}
function registerSplitEditorInGroupCommands() {
    async function splitEditorInGroup(accessor, resolvedContext) {
        const instantiationService = accessor.get(IInstantiationService);
        if (!resolvedContext.groupedEditors.length) {
            return;
        }
        const { group, editors } = resolvedContext.groupedEditors[0];
        const editor = editors[0];
        if (!editor) {
            return;
        }
        await group.replaceEditors([
            {
                editor,
                replacement: instantiationService.createInstance(SideBySideEditorInput, undefined, undefined, editor, editor),
                forceReplaceDirty: true,
            },
        ]);
    }
    registerAction2(class extends Action2 {
        constructor() {
            super({
                id: SPLIT_EDITOR_IN_GROUP,
                title: localize2('splitEditorInGroup', 'Split Editor in Group'),
                category: Categories.View,
                precondition: ActiveEditorCanSplitInGroupContext,
                f1: true,
                keybinding: {
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                    when: ActiveEditorCanSplitInGroupContext,
                    primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 93 /* KeyCode.Backslash */),
                },
            });
        }
        run(accessor, ...args) {
            return splitEditorInGroup(accessor, resolveCommandsContext(args, accessor.get(IEditorService), accessor.get(IEditorGroupsService), accessor.get(IListService)));
        }
    });
    async function joinEditorInGroup(resolvedContext) {
        if (!resolvedContext.groupedEditors.length) {
            return;
        }
        const { group, editors } = resolvedContext.groupedEditors[0];
        const editor = editors[0];
        if (!editor) {
            return;
        }
        if (!(editor instanceof SideBySideEditorInput)) {
            return;
        }
        let options = undefined;
        const activeEditorPane = group.activeEditorPane;
        if (activeEditorPane instanceof SideBySideEditor && group.activeEditor === editor) {
            for (const pane of [
                activeEditorPane.getPrimaryEditorPane(),
                activeEditorPane.getSecondaryEditorPane(),
            ]) {
                if (pane?.hasFocus()) {
                    options = { viewState: pane.getViewState() };
                    break;
                }
            }
        }
        await group.replaceEditors([
            {
                editor,
                replacement: editor.primary,
                options,
            },
        ]);
    }
    registerAction2(class extends Action2 {
        constructor() {
            super({
                id: JOIN_EDITOR_IN_GROUP,
                title: localize2('joinEditorInGroup', 'Join Editor in Group'),
                category: Categories.View,
                precondition: SideBySideEditorActiveContext,
                f1: true,
                keybinding: {
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                    when: SideBySideEditorActiveContext,
                    primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 93 /* KeyCode.Backslash */),
                },
            });
        }
        run(accessor, ...args) {
            return joinEditorInGroup(resolveCommandsContext(args, accessor.get(IEditorService), accessor.get(IEditorGroupsService), accessor.get(IListService)));
        }
    });
    registerAction2(class extends Action2 {
        constructor() {
            super({
                id: TOGGLE_SPLIT_EDITOR_IN_GROUP,
                title: localize2('toggleJoinEditorInGroup', 'Toggle Split Editor in Group'),
                category: Categories.View,
                precondition: ContextKeyExpr.or(ActiveEditorCanSplitInGroupContext, SideBySideEditorActiveContext),
                f1: true,
            });
        }
        async run(accessor, ...args) {
            const resolvedContext = resolveCommandsContext(args, accessor.get(IEditorService), accessor.get(IEditorGroupsService), accessor.get(IListService));
            if (!resolvedContext.groupedEditors.length) {
                return;
            }
            const { editors } = resolvedContext.groupedEditors[0];
            if (editors[0] instanceof SideBySideEditorInput) {
                await joinEditorInGroup(resolvedContext);
            }
            else if (editors[0]) {
                await splitEditorInGroup(accessor, resolvedContext);
            }
        }
    });
    registerAction2(class extends Action2 {
        constructor() {
            super({
                id: TOGGLE_SPLIT_EDITOR_IN_GROUP_LAYOUT,
                title: localize2('toggleSplitEditorInGroupLayout', 'Toggle Layout of Split Editor in Group'),
                category: Categories.View,
                precondition: SideBySideEditorActiveContext,
                f1: true,
            });
        }
        async run(accessor) {
            const configurationService = accessor.get(IConfigurationService);
            const currentSetting = configurationService.getValue(SideBySideEditor.SIDE_BY_SIDE_LAYOUT_SETTING);
            let newSetting;
            if (currentSetting !== 'horizontal') {
                newSetting = 'horizontal';
            }
            else {
                newSetting = 'vertical';
            }
            return configurationService.updateValue(SideBySideEditor.SIDE_BY_SIDE_LAYOUT_SETTING, newSetting);
        }
    });
}
function registerFocusSideEditorsCommands() {
    registerAction2(class extends Action2 {
        constructor() {
            super({
                id: FOCUS_FIRST_SIDE_EDITOR,
                title: localize2('focusLeftSideEditor', 'Focus First Side in Active Editor'),
                category: Categories.View,
                precondition: ContextKeyExpr.or(SideBySideEditorActiveContext, TextCompareEditorActiveContext),
                f1: true,
            });
        }
        async run(accessor) {
            const editorService = accessor.get(IEditorService);
            const commandService = accessor.get(ICommandService);
            const activeEditorPane = editorService.activeEditorPane;
            if (activeEditorPane instanceof SideBySideEditor) {
                activeEditorPane.getSecondaryEditorPane()?.focus();
            }
            else if (activeEditorPane instanceof TextDiffEditor) {
                await commandService.executeCommand(DIFF_FOCUS_SECONDARY_SIDE);
            }
        }
    });
    registerAction2(class extends Action2 {
        constructor() {
            super({
                id: FOCUS_SECOND_SIDE_EDITOR,
                title: localize2('focusRightSideEditor', 'Focus Second Side in Active Editor'),
                category: Categories.View,
                precondition: ContextKeyExpr.or(SideBySideEditorActiveContext, TextCompareEditorActiveContext),
                f1: true,
            });
        }
        async run(accessor) {
            const editorService = accessor.get(IEditorService);
            const commandService = accessor.get(ICommandService);
            const activeEditorPane = editorService.activeEditorPane;
            if (activeEditorPane instanceof SideBySideEditor) {
                activeEditorPane.getPrimaryEditorPane()?.focus();
            }
            else if (activeEditorPane instanceof TextDiffEditor) {
                await commandService.executeCommand(DIFF_FOCUS_PRIMARY_SIDE);
            }
        }
    });
    registerAction2(class extends Action2 {
        constructor() {
            super({
                id: FOCUS_OTHER_SIDE_EDITOR,
                title: localize2('focusOtherSideEditor', 'Focus Other Side in Active Editor'),
                category: Categories.View,
                precondition: ContextKeyExpr.or(SideBySideEditorActiveContext, TextCompareEditorActiveContext),
                f1: true,
            });
        }
        async run(accessor) {
            const editorService = accessor.get(IEditorService);
            const commandService = accessor.get(ICommandService);
            const activeEditorPane = editorService.activeEditorPane;
            if (activeEditorPane instanceof SideBySideEditor) {
                if (activeEditorPane.getPrimaryEditorPane()?.hasFocus()) {
                    activeEditorPane.getSecondaryEditorPane()?.focus();
                }
                else {
                    activeEditorPane.getPrimaryEditorPane()?.focus();
                }
            }
            else if (activeEditorPane instanceof TextDiffEditor) {
                await commandService.executeCommand(DIFF_FOCUS_OTHER_SIDE);
            }
        }
    });
}
function registerOtherEditorCommands() {
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        id: KEEP_EDITOR_COMMAND_ID,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        when: undefined,
        primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 3 /* KeyCode.Enter */),
        handler: async (accessor, ...args) => {
            const resolvedContext = resolveCommandsContext(args, accessor.get(IEditorService), accessor.get(IEditorGroupsService), accessor.get(IListService));
            for (const { group, editors } of resolvedContext.groupedEditors) {
                for (const editor of editors) {
                    group.pinEditor(editor);
                }
            }
        },
    });
    CommandsRegistry.registerCommand({
        id: TOGGLE_KEEP_EDITORS_COMMAND_ID,
        handler: (accessor) => {
            const configurationService = accessor.get(IConfigurationService);
            const currentSetting = configurationService.getValue('workbench.editor.enablePreview');
            const newSetting = currentSetting === true ? false : true;
            configurationService.updateValue('workbench.editor.enablePreview', newSetting);
        },
    });
    function setEditorGroupLock(accessor, locked, ...args) {
        const resolvedContext = resolveCommandsContext(args, accessor.get(IEditorService), accessor.get(IEditorGroupsService), accessor.get(IListService));
        const group = resolvedContext.groupedEditors[0]?.group;
        group?.lock(locked ?? !group.isLocked);
    }
    registerAction2(class extends Action2 {
        constructor() {
            super({
                id: TOGGLE_LOCK_GROUP_COMMAND_ID,
                title: localize2('toggleEditorGroupLock', 'Toggle Editor Group Lock'),
                category: Categories.View,
                f1: true,
            });
        }
        async run(accessor, ...args) {
            setEditorGroupLock(accessor, undefined, ...args);
        }
    });
    registerAction2(class extends Action2 {
        constructor() {
            super({
                id: LOCK_GROUP_COMMAND_ID,
                title: localize2('lockEditorGroup', 'Lock Editor Group'),
                category: Categories.View,
                precondition: ActiveEditorGroupLockedContext.toNegated(),
                f1: true,
            });
        }
        async run(accessor, ...args) {
            setEditorGroupLock(accessor, true, ...args);
        }
    });
    registerAction2(class extends Action2 {
        constructor() {
            super({
                id: UNLOCK_GROUP_COMMAND_ID,
                title: localize2('unlockEditorGroup', 'Unlock Editor Group'),
                precondition: ActiveEditorGroupLockedContext,
                category: Categories.View,
                f1: true,
            });
        }
        async run(accessor, ...args) {
            setEditorGroupLock(accessor, false, ...args);
        }
    });
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        id: PIN_EDITOR_COMMAND_ID,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        when: ActiveEditorStickyContext.toNegated(),
        primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 1024 /* KeyMod.Shift */ | 3 /* KeyCode.Enter */),
        handler: async (accessor, ...args) => {
            const resolvedContext = resolveCommandsContext(args, accessor.get(IEditorService), accessor.get(IEditorGroupsService), accessor.get(IListService));
            for (const { group, editors } of resolvedContext.groupedEditors) {
                for (const editor of editors) {
                    group.stickEditor(editor);
                }
            }
        },
    });
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        id: DIFF_OPEN_SIDE,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        when: EditorContextKeys.inDiffEditor,
        primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 1024 /* KeyMod.Shift */ | 45 /* KeyCode.KeyO */),
        handler: async (accessor) => {
            const editorService = accessor.get(IEditorService);
            const editorGroupsService = accessor.get(IEditorGroupsService);
            const activeEditor = editorService.activeEditor;
            const activeTextEditorControl = editorService.activeTextEditorControl;
            if (!isDiffEditor(activeTextEditorControl) || !(activeEditor instanceof DiffEditorInput)) {
                return;
            }
            let editor;
            const originalEditor = activeTextEditorControl.getOriginalEditor();
            if (originalEditor.hasTextFocus()) {
                editor = activeEditor.original;
            }
            else {
                editor = activeEditor.modified;
            }
            return editorGroupsService.activeGroup.openEditor(editor);
        },
    });
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        id: UNPIN_EDITOR_COMMAND_ID,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        when: ActiveEditorStickyContext,
        primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 1024 /* KeyMod.Shift */ | 3 /* KeyCode.Enter */),
        handler: async (accessor, ...args) => {
            const resolvedContext = resolveCommandsContext(args, accessor.get(IEditorService), accessor.get(IEditorGroupsService), accessor.get(IListService));
            for (const { group, editors } of resolvedContext.groupedEditors) {
                for (const editor of editors) {
                    group.unstickEditor(editor);
                }
            }
        },
    });
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        id: SHOW_EDITORS_IN_GROUP,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        when: undefined,
        primary: undefined,
        handler: (accessor, ...args) => {
            const editorGroupsService = accessor.get(IEditorGroupsService);
            const quickInputService = accessor.get(IQuickInputService);
            const commandsContext = resolveCommandsContext(args, accessor.get(IEditorService), editorGroupsService, accessor.get(IListService));
            const group = commandsContext.groupedEditors[0]?.group;
            if (group) {
                editorGroupsService.activateGroup(group); // we need the group to be active
            }
            return quickInputService.quickAccess.show(ActiveGroupEditorsByMostRecentlyUsedQuickAccess.PREFIX);
        },
    });
}
export function setup() {
    registerActiveEditorMoveCopyCommand();
    registerEditorGroupsLayoutCommands();
    registerDiffEditorCommands();
    registerOpenEditorAPICommands();
    registerOpenEditorAtIndexCommands();
    registerCloseEditorCommands();
    registerOtherEditorCommands();
    registerSplitEditorInGroupCommands();
    registerFocusSideEditorsCommands();
    registerFocusEditorGroupAtIndexCommands();
    registerSplitEditorCommands();
    registerFocusEditorGroupWihoutWrapCommands();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yQ29tbWFuZHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL3BhcnRzL2VkaXRvci9lZGl0b3JDb21tYW5kcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsUUFBUSxFQUFtQixNQUFNLHFDQUFxQyxDQUFBO0FBQy9FLE9BQU8sRUFBRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDM0UsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUM1RixPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLGdDQUFnQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNsRixPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQ3hELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw4REFBOEQsQ0FBQTtBQUN6RixPQUFPLEVBQUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ3pGLE9BQU8sRUFDTixnQkFBZ0IsRUFFaEIsZUFBZSxHQUNmLE1BQU0sa0RBQWtELENBQUE7QUFDekQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3JGLE9BQU8sRUFDTixnQkFBZ0IsR0FJaEIsTUFBTSw4Q0FBOEMsQ0FBQTtBQUNyRCxP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