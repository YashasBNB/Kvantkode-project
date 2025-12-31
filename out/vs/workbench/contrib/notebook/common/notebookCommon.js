/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { VSBuffer } from '../../../../base/common/buffer.js';
import * as glob from '../../../../base/common/glob.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { Mimes } from '../../../../base/common/mime.js';
import { Schemas } from '../../../../base/common/network.js';
import { basename } from '../../../../base/common/path.js';
import { isWindows } from '../../../../base/common/platform.js';
import { RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { generateMetadataUri, generate as generateUri, extractCellOutputDetails, parseMetadataUri, parse as parseUri, } from '../../../services/notebook/common/notebookDocumentService.js';
export const NOTEBOOK_EDITOR_ID = 'workbench.editor.notebook';
export const NOTEBOOK_DIFF_EDITOR_ID = 'workbench.editor.notebookTextDiffEditor';
export const NOTEBOOK_MULTI_DIFF_EDITOR_ID = 'workbench.editor.notebookMultiTextDiffEditor';
export const INTERACTIVE_WINDOW_EDITOR_ID = 'workbench.editor.interactive';
export const REPL_EDITOR_ID = 'workbench.editor.repl';
export const EXECUTE_REPL_COMMAND_ID = 'replNotebook.input.execute';
export var CellKind;
(function (CellKind) {
    CellKind[CellKind["Markup"] = 1] = "Markup";
    CellKind[CellKind["Code"] = 2] = "Code";
})(CellKind || (CellKind = {}));
export const NOTEBOOK_DISPLAY_ORDER = [
    'application/json',
    'application/javascript',
    'text/html',
    'image/svg+xml',
    Mimes.latex,
    Mimes.markdown,
    'image/png',
    'image/jpeg',
    Mimes.text,
];
export const ACCESSIBLE_NOTEBOOK_DISPLAY_ORDER = [
    Mimes.latex,
    Mimes.markdown,
    'application/json',
    'text/html',
    'image/svg+xml',
    'image/png',
    'image/jpeg',
    Mimes.text,
];
/**
 * A mapping of extension IDs who contain renderers, to notebook ids who they
 * should be treated as the same in the renderer selection logic. This is used
 * to prefer the 1st party Jupyter renderers even though they're in a separate
 * extension, for instance. See #136247.
 */
export const RENDERER_EQUIVALENT_EXTENSIONS = new Map([
    ['ms-toolsai.jupyter', new Set(['jupyter-notebook', 'interactive'])],
    ['ms-toolsai.jupyter-renderers', new Set(['jupyter-notebook', 'interactive'])],
]);
export const RENDERER_NOT_AVAILABLE = '_notAvailable';
export var NotebookRunState;
(function (NotebookRunState) {
    NotebookRunState[NotebookRunState["Running"] = 1] = "Running";
    NotebookRunState[NotebookRunState["Idle"] = 2] = "Idle";
})(NotebookRunState || (NotebookRunState = {}));
export var NotebookCellExecutionState;
(function (NotebookCellExecutionState) {
    NotebookCellExecutionState[NotebookCellExecutionState["Unconfirmed"] = 1] = "Unconfirmed";
    NotebookCellExecutionState[NotebookCellExecutionState["Pending"] = 2] = "Pending";
    NotebookCellExecutionState[NotebookCellExecutionState["Executing"] = 3] = "Executing";
})(NotebookCellExecutionState || (NotebookCellExecutionState = {}));
export var NotebookExecutionState;
(function (NotebookExecutionState) {
    NotebookExecutionState[NotebookExecutionState["Unconfirmed"] = 1] = "Unconfirmed";
    NotebookExecutionState[NotebookExecutionState["Pending"] = 2] = "Pending";
    NotebookExecutionState[NotebookExecutionState["Executing"] = 3] = "Executing";
})(NotebookExecutionState || (NotebookExecutionState = {}));
/** Note: enum values are used for sorting */
export var NotebookRendererMatch;
(function (NotebookRendererMatch) {
    /** Renderer has a hard dependency on an available kernel */
    NotebookRendererMatch[NotebookRendererMatch["WithHardKernelDependency"] = 0] = "WithHardKernelDependency";
    /** Renderer works better with an available kernel */
    NotebookRendererMatch[NotebookRendererMatch["WithOptionalKernelDependency"] = 1] = "WithOptionalKernelDependency";
    /** Renderer is kernel-agnostic */
    NotebookRendererMatch[NotebookRendererMatch["Pure"] = 2] = "Pure";
    /** Renderer is for a different mimeType or has a hard dependency which is unsatisfied */
    NotebookRendererMatch[NotebookRendererMatch["Never"] = 3] = "Never";
})(NotebookRendererMatch || (NotebookRendererMatch = {}));
/**
 * Renderer messaging requirement. While this allows for 'optional' messaging,
 * VS Code effectively treats it the same as true right now. "Partial
 * activation" of extensions is a very tricky problem, which could allow
 * solving this. But for now, optional is mostly only honored for aznb.
 */
export var RendererMessagingSpec;
(function (RendererMessagingSpec) {
    RendererMessagingSpec["Always"] = "always";
    RendererMessagingSpec["Never"] = "never";
    RendererMessagingSpec["Optional"] = "optional";
})(RendererMessagingSpec || (RendererMessagingSpec = {}));
export var NotebookCellsChangeType;
(function (NotebookCellsChangeType) {
    NotebookCellsChangeType[NotebookCellsChangeType["ModelChange"] = 1] = "ModelChange";
    NotebookCellsChangeType[NotebookCellsChangeType["Move"] = 2] = "Move";
    NotebookCellsChangeType[NotebookCellsChangeType["ChangeCellLanguage"] = 5] = "ChangeCellLanguage";
    NotebookCellsChangeType[NotebookCellsChangeType["Initialize"] = 6] = "Initialize";
    NotebookCellsChangeType[NotebookCellsChangeType["ChangeCellMetadata"] = 7] = "ChangeCellMetadata";
    NotebookCellsChangeType[NotebookCellsChangeType["Output"] = 8] = "Output";
    NotebookCellsChangeType[NotebookCellsChangeType["OutputItem"] = 9] = "OutputItem";
    NotebookCellsChangeType[NotebookCellsChangeType["ChangeCellContent"] = 10] = "ChangeCellContent";
    NotebookCellsChangeType[NotebookCellsChangeType["ChangeDocumentMetadata"] = 11] = "ChangeDocumentMetadata";
    NotebookCellsChangeType[NotebookCellsChangeType["ChangeCellInternalMetadata"] = 12] = "ChangeCellInternalMetadata";
    NotebookCellsChangeType[NotebookCellsChangeType["ChangeCellMime"] = 13] = "ChangeCellMime";
    NotebookCellsChangeType[NotebookCellsChangeType["Unknown"] = 100] = "Unknown";
})(NotebookCellsChangeType || (NotebookCellsChangeType = {}));
export var SelectionStateType;
(function (SelectionStateType) {
    SelectionStateType[SelectionStateType["Handle"] = 0] = "Handle";
    SelectionStateType[SelectionStateType["Index"] = 1] = "Index";
})(SelectionStateType || (SelectionStateType = {}));
export var CellEditType;
(function (CellEditType) {
    CellEditType[CellEditType["Replace"] = 1] = "Replace";
    CellEditType[CellEditType["Output"] = 2] = "Output";
    CellEditType[CellEditType["Metadata"] = 3] = "Metadata";
    CellEditType[CellEditType["CellLanguage"] = 4] = "CellLanguage";
    CellEditType[CellEditType["DocumentMetadata"] = 5] = "DocumentMetadata";
    CellEditType[CellEditType["Move"] = 6] = "Move";
    CellEditType[CellEditType["OutputItems"] = 7] = "OutputItems";
    CellEditType[CellEditType["PartialMetadata"] = 8] = "PartialMetadata";
    CellEditType[CellEditType["PartialInternalMetadata"] = 9] = "PartialInternalMetadata";
})(CellEditType || (CellEditType = {}));
export var NotebookMetadataUri;
(function (NotebookMetadataUri) {
    NotebookMetadataUri.scheme = Schemas.vscodeNotebookMetadata;
    function generate(notebook) {
        return generateMetadataUri(notebook);
    }
    NotebookMetadataUri.generate = generate;
    function parse(metadata) {
        return parseMetadataUri(metadata);
    }
    NotebookMetadataUri.parse = parse;
})(NotebookMetadataUri || (NotebookMetadataUri = {}));
export var CellUri;
(function (CellUri) {
    CellUri.scheme = Schemas.vscodeNotebookCell;
    function generate(notebook, handle) {
        return generateUri(notebook, handle);
    }
    CellUri.generate = generate;
    function parse(cell) {
        return parseUri(cell);
    }
    CellUri.parse = parse;
    /**
     * Generates a URI for a cell output in a notebook using the output ID.
     * Used when URI should be opened as text in the editor.
     */
    function generateCellOutputUriWithId(notebook, outputId) {
        return notebook.with({
            scheme: Schemas.vscodeNotebookCellOutput,
            query: new URLSearchParams({
                openIn: 'editor',
                outputId: outputId ?? '',
                notebookScheme: notebook.scheme !== Schemas.file ? notebook.scheme : '',
            }).toString(),
        });
    }
    CellUri.generateCellOutputUriWithId = generateCellOutputUriWithId;
    /**
     * Generates a URI for a cell output in a notebook using the output index.
     * Used when URI should be opened in notebook editor.
     */
    function generateCellOutputUriWithIndex(notebook, cellUri, outputIndex) {
        return notebook.with({
            scheme: Schemas.vscodeNotebookCellOutput,
            fragment: cellUri.fragment,
            query: new URLSearchParams({
                openIn: 'notebook',
                outputIndex: String(outputIndex),
            }).toString(),
        });
    }
    CellUri.generateCellOutputUriWithIndex = generateCellOutputUriWithIndex;
    function parseCellOutputUri(uri) {
        return extractCellOutputDetails(uri);
    }
    CellUri.parseCellOutputUri = parseCellOutputUri;
    function generateCellPropertyUri(notebook, handle, scheme) {
        return CellUri.generate(notebook, handle).with({ scheme: scheme });
    }
    CellUri.generateCellPropertyUri = generateCellPropertyUri;
    function parseCellPropertyUri(uri, propertyScheme) {
        if (uri.scheme !== propertyScheme) {
            return undefined;
        }
        return CellUri.parse(uri.with({ scheme: CellUri.scheme }));
    }
    CellUri.parseCellPropertyUri = parseCellPropertyUri;
})(CellUri || (CellUri = {}));
const normalizeSlashes = (str) => (isWindows ? str.replace(/\//g, '\\') : str);
export class MimeTypeDisplayOrder {
    constructor(initialValue = [], defaultOrder = NOTEBOOK_DISPLAY_ORDER) {
        this.defaultOrder = defaultOrder;
        this.order = [...new Set(initialValue)].map((pattern) => ({
            pattern,
            matches: glob.parse(normalizeSlashes(pattern)),
        }));
    }
    /**
     * Returns a sorted array of the input mimetypes.
     */
    sort(mimetypes) {
        const remaining = new Map(Iterable.map(mimetypes, (m) => [m, normalizeSlashes(m)]));
        let sorted = [];
        for (const { matches } of this.order) {
            for (const [original, normalized] of remaining) {
                if (matches(normalized)) {
                    sorted.push(original);
                    remaining.delete(original);
                    break;
                }
            }
        }
        if (remaining.size) {
            sorted = sorted.concat([...remaining.keys()].sort((a, b) => this.defaultOrder.indexOf(a) - this.defaultOrder.indexOf(b)));
        }
        return sorted;
    }
    /**
     * Records that the user selected the given mimetype over the other
     * possible mimetypes, prioritizing it for future reference.
     */
    prioritize(chosenMimetype, otherMimetypes) {
        const chosenIndex = this.findIndex(chosenMimetype);
        if (chosenIndex === -1) {
            // always first, nothing more to do
            this.order.unshift({
                pattern: chosenMimetype,
                matches: glob.parse(normalizeSlashes(chosenMimetype)),
            });
            return;
        }
        // Get the other mimetypes that are before the chosenMimetype. Then, move
        // them after it, retaining order.
        const uniqueIndicies = new Set(otherMimetypes.map((m) => this.findIndex(m, chosenIndex)));
        uniqueIndicies.delete(-1);
        const otherIndices = Array.from(uniqueIndicies).sort();
        this.order.splice(chosenIndex + 1, 0, ...otherIndices.map((i) => this.order[i]));
        for (let oi = otherIndices.length - 1; oi >= 0; oi--) {
            this.order.splice(otherIndices[oi], 1);
        }
    }
    /**
     * Gets an array of in-order mimetype preferences.
     */
    toArray() {
        return this.order.map((o) => o.pattern);
    }
    findIndex(mimeType, maxIndex = this.order.length) {
        const normalized = normalizeSlashes(mimeType);
        for (let i = 0; i < maxIndex; i++) {
            if (this.order[i].matches(normalized)) {
                return i;
            }
        }
        return -1;
    }
}
export function diff(before, after, contains, equal = (a, b) => a === b) {
    const result = [];
    function pushSplice(start, deleteCount, toInsert) {
        if (deleteCount === 0 && toInsert.length === 0) {
            return;
        }
        const latest = result[result.length - 1];
        if (latest && latest.start + latest.deleteCount === start) {
            latest.deleteCount += deleteCount;
            latest.toInsert.push(...toInsert);
        }
        else {
            result.push({ start, deleteCount, toInsert });
        }
    }
    let beforeIdx = 0;
    let afterIdx = 0;
    while (true) {
        if (beforeIdx === before.length) {
            pushSplice(beforeIdx, 0, after.slice(afterIdx));
            break;
        }
        if (afterIdx === after.length) {
            pushSplice(beforeIdx, before.length - beforeIdx, []);
            break;
        }
        const beforeElement = before[beforeIdx];
        const afterElement = after[afterIdx];
        if (equal(beforeElement, afterElement)) {
            // equal
            beforeIdx += 1;
            afterIdx += 1;
            continue;
        }
        if (contains(afterElement)) {
            // `afterElement` exists before, which means some elements before `afterElement` are deleted
            pushSplice(beforeIdx, 1, []);
            beforeIdx += 1;
        }
        else {
            // `afterElement` added
            pushSplice(beforeIdx, 0, [afterElement]);
            afterIdx += 1;
        }
    }
    return result;
}
export const NOTEBOOK_EDITOR_CURSOR_BOUNDARY = new RawContextKey('notebookEditorCursorAtBoundary', 'none');
export const NOTEBOOK_EDITOR_CURSOR_LINE_BOUNDARY = new RawContextKey('notebookEditorCursorAtLineBoundary', 'none');
export var NotebookEditorPriority;
(function (NotebookEditorPriority) {
    NotebookEditorPriority["default"] = "default";
    NotebookEditorPriority["option"] = "option";
})(NotebookEditorPriority || (NotebookEditorPriority = {}));
export var NotebookFindScopeType;
(function (NotebookFindScopeType) {
    NotebookFindScopeType["Cells"] = "cells";
    NotebookFindScopeType["Text"] = "text";
    NotebookFindScopeType["None"] = "none";
})(NotebookFindScopeType || (NotebookFindScopeType = {}));
//TODO@rebornix test
export function isDocumentExcludePattern(filenamePattern) {
    const arg = filenamePattern;
    if ((typeof arg.include === 'string' || glob.isRelativePattern(arg.include)) &&
        (typeof arg.exclude === 'string' || glob.isRelativePattern(arg.exclude))) {
        return true;
    }
    return false;
}
export function notebookDocumentFilterMatch(filter, viewType, resource) {
    if (Array.isArray(filter.viewType) && filter.viewType.indexOf(viewType) >= 0) {
        return true;
    }
    if (filter.viewType === viewType) {
        return true;
    }
    if (filter.filenamePattern) {
        const filenamePattern = isDocumentExcludePattern(filter.filenamePattern)
            ? filter.filenamePattern.include
            : filter.filenamePattern;
        const excludeFilenamePattern = isDocumentExcludePattern(filter.filenamePattern)
            ? filter.filenamePattern.exclude
            : undefined;
        if (glob.match(filenamePattern, basename(resource.fsPath).toLowerCase())) {
            if (excludeFilenamePattern) {
                if (glob.match(excludeFilenamePattern, basename(resource.fsPath).toLowerCase())) {
                    // should exclude
                    return false;
                }
            }
            return true;
        }
    }
    return false;
}
export const NotebookSetting = {
    displayOrder: 'notebook.displayOrder',
    cellToolbarLocation: 'notebook.cellToolbarLocation',
    cellToolbarVisibility: 'notebook.cellToolbarVisibility',
    showCellStatusBar: 'notebook.showCellStatusBar',
    cellExecutionTimeVerbosity: 'notebook.cellExecutionTimeVerbosity',
    textDiffEditorPreview: 'notebook.diff.enablePreview',
    diffOverviewRuler: 'notebook.diff.overviewRuler',
    experimentalInsertToolbarAlignment: 'notebook.experimental.insertToolbarAlignment',
    compactView: 'notebook.compactView',
    focusIndicator: 'notebook.cellFocusIndicator',
    insertToolbarLocation: 'notebook.insertToolbarLocation',
    globalToolbar: 'notebook.globalToolbar',
    stickyScrollEnabled: 'notebook.stickyScroll.enabled',
    stickyScrollMode: 'notebook.stickyScroll.mode',
    undoRedoPerCell: 'notebook.undoRedoPerCell',
    consolidatedOutputButton: 'notebook.consolidatedOutputButton',
    showFoldingControls: 'notebook.showFoldingControls',
    dragAndDropEnabled: 'notebook.dragAndDropEnabled',
    cellEditorOptionsCustomizations: 'notebook.editorOptionsCustomizations',
    consolidatedRunButton: 'notebook.consolidatedRunButton',
    openGettingStarted: 'notebook.experimental.openGettingStarted',
    globalToolbarShowLabel: 'notebook.globalToolbarShowLabel',
    markupFontSize: 'notebook.markup.fontSize',
    markdownLineHeight: 'notebook.markdown.lineHeight',
    interactiveWindowCollapseCodeCells: 'interactiveWindow.collapseCellInputCode',
    outputScrollingDeprecated: 'notebook.experimental.outputScrolling',
    outputScrolling: 'notebook.output.scrolling',
    textOutputLineLimit: 'notebook.output.textLineLimit',
    LinkifyOutputFilePaths: 'notebook.output.linkifyFilePaths',
    minimalErrorRendering: 'notebook.output.minimalErrorRendering',
    formatOnSave: 'notebook.formatOnSave.enabled',
    insertFinalNewline: 'notebook.insertFinalNewline',
    defaultFormatter: 'notebook.defaultFormatter',
    formatOnCellExecution: 'notebook.formatOnCellExecution',
    codeActionsOnSave: 'notebook.codeActionsOnSave',
    outputWordWrap: 'notebook.output.wordWrap',
    outputLineHeightDeprecated: 'notebook.outputLineHeight',
    outputLineHeight: 'notebook.output.lineHeight',
    outputFontSizeDeprecated: 'notebook.outputFontSize',
    outputFontSize: 'notebook.output.fontSize',
    outputFontFamilyDeprecated: 'notebook.outputFontFamily',
    outputFontFamily: 'notebook.output.fontFamily',
    findFilters: 'notebook.find.filters',
    logging: 'notebook.logging',
    confirmDeleteRunningCell: 'notebook.confirmDeleteRunningCell',
    remoteSaving: 'notebook.experimental.remoteSave',
    gotoSymbolsAllSymbols: 'notebook.gotoSymbols.showAllSymbols',
    outlineShowMarkdownHeadersOnly: 'notebook.outline.showMarkdownHeadersOnly',
    outlineShowCodeCells: 'notebook.outline.showCodeCells',
    outlineShowCodeCellSymbols: 'notebook.outline.showCodeCellSymbols',
    breadcrumbsShowCodeCells: 'notebook.breadcrumbs.showCodeCells',
    scrollToRevealCell: 'notebook.scrolling.revealNextCellOnExecute',
    cellChat: 'notebook.experimental.cellChat',
    cellGenerate: 'notebook.experimental.generate',
    notebookVariablesView: 'notebook.variablesView',
    notebookInlineValues: 'notebook.inlineValues',
    InteractiveWindowPromptToSave: 'interactiveWindow.promptToSaveOnClose',
    cellFailureDiagnostics: 'notebook.cellFailureDiagnostics',
    outputBackupSizeLimit: 'notebook.backup.sizeLimit',
    multiCursor: 'notebook.multiCursor.enabled',
    markupFontFamily: 'notebook.markup.fontFamily',
};
export var CellStatusbarAlignment;
(function (CellStatusbarAlignment) {
    CellStatusbarAlignment[CellStatusbarAlignment["Left"] = 1] = "Left";
    CellStatusbarAlignment[CellStatusbarAlignment["Right"] = 2] = "Right";
})(CellStatusbarAlignment || (CellStatusbarAlignment = {}));
export class NotebookWorkingCopyTypeIdentifier {
    static { this._prefix = 'notebook/'; }
    static create(notebookType, viewType) {
        return `${NotebookWorkingCopyTypeIdentifier._prefix}${notebookType}/${viewType ?? notebookType}`;
    }
    static parse(candidate) {
        if (candidate.startsWith(NotebookWorkingCopyTypeIdentifier._prefix)) {
            const split = candidate.substring(NotebookWorkingCopyTypeIdentifier._prefix.length).split('/');
            if (split.length === 2) {
                return { notebookType: split[0], viewType: split[1] };
            }
        }
        return undefined;
    }
}
/**
 * Whether the provided mime type is a text stream like `stdout`, `stderr`.
 */
export function isTextStreamMime(mimeType) {
    return ['application/vnd.code.notebook.stdout', 'application/vnd.code.notebook.stderr'].includes(mimeType);
}
const textDecoder = new TextDecoder();
/**
 * Given a stream of individual stdout outputs, this function will return the compressed lines, escaping some of the common terminal escape codes.
 * E.g. some terminal escape codes would result in the previous line getting cleared, such if we had 3 lines and
 * last line contained such a code, then the result string would be just the first two lines.
 * @returns a single VSBuffer with the concatenated and compressed data, and whether any compression was done.
 */
export function compressOutputItemStreams(outputs) {
    const buffers = [];
    let startAppending = false;
    // Pick the first set of outputs with the same mime type.
    for (const output of outputs) {
        if (buffers.length === 0 || startAppending) {
            buffers.push(output);
            startAppending = true;
        }
    }
    let didCompression = compressStreamBuffer(buffers);
    const concatenated = VSBuffer.concat(buffers.map((buffer) => VSBuffer.wrap(buffer)));
    const data = formatStreamText(concatenated);
    didCompression = didCompression || data.byteLength !== concatenated.byteLength;
    return { data, didCompression };
}
export const MOVE_CURSOR_1_LINE_COMMAND = `${String.fromCharCode(27)}[A`;
const MOVE_CURSOR_1_LINE_COMMAND_BYTES = MOVE_CURSOR_1_LINE_COMMAND.split('').map((c) => c.charCodeAt(0));
const LINE_FEED = 10;
function compressStreamBuffer(streams) {
    let didCompress = false;
    streams.forEach((stream, index) => {
        if (index === 0 || stream.length < MOVE_CURSOR_1_LINE_COMMAND.length) {
            return;
        }
        const previousStream = streams[index - 1];
        // Remove the previous line if required.
        const command = stream.subarray(0, MOVE_CURSOR_1_LINE_COMMAND.length);
        if (command[0] === MOVE_CURSOR_1_LINE_COMMAND_BYTES[0] &&
            command[1] === MOVE_CURSOR_1_LINE_COMMAND_BYTES[1] &&
            command[2] === MOVE_CURSOR_1_LINE_COMMAND_BYTES[2]) {
            const lastIndexOfLineFeed = previousStream.lastIndexOf(LINE_FEED);
            if (lastIndexOfLineFeed === -1) {
                return;
            }
            didCompress = true;
            streams[index - 1] = previousStream.subarray(0, lastIndexOfLineFeed);
            streams[index] = stream.subarray(MOVE_CURSOR_1_LINE_COMMAND.length);
        }
    });
    return didCompress;
}
/**
 * Took this from jupyter/notebook
 * https://github.com/jupyter/notebook/blob/b8b66332e2023e83d2ee04f83d8814f567e01a4e/notebook/static/base/js/utils.js
 * Remove characters that are overridden by backspace characters
 */
function fixBackspace(txt) {
    let tmp = txt;
    do {
        txt = tmp;
        // Cancel out anything-but-newline followed by backspace
        tmp = txt.replace(/[^\n]\x08/gm, '');
    } while (tmp.length < txt.length);
    return txt;
}
/**
 * Remove chunks that should be overridden by the effect of carriage return characters
 * From https://github.com/jupyter/notebook/blob/master/notebook/static/base/js/utils.js
 */
function fixCarriageReturn(txt) {
    txt = txt.replace(/\r+\n/gm, '\n'); // \r followed by \n --> newline
    while (txt.search(/\r[^$]/g) > -1) {
        const base = txt.match(/^(.*)\r+/m)[1];
        let insert = txt.match(/\r+(.*)$/m)[1];
        insert = insert + base.slice(insert.length, base.length);
        txt = txt.replace(/\r+.*$/m, '\r').replace(/^.*\r/m, insert);
    }
    return txt;
}
const BACKSPACE_CHARACTER = '\b'.charCodeAt(0);
const CARRIAGE_RETURN_CHARACTER = '\r'.charCodeAt(0);
function formatStreamText(buffer) {
    // We have special handling for backspace and carriage return characters.
    // Don't unnecessary decode the bytes if we don't need to perform any processing.
    if (!buffer.buffer.includes(BACKSPACE_CHARACTER) &&
        !buffer.buffer.includes(CARRIAGE_RETURN_CHARACTER)) {
        return buffer;
    }
    // Do the same thing jupyter is doing
    return VSBuffer.fromString(fixCarriageReturn(fixBackspace(textDecoder.decode(buffer.buffer))));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tDb21tb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9jb21tb24vbm90ZWJvb2tDb21tb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBSTVELE9BQU8sS0FBSyxJQUFJLE1BQU0saUNBQWlDLENBQUE7QUFFdkQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBRTlELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDNUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQVMvRCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFVcEYsT0FBTyxFQUNOLG1CQUFtQixFQUNuQixRQUFRLElBQUksV0FBVyxFQUN2Qix3QkFBd0IsRUFDeEIsZ0JBQWdCLEVBQ2hCLEtBQUssSUFBSSxRQUFRLEdBQ2pCLE1BQU0sOERBQThELENBQUE7QUFPckUsTUFBTSxDQUFDLE1BQU0sa0JBQWtCLEdBQUcsMkJBQTJCLENBQUE7QUFDN0QsTUFBTSxDQUFDLE1BQU0sdUJBQXVCLEdBQUcseUNBQXlDLENBQUE7QUFDaEYsTUFBTSxDQUFDLE1BQU0sNkJBQTZCLEdBQUcsOENBQThDLENBQUE7QUFDM0YsTUFBTSxDQUFDLE1BQU0sNEJBQTRCLEdBQUcsOEJBQThCLENBQUE7QUFDMUUsTUFBTSxDQUFDLE1BQU0sY0FBYyxHQUFHLHVCQUF1QixDQUFBO0FBRXJELE1BQU0sQ0FBQyxN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