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
var StandaloneColorPickerWidget_1;
import '../colorPicker.css';
import { Disposable, MutableDisposable } from '../../../../../base/common/lifecycle.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { EditorHoverStatusBar } from '../../../hover/browser/contentHoverStatusBar.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
import { Emitter } from '../../../../../base/common/event.js';
import { ILanguageFeaturesService } from '../../../../common/services/languageFeatures.js';
import { DefaultDocumentColorProvider } from '../defaultDocumentColorProvider.js';
import { IEditorWorkerService } from '../../../../common/services/editorWorker.js';
import { StandaloneColorPickerParticipant, } from './standaloneColorPickerParticipant.js';
import * as dom from '../../../../../base/browser/dom.js';
import { IHoverService } from '../../../../../platform/hover/browser/hover.js';
class StandaloneColorPickerResult {
    // The color picker result consists of: an array of color results and a boolean indicating if the color was found in the editor
    constructor(value, foundInEditor) {
        this.value = value;
        this.foundInEditor = foundInEditor;
    }
}
const PADDING = 8;
const CLOSE_BUTTON_WIDTH = 22;
let StandaloneColorPickerWidget = class StandaloneColorPickerWidget extends Disposable {
    static { StandaloneColorPickerWidget_1 = this; }
    static { this.ID = 'editor.contrib.standaloneColorPickerWidget'; }
    constructor(_editor, _standaloneColorPickerVisible, _standaloneColorPickerFocused, _instantiationService, _keybindingService, _languageFeaturesService, _editorWorkerService, _hoverService) {
        super();
        this._editor = _editor;
        this._standaloneColorPickerVisible = _standaloneColorPickerVisible;
        this._standaloneColorPickerFocused = _standaloneColorPickerFocused;
        this._keybindingService = _keybindingService;
        this._languageFeaturesService = _languageFeaturesService;
        this._editorWorkerService = _editorWorkerService;
        this._hoverService = _hoverService;
        this.allowEditorOverflow = true;
        this._position = undefined;
        this._body = document.createElement('div');
        this._colorHover = null;
        this._selectionSetInEditor = false;
        this._onResult = this._register(new Emitter());
        this.onResult = this._onResult.event;
        this._renderedHoverParts = this._register(new MutableDisposable());
        this._renderedStatusBar = this._register(new MutableDisposable());
        this._standaloneColorPickerVisible.set(true);
        this._standaloneColorPickerParticipant = _instantiationService.createInstance(StandaloneColorPickerParticipant, this._editor);
        this._position = this._editor._getViewModel()?.getPrimaryCursorState().modelState.position;
        const editorSelection = this._editor.getSelection();
        const selection = editorSelection
            ? {
                startLineNumber: editorSelection.startLineNumber,
                startColumn: editorSelection.startColumn,
                endLineNumber: editorSelection.endLineNumber,
                endColumn: editorSelection.endColumn,
            }
            : { startLineNumber: 0, endLineNumber: 0, endColumn: 0, startColumn: 0 };
        const focusTracker = this._register(dom.trackFocus(this._body));
        this._register(focusTracker.onDidBlur((_) => {
            this.hide();
        }));
        this._register(focusTracker.onDidFocus((_) => {
            this.focus();
        }));
        // When the cursor position changes, hide the color picker
        this._register(this._editor.onDidChangeCursorPosition(() => {
            // Do not hide the color picker when the cursor changes position due to the keybindings
            if (!this._selectionSetInEditor) {
                this.hide();
            }
            else {
                this._selectionSetInEditor = false;
            }
        }));
        this._register(this._editor.onMouseMove((e) => {
            const classList = e.target.element?.classList;
            if (classList && classList.contains('colorpicker-color-decoration')) {
                this.hide();
            }
        }));
        this._register(this.onResult((result) => {
            this._render(result.value, result.foundInEditor);
        }));
        this._start(selection);
        this._body.style.zIndex = '50';
        this._editor.addContentWidget(this);
    }
    updateEditor() {
        if (this._colorHover) {
            this._standaloneColorPickerParticipant.updateEditorModel(this._colorHover);
        }
    }
    getId() {
        return StandaloneColorPickerWidget_1.ID;
    }
    getDomNode() {
        return this._body;
    }
    getPosition() {
        if (!this._position) {
            return null;
        }
        const positionPreference = this._editor.getOption(62 /* EditorOption.hover */).above;
        return {
            position: this._position,
            secondaryPosition: this._position,
            preference: positionPreference
                ? [1 /* ContentWidgetPositionPreference.ABOVE */, 2 /* ContentWidgetPositionPreference.BELOW */]
                : [2 /* ContentWidgetPositionPreference.BELOW */, 1 /* ContentWidgetPositionPreference.ABOVE */],
            positionAffinity: 2 /* PositionAffinity.None */,
        };
    }
    hide() {
        this.dispose();
        this._standaloneColorPickerVisible.set(false);
        this._standaloneColorPickerFocused.set(false);
        this._editor.removeContentWidget(this);
        this._editor.focus();
    }
    focus() {
        this._standaloneColorPickerFocused.set(true);
        this._body.focus();
    }
    async _start(selection) {
        const computeAsyncResult = await this._computeAsync(selection);
        if (!computeAsyncResult) {
            return;
        }
        this._onResult.fire(new StandaloneColorPickerResult(computeAsyncResult.result, computeAsyncResult.foundInEditor));
    }
    async _computeAsync(range) {
        if (!this._editor.hasModel()) {
            return null;
        }
        const colorInfo = {
            range: range,
            color: { red: 0, green: 0, blue: 0, alpha: 1 },
        };
        const colorHoverResult = await this._standaloneColorPickerParticipant.createColorHover(colorInfo, new DefaultDocumentColorProvider(this._editorWorkerService), this._languageFeaturesService.colorProvider);
        if (!colorHoverResult) {
            return null;
        }
        return { result: colorHoverResult.colorHover, foundInEditor: colorHoverResult.foundInEditor };
    }
    _render(colorHover, foundInEditor) {
        const fragment = document.createDocumentFragment();
        this._renderedStatusBar.value = this._register(new EditorHoverStatusBar(this._keybindingService, this._hoverService));
        const context = {
            fragment,
            statusBar: this._renderedStatusBar.value,
            onContentsChanged: () => { },
            setMinimumDimensions: () => { },
            hide: () => this.hide(),
            focus: () => this.focus(),
        };
        this._colorHover = colorHover;
        this._renderedHoverParts.value = this._standaloneColorPickerParticipant.renderHoverParts(context, [colorHover]);
        if (!this._renderedHoverParts.value) {
            this._renderedStatusBar.clear();
            this._renderedHoverParts.clear();
            return;
        }
        const colorPicker = this._renderedHoverParts.value.colorPicker;
        this._body.classList.add('standalone-colorpicker-body');
        this._body.style.maxHeight = Math.max(this._editor.getLayoutInfo().height / 4, 250) + 'px';
        this._body.style.maxWidth = Math.max(this._editor.getLayoutInfo().width * 0.66, 500) + 'px';
        this._body.tabIndex = 0;
        this._body.appendChild(fragment);
        colorPicker.layout();
        const colorPickerBody = colorPicker.body;
        const saturationBoxWidth = colorPickerBody.saturationBox.domNode.clientWidth;
        const widthOfOriginalColorBox = colorPickerBody.domNode.clientWidth - saturationBoxWidth - CLOSE_BUTTON_WIDTH - PADDING;
        const enterButton = colorPicker.body.enterButton;
        enterButton?.onClicked(() => {
            this.updateEditor();
            this.hide();
        });
        const colorPickerHeader = colorPicker.header;
        const pickedColorNode = colorPickerHeader.pickedColorNode;
        pickedColorNode.style.width = saturationBoxWidth + PADDING + 'px';
        const originalColorNode = colorPickerHeader.originalColorNode;
        originalColorNode.style.width = widthOfOriginalColorBox + 'px';
        const closeButton = colorPicker.header.closeButton;
        closeButton?.onClicked(() => {
            this.hide();
        });
        // When found in the editor, highlight the selection in the editor
        if (foundInEditor) {
            if (enterButton) {
                enterButton.button.textContent = 'Replace';
            }
            this._selectionSetInEditor = true;
            this._editor.setSelection(colorHover.range);
        }
        this._editor.layoutContentWidget(this);
    }
};
StandaloneColorPickerWidget = StandaloneColorPickerWidget_1 = __decorate([
    __param(3, IInstantiationService),
    __param(4, IKeybindingService),
    __param(5, ILanguageFeaturesService),
    __param(6, IEditorWorkerService),
    __param(7, IHoverService)
], StandaloneColorPickerWidget);
export { StandaloneColorPickerWidget };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhbmRhbG9uZUNvbG9yUGlja2VyV2lkZ2V0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9jb2xvclBpY2tlci9icm93c2VyL3N0YW5kYWxvbmVDb2xvclBpY2tlci9zdGFuZGFsb25lQ29sb3JQaWNrZXJXaWRnZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sb0JBQW9CLENBQUE7QUFDM0IsT0FBTyxFQUFFLFVBQVUsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBVXZGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ3JHLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQzVGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUc3RCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUcxRixPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUNqRixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUNsRixPQUFPLEVBRU4sZ0NBQWdDLEdBRWhDLE1BQU0sdUNBQXVDLENBQUE7QUFDOUMsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQ0FBb0MsQ0FBQTtBQUV6RCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFFOUUsTUFBTSwyQkFBMkI7SUFDaEMsK0hBQStIO0lBQy9ILFlBQ2lCLEtBQWlDLEVBQ2pDLGFBQXNCO1FBRHRCLFVBQUssR0FBTCxLQUFLLENBQTRCO1FBQ2pDLGtCQUFhLEdBQWIsYUFBYSxD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