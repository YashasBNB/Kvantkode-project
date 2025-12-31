/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var Constants;
(function (Constants) {
    Constants[Constants["MaxRecorderDataSize"] = 10485760] = "MaxRecorderDataSize";
})(Constants || (Constants = {}));
export class TerminalRecorder {
    constructor(cols, rows) {
        this._totalDataLength = 0;
        this._entries = [{ cols, rows, data: [] }];
    }
    handleResize(cols, rows) {
        if (this._entries.length > 0) {
            const lastEntry = this._entries[this._entries.length - 1];
            if (lastEntry.data.length === 0) {
                // last entry is just a resize, so just remove it
                this._entries.pop();
            }
        }
        if (this._entries.length > 0) {
            const lastEntry = this._entries[this._entries.length - 1];
            if (lastEntry.cols === cols && lastEntry.rows === rows) {
                // nothing changed
                return;
            }
            if (lastEntry.cols === 0 && lastEntry.rows === 0) {
                // we finally received a good size!
                lastEntry.cols = cols;
                lastEntry.rows = rows;
                return;
            }
        }
        this._entries.push({ cols, rows, data: [] });
    }
    handleData(data) {
        const lastEntry = this._entries[this._entries.length - 1];
        lastEntry.data.push(data);
        this._totalDataLength += data.length;
        while (this._totalDataLength > 10485760 /* Constants.MaxRecorderDataSize */) {
            const firstEntry = this._entries[0];
            const remainingToDelete = this._totalDataLength - 10485760 /* Constants.MaxRecorderDataSize */;
            if (remainingToDelete >= firstEntry.data[0].length) {
                // the first data piece must be deleted
                this._totalDataLength -= firstEntry.data[0].length;
                firstEntry.data.shift();
                if (firstEntry.data.length === 0) {
                    // the first entry must be deleted
                    this._entries.shift();
                }
            }
            else {
                // the first data piece must be partially deleted
                firstEntry.data[0] = firstEntry.data[0].substr(remainingToDelete);
                this._totalDataLength -= remainingToDelete;
            }
        }
    }
    generateReplayEventSync() {
        // normalize entries to one element per data array
        this._entries.forEach((entry) => {
            if (entry.data.length > 0) {
                entry.data = [entry.data.join('')];
            }
        });
        return {
            events: this._entries.map((entry) => ({
                cols: entry.cols,
                rows: entry.rows,
                data: entry.data[0] ?? '',
            })),
            // No command restoration is needed when relaunching terminals
            commands: {
                isWindowsPty: false,
                hasRichCommandDetection: false,
                commands: [],
                promptInputModel: undefined,
            },
        };
    }
    async generateReplayEvent() {
        return this.generateReplayEventSync();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxSZWNvcmRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3Rlcm1pbmFsL2NvbW1vbi90ZXJtaW5hbFJlY29yZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBS2hHLElBQVcsU0FFVjtBQUZELFdBQVcsU0FBUztJQUNuQiw4RUFBc0MsQ0FBQTtBQUN2QyxDQUFDLEVBRlUsU0FBUyxLQUFULFNBQVMsUUFFbkI7QUFZRCxNQUFNLE9BQU8sZ0JBQWdCO0lBSTVCLFlBQVksSUFBWSxFQUFFLElBQVk7UUFGOUIscUJBQWdCLEdBQVcsQ0FBQyxDQUFBO1FBR25DLElBQUksQ0FBQyxRQUFRLEdBQUcsQ0FBQyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUE7SUFDM0MsQ0FBQztJQUVELFlBQVksQ0FBQyxJQUFZLEVBQUUsSUFBWTtRQUN0QyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQzlCLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUE7WUFDekQsSUFBSSxTQUFTLENBQUMsSUFBSSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDakMsaURBQWlEO2dCQUNqRCxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRSxDQUFBO1lBQ3BCLENBQUM7UUFDRixDQUFDO1FBRUQsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUM5QixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFBO1lBQ3pELElBQUksU0FBUyxDQUFDLElBQUksS0FBSyxJQUFJLElBQUksU0FBUyxDQUFDLElBQUksS0FBSyxJQUFJLEVBQUUsQ0FBQztnQkFDeEQsa0JBQWtCO2dCQUNsQixPQUFNO1lBQ1AsQ0FBQztZQUNELElBQUksU0FBUyxDQUFDLElBQUksS0FBSyxDQUFDLElBQUksU0FBUyxDQUFDLElBQUksS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDbEQsbUNBQW1DO2dCQUNuQyxTQUFTLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQTtnQkFDckIsU0FBUyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUE7Z0JBQ3JCLE9BQU07WUFDUCxDQUFDO1FBQ0YsQ0FBQztRQUVELElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQTtJQUM3QyxDQUFDO0lBRUQsVUFBVSxDQUFDLElBQVk7UUFDdEIsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUN6RCxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUV6QixJQUFJLENBQUMsZ0JBQWdCLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQTtRQUNwQyxPQUFPLElBQUksQ0FBQyxnQkFBZ0IsK0NBQWdDLEVBQUUsQ0FBQztZQUM5RCxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ25DLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDLGdCQUFnQiwrQ0FBZ0MsQ0FBQTtZQUMvRSxJQUFJLGlCQUFpQixJQUFJLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ3BELHVDQUF1QztnQkFDdkMsSUFBSSxDQUFDLGdCQUFnQixJQUFJLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFBO2dCQUNsRCxVQUFVLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFBO2dCQUN2QixJQUFJLFVBQVUsQ0FBQyxJQUFJLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO29CQUNsQyxrQ0FBa0M7b0JBQ2xDLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUE7Z0JBQ3RCLENBQUM7WUFDRixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsaURBQWlEO2dCQUNqRCxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLENBQUE7Z0JBQ2pFLElBQUksQ0FBQyxnQkFBZ0IsSUFBSSxpQkFBaUIsQ0FBQTtZQUMzQyxDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFRCx1QkFBdUI7UUFDdEIsa0RBQWtEO1FBQ2xELElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUU7WUFDL0IsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDM0IsS0FBSyxDQUFDLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDbkMsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFBO1FBQ0YsT0FBTztZQUNOLE1BQU0sRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDckMsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJO2dCQUNoQixJQUFJLEVBQUUsS0FBSyxDQUFDLElBQUk7Z0JBQ2hCLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUU7YUFDekIsQ0FBQyxDQUFDO1lBQ0gsOERBQThEO1lBQzlELFFBQVEsRUFBRTtnQkFDVCxZQUFZLEVBQUUsS0FBSztnQkFDbkIsdUJBQXVCLEVBQUUsS0FBSztnQkFDOUIsUUFBUSxFQUFFLEVBQUU7Z0JBQ1osZ0JBQWdCLEVBQUUsU0FBUzthQUMzQjtTQUNELENBQUE7SUFDRixDQUFDO0lBRUQsS0FBSyxDQUFDLG1CQUFtQjtRQUN4QixPQUFPLElBQUksQ0FBQyx1QkFBdUIsRUFBRSxDQUFBO0lBQ3RDLENBQUM7Q0FDRCJ9