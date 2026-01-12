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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZHJvcEludG9FZGl0b3JDb250cm9sbGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9kcm9wT3JQYXN0ZUludG8vYnJvd3Nlci9kcm9wSW50b0VkaXRvckNvbnRyb2xsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM1RCxPQUFPLEVBRU4sdUJBQXVCLEVBQ3ZCLGdCQUFnQixHQUNoQixNQUFNLGtDQUFrQyxDQUFBO0FBRXpDLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDcEYsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDaEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFJbEUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBSXJELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQ3ZGLE9BQU8s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