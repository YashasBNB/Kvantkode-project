/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../base/common/codicons.js';
import { URI } from '../../base/common/uri.js';
import { EditOperation } from './core/editOperation.js';
import { Range } from './core/range.js';
import { TokenizationRegistry as TokenizationRegistryImpl } from './tokenizationRegistry.js';
import { localize } from '../../nls.js';
export class Token {
    constructor(offset, type, language) {
        this.offset = offset;
        this.type = type;
        this.language = language;
        this._tokenBrand = undefined;
    }
    toString() {
        return '(' + this.offset + ', ' + this.type + ')';
    }
}
/**
 * @internal
 */
export class TokenizationResult {
    constructor(tokens, endState) {
        this.tokens = tokens;
        this.endState = endState;
        this._tokenizationResultBrand = undefined;
    }
}
/**
 * @internal
 */
export class EncodedTokenizationResult {
    constructor(
    /**
     * The tokens in binary format. Each token occupies two array indices. For token i:
     *  - at offset 2*i => startIndex
     *  - at offset 2*i + 1 => metadata
     *
     */
    tokens, endState) {
        this.tokens = tokens;
        this.endState = endState;
        this._encodedTokenizationResultBrand = undefined;
    }
}
export var HoverVerbosityAction;
(function (HoverVerbosityAction) {
    /**
     * Increase the verbosity of the hover
     */
    HoverVerbosityAction[HoverVerbosityAction["Increase"] = 0] = "Increase";
    /**
     * Decrease the verbosity of the hover
     */
    HoverVerbosityAction[HoverVerbosityAction["Decrease"] = 1] = "Decrease";
})(HoverVerbosityAction || (HoverVerbosityAction = {}));
export var CompletionItemKind;
(function (CompletionItemKind) {
    CompletionItemKind[CompletionItemKind["Method"] = 0] = "Method";
    CompletionItemKind[CompletionItemKind["Function"] = 1] = "Function";
    CompletionItemKind[CompletionItemKind["Constructor"] = 2] = "Constructor";
    CompletionItemKind[CompletionItemKind["Field"] = 3] = "Field";
    CompletionItemKind[CompletionItemKind["Variable"] = 4] = "Variable";
    CompletionItemKind[CompletionItemKind["Class"] = 5] = "Class";
    CompletionItemKind[CompletionItemKind["Struct"] = 6] = "Struct";
    CompletionItemKind[CompletionItemKind["Interface"] = 7] = "Interface";
    CompletionItemKind[CompletionItemKind["Module"] = 8] = "Module";
    CompletionItemKind[CompletionItemKind["Property"] = 9] = "Property";
    CompletionItemKind[CompletionItemKind["Event"] = 10] = "Event";
    CompletionItemKind[CompletionItemKind["Operator"] = 11] = "Operator";
    CompletionItemKind[CompletionItemKind["Unit"] = 12] = "Unit";
    CompletionItemKind[CompletionItemKind["Value"] = 13] = "Value";
    CompletionItemKind[CompletionItemKind["Constant"] = 14] = "Constant";
    CompletionItemKind[CompletionItemKind["Enum"] = 15] = "Enum";
    CompletionItemKind[CompletionItemKind["EnumMember"] = 16] = "EnumMember";
    CompletionItemKind[CompletionItemKind["Keyword"] = 17] = "Keyword";
    CompletionItemKind[CompletionItemKind["Text"] = 18] = "Text";
    CompletionItemKind[CompletionItemKind["Color"] = 19] = "Color";
    CompletionItemKind[CompletionItemKind["File"] = 20] = "File";
    CompletionItemKind[CompletionItemKind["Reference"] = 21] = "Reference";
    CompletionItemKind[CompletionItemKind["Customcolor"] = 22] = "Customcolor";
    CompletionItemKind[CompletionItemKind["Folder"] = 23] = "Folder";
    CompletionItemKind[CompletionItemKind["TypeParameter"] = 24] = "TypeParameter";
    CompletionItemKind[CompletionItemKind["User"] = 25] = "User";
    CompletionItemKind[CompletionItemKind["Issue"] = 26] = "Issue";
    CompletionItemKind[CompletionItemKind["Snippet"] = 27] = "Snippet";
})(CompletionItemKind || (CompletionItemKind = {}));
/**
 * @internal
 */
export var CompletionItemKinds;
(function (CompletionItemKinds) {
    const byKind = new Map();
    byKind.set(0 /* CompletionItemKind.Method */, Codicon.symbolMethod);
    byKind.set(1 /* CompletionItemKind.Function */, Codicon.symbolFunction);
    byKind.set(2 /* CompletionItemKind.Constructor */, Codicon.symbolConstructor);
    byKind.set(3 /* CompletionItemKind.Field */, Codicon.symbolField);
    byKind.set(4 /* CompletionItemKind.Variable */, Codicon.symbolVariable);
    byKind.set(5 /* CompletionItemKind.Class */, Codicon.symbolClass);
    byKind.set(6 /* CompletionItemKind.Struct */, Codicon.symbolStruct);
    byKind.set(7 /* CompletionItemKind.Interface */, Codicon.symbolInterface);
    byKind.set(8 /* CompletionItemKind.Module */, Codicon.symbolModule);
    byKind.set(9 /* CompletionItemKind.Property */, Codicon.symbolProperty);
    byKind.set(10 /* CompletionItemKind.Event */, Codicon.symbolEvent);
    byKind.set(11 /* CompletionItemKind.Operator */, Codicon.symbolOperator);
    byKind.set(12 /* CompletionItemKind.Unit */, Codicon.symbolUnit);
    byKind.set(13 /* CompletionItemKind.Value */, Codicon.symbolValue);
    byKind.set(15 /* CompletionItemKind.Enum */, Codicon.symbolEnum);
    byKind.set(14 /* CompletionItemKind.Constant */, Codicon.symbolConstant);
    byKind.set(15 /* CompletionItemKind.Enum */, Codicon.symbolEnum);
    byKind.set(16 /* CompletionItemKind.EnumMember */, Codicon.symbolEnumMember);
    byKind.set(17 /* CompletionItemKind.Keyword */, Codicon.symbolKeyword);
    byKind.set(27 /* CompletionItemKind.Snippet */, Codicon.symbolSnippet);
    byKind.set(18 /* CompletionItemKind.Text */, Codicon.symbolText);
    byKind.set(19 /* CompletionItemKind.Color */, Codicon.symbolColor);
    byKind.set(20 /* CompletionItemKind.File */, Codicon.symbolFile);
    byKind.set(21 /* CompletionItemKind.Reference */, Codicon.symbolReference);
    byKind.set(22 /* CompletionItemKind.Customcolor */, Codicon.symbolCustomColor);
    byKind.set(23 /* CompletionItemKind.Folder */, Codicon.symbolFolder);
    byKind.set(24 /* CompletionItemKind.TypeParameter */, Codicon.symbolTypeParameter);
    byKind.set(25 /* CompletionItemKind.User */, Codicon.account);
    byKind.set(26 /* CompletionItemKind.Issue */, Codicon.issues);
    /**
     * @internal
     */
    function toIcon(kind) {
        let codicon = byKind.get(kind);
        if (!codicon) {
            console.info('No codicon found for CompletionItemKind ' + kind);
            codicon = Codicon.symbolProperty;
        }
        return codicon;
    }
    CompletionItemKinds.toIcon = toIcon;
    /**
     * @internal
     */
    function toLabel(kind) {
        switch (kind) {
            case 0 /* CompletionItemKind.Method */:
                return localize('suggestWidget.kind.method', 'Method');
            case 1 /* CompletionItemKind.Function */:
                return localize('suggestWidget.kind.function', 'Function');
            case 2 /* CompletionItemKind.Constructor */:
                return localize('suggestWidget.kind.constructor', 'Constructor');
            case 3 /* CompletionItemKind.Field */:
                return localize('suggestWidget.kind.field', 'Field');
            case 4 /* CompletionItemKind.Variable */:
                return localize('suggestWidget.kind.variable', 'Variable');
            case 5 /* CompletionItemKind.Class */:
                return localize('suggestWidget.kind.class', 'Class');
            case 6 /* CompletionItemKind.Struct */:
                return localize('suggestWidget.kind.struct', 'Struct');
            case 7 /* CompletionItemKind.Interface */:
                return localize('suggestWidget.kind.interface', 'Interface');
            case 8 /* CompletionItemKind.Module */:
                return localize('suggestWidget.kind.module', 'Module');
            case 9 /* CompletionItemKind.Property */:
                return localize('suggestWidget.kind.property', 'Property');
            case 10 /* CompletionItemKind.Event */:
                return localize('suggestWidget.kind.event', 'Event');
            case 11 /* CompletionItemKind.Operator */:
                return localize('suggestWidget.kind.operator', 'Operator');
            case 12 /* CompletionItemKind.Unit */:
                return localize('suggestWidget.kind.unit', 'Unit');
            case 13 /* CompletionItemKind.Value */:
                return localize('suggestWidget.kind.value', 'Value');
            case 14 /* CompletionItemKind.Constant */:
                return localize('suggestWidget.kind.constant', 'Constant');
            case 15 /* CompletionItemKind.Enum */:
                return localize('suggestWidget.kind.enum', 'Enum');
            case 16 /* CompletionItemKind.EnumMember */:
                return localize('suggestWidget.kind.enumMember', 'Enum Member');
            case 17 /* CompletionItemKind.Keyword */:
                return localize('suggestWidget.kind.keyword', 'Keyword');
            case 18 /* CompletionItemKind.Text */:
                return localize('suggestWidget.kind.text', 'Text');
            case 19 /* CompletionItemKind.Color */:
                return localize('suggestWidget.kind.color', 'Color');
            case 20 /* CompletionItemKind.File */:
                return localize('suggestWidget.kind.file', 'File');
            case 21 /* CompletionItemKind.Reference */:
                return localize('suggestWidget.kind.reference', 'Reference');
            case 22 /* CompletionItemKind.Customcolor */:
                return localize('suggestWidget.kind.customcolor', 'Custom Color');
            case 23 /* CompletionItemKind.Folder */:
                return localize('suggestWidget.kind.folder', 'Folder');
            case 24 /* CompletionItemKind.TypeParameter */:
                return localize('suggestWidget.kind.typeParameter', 'Type Parameter');
            case 25 /* CompletionItemKind.User */:
                return localize('suggestWidget.kind.user', 'User');
            case 26 /* CompletionItemKind.Issue */:
                return localize('suggestWidget.kind.issue', 'Issue');
            case 27 /* CompletionItemKind.Snippet */:
                return localize('suggestWidget.kind.snippet', 'Snippet');
            default:
                return '';
        }
    }
    CompletionItemKinds.toLabel = toLabel;
    const data = new Map();
    data.set('method', 0 /* CompletionItemKind.Method */);
    data.set('function', 1 /* CompletionItemKind.Function */);
    data.set('constructor', 2 /* CompletionItemKind.Constructor */);
    data.set('field', 3 /* CompletionItemKind.Field */);
    data.set('variable', 4 /* CompletionItemKind.Variable */);
    data.set('class', 5 /* CompletionItemKind.Class */);
    data.set('struct', 6 /* CompletionItemKind.Struct */);
    data.set('interface', 7 /* CompletionItemKind.Interface */);
    data.set('module', 8 /* CompletionItemKind.Module */);
    data.set('property', 9 /* CompletionItemKind.Property */);
    data.set('event', 10 /* CompletionItemKind.Event */);
    data.set('operator', 11 /* CompletionItemKind.Operator */);
    data.set('unit', 12 /* CompletionItemKind.Unit */);
    data.set('value', 13 /* CompletionItemKind.Value */);
    data.set('constant', 14 /* CompletionItemKind.Constant */);
    data.set('enum', 15 /* CompletionItemKind.Enum */);
    data.set('enum-member', 16 /* CompletionItemKind.EnumMember */);
    data.set('enumMember', 16 /* CompletionItemKind.EnumMember */);
    data.set('keyword', 17 /* CompletionItemKind.Keyword */);
    data.set('snippet', 27 /* CompletionItemKind.Snippet */);
    data.set('text', 18 /* CompletionItemKind.Text */);
    data.set('color', 19 /* CompletionItemKind.Color */);
    data.set('file', 20 /* CompletionItemKind.File */);
    data.set('reference', 21 /* CompletionItemKind.Reference */);
    data.set('customcolor', 22 /* CompletionItemKind.Customcolor */);
    data.set('folder', 23 /* CompletionItemKind.Folder */);
    data.set('type-parameter', 24 /* CompletionItemKind.TypeParameter */);
    data.set('typeParameter', 24 /* CompletionItemKind.TypeParameter */);
    data.set('account', 25 /* CompletionItemKind.User */);
    data.set('issue', 26 /* CompletionItemKind.Issue */);
    /**
     * @internal
     */
    function fromString(value, strict) {
        let res = data.get(value);
        if (typeof res === 'undefined' && !strict) {
            res = 9 /* CompletionItemKind.Property */;
        }
        return res;
    }
    CompletionItemKinds.fromString = fromString;
})(CompletionItemKinds || (CompletionItemKinds = {}));
export var CompletionItemTag;
(function (CompletionItemTag) {
    CompletionItemTag[CompletionItemTag["Deprecated"] = 1] = "Deprecated";
})(CompletionItemTag || (CompletionItemTag = {}));
export var CompletionItemInsertTextRule;
(function (CompletionItemInsertTextRule) {
    CompletionItemInsertTextRule[CompletionItemInsertTextRule["None"] = 0] = "None";
    /**
     * Adjust whitespace/indentation of multiline insert texts to
     * match the current line indentation.
     */
    CompletionItemInsertTextRule[CompletionItemInsertTextRule["KeepWhitespace"] = 1] = "KeepWhitespace";
    /**
     * `insertText` is a snippet.
     */
    CompletionItemInsertTextRule[CompletionItemInsertTextRule["InsertAsSnippet"] = 4] = "InsertAsSnippet";
})(CompletionItemInsertTextRule || (CompletionItemInsertTextRule = {}));
/**
 * How a partial acceptance was triggered.
 */
export var PartialAcceptTriggerKind;
(function (PartialAcceptTriggerKind) {
    PartialAcceptTriggerKind[PartialAcceptTriggerKind["Word"] = 0] = "Word";
    PartialAcceptTriggerKind[PartialAcceptTriggerKind["Line"] = 1] = "Line";
    PartialAcceptTriggerKind[PartialAcceptTriggerKind["Suggest"] = 2] = "Suggest";
})(PartialAcceptTriggerKind || (PartialAcceptTriggerKind = {}));
/**
 * How a suggest provider was triggered.
 */
export var CompletionTriggerKind;
(function (CompletionTriggerKind) {
    CompletionTriggerKind[CompletionTriggerKind["Invoke"] = 0] = "Invoke";
    CompletionTriggerKind[CompletionTriggerKind["TriggerCharacter"] = 1] = "TriggerCharacter";
    CompletionTriggerKind[CompletionTriggerKind["TriggerForIncompleteCompletions"] = 2] = "TriggerForIncompleteCompletions";
})(CompletionTriggerKind || (CompletionTriggerKind = {}));
/**
 * How an {@link InlineCompletionsProvider inline completion provider} was triggered.
 */
export var InlineCompletionTriggerKind;
(function (InlineCompletionTriggerKind) {
    /**
     * Completion was triggered automatically while editing.
     * It is sufficient to return a single completion item in this case.
     */
    InlineCompletionTriggerKind[InlineCompletionTriggerKind["Automatic"] = 0] = "Automatic";
    /**
     * Completion was triggered explicitly by a user gesture.
     * Return multiple completion items to enable cycling through them.
     */
    InlineCompletionTriggerKind[InlineCompletionTriggerKind["Explicit"] = 1] = "Explicit";
})(InlineCompletionTriggerKind || (InlineCompletionTriggerKind = {}));
export class SelectedSuggestionInfo {
    constructor(range, text, completionKind, isSnippetText) {
        this.range = range;
        this.text = text;
        this.completionKind = completionKind;
        this.isSnippetText = isSnippetText;
    }
    equals(other) {
        return (Range.lift(this.range).equalsRange(other.range) &&
            this.text === other.text &&
            this.completionKind === other.completionKind &&
            this.isSnippetText === other.isSnippetText);
    }
}
export var CodeActionTriggerType;
(function (CodeActionTriggerType) {
    CodeActionTriggerType[CodeActionTriggerType["Invoke"] = 1] = "Invoke";
    CodeActionTriggerType[CodeActionTriggerType["Auto"] = 2] = "Auto";
})(CodeActionTriggerType || (CodeActionTriggerType = {}));
/**
 * @internal
 */
export var DocumentPasteTriggerKind;
(function (DocumentPasteTriggerKind) {
    DocumentPasteTriggerKind[DocumentPasteTriggerKind["Automatic"] = 0] = "Automatic";
    DocumentPasteTriggerKind[DocumentPasteTriggerKind["PasteAs"] = 1] = "PasteAs";
})(DocumentPasteTriggerKind || (DocumentPasteTriggerKind = {}));
export var SignatureHelpTriggerKind;
(function (SignatureHelpTriggerKind) {
    SignatureHelpTriggerKind[SignatureHelpTriggerKind["Invoke"] = 1] = "Invoke";
    SignatureHelpTriggerKind[SignatureHelpTriggerKind["TriggerCharacter"] = 2] = "TriggerCharacter";
    SignatureHelpTriggerKind[SignatureHelpTriggerKind["ContentChange"] = 3] = "ContentChange";
})(SignatureHelpTriggerKind || (SignatureHelpTriggerKind = {}));
/**
 * A document highlight kind.
 */
export var DocumentHighlightKind;
(function (DocumentHighlightKind) {
    /**
     * A textual occurrence.
     */
    DocumentHighlightKind[DocumentHighlightKind["Text"] = 0] = "Text";
    /**
     * Read-access of a symbol, like reading a variable.
     */
    DocumentHighlightKind[DocumentHighlightKind["Read"] = 1] = "Read";
    /**
     * Write-access of a symbol, like writing to a variable.
     */
    DocumentHighlightKind[DocumentHighlightKind["Write"] = 2] = "Write";
})(DocumentHighlightKind || (DocumentHighlightKind = {}));
/**
 * @internal
 */
export function isLocationLink(thing) {
    return (thing &&
        URI.isUri(thing.uri) &&
        Range.isIRange(thing.range) &&
        (Range.isIRange(thing.originSelectionRange) ||
            Range.isIRange(thing.targetSelectionRange)));
}
/**
 * @internal
 */
export function isLocation(thing) {
    return thing && URI.isUri(thing.uri) && Range.isIRange(thing.range);
}
/**
 * A symbol kind.
 */
export var SymbolKind;
(function (SymbolKind) {
    SymbolKind[SymbolKind["File"] = 0] = "File";
    SymbolKind[SymbolKind["Module"] = 1] = "Module";
    SymbolKind[SymbolKind["Namespace"] = 2] = "Namespace";
    SymbolKind[SymbolKind["Package"] = 3] = "Package";
    SymbolKind[SymbolKind["Class"] = 4] = "Class";
    SymbolKind[SymbolKind["Method"] = 5] = "Method";
    SymbolKind[SymbolKind["Property"] = 6] = "Property";
    SymbolKind[SymbolKind["Field"] = 7] = "Field";
    SymbolKind[SymbolKind["Constructor"] = 8] = "Constructor";
    SymbolKind[SymbolKind["Enum"] = 9] = "Enum";
    SymbolKind[SymbolKind["Interface"] = 10] = "Interface";
    SymbolKind[SymbolKind["Function"] = 11] = "Function";
    SymbolKind[SymbolKind["Variable"] = 12] = "Variable";
    SymbolKind[SymbolKind["Constant"] = 13] = "Constant";
    SymbolKind[SymbolKind["String"] = 14] = "String";
    SymbolKind[SymbolKind["Number"] = 15] = "Number";
    SymbolKind[SymbolKind["Boolean"] = 16] = "Boolean";
    SymbolKind[SymbolKind["Array"] = 17] = "Array";
    SymbolKind[SymbolKind["Object"] = 18] = "Object";
    SymbolKind[SymbolKind["Key"] = 19] = "Key";
    SymbolKind[SymbolKind["Null"] = 20] = "Null";
    SymbolKind[SymbolKind["EnumMember"] = 21] = "EnumMember";
    SymbolKind[SymbolKind["Struct"] = 22] = "Struct";
    SymbolKind[SymbolKind["Event"] = 23] = "Event";
    SymbolKind[SymbolKind["Operator"] = 24] = "Operator";
    SymbolKind[SymbolKind["TypeParameter"] = 25] = "TypeParameter";
})(SymbolKind || (SymbolKind = {}));
/**
 * @internal
 */
export const symbolKindNames = {
    [17 /* SymbolKind.Array */]: localize('Array', 'array'),
    [16 /* SymbolKind.Boolean */]: localize('Boolean', 'boolean'),
    [4 /* SymbolKind.Class */]: localize('Class', 'class'),
    [13 /* SymbolKind.Constant */]: localize('Constant', 'constant'),
    [8 /* SymbolKind.Constructor */]: localize('Constructor', 'constructor'),
    [9 /* SymbolKind.Enum */]: localize('Enum', 'enumeration'),
    [21 /* SymbolKind.EnumMember */]: localize('EnumMember', 'enumeration member'),
    [23 /* SymbolKind.Event */]: localize('Event', 'event'),
    [7 /* SymbolKind.Field */]: localize('Field', 'field'),
    [0 /* SymbolKind.File */]: localize('File', 'file'),
    [11 /* SymbolKind.Function */]: localize('Function', 'function'),
    [10 /* SymbolKind.Interface */]: localize('Interface', 'interface'),
    [19 /* SymbolKind.Key */]: localize('Key', 'key'),
    [5 /* SymbolKind.Method */]: localize('Method', 'method'),
    [1 /* SymbolKind.Module */]: localize('Module', 'module'),
    [2 /* SymbolKind.Namespace */]: localize('Namespace', 'namespace'),
    [20 /* SymbolKind.Null */]: localize('Null', 'null'),
    [15 /* SymbolKind.Number */]: localize('Number', 'number'),
    [18 /* SymbolKind.Object */]: localize('Object', 'object'),
    [24 /* SymbolKind.Operator */]: localize('Operator', 'operator'),
    [3 /* SymbolKind.Package */]: localize('Package', 'package'),
    [6 /* SymbolKind.Property */]: localize('Property', 'property'),
    [14 /* SymbolKind.String */]: localize('String', 'string'),
    [22 /* SymbolKind.Struct */]: localize('Struct', 'struct'),
    [25 /* SymbolKind.TypeParameter */]: localize('TypeParameter', 'type parameter'),
    [12 /* SymbolKind.Variable */]: localize('Variable', 'variable'),
};
/**
 * @internal
 */
export function getAriaLabelForSymbol(symbolName, kind) {
    return localize('symbolAriaLabel', '{0} ({1})', symbolName, symbolKindNames[kind]);
}
export var SymbolTag;
(function (SymbolTag) {
    SymbolTag[SymbolTag["Deprecated"] = 1] = "Deprecated";
})(SymbolTag || (SymbolTag = {}));
/**
 * @internal
 */
export var SymbolKinds;
(function (SymbolKinds) {
    const byKind = new Map();
    byKind.set(0 /* SymbolKind.File */, Codicon.symbolFile);
    byKind.set(1 /* SymbolKind.Module */, Codicon.symbolModule);
    byKind.set(2 /* SymbolKind.Namespace */, Codicon.symbolNamespace);
    byKind.set(3 /* SymbolKind.Package */, Codicon.symbolPackage);
    byKind.set(4 /* SymbolKind.Class */, Codicon.symbolClass);
    byKind.set(5 /* SymbolKind.Method */, Codicon.symbolMethod);
    byKind.set(6 /* SymbolKind.Property */, Codicon.symbolProperty);
    byKind.set(7 /* SymbolKind.Field */, Codicon.symbolField);
    byKind.set(8 /* SymbolKind.Constructor */, Codicon.symbolConstructor);
    byKind.set(9 /* SymbolKind.Enum */, Codicon.symbolEnum);
    byKind.set(10 /* SymbolKind.Interface */, Codicon.symbolInterface);
    byKind.set(11 /* SymbolKind.Function */, Codicon.symbolFunction);
    byKind.set(12 /* SymbolKind.Variable */, Codicon.symbolVariable);
    byKind.set(13 /* SymbolKind.Constant */, Codicon.symbolConstant);
    byKind.set(14 /* SymbolKind.String */, Codicon.symbolString);
    byKind.set(15 /* SymbolKind.Number */, Codicon.symbolNumber);
    byKind.set(16 /* SymbolKind.Boolean */, Codicon.symbolBoolean);
    byKind.set(17 /* SymbolKind.Array */, Codicon.symbolArray);
    byKind.set(18 /* SymbolKind.Object */, Codicon.symbolObject);
    byKind.set(19 /* SymbolKind.Key */, Codicon.symbolKey);
    byKind.set(20 /* SymbolKind.Null */, Codicon.symbolNull);
    byKind.set(21 /* SymbolKind.EnumMember */, Codicon.symbolEnumMember);
    byKind.set(22 /* SymbolKind.Struct */, Codicon.symbolStruct);
    byKind.set(23 /* SymbolKind.Event */, Codicon.symbolEvent);
    byKind.set(24 /* SymbolKind.Operator */, Codicon.symbolOperator);
    byKind.set(25 /* SymbolKind.TypeParameter */, Codicon.symbolTypeParameter);
    /**
     * @internal
     */
    function toIcon(kind) {
        let icon = byKind.get(kind);
        if (!icon) {
            console.info('No codicon found for SymbolKind ' + kind);
            icon = Codicon.symbolProperty;
        }
        return icon;
    }
    SymbolKinds.toIcon = toIcon;
    const byCompletionKind = new Map();
    byCompletionKind.set(0 /* SymbolKind.File */, 20 /* CompletionItemKind.File */);
    byCompletionKind.set(1 /* SymbolKind.Module */, 8 /* CompletionItemKind.Module */);
    byCompletionKind.set(2 /* SymbolKind.Namespace */, 8 /* CompletionItemKind.Module */);
    byCompletionKind.set(3 /* SymbolKind.Package */, 8 /* CompletionItemKind.Module */);
    byCompletionKind.set(4 /* SymbolKind.Class */, 5 /* CompletionItemKind.Class */);
    byCompletionKind.set(5 /* SymbolKind.Method */, 0 /* CompletionItemKind.Method */);
    byCompletionKind.set(6 /* SymbolKind.Property */, 9 /* CompletionItemKind.Property */);
    byCompletionKind.set(7 /* SymbolKind.Field */, 3 /* CompletionItemKind.Field */);
    byCompletionKind.set(8 /* SymbolKind.Constructor */, 2 /* CompletionItemKind.Constructor */);
    byCompletionKind.set(9 /* SymbolKind.Enum */, 15 /* CompletionItemKind.Enum */);
    byCompletionKind.set(10 /* SymbolKind.Interface */, 7 /* CompletionItemKind.Interface */);
    byCompletionKind.set(11 /* SymbolKind.Function */, 1 /* CompletionItemKind.Function */);
    byCompletionKind.set(12 /* SymbolKind.Variable */, 4 /* CompletionItemKind.Variable */);
    byCompletionKind.set(13 /* SymbolKind.Constant */, 14 /* CompletionItemKind.Constant */);
    byCompletionKind.set(14 /* SymbolKind.String */, 18 /* CompletionItemKind.Text */);
    byCompletionKind.set(15 /* SymbolKind.Number */, 13 /* CompletionItemKind.Value */);
    byCompletionKind.set(16 /* SymbolKind.Boolean */, 13 /* CompletionItemKind.Value */);
    byCompletionKind.set(17 /* SymbolKind.Array */, 13 /* CompletionItemKind.Value */);
    byCompletionKind.set(18 /* SymbolKind.Object */, 13 /* CompletionItemKind.Value */);
    byCompletionKind.set(19 /* SymbolKind.Key */, 17 /* CompletionItemKind.Keyword */);
    byCompletionKind.set(20 /* SymbolKind.Null */, 13 /* CompletionItemKind.Value */);
    byCompletionKind.set(21 /* SymbolKind.EnumMember */, 16 /* CompletionItemKind.EnumMember */);
    byCompletionKind.set(22 /* SymbolKind.Struct */, 6 /* CompletionItemKind.Struct */);
    byCompletionKind.set(23 /* SymbolKind.Event */, 10 /* CompletionItemKind.Event */);
    byCompletionKind.set(24 /* SymbolKind.Operator */, 11 /* CompletionItemKind.Operator */);
    byCompletionKind.set(25 /* SymbolKind.TypeParameter */, 24 /* CompletionItemKind.TypeParameter */);
    /**
     * @internal
     */
    function toCompletionKind(kind) {
        let completionKind = byCompletionKind.get(kind);
        if (completionKind === undefined) {
            console.info('No completion kind found for SymbolKind ' + kind);
            completionKind = 20 /* CompletionItemKind.File */;
        }
        return completionKind;
    }
    SymbolKinds.toCompletionKind = toCompletionKind;
})(SymbolKinds || (SymbolKinds = {}));
/** @internal */
export class TextEdit {
    static asEditOperation(edit) {
        return EditOperation.replace(Range.lift(edit.range), edit.text);
    }
    static isTextEdit(thing) {
        const possibleTextEdit = thing;
        return typeof possibleTextEdit.text === 'string' && Range.isIRange(possibleTextEdit.range);
    }
}
export class FoldingRangeKind {
    /**
     * Kind for folding range representing a comment. The value of the kind is 'comment'.
     */
    static { this.Comment = new FoldingRangeKind('comment'); }
    /**
     * Kind for folding range representing a import. The value of the kind is 'imports'.
     */
    static { this.Imports = new FoldingRangeKind('imports'); }
    /**
     * Kind for folding range representing regions (for example marked by `#region`, `#endregion`).
     * The value of the kind is 'region'.
     */
    static { this.Region = new FoldingRangeKind('region'); }
    /**
     * Returns a {@link FoldingRangeKind} for the given value.
     *
     * @param value of the kind.
     */
    static fromValue(value) {
        switch (value) {
            case 'comment':
                return FoldingRangeKind.Comment;
            case 'imports':
                return FoldingRangeKind.Imports;
            case 'region':
                return FoldingRangeKind.Region;
        }
        return new FoldingRangeKind(value);
    }
    /**
     * Creates a new {@link FoldingRangeKind}.
     *
     * @param value of the kind.
     */
    constructor(value) {
        this.value = value;
    }
}
export var NewSymbolNameTag;
(function (NewSymbolNameTag) {
    NewSymbolNameTag[NewSymbolNameTag["AIGenerated"] = 1] = "AIGenerated";
})(NewSymbolNameTag || (NewSymbolNameTag = {}));
export var NewSymbolNameTriggerKind;
(function (NewSymbolNameTriggerKind) {
    NewSymbolNameTriggerKind[NewSymbolNameTriggerKind["Invoke"] = 0] = "Invoke";
    NewSymbolNameTriggerKind[NewSymbolNameTriggerKind["Automatic"] = 1] = "Automatic";
})(NewSymbolNameTriggerKind || (NewSymbolNameTriggerKind = {}));
/**
 * @internal
 */
export var Command;
(function (Command) {
    /**
     * @internal
     */
    function is(obj) {
        if (!obj || typeof obj !== 'object') {
            return false;
        }
        return typeof obj.id === 'string' && typeof obj.title === 'string';
    }
    Command.is = is;
})(Command || (Command = {}));
/**
 * @internal
 */
export var CommentThreadCollapsibleState;
(function (CommentThreadCollapsibleState) {
    /**
     * Determines an item is collapsed
     */
    CommentThreadCollapsibleState[CommentThreadCollapsibleState["Collapsed"] = 0] = "Collapsed";
    /**
     * Determines an item is expanded
     */
    CommentThreadCollapsibleState[CommentThreadCollapsibleState["Expanded"] = 1] = "Expanded";
})(CommentThreadCollapsibleState || (CommentThreadCollapsibleState = {}));
/**
 * @internal
 */
export var CommentThreadState;
(function (CommentThreadState) {
    CommentThreadState[CommentThreadState["Unresolved"] = 0] = "Unresolved";
    CommentThreadState[CommentThreadState["Resolved"] = 1] = "Resolved";
})(CommentThreadState || (CommentThreadState = {}));
/**
 * @internal
 */
export var CommentThreadApplicability;
(function (CommentThreadApplicability) {
    CommentThreadApplicability[CommentThreadApplicability["Current"] = 0] = "Current";
    CommentThreadApplicability[CommentThreadApplicability["Outdated"] = 1] = "Outdated";
})(CommentThreadApplicability || (CommentThreadApplicability = {}));
/**
 * @internal
 */
export var CommentMode;
(function (CommentMode) {
    CommentMode[CommentMode["Editing"] = 0] = "Editing";
    CommentMode[CommentMode["Preview"] = 1] = "Preview";
})(CommentMode || (CommentMode = {}));
/**
 * @internal
 */
export var CommentState;
(function (CommentState) {
    CommentState[CommentState["Published"] = 0] = "Published";
    CommentState[CommentState["Draft"] = 1] = "Draft";
})(CommentState || (CommentState = {}));
export var InlayHintKind;
(function (InlayHintKind) {
    InlayHintKind[InlayHintKind["Type"] = 1] = "Type";
    InlayHintKind[InlayHintKind["Parameter"] = 2] = "Parameter";
})(InlayHintKind || (InlayHintKind = {}));
/**
 * @internal
 */
export class LazyTokenizationSupport {
    constructor(createSupport) {
        this.createSupport = createSupport;
        this._tokenizationSupport = null;
    }
    dispose() {
        if (this._tokenizationSupport) {
            this._tokenizationSupport.then((support) => {
                if (support) {
                    support.dispose();
                }
            });
        }
    }
    get tokenizationSupport() {
        if (!this._tokenizationSupport) {
            this._tokenizationSupport = this.createSupport();
        }
        return this._tokenizationSupport;
    }
}
/**
 * @internal
 */
export const TokenizationRegistry = new TokenizationRegistryImpl();
/**
 * @internal
 */
export const TreeSitterTokenizationRegistry = new TokenizationRegistryImpl();
/**
 * @internal
 */
export var ExternalUriOpenerPriority;
(function (ExternalUriOpenerPriority) {
    ExternalUriOpenerPriority[ExternalUriOpenerPriority["None"] = 0] = "None";
    ExternalUriOpenerPriority[ExternalUriOpenerPriority["Option"] = 1] = "Option";
    ExternalUriOpenerPriority[ExternalUriOpenerPriority["Default"] = 2] = "Default";
    ExternalUriOpenerPriority[ExternalUriOpenerPriority["Preferred"] = 3] = "Preferred";
})(ExternalUriOpenerPriority || (ExternalUriOpenerPriority = {}));
export var InlineEditTriggerKind;
(function (InlineEditTriggerKind) {
    InlineEditTriggerKind[InlineEditTriggerKind["Invoke"] = 0] = "Invoke";
    InlineEditTriggerKind[InlineEditTriggerKind["Automatic"] = 1] = "Automatic";
})(InlineEditTriggerKind || (InlineEditTriggerKind = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL2xhbmd1YWdlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUloRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFRdkQsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSwwQkFBMEIsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsYUFBYSxFQUF3QixNQUFNLHlCQUF5QixDQUFBO0FBRTdFLE9BQU8sRUFBVSxLQUFLLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUsvQyxPQUFPLEVBQUUsb0JBQW9CLElBQUksd0JBQXdCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUU1RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sY0FBYyxDQUFBO0FBaUJ2QyxNQUFNLE9BQU8sS0FBSztJQUdqQixZQUNpQixNQUFjLEVBQ2QsSUFBWSxFQUNaLFFBQWdCO1FBRmhCLFdBQU0sR0FBTixNQUFNLENBQVE7UUFDZCxTQUFJLEdBQUosSUFBSSxDQUFRO1FBQ1osYUFBUSxHQUFSLFFBQVEsQ0FBUTtRQUxqQyxnQkFBVyxHQUFTLFNBQVMsQ0FBQTtJQU0xQixDQUFDO0lBRUcsUUFBUTtRQUNkLE9BQU8sR0FBRyxHQUFHLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLEdBQUcsR0FBRyxDQUFBO0lBQ2xELENBQUM7Q0FDRDtBQUVEOztHQUVHO0FBQ0gsTUFBTSxPQUFPLGtCQUFrQjtJQUc5QixZQUNpQixNQUFlLEVBQ2YsUUFBZ0I7UUFEaEIsV0FBTSxHQUFOLE1BQU0sQ0FBUztRQUNmLGFBQVEsR0FBUixRQUFRLENBQVE7UUFKakMsNkJBQXdCLEdBQVMsU0FBUyxDQUFBO0lBS3ZDLENBQUM7Q0FDSjtBQUVEOztHQUVHO0FBQ0gsTUFBTSxPQUFPLHlCQUF5QjtJQUdyQztJQUNDOzs7OztPQUtHO0lBQ2EsTUFBbUIsRUFDbkIsUUFBZ0I7UUFEaEIsV0FBTSxHQUFOLE1BQU0sQ0FBYTtRQUNuQixhQUFRLEdBQVIsUUFBUSxDQUFRO1FBVmpDLG9DQUErQixHQUFTLFNBQVMsQ0FBQTtJQVc5QyxDQUFDO0NBQ0o7QUEyTEQsTUFBTSxDQUFOLElBQVksb0JBU1g7QUFURCxXQUFZLG9CQUFvQjtJQUMvQjs7T0FFRztJQUNILHVFQUFRLENBQUE7SUFDUjs7T0FFRztJQUNILHVFQUFRLENBQUE7QUFDVCxDQUFDLEVBVFcsb0JBQW9CLEtBQXBCLG9CQUFvQixRQVMvQjtBQTRHRCxNQUFNLENBQU4sSUFBa0Isa0JBNkJqQjtBQTdCRCxXQUFrQixrQkFBa0I7SUFDbkMsK0RBQU0sQ0FBQTtJQUNOLG1FQUFRLENBQUE7SUFDUix5RUFBVyxDQUFBO0lBQ1gsNkRBQUssQ0FBQTtJQUNMLG1FQUFRLENBQUE7SUFDUiw2REFBSyxDQUFBO0lBQ0wsK0RBQU0sQ0FBQTtJQUNOLHFFQUFTLENBQUE7SUFDVCwrREFBTSxDQUFBO0lBQ04sbUVBQVEsQ0FBQTtJQUNSLDhEQUFLLENBQUE7SUFDTCxvRUFBUSxDQUFBO0lBQ1IsNERBQUksQ0FBQTtJQUNKLDhEQUFLLENBQUE7SUFDTCxvRUFBUSxDQUFBO0lBQ1IsNERBQUksQ0FBQTtJQUNKLHdFQUFVLENBQUE7SUFDVixrRUFBTyxDQUFBO0lBQ1AsNERBQUksQ0FBQTtJQUNKLDhEQUFLLENBQUE7SUFDTCw0REFBSSxDQUFBO0lBQ0osc0VBQVMsQ0FBQTtJQUNULDBFQUFXLENBQUE7SUFDWCxnRUFBTSxDQUFBO0lBQ04sOEVBQWEsQ0FBQTtJQUNiLDREQUFJLENBQUE7SUFDSiw4REFBSyxDQUFBO0lBQ0wsa0VBQU8sQ0FBQTtBQUNSLENBQUMsRUE3QmlCLGtCQUFrQixLQUFsQixrQkFBa0IsUUE2Qm5DO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLEtBQVcsbUJBQW1CLENBZ0tuQztBQWhLRCxXQUFpQixtQkFBbUI7SUFDbkMsTUFBTSxNQUFNLEdBQUcsSUFBSSxHQUFHLEVBQWlDLENBQUE7SUFDdkQsTUFBTSxDQUFDLEdBQUcsb0NBQTRCLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQTtJQUMzRCxNQUFNLENBQUMsR0FBRyxzQ0FBOEIsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFBO0lBQy9ELE1BQU0sQ0FBQyxHQUFHLHlDQUFpQyxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtJQUNyRSxNQUFNLENBQUMsR0FBRyxtQ0FBMkIsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFBO0lBQ3pELE1BQU0sQ0FBQyxHQUFHLHNDQUE4QixPQUFPLENBQUMsY0FBYyxDQUFDLENBQUE7SUFDL0QsTUFBTSxDQUFDLEdBQUcsbUNBQTJCLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQTtJQUN6RCxNQUFNLENBQUMsR0FBRyxvQ0FBNEIsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFBO0lBQzNELE1BQU0sQ0FBQyxHQUFHLHVDQUErQixPQUFPLENBQUMsZUFBZSxDQUFDLENBQUE7SUFDakUsTUFBTSxDQUFDLEdBQUcsb0NBQTRCLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQTtJQUMzRCxNQUFNLENBQUMsR0FBRyxzQ0FBOEIsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFBO0lBQy9ELE1BQU0sQ0FBQyxHQUFHLG9DQUEyQixPQUFPLENBQUMsV0FBVyxDQUFDLENBQUE7SUFDekQsTUFBTSxDQUFDLEdBQUcsdUNBQThCLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQTtJQUMvRCxNQUFNLENBQUMsR0FBRyxtQ0FBMEIsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFBO0lBQ3ZELE1BQU0sQ0FBQyxHQUFHLG9DQUEyQixPQUFPLENBQUMsV0FBVyxDQUFDLENBQUE7SUFDekQsTUFBTSxDQUFDLEdBQUcsbUNBQTBCLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQTtJQUN2RCxNQUFNLENBQUMsR0FBRyx1Q0FBOEIsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFBO0lBQy9ELE1BQU0sQ0FBQyxHQUFHLG1DQUEwQixPQUFPLENBQUMsVUFBVSxDQUFDLENBQUE7SUFDdkQsTUFBTSxDQUFDLEdBQUcseUNBQWdDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO0lBQ25FLE1BQU0sQ0FBQyxHQUFHLHNDQUE2QixPQUFPLENBQUMsYUFBYSxDQUFDLENBQUE7SUFDN0QsTUFBTSxDQUFDLEdBQUcsc0NBQTZCLE9BQU8sQ0FBQyxhQUFhLENBQUMsQ0FBQTtJQUM3RCxNQUFNLENBQUMsR0FBRyxtQ0FBMEIsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFBO0lBQ3ZELE1BQU0sQ0FBQyxHQUFHLG9DQUEyQixPQUFPLENBQUMsV0FBVyxDQUFDLENBQUE7SUFDekQsTUFBTSxDQUFDLEdBQUcsbUNBQTBCLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQTtJQUN2RCxNQUFNLENBQUMsR0FBRyx3Q0FBK0IsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFBO0lBQ2pFLE1BQU0sQ0FBQyxHQUFHLDBDQUFpQyxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtJQUNyRSxNQUFNLENBQUMsR0FBRyxxQ0FBNEIsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFBO0lBQzNELE1BQU0sQ0FBQyxHQUFHLDRDQUFtQyxPQUFPLENBQUMsbUJBQW1CLENBQUMsQ0FBQTtJQUN6RSxNQUFNLENBQUMsR0FBRyxtQ0FBMEIsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFBO0lBQ3BELE1BQU0sQ0FBQyxHQUFHLG9DQUEyQixPQUFPLENBQUMsTUFBTSxDQUFDLENBQUE7SUFFcEQ7O09BRUc7SUFDSCxTQUFnQixNQUFNLENBQUMsSUFBd0I7UUFDOUMsSUFBSSxPQUFPLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUM5QixJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDZCxPQUFPLENBQUMsSUFBSSxDQUFDLDBDQUEwQyxHQUFHLElBQUksQ0FBQyxDQUFBO1lBQy9ELE9BQU8sR0FBRyxPQUFPLENBQUMsY0FBYyxDQUFBO1FBQ2pDLENBQUM7UUFDRCxPQUFPLE9BQU8sQ0FBQTtJQUNmLENBQUM7SUFQZSwwQkFBTSxTQU9yQixDQUFBO0lBRUQ7O09BRUc7SUFDSCxTQUFnQixPQUFPLENBQUMsSUFBd0I7UUFDL0MsUUFBUSxJQUFJLEVBQUUsQ0FBQztZQUNkO2dCQUNDLE9BQU8sUUFBUSxDQUFDLDJCQUEyQixFQUFFLFFBQVEsQ0FBQyxDQUFBO1lBQ3ZEO2dCQUNDLE9BQU8sUUFBUSxDQUFDLDZCQUE2QixFQUFFLFVBQVUsQ0FBQyxDQUFBO1lBQzNEO2dCQUNDLE9BQU8sUUFBUSxDQUFDLGdDQUFnQyxFQUFFLGFBQWEsQ0FBQyxDQUFBO1lBQ2pFO2dCQUNDLE9BQU8sUUFBUSxDQUFDLDBCQUEwQixFQUFFLE9BQU8sQ0FBQyxDQUFBO1lBQ3JEO2dCQUNDLE9BQU8sUUFBUSxDQUFDLDZCQUE2QixFQUFFLFVBQVUsQ0FBQyxDQUFBO1lBQzNEO2dCQUNDLE9BQU8sUUFBUSxDQUFDLDBCQUEwQixFQUFFLE9BQU8sQ0FBQyxDQUFBO1lBQ3JEO2dCQUNDLE9BQU8sUUFBUSxDQUFDLDJCQUEyQixFQUFFLFFBQVEsQ0FBQyxDQUFBO1lBQ3ZEO2dCQUNDLE9BQU8sUUFBUSxDQUFDLDhCQUE4QixFQUFFLFdBQVcsQ0FBQyxDQUFBO1lBQzdEO2dCQUNDLE9BQU8sUUFBUSxDQUFDLDJCQUEyQixFQUFFLFFBQVEsQ0FBQyxDQUFBO1lBQ3ZEO2dCQUNDLE9BQU8sUUFBUSxDQUFDLDZCQUE2QixFQUFFLFVBQVUsQ0FBQyxDQUFBO1lBQzNEO2dCQUNDLE9BQU8sUUFBUSxDQUFDLDBCQUEwQixFQUFFLE9BQU8sQ0FBQyxDQUFBO1lBQ3JEO2dCQUNDLE9BQU8sUUFBUSxDQUFDLDZCQUE2QixFQUFFLFVBQVUsQ0FBQyxDQUFBO1lBQzNEO2dCQUNDLE9BQU8sUUFBUSxDQUFDLHlCQUF5QixFQUFFLE1BQU0sQ0FBQyxDQUFBO1lBQ25EO2dCQUNDLE9BQU8sUUFBUSxDQUFDLDBCQUEwQixFQUFFLE9BQU8sQ0FBQyxDQUFBO1lBQ3JEO2dCQUNDLE9BQU8sUUFBUSxDQUFDLDZCQUE2QixFQUFFLFVBQVUsQ0FBQyxDQUFBO1lBQzNEO2dCQUNDLE9BQU8sUUFBUSxDQUFDLHlCQUF5QixFQUFFLE1BQU0sQ0FBQyxDQUFBO1lBQ25EO2dCQUNDLE9BQU8sUUFBUSxDQUFDLCtCQUErQixFQUFFLGFBQWEsQ0FBQyxDQUFBO1lBQ2hFO2dCQUNDLE9BQU8sUUFBUSxDQUFDLDRCQUE0QixFQUFFLFNBQVMsQ0FBQyxDQUFBO1lBQ3pEO2dCQUNDLE9BQU8sUUFBUSxDQUFDLHlCQUF5QixFQUFFLE1BQU0sQ0FBQyxDQUFBO1lBQ25EO2dCQUNDLE9BQU8sUUFBUSxDQUFDLDBCQUEwQixFQUFFLE9BQU8sQ0FBQyxDQUFBO1lBQ3JEO2dCQUNDLE9BQU8sUUFBUSxDQUFDLHlCQUF5QixFQUFFLE1BQU0sQ0FBQyxDQUFBO1lBQ25EO2dCQUNDLE9BQU8sUUFBUSxDQUFDLDhCQUE4QixFQUFFLFdBQVcsQ0FBQyxDQUFBO1lBQzdEO2dCQUNDLE9BQU8sUUFBUSxDQUFDLGdDQUFnQyxFQUFFLGNBQWMsQ0FBQyxDQUFBO1lBQ2xFO2dCQUNDLE9BQU8sUUFBUSxDQUFDLDJCQUEyQixFQUFFLFFBQVEsQ0FBQyxDQUFBO1lBQ3ZEO2dCQUNDLE9BQU8sUUFBUSxDQUFDLGtDQUFrQyxFQUFFLGdCQUFnQixDQUFDLENBQUE7WUFDdEU7Z0JBQ0MsT0FBTyxRQUFRLENBQUMseUJBQXlCLEVBQUUsTUFBTSxDQUFDLENBQUE7WUFDbkQ7Z0JBQ0MsT0FBTyxRQUFRLENBQUMsMEJBQTBCLEVBQUUsT0FBTyxDQUFDLENBQUE7WUFDckQ7Z0JBQ0MsT0FBTyxRQUFRLENBQUMsNEJBQTRCLEVBQUUsU0FBUyxDQUFDLENBQUE7WUFDekQ7Z0JBQ0MsT0FBTyxFQUFFLENBQUE7UUFDWCxDQUFDO0lBQ0YsQ0FBQztJQTdEZSwyQkFBTyxVQTZEdEIsQ0FBQTtJQUVELE1BQU0sSUFBSSxHQUFHLElBQUksR0FBRyxFQUE4QixDQUFBO0lBQ2xELElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxvQ0FBNEIsQ0FBQTtJQUM3QyxJQUFJLENBQUMsR0FBRyxDQUFDLFVBQVUsc0NBQThCLENBQUE7SUFDakQsSUFBSSxDQUFDLEdBQUcsQ0FBQyxhQUFhLEVBQUUsc0NBQW1DLENBQUMsQ0FBQTtJQUM1RCxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sbUNBQTJCLENBQUE7SUFDM0MsSUFBSSxDQUFDLEdBQUcsQ0FBQyxVQUFVLHNDQUE4QixDQUFBO0lBQ2pELElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxtQ0FBMkIsQ0FBQTtJQUMzQyxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsb0NBQTRCLENBQUE7SUFDN0MsSUFBSSxDQUFDLEdBQUcsQ0FBQyxXQUFXLHVDQUErQixDQUFBO0lBQ25ELElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxvQ0FBNEIsQ0FBQTtJQUM3QyxJQUFJLENBQUMsR0FBRyxDQUFDLFVBQVUsc0NBQThCLENBQUE7SUFDakQsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLG9DQUEyQixDQUFBO0lBQzNDLElBQUksQ0FBQyxHQUFHLENBQUMsVUFBVSx1Q0FBOEIsQ0FBQTtJQUNqRCxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sbUNBQTBCLENBQUE7SUFDekMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLG9DQUEyQixDQUFBO0lBQzNDLElBQUksQ0FBQyxHQUFHLENBQUMsVUFBVSx1Q0FBOEIsQ0FBQTtJQUNqRCxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sbUNBQTBCLENBQUE7SUFDekMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxhQUFhLHlDQUFnQyxDQUFBO0lBQ3RELElBQUksQ0FBQyxHQUFHLENBQUMsWUFBWSx5Q0FBZ0MsQ0FBQTtJQUNyRCxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsc0NBQTZCLENBQUE7SUFDL0MsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLHNDQUE2QixDQUFBO0lBQy9DLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxtQ0FBMEIsQ0FBQTtJQUN6QyxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sb0NBQTJCLENBQUE7SUFDM0MsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLG1DQUEwQixDQUFBO0lBQ3pDLElBQUksQ0FBQyxHQUFHLENBQUMsV0FBVyx3Q0FBK0IsQ0FBQTtJQUNuRCxJQUFJLENBQUMsR0FBRyxDQUFDLGFBQWEsMENBQWlDLENBQUE7SUFDdkQsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLHFDQUE0QixDQUFBO0lBQzdDLElBQUksQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLDRDQUFtQyxDQUFBO0lBQzVELElBQUksQ0FBQyxHQUFHLENBQUMsZUFBZSw0Q0FBbUMsQ0FBQTtJQUMzRCxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsbUNBQTBCLENBQUE7SUFDNUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLG9DQUEyQixDQUFBO0lBVTNDOztPQUVHO0lBQ0gsU0FBZ0IsVUFBVSxDQUFDLEtBQWEsRUFBRSxNQUFnQjtRQUN6RCxJQUFJLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ3pCLElBQUksT0FBTyxHQUFHLEtBQUssV0FBVyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDM0MsR0FBRyxzQ0FBOEIsQ0FBQTtRQUNsQyxDQUFDO1FBQ0QsT0FBTyxHQUFHLENBQUE7SUFDWCxDQUFDO0lBTmUsOEJBQVUsYUFNekIsQ0FBQTtBQUNGLENBQUMsRUFoS2dCLG1CQUFtQixLQUFuQixtQkFBbUIsUUFnS25DO0FBUUQsTUFBTSxDQUFOLElBQWtCLGlCQUVqQjtBQUZELFdBQWtCLGlCQUFpQjtJQUNsQyxxRUFBYyxDQUFBO0FBQ2YsQ0FBQyxFQUZpQixpQkFBaUIsS0FBakIsaUJBQWlCLFFBRWxDO0FBRUQsTUFBTSxDQUFOLElBQWtCLDRCQWFqQjtBQWJELFdBQWtCLDRCQUE0QjtJQUM3QywrRUFBUSxDQUFBO0lBRVI7OztPQUdHO0lBQ0gsbUdBQXNCLENBQUE7SUFFdEI7O09BRUc7SUFDSCxxR0FBdUIsQ0FBQTtBQUN4QixDQUFDLEVBYmlCLDRCQUE0QixLQUE1Qiw0QkFBNEIsUUFhN0M7QUEwSEQ7O0dBRUc7QUFDSCxNQUFNLENBQU4sSUFBa0Isd0JBSWpCO0FBSkQsV0FBa0Isd0JBQXdCO0lBQ3pDLHVFQUFRLENBQUE7SUFDUix1RUFBUSxDQUFBO0lBQ1IsNkVBQVcsQ0FBQTtBQUNaLENBQUMsRUFKaUIsd0JBQXdCLEtBQXhCLHdCQUF3QixRQUl6QztBQUVEOztHQUVHO0FBQ0gsTUFBTSxDQUFOLElBQWtCLHFCQUlqQjtBQUpELFdBQWtCLHFCQUFxQjtJQUN0QyxxRUFBVSxDQUFBO0lBQ1YseUZBQW9CLENBQUE7SUFDcEIsdUhBQW1DLENBQUE7QUFDcEMsQ0FBQyxFQUppQixxQkFBcUIsS0FBckIscUJBQXFCLFFBSXRDO0FBNEREOztHQUVHO0FBQ0gsTUFBTSxDQUFOLElBQVksMkJBWVg7QUFaRCxXQUFZLDJCQUEyQjtJQUN0Qzs7O09BR0c7SUFDSCx1RkFBYSxDQUFBO0lBRWI7OztPQUdHO0lBQ0gscUZBQVksQ0FBQTtBQUNiLENBQUMsRUFaVywyQkFBMkIsS0FBM0IsMkJBQTJCLFFBWXRDO0FBdUJELE1BQU0sT0FBTyxzQkFBc0I7SUFDbEMsWUFDaUIsS0FBYSxFQUNiLElBQVksRUFDWixjQUFrQyxFQUNsQyxhQUFzQjtRQUh0QixVQUFLLEdBQUwsS0FBSyxDQUFRO1FBQ2IsU0FBSSxHQUFKLElBQUksQ0FBUTtRQUNaLG1CQUFjLEdBQWQsY0FBYyxDQUFvQjtRQUNsQyxrQkFBYSxHQUFiLGFBQWEsQ0FBUztJQUNwQyxDQUFDO0lBRUcsTUFBTSxDQUFDLEtBQTZCO1FBQzFDLE9BQU8sQ0FDTixLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQztZQUMvQyxJQUFJLENBQUMsSUFBSSxLQUFLLEtBQUssQ0FBQyxJQUFJO1lBQ3hCLElBQUksQ0FBQyxjQUFjLEtBQUssS0FBSyxDQUFDLGNBQWM7WUFDNUMsSUFBSSxDQUFDLGFBQWEsS0FBSyxLQUFLLENBQUMsYUFBYSxDQUMxQyxDQUFBO0lBQ0YsQ0FBQztDQUNEO0FBNkpELE1BQU0sQ0FBTixJQUFrQixxQkFHakI7QUFIRCxXQUFrQixxQkFBcUI7SUFDdEMscUVBQVUsQ0FBQTtJQUNWLGlFQUFRLENBQUE7QUFDVCxDQUFDLEVBSGlCLHFCQUFxQixLQUFyQixxQkFBcUIsUUFHdEM7QUFnRUQ7O0dBRUc7QUFDSCxNQUFNLENBQU4sSUFBWSx3QkFHWDtBQUhELFdBQVksd0JBQXdCO0lBQ25DLGlGQUFhLENBQUE7SUFDYiw2RUFBVyxDQUFBO0FBQ1osQ0FBQyxFQUhXLHdCQUF3QixLQUF4Qix3QkFBd0IsUUFHbkM7QUFtSEQsTUFBTSxDQUFOLElBQVksd0JBSVg7QUFKRCxXQUFZLHdCQUF3QjtJQUNuQywyRUFBVSxDQUFBO0lBQ1YsK0ZBQW9CLENBQUE7SUFDcEIseUZBQWlCLENBQUE7QUFDbEIsQ0FBQyxFQUpXLHdCQUF3QixLQUF4Qix3QkFBd0IsUUFJbkM7QUE0QkQ7O0dBRUc7QUFDSCxNQUFNLENBQU4sSUFBWSxxQkFhWDtBQWJELFdBQVkscUJBQXFCO0lBQ2hDOztPQUVHO0lBQ0gsaUVBQUksQ0FBQTtJQUNKOztPQUVHO0lBQ0gsaUVBQUksQ0FBQTtJQUNKOztPQUVHO0lBQ0gsbUVBQUssQ0FBQTtBQUNOLENBQUMsRUFiVyxxQkFBcUIsS0FBckIscUJBQXFCLFFBYWhDO0FBMktEOztHQUVHO0FBQ0gsTUFBTSxVQUFVLGNBQWMsQ0FBQyxLQUFVO0lBQ3hDLE9BQU8sQ0FDTixLQUFLO1FBQ0wsR0FBRyxDQUFDLEtBQUssQ0FBRSxLQUFzQixDQUFDLEdBQUcsQ0FBQztRQUN0QyxLQUFLLENBQUMsUUFBUSxDQUFFLEtBQXNCLENBQUMsS0FBSyxDQUFDO1FBQzdDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBRSxLQUFzQixDQUFDLG9CQUFvQixDQUFDO1lBQzVELEtBQUssQ0FBQyxRQUFRLENBQUUsS0FBc0IsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQzlELENBQUE7QUFDRixDQUFDO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLFVBQVUsVUFBVSxDQUFDLEtBQVU7SUFDcEMsT0FBTyxLQUFLLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBRSxLQUFrQixDQUFDLEdBQUcsQ0FBQyxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUUsS0FBa0IsQ0FBQyxLQUFLLENBQUMsQ0FBQTtBQUNoRyxDQUFDO0FBa0VEOztHQUVHO0FBQ0gsTUFBTSxDQUFOLElBQWtCLFVBMkJqQjtBQTNCRCxXQUFrQixVQUFVO0lBQzNCLDJDQUFRLENBQUE7SUFDUiwrQ0FBVSxDQUFBO0lBQ1YscURBQWEsQ0FBQTtJQUNiLGlEQUFXLENBQUE7SUFDWCw2Q0FBUyxDQUFBO0lBQ1QsK0NBQVUsQ0FBQTtJQUNWLG1EQUFZLENBQUE7SUFDWiw2Q0FBUyxDQUFBO0lBQ1QseURBQWUsQ0FBQTtJQUNmLDJDQUFRLENBQUE7SUFDUixzREFBYyxDQUFBO0lBQ2Qsb0RBQWEsQ0FBQTtJQUNiLG9EQUFhLENBQUE7SUFDYixvREFBYSxDQUFBO0lBQ2IsZ0RBQVcsQ0FBQTtJQUNYLGdEQUFXLENBQUE7SUFDWCxrREFBWSxDQUFBO0lBQ1osOENBQVUsQ0FBQTtJQUNWLGdEQUFXLENBQUE7SUFDWCwwQ0FBUSxDQUFBO0lBQ1IsNENBQVMsQ0FBQTtJQUNULHdEQUFlLENBQUE7SUFDZixnREFBVyxDQUFBO0lBQ1gsOENBQVUsQ0FBQTtJQUNWLG9EQUFhLENBQUE7SUFDYiw4REFBa0IsQ0FBQTtBQUNuQixDQUFDLEVBM0JpQixVQUFVLEtBQVYsVUFBVSxRQTJCM0I7QUFFRDs7R0FFRztBQUNILE1BQU0sQ0FBQyxNQUFNLGVBQWUsR0FBaUM7SUFDNUQsMkJBQWtCLEVBQUUsUUFBUSxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUM7SUFDOUMsNkJBQW9CLEVBQUUsUUFBUSxDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUM7SUFDcEQsMEJBQWtCLEVBQUUsUUFBUSxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUM7SUFDOUMsOEJBQXFCLEVBQUUsUUFBUSxDQUFDLFVBQVUsRUFBRSxVQUFVLENBQUM7SUFDdkQsZ0NBQXdCLEVBQUUsUUFBUSxDQUFDLGFBQWEsRUFBRSxhQUFhLENBQUM7SUFDaEUseUJBQWlCLEVBQUUsUUFBUSxDQUFDLE1BQU0sRUFBRSxhQUFhLENBQUM7SUFDbEQsZ0NBQXVCLEVBQUUsUUFBUSxDQUFDLFlBQVksRUFBRSxvQkFBb0IsQ0FBQztJQUNyRSwyQkFBa0IsRUFBRSxRQUFRLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQztJQUM5QywwQkFBa0IsRUFBRSxRQUFRLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQztJQUM5Qyx5QkFBaUIsRUFBRSxRQUFRLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQztJQUMzQyw4QkFBcUIsRUFBRSxRQUFRLENBQUMsVUFBVSxFQUFFLFVBQVUsQ0FBQztJQUN2RCwrQkFBc0IsRUFBRSxRQUFRLENBQUMsV0FBVyxFQUFFLFdBQVcsQ0FBQztJQUMxRCx5QkFBZ0IsRUFBRSxRQUFRLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQztJQUN4QywyQkFBbUIsRUFBRSxRQUFRLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQztJQUNqRCwyQkFBbUIsRUFBRSxRQUFRLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQztJQUNqRCw4QkFBc0IsRUFBRSxRQUFRLENBQUMsV0FBVyxFQUFFLFdBQVcsQ0FBQztJQUMxRCwwQkFBaUIsRUFBRSxRQUFRLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQztJQUMzQyw0QkFBbUIsRUFBRSxRQUFRLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQztJQUNqRCw0QkFBbUIsRUFBRSxRQUFRLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQztJQUNqRCw4QkFBcUIsRUFBRSxRQUFRLENBQUMsVUFBVSxFQUFFLFVBQVUsQ0FBQztJQUN2RCw0QkFBb0IsRUFBRSxRQUFRLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQztJQUNwRCw2QkFBcUIsRUFBRSxRQUFRLENBQUMsVUFBVSxFQUFFLFVBQVUsQ0FBQztJQUN2RCw0QkFBbUIsRUFBRSxRQUFRLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQztJQUNqRCw0QkFBbUIsRUFBRSxRQUFRLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQztJQUNqRCxtQ0FBMEIsRUFBRSxRQUFRLENBQUMsZUFBZSxFQUFFLGdCQUFnQixDQUFDO0lBQ3ZFLDhCQUFxQixFQUFFLFFBQVEsQ0FBQyxVQUFVLEVBQUUsVUFBVSxDQUFDO0NBQ3ZELENBQUE7QUFFRDs7R0FFRztBQUNILE1BQU0sVUFBVSxxQkFBcUIsQ0FBQyxVQUFrQixFQUFFLElBQWdCO0lBQ3pFLE9BQU8sUUFBUSxDQUFDLGlCQUFpQixFQUFFLFdBQVcsRUFBRSxVQUFVLEVBQUUsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUE7QUFDbkYsQ0FBQztBQUVELE1BQU0sQ0FBTixJQUFrQixTQUVqQjtBQUZELFdBQWtCLFNBQVM7SUFDMUIscURBQWMsQ0FBQTtBQUNmLENBQUMsRUFGaUIsU0FBUyxLQUFULFNBQVMsUUFFMUI7QUFFRDs7R0FFRztBQUNILE1BQU0sS0FBVyxXQUFXLENBOEUzQjtBQTlFRCxXQUFpQixXQUFXO0lBQzNCLE1BQU0sTUFBTSxHQUFHLElBQUksR0FBRyxFQUF5QixDQUFBO0lBQy9DLE1BQU0sQ0FBQyxHQUFHLDBCQUFrQixPQUFPLENBQUMsVUFBVSxDQUFDLENBQUE7SUFDL0MsTUFBTSxDQUFDLEdBQUcsNEJBQW9CLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQTtJQUNuRCxNQUFNLENBQUMsR0FBRywrQkFBdUIsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFBO0lBQ3pELE1BQU0sQ0FBQyxHQUFHLDZCQUFxQixPQUFPLENBQUMsYUFBYSxDQUFDLENBQUE7SUFDckQsTUFBTSxDQUFDLEdBQUcsMkJBQW1CLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQTtJQUNqRCxNQUFNLENBQUMsR0FBRyw0QkFBb0IsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFBO0lBQ25ELE1BQU0sQ0FBQyxHQUFHLDhCQUFzQixPQUFPLENBQUMsY0FBYyxDQUFDLENBQUE7SUFDdkQsTUFBTSxDQUFDLEdBQUcsMkJBQW1CLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQTtJQUNqRCxNQUFNLENBQUMsR0FBRyxpQ0FBeUIsT0FBTyxDQUFDLGlCQUFpQixDQUFDLENBQUE7SUFDN0QsTUFBTSxDQUFDLEdBQUcsMEJBQWtCLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQTtJQUMvQyxNQUFNLENBQUMsR0FBRyxnQ0FBdUIsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFBO0lBQ3pELE1BQU0sQ0FBQyxHQUFHLCtCQUFzQixPQUFPLENBQUMsY0FBYyxDQUFDLENBQUE7SUFDdkQsTUFBTSxDQUFDLEdBQUcsK0JBQXNCLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQTtJQUN2RCxNQUFNLENBQUMsR0FBRywrQkFBc0IsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFBO0lBQ3ZELE1BQU0sQ0FBQyxHQUFHLDZCQUFvQixPQUFPLENBQUMsWUFBWSxDQUFDLENBQUE7SUFDbkQsTUFBTSxDQUFDLEdBQUcsNkJBQW9CLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQTtJQUNuRCxNQUFNLENBQUMsR0FBRyw4QkFBcUIsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFBO0lBQ3JELE1BQU0sQ0FBQyxHQUFHLDRCQUFtQixPQUFPLENBQUMsV0FBVyxDQUFDLENBQUE7SUFDakQsTUFBTSxDQUFDLEdBQUcsNkJBQW9CLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQTtJQUNuRCxNQUFNLENBQUMsR0FBRywwQkFBaUIsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFBO0lBQzdDLE1BQU0sQ0FBQyxHQUFHLDJCQUFrQixPQUFPLENBQUMsVUFBVSxDQUFDLENBQUE7SUFDL0MsTUFBTSxDQUFDLEdBQUcsaUNBQXdCLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO0lBQzNELE1BQU0sQ0FBQyxHQUFHLDZCQUFvQixPQUFPLENBQUMsWUFBWSxDQUFDLENBQUE7SUFDbkQsTUFBTSxDQUFDLEdBQUcsNEJBQW1CLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQTtJQUNqRCxNQUFNLENBQUMsR0FBRywrQkFBc0IsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFBO0lBQ3ZELE1BQU0sQ0FBQyxHQUFHLG9DQUEyQixPQUFPLENBQUMsbUJBQW1CLENBQUMsQ0FBQTtJQUNqRTs7T0FFRztJQUNILFNBQWdCLE1BQU0sQ0FBQyxJQUFnQjtRQUN0QyxJQUFJLElBQUksR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQzNCLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNYLE9BQU8sQ0FBQyxJQUFJLENBQUMsa0NBQWtDLEdBQUcsSUFBSSxDQUFDLENBQUE7WUFDdkQsSUFBSSxHQUFHLE9BQU8sQ0FBQyxjQUFjLENBQUE7UUFDOUIsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQVBlLGtCQUFNLFNBT3JCLENBQUE7SUFFRCxNQUFNLGdCQUFnQixHQUFHLElBQUksR0FBRyxFQUFrQyxDQUFBO0lBQ2xFLGdCQUFnQixDQUFDLEdBQUcsMkRBQTBDLENBQUE7SUFDOUQsZ0JBQWdCLENBQUMsR0FBRyw4REFBOEMsQ0FBQTtJQUNsRSxnQkFBZ0IsQ0FBQyxHQUFHLGlFQUFpRCxDQUFBO0lBQ3JFLGdCQUFnQixDQUFDLEdBQUcsK0RBQStDLENBQUE7SUFDbkUsZ0JBQWdCLENBQUMsR0FBRyw0REFBNEMsQ0FBQTtJQUNoRSxnQkFBZ0IsQ0FBQyxHQUFHLDhEQUE4QyxDQUFBO0lBQ2xFLGdCQUFnQixDQUFDLEdBQUcsa0VBQWtELENBQUE7SUFDdEUsZ0JBQWdCLENBQUMsR0FBRyw0REFBNEMsQ0FBQTtJQUNoRSxnQkFBZ0IsQ0FBQyxHQUFHLHdFQUF3RCxDQUFBO0lBQzVFLGdCQUFnQixDQUFDLEdBQUcsMkRBQTBDLENBQUE7SUFDOUQsZ0JBQWdCLENBQUMsR0FBRyxxRUFBb0QsQ0FBQTtJQUN4RSxnQkFBZ0IsQ0FBQyxHQUFHLG1FQUFrRCxDQUFBO0lBQ3RFLGdCQUFnQixDQUFDLEdBQUcsbUVBQWtELENBQUE7SUFDdEUsZ0JBQWdCLENBQUMsR0FBRyxvRUFBa0QsQ0FBQTtJQUN0RSxnQkFBZ0IsQ0FBQyxHQUFHLDhEQUE0QyxDQUFBO0lBQ2hFLGdCQUFnQixDQUFDLEdBQUcsK0RBQTZDLENBQUE7SUFDakUsZ0JBQWdCLENBQUMsR0FBRyxnRUFBOEMsQ0FBQTtJQUNsRSxnQkFBZ0IsQ0FBQyxHQUFHLDhEQUE0QyxDQUFBO0lBQ2hFLGdCQUFnQixDQUFDLEdBQUcsK0RBQTZDLENBQUE7SUFDakUsZ0JBQWdCLENBQUMsR0FBRyw4REFBNEMsQ0FBQTtJQUNoRSxnQkFBZ0IsQ0FBQyxHQUFHLDZEQUEyQyxDQUFBO0lBQy9ELGdCQUFnQixDQUFDLEdBQUcsd0VBQXNELENBQUE7SUFDMUUsZ0JBQWdCLENBQUMsR0FBRywrREFBOEMsQ0FBQTtJQUNsRSxnQkFBZ0IsQ0FBQyxHQUFHLDhEQUE0QyxDQUFBO0lBQ2hFLGdCQUFnQixDQUFDLEdBQUcsb0VBQWtELENBQUE7SUFDdEUsZ0JBQWdCLENBQUMsR0FBRyw4RUFBNEQsQ0FBQTtJQUNoRjs7T0FFRztJQUNILFNBQWdCLGdCQUFnQixDQUFDLElBQWdCO1FBQ2hELElBQUksY0FBYyxHQUFHLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUMvQyxJQUFJLGNBQWMsS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUNsQyxPQUFPLENBQUMsSUFBSSxDQUFDLDBDQUEwQyxHQUFHLElBQUksQ0FBQyxDQUFBO1lBQy9ELGNBQWMsbUNBQTBCLENBQUE7UUFDekMsQ0FBQztRQUNELE9BQU8sY0FBYyxDQUFBO0lBQ3RCLENBQUM7SUFQZSw0QkFBZ0IsbUJBTy9CLENBQUE7QUFDRixDQUFDLEVBOUVnQixXQUFXLEtBQVgsV0FBVyxRQThFM0I7QUFtQ0QsZ0JBQWdCO0FBQ2hCLE1BQU0sT0FBZ0IsUUFBUTtJQUM3QixNQUFNLENBQUMsZUFBZSxDQUFDLElBQWM7UUFDcEMsT0FBTyxhQUFhLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUNoRSxDQUFDO0lBQ0QsTUFBTSxDQUFDLFVBQVUsQ0FBQyxLQUFVO1FBQzNCLE1BQU0sZ0JBQWdCLEdBQUcsS0FBaUIsQ0FBQTtRQUMxQyxPQUFPLE9BQU8sZ0JBQWdCLENBQUMsSUFBSSxLQUFLLFFBQVEsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQzNGLENBQUM7Q0FDRDtBQTRRRCxNQUFNLE9BQU8sZ0JBQWdCO0lBQzVCOztPQUVHO2FBQ2EsWUFBTyxHQUFHLElBQUksZ0JBQWdCLENBQUMsU0FBUyxDQUFDLENBQUE7SUFDekQ7O09BRUc7YUFDYSxZQUFPLEdBQUcsSUFBSSxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsQ0FBQTtJQUN6RDs7O09BR0c7YUFDYSxXQUFNLEdBQUcsSUFBSSxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FBQTtJQUV2RDs7OztPQUlHO0lBQ0gsTUFBTSxDQUFDLFNBQVMsQ0FBQyxLQUFhO1FBQzdCLFFBQVEsS0FBSyxFQUFFLENBQUM7WUFDZixLQUFLLFNBQVM7Z0JBQ2IsT0FBTyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUE7WUFDaEMsS0FBSyxTQUFTO2dCQUNiLE9BQU8sZ0JBQWdCLENBQUMsT0FBTyxDQUFBO1lBQ2hDLEtBQUssUUFBUTtnQkFDWixPQUFPLGdCQUFnQixDQUFDLE1BQU0sQ0FBQTtRQUNoQyxDQUFDO1FBQ0QsT0FBTyxJQUFJLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQ25DLENBQUM7SUFFRDs7OztPQUlHO0lBQ0gsWUFBMEIsS0FBYTtRQUFiLFVBQUssR0FBTCxLQUFLLENBQVE7SUFBRyxDQUFDOztBQTRFNUMsTUFBTSxDQUFOLElBQVksZ0JBRVg7QUFGRCxXQUFZLGdCQUFnQjtJQUMzQixxRUFBZSxDQUFBO0FBQ2hCLENBQUMsRUFGVyxnQkFBZ0IsS0FBaEIsZ0JBQWdCLFFBRTNCO0FBRUQsTUFBTSxDQUFOLElBQVksd0JBR1g7QUFIRCxXQUFZLHdCQUF3QjtJQUNuQywyRUFBVSxDQUFBO0lBQ1YsaUZBQWEsQ0FBQTtBQUNkLENBQUMsRUFIVyx3QkFBd0IsS0FBeEIsd0JBQXdCLFFBR25DO0FBd0JEOztHQUVHO0FBQ0gsTUFBTSxLQUFXLE9BQU8sQ0FVdkI7QUFWRCxXQUFpQixPQUFPO0lBQ3ZCOztPQUVHO0lBQ0gsU0FBZ0IsRUFBRSxDQUFDLEdBQVE7UUFDMUIsSUFBSSxDQUFDLEdBQUcsSUFBSSxPQUFPLEdBQUcsS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUNyQyxPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFDRCxPQUFPLE9BQWlCLEdBQUksQ0FBQyxFQUFFLEtBQUssUUFBUSxJQUFJLE9BQWlCLEdBQUksQ0FBQyxLQUFLLEtBQUssUUFBUSxDQUFBO0lBQ3pGLENBQUM7SUFMZSxVQUFFLEtBS2pCLENBQUE7QUFDRixDQUFDLEVBVmdCLE9BQU8sS0FBUCxPQUFPLFFBVXZCO0FBOEJEOztHQUVHO0FBQ0gsTUFBTSxDQUFOLElBQVksNkJBU1g7QUFURCxXQUFZLDZCQUE2QjtJQUN4Qzs7T0FFRztJQUNILDJGQUFhLENBQUE7SUFDYjs7T0FFRztJQUNILHlGQUFZLENBQUE7QUFDYixDQUFDLEVBVFcsNkJBQTZCLEtBQTdCLDZCQUE2QixRQVN4QztBQUVEOztHQUVHO0FBQ0gsTUFBTSxDQUFOLElBQVksa0JBR1g7QUFIRCxXQUFZLGtCQUFrQjtJQUM3Qix1RUFBYyxDQUFBO0lBQ2QsbUVBQVksQ0FBQTtBQUNiLENBQUMsRUFIVyxrQkFBa0IsS0FBbEIsa0JBQWtCLFFBRzdCO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLENBQU4sSUFBWSwwQkFHWDtBQUhELFdBQVksMEJBQTBCO0lBQ3JDLGlGQUFXLENBQUE7SUFDWCxtRkFBWSxDQUFBO0FBQ2IsQ0FBQyxFQUhXLDBCQUEwQixLQUExQiwwQkFBMEIsUUFHckM7QUF5R0Q7O0dBRUc7QUFDSCxNQUFNLENBQU4sSUFBWSxXQUdYO0FBSEQsV0FBWSxXQUFXO0lBQ3RCLG1EQUFXLENBQUE7SUFDWCxtREFBVyxDQUFBO0FBQ1osQ0FBQyxFQUhXLFdBQVcsS0FBWCxXQUFXLFFBR3RCO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLENBQU4sSUFBWSxZQUdYO0FBSEQsV0FBWSxZQUFZO0lBQ3ZCLHlEQUFhLENBQUE7SUFDYixpREFBUyxDQUFBO0FBQ1YsQ0FBQyxFQUhXLFlBQVksS0FBWixZQUFZLFFBR3ZCO0FBNEVELE1BQU0sQ0FBTixJQUFZLGFBR1g7QUFIRCxXQUFZLGFBQWE7SUFDeEIsaURBQVEsQ0FBQTtJQUNSLDJEQUFhLENBQUE7QUFDZCxDQUFDLEVBSFcsYUFBYSxLQUFiLGFBQWEsUUFHeEI7QUE0RkQ7O0dBRUc7QUFDSCxNQUFNLE9BQU8sdUJBQXVCO0lBS25DLFlBQTZCLGFBQTZEO1FBQTdELGtCQUFhLEdBQWIsYUFBYSxDQUFnRDtRQUZsRix5QkFBb0IsR0FBb0QsSUFBSSxDQUFBO0lBRVMsQ0FBQztJQUU5RixPQUFPO1FBQ04sSUFBSSxJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztZQUMvQixJQUFJLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUU7Z0JBQzFDLElBQUksT0FBTyxFQUFFLENBQUM7b0JBQ2IsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFBO2dCQUNsQixDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQUE7UUFDSCxDQUFDO0lBQ0YsQ0FBQztJQUVELElBQUksbUJBQW1CO1FBQ3RCLElBQUksQ0FBQyxJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztZQUNoQyxJQUFJLENBQUMsb0JBQW9CLEdBQUcsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFBO1FBQ2pELENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxvQkFBb0IsQ0FBQTtJQUNqQyxDQUFDO0NBQ0Q7QUF3REQ7O0dBRUc7QUFDSCxNQUFNLENBQUMsTUFBTSxvQkFBb0IsR0FDaEMsSUFBSSx3QkFBd0IsRUFBRSxDQUFBO0FBRS9COztHQUVHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sOEJBQThCLEdBQzFDLElBQUksd0JBQXdCLEVBQUUsQ0FBQTtBQUUvQjs7R0FFRztBQUNILE1BQU0sQ0FBTixJQUFZLHlCQUtYO0FBTEQsV0FBWSx5QkFBeUI7SUFDcEMseUVBQVEsQ0FBQTtJQUNSLDZFQUFVLENBQUE7SUFDViwrRUFBVyxDQUFBO0lBQ1gsbUZBQWEsQ0FBQTtBQUNkLENBQUMsRUFMVyx5QkFBeUIsS0FBekIseUJBQXlCLFFBS3BDO0FBb0VELE1BQU0sQ0FBTixJQUFZLHFCQUdYO0FBSEQsV0FBWSxxQkFBcUI7SUFDaEMscUVBQVUsQ0FBQTtJQUNWLDJFQUFhLENBQUE7QUFDZCxDQUFDLEVBSFcscUJBQXFCLEtBQXJCLHFCQUFxQixRQUdoQyJ9