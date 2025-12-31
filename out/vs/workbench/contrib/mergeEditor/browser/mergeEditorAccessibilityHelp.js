/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { localize } from '../../../../nls.js';
import { AccessibleContentProvider, } from '../../../../platform/accessibility/browser/accessibleView.js';
import { ContextKeyEqualsExpr } from '../../../../platform/contextkey/common/contextkey.js';
export class MergeEditorAccessibilityHelpProvider {
    constructor() {
        this.name = 'mergeEditor';
        this.type = "help" /* AccessibleViewType.Help */;
        this.priority = 125;
        this.when = ContextKeyEqualsExpr.create('isMergeEditor', true);
    }
    getProvider(accessor) {
        const codeEditorService = accessor.get(ICodeEditorService);
        const codeEditor = codeEditorService.getActiveCodeEditor() || codeEditorService.getFocusedCodeEditor();
        if (!codeEditor) {
            return;
        }
        const content = [
            localize('msg1', 'You are in a merge editor.'),
            localize('msg2', 'Navigate between merge conflicts using the commands Go to Next Unhandled Conflict{0} and Go to Previous Unhandled Conflict{1}.', '<keybinding:merge.goToNextUnhandledConflict>', '<keybinding:merge.goToPreviousUnhandledConflict>'),
            localize('msg3', 'Run the command Merge Editor: Accept All Changes from the Left{0} and Merge Editor: Accept All Changes from the Right{1}', '<keybinding:merge.acceptAllInput1>', '<keybinding:merge.acceptAllInput2>'),
        ];
        return new AccessibleContentProvider("mergeEditor" /* AccessibleViewProviderId.MergeEditor */, { type: "help" /* AccessibleViewType.Help */ }, () => content.join('\n'), () => codeEditor.focus(), "accessibility.verbosity.mergeEditor" /* AccessibilityVerbositySettingId.MergeEditor */);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVyZ2VFZGl0b3JBY2Nlc3NpYmlsaXR5SGVscC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21lcmdlRWRpdG9yL2Jyb3dzZXIvbWVyZ2VFZGl0b3JBY2Nlc3NpYmlsaXR5SGVscC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUM3RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUNOLHlCQUF5QixHQUd6QixNQUFNLDhEQUE4RCxDQUFBO0FBRXJFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBSTNGLE1BQU0sT0FBTyxvQ0FBb0M7SUFBakQ7UUFDVSxTQUFJLEdBQUcsYUFBYSxDQUFBO1FBQ3BCLFNBQUksd0NBQTBCO1FBQzlCLGFBQVEsR0FBRyxHQUFHLENBQUE7UUFDZCxTQUFJLEdBQUcsb0JBQW9CLENBQUMsTUFBTSxDQUFDLGVBQWUsRUFBRSxJQUFJLENBQUMsQ0FBQTtJQWtDbkUsQ0FBQztJQWpDQSxXQUFXLENBQUMsUUFBMEI7UUFDckMsTUFBTSxpQkFBaUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUE7UUFFMUQsTUFBTSxVQUFVLEdBQ2YsaUJBQWlCLENBQUMsbUJBQW1CLEVBQUUsSUFBSSxpQkFBaUIsQ0FBQyxvQkFBb0IsRUFBRSxDQUFBO1FBQ3BGLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUNqQixPQUFNO1FBQ1AsQ0FBQztRQUVELE1BQU0sT0FBTyxHQUFHO1lBQ2YsUUFBUSxDQUFDLE1BQU0sRUFBRSw0QkFBNEIsQ0FBQztZQUM5QyxRQUFRLENBQ1AsTUFBTSxFQUNOLGdJQUFnSSxFQUNoSSw4Q0FBOEMsRUFDOUMsa0RBQWtELENBQ2xEO1lBQ0QsUUFBUSxDQUNQLE1BQU0sRUFDTiwwSEFBMEgsRUFDMUgsb0NBQW9DLEVBQ3BDLG9DQUFvQyxDQUNwQztTQUNELENBQUE7UUFFRCxPQUFPLElBQUkseUJBQXlCLDJEQUVuQyxFQUFFLElBQUksc0NBQXlCLEVBQUUsRUFDakMsR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFDeEIsR0FBRyxFQUFFLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRSwwRkFFeEIsQ0FBQTtJQUNGLENBQUM7Q0FDRCJ9