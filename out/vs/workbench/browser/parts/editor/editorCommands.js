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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yQ29tbWFuZHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci9wYXJ0cy9lZGl0b3IvZWRpdG9yQ29tbWFuZHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLFFBQVEsRUFBbUIsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDNUYsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDMUUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDbEYsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sOERBQThELENBQUE7QUFDekYsT0FBTyxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUN6RixPQUFPLEVBQ04sZ0JBQWdCLEVBRWhCLGVBQWUsR0FDZixNQUFNLGtEQUFrRCxDQUFBO0FBQ3pELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUNyRixPQUFPLEVBQ04sZ0JBQWdCLEdBSWhCLE1BQU0sOENBQThDLENBQUE7QUFDckQsT0FBTyxFQUNOLHFCQUFxQixHQUVyQixNQUFNLDREQUE0RCxDQUFBO0FBQ25FLE9BQU8sRUFFTixtQkFBbUIsR0FDbkIsTUFBTSwrREFBK0QsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsWUFBWSxFQUFjLE1BQU0sa0RBQWtELENBQUE7QUFDM0YsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ3RGLE9BQU8sRUFBRSwrQ0FBK0MsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBQ3hGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQ3hELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUNwRCxPQUFPLEVBQ04sa0NBQWtDLEVBQ2xDLDZCQUE2QixFQUM3Qiw4QkFBOEIsRUFDOUIseUJBQXlCLEVBQ3pCLDJCQUEyQixFQUMzQiw2QkFBNkIsRUFDN0IsOEJBQThCLEdBQzlCLE1BQU0sZ0NBQWdDLENBQUE7QUFDdkMsT0FBTyxFQU1OLGdDQUFnQyxHQUNoQyxNQUFNLDJCQUEyQixDQUFBO0FBQ2xDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUUzRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUN2RixPQUFPLEVBRU4sbUJBQW1CLEdBQ25CLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQU1OLG9CQUFvQixFQUVwQixpQ0FBaUMsR0FDakMsTUFBTSx3REFBd0QsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUNqRyxPQUFPLEVBQUUsY0FBYyxFQUFFLFVBQVUsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQzdGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQTtBQUMzRyxPQUFPLEVBQ04scUJBQXFCLEVBQ3JCLHVCQUF1QixFQUN2Qix5QkFBeUIsRUFDekIsY0FBYyxFQUNkLDBCQUEwQixHQUMxQixNQUFNLHlCQUF5QixDQUFBO0FBQ2hDLE9BQU8sRUFBa0Msc0JBQXNCLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUNuRyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxhQUFhLENBQUE7QUFFcEQsTUFBTSxDQUFDLE1BQU0sOEJBQThCLEdBQUcseUNBQXlDLENBQUE7QUFDdkYsTUFBTSxDQUFDLE1BQU0saUNBQWlDLEdBQUcsc0NBQXNDLENBQUE7QUFDdkYsTUFBTSxDQUFDLE1BQU0sa0NBQWtDLEdBQUcsdUNBQXVDLENBQUE7QUFDekYsTUFBTSxDQUFDLE1BQU0scUNBQXFDLEdBQUcseUNBQXlDLENBQUE7QUFDOUYsTUFBTSxDQUFDLE1BQU0sdUJBQXVCLEdBQUcsb0NBQW9DLENBQUE7QUFDM0UsTUFBTSxDQUFDLE1BQU0sOEJBQThCLEdBQUcsMENBQTBDLENBQUE7QUFDeEYsTUFBTSxDQUFDLE1BQU0sNkJBQTZCLEdBQUcsNkJBQTZCLENBQUE7QUFDMUUsTUFBTSxDQUFDLE1BQU0sdUNBQXVDLEdBQUcsb0NBQW9DLENBQUE7QUFFM0YsTUFBTSxDQUFDLE1BQU0sNkJBQTZCLEdBQUcsa0JBQWtCLENBQUE7QUFDL0QsTUFBTSxDQUFDLE1BQU0sNkJBQTZCLEdBQUcsa0JBQWtCLENBQUE7QUFDL0QsTUFBTSxDQUFDLE1BQU0sK0JBQStCLEdBQUcsb0JBQW9CLENBQUE7QUFDbkUsTUFBTSxDQUFDLE1BQU0sc0JBQXNCLEdBQUcsNkJBQTZCLENBQUE7QUFDbkUsTUFBTSxDQUFDLE1BQU0sOEJBQThCLEdBQUcsb0NBQW9DLENBQUE7QUFDbEYsTUFBTSxDQUFDLE1BQU0sNEJBQTRCLEdBQUcsd0NBQXdDLENBQUE7QUFDcEYsTUFBTSxDQUFDLE1BQU0scUJBQXFCLEdBQUcsa0NBQWtDLENBQUE7QUFDdkUsTUFBTSxDQUFDLE1BQU0sdUJBQXVCLEdBQUcsb0NBQW9DLENBQUE7QUFDM0UsTUFBTSxDQUFDLE1BQU0scUJBQXFCLEdBQUcscUNBQXFDLENBQUE7QUFDMUUsTUFBTSxDQUFDLE1BQU0sc0JBQXNCLEdBQUcsbUNBQW1DLENBQUE7QUFFekUsTUFBTSxDQUFDLE1BQU0scUJBQXFCLEdBQUcsNEJBQTRCLENBQUE7QUFDakUsTUFBTSxDQUFDLE1BQU0sdUJBQXVCLEdBQUcsOEJBQThCLENBQUE7QUFFckUsTUFBTSxDQUFDLE1BQU0sWUFBWSxHQUFHLDhCQUE4QixDQUFBO0FBQzFELE1BQU0sQ0FBQyxNQUFNLGVBQWUsR0FBRyxnQ0FBZ0MsQ0FBQTtBQUMvRCxNQUFNLENBQUMsTUFBTSxpQkFBaUIsR0FBRyxrQ0FBa0MsQ0FBQTtBQUNuRSxNQUFNLENBQUMsTUFBTSxpQkFBaUIsR0FBRyxrQ0FBa0MsQ0FBQTtBQUNuRSxNQUFNLENBQUMsTUFBTSxrQkFBa0IsR0FBRyxtQ0FBbUMsQ0FBQTtBQUVyRSxNQUFNLENBQUMsTUFBTSw0QkFBNEIsR0FBRyw0Q0FBNEMsQ0FBQTtBQUV4RixNQUFNLENBQUMsTUFBTSxxQkFBcUIsR0FBRyxxQ0FBcUMsQ0FBQTtBQUMxRSxNQUFNLENBQUMsTUFBTSw0QkFBNEIsR0FBRywyQ0FBMkMsQ0FBQTtBQUN2RixNQUFNLENBQUMsTUFBTSxvQkFBb0IsR0FBRyxvQ0FBb0MsQ0FBQTtBQUN4RSxNQUFNLENBQUMsTUFBTSxtQ0FBbUMsR0FBRyxpREFBaUQsQ0FBQTtBQUVwRyxNQUFNLENBQUMsTUFBTSx1QkFBdUIsR0FBRyx1Q0FBdUMsQ0FBQTtBQUM5RSxNQUFNLENBQUMsTUFBTSx3QkFBd0IsR0FBRyx3Q0FBd0MsQ0FBQTtBQUNoRixNQUFNLENBQUMsTUFBTSx1QkFBdUIsR0FBRyx1Q0FBdUMsQ0FBQTtBQUU5RSxNQUFNLENBQUMsTUFBTSx3Q0FBd0MsR0FBRyw0Q0FBNEMsQ0FBQTtBQUNwRyxNQUFNLENBQUMsTUFBTSx5Q0FBeUMsR0FDckQsNkNBQTZDLENBQUE7QUFDOUMsTUFBTSxDQUFDLE1BQU0seUNBQXlDLEdBQ3JELDZDQUE2QyxDQUFBO0FBQzlDLE1BQU0sQ0FBQyxNQUFNLHlDQUF5QyxHQUNyRCw2Q0FBNkMsQ0FBQTtBQUU5QyxNQUFNLENBQUMsTUFBTSwrQkFBK0IsR0FBRyxvQ0FBb0MsQ0FBQTtBQUVuRixNQUFNLENBQUMsTUFBTSxzQ0FBc0MsR0FBRyx3Q0FBd0MsQ0FBQTtBQUM5RixNQUFNLENBQUMsTUFBTSxzQ0FBc0MsR0FBRyx3Q0FBd0MsQ0FBQTtBQUU5RixNQUFNLENBQUMsTUFBTSw0Q0FBNEMsR0FDeEQsNkNBQTZDLENBQUE7QUFDOUMsTUFBTSxDQUFDLE1BQU0sNENBQTRDLEdBQ3hELDZDQUE2QyxDQUFBO0FBRTlDLE1BQU0sQ0FBQyxNQUFNLGtDQUFrQyxHQUFHLHVDQUF1QyxDQUFBO0FBRXpGLE1BQU0sQ0FBQyxNQUFNLDBCQUEwQixHQUFHLGlCQUFpQixDQUFBO0FBQzNELE1BQU0sQ0FBQyxNQUFNLCtCQUErQixHQUFHLGlCQUFpQixDQUFBO0FBQ2hFLE1BQU0sQ0FBQyxNQUFNLCtCQUErQixHQUFHLHFCQUFxQixDQUFBO0FBRXBFLE1BQU0sQ0FBQyxNQUFNLCtCQUErQixHQUFHO0lBQzlDLFlBQVk7SUFDWix1QkFBdUI7SUFDdkIsdUJBQXVCO0lBQ3ZCLHVCQUF1QjtJQUN2Qiw0QkFBNEI7Q0FDNUIsQ0FBQTtBQWtCRCxNQUFNLDRCQUE0QixHQUFHLFVBQVUsR0FBcUM7SUFDbkYsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO1FBQ3BCLE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUVELElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUM7UUFDdkIsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBRUQsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUM7UUFDL0MsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBRUQsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7UUFDckQsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBRUQsT0FBTyxJQUFJLENBQUE7QUFDWixDQUFDLENBQUE7QUFFRCxTQUFTLG1DQUFtQztJQUMzQyxNQUFNLGtCQUFrQixHQUFnQjtRQUN2QyxJQUFJLEVBQUUsUUFBUTtRQUNkLFFBQVEsRUFBRSxDQUFDLElBQUksQ0FBQztRQUNoQixVQUFVLEVBQUU7WUFDWCxFQUFFLEVBQUU7Z0JBQ0gsSUFBSSxFQUFFLFFBQVE7Z0JBQ2QsSUFBSSxFQUFFLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQzthQUN2QjtZQUNELEVBQUUsRUFBRTtnQkFDSCxJQUFJLEVBQUUsUUFBUTtnQkFDZCxJQUFJLEVBQUUsQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDO2FBQ3RCO1lBQ0QsS0FBSyxFQUFFO2dCQUNOLElBQUksRUFBRSxRQUFRO2FBQ2Q7U0FDRDtLQUNELENBQUE7SUFFRCxtQkFBbUIsQ0FBQyxnQ0FBZ0MsQ0FBQztRQUNwRCxFQUFFLEVBQUUsNkJBQTZCO1FBQ2pDLE1BQU0sNkNBQW1DO1FBQ3pDLElBQUksRUFBRSxpQkFBaUIsQ0FBQyxlQUFlO1FBQ3ZDLE9BQU8sRUFBRSxDQUFDO1FBQ1YsT0FBTyxFQUFFLENBQUMsUUFBUSxFQUFFLElBQUksRUFBRSxFQUFFLENBQUMsdUJBQXVCLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxRQUFRLENBQUM7UUFDMUUsUUFBUSxFQUFFO1lBQ1QsV0FBVyxFQUFFLFFBQVEsQ0FDcEIsNENBQTRDLEVBQzVDLDBDQUEwQyxDQUMxQztZQUNELElBQUksRUFBRTtnQkFDTDtvQkFDQyxJQUFJLEVBQUUsUUFBUSxDQUFDLHlDQUF5QyxFQUFFLDZCQUE2QixDQUFDO29CQUN4RixXQUFXLEVBQUUsUUFBUSxDQUNwQixnREFBZ0QsRUFDaEQsME9BQTBPLENBQzFPO29CQUNELFVBQVUsRUFBRSw0QkFBNEI7b0JBQ3hDLE1BQU0sRUFBRSxrQkFBa0I7aUJBQzFCO2FBQ0Q7U0FDRDtLQUNELENBQUMsQ0FBQTtJQUVGLG1CQUFtQixDQUFDLGdDQUFnQyxDQUFDO1FBQ3BELEVBQUUsRUFBRSw2QkFBNkI7UUFDakMsTUFBTSw2Q0FBbUM7UUFDekMsSUFBSSxFQUFFLGlCQUFpQixDQUFDLGVBQWU7UUFDdkMsT0FBTyxFQUFFLENBQUM7UUFDVixPQUFPLEVBQUUsQ0FBQyxRQUFRLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQyx1QkFBdUIsQ0FBQyxLQUFLLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQztRQUMzRSxRQUFRLEVBQUU7WUFDVCxXQUFXLEVBQUUsUUFBUSxDQUNwQiw0Q0FBNEMsRUFDNUMsa0NBQWtDLENBQ2xDO1lBQ0QsSUFBSSxFQUFFO2dCQUNMO29CQUNDLElBQUksRUFBRSxRQUFRLENBQUMseUNBQXlDLEVBQUUsNkJBQTZCLENBQUM7b0JBQ3hGLFdBQVcsRUFBRSxRQUFRLENBQ3BCLGdEQUFnRCxFQUNoRCxnS0FBZ0ssQ0FDaEs7b0JBQ0QsVUFBVSxFQUFFLDRCQUE0QjtvQkFDeEMsTUFBTSxFQUFFLGtCQUFrQjtpQkFDMUI7YUFDRDtTQUNEO0tBQ0QsQ0FBQyxDQUFBO0lBRUYsU0FBUyx1QkFBdUIsQ0FDL0IsTUFBZSxFQUNmLE9BQXlDLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQzVELFFBQTBCO1FBRTFCLElBQUksQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDLEVBQUUsSUFBSSxPQUFPLENBQUE7UUFDNUIsSUFBSSxDQUFDLEVBQUUsR0FBRyxJQUFJLENBQUMsRUFBRSxJQUFJLEtBQUssQ0FBQTtRQUMxQixJQUFJLENBQUMsS0FBSyxHQUFHLE9BQU8sSUFBSSxDQUFDLEtBQUssS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUU1RCxNQUFNLFdBQVcsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLENBQUMsV0FBVyxDQUFBO1FBQ2xFLE1BQU0sZUFBZSxHQUFHLFdBQVcsQ0FBQyxlQUFlLENBQUE7UUFDbkQsSUFBSSxlQUFlLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ2hDLFFBQVEsSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUNqQixLQUFLLEtBQUs7b0JBQ1QsSUFBSSxNQUFNLEVBQUUsQ0FBQzt3QkFDWixPQUFPLFFBQVEsQ0FBQyxJQUFJLEVBQUUsV0FBVyxFQUFFLGVBQWUsQ0FBQyxDQUFBO29CQUNwRCxDQUFDO29CQUNELE1BQUs7Z0JBQ04sS0FBSyxPQUFPO29CQUNYLE9BQU8sMkJBQTJCLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsZUFBZSxFQUFFLFFBQVEsQ0FBQyxDQUFBO1lBQzFGLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVELFNBQVMsUUFBUSxDQUNoQixJQUFzQyxFQUN0QyxLQUFtQixFQUNuQixPQUFzQjtRQUV0QixNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFBO1FBQ2xCLElBQUksRUFBRSxLQUFLLE9BQU8sSUFBSSxFQUFFLEtBQUssT0FBTyxFQUFFLENBQUM7WUFDdEMsT0FBTyxHQUFHLENBQUMsR0FBRyxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUNqQyxDQUFDO2FBQU0sSUFBSSxFQUFFLEtBQUssVUFBVSxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssSUFBSSxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUN4RixPQUFPLEdBQUcsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQ2pDLENBQUM7UUFFRCxLQUFLLE1BQU0sTUFBTSxJQUFJLE9BQU8sRUFBRSxDQUFDO1lBQzlCLE9BQU8sQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQzdCLENBQUM7SUFDRixDQUFDO0lBRUQsU0FBUyxPQUFPLENBQ2YsSUFBc0MsRUFDdEMsS0FBbUIsRUFDbkIsTUFBbUI7UUFFbkIsSUFBSSxLQUFLLEdBQUcsS0FBSyxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQzFDLFFBQVEsSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2pCLEtBQUssT0FBTztnQkFDWCxLQUFLLEdBQUcsQ0FBQyxDQUFBO2dCQUNULE1BQUs7WUFDTixLQUFLLE1BQU07Z0JBQ1YsS0FBSyxHQUFHLEtBQUssQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFBO2dCQUN2QixNQUFLO1lBQ04sS0FBSyxNQUFNO2dCQUNWLEtBQUssR0FBRyxLQUFLLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxJQUFJLENBQUMsQ0FBQyxDQUFBO2dCQUNqQyxNQUFLO1lBQ04sS0FBSyxPQUFPO2dCQUNYLEtBQUssR0FBRyxLQUFLLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxJQUFJLENBQUMsQ0FBQyxDQUFBO2dCQUNqQyxNQUFLO1lBQ04sS0FBSyxRQUFRO2dCQUNaLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFBO2dCQUN2QyxNQUFLO1lBQ04sS0FBSyxVQUFVO2dCQUNkLEtBQUssR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFBO2dCQUM3QixNQUFLO1FBQ1AsQ0FBQztRQUVELEtBQUssR0FBRyxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssSUFBSSxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFBO1FBQ3RFLEtBQUssQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUE7SUFDM0MsQ0FBQztJQUVELFNBQVMsMkJBQTJCLENBQ25DLE1BQWUsRUFDZixJQUFzQyxFQUN0QyxXQUF5QixFQUN6QixPQUFzQixFQUN0QixRQUEwQjtRQUUxQixNQUFNLG1CQUFtQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsQ0FBQTtRQUM5RCxNQUFNLG9CQUFvQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsQ0FBQTtRQUVoRSxJQUFJLFdBQXFDLENBQUE7UUFFekMsUUFBUSxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDakIsS0FBSyxNQUFNO2dCQUNWLFdBQVcsR0FBRyxtQkFBbUIsQ0FBQyxTQUFTLENBQUMsRUFBRSxTQUFTLDZCQUFxQixFQUFFLEVBQUUsV0FBVyxDQUFDLENBQUE7Z0JBQzVGLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztvQkFDbEIsV0FBVyxHQUFHLG1CQUFtQixDQUFDLFFBQVEsQ0FBQyxXQUFXLDhCQUFzQixDQUFBO2dCQUM3RSxDQUFDO2dCQUNELE1BQUs7WUFDTixLQUFLLE9BQU87Z0JBQ1gsV0FBVyxHQUFHLG1CQUFtQixDQUFDLFNBQVMsQ0FDMUMsRUFBRSxTQUFTLDhCQUFzQixFQUFFLEVBQ25DLFdBQVcsQ0FDWCxDQUFBO2dCQUNELElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztvQkFDbEIsV0FBVyxHQUFHLG1CQUFtQixDQUFDLFFBQVEsQ0FBQyxXQUFXLCtCQUF1QixDQUFBO2dCQUM5RSxDQUFDO2dCQUNELE1BQUs7WUFDTixLQUFLLElBQUk7Z0JBQ1IsV0FBVyxHQUFHLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxFQUFFLFNBQVMsMkJBQW1CLEVBQUUsRUFBRSxXQUFXLENBQUMsQ0FBQTtnQkFDMUYsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO29CQUNsQixXQUFXLEdBQUcsbUJBQW1CLENBQUMsUUFBUSxDQUFDLFdBQVcsNEJBQW9CLENBQUE7Z0JBQzNFLENBQUM7Z0JBQ0QsTUFBSztZQUNOLEtBQUssTUFBTTtnQkFDVixXQUFXLEdBQUcsbUJBQW1CLENBQUMsU0FBUyxDQUFDLEVBQUUsU0FBUyw2QkFBcUIsRUFBRSxFQUFFLFdBQVcsQ0FBQyxDQUFBO2dCQUM1RixJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7b0JBQ2xCLFdBQVcsR0FBRyxtQkFBbUIsQ0FBQyxRQUFRLENBQUMsV0FBVyw4QkFBc0IsQ0FBQTtnQkFDN0UsQ0FBQztnQkFDRCxNQUFLO1lBQ04sS0FBSyxPQUFPO2dCQUNYLFdBQVcsR0FBRyxtQkFBbUIsQ0FBQyxTQUFTLENBQUMsRUFBRSxRQUFRLDZCQUFxQixFQUFFLEVBQUUsV0FBVyxDQUFDLENBQUE7Z0JBQzNGLE1BQUs7WUFDTixLQUFLLE1BQU07Z0JBQ1YsV0FBVyxHQUFHLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxFQUFFLFFBQVEsNEJBQW9CLEVBQUUsRUFBRSxXQUFXLENBQUMsQ0FBQTtnQkFDMUYsTUFBSztZQUNOLEtBQUssVUFBVTtnQkFDZCxXQUFXLEdBQUcsbUJBQW1CLENBQUMsU0FBUyxDQUMxQyxFQUFFLFFBQVEsZ0NBQXdCLEVBQUUsRUFDcEMsV0FBVyxDQUNYLENBQUE7Z0JBQ0QsTUFBSztZQUNOLEtBQUssTUFBTTtnQkFDVixXQUFXLEdBQUcsbUJBQW1CLENBQUMsU0FBUyxDQUFDLEVBQUUsUUFBUSw0QkFBb0IsRUFBRSxFQUFFLFdBQVcsQ0FBQyxDQUFBO2dCQUMxRixJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7b0JBQ2xCLFdBQVcsR0FBRyxtQkFBbUIsQ0FBQyxRQUFRLENBQ3pDLFdBQVcsRUFDWCxpQ0FBaUMsQ0FBQyxvQkFBb0IsQ0FBQyxDQUN2RCxDQUFBO2dCQUNGLENBQUM7Z0JBQ0QsTUFBSztZQUNOLEtBQUssUUFBUTtnQkFDWixXQUFXLEdBQUcsbUJBQW1CLENBQUMsU0FBUyxxQ0FBNkIsQ0FDdkUsbUJBQW1CLENBQUMsS0FBSyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQ2pDLENBQUE7Z0JBQ0QsTUFBSztZQUNOLEtBQUssVUFBVTtnQkFDZCxXQUFXLEdBQUcsbUJBQW1CLENBQUMsU0FBUyxxQ0FBNkIsQ0FDdkUsQ0FBQyxJQUFJLENBQUMsS0FBSyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FDckIsQ0FBQTtnQkFDRCxNQUFLO1FBQ1AsQ0FBQztRQUVELElBQUksV0FBVyxFQUFFLENBQUM7WUFDakIsTUFBTSxrQkFBa0IsR0FBRyxzQkFBc0IsQ0FBQyxXQUFXLEVBQUUsT0FBTyxDQUFDLENBQUE7WUFDdkUsSUFBSSxNQUFNLEVBQUUsQ0FBQztnQkFDWixXQUFXLENBQUMsV0FBVyxDQUFDLGtCQUFrQixFQUFFLFdBQVcsQ0FBQyxDQUFBO1lBQ3pELENBQUM7aUJBQU0sSUFBSSxXQUFXLENBQUMsRUFBRSxLQUFLLFdBQVcsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDOUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsRUFBRSxXQUFXLENBQUMsQ0FBQTtZQUN6RCxDQUFDO1lBRUQsV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFBO1FBQ3BCLENBQUM7SUFDRixDQUFDO0FBQ0YsQ0FBQztBQUVELFNBQVMsa0NBQWtDO0lBQzFDLFNBQVMsaUJBQWlCLENBQUMsUUFBMEIsRUFBRSxNQUF5QjtRQUMvRSxJQUFJLENBQUMsTUFBTSxJQUFJLE9BQU8sTUFBTSxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQzNDLE9BQU07UUFDUCxDQUFDO1FBRUQsTUFBTSxtQkFBbUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLENBQUE7UUFDOUQsbUJBQW1CLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBQ3hDLENBQUM7SUFFRCxnQkFBZ0IsQ0FBQyxlQUFlLENBQy9CLCtCQUErQixFQUMvQixDQUFDLFFBQTBCLEVBQUUsSUFBdUIsRUFBRSxFQUFFO1FBQ3ZELGlCQUFpQixDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQTtJQUNsQyxDQUFDLENBQ0QsQ0FBQTtJQUVELGVBQWU7SUFDZixnQkFBZ0IsQ0FBQyxlQUFlLENBQUM7UUFDaEMsRUFBRSxFQUFFLHdCQUF3QjtRQUM1QixPQUFPLEVBQUUsQ0FBQyxRQUEwQixFQUFFLElBQXVCLEVBQUUsRUFBRSxDQUNoRSxpQkFBaUIsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDO1FBQ2xDLFFBQVEsRUFBRTtZQUNULFdBQVcsRUFBRTs7Ozs7O01BTVY7WUFDSCxJQUFJLEVBQUU7Z0JBQ0w7b0JBQ0MsSUFBSSxFQUFFLE1BQU07b0JBQ1osTUFBTSxFQUFFO3dCQUNQLElBQUksRUFBRSxRQUFRO3dCQUNkLFFBQVEsRUFBRSxDQUFDLFFBQVEsQ0FBQzt3QkFDcEIsVUFBVSxFQUFFOzRCQUNYLFdBQVcsRUFBRTtnQ0FDWixJQUFJLEVBQUUsUUFBUTtnQ0FDZCxPQUFPLEVBQUUsQ0FBQztnQ0FDVixXQUFXLEVBQUUsb0ZBQW9GO2dDQUNqRyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dDQUNaLGdCQUFnQixFQUFFO29DQUNqQixRQUFRLENBQUMsOEJBQThCLEVBQUUsWUFBWSxDQUFDO29DQUN0RCxRQUFRLENBQUMsNEJBQTRCLEVBQUUsVUFBVSxDQUFDO2lDQUNsRDs2QkFDRDs0QkFDRCxNQUFNLEVBQUU7Z0NBQ1AsSUFBSSxFQUFFLGtDQUFrQztnQ0FDeEMsT0FBTyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQzs2QkFDakI7eUJBQ0Q7cUJBQ0Q7aUJBQ0Q7YUFDRDtTQUNEO0tBQ0QsQ0FBQyxDQUFBO0lBRUYsZ0JBQWdCLENBQUMsZUFBZSxDQUFDO1FBQ2hDLEVBQUUsRUFBRSx3QkFBd0I7UUFDNUIsT0FBTyxFQUFFLENBQUMsUUFBMEIsRUFBRSxFQUFFO1lBQ3ZDLE1BQU0sbUJBQW1CLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFBO1lBRTlELE9BQU8sbUJBQW1CLENBQUMsU0FBUyxFQUFFLENBQUE7UUFDdkMsQ0FBQztRQUNELFFBQVEsRUFBRTtZQUNULFdBQVcsRUFBRSxtQkFBbUI7WUFDaEMsSUFBSSxFQUFFLEVBQUU7WUFDUixPQUFPLEVBQUUsdUVBQXVFO1NBQ2hGO0tBQ0QsQ0FBQyxDQUFBO0FBQ0gsQ0FBQztBQUVELFNBQVMsNkJBQTZCO0lBQ3JDLFNBQVMsWUFBWSxDQUNwQixPQUF3QyxFQUN4QyxPQUF1QyxFQUN2QyxNQUFxQztRQUVyQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDZCxPQUFPLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQ3pCLENBQUM7UUFFRCxPQUFPO1lBQ04sRUFBRSxHQUFHLE9BQU8sQ0FBQyxhQUFhLEVBQUUsR0FBRyxDQUFDLE9BQU8sSUFBSSxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUU7WUFDakUsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxNQUFNO1NBQ3hDLENBQUE7SUFDRixDQUFDO0lBRUQsb0RBQW9EO0lBQ3BELHVKQUF1SjtJQUN2SixnQkFBZ0IsQ0FBQyxlQUFlLENBQUM7UUFDaEMsRUFBRSxFQUFFLGFBQWE7UUFDakIsT0FBTyxFQUFFLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRSxFQUFFO1lBQzFCLFFBQVEsQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUMsY0FBYyxDQUFDLDBCQUEwQixFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBQzlFLENBQUM7UUFDRCxRQUFRLEVBQUU7WUFDVCxXQUFXLEVBQUUsNENBQTRDO1lBQ3pELElBQUksRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxDQUFDO1NBQ3ZCO0tBQ0QsQ0FBQyxDQUFBO0lBRUYsZ0JBQWdCLENBQUMsZUFBZSxDQUMvQiwwQkFBMEIsRUFDMUIsS0FBSyxXQUNKLFFBQTBCLEVBQzFCLFdBQW1DLEVBQ25DLGdCQUE0RCxFQUM1RCxLQUFjLEVBQ2QsT0FBNkI7UUFFN0IsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQTtRQUNsRCxNQUFNLG1CQUFtQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsQ0FBQTtRQUM5RCxNQUFNLGFBQWEsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFBO1FBQ2xELE1BQU0sV0FBVyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUE7UUFDOUMsTUFBTSxvQkFBb0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLENBQUE7UUFDaEUsTUFBTSx5QkFBeUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLDBCQUEwQixDQUFDLENBQUE7UUFFMUUsTUFBTSxnQkFBZ0IsR0FDckIsT0FBTyxXQUFXLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzVFLE1BQU0sQ0FBQyxTQUFTLEVBQUUsVUFBVSxDQUFDLEdBQUcsZ0JBQWdCLElBQUksRUFBRSxDQUFBO1FBRXRELDhEQUE4RDtRQUM5RCwyREFBMkQ7UUFDM0QsSUFDQyxVQUFVO1lBQ1YsT0FBTyxTQUFTLEtBQUssUUFBUTtZQUM3QixhQUFhLENBQUMsZ0JBQWdCLEVBQUUsT0FBTyxDQUFDLFFBQVEsQ0FBQyxFQUNoRCxDQUFDO1lBQ0YsTUFBTSxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsR0FBRyxZQUFZLENBQUMsT0FBTyxFQUFFLFVBQVUsRUFBRSxTQUFTLENBQUMsQ0FBQTtZQUN0RSxNQUFNLFFBQVEsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLGdCQUFnQixDQUFDO2dCQUMzQyxDQUFDLENBQUMsZ0JBQWdCO2dCQUNsQixDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO1lBRTlCLElBQUksS0FBOEQsQ0FBQTtZQUNsRSxJQUFJLHlCQUF5QixDQUFDLGdDQUFnQyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7Z0JBQzFFLHVFQUF1RTtnQkFDdkUscUVBQXFFO2dCQUNyRSxxRUFBcUU7Z0JBQ3JFLHFFQUFxRTtnQkFDckUsaUVBQWlFO2dCQUNqRSxvQ0FBb0M7Z0JBQ3BDLEtBQUssR0FBRztvQkFDUCxRQUFRLEVBQUUsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxXQUFXLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztvQkFDakUsYUFBYSxFQUFFLElBQUk7b0JBQ25CLE9BQU87b0JBQ1AsS0FBSztpQkFDTCxDQUFBO1lBQ0YsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLCtCQUErQjtnQkFDL0IsS0FBSyxHQUFHLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsQ0FBQTtZQUNyQyxDQUFDO1lBRUQsTUFBTSxhQUFhLENBQUMsVUFBVSxDQUM3QixLQUFLLEVBQ0wsbUJBQW1CLENBQUMsbUJBQW1CLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxDQUFDLENBQ3RFLENBQUE7UUFDRixDQUFDO1FBRUQsNkNBQTZDO2FBQ3hDLElBQUksYUFBYSxDQUFDLGdCQUFnQixFQUFFLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQzNELE9BQU07UUFDUCxDQUFDO1FBRUQsc0NBQXNDO2FBQ2pDLENBQUM7WUFDTCxNQUFNLGFBQWEsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLEVBQUU7Z0JBQzFDLFVBQVUsRUFBRSxPQUFPLEVBQUUsVUFBVTtnQkFDL0IsYUFBYSxFQUFFLE9BQU8sRUFBRSxhQUFhO2FBQ3JDLENBQUMsQ0FBQTtRQUNILENBQUM7SUFDRixDQUFDLENBQ0QsQ0FBQTtJQUVELHlEQUF5RDtJQUN6RCx1SkFBdUo7SUFDdkosZ0JBQWdCLENBQUMsZUFBZSxDQUFDO1FBQ2hDLEVBQUUsRUFBRSxhQUFhO1FBQ2pCLE9BQU8sRUFBRSxDQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxFQUFFO1lBQ3pDLFFBQVE7aUJBQ04sR0FBRyxDQUFDLGVBQWUsQ0FBQztpQkFDcEIsY0FBYyxDQUFDLCtCQUErQixFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDdEUsQ0FBQztRQUNELFFBQVEsRUFBRTtZQUNULFdBQVcsRUFBRSw0RUFBNEU7WUFDekYsSUFBSSxFQUFFO2dCQUNMLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxXQUFXLEVBQUUsNENBQTRDLEVBQUU7Z0JBQzNFLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsNkNBQTZDLEVBQUU7Z0JBQzdFLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsMENBQTBDLEVBQUU7YUFDMUU7U0FDRDtLQUNELENBQUMsQ0FBQTtJQUVGLGdCQUFnQixDQUFDLGVBQWUsQ0FDL0IsK0JBQStCLEVBQy9CLEtBQUssV0FDSixRQUEwQixFQUMxQixnQkFBK0IsRUFDL0IsZ0JBQStCLEVBQy9CLHFCQUF1RSxFQUN2RSxnQkFBNEQsRUFDNUQsT0FBNkI7UUFFN0IsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQTtRQUNsRCxNQUFNLG1CQUFtQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsQ0FBQTtRQUM5RCxNQUFNLG9CQUFvQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsQ0FBQTtRQUVoRSxNQUFNLENBQUMsU0FBUyxFQUFFLFVBQVUsQ0FBQyxHQUFHLGdCQUFnQixJQUFJLEVBQUUsQ0FBQTtRQUN0RCxNQUFNLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxHQUFHLFlBQVksQ0FBQyxPQUFPLEVBQUUsVUFBVSxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBRXRFLElBQUksS0FBSyxHQUF1QixTQUFTLENBQUE7UUFDekMsSUFBSSxXQUFXLEdBQXVCLFNBQVMsQ0FBQTtRQUMvQyxJQUFJLE9BQU8scUJBQXFCLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDL0MsS0FBSyxHQUFHLHFCQUFxQixDQUFBO1FBQzlCLENBQUM7YUFBTSxJQUFJLHFCQUFxQixFQUFFLENBQUM7WUFDbEMsS0FBSyxHQUFHLHFCQUFxQixDQUFDLEtBQUssQ0FBQTtZQUNuQyxXQUFXLEdBQUcscUJBQXFCLENBQUMsV0FBVyxDQUFBO1FBQ2hELENBQUM7UUFFRCxNQUFNLGFBQWEsQ0FBQyxVQUFVLENBQzdCO1lBQ0MsUUFBUSxFQUFFLEVBQUUsUUFBUSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLEVBQUU7WUFDeEQsUUFBUSxFQUFFLEVBQUUsUUFBUSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLEVBQUU7WUFDeEQsS0FBSztZQUNMLFdBQVc7WUFDWCxPQUFPO1NBQ1AsRUFDRCxtQkFBbUIsQ0FBQyxtQkFBbUIsRUFBRSxvQkFBb0IsRUFBRSxNQUFNLENBQUMsQ0FDdEUsQ0FBQTtJQUNGLENBQUMsQ0FDRCxDQUFBO0lBRUQsZ0JBQWdCLENBQUMsZUFBZSxDQUMvQiwrQkFBK0IsRUFDL0IsS0FBSyxFQUNKLFFBQTBCLEVBQzFCLFFBQXVCLEVBQ3ZCLEVBQVUsRUFDVixnQkFBNEQsRUFDM0QsRUFBRTtRQUNILE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUE7UUFDbEQsTUFBTSxtQkFBbUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLENBQUE7UUFDOUQsTUFBTSxvQkFBb0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLENBQUE7UUFFaEUsTUFBTSxDQUFDLFNBQVMsRUFBRSxVQUFVLENBQUMsR0FBRyxnQkFBZ0IsSUFBSSxFQUFFLENBQUE7UUFFdEQsTUFBTSxhQUFhLENBQUMsVUFBVSxDQUM3QjtZQUNDLFFBQVEsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUM7WUFDbEMsT0FBTyxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxHQUFHLFVBQVUsRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFO1NBQ3RELEVBQ0QsbUJBQW1CLENBQUMsbUJBQW1CLEVBQUUsb0JBQW9CLEVBQUUsU0FBUyxDQUFDLENBQ3pFLENBQUE7SUFDRixDQUFDLENBQ0QsQ0FBQTtJQUVELHlEQUF5RDtJQUN6RCx1SkFBdUo7SUFDdkosZ0JBQWdCLENBQUMsZUFBZSxDQUFDO1FBQ2hDLEVBQUUsRUFBRSxnQkFBZ0I7UUFDcEIsT0FBTyxFQUFFLENBQ1IsUUFBUSxFQUNSLEtBQWEsRUFDYixTQUE0RCxFQUMzRCxFQUFFO1lBQ0gsUUFBUSxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQyxjQUFjLENBQUMsb0JBQW9CLEVBQUUsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQ3JGLENBQUM7UUFDRCxRQUFRLEVBQUU7WUFDVCxXQUFXLEVBQUUsNEVBQTRFO1lBQ3pGLElBQUksRUFBRTtnQkFDTCxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLDBDQUEwQyxFQUFFO2dCQUMxRSxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsV0FBVyxFQUFFLGlEQUFpRCxFQUFFO2FBQ3JGO1NBQ0Q7S0FDRCxDQUFDLENBQUE7SUFFRixnQkFBZ0IsQ0FBQyxlQUFlLENBQy9CLG9CQUFvQixFQUNwQixLQUFLLEVBQ0osUUFBMEIsRUFDMUIsS0FBYSxFQUNiLFNBQTRELEVBQzNELEVBQUU7UUFDSCxNQUFNLGFBQWEsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFBO1FBRWxELE1BQU0sTUFBTSxHQUFxRCxFQUFFLENBQUE7UUFDbkUsS0FBSyxNQUFNLENBQUMsS0FBSyxFQUFFLFFBQVEsRUFBRSxRQUFRLENBQUMsSUFBSSxTQUFTLEVBQUUsQ0FBQztZQUNyRCxNQUFNLENBQUMsSUFBSSxDQUFDO2dCQUNYLFFBQVEsRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQztnQkFDM0IsUUFBUSxFQUFFLEVBQUUsUUFBUSxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEVBQUU7Z0JBQzVDLFFBQVEsRUFBRSxFQUFFLFFBQVEsRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxFQUFFO2FBQzVDLENBQUMsQ0FBQTtRQUNILENBQUM7UUFFRCxNQUFNLGFBQWEsQ0FBQyxVQUFVLENBQUMsRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFBO0lBQ3BFLENBQUMsQ0FDRCxDQUFBO0lBRUQsZ0JBQWdCLENBQUMsZUFBZSxDQUMvQixnQ0FBZ0MsRUFDaEMsS0FBSyxFQUFFLFFBQTBCLEVBQUUsT0FBdUMsRUFBRSxFQUFFO1FBQzdFLE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUE7UUFDbEQsTUFBTSxhQUFhLENBQUMsVUFBVSxDQUFDO1lBQzlCLGVBQWUsRUFBRSxPQUFPLENBQUMsa0JBQWtCO2dCQUMxQyxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsa0JBQWtCLENBQUM7Z0JBQ3hDLENBQUMsQ0FBQyxTQUFTO1lBQ1osU0FBUyxFQUFFLE9BQU8sQ0FBQyxTQUFTLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUN6QyxRQUFRLEVBQUUsRUFBRSxRQUFRLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLEVBQUU7Z0JBQ2pELFFBQVEsRUFBRSxFQUFFLFFBQVEsRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsRUFBRTthQUNqRCxDQUFDLENBQUM7WUFDSCxLQUFLLEVBQUUsT0FBTyxDQUFDLEtBQUs7U0FDcEIsQ0FBQyxDQUFBO0lBQ0gsQ0FBQyxDQUNELENBQUE7QUFDRixDQUFDO0FBUUQsU0FBUyxpQ0FBaUM7SUFDekMsTUFBTSxpQkFBaUIsR0FBb0IsQ0FDMUMsUUFBMEIsRUFDMUIsV0FBbUIsRUFDWixFQUFFO1FBQ1QsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQTtRQUNsRCxNQUFNLGdCQUFnQixHQUFHLGFBQWEsQ0FBQyxnQkFBZ0IsQ0FBQTtRQUN2RCxJQUFJLGdCQUFnQixFQUFFLENBQUM7WUFDdEIsTUFBTSxNQUFNLEdBQUcsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLGdCQUFnQixDQUFDLFdBQVcsQ0FBQyxDQUFBO1lBQ25FLElBQUksTUFBTSxFQUFFLENBQUM7Z0JBQ1osYUFBYSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUNqQyxDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUMsQ0FBQTtJQUVELHVFQUF1RTtJQUN2RSxnQkFBZ0IsQ0FBQyxlQUFlLENBQUM7UUFDaEMsRUFBRSxFQUFFLCtCQUErQjtRQUNuQyxPQUFPLEVBQUUsaUJBQWlCO0tBQzFCLENBQUMsQ0FBQTtJQUVGLDhFQUE4RTtJQUM5RSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDNUIsTUFBTSxXQUFXLEdBQUcsQ0FBQyxDQUFBO1FBQ3JCLE1BQU0sWUFBWSxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUE7UUFFMUIsbUJBQW1CLENBQUMsZ0NBQWdDLENBQUM7WUFDcEQsRUFBRSxFQUFFLCtCQUErQixHQUFHLFlBQVk7WUFDbEQsTUFBTSw2Q0FBbUM7WUFDekMsSUFBSSxFQUFFLFNBQVM7WUFDZixPQUFPLEVBQUUsdUJBQWEsU0FBUyxDQUFDLFlBQVksQ0FBQztZQUM3QyxHQUFHLEVBQUUsRUFBRSxPQUFPLEVBQUUsMkJBQWlCLFNBQVMsQ0FBQyxZQUFZLENBQUMsRUFBRTtZQUMxRCxPQUFPLEVBQUUsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsRUFBRSxXQUFXLENBQUM7U0FDL0QsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVELFNBQVMsU0FBUyxDQUFDLEtBQWE7UUFDL0IsUUFBUSxLQUFLLEVBQUUsQ0FBQztZQUNmLEtBQUssQ0FBQztnQkFDTCwrQkFBcUI7WUFDdEIsS0FBSyxDQUFDO2dCQUNMLCtCQUFxQjtZQUN0QixLQUFLLENBQUM7Z0JBQ0wsK0JBQXFCO1lBQ3RCLEtBQUssQ0FBQztnQkFDTCwrQkFBcUI7WUFDdEIsS0FBSyxDQUFDO2dCQUNMLCtCQUFxQjtZQUN0QixLQUFLLENBQUM7Z0JBQ0wsK0JBQXFCO1lBQ3RCLEtBQUssQ0FBQztnQkFDTCwrQkFBcUI7WUFDdEIsS0FBSyxDQUFDO2dCQUNMLCtCQUFxQjtZQUN0QixLQUFLLENBQUM7Z0JBQ0wsK0JBQXFCO1lBQ3RCLEtBQUssQ0FBQztnQkFDTCwrQkFBcUI7UUFDdkIsQ0FBQztRQUVELE1BQU0sSUFBSSxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUE7SUFDakMsQ0FBQztBQUNGLENBQUM7QUFFRCxTQUFTLHVDQUF1QztJQUMvQyxpRUFBaUU7SUFDakUsS0FBSyxJQUFJLFVBQVUsR0FBRyxDQUFDLEVBQUUsVUFBVSxHQUFHLENBQUMsRUFBRSxVQUFVLEVBQUUsRUFBRSxDQUFDO1FBQ3ZELG1CQUFtQixDQUFDLGdDQUFnQyxDQUFDO1lBQ3BELEVBQUUsRUFBRSxXQUFXLENBQUMsVUFBVSxDQUFDO1lBQzNCLE1BQU0sNkNBQW1DO1lBQ3pDLElBQUksRUFBRSxTQUFTO1lBQ2YsT0FBTyxFQUFFLDRCQUFpQixTQUFTLENBQUMsVUFBVSxDQUFDO1lBQy9DLE9BQU8sRUFBRSxDQUFDLFFBQVEsRUFBRSxFQUFFO2dCQUNyQixNQUFNLG1CQUFtQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsQ0FBQTtnQkFDOUQsTUFBTSxvQkFBb0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLENBQUE7Z0JBRWhFLHFFQUFxRTtnQkFDckUscUVBQXFFO2dCQUNyRSxxQ0FBcUM7Z0JBQ3JDLElBQUksVUFBVSxHQUFHLG1CQUFtQixDQUFDLEtBQUssRUFBRSxDQUFDO29CQUM1QyxPQUFNO2dCQUNQLENBQUM7Z0JBRUQsMkJBQTJCO2dCQUMzQixNQUFNLE1BQU0sR0FBRyxtQkFBbUIsQ0FBQyxTQUFTLHFDQUE2QixDQUFBO2dCQUN6RSxJQUFJLE1BQU0sQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDO29CQUN4QixPQUFPLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtnQkFDbEMsQ0FBQztnQkFFRCxpRkFBaUY7Z0JBQ2pGLE1BQU0sU0FBUyxHQUFHLGlDQUFpQyxDQUFDLG9CQUFvQixDQUFDLENBQUE7Z0JBQ3pFLE1BQU0sU0FBUyxHQUFHLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxFQUFFLFFBQVEsNEJBQW9CLEVBQUUsQ0FBQyxDQUFBO2dCQUNqRixJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7b0JBQ2hCLE9BQU07Z0JBQ1AsQ0FBQztnQkFFRCxNQUFNLFFBQVEsR0FBRyxtQkFBbUIsQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFBO2dCQUVuRSxRQUFRO2dCQUNSLFFBQVEsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtZQUNqQixDQUFDO1NBQ0QsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVELFNBQVMsV0FBVyxDQUFDLEtBQWE7UUFDakMsUUFBUSxLQUFLLEVBQUUsQ0FBQztZQUNmLEtBQUssQ0FBQztnQkFDTCxPQUFPLHlDQUF5QyxDQUFBO1lBQ2pELEtBQUssQ0FBQztnQkFDTCxPQUFPLHdDQUF3QyxDQUFBO1lBQ2hELEtBQUssQ0FBQztnQkFDTCxPQUFPLHlDQUF5QyxDQUFBO1lBQ2pELEtBQUssQ0FBQztnQkFDTCxPQUFPLHdDQUF3QyxDQUFBO1lBQ2hELEtBQUssQ0FBQztnQkFDTCxPQUFPLHdDQUF3QyxDQUFBO1lBQ2hELEtBQUssQ0FBQztnQkFDTCxPQUFPLDBDQUEwQyxDQUFBO1lBQ2xELEtBQUssQ0FBQztnQkFDTCxPQUFPLHlDQUF5QyxDQUFBO1FBQ2xELENBQUM7UUFFRCxNQUFNLElBQUksS0FBSyxDQUFDLGVBQWUsQ0FBQyxDQUFBO0lBQ2pDLENBQUM7SUFFRCxTQUFTLFNBQVMsQ0FBQyxLQUFhO1FBQy9CLFFBQVEsS0FBSyxFQUFFLENBQUM7WUFDZixLQUFLLENBQUM7Z0JBQ0wsK0JBQXFCO1lBQ3RCLEtBQUssQ0FBQztnQkFDTCwrQkFBcUI7WUFDdEIsS0FBSyxDQUFDO2dCQUNMLCtCQUFxQjtZQUN0QixLQUFLLENBQUM7Z0JBQ0wsK0JBQXFCO1lBQ3RCLEtBQUssQ0FBQztnQkFDTCwrQkFBcUI7WUFDdEIsS0FBSyxDQUFDO2dCQUNMLCtCQUFxQjtZQUN0QixLQUFLLENBQUM7Z0JBQ0wsK0JBQXFCO1FBQ3ZCLENBQUM7UUFFRCxNQUFNLElBQUksS0FBSyxDQUFDLGVBQWUsQ0FBQyxDQUFBO0lBQ2pDLENBQUM7QUFDRixDQUFDO0FBRUQsTUFBTSxVQUFVLFdBQVcsQ0FDMUIsbUJBQXlDLEVBQ3pDLFNBQXlCLEVBQ3pCLGVBQStDO0lBRS9DLElBQUksQ0FBQyxlQUFlLENBQUMsY0FBYyxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQzVDLE9BQU07SUFDUCxDQUFDO0lBRUQsK0NBQStDO0lBQy9DLE1BQU0sRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLEdBQUcsZUFBZSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUM1RCxNQUFNLGFBQWEsR0FBRyxlQUFlLENBQUMsYUFBYSxDQUFBO0lBQ25ELE1BQU0sUUFBUSxHQUFHLG1CQUFtQixDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQUE7SUFFL0QsS0FBSyxNQUFNLFlBQVksSUFBSSxPQUFPLEVBQUUsQ0FBQztRQUNwQyxvQ0FBb0M7UUFDcEMsSUFBSSxZQUFZLElBQUksQ0FBQyxZQUFZLENBQUMsYUFBYSwyQ0FBbUMsRUFBRSxDQUFDO1lBQ3BGLEtBQUssQ0FBQyxVQUFVLENBQUMsWUFBWSxFQUFFLFFBQVEsRUFBRSxFQUFFLGFBQWEsRUFBRSxDQUFDLENBQUE7UUFDNUQsQ0FBQztJQUNGLENBQUM7SUFFRCxRQUFRO0lBQ1IsUUFBUSxDQUFDLEtBQUssRUFBRSxDQUFBO0FBQ2pCLENBQUM7QUFFRCxTQUFTLDJCQUEyQjtJQUNuQyxDQUFDO0lBQUE7UUFDQSxFQUFFLEVBQUUsRUFBRSxlQUFlLEVBQUUsU0FBUywyQkFBbUIsRUFBRTtRQUNyRCxFQUFFLEVBQUUsRUFBRSxpQkFBaUIsRUFBRSxTQUFTLDZCQUFxQixFQUFFO1FBQ3pELEVBQUUsRUFBRSxFQUFFLGlCQUFpQixFQUFFLFNBQVMsNkJBQXFCLEVBQUU7UUFDekQsRUFBRSxFQUFFLEVBQUUsa0JBQWtCLEVBQUUsU0FBUyw4QkFBc0IsRUFBRTtLQUMzRCxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLFNBQVMsRUFBRSxFQUFFLEVBQUU7UUFDL0IsZ0JBQWdCLENBQUMsZUFBZSxDQUFDLEVBQUUsRUFBRSxVQUFVLFFBQVEsRUFBRSxHQUFHLElBQUk7WUFDL0QsTUFBTSxlQUFlLEdBQUcsc0JBQXNCLENBQzdDLElBQUksRUFDSixRQUFRLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxFQUM1QixRQUFRLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLEVBQ2xDLFFBQVEsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQzFCLENBQUE7WUFDRCxXQUFXLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxFQUFFLFNBQVMsRUFBRSxlQUFlLENBQUMsQ0FBQTtRQUM1RSxDQUFDLENBQUMsQ0FBQTtJQUNILENBQUMsQ0FBQyxDQUFBO0FBQ0gsQ0FBQztBQUVELFNBQVMsMkJBQTJCO0lBQ25DLDREQUE0RDtJQUM1RCxzRkFBc0Y7SUFDdEYsZ0RBQWdEO0lBQ2hELFNBQVMsa0JBQWtCLENBQzFCLFFBQTBCLEVBQzFCLHVCQUFnQyxFQUNoQyxHQUFHLElBQWU7UUFFbEIsTUFBTSxtQkFBbUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLENBQUE7UUFDOUQsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQTtRQUVsRCxJQUFJLGlCQUFpQixHQUF3QixTQUFTLENBQUE7UUFDdEQsSUFBSSx1QkFBdUIsRUFBRSxDQUFDO1lBQzdCLGlCQUFpQixHQUFHLEtBQUssQ0FBQSxDQUFDLGtDQUFrQztRQUM3RCxDQUFDO2FBQU0sSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDeEIsaUJBQWlCLEdBQUcsS0FBSyxDQUFBLENBQUMsa0ZBQWtGO1FBQzdHLENBQUM7YUFBTSxDQUFDO1lBQ1AsaUJBQWlCO2dCQUNoQixtQkFBbUIsQ0FBQyxXQUFXLENBQUMsd0JBQXdCLEtBQUssVUFBVTtvQkFDdkUsbUJBQW1CLENBQUMsV0FBVyxDQUFDLHdCQUF3QixLQUFLLGtCQUFrQixDQUFBLENBQUMsNEJBQTRCO1FBQzlHLENBQUM7UUFFRCx3RUFBd0U7UUFDeEUsSUFBSSxpQkFBaUIsRUFBRSxDQUFDO1lBQ3ZCLE1BQU0sV0FBVyxHQUFHLG1CQUFtQixDQUFDLFdBQVcsQ0FBQTtZQUNuRCxNQUFNLFlBQVksR0FBRyxXQUFXLENBQUMsWUFBWSxDQUFBO1lBRTdDLElBQUksWUFBWSxJQUFJLFdBQVcsQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQztnQkFDeEQsMENBQTBDO2dCQUMxQyxNQUFNLDBCQUEwQixHQUFHLFdBQVcsQ0FBQyxVQUFVLDRDQUV4RCxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsQ0FDdkIsQ0FBQyxDQUFDLENBQUMsQ0FBQTtnQkFDSixJQUFJLDBCQUEwQixFQUFFLENBQUM7b0JBQ2hDLE9BQU8sV0FBVyxDQUFDLFVBQVUsQ0FBQywwQkFBMEIsQ0FBQyxDQUFBO2dCQUMxRCxDQUFDO2dCQUVELDhDQUE4QztnQkFDOUMsTUFBTSw4QkFBOEIsR0FBRyxhQUFhLENBQUMsVUFBVSw0Q0FFOUQsRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLENBQ3ZCLENBQUMsQ0FBQyxDQUFDLENBQUE7Z0JBQ0osSUFBSSw4QkFBOEIsRUFBRSxDQUFDO29CQUNwQyxPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQ3JCLG1CQUFtQjt5QkFDakIsUUFBUSxDQUFDLDhCQUE4QixDQUFDLE9BQU8sQ0FBQzt3QkFDakQsRUFBRSxVQUFVLENBQUMsOEJBQThCLENBQUMsTUFBTSxDQUFDLENBQ3BELENBQUE7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBRUQsdURBQXVEO1FBQ3ZELE1BQU0sZUFBZSxHQUFHLHNCQUFzQixDQUM3QyxJQUFJLEVBQ0osUUFBUSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsRUFDNUIsUUFBUSxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxFQUNsQyxRQUFRLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUMxQixDQUFBO1FBQ0QsTUFBTSxhQUFhLEdBQUcsZUFBZSxDQUFDLGFBQWEsQ0FBQTtRQUVuRCxPQUFPLE9BQU8sQ0FBQyxHQUFHLENBQ2pCLGVBQWUsQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFO1lBQy9ELE1BQU0sY0FBYyxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQ3BDLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxDQUFDLGlCQUFpQixJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FDekQsQ0FBQTtZQUNELE1BQU0sS0FBSyxDQUFDLFlBQVksQ0FBQyxjQUFjLEVBQUUsRUFBRSxhQUFhLEVBQUUsQ0FBQyxDQUFBO1FBQzVELENBQUMsQ0FBQyxDQUNGLENBQUE7SUFDRixDQUFDO0lBRUQsbUJBQW1CLENBQUMsZ0NBQWdDLENBQUM7UUFDcEQsRUFBRSxFQUFFLHVCQUF1QjtRQUMzQixNQUFNLDZDQUFtQztRQUN6QyxJQUFJLEVBQUUsU0FBUztRQUNmLE9BQU8sRUFBRSxpREFBNkI7UUFDdEMsR0FBRyxFQUFFLEVBQUUsT0FBTyxFQUFFLCtDQUEyQixFQUFFLFNBQVMsRUFBRSxDQUFDLGlEQUE2QixDQUFDLEVBQUU7UUFDekYsT0FBTyxFQUFFLENBQUMsUUFBUSxFQUFFLEdBQUcsSUFBZSxFQUFFLEVBQUU7WUFDekMsT0FBTyxrQkFBa0IsQ0FBQyxRQUFRLEVBQUUsS0FBSyxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUE7UUFDcEQsQ0FBQztLQUNELENBQUMsQ0FBQTtJQUVGLGdCQUFnQixDQUFDLGVBQWUsQ0FDL0IsOEJBQThCLEVBQzlCLENBQUMsUUFBUSxFQUFFLEdBQUcsSUFBZSxFQUFFLEVBQUU7UUFDaEMsT0FBTyxrQkFBa0IsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLGdDQUFnQyxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUE7SUFDcEYsQ0FBQyxDQUNELENBQUE7SUFFRCxtQkFBbUIsQ0FBQyxnQ0FBZ0MsQ0FBQztRQUNwRCxFQUFFLEVBQUUsaUNBQWlDO1FBQ3JDLE1BQU0sNkNBQW1DO1FBQ3pDLElBQUksRUFBRSxTQUFTO1FBQ2YsT0FBTyxFQUFFLFFBQVEsQ0FBQyxpREFBNkIsd0JBQWU7UUFDOUQsT0FBTyxFQUFFLENBQUMsUUFBUSxFQUFFLEdBQUcsSUFBZSxFQUFFLEVBQUU7WUFDekMsTUFBTSxlQUFlLEdBQUcsc0JBQXNCLENBQzdDLElBQUksRUFDSixRQUFRLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxFQUM1QixRQUFRLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLEVBQ2xDLFFBQVEsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQzFCLENBQUE7WUFDRCxPQUFPLE9BQU8sQ0FBQyxHQUFHLENBQ2pCLGVBQWUsQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUU7Z0JBQ3RELE1BQU0sS0FBSyxDQUFDLGVBQWUsQ0FBQyxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1lBQ3JELENBQUMsQ0FBQyxDQUNGLENBQUE7UUFDRixDQUFDO0tBQ0QsQ0FBQyxDQUFBO0lBRUYsbUJBQW1CLENBQUMsZ0NBQWdDLENBQUM7UUFDcEQsRUFBRSxFQUFFLDZCQUE2QjtRQUNqQyxNQUFNLDZDQUFtQztRQUN6QyxJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FBQyw2QkFBNkIsRUFBRSwyQkFBMkIsQ0FBQztRQUNwRixPQUFPLEVBQUUsaURBQTZCO1FBQ3RDLEdBQUcsRUFBRSxFQUFFLE9BQU8sRUFBRSwrQ0FBMkIsRUFBRSxTQUFTLEVBQUUsQ0FBQyxpREFBNkIsQ0FBQyxFQUFFO1FBQ3pGLE9BQU8sRUFBRSxDQUFDLFFBQVEsRUFBRSxHQUFHLElBQWUsRUFBRSxFQUFFO1lBQ3pDLE1BQU0sbUJBQW1CLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFBO1lBQzlELE1BQU0sZUFBZSxHQUFHLHNCQUFzQixDQUM3QyxJQUFJLEVBQ0osUUFBUSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsRUFDNUIsbUJBQW1CLEVBQ25CLFFBQVEsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQzFCLENBQUE7WUFFRCxJQUFJLGVBQWUsQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQzNDLG1CQUFtQixDQUFDLFdBQVcsQ0FBQyxlQUFlLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFBO1lBQ3pFLENBQUM7UUFDRixDQUFDO0tBQ0QsQ0FBQyxDQUFBO0lBRUYsbUJBQW1CLENBQUMsZ0NBQWdDLENBQUM7UUFDcEQsRUFBRSxFQUFFLDhCQUE4QjtRQUNsQyxNQUFNLDZDQUFtQztRQUN6QyxJQUFJLEVBQUUsU0FBUztRQUNmLE9BQU8sRUFBRSxRQUFRLENBQUMsaURBQTZCLHdCQUFlO1FBQzlELE9BQU8sRUFBRSxDQUFDLFFBQVEsRUFBRSxHQUFHLElBQWUsRUFBRSxFQUFFO1lBQ3pDLE1BQU0sZUFBZSxHQUFHLHNCQUFzQixDQUM3QyxJQUFJLEVBQ0osUUFBUSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsRUFDNUIsUUFBUSxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxFQUNsQyxRQUFRLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUMxQixDQUFBO1lBQ0QsT0FBTyxPQUFPLENBQUMsR0FBRyxDQUNqQixlQUFlLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFO2dCQUN0RCxNQUFNLEtBQUssQ0FBQyxZQUFZLENBQ3ZCLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLEVBQ3hDLEVBQUUsYUFBYSxFQUFFLGVBQWUsQ0FBQyxhQUFhLEVBQUUsQ0FDaEQsQ0FBQTtZQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFDRixDQUFDO0tBQ0QsQ0FBQyxDQUFBO0lBRUYsbUJBQW1CLENBQUMsZ0NBQWdDLENBQUM7UUFDcEQsRUFBRSxFQUFFLHVDQUF1QztRQUMzQyxNQUFNLDZDQUFtQztRQUN6QyxJQUFJLEVBQUUsU0FBUztRQUNmLE9BQU8sRUFBRSxTQUFTO1FBQ2xCLEdBQUcsRUFBRSxFQUFFLE9BQU8sRUFBRSxnREFBMkIsd0JBQWUsRUFBRTtRQUM1RCxPQUFPLEVBQUUsQ0FBQyxRQUFRLEVBQUUsR0FBRyxJQUFlLEVBQUUsRUFBRTtZQUN6QyxNQUFNLGVBQWUsR0FBRyxzQkFBc0IsQ0FDN0MsSUFBSSxFQUNKLFFBQVEsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLEVBQzVCLFFBQVEsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsRUFDbEMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FDMUIsQ0FBQTtZQUVELE9BQU8sT0FBTyxDQUFDLEdBQUcsQ0FDakIsZUFBZSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUU7Z0JBQy9ELE1BQU0sY0FBYyxHQUFHLEtBQUs7cUJBQzFCLFVBQVUsa0NBQTBCLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxDQUFDO3FCQUM1RCxNQUFNLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO2dCQUUvQyxLQUFLLE1BQU0sWUFBWSxJQUFJLE9BQU8sRUFBRSxDQUFDO29CQUNwQyxJQUFJLFlBQVksRUFBRSxDQUFDO3dCQUNsQixLQUFLLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxDQUFBO29CQUM5QixDQUFDO2dCQUNGLENBQUM7Z0JBRUQsTUFBTSxLQUFLLENBQUMsWUFBWSxDQUFDLGNBQWMsRUFBRSxFQUFFLGFBQWEsRUFBRSxlQUFlLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQTtZQUMzRixDQUFDLENBQUMsQ0FDRixDQUFBO1FBQ0YsQ0FBQztLQUNELENBQUMsQ0FBQTtJQUVGLG1CQUFtQixDQUFDLGdDQUFnQyxDQUFDO1FBQ3BELEVBQUUsRUFBRSxxQ0FBcUM7UUFDekMsTUFBTSw2Q0FBbUM7UUFDekMsSUFBSSxFQUFFLFNBQVM7UUFDZixPQUFPLEVBQUUsU0FBUztRQUNsQixPQUFPLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxHQUFHLElBQWUsRUFBRSxFQUFFO1lBQy9DLE1BQU0sZUFBZSxHQUFHLHNCQUFzQixDQUM3QyxJQUFJLEVBQ0osUUFBUSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsRUFDNUIsUUFBUSxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxFQUNsQyxRQUFRLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUMxQixDQUFBO1lBQ0QsSUFBSSxlQUFlLENBQUMsY0FBYyxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUMzQyxNQUFNLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxHQUFHLGVBQWUsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUE7Z0JBQzVELElBQUksS0FBSyxDQUFDLFlBQVksRUFBRSxDQUFDO29CQUN4QixLQUFLLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQTtnQkFDcEMsQ0FBQztnQkFFRCxNQUFNLEtBQUssQ0FBQyxZQUFZLENBQ3ZCLEVBQUUsU0FBUyw4QkFBc0IsRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsRUFDNUUsRUFBRSxhQUFhLEVBQUUsZUFBZSxDQUFDLGFBQWEsRUFBRSxDQUNoRCxDQUFBO1lBQ0YsQ0FBQztRQUNGLENBQUM7S0FDRCxDQUFDLENBQUE7SUFFRixtQkFBbUIsQ0FBQyxnQ0FBZ0MsQ0FBQztRQUNwRCxFQUFFLEVBQUUsc0JBQXNCO1FBQzFCLE1BQU0sNkNBQW1DO1FBQ3pDLElBQUksRUFBRSxTQUFTO1FBQ2YsT0FBTyxFQUFFLFNBQVM7UUFDbEIsT0FBTyxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsR0FBRyxJQUFlLEVBQUUsRUFBRTtZQUMvQyxNQUFNLGFBQWEsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFBO1lBQ2xELE1BQU0scUJBQXFCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFBO1lBQ2xFLE1BQU0sZ0JBQWdCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO1lBRXhELE1BQU0sZUFBZSxHQUFHLHNCQUFzQixDQUM3QyxJQUFJLEVBQ0osYUFBYSxFQUNiLFFBQVEsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsRUFDbEMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FDMUIsQ0FBQTtZQUNELE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxHQUFHLEVBQXNDLENBQUE7WUFFeEUsS0FBSyxNQUFNLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxJQUFJLGVBQWUsQ0FBQyxjQUFjLEVBQUUsQ0FBQztnQkFDakUsS0FBSyxNQUFNLE1BQU0sSUFBSSxPQUFPLEVBQUUsQ0FBQztvQkFDOUIsTUFBTSxhQUFhLEdBQUcsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFBO29CQUN4QyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7d0JBQ3BCLE9BQU0sQ0FBQyw0Q0FBNEM7b0JBQ3BELENBQUM7b0JBRUQsYUFBYSxDQUFDLE9BQU8sR0FBRzt3QkFDdkIsR0FBRyxhQUFhLENBQUMsZ0JBQWdCLEVBQUUsT0FBTzt3QkFDMUMsUUFBUSxFQUFFLGdCQUFnQixDQUFDLElBQUk7cUJBQy9CLENBQUE7b0JBQ0QsTUFBTSxjQUFjLEdBQUcsTUFBTSxxQkFBcUIsQ0FBQyxhQUFhLENBQUMsYUFBYSxFQUFFLEtBQUssQ0FBQyxDQUFBO29CQUN0RixJQUFJLENBQUMsZ0NBQWdDLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQzt3QkFDdkQsT0FBTTtvQkFDUCxDQUFDO29CQUVELElBQUkseUJBQXlCLEdBQUcsa0JBQWtCLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFBO29CQUM3RCxJQUFJLENBQUMseUJBQXlCLEVBQUUsQ0FBQzt3QkFDaEMseUJBQXlCLEdBQUcsRUFBRSxDQUFBO3dCQUM5QixrQkFBa0IsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLHlCQUF5QixDQUFDLENBQUE7b0JBQ3pELENBQUM7b0JBRUQseUJBQXlCLENBQUMsSUFBSSxDQUFDO3dCQUM5QixNQUFNLEVBQUUsTUFBTTt3QkFDZCxXQUFXLEVBQUUsY0FBYyxDQUFDLE1BQU07d0JBQ2xDLGlCQUFpQixFQUFFLE1BQU0sQ0FBQyxRQUFRLEVBQUUsTUFBTSxLQUFLLE9BQU8sQ0FBQyxRQUFRO3dCQUMvRCxPQUFPLEVBQUUsY0FBYyxDQUFDLE9BQU87cUJBQy9CLENBQUMsQ0FBQTtvQkFtQ0YsZ0JBQWdCLENBQUMsVUFBVSxDQUd6Qix1QkFBdUIsRUFBRTt3QkFDMUIsTUFBTSxFQUFFLE1BQU0sQ0FBQyxRQUFRLEVBQUUsTUFBTSxJQUFJLEVBQUU7d0JBQ3JDLEdBQUcsRUFBRSxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO3dCQUNwRCxJQUFJLEVBQUUsTUFBTSxDQUFDLFFBQVEsSUFBSSxFQUFFO3dCQUMzQixFQUFFLEVBQUUsY0FBYyxDQUFDLE1BQU0sQ0FBQyxRQUFRLElBQUksRUFBRTtxQkFDeEMsQ0FBQyxDQUFBO2dCQUNILENBQUM7WUFDRixDQUFDO1lBRUQsbURBQW1EO1lBQ25ELEtBQUssTUFBTSxDQUFDLEtBQUssRUFBRSxZQUFZLENBQUMsSUFBSSxrQkFBa0IsRUFBRSxDQUFDO2dCQUN4RCxNQUFNLEtBQUssQ0FBQyxjQUFjLENBQUMsWUFBWSxDQUFDLENBQUE7Z0JBQ3hDLE1BQU0sS0FBSyxDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUE7WUFDcEQsQ0FBQztRQUNGLENBQUM7S0FDRCxDQUFDLENBQUE7SUFFRixnQkFBZ0IsQ0FBQyxlQUFlLENBQy9CLGtDQUFrQyxFQUNsQyxLQUFLLEVBQUUsUUFBMEIsRUFBRSxHQUFHLElBQWUsRUFBRSxFQUFFO1FBQ3hELE1BQU0sbUJBQW1CLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFBO1FBRTlELE1BQU0sZUFBZSxHQUFHLHNCQUFzQixDQUM3QyxJQUFJLEVBQ0osUUFBUSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsRUFDNUIsbUJBQW1CLEVBQ25CLFFBQVEsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQzFCLENBQUE7UUFDRCxJQUFJLGVBQWUsQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDM0MsTUFBTSxFQUFFLEtBQUssRUFBRSxHQUFHLGVBQWUsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDbkQsTUFBTSxLQUFLLENBQUMsZUFBZSxFQUFFLENBQUE7WUFFN0IsSUFDQyxLQUFLLENBQUMsS0FBSyxLQUFLLENBQUM7Z0JBQ2pCLG1CQUFtQixDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsMEJBQTBCLEVBQ2hFLENBQUM7Z0JBQ0YsbUJBQW1CLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFBLENBQUMsdUNBQXVDO1lBQy9FLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQyxDQUNELENBQUE7QUFDRixDQUFDO0FBRUQsU0FBUywwQ0FBMEM7SUFDbEQsTUFBTSxRQUFRLEdBQUc7UUFDaEI7WUFDQyxFQUFFLEVBQUUsd0NBQXdDO1lBQzVDLFNBQVMsNkJBQXFCO1NBQzlCO1FBQ0Q7WUFDQyxFQUFFLEVBQUUseUNBQXlDO1lBQzdDLFNBQVMsOEJBQXNCO1NBQy9CO1FBQ0Q7WUFDQyxFQUFFLEVBQUUseUNBQXlDO1lBQzdDLFNBQVMsMkJBQW1CO1NBQzVCO1FBQ0Q7WUFDQyxFQUFFLEVBQUUseUNBQXlDO1lBQzdDLFNBQVMsNkJBQXFCO1NBQzlCO0tBQ0QsQ0FBQTtJQUVELEtBQUssTUFBTSxPQUFPLElBQUksUUFBUSxFQUFFLENBQUM7UUFDaEMsZ0JBQWdCLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxFQUFFLEVBQUUsS0FBSyxFQUFFLFFBQTBCLEVBQUUsRUFBRTtZQUNqRixNQUFNLG1CQUFtQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsQ0FBQTtZQUU5RCxNQUFNLEtBQUssR0FDVixtQkFBbUIsQ0FBQyxTQUFTLENBQzVCLEVBQUUsU0FBUyxFQUFFLE9BQU8sQ0FBQyxTQUFTLEVBQUUsRUFDaEMsbUJBQW1CLENBQUMsV0FBVyxFQUMvQixLQUFLLENBQ0wsSUFBSSxtQkFBbUIsQ0FBQyxXQUFXLENBQUE7WUFDckMsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFBO1FBQ2QsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDO0FBQ0YsQ0FBQztBQUVELFNBQVMsa0NBQWtDO0lBQzFDLEtBQUssVUFBVSxrQkFBa0IsQ0FDaEMsUUFBMEIsRUFDMUIsZUFBK0M7UUFFL0MsTUFBTSxvQkFBb0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLENBQUE7UUFFaEUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDNUMsT0FBTTtRQUNQLENBQUM7UUFFRCxNQUFNLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxHQUFHLGVBQWUsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDNUQsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3pCLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNiLE9BQU07UUFDUCxDQUFDO1FBRUQsTUFBTSxLQUFLLENBQUMsY0FBYyxDQUFDO1lBQzFCO2dCQUNDLE1BQU07Z0JBQ04sV0FBVyxFQUFFLG9CQUFvQixDQUFDLGNBQWMsQ0FDL0MscUJBQXFCLEVBQ3JCLFNBQVMsRUFDVCxTQUFTLEVBQ1QsTUFBTSxFQUNOLE1BQU0sQ0FDTjtnQkFDRCxpQkFBaUIsRUFBRSxJQUFJO2FBQ3ZCO1NBQ0QsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVELGVBQWUsQ0FDZCxLQUFNLFNBQVEsT0FBTztRQUNwQjtZQUNDLEtBQUssQ0FBQztnQkFDTCxFQUFFLEVBQUUscUJBQXFCO2dCQUN6QixLQUFLLEVBQUUsU0FBUyxDQUFDLG9CQUFvQixFQUFFLHVCQUF1QixDQUFDO2dCQUMvRCxRQUFRLEVBQUUsVUFBVSxDQUFDLElBQUk7Z0JBQ3pCLFlBQVksRUFBRSxrQ0FBa0M7Z0JBQ2hELEVBQUUsRUFBRSxJQUFJO2dCQUNSLFVBQVUsRUFBRTtvQkFDWCxNQUFNLDZDQUFtQztvQkFDekMsSUFBSSxFQUFFLGtDQUFrQztvQkFDeEMsT0FBTyxFQUFFLFFBQVEsQ0FDaEIsaURBQTZCLEVBQzdCLG1EQUE2Qiw2QkFBb0IsQ0FDakQ7aUJBQ0Q7YUFDRCxDQUFDLENBQUE7UUFDSCxDQUFDO1FBQ0QsR0FBRyxDQUFDLFFBQTBCLEVBQUUsR0FBRyxJQUFlO1lBQ2pELE9BQU8sa0JBQWtCLENBQ3hCLFFBQVEsRUFDUixzQkFBc0IsQ0FDckIsSUFBSSxFQUNKLFFBQVEsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLEVBQzVCLFFBQVEsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsRUFDbEMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FDMUIsQ0FDRCxDQUFBO1FBQ0YsQ0FBQztLQUNELENBQ0QsQ0FBQTtJQUVELEtBQUssVUFBVSxpQkFBaUIsQ0FBQyxlQUErQztRQUMvRSxJQUFJLENBQUMsZUFBZSxDQUFDLGNBQWMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUM1QyxPQUFNO1FBQ1AsQ0FBQztRQUVELE1BQU0sRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLEdBQUcsZUFBZSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUM1RCxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDekIsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2IsT0FBTTtRQUNQLENBQUM7UUFFRCxJQUFJLENBQUMsQ0FBQyxNQUFNLFlBQVkscUJBQXFCLENBQUMsRUFBRSxDQUFDO1lBQ2hELE9BQU07UUFDUCxDQUFDO1FBRUQsSUFBSSxPQUFPLEdBQStCLFNBQVMsQ0FBQTtRQUNuRCxNQUFNLGdCQUFnQixHQUFHLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQTtRQUMvQyxJQUFJLGdCQUFnQixZQUFZLGdCQUFnQixJQUFJLEtBQUssQ0FBQyxZQUFZLEtBQUssTUFBTSxFQUFFLENBQUM7WUFDbkYsS0FBSyxNQUFNLElBQUksSUFBSTtnQkFDbEIsZ0JBQWdCLENBQUMsb0JBQW9CLEVBQUU7Z0JBQ3ZDLGdCQUFnQixDQUFDLHNCQUFzQixFQUFFO2FBQ3pDLEVBQUUsQ0FBQztnQkFDSCxJQUFJLElBQUksRUFBRSxRQUFRLEVBQUUsRUFBRSxDQUFDO29CQUN0QixPQUFPLEdBQUcsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLFlBQVksRUFBRSxFQUFFLENBQUE7b0JBQzVDLE1BQUs7Z0JBQ04sQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBRUQsTUFBTSxLQUFLLENBQUMsY0FBYyxDQUFDO1lBQzFCO2dCQUNDLE1BQU07Z0JBQ04sV0FBVyxFQUFFLE1BQU0sQ0FBQyxPQUFPO2dCQUMzQixPQUFPO2FBQ1A7U0FDRCxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRUQsZUFBZSxDQUNkLEtBQU0sU0FBUSxPQUFPO1FBQ3BCO1lBQ0MsS0FBSyxDQUFDO2dCQUNMLEVBQUUsRUFBRSxvQkFBb0I7Z0JBQ3hCLEtBQUssRUFBRSxTQUFTLENBQUMsbUJBQW1CLEVBQUUsc0JBQXNCLENBQUM7Z0JBQzdELFFBQVEsRUFBRSxVQUFVLENBQUMsSUFBSTtnQkFDekIsWUFBWSxFQUFFLDZCQUE2QjtnQkFDM0MsRUFBRSxFQUFFLElBQUk7Z0JBQ1IsVUFBVSxFQUFFO29CQUNYLE1BQU0sNkNBQW1DO29CQUN6QyxJQUFJLEVBQUUsNkJBQTZCO29CQUNuQyxPQUFPLEVBQUUsUUFBUSxDQUNoQixpREFBNkIsRUFDN0IsbURBQTZCLDZCQUFvQixDQUNqRDtpQkFDRDthQUNELENBQUMsQ0FBQTtRQUNILENBQUM7UUFDRCxHQUFHLENBQUMsUUFBMEIsRUFBRSxHQUFHLElBQWU7WUFDakQsT0FBTyxpQkFBaUIsQ0FDdkIsc0JBQXNCLENBQ3JCLElBQUksRUFDSixRQUFRLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxFQUM1QixRQUFRLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLEVBQ2xDLFFBQVEsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQzFCLENBQ0QsQ0FBQTtRQUNGLENBQUM7S0FDRCxDQUNELENBQUE7SUFFRCxlQUFlLENBQ2QsS0FBTSxTQUFRLE9BQU87UUFDcEI7WUFDQyxLQUFLLENBQUM7Z0JBQ0wsRUFBRSxFQUFFLDRCQUE0QjtnQkFDaEMsS0FBSyxFQUFFLFNBQVMsQ0FBQyx5QkFBeUIsRUFBRSw4QkFBOEIsQ0FBQztnQkFDM0UsUUFBUSxFQUFFLFVBQVUsQ0FBQyxJQUFJO2dCQUN6QixZQUFZLEVBQUUsY0FBYyxDQUFDLEVBQUUsQ0FDOUIsa0NBQWtDLEVBQ2xDLDZCQUE2QixDQUM3QjtnQkFDRCxFQUFFLEVBQUUsSUFBSTthQUNSLENBQUMsQ0FBQTtRQUNILENBQUM7UUFDRCxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQTBCLEVBQUUsR0FBRyxJQUFlO1lBQ3ZELE1BQU0sZUFBZSxHQUFHLHNCQUFzQixDQUM3QyxJQUFJLEVBQ0osUUFBUSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsRUFDNUIsUUFBUSxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxFQUNsQyxRQUFRLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUMxQixDQUFBO1lBQ0QsSUFBSSxDQUFDLGVBQWUsQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQzVDLE9BQU07WUFDUCxDQUFDO1lBRUQsTUFBTSxFQUFFLE9BQU8sRUFBRSxHQUFHLGVBQWUsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFFckQsSUFBSSxPQUFPLENBQUMsQ0FBQyxDQUFDLFlBQVkscUJBQXFCLEVBQUUsQ0FBQztnQkFDakQsTUFBTSxpQkFBaUIsQ0FBQyxlQUFlLENBQUMsQ0FBQTtZQUN6QyxDQUFDO2lCQUFNLElBQUksT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQ3ZCLE1BQU0sa0JBQWtCLENBQUMsUUFBUSxFQUFFLGVBQWUsQ0FBQyxDQUFBO1lBQ3BELENBQUM7UUFDRixDQUFDO0tBQ0QsQ0FDRCxDQUFBO0lBRUQsZUFBZSxDQUNkLEtBQU0sU0FBUSxPQUFPO1FBQ3BCO1lBQ0MsS0FBSyxDQUFDO2dCQUNMLEVBQUUsRUFBRSxtQ0FBbUM7Z0JBQ3ZDLEtBQUssRUFBRSxTQUFTLENBQ2YsZ0NBQWdDLEVBQ2hDLHdDQUF3QyxDQUN4QztnQkFDRCxRQUFRLEVBQUUsVUFBVSxDQUFDLElBQUk7Z0JBQ3pCLFlBQVksRUFBRSw2QkFBNkI7Z0JBQzNDLEVBQUUsRUFBRSxJQUFJO2FBQ1IsQ0FBQyxDQUFBO1FBQ0gsQ0FBQztRQUNELEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBMEI7WUFDbkMsTUFBTSxvQkFBb0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLENBQUE7WUFDaEUsTUFBTSxjQUFjLEdBQUcsb0JBQW9CLENBQUMsUUFBUSxDQUNuRCxnQkFBZ0IsQ0FBQywyQkFBMkIsQ0FDNUMsQ0FBQTtZQUVELElBQUksVUFBcUMsQ0FBQTtZQUN6QyxJQUFJLGNBQWMsS0FBSyxZQUFZLEVBQUUsQ0FBQztnQkFDckMsVUFBVSxHQUFHLFlBQVksQ0FBQTtZQUMxQixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsVUFBVSxHQUFHLFVBQVUsQ0FBQTtZQUN4QixDQUFDO1lBRUQsT0FBTyxvQkFBb0IsQ0FBQyxXQUFXLENBQ3RDLGdCQUFnQixDQUFDLDJCQUEyQixFQUM1QyxVQUFVLENBQ1YsQ0FBQTtRQUNGLENBQUM7S0FDRCxDQUNELENBQUE7QUFDRixDQUFDO0FBRUQsU0FBUyxnQ0FBZ0M7SUFDeEMsZUFBZSxDQUNkLEtBQU0sU0FBUSxPQUFPO1FBQ3BCO1lBQ0MsS0FBSyxDQUFDO2dCQUNMLEVBQUUsRUFBRSx1QkFBdUI7Z0JBQzNCLEtBQUssRUFBRSxTQUFTLENBQUMscUJBQXFCLEVBQUUsbUNBQW1DLENBQUM7Z0JBQzVFLFFBQVEsRUFBRSxVQUFVLENBQUMsSUFBSTtnQkFDekIsWUFBWSxFQUFFLGNBQWMsQ0FBQyxFQUFFLENBQzlCLDZCQUE2QixFQUM3Qiw4QkFBOEIsQ0FDOUI7Z0JBQ0QsRUFBRSxFQUFFLElBQUk7YUFDUixDQUFDLENBQUE7UUFDSCxDQUFDO1FBQ0QsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUEwQjtZQUNuQyxNQUFNLGFBQWEsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFBO1lBQ2xELE1BQU0sY0FBYyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUE7WUFFcEQsTUFBTSxnQkFBZ0IsR0FBRyxhQUFhLENBQUMsZ0JBQWdCLENBQUE7WUFDdkQsSUFBSSxnQkFBZ0IsWUFBWSxnQkFBZ0IsRUFBRSxDQUFDO2dCQUNsRCxnQkFBZ0IsQ0FBQyxzQkFBc0IsRUFBRSxFQUFFLEtBQUssRUFBRSxDQUFBO1lBQ25ELENBQUM7aUJBQU0sSUFBSSxnQkFBZ0IsWUFBWSxjQUFjLEVBQUUsQ0FBQztnQkFDdkQsTUFBTSxjQUFjLENBQUMsY0FBYyxDQUFDLHlCQUF5QixDQUFDLENBQUE7WUFDL0QsQ0FBQztRQUNGLENBQUM7S0FDRCxDQUNELENBQUE7SUFFRCxlQUFlLENBQ2QsS0FBTSxTQUFRLE9BQU87UUFDcEI7WUFDQyxLQUFLLENBQUM7Z0JBQ0wsRUFBRSxFQUFFLHdCQUF3QjtnQkFDNUIsS0FBSyxFQUFFLFNBQVMsQ0FBQyxzQkFBc0IsRUFBRSxvQ0FBb0MsQ0FBQztnQkFDOUUsUUFBUSxFQUFFLFVBQVUsQ0FBQyxJQUFJO2dCQUN6QixZQUFZLEVBQUUsY0FBYyxDQUFDLEVBQUUsQ0FDOUIsNkJBQTZCLEVBQzdCLDhCQUE4QixDQUM5QjtnQkFDRCxFQUFFLEVBQUUsSUFBSTthQUNSLENBQUMsQ0FBQTtRQUNILENBQUM7UUFDRCxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQTBCO1lBQ25DLE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUE7WUFDbEQsTUFBTSxjQUFjLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQTtZQUVwRCxNQUFNLGdCQUFnQixHQUFHLGFBQWEsQ0FBQyxnQkFBZ0IsQ0FBQTtZQUN2RCxJQUFJLGdCQUFnQixZQUFZLGdCQUFnQixFQUFFLENBQUM7Z0JBQ2xELGdCQUFnQixDQUFDLG9CQUFvQixFQUFFLEVBQUUsS0FBSyxFQUFFLENBQUE7WUFDakQsQ0FBQztpQkFBTSxJQUFJLGdCQUFnQixZQUFZLGNBQWMsRUFBRSxDQUFDO2dCQUN2RCxNQUFNLGNBQWMsQ0FBQyxjQUFjLENBQUMsdUJBQXVCLENBQUMsQ0FBQTtZQUM3RCxDQUFDO1FBQ0YsQ0FBQztLQUNELENBQ0QsQ0FBQTtJQUVELGVBQWUsQ0FDZCxLQUFNLFNBQVEsT0FBTztRQUNwQjtZQUNDLEtBQUssQ0FBQztnQkFDTCxFQUFFLEVBQUUsdUJBQXVCO2dCQUMzQixLQUFLLEVBQUUsU0FBUyxDQUFDLHNCQUFzQixFQUFFLG1DQUFtQyxDQUFDO2dCQUM3RSxRQUFRLEVBQUUsVUFBVSxDQUFDLElBQUk7Z0JBQ3pCLFlBQVksRUFBRSxjQUFjLENBQUMsRUFBRSxDQUM5Qiw2QkFBNkIsRUFDN0IsOEJBQThCLENBQzlCO2dCQUNELEVBQUUsRUFBRSxJQUFJO2FBQ1IsQ0FBQyxDQUFBO1FBQ0gsQ0FBQztRQUNELEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBMEI7WUFDbkMsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQTtZQUNsRCxNQUFNLGNBQWMsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFBO1lBRXBELE1BQU0sZ0JBQWdCLEdBQUcsYUFBYSxDQUFDLGdCQUFnQixDQUFBO1lBQ3ZELElBQUksZ0JBQWdCLFlBQVksZ0JBQWdCLEVBQUUsQ0FBQztnQkFDbEQsSUFBSSxnQkFBZ0IsQ0FBQyxvQkFBb0IsRUFBRSxFQUFFLFFBQVEsRUFBRSxFQUFFLENBQUM7b0JBQ3pELGdCQUFnQixDQUFDLHNCQUFzQixFQUFFLEVBQUUsS0FBSyxFQUFFLENBQUE7Z0JBQ25ELENBQUM7cUJBQU0sQ0FBQztvQkFDUCxnQkFBZ0IsQ0FBQyxvQkFBb0IsRUFBRSxFQUFFLEtBQUssRUFBRSxDQUFBO2dCQUNqRCxDQUFDO1lBQ0YsQ0FBQztpQkFBTSxJQUFJLGdCQUFnQixZQUFZLGNBQWMsRUFBRSxDQUFDO2dCQUN2RCxNQUFNLGNBQWMsQ0FBQyxjQUFjLENBQUMscUJBQXFCLENBQUMsQ0FBQTtZQUMzRCxDQUFDO1FBQ0YsQ0FBQztLQUNELENBQ0QsQ0FBQTtBQUNGLENBQUM7QUFFRCxTQUFTLDJCQUEyQjtJQUNuQyxtQkFBbUIsQ0FBQyxnQ0FBZ0MsQ0FBQztRQUNwRCxFQUFFLEVBQUUsc0JBQXNCO1FBQzFCLE1BQU0sNkNBQW1DO1FBQ3pDLElBQUksRUFBRSxTQUFTO1FBQ2YsT0FBTyxFQUFFLFFBQVEsQ0FBQyxpREFBNkIsd0JBQWdCO1FBQy9ELE9BQU8sRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLEdBQUcsSUFBZSxFQUFFLEVBQUU7WUFDL0MsTUFBTSxlQUFlLEdBQUcsc0JBQXNCLENBQzdDLElBQUksRUFDSixRQUFRLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxFQUM1QixRQUFRLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLEVBQ2xDLFFBQVEsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQzFCLENBQUE7WUFDRCxLQUFLLE1BQU0sRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLElBQUksZUFBZSxDQUFDLGNBQWMsRUFBRSxDQUFDO2dCQUNqRSxLQUFLLE1BQU0sTUFBTSxJQUFJLE9BQU8sRUFBRSxDQUFDO29CQUM5QixLQUFLLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFBO2dCQUN4QixDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7S0FDRCxDQUFDLENBQUE7SUFFRixnQkFBZ0IsQ0FBQyxlQUFlLENBQUM7UUFDaEMsRUFBRSxFQUFFLDhCQUE4QjtRQUNsQyxPQUFPLEVBQUUsQ0FBQyxRQUFRLEVBQUUsRUFBRTtZQUNyQixNQUFNLG9CQUFvQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsQ0FBQTtZQUVoRSxNQUFNLGNBQWMsR0FBRyxvQkFBb0IsQ0FBQyxRQUFRLENBQUMsZ0NBQWdDLENBQUMsQ0FBQTtZQUN0RixNQUFNLFVBQVUsR0FBRyxjQUFjLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQTtZQUN6RCxvQkFBb0IsQ0FBQyxXQUFXLENBQUMsZ0NBQWdDLEVBQUUsVUFBVSxDQUFDLENBQUE7UUFDL0UsQ0FBQztLQUNELENBQUMsQ0FBQTtJQUVGLFNBQVMsa0JBQWtCLENBQzFCLFFBQTBCLEVBQzFCLE1BQTJCLEVBQzNCLEdBQUcsSUFBZTtRQUVsQixNQUFNLGVBQWUsR0FBRyxzQkFBc0IsQ0FDN0MsSUFBSSxFQUNKLFFBQVEsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLEVBQzVCLFFBQVEsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsRUFDbEMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FDMUIsQ0FBQTtRQUNELE1BQU0sS0FBSyxHQUFHLGVBQWUsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFBO1FBQ3RELEtBQUssRUFBRSxJQUFJLENBQUMsTUFBTSxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFBO0lBQ3ZDLENBQUM7SUFFRCxlQUFlLENBQ2QsS0FBTSxTQUFRLE9BQU87UUFDcEI7WUFDQyxLQUFLLENBQUM7Z0JBQ0wsRUFBRSxFQUFFLDRCQUE0QjtnQkFDaEMsS0FBSyxFQUFFLFNBQVMsQ0FBQyx1QkFBdUIsRUFBRSwwQkFBMEIsQ0FBQztnQkFDckUsUUFBUSxFQUFFLFVBQVUsQ0FBQyxJQUFJO2dCQUN6QixFQUFFLEVBQUUsSUFBSTthQUNSLENBQUMsQ0FBQTtRQUNILENBQUM7UUFDRCxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQTBCLEVBQUUsR0FBRyxJQUFlO1lBQ3ZELGtCQUFrQixDQUFDLFFBQVEsRUFBRSxTQUFTLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQTtRQUNqRCxDQUFDO0tBQ0QsQ0FDRCxDQUFBO0lBRUQsZUFBZSxDQUNkLEtBQU0sU0FBUSxPQUFPO1FBQ3BCO1lBQ0MsS0FBSyxDQUFDO2dCQUNMLEVBQUUsRUFBRSxxQkFBcUI7Z0JBQ3pCLEtBQUssRUFBRSxTQUFTLENBQUMsaUJBQWlCLEVBQUUsbUJBQW1CLENBQUM7Z0JBQ3hELFFBQVEsRUFBRSxVQUFVLENBQUMsSUFBSTtnQkFDekIsWUFBWSxFQUFFLDhCQUE4QixDQUFDLFNBQVMsRUFBRTtnQkFDeEQsRUFBRSxFQUFFLElBQUk7YUFDUixDQUFDLENBQUE7UUFDSCxDQUFDO1FBQ0QsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUEwQixFQUFFLEdBQUcsSUFBZTtZQUN2RCxrQkFBa0IsQ0FBQyxRQUFRLEVBQUUsSUFBSSxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUE7UUFDNUMsQ0FBQztLQUNELENBQ0QsQ0FBQTtJQUVELGVBQWUsQ0FDZCxLQUFNLFNBQVEsT0FBTztRQUNwQjtZQUNDLEtBQUssQ0FBQztnQkFDTCxFQUFFLEVBQUUsdUJBQXVCO2dCQUMzQixLQUFLLEVBQUUsU0FBUyxDQUFDLG1CQUFtQixFQUFFLHFCQUFxQixDQUFDO2dCQUM1RCxZQUFZLEVBQUUsOEJBQThCO2dCQUM1QyxRQUFRLEVBQUUsVUFBVSxDQUFDLElBQUk7Z0JBQ3pCLEVBQUUsRUFBRSxJQUFJO2FBQ1IsQ0FBQyxDQUFBO1FBQ0gsQ0FBQztRQUNELEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBMEIsRUFBRSxHQUFHLElBQWU7WUFDdkQsa0JBQWtCLENBQUMsUUFBUSxFQUFFLEtBQUssRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFBO1FBQzdDLENBQUM7S0FDRCxDQUNELENBQUE7SUFFRCxtQkFBbUIsQ0FBQyxnQ0FBZ0MsQ0FBQztRQUNwRCxFQUFFLEVBQUUscUJBQXFCO1FBQ3pCLE1BQU0sNkNBQW1DO1FBQ3pDLElBQUksRUFBRSx5QkFBeUIsQ0FBQyxTQUFTLEVBQUU7UUFDM0MsT0FBTyxFQUFFLFFBQVEsQ0FBQyxpREFBNkIsRUFBRSwrQ0FBNEIsQ0FBQztRQUM5RSxPQUFPLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxHQUFHLElBQWUsRUFBRSxFQUFFO1lBQy9DLE1BQU0sZUFBZSxHQUFHLHNCQUFzQixDQUM3QyxJQUFJLEVBQ0osUUFBUSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsRUFDNUIsUUFBUSxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxFQUNsQyxRQUFRLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUMxQixDQUFBO1lBQ0QsS0FBSyxNQUFNLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxJQUFJLGVBQWUsQ0FBQyxjQUFjLEVBQUUsQ0FBQztnQkFDakUsS0FBSyxNQUFNLE1BQU0sSUFBSSxPQUFPLEVBQUUsQ0FBQztvQkFDOUIsS0FBSyxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQTtnQkFDMUIsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO0tBQ0QsQ0FBQyxDQUFBO0lBRUYsbUJBQW1CLENBQUMsZ0NBQWdDLENBQUM7UUFDcEQsRUFBRSxFQUFFLGNBQWM7UUFDbEIsTUFBTSw2Q0FBbUM7UUFDekMsSUFBSSxFQUFFLGlCQUFpQixDQUFDLFlBQVk7UUFDcEMsT0FBTyxFQUFFLFFBQVEsQ0FBQyxpREFBNkIsRUFBRSwrQ0FBMkIsQ0FBQztRQUM3RSxPQUFPLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxFQUFFO1lBQzNCLE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUE7WUFDbEQsTUFBTSxtQkFBbUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLENBQUE7WUFFOUQsTUFBTSxZQUFZLEdBQUcsYUFBYSxDQUFDLFlBQVksQ0FBQTtZQUMvQyxNQUFNLHVCQUF1QixHQUFHLGFBQWEsQ0FBQyx1QkFBdUIsQ0FBQTtZQUNyRSxJQUFJLENBQUMsWUFBWSxDQUFDLHVCQUF1QixDQUFDLElBQUksQ0FBQyxDQUFDLFlBQVksWUFBWSxlQUFlLENBQUMsRUFBRSxDQUFDO2dCQUMxRixPQUFNO1lBQ1AsQ0FBQztZQUVELElBQUksTUFBK0IsQ0FBQTtZQUNuQyxNQUFNLGNBQWMsR0FBRyx1QkFBdUIsQ0FBQyxpQkFBaUIsRUFBRSxDQUFBO1lBQ2xFLElBQUksY0FBYyxDQUFDLFlBQVksRUFBRSxFQUFFLENBQUM7Z0JBQ25DLE1BQU0sR0FBRyxZQUFZLENBQUMsUUFBUSxDQUFBO1lBQy9CLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxNQUFNLEdBQUcsWUFBWSxDQUFDLFFBQVEsQ0FBQTtZQUMvQixDQUFDO1lBRUQsT0FBTyxtQkFBbUIsQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQzFELENBQUM7S0FDRCxDQUFDLENBQUE7SUFFRixtQkFBbUIsQ0FBQyxnQ0FBZ0MsQ0FBQztRQUNwRCxFQUFFLEVBQUUsdUJBQXVCO1FBQzNCLE1BQU0sNkNBQW1DO1FBQ3pDLElBQUksRUFBRSx5QkFBeUI7UUFDL0IsT0FBTyxFQUFFLFFBQVEsQ0FBQyxpREFBNkIsRUFBRSwrQ0FBNEIsQ0FBQztRQUM5RSxPQUFPLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxHQUFHLElBQWUsRUFBRSxFQUFFO1lBQy9DLE1BQU0sZUFBZSxHQUFHLHNCQUFzQixDQUM3QyxJQUFJLEVBQ0osUUFBUSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsRUFDNUIsUUFBUSxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxFQUNsQyxRQUFRLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUMxQixDQUFBO1lBQ0QsS0FBSyxNQUFNLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxJQUFJLGVBQWUsQ0FBQyxjQUFjLEVBQUUsQ0FBQztnQkFDakUsS0FBSyxNQUFNLE1BQU0sSUFBSSxPQUFPLEVBQUUsQ0FBQztvQkFDOUIsS0FBSyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQTtnQkFDNUIsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO0tBQ0QsQ0FBQyxDQUFBO0lBRUYsbUJBQW1CLENBQUMsZ0NBQWdDLENBQUM7UUFDcEQsRUFBRSxFQUFFLHFCQUFxQjtRQUN6QixNQUFNLDZDQUFtQztRQUN6QyxJQUFJLEVBQUUsU0FBUztRQUNmLE9BQU8sRUFBRSxTQUFTO1FBQ2xCLE9BQU8sRUFBRSxDQUFDLFFBQVEsRUFBRSxHQUFHLElBQWUsRUFBRSxFQUFFO1lBQ3pDLE1BQU0sbUJBQW1CLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFBO1lBQzlELE1BQU0saUJBQWlCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO1lBRTFELE1BQU0sZUFBZSxHQUFHLHNCQUFzQixDQUM3QyxJQUFJLEVBQ0osUUFBUSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsRUFDNUIsbUJBQW1CLEVBQ25CLFFBQVEsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQzFCLENBQUE7WUFDRCxNQUFNLEtBQUssR0FBRyxlQUFlLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQTtZQUN0RCxJQUFJLEtBQUssRUFBRSxDQUFDO2dCQUNYLG1CQUFtQixDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQSxDQUFDLGlDQUFpQztZQUMzRSxDQUFDO1lBRUQsT0FBTyxpQkFBaUIsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUN4QywrQ0FBK0MsQ0FBQyxNQUFNLENBQ3RELENBQUE7UUFDRixDQUFDO0tBQ0QsQ0FBQyxDQUFBO0FBQ0gsQ0FBQztBQUVELE1BQU0sVUFBVSxLQUFLO0lBQ3BCLG1DQUFtQyxFQUFFLENBQUE7SUFDckMsa0NBQWtDLEVBQUUsQ0FBQTtJQUNwQywwQkFBMEIsRUFBRSxDQUFBO0lBQzVCLDZCQUE2QixFQUFFLENBQUE7SUFDL0IsaUNBQWlDLEVBQUUsQ0FBQTtJQUNuQywyQkFBMkIsRUFBRSxDQUFBO0lBQzdCLDJCQUEyQixFQUFFLENBQUE7SUFDN0Isa0NBQWtDLEVBQUUsQ0FBQTtJQUNwQyxnQ0FBZ0MsRUFBRSxDQUFBO0lBQ2xDLHVDQUF1QyxFQUFFLENBQUE7SUFDekMsMkJBQTJCLEVBQUUsQ0FBQTtJQUM3QiwwQ0FBMEMsRUFBRSxDQUFBO0FBQzdDLENBQUMifQ==