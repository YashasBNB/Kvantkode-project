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
var AbstractChatEditingModifiedFileEntry_1;
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable, DisposableMap, MutableDisposable, } from '../../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../../base/common/network.js';
import { clamp } from '../../../../../base/common/numbers.js';
import { autorun, derived, observableValue, } from '../../../../../base/common/observable.js';
import { localize } from '../../../../../nls.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { observableConfigValue } from '../../../../../platform/observable/common/platformObservableUtils.js';
import { editorBackground, registerColor, transparent, } from '../../../../../platform/theme/common/colorRegistry.js';
import { IUndoRedoService, } from '../../../../../platform/undoRedo/common/undoRedo.js';
import { IFilesConfigurationService } from '../../../../services/filesConfiguration/common/filesConfigurationService.js';
import { IChatService } from '../../common/chatService.js';
class AutoAcceptControl {
    constructor(total, remaining, cancel) {
        this.total = total;
        this.remaining = remaining;
        this.cancel = cancel;
    }
}
export const pendingRewriteMinimap = registerColor('minimap.chatEditHighlight', transparent(editorBackground, 0.6), localize('editorSelectionBackground', 'Color of pending edit regions in the minimap'));
let AbstractChatEditingModifiedFileEntry = class AbstractChatEditingModifiedFileEntry extends Disposable {
    static { AbstractChatEditingModifiedFileEntry_1 = this; }
    static { this.scheme = 'modified-file-entry'; }
    static { this.lastEntryId = 0; }
    get telemetryInfo() {
        return this._telemetryInfo;
    }
    get lastModifyingRequestId() {
        return this._telemetryInfo.requestId;
    }
    constructor(modifiedURI, _telemetryInfo, kind, configService, _fileConfigService, _chatService, _fileService, _undoRedoService, _instantiationService) {
        super();
        this.modifiedURI = modifiedURI;
        this._telemetryInfo = _telemetryInfo;
        this._fileConfigService = _fileConfigService;
        this._chatService = _chatService;
        this._fileService = _fileService;
        this._undoRedoService = _undoRedoService;
        this._instantiationService = _instantiationService;
        this.entryId = `${AbstractChatEditingModifiedFileEntry_1.scheme}::${++AbstractChatEditingModifiedFileEntry_1.lastEntryId}`;
        this._onDidDelete = this._register(new Emitter());
        this.onDidDelete = this._onDidDelete.event;
        this._stateObs = observableValue(this, 4 /* WorkingSetEntryState.Attached */);
        this.state = this._stateObs;
        this._isCurrentlyBeingModifiedByObs = observableValue(this, undefined);
        this.isCurrentlyBeingModifiedBy = this._isCurrentlyBeingModifiedByObs;
        this._rewriteRatioObs = observableValue(this, 0);
        this.rewriteRatio = this._rewriteRatioObs;
        this._reviewModeTempObs = observableValue(this, undefined);
        this._autoAcceptCtrl = observableValue(this, undefined);
        this.autoAcceptController = this._autoAcceptCtrl;
        this._refCounter = 1;
        this._editorIntegrations = this._register(new DisposableMap());
        if (kind === 0 /* ChatEditKind.Created */) {
            this.createdInRequestId = this._telemetryInfo.requestId;
        }
        if (this.modifiedURI.scheme !== Schemas.untitled &&
            this.modifiedURI.scheme !== Schemas.vscodeNotebookCell) {
            this._register(this._fileService.watch(this.modifiedURI));
            this._register(this._fileService.onDidFilesChange((e) => {
                if (e.affects(this.modifiedURI) && kind === 0 /* ChatEditKind.Created */ && e.gotDeleted()) {
                    this._onDidDelete.fire();
                }
            }));
        }
        // review mode depends on setting and temporary override
        const autoAcceptRaw = observableConfigValue('chat.editing.autoAcceptDelay', 0, configService);
        this._autoAcceptTimeout = derived((r) => {
            const value = autoAcceptRaw.read(r);
            return clamp(value, 0, 100);
        });
        this.reviewMode = derived((r) => {
            const configuredValue = this._autoAcceptTimeout.read(r);
            const tempValue = this._reviewModeTempObs.read(r);
            return tempValue ?? configuredValue === 0;
        });
        const autoSaveOff = this._store.add(new MutableDisposable());
        this._store.add(autorun((r) => {
            if (this.isCurrentlyBeingModifiedBy.read(r)) {
                autoSaveOff.value = _fileConfigService.disableAutoSave(this.modifiedURI);
            }
            else {
                autoSaveOff.clear();
            }
        }));
    }
    dispose() {
        if (--this._refCounter === 0) {
            super.dispose();
        }
    }
    acquire() {
        this._refCounter++;
        return this;
    }
    enableReviewModeUntilSettled() {
        this._reviewModeTempObs.set(true, undefined);
        const cleanup = autorun((r) => {
            // reset config when settled
            const resetConfig = this.state.read(r) !== 0 /* WorkingSetEntryState.Modified */;
            if (resetConfig) {
                this._store.delete(cleanup);
                this._reviewModeTempObs.set(undefined, undefined);
            }
        });
        this._store.add(cleanup);
    }
    updateTelemetryInfo(telemetryInfo) {
        this._telemetryInfo = telemetryInfo;
    }
    async accept(tx) {
        if (this._stateObs.get() !== 0 /* WorkingSetEntryState.Modified */) {
            // already accepted or rejected
            return;
        }
        await this._doAccept(tx);
        this._stateObs.set(1 /* WorkingSetEntryState.Accepted */, tx);
        this._autoAcceptCtrl.set(undefined, tx);
        this._notifyAction('accepted');
    }
    async reject(tx) {
        if (this._stateObs.get() !== 0 /* WorkingSetEntryState.Modified */) {
            // already accepted or rejected
            return;
        }
        await this._doReject(tx);
        this._stateObs.set(2 /* WorkingSetEntryState.Rejected */, tx);
        this._autoAcceptCtrl.set(undefined, tx);
        this._notifyAction('rejected');
    }
    _notifyAction(outcome) {
        this._chatService.notifyUserAction({
            action: {
                kind: 'chatEditingSessionAction',
                uri: this.modifiedURI,
                hasRemainingEdits: false,
                outcome,
            },
            agentId: this._telemetryInfo.agentId,
            command: this._telemetryInfo.command,
            sessionId: this._telemetryInfo.sessionId,
            requestId: this._telemetryInfo.requestId,
            result: this._telemetryInfo.result,
        });
    }
    getEditorIntegration(pane) {
        let value = this._editorIntegrations.get(pane);
        if (!value) {
            value = this._createEditorIntegration(pane);
            this._editorIntegrations.set(pane, value);
        }
        return value;
    }
    acceptStreamingEditsStart(responseModel, tx) {
        this._resetEditsState(tx);
        this._isCurrentlyBeingModifiedByObs.set(responseModel, tx);
        this._autoAcceptCtrl.get()?.cancel();
        const undoRedoElement = this._createUndoRedoElement(responseModel);
        if (undoRedoElement) {
            this._undoRedoService.pushElement(undoRedoElement);
        }
    }
    async acceptStreamingEditsEnd(tx) {
        this._resetEditsState(tx);
        if (await this._areOriginalAndModifiedIdentical()) {
            // ACCEPT if identical
            this.accept(tx);
        }
        else if (!this.reviewMode.get() && !this._autoAcceptCtrl.get()) {
            // AUTO accept mode
            const acceptTimeout = this._autoAcceptTimeout.get() * 1000;
            const future = Date.now() + acceptTimeout;
            const update = () => {
                const reviewMode = this.reviewMode.get();
                if (reviewMode) {
                    // switched back to review mode
                    this._autoAcceptCtrl.set(undefined, undefined);
                    return;
                }
                const remain = Math.round(future - Date.now());
                if (remain <= 0) {
                    this.accept(undefined);
                }
                else {
                    const handle = setTimeout(update, 100);
                    this._autoAcceptCtrl.set(new AutoAcceptControl(acceptTimeout, remain, () => {
                        clearTimeout(handle);
                        this._autoAcceptCtrl.set(undefined, undefined);
                    }), undefined);
                }
            };
            update();
        }
    }
    _resetEditsState(tx) {
        this._isCurrentlyBeingModifiedByObs.set(undefined, tx);
        this._rewriteRatioObs.set(0, tx);
    }
};
AbstractChatEditingModifiedFileEntry = AbstractChatEditingModifiedFileEntry_1 = __decorate([
    __param(3, IConfigurationService),
    __param(4, IFilesConfigurationService),
    __param(5, IChatService),
    __param(6, IFileService),
    __param(7, IUndoRedoService),
    __param(8, IInstantiationService)
], AbstractChatEditingModifiedFileEntry);
export { AbstractChatEditingModifiedFileEntry };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRpbmdNb2RpZmllZEZpbGVFbnRyeS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0RWRpdGluZy9jaGF0RWRpdGluZ01vZGlmaWVkRmlsZUVudHJ5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDN0QsT0FBTyxFQUNOLFVBQVUsRUFDVixhQUFhLEVBQ2IsaUJBQWlCLEdBQ2pCLE1BQU0seUNBQXlDLENBQUE7QUFDaEQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUM3RCxPQUFPLEVBQ04sT0FBTyxFQUNQLE9BQU8sRUFHUCxlQUFlLEdBQ2YsTUFBTSwwQ0FBMEMsQ0FBQTtBQUlqRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDaEQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDckcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQzVFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ3JHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHNFQUFzRSxDQUFBO0FBQzVHLE9BQU8sRUFDTixnQkFBZ0IsRUFDaEIsYUFBYSxFQUNiLFdBQVcsR0FDWCxNQUFNLHVEQUF1RCxDQUFBO0FBQzlELE9BQU8sRUFFTixnQkFBZ0IsR0FDaEIsTUFBTSxxREFBcUQsQ0FBQTtBQUU1RCxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSw2RUFBNkUsQ0FBQTtBQVV4SCxPQUFP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