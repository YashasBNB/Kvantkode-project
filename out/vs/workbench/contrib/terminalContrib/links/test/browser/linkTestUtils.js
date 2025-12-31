/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { deepStrictEqual } from 'assert';
export async function assertLinkHelper(text, expected, detector, expectedType) {
    detector.xterm.reset();
    // Write the text and wait for the parser to finish
    await new Promise((r) => detector.xterm.write(text, r));
    const textSplit = text.split('\r\n');
    const lastLineIndex = textSplit
        .filter((e, i) => i !== textSplit.length - 1)
        .reduce((p, c) => {
        return p + Math.max(Math.ceil(c.length / 80), 1);
    }, 0);
    // Ensure all links are provided
    const lines = [];
    for (let i = 0; i < detector.xterm.buffer.active.cursorY + 1; i++) {
        lines.push(detector.xterm.buffer.active.getLine(i));
    }
    // Detect links always on the last line with content
    const actualLinks = (await detector.detect(lines, lastLineIndex, detector.xterm.buffer.active.cursorY)).map((e) => {
        return {
            link: e.uri?.toString() ?? e.text,
            type: expectedType,
            bufferRange: e.bufferRange,
        };
    });
    const expectedLinks = expected.map((e) => {
        return {
            type: expectedType,
            link: 'uri' in e ? e.uri.toString() : e.text,
            bufferRange: {
                start: { x: e.range[0][0], y: e.range[0][1] },
                end: { x: e.range[1][0], y: e.range[1][1] },
            },
        };
    });
    deepStrictEqual(actualLinks, expectedLinks);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlua1Rlc3RVdGlscy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9saW5rcy90ZXN0L2Jyb3dzZXIvbGlua1Rlc3RVdGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sUUFBUSxDQUFBO0FBS3hDLE1BQU0sQ0FBQyxLQUFLLFVBQVUsZ0JBQWdCLENBQ3JDLElBQVksRUFDWixRQUdHLEVBQ0gsUUFBK0IsRUFDL0IsWUFBOEI7SUFFOUIsUUFBUSxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQTtJQUV0QixtREFBbUQ7SUFDbkQsTUFBTSxJQUFJLE9BQU8sQ0FBTyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDN0QsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUNwQyxNQUFNLGFBQWEsR0FBRyxTQUFTO1NBQzdCLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsS0FBSyxTQUFTLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztTQUM1QyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7UUFDaEIsT0FBTyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDakQsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBRU4sZ0NBQWdDO0lBQ2hDLE1BQU0sS0FBSyxHQUFrQixFQUFFLENBQUE7SUFDL0IsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDbkUsS0FBSyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBRSxDQUFDLENBQUE7SUFDckQsQ0FBQztJQUVELG9EQUFvRDtJQUNwRCxNQUFNLFdBQVcsR0FBRyxDQUNuQixNQUFNLFFBQVEsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLGFBQWEsRUFBRSxRQUFRLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQ2pGLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7UUFDWCxPQUFPO1lBQ04sSUFBSSxFQUFFLENBQUMsQ0FBQyxHQUFHLEVBQUUsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFDLElBQUk7WUFDakMsSUFBSSxFQUFFLFlBQVk7WUFDbEIsV0FBVyxFQUFFLENBQUMsQ0FBQyxXQUFXO1NBQzFCLENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUNGLE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtRQUN4QyxPQUFPO1lBQ04sSUFBSSxFQUFFLFlBQVk7WUFDbEIsSUFBSSxFQUFFLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJO1lBQzVDLFdBQVcsRUFBRTtnQkFDWixLQUFLLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtnQkFDN0MsR0FBRyxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7YUFDM0M7U0FDRCxDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUE7SUFDRixlQUFlLENBQUMsV0FBVyxFQUFFLGFBQWEsQ0FBQyxDQUFBO0FBQzVDLENBQUMifQ==