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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sb3JQaWNrZXJQYXJ0aWNpcGFudFV0aWxzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9jb2xvclBpY2tlci9icm93c2VyL2NvbG9yUGlja2VyUGFydGljaXBhbnRVdGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBSzlELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLFlBQVksQ0FBQTtBQUNsRCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFFckQsTUFBTSxDQUFOLElBQWtCLHFCQUdqQjtBQUhELFdBQWtCLHFCQUFxQjtJQUN0Qyx3Q0FBZSxDQUFBO0lBQ2Ysa0RBQXlCLENBQUE7QUFDMUIsQ0FBQyxFQUhpQixxQkFBcUIsS0FBckIscUJBQXFCLFFBR3RDO0FBUUQsTUFBTSxDQUFDLEtBQUssVUFBVSxnQkFBZ0IsQ0FDckMsV0FBdUIsRUFDdkIsU0FBNEIsRUFDNUIsUUFBK0I7SUFFL0IsTUFBTSxZQUFZLEdBQUcsV0FBVyxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDakUsTUFBTSxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxHQUFHLFNBQVMsQ0FBQyxLQUFLLENBQUE7SUFDbkQsTUFBTSxJQUFJLEdBQUcsSUFBSSxJQUFJLENBQ3BCLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxFQUNyQixJQUFJLENBQUMs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