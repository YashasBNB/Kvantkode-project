/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import '../../../../base/browser/ui/codicons/codiconStyles.js'; // The codicon symbol styles are defined here and must be loaded
import { Codicon } from '../../../../base/common/codicons.js';
import { CodeActionKind } from '../common/types.js';
import '../../symbolIcons/browser/symbolIcons.js'; // The codicon symbol colors are defined here and must be loaded to get colors
import { localize } from '../../../../nls.js';
import { HierarchicalKind } from '../../../../base/common/hierarchicalKind.js';
const uncategorizedCodeActionGroup = Object.freeze({
    kind: HierarchicalKind.Empty,
    title: localize('codeAction.widget.id.more', 'More Actions...'),
});
const codeActionGroups = Object.freeze([
    { kind: CodeActionKind.QuickFix, title: localize('codeAction.widget.id.quickfix', 'Quick Fix') },
    {
        kind: CodeActionKind.RefactorExtract,
        title: localize('codeAction.widget.id.extract', 'Extract'),
        icon: Codicon.wrench,
    },
    {
        kind: CodeActionKind.RefactorInline,
        title: localize('codeAction.widget.id.inline', 'Inline'),
        icon: Codicon.wrench,
    },
    {
        kind: CodeActionKind.RefactorRewrite,
        title: localize('codeAction.widget.id.convert', 'Rewrite'),
        icon: Codicon.wrench,
    },
    {
        kind: CodeActionKind.RefactorMove,
        title: localize('codeAction.widget.id.move', 'Move'),
        icon: Codicon.wrench,
    },
    {
        kind: CodeActionKind.SurroundWith,
        title: localize('codeAction.widget.id.surround', 'Surround With'),
        icon: Codicon.surroundWith,
    },
    {
        kind: CodeActionKind.Source,
        title: localize('codeAction.widget.id.source', 'Source Action'),
        icon: Codicon.symbolFile,
    },
    uncategorizedCodeActionGroup,
]);
export function toMenuItems(inputCodeActions, showHeaders, keybindingResolver) {
    if (!showHeaders) {
        return inputCodeActions.map((action) => {
            return {
                kind: "action" /* ActionListItemKind.Action */,
                item: action,
                group: uncategorizedCodeActionGroup,
                disabled: !!action.action.disabled,
                label: action.action.disabled || action.action.title,
                canPreview: !!action.action.edit?.edits.length,
            };
        });
    }
    // Group code actions
    const menuEntries = codeActionGroups.map((group) => ({ group, actions: [] }));
    for (const action of inputCodeActions) {
        const kind = action.action.kind
            ? new HierarchicalKind(action.action.kind)
            : HierarchicalKind.None;
        for (const menuEntry of menuEntries) {
            if (menuEntry.group.kind.contains(kind)) {
                menuEntry.actions.push(action);
                break;
            }
        }
    }
    const allMenuItems = [];
    for (const menuEntry of menuEntries) {
        if (menuEntry.actions.length) {
            allMenuItems.push({ kind: "header" /* ActionListItemKind.Header */, group: menuEntry.group });
            for (const action of menuEntry.actions) {
                const group = menuEntry.group;
                allMenuItems.push({
                    kind: "action" /* ActionListItemKind.Action */,
                    item: action,
                    group: action.action.isAI
                        ? { title: group.title, kind: group.kind, icon: Codicon.sparkle }
                        : group,
                    label: action.action.title,
                    disabled: !!action.action.disabled,
                    keybinding: keybindingResolver(action.action),
                });
            }
        }
    }
    return allMenuItems;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZUFjdGlvbk1lbnUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2NvZGVBY3Rpb24vYnJvd3Nlci9jb2RlQWN0aW9uTWVudS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLHVEQUF1RCxDQUFBLENBQUMsZ0VBQWdFO0FBQy9ILE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUk3RCxPQUFPLEVBQWtCLGNBQWMsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQ25FLE9BQU8sMENBQTBDLENBQUEsQ0FBQyw4RUFBOEU7QUFDaEksT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBSzdDLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBUTlFLE1BQU0sNEJBQTRCLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBYztJQUMvRCxJQUFJLEVBQUUsZ0JBQWdCLENBQUMsS0FBSztJQUM1QixLQUFLLEVBQUUsUUFBUSxDQUFDLDJCQUEyQixFQUFFLGlCQUFpQixDQUFDO0NBQy9ELENBQUMsQ0FBQTtBQUVGLE1BQU0sZ0JBQWdCLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBZ0I7SUFDckQsRUFBRSxJQUFJLEVBQUUsY0FBYyxDQUFDLFFBQVEsRUFBRSxLQUFLLEVBQUUsUUFBUSxDQUFDLCtCQUErQixFQUFFLFdBQVcsQ0FBQyxFQUFFO0lBQ2hHO1FBQ0MsSUFBSSxFQUFFLGNBQWMsQ0FBQyxlQUFlO1FBQ3BDLEtBQUssRUFBRSxRQUFRLENBQUMsOEJBQThCLEVBQUUsU0FBUyxDQUFDO1FBQzFELElBQUksRUFBRSxPQUFPLENBQUMsTUFBTTtLQUNwQjtJQUNEO1FBQ0MsSUFBSSxFQUFFLGNBQWMsQ0FBQyxjQUFjO1FBQ25DLEtBQUssRUFB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