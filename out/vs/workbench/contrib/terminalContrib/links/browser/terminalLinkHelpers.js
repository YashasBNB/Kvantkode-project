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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxMaW5rSGVscGVycy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9saW5rcy9icm93c2VyL3Rlcm1pbmFsTGlua0hlbHBlcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFXaEcsT0FBTyxFQUFTLEtBQUssRUFBRSxLQUFLLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQU94RTs7Ozs7OztHQU9HO0FBQ0gsTUFBTSxVQUFVLHdCQUF3QixDQUN2QyxLQUFvQixFQUNwQixXQUFtQixFQUNuQixLQUFhLEVBQ2IsU0FBaUI7SUFFakIsTUFBTSxXQUFXLEdBQWlCO1FBQ2pDLEtBQUssRUFBRTtZQUNOLENBQUMsRUFBRSxLQUFLLENBQUMsV0FBVztZQUNwQixDQUFDLEVBQUUsS0FBSyxDQUFDLGVBQWUsR0FBRyxTQUFTO1NBQ3BDO1FBQ0QsR0FBRyxFQUFFO1lBQ0osQ0FBQyxFQUFFLEtBQUssQ0FBQyxTQUFTLEdBQUcsQ0FBQztZQUN0QixDQUFDLEVBQUUsS0FBSyxDQUFDLGFBQWEsR0FBRyxTQUFTO1NBQ2xDO0tBQ0QsQ0FBQTtJQUVELGtFQUFrRTtJQUNsRSxJQUFJLFdBQVcsR0FBRyxDQUFDLENBQUE7SUFDbkIsTUFBTSxxQkFBcUIsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLEdBQUcsV0FBVyxDQUFDLENBQUE7SUFDeEUsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1FBQzFELE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsV0FBVyxFQUFFLEtBQUssQ0FBQyxXQUFXLEdBQUcsQ0FBQyxHQUFH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