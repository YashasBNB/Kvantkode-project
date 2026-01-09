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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpY2tEaWZmLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zY20vY29tbW9uL3F1aWNrRGlmZi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBR3pDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQU81RixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDeEQsT0FBTyxFQUNOLE1BQU0sRUFDTixnQkFBZ0IsRUFDaEIsZ0JBQWdCLEVBQ2hCLCtCQUErQixFQUMvQixNQUFNLEVBQ04scUJBQXFCLEVBQ3JCLGFBQWEsRUFDYixXQUFXLEdBQ1gsTUFBTSxvREFBb0QsQ0FBQTtBQUUzRCxNQUFNLENBQUMsTUFBTSxpQkFBaUIsR0FBRyxlQUFlLENBQW9CLFdBQVcsQ0FBQyxDQUFBO0FBRWhGLE1BQU0sOEJBQThCLEdBQUcsYUFBYSxDQUNuRCxpQ0FBaUMsRUFDakM7SUFDQyxJQUFJLEVBQUUsU0FBUztJQUNmLEtBQUssRUFBRSxTQUFTO0lBQ2hCLE1BQU0sRUFBRSxTQUFTO0lBQ2pCLE9BQU8sRUFBRSxTQUFTO0NBQ2xCLEVBQ0QsR0FBRyxDQUFDLFFBQVEsQ0FDWCxnQ0FBZ0MsRUFDaEMsNkRBQTZELENBQzdELENBQ0QsQ0FBQTtBQUVELE1BQU0sMkJBQTJCLEdBQUcsYUFBYSxDQUNoRCw4QkFBOEIsRUFDOUI7SUFDQyxJQUFJLEVBQUUsU0FBUztJQUNmLEtBQUssRUFBRSxTQUFTO0lBQ2hCLE1BQU0sRUFBRSxTQUFTO0lBQ2pCLE9BQU8sRUFBRSxTQUFTO0NBQ2xCLEVBQ0QsR0FBRyxDQUFDLFFBQVEsQ0FDWCw2QkFBNkIsRUFDN0IsMERBQTBELENB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