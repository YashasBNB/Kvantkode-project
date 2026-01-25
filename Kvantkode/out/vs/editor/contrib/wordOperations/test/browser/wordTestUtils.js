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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29yZFRlc3RVdGlscy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvd29yZE9wZXJhdGlvbnMvdGVzdC9icm93c2VyL3dvcmRUZXN0VXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzlELE9BQU8sRUFHTixrQkFBa0IsR0FDbEIsTUFBTSw0Q0FBNEMsQ0FBQTtBQUVuRCxNQUFNLFVBQVUsd0JBQXdCLENBQUMsSUFBWTtJQUNwRCxJQUFJLFVBQVUsR0FBRyxFQUFFLENBQUE7SUFDbkIsSUFBSSxVQUFVLEdBQUcsQ0FBQyxDQUFBO0lBQ2xCLElBQUksU0FBUyxHQUFHLENBQUMsQ0FBQTtJQUNqQixNQUFNLFNBQVMsR0FBZSxFQUFFLENBQUE7SUFDaEMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1FBQ2pELE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDMUIsSUFBSSxHQUFHLEtBQUssSUFBSSxFQUFFLENBQUM7WUFDbEIsVUFBVSxJQUFJLEdBQUcsQ0FBQTtZQUNqQixVQUFVLEVBQUUsQ0FBQTtZQUNaLFNBQVMsR0FBRyxDQUFDLENBQUE7WUFDYixTQUFRO1FBQ1QsQ0FBQztRQUNELElBQUksR0FBRyxLQUFLLEdBQUcsRUFBRSxDQUFDO1lBQ2pCLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxRQUFRLENBQUMsVUFBVSxFQUFFLFNBQVMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3hELENBQUM7YUFBTSxDQUFDO1lBQ1AsVUFB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