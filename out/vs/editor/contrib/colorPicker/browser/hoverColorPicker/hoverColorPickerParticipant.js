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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG92ZXJDb2xvclBpY2tlclBhcnRpY2lwYW50LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvY29sb3JQaWNrZXIvYnJvd3Nlci9ob3ZlckNvbG9yUGlja2VyL2hvdmVyQ29sb3JQaWNrZXJQYXJ0aWNpcGFudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUd6RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFHeEQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBRW5ELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQzNELE9BQU8sRUFRTixrQkFBa0IsR0FDbEIsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDcEYsT0FBTyxLQUFLLEdBQUcsTUFBTSx1QkFBdUIsQ0FBQTtBQUM1QyxPQUFPLEVBR04sZ0JBQWdCLEVBQ2hCLHdCQUF3QixFQUN4QixpQkFBaUIsR0FDakIsTUFBTSxtQ0FBbUMsQ0FBQTtBQUUxQyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDOUQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBSXpFLE1BQU0sT0FBTyxVQUFVO0lBT3RCLFlBQ2lCLEtBQTBDLEVBQzFDLEtBQVksRUFDWixLQUF1QixFQUN2QixRQUErQjtRQUgvQixVQUFLLEdBQUwsS0FBSyxDQUFxQztRQUMxQyxVQUFLLEdBQUwsS0FBSyxDQUFPO1FBQ1osVUFBSyxHQUFMLEtBQUssQ0FBa0I7UUFDdkIsYUFBUSxHQUFSLFFBQVEsQ0FBdUI7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