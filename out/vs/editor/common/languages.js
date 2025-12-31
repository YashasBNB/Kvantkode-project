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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9sYW5ndWFnZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFJaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBUXZELE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sMEJBQTBCLENBQUE7QUFDN0QsT0FBTyxFQUFFLGFBQWEsRUFBd0IsTUFBTSx5QkFBeUIsQ0FBQTtBQUU3RSxPQUFPLEVBQVUsS0FBSyxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFLL0MsT0FBTyxFQUFFLG9CQUFvQixJQUFJLHdCQUF3QixFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFFNUYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGNBQWMsQ0FBQTtBQWlCdkMsTUFBTSxPQUFPLEtBQUs7SUFHakIsWUFDaUIsTUFBYyxFQUNkLElBQVksRUFDWixRQUFnQjtRQUZoQixXQUFNLEdBQU4sTUFBTSxDQUFRO1FBQ2QsU0FBSSxHQUFKLElBQUksQ0FBUTtRQUNaLGFBQVEsR0FBUixRQUFRLENBQVE7UUFMakMsZ0JBQVcsR0FBUyxTQUFTLENBQUE7SUFNMUIsQ0FBQztJQUVHLFFBQVE7UUFDZCxPQUFPLEdBQUcsR0FBRyxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxHQUFHLEdBQUcsQ0FBQTtJQUNsRCxDQUFDO0NBQ0Q7QUFFRDs7R0FFRztBQUNILE1BQU0sT0FBTyxrQkFBa0I7SUFHOUIsWUFDaUIsTUFBZSxFQUNmLFFBQWdCO1FBRGhCLFdBQU0sR0FBTixNQUFNLENBQVM7UUFDZixhQUFRLEdBQVIsUUFBUSxDQUFRO1FBSmpDLDZCQUF3QixHQUFTLFNBQVMsQ0FBQTtJQUt2QyxDQUFDO0NBQ0o7QUFFRDs7R0FFRztBQUNI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