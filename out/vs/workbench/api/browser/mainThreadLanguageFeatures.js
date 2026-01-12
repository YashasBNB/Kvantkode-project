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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZExhbmd1YWdlRmVhdHVyZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvYnJvd3Nlci9tYWluVGhyZWFkTGFuZ3VhZ2VGZWF0dXJlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFJaEcsT0FBTyxFQUNOLDRCQUE0QixFQUU1QixjQUFjLEdBQ2QsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sK0JBQStCLENBQUE7QUFDOUQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDM0UsT0FBTyxFQUNOLGtCQUFrQixFQUNsQixVQUFVLEVBQ1YsYUFBYSxFQUNiLFlBQVksR0FDWixNQUFNLG1DQUFtQyxDQUFBO0FBQzFDLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDNUQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUtqRCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQU0vRSxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxtRUFBbUUsQ0FBQTtBQUVqSCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUM5RixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUU5RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUN6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