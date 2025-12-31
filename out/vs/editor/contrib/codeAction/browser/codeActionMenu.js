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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZUFjdGlvbk1lbnUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9jb2RlQWN0aW9uL2Jyb3dzZXIvY29kZUFjdGlvbk1lbnUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyx1REFBdUQsQ0FBQSxDQUFDLGdFQUFnRTtBQUMvSCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFJN0QsT0FBTyxFQUFrQixjQUFjLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUNuRSxPQUFPLDBDQUEwQyxDQUFBLENBQUMsOEVBQThFO0FBQ2hJLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUs3QyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQVE5RSxNQUFNLDRCQUE0QixHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQWM7SUFDL0QsSUFBSSxFQUFFLGdCQUFnQixDQUFDLEtBQUs7SUFDNUIsS0FBSyxFQUFFLFFBQVEsQ0FBQywyQkFBMkIsRUFBRSxpQkFBaUIsQ0FBQztDQUMvRCxDQUFDLENBQUE7QUFFRixNQUFNLGdCQUFnQixHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQWdCO0lBQ3JELEVBQUUsSUFBSSxFQUFFLGNBQWMsQ0FBQyxRQUFRLEVBQUUsS0FBSyxFQUFFLFFBQVEsQ0FBQywrQkFBK0IsRUFBRSxXQUFXLENBQUMsRUFBRTtJQUNoRztRQUNDLElBQUksRUFBRSxjQUFjLENBQUMsZUFBZTtRQUNwQyxLQUFLLEVBQUUsUUFBUSxDQUFDLDhCQUE4QixFQUFFLFNBQVMsQ0FBQztRQUMxRCxJQUFJLEVBQUUsT0FBTyxDQUFDLE1BQU07S0FDcEI7SUFDRDtRQUNDLElBQUksRUFBRSxjQUFjLENBQUMsY0FBYztRQUNuQyxLQUFLLEVBQUUsUUFB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