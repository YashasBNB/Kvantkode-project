/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var NotebookInlineVariablesController_1;
import { CancellationTokenSource } from '../../../../../../base/common/cancellation.js';
import { onUnexpectedExternalError } from '../../../../../../base/common/errors.js';
import { Event } from '../../../../../../base/common/event.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../../../../base/common/map.js';
import { isEqual } from '../../../../../../base/common/resources.js';
import { format } from '../../../../../../base/common/strings.js';
import { Position } from '../../../../../../editor/common/core/position.js';
import { Range } from '../../../../../../editor/common/core/range.js';
import { ILanguageFeaturesService } from '../../../../../../editor/common/services/languageFeatures.js';
import { localize } from '../../../../../../nls.js';
import { registerAction2 } from '../../../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { createInlineValueDecoration } from '../../../../debug/browser/debugEditorContribution.js';
import { IDebugService } from '../../../../debug/common/debug.js';
import { NotebookSetting } from '../../../common/notebookCommon.js';
import { INotebookExecutionStateService, NotebookExecutionType, } from '../../../common/notebookExecutionStateService.js';
import { INotebookKernelService } from '../../../common/notebookKernelService.js';
import { NotebookAction } from '../../controller/coreActions.js';
import { registerNotebookContribution } from '../../notebookEditorExtensions.js';
class InlineSegment {
    constructor(column, text) {
        this.column = column;
        this.text = text;
    }
}
let NotebookInlineVariablesController = class NotebookInlineVariablesController extends Disposable {
    static { NotebookInlineVariablesController_1 = this; }
    static { this.id = 'notebook.inlineVariablesController'; }
    static { this.MAX_CELL_LINES = 5000; } // Skip extremely large cells
    constructor(notebookEditor, notebookKernelService, notebookExecutionStateService, languageFeaturesService, configurationService, debugService) {
        super();
        this.notebookEditor = notebookEditor;
        this.notebookKernelService = notebookKernelService;
        this.notebookExecutionStateService = notebookExecutionStateService;
        this.languageFeaturesService = languageFeaturesService;
        this.configurationService = configurationService;
        this.debugService = debugService;
        this.cellDecorationIds = new Map();
        this.cellContentListeners = new ResourceMap();
        this.currentCancellationTokenSources = new ResourceMap();
        this._register(this.notebookExecutionStateService.onDidChangeExecution(async (e) => {
            const inlineValuesSetting = this.configurationService.getValue(NotebookSetting.notebookInlineValues);
            if (inlineValuesSetting === 'off') {
                return;
            }
            if (e.type === NotebookExecutionType.cell) {
                await this.updateInlineVariables(e);
            }
        }));
        this._register(Event.runAndSubscribe(this.configurationService.onDidChangeConfiguration, (e) => {
            if (!e || e.affectsConfiguration(NotebookSetting.notebookInlineValues)) {
                if (this.configurationService.getValue(NotebookSetting.notebookInlineValues) === 'off') {
                    this.clearNotebookInlineDecorations();
                }
            }
        }));
    }
    async updateInlineVariables(event) {
        if (event.changed) {
            // undefined -> execution was completed, so return on all else. no code should execute until we know it's an execution completion
            return;
        }
        const cell = this.notebookEditor.getCellByHandle(event.cellHandle);
        if (!cell) {
            return;
        }
        // Cancel any ongoing request in this cell
        const existingSource = this.currentCancellationTokenSources.get(cell.uri);
        if (existingSource) {
            existingSource.cancel();
        }
        // Create a new CancellationTokenSource for the new request per cell
        this.currentCancellationTokenSources.set(cell.uri, new CancellationTokenSource());
        const token = this.currentCancellationTokenSources.get(cell.uri).token;
        if (this.debugService.state !== 0 /* State.Inactive */) {
            this._clearNotebookInlineDecorations();
            return;
        }
        if (!this.notebookEditor.textModel?.uri ||
            !isEqual(this.notebookEditor.textModel.uri, event.notebook)) {
            return;
        }
        const model = await cell.resolveTextModel();
        if (!model) {
            return;
        }
        const inlineValuesSetting = this.configurationService.getValue(NotebookSetting.notebookInlineValues);
        const hasInlineValueProvider = this.languageFeaturesService.inlineValuesProvider.has(model);
        // Skip if setting is off or if auto and no provider is registered
        if (inlineValuesSetting === 'off' ||
            (inlineValuesSetting === 'auto' && !hasInlineValueProvider)) {
            return;
        }
        this.clearCellInlineDecorations(cell);
        const inlineDecorations = [];
        if (hasInlineValueProvider) {
            // use extension based provider, borrowed from https://github.com/microsoft/vscode/blob/main/src/vs/workbench/contrib/debug/browser/debugEditorContribution.ts#L679
            const lastLine = model.getLineCount();
            const lastColumn = model.getLineMaxColumn(lastLine);
            const ctx = {
                frameId: 0, // ignored, we won't have a stack from since not in a debug session
                stoppedLocation: new Range(lastLine, lastColumn, lastLine, lastColumn), // executing cell by cell, so "stopped" location would just be the end of document
            };
            const providers = this.languageFeaturesService.inlineValuesProvider.ordered(model).reverse();
            const lineDecorations = new Map();
            const fullCellRange = new Range(1, 1, lastLine, lastColumn);
            const promises = providers.flatMap((provider) => Promise.resolve(provider.provideInlineValues(model, fullCellRange, ctx, token)).then(async (result) => {
                if (!result) {
                    return;
                }
                const notebook = this.notebookEditor.textModel;
                if (!notebook) {
                    return;
                }
                const kernel = this.notebookKernelService.getMatchingKernel(notebook);
                const kernelVars = [];
                if (result.some((iv) => iv.type === 'variable')) {
                    // if anyone will need a lookup, get vars now to avoid needing to do it multiple times
                    if (!this.notebookEditor.hasModel()) {
                        return; // should not happen, a cell will be executed
                    }
                    const variables = kernel.selected?.provideVariables(event.notebook, undefined, 'named', 0, token);
                    if (variables) {
                        for await (const v of variables) {
                            kernelVars.push(v);
                        }
                    }
                }
                for (const iv of result) {
                    let text = undefined;
                    switch (iv.type) {
                        case 'text':
                            text = iv.text;
                            break;
                        case 'variable': {
                            const name = iv.variableName;
                            if (!name) {
                                continue; // skip to next var, no valid name to lookup with
                            }
                            const value = kernelVars.find((v) => v.name === name)?.value;
                            if (!value) {
                                continue;
                            }
                            text = format('{0} = {1}', name, value);
                            break;
                        }
                        case 'expression': {
                            continue; // no active debug session, so evaluate would break
                        }
                    }
                    if (text) {
                        const line = iv.range.startLineNumber;
                        let lineSegments = lineDecorations.get(line);
                        if (!lineSegments) {
                            lineSegments = [];
                            lineDecorations.set(line, lineSegments);
                        }
                        if (!lineSegments.some((iv) => iv.text === text)) {
                            // de-dupe
                            lineSegments.push(new InlineSegment(iv.range.startColumn, text));
                        }
                    }
                }
            }, (err) => {
                onUnexpectedExternalError(err);
            }));
            await Promise.all(promises);
            // sort line segments and concatenate them into a decoration
            lineDecorations.forEach((segments, line) => {
                if (segments.length > 0) {
                    segments.sort((a, b) => a.column - b.column);
                    const text = segments.map((s) => s.text).join(', ');
                    const editorWidth = cell.layoutInfo.editorWidth;
                    const fontInfo = cell.layoutInfo.fontInfo;
                    if (fontInfo && cell.textModel) {
                        const base = Math.floor((editorWidth - 50) / fontInfo.typicalHalfwidthCharacterWidth);
                        const lineLength = cell.textModel.getLineLength(line);
                        const available = Math.max(0, base - lineLength);
                        inlineDecorations.push(...createInlineValueDecoration(line, text, 'nb', undefined, available));
                    }
                    else {
                        inlineDecorations.push(...createInlineValueDecoration(line, text, 'nb'));
                    }
                }
            });
        }
        else if (inlineValuesSetting === 'on') {
            // fallback approach only when setting is 'on'
            if (!this.notebookEditor.hasModel()) {
                return; // should not happen, a cell will be executed
            }
            const kernel = this.notebookKernelService.getMatchingKernel(this.notebookEditor.textModel);
            const variables = kernel?.selected?.provideVariables(event.notebook, undefined, 'named', 0, token);
            if (!variables) {
                return;
            }
            const vars = [];
            for await (const v of variables) {
                vars.push(v);
            }
            const varNames = vars.map((v) => v.name);
            const document = cell.textModel;
            if (!document) {
                return;
            }
            // Skip processing for extremely large cells
            if (document.getLineCount() > NotebookInlineVariablesController_1.MAX_CELL_LINES) {
                return;
            }
            const inlineDecorations = [];
            const processedVars = new Set();
            // Get both function ranges and comment ranges
            const functionRanges = this.getFunctionRanges(document);
            const commentedRanges = this.getCommentedRanges(document);
            const ignoredRanges = [...functionRanges, ...commentedRanges];
            const lineDecorations = new Map();
            // For each variable name found in the kernel results
            for (const varName of varNames) {
                if (processedVars.has(varName)) {
                    continue;
                }
                // Look for variable usage globally - using word boundaries to ensure exact matches
                const regex = new RegExp(`\\b${varName}\\b(?!\\w)`, 'g');
                let lastMatchOutsideIgnored = null;
                let foundMatch = false;
                // Scan lines in reverse to find last occurrence first
                const lines = document.getValue().split('\n');
                for (let lineNumber = lines.length - 1; lineNumber >= 0; lineNumber--) {
                    const line = lines[lineNumber];
                    let match;
                    while ((match = regex.exec(line)) !== null) {
                        const startIndex = match.index;
                        const pos = new Position(lineNumber + 1, startIndex + 1);
                        // Check if this position is in any ignored range (function or comment)
                        if (!this.isPositionInRanges(pos, ignoredRanges)) {
                            lastMatchOutsideIgnored = {
                                line: lineNumber + 1,
                                column: startIndex + 1,
                            };
                            foundMatch = true;
                            break; // Take first match in reverse order (which is last chronologically)
                        }
                    }
                    if (foundMatch) {
                        break; // We found our last valid occurrence, no need to check earlier lines
                    }
                }
                if (lastMatchOutsideIgnored) {
                    const inlineVal = varName + ' = ' + vars.find((v) => v.name === varName)?.value;
                    let lineSegments = lineDecorations.get(lastMatchOutsideIgnored.line);
                    if (!lineSegments) {
                        lineSegments = [];
                        lineDecorations.set(lastMatchOutsideIgnored.line, lineSegments);
                    }
                    if (!lineSegments.some((iv) => iv.text === inlineVal)) {
                        // de-dupe
                        lineSegments.push(new InlineSegment(lastMatchOutsideIgnored.column, inlineVal));
                    }
                }
                processedVars.add(varName);
            }
            // sort line segments and concatenate them into a decoration
            lineDecorations.forEach((segments, line) => {
                if (segments.length > 0) {
                    segments.sort((a, b) => a.column - b.column);
                    const text = segments.map((s) => s.text).join(', ');
                    const editorWidth = cell.layoutInfo.editorWidth;
                    const fontInfo = cell.layoutInfo.fontInfo;
                    if (fontInfo && cell.textModel) {
                        const base = Math.floor((editorWidth - 50) / fontInfo.typicalHalfwidthCharacterWidth);
                        const lineLength = cell.textModel.getLineLength(line);
                        const available = Math.max(0, base - lineLength);
                        inlineDecorations.push(...createInlineValueDecoration(line, text, 'nb', undefined, available));
                    }
                    else {
                        inlineDecorations.push(...createInlineValueDecoration(line, text, 'nb'));
                    }
                }
            });
            if (inlineDecorations.length > 0) {
                this.updateCellInlineDecorations(cell, inlineDecorations);
                this.initCellContentListener(cell);
            }
        }
    }
    getFunctionRanges(document) {
        return document.getLanguageId() === 'python'
            ? this.getPythonFunctionRanges(document.getValue())
            : this.getBracedFunctionRanges(document.getValue());
    }
    getPythonFunctionRanges(code) {
        const functionRanges = [];
        const lines = code.split('\n');
        let functionStartLine = -1;
        let inFunction = false;
        let pythonIndentLevel = -1;
        const pythonFunctionDeclRegex = /^(\s*)(async\s+)?(?:def\s+\w+|class\s+\w+)\s*\([^)]*\)\s*:/;
        for (let lineNumber = 0; lineNumber < lines.length; lineNumber++) {
            const line = lines[lineNumber];
            // Check for Python function/class declarations
            const pythonMatch = line.match(pythonFunctionDeclRegex);
            if (pythonMatch) {
                if (inFunction) {
                    // If we're already in a function and find another at the same or lower indent, close the current one
                    const currentIndent = pythonMatch[1].length;
                    if (currentIndent <= pythonIndentLevel) {
                        functionRanges.push(new Range(functionStartLine + 1, 1, lineNumber, line.length + 1));
                        inFunction = false;
                    }
                }
                if (!inFunction) {
                    inFunction = true;
                    functionStartLine = lineNumber;
                    pythonIndentLevel = pythonMatch[1].length;
                }
                continue;
            }
            // Check indentation for Python functions
            if (inFunction) {
                // Skip empty lines
                if (line.trim() === '') {
                    continue;
                }
                // Get the indentation of the current line
                const currentIndent = line.match(/^\s*/)?.[0].length ?? 0;
                // If we hit a line with same or lower indentation than where the function started,
                // we've exited the function
                if (currentIndent <= pythonIndentLevel) {
                    functionRanges.push(new Range(functionStartLine + 1, 1, lineNumber, line.length + 1));
                    inFunction = false;
                    pythonIndentLevel = -1;
                }
            }
        }
        // Handle case where Python function is at the end of the document
        if (inFunction) {
            functionRanges.push(new Range(functionStartLine + 1, 1, lines.length, lines[lines.length - 1].length + 1));
        }
        return functionRanges;
    }
    getBracedFunctionRanges(code) {
        const functionRanges = [];
        const lines = code.split('\n');
        let braceDepth = 0;
        let functionStartLine = -1;
        let inFunction = false;
        const functionDeclRegex = /\b(?:function\s+\w+|(?:async\s+)?(?:\w+\s*=\s*)?\([^)]*\)\s*=>|class\s+\w+|(?:public|private|protected|static)?\s*\w+\s*\([^)]*\)\s*{)/;
        for (let lineNumber = 0; lineNumber < lines.length; lineNumber++) {
            const line = lines[lineNumber];
            for (const char of line) {
                if (char === '{') {
                    if (!inFunction && functionDeclRegex.test(line)) {
                        inFunction = true;
                        functionStartLine = lineNumber;
                    }
                    braceDepth++;
                }
                else if (char === '}') {
                    braceDepth--;
                    if (braceDepth === 0 && inFunction) {
                        functionRanges.push(new Range(functionStartLine + 1, 1, lineNumber + 1, line.length + 1));
                        inFunction = false;
                    }
                }
            }
        }
        return functionRanges;
    }
    getCommentedRanges(document) {
        return this._getCommentedRanges(document);
    }
    _getCommentedRanges(document) {
        try {
            return this.getCommentedRangesByAccurateTokenization(document);
        }
        catch (e) {
            // Fall back to manual parsing if tokenization fails
            return this.getCommentedRangesByManualParsing(document);
        }
    }
    getCommentedRangesByAccurateTokenization(document) {
        const commentRanges = [];
        const lineCount = document.getLineCount();
        // Skip processing for extremely large documents
        if (lineCount > NotebookInlineVariablesController_1.MAX_CELL_LINES) {
            return commentRanges;
        }
        // Process each line - force tokenization if needed and process tokens in a single pass
        for (let lineNumber = 1; lineNumber <= lineCount; lineNumber++) {
            // Force tokenization if needed
            if (!document.tokenization.hasAccurateTokensForLine(lineNumber)) {
                document.tokenization.forceTokenization(lineNumber);
            }
            const lineTokens = document.tokenization.getLineTokens(lineNumber);
            // Skip lines with no tokens
            if (lineTokens.getCount() === 0) {
                continue;
            }
            let startCharacter;
            // Check each token in the line
            for (let tokenIndex = 0; tokenIndex < lineTokens.getCount(); tokenIndex++) {
                const tokenType = lineTokens.getStandardTokenType(tokenIndex);
                if (tokenType === 1 /* StandardTokenType.Comment */ ||
                    tokenType === 2 /* StandardTokenType.String */ ||
                    tokenType === 3 /* StandardTokenType.RegEx */) {
                    if (startCharacter === undefined) {
                        // Start of a comment or string
                        startCharacter = lineTokens.getStartOffset(tokenIndex);
                    }
                    const endCharacter = lineTokens.getEndOffset(tokenIndex);
                    // Check if this is the end of the comment/string section (either end of line or different token type follows)
                    const isLastToken = tokenIndex === lineTokens.getCount() - 1;
                    const nextTokenDifferent = !isLastToken && lineTokens.getStandardTokenType(tokenIndex + 1) !== tokenType;
                    if (isLastToken || nextTokenDifferent) {
                        // End of comment/string section
                        commentRanges.push(new Range(lineNumber, startCharacter + 1, lineNumber, endCharacter + 1));
                        startCharacter = undefined;
                    }
                }
                else {
                    // Reset when we hit a non-comment, non-string token
                    startCharacter = undefined;
                }
            }
        }
        return commentRanges;
    }
    getCommentedRangesByManualParsing(document) {
        const commentRanges = [];
        const lines = document.getValue().split('\n');
        const languageId = document.getLanguageId();
        // Different comment patterns by language
        const lineCommentToken = languageId === 'python'
            ? '#'
            : languageId === 'javascript' || languageId === 'typescript'
                ? '//'
                : null;
        const blockComments = languageId === 'javascript' || languageId === 'typescript' ? { start: '/*', end: '*/' } : null;
        let inBlockComment = false;
        let blockCommentStartLine = -1;
        let blockCommentStartCol = -1;
        for (let lineNumber = 0; lineNumber < lines.length; lineNumber++) {
            const line = lines[lineNumber];
            const trimmedLine = line.trim();
            // Skip empty lines
            if (trimmedLine.length === 0) {
                continue;
            }
            if (blockComments) {
                if (!inBlockComment) {
                    const startIndex = line.indexOf(blockComments.start);
                    if (startIndex !== -1) {
                        inBlockComment = true;
                        blockCommentStartLine = lineNumber;
                        blockCommentStartCol = startIndex;
                    }
                }
                if (inBlockComment) {
                    const endIndex = line.indexOf(blockComments.end);
                    if (endIndex !== -1) {
                        commentRanges.push(new Range(blockCommentStartLine + 1, blockCommentStartCol + 1, lineNumber + 1, endIndex + blockComments.end.length + 1));
                        inBlockComment = false;
                    }
                    continue;
                }
            }
            if (!inBlockComment && lineCommentToken && line.trimLeft().startsWith(lineCommentToken)) {
                const startCol = line.indexOf(lineCommentToken);
                commentRanges.push(new Range(lineNumber + 1, startCol + 1, lineNumber + 1, line.length + 1));
            }
        }
        // Handle block comment at end of file
        if (inBlockComment) {
            commentRanges.push(new Range(blockCommentStartLine + 1, blockCommentStartCol + 1, lines.length, lines[lines.length - 1].length + 1));
        }
        return commentRanges;
    }
    isPositionInRanges(position, ranges) {
        return ranges.some((range) => range.containsPosition(position));
    }
    updateCellInlineDecorations(cell, decorations) {
        const oldDecorations = this.cellDecorationIds.get(cell) ?? [];
        this.cellDecorationIds.set(cell, cell.deltaModelDecorations(oldDecorations, decorations));
    }
    initCellContentListener(cell) {
        const cellModel = cell.textModel;
        if (!cellModel) {
            return; // should not happen
        }
        // Clear decorations on content change
        this.cellContentListeners.set(cell.uri, cellModel.onDidChangeContent(() => {
            this.clearCellInlineDecorations(cell);
        }));
    }
    clearCellInlineDecorations(cell) {
        const cellDecorations = this.cellDecorationIds.get(cell) ?? [];
        if (cellDecorations) {
            cell.deltaModelDecorations(cellDecorations, []);
            this.cellDecorationIds.delete(cell);
        }
        const listener = this.cellContentListeners.get(cell.uri);
        if (listener) {
            listener.dispose();
            this.cellContentListeners.delete(cell.uri);
        }
    }
    _clearNotebookInlineDecorations() {
        this.cellDecorationIds.forEach((_, cell) => {
            this.clearCellInlineDecorations(cell);
        });
    }
    clearNotebookInlineDecorations() {
        this._clearNotebookInlineDecorations();
    }
    dispose() {
        super.dispose();
        this._clearNotebookInlineDecorations();
        this.currentCancellationTokenSources.forEach((source) => source.cancel());
        this.currentCancellationTokenSources.clear();
        this.cellContentListeners.forEach((listener) => listener.dispose());
        this.cellContentListeners.clear();
    }
};
NotebookInlineVariablesController = NotebookInlineVariablesController_1 = __decorate([
    __param(1, INotebookKernelService),
    __param(2, INotebookExecutionStateService),
    __param(3, ILanguageFeaturesService),
    __param(4, IConfigurationService),
    __param(5, IDebugService)
], NotebookInlineVariablesController);
export { NotebookInlineVariablesController };
registerNotebookContribution(NotebookInlineVariablesController.id, NotebookInlineVariablesController);
registerAction2(class ClearNotebookInlineValues extends NotebookAction {
    constructor() {
        super({
            id: 'notebook.clearAllInlineValues',
            title: localize('clearAllInlineValues', 'Clear All Inline Values'),
        });
    }
    runWithContext(accessor, context) {
        const editor = context.notebookEditor;
        const controller = editor.getContribution(NotebookInlineVariablesController.id);
        controller.clearNotebookInlineDecorations();
        return Promise.resolve();
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tJbmxpbmVWYXJpYWJsZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL2NvbnRyaWIvbm90ZWJvb2tWYXJpYWJsZXMvbm90ZWJvb2tJbmxpbmVWYXJpYWJsZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ25GLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsVUFBVSxFQUFlLE1BQU0sNENBQTRDLENBQUE7QUFDcEYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDakUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQzNFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQVFyRSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQTtBQUN2RyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDbkQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGtFQUFrRSxDQUFBO0FBRXhHLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxhQUFhLEVBQVMs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