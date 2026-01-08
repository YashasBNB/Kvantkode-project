/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export const javascriptIndentationRules = {
    decreaseIndentPattern: /^((?!.*?\/\*).*\*\/)?\s*[\}\]\)].*$/,
    increaseIndentPattern: /^((?!\/\/).)*(\{([^}"'`]*|(\t|[ ])*\/\/.*)|\([^)"'`]*|\[[^\]"'`]*)$/,
    // e.g.  * ...| or */| or *-----*/|
    unIndentedLinePattern: /^(\t|[ ])*[ ]\*[^/]*\*\/\s*$|^(\t|[ ])*[ ]\*\/\s*$|^(\t|[ ])*[ ]\*([ ]([^\*]|\*(?!\/))*)?$/,
    indentNextLinePattern: /^((.*=>\s*)|((.*[^\w]+|\s*)(if|while|for)\s*\(.*\)\s*))$/,
};
export const rubyIndentationRules = {
    decreaseIndentPattern: /^\s*([}\]]([,)]?\s*(#|$)|\.[a-zA-Z_]\w*\b)|(end|rescue|ensure|else|elsif)\b|(in|when)\s)/,
    increaseIndentPattern: /^\s*((begin|class|(private|protected)\s+def|def|else|elsif|ensure|for|if|module|rescue|unless|until|when|in|while|case)|([^#]*\sdo\b)|([^#]*=\s*(case|if|unless)))\b([^#\{;]|(\"|'|\/).*\4)*(#.*)?$/,
};
export const phpIndentationRules = {
    increaseIndentPattern: /({(?!.*}).*|\(|\[|((else(\s)?)?if|else|for(each)?|while|switch|case).*:)\s*((\/[/*].*|)?$|\?>)/,
    decreaseIndentPattern: /^(.*\*\/)?\s*((\})|(\)+[;,])|(\]\)*[;,])|\b(else:)|\b((end(if|for(each)?|while|switch));))/,
};
export const goIndentationRules = {
    decreaseIndentPattern: /^\s*(\bcase\b.*:|\bdefault\b:|}[)}]*[),]?|\)[,]?)$/,
    increaseIndentPattern: /^.*(\bcase\b.*:|\bdefault\b:|(\b(func|if|else|switch|select|for|struct)\b.*)?{[^}"'`]*|\([^)"'`]*)$/,
};
export const htmlIndentationRules = {
    decreaseIndentPattern: /^\s*(<\/(?!html)[-_\.A-Za-z0-9]+\b[^>]*>|-->|\})/,
    increaseIndentPattern: /<(?!\?|(?:area|base|br|col|frame|hr|html|img|input|keygen|link|menuitem|meta|param|source|track|wbr)\b|[^>]*\/>)([-_\.A-Za-z0-9]+)(?=\s|>)\b[^>]*>(?!.*<\/\1>)|<!--(?!.*-->)|\{[^}"']*$/,
};
export const latexIndentationRules = {
    decreaseIndentPattern: /^\s*\\end{(?!document)/,
    increaseIndentPattern: /\\begin{(?!document)([^}]*)}(?!.*\\end{\1})/,
};
export const luaIndentationRules = {
    decreaseIndentPattern: /^\s*((\b(elseif|else|end|until)\b)|(\})|(\)))/,
    increaseIndentPattern: /^((?!(\-\-)).)*((\b(else|function|then|do|repeat)\b((?!\b(end|until)\b).)*)|(\{\s*))$/,
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZW50YXRpb25SdWxlcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3Rlc3QvY29tbW9uL21vZGVzL3N1cHBvcnRzL2luZGVudGF0aW9uUnVsZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsTUFBTSxDQUFDLE1BQU0sMEJBQTBCLEdBQUc7SUFDekMscUJBQXFCLEVBQUUscUNBQXFDO0lBQzVELHFCQUFxQixFQUFFLHFFQUFxRTtJQUM1RixtQ0FBbUM7SUFDbkMscUJBQXFCLEVBQ3BCLDRGQUE0RjtJQUM3RixxQkFBcUIsRUFBRSwwREFBMEQ7Q0FDakYsQ0FBQTtBQUVELE1BQU0sQ0FBQyxNQUFNLG9CQUFvQixHQUFHO0lBQ25DLHFCQUFxQixFQUNwQiwwRkFBMEY7SUFDM0YscUJBQXFCLEVBQ3BCLHFNQUFxTTtDQUN0TSxDQUFBO0FBRUQsTUFBTSxDQUFDLE1BQU0sbUJBQW1CLEdBQUc7SUFDbEMscUJBQXFCLEVBQ3BCLGdHQUFnRztJQUNqRyxxQkFBcUIsRUFDcEIsNEZBQTRGO0NBQzdGLENBQUE7QUFFRCxNQUFNLENBQUMsTUFBTSxrQkFBa0IsR0FBRztJQUNqQyxxQkFBcUIsRUFBRSxvREFBb0Q7SUFDM0UscUJBQXFCLEVBQ3BCLHFHQUFxRztDQUN0RyxDQUFBO0FBRUQsTUFBTSxDQUFDLE1BQU0sb0JBQW9CLEdBQUc7SUFDbkMscUJBQXFCLEVBQUUsa0RBQWtEO0lBQ3pFLHFCQUFxQixFQUNwQix5TEFBeUw7Q0FDMUwsQ0FBQTtBQUVELE1BQU0sQ0FBQyxNQUFNLHFCQUFxQixHQUFHO0lBQ3BDLHFCQUFxQixFQUFFLHdCQUF3QjtJQUMvQyxxQkFBcUIsRUFBRSw2Q0FBNkM7Q0FDcEUsQ0FBQTtBQUVELE1BQU0sQ0FBQyxNQUFNLG1CQUFtQixHQUFHO0lBQ2xDLHFCQUFxQixFQUFFLCtDQUErQztJQUN0RSxxQkFBcUIsRUFDcEIsdUZBQXVGO0NBQ3hGLENBQUEifQ==