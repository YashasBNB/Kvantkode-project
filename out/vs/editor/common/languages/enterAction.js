/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { IndentAction } from './languageConfiguration.js';
import { getIndentationAtPosition, } from './languageConfigurationRegistry.js';
import { IndentationContextProcessor } from './supports/indentationLineProcessor.js';
export function getEnterAction(autoIndent, model, range, languageConfigurationService) {
    model.tokenization.forceTokenization(range.startLineNumber);
    const languageId = model.getLanguageIdAtPosition(range.startLineNumber, range.startColumn);
    const richEditSupport = languageConfigurationService.getLanguageConfiguration(languageId);
    if (!richEditSupport) {
        return null;
    }
    const indentationContextProcessor = new IndentationContextProcessor(model, languageConfigurationService);
    const processedContextTokens = indentationContextProcessor.getProcessedTokenContextAroundRange(range);
    const previousLineText = processedContextTokens.previousLineProcessedTokens.getLineContent();
    const beforeEnterText = processedContextTokens.beforeRangeProcessedTokens.getLineContent();
    const afterEnterText = processedContextTokens.afterRangeProcessedTokens.getLineContent();
    const enterResult = richEditSupport.onEnter(autoIndent, previousLineText, beforeEnterText, afterEnterText);
    if (!enterResult) {
        return null;
    }
    const indentAction = enterResult.indentAction;
    let appendText = enterResult.appendText;
    const removeText = enterResult.removeText || 0;
    // Here we add `\t` to appendText first because enterAction is leveraging appendText and removeText to change indentation.
    if (!appendText) {
        if (indentAction === IndentAction.Indent || indentAction === IndentAction.IndentOutdent) {
            appendText = '\t';
        }
        else {
            appendText = '';
        }
    }
    else if (indentAction === IndentAction.Indent) {
        appendText = '\t' + appendText;
    }
    let indentation = getIndentationAtPosition(model, range.startLineNumber, range.startColumn);
    if (removeText) {
        indentation = indentation.substring(0, indentation.length - removeText);
    }
    return {
        indentAction: indentAction,
        appendText: appendText,
        removeText: removeText,
        indentation: indentation,
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW50ZXJBY3Rpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL2xhbmd1YWdlcy9lbnRlckFjdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUloRyxPQUFPLEVBQUUsWUFBWSxFQUF1QixNQUFNLDRCQUE0QixDQUFBO0FBRTlFLE9BQU8sRUFDTix3QkFBd0IsR0FFeEIsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMzQyxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUVwRixNQUFNLFVBQVUsY0FBYyxDQUM3QixVQUFvQyxFQUNwQyxLQUFpQixFQUNqQixLQUFZLEVBQ1osNEJBQTJEO0lBRTNELEtBQUssQ0FBQyxZQUFZLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxDQUFBO0lBQzNELE1BQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxLQUFLLENBQUMsZUFBZSxFQUFFLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQTtJQUMxRixNQUFNLGVBQWUsR0FBRyw0QkFBNEIsQ0FBQyx3QkFBd0IsQ0FBQyxVQUFVLENBQUMsQ0FBQTtJQUN6RixJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7UUFDdEIsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBQ0QsTUFBTSwyQkFBMkIsR0FBRyxJQUFJLDJCQUEyQixDQUNsRSxLQUFLLEVBQ0wsNEJBQTRCLENBQzVCLENBQUE7SUFDRCxNQUFNLHNCQUFzQixHQUMzQiwyQkFBMkIsQ0FBQyxtQ0FBbUMsQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUN2RSxNQUFNLGdCQUFnQixHQUFHLHNCQUFzQixDQUFDLDJCQUEyQixDQUFDLGNBQWMsRUFBRSxDQUFBO0lBQzVGLE1BQU0sZUFBZSxHQUFHLHNCQUFzQixDQUFDLDBCQUEwQixDQUFDLGNBQWMsRUFBRSxDQUFBO0lBQzFGLE1BQU0sY0FBYyxHQUFHLHNCQUFzQixDQUFDLHlCQUF5QixDQUFDLGNBQWMsRUFBRSxDQUFBO0lBRXhGLE1BQU0sV0FBVyxHQUFHLGVBQWUsQ0FBQyxPQUFPLENBQzFDLFVBQVUsRUFDVixnQkFBZ0IsRUFDaEIsZUFBZSxFQUNmLGNBQWMsQ0FDZCxDQUFBO0lBQ0QsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQ2xCLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUVELE1BQU0sWUFBWSxHQUFHLFdBQVcsQ0FBQyxZQUFZLENBQUE7SUFDN0MsSUFBSSxVQUFVLEdBQUcsV0FBVyxDQUFDLFVBQVUsQ0FBQTtJQUN2QyxNQUFNLFVBQVUsR0FBRyxXQUFXLENBQUMsVUFBVSxJQUFJLENBQUMsQ0FBQTtJQUU5QywwSEFBMEg7SUFDMUgsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1FBQ2pCLElBQUksWUFBWSxLQUFLLFlBQVksQ0FBQyxNQUFNLElBQUksWUFBWSxLQUFLLFlBQVksQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUN6RixVQUFVLEdBQUcsSUFBSSxDQUFBO1FBQ2xCLENBQUM7YUFBTSxDQUFDO1lBQ1AsVUFBVSxHQUFHLEVBQUUsQ0FBQTtRQUNoQixDQUFDO0lBQ0YsQ0FBQztTQUFNLElBQUksWUFBWSxLQUFLLFlBQVksQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUNqRCxVQUFVLEdBQUcsSUFBSSxHQUFHLFVBQVUsQ0FBQTtJQUMvQixDQUFDO0lBRUQsSUFBSSxXQUFXLEdBQUcsd0JBQXdCLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxlQUFlLEVBQUUsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFBO0lBQzNGLElBQUksVUFBVSxFQUFFLENBQUM7UUFDaEIsV0FBVyxHQUFHLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLFdBQVcsQ0FBQyxNQUFNLEdBQUcsVUFBVSxDQUFDLENBQUE7SUFDeEUsQ0FBQztJQUVELE9BQU87UUFDTixZQUFZLEVBQUUsWUFBWTtRQUMxQixVQUFVLEVBQUUsVUFBVTtRQUN0QixVQUFVLEVBQUUsVUFBVTtRQUN0QixXQUFXLEVBQUUsV0FBVztLQUN4QixDQUFBO0FBQ0YsQ0FBQyJ9