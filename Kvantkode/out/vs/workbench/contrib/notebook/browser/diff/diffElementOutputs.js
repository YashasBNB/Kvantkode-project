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
import * as DOM from '../../../../../base/browser/dom.js';
import * as nls from '../../../../../nls.js';
import { Disposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { SideBySideDiffElementViewModel, } from './diffElementViewModel.js';
import { DiffSide } from './notebookDiffEditorBrowser.js';
import { INotebookService } from '../../common/notebookService.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { mimetypeIcon } from '../notebookIcons.js';
import { StandardKeyboardEvent } from '../../../../../base/browser/keyboardEvent.js';
import { IQuickInputService, } from '../../../../../platform/quickinput/common/quickInput.js';
export class OutputElement extends Disposable {
    constructor(_notebookEditor, _notebookTextModel, _notebookService, _quickInputService, _diffElementViewModel, _diffSide, _nestedCell, _outputContainer, output) {
        super();
        this._notebookEditor = _notebookEditor;
        this._notebookTextModel = _notebookTextModel;
        this._notebookService = _notebookService;
        this._quickInputService = _quickInputService;
        this._diffElementViewModel = _diffElementViewModel;
        this._diffSide = _diffSide;
        this._nestedCell = _nestedCell;
        this._outputContainer = _outputContainer;
        this.output = output;
        this.resizeListener = this._register(new DisposableStore());
    }
    render(index, beforeElement) {
        const outputItemDiv = document.createElement('div');
        let result = undefined;
        const [mimeTypes, pick] = this.output.resolveMimeTypes(this._notebookTextModel, undefined);
        const pickedMimeTypeRenderer = this.output.pickedMimeType || mimeTypes[pick];
        if (mimeTypes.length > 1) {
            outputItemDiv.style.position = 'relative';
            const mimeTypePicker = DOM.$('.multi-mimetype-output');
            mimeTypePicker.classList.add(...ThemeIcon.asClassNameArray(mimetypeIcon));
            mimeTypePicker.tabIndex = 0;
            mimeTypePicker.title = nls.localize('mimeTypePicker', 'Choose a different output mimetype, available mimetypes: {0}', mimeTypes.map((mimeType) => mimeType.mimeType).join(', '));
            outputItemDiv.appendChild(mimeTypePicker);
            this.resizeListener.add(DOM.addStandardDisposableListener(mimeTypePicker, 'mousedown', async (e) => {
                if (e.leftButton) {
                    e.preventDefault();
                    e.stopPropagation();
                    await this.pickActiveMimeTypeRenderer(this._notebookTextModel, this.output);
                }
            }));
            this.resizeListener.add(DOM.addDisposableListener(mimeTypePicker, DOM.EventType.KEY_DOWN, async (e) => {
                const event = new StandardKeyboardEvent(e);
                if (event.equals(3 /* KeyCode.Enter */) || event.equals(10 /* KeyCode.Space */)) {
                    e.preventDefault();
                    e.stopPropagation();
                    await this.pickActiveMimeTypeRenderer(this._notebookTextModel, this.output);
                }
            }));
        }
        const innerContainer = DOM.$('.output-inner-container');
        DOM.append(outputItemDiv, innerContainer);
        if (mimeTypes.length !== 0) {
            const renderer = this._notebookService.getRendererInfo(pickedMimeTypeRenderer.rendererId);
            result = renderer
                ? {
                    type: 1 /* RenderOutputType.Extension */,
                    renderer,
                    source: this.output,
                    mimeType: pickedMimeTypeRenderer.mimeType,
                }
                : this._renderMissingRenderer(this.output, pickedMimeTypeRenderer.mimeType);
            this.output.pickedMimeType = pickedMimeTypeRenderer;
        }
        this.domNode = outputItemDiv;
        this.renderResult = result;
        if (!result) {
            // this.viewCell.updateOutputHeight(index, 0);
            return;
        }
        if (beforeElement) {
            this._outputContainer.insertBefore(outputItemDiv, beforeElement);
        }
        else {
            this._outputContainer.appendChild(outputItemDiv);
        }
        this._notebookEditor.createOutput(this._diffElementViewModel, this._nestedCell, result, () => this.getOutputOffsetInCell(index), this._diffElementViewModel instanceof SideBySideDiffElementViewModel
            ? this._diffSide
            : this._diffElementViewModel.type === 'insert'
                ? DiffSide.Modified
                : DiffSide.Original);
    }
    _renderMissingRenderer(viewModel, preferredMimeType) {
        if (!viewModel.model.outputs.length) {
            return this._renderMessage(viewModel, nls.localize('empty', 'Cell has no output'));
        }
        if (!preferredMimeType) {
            const mimeTypes = viewModel.model.outputs.map((op) => op.mime);
            const mimeTypesMessage = mimeTypes.join(', ');
            return this._renderMessage(viewModel, nls.localize('noRenderer.2', 'No renderer could be found for output. It has the following mimetypes: {0}', mimeTypesMessage));
        }
        return this._renderSearchForMimetype(viewModel, preferredMimeType);
    }
    _renderSearchForMimetype(viewModel, mimeType) {
        const query = `@tag:notebookRenderer ${mimeType}`;
        const p = DOM.$('p', undefined, `No renderer could be found for mimetype "${mimeType}", but one might be available on the Marketplace.`);
        const a = DOM.$('a', {
            href: `command:workbench.extensions.search?%22${query}%22`,
            class: 'monaco-button monaco-text-button',
            tabindex: 0,
            role: 'button',
            style: 'padding: 8px; text-decoration: none; color: rgb(255, 255, 255); background-color: rgb(14, 99, 156); max-width: 200px;',
        }, `Search Marketplace`);
        return {
            type: 0 /* RenderOutputType.Html */,
            source: viewModel,
            htmlContent: p.outerHTML + a.outerHTML,
        };
    }
    _renderMessage(viewModel, message) {
        const el = DOM.$('p', undefined, message);
        return { type: 0 /* RenderOutputType.Html */, source: viewModel, htmlContent: el.outerHTML };
    }
    async pickActiveMimeTypeRenderer(notebookTextModel, viewModel) {
        const [mimeTypes, currIndex] = viewModel.resolveMimeTypes(notebookTextModel, undefined);
        const items = mimeTypes
            .filter((mimeType) => mimeType.isTrusted)
            .map((mimeType, index) => ({
            label: mimeType.mimeType,
            id: mimeType.mimeType,
            index: index,
            picked: index === currIndex,
            detail: this.generateRendererInfo(mimeType.rendererId),
            description: index === currIndex
                ? nls.localize('curruentActiveMimeType', 'Currently Active')
                : undefined,
        }));
        const disposables = new DisposableStore();
        const picker = disposables.add(this._quickInputService.createQuickPick());
        picker.items = items;
        picker.activeItems = items.filter((item) => !!item.picked);
        picker.placeholder =
            items.length !== mimeTypes.length
                ? nls.localize('promptChooseMimeTypeInSecure.placeHolder', 'Select mimetype to render for current output. Rich mimetypes are available only when the notebook is trusted')
                : nls.localize('promptChooseMimeType.placeHolder', 'Select mimetype to render for current output');
        const pick = await new Promise((resolve) => {
            disposables.add(picker.onDidAccept(() => {
                resolve(picker.selectedItems.length === 1
                    ? picker.selectedItems[0].index
                    : undefined);
                disposables.dispose();
            }));
            picker.show();
        });
        if (pick === undefined) {
            return;
        }
        if (pick !== currIndex) {
            // user chooses another mimetype
            const index = this._nestedCell.outputsViewModels.indexOf(viewModel);
            const nextElement = this.domNode.nextElementSibling;
            this.resizeListener.clear();
            const element = this.domNode;
            if (element) {
                element.remove();
                this._notebookEditor.removeInset(this._diffElementViewModel, this._nestedCell, viewModel, this._diffSide);
            }
            viewModel.pickedMimeType = mimeTypes[pick];
            this.render(index, nextElement);
        }
    }
    generateRendererInfo(renderId) {
        const renderInfo = this._notebookService.getRendererInfo(renderId);
        if (renderInfo) {
            const displayName = renderInfo.displayName !== '' ? renderInfo.displayName : renderInfo.id;
            return `${displayName} (${renderInfo.extensionId.value})`;
        }
        return nls.localize('builtinRenderInfo', 'built-in');
    }
    getCellOutputCurrentIndex() {
        return this._diffElementViewModel
            .getNestedCellViewModel(this._diffSide)
            .outputs.indexOf(this.output.model);
    }
    updateHeight(index, height) {
        this._diffElementViewModel.updateOutputHeight(this._diffSide, index, height);
    }
    getOutputOffsetInContainer(index) {
        return this._diffElementViewModel.getOutputOffsetInContainer(this._diffSide, index);
    }
    getOutputOffsetInCell(index) {
        return this._diffElementViewModel.getOutputOffsetInCell(this._diffSide, index);
    }
}
let OutputContainer = class OutputContainer extends Disposable {
    constructor(_editor, _notebookTextModel, _diffElementViewModel, _nestedCellViewModel, _diffSide, _outputContainer, _notebookService, _quickInputService) {
        super();
        this._editor = _editor;
        this._notebookTextModel = _notebookTextModel;
        this._diffElementViewModel = _diffElementViewModel;
        this._nestedCellViewModel = _nestedCellViewModel;
        this._diffSide = _diffSide;
        this._outputContainer = _outputContainer;
        this._notebookService = _notebookService;
        this._quickInputService = _quickInputService;
        this._outputEntries = new Map();
        this._register(this._diffElementViewModel.onDidLayoutChange(() => {
            this._outputEntries.forEach((value, key) => {
                const index = _nestedCellViewModel.outputs.indexOf(key.model);
                if (index >= 0) {
                    const top = this._diffElementViewModel.getOutputOffsetInContainer(this._diffSide, index);
                    value.domNode.style.top = `${top}px`;
                }
            });
        }));
        this._register(this._nestedCellViewModel.textModel.onDidChangeOutputs((splice) => {
            this._updateOutputs(splice);
        }));
    }
    _updateOutputs(splice) {
        const removedKeys = [];
        this._outputEntries.forEach((value, key) => {
            if (this._nestedCellViewModel.outputsViewModels.indexOf(key) < 0) {
                // already removed
                removedKeys.push(key);
                // remove element from DOM
                value.domNode.remove();
                this._editor.removeInset(this._diffElementViewModel, this._nestedCellViewModel, key, this._diffSide);
            }
        });
        removedKeys.forEach((key) => {
            this._outputEntries.get(key)?.dispose();
            this._outputEntries.delete(key);
        });
        let prevElement = undefined;
        const outputsToRender = this._nestedCellViewModel.outputsViewModels;
        outputsToRender.reverse().forEach((output) => {
            if (this._outputEntries.has(output)) {
                // already exist
                prevElement = this._outputEntries.get(output).domNode;
                return;
            }
            // newly added element
            const currIndex = this._nestedCellViewModel.outputsViewModels.indexOf(output);
            this._renderOutput(output, currIndex, prevElement);
            prevElement = this._outputEntries.get(output)?.domNode;
        });
    }
    render() {
        // TODO, outputs to render (should have a limit)
        for (let index = 0; index < this._nestedCellViewModel.outputsViewModels.length; index++) {
            const currOutput = this._nestedCellViewModel.outputsViewModels[index];
            // always add to the end
            this._renderOutput(currOutput, index, undefined);
        }
    }
    showOutputs() {
        for (let index = 0; index < this._nestedCellViewModel.outputsViewModels.length; index++) {
            const currOutput = this._nestedCellViewModel.outputsViewModels[index];
            // always add to the end
            this._editor.showInset(this._diffElementViewModel, currOutput.cellViewModel, currOutput, this._diffSide);
        }
    }
    hideOutputs() {
        this._outputEntries.forEach((outputElement, cellOutputViewModel) => {
            this._editor.hideInset(this._diffElementViewModel, this._nestedCellViewModel, cellOutputViewModel);
        });
    }
    _renderOutput(currOutput, index, beforeElement) {
        if (!this._outputEntries.has(currOutput)) {
            this._outputEntries.set(currOutput, new OutputElement(this._editor, this._notebookTextModel, this._notebookService, this._quickInputService, this._diffElementViewModel, this._diffSide, this._nestedCellViewModel, this._outputContainer, currOutput));
        }
        const renderElement = this._outputEntries.get(currOutput);
        renderElement.render(index, beforeElement);
    }
};
OutputContainer = __decorate([
    __param(6, INotebookService),
    __param(7, IQuickInputService)
], OutputContainer);
export { OutputContainer };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlmZkVsZW1lbnRPdXRwdXRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL2RpZmYvZGlmZkVsZW1lbnRPdXRwdXRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0NBQW9DLENBQUE7QUFDekQsT0FBTyxLQUFLLEdBQUcsTUFBTSx1QkFBdUIsQ0FBQTtBQUM1QyxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3JGLE9BQU8sRUFFTiw4QkFBOEIsR0FDOUIsTUFBTSwyQkFBMkIsQ0FBQTtBQUNsQyxPQUFPLEVBQUUsUUFBUSxFQUEyQixNQUFNLGdDQUFnQyxDQUFBO0FBSWxGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBRWxFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFDbEQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFFcEYsT0FBTyxFQUNOLGtCQUFrQixHQUVsQixNQUFNLHlEQUF5RCxDQUFBO0FBTWhFLE1BQU0sT0FBTyxhQUFjLFNBQVEsVUFBVTtJQUs1QyxZQUNTLGVBQXdDLEVBQ3hDLGtCQUFxQyxFQUNyQyxnQkFBa0MsRUFDbEMsa0JBQXNDLEVBQ3RDLHFCQUFtRCxFQUNuRCxTQUFtQixFQUNuQixXQUFvQyxFQUNwQyxnQkFBNkIsRUFDNUIsTUFBNEI7UUFFckMsS0FBSyxFQUFFLENBQUE7UUFWQyxvQkFBZSxHQUFmLGVBQWUsQ0FBeUI7UUFDeEMsdUJBQWtCLEdBQWxCLGtCQUFrQixD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