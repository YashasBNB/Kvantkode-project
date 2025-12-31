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
var MainThreadLanguageFeatures_1;
import { createStringDataTransferItem, VSDataTransfer, } from '../../../base/common/dataTransfer.js';
import { CancellationError } from '../../../base/common/errors.js';
import { Emitter } from '../../../base/common/event.js';
import { HierarchicalKind } from '../../../base/common/hierarchicalKind.js';
import { combinedDisposable, Disposable, DisposableMap, toDisposable, } from '../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../base/common/map.js';
import { revive } from '../../../base/common/marshalling.js';
import { mixin } from '../../../base/common/objects.js';
import { URI } from '../../../base/common/uri.js';
import { ILanguageService } from '../../../editor/common/languages/language.js';
import { ILanguageConfigurationService } from '../../../editor/common/languages/languageConfigurationRegistry.js';
import { ILanguageFeaturesService } from '../../../editor/common/services/languageFeatures.js';
import { decodeSemanticTokensDto } from '../../../editor/common/services/semanticTokensDto.js';
import { IUriIdentityService } from '../../../platform/uriIdentity/common/uriIdentity.js';
import { reviveWorkspaceEditDto } from './mainThreadBulkEdits.js';
import * as typeConvert from '../common/extHostTypeConverters.js';
import { DataTransferFileCache } from '../common/shared/dataTransferCache.js';
import * as callh from '../../contrib/callHierarchy/common/callHierarchy.js';
import * as search from '../../contrib/search/common/search.js';
import * as typeh from '../../contrib/typeHierarchy/common/typeHierarchy.js';
import { extHostNamedCustomer, } from '../../services/extensions/common/extHostCustomers.js';
import { ExtHostContext, MainContext, } from '../common/extHost.protocol.js';
let MainThreadLanguageFeatures = MainThreadLanguageFeatures_1 = class MainThreadLanguageFeatures extends Disposable {
    constructor(extHostContext, _languageService, _languageConfigurationService, _languageFeaturesService, _uriIdentService) {
        super();
        this._languageService = _languageService;
        this._languageConfigurationService = _languageConfigurationService;
        this._languageFeaturesService = _languageFeaturesService;
        this._uriIdentService = _uriIdentService;
        this._registrations = this._register(new DisposableMap());
        // --- copy paste action provider
        this._pasteEditProviders = new Map();
        // --- document drop Edits
        this._documentOnDropEditProviders = new Map();
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostLanguageFeatures);
        if (this._languageService) {
            const updateAllWordDefinitions = () => {
                const wordDefinitionDtos = [];
                for (const languageId of _languageService.getRegisteredLanguageIds()) {
                    const wordDefinition = this._languageConfigurationService
                        .getLanguageConfiguration(languageId)
                        .getWordDefinition();
                    wordDefinitionDtos.push({
                        languageId: languageId,
                        regexSource: wordDefinition.source,
                        regexFlags: wordDefinition.flags,
                    });
                }
                this._proxy.$setWordDefinitions(wordDefinitionDtos);
            };
            this._register(this._languageConfigurationService.onDidChange((e) => {
                if (!e.languageId) {
                    updateAllWordDefinitions();
                }
                else {
                    const wordDefinition = this._languageConfigurationService
                        .getLanguageConfiguration(e.languageId)
                        .getWordDefinition();
                    this._proxy.$setWordDefinitions([
                        {
                            languageId: e.languageId,
                            regexSource: wordDefinition.source,
                            regexFlags: wordDefinition.flags,
                        },
                    ]);
                }
            }));
            updateAllWordDefinitions();
        }
    }
    $unregister(handle) {
        this._registrations.deleteAndDispose(handle);
    }
    static _reviveLocationDto(data) {
        if (!data) {
            return data;
        }
        else if (Array.isArray(data)) {
            data.forEach((l) => MainThreadLanguageFeatures_1._reviveLocationDto(l));
            return data;
        }
        else {
            data.uri = URI.revive(data.uri);
            return data;
        }
    }
    static _reviveLocationLinkDto(data) {
        if (!data) {
            return data;
        }
        else if (Array.isArray(data)) {
            data.forEach((l) => MainThreadLanguageFeatures_1._reviveLocationLinkDto(l));
            return data;
        }
        else {
            data.uri = URI.revive(data.uri);
            return data;
        }
    }
    static _reviveWorkspaceSymbolDto(data) {
        if (!data) {
            return data;
        }
        else if (Array.isArray(data)) {
            data.forEach(MainThreadLanguageFeatures_1._reviveWorkspaceSymbolDto);
            return data;
        }
        else {
            data.location = MainThreadLanguageFeatures_1._reviveLocationDto(data.location);
            return data;
        }
    }
    static _reviveCodeActionDto(data, uriIdentService) {
        data?.forEach((code) => reviveWorkspaceEditDto(code.edit, uriIdentService));
        return data;
    }
    static _reviveLinkDTO(data) {
        if (data.url && typeof data.url !== 'string') {
            data.url = URI.revive(data.url);
        }
        return data;
    }
    static _reviveCallHierarchyItemDto(data) {
        if (data) {
            data.uri = URI.revive(data.uri);
        }
        return data;
    }
    static _reviveTypeHierarchyItemDto(data) {
        if (data) {
            data.uri = URI.revive(data.uri);
        }
        return data;
    }
    //#endregion
    // --- outline
    $registerDocumentSymbolProvider(handle, selector, displayName) {
        this._registrations.set(handle, this._languageFeaturesService.documentSymbolProvider.register(selector, {
            displayName,
            provideDocumentSymbols: (model, token) => {
                return this._proxy.$provideDocumentSymbols(handle, model.uri, token);
            },
        }));
    }
    // --- code lens
    $registerCodeLensSupport(handle, selector, eventHandle) {
        const provider = {
            provideCodeLenses: async (model, token) => {
                const listDto = await this._proxy.$provideCodeLenses(handle, model.uri, token);
                if (!listDto) {
                    return undefined;
                }
                return {
                    lenses: listDto.lenses,
                    dispose: () => listDto.cacheId && this._proxy.$releaseCodeLenses(handle, listDto.cacheId),
                };
            },
            resolveCodeLens: async (model, codeLens, token) => {
                const result = await this._proxy.$resolveCodeLens(handle, codeLens, token);
                if (!result) {
                    return undefined;
                }
                return {
                    ...result,
                    range: model.validateRange(result.range),
                };
            },
        };
        if (typeof eventHandle === 'number') {
            const emitter = new Emitter();
            this._registrations.set(eventHandle, emitter);
            provider.onDidChange = emitter.event;
        }
        this._registrations.set(handle, this._languageFeaturesService.codeLensProvider.register(selector, provider));
    }
    $emitCodeLensEvent(eventHandle, event) {
        const obj = this._registrations.get(eventHandle);
        if (obj instanceof Emitter) {
            obj.fire(event);
        }
    }
    // --- declaration
    $registerDefinitionSupport(handle, selector) {
        this._registrations.set(handle, this._languageFeaturesService.definitionProvider.register(selector, {
            provideDefinition: (model, position, token) => {
                return this._proxy
                    .$provideDefinition(handle, model.uri, position, token)
                    .then(MainThreadLanguageFeatures_1._reviveLocationLinkDto);
            },
        }));
    }
    $registerDeclarationSupport(handle, selector) {
        this._registrations.set(handle, this._languageFeaturesService.declarationProvider.register(selector, {
            provideDeclaration: (model, position, token) => {
                return this._proxy
                    .$provideDeclaration(handle, model.uri, position, token)
                    .then(MainThreadLanguageFeatures_1._reviveLocationLinkDto);
            },
        }));
    }
    $registerImplementationSupport(handle, selector) {
        this._registrations.set(handle, this._languageFeaturesService.implementationProvider.register(selector, {
            provideImplementation: (model, position, token) => {
                return this._proxy
                    .$provideImplementation(handle, model.uri, position, token)
                    .then(MainThreadLanguageFeatures_1._reviveLocationLinkDto);
            },
        }));
    }
    $registerTypeDefinitionSupport(handle, selector) {
        this._registrations.set(handle, this._languageFeaturesService.typeDefinitionProvider.register(selector, {
            provideTypeDefinition: (model, position, token) => {
                return this._proxy
                    .$provideTypeDefinition(handle, model.uri, position, token)
                    .then(MainThreadLanguageFeatures_1._reviveLocationLinkDto);
            },
        }));
    }
    // --- extra info
    $registerHoverProvider(handle, selector) {
        /*
        const hoverFinalizationRegistry = new FinalizationRegistry((hoverId: number) => {
            this._proxy.$releaseHover(handle, hoverId);
        });
        */
        this._registrations.set(handle, this._languageFeaturesService.hoverProvider.register(selector, {
            provideHover: async (model, position, token, context) => {
                const serializedContext = {
                    verbosityRequest: context?.verbosityRequest
                        ? {
                            verbosityDelta: context.verbosityRequest.verbosityDelta,
                            previousHover: { id: context.verbosityRequest.previousHover.id },
                        }
                        : undefined,
                };
                const hover = await this._proxy.$provideHover(handle, model.uri, position, serializedContext, token);
                // hoverFinalizationRegistry.register(hover, hover.id);
                return hover;
            },
        }));
    }
    // --- debug hover
    $registerEvaluatableExpressionProvider(handle, selector) {
        this._registrations.set(handle, this._languageFeaturesService.evaluatableExpressionProvider.register(selector, {
            provideEvaluatableExpression: (model, position, token) => {
                return this._proxy.$provideEvaluatableExpression(handle, model.uri, position, token);
            },
        }));
    }
    // --- inline values
    $registerInlineValuesProvider(handle, selector, eventHandle) {
        const provider = {
            provideInlineValues: (model, viewPort, context, token) => {
                return this._proxy.$provideInlineValues(handle, model.uri, viewPort, context, token);
            },
        };
        if (typeof eventHandle === 'number') {
            const emitter = new Emitter();
            this._registrations.set(eventHandle, emitter);
            provider.onDidChangeInlineValues = emitter.event;
        }
        this._registrations.set(handle, this._languageFeaturesService.inlineValuesProvider.register(selector, provider));
    }
    $emitInlineValuesEvent(eventHandle, event) {
        const obj = this._registrations.get(eventHandle);
        if (obj instanceof Emitter) {
            obj.fire(event);
        }
    }
    // --- occurrences
    $registerDocumentHighlightProvider(handle, selector) {
        this._registrations.set(handle, this._languageFeaturesService.documentHighlightProvider.register(selector, {
            provideDocumentHighlights: (model, position, token) => {
                return this._proxy.$provideDocumentHighlights(handle, model.uri, position, token);
            },
        }));
    }
    $registerMultiDocumentHighlightProvider(handle, selector) {
        this._registrations.set(handle, this._languageFeaturesService.multiDocumentHighlightProvider.register(selector, {
            selector: selector,
            provideMultiDocumentHighlights: (model, position, otherModels, token) => {
                return this._proxy
                    .$provideMultiDocumentHighlights(handle, model.uri, position, otherModels.map((model) => model.uri), token)
                    .then((dto) => {
                    // dto should be non-null + non-undefined
                    // dto length of 0 is valid, just no highlights, pass this through.
                    if (dto === undefined || dto === null) {
                        return undefined;
                    }
                    const result = new ResourceMap();
                    dto?.forEach((value) => {
                        // check if the URI exists already, if so, combine the highlights, otherwise create a new entry
                        const uri = URI.revive(value.uri);
                        if (result.has(uri)) {
                            result.get(uri).push(...value.highlights);
                        }
                        else {
                            result.set(uri, value.highlights);
                        }
                    });
                    return result;
                });
            },
        }));
    }
    // --- linked editing
    $registerLinkedEditingRangeProvider(handle, selector) {
        this._registrations.set(handle, this._languageFeaturesService.linkedEditingRangeProvider.register(selector, {
            provideLinkedEditingRanges: async (model, position, token) => {
                const res = await this._proxy.$provideLinkedEditingRanges(handle, model.uri, position, token);
                if (res) {
                    return {
                        ranges: res.ranges,
                        wordPattern: res.wordPattern
                            ? MainThreadLanguageFeatures_1._reviveRegExp(res.wordPattern)
                            : undefined,
                    };
                }
                return undefined;
            },
        }));
    }
    // --- references
    $registerReferenceSupport(handle, selector) {
        this._registrations.set(handle, this._languageFeaturesService.referenceProvider.register(selector, {
            provideReferences: (model, position, context, token) => {
                return this._proxy
                    .$provideReferences(handle, model.uri, position, context, token)
                    .then(MainThreadLanguageFeatures_1._reviveLocationDto);
            },
        }));
    }
    // --- code actions
    $registerCodeActionSupport(handle, selector, metadata, displayName, extensionId, supportsResolve) {
        const provider = {
            provideCodeActions: async (model, rangeOrSelection, context, token) => {
                const listDto = await this._proxy.$provideCodeActions(handle, model.uri, rangeOrSelection, context, token);
                if (!listDto) {
                    return undefined;
                }
                return {
                    actions: MainThreadLanguageFeatures_1._reviveCodeActionDto(listDto.actions, this._uriIdentService),
                    dispose: () => {
                        if (typeof listDto.cacheId === 'number') {
                            this._proxy.$releaseCodeActions(handle, listDto.cacheId);
                        }
                    },
                };
            },
            providedCodeActionKinds: metadata.providedKinds,
            documentation: metadata.documentation,
            displayName,
            extensionId,
        };
        if (supportsResolve) {
            provider.resolveCodeAction = async (codeAction, token) => {
                const resolved = await this._proxy.$resolveCodeAction(handle, codeAction.cacheId, token);
                if (resolved.edit) {
                    codeAction.edit = reviveWorkspaceEditDto(resolved.edit, this._uriIdentService);
                }
                if (resolved.command) {
                    codeAction.command = resolved.command;
                }
                return codeAction;
            };
        }
        this._registrations.set(handle, this._languageFeaturesService.codeActionProvider.register(selector, provider));
    }
    $registerPasteEditProvider(handle, selector, metadata) {
        const provider = new MainThreadPasteEditProvider(handle, this._proxy, metadata, this._uriIdentService);
        this._pasteEditProviders.set(handle, provider);
        this._registrations.set(handle, combinedDisposable(this._languageFeaturesService.documentPasteEditProvider.register(selector, provider), toDisposable(() => this._pasteEditProviders.delete(handle))));
    }
    $resolvePasteFileData(handle, requestId, dataId) {
        const provider = this._pasteEditProviders.get(handle);
        if (!provider) {
            throw new Error('Could not find provider');
        }
        return provider.resolveFileData(requestId, dataId);
    }
    // --- formatting
    $registerDocumentFormattingSupport(handle, selector, extensionId, displayName) {
        this._registrations.set(handle, this._languageFeaturesService.documentFormattingEditProvider.register(selector, {
            extensionId,
            displayName,
            provideDocumentFormattingEdits: (model, options, token) => {
                return this._proxy.$provideDocumentFormattingEdits(handle, model.uri, options, token);
            },
        }));
    }
    $registerRangeFormattingSupport(handle, selector, extensionId, displayName, supportsRanges) {
        this._registrations.set(handle, this._languageFeaturesService.documentRangeFormattingEditProvider.register(selector, {
            extensionId,
            displayName,
            provideDocumentRangeFormattingEdits: (model, range, options, token) => {
                return this._proxy.$provideDocumentRangeFormattingEdits(handle, model.uri, range, options, token);
            },
            provideDocumentRangesFormattingEdits: !supportsRanges
                ? undefined
                : (model, ranges, options, token) => {
                    return this._proxy.$provideDocumentRangesFormattingEdits(handle, model.uri, ranges, options, token);
                },
        }));
    }
    $registerOnTypeFormattingSupport(handle, selector, autoFormatTriggerCharacters, extensionId) {
        this._registrations.set(handle, this._languageFeaturesService.onTypeFormattingEditProvider.register(selector, {
            extensionId,
            autoFormatTriggerCharacters,
            provideOnTypeFormattingEdits: (model, position, ch, options, token) => {
                return this._proxy.$provideOnTypeFormattingEdits(handle, model.uri, position, ch, options, token);
            },
        }));
    }
    // --- navigate type
    $registerNavigateTypeSupport(handle, supportsResolve) {
        let lastResultId;
        const provider = {
            provideWorkspaceSymbols: async (search, token) => {
                const result = await this._proxy.$provideWorkspaceSymbols(handle, search, token);
                if (lastResultId !== undefined) {
                    this._proxy.$releaseWorkspaceSymbols(handle, lastResultId);
                }
                lastResultId = result.cacheId;
                return MainThreadLanguageFeatures_1._reviveWorkspaceSymbolDto(result.symbols);
            },
        };
        if (supportsResolve) {
            provider.resolveWorkspaceSymbol = async (item, token) => {
                const resolvedItem = await this._proxy.$resolveWorkspaceSymbol(handle, item, token);
                return resolvedItem && MainThreadLanguageFeatures_1._reviveWorkspaceSymbolDto(resolvedItem);
            };
        }
        this._registrations.set(handle, search.WorkspaceSymbolProviderRegistry.register(provider));
    }
    // --- rename
    $registerRenameSupport(handle, selector, supportResolveLocation) {
        this._registrations.set(handle, this._languageFeaturesService.renameProvider.register(selector, {
            provideRenameEdits: (model, position, newName, token) => {
                return this._proxy
                    .$provideRenameEdits(handle, model.uri, position, newName, token)
                    .then((data) => reviveWorkspaceEditDto(data, this._uriIdentService));
            },
            resolveRenameLocation: supportResolveLocation
                ? (model, position, token) => this._proxy.$resolveRenameLocation(handle, model.uri, position, token)
                : undefined,
        }));
    }
    $registerNewSymbolNamesProvider(handle, selector) {
        this._registrations.set(handle, this._languageFeaturesService.newSymbolNamesProvider.register(selector, {
            supportsAutomaticNewSymbolNamesTriggerKind: this._proxy.$supportsAutomaticNewSymbolNamesTriggerKind(handle),
            provideNewSymbolNames: (model, range, triggerKind, token) => {
                return this._proxy.$provideNewSymbolNames(handle, model.uri, range, triggerKind, token);
            },
        }));
    }
    // --- semantic tokens
    $registerDocumentSemanticTokensProvider(handle, selector, legend, eventHandle) {
        let event = undefined;
        if (typeof eventHandle === 'number') {
            const emitter = new Emitter();
            this._registrations.set(eventHandle, emitter);
            event = emitter.event;
        }
        this._registrations.set(handle, this._languageFeaturesService.documentSemanticTokensProvider.register(selector, new MainThreadDocumentSemanticTokensProvider(this._proxy, handle, legend, event)));
    }
    $emitDocumentSemanticTokensEvent(eventHandle) {
        const obj = this._registrations.get(eventHandle);
        if (obj instanceof Emitter) {
            obj.fire(undefined);
        }
    }
    $registerDocumentRangeSemanticTokensProvider(handle, selector, legend) {
        this._registrations.set(handle, this._languageFeaturesService.documentRangeSemanticTokensProvider.register(selector, new MainThreadDocumentRangeSemanticTokensProvider(this._proxy, handle, legend)));
    }
    // --- suggest
    static _inflateSuggestDto(defaultRange, data, extensionId) {
        const label = data["a" /* ISuggestDataDtoField.label */];
        const commandId = data["o" /* ISuggestDataDtoField.commandId */];
        const commandIdent = data["n" /* ISuggestDataDtoField.commandIdent */];
        const commitChars = data["k" /* ISuggestDataDtoField.commitCharacters */];
        let command;
        if (commandId) {
            command = {
                $ident: commandIdent,
                id: commandId,
                title: '',
                arguments: commandIdent ? [commandIdent] : data["p" /* ISuggestDataDtoField.commandArguments */], // Automatically fill in ident as first argument
            };
        }
        return {
            label,
            extensionId,
            kind: data["b" /* ISuggestDataDtoField.kind */] ?? 9 /* languages.CompletionItemKind.Property */,
            tags: data["m" /* ISuggestDataDtoField.kindModifier */],
            detail: data["c" /* ISuggestDataDtoField.detail */],
            documentation: data["d" /* ISuggestDataDtoField.documentation */],
            sortText: data["e" /* ISuggestDataDtoField.sortText */],
            filterText: data["f" /* ISuggestDataDtoField.filterText */],
            preselect: data["g" /* ISuggestDataDtoField.preselect */],
            insertText: data["h" /* ISuggestDataDtoField.insertText */] ?? (typeof label === 'string' ? label : label.label),
            range: data["j" /* ISuggestDataDtoField.range */] ?? defaultRange,
            insertTextRules: data["i" /* ISuggestDataDtoField.insertTextRules */],
            commitCharacters: commitChars ? Array.from(commitChars) : undefined,
            additionalTextEdits: data["l" /* ISuggestDataDtoField.additionalTextEdits */],
            command,
            // not-standard
            _id: data.x,
        };
    }
    $registerCompletionsProvider(handle, selector, triggerCharacters, supportsResolveDetails, extensionId) {
        const provider = {
            triggerCharacters,
            _debugDisplayName: `${extensionId.value}(${triggerCharacters.join('')})`,
            provideCompletionItems: async (model, position, context, token) => {
                const result = await this._proxy.$provideCompletionItems(handle, model.uri, position, context, token);
                if (!result) {
                    return result;
                }
                return {
                    suggestions: result["b" /* ISuggestResultDtoField.completions */].map((d) => MainThreadLanguageFeatures_1._inflateSuggestDto(result["a" /* ISuggestResultDtoField.defaultRanges */], d, extensionId)),
                    incomplete: result["c" /* ISuggestResultDtoField.isIncomplete */] || false,
                    duration: result["d" /* ISuggestResultDtoField.duration */],
                    dispose: () => {
                        if (typeof result.x === 'number') {
                            this._proxy.$releaseCompletionItems(handle, result.x);
                        }
                    },
                };
            },
        };
        if (supportsResolveDetails) {
            provider.resolveCompletionItem = (suggestion, token) => {
                return this._proxy.$resolveCompletionItem(handle, suggestion._id, token).then((result) => {
                    if (!result) {
                        return suggestion;
                    }
                    const newSuggestion = MainThreadLanguageFeatures_1._inflateSuggestDto(suggestion.range, result, extensionId);
                    return mixin(suggestion, newSuggestion, true);
                });
            };
        }
        this._registrations.set(handle, this._languageFeaturesService.completionProvider.register(selector, provider));
    }
    $registerInlineCompletionsSupport(handle, selector, supportsHandleEvents, extensionId, yieldsToExtensionIds, displayName, debounceDelayMs) {
        const provider = {
            provideInlineCompletions: async (model, position, context, token) => {
                return this._proxy.$provideInlineCompletions(handle, model.uri, position, context, token);
            },
            provideInlineEditsForRange: async (model, range, context, token) => {
                return this._proxy.$provideInlineEditsForRange(handle, model.uri, range, context, token);
            },
            handleItemDidShow: async (completions, item, updatedInsertText) => {
                if (supportsHandleEvents) {
                    await this._proxy.$handleInlineCompletionDidShow(handle, completions.pid, item.idx, updatedInsertText);
                }
            },
            handlePartialAccept: async (completions, item, acceptedCharacters, info) => {
                if (supportsHandleEvents) {
                    await this._proxy.$handleInlineCompletionPartialAccept(handle, completions.pid, item.idx, acceptedCharacters, info);
                }
            },
            freeInlineCompletions: (completions) => {
                this._proxy.$freeInlineCompletionsList(handle, completions.pid);
            },
            handleRejection: async (completions, item) => {
                if (supportsHandleEvents) {
                    await this._proxy.$handleInlineCompletionRejection(handle, completions.pid, item.idx);
                }
            },
            groupId: extensionId,
            yieldsToGroupIds: yieldsToExtensionIds,
            debounceDelayMs,
            displayName,
            toString() {
                return `InlineCompletionsProvider(${extensionId})`;
            },
        };
        this._registrations.set(handle, this._languageFeaturesService.inlineCompletionsProvider.register(selector, provider));
    }
    $registerInlineEditProvider(handle, selector, extensionId, displayName) {
        const provider = {
            displayName,
            provideInlineEdit: async (model, context, token) => {
                return this._proxy.$provideInlineEdit(handle, model.uri, context, token);
            },
            freeInlineEdit: (edit) => {
                this._proxy.$freeInlineEdit(handle, edit.pid);
            },
        };
        this._registrations.set(handle, this._languageFeaturesService.inlineEditProvider.register(selector, provider));
    }
    // --- parameter hints
    $registerSignatureHelpProvider(handle, selector, metadata) {
        this._registrations.set(handle, this._languageFeaturesService.signatureHelpProvider.register(selector, {
            signatureHelpTriggerCharacters: metadata.triggerCharacters,
            signatureHelpRetriggerCharacters: metadata.retriggerCharacters,
            provideSignatureHelp: async (model, position, token, context) => {
                const result = await this._proxy.$provideSignatureHelp(handle, model.uri, position, context, token);
                if (!result) {
                    return undefined;
                }
                return {
                    value: result,
                    dispose: () => {
                        this._proxy.$releaseSignatureHelp(handle, result.id);
                    },
                };
            },
        }));
    }
    // --- inline hints
    $registerInlayHintsProvider(handle, selector, supportsResolve, eventHandle, displayName) {
        const provider = {
            displayName,
            provideInlayHints: async (model, range, token) => {
                const result = await this._proxy.$provideInlayHints(handle, model.uri, range, token);
                if (!result) {
                    return;
                }
                return {
                    hints: revive(result.hints),
                    dispose: () => {
                        if (result.cacheId) {
                            this._proxy.$releaseInlayHints(handle, result.cacheId);
                        }
                    },
                };
            },
        };
        if (supportsResolve) {
            provider.resolveInlayHint = async (hint, token) => {
                const dto = hint;
                if (!dto.cacheId) {
                    return hint;
                }
                const result = await this._proxy.$resolveInlayHint(handle, dto.cacheId, token);
                if (token.isCancellationRequested) {
                    throw new CancellationError();
                }
                if (!result) {
                    return hint;
                }
                return {
                    ...hint,
                    tooltip: result.tooltip,
                    label: revive(result.label),
                    textEdits: result.textEdits,
                };
            };
        }
        if (typeof eventHandle === 'number') {
            const emitter = new Emitter();
            this._registrations.set(eventHandle, emitter);
            provider.onDidChangeInlayHints = emitter.event;
        }
        this._registrations.set(handle, this._languageFeaturesService.inlayHintsProvider.register(selector, provider));
    }
    $emitInlayHintsEvent(eventHandle) {
        const obj = this._registrations.get(eventHandle);
        if (obj instanceof Emitter) {
            obj.fire(undefined);
        }
    }
    // --- links
    $registerDocumentLinkProvider(handle, selector, supportsResolve) {
        const provider = {
            provideLinks: (model, token) => {
                return this._proxy.$provideDocumentLinks(handle, model.uri, token).then((dto) => {
                    if (!dto) {
                        return undefined;
                    }
                    return {
                        links: dto.links.map(MainThreadLanguageFeatures_1._reviveLinkDTO),
                        dispose: () => {
                            if (typeof dto.cacheId === 'number') {
                                this._proxy.$releaseDocumentLinks(handle, dto.cacheId);
                            }
                        },
                    };
                });
            },
        };
        if (supportsResolve) {
            provider.resolveLink = (link, token) => {
                const dto = link;
                if (!dto.cacheId) {
                    return link;
                }
                return this._proxy.$resolveDocumentLink(handle, dto.cacheId, token).then((obj) => {
                    return obj && MainThreadLanguageFeatures_1._reviveLinkDTO(obj);
                });
            };
        }
        this._registrations.set(handle, this._languageFeaturesService.linkProvider.register(selector, provider));
    }
    // --- colors
    $registerDocumentColorProvider(handle, selector) {
        const proxy = this._proxy;
        this._registrations.set(handle, this._languageFeaturesService.colorProvider.register(selector, {
            provideDocumentColors: (model, token) => {
                return proxy.$provideDocumentColors(handle, model.uri, token).then((documentColors) => {
                    return documentColors.map((documentColor) => {
                        const [red, green, blue, alpha] = documentColor.color;
                        const color = {
                            red: red,
                            green: green,
                            blue: blue,
                            alpha,
                        };
                        return {
                            color,
                            range: documentColor.range,
                        };
                    });
                });
            },
            provideColorPresentations: (model, colorInfo, token) => {
                return proxy.$provideColorPresentations(handle, model.uri, {
                    color: [
                        colorInfo.color.red,
                        colorInfo.color.green,
                        colorInfo.color.blue,
                        colorInfo.color.alpha,
                    ],
                    range: colorInfo.range,
                }, token);
            },
        }));
    }
    // --- folding
    $registerFoldingRangeProvider(handle, selector, extensionId, eventHandle) {
        const provider = {
            id: extensionId.value,
            provideFoldingRanges: (model, context, token) => {
                return this._proxy.$provideFoldingRanges(handle, model.uri, context, token);
            },
        };
        if (typeof eventHandle === 'number') {
            const emitter = new Emitter();
            this._registrations.set(eventHandle, emitter);
            provider.onDidChange = emitter.event;
        }
        this._registrations.set(handle, this._languageFeaturesService.foldingRangeProvider.register(selector, provider));
    }
    $emitFoldingRangeEvent(eventHandle, event) {
        const obj = this._registrations.get(eventHandle);
        if (obj instanceof Emitter) {
            obj.fire(event);
        }
    }
    // -- smart select
    $registerSelectionRangeProvider(handle, selector) {
        this._registrations.set(handle, this._languageFeaturesService.selectionRangeProvider.register(selector, {
            provideSelectionRanges: (model, positions, token) => {
                return this._proxy.$provideSelectionRanges(handle, model.uri, positions, token);
            },
        }));
    }
    // --- call hierarchy
    $registerCallHierarchyProvider(handle, selector) {
        this._registrations.set(handle, callh.CallHierarchyProviderRegistry.register(selector, {
            prepareCallHierarchy: async (document, position, token) => {
                const items = await this._proxy.$prepareCallHierarchy(handle, document.uri, position, token);
                if (!items || items.length === 0) {
                    return undefined;
                }
                return {
                    dispose: () => {
                        for (const item of items) {
                            this._proxy.$releaseCallHierarchy(handle, item._sessionId);
                        }
                    },
                    roots: items.map(MainThreadLanguageFeatures_1._reviveCallHierarchyItemDto),
                };
            },
            provideOutgoingCalls: async (item, token) => {
                const outgoing = await this._proxy.$provideCallHierarchyOutgoingCalls(handle, item._sessionId, item._itemId, token);
                if (!outgoing) {
                    return outgoing;
                }
                outgoing.forEach((value) => {
                    value.to = MainThreadLanguageFeatures_1._reviveCallHierarchyItemDto(value.to);
                });
                return outgoing;
            },
            provideIncomingCalls: async (item, token) => {
                const incoming = await this._proxy.$provideCallHierarchyIncomingCalls(handle, item._sessionId, item._itemId, token);
                if (!incoming) {
                    return incoming;
                }
                incoming.forEach((value) => {
                    value.from = MainThreadLanguageFeatures_1._reviveCallHierarchyItemDto(value.from);
                });
                return incoming;
            },
        }));
    }
    // --- configuration
    static _reviveRegExp(regExp) {
        return new RegExp(regExp.pattern, regExp.flags);
    }
    static _reviveIndentationRule(indentationRule) {
        return {
            decreaseIndentPattern: MainThreadLanguageFeatures_1._reviveRegExp(indentationRule.decreaseIndentPattern),
            increaseIndentPattern: MainThreadLanguageFeatures_1._reviveRegExp(indentationRule.increaseIndentPattern),
            indentNextLinePattern: indentationRule.indentNextLinePattern
                ? MainThreadLanguageFeatures_1._reviveRegExp(indentationRule.indentNextLinePattern)
                : undefined,
            unIndentedLinePattern: indentationRule.unIndentedLinePattern
                ? MainThreadLanguageFeatures_1._reviveRegExp(indentationRule.unIndentedLinePattern)
                : undefined,
        };
    }
    static _reviveOnEnterRule(onEnterRule) {
        return {
            beforeText: MainThreadLanguageFeatures_1._reviveRegExp(onEnterRule.beforeText),
            afterText: onEnterRule.afterText
                ? MainThreadLanguageFeatures_1._reviveRegExp(onEnterRule.afterText)
                : undefined,
            previousLineText: onEnterRule.previousLineText
                ? MainThreadLanguageFeatures_1._reviveRegExp(onEnterRule.previousLineText)
                : undefined,
            action: onEnterRule.action,
        };
    }
    static _reviveOnEnterRules(onEnterRules) {
        return onEnterRules.map(MainThreadLanguageFeatures_1._reviveOnEnterRule);
    }
    $setLanguageConfiguration(handle, languageId, _configuration) {
        const configuration = {
            comments: _configuration.comments,
            brackets: _configuration.brackets,
            wordPattern: _configuration.wordPattern
                ? MainThreadLanguageFeatures_1._reviveRegExp(_configuration.wordPattern)
                : undefined,
            indentationRules: _configuration.indentationRules
                ? MainThreadLanguageFeatures_1._reviveIndentationRule(_configuration.indentationRules)
                : undefined,
            onEnterRules: _configuration.onEnterRules
                ? MainThreadLanguageFeatures_1._reviveOnEnterRules(_configuration.onEnterRules)
                : undefined,
            autoClosingPairs: undefined,
            surroundingPairs: undefined,
            __electricCharacterSupport: undefined,
        };
        if (_configuration.autoClosingPairs) {
            configuration.autoClosingPairs = _configuration.autoClosingPairs;
        }
        else if (_configuration.__characterPairSupport) {
            // backwards compatibility
            configuration.autoClosingPairs = _configuration.__characterPairSupport.autoClosingPairs;
        }
        if (_configuration.__electricCharacterSupport &&
            _configuration.__electricCharacterSupport.docComment) {
            configuration.__electricCharacterSupport = {
                docComment: {
                    open: _configuration.__electricCharacterSupport.docComment.open,
                    close: _configuration.__electricCharacterSupport.docComment.close,
                },
            };
        }
        if (this._languageService.isRegisteredLanguageId(languageId)) {
            this._registrations.set(handle, this._languageConfigurationService.register(languageId, configuration, 100));
        }
    }
    // --- type hierarchy
    $registerTypeHierarchyProvider(handle, selector) {
        this._registrations.set(handle, typeh.TypeHierarchyProviderRegistry.register(selector, {
            prepareTypeHierarchy: async (document, position, token) => {
                const items = await this._proxy.$prepareTypeHierarchy(handle, document.uri, position, token);
                if (!items) {
                    return undefined;
                }
                return {
                    dispose: () => {
                        for (const item of items) {
                            this._proxy.$releaseTypeHierarchy(handle, item._sessionId);
                        }
                    },
                    roots: items.map(MainThreadLanguageFeatures_1._reviveTypeHierarchyItemDto),
                };
            },
            provideSupertypes: async (item, token) => {
                const supertypes = await this._proxy.$provideTypeHierarchySupertypes(handle, item._sessionId, item._itemId, token);
                if (!supertypes) {
                    return supertypes;
                }
                return supertypes.map(MainThreadLanguageFeatures_1._reviveTypeHierarchyItemDto);
            },
            provideSubtypes: async (item, token) => {
                const subtypes = await this._proxy.$provideTypeHierarchySubtypes(handle, item._sessionId, item._itemId, token);
                if (!subtypes) {
                    return subtypes;
                }
                return subtypes.map(MainThreadLanguageFeatures_1._reviveTypeHierarchyItemDto);
            },
        }));
    }
    $registerDocumentOnDropEditProvider(handle, selector, metadata) {
        const provider = new MainThreadDocumentOnDropEditProvider(handle, this._proxy, metadata, this._uriIdentService);
        this._documentOnDropEditProviders.set(handle, provider);
        this._registrations.set(handle, combinedDisposable(this._languageFeaturesService.documentDropEditProvider.register(selector, provider), toDisposable(() => this._documentOnDropEditProviders.delete(handle))));
    }
    async $resolveDocumentOnDropFileData(handle, requestId, dataId) {
        const provider = this._documentOnDropEditProviders.get(handle);
        if (!provider) {
            throw new Error('Could not find provider');
        }
        return provider.resolveDocumentOnDropFileData(requestId, dataId);
    }
};
MainThreadLanguageFeatures = MainThreadLanguageFeatures_1 = __decorate([
    extHostNamedCustomer(MainContext.MainThreadLanguageFeatures),
    __param(1, ILanguageService),
    __param(2, ILanguageConfigurationService),
    __param(3, ILanguageFeaturesService),
    __param(4, IUriIdentityService)
], MainThreadLanguageFeatures);
export { MainThreadLanguageFeatures };
let MainThreadPasteEditProvider = class MainThreadPasteEditProvider {
    constructor(_handle, _proxy, metadata, _uriIdentService) {
        this._handle = _handle;
        this._proxy = _proxy;
        this._uriIdentService = _uriIdentService;
        this.dataTransfers = new DataTransferFileCache();
        this.copyMimeTypes = metadata.copyMimeTypes ?? [];
        this.pasteMimeTypes = metadata.pasteMimeTypes ?? [];
        this.providedPasteEditKinds =
            metadata.providedPasteEditKinds?.map((kind) => new HierarchicalKind(kind)) ?? [];
        if (metadata.supportsCopy) {
            this.prepareDocumentPaste = async (model, selections, dataTransfer, token) => {
                const dataTransferDto = await typeConvert.DataTransfer.fromList(dataTransfer);
                if (token.isCancellationRequested) {
                    return undefined;
                }
                const newDataTransfer = await this._proxy.$prepareDocumentPaste(_handle, model.uri, selections, dataTransferDto, token);
                if (!newDataTransfer) {
                    return undefined;
                }
                const dataTransferOut = new VSDataTransfer();
                for (const [type, item] of newDataTransfer.items) {
                    dataTransferOut.replace(type, createStringDataTransferItem(item.asString, item.id));
                }
                return dataTransferOut;
            };
        }
        if (metadata.supportsPaste) {
            this.provideDocumentPasteEdits = async (model, selections, dataTransfer, context, token) => {
                const request = this.dataTransfers.add(dataTransfer);
                try {
                    const dataTransferDto = await typeConvert.DataTransfer.fromList(dataTransfer);
                    if (token.isCancellationRequested) {
                        return;
                    }
                    const edits = await this._proxy.$providePasteEdits(this._handle, request.id, model.uri, selections, dataTransferDto, {
                        only: context.only?.value,
                        triggerKind: context.triggerKind,
                    }, token);
                    if (!edits) {
                        return;
                    }
                    return {
                        edits: edits.map((edit) => {
                            return {
                                ...edit,
                                kind: edit.kind ? new HierarchicalKind(edit.kind.value) : new HierarchicalKind(''),
                                yieldTo: edit.yieldTo?.map((x) => ({ kind: new HierarchicalKind(x) })),
                                additionalEdit: edit.additionalEdit
                                    ? reviveWorkspaceEditDto(edit.additionalEdit, this._uriIdentService, (dataId) => this.resolveFileData(request.id, dataId))
                                    : undefined,
                            };
                        }),
                        dispose: () => {
                            this._proxy.$releasePasteEdits(this._handle, request.id);
                        },
                    };
                }
                finally {
                    request.dispose();
                }
            };
        }
        if (metadata.supportsResolve) {
            this.resolveDocumentPasteEdit = async (edit, token) => {
                const resolved = await this._proxy.$resolvePasteEdit(this._handle, edit._cacheId, token);
                if (typeof resolved.insertText !== 'undefined') {
                    edit.insertText = resolved.insertText;
                }
                if (resolved.additionalEdit) {
                    edit.additionalEdit = reviveWorkspaceEditDto(resolved.additionalEdit, this._uriIdentService);
                }
                return edit;
            };
        }
    }
    resolveFileData(requestId, dataId) {
        return this.dataTransfers.resolveFileData(requestId, dataId);
    }
};
MainThreadPasteEditProvider = __decorate([
    __param(3, IUriIdentityService)
], MainThreadPasteEditProvider);
let MainThreadDocumentOnDropEditProvider = class MainThreadDocumentOnDropEditProvider {
    constructor(_handle, _proxy, metadata, _uriIdentService) {
        this._handle = _handle;
        this._proxy = _proxy;
        this._uriIdentService = _uriIdentService;
        this.dataTransfers = new DataTransferFileCache();
        this.dropMimeTypes = metadata?.dropMimeTypes ?? ['*/*'];
        this.providedDropEditKinds = metadata?.providedDropKinds?.map((kind) => new HierarchicalKind(kind));
        if (metadata?.supportsResolve) {
            this.resolveDocumentDropEdit = async (edit, token) => {
                const resolved = await this._proxy.$resolvePasteEdit(this._handle, edit._cacheId, token);
                if (resolved.additionalEdit) {
                    edit.additionalEdit = reviveWorkspaceEditDto(resolved.additionalEdit, this._uriIdentService);
                }
                return edit;
            };
        }
    }
    async provideDocumentDropEdits(model, position, dataTransfer, token) {
        const request = this.dataTransfers.add(dataTransfer);
        try {
            const dataTransferDto = await typeConvert.DataTransfer.fromList(dataTransfer);
            if (token.isCancellationRequested) {
                return;
            }
            const edits = await this._proxy.$provideDocumentOnDropEdits(this._handle, request.id, model.uri, position, dataTransferDto, token);
            if (!edits) {
                return;
            }
            return {
                edits: edits.map((edit) => {
                    return {
                        ...edit,
                        yieldTo: edit.yieldTo?.map((x) => ({ kind: new HierarchicalKind(x) })),
                        kind: edit.kind ? new HierarchicalKind(edit.kind) : undefined,
                        additionalEdit: reviveWorkspaceEditDto(edit.additionalEdit, this._uriIdentService, (dataId) => this.resolveDocumentOnDropFileData(request.id, dataId)),
                    };
                }),
                dispose: () => {
                    this._proxy.$releaseDocumentOnDropEdits(this._handle, request.id);
                },
            };
        }
        finally {
            request.dispose();
        }
    }
    resolveDocumentOnDropFileData(requestId, dataId) {
        return this.dataTransfers.resolveFileData(requestId, dataId);
    }
};
MainThreadDocumentOnDropEditProvider = __decorate([
    __param(3, IUriIdentityService)
], MainThreadDocumentOnDropEditProvider);
export class MainThreadDocumentSemanticTokensProvider {
    constructor(_proxy, _handle, _legend, onDidChange) {
        this._proxy = _proxy;
        this._handle = _handle;
        this._legend = _legend;
        this.onDidChange = onDidChange;
    }
    releaseDocumentSemanticTokens(resultId) {
        if (resultId) {
            this._proxy.$releaseDocumentSemanticTokens(this._handle, parseInt(resultId, 10));
        }
    }
    getLegend() {
        return this._legend;
    }
    async provideDocumentSemanticTokens(model, lastResultId, token) {
        const nLastResultId = lastResultId ? parseInt(lastResultId, 10) : 0;
        const encodedDto = await this._proxy.$provideDocumentSemanticTokens(this._handle, model.uri, nLastResultId, token);
        if (!encodedDto) {
            return null;
        }
        if (token.isCancellationRequested) {
            return null;
        }
        const dto = decodeSemanticTokensDto(encodedDto);
        if (dto.type === 'full') {
            return {
                resultId: String(dto.id),
                data: dto.data,
            };
        }
        return {
            resultId: String(dto.id),
            edits: dto.deltas,
        };
    }
}
export class MainThreadDocumentRangeSemanticTokensProvider {
    constructor(_proxy, _handle, _legend) {
        this._proxy = _proxy;
        this._handle = _handle;
        this._legend = _legend;
    }
    getLegend() {
        return this._legend;
    }
    async provideDocumentRangeSemanticTokens(model, range, token) {
        const encodedDto = await this._proxy.$provideDocumentRangeSemanticTokens(this._handle, model.uri, range, token);
        if (!encodedDto) {
            return null;
        }
        if (token.isCancellationRequested) {
            return null;
        }
        const dto = decodeSemanticTokensDto(encodedDto);
        if (dto.type === 'full') {
            return {
                resultId: String(dto.id),
                data: dto.data,
            };
        }
        throw new Error(`Unexpected`);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZExhbmd1YWdlRmVhdHVyZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2Jyb3dzZXIvbWFpblRocmVhZExhbmd1YWdlRmVhdHVyZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBSWhHLE9BQU8sRUFDTiw0QkFBNEIsRUFFNUIsY0FBYyxHQUNkLE1BQU0sc0NBQXNDLENBQUE7QUFDN0MsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDbEUsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLCtCQUErQixDQUFBO0FBQzlELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQzNFLE9BQU8sRUFDTixrQkFBa0IsRUFDbEIsVUFBVSxFQUNWLGFBQWEsRUFDYixZQUFZLEdBQ1osTUFBTSxtQ0FBbUMsQ0FBQTtBQUMxQyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDekQsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFLakQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFNL0UsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sbUVBQW1FLENBQUE7QUFFakgsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0scURBQXFELENBQUE7QUFDOUYsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFFOUYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0scURBQXFELENBQUE7QUFDekYsT0FB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