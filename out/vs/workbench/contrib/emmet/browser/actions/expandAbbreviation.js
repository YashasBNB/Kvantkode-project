/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../../nls.js';
import { EmmetEditorAction } from '../emmetActions.js';
import { registerEditorAction } from '../../../../../editor/browser/editorExtensions.js';
import { EditorContextKeys } from '../../../../../editor/common/editorContextKeys.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { MenuId } from '../../../../../platform/actions/common/actions.js';
class ExpandAbbreviationAction extends EmmetEditorAction {
    constructor() {
        super({
            id: 'editor.emmet.action.expandAbbreviation',
            label: nls.localize2('expandAbbreviationAction', 'Emmet: Expand Abbreviation'),
            precondition: EditorContextKeys.writable,
            actionName: 'expand_abbreviation',
            kbOpts: {
                primary: 2 /* KeyCode.Tab */,
                kbExpr: ContextKeyExpr.and(EditorContextKeys.editorTextFocus, EditorContextKeys.tabDoesNotMoveFocus, ContextKeyExpr.has('config.emmet.triggerExpansionOnTab')),
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
            menuOpts: {
                menuId: MenuId.MenubarEditMenu,
                group: '5_insert',
                title: nls.localize({ key: 'miEmmetExpandAbbreviation', comment: ['&& denotes a mnemonic'] }, 'Emmet: E&&xpand Abbreviation'),
                order: 3,
            },
        });
    }
}
registerEditorAction(ExpandAbbreviationAction);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhwYW5kQWJicmV2aWF0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZW1tZXQvYnJvd3Nlci9hY3Rpb25zL2V4cGFuZEFiYnJldmlhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLEtBQUssR0FBRyxNQUFNLHVCQUF1QixDQUFBO0FBQzVDLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQ3RELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ3hGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBRXJGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUV4RixPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFFMUUsTUFBTSx3QkFBeUIsU0FBUSxpQkFBaUI7SUFDdkQ7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsd0NBQXdDO1lBQzVDLEtBQUssRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLDBCQUEwQixFQUFFLDRCQUE0QixDQUFDO1lBQzlFLFlBQVksRUFBRSxpQkFBaUIsQ0FBQyxRQUFRO1lBQ3hDLFVBQVUsRUFBRSxxQkFBcUI7WUFDakMsTUFBTSxFQUFFO2dCQUNQLE9BQU8scUJBQWE7Z0JBQ3BCLE1BQU0sRUFBRSxjQUFjLENBQUMsR0FBRyxDQUN6QixpQkFBaUIsQ0FBQyxlQUFlLEVBQ2pDLGlCQUFpQixDQUFDLG1CQUFtQixFQUNyQyxjQUFjLENBQUMsR0FBRyxDQUFDLG9DQUFvQyxDQUFDLENBQ3hEO2dCQUNELE1BQU0sMENBQWdDO2FBQ3RDO1lBQ0QsUUFBUSxFQUFFO2dCQUNULE1BQU0sRUFBRSxNQUFNLENBQUMsZUFBZTtnQkFDOUIsS0FBSyxFQUFFLFVBQVU7Z0JBQ2pCLEtBQUssRUFBRSxHQUFHLENBQUMsUUFBUSxDQUNsQixFQUFFLEdBQUcsRUFBRSwyQkFBMkIsRUFBRSxPQUFPLEVBQUUsQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLEVBQ3hFLDhCQUE4QixDQUM5QjtnQkFDRCxLQUFLLEVBQUUsQ0FBQzthQUNSO1NBQ0QsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztDQUNEO0FBRUQsb0JBQW9CLENBQUMsd0JBQXdCLENBQUMsQ0FBQSJ9