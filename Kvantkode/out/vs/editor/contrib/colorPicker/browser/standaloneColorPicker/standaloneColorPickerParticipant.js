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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhbmRhbG9uZUNvbG9yUGlja2VyUGFydGljaXBhbnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2NvbG9yUGlja2VyL2Jyb3dzZXIvc3RhbmRhbG9uZUNvbG9yUGlja2VyL3N0YW5kYWxvbmVDb2xvclBpY2tlclBhcnRpY2lwYW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBRTlFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFLcEYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGFBQWEsQ0FBQTtBQUN2QyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFFbkQsT0FBTyxFQUdOLGdCQUFnQixFQUNoQix3QkFBd0IsRUFDeEIsaUJBQWlCLEdBQ2pCLE1BQU0sbUNBQW1DLENBQUE7QUFDMUMsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFDM0QsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRXhELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUU5RCxNQUFNLE9BQU8sMEJBQTBCO0lBQ3RDLFlBQ2lCLEtBQXVDLEVBQ3ZDLEtBQVksRUFDWixLQUF1QixFQUN2QixRQUErQjtRQUgvQixVQUFLLEdBQUwsS0FBSyxDQUFrQztRQUN2QyxVQUFLLEdBQUwsS0FBSyxDQUFPO1FBQ1osVUFBSyxHQUFMLEtBQUssQ0FBa0I7UUFDdkIsYUFBUSxHQUFSLFFBQVEsQ0FBdUI7SUFD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