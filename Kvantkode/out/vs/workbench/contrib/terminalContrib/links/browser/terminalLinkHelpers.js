/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { posix, win32 } from '../../../../../base/common/path.js';
/**
 * Converts a possibly wrapped link's range (comprised of string indices) into a buffer range that plays nicely with xterm.js
 *
 * @param lines A single line (not the entire buffer)
 * @param bufferWidth The number of columns in the terminal
 * @param range The link range - string indices
 * @param startLine The absolute y position (on the buffer) of the line
 */
export function convertLinkRangeToBuffer(lines, bufferWidth, range, startLine) {
    const bufferRange = {
        start: {
            x: range.startColumn,
            y: range.startLineNumber + startLine,
        },
        end: {
            x: range.endColumn - 1,
            y: range.endLineNumber + startLine,
        },
    };
    // Shift start range right for each wide character before the link
    let startOffset = 0;
    const startWrappedLineCount = Math.ceil(range.startColumn / bufferWidth);
    for (let y = 0; y < Math.min(startWrappedLineCount); y++) {
        const lineLength = Math.min(bufferWidth, range.startColumn - 1 - y * bufferWidth);
        let lineOffset = 0;
        const line = lines[y];
        // Sanity check for line, apparently this can happen but it's not clear under what
        // circumstances this happens. Continue on, skipping the remainder of start offset if this
        // happens to minimize impact.
        if (!line) {
            break;
        }
        for (let x = 0; x < Math.min(bufferWidth, lineLength + lineOffset); x++) {
            const cell = line.getCell(x);
            // This is unexpected but it means the character doesn't exist, so we shouldn't add to
            // the offset
            if (!cell) {
                break;
            }
            const width = cell.getWidth();
            if (width === 2) {
                lineOffset++;
            }
            const char = cell.getChars();
            if (char.length > 1) {
                lineOffset -= char.length - 1;
            }
        }
        startOffset += lineOffset;
    }
    // Shift end range right for each wide character inside the link
    let endOffset = 0;
    const endWrappedLineCount = Math.ceil(range.endColumn / bufferWidth);
    for (let y = Math.max(0, startWrappedLineCount - 1); y < endWrappedLineCount; y++) {
        const start = y === startWrappedLineCount - 1 ? (range.startColumn - 1 + startOffset) % bufferWidth : 0;
        const lineLength = Math.min(bufferWidth, range.endColumn + startOffset - y * bufferWidth);
        let lineOffset = 0;
        const line = lines[y];
        // Sanity check for line, apparently this can happen but it's not clear under what
        // circumstances this happens. Continue on, skipping the remainder of start offset if this
        // happens to minimize impact.
        if (!line) {
            break;
        }
        for (let x = start; x < Math.min(bufferWidth, lineLength + lineOffset); x++) {
            const cell = line.getCell(x);
            // This is unexpected but it means the character doesn't exist, so we shouldn't add to
            // the offset
            if (!cell) {
                break;
            }
            const width = cell.getWidth();
            const chars = cell.getChars();
            // Offset for null cells following wide characters
            if (width === 2) {
                lineOffset++;
            }
            // Offset for early wrapping when the last cell in row is a wide character
            if (x === bufferWidth - 1 && chars === '') {
                lineOffset++;
            }
            // Offset multi-code characters like emoji
            if (chars.length > 1) {
                lineOffset -= chars.length - 1;
            }
        }
        endOffset += lineOffset;
    }
    // Apply the width character offsets to the result
    bufferRange.start.x += startOffset;
    bufferRange.end.x += startOffset + endOffset;
    // Convert back to wrapped lines
    while (bufferRange.start.x > bufferWidth) {
        bufferRange.start.x -= bufferWidth;
        bufferRange.start.y++;
    }
    while (bufferRange.end.x > bufferWidth) {
        bufferRange.end.x -= bufferWidth;
        bufferRange.end.y++;
    }
    return bufferRange;
}
export function convertBufferRangeToViewport(bufferRange, viewportY) {
    return {
        start: {
            x: bufferRange.start.x - 1,
            y: bufferRange.start.y - viewportY - 1,
        },
        end: {
            x: bufferRange.end.x - 1,
            y: bufferRange.end.y - viewportY - 1,
        },
    };
}
export function getXtermLineContent(buffer, lineStart, lineEnd, cols) {
    // Cap the maximum number of lines generated to prevent potential performance problems. This is
    // more of a sanity check as the wrapped line should already be trimmed down at this point.
    const maxLineLength = Math.max(2048, cols * 2);
    lineEnd = Math.min(lineEnd, lineStart + maxLineLength);
    let content = '';
    for (let i = lineStart; i <= lineEnd; i++) {
        // Make sure only 0 to cols are considered as resizing when windows mode is enabled will
        // retain buffer data outside of the terminal width as reflow is disabled.
        const line = buffer.getLine(i);
        if (line) {
            content += line.translateToString(true, 0, cols);
        }
    }
    return content;
}
export function getXtermRangesByAttr(buffer, lineStart, lineEnd, cols) {
    let bufferRangeStart = undefined;
    let lastFgAttr = -1;
    let lastBgAttr = -1;
    const ranges = [];
    for (let y = lineStart; y <= lineEnd; y++) {
        const line = buffer.getLine(y);
        if (!line) {
            continue;
        }
        for (let x = 0; x < cols; x++) {
            const cell = line.getCell(x);
            if (!cell) {
                break;
            }
            // HACK: Re-construct the attributes from fg and bg, this is hacky as it relies
            // upon the internal buffer bit layout
            const thisFgAttr = cell.isBold() | cell.isInverse() | cell.isStrikethrough() | cell.isUnderline();
            const thisBgAttr = cell.isDim() | cell.isItalic();
            if (lastFgAttr === -1 || lastBgAttr === -1) {
                bufferRangeStart = { x, y };
            }
            else {
                if (lastFgAttr !== thisFgAttr || lastBgAttr !== thisBgAttr) {
                    // TODO: x overflow
                    const bufferRangeEnd = { x, y };
                    ranges.push({
                        start: bufferRangeStart,
                        end: bufferRangeEnd,
                    });
                    bufferRangeStart = { x, y };
                }
            }
            lastFgAttr = thisFgAttr;
            lastBgAttr = thisBgAttr;
        }
    }
    return ranges;
}
// export function positionIsInRange(position: IBufferCellPosition, range: IBufferRange): boolean {
// 	if (position.y < range.start.y || position.y > range.end.y) {
// 		return false;
// 	}
// 	if (position.y === range.start.y && position.x < range.start.x) {
// 		return false;
// 	}
// 	if (position.y === range.end.y && position.x > range.end.x) {
// 		return false;
// 	}
// 	return true;
// }
/**
 * For shells with the CommandDetection capability, the cwd for a command relative to the line of
 * the particular link can be used to narrow down the result for an exact file match.
 */
export function updateLinkWithRelativeCwd(capabilities, y, text, osPath, logService) {
    const cwd = capabilities.get(2 /* TerminalCapability.CommandDetection */)?.getCwdForLine(y);
    logService.trace('terminalLinkHelpers#updateLinkWithRelativeCwd cwd', cwd);
    if (!cwd) {
        return undefined;
    }
    const result = [];
    const sep = osPath.sep;
    if (!text.includes(sep)) {
        result.push(osPath.resolve(cwd + sep + text));
    }
    else {
        let commonDirs = 0;
        let i = 0;
        const cwdPath = cwd.split(sep).reverse();
        const linkPath = text.split(sep);
        // Get all results as candidates, prioritizing the link with the most common directories.
        // For example if in the directory /home/common and the link is common/file, the result
        // should be: `['/home/common/common/file', '/home/common/file']`. The first is the most
        // likely as cwd detection is active.
        while (i < cwdPath.length) {
            result.push(osPath.resolve(cwd + sep + linkPath.slice(commonDirs).join(sep)));
            if (cwdPath[i] === linkPath[i]) {
                commonDirs++;
            }
            else {
                break;
            }
            i++;
        }
    }
    return result;
}
export function osPathModule(os) {
    return os === 1 /* OperatingSystem.Windows */ ? win32 : posix;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxMaW5rSGVscGVycy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL2xpbmtzL2Jyb3dzZXIvdGVybWluYWxMaW5rSGVscGVycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQVdoRyxPQUFPLEVBQVMsS0FBSyxFQUFFLEtBQUssRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBT3hFOzs7Ozs7O0dBT0c7QUFDSCxNQUFNLFVBQVUsd0JBQXdCLENBQ3ZDLEtBQW9CLEVBQ3BCLFdBQW1CLEVBQ25CLEtBQWEsRUFDYixTQUFpQjtJQUVqQixNQUFNLFdBQVcsR0FBaUI7UUFDakMsS0FBSyxFQUFFO1lBQ04sQ0FBQyxFQUFFLEtBQUssQ0FBQyxXQUFXO1lBQ3BCLENBQUMsRUFBRSxLQUFLLENBQUMsZUFBZSxHQUFHLFNBQVM7U0FDcEM7UUFDRCxHQUFHLEVBQUU7WUFDSixDQUFDLEVBQUUsS0FBSyxDQUFDLFNBQVMsR0FBRyxDQUFDO1lBQ3RCLENBQUMsRUFBRSxLQUFLLENBQUMsYUFBYSxHQUFHLFNBQVM7U0FDbEM7S0FDRCxDQUFBO0lBRUQsa0VBQWtFO0lBQ2xFLElBQUksV0FBVyxHQUFHLENBQUMsQ0FBQTtJQUNuQixNQUFNLHFCQUFxQixHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsR0FBRyxXQUFXLENBQUMsQ0FBQTtJQUN4RSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDMUQsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxXQUFXLEVBQUUsS0FBSyxDQUFDLFdBQVcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLFdBQVcsQ0FBQyxDQUFBO1FBQ2pGLElBQUksVUFBVSxHQUFHLENBQUMsQ0FBQTtRQUNsQixNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDckIsa0ZBQWtGO1FBQ2xGLDBGQUEwRjtRQUMxRiw4QkFBOEI7UUFDOUIsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ1gsTUFBSztRQUNOLENBQUM7UUFDRCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxXQUFXLEVBQUUsVUFBVSxHQUFHLFVBQVUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDekUsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUM1QixzRkFBc0Y7WUFDdEYsYUFBYTtZQUNiLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDWCxNQUFLO1lBQ04sQ0FBQztZQUNELE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQTtZQUM3QixJQUFJLEtBQUssS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDakIsVUFBVSxFQUFFLENBQUE7WUFDYixDQUFDO1lBQ0QsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFBO1lBQzVCLElBQUksSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDckIsVUFBVSxJQUFJLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFBO1lBQzlCLENBQUM7UUFDRixDQUFDO1FBQ0QsV0FBVyxJQUFJLFVBQVUsQ0FBQTtJQUMxQixDQUFDO0lBRUQsZ0VBQWdFO0lBQ2hFLElBQUksU0FBUyxHQUFHLENBQUMsQ0FBQTtJQUNqQixNQUFNLG1CQUFtQixHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsR0FBRyxXQUFXLENBQUMsQ0FBQTtJQUNwRSxLQUFLLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLHFCQUFxQixHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxtQkFBbUIsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1FBQ25GLE1BQU0sS0FBSyxHQUNWLENBQUMsS0FBSyxxQkFBcUIsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFdBQVcsR0FBRyxDQUFDLEdBQUcsV0FBVyxDQUFDLEdBQUcsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDMUYsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxXQUFXLEVBQUUsS0FBSyxDQUFDLFNBQVMsR0FBRyxXQUFXLEdBQUcsQ0FBQyxHQUFHLFdBQVcsQ0FBQyxDQUFBO1FBQ3pGLElBQUksVUFBVSxHQUFHLENBQUMsQ0FBQTtRQUNsQixNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDckIsa0ZBQWtGO1FBQ2xGLDBGQUEwRjtRQUMxRiw4QkFBOEI7UUFDOUIsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ1gsTUFBSztRQUNOLENBQUM7UUFDRCxLQUFLLElBQUksQ0FBQyxHQUFHLEtBQUssRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxXQUFXLEVBQUUsVUFBVSxHQUFHLFVBQVUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDN0UsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUM1QixzRkFBc0Y7WUFDdEYsYUFBYTtZQUNiLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDWCxNQUFLO1lBQ04sQ0FBQztZQUNELE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQTtZQUM3QixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUE7WUFDN0Isa0RBQWtEO1lBQ2xELElBQUksS0FBSyxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUNqQixVQUFVLEVBQUUsQ0FBQTtZQUNiLENBQUM7WUFDRCwwRUFBMEU7WUFDMUUsSUFBSSxDQUFDLEtBQUssV0FBVyxHQUFHLENBQUMsSUFBSSxLQUFLLEtBQUssRUFBRSxFQUFFLENBQUM7Z0JBQzNDLFVBQVUsRUFBRSxDQUFBO1lBQ2IsQ0FBQztZQUNELDBDQUEwQztZQUMxQyxJQUFJLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQ3RCLFVBQVUsSUFBSSxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQTtZQUMvQixDQUFDO1FBQ0YsQ0FBQztRQUNELFNBQVMsSUFBSSxVQUFVLENBQUE7SUFDeEIsQ0FBQztJQUVELGtEQUFrRDtJQUNsRCxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxXQUFXLENBQUE7SUFDbEMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksV0FBVyxHQUFHLFNBQVMsQ0FBQTtJQUU1QyxnQ0FBZ0M7SUFDaEMsT0FBTyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxXQUFXLEVBQUUsQ0FBQztRQUMxQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxXQUFXLENBQUE7UUFDbEMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQTtJQUN0QixDQUFDO0lBQ0QsT0FBTyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxXQUFXLEVBQUUsQ0FBQztRQUN4QyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxXQUFXLENBQUE7UUFDaEMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQTtJQUNwQixDQUFDO0lBRUQsT0FBTyxXQUFXLENBQUE7QUFDbkIsQ0FBQztBQUVELE1BQU0sVUFBVSw0QkFBNEIsQ0FDM0MsV0FBeUIsRUFDekIsU0FBaUI7SUFFakIsT0FBTztRQUNOLEtBQUssRUFBRTtZQUNOLENBQUMsRUFBRSxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDO1lBQzFCLENBQUMsRUFBRSxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxTQUFTLEdBQUcsQ0FBQztTQUN0QztRQUNELEdBQUcsRUFBRTtZQUNKLENBQUMsRUFBRSxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDO1lBQ3hCLENBQUMsRUFBRSxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxTQUFTLEdBQUcsQ0FBQztTQUNwQztLQUNELENBQUE7QUFDRixDQUFDO0FBRUQsTUFBTSxVQUFVLG1CQUFtQixDQUNsQyxNQUFlLEVBQ2YsU0FBaUIsRUFDakIsT0FBZSxFQUNmLElBQVk7SUFFWiwrRkFBK0Y7SUFDL0YsMkZBQTJGO0lBQzNGLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQTtJQUM5QyxPQUFPLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsU0FBUyxHQUFHLGFBQWEsQ0FBQyxDQUFBO0lBQ3RELElBQUksT0FBTyxHQUFHLEVBQUUsQ0FBQTtJQUNoQixLQUFLLElBQUksQ0FBQyxHQUFHLFNBQVMsRUFBRSxDQUFDLElBQUksT0FBTyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDM0Msd0ZBQXdGO1FBQ3hGLDBFQUEwRTtRQUMxRSxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQzlCLElBQUksSUFBSSxFQUFFLENBQUM7WUFDVixPQUFPLElBQUksSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDakQsQ0FBQztJQUNGLENBQUM7SUFDRCxPQUFPLE9BQU8sQ0FBQTtBQUNmLENBQUM7QUFFRCxNQUFNLFVBQVUsb0JBQW9CLENBQ25DLE1BQWUsRUFDZixTQUFpQixFQUNqQixPQUFlLEVBQ2YsSUFBWTtJQUVaLElBQUksZ0JBQWdCLEdBQW9DLFNBQVMsQ0FBQTtJQUNqRSxJQUFJLFVBQVUsR0FBVyxDQUFDLENBQUMsQ0FBQTtJQUMzQixJQUFJLFVBQVUsR0FBVyxDQUFDLENBQUMsQ0FBQTtJQUMzQixNQUFNLE1BQU0sR0FBbUIsRUFBRSxDQUFBO0lBQ2pDLEtBQUssSUFBSSxDQUFDLEdBQUcsU0FBUyxFQUFFLENBQUMsSUFBSSxPQUFPLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztRQUMzQyxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQzlCLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNYLFNBQVE7UUFDVCxDQUFDO1FBQ0QsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQy9CLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDNUIsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUNYLE1BQUs7WUFDTixDQUFDO1lBQ0QsK0VBQStFO1lBQy9FLHNDQUFzQztZQUN0QyxNQUFNLFVBQVUsR0FDZixJQUFJLENBQUMsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLFNBQVMsRUFBRSxHQUFHLElBQUksQ0FBQyxlQUFlLEVBQUUsR0FBRyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUE7WUFDL0UsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLEtBQUssRUFBRSxHQUFHLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQTtZQUNqRCxJQUFJLFVBQVUsS0FBSyxDQUFDLENBQUMsSUFBSSxVQUFVLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQztnQkFDNUMsZ0JBQWdCLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUE7WUFDNUIsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLElBQUksVUFBVSxLQUFLLFVBQVUsSUFBSSxVQUFVLEtBQUssVUFBVSxFQUFFLENBQUM7b0JBQzVELG1CQUFtQjtvQkFDbkIsTUFBTSxjQUFjLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUE7b0JBQy9CLE1BQU0sQ0FBQyxJQUFJLENBQUM7d0JBQ1gsS0FBSyxFQUFFLGdCQUFpQjt3QkFDeEIsR0FBRyxFQUFFLGNBQWM7cUJBQ25CLENBQUMsQ0FBQTtvQkFDRixnQkFBZ0IsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQTtnQkFDNUIsQ0FBQztZQUNGLENBQUM7WUFDRCxVQUFVLEdBQUcsVUFBVSxDQUFBO1lBQ3ZCLFVBQVUsR0FBRyxVQUFVLENBQUE7UUFDeEIsQ0FBQztJQUNGLENBQUM7SUFDRCxPQUFPLE1BQU0sQ0FBQTtBQUNkLENBQUM7QUFFRCxtR0FBbUc7QUFDbkcsaUVBQWlFO0FBQ2pFLGtCQUFrQjtBQUNsQixLQUFLO0FBQ0wscUVBQXFFO0FBQ3JFLGtCQUFrQjtBQUNsQixLQUFLO0FBQ0wsaUVBQWlFO0FBQ2pFLGtCQUFrQjtBQUNsQixLQUFLO0FBQ0wsZ0JBQWdCO0FBQ2hCLElBQUk7QUFFSjs7O0dBR0c7QUFDSCxNQUFNLFVBQVUseUJBQXlCLENBQ3hDLFlBQXNDLEVBQ3RDLENBQVMsRUFDVCxJQUFZLEVBQ1osTUFBYSxFQUNiLFVBQStCO0lBRS9CLE1BQU0sR0FBRyxHQUFHLFlBQVksQ0FBQyxHQUFHLDZDQUFxQyxFQUFFLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUNuRixVQUFVLENBQUMsS0FBSyxDQUFDLG1EQUFtRCxFQUFFLEdBQUcsQ0FBQyxDQUFBO0lBQzFFLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUNWLE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFDRCxNQUFNLE1BQU0sR0FBYSxFQUFFLENBQUE7SUFDM0IsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQTtJQUN0QixJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO1FBQ3pCLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUE7SUFDOUMsQ0FBQztTQUFNLENBQUM7UUFDUCxJQUFJLFVBQVUsR0FBRyxDQUFDLENBQUE7UUFDbEIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ1QsTUFBTSxPQUFPLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUN4QyxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ2hDLHlGQUF5RjtRQUN6Rix1RkFBdUY7UUFDdkYsd0ZBQXdGO1FBQ3hGLHFDQUFxQztRQUNyQyxPQUFPLENBQUMsR0FBRyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDM0IsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsR0FBRyxHQUFHLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQzdFLElBQUksT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO2dCQUNoQyxVQUFVLEVBQUUsQ0FBQTtZQUNiLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxNQUFLO1lBQ04sQ0FBQztZQUNELENBQUMsRUFBRSxDQUFBO1FBQ0osQ0FBQztJQUNGLENBQUM7SUFDRCxPQUFPLE1BQU0sQ0FBQTtBQUNkLENBQUM7QUFFRCxNQUFNLFVBQVUsWUFBWSxDQUFDLEVBQW1CO0lBQy9DLE9BQU8sRUFBRSxvQ0FBNEIsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUE7QUFDdEQsQ0FBQyJ9