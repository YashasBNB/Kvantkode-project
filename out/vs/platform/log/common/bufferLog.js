/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { MutableDisposable } from '../../../base/common/lifecycle.js';
import { AbstractMessageLogger, DEFAULT_LOG_LEVEL, log } from './log.js';
export class BufferLogger extends AbstractMessageLogger {
    constructor(logLevel = DEFAULT_LOG_LEVEL) {
        super();
        this.buffer = [];
        this._logger = undefined;
        this._logLevelDisposable = this._register(new MutableDisposable());
        this.setLevel(logLevel);
    }
    set logger(logger) {
        this._logger = logger;
        this.setLevel(logger.getLevel());
        this._logLevelDisposable.value = logger.onDidChangeLogLevel(this.setLevel, this);
        for (const { level, message } of this.buffer) {
            log(logger, level, message);
        }
        this.buffer = [];
    }
    log(level, message) {
        if (this._logger) {
            log(this._logger, level, message);
        }
        else if (this.getLevel() <= level) {
            this.buffer.push({ level, message });
        }
    }
    dispose() {
        this._logger?.dispose();
        super.dispose();
    }
    flush() {
        this._logger?.flush();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVmZmVyTG9nLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9sb2cvY29tbW9uL2J1ZmZlckxvZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNyRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsaUJBQWlCLEVBQVcsR0FBRyxFQUFZLE1BQU0sVUFBVSxDQUFBO0FBTzNGLE1BQU0sT0FBTyxZQUFhLFNBQVEscUJBQXFCO0lBTXRELFlBQVksV0FBcUIsaUJBQWlCO1FBQ2pELEtBQUssRUFBRSxDQUFBO1FBTEEsV0FBTSxHQUFXLEVBQUUsQ0FBQTtRQUNuQixZQUFPLEdBQXdCLFNBQVMsQ0FBQTtRQUMvQix3QkFBbUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksaUJBQWlCLEVBQUUsQ0FBQyxDQUFBO1FBSTdFLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUE7SUFDeEIsQ0FBQztJQUVELElBQUksTUFBTSxDQUFDLE1BQWU7UUFDekIsSUFBSSxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUE7UUFDckIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQTtRQUNoQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsS0FBSyxHQUFHLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBRWhGLEtBQUssTUFBTSxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDOUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDNUIsQ0FBQztRQUVELElBQUksQ0FBQyxNQUFNLEdBQUcsRUFBRSxDQUFBO0lBQ2pCLENBQUM7SUFFUyxHQUFHLENBQUMsS0FBZSxFQUFFLE9BQWU7UUFDN0MsSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDbEIsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBQ2xDLENBQUM7YUFBTSxJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUUsSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUNyQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFBO1FBQ3JDLENBQUM7SUFDRixDQUFDO0lBRVEsT0FBTztRQUNmLElBQUksQ0FBQyxPQUFPLEVBQUUsT0FBTyxFQUFFLENBQUE7UUFDdkIsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ2hCLENBQUM7SUFFUSxLQUFLO1FBQ2IsSUFBSSxDQUFDLE9BQU8sRUFBRSxLQUFLLEVBQUUsQ0FBQTtJQUN0QixDQUFDO0NBQ0QifQ==