/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Position } from '../../../../common/core/position.js';
import { withTestCodeEditor, } from '../../../../test/browser/testCodeEditor.js';
export function deserializePipePositions(text) {
    let resultText = '';
    let lineNumber = 1;
    let charIndex = 0;
    const positions = [];
    for (let i = 0, len = text.length; i < len; i++) {
        const chr = text.charAt(i);
        if (chr === '\n') {
            resultText += chr;
            lineNumber++;
            charIndex = 0;
            continue;
        }
        if (chr === '|') {
            positions.push(new Position(lineNumber, charIndex + 1));
        }
        else {
            resultText += chr;
            charIndex++;
        }
    }
    return [resultText, positions];
}
export function serializePipePositions(text, positions) {
    positions.sort(Position.compare);
    let resultText = '';
    let lineNumber = 1;
    let charIndex = 0;
    for (let i = 0, len = text.length; i < len; i++) {
        const chr = text.charAt(i);
        if (positions.length > 0 &&
            positions[0].lineNumber === lineNumber &&
            positions[0].column === charIndex + 1) {
            resultText += '|';
            positions.shift();
        }
        resultText += chr;
        if (chr === '\n') {
            lineNumber++;
            charIndex = 0;
        }
        else {
            charIndex++;
        }
    }
    if (positions.length > 0 &&
        positions[0].lineNumber === lineNumber &&
        positions[0].column === charIndex + 1) {
        resultText += '|';
        positions.shift();
    }
    if (positions.length > 0) {
        throw new Error(`Unexpected left over positions!!!`);
    }
    return resultText;
}
export function testRepeatedActionAndExtractPositions(text, initialPosition, action, record, stopCondition, options = {}) {
    const actualStops = [];
    withTestCodeEditor(text, options, (editor) => {
        editor.setPosition(initialPosition);
        while (true) {
            action(editor);
            actualStops.push(record(editor));
            if (stopCondition(editor)) {
                break;
            }
            if (actualStops.length > 1000) {
                throw new Error(`Endless loop detected involving position ${editor.getPosition()}!`);
            }
        }
    });
    return actualStops;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29yZFRlc3RVdGlscy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL3dvcmRPcGVyYXRpb25zL3Rlc3QvYnJvd3Nlci93b3JkVGVzdFV0aWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM5RCxPQUFPLEVBR04sa0JBQWtCLEdBQ2xCLE1BQU0sNENBQTRDLENBQUE7QUFFbkQsTUFBTSxVQUFVLHdCQUF3QixDQUFDLElBQVk7SUFDcEQsSUFBSSxVQUFVLEdBQUcsRUFBRSxDQUFBO0lBQ25CLElBQUksVUFBVSxHQUFHLENBQUMsQ0FBQTtJQUNsQixJQUFJLFNBQVMsR0FBRyxDQUFDLENBQUE7SUFDakIsTUFBTSxTQUFTLEdBQWUsRUFBRSxDQUFBO0lBQ2hDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztRQUNqRCxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQzFCLElBQUksR0FBRyxLQUFLLElBQUksRUFBRSxDQUFDO1lBQ2xCLFVBQVUsSUFBSSxHQUFHLENBQUE7WUFDakIsVUFBVSxFQUFFLENBQUE7WUFDWixTQUFTLEdBQUcsQ0FBQyxDQUFBO1lBQ2IsU0FBUTtRQUNULENBQUM7UUFDRCxJQUFJLEdBQUcsS0FBSyxHQUFHLEVBQUUsQ0FBQztZQUNqQixTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksUUFBUSxDQUFDLFVBQVUsRUFBRSxTQUFTLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUN4RCxDQUFDO2FBQU0sQ0FBQztZQUNQLFVBQVUsSUFB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