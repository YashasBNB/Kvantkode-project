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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW50ZXJBY3Rpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vbGFuZ3VhZ2VzL2VudGVyQWN0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBSWhHLE9BQU8sRUFBRSxZQUFZLEVBQXVCLE1BQU0sNEJBQTRCLENBQUE7QUFFOUUsT0FBTyxFQUNOLHdCQUF3QixHQUV4QixNQUFNLG9DQUFvQyxDQUFBO0FBQzNDLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBRXBGLE1BQU0sVUFBVSxjQUFjLENBQzdCLFVBQW9DLEVBQ3BDLEtBQWlCLEVBQ2pCLEtBQVksRUFDWiw0QkFBMkQ7SUFFM0QsS0FBSyxDQUFDLFlBQVksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUE7SUFDM0QsTUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLHVCQUF1QixDQUFDLEtBQUssQ0FBQyxlQUFlLEVBQUUsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFBO0lBQzFGLE1BQU0sZUFBZSxHQUFHLDRCQUE0QixDQUFDLHdCQUF3QixDQUFDLFVBQVUsQ0FBQyxDQUFBO0lBQ3pGLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztRQUN0QixPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFDRCxNQUFNLDJCQUEyQixHQUFHLElBQUksMkJBQTJCLENBQ2xFLEtBQUssRUFDTCw0QkFBNEIsQ0FDNUIsQ0FBQTtJQUNELE1BQU0sc0JBQXNCLEdBQzNCLDJCQUEyQixDQUFDLG1DQUFtQyxDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQ3ZFLE1BQU0sZ0JBQWdCLEdBQUcsc0JBQXNCLENBQUMsMkJBQTJCLENBQUMsY0FBYyxFQUFFLENBQUE7SUFDNUYsTUFBTSxlQUFlLEdBQUcsc0JBQXNCLENBQUMsMEJBQTBCLENBQUMsY0FBYyxFQUFFLENBQUE7SUFDMUYsTUFBTSxjQUFjLEdBQUcsc0JBQXNCLENBQUMseUJBQXlCLENBQUMsY0FBYyxFQUFFLENBQUE7SUFFeEYsTUFBTSxXQUFXLEdBQUcsZUFBZSxDQUFDLE9BQU8sQ0FDMUMsVUFBVSxFQUNWLGdCQUFnQixFQUNoQixlQUFlLEVBQ2YsY0FBYyxDQUNkLENBQUE7SUFDRCxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDbEIsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRUQsTUFBTSxZQUFZLEdBQUcsV0FBVyxDQUFDLFlBQVksQ0FBQTtJQUM3QyxJQUFJLFVBQVUsR0FBRyxXQUFXLENBQUMsVUFBVSxDQUFBO0lBQ3ZDLE1BQU0sVUFBVSxHQUFHLFdBQVcsQ0FBQyxVQUFVLElBQUksQ0FBQyxDQUFBO0lBRTlDLDBIQUEwSDtJQUMxSCxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7UUFDakIsSUFBSSxZQUFZLEtBQUssWUFBWSxDQUFDLE1BQU0sSUFBSSxZQUFZLEtBQUssWUFBWSxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQ3pGLFVBQVUsR0FBRyxJQUFJLENBQUE7UUFDbEIsQ0FBQzthQUFNLENBQUM7WUFDUCxVQUFVLEdBQUcsRUFBRSxDQUFBO1FBQ2hCLENBQUM7SUFDRixDQUFDO1NBQU0sSUFBSSxZQUFZLEtBQUssWUFBWSxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ2pELFVBQVUsR0FBRyxJQUFJLEdBQUcsVUFBVSxDQUFBO0lBQy9CLENBQUM7SUFFRCxJQUFJLFdBQVcsR0FBRyx3QkFBd0IsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLGVBQWUsRUFBRSxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUE7SUFDM0YsSUFBSSxVQUFVLEVBQUUsQ0FBQztRQUNoQixXQUFXLEdBQUcsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsV0FBVyxDQUFDLE1BQU0sR0FBRyxVQUFVLENBQUMsQ0FBQTtJQUN4RSxDQUFDO0lBRUQsT0FBTztRQUNOLFlBQVksRUFBRSxZQUFZO1FBQzFCLFVBQVUsRUFBRSxVQUFVO1FBQ3RCLFVBQVUsRUFBRSxVQUFVO1FBQ3RCLFdBQVcsRUFBRSxXQUFXO0tBQ3hCLENBQUE7QUFDRixDQUFDIn0=