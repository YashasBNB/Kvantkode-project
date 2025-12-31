/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { isWindows, isMacintosh } from '../../../../base/common/platform.js';
import { Schemas } from '../../../../base/common/network.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { KeybindingsRegistry, } from '../../../../platform/keybinding/common/keybindingsRegistry.js';
import { EditorContextKeys } from '../../../../editor/common/editorContextKeys.js';
import { KeyChord } from '../../../../base/common/keyCodes.js';
import { getMultiSelectedResources, IExplorerService } from '../browser/files.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { revealResourcesInOS } from './fileCommands.js';
import { MenuRegistry, MenuId } from '../../../../platform/actions/common/actions.js';
import { ResourceContextKey } from '../../../common/contextkeys.js';
import { appendToCommandPalette, appendEditorTitleContextMenuItem, } from '../browser/fileActions.contribution.js';
import { SideBySideEditor, EditorResourceAccessor } from '../../../common/editor.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { IListService } from '../../../../platform/list/browser/listService.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
const REVEAL_IN_OS_COMMAND_ID = 'revealFileInOS';
const REVEAL_IN_OS_LABEL = isWindows
    ? nls.localize2('revealInWindows', 'Reveal in File Explorer')
    : isMacintosh
        ? nls.localize2('revealInMac', 'Reveal in Finder')
        : nls.localize2('openContainer', 'Open Containing Folder');
const REVEAL_IN_OS_WHEN_CONTEXT = ContextKeyExpr.or(ResourceContextKey.Scheme.isEqualTo(Schemas.file), ResourceContextKey.Scheme.isEqualTo(Schemas.vscodeUserData));
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: REVEAL_IN_OS_COMMAND_ID,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: EditorContextKeys.focus.toNegated(),
    primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 48 /* KeyCode.KeyR */,
    win: {
        primary: 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 48 /* KeyCode.KeyR */,
    },
    handler: (accessor, resource) => {
        const resources = getMultiSelectedResources(resource, accessor.get(IListService), accessor.get(IEditorService), accessor.get(IEditorGroupsService), accessor.get(IExplorerService));
        revealResourcesInOS(resources, accessor.get(INativeHostService), accessor.get(IWorkspaceContextService));
    },
});
const REVEAL_ACTIVE_FILE_IN_OS_COMMAND_ID = 'workbench.action.files.revealActiveFileInWindows';
KeybindingsRegistry.registerCommandAndKeybindingRule({
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: undefined,
    primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 48 /* KeyCode.KeyR */),
    id: REVEAL_ACTIVE_FILE_IN_OS_COMMAND_ID,
    handler: (accessor) => {
        const editorService = accessor.get(IEditorService);
        const activeInput = editorService.activeEditor;
        const resource = EditorResourceAccessor.getOriginalUri(activeInput, {
            filterByScheme: Schemas.file,
            supportSideBySide: SideBySideEditor.PRIMARY,
        });
        const resources = resource ? [resource] : [];
        revealResourcesInOS(resources, accessor.get(INativeHostService), accessor.get(IWorkspaceContextService));
    },
});
appendEditorTitleContextMenuItem(REVEAL_IN_OS_COMMAND_ID, REVEAL_IN_OS_LABEL.value, REVEAL_IN_OS_WHEN_CONTEXT, '2_files', false, 0);
// Menu registration - open editors
const revealInOsCommand = {
    id: REVEAL_IN_OS_COMMAND_ID,
    title: REVEAL_IN_OS_LABEL.value,
};
MenuRegistry.appendMenuItem(MenuId.OpenEditorsContext, {
    group: 'navigation',
    order: 20,
    command: revealInOsCommand,
    when: REVEAL_IN_OS_WHEN_CONTEXT,
});
MenuRegistry.appendMenuItem(MenuId.OpenEditorsContextShare, {
    title: nls.localize('miShare', 'Share'),
    submenu: MenuId.MenubarShare,
    group: 'share',
    order: 3,
});
// Menu registration - explorer
MenuRegistry.appendMenuItem(MenuId.ExplorerContext, {
    group: 'navigation',
    order: 20,
    command: revealInOsCommand,
    when: REVEAL_IN_OS_WHEN_CONTEXT,
});
// Command Palette
const category = nls.localize2('filesCategory', 'File');
appendToCommandPalette({
    id: REVEAL_IN_OS_COMMAND_ID,
    title: REVEAL_IN_OS_LABEL,
    category: category,
}, REVEAL_IN_OS_WHEN_CONTEXT);
// Menu registration - chat attachments context
MenuRegistry.appendMenuItem(MenuId.ChatAttachmentsContext, {
    group: 'navigation',
    order: 20,
    command: revealInOsCommand,
    when: REVEAL_IN_OS_WHEN_CONTEXT,
});
// Menu registration - chat inline anchor
MenuRegistry.appendMenuItem(MenuId.ChatInlineResourceAnchorContext, {
    group: 'navigation',
    order: 20,
    command: revealInOsCommand,
    when: REVEAL_IN_OS_WHEN_CONTEXT,
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZUFjdGlvbnMuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZmlsZXMvZWxlY3Ryb24tc2FuZGJveC9maWxlQWN0aW9ucy5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUV6QyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUM3RixPQUFPLEVBQUUsU0FBUyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzVFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUNqRixPQUFPLEVBQ04sbUJBQW1CLEdBRW5CLE1BQU0sK0RBQStELENBQUE7QUFDdEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDbEYsT0FBTyxFQUFtQixRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUUvRSxPQUFPLEVBQUUseUJBQXlCLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUNqRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDakYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sbUJBQW1CLENBQUE7QUFDdkQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNyRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNuRSxPQUFPLEVBQ04sc0JBQXNCLEVBQ3RCLGdDQUFnQyxHQUNoQyxNQUFNLHdDQUF3QyxDQUFBO0FBQy9D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