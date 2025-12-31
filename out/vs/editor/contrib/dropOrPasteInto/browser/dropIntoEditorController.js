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
var DropIntoEditorController_1;
import { coalesce } from '../../../../base/common/arrays.js';
import { createCancelablePromise, raceCancellation, } from '../../../../base/common/async.js';
import { VSDataTransfer } from '../../../../base/common/dataTransfer.js';
import { isCancellationError } from '../../../../base/common/errors.js';
import { HierarchicalKind } from '../../../../base/common/hierarchicalKind.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { localize } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { LocalSelectionTransfer } from '../../../../platform/dnd/browser/dnd.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { toExternalVSDataTransfer } from '../../../browser/dnd.js';
import { Range } from '../../../common/core/range.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
import { DraggedTreeItemsIdentifier } from '../../../common/services/treeViewsDnd.js';
import { ITreeViewsDnDService } from '../../../common/services/treeViewsDndService.js';
import { EditorStateCancellationTokenSource, } from '../../editorState/browser/editorState.js';
import { InlineProgressManager } from '../../inlineProgress/browser/inlineProgress.js';
import { sortEditsByYieldTo } from './edit.js';
import { PostEditWidgetManager } from './postEditWidget.js';
export const dropAsPreferenceConfig = 'editor.dropIntoEditor.preferences';
export const changeDropTypeCommandId = 'editor.changeDropType';
export const dropWidgetVisibleCtx = new RawContextKey('dropWidgetVisible', false, localize('dropWidgetVisible', 'Whether the drop widget is showing'));
let DropIntoEditorController = class DropIntoEditorController extends Disposable {
    static { DropIntoEditorController_1 = this; }
    static { this.ID = 'editor.contrib.dropIntoEditorController'; }
    static get(editor) {
        return editor.getContribution(DropIntoEditorController_1.ID);
    }
    static setConfigureDefaultAction(action) {
        this._configureDefaultAction = action;
    }
    constructor(editor, instantiationService, _configService, _languageFeaturesService, _treeViewsDragAndDropService) {
        super();
        this._configService = _configService;
        this._languageFeaturesService = _languageFeaturesService;
        this._treeViewsDragAndDropService = _treeViewsDragAndDropService;
        this.treeItemsTransfer = LocalSelectionTransfer.getInstance();
        this._dropProgressManager = this._register(instantiationService.createInstance(InlineProgressManager, 'dropIntoEditor', editor));
        this._postDropWidgetManager = this._register(instantiationService.createInstance(PostEditWidgetManager, 'dropIntoEditor', editor, dropWidgetVisibleCtx, {
            id: changeDropTypeCommandId,
            label: localize('postDropWidgetTitle', 'Show drop options...'),
        }, () => DropIntoEditorController_1._configureDefaultAction
            ? [DropIntoEditorController_1._configureDefaultAction]
            : []));
        this._register(editor.onDropIntoEditor((e) => this.onDropIntoEditor(editor, e.position, e.event)));
    }
    clearWidgets() {
        this._postDropWidgetManager.clear();
    }
    changeDropType() {
        this._postDropWidgetManager.tryShowSelector();
    }
    async onDropIntoEditor(editor, position, dragEvent) {
        if (!dragEvent.dataTransfer || !editor.hasModel()) {
            return;
        }
        DropIntoEditorController_1._currentDropOperation?.cancel();
        editor.focus();
        editor.setPosition(position);
        const p = createCancelablePromise(async (token) => {
            const disposables = new DisposableStore();
            const tokenSource = disposables.add(new EditorStateCancellationTokenSource(editor, 1 /* CodeEditorStateFlag.Value */, undefined, token));
            try {
                const ourDataTransfer = await this.extractDataTransferData(dragEvent);
                if (ourDataTransfer.size === 0 || tokenSource.token.isCancellationRequested) {
                    return;
                }
                const model = editor.getModel();
                if (!model) {
                    return;
                }
                const providers = this._languageFeaturesService.documentDropEditProvider
                    .ordered(model)
                    .filter((provider) => {
                    if (!provider.dropMimeTypes) {
                        // Keep all providers that don't specify mime types
                        return true;
                    }
                    return provider.dropMimeTypes.some((mime) => ourDataTransfer.matches(mime));
                });
                const editSession = disposables.add(await this.getDropEdits(providers, model, position, ourDataTransfer, tokenSource.token));
                if (tokenSource.token.isCancellationRequested) {
                    return;
                }
                if (editSession.edits.length) {
                    const activeEditIndex = this.getInitialActiveEditIndex(model, editSession.edits);
                    const canShowWidget = editor.getOption(36 /* EditorOption.dropIntoEditor */).showDropSelector === 'afterDrop';
                    // Pass in the parent token here as it tracks cancelling the entire drop operation
                    await this._postDropWidgetManager.applyEditAndShowIfNeeded([Range.fromPositions(position)], { activeEditIndex, allEdits: editSession.edits }, canShowWidget, async (edit) => edit, token);
                }
            }
            finally {
                disposables.dispose();
                if (DropIntoEditorController_1._currentDropOperation === p) {
                    DropIntoEditorController_1._currentDropOperation = undefined;
                }
            }
        });
        this._dropProgressManager.showWhile(position, localize('dropIntoEditorProgress', 'Running drop handlers. Click to cancel'), p, { cancel: () => p.cancel() });
        DropIntoEditorController_1._currentDropOperation = p;
    }
    async getDropEdits(providers, model, position, dataTransfer, token) {
        const disposables = new DisposableStore();
        const results = await raceCancellation(Promise.all(providers.map(async (provider) => {
            try {
                const edits = await provider.provideDocumentDropEdits(model, position, dataTransfer, token);
                if (edits) {
                    disposables.add(edits);
                }
                return edits?.edits.map((edit) => ({ ...edit, providerId: provider.id }));
            }
            catch (err) {
                if (!isCancellationError(err)) {
                    console.error(err);
                }
                console.error(err);
            }
            return undefined;
        })), token);
        const edits = coalesce(results ?? []).flat();
        return {
            edits: sortEditsByYieldTo(edits),
            dispose: () => disposables.dispose(),
        };
    }
    getInitialActiveEditIndex(model, edits) {
        const preferredProviders = this._configService.getValue(dropAsPreferenceConfig, { resource: model.uri });
        for (const config of Array.isArray(preferredProviders) ? preferredProviders : []) {
            const desiredKind = new HierarchicalKind(config);
            const editIndex = edits.findIndex((edit) => edit.kind && desiredKind.contains(edit.kind));
            if (editIndex >= 0) {
                return editIndex;
            }
        }
        return 0;
    }
    async extractDataTransferData(dragEvent) {
        if (!dragEvent.dataTransfer) {
            return new VSDataTransfer();
        }
        const dataTransfer = toExternalVSDataTransfer(dragEvent.dataTransfer);
        if (this.treeItemsTransfer.hasData(DraggedTreeItemsIdentifier.prototype)) {
            const data = this.treeItemsTransfer.getData(DraggedTreeItemsIdentifier.prototype);
            if (Array.isArray(data)) {
                for (const id of data) {
                    const treeDataTransfer = await this._treeViewsDragAndDropService.removeDragOperationTransfer(id.identifier);
                    if (treeDataTransfer) {
                        for (const [type, value] of treeDataTransfer) {
                            dataTransfer.replace(type, value);
                        }
                    }
                }
            }
        }
        return dataTransfer;
    }
};
DropIntoEditorController = DropIntoEditorController_1 = __decorate([
    __param(1, IInstantiationService),
    __param(2, IConfigurationService),
    __param(3, ILanguageFeaturesService),
    __param(4, ITreeViewsDnDService)
], DropIntoEditorController);
export { DropIntoEditorController };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZHJvcEludG9FZGl0b3JDb250cm9sbGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvZHJvcE9yUGFzdGVJbnRvL2Jyb3dzZXIvZHJvcEludG9FZGl0b3JDb250cm9sbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDNUQsT0FBTyxFQUVOLHVCQUF1QixFQUN2QixnQkFBZ0IsR0FDaEIsTUFBTSxrQ0FBa0MsQ0FBQTtBQUV6QyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDeEUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdkUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDOUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNsRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3BGLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ2hGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBSWxFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUlyRCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUN2RixPQUFPLEVBQUUs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