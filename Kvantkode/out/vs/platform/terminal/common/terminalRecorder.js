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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxSZWNvcmRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdGVybWluYWwvY29tbW9uL3Rlcm1pbmFsUmVjb3JkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFLaEcsSUFBVyxTQUVWO0FBRkQsV0FBVyxTQUFTO0lBQ25CLDhFQUFzQyxDQUFBO0FBQ3ZDLENBQUMsRUFGVSxTQUFTLEtBQVQsU0FBUyxRQUVuQjtBQVlELE1BQU0sT0FBTyxnQkFBZ0I7SUFJNUIsWUFBWSxJQUFZLEVBQUUsSUFBWTtRQUY5QixxQkFBZ0IsR0FBVyxDQUFDLENBQUE7UUFHbkMsSUFBSSxDQUFDLFFBQVEsR0FBRyxDQUFDLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQTtJQUMzQyxDQUFDO0lBRUQsWUFBWSxDQUFDLElBQVksRUFBRSxJQUFZO1FBQ3RDLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDOUIsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQTtZQUN6RCxJQUFJLFNBQVMsQ0FBQyxJQUFJLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUNqQyxpREFBaUQ7Z0JBQ2pELElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFLENBQUE7WUFDcEIsQ0FBQztRQUNGLENBQUM7UUFFRCxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQzlCLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FB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