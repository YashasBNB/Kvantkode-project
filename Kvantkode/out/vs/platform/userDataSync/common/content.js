/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { setProperty } from '../../../base/common/jsonEdit.js';
export function edit(content, originalPath, value, formattingOptions) {
    const edit = setProperty(content, originalPath, value, formattingOptions)[0];
    if (edit) {
        content =
            content.substring(0, edit.offset) +
                edit.content +
                content.substring(edit.offset + edit.length);
    }
    return content;
}
export function getLineStartOffset(content, eol, atOffset) {
    let lineStartingOffset = atOffset;
    while (lineStartingOffset >= 0) {
        if (content.charAt(lineStartingOffset) === eol.charAt(eol.length - 1)) {
            if (eol.length === 1) {
                return lineStartingOffset + 1;
            }
        }
        lineStartingOffset--;
        if (eol.length === 2) {
            if (lineStartingOffset >= 0 && content.charAt(lineStartingOffset) === eol.charAt(0)) {
                return lineStartingOffset + 2;
            }
        }
    }
    return 0;
}
export function getLineEndOffset(content, eol, atOffset) {
    let lineEndOffset = atOffset;
    while (lineEndOffset >= 0) {
        if (content.charAt(lineEndOffset) === eol.charAt(eol.length - 1)) {
            if (eol.length === 1) {
                return lineEndOffset;
            }
        }
        lineEndOffset++;
        if (eol.length === 2) {
            if (lineEndOffset >= 0 && content.charAt(lineEndOffset) === eol.charAt(1)) {
                return lineEndOffset;
            }
        }
    }
    return content.length - 1;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGVudC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdXNlckRhdGFTeW5jL2NvbW1vbi9jb250ZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUc5RCxNQUFNLFVBQVUsSUFBSSxDQUNuQixPQUFlLEVBQ2YsWUFBc0IsRUFDdEIsS0FBVSxFQUNWLGlCQUFvQztJQUVwQyxNQUFNLElBQUksR0FBRyxXQUFXLENBQUMsT0FBTyxFQUFFLFlBQVksRUFBRSxLQUFLLEVBQUUsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUM1RSxJQUFJLElBQUksRUFBRSxDQUFDO1FBQ1YsT0FBTztZQUNOLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUM7Z0JBQ2pDLElBQUksQ0FBQyxPQUFPO2dCQUNaLE9BQU8sQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7SUFDOUMsQ0FBQztJQUNELE9BQU8sT0FBTyxDQUFBO0FBQ2YsQ0FBQztBQUVELE1BQU0sVUFBVSxrQkFBa0IsQ0FBQyxPQUFlLEVBQUUsR0FBVyxFQUFFLFFBQWdCO0lBQ2hGLElBQUksa0JBQWtCLEdBQUcsUUFBUSxDQUFBO0lBQ2pDLE9BQU8sa0JBQWtCLElBQUksQ0FBQyxFQUFFLENBQUM7UUFDaEMsSUFBSSxPQUFPLENBQUMsTUFBTSxDQUFDLGtCQUFrQixDQUFDLEtBQUssR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDdkUsSUFBSSxHQUFHLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUN0QixPQUFPLGtCQUFrQixHQUFHLENBQUMsQ0FBQTtZQUM5QixDQUFDO1FBQ0YsQ0FBQztRQUNELGtCQUFrQixFQUFFLENBQUE7UUFDcEIsSUFBSSxHQUFHLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ3RCLElBQUksa0JBQWtCLElBQUksQ0FBQyxJQUFJLE9BQU8sQ0FBQyxNQUFNLENBQUMsa0JBQWtCLENBQUMsS0FBSyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQ3JGLE9BQU8sa0JBQWtCLEdBQUcsQ0FBQyxDQUFBO1lBQzlCLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUNELE9BQU8sQ0FBQyxDQUFBO0FBQ1QsQ0FBQztBQUVELE1BQU0sVUFBVSxnQkFBZ0IsQ0FBQyxPQUFlLEVBQUUsR0FBVyxFQUFFLFFBQWdCO0lBQzlFLElBQUksYUFBYSxHQUFHLFFBQVEsQ0FBQTtJQUM1QixPQUFPLGFBQWEsSUFBSSxDQUFDLEVBQUUsQ0FBQztRQUMzQixJQUFJLE9BQU8sQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDLEtBQUssR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDbEUsSUFBSSxHQUFHLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUN0QixPQUFPLGFBQWEsQ0FBQTtZQUNyQixDQUFDO1FBQ0YsQ0FBQztRQUNELGFBQWEsRUFBRSxDQUFBO1FBQ2YsSUFBSSxHQUFHLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ3RCLElBQUksYUFBYSxJQUFJLENBQUMsSUFBSSxPQUFPLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztnQkFDM0UsT0FBTyxhQUFhLENBQUE7WUFDckIsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBQ0QsT0FBTyxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQTtBQUMxQixDQUFDIn0=