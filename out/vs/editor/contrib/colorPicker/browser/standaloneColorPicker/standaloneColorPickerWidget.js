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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhbmRhbG9uZUNvbG9yUGlja2VyV2lkZ2V0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvY29sb3JQaWNrZXIvYnJvd3Nlci9zdGFuZGFsb25lQ29sb3JQaWNrZXIvc3RhbmRhbG9uZUNvbG9yUGlja2VyV2lkZ2V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLG9CQUFvQixDQUFBO0FBQzNCLE9BQU8sRUFBRSxVQUFVLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQVV2RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNyRyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUN0RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUM1RixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFHN0QsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0saURBQWlELENBQUE7QUFHMUYsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDakYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDbEYsT0FBTyxFQUVOLGdDQUFnQyxHQUVoQyxNQUFNLHVDQUF1QyxDQUFBO0FBQzlDLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0NBQW9DLENBQUE7QUFFekQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBRTlFLE1BQU0sMkJBQTJCO0lBQ2hDLCtIQUErSDtJQUMvSCxZQUNpQixLQUFpQyxFQUNqQyxhQUFzQjtRQUR0QixVQUFLLEdBQUwsS0FBSyxDQUE0QjtRQUNqQyxrQkFBYSxHQUFiLGFBQWEsQ0FBUztJ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