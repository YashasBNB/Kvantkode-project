/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { asArray } from '../../../../base/common/arrays.js';
import { isEmptyMarkdownString } from '../../../../base/common/htmlContent.js';
import { GlyphMarginLane } from '../../../common/model.js';
export class GlyphHoverComputer {
    constructor(_editor) {
        this._editor = _editor;
    }
    computeSync(opts) {
        const toHoverMessage = (contents) => {
            return {
                value: contents,
            };
        };
        const lineDecorations = this._editor.getLineDecorations(opts.lineNumber);
        const result = [];
        const isLineHover = opts.laneOrLine === 'lineNo';
        if (!lineDecorations) {
            return result;
        }
        for (const d of lineDecorations) {
            const lane = d.options.glyphMargin?.position ?? GlyphMarginLane.Center;
            if (!isLineHover && lane !== opts.laneOrLine) {
                continue;
            }
            const hoverMessage = isLineHover
                ? d.options.lineNumberHoverMessage
                : d.options.glyphMarginHoverMessage;
            if (!hoverMessage || isEmptyMarkdownString(hoverMessage)) {
                continue;
            }
            result.push(...asArray(hoverMessage).map(toHoverMessage));
        }
        return result;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2x5cGhIb3ZlckNvbXB1dGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9ob3Zlci9icm93c2VyL2dseXBoSG92ZXJDb21wdXRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDM0QsT0FBTyxFQUFtQixxQkFBcUIsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBRy9GLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQWExRCxNQUFNLE9BQU8sa0JBQWtCO0lBRzlCLFlBQTZCLE9BQW9CO1FBQXBCLFlBQU8sR0FBUCxPQUFPLENBQWE7SUFBRyxDQUFDO0lBRTlDLFdBQVcsQ0FBQyxJQUErQjtRQUNqRCxNQUFNLGNBQWMsR0FBRyxDQUFDLFFBQXlCLEVBQWlCLEVBQUU7WUFDbkUsT0FBTztnQkFDTixLQUFLLEVBQUUsUUFBUTthQUNmLENBQUE7UUFDRixDQUFDLENBQUE7UUFFRCxNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUV4RSxNQUFNLE1BQU0sR0FBb0IsRUFBRSxDQUFBO1FBQ2xDLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxVQUFVLEtBQUssUUFBUSxDQUFBO1FBQ2hELElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUN0QixPQUFPLE1BQU0sQ0FBQTtRQUNkLENBQUM7UUFFRCxLQUFLLE1BQU0sQ0FBQyxJQUFJLGVBQWUsRUFBRSxDQUFDO1lBQ2pDLE1BQU0sSUFBSSxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLFFBQVEsSUFBSSxlQUFlLENBQUMsTUFBTSxDQUFBO1lBQ3RFLElBQUksQ0FBQyxXQUFXLElBQUksSUFBSSxLQUFLLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztnQkFDOUMsU0FBUTtZQUNULENBQUM7WUFFRCxNQUFNLFlBQVksR0FBRyxXQUFXO2dCQUMvQixDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxzQkFBc0I7Z0JBQ2xDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLHVCQUF1QixDQUFBO1lBQ3BDLElBQUksQ0FBQyxZQUFZLElBQUkscUJBQXFCLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQztnQkFDMUQsU0FBUTtZQUNULENBQUM7WUFFRCxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFBO1FBQzFELENBQUM7UUFFRCxPQUFPLE1BQU0sQ0FBQTtJQUNkLENBQUM7Q0FDRCJ9