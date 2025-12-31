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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yLmFsbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9lZGl0b3IuYWxsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sMkJBQTJCLENBQUE7QUFDbEMsT0FBTyxpREFBaUQsQ0FBQTtBQUN4RCxPQUFPLHdEQUF3RCxDQUFBO0FBQy9ELE9BQU8sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sZ0RBQWdELENBQUE7QUFDdkQsT0FBTywwQ0FBMEMsQ0FBQTtBQUNqRCxPQUFPLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sa0RBQWtELENBQUE7QUFDekQsT0FBTywwREFBMEQsQ0FBQTtBQUNqRSxPQUFPLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sOENBQThDLENBQUE7QUFDckQsT0FBTyw0Q0FBNEMsQ0FBQTtBQUNuRCxPQUFPLDhCQUE4QixDQUFBO0FBQ3JDLE9BQU8sNERBQTRELENBQUE7QUFDbkUsT0FBTyxpRUFBaUUsQ0FBQTtBQUN4RSxPQUFPLDBDQUEwQyxDQUFBO0FBQ2pELE9BQU8sc0NBQXNDLENBQUE7QUFDN0MsT0FBTyx3Q0FBd0MsQ0FBQTtBQUMvQyxPQUFPLDJDQUEyQyxDQUFBO0FBQ2xELE9BQU8sc0RBQXNELENBQUE7QUFDN0QsT0FBTyx1RUFBdUUsQ0FBQTtBQUM5RSxPQUFPLG9EQUFvRCxDQUFBO0FBQzNELE9BQU8sOENBQThDLENBQUE7QUFDckQsT0FBTywrREFBK0QsQ0FBQTtBQUN0RSxPQUFPLDBDQUEwQyxDQUFBO0FBQ2pELE9BQU8scUNBQXFDLENBQUE7QUFDNUMsT0FBTyw4Q0FBOEMsQ0FBQTtBQUNyRCxPQUFPLDhDQUE4QyxDQUFBO0FBQ3JELE9BQU8sd0RBQXdELENBQUE7QUFDL0QsT0FBTyxvREFBb0QsQ0FBQTtBQUMzRCxPQUFPLDREQUE0RCxDQUFBO0FBQ25FLE9BQU8sa0RBQWtELENBQUE7QUFDekQsT0FBTyxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLGtEQUFrRCxDQUFBO0FBQ3pELE9BQU8sa0NBQWtDLENBQUE7QUFDekMsT0FBTyxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLDhDQUE4QyxDQUFBO0FBQ3JELE9BQU8sb0RBQW9ELENBQUE7QUFDM0QsT0FBTyxtRUFBbUUsQ0FBQTtBQUMxRSxPQUFPLG9DQUFvQyxDQUFBO0FBQzNDLE9BQU8sb0RBQW9ELENBQUE7QUFDM0QsT0FBTyw0REFBNEQsQ0FBQTtBQUNuRSxPQUFPLDREQUE0RCxDQUFBO0FBQ25FLE9BQU8sOENBQThDLENBQUE7QUFDckQsT0FBTyxpREFBaUQsQ0FBQTtBQUN4RCxPQUFPLDREQUE0RCxDQUFBO0FBQ25FLE9BQU8sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyx1REFBdUQsQ0FBQTtBQUM5RCxPQUFPLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sNERBQTRELENBQUE7QUFDbkUsT0FBTyw0REFBNEQsQ0FBQTtBQUNuRSxPQUFPLG9FQUFvRSxDQUFBO0FBQzNFLE9BQU8sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxvREFBb0QsQ0FBQTtBQUMzRCxPQUFPLDREQUE0RCxDQUFBO0FBQ25FLE9BQU8sbURBQW1ELENBQUE7QUFDMUQsT0FBTyx5REFBeUQsQ0FBQTtBQUVoRSxrRUFBa0U7QUFDbEUsa0NBQWtDO0FBQ2xDLE9BQU8sK0JBQStCLENBQUE7QUFFdEMsT0FBTyw4Q0FBOEMsQ0FBQSxDQUFDLG1EQUFtRCJ9