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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFR5cGVDb252ZXJ0ZXJzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdFR5cGVDb252ZXJ0ZXJzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLGVBQWUsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ25GLE9BQU8sRUFBRSxRQUFRLEVBQUUsWUFBWSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDdkUsT0FBTyxFQUF3QyxPQUFPLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNwRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM3RSxPQUFPLEtBQUssV0FBVyxNQUFNLHFDQUFxQyxDQUFBO0FBRWxFLE9BQU8sRUFBRSxXQUFXLEVBQUUsV0FBVyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDdEUsT0FBTyxLQUFLLE1BQU0sTUFBTSx1Q0FBdUMsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBRW5FLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDaEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzVELE9BQU8sRUFBbUIscUJBQXFCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMzRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDNUQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzdELE9BQU8sRUFDTixTQUFTLEVBQ1QsYUFBYSxFQUNiLFFBQVEsRUFD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O1FBQ3BFLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLFFBQVEsZ0RBQXdDO1FBQzFFLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLEtBQUssNkNBQXFDO1FBQ3BFLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLFNBQVMsaURBQXlDO1FBQzVFLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLE1BQU0sOENBQXNDO1FBQ3RFLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLE1BQU0sOENBQXNDO1FBQ3RFLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLFFBQVEsZ0RBQXdDO1FBQzFFLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLElBQUksNkNBQW9DO1FBQ2xFLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLEtBQUssOENBQXFDO1FBQ3BFLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLFFBQVEsaURBQXdDO1FBQzFFLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLElBQUksNkNBQW9DO1FBQ2xFLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLFVBQVUsbURBQTBDO1FBQzlFLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLE9BQU8sZ0RBQXVDO1FBQ3hFLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLE9BQU8sZ0RBQXVDO1FBQ3hFLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLElBQUksNkNBQW9DO1FBQ2xFLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLEtBQUssOENBQXFDO1FBQ3BFLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLElBQUksNkNBQW9DO1FBQ2xFLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLFNBQVMsa0RBQXlDO1FBQzVFLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLE1BQU0sK0NBQXNDO1FBQ3RFLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLEtBQUssOENBQXFDO1FBQ3BFLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLFFBQVEsaURBQXdD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