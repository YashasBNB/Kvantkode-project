/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { asArray, coalesce, isFalsyOrEmpty, isNonEmptyArray } from '../../../base/common/arrays.js';
import { raceCancellationError } from '../../../base/common/async.js';
import { CancellationToken } from '../../../base/common/cancellation.js';
import { NotImplementedError, isCancellationError } from '../../../base/common/errors.js';
import { IdGenerator } from '../../../base/common/idGenerator.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
import { equals, mixin } from '../../../base/common/objects.js';
import { StopWatch } from '../../../base/common/stopwatch.js';
import { regExpLeadsToEndlessLoop } from '../../../base/common/strings.js';
import { assertType, isObject } from '../../../base/common/types.js';
import { URI } from '../../../base/common/uri.js';
import { generateUuid } from '../../../base/common/uuid.js';
import { Range as EditorRange } from '../../../editor/common/core/range.js';
import { Selection } from '../../../editor/common/core/selection.js';
import * as languages from '../../../editor/common/languages.js';
import { encodeSemanticTokensDto } from '../../../editor/common/services/semanticTokensDto.js';
import { localize } from '../../../nls.js';
import { ExtensionIdentifier, } from '../../../platform/extensions/common/extensions.js';
import { checkProposedApiEnabled, isProposedApiEnabled, } from '../../services/extensions/common/extensions.js';
import { Cache } from './cache.js';
import * as extHostProtocol from './extHost.protocol.js';
import * as typeConvert from './extHostTypeConverters.js';
import { CodeAction, CodeActionKind, CompletionList, DataTransfer, Disposable, DocumentDropOrPasteEditKind, DocumentSymbol, InlineCompletionTriggerKind, InlineEditTriggerKind, InternalDataTransferItem, Location, NewSymbolNameTriggerKind, Range, SemanticTokens, SemanticTokensEdit, SemanticTokensEdits, SnippetString, SyntaxTokenType, } from './extHostTypes.js';
// --- adapter
class DocumentSymbolAdapter {
    constructor(_documents, _provider) {
        this._documents = _documents;
        this._provider = _provider;
    }
    async provideDocumentSymbols(resource, token) {
        const doc = this._documents.getDocument(resource);
        const value = await this._provider.provideDocumentSymbols(doc, token);
        if (isFalsyOrEmpty(value)) {
            return undefined;
        }
        else if (value[0] instanceof DocumentSymbol) {
            return value.map(typeConvert.DocumentSymbol.from);
        }
        else {
            return DocumentSymbolAdapter._asDocumentSymbolTree(value);
        }
    }
    static _asDocumentSymbolTree(infos) {
        // first sort by start (and end) and then loop over all elements
        // and build a tree based on containment.
        infos = infos.slice(0).sort((a, b) => {
            let res = a.location.range.start.compareTo(b.location.range.start);
            if (res === 0) {
                res = b.location.range.end.compareTo(a.location.range.end);
            }
            return res;
        });
        const res = [];
        const parentStack = [];
        for (const info of infos) {
            const element = {
                name: info.name || '!!MISSING: name!!',
                kind: typeConvert.SymbolKind.from(info.kind),
                tags: info.tags?.map(typeConvert.SymbolTag.from) || [],
                detail: '',
                containerName: info.containerName,
                range: typeConvert.Range.from(info.location.range),
                selectionRange: typeConvert.Range.from(info.location.range),
                children: [],
            };
            while (true) {
                if (parentStack.length === 0) {
                    parentStack.push(element);
                    res.push(element);
                    break;
                }
                const parent = parentStack[parentStack.length - 1];
                if (EditorRange.containsRange(parent.range, element.range) &&
                    !EditorRange.equalsRange(parent.range, element.range)) {
                    parent.children?.push(element);
                    parentStack.push(element);
                    break;
                }
                parentStack.pop();
            }
        }
        return res;
    }
}
class CodeLensAdapter {
    constructor(_documents, _commands, _provider, _extension, _extTelemetry, _logService) {
        this._documents = _documents;
        this._commands = _commands;
        this._provider = _provider;
        this._extension = _extension;
        this._extTelemetry = _extTelemetry;
        this._logService = _logService;
        this._cache = new Cache('CodeLens');
        this._disposables = new Map();
    }
    async provideCodeLenses(resource, token) {
        const doc = this._documents.getDocument(resource);
        const lenses = await this._provider.provideCodeLenses(doc, token);
        if (!lenses || token.isCancellationRequested) {
            return undefined;
        }
        const cacheId = this._cache.add(lenses);
        const disposables = new DisposableStore();
        this._disposables.set(cacheId, disposables);
        const result = {
            cacheId,
            lenses: [],
        };
        for (let i = 0; i < lenses.length; i++) {
            if (!Range.isRange(lenses[i].range)) {
                console.warn('INVALID code lens, range is not defined', this._extension.identifier.value);
                continue;
            }
            result.lenses.push({
                cacheId: [cacheId, i],
                range: typeConvert.Range.from(lenses[i].range),
                command: this._commands.toInternal(lenses[i].command, disposables),
            });
        }
        return result;
    }
    async resolveCodeLens(symbol, token) {
        const lens = symbol.cacheId && this._cache.get(...symbol.cacheId);
        if (!lens) {
            return undefined;
        }
        let resolvedLens;
        if (typeof this._provider.resolveCodeLens !== 'function' || lens.isResolved) {
            resolvedLens = lens;
        }
        else {
            resolvedLens = await this._provider.resolveCodeLens(lens, token);
        }
        if (!resolvedLens) {
            resolvedLens = lens;
        }
        if (token.isCancellationRequested) {
            return undefined;
        }
        const disposables = symbol.cacheId && this._disposables.get(symbol.cacheId[0]);
        if (!disposables) {
            // disposed in the meantime
            return undefined;
        }
        if (!resolvedLens.command) {
            const error = new Error('INVALID code lens resolved, lacks command: ' + this._extension.identifier.value);
            this._extTelemetry.onExtensionError(this._extension.identifier, error);
            this._logService.error(error);
            return undefined;
        }
        symbol.command = this._commands.toInternal(resolvedLens.command, disposables);
        return symbol;
    }
    releaseCodeLenses(cachedId) {
        this._disposables.get(cachedId)?.dispose();
        this._disposables.delete(cachedId);
        this._cache.delete(cachedId);
    }
}
function convertToLocationLinks(value) {
    if (Array.isArray(value)) {
        return value.map(typeConvert.DefinitionLink.from);
    }
    else if (value) {
        return [typeConvert.DefinitionLink.from(value)];
    }
    return [];
}
class DefinitionAdapter {
    constructor(_documents, _provider) {
        this._documents = _documents;
        this._provider = _provider;
    }
    async provideDefinition(resource, position, token) {
        const doc = this._documents.getDocument(resource);
        const pos = typeConvert.Position.to(position);
        const value = await this._provider.provideDefinition(doc, pos, token);
        return convertToLocationLinks(value);
    }
}
class DeclarationAdapter {
    constructor(_documents, _provider) {
        this._documents = _documents;
        this._provider = _provider;
    }
    async provideDeclaration(resource, position, token) {
        const doc = this._documents.getDocument(resource);
        const pos = typeConvert.Position.to(position);
        const value = await this._provider.provideDeclaration(doc, pos, token);
        return convertToLocationLinks(value);
    }
}
class ImplementationAdapter {
    constructor(_documents, _provider) {
        this._documents = _documents;
        this._provider = _provider;
    }
    async provideImplementation(resource, position, token) {
        const doc = this._documents.getDocument(resource);
        const pos = typeConvert.Position.to(position);
        const value = await this._provider.provideImplementation(doc, pos, token);
        return convertToLocationLinks(value);
    }
}
class TypeDefinitionAdapter {
    constructor(_documents, _provider) {
        this._documents = _documents;
        this._provider = _provider;
    }
    async provideTypeDefinition(resource, position, token) {
        const doc = this._documents.getDocument(resource);
        const pos = typeConvert.Position.to(position);
        const value = await this._provider.provideTypeDefinition(doc, pos, token);
        return convertToLocationLinks(value);
    }
}
class HoverAdapter {
    static { this.HOVER_MAP_MAX_SIZE = 10; }
    constructor(_documents, _provider) {
        this._documents = _documents;
        this._provider = _provider;
        this._hoverCounter = 0;
        this._hoverMap = new Map();
    }
    async provideHover(resource, position, context, token) {
        const doc = this._documents.getDocument(resource);
        const pos = typeConvert.Position.to(position);
        let value;
        if (context && context.verbosityRequest) {
            const previousHoverId = context.verbosityRequest.previousHover.id;
            const previousHover = this._hoverMap.get(previousHoverId);
            if (!previousHover) {
                throw new Error(`Hover with id ${previousHoverId} not found`);
            }
            const hoverContext = {
                verbosityDelta: context.verbosityRequest.verbosityDelta,
                previousHover,
            };
            value = await this._provider.provideHover(doc, pos, token, hoverContext);
        }
        else {
            value = await this._provider.provideHover(doc, pos, token);
        }
        if (!value || isFalsyOrEmpty(value.contents)) {
            return undefined;
        }
        if (!value.range) {
            value.range = doc.getWordRangeAtPosition(pos);
        }
        if (!value.range) {
            value.range = new Range(pos, pos);
        }
        const convertedHover = typeConvert.Hover.from(value);
        const id = this._hoverCounter;
        // Check if hover map has more than 10 elements and if yes, remove oldest from the map
        if (this._hoverMap.size === HoverAdapter.HOVER_MAP_MAX_SIZE) {
            const minimumId = Math.min(...this._hoverMap.keys());
            this._hoverMap.delete(minimumId);
        }
        this._hoverMap.set(id, value);
        this._hoverCounter += 1;
        const hover = {
            ...convertedHover,
            id,
        };
        return hover;
    }
    releaseHover(id) {
        this._hoverMap.delete(id);
    }
}
class EvaluatableExpressionAdapter {
    constructor(_documents, _provider) {
        this._documents = _documents;
        this._provider = _provider;
    }
    async provideEvaluatableExpression(resource, position, token) {
        const doc = this._documents.getDocument(resource);
        const pos = typeConvert.Position.to(position);
        const value = await this._provider.provideEvaluatableExpression(doc, pos, token);
        if (value) {
            return typeConvert.EvaluatableExpression.from(value);
        }
        return undefined;
    }
}
class InlineValuesAdapter {
    constructor(_documents, _provider) {
        this._documents = _documents;
        this._provider = _provider;
    }
    async provideInlineValues(resource, viewPort, context, token) {
        const doc = this._documents.getDocument(resource);
        const value = await this._provider.provideInlineValues(doc, typeConvert.Range.to(viewPort), typeConvert.InlineValueContext.to(context), token);
        if (Array.isArray(value)) {
            return value.map((iv) => typeConvert.InlineValue.from(iv));
        }
        return undefined;
    }
}
class DocumentHighlightAdapter {
    constructor(_documents, _provider) {
        this._documents = _documents;
        this._provider = _provider;
    }
    async provideDocumentHighlights(resource, position, token) {
        const doc = this._documents.getDocument(resource);
        const pos = typeConvert.Position.to(position);
        const value = await this._provider.provideDocumentHighlights(doc, pos, token);
        if (Array.isArray(value)) {
            return value.map(typeConvert.DocumentHighlight.from);
        }
        return undefined;
    }
}
class MultiDocumentHighlightAdapter {
    constructor(_documents, _provider, _logService) {
        this._documents = _documents;
        this._provider = _provider;
        this._logService = _logService;
    }
    async provideMultiDocumentHighlights(resource, position, otherResources, token) {
        const doc = this._documents.getDocument(resource);
        const otherDocuments = otherResources
            .map((r) => {
            try {
                return this._documents.getDocument(r);
            }
            catch (err) {
                this._logService.error('Error: Unable to retrieve document from URI: ' + r + '. Error message: ' + err);
                return undefined;
            }
        })
            .filter((doc) => doc !== undefined);
        const pos = typeConvert.Position.to(position);
        const value = await this._provider.provideMultiDocumentHighlights(doc, pos, otherDocuments, token);
        if (Array.isArray(value)) {
            return value.map(typeConvert.MultiDocumentHighlight.from);
        }
        return undefined;
    }
}
class LinkedEditingRangeAdapter {
    constructor(_documents, _provider) {
        this._documents = _documents;
        this._provider = _provider;
    }
    async provideLinkedEditingRanges(resource, position, token) {
        const doc = this._documents.getDocument(resource);
        const pos = typeConvert.Position.to(position);
        const value = await this._provider.provideLinkedEditingRanges(doc, pos, token);
        if (value && Array.isArray(value.ranges)) {
            return {
                ranges: coalesce(value.ranges.map(typeConvert.Range.from)),
                wordPattern: value.wordPattern,
            };
        }
        return undefined;
    }
}
class ReferenceAdapter {
    constructor(_documents, _provider) {
        this._documents = _documents;
        this._provider = _provider;
    }
    async provideReferences(resource, position, context, token) {
        const doc = this._documents.getDocument(resource);
        const pos = typeConvert.Position.to(position);
        const value = await this._provider.provideReferences(doc, pos, context, token);
        if (Array.isArray(value)) {
            return value.map(typeConvert.location.from);
        }
        return undefined;
    }
}
class CodeActionAdapter {
    static { this._maxCodeActionsPerFile = 1000; }
    constructor(_documents, _commands, _diagnostics, _provider, _logService, _extension, _apiDeprecation) {
        this._documents = _documents;
        this._commands = _commands;
        this._diagnostics = _diagnostics;
        this._provider = _provider;
        this._logService = _logService;
        this._extension = _extension;
        this._apiDeprecation = _apiDeprecation;
        this._cache = new Cache('CodeAction');
        this._disposables = new Map();
    }
    async provideCodeActions(resource, rangeOrSelection, context, token) {
        const doc = this._documents.getDocument(resource);
        const ran = Selection.isISelection(rangeOrSelection)
            ? typeConvert.Selection.to(rangeOrSelection)
            : typeConvert.Range.to(rangeOrSelection);
        const allDiagnostics = [];
        for (const diagnostic of this._diagnostics.getDiagnostics(resource)) {
            if (ran.intersection(diagnostic.range)) {
                const newLen = allDiagnostics.push(diagnostic);
                if (newLen > CodeActionAdapter._maxCodeActionsPerFile) {
                    break;
                }
            }
        }
        const codeActionContext = {
            diagnostics: allDiagnostics,
            only: context.only ? new CodeActionKind(context.only) : undefined,
            triggerKind: typeConvert.CodeActionTriggerKind.to(context.trigger),
        };
        const commandsOrActions = await this._provider.provideCodeActions(doc, ran, codeActionContext, token);
        if (!isNonEmptyArray(commandsOrActions) || token.isCancellationRequested) {
            return undefined;
        }
        const cacheId = this._cache.add(commandsOrActions);
        const disposables = new DisposableStore();
        this._disposables.set(cacheId, disposables);
        const actions = [];
        for (let i = 0; i < commandsOrActions.length; i++) {
            const candidate = commandsOrActions[i];
            if (!candidate) {
                continue;
            }
            if (CodeActionAdapter._isCommand(candidate) && !(candidate instanceof CodeAction)) {
                // old school: synthetic code action
                this._apiDeprecation.report('CodeActionProvider.provideCodeActions - return commands', this._extension, `Return 'CodeAction' instances instead.`);
                actions.push({
                    _isSynthetic: true,
                    title: candidate.title,
                    command: this._commands.toInternal(candidate, disposables),
                });
            }
            else {
                const toConvert = candidate;
                // new school: convert code action
                if (codeActionContext.only) {
                    if (!toConvert.kind) {
                        this._logService.warn(`${this._extension.identifier.value} - Code actions of kind '${codeActionContext.only.value}' requested but returned code action does not have a 'kind'. Code action will be dropped. Please set 'CodeAction.kind'.`);
                    }
                    else if (!codeActionContext.only.contains(toConvert.kind)) {
                        this._logService.warn(`${this._extension.identifier.value} - Code actions of kind '${codeActionContext.only.value}' requested but returned code action is of kind '${toConvert.kind.value}'. Code action will be dropped. Please check 'CodeActionContext.only' to only return requested code actions.`);
                    }
                }
                // Ensures that this is either a Range[] or an empty array so we don't get Array<Range | undefined>
                const range = toConvert.ranges ?? [];
                actions.push({
                    cacheId: [cacheId, i],
                    title: toConvert.title,
                    command: toConvert.command && this._commands.toInternal(toConvert.command, disposables),
                    diagnostics: toConvert.diagnostics && toConvert.diagnostics.map(typeConvert.Diagnostic.from),
                    edit: toConvert.edit && typeConvert.WorkspaceEdit.from(toConvert.edit, undefined),
                    kind: toConvert.kind && toConvert.kind.value,
                    isPreferred: toConvert.isPreferred,
                    isAI: isProposedApiEnabled(this._extension, 'codeActionAI') ? toConvert.isAI : false,
                    ranges: isProposedApiEnabled(this._extension, 'codeActionRanges')
                        ? coalesce(range.map(typeConvert.Range.from))
                        : undefined,
                    disabled: toConvert.disabled?.reason,
                });
            }
        }
        return { cacheId, actions };
    }
    async resolveCodeAction(id, token) {
        const [sessionId, itemId] = id;
        const item = this._cache.get(sessionId, itemId);
        if (!item || CodeActionAdapter._isCommand(item)) {
            return {}; // code actions only!
        }
        if (!this._provider.resolveCodeAction) {
            return {}; // this should not happen...
        }
        const resolvedItem = (await this._provider.resolveCodeAction(item, token)) ?? item;
        let resolvedEdit;
        if (resolvedItem.edit) {
            resolvedEdit = typeConvert.WorkspaceEdit.from(resolvedItem.edit, undefined);
        }
        let resolvedCommand;
        if (resolvedItem.command) {
            const disposables = this._disposables.get(sessionId);
            if (disposables) {
                resolvedCommand = this._commands.toInternal(resolvedItem.command, disposables);
            }
        }
        return { edit: resolvedEdit, command: resolvedCommand };
    }
    releaseCodeActions(cachedId) {
        this._disposables.get(cachedId)?.dispose();
        this._disposables.delete(cachedId);
        this._cache.delete(cachedId);
    }
    static _isCommand(thing) {
        return (typeof thing.command === 'string' &&
            typeof thing.title === 'string');
    }
}
class DocumentPasteEditProvider {
    constructor(_proxy, _documents, _provider, _handle, _extension) {
        this._proxy = _proxy;
        this._documents = _documents;
        this._provider = _provider;
        this._handle = _handle;
        this._extension = _extension;
        this._editsCache = new Cache('DocumentPasteEdit.edits');
    }
    async prepareDocumentPaste(resource, ranges, dataTransferDto, token) {
        if (!this._provider.prepareDocumentPaste) {
            return;
        }
        this._cachedPrepare = undefined;
        const doc = this._documents.getDocument(resource);
        const vscodeRanges = ranges.map((range) => typeConvert.Range.to(range));
        const dataTransfer = typeConvert.DataTransfer.toDataTransfer(dataTransferDto, () => {
            throw new NotImplementedError();
        });
        await this._provider.prepareDocumentPaste(doc, vscodeRanges, dataTransfer, token);
        if (token.isCancellationRequested) {
            return;
        }
        // Only send back values that have been added to the data transfer
        const newEntries = Array.from(dataTransfer).filter(([, value]) => !(value instanceof InternalDataTransferItem));
        // Store off original data transfer items so we can retrieve them on paste
        const newCache = new Map();
        const items = await Promise.all(Array.from(newEntries, async ([mime, value]) => {
            const id = generateUuid();
            newCache.set(id, value);
            return [mime, await typeConvert.DataTransferItem.from(mime, value, id)];
        }));
        this._cachedPrepare = newCache;
        return { items };
    }
    async providePasteEdits(requestId, resource, ranges, dataTransferDto, context, token) {
        if (!this._provider.provideDocumentPasteEdits) {
            return [];
        }
        const doc = this._documents.getDocument(resource);
        const vscodeRanges = ranges.map((range) => typeConvert.Range.to(range));
        const items = dataTransferDto.items.map(([mime, value]) => {
            const cached = this._cachedPrepare?.get(value.id);
            if (cached) {
                return [mime, cached];
            }
            return [
                mime,
                typeConvert.DataTransferItem.to(mime, value, async (id) => {
                    return (await this._proxy.$resolvePasteFileData(this._handle, requestId, id)).buffer;
                }),
            ];
        });
        const dataTransfer = new DataTransfer(items);
        const edits = await this._provider.provideDocumentPasteEdits(doc, vscodeRanges, dataTransfer, {
            only: context.only ? new DocumentDropOrPasteEditKind(context.only) : undefined,
            triggerKind: context.triggerKind,
        }, token);
        if (!edits || token.isCancellationRequested) {
            return [];
        }
        const cacheId = this._editsCache.add(edits);
        return edits.map((edit, i) => ({
            _cacheId: [cacheId, i],
            title: edit.title ??
                localize('defaultPasteLabel', "Paste using '{0}' extension", this._extension.displayName || this._extension.name),
            kind: edit.kind,
            yieldTo: edit.yieldTo?.map((x) => x.value),
            insertText: typeof edit.insertText === 'string'
                ? edit.insertText
                : { snippet: edit.insertText.value },
            additionalEdit: edit.additionalEdit
                ? typeConvert.WorkspaceEdit.from(edit.additionalEdit, undefined)
                : undefined,
        }));
    }
    async resolvePasteEdit(id, token) {
        const [sessionId, itemId] = id;
        const item = this._editsCache.get(sessionId, itemId);
        if (!item || !this._provider.resolveDocumentPasteEdit) {
            return {}; // this should not happen...
        }
        const resolvedItem = (await this._provider.resolveDocumentPasteEdit(item, token)) ?? item;
        return {
            insertText: resolvedItem.insertText,
            additionalEdit: resolvedItem.additionalEdit
                ? typeConvert.WorkspaceEdit.from(resolvedItem.additionalEdit, undefined)
                : undefined,
        };
    }
    releasePasteEdits(id) {
        this._editsCache.delete(id);
    }
}
class DocumentFormattingAdapter {
    constructor(_documents, _provider) {
        this._documents = _documents;
        this._provider = _provider;
    }
    async provideDocumentFormattingEdits(resource, options, token) {
        const document = this._documents.getDocument(resource);
        const value = await this._provider.provideDocumentFormattingEdits(document, options, token);
        if (Array.isArray(value)) {
            return value.map(typeConvert.TextEdit.from);
        }
        return undefined;
    }
}
class RangeFormattingAdapter {
    constructor(_documents, _provider) {
        this._documents = _documents;
        this._provider = _provider;
    }
    async provideDocumentRangeFormattingEdits(resource, range, options, token) {
        const document = this._documents.getDocument(resource);
        const ran = typeConvert.Range.to(range);
        const value = await this._provider.provideDocumentRangeFormattingEdits(document, ran, options, token);
        if (Array.isArray(value)) {
            return value.map(typeConvert.TextEdit.from);
        }
        return undefined;
    }
    async provideDocumentRangesFormattingEdits(resource, ranges, options, token) {
        assertType(typeof this._provider.provideDocumentRangesFormattingEdits === 'function', 'INVALID invocation of `provideDocumentRangesFormattingEdits`');
        const document = this._documents.getDocument(resource);
        const _ranges = ranges.map(typeConvert.Range.to);
        const value = await this._provider.provideDocumentRangesFormattingEdits(document, _ranges, options, token);
        if (Array.isArray(value)) {
            return value.map(typeConvert.TextEdit.from);
        }
        return undefined;
    }
}
class OnTypeFormattingAdapter {
    constructor(_documents, _provider) {
        this._documents = _documents;
        this._provider = _provider;
        this.autoFormatTriggerCharacters = []; // not here
    }
    async provideOnTypeFormattingEdits(resource, position, ch, options, token) {
        const document = this._documents.getDocument(resource);
        const pos = typeConvert.Position.to(position);
        const value = await this._provider.provideOnTypeFormattingEdits(document, pos, ch, options, token);
        if (Array.isArray(value)) {
            return value.map(typeConvert.TextEdit.from);
        }
        return undefined;
    }
}
class NavigateTypeAdapter {
    constructor(_provider, _logService) {
        this._provider = _provider;
        this._logService = _logService;
        this._cache = new Cache('WorkspaceSymbols');
    }
    async provideWorkspaceSymbols(search, token) {
        const value = await this._provider.provideWorkspaceSymbols(search, token);
        if (!isNonEmptyArray(value)) {
            return { symbols: [] };
        }
        const sid = this._cache.add(value);
        const result = {
            cacheId: sid,
            symbols: [],
        };
        for (let i = 0; i < value.length; i++) {
            const item = value[i];
            if (!item || !item.name) {
                this._logService.warn('INVALID SymbolInformation', item);
                continue;
            }
            result.symbols.push({
                ...typeConvert.WorkspaceSymbol.from(item),
                cacheId: [sid, i],
            });
        }
        return result;
    }
    async resolveWorkspaceSymbol(symbol, token) {
        if (typeof this._provider.resolveWorkspaceSymbol !== 'function') {
            return symbol;
        }
        if (!symbol.cacheId) {
            return symbol;
        }
        const item = this._cache.get(...symbol.cacheId);
        if (item) {
            const value = await this._provider.resolveWorkspaceSymbol(item, token);
            return value && mixin(symbol, typeConvert.WorkspaceSymbol.from(value), true);
        }
        return undefined;
    }
    releaseWorkspaceSymbols(id) {
        this._cache.delete(id);
    }
}
class RenameAdapter {
    static supportsResolving(provider) {
        return typeof provider.prepareRename === 'function';
    }
    constructor(_documents, _provider, _logService) {
        this._documents = _documents;
        this._provider = _provider;
        this._logService = _logService;
    }
    async provideRenameEdits(resource, position, newName, token) {
        const doc = this._documents.getDocument(resource);
        const pos = typeConvert.Position.to(position);
        try {
            const value = await this._provider.provideRenameEdits(doc, pos, newName, token);
            if (!value) {
                return undefined;
            }
            return typeConvert.WorkspaceEdit.from(value);
        }
        catch (err) {
            const rejectReason = RenameAdapter._asMessage(err);
            if (rejectReason) {
                return { rejectReason, edits: undefined };
            }
            else {
                // generic error
                return Promise.reject(err);
            }
        }
    }
    async resolveRenameLocation(resource, position, token) {
        if (typeof this._provider.prepareRename !== 'function') {
            return Promise.resolve(undefined);
        }
        const doc = this._documents.getDocument(resource);
        const pos = typeConvert.Position.to(position);
        try {
            const rangeOrLocation = await this._provider.prepareRename(doc, pos, token);
            let range;
            let text;
            if (Range.isRange(rangeOrLocation)) {
                range = rangeOrLocation;
                text = doc.getText(rangeOrLocation);
            }
            else if (isObject(rangeOrLocation)) {
                range = rangeOrLocation.range;
                text = rangeOrLocation.placeholder;
            }
            if (!range || !text) {
                return undefined;
            }
            if (range.start.line > pos.line || range.end.line < pos.line) {
                this._logService.warn('INVALID rename location: position line must be within range start/end lines');
                return undefined;
            }
            return { range: typeConvert.Range.from(range), text };
        }
        catch (err) {
            const rejectReason = RenameAdapter._asMessage(err);
            if (rejectReason) {
                return { rejectReason, range: undefined, text: undefined };
            }
            else {
                return Promise.reject(err);
            }
        }
    }
    static _asMessage(err) {
        if (typeof err === 'string') {
            return err;
        }
        else if (err instanceof Error && typeof err.message === 'string') {
            return err.message;
        }
        else {
            return undefined;
        }
    }
}
class NewSymbolNamesAdapter {
    static { this.languageTriggerKindToVSCodeTriggerKind = {
        [languages.NewSymbolNameTriggerKind.Invoke]: NewSymbolNameTriggerKind.Invoke,
        [languages.NewSymbolNameTriggerKind.Automatic]: NewSymbolNameTriggerKind.Automatic,
    }; }
    constructor(_documents, _provider, _logService) {
        this._documents = _documents;
        this._provider = _provider;
        this._logService = _logService;
    }
    async supportsAutomaticNewSymbolNamesTriggerKind() {
        return this._provider.supportsAutomaticTriggerKind;
    }
    async provideNewSymbolNames(resource, range, triggerKind, token) {
        const doc = this._documents.getDocument(resource);
        const pos = typeConvert.Range.to(range);
        try {
            const kind = NewSymbolNamesAdapter.languageTriggerKindToVSCodeTriggerKind[triggerKind];
            const value = await this._provider.provideNewSymbolNames(doc, pos, kind, token);
            if (!value) {
                return undefined;
            }
            return value.map((v) => typeof v ===
                'string' /* @ulugbekna: for backward compatibility because `value` used to be just `string[]` */
                ? { newSymbolName: v }
                : { newSymbolName: v.newSymbolName, tags: v.tags });
        }
        catch (err) {
            this._logService.error(NewSymbolNamesAdapter._asMessage(err) ??
                JSON.stringify(err, null, '\t') /* @ulugbekna: assuming `err` doesn't have circular references that could result in an exception when converting to JSON */);
            return undefined;
        }
    }
    // @ulugbekna: this method is also defined in RenameAdapter but seems OK to be duplicated
    static _asMessage(err) {
        if (typeof err === 'string') {
            return err;
        }
        else if (err instanceof Error && typeof err.message === 'string') {
            return err.message;
        }
        else {
            return undefined;
        }
    }
}
class SemanticTokensPreviousResult {
    constructor(resultId, tokens) {
        this.resultId = resultId;
        this.tokens = tokens;
    }
}
class DocumentSemanticTokensAdapter {
    constructor(_documents, _provider) {
        this._documents = _documents;
        this._provider = _provider;
        this._nextResultId = 1;
        this._previousResults = new Map();
    }
    async provideDocumentSemanticTokens(resource, previousResultId, token) {
        const doc = this._documents.getDocument(resource);
        const previousResult = previousResultId !== 0 ? this._previousResults.get(previousResultId) : null;
        let value = typeof previousResult?.resultId === 'string' &&
            typeof this._provider.provideDocumentSemanticTokensEdits === 'function'
            ? await this._provider.provideDocumentSemanticTokensEdits(doc, previousResult.resultId, token)
            : await this._provider.provideDocumentSemanticTokens(doc, token);
        if (previousResult) {
            this._previousResults.delete(previousResultId);
        }
        if (!value) {
            return null;
        }
        value = DocumentSemanticTokensAdapter._fixProvidedSemanticTokens(value);
        return this._send(DocumentSemanticTokensAdapter._convertToEdits(previousResult, value), value);
    }
    async releaseDocumentSemanticColoring(semanticColoringResultId) {
        this._previousResults.delete(semanticColoringResultId);
    }
    static _fixProvidedSemanticTokens(v) {
        if (DocumentSemanticTokensAdapter._isSemanticTokens(v)) {
            if (DocumentSemanticTokensAdapter._isCorrectSemanticTokens(v)) {
                return v;
            }
            return new SemanticTokens(new Uint32Array(v.data), v.resultId);
        }
        else if (DocumentSemanticTokensAdapter._isSemanticTokensEdits(v)) {
            if (DocumentSemanticTokensAdapter._isCorrectSemanticTokensEdits(v)) {
                return v;
            }
            return new SemanticTokensEdits(v.edits.map((edit) => new SemanticTokensEdit(edit.start, edit.deleteCount, edit.data ? new Uint32Array(edit.data) : edit.data)), v.resultId);
        }
        return v;
    }
    static _isSemanticTokens(v) {
        return v && !!v.data;
    }
    static _isCorrectSemanticTokens(v) {
        return v.data instanceof Uint32Array;
    }
    static _isSemanticTokensEdits(v) {
        return v && Array.isArray(v.edits);
    }
    static _isCorrectSemanticTokensEdits(v) {
        for (const edit of v.edits) {
            if (!(edit.data instanceof Uint32Array)) {
                return false;
            }
        }
        return true;
    }
    static _convertToEdits(previousResult, newResult) {
        if (!DocumentSemanticTokensAdapter._isSemanticTokens(newResult)) {
            return newResult;
        }
        if (!previousResult || !previousResult.tokens) {
            return newResult;
        }
        const oldData = previousResult.tokens;
        const oldLength = oldData.length;
        const newData = newResult.data;
        const newLength = newData.length;
        let commonPrefixLength = 0;
        const maxCommonPrefixLength = Math.min(oldLength, newLength);
        while (commonPrefixLength < maxCommonPrefixLength &&
            oldData[commonPrefixLength] === newData[commonPrefixLength]) {
            commonPrefixLength++;
        }
        if (commonPrefixLength === oldLength && commonPrefixLength === newLength) {
            // complete overlap!
            return new SemanticTokensEdits([], newResult.resultId);
        }
        let commonSuffixLength = 0;
        const maxCommonSuffixLength = maxCommonPrefixLength - commonPrefixLength;
        while (commonSuffixLength < maxCommonSuffixLength &&
            oldData[oldLength - commonSuffixLength - 1] === newData[newLength - commonSuffixLength - 1]) {
            commonSuffixLength++;
        }
        return new SemanticTokensEdits([
            {
                start: commonPrefixLength,
                deleteCount: oldLength - commonPrefixLength - commonSuffixLength,
                data: newData.subarray(commonPrefixLength, newLength - commonSuffixLength),
            },
        ], newResult.resultId);
    }
    _send(value, original) {
        if (DocumentSemanticTokensAdapter._isSemanticTokens(value)) {
            const myId = this._nextResultId++;
            this._previousResults.set(myId, new SemanticTokensPreviousResult(value.resultId, value.data));
            return encodeSemanticTokensDto({
                id: myId,
                type: 'full',
                data: value.data,
            });
        }
        if (DocumentSemanticTokensAdapter._isSemanticTokensEdits(value)) {
            const myId = this._nextResultId++;
            if (DocumentSemanticTokensAdapter._isSemanticTokens(original)) {
                // store the original
                this._previousResults.set(myId, new SemanticTokensPreviousResult(original.resultId, original.data));
            }
            else {
                this._previousResults.set(myId, new SemanticTokensPreviousResult(value.resultId));
            }
            return encodeSemanticTokensDto({
                id: myId,
                type: 'delta',
                deltas: (value.edits || []).map((edit) => ({
                    start: edit.start,
                    deleteCount: edit.deleteCount,
                    data: edit.data,
                })),
            });
        }
        return null;
    }
}
class DocumentRangeSemanticTokensAdapter {
    constructor(_documents, _provider) {
        this._documents = _documents;
        this._provider = _provider;
    }
    async provideDocumentRangeSemanticTokens(resource, range, token) {
        const doc = this._documents.getDocument(resource);
        const value = await this._provider.provideDocumentRangeSemanticTokens(doc, typeConvert.Range.to(range), token);
        if (!value) {
            return null;
        }
        return this._send(value);
    }
    _send(value) {
        return encodeSemanticTokensDto({
            id: 0,
            type: 'full',
            data: value.data,
        });
    }
}
class CompletionsAdapter {
    static supportsResolving(provider) {
        return typeof provider.resolveCompletionItem === 'function';
    }
    constructor(_documents, _commands, _provider, _apiDeprecation, _extension) {
        this._documents = _documents;
        this._commands = _commands;
        this._provider = _provider;
        this._apiDeprecation = _apiDeprecation;
        this._extension = _extension;
        this._cache = new Cache('CompletionItem');
        this._disposables = new Map();
    }
    async provideCompletionItems(resource, position, context, token) {
        const doc = this._documents.getDocument(resource);
        const pos = typeConvert.Position.to(position);
        // The default insert/replace ranges. It's important to compute them
        // before asynchronously asking the provider for its results. See
        // https://github.com/microsoft/vscode/issues/83400#issuecomment-546851421
        const replaceRange = doc.getWordRangeAtPosition(pos) || new Range(pos, pos);
        const insertRange = replaceRange.with({ end: pos });
        const sw = new StopWatch();
        const itemsOrList = await this._provider.provideCompletionItems(doc, pos, token, typeConvert.CompletionContext.to(context));
        if (!itemsOrList) {
            // undefined and null are valid results
            return undefined;
        }
        if (token.isCancellationRequested) {
            // cancelled -> return without further ado, esp no caching
            // of results as they will leak
            return undefined;
        }
        const list = Array.isArray(itemsOrList) ? new CompletionList(itemsOrList) : itemsOrList;
        // keep result for providers that support resolving
        const pid = CompletionsAdapter.supportsResolving(this._provider)
            ? this._cache.add(list.items)
            : this._cache.add([]);
        const disposables = new DisposableStore();
        this._disposables.set(pid, disposables);
        const completions = [];
        const result = {
            x: pid,
            ["b" /* extHostProtocol.ISuggestResultDtoField.completions */]: completions,
            ["a" /* extHostProtocol.ISuggestResultDtoField.defaultRanges */]: {
                replace: typeConvert.Range.from(replaceRange),
                insert: typeConvert.Range.from(insertRange),
            },
            ["c" /* extHostProtocol.ISuggestResultDtoField.isIncomplete */]: list.isIncomplete || undefined,
            ["d" /* extHostProtocol.ISuggestResultDtoField.duration */]: sw.elapsed(),
        };
        for (let i = 0; i < list.items.length; i++) {
            const item = list.items[i];
            // check for bad completion item first
            const dto = this._convertCompletionItem(item, [pid, i], insertRange, replaceRange);
            completions.push(dto);
        }
        return result;
    }
    async resolveCompletionItem(id, token) {
        if (typeof this._provider.resolveCompletionItem !== 'function') {
            return undefined;
        }
        const item = this._cache.get(...id);
        if (!item) {
            return undefined;
        }
        const dto1 = this._convertCompletionItem(item, id);
        const resolvedItem = await this._provider.resolveCompletionItem(item, token);
        if (!resolvedItem) {
            return undefined;
        }
        const dto2 = this._convertCompletionItem(resolvedItem, id);
        if (dto1["h" /* extHostProtocol.ISuggestDataDtoField.insertText */] !==
            dto2["h" /* extHostProtocol.ISuggestDataDtoField.insertText */] ||
            dto1["i" /* extHostProtocol.ISuggestDataDtoField.insertTextRules */] !==
                dto2["i" /* extHostProtocol.ISuggestDataDtoField.insertTextRules */]) {
            this._apiDeprecation.report('CompletionItem.insertText', this._extension, "extension MAY NOT change 'insertText' of a CompletionItem during resolve");
        }
        if (dto1["n" /* extHostProtocol.ISuggestDataDtoField.commandIdent */] !==
            dto2["n" /* extHostProtocol.ISuggestDataDtoField.commandIdent */] ||
            dto1["o" /* extHostProtocol.ISuggestDataDtoField.commandId */] !==
                dto2["o" /* extHostProtocol.ISuggestDataDtoField.commandId */] ||
            !equals(dto1["p" /* extHostProtocol.ISuggestDataDtoField.commandArguments */], dto2["p" /* extHostProtocol.ISuggestDataDtoField.commandArguments */])) {
            this._apiDeprecation.report('CompletionItem.command', this._extension, "extension MAY NOT change 'command' of a CompletionItem during resolve");
        }
        return {
            ...dto1,
            ["d" /* extHostProtocol.ISuggestDataDtoField.documentation */]: dto2["d" /* extHostProtocol.ISuggestDataDtoField.documentation */],
            ["c" /* extHostProtocol.ISuggestDataDtoField.detail */]: dto2["c" /* extHostProtocol.ISuggestDataDtoField.detail */],
            ["l" /* extHostProtocol.ISuggestDataDtoField.additionalTextEdits */]: dto2["l" /* extHostProtocol.ISuggestDataDtoField.additionalTextEdits */],
            // (fishy) async insertText
            ["h" /* extHostProtocol.ISuggestDataDtoField.insertText */]: dto2["h" /* extHostProtocol.ISuggestDataDtoField.insertText */],
            ["i" /* extHostProtocol.ISuggestDataDtoField.insertTextRules */]: dto2["i" /* extHostProtocol.ISuggestDataDtoField.insertTextRules */],
            // (fishy) async command
            ["n" /* extHostProtocol.ISuggestDataDtoField.commandIdent */]: dto2["n" /* extHostProtocol.ISuggestDataDtoField.commandIdent */],
            ["o" /* extHostProtocol.ISuggestDataDtoField.commandId */]: dto2["o" /* extHostProtocol.ISuggestDataDtoField.commandId */],
            ["p" /* extHostProtocol.ISuggestDataDtoField.commandArguments */]: dto2["p" /* extHostProtocol.ISuggestDataDtoField.commandArguments */],
        };
    }
    releaseCompletionItems(id) {
        this._disposables.get(id)?.dispose();
        this._disposables.delete(id);
        this._cache.delete(id);
    }
    _convertCompletionItem(item, id, defaultInsertRange, defaultReplaceRange) {
        const disposables = this._disposables.get(id[0]);
        if (!disposables) {
            throw Error('DisposableStore is missing...');
        }
        const command = this._commands.toInternal(item.command, disposables);
        const result = {
            //
            x: id,
            //
            ["a" /* extHostProtocol.ISuggestDataDtoField.label */]: item.label,
            ["b" /* extHostProtocol.ISuggestDataDtoField.kind */]: item.kind !== undefined ? typeConvert.CompletionItemKind.from(item.kind) : undefined,
            ["m" /* extHostProtocol.ISuggestDataDtoField.kindModifier */]: item.tags && item.tags.map(typeConvert.CompletionItemTag.from),
            ["c" /* extHostProtocol.ISuggestDataDtoField.detail */]: item.detail,
            ["d" /* extHostProtocol.ISuggestDataDtoField.documentation */]: typeof item.documentation === 'undefined'
                ? undefined
                : typeConvert.MarkdownString.fromStrict(item.documentation),
            ["e" /* extHostProtocol.ISuggestDataDtoField.sortText */]: item.sortText !== item.label ? item.sortText : undefined,
            ["f" /* extHostProtocol.ISuggestDataDtoField.filterText */]: item.filterText !== item.label ? item.filterText : undefined,
            ["g" /* extHostProtocol.ISuggestDataDtoField.preselect */]: item.preselect || undefined,
            ["i" /* extHostProtocol.ISuggestDataDtoField.insertTextRules */]: item.keepWhitespace
                ? 1 /* languages.CompletionItemInsertTextRule.KeepWhitespace */
                : 0 /* languages.CompletionItemInsertTextRule.None */,
            ["k" /* extHostProtocol.ISuggestDataDtoField.commitCharacters */]: item.commitCharacters?.join(''),
            ["l" /* extHostProtocol.ISuggestDataDtoField.additionalTextEdits */]: item.additionalTextEdits && item.additionalTextEdits.map(typeConvert.TextEdit.from),
            ["n" /* extHostProtocol.ISuggestDataDtoField.commandIdent */]: command?.$ident,
            ["o" /* extHostProtocol.ISuggestDataDtoField.commandId */]: command?.id,
            ["p" /* extHostProtocol.ISuggestDataDtoField.commandArguments */]: command?.$ident
                ? undefined
                : command?.arguments, // filled in on main side from $ident
        };
        // 'insertText'-logic
        if (item.textEdit) {
            this._apiDeprecation.report('CompletionItem.textEdit', this._extension, `Use 'CompletionItem.insertText' and 'CompletionItem.range' instead.`);
            result["h" /* extHostProtocol.ISuggestDataDtoField.insertText */] = item.textEdit.newText;
        }
        else if (typeof item.insertText === 'string') {
            result["h" /* extHostProtocol.ISuggestDataDtoField.insertText */] = item.insertText;
        }
        else if (item.insertText instanceof SnippetString) {
            result["h" /* extHostProtocol.ISuggestDataDtoField.insertText */] = item.insertText.value;
            result["i" /* extHostProtocol.ISuggestDataDtoField.insertTextRules */] |=
                4 /* languages.CompletionItemInsertTextRule.InsertAsSnippet */;
        }
        // 'overwrite[Before|After]'-logic
        let range;
        if (item.textEdit) {
            range = item.textEdit.range;
        }
        else if (item.range) {
            range = item.range;
        }
        if (Range.isRange(range)) {
            // "old" range
            result["j" /* extHostProtocol.ISuggestDataDtoField.range */] = typeConvert.Range.from(range);
        }
        else if (range &&
            (!defaultInsertRange?.isEqual(range.inserting) ||
                !defaultReplaceRange?.isEqual(range.replacing))) {
            // ONLY send range when it's different from the default ranges (safe bandwidth)
            result["j" /* extHostProtocol.ISuggestDataDtoField.range */] = {
                insert: typeConvert.Range.from(range.inserting),
                replace: typeConvert.Range.from(range.replacing),
            };
        }
        return result;
    }
}
class InlineCompletionAdapter {
    constructor(_extension, _documents, _provider, _commands) {
        this._extension = _extension;
        this._documents = _documents;
        this._provider = _provider;
        this._commands = _commands;
        this._references = new ReferenceMap();
        this._isAdditionsProposedApiEnabled = isProposedApiEnabled(this._extension, 'inlineCompletionsAdditions');
        this.languageTriggerKindToVSCodeTriggerKind = {
            [languages.InlineCompletionTriggerKind.Automatic]: InlineCompletionTriggerKind.Automatic,
            [languages.InlineCompletionTriggerKind.Explicit]: InlineCompletionTriggerKind.Invoke,
        };
    }
    get supportsHandleEvents() {
        return (isProposedApiEnabled(this._extension, 'inlineCompletionsAdditions') &&
            (typeof this._provider.handleDidShowCompletionItem === 'function' ||
                typeof this._provider.handleDidPartiallyAcceptCompletionItem === 'function' ||
                typeof this._provider.handleDidRejectCompletionItem === 'function'));
    }
    async provideInlineCompletions(resource, position, context, token) {
        const doc = this._documents.getDocument(resource);
        const pos = typeConvert.Position.to(position);
        const result = await this._provider.provideInlineCompletionItems(doc, pos, {
            selectedCompletionInfo: context.selectedSuggestionInfo
                ? {
                    range: typeConvert.Range.to(context.selectedSuggestionInfo.range),
                    text: context.selectedSuggestionInfo.text,
                }
                : undefined,
            triggerKind: this.languageTriggerKindToVSCodeTriggerKind[context.triggerKind],
            requestUuid: context.requestUuid,
        }, token);
        if (!result) {
            // undefined and null are valid results
            return undefined;
        }
        if (token.isCancellationRequested) {
            // cancelled -> return without further ado, esp no caching
            // of results as they will leak
            return undefined;
        }
        const normalizedResult = Array.isArray(result) ? result : result.items;
        const commands = this._isAdditionsProposedApiEnabled
            ? Array.isArray(result)
                ? []
                : result.commands || []
            : [];
        const enableForwardStability = this._isAdditionsProposedApiEnabled && !Array.isArray(result)
            ? result.enableForwardStability
            : undefined;
        let disposableStore = undefined;
        const pid = this._references.createReferenceId({
            dispose() {
                disposableStore?.dispose();
            },
            items: normalizedResult,
        });
        return {
            pid,
            items: normalizedResult.map((item, idx) => {
                let command = undefined;
                if (item.command) {
                    if (!disposableStore) {
                        disposableStore = new DisposableStore();
                    }
                    command = this._commands.toInternal(item.command, disposableStore);
                }
                let action = undefined;
                if (item.action) {
                    if (!disposableStore) {
                        disposableStore = new DisposableStore();
                    }
                    action = this._commands.toInternal(item.action, disposableStore);
                }
                const insertText = item.insertText;
                return {
                    insertText: typeof insertText === 'string' ? insertText : { snippet: insertText.value },
                    filterText: item.filterText,
                    range: item.range ? typeConvert.Range.from(item.range) : undefined,
                    showRange: this._isAdditionsProposedApiEnabled && item.showRange
                        ? typeConvert.Range.from(item.showRange)
                        : undefined,
                    command,
                    action,
                    idx: idx,
                    completeBracketPairs: this._isAdditionsProposedApiEnabled
                        ? item.completeBracketPairs
                        : false,
                    isInlineEdit: this._isAdditionsProposedApiEnabled ? item.isInlineEdit : false,
                    showInlineEditMenu: this._isAdditionsProposedApiEnabled ? item.showInlineEditMenu : false,
                    warning: item.warning && this._isAdditionsProposedApiEnabled
                        ? {
                            message: typeConvert.MarkdownString.from(item.warning.message),
                            icon: item.warning.icon
                                ? typeConvert.IconPath.fromThemeIcon(item.warning.icon)
                                : undefined,
                        }
                        : undefined,
                };
            }),
            commands: commands.map((c) => {
                if (!disposableStore) {
                    disposableStore = new DisposableStore();
                }
                return this._commands.toInternal(c, disposableStore);
            }),
            suppressSuggestions: false,
            enableForwardStability,
        };
    }
    async provideInlineEditsForRange(resource, range, context, token) {
        if (!this._provider.provideInlineEditsForRange) {
            return undefined;
        }
        checkProposedApiEnabled(this._extension, 'inlineCompletionsAdditions');
        const doc = this._documents.getDocument(resource);
        const r = typeConvert.Range.to(range);
        const result = await this._provider.provideInlineEditsForRange(doc, r, {
            selectedCompletionInfo: context.selectedSuggestionInfo
                ? {
                    range: typeConvert.Range.to(context.selectedSuggestionInfo.range),
                    text: context.selectedSuggestionInfo.text,
                }
                : undefined,
            triggerKind: this.languageTriggerKindToVSCodeTriggerKind[context.triggerKind],
            userPrompt: context.userPrompt,
            requestUuid: context.requestUuid,
        }, token);
        if (!result) {
            // undefined and null are valid results
            return undefined;
        }
        if (token.isCancellationRequested) {
            // cancelled -> return without further ado, esp no caching
            // of results as they will leak
            return undefined;
        }
        const normalizedResult = Array.isArray(result) ? result : result.items;
        const commands = this._isAdditionsProposedApiEnabled
            ? Array.isArray(result)
                ? []
                : result.commands || []
            : [];
        const enableForwardStability = this._isAdditionsProposedApiEnabled && !Array.isArray(result)
            ? result.enableForwardStability
            : undefined;
        let disposableStore = undefined;
        const pid = this._references.createReferenceId({
            dispose() {
                disposableStore?.dispose();
            },
            items: normalizedResult,
        });
        return {
            pid,
            items: normalizedResult.map((item, idx) => {
                let command = undefined;
                if (item.command) {
                    if (!disposableStore) {
                        disposableStore = new DisposableStore();
                    }
                    command = this._commands.toInternal(item.command, disposableStore);
                }
                let action = undefined;
                if (item.action) {
                    if (!disposableStore) {
                        disposableStore = new DisposableStore();
                    }
                    action = this._commands.toInternal(item.action, disposableStore);
                }
                const insertText = item.insertText;
                return {
                    insertText: typeof insertText === 'string' ? insertText : { snippet: insertText.value },
                    filterText: item.filterText,
                    range: item.range ? typeConvert.Range.from(item.range) : undefined,
                    command,
                    action,
                    idx: idx,
                    completeBracketPairs: this._isAdditionsProposedApiEnabled
                        ? item.completeBracketPairs
                        : false,
                };
            }),
            commands: commands.map((c) => {
                if (!disposableStore) {
                    disposableStore = new DisposableStore();
                }
                return this._commands.toInternal(c, disposableStore);
            }),
            suppressSuggestions: false,
            enableForwardStability,
        };
    }
    disposeCompletions(pid) {
        const data = this._references.disposeReferenceId(pid);
        data?.dispose();
    }
    handleDidShowCompletionItem(pid, idx, updatedInsertText) {
        const completionItem = this._references.get(pid)?.items[idx];
        if (completionItem) {
            if (this._provider.handleDidShowCompletionItem && this._isAdditionsProposedApiEnabled) {
                this._provider.handleDidShowCompletionItem(completionItem, updatedInsertText);
            }
        }
    }
    handlePartialAccept(pid, idx, acceptedCharacters, info) {
        const completionItem = this._references.get(pid)?.items[idx];
        if (completionItem) {
            if (this._provider.handleDidPartiallyAcceptCompletionItem &&
                this._isAdditionsProposedApiEnabled) {
                this._provider.handleDidPartiallyAcceptCompletionItem(completionItem, acceptedCharacters);
                this._provider.handleDidPartiallyAcceptCompletionItem(completionItem, typeConvert.PartialAcceptInfo.to(info));
            }
        }
    }
    handleRejection(pid, idx) {
        const completionItem = this._references.get(pid)?.items[idx];
        if (completionItem) {
            if (this._provider.handleDidRejectCompletionItem && this._isAdditionsProposedApiEnabled) {
                this._provider.handleDidRejectCompletionItem(completionItem);
            }
        }
    }
}
class InlineEditAdapter {
    async provideInlineEdits(uri, context, token) {
        const doc = this._documents.getDocument(uri);
        const result = await this._provider.provideInlineEdit(doc, {
            triggerKind: this.languageTriggerKindToVSCodeTriggerKind[context.triggerKind],
            requestUuid: context.requestUuid,
        }, token);
        if (!result) {
            // undefined and null are valid results
            return undefined;
        }
        if (token.isCancellationRequested) {
            // cancelled -> return without further ado, esp no caching
            // of results as they will leak
            return undefined;
        }
        let disposableStore = undefined;
        const pid = this._references.createReferenceId({
            dispose() {
                disposableStore?.dispose();
            },
            item: result,
        });
        let acceptCommand = undefined;
        if (result.accepted) {
            if (!disposableStore) {
                disposableStore = new DisposableStore();
            }
            acceptCommand = this._commands.toInternal(result.accepted, disposableStore);
        }
        let rejectCommand = undefined;
        if (result.rejected) {
            if (!disposableStore) {
                disposableStore = new DisposableStore();
            }
            rejectCommand = this._commands.toInternal(result.rejected, disposableStore);
        }
        let shownCommand = undefined;
        if (result.shown) {
            if (!disposableStore) {
                disposableStore = new DisposableStore();
            }
            shownCommand = this._commands.toInternal(result.shown, disposableStore);
        }
        let action = undefined;
        if (result.action) {
            if (!disposableStore) {
                disposableStore = new DisposableStore();
            }
            action = this._commands.toInternal(result.action, disposableStore);
        }
        if (!disposableStore) {
            disposableStore = new DisposableStore();
        }
        const langResult = {
            pid,
            text: result.text,
            range: typeConvert.Range.from(result.range),
            showRange: typeConvert.Range.from(result.showRange),
            accepted: acceptCommand,
            rejected: rejectCommand,
            shown: shownCommand,
            action,
            commands: result.commands?.map((c) => this._commands.toInternal(c, disposableStore)),
        };
        return langResult;
    }
    disposeEdit(pid) {
        const data = this._references.disposeReferenceId(pid);
        data?.dispose();
    }
    constructor(_extension, _documents, _provider, _commands) {
        this._documents = _documents;
        this._provider = _provider;
        this._commands = _commands;
        this._references = new ReferenceMap();
        this.languageTriggerKindToVSCodeTriggerKind = {
            [languages.InlineEditTriggerKind.Automatic]: InlineEditTriggerKind.Automatic,
            [languages.InlineEditTriggerKind.Invoke]: InlineEditTriggerKind.Invoke,
        };
    }
}
class ReferenceMap {
    constructor() {
        this._references = new Map();
        this._idPool = 1;
    }
    createReferenceId(value) {
        const id = this._idPool++;
        this._references.set(id, value);
        return id;
    }
    disposeReferenceId(referenceId) {
        const value = this._references.get(referenceId);
        this._references.delete(referenceId);
        return value;
    }
    get(referenceId) {
        return this._references.get(referenceId);
    }
}
class SignatureHelpAdapter {
    constructor(_documents, _provider) {
        this._documents = _documents;
        this._provider = _provider;
        this._cache = new Cache('SignatureHelp');
    }
    async provideSignatureHelp(resource, position, context, token) {
        const doc = this._documents.getDocument(resource);
        const pos = typeConvert.Position.to(position);
        const vscodeContext = this.reviveContext(context);
        const value = await this._provider.provideSignatureHelp(doc, pos, token, vscodeContext);
        if (value) {
            const id = this._cache.add([value]);
            return { ...typeConvert.SignatureHelp.from(value), id };
        }
        return undefined;
    }
    reviveContext(context) {
        let activeSignatureHelp = undefined;
        if (context.activeSignatureHelp) {
            const revivedSignatureHelp = typeConvert.SignatureHelp.to(context.activeSignatureHelp);
            const saved = this._cache.get(context.activeSignatureHelp.id, 0);
            if (saved) {
                activeSignatureHelp = saved;
                activeSignatureHelp.activeSignature = revivedSignatureHelp.activeSignature;
                activeSignatureHelp.activeParameter = revivedSignatureHelp.activeParameter;
            }
            else {
                activeSignatureHelp = revivedSignatureHelp;
            }
        }
        return { ...context, activeSignatureHelp };
    }
    releaseSignatureHelp(id) {
        this._cache.delete(id);
    }
}
class InlayHintsAdapter {
    constructor(_documents, _commands, _provider, _logService, _extension) {
        this._documents = _documents;
        this._commands = _commands;
        this._provider = _provider;
        this._logService = _logService;
        this._extension = _extension;
        this._cache = new Cache('InlayHints');
        this._disposables = new Map();
    }
    async provideInlayHints(resource, ran, token) {
        const doc = this._documents.getDocument(resource);
        const range = typeConvert.Range.to(ran);
        const hints = await this._provider.provideInlayHints(doc, range, token);
        if (!Array.isArray(hints) || hints.length === 0) {
            // bad result
            this._logService.trace(`[InlayHints] NO inlay hints from '${this._extension.identifier.value}' for range ${JSON.stringify(ran)}`);
            return undefined;
        }
        if (token.isCancellationRequested) {
            // cancelled -> return without further ado, esp no caching
            // of results as they will leak
            return undefined;
        }
        const pid = this._cache.add(hints);
        this._disposables.set(pid, new DisposableStore());
        const result = { hints: [], cacheId: pid };
        for (let i = 0; i < hints.length; i++) {
            if (this._isValidInlayHint(hints[i], range)) {
                result.hints.push(this._convertInlayHint(hints[i], [pid, i]));
            }
        }
        this._logService.trace(`[InlayHints] ${result.hints.length} inlay hints from '${this._extension.identifier.value}' for range ${JSON.stringify(ran)}`);
        return result;
    }
    async resolveInlayHint(id, token) {
        if (typeof this._provider.resolveInlayHint !== 'function') {
            return undefined;
        }
        const item = this._cache.get(...id);
        if (!item) {
            return undefined;
        }
        const hint = await this._provider.resolveInlayHint(item, token);
        if (!hint) {
            return undefined;
        }
        if (!this._isValidInlayHint(hint)) {
            return undefined;
        }
        return this._convertInlayHint(hint, id);
    }
    releaseHints(id) {
        this._disposables.get(id)?.dispose();
        this._disposables.delete(id);
        this._cache.delete(id);
    }
    _isValidInlayHint(hint, range) {
        if (hint.label.length === 0 ||
            (Array.isArray(hint.label) && hint.label.every((part) => part.value.length === 0))) {
            console.log('INVALID inlay hint, empty label', hint);
            return false;
        }
        if (range && !range.contains(hint.position)) {
            // console.log('INVALID inlay hint, position outside range', range, hint);
            return false;
        }
        return true;
    }
    _convertInlayHint(hint, id) {
        const disposables = this._disposables.get(id[0]);
        if (!disposables) {
            throw Error('DisposableStore is missing...');
        }
        const result = {
            label: '', // fill-in below
            cacheId: id,
            tooltip: typeConvert.MarkdownString.fromStrict(hint.tooltip),
            position: typeConvert.Position.from(hint.position),
            textEdits: hint.textEdits && hint.textEdits.map(typeConvert.TextEdit.from),
            kind: hint.kind && typeConvert.InlayHintKind.from(hint.kind),
            paddingLeft: hint.paddingLeft,
            paddingRight: hint.paddingRight,
        };
        if (typeof hint.label === 'string') {
            result.label = hint.label;
        }
        else {
            const parts = [];
            result.label = parts;
            for (const part of hint.label) {
                if (!part.value) {
                    console.warn('INVALID inlay hint, empty label part', this._extension.identifier.value);
                    continue;
                }
                const part2 = {
                    label: part.value,
                    tooltip: typeConvert.MarkdownString.fromStrict(part.tooltip),
                };
                if (Location.isLocation(part.location)) {
                    part2.location = typeConvert.location.from(part.location);
                }
                if (part.command) {
                    part2.command = this._commands.toInternal(part.command, disposables);
                }
                parts.push(part2);
            }
        }
        return result;
    }
}
class LinkProviderAdapter {
    constructor(_documents, _provider) {
        this._documents = _documents;
        this._provider = _provider;
        this._cache = new Cache('DocumentLink');
    }
    async provideLinks(resource, token) {
        const doc = this._documents.getDocument(resource);
        const links = await this._provider.provideDocumentLinks(doc, token);
        if (!Array.isArray(links) || links.length === 0) {
            // bad result
            return undefined;
        }
        if (token.isCancellationRequested) {
            // cancelled -> return without further ado, esp no caching
            // of results as they will leak
            return undefined;
        }
        if (typeof this._provider.resolveDocumentLink !== 'function') {
            // no resolve -> no caching
            return {
                links: links.filter(LinkProviderAdapter._validateLink).map(typeConvert.DocumentLink.from),
            };
        }
        else {
            // cache links for future resolving
            const pid = this._cache.add(links);
            const result = { links: [], cacheId: pid };
            for (let i = 0; i < links.length; i++) {
                if (!LinkProviderAdapter._validateLink(links[i])) {
                    continue;
                }
                const dto = typeConvert.DocumentLink.from(links[i]);
                dto.cacheId = [pid, i];
                result.links.push(dto);
            }
            return result;
        }
    }
    static _validateLink(link) {
        if (link.target && link.target.path.length > 50_000) {
            console.warn('DROPPING link because it is too long');
            return false;
        }
        return true;
    }
    async resolveLink(id, token) {
        if (typeof this._provider.resolveDocumentLink !== 'function') {
            return undefined;
        }
        const item = this._cache.get(...id);
        if (!item) {
            return undefined;
        }
        const link = await this._provider.resolveDocumentLink(item, token);
        if (!link || !LinkProviderAdapter._validateLink(link)) {
            return undefined;
        }
        return typeConvert.DocumentLink.from(link);
    }
    releaseLinks(id) {
        this._cache.delete(id);
    }
}
class ColorProviderAdapter {
    constructor(_documents, _provider) {
        this._documents = _documents;
        this._provider = _provider;
    }
    async provideColors(resource, token) {
        const doc = this._documents.getDocument(resource);
        const colors = await this._provider.provideDocumentColors(doc, token);
        if (!Array.isArray(colors)) {
            return [];
        }
        const colorInfos = colors.map((ci) => {
            return {
                color: typeConvert.Color.from(ci.color),
                range: typeConvert.Range.from(ci.range),
            };
        });
        return colorInfos;
    }
    async provideColorPresentations(resource, raw, token) {
        const document = this._documents.getDocument(resource);
        const range = typeConvert.Range.to(raw.range);
        const color = typeConvert.Color.to(raw.color);
        const value = await this._provider.provideColorPresentations(color, { document, range }, token);
        if (!Array.isArray(value)) {
            return undefined;
        }
        return value.map(typeConvert.ColorPresentation.from);
    }
}
class FoldingProviderAdapter {
    constructor(_documents, _provider) {
        this._documents = _documents;
        this._provider = _provider;
    }
    async provideFoldingRanges(resource, context, token) {
        const doc = this._documents.getDocument(resource);
        const ranges = await this._provider.provideFoldingRanges(doc, context, token);
        if (!Array.isArray(ranges)) {
            return undefined;
        }
        return ranges.map(typeConvert.FoldingRange.from);
    }
}
class SelectionRangeAdapter {
    constructor(_documents, _provider, _logService) {
        this._documents = _documents;
        this._provider = _provider;
        this._logService = _logService;
    }
    async provideSelectionRanges(resource, pos, token) {
        const document = this._documents.getDocument(resource);
        const positions = pos.map(typeConvert.Position.to);
        const allProviderRanges = await this._provider.provideSelectionRanges(document, positions, token);
        if (!isNonEmptyArray(allProviderRanges)) {
            return [];
        }
        if (allProviderRanges.length !== positions.length) {
            this._logService.warn('BAD selection ranges, provider must return ranges for each position');
            return [];
        }
        const allResults = [];
        for (let i = 0; i < positions.length; i++) {
            const oneResult = [];
            allResults.push(oneResult);
            let last = positions[i];
            let selectionRange = allProviderRanges[i];
            while (true) {
                if (!selectionRange.range.contains(last)) {
                    throw new Error('INVALID selection range, must contain the previous range');
                }
                oneResult.push(typeConvert.SelectionRange.from(selectionRange));
                if (!selectionRange.parent) {
                    break;
                }
                last = selectionRange.range;
                selectionRange = selectionRange.parent;
            }
        }
        return allResults;
    }
}
class CallHierarchyAdapter {
    constructor(_documents, _provider) {
        this._documents = _documents;
        this._provider = _provider;
        this._idPool = new IdGenerator('');
        this._cache = new Map();
    }
    async prepareSession(uri, position, token) {
        const doc = this._documents.getDocument(uri);
        const pos = typeConvert.Position.to(position);
        const items = await this._provider.prepareCallHierarchy(doc, pos, token);
        if (!items) {
            return undefined;
        }
        const sessionId = this._idPool.nextId();
        this._cache.set(sessionId, new Map());
        if (Array.isArray(items)) {
            return items.map((item) => this._cacheAndConvertItem(sessionId, item));
        }
        else {
            return [this._cacheAndConvertItem(sessionId, items)];
        }
    }
    async provideCallsTo(sessionId, itemId, token) {
        const item = this._itemFromCache(sessionId, itemId);
        if (!item) {
            throw new Error('missing call hierarchy item');
        }
        const calls = await this._provider.provideCallHierarchyIncomingCalls(item, token);
        if (!calls) {
            return undefined;
        }
        return calls.map((call) => {
            return {
                from: this._cacheAndConvertItem(sessionId, call.from),
                fromRanges: call.fromRanges.map((r) => typeConvert.Range.from(r)),
            };
        });
    }
    async provideCallsFrom(sessionId, itemId, token) {
        const item = this._itemFromCache(sessionId, itemId);
        if (!item) {
            throw new Error('missing call hierarchy item');
        }
        const calls = await this._provider.provideCallHierarchyOutgoingCalls(item, token);
        if (!calls) {
            return undefined;
        }
        return calls.map((call) => {
            return {
                to: this._cacheAndConvertItem(sessionId, call.to),
                fromRanges: call.fromRanges.map((r) => typeConvert.Range.from(r)),
            };
        });
    }
    releaseSession(sessionId) {
        this._cache.delete(sessionId);
    }
    _cacheAndConvertItem(sessionId, item) {
        const map = this._cache.get(sessionId);
        const dto = typeConvert.CallHierarchyItem.from(item, sessionId, map.size.toString(36));
        map.set(dto._itemId, item);
        return dto;
    }
    _itemFromCache(sessionId, itemId) {
        const map = this._cache.get(sessionId);
        return map?.get(itemId);
    }
}
class TypeHierarchyAdapter {
    constructor(_documents, _provider) {
        this._documents = _documents;
        this._provider = _provider;
        this._idPool = new IdGenerator('');
        this._cache = new Map();
    }
    async prepareSession(uri, position, token) {
        const doc = this._documents.getDocument(uri);
        const pos = typeConvert.Position.to(position);
        const items = await this._provider.prepareTypeHierarchy(doc, pos, token);
        if (!items) {
            return undefined;
        }
        const sessionId = this._idPool.nextId();
        this._cache.set(sessionId, new Map());
        if (Array.isArray(items)) {
            return items.map((item) => this._cacheAndConvertItem(sessionId, item));
        }
        else {
            return [this._cacheAndConvertItem(sessionId, items)];
        }
    }
    async provideSupertypes(sessionId, itemId, token) {
        const item = this._itemFromCache(sessionId, itemId);
        if (!item) {
            throw new Error('missing type hierarchy item');
        }
        const supertypes = await this._provider.provideTypeHierarchySupertypes(item, token);
        if (!supertypes) {
            return undefined;
        }
        return supertypes.map((supertype) => {
            return this._cacheAndConvertItem(sessionId, supertype);
        });
    }
    async provideSubtypes(sessionId, itemId, token) {
        const item = this._itemFromCache(sessionId, itemId);
        if (!item) {
            throw new Error('missing type hierarchy item');
        }
        const subtypes = await this._provider.provideTypeHierarchySubtypes(item, token);
        if (!subtypes) {
            return undefined;
        }
        return subtypes.map((subtype) => {
            return this._cacheAndConvertItem(sessionId, subtype);
        });
    }
    releaseSession(sessionId) {
        this._cache.delete(sessionId);
    }
    _cacheAndConvertItem(sessionId, item) {
        const map = this._cache.get(sessionId);
        const dto = typeConvert.TypeHierarchyItem.from(item, sessionId, map.size.toString(36));
        map.set(dto._itemId, item);
        return dto;
    }
    _itemFromCache(sessionId, itemId) {
        const map = this._cache.get(sessionId);
        return map?.get(itemId);
    }
}
class DocumentDropEditAdapter {
    constructor(_proxy, _documents, _provider, _handle, _extension) {
        this._proxy = _proxy;
        this._documents = _documents;
        this._provider = _provider;
        this._handle = _handle;
        this._extension = _extension;
        this._cache = new Cache('DocumentDropEdit');
    }
    async provideDocumentOnDropEdits(requestId, uri, position, dataTransferDto, token) {
        const doc = this._documents.getDocument(uri);
        const pos = typeConvert.Position.to(position);
        const dataTransfer = typeConvert.DataTransfer.toDataTransfer(dataTransferDto, async (id) => {
            return (await this._proxy.$resolveDocumentOnDropFileData(this._handle, requestId, id)).buffer;
        });
        const edits = await this._provider.provideDocumentDropEdits(doc, pos, dataTransfer, token);
        if (!edits) {
            return undefined;
        }
        const editsArray = asArray(edits);
        const cacheId = this._cache.add(editsArray);
        return editsArray.map((edit, i) => ({
            _cacheId: [cacheId, i],
            title: edit.title ??
                localize('defaultDropLabel', "Drop using '{0}' extension", this._extension.displayName || this._extension.name),
            kind: edit.kind?.value,
            yieldTo: edit.yieldTo?.map((x) => x.value),
            insertText: typeof edit.insertText === 'string'
                ? edit.insertText
                : { snippet: edit.insertText.value },
            additionalEdit: edit.additionalEdit
                ? typeConvert.WorkspaceEdit.from(edit.additionalEdit, undefined)
                : undefined,
        }));
    }
    async resolveDropEdit(id, token) {
        const [sessionId, itemId] = id;
        const item = this._cache.get(sessionId, itemId);
        if (!item || !this._provider.resolveDocumentDropEdit) {
            return {}; // this should not happen...
        }
        const resolvedItem = (await this._provider.resolveDocumentDropEdit(item, token)) ?? item;
        const additionalEdit = resolvedItem.additionalEdit
            ? typeConvert.WorkspaceEdit.from(resolvedItem.additionalEdit, undefined)
            : undefined;
        return { additionalEdit };
    }
    releaseDropEdits(id) {
        this._cache.delete(id);
    }
}
class AdapterData {
    constructor(adapter, extension) {
        this.adapter = adapter;
        this.extension = extension;
    }
}
export class ExtHostLanguageFeatures {
    static { this._handlePool = 0; }
    constructor(mainContext, _uriTransformer, _documents, _commands, _diagnostics, _logService, _apiDeprecation, _extensionTelemetry) {
        this._uriTransformer = _uriTransformer;
        this._documents = _documents;
        this._commands = _commands;
        this._diagnostics = _diagnostics;
        this._logService = _logService;
        this._apiDeprecation = _apiDeprecation;
        this._extensionTelemetry = _extensionTelemetry;
        this._adapter = new Map();
        this._proxy = mainContext.getProxy(extHostProtocol.MainContext.MainThreadLanguageFeatures);
    }
    _transformDocumentSelector(selector, extension) {
        return typeConvert.DocumentSelector.from(selector, this._uriTransformer, extension);
    }
    _createDisposable(handle) {
        return new Disposable(() => {
            this._adapter.delete(handle);
            this._proxy.$unregister(handle);
        });
    }
    _nextHandle() {
        return ExtHostLanguageFeatures._handlePool++;
    }
    async _withAdapter(handle, ctor, callback, fallbackValue, tokenToRaceAgainst, doNotLog = false) {
        const data = this._adapter.get(handle);
        if (!data || !(data.adapter instanceof ctor)) {
            return fallbackValue;
        }
        const t1 = Date.now();
        if (!doNotLog) {
            this._logService.trace(`[${data.extension.identifier.value}] INVOKE provider '${callback.toString().replace(/[\r\n]/g, '')}'`);
        }
        const result = callback(data.adapter, data.extension);
        // logging,tracing
        Promise.resolve(result)
            .catch((err) => {
            if (!isCancellationError(err)) {
                this._logService.error(`[${data.extension.identifier.value}] provider FAILED`);
                this._logService.error(err);
                this._extensionTelemetry.onExtensionError(data.extension.identifier, err);
            }
        })
            .finally(() => {
            if (!doNotLog) {
                this._logService.trace(`[${data.extension.identifier.value}] provider DONE after ${Date.now() - t1}ms`);
            }
        });
        if (CancellationToken.isCancellationToken(tokenToRaceAgainst)) {
            return raceCancellationError(result, tokenToRaceAgainst);
        }
        return result;
    }
    _addNewAdapter(adapter, extension) {
        const handle = this._nextHandle();
        this._adapter.set(handle, new AdapterData(adapter, extension));
        return handle;
    }
    static _extLabel(ext) {
        return ext.displayName || ext.name;
    }
    static _extId(ext) {
        return ext.identifier.value;
    }
    // --- outline
    registerDocumentSymbolProvider(extension, selector, provider, metadata) {
        const handle = this._addNewAdapter(new DocumentSymbolAdapter(this._documents, provider), extension);
        const displayName = (metadata && metadata.label) || ExtHostLanguageFeatures._extLabel(extension);
        this._proxy.$registerDocumentSymbolProvider(handle, this._transformDocumentSelector(selector, extension), displayName);
        return this._createDisposable(handle);
    }
    $provideDocumentSymbols(handle, resource, token) {
        return this._withAdapter(handle, DocumentSymbolAdapter, (adapter) => adapter.provideDocumentSymbols(URI.revive(resource), token), undefined, token);
    }
    // --- code lens
    registerCodeLensProvider(extension, selector, provider) {
        const handle = this._nextHandle();
        const eventHandle = typeof provider.onDidChangeCodeLenses === 'function' ? this._nextHandle() : undefined;
        this._adapter.set(handle, new AdapterData(new CodeLensAdapter(this._documents, this._commands.converter, provider, extension, this._extensionTelemetry, this._logService), extension));
        this._proxy.$registerCodeLensSupport(handle, this._transformDocumentSelector(selector, extension), eventHandle);
        let result = this._createDisposable(handle);
        if (eventHandle !== undefined) {
            const subscription = provider.onDidChangeCodeLenses((_) => this._proxy.$emitCodeLensEvent(eventHandle));
            result = Disposable.from(result, subscription);
        }
        return result;
    }
    $provideCodeLenses(handle, resource, token) {
        return this._withAdapter(handle, CodeLensAdapter, (adapter) => adapter.provideCodeLenses(URI.revive(resource), token), undefined, token, resource.scheme === 'output');
    }
    $resolveCodeLens(handle, symbol, token) {
        return this._withAdapter(handle, CodeLensAdapter, (adapter) => adapter.resolveCodeLens(symbol, token), undefined, undefined, true);
    }
    $releaseCodeLenses(handle, cacheId) {
        this._withAdapter(handle, CodeLensAdapter, (adapter) => Promise.resolve(adapter.releaseCodeLenses(cacheId)), undefined, undefined, true);
    }
    // --- declaration
    registerDefinitionProvider(extension, selector, provider) {
        const handle = this._addNewAdapter(new DefinitionAdapter(this._documents, provider), extension);
        this._proxy.$registerDefinitionSupport(handle, this._transformDocumentSelector(selector, extension));
        return this._createDisposable(handle);
    }
    $provideDefinition(handle, resource, position, token) {
        return this._withAdapter(handle, DefinitionAdapter, (adapter) => adapter.provideDefinition(URI.revive(resource), position, token), [], token);
    }
    registerDeclarationProvider(extension, selector, provider) {
        const handle = this._addNewAdapter(new DeclarationAdapter(this._documents, provider), extension);
        this._proxy.$registerDeclarationSupport(handle, this._transformDocumentSelector(selector, extension));
        return this._createDisposable(handle);
    }
    $provideDeclaration(handle, resource, position, token) {
        return this._withAdapter(handle, DeclarationAdapter, (adapter) => adapter.provideDeclaration(URI.revive(resource), position, token), [], token);
    }
    registerImplementationProvider(extension, selector, provider) {
        const handle = this._addNewAdapter(new ImplementationAdapter(this._documents, provider), extension);
        this._proxy.$registerImplementationSupport(handle, this._transformDocumentSelector(selector, extension));
        return this._createDisposable(handle);
    }
    $provideImplementation(handle, resource, position, token) {
        return this._withAdapter(handle, ImplementationAdapter, (adapter) => adapter.provideImplementation(URI.revive(resource), position, token), [], token);
    }
    registerTypeDefinitionProvider(extension, selector, provider) {
        const handle = this._addNewAdapter(new TypeDefinitionAdapter(this._documents, provider), extension);
        this._proxy.$registerTypeDefinitionSupport(handle, this._transformDocumentSelector(selector, extension));
        return this._createDisposable(handle);
    }
    $provideTypeDefinition(handle, resource, position, token) {
        return this._withAdapter(handle, TypeDefinitionAdapter, (adapter) => adapter.provideTypeDefinition(URI.revive(resource), position, token), [], token);
    }
    // --- extra info
    registerHoverProvider(extension, selector, provider, extensionId) {
        const handle = this._addNewAdapter(new HoverAdapter(this._documents, provider), extension);
        this._proxy.$registerHoverProvider(handle, this._transformDocumentSelector(selector, extension));
        return this._createDisposable(handle);
    }
    $provideHover(handle, resource, position, context, token) {
        return this._withAdapter(handle, HoverAdapter, (adapter) => adapter.provideHover(URI.revive(resource), position, context, token), undefined, token);
    }
    $releaseHover(handle, id) {
        this._withAdapter(handle, HoverAdapter, (adapter) => Promise.resolve(adapter.releaseHover(id)), undefined, undefined);
    }
    // --- debug hover
    registerEvaluatableExpressionProvider(extension, selector, provider, extensionId) {
        const handle = this._addNewAdapter(new EvaluatableExpressionAdapter(this._documents, provider), extension);
        this._proxy.$registerEvaluatableExpressionProvider(handle, this._transformDocumentSelector(selector, extension));
        return this._createDisposable(handle);
    }
    $provideEvaluatableExpression(handle, resource, position, token) {
        return this._withAdapter(handle, EvaluatableExpressionAdapter, (adapter) => adapter.provideEvaluatableExpression(URI.revive(resource), position, token), undefined, token);
    }
    // --- debug inline values
    registerInlineValuesProvider(extension, selector, provider, extensionId) {
        const eventHandle = typeof provider.onDidChangeInlineValues === 'function' ? this._nextHandle() : undefined;
        const handle = this._addNewAdapter(new InlineValuesAdapter(this._documents, provider), extension);
        this._proxy.$registerInlineValuesProvider(handle, this._transformDocumentSelector(selector, extension), eventHandle);
        let result = this._createDisposable(handle);
        if (eventHandle !== undefined) {
            const subscription = provider.onDidChangeInlineValues((_) => this._proxy.$emitInlineValuesEvent(eventHandle));
            result = Disposable.from(result, subscription);
        }
        return result;
    }
    $provideInlineValues(handle, resource, range, context, token) {
        return this._withAdapter(handle, InlineValuesAdapter, (adapter) => adapter.provideInlineValues(URI.revive(resource), range, context, token), undefined, token);
    }
    // --- occurrences
    registerDocumentHighlightProvider(extension, selector, provider) {
        const handle = this._addNewAdapter(new DocumentHighlightAdapter(this._documents, provider), extension);
        this._proxy.$registerDocumentHighlightProvider(handle, this._transformDocumentSelector(selector, extension));
        return this._createDisposable(handle);
    }
    registerMultiDocumentHighlightProvider(extension, selector, provider) {
        const handle = this._addNewAdapter(new MultiDocumentHighlightAdapter(this._documents, provider, this._logService), extension);
        this._proxy.$registerMultiDocumentHighlightProvider(handle, this._transformDocumentSelector(selector, extension));
        return this._createDisposable(handle);
    }
    $provideDocumentHighlights(handle, resource, position, token) {
        return this._withAdapter(handle, DocumentHighlightAdapter, (adapter) => adapter.provideDocumentHighlights(URI.revive(resource), position, token), undefined, token);
    }
    $provideMultiDocumentHighlights(handle, resource, position, otherModels, token) {
        return this._withAdapter(handle, MultiDocumentHighlightAdapter, (adapter) => adapter.provideMultiDocumentHighlights(URI.revive(resource), position, otherModels.map((model) => URI.revive(model)), token), undefined, token);
    }
    // --- linked editing
    registerLinkedEditingRangeProvider(extension, selector, provider) {
        const handle = this._addNewAdapter(new LinkedEditingRangeAdapter(this._documents, provider), extension);
        this._proxy.$registerLinkedEditingRangeProvider(handle, this._transformDocumentSelector(selector, extension));
        return this._createDisposable(handle);
    }
    $provideLinkedEditingRanges(handle, resource, position, token) {
        return this._withAdapter(handle, LinkedEditingRangeAdapter, async (adapter) => {
            const res = await adapter.provideLinkedEditingRanges(URI.revive(resource), position, token);
            if (res) {
                return {
                    ranges: res.ranges,
                    wordPattern: res.wordPattern
                        ? ExtHostLanguageFeatures._serializeRegExp(res.wordPattern)
                        : undefined,
                };
            }
            return undefined;
        }, undefined, token);
    }
    // --- references
    registerReferenceProvider(extension, selector, provider) {
        const handle = this._addNewAdapter(new ReferenceAdapter(this._documents, provider), extension);
        this._proxy.$registerReferenceSupport(handle, this._transformDocumentSelector(selector, extension));
        return this._createDisposable(handle);
    }
    $provideReferences(handle, resource, position, context, token) {
        return this._withAdapter(handle, ReferenceAdapter, (adapter) => adapter.provideReferences(URI.revive(resource), position, context, token), undefined, token);
    }
    // --- code actions
    registerCodeActionProvider(extension, selector, provider, metadata) {
        const store = new DisposableStore();
        const handle = this._addNewAdapter(new CodeActionAdapter(this._documents, this._commands.converter, this._diagnostics, provider, this._logService, extension, this._apiDeprecation), extension);
        this._proxy.$registerCodeActionSupport(handle, this._transformDocumentSelector(selector, extension), {
            providedKinds: metadata?.providedCodeActionKinds?.map((kind) => kind.value),
            documentation: metadata?.documentation?.map((x) => ({
                kind: x.kind.value,
                command: this._commands.converter.toInternal(x.command, store),
            })),
        }, ExtHostLanguageFeatures._extLabel(extension), ExtHostLanguageFeatures._extId(extension), Boolean(provider.resolveCodeAction));
        store.add(this._createDisposable(handle));
        return store;
    }
    $provideCodeActions(handle, resource, rangeOrSelection, context, token) {
        return this._withAdapter(handle, CodeActionAdapter, (adapter) => adapter.provideCodeActions(URI.revive(resource), rangeOrSelection, context, token), undefined, token);
    }
    $resolveCodeAction(handle, id, token) {
        return this._withAdapter(handle, CodeActionAdapter, (adapter) => adapter.resolveCodeAction(id, token), {}, undefined);
    }
    $releaseCodeActions(handle, cacheId) {
        this._withAdapter(handle, CodeActionAdapter, (adapter) => Promise.resolve(adapter.releaseCodeActions(cacheId)), undefined, undefined);
    }
    // --- formatting
    registerDocumentFormattingEditProvider(extension, selector, provider) {
        const handle = this._addNewAdapter(new DocumentFormattingAdapter(this._documents, provider), extension);
        this._proxy.$registerDocumentFormattingSupport(handle, this._transformDocumentSelector(selector, extension), extension.identifier, extension.displayName || extension.name);
        return this._createDisposable(handle);
    }
    $provideDocumentFormattingEdits(handle, resource, options, token) {
        return this._withAdapter(handle, DocumentFormattingAdapter, (adapter) => adapter.provideDocumentFormattingEdits(URI.revive(resource), options, token), undefined, token);
    }
    registerDocumentRangeFormattingEditProvider(extension, selector, provider) {
        const canFormatMultipleRanges = typeof provider.provideDocumentRangesFormattingEdits === 'function';
        const handle = this._addNewAdapter(new RangeFormattingAdapter(this._documents, provider), extension);
        this._proxy.$registerRangeFormattingSupport(handle, this._transformDocumentSelector(selector, extension), extension.identifier, extension.displayName || extension.name, canFormatMultipleRanges);
        return this._createDisposable(handle);
    }
    $provideDocumentRangeFormattingEdits(handle, resource, range, options, token) {
        return this._withAdapter(handle, RangeFormattingAdapter, (adapter) => adapter.provideDocumentRangeFormattingEdits(URI.revive(resource), range, options, token), undefined, token);
    }
    $provideDocumentRangesFormattingEdits(handle, resource, ranges, options, token) {
        return this._withAdapter(handle, RangeFormattingAdapter, (adapter) => adapter.provideDocumentRangesFormattingEdits(URI.revive(resource), ranges, options, token), undefined, token);
    }
    registerOnTypeFormattingEditProvider(extension, selector, provider, triggerCharacters) {
        const handle = this._addNewAdapter(new OnTypeFormattingAdapter(this._documents, provider), extension);
        this._proxy.$registerOnTypeFormattingSupport(handle, this._transformDocumentSelector(selector, extension), triggerCharacters, extension.identifier);
        return this._createDisposable(handle);
    }
    $provideOnTypeFormattingEdits(handle, resource, position, ch, options, token) {
        return this._withAdapter(handle, OnTypeFormattingAdapter, (adapter) => adapter.provideOnTypeFormattingEdits(URI.revive(resource), position, ch, options, token), undefined, token);
    }
    // --- navigate types
    registerWorkspaceSymbolProvider(extension, provider) {
        const handle = this._addNewAdapter(new NavigateTypeAdapter(provider, this._logService), extension);
        this._proxy.$registerNavigateTypeSupport(handle, typeof provider.resolveWorkspaceSymbol === 'function');
        return this._createDisposable(handle);
    }
    $provideWorkspaceSymbols(handle, search, token) {
        return this._withAdapter(handle, NavigateTypeAdapter, (adapter) => adapter.provideWorkspaceSymbols(search, token), { symbols: [] }, token);
    }
    $resolveWorkspaceSymbol(handle, symbol, token) {
        return this._withAdapter(handle, NavigateTypeAdapter, (adapter) => adapter.resolveWorkspaceSymbol(symbol, token), undefined, undefined);
    }
    $releaseWorkspaceSymbols(handle, id) {
        this._withAdapter(handle, NavigateTypeAdapter, (adapter) => adapter.releaseWorkspaceSymbols(id), undefined, undefined);
    }
    // --- rename
    registerRenameProvider(extension, selector, provider) {
        const handle = this._addNewAdapter(new RenameAdapter(this._documents, provider, this._logService), extension);
        this._proxy.$registerRenameSupport(handle, this._transformDocumentSelector(selector, extension), RenameAdapter.supportsResolving(provider));
        return this._createDisposable(handle);
    }
    $provideRenameEdits(handle, resource, position, newName, token) {
        return this._withAdapter(handle, RenameAdapter, (adapter) => adapter.provideRenameEdits(URI.revive(resource), position, newName, token), undefined, token);
    }
    $resolveRenameLocation(handle, resource, position, token) {
        return this._withAdapter(handle, RenameAdapter, (adapter) => adapter.resolveRenameLocation(URI.revive(resource), position, token), undefined, token);
    }
    registerNewSymbolNamesProvider(extension, selector, provider) {
        const handle = this._addNewAdapter(new NewSymbolNamesAdapter(this._documents, provider, this._logService), extension);
        this._proxy.$registerNewSymbolNamesProvider(handle, this._transformDocumentSelector(selector, extension));
        return this._createDisposable(handle);
    }
    $supportsAutomaticNewSymbolNamesTriggerKind(handle) {
        return this._withAdapter(handle, NewSymbolNamesAdapter, (adapter) => adapter.supportsAutomaticNewSymbolNamesTriggerKind(), false, undefined);
    }
    $provideNewSymbolNames(handle, resource, range, triggerKind, token) {
        return this._withAdapter(handle, NewSymbolNamesAdapter, (adapter) => adapter.provideNewSymbolNames(URI.revive(resource), range, triggerKind, token), undefined, token);
    }
    //#region semantic coloring
    registerDocumentSemanticTokensProvider(extension, selector, provider, legend) {
        const handle = this._addNewAdapter(new DocumentSemanticTokensAdapter(this._documents, provider), extension);
        const eventHandle = typeof provider.onDidChangeSemanticTokens === 'function' ? this._nextHandle() : undefined;
        this._proxy.$registerDocumentSemanticTokensProvider(handle, this._transformDocumentSelector(selector, extension), legend, eventHandle);
        let result = this._createDisposable(handle);
        if (eventHandle) {
            const subscription = provider.onDidChangeSemanticTokens((_) => this._proxy.$emitDocumentSemanticTokensEvent(eventHandle));
            result = Disposable.from(result, subscription);
        }
        return result;
    }
    $provideDocumentSemanticTokens(handle, resource, previousResultId, token) {
        return this._withAdapter(handle, DocumentSemanticTokensAdapter, (adapter) => adapter.provideDocumentSemanticTokens(URI.revive(resource), previousResultId, token), null, token);
    }
    $releaseDocumentSemanticTokens(handle, semanticColoringResultId) {
        this._withAdapter(handle, DocumentSemanticTokensAdapter, (adapter) => adapter.releaseDocumentSemanticColoring(semanticColoringResultId), undefined, undefined);
    }
    registerDocumentRangeSemanticTokensProvider(extension, selector, provider, legend) {
        const handle = this._addNewAdapter(new DocumentRangeSemanticTokensAdapter(this._documents, provider), extension);
        this._proxy.$registerDocumentRangeSemanticTokensProvider(handle, this._transformDocumentSelector(selector, extension), legend);
        return this._createDisposable(handle);
    }
    $provideDocumentRangeSemanticTokens(handle, resource, range, token) {
        return this._withAdapter(handle, DocumentRangeSemanticTokensAdapter, (adapter) => adapter.provideDocumentRangeSemanticTokens(URI.revive(resource), range, token), null, token);
    }
    //#endregion
    // --- suggestion
    registerCompletionItemProvider(extension, selector, provider, triggerCharacters) {
        const handle = this._addNewAdapter(new CompletionsAdapter(this._documents, this._commands.converter, provider, this._apiDeprecation, extension), extension);
        this._proxy.$registerCompletionsProvider(handle, this._transformDocumentSelector(selector, extension), triggerCharacters, CompletionsAdapter.supportsResolving(provider), extension.identifier);
        return this._createDisposable(handle);
    }
    $provideCompletionItems(handle, resource, position, context, token) {
        return this._withAdapter(handle, CompletionsAdapter, (adapter) => adapter.provideCompletionItems(URI.revive(resource), position, context, token), undefined, token);
    }
    $resolveCompletionItem(handle, id, token) {
        return this._withAdapter(handle, CompletionsAdapter, (adapter) => adapter.resolveCompletionItem(id, token), undefined, token);
    }
    $releaseCompletionItems(handle, id) {
        this._withAdapter(handle, CompletionsAdapter, (adapter) => adapter.releaseCompletionItems(id), undefined, undefined);
    }
    // --- ghost text
    registerInlineCompletionsProvider(extension, selector, provider, metadata) {
        const adapter = new InlineCompletionAdapter(extension, this._documents, provider, this._commands.converter);
        const handle = this._addNewAdapter(adapter, extension);
        this._proxy.$registerInlineCompletionsSupport(handle, this._transformDocumentSelector(selector, extension), adapter.supportsHandleEvents, ExtensionIdentifier.toKey(extension.identifier.value), metadata?.yieldTo?.map((extId) => ExtensionIdentifier.toKey(extId)) || [], metadata?.displayName, metadata?.debounceDelayMs);
        return this._createDisposable(handle);
    }
    $provideInlineCompletions(handle, resource, position, context, token) {
        return this._withAdapter(handle, InlineCompletionAdapter, (adapter) => adapter.provideInlineCompletions(URI.revive(resource), position, context, token), undefined, token);
    }
    $provideInlineEditsForRange(handle, resource, range, context, token) {
        return this._withAdapter(handle, InlineCompletionAdapter, (adapter) => adapter.provideInlineEditsForRange(URI.revive(resource), range, context, token), undefined, token);
    }
    $handleInlineCompletionDidShow(handle, pid, idx, updatedInsertText) {
        this._withAdapter(handle, InlineCompletionAdapter, async (adapter) => {
            adapter.handleDidShowCompletionItem(pid, idx, updatedInsertText);
        }, undefined, undefined);
    }
    $handleInlineCompletionPartialAccept(handle, pid, idx, acceptedCharacters, info) {
        this._withAdapter(handle, InlineCompletionAdapter, async (adapter) => {
            adapter.handlePartialAccept(pid, idx, acceptedCharacters, info);
        }, undefined, undefined);
    }
    $handleInlineCompletionRejection(handle, pid, idx) {
        this._withAdapter(handle, InlineCompletionAdapter, async (adapter) => {
            adapter.handleRejection(pid, idx);
        }, undefined, undefined);
    }
    $freeInlineCompletionsList(handle, pid) {
        this._withAdapter(handle, InlineCompletionAdapter, async (adapter) => {
            adapter.disposeCompletions(pid);
        }, undefined, undefined);
    }
    // --- inline edit
    registerInlineEditProvider(extension, selector, provider) {
        const adapter = new InlineEditAdapter(extension, this._documents, provider, this._commands.converter);
        const handle = this._addNewAdapter(adapter, extension);
        this._proxy.$registerInlineEditProvider(handle, this._transformDocumentSelector(selector, extension), extension.identifier, provider.displayName || extension.name);
        return this._createDisposable(handle);
    }
    $provideInlineEdit(handle, resource, context, token) {
        return this._withAdapter(handle, InlineEditAdapter, (adapter) => adapter.provideInlineEdits(URI.revive(resource), context, token), undefined, token);
    }
    $freeInlineEdit(handle, pid) {
        this._withAdapter(handle, InlineEditAdapter, async (adapter) => {
            adapter.disposeEdit(pid);
        }, undefined, undefined);
    }
    // --- parameter hints
    registerSignatureHelpProvider(extension, selector, provider, metadataOrTriggerChars) {
        const metadata = Array.isArray(metadataOrTriggerChars)
            ? { triggerCharacters: metadataOrTriggerChars, retriggerCharacters: [] }
            : metadataOrTriggerChars;
        const handle = this._addNewAdapter(new SignatureHelpAdapter(this._documents, provider), extension);
        this._proxy.$registerSignatureHelpProvider(handle, this._transformDocumentSelector(selector, extension), metadata);
        return this._createDisposable(handle);
    }
    $provideSignatureHelp(handle, resource, position, context, token) {
        return this._withAdapter(handle, SignatureHelpAdapter, (adapter) => adapter.provideSignatureHelp(URI.revive(resource), position, context, token), undefined, token);
    }
    $releaseSignatureHelp(handle, id) {
        this._withAdapter(handle, SignatureHelpAdapter, (adapter) => adapter.releaseSignatureHelp(id), undefined, undefined);
    }
    // --- inline hints
    registerInlayHintsProvider(extension, selector, provider) {
        const eventHandle = typeof provider.onDidChangeInlayHints === 'function' ? this._nextHandle() : undefined;
        const handle = this._addNewAdapter(new InlayHintsAdapter(this._documents, this._commands.converter, provider, this._logService, extension), extension);
        this._proxy.$registerInlayHintsProvider(handle, this._transformDocumentSelector(selector, extension), typeof provider.resolveInlayHint === 'function', eventHandle, ExtHostLanguageFeatures._extLabel(extension));
        let result = this._createDisposable(handle);
        if (eventHandle !== undefined) {
            const subscription = provider.onDidChangeInlayHints((uri) => this._proxy.$emitInlayHintsEvent(eventHandle));
            result = Disposable.from(result, subscription);
        }
        return result;
    }
    $provideInlayHints(handle, resource, range, token) {
        return this._withAdapter(handle, InlayHintsAdapter, (adapter) => adapter.provideInlayHints(URI.revive(resource), range, token), undefined, token);
    }
    $resolveInlayHint(handle, id, token) {
        return this._withAdapter(handle, InlayHintsAdapter, (adapter) => adapter.resolveInlayHint(id, token), undefined, token);
    }
    $releaseInlayHints(handle, id) {
        this._withAdapter(handle, InlayHintsAdapter, (adapter) => adapter.releaseHints(id), undefined, undefined);
    }
    // --- links
    registerDocumentLinkProvider(extension, selector, provider) {
        const handle = this._addNewAdapter(new LinkProviderAdapter(this._documents, provider), extension);
        this._proxy.$registerDocumentLinkProvider(handle, this._transformDocumentSelector(selector, extension), typeof provider.resolveDocumentLink === 'function');
        return this._createDisposable(handle);
    }
    $provideDocumentLinks(handle, resource, token) {
        return this._withAdapter(handle, LinkProviderAdapter, (adapter) => adapter.provideLinks(URI.revive(resource), token), undefined, token, resource.scheme === 'output');
    }
    $resolveDocumentLink(handle, id, token) {
        return this._withAdapter(handle, LinkProviderAdapter, (adapter) => adapter.resolveLink(id, token), undefined, undefined, true);
    }
    $releaseDocumentLinks(handle, id) {
        this._withAdapter(handle, LinkProviderAdapter, (adapter) => adapter.releaseLinks(id), undefined, undefined, true);
    }
    registerColorProvider(extension, selector, provider) {
        const handle = this._addNewAdapter(new ColorProviderAdapter(this._documents, provider), extension);
        this._proxy.$registerDocumentColorProvider(handle, this._transformDocumentSelector(selector, extension));
        return this._createDisposable(handle);
    }
    $provideDocumentColors(handle, resource, token) {
        return this._withAdapter(handle, ColorProviderAdapter, (adapter) => adapter.provideColors(URI.revive(resource), token), [], token);
    }
    $provideColorPresentations(handle, resource, colorInfo, token) {
        return this._withAdapter(handle, ColorProviderAdapter, (adapter) => adapter.provideColorPresentations(URI.revive(resource), colorInfo, token), undefined, token);
    }
    registerFoldingRangeProvider(extension, selector, provider) {
        const handle = this._nextHandle();
        const eventHandle = typeof provider.onDidChangeFoldingRanges === 'function' ? this._nextHandle() : undefined;
        this._adapter.set(handle, new AdapterData(new FoldingProviderAdapter(this._documents, provider), extension));
        this._proxy.$registerFoldingRangeProvider(handle, this._transformDocumentSelector(selector, extension), extension.identifier, eventHandle);
        let result = this._createDisposable(handle);
        if (eventHandle !== undefined) {
            const subscription = provider.onDidChangeFoldingRanges(() => this._proxy.$emitFoldingRangeEvent(eventHandle));
            result = Disposable.from(result, subscription);
        }
        return result;
    }
    $provideFoldingRanges(handle, resource, context, token) {
        return this._withAdapter(handle, FoldingProviderAdapter, (adapter) => adapter.provideFoldingRanges(URI.revive(resource), context, token), undefined, token);
    }
    // --- smart select
    registerSelectionRangeProvider(extension, selector, provider) {
        const handle = this._addNewAdapter(new SelectionRangeAdapter(this._documents, provider, this._logService), extension);
        this._proxy.$registerSelectionRangeProvider(handle, this._transformDocumentSelector(selector, extension));
        return this._createDisposable(handle);
    }
    $provideSelectionRanges(handle, resource, positions, token) {
        return this._withAdapter(handle, SelectionRangeAdapter, (adapter) => adapter.provideSelectionRanges(URI.revive(resource), positions, token), [], token);
    }
    // --- call hierarchy
    registerCallHierarchyProvider(extension, selector, provider) {
        const handle = this._addNewAdapter(new CallHierarchyAdapter(this._documents, provider), extension);
        this._proxy.$registerCallHierarchyProvider(handle, this._transformDocumentSelector(selector, extension));
        return this._createDisposable(handle);
    }
    $prepareCallHierarchy(handle, resource, position, token) {
        return this._withAdapter(handle, CallHierarchyAdapter, (adapter) => Promise.resolve(adapter.prepareSession(URI.revive(resource), position, token)), undefined, token);
    }
    $provideCallHierarchyIncomingCalls(handle, sessionId, itemId, token) {
        return this._withAdapter(handle, CallHierarchyAdapter, (adapter) => adapter.provideCallsTo(sessionId, itemId, token), undefined, token);
    }
    $provideCallHierarchyOutgoingCalls(handle, sessionId, itemId, token) {
        return this._withAdapter(handle, CallHierarchyAdapter, (adapter) => adapter.provideCallsFrom(sessionId, itemId, token), undefined, token);
    }
    $releaseCallHierarchy(handle, sessionId) {
        this._withAdapter(handle, CallHierarchyAdapter, (adapter) => Promise.resolve(adapter.releaseSession(sessionId)), undefined, undefined);
    }
    // --- type hierarchy
    registerTypeHierarchyProvider(extension, selector, provider) {
        const handle = this._addNewAdapter(new TypeHierarchyAdapter(this._documents, provider), extension);
        this._proxy.$registerTypeHierarchyProvider(handle, this._transformDocumentSelector(selector, extension));
        return this._createDisposable(handle);
    }
    $prepareTypeHierarchy(handle, resource, position, token) {
        return this._withAdapter(handle, TypeHierarchyAdapter, (adapter) => Promise.resolve(adapter.prepareSession(URI.revive(resource), position, token)), undefined, token);
    }
    $provideTypeHierarchySupertypes(handle, sessionId, itemId, token) {
        return this._withAdapter(handle, TypeHierarchyAdapter, (adapter) => adapter.provideSupertypes(sessionId, itemId, token), undefined, token);
    }
    $provideTypeHierarchySubtypes(handle, sessionId, itemId, token) {
        return this._withAdapter(handle, TypeHierarchyAdapter, (adapter) => adapter.provideSubtypes(sessionId, itemId, token), undefined, token);
    }
    $releaseTypeHierarchy(handle, sessionId) {
        this._withAdapter(handle, TypeHierarchyAdapter, (adapter) => Promise.resolve(adapter.releaseSession(sessionId)), undefined, undefined);
    }
    // --- Document on drop
    registerDocumentOnDropEditProvider(extension, selector, provider, metadata) {
        const handle = this._nextHandle();
        this._adapter.set(handle, new AdapterData(new DocumentDropEditAdapter(this._proxy, this._documents, provider, handle, extension), extension));
        this._proxy.$registerDocumentOnDropEditProvider(handle, this._transformDocumentSelector(selector, extension), metadata
            ? {
                supportsResolve: !!provider.resolveDocumentDropEdit,
                dropMimeTypes: metadata.dropMimeTypes,
                providedDropKinds: metadata.providedDropEditKinds?.map((x) => x.value),
            }
            : undefined);
        return this._createDisposable(handle);
    }
    $provideDocumentOnDropEdits(handle, requestId, resource, position, dataTransferDto, token) {
        return this._withAdapter(handle, DocumentDropEditAdapter, (adapter) => Promise.resolve(adapter.provideDocumentOnDropEdits(requestId, URI.revive(resource), position, dataTransferDto, token)), undefined, undefined);
    }
    $resolveDropEdit(handle, id, token) {
        return this._withAdapter(handle, DocumentDropEditAdapter, (adapter) => adapter.resolveDropEdit(id, token), {}, undefined);
    }
    $releaseDocumentOnDropEdits(handle, cacheId) {
        this._withAdapter(handle, DocumentDropEditAdapter, (adapter) => Promise.resolve(adapter.releaseDropEdits(cacheId)), undefined, undefined);
    }
    // --- copy/paste actions
    registerDocumentPasteEditProvider(extension, selector, provider, metadata) {
        const handle = this._nextHandle();
        this._adapter.set(handle, new AdapterData(new DocumentPasteEditProvider(this._proxy, this._documents, provider, handle, extension), extension));
        this._proxy.$registerPasteEditProvider(handle, this._transformDocumentSelector(selector, extension), {
            supportsCopy: !!provider.prepareDocumentPaste,
            supportsPaste: !!provider.provideDocumentPasteEdits,
            supportsResolve: !!provider.resolveDocumentPasteEdit,
            providedPasteEditKinds: metadata.providedPasteEditKinds?.map((x) => x.value),
            copyMimeTypes: metadata.copyMimeTypes,
            pasteMimeTypes: metadata.pasteMimeTypes,
        });
        return this._createDisposable(handle);
    }
    $prepareDocumentPaste(handle, resource, ranges, dataTransfer, token) {
        return this._withAdapter(handle, DocumentPasteEditProvider, (adapter) => adapter.prepareDocumentPaste(URI.revive(resource), ranges, dataTransfer, token), undefined, token);
    }
    $providePasteEdits(handle, requestId, resource, ranges, dataTransferDto, context, token) {
        return this._withAdapter(handle, DocumentPasteEditProvider, (adapter) => adapter.providePasteEdits(requestId, URI.revive(resource), ranges, dataTransferDto, context, token), undefined, token);
    }
    $resolvePasteEdit(handle, id, token) {
        return this._withAdapter(handle, DocumentPasteEditProvider, (adapter) => adapter.resolvePasteEdit(id, token), {}, undefined);
    }
    $releasePasteEdits(handle, cacheId) {
        this._withAdapter(handle, DocumentPasteEditProvider, (adapter) => Promise.resolve(adapter.releasePasteEdits(cacheId)), undefined, undefined);
    }
    // --- configuration
    static _serializeRegExp(regExp) {
        return {
            pattern: regExp.source,
            flags: regExp.flags,
        };
    }
    static _serializeIndentationRule(indentationRule) {
        return {
            decreaseIndentPattern: ExtHostLanguageFeatures._serializeRegExp(indentationRule.decreaseIndentPattern),
            increaseIndentPattern: ExtHostLanguageFeatures._serializeRegExp(indentationRule.increaseIndentPattern),
            indentNextLinePattern: indentationRule.indentNextLinePattern
                ? ExtHostLanguageFeatures._serializeRegExp(indentationRule.indentNextLinePattern)
                : undefined,
            unIndentedLinePattern: indentationRule.unIndentedLinePattern
                ? ExtHostLanguageFeatures._serializeRegExp(indentationRule.unIndentedLinePattern)
                : undefined,
        };
    }
    static _serializeOnEnterRule(onEnterRule) {
        return {
            beforeText: ExtHostLanguageFeatures._serializeRegExp(onEnterRule.beforeText),
            afterText: onEnterRule.afterText
                ? ExtHostLanguageFeatures._serializeRegExp(onEnterRule.afterText)
                : undefined,
            previousLineText: onEnterRule.previousLineText
                ? ExtHostLanguageFeatures._serializeRegExp(onEnterRule.previousLineText)
                : undefined,
            action: onEnterRule.action,
        };
    }
    static _serializeOnEnterRules(onEnterRules) {
        return onEnterRules.map(ExtHostLanguageFeatures._serializeOnEnterRule);
    }
    static _serializeAutoClosingPair(autoClosingPair) {
        return {
            open: autoClosingPair.open,
            close: autoClosingPair.close,
            notIn: autoClosingPair.notIn
                ? autoClosingPair.notIn.map((v) => SyntaxTokenType.toString(v))
                : undefined,
        };
    }
    static _serializeAutoClosingPairs(autoClosingPairs) {
        return autoClosingPairs.map(ExtHostLanguageFeatures._serializeAutoClosingPair);
    }
    setLanguageConfiguration(extension, languageId, configuration) {
        const { wordPattern } = configuration;
        // check for a valid word pattern
        if (wordPattern && regExpLeadsToEndlessLoop(wordPattern)) {
            throw new Error(`Invalid language configuration: wordPattern '${wordPattern}' is not allowed to match the empty string.`);
        }
        // word definition
        if (wordPattern) {
            this._documents.setWordDefinitionFor(languageId, wordPattern);
        }
        else {
            this._documents.setWordDefinitionFor(languageId, undefined);
        }
        if (configuration.__electricCharacterSupport) {
            this._apiDeprecation.report('LanguageConfiguration.__electricCharacterSupport', extension, `Do not use.`);
        }
        if (configuration.__characterPairSupport) {
            this._apiDeprecation.report('LanguageConfiguration.__characterPairSupport', extension, `Do not use.`);
        }
        const handle = this._nextHandle();
        const serializedConfiguration = {
            comments: configuration.comments,
            brackets: configuration.brackets,
            wordPattern: configuration.wordPattern
                ? ExtHostLanguageFeatures._serializeRegExp(configuration.wordPattern)
                : undefined,
            indentationRules: configuration.indentationRules
                ? ExtHostLanguageFeatures._serializeIndentationRule(configuration.indentationRules)
                : undefined,
            onEnterRules: configuration.onEnterRules
                ? ExtHostLanguageFeatures._serializeOnEnterRules(configuration.onEnterRules)
                : undefined,
            __electricCharacterSupport: configuration.__electricCharacterSupport,
            __characterPairSupport: configuration.__characterPairSupport,
            autoClosingPairs: configuration.autoClosingPairs
                ? ExtHostLanguageFeatures._serializeAutoClosingPairs(configuration.autoClosingPairs)
                : undefined,
        };
        this._proxy.$setLanguageConfiguration(handle, languageId, serializedConfiguration);
        return this._createDisposable(handle);
    }
    $setWordDefinitions(wordDefinitions) {
        for (const wordDefinition of wordDefinitions) {
            this._documents.setWordDefinitionFor(wordDefinition.languageId, new RegExp(wordDefinition.regexSource, wordDefinition.regexFlags));
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdExhbmd1YWdlRmVhdHVyZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3RMYW5ndWFnZUZlYXR1cmVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLGNBQWMsRUFBRSxlQUFlLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNuRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUVyRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN6RixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDakUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDL0QsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzdELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxVQUFVLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDcEUsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSw2QkFBNkIsQ0FBQTtBQUVoRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFFM0QsT0FBTyxFQUFFLEtBQUssSUFBSSxXQUFXLEVBQVUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNuRixPQUFPLEVBQWMsU0FBUyxFQUFFLE1BQU0sMENBQTBDLENBQUE7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