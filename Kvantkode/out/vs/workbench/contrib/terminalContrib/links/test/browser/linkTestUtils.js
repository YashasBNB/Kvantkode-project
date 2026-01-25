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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlua1Rlc3RVdGlscy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL2xpbmtzL3Rlc3QvYnJvd3Nlci9saW5rVGVzdFV0aWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxRQUFRLENBQUE7QUFLeEMsTUFBTSxDQUFDLEtBQUssVUFBVSxnQkFBZ0IsQ0FDckMsSUFBWSxFQUNaLFFBR0csRUFDSCxRQUErQixFQUMvQixZQUE4QjtJQUU5QixRQUFRLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFBO0lBRXRCLG1EQUFtRDtJQUNuRCxNQUFNLElBQUksT0FBTyxDQUFPLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUM3RCxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBQ3BDLE1BQU0sYUFBYSxHQUFHLFNBQVM7U0FDN0IsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxLQUFLLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO1NBQzVDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtRQUNoQixPQUFPLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUNqRCxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFFTixnQ0FBZ0M7SUFDaEMsTUFBTSxLQUFLLEdBQWtCLEVBQUUsQ0FBQTtJQUMvQixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztRQUNuRSxLQUFLLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFFLENBQUMsQ0FBQTtJQUNyRCxDQUFDO0lBRUQsb0RBQW9EO0lBQ3BELE1BQU0sV0FBVyxHQUFHLENBQ25CLE1BQU0sUUFBUSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsYUFBYSxFQUFFLFFBQVEsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FDakYsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtRQUNYLE9BQU87WUFDTixJQUFJLEVBQUUsQ0FBQyxDQUFDLEdBQUcsRUFBRSxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUMsSUFBSTtZQUNqQyxJQUFJLEVBQUUsWUFBWTtZQUNsQixXQUFXLEVBQUUsQ0FBQyxDQUFDLFdBQVc7U0FDMUIsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFBO0lBQ0YsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1FBQ3hDLE9BQU87WUFDTixJQUFJLEVBQUUsWUFBWTtZQUNsQixJQUFJLEVBQUUsS0FBSyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUk7WUFDNUMsV0FBVyxFQUFFO2dCQUNaLEtBQUssRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO2dCQUM3QyxHQUFHLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTthQUMzQztTQUNELENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUNGLGVBQWUsQ0FBQyxXQUFXLEVBQUUsYUFBYSxDQUFDLENBQUE7QUFDNUMsQ0FBQyJ9