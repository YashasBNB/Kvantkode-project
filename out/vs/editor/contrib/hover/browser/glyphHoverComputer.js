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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2x5cGhIb3ZlckNvbXB1dGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvaG92ZXIvYnJvd3Nlci9nbHlwaEhvdmVyQ29tcHV0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzNELE9BQU8sRUFBbUIscUJBQXFCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUcvRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFhMUQsTUFBTSxPQUFPLGtCQUFrQjtJQUc5QixZQUE2QixPQUFvQjtRQUFwQixZQUFPLEdBQVAsT0FBTyxDQUFhO0lBQUcsQ0FBQztJQUU5QyxXQUFXLENBQUMsSUFBK0I7UUFDakQsTUFBTSxjQUFjLEdBQUcsQ0FBQyxRQUF5QixFQUFpQixFQUFFO1lBQ25FLE9BQU87Z0JBQ04sS0FBSyxFQUFFLFFBQVE7YUFDZixDQUFBO1FBQ0YsQ0FBQyxDQUFBO1FBRUQsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUE7UUFFeEUsTUFBTSxNQUFNLEdBQW9CLEVBQUUsQ0FBQTtRQUNsQyxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsVUFBVSxLQUFLLFFBQVEsQ0FBQTtRQUNoRCxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7WUFDdEIsT0FBTyxNQUFNLENBQUE7UUFDZCxDQUFDO1FBRUQsS0FBSyxNQUFNLENBQUMsSUFBSSxlQUFlLEVBQUUsQ0FBQztZQUNqQyxNQUFNLElBQUksR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxRQUFRLElBQUksZUFBZSxDQUFDLE1BQU0sQ0FBQTtZQUN0RSxJQUFJLENBQUMsV0FBVyxJQUFJLElBQUksS0FBSyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7Z0JBQzlDLFNBQVE7WUFDVCxDQUFDO1lBRUQsTUFBTSxZQUFZLEdBQUcsV0FBVztnQkFDL0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsc0JBQXNCO2dCQUNsQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyx1QkFBdUIsQ0FBQTtZQUNwQyxJQUFJLENBQUMsWUFBWSxJQUFJLHFCQUFxQixDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUM7Z0JBQzFELFNBQVE7WUFDVCxDQUFDO1lBRUQsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQTtRQUMxRCxDQUFDO1FBRUQsT0FBTyxNQUFNLENBQUE7SUFDZCxDQUFDO0NBQ0QifQ==