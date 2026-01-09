/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ContextMenuController } from '../../../../editor/contrib/contextmenu/browser/contextmenu.js';
import { SnippetController2 } from '../../../../editor/contrib/snippet/browser/snippetController2.js';
import { SuggestController } from '../../../../editor/contrib/suggest/browser/suggestController.js';
import { MenuPreventer } from './menuPreventer.js';
import { SelectionClipboardContributionID } from './selectionClipboard.js';
import { TabCompletionController } from '../../snippets/browser/tabCompletion.js';
import { EditorExtensionsRegistry } from '../../../../editor/browser/editorExtensions.js';
import { registerThemingParticipant } from '../../../../platform/theme/common/themeService.js';
import { selectionBackground, inputBackground, inputForeground, editorSelectionBackground, } from '../../../../platform/theme/common/colorRegistry.js';
export function getSimpleEditorOptions(configurationService) {
    return {
        wordWrap: 'on',
        overviewRulerLanes: 0,
        glyphMargin: false,
        lineNumbers: 'off',
        folding: false,
        selectOnLineNumbers: false,
        hideCursorInOverviewRuler: true,
        selectionHighlight: false,
        scrollbar: {
            horizontal: 'hidden',
            alwaysConsumeMouseWheel: false,
        },
        lineDecorationsWidth: 0,
        overviewRulerBorder: false,
        scrollBeyondLastLine: false,
        renderLineHighlight: 'none',
        fixedOverflowWidgets: true,
        acceptSuggestionOnEnter: 'smart',
        dragAndDrop: false,
        revealHorizontalRightPadding: 5,
        minimap: {
            enabled: false,
        },
        guides: {
            indentation: false,
        },
        accessibilitySupport: configurationService.getValue('editor.accessibilitySupport'),
        cursorBlinking: configurationService.getValue('editor.cursorBlinking'),
        experimentalEditContextEnabled: configurationService.getValue('editor.experimentalEditContextEnabled'),
        defaultColorDecorators: 'never',
    };
}
export function getSimpleCodeEditorWidgetOptions() {
    return {
        isSimpleWidget: true,
        contributions: EditorExtensionsRegistry.getSomeEditorContributions([
            MenuPreventer.ID,
            SelectionClipboardContributionID,
            ContextMenuController.ID,
            SuggestController.ID,
            SnippetController2.ID,
            TabCompletionController.ID,
        ]),
    };
}
/**
 * Should be called to set the styling on editors that are appearing as just input boxes
 * @param editorContainerSelector An element selector that will match the container of the editor
 */
export function setupSimpleEditorSelectionStyling(editorContainerSelector) {
    // Override styles in selections.ts
    return registerThemingParticipant((theme, collector) => {
        const selectionBackgroundColor = theme.getColor(selectionBackground);
        if (selectionBackgroundColor) {
            // Override inactive selection bg
            const inputBackgroundColor = theme.getColor(inputBackground);
            if (inputBackgroundColor) {
                collector.addRule(`${editorContainerSelector} .monaco-editor-background { background-color: ${inputBackgroundColor}; } `);
                collector.addRule(`${editorContainerSelector} .monaco-editor .selected-text { background-color: ${inputBackgroundColor.transparent(0.4)}; }`);
            }
            // Override selected fg
            const inputForegroundColor = theme.getColor(inputForeground);
            if (inputForegroundColor) {
                collector.addRule(`${editorContainerSelector} .monaco-editor .view-line span.inline-selected-text { color: ${inputForegroundColor}; }`);
            }
            collector.addRule(`${editorContainerSelector} .monaco-editor .focused .selected-text { background-color: ${selectionBackgroundColor}; }`);
        }
        else {
            // Use editor selection color if theme has not set a selection background color
            collector.addRule(`${editorContainerSelector} .monaco-editor .focused .selected-text { background-color: ${theme.getColor(editorSelectionBackground)}; }`);
        }
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2ltcGxlRWRpdG9yT3B0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY29kZUVkaXRvci9icm93c2VyL3NpbXBsZUVkaXRvck9wdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFJaEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDckcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sa0VBQWtFLENBQUE7QUFDckcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0saUVBQWlFLENBQUE7QUFDbkcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQ2xELE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQzFFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ2pGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBRXpGLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBRTlGLE9BQU8sRUFDTixtQkFBbUIsRUFDbkIsZUFBZSxFQUNmLGVBQWUsRUFDZix5QkFBeUIsR0FDekIsTUFBTSxvREFBb0QsQ0FBQTtBQUUzRCxNQUFNLFVBQVUsc0JBQXNCLENBQ3JDLG9CQUEyQztJQUUzQyxPQUFPO1FBQ04sUUFBUSxFQUFFLElBQUk7UUFDZCxrQkFBa0IsRUFBRSxDQUFDO1FBQ3JCLFdBQVcsRUFBRSxLQUFLO1FBQ2xCLFdBQVcsRUFBRSxLQUFLO1FBQ2xCLE9BQU8sRUFBRSxLQUFLO1FBQ2QsbUJBQW1CLEVBQUUsS0FBSztRQUMxQix5QkFBeUIsRUFBRSxJQUFJO1FBQy9CLGtCQUFrQixFQUFFLEtBQUs7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