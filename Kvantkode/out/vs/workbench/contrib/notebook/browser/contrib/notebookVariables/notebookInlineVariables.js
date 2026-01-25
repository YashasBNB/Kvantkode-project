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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tJbmxpbmVWYXJpYWJsZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvY29udHJpYi9ub3RlYm9va1ZhcmlhYmxlcy9ub3RlYm9va0lubGluZVZhcmlhYmxlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDdkYsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDbkYsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQzlELE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNwRixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDbEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDM0UsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBUXJFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDhEQUE4RCxDQUFBO0FBQ3ZHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDdEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUE7QUFFeEcsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDbEcsT0FBTyxFQUFFLGFBQWEs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