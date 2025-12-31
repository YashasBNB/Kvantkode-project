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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RydWN0dXJlZExvZ2dlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2lubGluZUNvbXBsZXRpb25zL2Jyb3dzZXIvc3RydWN0dXJlZExvZ2dlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFBZSxtQkFBbUIsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ3hGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNsRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQVl6Rjs7R0FFRztBQUNILE1BQU0sVUFBVSx3QkFBd0IsQ0FBZ0MsS0FBUTtJQUMvRSxPQUFPLEtBQUssQ0FBQyxRQUFRLEdBQUcsTUFBTSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxHQUFHLEtBQUssRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQTtBQUNuRixDQUFDO0FBRU0sSUFBTSxnQkFBZ0Isd0JBQXRCLE1BQU0sZ0JBQWdELFNBQVEsVUFBVTtJQUN2RSxNQUFNLENBQUMsSUFBSTtRQUNqQixPQUFPLElBQWtDLENBQUE7SUFDMUMsQ0FBQztJQUtELFlBQ2tCLFdBQW1CLEVBQ0Msa0JBQXNDLEVBQ3pDLGVBQWdDO1FBRWxFLEtBQUssRUFBRSxDQUFBO1FBSlUsZ0JBQVcsR0FBWCxXQUFXLENBQVE7UUFDQyx1QkFBa0IsR0FBbEIsa0JBQWtCLENBQW9CO1FBQ3pDLG9CQUFlLEdBQWYsZUFBZSxDQUFpQjtRQUdsRSxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsb0JBQW9CLENBQzNDLElBQUksQ0FBQyxXQUFXLEVBQ2hCLElBQUksQ0FBQyxrQkFBa0IsQ0FDdkIsQ0FBQyw2QkFBNkIsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDNUMsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEtBQUssU0FBUyxDQUFDLENBQUE7SUFDbkUsQ0FBQztJQUVNLEdBQUcsQ0FBQyxJQUFPO1FBQ2pCLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQTtRQUM3QyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDaEIsT0FBTyxLQUFLLENBQUE7UUFDYixDQUFDO1FBQ0QsSUFBSSxDQUFDLGVBQWUsQ0FBQyxjQUFjLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3BELE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztDQUNELENBQUE7QUE3QlksZ0JBQWdCO0lBVTFCLFdBQUEsa0JBQWtCLENBQUE7SUFDbEIsV0FBQSxlQUFlLENBQUE7R0FYTCxnQkFBZ0IsQ0E2QjVCOztBQUVELFNBQVMsb0JBQW9CLENBQzVCLEdBQVcsRUFDWCxpQkFBcUM7SUFFckMsT0FBTyxtQkFBbUIsQ0FBQyxpQkFBaUIsQ0FBQyxrQkFBa0IsRUFBRSxHQUFHLEVBQUUsQ0FDckUsaUJBQWlCLENBQUMsa0JBQWtCLENBQUksR0FBRyxDQUFDLENBQzVDLENBQUE7QUFDRixDQUFDIn0=