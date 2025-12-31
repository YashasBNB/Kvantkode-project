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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlmZkVsZW1lbnRPdXRwdXRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci9kaWZmL2RpZmZFbGVtZW50T3V0cHV0cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9DQUFvQyxDQUFBO0FBQ3pELE9BQU8sS0FBSyxHQUFHLE1BQU0sdUJBQXVCLENBQUE7QUFDNUMsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNyRixPQUFPLEVBRU4sOEJBQThCLEdBQzlCLE1BQU0sMkJBQTJCLENBQUE7QUFDbEMsT0FBTyxFQUFFLFFBQVEsRUFBMkIsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUlsRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUVsRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDbkUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBQ2xELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBRXBGLE9BQU8sRUFDTixrQkFBa0IsR0FFbEIsTUFBTSx5REFBeUQsQ0FBQTtBQU1oRSxNQUFNLE9BQU8sYUFBYyxTQUFRLFVBQVU7SUFLNUMsWUFDUyxlQUF3QyxFQUN4QyxrQkFBcUMsRUFDckMsZ0JBQWtDLEVBQ2xDLGtCQUFzQyxFQUN0QyxxQkFBbUQsRUFDbkQsU0FBbUIsRUFDbkIsV0FBb0MsRUFDcEMsZ0JBQTZCLEVBQzVCLE1BQTRCO1FBRXJDLEtBQUssRUFBRSxDQUFBO1FBVkMsb0JBQWUsR0FBZixlQUFlLENBQXlCO1FBQ3hDLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBbUI7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