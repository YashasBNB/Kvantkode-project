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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2ltcGxlRWRpdG9yT3B0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NvZGVFZGl0b3IvYnJvd3Nlci9zaW1wbGVFZGl0b3JPcHRpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBSWhHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ3JHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGtFQUFrRSxDQUFBO0FBQ3JHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGlFQUFpRSxDQUFBO0FBQ25HLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUNsRCxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNqRixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUV6RixPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUU5RixPQUFPLEVBQ04sbUJBQW1CLEVBQ25CLGVBQWUsRUFDZixlQUFlLEVBQ2YseUJBQXlCLEdBQ3pCLE1BQU0sb0RBQW9ELENBQUE7QUFFM0QsTUFBTSxVQUFVLHNCQUFzQixDQUNyQyxvQkFBMkM7SUFFM0MsT0FBTztRQUNOLFFBQVEsRUFBRSxJQUFJO1FBQ2Qsa0JBQWtCLEVBQUUsQ0FBQztRQUNyQixXQUFXLEVBQUUsS0FBSztRQUNsQixXQUFXLEVBQUUsS0FBSztRQUNsQixPQUFPLEVBQUUsS0FBSztRQUNkLG1CQUFtQixFQUFFLEtBQUs7UUFDMUIseUJBQXlCLEVBQUUsSUFBSTtRQUMvQixrQkFBa0IsRUFBRSxLQUFLO1FBQ3pCLFNBQVMsRUFBRTtZQUNWLFVBQVUsRUFBRSxRQUFRO1lBQ3BCLHVCQUF1QixFQUFFLEtBQUs7U0FDOUI7UUFDRCxvQkFBb0IsRUFBRSxDQUFDO1FBQ3ZCLG1CQUFtQixFQUFFLEtBQUs7UUFDMUIsb0JBQW9CLEVBQUUsS0FBSztRQUMzQixtQkFBbUIsRUFBRSxNQUFNO1FBQzNCLG9CQUFvQixFQUFFLElBQUk7UUFDMUIsdUJBQXVCLEVBQUUsT0FBTztRQUNoQyxXQUFXLEVBQUUsS0FBSztRQUNsQiw0QkFBNEIsRUFBRSxDQUFDO1FBQy9CLE9BQU8sRUFBRTtZQUNSLE9BQU8sRUFBRSxLQUFLO1NBQ2Q7UUFDRCxNQUFNLEVBQUU7WUFDUCxXQUFXLEVBQUUsS0FBSztTQUNsQjtRQUNELG9CQUFvQixFQUFFLG9CQUFvQixDQUFDLFFBQVEsQ0FDbEQsNkJBQTZCLENBQzdCO1FBQ0QsY0FBYyxFQUFFLG9CQUFvQixDQUFDLFFBQVEsQ0FFM0MsdUJBQXVCLENBQUM7UUFDMUIsOEJBQThCLEVBQUUsb0JBQW9CLENBQUMsUUFBUSxDQUM1RCx1Q0FBdUMsQ0FDdkM7UUFDRCxzQkFBc0IsRUFBRSxPQUFPO0tBQy9CLENBQUE7QUFDRixDQUFDO0FBRUQsTUFBTSxVQUFVLGdDQUFnQztJQUMvQyxPQUFPO1FBQ04sY0FBYyxFQUFFLElBQUk7UUFDcEIsYUFBYSxFQUFFLHdCQUF3QixDQUFDLDBCQUEwQixDQUFDO1lBQ2xFLGFBQWEsQ0FBQyxFQUFFO1lBQ2hCLGdDQUFnQztZQUNoQyxxQkFBcUIsQ0FBQyxFQUFFO1lBQ3hCLGlCQUFpQixDQUFDLEVBQUU7WUFDcEIsa0JBQWtCLENBQUMsRUFBRTtZQUNyQix1QkFBdUIsQ0FBQyxFQUFFO1NBQzFCLENBQUM7S0FDRixDQUFBO0FBQ0YsQ0FBQztBQUVEOzs7R0FHRztBQUNILE1BQU0sVUFBVSxpQ0FBaUMsQ0FBQyx1QkFBK0I7SUFDaEYsbUNBQW1DO0lBQ25DLE9BQU8sMEJBQTBCLENBQUMsQ0FBQyxLQUFLLEVBQUUsU0FBUyxFQUFFLEVBQUU7UUFDdEQsTUFBTSx3QkFBd0IsR0FBRyxLQUFLLENBQUMsUUFBUSxDQUFDLG1CQUFtQixDQUFDLENBQUE7UUFFcEUsSUFBSSx3QkFBd0IsRUFBRSxDQUFDO1lBQzlCLGlDQUFpQztZQUNqQyxNQUFNLG9CQUFvQixHQUFHLEtBQUssQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLENBQUE7WUFDNUQsSUFBSSxvQkFBb0IsRUFBRSxDQUFDO2dCQUMxQixTQUFTLENBQUMsT0FBTyxDQUNoQixHQUFHLHVCQUF1QixrREFBa0Qsb0JBQW9CLE1BQU0sQ0FDdEcsQ0FBQTtnQkFDRCxTQUFTLENBQUMsT0FBTyxDQUNoQixHQUFHLHVCQUF1QixzREFBc0Qsb0JBQW9CLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQzFILENBQUE7WUFDRixDQUFDO1lBRUQsdUJBQXVCO1lBQ3ZCLE1BQU0sb0JBQW9CLEdBQUcsS0FBSyxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsQ0FBQTtZQUM1RCxJQUFJLG9CQUFvQixFQUFFLENBQUM7Z0JBQzFCLFNBQVMsQ0FBQyxPQUFPLENBQ2hCLEdBQUcsdUJBQXVCLGlFQUFpRSxvQkFBb0IsS0FBSyxDQUNwSCxDQUFBO1lBQ0YsQ0FBQztZQUVELFNBQVMsQ0FBQyxPQUFPLENBQ2hCLEdBQUcsdUJBQXVCLCtEQUErRCx3QkFBd0IsS0FBSyxDQUN0SCxDQUFBO1FBQ0YsQ0FBQzthQUFNLENBQUM7WUFDUCwrRUFBK0U7WUFDL0UsU0FBUyxDQUFDLE9BQU8sQ0FDaEIsR0FBRyx1QkFBdUIsK0RBQStELEtBQUssQ0FBQyxRQUFRLENBQUMseUJBQXlCLENBQUMsS0FBSyxDQUN2SSxDQUFBO1FBQ0YsQ0FBQztJQUNGLENBQUMsQ0FBQyxDQUFBO0FBQ0gsQ0FBQyJ9