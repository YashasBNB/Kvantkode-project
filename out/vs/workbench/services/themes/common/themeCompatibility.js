/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Color } from '../../../../base/common/color.js';
import * as colorRegistry from '../../../../platform/theme/common/colorRegistry.js';
import * as editorColorRegistry from '../../../../editor/common/core/editorColorRegistry.js';
const settingToColorIdMapping = {};
function addSettingMapping(settingId, colorId) {
    let colorIds = settingToColorIdMapping[settingId];
    if (!colorIds) {
        settingToColorIdMapping[settingId] = colorIds = [];
    }
    colorIds.push(colorId);
}
export function convertSettings(oldSettings, result) {
    for (const rule of oldSettings) {
        result.textMateRules.push(rule);
        if (!rule.scope) {
            const settings = rule.settings;
            if (!settings) {
                rule.settings = {};
            }
            else {
                for (const settingKey in settings) {
                    const key = settingKey;
                    const mappings = settingToColorIdMapping[key];
                    if (mappings) {
                        const colorHex = settings[key];
                        if (typeof colorHex === 'string') {
                            const color = Color.fromHex(colorHex);
                            for (const colorId of mappings) {
                                result.colors[colorId] = color;
                            }
                        }
                    }
                    if (key !== 'foreground' && key !== 'background' && key !== 'fontStyle') {
                        delete settings[key];
                    }
                }
            }
        }
    }
}
addSettingMapping('background', colorRegistry.editorBackground);
addSettingMapping('foreground', colorRegistry.editorForeground);
addSettingMapping('selection', colorRegistry.editorSelectionBackground);
addSettingMapping('inactiveSelection', colorRegistry.editorInactiveSelection);
addSettingMapping('selectionHighlightColor', colorRegistry.editorSelectionHighlight);
addSettingMapping('findMatchHighlight', colorRegistry.editorFindMatchHighlight);
addSettingMapping('currentFindMatchHighlight', colorRegistry.editorFindMatch);
addSettingMapping('hoverHighlight', colorRegistry.editorHoverHighlight);
addSettingMapping('wordHighlight', 'editor.wordHighlightBackground'); // inlined to avoid editor/contrib dependenies
addSettingMapping('wordHighlightStrong', 'editor.wordHighlightStrongBackground');
addSettingMapping('findRangeHighlight', colorRegistry.editorFindRangeHighlight);
addSettingMapping('findMatchHighlight', 'peekViewResult.matchHighlightBackground');
addSettingMapping('referenceHighlight', 'peekViewEditor.matchHighlightBackground');
addSettingMapping('lineHighlight', editorColorRegistry.editorLineHighlight);
addSettingMapping('rangeHighlight', editorColorRegistry.editorRangeHighlight);
addSettingMapping('caret', editorColorRegistry.editorCursorForeground);
addSettingMapping('invisibles', editorColorRegistry.editorWhitespaces);
addSettingMapping('guide', editorColorRegistry.editorIndentGuide1);
addSettingMapping('activeGuide', editorColorRegistry.editorActiveIndentGuide1);
const ansiColorMap = [
    'ansiBlack',
    'ansiRed',
    'ansiGreen',
    'ansiYellow',
    'ansiBlue',
    'ansiMagenta',
    'ansiCyan',
    'ansiWhite',
    'ansiBrightBlack',
    'ansiBrightRed',
    'ansiBrightGreen',
    'ansiBrightYellow',
    'ansiBrightBlue',
    'ansiBrightMagenta',
    'ansiBrightCyan',
    'ansiBrightWhite',
];
for (const color of ansiColorMap) {
    addSettingMapping(color, 'terminal.' + color);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGhlbWVDb21wYXRpYmlsaXR5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3RoZW1lcy9jb21tb24vdGhlbWVDb21wYXRpYmlsaXR5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN4RCxPQUFPLEtBQUssYUFBYSxNQUFNLG9EQUFvRCxDQUFBO0FBRW5GLE9BQU8sS0FBSyxtQkFBbUIsTUFBTSx1REFBdUQsQ0FBQTtBQUU1RixNQUFNLHVCQUF1QixHQUFzQyxFQUFFLENBQUE7QUFDckUsU0FBUyxpQkFBaUIsQ0FBQyxTQUFpQixFQUFFLE9BQWU7SUFDNUQsSUFBSSxRQUFRLEdBQUcsdUJBQXVCLENBQUMsU0FBUyxDQUFDLENBQUE7SUFDakQsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ2YsdUJBQXVCLENBQUMsU0FBUyxDQUFDLEdBQUcsUUFBUSxHQUFHLEVBQUUsQ0FBQTtJQUNuRCxDQUFDO0lBQ0QsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQTtBQUN2QixDQUFDO0FBRUQsTUFBTSxVQUFVLGVBQWUsQ0FDOUIsV0FBbUMsRUFDbkMsTUFBb0U7SUFFcEUsS0FBSyxNQUFNLElBQUksSUFBSSxXQUFXLEVBQUUsQ0FBQztRQUNoQyxNQUFNLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUMvQixJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ2pCLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUE7WUFDOUIsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO2dCQUNmLElBQUksQ0FBQyxRQUFRLEdBQUcsRUFBRSxDQUFBO1lBQ25CLENBQUM7aUJB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