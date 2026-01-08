/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CancellationTokenSource } from '../../../base/common/cancellation.js';
import { Emitter } from '../../../base/common/event.js';
import { KeyChord } from '../../../base/common/keyCodes.js';
import { URI } from '../../../base/common/uri.js';
import { Position } from '../core/position.js';
import { Range } from '../core/range.js';
import { Selection } from '../core/selection.js';
import { Token } from '../languages.js';
import * as standaloneEnums from '../standalone/standaloneEnums.js';
export class KeyMod {
    static { this.CtrlCmd = 2048 /* ConstKeyMod.CtrlCmd */; }
    static { this.Shift = 1024 /* ConstKeyMod.Shift */; }
    static { this.Alt = 512 /* ConstKeyMod.Alt */; }
    static { this.WinCtrl = 256 /* ConstKeyMod.WinCtrl */; }
    static chord(firstPart, secondPart) {
        return KeyChord(firstPart, secondPart);
    }
}
export function createMonacoBaseAPI() {
    return {
        editor: undefined, // undefined override expected here
        languages: undefined, // undefined override expected here
        CancellationTokenSource: CancellationTokenSource,
        Emitter: Emitter,
        KeyCode: standaloneEnums.KeyCode,
        KeyMod: KeyMod,
        Position: Position,
        Range: Range,
        Selection: Selection,
        SelectionDirection: standaloneEnums.SelectionDirection,
        MarkerSeverity: standaloneEnums.MarkerSeverity,
        MarkerTag: standaloneEnums.MarkerTag,
        Uri: URI,
        Token: Token,
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yQmFzZUFwaS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9zZXJ2aWNlcy9lZGl0b3JCYXNlQXBpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzlFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsUUFBUSxFQUF5QixNQUFNLGtDQUFrQyxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUNqRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFDOUMsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtCQUFrQixDQUFBO0FBQ3hDLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQTtBQUNoRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFDdkMsT0FBTyxLQUFLLGVBQWUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUVuRSxNQUFNLE9BQU8sTUFBTTthQUNLLFlBQU8sa0NBQThCO2FBQ3JDLFVBQUssZ0NBQTRCO2FBQ2pDLFFBQUcsNkJBQTBCO2FBQzdCLFlBQU8saUNBQThCO0lBRXJELE1BQU0sQ0FBQyxLQUFLLENBQUMsU0FBaUIsRUFBRSxVQUFrQjtRQUN4RCxPQUFPLFFBQVEsQ0FBQyxTQUFTLEVBQUUsVUFBVSxDQUFDLENBQUE7SUFDdkMsQ0FBQzs7QUFHRixNQUFNLFVBQVUsbUJBQW1CO0lBQ2xDLE9BQU87UUFDTixNQUFNLEVBQUUsU0FBVSxFQUFFLG1DQUFtQztRQUN2RCxTQUFTLEVBQUUsU0FBVSxFQUFFLG1DQUFtQztRQUMxRCx1QkFBdUIsRUFBRSx1QkFBdUI7UUFDaEQsT0FBTyxFQUFFLE9BQU87UUFDaEIsT0FBTyxFQUFFLGVBQWUsQ0FBQyxPQUFPO1FBQ2hDLE1BQU0sRUFBRSxNQUFNO1FBQ2QsUUFBUSxFQUFFLFFBQVE7UUFDbEIsS0FBSyxFQUFFLEtBQUs7UUFDWixTQUFTLEVBQU8sU0FBUztRQUN6QixrQkFBa0IsRUFBRSxlQUFlLENBQUMsa0JBQWtCO1FBQ3RELGNBQWMsRUFBRSxlQUFlLENBQUMsY0FBYztRQUM5QyxTQUFTLEVBQUUsZUFBZSxDQUFDLFNBQVM7UUFDcEMsR0FBRyxFQUFPLEdBQUc7UUFDYixLQUFLLEVBQUUsS0FBSztLQUNaLENBQUE7QUFDRixDQUFDIn0=