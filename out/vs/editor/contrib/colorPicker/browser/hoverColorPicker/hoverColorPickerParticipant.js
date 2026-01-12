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
import { AsyncIterableObject } from '../../../../../base/common/async.js';
import { Range } from '../../../../common/core/range.js';
import { ColorDetector } from '../colorDetector.js';
import { ColorPickerWidget } from '../colorPickerWidget.js';
import { RenderedHoverParts, } from '../../../hover/browser/hoverTypes.js';
import { IThemeService } from '../../../../../platform/theme/common/themeService.js';
import * as nls from '../../../../../nls.js';
import { createColorHover, updateColorPresentations, updateEditorModel, } from '../colorPickerParticipantUtils.js';
import { Dimension } from '../../../../../base/browser/dom.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
export class ColorHover {
    constructor(owner, range, model, provider) {
        this.owner = owner;
        this.range = range;
        this.model = model;
        this.provider = provider;
        /**
         * Force the hover to always be rendered at this specific range,
         * even in the case of multiple hover parts.
         */
        this.forceShowAtRange = true;
    }
    isValidForHoverAnchor(anchor) {
        return (anchor.type === 1 /* HoverAnchorType.Range */ &&
            this.range.startColumn <= anchor.range.startColumn &&
            this.range.endColumn >= anchor.range.endColumn);
    }
    static fromBaseColor(owner, color) {
        return new ColorHover(owner, color.range, color.model, color.provider);
    }
}
let HoverColorPickerParticipant = class HoverColorPickerParticipant {
    constructor(_editor, _themeService) {
        this._editor = _editor;
        this._themeService = _themeService;
        this.hoverOrdinal = 2;
    }
    computeSync(_anchor, _lineDecorations, source) {
        return [];
    }
    computeAsync(anchor, lineDecorations, source, token) {
        return AsyncIterableObject.fromPromise(this._computeAsync(anchor, lineDecorations, source));
    }
    async _computeAsync(_anchor, lineDecorations, source) {
        if (!this._editor.hasModel()) {
            return [];
        }
        if (!this._isValidRequest(source)) {
            return [];
        }
        const colorDetector = ColorDetector.get(this._editor);
        if (!colorDetector) {
            return [];
        }
        for (const d of lineDecorations) {
            if (!colorDetector.isColorDecoration(d)) {
                continue;
            }
            const colorData = colorDetector.getColorData(d.range.getStartPosition());
            if (colorData) {
                const colorHover = ColorHover.fromBaseColor(this, await createColorHover(this._editor.getModel(), colorData.colorInfo, colorData.provider));
                return [colorHover];
            }
        }
        return [];
    }
    _isValidRequest(source) {
        const decoratorActivatedOn = this._editor.getOption(154 /* EditorOption.colorDecoratorsActivatedOn */);
        switch (source) {
            case 0 /* HoverStartSource.Mouse */:
                return decoratorActivatedOn === 'hover' || decoratorActivatedOn === 'clickAndHover';
            case 1 /* HoverStartSource.Click */:
                return decoratorActivatedOn === 'click' || decoratorActivatedOn === 'clickAndHover';
            case 2 /* HoverStartSource.Keyboard */:
                return true;
        }
    }
    renderHoverParts(context, hoverParts) {
        const editor = this._editor;
        if (hoverParts.length === 0 || !editor.hasModel()) {
            return new RenderedHoverParts([]);
        }
        const minimumHeight = editor.getOption(68 /* EditorOption.lineHeight */) + 8;
        context.setMinimumDimensions(new Dimension(302, minimumHeight));
        const disposables = new DisposableStore();
        const colorHover = hoverParts[0];
        const editorModel = editor.getModel();
        const model = colorHover.model;
        this._colorPicker = disposables.add(new ColorPickerWidget(context.fragment, model, editor.getOption(149 /* EditorOption.pixelRatio */), this._themeService, "hover" /* ColorPickerWidgetType.Hover */));
        let editorUpdatedByColorPicker = false;
        let range = new Range(colorHover.range.startLineNumber, colorHover.range.startColumn, colorHover.range.endLineNumber, colorHover.range.endColumn);
        disposables.add(model.onColorFlushed(async (color) => {
            await updateColorPresentations(editorModel, model, color, range, colorHover);
            editorUpdatedByColorPicker = true;
            range = updateEditorModel(editor, range, model);
        }));
        disposables.add(model.onDidChangeColor((color) => {
            updateColorPresentations(editorModel, model, color, range, colorHover);
        }));
        disposables.add(editor.onDidChangeModelContent((e) => {
            if (editorUpdatedByColorPicker) {
                editorUpdatedByColorPicker = false;
            }
            else {
                context.hide();
                editor.focus();
            }
        }));
        const renderedHoverPart = {
            hoverPart: ColorHover.fromBaseColor(this, colorHover),
            hoverElement: this._colorPicker.domNode,
            dispose() {
                disposables.dispose();
            },
        };
        return new RenderedHoverParts([renderedHoverPart]);
    }
    getAccessibleContent(hoverPart) {
        return nls.localize('hoverAccessibilityColorParticipant', 'There is a color picker here.');
    }
    handleResize() {
        this._colorPicker?.layout();
    }
    handleHide() {
        this._colorPicker?.dispose();
        this._colorPicker = undefined;
    }
    isColorPickerVisible() {
        return !!this._colorPicker;
    }
};
HoverColorPickerParticipant = __decorate([
    __param(1, IThemeService)
], HoverColorPickerParticipant);
export { HoverColorPickerParticipant };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG92ZXJDb2xvclBpY2tlclBhcnRpY2lwYW50LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9jb2xvclBpY2tlci9icm93c2VyL2hvdmVyQ29sb3JQaWNrZXIvaG92ZXJDb2xvclBpY2tlclBhcnRpY2lwYW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBR3pFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUd4RCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFFbkQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFDM0QsT0FBTyxFQVFOLGtCQUFrQixHQUNsQixNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUNwRixPQUFPLEtBQUssR0FBRyxNQUFNLHVCQUF1QixDQUFBO0FBQzVDLE9BQU8sRUFHTixnQkFBZ0IsRUFDaEIsd0JBQXdCLEVBQ3hCLGlCQUFpQixHQUNqQixNQUFNLG1DQUFtQyxDQUFBO0FBRTFDLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFJekUsTUFBTSxPQUFPLFVBQVU7SUFPdEIsWUFDaUIsS0FBMEMsRUFDMUMsS0FBWSxFQUNaLEtBQXVCLEVBQ3ZCLFFBQStCO1FBSC9CLFVBQUssR0FBTCxLQUFLLENBQXFDO1FBQzFDLFVBQUssR0FBTCxLQUFLLENBQU87UUFDWixVQUFLLEdBQUwsS0FBSyxDQUFrQjtRQUN2QixhQUFRLEdBQVIsUUFBUSxD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