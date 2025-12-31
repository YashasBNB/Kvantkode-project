/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { convertLinkRangeToBuffer, getXtermLineContent } from './terminalLinkHelpers.js';
export class TerminalExternalLinkDetector {
    constructor(id, xterm, _provideLinks) {
        this.id = id;
        this.xterm = xterm;
        this._provideLinks = _provideLinks;
        this.maxLinkLength = 2000;
    }
    async detect(lines, startLine, endLine) {
        // Get the text representation of the wrapped line
        const text = getXtermLineContent(this.xterm.buffer.active, startLine, endLine, this.xterm.cols);
        if (text === '' || text.length > this.maxLinkLength) {
            return [];
        }
        const externalLinks = await this._provideLinks(text);
        if (!externalLinks) {
            return [];
        }
        const result = externalLinks.map((link) => {
            const bufferRange = convertLinkRangeToBuffer(lines, this.xterm.cols, {
                startColumn: link.startIndex + 1,
                startLineNumber: 1,
                endColumn: link.startIndex + link.length + 1,
                endLineNumber: 1,
            }, startLine);
            const matchingText = text.substring(link.startIndex, link.startIndex + link.length) || '';
            const l = {
                text: matchingText,
                label: link.label,
                bufferRange,
                type: { id: this.id },
                activate: link.activate,
            };
            return l;
        });
        return result;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxFeHRlcm5hbExpbmtEZXRlY3Rvci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9saW5rcy9icm93c2VyL3Rlcm1pbmFsRXh0ZXJuYWxMaW5rRGV0ZWN0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLG1CQUFtQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFJeEYsTUFBTSxPQUFPLDRCQUE0QjtJQUd4QyxZQUNVLEVBQVUsRUFDVixLQUFlLEVBQ1AsYUFBMEU7UUFGbEYsT0FBRSxHQUFGLEVBQUUsQ0FBUTtRQUNWLFVBQUssR0FBTCxLQUFLLENBQVU7UUFDUCxrQkFBYSxHQUFiLGFBQWEsQ0FBNkQ7UUFMbkYsa0JBQWEsR0FBRyxJQUFJLENBQUE7SUFNMUIsQ0FBQztJQUVKLEtBQUssQ0FBQyxNQUFNLENBQ1gsS0FBb0IsRUFDcEIsU0FBaUIsRUFDakIsT0FBZTtRQUVmLGtEQUFrRDtRQUNsRCxNQUFNLElBQUksR0FBRyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQy9GLElBQUksSUFBSSxLQUFLLEVBQUUsSUFBSSxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUNyRCxPQUFPLEVBQUUsQ0FBQTtRQUNWLENBQUM7UUFFRCxNQUFNLGFBQWEsR0FBRyxNQUFNLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDcEQsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQ3BCLE9BQU8sRUFBRSxDQUFBO1FBQ1YsQ0FBQztRQUVELE1BQU0sTUFBTSxHQUFHLGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRTtZQUN6QyxNQUFNLFdBQVcsR0FBRyx3QkFBd0IsQ0FDM0MsS0FBSyxFQUNMLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUNmO2dCQUNDLFdBQVcsRUFBRSxJQUFJLENBQUMsVUFBVSxHQUFHLENBQUM7Z0JBQ2hDLGVBQWUsRUFBRSxDQUFDO2dCQUNsQixTQUFTLEVBQUUsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUM7Z0JBQzVDLGFBQWEsRUFBRSxDQUFDO2FBQ2hCLEVBQ0QsU0FBUyxDQUNULENBQUE7WUFDRCxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFBO1lBRXpGLE1BQU0sQ0FBQyxHQUF3QjtnQkFDOUIsSUFBSSxFQUFFLFlBQVk7Z0JBQ2xCLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSztnQkFDakIsV0FBVztnQkFDWCxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRTtnQkFDckIsUUFBUSxFQUFFLElBQUksQ0FBQyxRQUFRO2FBQ3ZCLENBQUE7WUFDRCxPQUFPLENBQUMsQ0FBQTtRQUNULENBQUMsQ0FBQyxDQUFBO1FBRUYsT0FBTyxNQUFNLENBQUE7SUFDZCxDQUFDO0NBQ0QifQ==