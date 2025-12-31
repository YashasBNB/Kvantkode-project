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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdExhbmd1YWdlRmVhdHVyZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9leHRIb3N0TGFuZ3VhZ2VGZWF0dXJlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxjQUFjLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDbkcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFFckUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDeEUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLG1CQUFtQixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDekYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsVUFBVSxFQUFFLFFBQVEsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3BFLE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sNkJBQTZCLENBQUE7QUFFaEUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBRTNELE9BQU8sRUFBRSxLQUFLLElBQUksV0FBVyxFQUFVLE1BQU0sc0NBQXNDLENBQUE7QUFDbkYsT0FBTyxFQUFjLFNBQVMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2hG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