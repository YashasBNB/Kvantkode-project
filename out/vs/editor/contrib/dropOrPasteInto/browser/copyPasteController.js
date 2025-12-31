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
var CopyPasteController_1;
import { addDisposableListener } from '../../../../base/browser/dom.js';
import { coalesce } from '../../../../base/common/arrays.js';
import { createCancelablePromise, DeferredPromise, raceCancellation, } from '../../../../base/common/async.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { createStringDataTransferItem, matchesMimeType, UriList, } from '../../../../base/common/dataTransfer.js';
import { isCancellationError } from '../../../../base/common/errors.js';
import { HierarchicalKind } from '../../../../base/common/hierarchicalKind.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { Mimes } from '../../../../base/common/mime.js';
import * as platform from '../../../../base/common/platform.js';
import { upcast } from '../../../../base/common/types.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { localize } from '../../../../nls.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IProgressService, } from '../../../../platform/progress/common/progress.js';
import { IQuickInputService, } from '../../../../platform/quickinput/common/quickInput.js';
import { ClipboardEventUtils } from '../../../browser/controller/editContext/clipboardUtils.js';
import { toExternalVSDataTransfer, toVSDataTransfer } from '../../../browser/dnd.js';
import { IBulkEditService } from '../../../browser/services/bulkEditService.js';
import { Range } from '../../../common/core/range.js';
import { DocumentPasteTriggerKind, } from '../../../common/languages.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
import { EditorStateCancellationTokenSource, } from '../../editorState/browser/editorState.js';
import { InlineProgressManager } from '../../inlineProgress/browser/inlineProgress.js';
import { MessageController } from '../../message/browser/messageController.js';
import { DefaultTextPasteOrDropEditProvider } from './defaultProviders.js';
import { createCombinedWorkspaceEdit, sortEditsByYieldTo } from './edit.js';
import { PostEditWidgetManager } from './postEditWidget.js';
export const changePasteTypeCommandId = 'editor.changePasteType';
export const pasteAsPreferenceConfig = 'editor.pasteAs.preferences';
export const pasteWidgetVisibleCtx = new RawContextKey('pasteWidgetVisible', false, localize('pasteWidgetVisible', 'Whether the paste widget is showing'));
const vscodeClipboardMime = 'application/vnd.code.copymetadata';
let CopyPasteController = class CopyPasteController extends Disposable {
    static { CopyPasteController_1 = this; }
    static { this.ID = 'editor.contrib.copyPasteActionController'; }
    static get(editor) {
        return editor.getContribution(CopyPasteController_1.ID);
    }
    static setConfigureDefaultAction(action) {
        CopyPasteController_1._configureDefaultAction = action;
    }
    constructor(editor, instantiationService, _bulkEditService, _clipboardService, _commandService, _configService, _languageFeaturesService, _quickInputService, _progressService) {
        super();
        this._bulkEditService = _bulkEditService;
        this._clipboardService = _clipboardService;
        this._commandService = _commandService;
        this._configService = _configService;
        this._languageFeaturesService = _languageFeaturesService;
        this._quickInputService = _quickInputService;
        this._progressService = _progressService;
        this._editor = editor;
        const container = editor.getContainerDomNode();
        this._register(addDisposableListener(container, 'copy', (e) => this.handleCopy(e)));
        this._register(addDisposableListener(container, 'cut', (e) => this.handleCopy(e)));
        this._register(addDisposableListener(container, 'paste', (e) => this.handlePaste(e), true));
        this._pasteProgressManager = this._register(new InlineProgressManager('pasteIntoEditor', editor, instantiationService));
        this._postPasteWidgetManager = this._register(instantiationService.createInstance(PostEditWidgetManager, 'pasteIntoEditor', editor, pasteWidgetVisibleCtx, {
            id: changePasteTypeCommandId,
            label: localize('postPasteWidgetTitle', 'Show paste options...'),
        }, () => CopyPasteController_1._configureDefaultAction
            ? [CopyPasteController_1._configureDefaultAction]
            : []));
    }
    changePasteType() {
        this._postPasteWidgetManager.tryShowSelector();
    }
    pasteAs(preferred) {
        this._editor.focus();
        try {
            this._pasteAsActionContext = { preferred };
            this._commandService.executeCommand('editor.action.clipboardPasteAction');
        }
        finally {
            this._pasteAsActionContext = undefined;
        }
    }
    clearWidgets() {
        this._postPasteWidgetManager.clear();
    }
    isPasteAsEnabled() {
        return this._editor.getOption(89 /* EditorOption.pasteAs */).enabled;
    }
    async finishedPaste() {
        await this._currentPasteOperation;
    }
    handleCopy(e) {
        if (!this._editor.hasTextFocus()) {
            return;
        }
        // Explicitly clear the clipboard internal state.
        // This is needed because on web, the browser clipboard is faked out using an in-memory store.
        // This means the resources clipboard is not properly updated when copying from the editor.
        this._clipboardService.clearInternalState?.();
        if (!e.clipboardData || !this.isPasteAsEnabled()) {
            return;
        }
        const model = this._editor.getModel();
        const selections = this._editor.getSelections();
        if (!model || !selections?.length) {
            return;
        }
        const enableEmptySelectionClipboard = this._editor.getOption(38 /* EditorOption.emptySelectionClipboard */);
        let ranges = selections;
        const wasFromEmptySelection = selections.length === 1 && selections[0].isEmpty();
        if (wasFromEmptySelection) {
            if (!enableEmptySelectionClipboard) {
                return;
            }
            ranges = [
                new Range(ranges[0].startLineNumber, 1, ranges[0].startLineNumber, 1 + model.getLineLength(ranges[0].startLineNumber)),
            ];
        }
        const toCopy = this._editor
            ._getViewModel()
            ?.getPlainTextToCopy(selections, enableEmptySelectionClipboard, platform.isWindows);
        const multicursorText = Array.isArray(toCopy) ? toCopy : null;
        const defaultPastePayload = {
            multicursorText,
            pasteOnNewLine: wasFromEmptySelection,
            mode: null,
        };
        const providers = this._languageFeaturesService.documentPasteEditProvider
            .ordered(model)
            .filter((x) => !!x.prepareDocumentPaste);
        if (!providers.length) {
            this.setCopyMetadata(e.clipboardData, { defaultPastePayload });
            return;
        }
        const dataTransfer = toVSDataTransfer(e.clipboardData);
        const providerCopyMimeTypes = providers.flatMap((x) => x.copyMimeTypes ?? []);
        // Save off a handle pointing to data that VS Code maintains.
        const handle = generateUuid();
        this.setCopyMetadata(e.clipboardData, {
            id: handle,
            providerCopyMimeTypes,
            defaultPastePayload,
        });
        const operations = providers.map((provider) => {
            return {
                providerMimeTypes: provider.copyMimeTypes,
                operation: createCancelablePromise((token) => provider.prepareDocumentPaste(model, ranges, dataTransfer, token).catch((err) => {
                    console.error(err);
                    return undefined;
                })),
            };
        });
        CopyPasteController_1._currentCopyOperation?.operations.forEach((entry) => entry.operation.cancel());
        CopyPasteController_1._currentCopyOperation = { handle, operations };
    }
    async handlePaste(e) {
        if (!e.clipboardData || !this._editor.hasTextFocus()) {
            return;
        }
        MessageController.get(this._editor)?.closeMessage();
        this._currentPasteOperation?.cancel();
        this._currentPasteOperation = undefined;
        const model = this._editor.getModel();
        const selections = this._editor.getSelections();
        if (!selections?.length || !model) {
            return;
        }
        if (this._editor.getOption(96 /* EditorOption.readOnly */) || // Never enabled if editor is readonly.
            (!this.isPasteAsEnabled() && !this._pasteAsActionContext) // Or feature disabled (but still enable if paste was explicitly requested)
        ) {
            return;
        }
        const metadata = this.fetchCopyMetadata(e);
        const dataTransfer = toExternalVSDataTransfer(e.clipboardData);
        dataTransfer.delete(vscodeClipboardMime);
        const fileTypes = Array.from(e.clipboardData.files).map((file) => file.type);
        const allPotentialMimeTypes = [
            ...e.clipboardData.types,
            ...fileTypes,
            ...(metadata?.providerCopyMimeTypes ?? []),
            // TODO: always adds `uri-list` because this get set if there are resources in the system clipboard.
            // However we can only check the system clipboard async. For this early check, just add it in.
            // We filter providers again once we have the final dataTransfer we will use.
            Mimes.uriList,
        ];
        const allProviders = this._languageFeaturesService.documentPasteEditProvider
            .ordered(model)
            .filter((provider) => {
            // Filter out providers that don't match the requested paste types
            const preference = this._pasteAsActionContext?.preferred;
            if (preference) {
                if (!this.providerMatchesPreference(provider, preference)) {
                    return false;
                }
            }
            // And providers that don't handle any of mime types in the clipboard
            return provider.pasteMimeTypes?.some((type) => matchesMimeType(type, allPotentialMimeTypes));
        });
        if (!allProviders.length) {
            if (this._pasteAsActionContext?.preferred) {
                this.showPasteAsNoEditMessage(selections, this._pasteAsActionContext.preferred);
                // Also prevent default paste from applying
                e.preventDefault();
                e.stopImmediatePropagation();
            }
            return;
        }
        // Prevent the editor's default paste handler from running.
        // Note that after this point, we are fully responsible for handling paste.
        // If we can't provider a paste for any reason, we need to explicitly delegate pasting back to the editor.
        e.preventDefault();
        e.stopImmediatePropagation();
        if (this._pasteAsActionContext) {
            this.showPasteAsPick(this._pasteAsActionContext.preferred, allProviders, selections, dataTransfer, metadata);
        }
        else {
            this.doPasteInline(allProviders, selections, dataTransfer, metadata, e);
        }
    }
    showPasteAsNoEditMessage(selections, preference) {
        const kindLabel = 'only' in preference
            ? preference.only.value
            : 'preferences' in preference
                ? preference.preferences.length
                    ? preference.preferences.map((preference) => preference.value).join(', ')
                    : localize('noPreferences', 'empty')
                : preference.providerId;
        MessageController.get(this._editor)?.showMessage(localize('pasteAsError', "No paste edits for '{0}' found", kindLabel), selections[0].getStartPosition());
    }
    doPasteInline(allProviders, selections, dataTransfer, metadata, clipboardEvent) {
        const editor = this._editor;
        if (!editor.hasModel()) {
            return;
        }
        const editorStateCts = new EditorStateCancellationTokenSource(editor, 1 /* CodeEditorStateFlag.Value */ | 2 /* CodeEditorStateFlag.Selection */, undefined);
        const p = createCancelablePromise(async (pToken) => {
            const editor = this._editor;
            if (!editor.hasModel()) {
                return;
            }
            const model = editor.getModel();
            const disposables = new DisposableStore();
            const cts = disposables.add(new CancellationTokenSource(pToken));
            disposables.add(editorStateCts.token.onCancellationRequested(() => cts.cancel()));
            const token = cts.token;
            try {
                await this.mergeInDataFromCopy(allProviders, dataTransfer, metadata, token);
                if (token.isCancellationRequested) {
                    return;
                }
                const supportedProviders = allProviders.filter((provider) => this.isSupportedPasteProvider(provider, dataTransfer));
                if (!supportedProviders.length ||
                    (supportedProviders.length === 1 &&
                        supportedProviders[0] instanceof DefaultTextPasteOrDropEditProvider) // Only our default text provider is active
                ) {
                    return this.applyDefaultPasteHandler(dataTransfer, metadata, token, clipboardEvent);
                }
                const context = {
                    triggerKind: DocumentPasteTriggerKind.Automatic,
                };
                const editSession = await this.getPasteEdits(supportedProviders, dataTransfer, model, selections, context, token);
                disposables.add(editSession);
                if (token.isCancellationRequested) {
                    return;
                }
                // If the only edit returned is our default text edit, use the default paste handler
                if (editSession.edits.length === 1 &&
                    editSession.edits[0].provider instanceof DefaultTextPasteOrDropEditProvider) {
                    return this.applyDefaultPasteHandler(dataTransfer, metadata, token, clipboardEvent);
                }
                if (editSession.edits.length) {
                    const canShowWidget = editor.getOption(89 /* EditorOption.pasteAs */).showPasteSelector === 'afterPaste';
                    return this._postPasteWidgetManager.applyEditAndShowIfNeeded(selections, {
                        activeEditIndex: this.getInitialActiveEditIndex(model, editSession.edits),
                        allEdits: editSession.edits,
                    }, canShowWidget, async (edit, resolveToken) => {
                        if (!edit.provider.resolveDocumentPasteEdit) {
                            return edit;
                        }
                        const resolveP = edit.provider.resolveDocumentPasteEdit(edit, resolveToken);
                        const showP = new DeferredPromise();
                        const resolved = await this._pasteProgressManager.showWhile(selections[0].getEndPosition(), localize('resolveProcess', "Resolving paste edit for '{0}'. Click to cancel", edit.title), raceCancellation(Promise.race([showP.p, resolveP]), resolveToken), {
                            cancel: () => showP.cancel(),
                        }, 0);
                        if (resolved) {
                            edit.insertText = resolved.insertText;
                            edit.additionalEdit = resolved.additionalEdit;
                        }
                        return edit;
                    }, token);
                }
                await this.applyDefaultPasteHandler(dataTransfer, metadata, token, clipboardEvent);
            }
            finally {
                disposables.dispose();
                if (this._currentPasteOperation === p) {
                    this._currentPasteOperation = undefined;
                }
            }
        });
        this._pasteProgressManager
            .showWhile(selections[0].getEndPosition(), localize('pasteIntoEditorProgress', 'Running paste handlers. Click to cancel and do basic paste'), p, {
            cancel: async () => {
                try {
                    p.cancel();
                    if (editorStateCts.token.isCancellationRequested) {
                        return;
                    }
                    await this.applyDefaultPasteHandler(dataTransfer, metadata, editorStateCts.token, clipboardEvent);
                }
                finally {
                    editorStateCts.dispose();
                }
            },
        })
            .then(() => {
            editorStateCts.dispose();
        });
        this._currentPasteOperation = p;
    }
    showPasteAsPick(preference, allProviders, selections, dataTransfer, metadata) {
        const p = createCancelablePromise(async (token) => {
            const editor = this._editor;
            if (!editor.hasModel()) {
                return;
            }
            const model = editor.getModel();
            const disposables = new DisposableStore();
            const tokenSource = disposables.add(new EditorStateCancellationTokenSource(editor, 1 /* CodeEditorStateFlag.Value */ | 2 /* CodeEditorStateFlag.Selection */, undefined, token));
            try {
                await this.mergeInDataFromCopy(allProviders, dataTransfer, metadata, tokenSource.token);
                if (tokenSource.token.isCancellationRequested) {
                    return;
                }
                // Filter out any providers the don't match the full data transfer we will send them.
                let supportedProviders = allProviders.filter((provider) => this.isSupportedPasteProvider(provider, dataTransfer, preference));
                if (preference) {
                    // We are looking for a specific edit
                    supportedProviders = supportedProviders.filter((provider) => this.providerMatchesPreference(provider, preference));
                }
                const context = {
                    triggerKind: DocumentPasteTriggerKind.PasteAs,
                    only: preference && 'only' in preference ? preference.only : undefined,
                };
                let editSession = disposables.add(await this.getPasteEdits(supportedProviders, dataTransfer, model, selections, context, tokenSource.token));
                if (tokenSource.token.isCancellationRequested) {
                    return;
                }
                // Filter out any edits that don't match the requested kind
                if (preference) {
                    editSession = {
                        edits: editSession.edits.filter((edit) => {
                            if ('only' in preference) {
                                return preference.only.contains(edit.kind);
                            }
                            else if ('preferences' in preference) {
                                return preference.preferences.some((preference) => preference.contains(edit.kind));
                            }
                            else {
                                return preference.providerId === edit.provider.id;
                            }
                        }),
                        dispose: editSession.dispose,
                    };
                }
                if (!editSession.edits.length) {
                    if (preference) {
                        this.showPasteAsNoEditMessage(selections, preference);
                    }
                    return;
                }
                let pickedEdit;
                if (preference) {
                    pickedEdit = editSession.edits.at(0);
                }
                else {
                    const configureDefaultItem = {
                        id: 'editor.pasteAs.default',
                        label: localize('pasteAsDefault', 'Configure default paste action'),
                        edit: undefined,
                    };
                    const selected = await this._quickInputService.pick([
                        ...editSession.edits.map((edit) => ({
                            label: edit.title,
                            description: edit.kind?.value,
                            edit,
                        })),
                        ...(CopyPasteController_1._configureDefaultAction
                            ? [
                                upcast({ type: 'separator' }),
                                {
                                    label: CopyPasteController_1._configureDefaultAction.label,
                                    edit: undefined,
                                },
                            ]
                            : []),
                    ], {
                        placeHolder: localize('pasteAsPickerPlaceholder', 'Select Paste Action'),
                    });
                    if (selected === configureDefaultItem) {
                        CopyPasteController_1._configureDefaultAction?.run();
                        return;
                    }
                    pickedEdit = selected?.edit;
                }
                if (!pickedEdit) {
                    return;
                }
                const combinedWorkspaceEdit = createCombinedWorkspaceEdit(model.uri, selections, pickedEdit);
                await this._bulkEditService.apply(combinedWorkspaceEdit, { editor: this._editor });
            }
            finally {
                disposables.dispose();
                if (this._currentPasteOperation === p) {
                    this._currentPasteOperation = undefined;
                }
            }
        });
        this._progressService.withProgress({
            location: 10 /* ProgressLocation.Window */,
            title: localize('pasteAsProgress', 'Running paste handlers'),
        }, () => p);
    }
    setCopyMetadata(dataTransfer, metadata) {
        dataTransfer.setData(vscodeClipboardMime, JSON.stringify(metadata));
    }
    fetchCopyMetadata(e) {
        if (!e.clipboardData) {
            return;
        }
        // Prefer using the clipboard data we saved off
        const rawMetadata = e.clipboardData.getData(vscodeClipboardMime);
        if (rawMetadata) {
            try {
                return JSON.parse(rawMetadata);
            }
            catch {
                return undefined;
            }
        }
        // Otherwise try to extract the generic text editor metadata
        const [_, metadata] = ClipboardEventUtils.getTextData(e.clipboardData);
        if (metadata) {
            return {
                defaultPastePayload: {
                    mode: metadata.mode,
                    multicursorText: metadata.multicursorText ?? null,
                    pasteOnNewLine: !!metadata.isFromEmptySelection,
                },
            };
        }
        return undefined;
    }
    async mergeInDataFromCopy(allProviders, dataTransfer, metadata, token) {
        if (metadata?.id && CopyPasteController_1._currentCopyOperation?.handle === metadata.id) {
            // Only resolve providers that have data we may care about
            const toResolve = CopyPasteController_1._currentCopyOperation.operations
                .filter((op) => allProviders.some((provider) => provider.pasteMimeTypes.some((type) => matchesMimeType(type, op.providerMimeTypes))))
                .map((op) => op.operation);
            const toMergeResults = await Promise.all(toResolve);
            if (token.isCancellationRequested) {
                return;
            }
            // Values from higher priority providers should overwrite values from lower priority ones.
            // Reverse the array to so that the calls to `DataTransfer.replace` later will do this
            for (const toMergeData of toMergeResults.reverse()) {
                if (toMergeData) {
                    for (const [key, value] of toMergeData) {
                        dataTransfer.replace(key, value);
                    }
                }
            }
        }
        if (!dataTransfer.has(Mimes.uriList)) {
            const resources = await this._clipboardService.readResources();
            if (token.isCancellationRequested) {
                return;
            }
            if (resources.length) {
                dataTransfer.append(Mimes.uriList, createStringDataTransferItem(UriList.create(resources)));
            }
        }
    }
    async getPasteEdits(providers, dataTransfer, model, selections, context, token) {
        const disposables = new DisposableStore();
        const results = await raceCancellation(Promise.all(providers.map(async (provider) => {
            try {
                const edits = await provider.provideDocumentPasteEdits?.(model, selections, dataTransfer, context, token);
                if (edits) {
                    disposables.add(edits);
                }
                return edits?.edits?.map((edit) => ({ ...edit, provider }));
            }
            catch (err) {
                if (!isCancellationError(err)) {
                    console.error(err);
                }
                return undefined;
            }
        })), token);
        const edits = coalesce(results ?? [])
            .flat()
            .filter((edit) => {
            return !context.only || context.only.contains(edit.kind);
        });
        return {
            edits: sortEditsByYieldTo(edits),
            dispose: () => disposables.dispose(),
        };
    }
    async applyDefaultPasteHandler(dataTransfer, metadata, token, clipboardEvent) {
        const textDataTransfer = dataTransfer.get(Mimes.text) ?? dataTransfer.get('text');
        const text = (await textDataTransfer?.asString()) ?? '';
        if (token.isCancellationRequested) {
            return;
        }
        const payload = {
            clipboardEvent,
            text,
            pasteOnNewLine: metadata?.defaultPastePayload.pasteOnNewLine ?? false,
            multicursorText: metadata?.defaultPastePayload.multicursorText ?? null,
            mode: null,
        };
        this._editor.trigger('keyboard', "paste" /* Handler.Paste */, payload);
    }
    /**
     * Filter out providers if they:
     * - Don't handle any of the data transfer types we have
     * - Don't match the preferred paste kind
     */
    isSupportedPasteProvider(provider, dataTransfer, preference) {
        if (!provider.pasteMimeTypes?.some((type) => dataTransfer.matches(type))) {
            return false;
        }
        return !preference || this.providerMatchesPreference(provider, preference);
    }
    providerMatchesPreference(provider, preference) {
        if ('only' in preference) {
            return provider.providedPasteEditKinds.some((providedKind) => preference.only.contains(providedKind));
        }
        else if ('preferences' in preference) {
            return preference.preferences.some((providedKind) => preference.preferences.some((preferredKind) => preferredKind.contains(providedKind)));
        }
        else {
            return provider.id === preference.providerId;
        }
    }
    getInitialActiveEditIndex(model, edits) {
        const preferredProviders = this._configService.getValue(pasteAsPreferenceConfig, { resource: model.uri });
        for (const config of Array.isArray(preferredProviders) ? preferredProviders : []) {
            const desiredKind = new HierarchicalKind(config);
            const editIndex = edits.findIndex((edit) => desiredKind.contains(edit.kind));
            if (editIndex >= 0) {
                return editIndex;
            }
        }
        return 0;
    }
};
CopyPasteController = CopyPasteController_1 = __decorate([
    __param(1, IInstantiationService),
    __param(2, IBulkEditService),
    __param(3, IClipboardService),
    __param(4, ICommandService),
    __param(5, IConfigurationService),
    __param(6, ILanguageFeaturesService),
    __param(7, IQuickInputService),
    __param(8, IProgressService)
], CopyPasteController);
export { CopyPasteController };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29weVBhc3RlQ29udHJvbGxlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2Ryb3BPclBhc3RlSW50by9icm93c2VyL2NvcHlQYXN0ZUNvbnRyb2xsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBRXZFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM1RCxPQUFPLEVBRU4sdUJBQXVCLEVBQ3ZCLGVBQWUsRUFDZixnQkFBZ0IsR0FDaEIsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN6QyxPQUFPLEVBQXFCLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDcEcsT0FBTyxFQUNOLDRCQUE0QixFQUU1QixlQUFlLEVBQ2YsT0FBTyxHQUVQLE1BQU0seUNBQXlDLENBQUE7QUFDaEQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdkUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDOUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNsRixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDdkQsT0FBTyxLQUFLLFFBQVEsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDekQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtB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