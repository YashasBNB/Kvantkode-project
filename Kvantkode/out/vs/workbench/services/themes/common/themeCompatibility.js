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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGhlbWVDb21wYXRpYmlsaXR5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdGhlbWVzL2NvbW1vbi90aGVtZUNvbXBhdGliaWxpdHkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3hELE9BQU8sS0FBSyxhQUFhLE1BQU0sb0RBQW9ELENBQUE7QUFFbkYsT0FBTyxLQUFLLG1CQUFtQixNQUFNLHVEQUF1RCxDQUFBO0FBRTVGLE1BQU0sdUJBQXVCLEdBQXNDLEVBQUUsQ0FBQTtBQUNyRSxTQUFTLGlCQUFpQixDQUFDLFNBQWlCLEVBQUUsT0FBZTtJQUM1RCxJQUFJLFFBQVEsR0FBRyx1QkFBdUIsQ0FBQyxTQUFTLENBQUMsQ0FBQTtJQUNqRCxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDZix1QkFBdUIsQ0FBQyxTQUFTLENBQUMsR0FBRyxRQUFRLEdBQUcsRUFBRSxDQUFBO0lBQ25ELENBQUM7SUFDRCxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFBO0FBQ3ZCLENBQUM7QUFFRCxNQUFNLFVBQVUsZUFBZSxDQUM5QixXQUFtQyxFQUNuQyxNQUFvRTtJQUVwRSxLQUFLLE1BQU0sSUFBSSxJQUFJLFdBQVcsRUFBRSxDQUFDO1FBQ2hDLE1BQU0sQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQy9CLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDakIsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQTtZQUM5QixJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQ2YsSUFBSSxDQUFDLFFBQVEsR0FBRyxFQUFFLENBQUE7WUFDbkIsQ0FB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