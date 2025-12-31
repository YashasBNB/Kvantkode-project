/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { Color } from '../../../../base/common/color.js';
import { darken, editorBackground, editorForeground, listInactiveSelectionBackground, opaque, editorErrorForeground, registerColor, transparent, } from '../../../../platform/theme/common/colorRegistry.js';
export const IQuickDiffService = createDecorator('quickDiff');
const editorGutterModifiedBackground = registerColor('editorGutter.modifiedBackground', {
    dark: '#1B81A8',
    light: '#2090D3',
    hcDark: '#1B81A8',
    hcLight: '#2090D3',
}, nls.localize('editorGutterModifiedBackground', 'Editor gutter background color for lines that are modified.'));
const editorGutterAddedBackground = registerColor('editorGutter.addedBackground', {
    dark: '#487E02',
    light: '#48985D',
    hcDark: '#487E02',
    hcLight: '#48985D',
}, nls.localize('editorGutterAddedBackground', 'Editor gutter background color for lines that are added.'));
const editorGutterDeletedBackground = registerColor('editorGutter.deletedBackground', editorErrorForeground, nls.localize('editorGutterDeletedBackground', 'Editor gutter background color for lines that are deleted.'));
export const minimapGutterModifiedBackground = registerColor('minimapGutter.modifiedBackground', editorGutterModifiedBackground, nls.localize('minimapGutterModifiedBackground', 'Minimap gutter background color for lines that are modified.'));
export const minimapGutterAddedBackground = registerColor('minimapGutter.addedBackground', editorGutterAddedBackground, nls.localize('minimapGutterAddedBackground', 'Minimap gutter background color for lines that are added.'));
export const minimapGutterDeletedBackground = registerColor('minimapGutter.deletedBackground', editorGutterDeletedBackground, nls.localize('minimapGutterDeletedBackground', 'Minimap gutter background color for lines that are deleted.'));
export const overviewRulerModifiedForeground = registerColor('editorOverviewRuler.modifiedForeground', transparent(editorGutterModifiedBackground, 0.6), nls.localize('overviewRulerModifiedForeground', 'Overview ruler marker color for modified content.'));
export const overviewRulerAddedForeground = registerColor('editorOverviewRuler.addedForeground', transparent(editorGutterAddedBackground, 0.6), nls.localize('overviewRulerAddedForeground', 'Overview ruler marker color for added content.'));
export const overviewRulerDeletedForeground = registerColor('editorOverviewRuler.deletedForeground', transparent(editorGutterDeletedBackground, 0.6), nls.localize('overviewRulerDeletedForeground', 'Overview ruler marker color for deleted content.'));
export const editorGutterItemGlyphForeground = registerColor('editorGutter.itemGlyphForeground', { dark: editorForeground, light: editorForeground, hcDark: Color.black, hcLight: Color.white }, nls.localize('editorGutterItemGlyphForeground', 'Editor gutter decoration color for gutter item glyphs.'));
export const editorGutterItemBackground = registerColor('editorGutter.itemBackground', {
    dark: opaque(listInactiveSelectionBackground, editorBackground),
    light: darken(opaque(listInactiveSelectionBackground, editorBackground), 0.05),
    hcDark: Color.white,
    hcLight: Color.black,
}, nls.localize('editorGutterItemBackground', 'Editor gutter decoration color for gutter item background. This color should be opaque.'));
export var ChangeType;
(function (ChangeType) {
    ChangeType[ChangeType["Modify"] = 0] = "Modify";
    ChangeType[ChangeType["Add"] = 1] = "Add";
    ChangeType[ChangeType["Delete"] = 2] = "Delete";
})(ChangeType || (ChangeType = {}));
export function getChangeType(change) {
    if (change.originalEndLineNumber === 0) {
        return ChangeType.Add;
    }
    else if (change.modifiedEndLineNumber === 0) {
        return ChangeType.Delete;
    }
    else {
        return ChangeType.Modify;
    }
}
export function getChangeTypeColor(theme, changeType) {
    switch (changeType) {
        case ChangeType.Modify:
            return theme.getColor(editorGutterModifiedBackground);
        case ChangeType.Add:
            return theme.getColor(editorGutterAddedBackground);
        case ChangeType.Delete:
            return theme.getColor(editorGutterDeletedBackground);
    }
}
export function compareChanges(a, b) {
    let result = a.modifiedStartLineNumber - b.modifiedStartLineNumber;
    if (result !== 0) {
        return result;
    }
    result = a.modifiedEndLineNumber - b.modifiedEndLineNumber;
    if (result !== 0) {
        return result;
    }
    result = a.originalStartLineNumber - b.originalStartLineNumber;
    if (result !== 0) {
        return result;
    }
    return a.originalEndLineNumber - b.originalEndLineNumber;
}
export function getChangeHeight(change) {
    const modified = change.modifiedEndLineNumber - change.modifiedStartLineNumber + 1;
    const original = change.originalEndLineNumber - change.originalStartLineNumber + 1;
    if (change.originalEndLineNumber === 0) {
        return modified;
    }
    else if (change.modifiedEndLineNumber === 0) {
        return original;
    }
    else {
        return modified + original;
    }
}
export function getModifiedEndLineNumber(change) {
    if (change.modifiedEndLineNumber === 0) {
        return change.modifiedStartLineNumber === 0 ? 1 : change.modifiedStartLineNumber;
    }
    else {
        return change.modifiedEndLineNumber;
    }
}
export function lineIntersectsChange(lineNumber, change) {
    // deletion at the beginning of the file
    if (lineNumber === 1 &&
        change.modifiedStartLineNumber === 0 &&
        change.modifiedEndLineNumber === 0) {
        return true;
    }
    return (lineNumber >= change.modifiedStartLineNumber &&
        lineNumber <= (change.modifiedEndLineNumber || change.modifiedStartLineNumber));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpY2tEaWZmLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc2NtL2NvbW1vbi9xdWlja0RpZmYudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUd6QyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUE7QUFPNUYsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3hELE9BQU8sRUFDTixNQUFNLEVBQ04sZ0JBQWdCLEVBQ2hCLGdCQUFnQixFQUNoQiwrQkFBK0IsRUFDL0IsTUFBTSxFQUNOLHFCQUFxQixFQUNyQixhQUFhLEVBQ2IsV0FBVyxHQUNYLE1BQU0sb0RBQW9ELENBQUE7QUFFM0QsTUFBTSxDQUFDLE1BQU0saUJBQWlCLEdBQUcsZUFBZSxDQUFvQixXQUFXLENBQUMsQ0FBQTtBQUVoRixNQUFNLDhCQUE4QixHQUFHLGFBQWEsQ0FDbkQsaUNBQWlDLEVBQ2pDO0lBQ0MsSUFBSSxFQUFFLFNBQVM7SUFDZixLQUFLLEVBQUUsU0FBUztJQUNoQixNQUFNLEVBQUUsU0FBUztJQUNqQixPQUFPLEVBQUUsU0FBUztDQUNsQixFQUNELEdBQUcsQ0FBQyxRQUFRLENBQ1gsZ0NBQWdDLEVBQ2hDLDZEQUE2RCxDQUM3RCxDQUNELENBQUE7QUFFRCxNQUFNLDJCQUEyQixHQUFHLGFBQWEsQ0FDaEQsOEJBQThCLEVBQzlCO0lBQ0MsSUFBSSxFQUFFLFNBQVM7SUFDZixLQUFLLEVBQUUsU0FBUztJQUNoQixNQUFNLEVBQUUsU0FBUztJQUNqQixPQUFPLEVBQUUsU0FBUztDQUNsQixFQUNELEdBQUcsQ0FBQyxRQUFRLENBQ1gsNkJBQTZCLEVBQzdCLDBEQUEwRCxDQUMxRCxDQUNELENBQUE7QUFFRCxNQUFN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