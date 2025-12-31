/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { safeIntl } from '../../../base/common/date.js';
export function createContentSegmenter(lineData, options) {
    if (lineData.isBasicASCII && options.useMonospaceOptimizations) {
        return new AsciiContentSegmenter(lineData);
    }
    return new GraphemeContentSegmenter(lineData);
}
class AsciiContentSegmenter {
    constructor(lineData) {
        this._content = lineData.content;
    }
    getSegmentAtIndex(index) {
        return this._content[index];
    }
    getSegmentData(index) {
        return undefined;
    }
}
/**
 * This is a more modern version of {@link GraphemeIterator}, relying on browser APIs instead of a
 * manual table approach.
 */
class GraphemeContentSegmenter {
    constructor(lineData) {
        this._segments = [];
        const content = lineData.content;
        const segmenter = safeIntl.Segmenter(undefined, { granularity: 'grapheme' });
        const segmentedContent = Array.from(segmenter.segment(content));
        let segmenterIndex = 0;
        for (let x = 0; x < content.length; x++) {
            const segment = segmentedContent[segmenterIndex];
            // No more segments in the string (eg. an emoji is the last segment)
            if (!segment) {
                break;
            }
            // The segment isn't renderable (eg. the tail end of an emoji)
            if (segment.index !== x) {
                this._segments.push(undefined);
                continue;
            }
            segmenterIndex++;
            this._segments.push(segment);
        }
    }
    getSegmentAtIndex(index) {
        return this._segments[index]?.segment;
    }
    getSegmentData(index) {
        return this._segments[index];
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGVudFNlZ21lbnRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL2dwdS9jb250ZW50U2VnbWVudGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQWdCdkQsTUFBTSxVQUFVLHNCQUFzQixDQUNyQyxRQUErQixFQUMvQixPQUF3QjtJQUV4QixJQUFJLFFBQVEsQ0FBQyxZQUFZLElBQUksT0FBTyxDQUFDLHlCQUF5QixFQUFFLENBQUM7UUFDaEUsT0FBTyxJQUFJLHFCQUFxQixDQUFDLFFBQVEsQ0FBQyxDQUFBO0lBQzNDLENBQUM7SUFDRCxPQUFPLElBQUksd0JBQXdCLENBQUMsUUFBUSxDQUFDLENBQUE7QUFDOUMsQ0FBQztBQUVELE1BQU0scUJBQXFCO0lBRzFCLFlBQVksUUFBK0I7UUFDMUMsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFBO0lBQ2pDLENBQUM7SUFFRCxpQkFBaUIsQ0FBQyxLQUFhO1FBQzlCLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUM1QixDQUFDO0lBRUQsY0FBYyxDQUFDLEtBQWE7UUFDM0IsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztDQUNEO0FBRUQ7OztHQUdHO0FBQ0gsTUFBTSx3QkFBd0I7SUFHN0IsWUFBWSxRQUErQjtRQUYxQixjQUFTLEdBQXFDLEVBQUUsQ0FBQTtRQUdoRSxNQUFNLE9BQU8sR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFBO1FBQ2hDLE1BQU0sU0FBUyxHQUFHLFFBQVEsQ0FBQyxTQUFTLENBQUMsU0FBUyxFQUFFLEVBQUUsV0FBVyxFQUFFLFVBQVUsRUFBRSxDQUFDLENBQUE7UUFDNUUsTUFBTSxnQkFBZ0IsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQTtRQUMvRCxJQUFJLGNBQWMsR0FBRyxDQUFDLENBQUE7UUFFdEIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUN6QyxNQUFNLE9BQU8sR0FBRyxnQkFBZ0IsQ0FBQyxjQUFjLENBQUMsQ0FBQTtZQUVoRCxvRUFBb0U7WUFDcEUsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUNkLE1BQUs7WUFDTixDQUFDO1lBRUQsOERBQThEO1lBQzlELElBQUksT0FBTyxDQUFDLEtBQUssS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDekIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUE7Z0JBQzlCLFNBQVE7WUFDVCxDQUFDO1lBRUQsY0FBYyxFQUFFLENBQUE7WUFDaEIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDN0IsQ0FBQztJQUNGLENBQUM7SUFFRCxpQkFBaUIsQ0FBQyxLQUFhO1FBQzlCLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsRUFBRSxPQUFPLENBQUE7SUFDdEMsQ0FBQztJQUVELGNBQWMsQ0FBQyxLQUFhO1FBQzNCLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUM3QixDQUFDO0NBQ0QifQ==