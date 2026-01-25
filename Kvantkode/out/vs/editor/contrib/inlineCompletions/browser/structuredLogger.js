/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var StructuredLogger_1;
import { Disposable } from '../../../../base/common/lifecycle.js';
import { observableFromEvent } from '../../../../base/common/observable.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
/**
 * The sourceLabel must not contain '@'!
 */
export function formatRecordableLogEntry(entry) {
    return entry.sourceId + ' @@ ' + JSON.stringify({ ...entry, sourceId: undefined });
}
let StructuredLogger = StructuredLogger_1 = class StructuredLogger extends Disposable {
    static cast() {
        return this;
    }
    constructor(_contextKey, _contextKeyService, _commandService) {
        super();
        this._contextKey = _contextKey;
        this._contextKeyService = _contextKeyService;
        this._commandService = _commandService;
        this._contextKeyValue = observableContextKey(this._contextKey, this._contextKeyService).recomputeInitiallyAndOnChange(this._store);
        this.isEnabled = this._contextKeyValue.map((v) => v !== undefined);
    }
    log(data) {
        const commandId = this._contextKeyValue.get();
        if (!commandId) {
            return false;
        }
        this._commandService.executeCommand(commandId, data);
        return true;
    }
};
StructuredLogger = StructuredLogger_1 = __decorate([
    __param(1, IContextKeyService),
    __param(2, ICommandService)
], StructuredLogger);
export { StructuredLogger };
function observableContextKey(key, contextKeyService) {
    return observableFromEvent(contextKeyService.onDidChangeContext, () => contextKeyService.getContextKeyValue(key));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RydWN0dXJlZExvZ2dlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvaW5saW5lQ29tcGxldGlvbnMvYnJvd3Nlci9zdHJ1Y3R1cmVkTG9nZ2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUFlLG1CQUFtQixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDeEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBWXpGOztHQUVHO0FBQ0gsTUFBTSxVQUFVLHdCQUF3QixDQUFnQyxLQUFRO0lBQy9FLE9BQU8sS0FBSyxDQUFDLFFBQVEsR0FBRyxNQUFNLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLEdBQUcsS0FBSyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFBO0FBQ25GLENBQUM7QUFFTSxJQUFNLGdCQUFnQix3QkFBdEIsTUFBTSxnQkFBZ0QsU0FBUSxVQUFVO0lBQ3ZFLE1BQU0sQ0FBQyxJQUFJO1FBQ2pCLE9BQU8sSUFBa0MsQ0FBQTtJQUMxQyxDQUFDO0lBS0QsWUFDa0IsV0FBbUIsRUFDQyxrQkFBc0MsRUFDekMsZUFBZ0M7UUFFbEUsS0FBSyxFQUFFLENBQUE7UUFKVSxnQkFBVyxHQUFYLFdBQVcsQ0FBUTtRQUNDLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBb0I7UUFDekMsb0JBQWUsR0FBZixlQUFlLENBQWlCO1FBR2xFLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxvQkFBb0IsQ0FDM0MsSUFBSSxDQUFDLFdBQVcsRUFDaEIsSUFBSSxDQUFDLGtCQUFrQixDQUN2QixDQUFDLDZCQUE2QixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUM1QyxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsS0FBSyxTQUFTLENBQUMsQ0FBQTtJQUNuRSxDQUFDO0lBRU0sR0FBRyxDQUFDLElBQU87UUFDakIsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsRUFBRSxDQUFBO1FBQzdDLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNoQixPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFDRCxJQUFJLENBQUMsZUFBZSxDQUFDLGNBQWMsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDcEQsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0NBQ0QsQ0FBQTtBQTdCWSxnQkFBZ0I7SUFVMUIsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLGVBQWUsQ0FBQTtHQVhMLGdCQUFnQixDQTZCNUI7O0FBRUQsU0FBUyxvQkFBb0IsQ0FDNUIsR0FBVyxFQUNYLGlCQUFxQztJQUVyQyxPQUFPLG1CQUFtQixDQUFDLGlCQUFpQixDQUFDLGtCQUFrQixFQUFFLEdBQUcsRUFBRSxDQUNyRSxpQkFBaUIsQ0FBQyxrQkFBa0IsQ0FBSSxHQUFHLENBQUMsQ0FDNUMsQ0FBQTtBQUNGLENBQUMifQ==