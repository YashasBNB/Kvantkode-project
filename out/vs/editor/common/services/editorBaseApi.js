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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yQmFzZUFwaS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vc2VydmljZXMvZWRpdG9yQmFzZUFwaS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDdkQsT0FBTyxFQUFFLFFBQVEsRUFBeUIsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNsRixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDakQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBQzlDLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQTtBQUN4QyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0JBQXNCLENBQUE7QUFDaEQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBQ3ZDLE9BQU8sS0FBSyxlQUFlLE1BQU0sa0NBQWtDLENBQUE7QUFFbkUsTUFBTSxPQUFPLE1BQU07YUFDSyxZQUFPLGtDQUE4QjthQUNyQyxVQUFLLGdDQUE0QjthQUNqQyxRQUFHLDZCQUEwQjthQUM3QixZQUFPLGlDQUE4QjtJQUVyRCxNQUFNLENBQUMsS0FBSyxDQUFDLFNBQWlCLEVBQUUsVUFBa0I7UUFDeEQsT0FBTyxRQUFRLENBQUMsU0FBUyxFQUFFLFVBQVUsQ0FBQyxDQUFBO0lBQ3ZDLENBQUM7O0FBR0YsTUFBTSxVQUFVLG1CQUFtQjtJQUNsQyxPQUFPO1FBQ04sTUFBTSxFQUFFLFNBQVUsRUFBRSxtQ0FBbUM7UUFDdkQsU0FBUyxFQUFFLFNBQVUsRUFBRSxtQ0FBbUM7UUFDMUQsdUJBQXVCLEVBQUUsdUJBQXVCO1FBQ2hELE9BQU8sRUFBRSxPQUFPO1FBQ2hCLE9BQU8sRUFBRSxlQUFlLENBQUMsT0FBTztRQUNoQyxNQUFNLEVBQUUsTUFBTTtRQUNkLFFBQVEsRUFBRSxRQUFRO1FBQ2xCLEtBQUssRUFBRSxLQUFLO1FBQ1osU0FBUyxFQUFPLFNBQVM7UUFDekIsa0JBQWtCLEVBQUUsZUFBZSxDQUFDLGtCQUFrQjtRQUN0RCxjQUFjLEVBQUUsZUFBZSxDQUFDLGNBQWM7UUFDOUMsU0FBUyxFQUFFLGVBQWUsQ0FBQyxTQUFTO1FBQ3BDLEdBQUcsRUFBTyxHQUFHO1FBQ2IsS0FBSyxFQUFFLEtBQUs7S0FDWixDQUFBO0FBQ0YsQ0FBQyJ9