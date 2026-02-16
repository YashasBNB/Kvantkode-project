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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxFeHRlcm5hbExpbmtEZXRlY3Rvci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL2xpbmtzL2Jyb3dzZXIvdGVybWluYWxFeHRlcm5hbExpbmtEZXRlY3Rvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUl4RixNQUFNLE9BQU8sNEJBQTRCO0lBR3hDLFlBQ1UsRUFBVSxFQUNWLEtBQWUsRUFDUCxhQUEwRTtRQUZsRixPQUFFLEdBQUYsRUFBRSxDQUFRO1FBQ1YsVUFBSyxHQUFMLEtBQUssQ0FBVTtRQUNQLGtCQUFhLEdBQWIsYUFBYSxDQUE2RDtRQUxuRixrQkFBYSxHQUFHLElBQUksQ0FBQTtJQU0xQixDQUFDO0lBRUosS0FBSyxDQUFDLE1BQU0sQ0FDWCxLQUFvQixFQUNwQixTQUFpQixFQUNqQixPQUFlO1FBRWYsa0RBQWtEO1FBQ2xELE1BQU0sSUFBSSxHQUFHLG1CQUFtQixDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDL0YsSUFBSSxJQUFJLEtBQUssRUFBRSxJQUFJLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQ3JELE9BQU8sRUFBRSxDQUFBO1FBQ1YsQ0FBQztRQUVELE1BQU0sYUFBYSxHQUFHLE1BQU0sSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNwRCxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDcEIsT0FBTyxFQUFFLENBQUE7UUFDVixDQUFDO1FBRUQsTUFBTSxNQUFNLEdBQUcsYUFBYSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFO1lBQ3pDLE1BQU0sV0FBVyxHQUFHLHdCQUF3QixDQUMzQyxLQUFLLEVBQ0wsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQ2Y7Z0JBQ0MsV0FBVyxFQUFFLElBQUksQ0FBQyxVQUFVLEdBQUcsQ0FBQztnQkFDaEMsZUFBZSxFQUFFLENBQUM7Z0JBQ2xCLFNBQVMsRUFBRSxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQztnQkFDNUMsYUFBYSxFQUFFLENBQUM7YUFDaEIsRUFDRCxTQUFTLENBQ1QsQ0FBQTtZQUNELE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUE7WUFFekYsTUFBTSxDQUFDLEdBQXdCO2dCQUM5QixJQUFJLEVBQUUsWUFBWTtnQkFDbEIsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLO2dCQUNqQixXQUFXO2dCQUNYLElBQUksRUFBRSxFQUFFLEVBQUUsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFO2dCQUNyQixRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVE7YUFDdkIsQ0FBQTtZQUNELE9BQU8sQ0FBQyxDQUFBO1FBQ1QsQ0FBQyxDQUFDLENBQUE7UUFFRixPQUFPLE1BQU0sQ0FBQTtJQUNkLENBQUM7Q0FDRCJ9