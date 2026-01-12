/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../base/common/event.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
var Constants;
(function (Constants) {
    /**
     * The minimum size of the prompt in which to assume the line is a command.
     */
    Constants[Constants["MinimumPromptLength"] = 2] = "MinimumPromptLength";
})(Constants || (Constants = {}));
/**
 * This capability guesses where commands are based on where the cursor was when enter was pressed.
 * It's very hit or miss but it's often correct and better than nothing.
 */
export class PartialCommandDetectionCapability extends DisposableStore {
    get commands() {
        return this._commands;
    }
    constructor(_terminal) {
        super();
        this._terminal = _terminal;
        this.type = 3 /* TerminalCapability.PartialCommandDetection */;
        this._commands = [];
        this._onCommandFinished = this.add(new Emitter());
        this.onCommandFinished = this._onCommandFinished.event;
        this.add(this._terminal.onData((e) => this._onData(e)));
        this.add(this._terminal.parser.registerCsiHandler({ final: 'J' }, (params) => {
            if (params.length >= 1 && (params[0] === 2 || params[0] === 3)) {
                this._clearCommandsInViewport();
            }
            // We don't want to override xterm.js' default behavior, just augment it
            return false;
        }));
    }
    _onData(data) {
        if (data === '\x0d') {
            this._onEnter();
        }
    }
    _onEnter() {
        if (!this._terminal) {
            return;
        }
        if (this._terminal.buffer.active.cursorX >= 2 /* Constants.MinimumPromptLength */) {
            const marker = this._terminal.registerMarker(0);
            if (marker) {
                this._commands.push(marker);
                this._onCommandFinished.fire(marker);
            }
        }
    }
    _clearCommandsInViewport() {
        // Find the number of commands on the tail end of the array that are within the viewport
        let count = 0;
        for (let i = this._commands.length - 1; i >= 0; i--) {
            if (this._commands[i].line < this._terminal.buffer.active.baseY) {
                break;
            }
            count++;
        }
        // Remove them
        this._commands.splice(this._commands.length - count, count);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFydGlhbENvbW1hbmREZXRlY3Rpb25DYXBhYmlsaXR5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS90ZXJtaW5hbC9jb21tb24vY2FwYWJpbGl0aWVzL3BhcnRpYWxDb21tYW5kRGV0ZWN0aW9uQ2FwYWJpbGl0eS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDMUQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBSXRFLElBQVcsU0FLVjtBQUxELFdBQVcsU0FBUztJQUNuQjs7T0FFRztJQUNILHVFQUF1QixDQUFBO0FBQ3hCLENBQUMsRUFMVSxTQUFTLEtBQVQsU0FBUyxRQUtuQjtBQUVEOzs7R0FHRztBQUNILE1BQU0sT0FBTyxpQ0FDWixTQUFRLGVBQWU7SUFPdkIsSUFBSSxRQUFRO1FBQ1gsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFBO0lBQ3RCLENBQUM7SUFLRCxZQUE2QixTQUFtQjtRQUMvQyxLQUFLLEVBQUUsQ0FBQTtRQURxQixjQUFTLEdBQVQsU0FBUyxDQUFVO1FBWHZDLFNBQUksc0RBQTZDO1FBRXpDLGNBQVMsR0FBYyxFQUFFLENBQUE7UUFNekIsdUJBQWtCLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLE9BQU8sRUFBVyxDQUFDLENBQUE7UUFDN0Qsc0JBQWlCLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQTtRQUl6RCxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUN2RCxJQUFJLENBQUMsR0FBRyxDQUNQLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLGtCQUFrQixDQUFDLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxFQUFFLENBQUMsTUFBTSxFQUFFLEVBQUU7WUFDbkUsSUFBSSxNQUFNLENBQUMsTUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQ2hFLElBQUksQ0FBQyx3QkFBd0IsRUFBRSxDQUFBO1lBQ2hDLENBQUM7WUFDRCx3RUFBd0U7WUFDeEUsT0FBTyxLQUFLLENBQUE7UUFDYixDQUFDLENBQUMsQ0FDRixDQUFBO0lBQ0YsQ0FBQztJQUVPLE9BQU8sQ0FBQyxJQUFZO1FBQzNCLElBQUksSUFBSSxLQUFLLE1BQU0sRUFBRSxDQUFDO1lBQ3JCLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQTtRQUNoQixDQUFDO0lBQ0YsQ0FBQztJQUVPLFFBQVE7UUFDZixJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ3JCLE9BQU07UUFDUCxDQUFDO1FBQ0QsSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsT0FBTyx5Q0FBaUMsRUFBRSxDQUFDO1lBQzNFLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQy9DLElBQUksTUFBTSxFQUFFLENBQUM7Z0JBQ1osSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7Z0JBQzNCLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDckMsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRU8sd0JBQXdCO1FBQy9CLHdGQUF3RjtRQUN4RixJQUFJLEtBQUssR0FBRyxDQUFDLENBQUE7UUFDYixLQUFLLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDckQsSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQ2pFLE1BQUs7WUFDTixDQUFDO1lBQ0QsS0FBSyxFQUFFLENBQUE7UUFDUixDQUFDO1FBQ0QsY0FBYztRQUNkLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFHLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQTtJQUM1RCxDQUFDO0NBQ0QifQ==