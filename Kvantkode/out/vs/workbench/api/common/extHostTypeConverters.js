/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { asArray, coalesce, isNonEmptyArray } from '../../../base/common/arrays.js';
import { VSBuffer, encodeBase64 } from '../../../base/common/buffer.js';
import { UriList } from '../../../base/common/dataTransfer.js';
import { createSingleCallFunction } from '../../../base/common/functional.js';
import * as htmlContent from '../../../base/common/htmlContent.js';
import { ResourceMap, ResourceSet } from '../../../base/common/map.js';
import * as marked from '../../../base/common/marked/marked.js';
import { parse, revive } from '../../../base/common/marshalling.js';
import { Mimes } from '../../../base/common/mime.js';
import { cloneAndChange } from '../../../base/common/objects.js';
import { isWindows } from '../../../base/common/platform.js';
import { WellDefinedPrefixTree } from '../../../base/common/prefixTree.js';
import { basename } from '../../../base/common/resources.js';
import { ThemeIcon } from '../../../base/common/themables.js';
import { isDefined, isEmptyObject, isNumber, isString, isUndefinedOrNull, } from '../../../base/common/types.js';
import { URI, isUriComponents } from '../../../base/common/uri.js';
import { generateUuid } from '../../../base/common/uuid.js';
import * as editorRange from '../../../editor/common/core/range.js';
import * as languages from '../../../editor/common/languages.js';
import { MarkerSeverity, } from '../../../platform/markers/common/markers.js';
import { DEFAULT_EDITOR_ASSOCIATION } from '../../common/editor.js';
import * as notebooks from '../../contrib/notebook/common/notebookCommon.js';
import { TestId } from '../../contrib/testing/common/testId.js';
import { denamespaceTestTag, namespaceTestTag, } from '../../contrib/testing/common/testTypes.js';
import { ACTIVE_GROUP, SIDE_GROUP } from '../../services/editor/common/editorService.js';
import { checkProposedApiEnabled } from '../../services/extensions/common/extensions.js';
import { getPrivateApiFor } from './extHostTestingPrivateApi.js';
import * as types from './extHostTypes.js';
import { LanguageModelTextPart } from './extHostTypes.js';
import { ChatAgentLocation } from '../../contrib/chat/common/constants.js';
export var Selection;
(function (Selection) {
    function to(selection) {
        const { selectionStartLineNumber, selectionStartColumn, positionLineNumber, positionColumn } = selection;
        const start = new types.Position(selectionStartLineNumber - 1, selectionStartColumn - 1);
        const end = new types.Position(positionLineNumber - 1, positionColumn - 1);
        return new types.Selection(start, end);
    }
    Selection.to = to;
    function from(selection) {
        const { anchor, active } = selection;
        return {
            selectionStartLineNumber: anchor.line + 1,
            selectionStartColumn: anchor.character + 1,
            positionLineNumber: active.line + 1,
            positionColumn: active.character + 1,
        };
    }
    Selection.from = from;
})(Selection || (Selection = {}));
export var Range;
(function (Range) {
    function from(range) {
        if (!range) {
            return undefined;
        }
        const { start, end } = range;
        return {
            startLineNumber: start.line + 1,
            startColumn: start.character + 1,
            endLineNumber: end.line + 1,
            endColumn: end.character + 1,
        };
    }
    Range.from = from;
    function to(range) {
        if (!range) {
            return undefined;
        }
        const { startLineNumber, startColumn, endLineNumber, endColumn } = range;
        return new types.Range(startLineNumber - 1, startColumn - 1, endLineNumber - 1, endColumn - 1);
    }
    Range.to = to;
})(Range || (Range = {}));
export var Location;
(function (Location) {
    function from(location) {
        return {
            uri: location.uri,
            range: Range.from(location.range),
        };
    }
    Location.from = from;
    function to(location) {
        return new types.Location(URI.revive(location.uri), Range.to(location.range));
    }
    Location.to = to;
})(Location || (Location = {}));
export var TokenType;
(function (TokenType) {
    function to(type) {
        switch (type) {
            case 1 /* encodedTokenAttributes.StandardTokenType.Comment */:
                return types.StandardTokenType.Comment;
            case 0 /* encodedTokenAttributes.StandardTokenType.Other */:
                return types.StandardTokenType.Other;
            case 3 /* encodedTokenAttributes.StandardTokenType.RegEx */:
                return types.StandardTokenType.RegEx;
            case 2 /* encodedTokenAttributes.StandardTokenType.String */:
                return types.StandardTokenType.String;
        }
    }
    TokenType.to = to;
})(TokenType || (TokenType = {}));
export var Position;
(function (Position) {
    function to(position) {
        return new types.Position(position.lineNumber - 1, position.column - 1);
    }
    Position.to = to;
    function from(position) {
        return { lineNumber: position.line + 1, column: position.character + 1 };
    }
    Position.from = from;
})(Position || (Position = {}));
export var DocumentSelector;
(function (DocumentSelector) {
    function from(value, uriTransformer, extension) {
        return coalesce(asArray(value).map((sel) => _doTransformDocumentSelector(sel, uriTransformer, extension)));
    }
    DocumentSelector.from = from;
    function _doTransformDocumentSelector(selector, uriTransformer, extension) {
        if (typeof selector === 'string') {
            return {
                $serialized: true,
                language: selector,
                isBuiltin: extension?.isBuiltin,
            };
        }
        if (selector) {
            return {
                $serialized: true,
                language: selector.language,
                scheme: _transformScheme(selector.scheme, uriTransformer),
                pattern: GlobPattern.from(selector.pattern) ?? undefined,
                exclusive: selector.exclusive,
                notebookType: selector.notebookType,
                isBuiltin: extension?.isBuiltin,
            };
        }
        return undefined;
    }
    function _transformScheme(scheme, uriTransformer) {
        if (uriTransformer && typeof scheme === 'string') {
            return uriTransformer.transformOutgoingScheme(scheme);
        }
        return scheme;
    }
})(DocumentSelector || (DocumentSelector = {}));
export var DiagnosticTag;
(function (DiagnosticTag) {
    function from(value) {
        switch (value) {
            case types.DiagnosticTag.Unnecessary:
                return 1 /* MarkerTag.Unnecessary */;
            case types.DiagnosticTag.Deprecated:
                return 2 /* MarkerTag.Deprecated */;
        }
        return undefined;
    }
    DiagnosticTag.from = from;
    function to(value) {
        switch (value) {
            case 1 /* MarkerTag.Unnecessary */:
                return types.DiagnosticTag.Unnecessary;
            case 2 /* MarkerTag.Deprecated */:
                return types.DiagnosticTag.Deprecated;
            default:
                return undefined;
        }
    }
    DiagnosticTag.to = to;
})(DiagnosticTag || (DiagnosticTag = {}));
export var Diagnostic;
(function (Diagnostic) {
    function from(value) {
        let code;
        if (value.code) {
            if (isString(value.code) || isNumber(value.code)) {
                code = String(value.code);
            }
            else {
                code = {
                    value: String(value.code.value),
                    target: value.code.target,
                };
            }
        }
        return {
            ...Range.from(value.range),
            message: value.message,
            source: value.source,
            code,
            severity: DiagnosticSeverity.from(value.severity),
            relatedInformation: value.relatedInformation && value.relatedInformation.map(DiagnosticRelatedInformation.from),
            tags: Array.isArray(value.tags) ? coalesce(value.tags.map(DiagnosticTag.from)) : undefined,
        };
    }
    Diagnostic.from = from;
    function to(value) {
        const res = new types.Diagnostic(Range.to(value), value.message, DiagnosticSeverity.to(value.severity));
        res.source = value.source;
        res.code = isString(value.code) ? value.code : value.code?.value;
        res.relatedInformation =
            value.relatedInformation && value.relatedInformation.map(DiagnosticRelatedInformation.to);
        res.tags = value.tags && coalesce(value.tags.map(DiagnosticTag.to));
        return res;
    }
    Diagnostic.to = to;
})(Diagnostic || (Diagnostic = {}));
export var DiagnosticRelatedInformation;
(function (DiagnosticRelatedInformation) {
    function from(value) {
        return {
            ...Range.from(value.location.range),
            message: value.message,
            resource: value.location.uri,
        };
    }
    DiagnosticRelatedInformation.from = from;
    function to(value) {
        return new types.DiagnosticRelatedInformation(new types.Location(value.resource, Range.to(value)), value.message);
    }
    DiagnosticRelatedInformation.to = to;
})(DiagnosticRelatedInformation || (DiagnosticRelatedInformation = {}));
export var DiagnosticSeverity;
(function (DiagnosticSeverity) {
    function from(value) {
        switch (value) {
            case types.DiagnosticSeverity.Error:
                return MarkerSeverity.Error;
            case types.DiagnosticSeverity.Warning:
                return MarkerSeverity.Warning;
            case types.DiagnosticSeverity.Information:
                return MarkerSeverity.Info;
            case types.DiagnosticSeverity.Hint:
                return MarkerSeverity.Hint;
        }
        return MarkerSeverity.Error;
    }
    DiagnosticSeverity.from = from;
    function to(value) {
        switch (value) {
            case MarkerSeverity.Info:
                return types.DiagnosticSeverity.Information;
            case MarkerSeverity.Warning:
                return types.DiagnosticSeverity.Warning;
            case MarkerSeverity.Error:
                return types.DiagnosticSeverity.Error;
            case MarkerSeverity.Hint:
                return types.DiagnosticSeverity.Hint;
            default:
                return types.DiagnosticSeverity.Error;
        }
    }
    DiagnosticSeverity.to = to;
})(DiagnosticSeverity || (DiagnosticSeverity = {}));
export var ViewColumn;
(function (ViewColumn) {
    function from(column) {
        if (typeof column === 'number' && column >= types.ViewColumn.One) {
            return column - 1; // adjust zero index (ViewColumn.ONE => 0)
        }
        if (column === types.ViewColumn.Beside) {
            return SIDE_GROUP;
        }
        return ACTIVE_GROUP; // default is always the active group
    }
    ViewColumn.from = from;
    function to(position) {
        if (typeof position === 'number' && position >= 0) {
            return position + 1; // adjust to index (ViewColumn.ONE => 1)
        }
        throw new Error(`invalid 'EditorGroupColumn'`);
    }
    ViewColumn.to = to;
})(ViewColumn || (ViewColumn = {}));
function isDecorationOptions(something) {
    return typeof something.range !== 'undefined';
}
export function isDecorationOptionsArr(something) {
    if (something.length === 0) {
        return true;
    }
    return isDecorationOptions(something[0]) ? true : false;
}
export var MarkdownString;
(function (MarkdownString) {
    function fromMany(markup) {
        return markup.map(MarkdownString.from);
    }
    MarkdownString.fromMany = fromMany;
    function isCodeblock(thing) {
        return (thing &&
            typeof thing === 'object' &&
            typeof thing.language === 'string' &&
            typeof thing.value === 'string');
    }
    function from(markup) {
        let res;
        if (isCodeblock(markup)) {
            const { language, value } = markup;
            res = { value: '```' + language + '\n' + value + '\n```\n' };
        }
        else if (types.MarkdownString.isMarkdownString(markup)) {
            res = {
                value: markup.value,
                isTrusted: markup.isTrusted,
                supportThemeIcons: markup.supportThemeIcons,
                supportHtml: markup.supportHtml,
                baseUri: markup.baseUri,
            };
        }
        else if (typeof markup === 'string') {
            res = { value: markup };
        }
        else {
            res = { value: '' };
        }
        // extract uris into a separate object
        const resUris = Object.create(null);
        res.uris = resUris;
        const collectUri = ({ href }) => {
            try {
                let uri = URI.parse(href, true);
                uri = uri.with({ query: _uriMassage(uri.query, resUris) });
                resUris[href] = uri;
            }
            catch (e) {
                // ignore
            }
            return '';
        };
        marked.marked.walkTokens(marked.marked.lexer(res.value), (token) => {
            if (token.type === 'link') {
                collectUri({ href: token.href });
            }
            else if (token.type === 'image') {
                if (typeof token.href === 'string') {
                    collectUri(htmlContent.parseHrefAndDimensions(token.href));
                }
            }
        });
        return res;
    }
    MarkdownString.from = from;
    function _uriMassage(part, bucket) {
        if (!part) {
            return part;
        }
        let data;
        try {
            data = parse(part);
        }
        catch (e) {
            // ignore
        }
        if (!data) {
            return part;
        }
        let changed = false;
        data = cloneAndChange(data, (value) => {
            if (URI.isUri(value)) {
                const key = `__uri_${Math.random().toString(16).slice(2, 8)}`;
                bucket[key] = value;
                changed = true;
                return key;
            }
            else {
                return undefined;
            }
        });
        if (!changed) {
            return part;
        }
        return JSON.stringify(data);
    }
    function to(value) {
        const result = new types.MarkdownString(value.value, value.supportThemeIcons);
        result.isTrusted = value.isTrusted;
        result.supportHtml = value.supportHtml;
        result.baseUri = value.baseUri ? URI.from(value.baseUri) : undefined;
        return result;
    }
    MarkdownString.to = to;
    function fromStrict(value) {
        if (!value) {
            return undefined;
        }
        return typeof value === 'string' ? value : MarkdownString.from(value);
    }
    MarkdownString.fromStrict = fromStrict;
})(MarkdownString || (MarkdownString = {}));
export function fromRangeOrRangeWithMessage(ranges) {
    if (isDecorationOptionsArr(ranges)) {
        return ranges.map((r) => {
            return {
                range: Range.from(r.range),
                hoverMessage: Array.isArray(r.hoverMessage)
                    ? MarkdownString.fromMany(r.hoverMessage)
                    : r.hoverMessage
                        ? MarkdownString.from(r.hoverMessage)
                        : undefined,
                renderOptions: /* URI vs Uri */ r.renderOptions,
            };
        });
    }
    else {
        return ranges.map((r) => {
            return {
                range: Range.from(r),
            };
        });
    }
}
export function pathOrURIToURI(value) {
    if (typeof value === 'undefined') {
        return value;
    }
    if (typeof value === 'string') {
        return URI.file(value);
    }
    else {
        return value;
    }
}
export var ThemableDecorationAttachmentRenderOptions;
(function (ThemableDecorationAttachmentRenderOptions) {
    function from(options) {
        if (typeof options === 'undefined') {
            return options;
        }
        return {
            contentText: options.contentText,
            contentIconPath: options.contentIconPath
                ? pathOrURIToURI(options.contentIconPath)
                : undefined,
            border: options.border,
            borderColor: options.borderColor,
            fontStyle: options.fontStyle,
            fontWeight: options.fontWeight,
            textDecoration: options.textDecoration,
            color: options.color,
            backgroundColor: options.backgroundColor,
            margin: options.margin,
            width: options.width,
            height: options.height,
        };
    }
    ThemableDecorationAttachmentRenderOptions.from = from;
})(ThemableDecorationAttachmentRenderOptions || (ThemableDecorationAttachmentRenderOptions = {}));
export var ThemableDecorationRenderOptions;
(function (ThemableDecorationRenderOptions) {
    function from(options) {
        if (typeof options === 'undefined') {
            return options;
        }
        return {
            backgroundColor: options.backgroundColor,
            outline: options.outline,
            outlineColor: options.outlineColor,
            outlineStyle: options.outlineStyle,
            outlineWidth: options.outlineWidth,
            border: options.border,
            borderColor: options.borderColor,
            borderRadius: options.borderRadius,
            borderSpacing: options.borderSpacing,
            borderStyle: options.borderStyle,
            borderWidth: options.borderWidth,
            fontStyle: options.fontStyle,
            fontWeight: options.fontWeight,
            textDecoration: options.textDecoration,
            cursor: options.cursor,
            color: options.color,
            opacity: options.opacity,
            letterSpacing: options.letterSpacing,
            gutterIconPath: options.gutterIconPath ? pathOrURIToURI(options.gutterIconPath) : undefined,
            gutterIconSize: options.gutterIconSize,
            overviewRulerColor: options.overviewRulerColor,
            before: options.before
                ? ThemableDecorationAttachmentRenderOptions.from(options.before)
                : undefined,
            after: options.after
                ? ThemableDecorationAttachmentRenderOptions.from(options.after)
                : undefined,
        };
    }
    ThemableDecorationRenderOptions.from = from;
})(ThemableDecorationRenderOptions || (ThemableDecorationRenderOptions = {}));
export var DecorationRangeBehavior;
(function (DecorationRangeBehavior) {
    function from(value) {
        if (typeof value === 'undefined') {
            return value;
        }
        switch (value) {
            case types.DecorationRangeBehavior.OpenOpen:
                return 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */;
            case types.DecorationRangeBehavior.ClosedClosed:
                return 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */;
            case types.DecorationRangeBehavior.OpenClosed:
                return 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */;
            case types.DecorationRangeBehavior.ClosedOpen:
                return 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */;
        }
    }
    DecorationRangeBehavior.from = from;
})(DecorationRangeBehavior || (DecorationRangeBehavior = {}));
export var DecorationRenderOptions;
(function (DecorationRenderOptions) {
    function from(options) {
        return {
            isWholeLine: options.isWholeLine,
            rangeBehavior: options.rangeBehavior
                ? DecorationRangeBehavior.from(options.rangeBehavior)
                : undefined,
            overviewRulerLane: options.overviewRulerLane,
            light: options.light ? ThemableDecorationRenderOptions.from(options.light) : undefined,
            dark: options.dark ? ThemableDecorationRenderOptions.from(options.dark) : undefined,
            backgroundColor: options.backgroundColor,
            outline: options.outline,
            outlineColor: options.outlineColor,
            outlineStyle: options.outlineStyle,
            outlineWidth: options.outlineWidth,
            border: options.border,
            borderColor: options.borderColor,
            borderRadius: options.borderRadius,
            borderSpacing: options.borderSpacing,
            borderStyle: options.borderStyle,
            borderWidth: options.borderWidth,
            fontStyle: options.fontStyle,
            fontWeight: options.fontWeight,
            textDecoration: options.textDecoration,
            cursor: options.cursor,
            color: options.color,
            opacity: options.opacity,
            letterSpacing: options.letterSpacing,
            gutterIconPath: options.gutterIconPath ? pathOrURIToURI(options.gutterIconPath) : undefined,
            gutterIconSize: options.gutterIconSize,
            overviewRulerColor: options.overviewRulerColor,
            before: options.before
                ? ThemableDecorationAttachmentRenderOptions.from(options.before)
                : undefined,
            after: options.after
                ? ThemableDecorationAttachmentRenderOptions.from(options.after)
                : undefined,
        };
    }
    DecorationRenderOptions.from = from;
})(DecorationRenderOptions || (DecorationRenderOptions = {}));
export var TextEdit;
(function (TextEdit) {
    function from(edit) {
        return {
            text: edit.newText,
            eol: edit.newEol && EndOfLine.from(edit.newEol),
            range: Range.from(edit.range),
        };
    }
    TextEdit.from = from;
    function to(edit) {
        const result = new types.TextEdit(Range.to(edit.range), edit.text);
        result.newEol = (typeof edit.eol === 'undefined' ? undefined : EndOfLine.to(edit.eol));
        return result;
    }
    TextEdit.to = to;
})(TextEdit || (TextEdit = {}));
export var WorkspaceEdit;
(function (WorkspaceEdit) {
    function from(value, versionInfo) {
        const result = {
            edits: [],
        };
        if (value instanceof types.WorkspaceEdit) {
            // collect all files that are to be created so that their version
            // information (in case they exist as text model already) can be ignored
            const toCreate = new ResourceSet();
            for (const entry of value._allEntries()) {
                if (entry._type === 1 /* types.FileEditType.File */ &&
                    URI.isUri(entry.to) &&
                    entry.from === undefined) {
                    toCreate.add(entry.to);
                }
            }
            for (const entry of value._allEntries()) {
                if (entry._type === 1 /* types.FileEditType.File */) {
                    let contents;
                    if (entry.options?.contents) {
                        if (ArrayBuffer.isView(entry.options.contents)) {
                            contents = {
                                type: 'base64',
                                value: encodeBase64(VSBuffer.wrap(entry.options.contents)),
                            };
                        }
                        else {
                            contents = {
                                type: 'dataTransferItem',
                                id: entry.options.contents._itemId,
                            };
                        }
                    }
                    // file operation
                    result.edits.push({
                        oldResource: entry.from,
                        newResource: entry.to,
                        options: { ...entry.options, contents },
                        metadata: entry.metadata,
                    });
                }
                else if (entry._type === 2 /* types.FileEditType.Text */) {
                    // text edits
                    result.edits.push({
                        resource: entry.uri,
                        textEdit: TextEdit.from(entry.edit),
                        versionId: !toCreate.has(entry.uri)
                            ? versionInfo?.getTextDocumentVersion(entry.uri)
                            : undefined,
                        metadata: entry.metadata,
                    });
                }
                else if (entry._type === 6 /* types.FileEditType.Snippet */) {
                    result.edits.push({
                        resource: entry.uri,
                        textEdit: {
                            range: Range.from(entry.range),
                            text: entry.edit.value,
                            insertAsSnippet: true,
                            keepWhitespace: entry.keepWhitespace,
                        },
                        versionId: !toCreate.has(entry.uri)
                            ? versionInfo?.getTextDocumentVersion(entry.uri)
                            : undefined,
                        metadata: entry.metadata,
                    });
                }
                else if (entry._type === 3 /* types.FileEditType.Cell */) {
                    // cell edit
                    result.edits.push({
                        metadata: entry.metadata,
                        resource: entry.uri,
                        cellEdit: entry.edit,
                        notebookVersionId: versionInfo?.getNotebookDocumentVersion(entry.uri),
                    });
                }
                else if (entry._type === 5 /* types.FileEditType.CellReplace */) {
                    // cell replace
                    result.edits.push({
                        metadata: entry.metadata,
                        resource: entry.uri,
                        notebookVersionId: versionInfo?.getNotebookDocumentVersion(entry.uri),
                        cellEdit: {
                            editType: 1 /* notebooks.CellEditType.Replace */,
                            index: entry.index,
                            count: entry.count,
                            cells: entry.cells.map(NotebookCellData.from),
                        },
                    });
                }
            }
        }
        return result;
    }
    WorkspaceEdit.from = from;
    function to(value) {
        const result = new types.WorkspaceEdit();
        const edits = new ResourceMap();
        for (const edit of value.edits) {
            if (edit.textEdit) {
                const item = edit;
                const uri = URI.revive(item.resource);
                const range = Range.to(item.textEdit.range);
                const text = item.textEdit.text;
                const isSnippet = item.textEdit.insertAsSnippet;
                let editOrSnippetTest;
                if (isSnippet) {
                    editOrSnippetTest = types.SnippetTextEdit.replace(range, new types.SnippetString(text));
                }
                else {
                    editOrSnippetTest = types.TextEdit.replace(range, text);
                }
                const array = edits.get(uri);
                if (!array) {
                    edits.set(uri, [editOrSnippetTest]);
                }
                else {
                    array.push(editOrSnippetTest);
                }
            }
            else {
                result.renameFile(URI.revive(edit.oldResource), URI.revive(edit.newResource), edit.options);
            }
        }
        for (const [uri, array] of edits) {
            result.set(uri, array);
        }
        return result;
    }
    WorkspaceEdit.to = to;
})(WorkspaceEdit || (WorkspaceEdit = {}));
export var SymbolKind;
(function (SymbolKind) {
    const _fromMapping = Object.create(null);
    _fromMapping[types.SymbolKind.File] = 0 /* languages.SymbolKind.File */;
    _fromMapping[types.SymbolKind.Module] = 1 /* languages.SymbolKind.Module */;
    _fromMapping[types.SymbolKind.Namespace] = 2 /* languages.SymbolKind.Namespace */;
    _fromMapping[types.SymbolKind.Package] = 3 /* languages.SymbolKind.Package */;
    _fromMapping[types.SymbolKind.Class] = 4 /* languages.SymbolKind.Class */;
    _fromMapping[types.SymbolKind.Method] = 5 /* languages.SymbolKind.Method */;
    _fromMapping[types.SymbolKind.Property] = 6 /* languages.SymbolKind.Property */;
    _fromMapping[types.SymbolKind.Field] = 7 /* languages.SymbolKind.Field */;
    _fromMapping[types.SymbolKind.Constructor] = 8 /* languages.SymbolKind.Constructor */;
    _fromMapping[types.SymbolKind.Enum] = 9 /* languages.SymbolKind.Enum */;
    _fromMapping[types.SymbolKind.Interface] = 10 /* languages.SymbolKind.Interface */;
    _fromMapping[types.SymbolKind.Function] = 11 /* languages.SymbolKind.Function */;
    _fromMapping[types.SymbolKind.Variable] = 12 /* languages.SymbolKind.Variable */;
    _fromMapping[types.SymbolKind.Constant] = 13 /* languages.SymbolKind.Constant */;
    _fromMapping[types.SymbolKind.String] = 14 /* languages.SymbolKind.String */;
    _fromMapping[types.SymbolKind.Number] = 15 /* languages.SymbolKind.Number */;
    _fromMapping[types.SymbolKind.Boolean] = 16 /* languages.SymbolKind.Boolean */;
    _fromMapping[types.SymbolKind.Array] = 17 /* languages.SymbolKind.Array */;
    _fromMapping[types.SymbolKind.Object] = 18 /* languages.SymbolKind.Object */;
    _fromMapping[types.SymbolKind.Key] = 19 /* languages.SymbolKind.Key */;
    _fromMapping[types.SymbolKind.Null] = 20 /* languages.SymbolKind.Null */;
    _fromMapping[types.SymbolKind.EnumMember] = 21 /* languages.SymbolKind.EnumMember */;
    _fromMapping[types.SymbolKind.Struct] = 22 /* languages.SymbolKind.Struct */;
    _fromMapping[types.SymbolKind.Event] = 23 /* languages.SymbolKind.Event */;
    _fromMapping[types.SymbolKind.Operator] = 24 /* languages.SymbolKind.Operator */;
    _fromMapping[types.SymbolKind.TypeParameter] = 25 /* languages.SymbolKind.TypeParameter */;
    function from(kind) {
        return typeof _fromMapping[kind] === 'number'
            ? _fromMapping[kind]
            : 6 /* languages.SymbolKind.Property */;
    }
    SymbolKind.from = from;
    function to(kind) {
        for (const k in _fromMapping) {
            if (_fromMapping[k] === kind) {
                return Number(k);
            }
        }
        return types.SymbolKind.Property;
    }
    SymbolKind.to = to;
})(SymbolKind || (SymbolKind = {}));
export var SymbolTag;
(function (SymbolTag) {
    function from(kind) {
        switch (kind) {
            case types.SymbolTag.Deprecated:
                return 1 /* languages.SymbolTag.Deprecated */;
        }
    }
    SymbolTag.from = from;
    function to(kind) {
        switch (kind) {
            case 1 /* languages.SymbolTag.Deprecated */:
                return types.SymbolTag.Deprecated;
        }
    }
    SymbolTag.to = to;
})(SymbolTag || (SymbolTag = {}));
export var WorkspaceSymbol;
(function (WorkspaceSymbol) {
    function from(info) {
        return {
            name: info.name,
            kind: SymbolKind.from(info.kind),
            tags: info.tags && info.tags.map(SymbolTag.from),
            containerName: info.containerName,
            location: location.from(info.location),
        };
    }
    WorkspaceSymbol.from = from;
    function to(info) {
        const result = new types.SymbolInformation(info.name, SymbolKind.to(info.kind), info.containerName, location.to(info.location));
        result.tags = info.tags && info.tags.map(SymbolTag.to);
        return result;
    }
    WorkspaceSymbol.to = to;
})(WorkspaceSymbol || (WorkspaceSymbol = {}));
export var DocumentSymbol;
(function (DocumentSymbol) {
    function from(info) {
        const result = {
            name: info.name || '!!MISSING: name!!',
            detail: info.detail,
            range: Range.from(info.range),
            selectionRange: Range.from(info.selectionRange),
            kind: SymbolKind.from(info.kind),
            tags: info.tags?.map(SymbolTag.from) ?? [],
        };
        if (info.children) {
            result.children = info.children.map(from);
        }
        return result;
    }
    DocumentSymbol.from = from;
    function to(info) {
        const result = new types.DocumentSymbol(info.name, info.detail, SymbolKind.to(info.kind), Range.to(info.range), Range.to(info.selectionRange));
        if (isNonEmptyArray(info.tags)) {
            result.tags = info.tags.map(SymbolTag.to);
        }
        if (info.children) {
            result.children = info.children.map(to);
        }
        return result;
    }
    DocumentSymbol.to = to;
})(DocumentSymbol || (DocumentSymbol = {}));
export var CallHierarchyItem;
(function (CallHierarchyItem) {
    function to(item) {
        const result = new types.CallHierarchyItem(SymbolKind.to(item.kind), item.name, item.detail || '', URI.revive(item.uri), Range.to(item.range), Range.to(item.selectionRange));
        result._sessionId = item._sessionId;
        result._itemId = item._itemId;
        return result;
    }
    CallHierarchyItem.to = to;
    function from(item, sessionId, itemId) {
        sessionId = sessionId ?? item._sessionId;
        itemId = itemId ?? item._itemId;
        if (sessionId === undefined || itemId === undefined) {
            throw new Error('invalid item');
        }
        return {
            _sessionId: sessionId,
            _itemId: itemId,
            name: item.name,
            detail: item.detail,
            kind: SymbolKind.from(item.kind),
            uri: item.uri,
            range: Range.from(item.range),
            selectionRange: Range.from(item.selectionRange),
            tags: item.tags?.map(SymbolTag.from),
        };
    }
    CallHierarchyItem.from = from;
})(CallHierarchyItem || (CallHierarchyItem = {}));
export var CallHierarchyIncomingCall;
(function (CallHierarchyIncomingCall) {
    function to(item) {
        return new types.CallHierarchyIncomingCall(CallHierarchyItem.to(item.from), item.fromRanges.map((r) => Range.to(r)));
    }
    CallHierarchyIncomingCall.to = to;
})(CallHierarchyIncomingCall || (CallHierarchyIncomingCall = {}));
export var CallHierarchyOutgoingCall;
(function (CallHierarchyOutgoingCall) {
    function to(item) {
        return new types.CallHierarchyOutgoingCall(CallHierarchyItem.to(item.to), item.fromRanges.map((r) => Range.to(r)));
    }
    CallHierarchyOutgoingCall.to = to;
})(CallHierarchyOutgoingCall || (CallHierarchyOutgoingCall = {}));
export var location;
(function (location) {
    function from(value) {
        return {
            range: value.range && Range.from(value.range),
            uri: value.uri,
        };
    }
    location.from = from;
    function to(value) {
        return new types.Location(URI.revive(value.uri), Range.to(value.range));
    }
    location.to = to;
})(location || (location = {}));
export var DefinitionLink;
(function (DefinitionLink) {
    function from(value) {
        const definitionLink = value;
        const location = value;
        return {
            originSelectionRange: definitionLink.originSelectionRange
                ? Range.from(definitionLink.originSelectionRange)
                : undefined,
            uri: definitionLink.targetUri ? definitionLink.targetUri : location.uri,
            range: Range.from(definitionLink.targetRange ? definitionLink.targetRange : location.range),
            targetSelectionRange: definitionLink.targetSelectionRange
                ? Range.from(definitionLink.targetSelectionRange)
                : undefined,
        };
    }
    DefinitionLink.from = from;
    function to(value) {
        return {
            targetUri: URI.revive(value.uri),
            targetRange: Range.to(value.range),
            targetSelectionRange: value.targetSelectionRange
                ? Range.to(value.targetSelectionRange)
                : undefined,
            originSelectionRange: value.originSelectionRange
                ? Range.to(value.originSelectionRange)
                : undefined,
        };
    }
    DefinitionLink.to = to;
})(DefinitionLink || (DefinitionLink = {}));
export var Hover;
(function (Hover) {
    function from(hover) {
        const convertedHover = {
            range: Range.from(hover.range),
            contents: MarkdownString.fromMany(hover.contents),
            canIncreaseVerbosity: hover.canIncreaseVerbosity,
            canDecreaseVerbosity: hover.canDecreaseVerbosity,
        };
        return convertedHover;
    }
    Hover.from = from;
    function to(info) {
        const contents = info.contents.map(MarkdownString.to);
        const range = Range.to(info.range);
        const canIncreaseVerbosity = info.canIncreaseVerbosity;
        const canDecreaseVerbosity = info.canDecreaseVerbosity;
        return new types.VerboseHover(contents, range, canIncreaseVerbosity, canDecreaseVerbosity);
    }
    Hover.to = to;
})(Hover || (Hover = {}));
export var EvaluatableExpression;
(function (EvaluatableExpression) {
    function from(expression) {
        return {
            range: Range.from(expression.range),
            expression: expression.expression,
        };
    }
    EvaluatableExpression.from = from;
    function to(info) {
        return new types.EvaluatableExpression(Range.to(info.range), info.expression);
    }
    EvaluatableExpression.to = to;
})(EvaluatableExpression || (EvaluatableExpression = {}));
export var InlineValue;
(function (InlineValue) {
    function from(inlineValue) {
        if (inlineValue instanceof types.InlineValueText) {
            return {
                type: 'text',
                range: Range.from(inlineValue.range),
                text: inlineValue.text,
            };
        }
        else if (inlineValue instanceof types.InlineValueVariableLookup) {
            return {
                type: 'variable',
                range: Range.from(inlineValue.range),
                variableName: inlineValue.variableName,
                caseSensitiveLookup: inlineValue.caseSensitiveLookup,
            };
        }
        else if (inlineValue instanceof types.InlineValueEvaluatableExpression) {
            return {
                type: 'expression',
                range: Range.from(inlineValue.range),
                expression: inlineValue.expression,
            };
        }
        else {
            throw new Error(`Unknown 'InlineValue' type`);
        }
    }
    InlineValue.from = from;
    function to(inlineValue) {
        switch (inlineValue.type) {
            case 'text':
                return {
                    range: Range.to(inlineValue.range),
                    text: inlineValue.text,
                };
            case 'variable':
                return {
                    range: Range.to(inlineValue.range),
                    variableName: inlineValue.variableName,
                    caseSensitiveLookup: inlineValue.caseSensitiveLookup,
                };
            case 'expression':
                return {
                    range: Range.to(inlineValue.range),
                    expression: inlineValue.expression,
                };
        }
    }
    InlineValue.to = to;
})(InlineValue || (InlineValue = {}));
export var InlineValueContext;
(function (InlineValueContext) {
    function from(inlineValueContext) {
        return {
            frameId: inlineValueContext.frameId,
            stoppedLocation: Range.from(inlineValueContext.stoppedLocation),
        };
    }
    InlineValueContext.from = from;
    function to(inlineValueContext) {
        return new types.InlineValueContext(inlineValueContext.frameId, Range.to(inlineValueContext.stoppedLocation));
    }
    InlineValueContext.to = to;
})(InlineValueContext || (InlineValueContext = {}));
export var DocumentHighlight;
(function (DocumentHighlight) {
    function from(documentHighlight) {
        return {
            range: Range.from(documentHighlight.range),
            kind: documentHighlight.kind,
        };
    }
    DocumentHighlight.from = from;
    function to(occurrence) {
        return new types.DocumentHighlight(Range.to(occurrence.range), occurrence.kind);
    }
    DocumentHighlight.to = to;
})(DocumentHighlight || (DocumentHighlight = {}));
export var MultiDocumentHighlight;
(function (MultiDocumentHighlight) {
    function from(multiDocumentHighlight) {
        return {
            uri: multiDocumentHighlight.uri,
            highlights: multiDocumentHighlight.highlights.map(DocumentHighlight.from),
        };
    }
    MultiDocumentHighlight.from = from;
    function to(multiDocumentHighlight) {
        return new types.MultiDocumentHighlight(URI.revive(multiDocumentHighlight.uri), multiDocumentHighlight.highlights.map(DocumentHighlight.to));
    }
    MultiDocumentHighlight.to = to;
})(MultiDocumentHighlight || (MultiDocumentHighlight = {}));
export var CompletionTriggerKind;
(function (CompletionTriggerKind) {
    function to(kind) {
        switch (kind) {
            case 1 /* languages.CompletionTriggerKind.TriggerCharacter */:
                return types.CompletionTriggerKind.TriggerCharacter;
            case 2 /* languages.CompletionTriggerKind.TriggerForIncompleteCompletions */:
                return types.CompletionTriggerKind.TriggerForIncompleteCompletions;
            case 0 /* languages.CompletionTriggerKind.Invoke */:
            default:
                return types.CompletionTriggerKind.Invoke;
        }
    }
    CompletionTriggerKind.to = to;
})(CompletionTriggerKind || (CompletionTriggerKind = {}));
export var CompletionContext;
(function (CompletionContext) {
    function to(context) {
        return {
            triggerKind: CompletionTriggerKind.to(context.triggerKind),
            triggerCharacter: context.triggerCharacter,
        };
    }
    CompletionContext.to = to;
})(CompletionContext || (CompletionContext = {}));
export var CompletionItemTag;
(function (CompletionItemTag) {
    function from(kind) {
        switch (kind) {
            case types.CompletionItemTag.Deprecated:
                return 1 /* languages.CompletionItemTag.Deprecated */;
        }
    }
    CompletionItemTag.from = from;
    function to(kind) {
        switch (kind) {
            case 1 /* languages.CompletionItemTag.Deprecated */:
                return types.CompletionItemTag.Deprecated;
        }
    }
    CompletionItemTag.to = to;
})(CompletionItemTag || (CompletionItemTag = {}));
export var CompletionItemKind;
(function (CompletionItemKind) {
    const _from = new Map([
        [types.CompletionItemKind.Method, 0 /* languages.CompletionItemKind.Method */],
        [types.CompletionItemKind.Function, 1 /* languages.CompletionItemKind.Function */],
        [types.CompletionItemKind.Constructor, 2 /* languages.CompletionItemKind.Constructor */],
        [types.CompletionItemKind.Field, 3 /* languages.CompletionItemKind.Field */],
        [types.CompletionItemKind.Variable, 4 /* languages.CompletionItemKind.Variable */],
        [types.CompletionItemKind.Class, 5 /* languages.CompletionItemKind.Class */],
        [types.CompletionItemKind.Interface, 7 /* languages.CompletionItemKind.Interface */],
        [types.CompletionItemKind.Struct, 6 /* languages.CompletionItemKind.Struct */],
        [types.CompletionItemKind.Module, 8 /* languages.CompletionItemKind.Module */],
        [types.CompletionItemKind.Property, 9 /* languages.CompletionItemKind.Property */],
        [types.CompletionItemKind.Unit, 12 /* languages.CompletionItemKind.Unit */],
        [types.CompletionItemKind.Value, 13 /* languages.CompletionItemKind.Value */],
        [types.CompletionItemKind.Constant, 14 /* languages.CompletionItemKind.Constant */],
        [types.CompletionItemKind.Enum, 15 /* languages.CompletionItemKind.Enum */],
        [types.CompletionItemKind.EnumMember, 16 /* languages.CompletionItemKind.EnumMember */],
        [types.CompletionItemKind.Keyword, 17 /* languages.CompletionItemKind.Keyword */],
        [types.CompletionItemKind.Snippet, 27 /* languages.CompletionItemKind.Snippet */],
        [types.CompletionItemKind.Text, 18 /* languages.CompletionItemKind.Text */],
        [types.CompletionItemKind.Color, 19 /* languages.CompletionItemKind.Color */],
        [types.CompletionItemKind.File, 20 /* languages.CompletionItemKind.File */],
        [types.CompletionItemKind.Reference, 21 /* languages.CompletionItemKind.Reference */],
        [types.CompletionItemKind.Folder, 23 /* languages.CompletionItemKind.Folder */],
        [types.CompletionItemKind.Event, 10 /* languages.CompletionItemKind.Event */],
        [types.CompletionItemKind.Operator, 11 /* languages.CompletionItemKind.Operator */],
        [types.CompletionItemKind.TypeParameter, 24 /* languages.CompletionItemKind.TypeParameter */],
        [types.CompletionItemKind.Issue, 26 /* languages.CompletionItemKind.Issue */],
        [types.CompletionItemKind.User, 25 /* languages.CompletionItemKind.User */],
    ]);
    function from(kind) {
        return _from.get(kind) ?? 9 /* languages.CompletionItemKind.Property */;
    }
    CompletionItemKind.from = from;
    const _to = new Map([
        [0 /* languages.CompletionItemKind.Method */, types.CompletionItemKind.Method],
        [1 /* languages.CompletionItemKind.Function */, types.CompletionItemKind.Function],
        [2 /* languages.CompletionItemKind.Constructor */, types.CompletionItemKind.Constructor],
        [3 /* languages.CompletionItemKind.Field */, types.CompletionItemKind.Field],
        [4 /* languages.CompletionItemKind.Variable */, types.CompletionItemKind.Variable],
        [5 /* languages.CompletionItemKind.Class */, types.CompletionItemKind.Class],
        [7 /* languages.CompletionItemKind.Interface */, types.CompletionItemKind.Interface],
        [6 /* languages.CompletionItemKind.Struct */, types.CompletionItemKind.Struct],
        [8 /* languages.CompletionItemKind.Module */, types.CompletionItemKind.Module],
        [9 /* languages.CompletionItemKind.Property */, types.CompletionItemKind.Property],
        [12 /* languages.CompletionItemKind.Unit */, types.CompletionItemKind.Unit],
        [13 /* languages.CompletionItemKind.Value */, types.CompletionItemKind.Value],
        [14 /* languages.CompletionItemKind.Constant */, types.CompletionItemKind.Constant],
        [15 /* languages.CompletionItemKind.Enum */, types.CompletionItemKind.Enum],
        [16 /* languages.CompletionItemKind.EnumMember */, types.CompletionItemKind.EnumMember],
        [17 /* languages.CompletionItemKind.Keyword */, types.CompletionItemKind.Keyword],
        [27 /* languages.CompletionItemKind.Snippet */, types.CompletionItemKind.Snippet],
        [18 /* languages.CompletionItemKind.Text */, types.CompletionItemKind.Text],
        [19 /* languages.CompletionItemKind.Color */, types.CompletionItemKind.Color],
        [20 /* languages.CompletionItemKind.File */, types.CompletionItemKind.File],
        [21 /* languages.CompletionItemKind.Reference */, types.CompletionItemKind.Reference],
        [23 /* languages.CompletionItemKind.Folder */, types.CompletionItemKind.Folder],
        [10 /* languages.CompletionItemKind.Event */, types.CompletionItemKind.Event],
        [11 /* languages.CompletionItemKind.Operator */, types.CompletionItemKind.Operator],
        [24 /* languages.CompletionItemKind.TypeParameter */, types.CompletionItemKind.TypeParameter],
        [25 /* languages.CompletionItemKind.User */, types.CompletionItemKind.User],
        [26 /* languages.CompletionItemKind.Issue */, types.CompletionItemKind.Issue],
    ]);
    function to(kind) {
        return _to.get(kind) ?? types.CompletionItemKind.Property;
    }
    CompletionItemKind.to = to;
})(CompletionItemKind || (CompletionItemKind = {}));
export var CompletionItem;
(function (CompletionItem) {
    function to(suggestion, converter) {
        const result = new types.CompletionItem(suggestion.label);
        result.insertText = suggestion.insertText;
        result.kind = CompletionItemKind.to(suggestion.kind);
        result.tags = suggestion.tags?.map(CompletionItemTag.to);
        result.detail = suggestion.detail;
        result.documentation = htmlContent.isMarkdownString(suggestion.documentation)
            ? MarkdownString.to(suggestion.documentation)
            : suggestion.documentation;
        result.sortText = suggestion.sortText;
        result.filterText = suggestion.filterText;
        result.preselect = suggestion.preselect;
        result.commitCharacters = suggestion.commitCharacters;
        // range
        if (editorRange.Range.isIRange(suggestion.range)) {
            result.range = Range.to(suggestion.range);
        }
        else if (typeof suggestion.range === 'object') {
            result.range = {
                inserting: Range.to(suggestion.range.insert),
                replacing: Range.to(suggestion.range.replace),
            };
        }
        result.keepWhitespace =
            typeof suggestion.insertTextRules === 'undefined'
                ? false
                : Boolean(suggestion.insertTextRules & 1 /* languages.CompletionItemInsertTextRule.KeepWhitespace */);
        // 'insertText'-logic
        if (typeof suggestion.insertTextRules !== 'undefined' &&
            suggestion.insertTextRules & 4 /* languages.CompletionItemInsertTextRule.InsertAsSnippet */) {
            result.insertText = new types.SnippetString(suggestion.insertText);
        }
        else {
            result.insertText = suggestion.insertText;
            result.textEdit =
                result.range instanceof types.Range
                    ? new types.TextEdit(result.range, result.insertText)
                    : undefined;
        }
        if (suggestion.additionalTextEdits && suggestion.additionalTextEdits.length > 0) {
            result.additionalTextEdits = suggestion.additionalTextEdits.map((e) => TextEdit.to(e));
        }
        result.command =
            converter && suggestion.command ? converter.fromInternal(suggestion.command) : undefined;
        return result;
    }
    CompletionItem.to = to;
})(CompletionItem || (CompletionItem = {}));
export var ParameterInformation;
(function (ParameterInformation) {
    function from(info) {
        if (typeof info.label !== 'string' && !Array.isArray(info.label)) {
            throw new TypeError('Invalid label');
        }
        return {
            label: info.label,
            documentation: MarkdownString.fromStrict(info.documentation),
        };
    }
    ParameterInformation.from = from;
    function to(info) {
        return {
            label: info.label,
            documentation: htmlContent.isMarkdownString(info.documentation)
                ? MarkdownString.to(info.documentation)
                : info.documentation,
        };
    }
    ParameterInformation.to = to;
})(ParameterInformation || (ParameterInformation = {}));
export var SignatureInformation;
(function (SignatureInformation) {
    function from(info) {
        return {
            label: info.label,
            documentation: MarkdownString.fromStrict(info.documentation),
            parameters: Array.isArray(info.parameters)
                ? info.parameters.map(ParameterInformation.from)
                : [],
            activeParameter: info.activeParameter,
        };
    }
    SignatureInformation.from = from;
    function to(info) {
        return {
            label: info.label,
            documentation: htmlContent.isMarkdownString(info.documentation)
                ? MarkdownString.to(info.documentation)
                : info.documentation,
            parameters: Array.isArray(info.parameters)
                ? info.parameters.map(ParameterInformation.to)
                : [],
            activeParameter: info.activeParameter,
        };
    }
    SignatureInformation.to = to;
})(SignatureInformation || (SignatureInformation = {}));
export var SignatureHelp;
(function (SignatureHelp) {
    function from(help) {
        return {
            activeSignature: help.activeSignature,
            activeParameter: help.activeParameter,
            signatures: Array.isArray(help.signatures)
                ? help.signatures.map(SignatureInformation.from)
                : [],
        };
    }
    SignatureHelp.from = from;
    function to(help) {
        return {
            activeSignature: help.activeSignature,
            activeParameter: help.activeParameter,
            signatures: Array.isArray(help.signatures)
                ? help.signatures.map(SignatureInformation.to)
                : [],
        };
    }
    SignatureHelp.to = to;
})(SignatureHelp || (SignatureHelp = {}));
export var InlayHint;
(function (InlayHint) {
    function to(converter, hint) {
        const res = new types.InlayHint(Position.to(hint.position), typeof hint.label === 'string'
            ? hint.label
            : hint.label.map(InlayHintLabelPart.to.bind(undefined, converter)), hint.kind && InlayHintKind.to(hint.kind));
        res.textEdits = hint.textEdits && hint.textEdits.map(TextEdit.to);
        res.tooltip = htmlContent.isMarkdownString(hint.tooltip)
            ? MarkdownString.to(hint.tooltip)
            : hint.tooltip;
        res.paddingLeft = hint.paddingLeft;
        res.paddingRight = hint.paddingRight;
        return res;
    }
    InlayHint.to = to;
})(InlayHint || (InlayHint = {}));
export var InlayHintLabelPart;
(function (InlayHintLabelPart) {
    function to(converter, part) {
        const result = new types.InlayHintLabelPart(part.label);
        result.tooltip = htmlContent.isMarkdownString(part.tooltip)
            ? MarkdownString.to(part.tooltip)
            : part.tooltip;
        if (languages.Command.is(part.command)) {
            result.command = converter.fromInternal(part.command);
        }
        if (part.location) {
            result.location = location.to(part.location);
        }
        return result;
    }
    InlayHintLabelPart.to = to;
})(InlayHintLabelPart || (InlayHintLabelPart = {}));
export var InlayHintKind;
(function (InlayHintKind) {
    function from(kind) {
        return kind;
    }
    InlayHintKind.from = from;
    function to(kind) {
        return kind;
    }
    InlayHintKind.to = to;
})(InlayHintKind || (InlayHintKind = {}));
export var DocumentLink;
(function (DocumentLink) {
    function from(link) {
        return {
            range: Range.from(link.range),
            url: link.target,
            tooltip: link.tooltip,
        };
    }
    DocumentLink.from = from;
    function to(link) {
        let target = undefined;
        if (link.url) {
            try {
                target = typeof link.url === 'string' ? URI.parse(link.url, true) : URI.revive(link.url);
            }
            catch (err) {
                // ignore
            }
        }
        const result = new types.DocumentLink(Range.to(link.range), target);
        result.tooltip = link.tooltip;
        return result;
    }
    DocumentLink.to = to;
})(DocumentLink || (DocumentLink = {}));
export var ColorPresentation;
(function (ColorPresentation) {
    function to(colorPresentation) {
        const cp = new types.ColorPresentation(colorPresentation.label);
        if (colorPresentation.textEdit) {
            cp.textEdit = TextEdit.to(colorPresentation.textEdit);
        }
        if (colorPresentation.additionalTextEdits) {
            cp.additionalTextEdits = colorPresentation.additionalTextEdits.map((value) => TextEdit.to(value));
        }
        return cp;
    }
    ColorPresentation.to = to;
    function from(colorPresentation) {
        return {
            label: colorPresentation.label,
            textEdit: colorPresentation.textEdit ? TextEdit.from(colorPresentation.textEdit) : undefined,
            additionalTextEdits: colorPresentation.additionalTextEdits
                ? colorPresentation.additionalTextEdits.map((value) => TextEdit.from(value))
                : undefined,
        };
    }
    ColorPresentation.from = from;
})(ColorPresentation || (ColorPresentation = {}));
export var Color;
(function (Color) {
    function to(c) {
        return new types.Color(c[0], c[1], c[2], c[3]);
    }
    Color.to = to;
    function from(color) {
        return [color.red, color.green, color.blue, color.alpha];
    }
    Color.from = from;
})(Color || (Color = {}));
export var SelectionRange;
(function (SelectionRange) {
    function from(obj) {
        return { range: Range.from(obj.range) };
    }
    SelectionRange.from = from;
    function to(obj) {
        return new types.SelectionRange(Range.to(obj.range));
    }
    SelectionRange.to = to;
})(SelectionRange || (SelectionRange = {}));
export var TextDocumentSaveReason;
(function (TextDocumentSaveReason) {
    function to(reason) {
        switch (reason) {
            case 2 /* SaveReason.AUTO */:
                return types.TextDocumentSaveReason.AfterDelay;
            case 1 /* SaveReason.EXPLICIT */:
                return types.TextDocumentSaveReason.Manual;
            case 3 /* SaveReason.FOCUS_CHANGE */:
            case 4 /* SaveReason.WINDOW_CHANGE */:
                return types.TextDocumentSaveReason.FocusOut;
        }
    }
    TextDocumentSaveReason.to = to;
})(TextDocumentSaveReason || (TextDocumentSaveReason = {}));
export var TextEditorLineNumbersStyle;
(function (TextEditorLineNumbersStyle) {
    function from(style) {
        switch (style) {
            case types.TextEditorLineNumbersStyle.Off:
                return 0 /* RenderLineNumbersType.Off */;
            case types.TextEditorLineNumbersStyle.Relative:
                return 2 /* RenderLineNumbersType.Relative */;
            case types.TextEditorLineNumbersStyle.Interval:
                return 3 /* RenderLineNumbersType.Interval */;
            case types.TextEditorLineNumbersStyle.On:
            default:
                return 1 /* RenderLineNumbersType.On */;
        }
    }
    TextEditorLineNumbersStyle.from = from;
    function to(style) {
        switch (style) {
            case 0 /* RenderLineNumbersType.Off */:
                return types.TextEditorLineNumbersStyle.Off;
            case 2 /* RenderLineNumbersType.Relative */:
                return types.TextEditorLineNumbersStyle.Relative;
            case 3 /* RenderLineNumbersType.Interval */:
                return types.TextEditorLineNumbersStyle.Interval;
            case 1 /* RenderLineNumbersType.On */:
            default:
                return types.TextEditorLineNumbersStyle.On;
        }
    }
    TextEditorLineNumbersStyle.to = to;
})(TextEditorLineNumbersStyle || (TextEditorLineNumbersStyle = {}));
export var EndOfLine;
(function (EndOfLine) {
    function from(eol) {
        if (eol === types.EndOfLine.CRLF) {
            return 1 /* EndOfLineSequence.CRLF */;
        }
        else if (eol === types.EndOfLine.LF) {
            return 0 /* EndOfLineSequence.LF */;
        }
        return undefined;
    }
    EndOfLine.from = from;
    function to(eol) {
        if (eol === 1 /* EndOfLineSequence.CRLF */) {
            return types.EndOfLine.CRLF;
        }
        else if (eol === 0 /* EndOfLineSequence.LF */) {
            return types.EndOfLine.LF;
        }
        return undefined;
    }
    EndOfLine.to = to;
})(EndOfLine || (EndOfLine = {}));
export var ProgressLocation;
(function (ProgressLocation) {
    function from(loc) {
        if (typeof loc === 'object') {
            return loc.viewId;
        }
        switch (loc) {
            case types.ProgressLocation.SourceControl:
                return 3 /* MainProgressLocation.Scm */;
            case types.ProgressLocation.Window:
                return 10 /* MainProgressLocation.Window */;
            case types.ProgressLocation.Notification:
                return 15 /* MainProgressLocation.Notification */;
        }
        throw new Error(`Unknown 'ProgressLocation'`);
    }
    ProgressLocation.from = from;
})(ProgressLocation || (ProgressLocation = {}));
export var FoldingRange;
(function (FoldingRange) {
    function from(r) {
        const range = { start: r.start + 1, end: r.end + 1 };
        if (r.kind) {
            range.kind = FoldingRangeKind.from(r.kind);
        }
        return range;
    }
    FoldingRange.from = from;
    function to(r) {
        const range = { start: r.start - 1, end: r.end - 1 };
        if (r.kind) {
            range.kind = FoldingRangeKind.to(r.kind);
        }
        return range;
    }
    FoldingRange.to = to;
})(FoldingRange || (FoldingRange = {}));
export var FoldingRangeKind;
(function (FoldingRangeKind) {
    function from(kind) {
        if (kind) {
            switch (kind) {
                case types.FoldingRangeKind.Comment:
                    return languages.FoldingRangeKind.Comment;
                case types.FoldingRangeKind.Imports:
                    return languages.FoldingRangeKind.Imports;
                case types.FoldingRangeKind.Region:
                    return languages.FoldingRangeKind.Region;
            }
        }
        return undefined;
    }
    FoldingRangeKind.from = from;
    function to(kind) {
        if (kind) {
            switch (kind.value) {
                case languages.FoldingRangeKind.Comment.value:
                    return types.FoldingRangeKind.Comment;
                case languages.FoldingRangeKind.Imports.value:
                    return types.FoldingRangeKind.Imports;
                case languages.FoldingRangeKind.Region.value:
                    return types.FoldingRangeKind.Region;
            }
        }
        return undefined;
    }
    FoldingRangeKind.to = to;
})(FoldingRangeKind || (FoldingRangeKind = {}));
export var TextEditorOpenOptions;
(function (TextEditorOpenOptions) {
    function from(options) {
        if (options) {
            return {
                pinned: typeof options.preview === 'boolean' ? !options.preview : undefined,
                inactive: options.background,
                preserveFocus: options.preserveFocus,
                selection: typeof options.selection === 'object' ? Range.from(options.selection) : undefined,
                override: typeof options.override === 'boolean' ? DEFAULT_EDITOR_ASSOCIATION.id : undefined,
            };
        }
        return undefined;
    }
    TextEditorOpenOptions.from = from;
})(TextEditorOpenOptions || (TextEditorOpenOptions = {}));
export var GlobPattern;
(function (GlobPattern) {
    function from(pattern) {
        if (pattern instanceof types.RelativePattern) {
            return pattern.toJSON();
        }
        if (typeof pattern === 'string') {
            return pattern;
        }
        // This is slightly bogus because we declare this method to accept
        // `vscode.GlobPattern` which can be `vscode.RelativePattern` class,
        // but given we cannot enforce classes from our vscode.d.ts, we have
        // to probe for objects too
        // Refs: https://github.com/microsoft/vscode/issues/140771
        if (isRelativePatternShape(pattern) || isLegacyRelativePatternShape(pattern)) {
            return new types.RelativePattern(pattern.baseUri ?? pattern.base, pattern.pattern).toJSON();
        }
        return pattern; // preserve `undefined` and `null`
    }
    GlobPattern.from = from;
    function isRelativePatternShape(obj) {
        const rp = obj;
        if (!rp) {
            return false;
        }
        return URI.isUri(rp.baseUri) && typeof rp.pattern === 'string';
    }
    function isLegacyRelativePatternShape(obj) {
        // Before 1.64.x, `RelativePattern` did not have any `baseUri: Uri`
        // property. To preserve backwards compatibility with older extensions
        // we allow this old format when creating the `vscode.RelativePattern`.
        const rp = obj;
        if (!rp) {
            return false;
        }
        return typeof rp.base === 'string' && typeof rp.pattern === 'string';
    }
    function to(pattern) {
        if (typeof pattern === 'string') {
            return pattern;
        }
        return new types.RelativePattern(URI.revive(pattern.baseUri), pattern.pattern);
    }
    GlobPattern.to = to;
})(GlobPattern || (GlobPattern = {}));
export var LanguageSelector;
(function (LanguageSelector) {
    function from(selector) {
        if (!selector) {
            return undefined;
        }
        else if (Array.isArray(selector)) {
            return selector.map(from);
        }
        else if (typeof selector === 'string') {
            return selector;
        }
        else {
            const filter = selector; // TODO: microsoft/TypeScript#42768
            return {
                language: filter.language,
                scheme: filter.scheme,
                pattern: GlobPattern.from(filter.pattern) ?? undefined,
                exclusive: filter.exclusive,
                notebookType: filter.notebookType,
            };
        }
    }
    LanguageSelector.from = from;
})(LanguageSelector || (LanguageSelector = {}));
export var NotebookRange;
(function (NotebookRange) {
    function from(range) {
        return { start: range.start, end: range.end };
    }
    NotebookRange.from = from;
    function to(range) {
        return new types.NotebookRange(range.start, range.end);
    }
    NotebookRange.to = to;
})(NotebookRange || (NotebookRange = {}));
export var NotebookCellExecutionSummary;
(function (NotebookCellExecutionSummary) {
    function to(data) {
        return {
            timing: typeof data.runStartTime === 'number' && typeof data.runEndTime === 'number'
                ? { startTime: data.runStartTime, endTime: data.runEndTime }
                : undefined,
            executionOrder: data.executionOrder,
            success: data.lastRunSuccess,
        };
    }
    NotebookCellExecutionSummary.to = to;
    function from(data) {
        return {
            lastRunSuccess: data.success,
            runStartTime: data.timing?.startTime,
            runEndTime: data.timing?.endTime,
            executionOrder: data.executionOrder,
        };
    }
    NotebookCellExecutionSummary.from = from;
})(NotebookCellExecutionSummary || (NotebookCellExecutionSummary = {}));
export var NotebookCellExecutionState;
(function (NotebookCellExecutionState) {
    function to(state) {
        if (state === notebooks.NotebookCellExecutionState.Unconfirmed) {
            return types.NotebookCellExecutionState.Pending;
        }
        else if (state === notebooks.NotebookCellExecutionState.Pending) {
            // Since the (proposed) extension API doesn't have the distinction between Unconfirmed and Pending, we don't want to fire an update for Pending twice
            return undefined;
        }
        else if (state === notebooks.NotebookCellExecutionState.Executing) {
            return types.NotebookCellExecutionState.Executing;
        }
        else {
            throw new Error(`Unknown state: ${state}`);
        }
    }
    NotebookCellExecutionState.to = to;
})(NotebookCellExecutionState || (NotebookCellExecutionState = {}));
export var NotebookCellKind;
(function (NotebookCellKind) {
    function from(data) {
        switch (data) {
            case types.NotebookCellKind.Markup:
                return notebooks.CellKind.Markup;
            case types.NotebookCellKind.Code:
            default:
                return notebooks.CellKind.Code;
        }
    }
    NotebookCellKind.from = from;
    function to(data) {
        switch (data) {
            case notebooks.CellKind.Markup:
                return types.NotebookCellKind.Markup;
            case notebooks.CellKind.Code:
            default:
                return types.NotebookCellKind.Code;
        }
    }
    NotebookCellKind.to = to;
})(NotebookCellKind || (NotebookCellKind = {}));
export var NotebookData;
(function (NotebookData) {
    function from(data) {
        const res = {
            metadata: data.metadata ?? Object.create(null),
            cells: [],
        };
        for (const cell of data.cells) {
            types.NotebookCellData.validate(cell);
            res.cells.push(NotebookCellData.from(cell));
        }
        return res;
    }
    NotebookData.from = from;
    function to(data) {
        const res = new types.NotebookData(data.cells.map(NotebookCellData.to));
        if (!isEmptyObject(data.metadata)) {
            res.metadata = data.metadata;
        }
        return res;
    }
    NotebookData.to = to;
})(NotebookData || (NotebookData = {}));
export var NotebookCellData;
(function (NotebookCellData) {
    function from(data) {
        return {
            cellKind: NotebookCellKind.from(data.kind),
            language: data.languageId,
            mime: data.mime,
            source: data.value,
            metadata: data.metadata,
            internalMetadata: NotebookCellExecutionSummary.from(data.executionSummary ?? {}),
            outputs: data.outputs ? data.outputs.map(NotebookCellOutput.from) : [],
        };
    }
    NotebookCellData.from = from;
    function to(data) {
        return new types.NotebookCellData(NotebookCellKind.to(data.cellKind), data.source, data.language, data.mime, data.outputs ? data.outputs.map(NotebookCellOutput.to) : undefined, data.metadata, data.internalMetadata ? NotebookCellExecutionSummary.to(data.internalMetadata) : undefined);
    }
    NotebookCellData.to = to;
})(NotebookCellData || (NotebookCellData = {}));
export var NotebookCellOutputItem;
(function (NotebookCellOutputItem) {
    function from(item) {
        return {
            mime: item.mime,
            valueBytes: VSBuffer.wrap(item.data),
        };
    }
    NotebookCellOutputItem.from = from;
    function to(item) {
        return new types.NotebookCellOutputItem(item.valueBytes.buffer, item.mime);
    }
    NotebookCellOutputItem.to = to;
})(NotebookCellOutputItem || (NotebookCellOutputItem = {}));
export var NotebookCellOutput;
(function (NotebookCellOutput) {
    function from(output) {
        return {
            outputId: output.id,
            items: output.items.map(NotebookCellOutputItem.from),
            metadata: output.metadata,
        };
    }
    NotebookCellOutput.from = from;
    function to(output) {
        const items = output.items.map(NotebookCellOutputItem.to);
        return new types.NotebookCellOutput(items, output.outputId, output.metadata);
    }
    NotebookCellOutput.to = to;
})(NotebookCellOutput || (NotebookCellOutput = {}));
export var NotebookExclusiveDocumentPattern;
(function (NotebookExclusiveDocumentPattern) {
    function from(pattern) {
        if (isExclusivePattern(pattern)) {
            return {
                include: GlobPattern.from(pattern.include) ?? undefined,
                exclude: GlobPattern.from(pattern.exclude) ?? undefined,
            };
        }
        return GlobPattern.from(pattern) ?? undefined;
    }
    NotebookExclusiveDocumentPattern.from = from;
    function to(pattern) {
        if (isExclusivePattern(pattern)) {
            return {
                include: GlobPattern.to(pattern.include),
                exclude: GlobPattern.to(pattern.exclude),
            };
        }
        return GlobPattern.to(pattern);
    }
    NotebookExclusiveDocumentPattern.to = to;
    function isExclusivePattern(obj) {
        const ep = obj;
        if (!ep) {
            return false;
        }
        return !isUndefinedOrNull(ep.include) && !isUndefinedOrNull(ep.exclude);
    }
})(NotebookExclusiveDocumentPattern || (NotebookExclusiveDocumentPattern = {}));
export var NotebookStatusBarItem;
(function (NotebookStatusBarItem) {
    function from(item, commandsConverter, disposables) {
        const command = typeof item.command === 'string' ? { title: '', command: item.command } : item.command;
        return {
            alignment: item.alignment === types.NotebookCellStatusBarAlignment.Left
                ? 1 /* notebooks.CellStatusbarAlignment.Left */
                : 2 /* notebooks.CellStatusbarAlignment.Right */,
            command: commandsConverter.toInternal(command, disposables), // TODO@roblou
            text: item.text,
            tooltip: item.tooltip,
            accessibilityInformation: item.accessibilityInformation,
            priority: item.priority,
        };
    }
    NotebookStatusBarItem.from = from;
})(NotebookStatusBarItem || (NotebookStatusBarItem = {}));
export var NotebookKernelSourceAction;
(function (NotebookKernelSourceAction) {
    function from(item, commandsConverter, disposables) {
        const command = typeof item.command === 'string' ? { title: '', command: item.command } : item.command;
        return {
            command: commandsConverter.toInternal(command, disposables),
            label: item.label,
            description: item.description,
            detail: item.detail,
            documentation: item.documentation,
        };
    }
    NotebookKernelSourceAction.from = from;
})(NotebookKernelSourceAction || (NotebookKernelSourceAction = {}));
export var NotebookDocumentContentOptions;
(function (NotebookDocumentContentOptions) {
    function from(options) {
        return {
            transientOutputs: options?.transientOutputs ?? false,
            transientCellMetadata: options?.transientCellMetadata ?? {},
            transientDocumentMetadata: options?.transientDocumentMetadata ?? {},
            cellContentMetadata: options?.cellContentMetadata ?? {},
        };
    }
    NotebookDocumentContentOptions.from = from;
})(NotebookDocumentContentOptions || (NotebookDocumentContentOptions = {}));
export var NotebookRendererScript;
(function (NotebookRendererScript) {
    function from(preload) {
        return {
            uri: preload.uri,
            provides: preload.provides,
        };
    }
    NotebookRendererScript.from = from;
    function to(preload) {
        return new types.NotebookRendererScript(URI.revive(preload.uri), preload.provides);
    }
    NotebookRendererScript.to = to;
})(NotebookRendererScript || (NotebookRendererScript = {}));
export var TestMessage;
(function (TestMessage) {
    function from(message) {
        return {
            message: MarkdownString.fromStrict(message.message) || '',
            type: 0 /* TestMessageType.Error */,
            expected: message.expectedOutput,
            actual: message.actualOutput,
            contextValue: message.contextValue,
            location: message.location && {
                range: Range.from(message.location.range),
                uri: message.location.uri,
            },
            stackTrace: message.stackTrace?.map((s) => ({
                label: s.label,
                position: s.position && Position.from(s.position),
                uri: s.uri && URI.revive(s.uri).toJSON(),
            })),
        };
    }
    TestMessage.from = from;
    function to(item) {
        const message = new types.TestMessage(typeof item.message === 'string' ? item.message : MarkdownString.to(item.message));
        message.actualOutput = item.actual;
        message.expectedOutput = item.expected;
        message.contextValue = item.contextValue;
        message.location = item.location ? location.to(item.location) : undefined;
        return message;
    }
    TestMessage.to = to;
})(TestMessage || (TestMessage = {}));
export var TestTag;
(function (TestTag) {
    TestTag.namespace = namespaceTestTag;
    TestTag.denamespace = denamespaceTestTag;
})(TestTag || (TestTag = {}));
export var TestRunProfile;
(function (TestRunProfile) {
    function from(item) {
        return {
            controllerId: item.controllerId,
            profileId: item.profileId,
            group: TestRunProfileKind.from(item.kind),
        };
    }
    TestRunProfile.from = from;
})(TestRunProfile || (TestRunProfile = {}));
export var TestRunProfileKind;
(function (TestRunProfileKind) {
    const profileGroupToBitset = {
        [types.TestRunProfileKind.Coverage]: 8 /* TestRunProfileBitset.Coverage */,
        [types.TestRunProfileKind.Debug]: 4 /* TestRunProfileBitset.Debug */,
        [types.TestRunProfileKind.Run]: 2 /* TestRunProfileBitset.Run */,
    };
    function from(kind) {
        return profileGroupToBitset.hasOwnProperty(kind)
            ? profileGroupToBitset[kind]
            : 2 /* TestRunProfileBitset.Run */;
    }
    TestRunProfileKind.from = from;
})(TestRunProfileKind || (TestRunProfileKind = {}));
export var TestItem;
(function (TestItem) {
    function from(item) {
        const ctrlId = getPrivateApiFor(item).controllerId;
        return {
            extId: TestId.fromExtHostTestItem(item, ctrlId).toString(),
            label: item.label,
            uri: URI.revive(item.uri),
            busy: item.busy,
            tags: item.tags.map((t) => TestTag.namespace(ctrlId, t.id)),
            range: editorRange.Range.lift(Range.from(item.range)),
            description: item.description || null,
            sortText: item.sortText || null,
            error: item.error ? MarkdownString.fromStrict(item.error) || null : null,
        };
    }
    TestItem.from = from;
    function toPlain(item) {
        return {
            parent: undefined,
            error: undefined,
            id: TestId.fromString(item.extId).localId,
            label: item.label,
            uri: URI.revive(item.uri),
            tags: (item.tags || []).map((t) => {
                const { tagId } = TestTag.denamespace(t);
                return new types.TestTag(tagId);
            }),
            children: {
                add: () => { },
                delete: () => { },
                forEach: () => { },
                *[Symbol.iterator]() { },
                get: () => undefined,
                replace: () => { },
                size: 0,
            },
            range: Range.to(item.range || undefined),
            canResolveChildren: false,
            busy: item.busy,
            description: item.description || undefined,
            sortText: item.sortText || undefined,
        };
    }
    TestItem.toPlain = toPlain;
})(TestItem || (TestItem = {}));
(function (TestTag) {
    function from(tag) {
        return { id: tag.id };
    }
    TestTag.from = from;
    function to(tag) {
        return new types.TestTag(tag.id);
    }
    TestTag.to = to;
})(TestTag || (TestTag = {}));
export var TestResults;
(function (TestResults) {
    const convertTestResultItem = (node, parent) => {
        const item = node.value;
        if (!item) {
            return undefined; // should be unreachable
        }
        const snapshot = {
            ...TestItem.toPlain(item.item),
            parent,
            taskStates: item.tasks.map((t) => ({
                state: t.state,
                duration: t.duration,
                messages: t.messages
                    .filter((m) => m.type === 0 /* TestMessageType.Error */)
                    .map(TestMessage.to),
            })),
            children: [],
        };
        if (node.children) {
            for (const child of node.children.values()) {
                const c = convertTestResultItem(child, snapshot);
                if (c) {
                    snapshot.children.push(c);
                }
            }
        }
        return snapshot;
    };
    function to(serialized) {
        const tree = new WellDefinedPrefixTree();
        for (const item of serialized.items) {
            tree.insert(TestId.fromString(item.item.extId).path, item);
        }
        // Get the first node with a value in each subtree of IDs.
        const queue = [tree.nodes];
        const roots = [];
        while (queue.length) {
            for (const node of queue.pop()) {
                if (node.value) {
                    roots.push(node);
                }
                else if (node.children) {
                    queue.push(node.children.values());
                }
            }
        }
        return {
            completedAt: serialized.completedAt,
            results: roots.map((r) => convertTestResultItem(r)).filter(isDefined),
        };
    }
    TestResults.to = to;
})(TestResults || (TestResults = {}));
export var TestCoverage;
(function (TestCoverage) {
    function fromCoverageCount(count) {
        return { covered: count.covered, total: count.total };
    }
    function fromLocation(location) {
        return 'line' in location ? Position.from(location) : Range.from(location);
    }
    function toLocation(location) {
        if (!location) {
            return undefined;
        }
        return 'endLineNumber' in location ? Range.to(location) : Position.to(location);
    }
    function to(serialized) {
        if (serialized.type === 1 /* DetailType.Statement */) {
            const branches = [];
            if (serialized.branches) {
                for (const branch of serialized.branches) {
                    branches.push({
                        executed: branch.count,
                        location: toLocation(branch.location),
                        label: branch.label,
                    });
                }
            }
            return new types.StatementCoverage(serialized.count, toLocation(serialized.location), serialized.branches?.map((b) => new types.BranchCoverage(b.count, toLocation(b.location), b.label)));
        }
        else {
            return new types.DeclarationCoverage(serialized.name, serialized.count, toLocation(serialized.location));
        }
    }
    TestCoverage.to = to;
    function fromDetails(coverage) {
        if (typeof coverage.executed === 'number' && coverage.executed < 0) {
            throw new Error(`Invalid coverage count ${coverage.executed}`);
        }
        if ('branches' in coverage) {
            return {
                count: coverage.executed,
                location: fromLocation(coverage.location),
                type: 1 /* DetailType.Statement */,
                branches: coverage.branches.length
                    ? coverage.branches.map((b) => ({
                        count: b.executed,
                        location: b.location && fromLocation(b.location),
                        label: b.label,
                    }))
                    : undefined,
            };
        }
        else {
            return {
                type: 0 /* DetailType.Declaration */,
                name: coverage.name,
                count: coverage.executed,
                location: fromLocation(coverage.location),
            };
        }
    }
    TestCoverage.fromDetails = fromDetails;
    function fromFile(controllerId, id, coverage) {
        types.validateTestCoverageCount(coverage.statementCoverage);
        types.validateTestCoverageCount(coverage.branchCoverage);
        types.validateTestCoverageCount(coverage.declarationCoverage);
        return {
            id,
            uri: coverage.uri,
            statement: fromCoverageCount(coverage.statementCoverage),
            branch: coverage.branchCoverage && fromCoverageCount(coverage.branchCoverage),
            declaration: coverage.declarationCoverage && fromCoverageCount(coverage.declarationCoverage),
            testIds: coverage instanceof types.FileCoverage && coverage.includesTests.length
                ? coverage.includesTests.map((t) => TestId.fromExtHostTestItem(t, controllerId).toString())
                : undefined,
        };
    }
    TestCoverage.fromFile = fromFile;
})(TestCoverage || (TestCoverage = {}));
export var CodeActionTriggerKind;
(function (CodeActionTriggerKind) {
    function to(value) {
        switch (value) {
            case 1 /* languages.CodeActionTriggerType.Invoke */:
                return types.CodeActionTriggerKind.Invoke;
            case 2 /* languages.CodeActionTriggerType.Auto */:
                return types.CodeActionTriggerKind.Automatic;
        }
    }
    CodeActionTriggerKind.to = to;
})(CodeActionTriggerKind || (CodeActionTriggerKind = {}));
export var TypeHierarchyItem;
(function (TypeHierarchyItem) {
    function to(item) {
        const result = new types.TypeHierarchyItem(SymbolKind.to(item.kind), item.name, item.detail || '', URI.revive(item.uri), Range.to(item.range), Range.to(item.selectionRange));
        result._sessionId = item._sessionId;
        result._itemId = item._itemId;
        return result;
    }
    TypeHierarchyItem.to = to;
    function from(item, sessionId, itemId) {
        sessionId = sessionId ?? item._sessionId;
        itemId = itemId ?? item._itemId;
        if (sessionId === undefined || itemId === undefined) {
            throw new Error('invalid item');
        }
        return {
            _sessionId: sessionId,
            _itemId: itemId,
            kind: SymbolKind.from(item.kind),
            name: item.name,
            detail: item.detail ?? '',
            uri: item.uri,
            range: Range.from(item.range),
            selectionRange: Range.from(item.selectionRange),
            tags: item.tags?.map(SymbolTag.from),
        };
    }
    TypeHierarchyItem.from = from;
})(TypeHierarchyItem || (TypeHierarchyItem = {}));
export var ViewBadge;
(function (ViewBadge) {
    function from(badge) {
        if (!badge) {
            return undefined;
        }
        return {
            value: badge.value,
            tooltip: badge.tooltip,
        };
    }
    ViewBadge.from = from;
})(ViewBadge || (ViewBadge = {}));
export var DataTransferItem;
(function (DataTransferItem) {
    function to(mime, item, resolveFileData) {
        const file = item.fileData;
        if (file) {
            return new types.InternalFileDataTransferItem(new types.DataTransferFile(file.name, URI.revive(file.uri), file.id, createSingleCallFunction(() => resolveFileData(file.id))));
        }
        if (mime === Mimes.uriList && item.uriListData) {
            return new types.InternalDataTransferItem(reviveUriList(item.uriListData));
        }
        return new types.InternalDataTransferItem(item.asString);
    }
    DataTransferItem.to = to;
    async function from(mime, item, id = generateUuid()) {
        const stringValue = await item.asString();
        if (mime === Mimes.uriList) {
            return {
                id,
                asString: stringValue,
                fileData: undefined,
                uriListData: serializeUriList(stringValue),
            };
        }
        const fileValue = item.asFile();
        return {
            id,
            asString: stringValue,
            fileData: fileValue
                ? {
                    name: fileValue.name,
                    uri: fileValue.uri,
                    id: fileValue._itemId ?? fileValue.id,
                }
                : undefined,
        };
    }
    DataTransferItem.from = from;
    function serializeUriList(stringValue) {
        return UriList.split(stringValue).map((part) => {
            if (part.startsWith('#')) {
                return part;
            }
            try {
                return URI.parse(part);
            }
            catch {
                // noop
            }
            return part;
        });
    }
    function reviveUriList(parts) {
        return UriList.create(parts.map((part) => {
            return typeof part === 'string' ? part : URI.revive(part);
        }));
    }
})(DataTransferItem || (DataTransferItem = {}));
export var DataTransfer;
(function (DataTransfer) {
    function toDataTransfer(value, resolveFileData) {
        const init = value.items.map(([type, item]) => {
            return [type, DataTransferItem.to(type, item, resolveFileData)];
        });
        return new types.DataTransfer(init);
    }
    DataTransfer.toDataTransfer = toDataTransfer;
    async function from(dataTransfer) {
        const items = await Promise.all(Array.from(dataTransfer, async ([mime, value]) => {
            return [mime, await DataTransferItem.from(mime, value)];
        }));
        return { items };
    }
    DataTransfer.from = from;
    async function fromList(dataTransfer) {
        const items = await Promise.all(Array.from(dataTransfer, async ([mime, value]) => {
            return [mime, await DataTransferItem.from(mime, value, value.id)];
        }));
        return { items };
    }
    DataTransfer.fromList = fromList;
})(DataTransfer || (DataTransfer = {}));
export var ChatFollowup;
(function (ChatFollowup) {
    function from(followup, request) {
        return {
            kind: 'reply',
            agentId: followup.participant ?? request?.agentId ?? '',
            subCommand: followup.command ?? request?.command,
            message: followup.prompt,
            title: followup.label,
        };
    }
    ChatFollowup.from = from;
    function to(followup) {
        return {
            prompt: followup.message,
            label: followup.title,
            participant: followup.agentId,
            command: followup.subCommand,
        };
    }
    ChatFollowup.to = to;
})(ChatFollowup || (ChatFollowup = {}));
export var LanguageModelChatMessageRole;
(function (LanguageModelChatMessageRole) {
    function to(role) {
        switch (role) {
            case 0 /* chatProvider.ChatMessageRole.System */:
                return types.LanguageModelChatMessageRole.System;
            case 1 /* chatProvider.ChatMessageRole.User */:
                return types.LanguageModelChatMessageRole.User;
            case 2 /* chatProvider.ChatMessageRole.Assistant */:
                return types.LanguageModelChatMessageRole.Assistant;
        }
    }
    LanguageModelChatMessageRole.to = to;
    function from(role) {
        switch (role) {
            case types.LanguageModelChatMessageRole.System:
                return 0 /* chatProvider.ChatMessageRole.System */;
            case types.LanguageModelChatMessageRole.User:
                return 1 /* chatProvider.ChatMessageRole.User */;
            case types.LanguageModelChatMessageRole.Assistant:
                return 2 /* chatProvider.ChatMessageRole.Assistant */;
        }
        return 1 /* chatProvider.ChatMessageRole.User */;
    }
    LanguageModelChatMessageRole.from = from;
})(LanguageModelChatMessageRole || (LanguageModelChatMessageRole = {}));
export var LanguageModelChatMessage;
(function (LanguageModelChatMessage) {
    function to(message) {
        const content = message.content
            .map((c) => {
            if (c.type === 'text') {
                return new LanguageModelTextPart(c.value);
            }
            else if (c.type === 'tool_result') {
                const content = c.value.map((part) => {
                    if (part.type === 'text') {
                        return new types.LanguageModelTextPart(part.value);
                    }
                    else {
                        return new types.LanguageModelPromptTsxPart(part.value);
                    }
                });
                return new types.LanguageModelToolResultPart(c.toolCallId, content, c.isError);
            }
            else if (c.type === 'image_url') {
                // No image support for LanguageModelChatMessage
                return undefined;
            }
            else {
                return new types.LanguageModelToolCallPart(c.toolCallId, c.name, c.parameters);
            }
        })
            .filter((c) => c !== undefined);
        const role = LanguageModelChatMessageRole.to(message.role);
        const result = new types.LanguageModelChatMessage(role, content, message.name);
        return result;
    }
    LanguageModelChatMessage.to = to;
    function from(message) {
        const role = LanguageModelChatMessageRole.from(message.role);
        const name = message.name;
        let messageContent = message.content;
        if (typeof messageContent === 'string') {
            messageContent = [new types.LanguageModelTextPart(messageContent)];
        }
        const content = messageContent.map((c) => {
            if (c instanceof types.LanguageModelToolResultPart) {
                return {
                    type: 'tool_result',
                    toolCallId: c.callId,
                    value: coalesce(c.content.map((part) => {
                        if (part instanceof types.LanguageModelTextPart) {
                            return {
                                type: 'text',
                                value: part.value,
                            };
                        }
                        else if (part instanceof types.LanguageModelPromptTsxPart) {
                            return {
                                type: 'prompt_tsx',
                                value: part.value,
                            };
                        }
                        else {
                            // Strip unknown parts
                            return undefined;
                        }
                    })),
                    isError: c.isError,
                };
            }
            else if (c instanceof types.LanguageModelToolCallPart) {
                return {
                    type: 'tool_use',
                    toolCallId: c.callId,
                    name: c.name,
                    parameters: c.input,
                };
            }
            else if (c instanceof types.LanguageModelTextPart) {
                return {
                    type: 'text',
                    value: c.value,
                };
            }
            else {
                if (typeof c !== 'string') {
                    throw new Error('Unexpected chat message content type');
                }
                return {
                    type: 'text',
                    value: c,
                };
            }
        });
        return {
            role,
            name,
            content,
        };
    }
    LanguageModelChatMessage.from = from;
})(LanguageModelChatMessage || (LanguageModelChatMessage = {}));
export var LanguageModelChatMessage2;
(function (LanguageModelChatMessage2) {
    function to(message) {
        const content = message.content.map((c) => {
            if (c.type === 'text') {
                return new LanguageModelTextPart(c.value);
            }
            else if (c.type === 'tool_result') {
                const content = c.value.map((part) => {
                    if (part.type === 'text') {
                        return new types.LanguageModelTextPart(part.value);
                    }
                    else {
                        return new types.LanguageModelPromptTsxPart(part.value);
                    }
                });
                return new types.LanguageModelToolResultPart(c.toolCallId, content, c.isError);
            }
            else if (c.type === 'image_url') {
                const value = {
                    mimeType: c.value.mimeType,
                    data: c.value.data.buffer,
                };
                return new types.LanguageModelDataPart(value);
            }
            else {
                return new types.LanguageModelToolCallPart(c.toolCallId, c.name, c.parameters);
            }
        });
        const role = LanguageModelChatMessageRole.to(message.role);
        const result = new types.LanguageModelChatMessage2(role, content, message.name);
        return result;
    }
    LanguageModelChatMessage2.to = to;
    function from(message) {
        const role = LanguageModelChatMessageRole.from(message.role);
        const name = message.name;
        let messageContent = message.content;
        if (typeof messageContent === 'string') {
            messageContent = [new types.LanguageModelTextPart(messageContent)];
        }
        const content = messageContent.map((c) => {
            if (c instanceof types.LanguageModelToolResultPart) {
                return {
                    type: 'tool_result',
                    toolCallId: c.callId,
                    value: coalesce(c.content.map((part) => {
                        if (part instanceof types.LanguageModelTextPart) {
                            return {
                                type: 'text',
                                value: part.value,
                            };
                        }
                        else if (part instanceof types.LanguageModelPromptTsxPart) {
                            return {
                                type: 'prompt_tsx',
                                value: part.value,
                            };
                        }
                        else {
                            // Strip unknown parts
                            return undefined;
                        }
                    })),
                    isError: c.isError,
                };
            }
            else if (c instanceof types.LanguageModelDataPart) {
                const value = {
                    mimeType: c.value.mimeType,
                    data: VSBuffer.wrap(c.value.data),
                };
                return {
                    type: 'image_url',
                    value: value,
                };
            }
            else if (c instanceof types.LanguageModelToolCallPart) {
                return {
                    type: 'tool_use',
                    toolCallId: c.callId,
                    name: c.name,
                    parameters: c.input,
                };
            }
            else if (c instanceof types.LanguageModelTextPart) {
                return {
                    type: 'text',
                    value: c.value,
                };
            }
            else {
                if (typeof c !== 'string') {
                    throw new Error('Unexpected chat message content type');
                }
                return {
                    type: 'text',
                    value: c,
                };
            }
        });
        return {
            role,
            name,
            content,
        };
    }
    LanguageModelChatMessage2.from = from;
})(LanguageModelChatMessage2 || (LanguageModelChatMessage2 = {}));
export var ChatResponseMarkdownPart;
(function (ChatResponseMarkdownPart) {
    function from(part) {
        return {
            kind: 'markdownContent',
            content: MarkdownString.from(part.value),
        };
    }
    ChatResponseMarkdownPart.from = from;
    function to(part) {
        return new types.ChatResponseMarkdownPart(MarkdownString.to(part.content));
    }
    ChatResponseMarkdownPart.to = to;
})(ChatResponseMarkdownPart || (ChatResponseMarkdownPart = {}));
export var ChatResponseCodeblockUriPart;
(function (ChatResponseCodeblockUriPart) {
    function from(part) {
        return {
            kind: 'codeblockUri',
            uri: part.value,
            isEdit: part.isEdit,
        };
    }
    ChatResponseCodeblockUriPart.from = from;
    function to(part) {
        return new types.ChatResponseCodeblockUriPart(URI.revive(part.uri), part.isEdit);
    }
    ChatResponseCodeblockUriPart.to = to;
})(ChatResponseCodeblockUriPart || (ChatResponseCodeblockUriPart = {}));
export var ChatResponseMarkdownWithVulnerabilitiesPart;
(function (ChatResponseMarkdownWithVulnerabilitiesPart) {
    function from(part) {
        return {
            kind: 'markdownVuln',
            content: MarkdownString.from(part.value),
            vulnerabilities: part.vulnerabilities,
        };
    }
    ChatResponseMarkdownWithVulnerabilitiesPart.from = from;
    function to(part) {
        return new types.ChatResponseMarkdownWithVulnerabilitiesPart(MarkdownString.to(part.content), part.vulnerabilities);
    }
    ChatResponseMarkdownWithVulnerabilitiesPart.to = to;
})(ChatResponseMarkdownWithVulnerabilitiesPart || (ChatResponseMarkdownWithVulnerabilitiesPart = {}));
export var ChatResponseConfirmationPart;
(function (ChatResponseConfirmationPart) {
    function from(part) {
        return {
            kind: 'confirmation',
            title: part.title,
            message: part.message,
            data: part.data,
            buttons: part.buttons,
        };
    }
    ChatResponseConfirmationPart.from = from;
})(ChatResponseConfirmationPart || (ChatResponseConfirmationPart = {}));
export var ChatResponseFilesPart;
(function (ChatResponseFilesPart) {
    function from(part) {
        const { value, baseUri } = part;
        function convert(items, baseUri) {
            return items.map((item) => {
                const myUri = URI.joinPath(baseUri, item.name);
                return {
                    label: item.name,
                    uri: myUri,
                    children: item.children && convert(item.children, myUri),
                };
            });
        }
        return {
            kind: 'treeData',
            treeData: {
                label: basename(baseUri),
                uri: baseUri,
                children: convert(value, baseUri),
            },
        };
    }
    ChatResponseFilesPart.from = from;
    function to(part) {
        const treeData = revive(part.treeData);
        function convert(items) {
            return items.map((item) => {
                return {
                    name: item.label,
                    children: item.children && convert(item.children),
                };
            });
        }
        const baseUri = treeData.uri;
        const items = treeData.children ? convert(treeData.children) : [];
        return new types.ChatResponseFileTreePart(items, baseUri);
    }
    ChatResponseFilesPart.to = to;
})(ChatResponseFilesPart || (ChatResponseFilesPart = {}));
export var ChatResponseAnchorPart;
(function (ChatResponseAnchorPart) {
    function from(part) {
        // Work around type-narrowing confusion between vscode.Uri and URI
        const isUri = (thing) => URI.isUri(thing);
        const isSymbolInformation = (thing) => 'name' in thing;
        return {
            kind: 'inlineReference',
            name: part.title,
            inlineReference: isUri(part.value)
                ? part.value
                : isSymbolInformation(part.value)
                    ? WorkspaceSymbol.from(part.value)
                    : Location.from(part.value),
        };
    }
    ChatResponseAnchorPart.from = from;
    function to(part) {
        const value = revive(part);
        return new types.ChatResponseAnchorPart(URI.isUri(value.inlineReference)
            ? value.inlineReference
            : 'location' in value.inlineReference
                ? WorkspaceSymbol.to(value.inlineReference)
                : Location.to(value.inlineReference), part.name);
    }
    ChatResponseAnchorPart.to = to;
})(ChatResponseAnchorPart || (ChatResponseAnchorPart = {}));
export var ChatResponseProgressPart;
(function (ChatResponseProgressPart) {
    function from(part) {
        return {
            kind: 'progressMessage',
            content: MarkdownString.from(part.value),
        };
    }
    ChatResponseProgressPart.from = from;
    function to(part) {
        return new types.ChatResponseProgressPart(part.content.value);
    }
    ChatResponseProgressPart.to = to;
})(ChatResponseProgressPart || (ChatResponseProgressPart = {}));
export var ChatResponseWarningPart;
(function (ChatResponseWarningPart) {
    function from(part) {
        return {
            kind: 'warning',
            content: MarkdownString.from(part.value),
        };
    }
    ChatResponseWarningPart.from = from;
    function to(part) {
        return new types.ChatResponseWarningPart(part.content.value);
    }
    ChatResponseWarningPart.to = to;
})(ChatResponseWarningPart || (ChatResponseWarningPart = {}));
export var ChatResponseMovePart;
(function (ChatResponseMovePart) {
    function from(part) {
        return {
            kind: 'move',
            uri: part.uri,
            range: Range.from(part.range),
        };
    }
    ChatResponseMovePart.from = from;
    function to(part) {
        return new types.ChatResponseMovePart(URI.revive(part.uri), Range.to(part.range));
    }
    ChatResponseMovePart.to = to;
})(ChatResponseMovePart || (ChatResponseMovePart = {}));
export var ChatTask;
(function (ChatTask) {
    function from(part) {
        return {
            kind: 'progressTask',
            content: MarkdownString.from(part.value),
        };
    }
    ChatTask.from = from;
})(ChatTask || (ChatTask = {}));
export var ChatTaskResult;
(function (ChatTaskResult) {
    function from(part) {
        return {
            kind: 'progressTaskResult',
            content: typeof part === 'string' ? MarkdownString.from(part) : undefined,
        };
    }
    ChatTaskResult.from = from;
})(ChatTaskResult || (ChatTaskResult = {}));
export var ChatResponseCommandButtonPart;
(function (ChatResponseCommandButtonPart) {
    function from(part, commandsConverter, commandDisposables) {
        // If the command isn't in the converter, then this session may have been restored, and the command args don't exist anymore
        const command = commandsConverter.toInternal(part.value, commandDisposables) ?? {
            command: part.value.command,
            title: part.value.title,
        };
        return {
            kind: 'command',
            command,
        };
    }
    ChatResponseCommandButtonPart.from = from;
    function to(part, commandsConverter) {
        // If the command isn't in the converter, then this session may have been restored, and the command args don't exist anymore
        return new types.ChatResponseCommandButtonPart(commandsConverter.fromInternal(part.command) ?? {
            command: part.command.id,
            title: part.command.title,
        });
    }
    ChatResponseCommandButtonPart.to = to;
})(ChatResponseCommandButtonPart || (ChatResponseCommandButtonPart = {}));
export var ChatResponseTextEditPart;
(function (ChatResponseTextEditPart) {
    function from(part) {
        return {
            kind: 'textEdit',
            uri: part.uri,
            edits: part.edits.map((e) => TextEdit.from(e)),
            done: part.isDone,
        };
    }
    ChatResponseTextEditPart.from = from;
    function to(part) {
        const result = new types.ChatResponseTextEditPart(URI.revive(part.uri), part.edits.map((e) => TextEdit.to(e)));
        result.isDone = part.done;
        return result;
    }
    ChatResponseTextEditPart.to = to;
})(ChatResponseTextEditPart || (ChatResponseTextEditPart = {}));
export var NotebookEdit;
(function (NotebookEdit) {
    function from(edit) {
        if (edit.newCellMetadata) {
            return {
                editType: 3 /* CellEditType.Metadata */,
                index: edit.range.start,
                metadata: edit.newCellMetadata,
            };
        }
        else if (edit.newNotebookMetadata) {
            return {
                editType: 5 /* CellEditType.DocumentMetadata */,
                metadata: edit.newNotebookMetadata,
            };
        }
        else {
            return {
                editType: 1 /* CellEditType.Replace */,
                index: edit.range.start,
                count: edit.range.end - edit.range.start,
                cells: edit.newCells.map(NotebookCellData.from),
            };
        }
    }
    NotebookEdit.from = from;
})(NotebookEdit || (NotebookEdit = {}));
export var ChatResponseNotebookEditPart;
(function (ChatResponseNotebookEditPart) {
    function from(part) {
        return {
            kind: 'notebookEdit',
            uri: part.uri,
            edits: part.edits.map(NotebookEdit.from),
            done: part.isDone,
        };
    }
    ChatResponseNotebookEditPart.from = from;
})(ChatResponseNotebookEditPart || (ChatResponseNotebookEditPart = {}));
export var ChatResponseReferencePart;
(function (ChatResponseReferencePart) {
    function from(part) {
        const iconPath = ThemeIcon.isThemeIcon(part.iconPath)
            ? part.iconPath
            : URI.isUri(part.iconPath)
                ? { light: URI.revive(part.iconPath) }
                : part.iconPath &&
                    'light' in part.iconPath &&
                    'dark' in part.iconPath &&
                    URI.isUri(part.iconPath.light) &&
                    URI.isUri(part.iconPath.dark)
                    ? { light: URI.revive(part.iconPath.light), dark: URI.revive(part.iconPath.dark) }
                    : undefined;
        if (typeof part.value === 'object' && 'variableName' in part.value) {
            return {
                kind: 'reference',
                reference: {
                    variableName: part.value.variableName,
                    value: URI.isUri(part.value.value) || !part.value.value
                        ? part.value.value
                        : Location.from(part.value.value),
                },
                iconPath,
                options: part.options,
            };
        }
        return {
            kind: 'reference',
            reference: URI.isUri(part.value) || typeof part.value === 'string'
                ? part.value
                : Location.from(part.value),
            iconPath,
            options: part.options,
        };
    }
    ChatResponseReferencePart.from = from;
    function to(part) {
        const value = revive(part);
        const mapValue = (value) => URI.isUri(value) ? value : Location.to(value);
        return new types.ChatResponseReferencePart(typeof value.reference === 'string'
            ? value.reference
            : 'variableName' in value.reference
                ? {
                    variableName: value.reference.variableName,
                    value: value.reference.value && mapValue(value.reference.value),
                }
                : mapValue(value.reference)); // 'value' is extended with variableName
    }
    ChatResponseReferencePart.to = to;
})(ChatResponseReferencePart || (ChatResponseReferencePart = {}));
export var ChatResponseCodeCitationPart;
(function (ChatResponseCodeCitationPart) {
    function from(part) {
        return {
            kind: 'codeCitation',
            value: part.value,
            license: part.license,
            snippet: part.snippet,
        };
    }
    ChatResponseCodeCitationPart.from = from;
})(ChatResponseCodeCitationPart || (ChatResponseCodeCitationPart = {}));
export var ChatResponsePart;
(function (ChatResponsePart) {
    function from(part, commandsConverter, commandDisposables) {
        if (part instanceof types.ChatResponseMarkdownPart) {
            return ChatResponseMarkdownPart.from(part);
        }
        else if (part instanceof types.ChatResponseAnchorPart) {
            return ChatResponseAnchorPart.from(part);
        }
        else if (part instanceof types.ChatResponseReferencePart) {
            return ChatResponseReferencePart.from(part);
        }
        else if (part instanceof types.ChatResponseProgressPart) {
            return ChatResponseProgressPart.from(part);
        }
        else if (part instanceof types.ChatResponseFileTreePart) {
            return ChatResponseFilesPart.from(part);
        }
        else if (part instanceof types.ChatResponseCommandButtonPart) {
            return ChatResponseCommandButtonPart.from(part, commandsConverter, commandDisposables);
        }
        else if (part instanceof types.ChatResponseTextEditPart) {
            return ChatResponseTextEditPart.from(part);
        }
        else if (part instanceof types.ChatResponseNotebookEditPart) {
            return ChatResponseNotebookEditPart.from(part);
        }
        else if (part instanceof types.ChatResponseMarkdownWithVulnerabilitiesPart) {
            return ChatResponseMarkdownWithVulnerabilitiesPart.from(part);
        }
        else if (part instanceof types.ChatResponseCodeblockUriPart) {
            return ChatResponseCodeblockUriPart.from(part);
        }
        else if (part instanceof types.ChatResponseWarningPart) {
            return ChatResponseWarningPart.from(part);
        }
        else if (part instanceof types.ChatResponseConfirmationPart) {
            return ChatResponseConfirmationPart.from(part);
        }
        else if (part instanceof types.ChatResponseCodeCitationPart) {
            return ChatResponseCodeCitationPart.from(part);
        }
        else if (part instanceof types.ChatResponseMovePart) {
            return ChatResponseMovePart.from(part);
        }
        return {
            kind: 'markdownContent',
            content: MarkdownString.from(''),
        };
    }
    ChatResponsePart.from = from;
    function to(part, commandsConverter) {
        switch (part.kind) {
            case 'reference':
                return ChatResponseReferencePart.to(part);
            case 'markdownContent':
            case 'inlineReference':
            case 'progressMessage':
            case 'treeData':
            case 'command':
                return toContent(part, commandsConverter);
        }
        return undefined;
    }
    ChatResponsePart.to = to;
    function toContent(part, commandsConverter) {
        switch (part.kind) {
            case 'markdownContent':
                return ChatResponseMarkdownPart.to(part);
            case 'inlineReference':
                return ChatResponseAnchorPart.to(part);
            case 'progressMessage':
                return undefined;
            case 'treeData':
                return ChatResponseFilesPart.to(part);
            case 'command':
                return ChatResponseCommandButtonPart.to(part, commandsConverter);
        }
        return undefined;
    }
    ChatResponsePart.toContent = toContent;
})(ChatResponsePart || (ChatResponsePart = {}));
export var ChatAgentRequest;
(function (ChatAgentRequest) {
    function to(request, location2, model, diagnostics, tools) {
        const toolReferences = request.variables.variables.filter((v) => v.isTool);
        const variableReferences = request.variables.variables.filter((v) => !v.isTool);
        const requestWithoutId = {
            prompt: request.message,
            command: request.command,
            attempt: request.attempt ?? 0,
            enableCommandDetection: request.enableCommandDetection ?? true,
            isParticipantDetected: request.isParticipantDetected ?? false,
            references: variableReferences.map((v) => ChatPromptReference.to(v, diagnostics)),
            toolReferences: toolReferences.map(ChatLanguageModelToolReference.to),
            location: ChatLocation.to(request.location),
            acceptedConfirmationData: request.acceptedConfirmationData,
            rejectedConfirmationData: request.rejectedConfirmationData,
            location2,
            toolInvocationToken: Object.freeze({ sessionId: request.sessionId }),
            tools,
            model,
        };
        if (request.requestId) {
            return {
                ...requestWithoutId,
                id: request.requestId,
            };
        }
        // This cast is done to allow sending the stabl version of ChatRequest which does not have an id property
        return requestWithoutId;
    }
    ChatAgentRequest.to = to;
})(ChatAgentRequest || (ChatAgentRequest = {}));
export var ChatRequestDraft;
(function (ChatRequestDraft) {
    function to(request) {
        return {
            prompt: request.prompt,
            files: request.files.map((uri) => URI.revive(uri)),
        };
    }
    ChatRequestDraft.to = to;
})(ChatRequestDraft || (ChatRequestDraft = {}));
export var ChatLocation;
(function (ChatLocation) {
    function to(loc) {
        switch (loc) {
            case ChatAgentLocation.Notebook:
                return types.ChatLocation.Notebook;
            case ChatAgentLocation.Terminal:
                return types.ChatLocation.Terminal;
            case ChatAgentLocation.Panel:
                return types.ChatLocation.Panel;
            case ChatAgentLocation.Editor:
                return types.ChatLocation.Editor;
            case ChatAgentLocation.EditingSession:
                return types.ChatLocation.EditingSession;
        }
    }
    ChatLocation.to = to;
    function from(loc) {
        switch (loc) {
            case types.ChatLocation.Notebook:
                return ChatAgentLocation.Notebook;
            case types.ChatLocation.Terminal:
                return ChatAgentLocation.Terminal;
            case types.ChatLocation.Panel:
                return ChatAgentLocation.Panel;
            case types.ChatLocation.Editor:
                return ChatAgentLocation.Editor;
            case types.ChatLocation.EditingSession:
                return ChatAgentLocation.EditingSession;
        }
    }
    ChatLocation.from = from;
})(ChatLocation || (ChatLocation = {}));
export var ChatPromptReference;
(function (ChatPromptReference) {
    function to(variable, diagnostics) {
        let value = variable.value;
        if (!value) {
            throw new Error('Invalid value reference');
        }
        if (isUriComponents(value)) {
            value = URI.revive(value);
        }
        else if (value &&
            typeof value === 'object' &&
            'uri' in value &&
            'range' in value &&
            isUriComponents(value.uri)) {
            value = Location.to(revive(value));
        }
        else if (variable.isImage) {
            const ref = variable.references?.[0]?.reference;
            value = new types.ChatReferenceBinaryData(variable.mimeType ?? 'image/png', () => Promise.resolve(new Uint8Array(Object.values(variable.value))), ref && URI.isUri(ref) ? ref : undefined);
        }
        else if (variable.kind === 'diagnostic') {
            const filterSeverity = variable.filterSeverity && DiagnosticSeverity.to(variable.filterSeverity);
            const filterUri = variable.filterUri && URI.revive(variable.filterUri).toString();
            value = new types.ChatReferenceDiagnostic(diagnostics
                .map(([uri, d]) => {
                if (variable.filterUri && uri.toString() !== filterUri) {
                    return [uri, []];
                }
                return [
                    uri,
                    d.filter((d) => {
                        if (filterSeverity && d.severity > filterSeverity) {
                            return false;
                        }
                        if (variable.filterRange &&
                            !editorRange.Range.areIntersectingOrTouching(variable.filterRange, Range.from(d.range))) {
                            return false;
                        }
                        return true;
                    }),
                ];
            })
                .filter(([, d]) => d.length > 0));
        }
        return {
            id: variable.id,
            name: variable.name,
            range: variable.range && [variable.range.start, variable.range.endExclusive],
            value,
            modelDescription: variable.modelDescription,
        };
    }
    ChatPromptReference.to = to;
})(ChatPromptReference || (ChatPromptReference = {}));
export var ChatLanguageModelToolReference;
(function (ChatLanguageModelToolReference) {
    function to(variable) {
        const value = variable.value;
        if (value) {
            throw new Error('Invalid tool reference');
        }
        return {
            name: variable.id,
            range: variable.range && [variable.range.start, variable.range.endExclusive],
        };
    }
    ChatLanguageModelToolReference.to = to;
})(ChatLanguageModelToolReference || (ChatLanguageModelToolReference = {}));
export var ChatAgentCompletionItem;
(function (ChatAgentCompletionItem) {
    function from(item, commandsConverter, disposables) {
        return {
            id: item.id,
            label: item.label,
            fullName: item.fullName,
            icon: item.icon?.id,
            value: item.values[0].value,
            insertText: item.insertText,
            detail: item.detail,
            documentation: item.documentation,
            command: commandsConverter.toInternal(item.command, disposables),
        };
    }
    ChatAgentCompletionItem.from = from;
})(ChatAgentCompletionItem || (ChatAgentCompletionItem = {}));
export var ChatAgentResult;
(function (ChatAgentResult) {
    function to(result) {
        return {
            errorDetails: result.errorDetails,
            metadata: reviveMetadata(result.metadata),
            nextQuestion: result.nextQuestion,
        };
    }
    ChatAgentResult.to = to;
    function from(result) {
        return {
            errorDetails: result.errorDetails,
            metadata: result.metadata,
            nextQuestion: result.nextQuestion,
        };
    }
    ChatAgentResult.from = from;
    function reviveMetadata(metadata) {
        return cloneAndChange(metadata, (value) => {
            if (value.$mid === 20 /* MarshalledId.LanguageModelToolResult */) {
                return new types.LanguageModelToolResult(cloneAndChange(value.content, reviveMetadata));
            }
            else if (value.$mid === 21 /* MarshalledId.LanguageModelTextPart */) {
                return new types.LanguageModelTextPart(value.value);
            }
            else if (value.$mid === 22 /* MarshalledId.LanguageModelPromptTsxPart */) {
                return new types.LanguageModelPromptTsxPart(value.value);
            }
            return undefined;
        });
    }
})(ChatAgentResult || (ChatAgentResult = {}));
export var ChatAgentUserActionEvent;
(function (ChatAgentUserActionEvent) {
    function to(result, event, commandsConverter) {
        if (event.action.kind === 'vote') {
            // Is the "feedback" type
            return;
        }
        const ehResult = ChatAgentResult.to(result);
        if (event.action.kind === 'command') {
            const command = event.action.commandButton.command;
            const commandButton = {
                command: commandsConverter.fromInternal(command) ?? {
                    command: command.id,
                    title: command.title,
                },
            };
            const commandAction = { kind: 'command', commandButton };
            return { action: commandAction, result: ehResult };
        }
        else if (event.action.kind === 'followUp') {
            const followupAction = {
                kind: 'followUp',
                followup: ChatFollowup.to(event.action.followup),
            };
            return { action: followupAction, result: ehResult };
        }
        else if (event.action.kind === 'inlineChat') {
            return {
                action: { kind: 'editor', accepted: event.action.action === 'accepted' },
                result: ehResult,
            };
        }
        else if (event.action.kind === 'chatEditingSessionAction') {
            const outcomes = new Map([
                ['accepted', types.ChatEditingSessionActionOutcome.Accepted],
                ['rejected', types.ChatEditingSessionActionOutcome.Rejected],
                ['saved', types.ChatEditingSessionActionOutcome.Saved],
            ]);
            return {
                action: {
                    kind: 'chatEditingSessionAction',
                    outcome: outcomes.get(event.action.outcome) ?? types.ChatEditingSessionActionOutcome.Rejected,
                    uri: URI.revive(event.action.uri),
                    hasRemainingEdits: event.action.hasRemainingEdits,
                },
                result: ehResult,
            };
        }
        else {
            return { action: event.action, result: ehResult };
        }
    }
    ChatAgentUserActionEvent.to = to;
})(ChatAgentUserActionEvent || (ChatAgentUserActionEvent = {}));
export var TerminalQuickFix;
(function (TerminalQuickFix) {
    function from(quickFix, converter, disposables) {
        if ('terminalCommand' in quickFix) {
            return { terminalCommand: quickFix.terminalCommand, shouldExecute: quickFix.shouldExecute };
        }
        if ('uri' in quickFix) {
            return { uri: quickFix.uri };
        }
        return converter.toInternal(quickFix, disposables);
    }
    TerminalQuickFix.from = from;
})(TerminalQuickFix || (TerminalQuickFix = {}));
export var TerminalCompletionItemDto;
(function (TerminalCompletionItemDto) {
    function from(item) {
        return {
            ...item,
            documentation: MarkdownString.fromStrict(item.documentation),
        };
    }
    TerminalCompletionItemDto.from = from;
})(TerminalCompletionItemDto || (TerminalCompletionItemDto = {}));
export var TerminalCompletionList;
(function (TerminalCompletionList) {
    function from(completions) {
        if (Array.isArray(completions)) {
            return {
                items: completions.map((i) => TerminalCompletionItemDto.from(i)),
            };
        }
        return {
            items: completions.items.map((i) => TerminalCompletionItemDto.from(i)),
            resourceRequestConfig: completions.resourceRequestConfig
                ? TerminalResourceRequestConfig.from(completions.resourceRequestConfig)
                : undefined,
        };
    }
    TerminalCompletionList.from = from;
})(TerminalCompletionList || (TerminalCompletionList = {}));
export var TerminalResourceRequestConfig;
(function (TerminalResourceRequestConfig) {
    function from(resourceRequestConfig) {
        return {
            ...resourceRequestConfig,
            pathSeparator: isWindows ? '\\' : '/',
            cwd: resourceRequestConfig.cwd ? URI.revive(resourceRequestConfig.cwd) : undefined,
        };
    }
    TerminalResourceRequestConfig.from = from;
})(TerminalResourceRequestConfig || (TerminalResourceRequestConfig = {}));
export var PartialAcceptInfo;
(function (PartialAcceptInfo) {
    function to(info) {
        return {
            kind: PartialAcceptTriggerKind.to(info.kind),
            acceptedLength: info.acceptedLength,
        };
    }
    PartialAcceptInfo.to = to;
})(PartialAcceptInfo || (PartialAcceptInfo = {}));
export var PartialAcceptTriggerKind;
(function (PartialAcceptTriggerKind) {
    function to(kind) {
        switch (kind) {
            case 0 /* languages.PartialAcceptTriggerKind.Word */:
                return types.PartialAcceptTriggerKind.Word;
            case 1 /* languages.PartialAcceptTriggerKind.Line */:
                return types.PartialAcceptTriggerKind.Line;
            case 2 /* languages.PartialAcceptTriggerKind.Suggest */:
                return types.PartialAcceptTriggerKind.Suggest;
            default:
                return types.PartialAcceptTriggerKind.Unknown;
        }
    }
    PartialAcceptTriggerKind.to = to;
})(PartialAcceptTriggerKind || (PartialAcceptTriggerKind = {}));
export var DebugTreeItem;
(function (DebugTreeItem) {
    function from(item, id) {
        return {
            id,
            label: item.label,
            description: item.description,
            canEdit: item.canEdit,
            collapsibleState: (item.collapsibleState ||
                0 /* DebugTreeItemCollapsibleState.None */),
            contextValue: item.contextValue,
        };
    }
    DebugTreeItem.from = from;
})(DebugTreeItem || (DebugTreeItem = {}));
export var LanguageModelToolDescription;
(function (LanguageModelToolDescription) {
    function to(item) {
        return {
            // Note- the reason this is a unique 'name' is just to avoid confusion with the toolCallId
            name: item.id,
            description: item.modelDescription,
            inputSchema: item.inputSchema,
            tags: item.tags ?? [],
        };
    }
    LanguageModelToolDescription.to = to;
})(LanguageModelToolDescription || (LanguageModelToolDescription = {}));
export var LanguageModelToolResult;
(function (LanguageModelToolResult) {
    function to(result) {
        return new types.LanguageModelToolResult(result.content.map((item) => {
            if (item.kind === 'text') {
                return new types.LanguageModelTextPart(item.value);
            }
            else {
                return new types.LanguageModelPromptTsxPart(item.value);
            }
        }));
    }
    LanguageModelToolResult.to = to;
    function from(result, extension) {
        if (result.toolResultMessage) {
            checkProposedApiEnabled(extension, 'chatParticipantPrivate');
        }
        return {
            content: result.content.map((item) => {
                if (item instanceof types.LanguageModelTextPart) {
                    return {
                        kind: 'text',
                        value: item.value,
                    };
                }
                else if (item instanceof types.LanguageModelPromptTsxPart) {
                    return {
                        kind: 'promptTsx',
                        value: item.value,
                    };
                }
                else {
                    throw new Error('Unknown LanguageModelToolResult part type');
                }
            }),
            toolResultMessage: MarkdownString.fromStrict(result.toolResultMessage),
            toolResultDetails: result.toolResultDetails?.map((detail) => URI.isUri(detail) ? detail : Location.from(detail)),
        };
    }
    LanguageModelToolResult.from = from;
})(LanguageModelToolResult || (LanguageModelToolResult = {}));
export var IconPath;
(function (IconPath) {
    function fromThemeIcon(iconPath) {
        return iconPath;
    }
    IconPath.fromThemeIcon = fromThemeIcon;
})(IconPath || (IconPath = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFR5cGVDb252ZXJ0ZXJzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9leHRIb3N0VHlwZUNvbnZlcnRlcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDbkYsT0FBTyxFQUFFLFFBQVEsRUFBRSxZQUFZLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN2RSxPQUFPLEVBQXdDLE9BQU8sRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3BHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzdFLE9BQU8sS0FBSyxXQUFXLE1BQU0scUNBQXFDLENBQUE7QUFFbEUsT0FBTyxFQUFFLFdBQVcsRUFBRSxXQUFXLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUN0RSxPQUFPLEtBQUssTUFBTSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFFbkUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ3BELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDNUQsT0FBTyxFQUFtQixxQkFBcUIsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzNGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDN0QsT0FBTyxFQUNOLFNBQVMs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a0JBQWtCLENBQUMsS0FBSyw2Q0FBcUM7UUFDcEUsQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsUUFBUSxnREFBd0M7UUFDMUUsQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsS0FBSyw2Q0FBcUM7UUFDcEUsQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsU0FBUyxpREFBeUM7UUFDNUUsQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsTUFBTSw4Q0FBc0M7UUFDdEUsQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsTUFBTSw4Q0FBc0M7UUFDdEUsQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsUUFBUSxnREFBd0M7UUFDMUUsQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsSUFBSSw2Q0FBb0M7UUFDbEUsQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsS0FBSyw4Q0FBcUM7UUFDcEUsQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsUUFBUSxpREFBd0M7UUFDMUUsQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsSUFBSSw2Q0FBb0M7UUFDbEUsQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsVUFBVSxtREFBMEM7UUFDOUUsQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsT0FBTyxnREFBdUM7UUFDeEUsQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsT0FBTyxnREFBdUM7UUFDeEUsQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsSUFBSSw2Q0FBb0M7UUFDbEUsQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsS0FBSyw4Q0FBcUM7UUFDcEUsQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsSUFBSSw2Q0FBb0M7UUFDbEUsQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsU0FBUyxrREFBeUM7UUFDNUUsQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsTUFBTSwrQ0FBc0M7UUFDdEUsQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsS0FBSyw4Q0FBcUM7UUFDcEUsQ0FBQyxLQUFLLENBQUMs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