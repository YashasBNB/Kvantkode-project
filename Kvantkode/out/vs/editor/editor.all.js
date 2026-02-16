/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './browser/coreCommands.js';
import './browser/widget/codeEditor/codeEditorWidget.js';
import './browser/widget/diffEditor/diffEditor.contribution.js';
import './contrib/anchorSelect/browser/anchorSelect.js';
import './contrib/bracketMatching/browser/bracketMatching.js';
import './contrib/caretOperations/browser/caretOperations.js';
import './contrib/caretOperations/browser/transpose.js';
import './contrib/clipboard/browser/clipboard.js';
import './contrib/codeAction/browser/codeActionContributions.js';
import './contrib/codelens/browser/codelensController.js';
import './contrib/colorPicker/browser/colorPickerContribution.js';
import './contrib/comment/browser/comment.js';
import './contrib/contextmenu/browser/contextmenu.js';
import './contrib/cursorUndo/browser/cursorUndo.js';
import './contrib/dnd/browser/dnd.js';
import './contrib/dropOrPasteInto/browser/copyPasteContribution.js';
import './contrib/dropOrPasteInto/browser/dropIntoEditorContribution.js';
import './contrib/find/browser/findController.js';
import './contrib/folding/browser/folding.js';
import './contrib/fontZoom/browser/fontZoom.js';
import './contrib/format/browser/formatActions.js';
import './contrib/documentSymbols/browser/documentSymbols.js';
import './contrib/inlineCompletions/browser/inlineCompletions.contribution.js';
import './contrib/inlineProgress/browser/inlineProgress.js';
import './contrib/gotoSymbol/browser/goToCommands.js';
import './contrib/gotoSymbol/browser/link/goToDefinitionAtPosition.js';
import './contrib/gotoError/browser/gotoError.js';
import './contrib/gpu/browser/gpuActions.js';
import './contrib/hover/browser/hoverContribution.js';
import './contrib/indentation/browser/indentation.js';
import './contrib/inlayHints/browser/inlayHintsContribution.js';
import './contrib/inPlaceReplace/browser/inPlaceReplace.js';
import './contrib/insertFinalNewLine/browser/insertFinalNewLine.js';
import './contrib/lineSelection/browser/lineSelection.js';
import './contrib/linesOperations/browser/linesOperations.js';
import './contrib/linkedEditing/browser/linkedEditing.js';
import './contrib/links/browser/links.js';
import './contrib/longLinesHelper/browser/longLinesHelper.js';
import './contrib/multicursor/browser/multicursor.js';
import './contrib/parameterHints/browser/parameterHints.js';
import './contrib/placeholderText/browser/placeholderText.contribution.js';
import './contrib/rename/browser/rename.js';
import './contrib/sectionHeaders/browser/sectionHeaders.js';
import './contrib/semanticTokens/browser/documentSemanticTokens.js';
import './contrib/semanticTokens/browser/viewportSemanticTokens.js';
import './contrib/smartSelect/browser/smartSelect.js';
import './contrib/snippet/browser/snippetController2.js';
import './contrib/stickyScroll/browser/stickyScrollContribution.js';
import './contrib/suggest/browser/suggestController.js';
import './contrib/suggest/browser/suggestInlineCompletions.js';
import './contrib/tokenization/browser/tokenization.js';
import './contrib/toggleTabFocusMode/browser/toggleTabFocusMode.js';
import './contrib/unicodeHighlighter/browser/unicodeHighlighter.js';
import './contrib/unusualLineTerminators/browser/unusualLineTerminators.js';
import './contrib/wordHighlighter/browser/wordHighlighter.js';
import './contrib/wordOperations/browser/wordOperations.js';
import './contrib/wordPartOperations/browser/wordPartOperations.js';
import './contrib/readOnlyMessage/browser/contribution.js';
import './contrib/diffEditorBreadcrumbs/browser/contribution.js';
// Load up these strings even in VSCode, even if they are not used
// in order to get them translated
import './common/standaloneStrings.js';
import '../base/browser/ui/codicons/codiconStyles.js'; // The codicons are defined here and must be loaded
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yLmFsbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2VkaXRvci5hbGwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTywyQkFBMkIsQ0FBQTtBQUNsQyxPQUFPLGlEQUFpRCxDQUFBO0FBQ3hELE9BQU8sd0RBQXdELENBQUE7QUFDL0QsT0FBTyxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLDBDQUEwQyxDQUFBO0FBQ2pELE9BQU8seURBQXlELENBQUE7QUFDaEUsT0FBTyxrREFBa0QsQ0FBQTtBQUN6RCxPQUFPLDBEQUEwRCxDQUFBO0FBQ2pFLE9BQU8sc0NBQXNDLENBQUE7QUFDN0MsT0FBTyw4Q0FBOEMsQ0FBQTtBQUNyRCxPQUFPLDRDQUE0QyxDQUFBO0FBQ25ELE9BQU8sOEJBQThCLENBQUE7QUFDckMsT0FBTyw0REFBNEQsQ0FBQTtBQUNuRSxPQUFPLGlFQUFpRSxDQUFBO0FBQ3hFLE9BQU8sMENBQTBDLENBQUE7QUFDakQsT0FBTyxzQ0FBc0MsQ0FBQTtBQUM3QyxPQUFPLHdDQUF3QyxDQUFBO0FBQy9DLE9BQU8sMkNBQTJDLENBQUE7QUFDbEQsT0FBTyxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLHVFQUF1RSxDQUFBO0FBQzlFLE9BQU8sb0RBQW9ELENBQUE7QUFDM0QsT0FBTyw4Q0FBOEMsQ0FBQTtBQUNyRCxPQUFPLCtEQUErRCxDQUFBO0FBQ3RFLE9BQU8sMENBQTBDLENBQUE7QUFDakQsT0FBTyxxQ0FBcUMsQ0FBQTtBQUM1QyxPQUFPLDhDQUE4QyxDQUFBO0FBQ3JELE9BQU8sOENBQThDLENBQUE7QUFDckQsT0FBTyx3REFBd0QsQ0FBQTtBQUMvRCxPQUFPLG9EQUFvRCxDQUFBO0FBQzNELE9BQU8sNERBQTRELENBQUE7QUFDbkUsT0FBTyxrREFBa0QsQ0FBQTtBQUN6RCxPQUFPLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sa0RBQWtELENBQUE7QUFDekQsT0FBTyxrQ0FBa0MsQ0FBQTtBQUN6QyxPQUFPLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sOENBQThDLENBQUE7QUFDckQsT0FBTyxvREFBb0QsQ0FBQTtBQUMzRCxPQUFPLG1FQUFtRSxDQUFBO0FBQzFFLE9BQU8sb0NBQW9DLENBQUE7QUFDM0MsT0FBTyxvREFBb0QsQ0FBQTtBQUMzRCxPQUFPLDREQUE0RCxDQUFBO0FBQ25FLE9BQU8sNERBQTRELENBQUE7QUFDbkUsT0FBTyw4Q0FBOEMsQ0FBQTtBQUNyRCxPQUFPLGlEQUFpRCxDQUFBO0FBQ3hELE9BQU8sNERBQTRELENBQUE7QUFDbkUsT0FBTyxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLHVEQUF1RCxDQUFBO0FBQzlELE9BQU8sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyw0REFBNEQsQ0FBQTtBQUNuRSxPQUFPLDREQUE0RCxDQUFBO0FBQ25FLE9BQU8sb0VBQW9FLENBQUE7QUFDM0UsT0FBTyxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLG9EQUFvRCxDQUFBO0FBQzNELE9BQU8sNERBQTRELENBQUE7QUFDbkUsT0FBTyxtREFBbUQsQ0FBQTtBQUMxRCxPQUFPLHlEQUF5RCxDQUFBO0FBRWhFLGtFQUFrRTtBQUNsRSxrQ0FBa0M7QUFDbEMsT0FBTywrQkFBK0IsQ0FBQTtBQUV0QyxPQUFPLDhDQUE4QyxDQUFBLENBQUMsbURBQW1EIn0=