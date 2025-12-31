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
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { IThemeService } from '../../../../../platform/theme/common/themeService.js';
import { getColors } from '../color.js';
import { ColorDetector } from '../colorDetector.js';
import { createColorHover, updateColorPresentations, updateEditorModel, } from '../colorPickerParticipantUtils.js';
import { ColorPickerWidget } from '../colorPickerWidget.js';
import { Range } from '../../../../common/core/range.js';
import { Dimension } from '../../../../../base/browser/dom.js';
export class StandaloneColorPickerHover {
    constructor(owner, range, model, provider) {
        this.owner = owner;
        this.range = range;
        this.model = model;
        this.provider = provider;
    }
    static fromBaseColor(owner, color) {
        return new StandaloneColorPickerHover(owner, color.range, color.model, color.provider);
    }
}
export class StandaloneColorPickerRenderedParts extends Disposable {
    constructor(editor, context, colorHover, themeService) {
        super();
        const editorModel = editor.getModel();
        const colorPickerModel = colorHover.model;
        this.color = colorHover.model.color;
        this.colorPicker = this._register(new ColorPickerWidget(context.fragment, colorPickerModel, editor.getOption(149 /* EditorOption.pixelRatio */), themeService, "standalone" /* ColorPickerWidgetType.Standalone */));
        this._register(colorPickerModel.onColorFlushed((color) => {
            this.color = color;
        }));
        this._register(colorPickerModel.onDidChangeColor((color) => {
            updateColorPresentations(editorModel, colorPickerModel, color, colorHover.range, colorHover);
        }));
        let editorUpdatedByColorPicker = false;
        this._register(editor.onDidChangeModelContent((e) => {
            if (editorUpdatedByColorPicker) {
                editorUpdatedByColorPicker = false;
            }
            else {
                context.hide();
                editor.focus();
            }
        }));
        updateColorPresentations(editorModel, colorPickerModel, this.color, colorHover.range, colorHover);
    }
}
let StandaloneColorPickerParticipant = class StandaloneColorPickerParticipant {
    constructor(_editor, _themeService) {
        this._editor = _editor;
        this._themeService = _themeService;
        this.hoverOrdinal = 2;
    }
    async createColorHover(defaultColorInfo, defaultColorProvider, colorProviderRegistry) {
        if (!this._editor.hasModel()) {
            return null;
        }
        const colorDetector = ColorDetector.get(this._editor);
        if (!colorDetector) {
            return null;
        }
        const colors = await getColors(colorProviderRegistry, this._editor.getModel(), CancellationToken.None);
        let foundColorInfo = null;
        let foundColorProvider = null;
        for (const colorData of colors) {
            const colorInfo = colorData.colorInfo;
            if (Range.containsRange(colorInfo.range, defaultColorInfo.range)) {
                foundColorInfo = colorInfo;
                foundColorProvider = colorData.provider;
            }
        }
        const colorInfo = foundColorInfo ?? defaultColorInfo;
        const colorProvider = foundColorProvider ?? defaultColorProvider;
        const foundInEditor = !!foundColorInfo;
        const colorHover = StandaloneColorPickerHover.fromBaseColor(this, await createColorHover(this._editor.getModel(), colorInfo, colorProvider));
        return { colorHover, foundInEditor };
    }
    async updateEditorModel(colorHoverData) {
        if (!this._editor.hasModel()) {
            return;
        }
        const colorPickerModel = colorHoverData.model;
        let range = new Range(colorHoverData.range.startLineNumber, colorHoverData.range.startColumn, colorHoverData.range.endLineNumber, colorHoverData.range.endColumn);
        if (this._color) {
            await updateColorPresentations(this._editor.getModel(), colorPickerModel, this._color, range, colorHoverData);
            range = updateEditorModel(this._editor, range, colorPickerModel);
        }
    }
    renderHoverParts(context, hoverParts) {
        if (hoverParts.length === 0 || !this._editor.hasModel()) {
            return undefined;
        }
        this._setMinimumDimensions(context);
        this._renderedParts = new StandaloneColorPickerRenderedParts(this._editor, context, hoverParts[0], this._themeService);
        return this._renderedParts;
    }
    _setMinimumDimensions(context) {
        const minimumHeight = this._editor.getOption(68 /* EditorOption.lineHeight */) + 8;
        context.setMinimumDimensions(new Dimension(302, minimumHeight));
    }
    get _color() {
        return this._renderedParts?.color;
    }
};
StandaloneColorPickerParticipant = __decorate([
    __param(1, IThemeService)
], StandaloneColorPickerParticipant);
export { StandaloneColorPickerParticipant };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhbmRhbG9uZUNvbG9yUGlja2VyUGFydGljaXBhbnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9jb2xvclBpY2tlci9icm93c2VyL3N0YW5kYWxvbmVDb2xvclBpY2tlci9zdGFuZGFsb25lQ29sb3JQaWNrZXJQYXJ0aWNpcGFudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUU5RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDcEUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBS3BGLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxhQUFhLENBQUE7QUFDdkMsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBRW5ELE9BQU8sRUFHTixnQkFBZ0IsRUFDaEIsd0JBQXdCLEVBQ3hCLGlCQUFpQixHQUNqQixNQUFNLG1DQUFtQyxDQUFBO0FBQzFDLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQzNELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUV4RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFFOUQsTUFBTSxPQUFPLDBCQUEwQjtJQUN0QyxZQUNpQixLQUF1QyxFQUN2QyxLQUFZLEVBQ1osS0FBdUIsRUFDdkIsUUFBK0I7UUFIL0IsVUFBSyxHQUFMLEtBQUssQ0FBa0M7UUFDdkMsVUFBSyxHQUFMLEtBQUssQ0FBTztRQUNaLFVBQUssR0FBTCxLQUFLLENBQWtCO1FBQ3ZCLGFBQVEsR0FBUixRQUFRLENBQXVCO0lBQzdDLENBQUM7SUFFRyxNQUFNLENBQUMs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