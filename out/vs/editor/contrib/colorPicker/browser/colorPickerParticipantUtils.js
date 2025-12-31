/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { Color, RGBA } from '../../../../base/common/color.js';
import { getColorPresentations } from './color.js';
import { ColorPickerModel } from './colorPickerModel.js';
import { Range } from '../../../common/core/range.js';
export var ColorPickerWidgetType;
(function (ColorPickerWidgetType) {
    ColorPickerWidgetType["Hover"] = "hover";
    ColorPickerWidgetType["Standalone"] = "standalone";
})(ColorPickerWidgetType || (ColorPickerWidgetType = {}));
export async function createColorHover(editorModel, colorInfo, provider) {
    const originalText = editorModel.getValueInRange(colorInfo.range);
    const { red, green, blue, alpha } = colorInfo.color;
    const rgba = new RGBA(Math.round(red * 255), Math.round(green * 255), Math.round(blue * 255), alpha);
    const color = new Color(rgba);
    const colorPresentations = await getColorPresentations(editorModel, colorInfo, provider, CancellationToken.None);
    const model = new ColorPickerModel(color, [], 0);
    model.colorPresentations = colorPresentations || [];
    model.guessColorPresentation(color, originalText);
    return {
        range: Range.lift(colorInfo.range),
        model,
        provider,
    };
}
export function updateEditorModel(editor, range, model) {
    const textEdits = [];
    const edit = model.presentation.textEdit ?? {
        range,
        text: model.presentation.label,
        forceMoveMarkers: false,
    };
    textEdits.push(edit);
    if (model.presentation.additionalTextEdits) {
        textEdits.push(...model.presentation.additionalTextEdits);
    }
    const replaceRange = Range.lift(edit.range);
    const trackedRange = editor
        .getModel()
        ._setTrackedRange(null, replaceRange, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */);
    editor.executeEdits('colorpicker', textEdits);
    editor.pushUndoStop();
    return editor.getModel()._getTrackedRange(trackedRange) ?? replaceRange;
}
export async function updateColorPresentations(editorModel, colorPickerModel, color, range, colorHover) {
    const colorPresentations = await getColorPresentations(editorModel, {
        range: range,
        color: {
            red: color.rgba.r / 255,
            green: color.rgba.g / 255,
            blue: color.rgba.b / 255,
            alpha: color.rgba.a,
        },
    }, colorHover.provider, CancellationToken.None);
    colorPickerModel.colorPresentations = colorPresentations || [];
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sb3JQaWNrZXJQYXJ0aWNpcGFudFV0aWxzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvY29sb3JQaWNrZXIvYnJvd3Nlci9jb2xvclBpY2tlclBhcnRpY2lwYW50VXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDM0UsT0FBTyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUs5RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxZQUFZLENBQUE7QUFDbEQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDeEQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBRXJELE1BQU0sQ0FBTixJQUFrQixxQkFHakI7QUFIRCxXQUFrQixxQkFBcUI7SUFDdEMsd0NBQWUsQ0FBQTtJQUNmLGtEQUF5QixDQUFBO0FBQzFCLENBQUMsRUFIaUIscUJBQXFCLEtBQXJCLHFCQUFxQixRQUd0QztBQVFELE1BQU0sQ0FBQyxLQUFLLFVBQVUsZ0JBQWdCLENBQ3JDLFdBQXVCLEVBQ3ZCLFNBQTRCLEVBQzVCLFFBQStCO0lBRS9CLE1BQU0sWUFBWSxHQUFHLFdBQVcsQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQ2pFLE1BQU0sRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsR0FBRyxTQUFTLENBQUMsS0FBSyxDQUFBO0lBQ25ELE1BQU0sSUFBSSxHQUFHLElBQUksSUFBSSxDQUNwQixJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUMsRUFDckIsSUFBSSxDQUFDLEtBQUss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