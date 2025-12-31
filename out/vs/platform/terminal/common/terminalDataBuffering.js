/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class TerminalDataBufferer {
    constructor(_callback) {
        this._callback = _callback;
        this._terminalBufferMap = new Map();
    }
    dispose() {
        for (const buffer of this._terminalBufferMap.values()) {
            buffer.dispose();
        }
    }
    startBuffering(id, event, throttleBy = 5) {
        const disposable = event((e) => {
            const data = typeof e === 'string' ? e : e.data;
            let buffer = this._terminalBufferMap.get(id);
            if (buffer) {
                buffer.data.push(data);
                return;
            }
            const timeoutId = setTimeout(() => this.flushBuffer(id), throttleBy);
            buffer = {
                data: [data],
                timeoutId: timeoutId,
                dispose: () => {
                    clearTimeout(timeoutId);
                    this.flushBuffer(id);
                    disposable.dispose();
                },
            };
            this._terminalBufferMap.set(id, buffer);
        });
        return disposable;
    }
    stopBuffering(id) {
        const buffer = this._terminalBufferMap.get(id);
        buffer?.dispose();
    }
    flushBuffer(id) {
        const buffer = this._terminalBufferMap.get(id);
        if (buffer) {
            this._terminalBufferMap.delete(id);
            this._callback(id, buffer.data.join(''));
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxEYXRhQnVmZmVyaW5nLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdGVybWluYWwvY29tbW9uL3Rlcm1pbmFsRGF0YUJ1ZmZlcmluZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQVdoRyxNQUFNLE9BQU8sb0JBQW9CO0lBR2hDLFlBQTZCLFNBQTZDO1FBQTdDLGNBQVMsR0FBVCxTQUFTLENBQW9DO1FBRnpELHVCQUFrQixHQUFHLElBQUksR0FBRyxFQUE4QixDQUFBO0lBRUUsQ0FBQztJQUU5RSxPQUFPO1FBQ04sS0FBSyxNQUFNLE1BQU0sSUFBSSxJQUFJLENBQUMsa0JBQWtCLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQztZQUN2RCxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDakIsQ0FBQztJQUNGLENBQUM7SUFFRCxjQUFjLENBQ2IsRUFBVSxFQUNWLEtBQXdDLEVBQ3hDLGFBQXFCLENBQUM7UUFFdEIsTUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBNkIsRUFBRSxFQUFFO1lBQzFELE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFBO1lBQy9DLElBQUksTUFBTSxHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUE7WUFDNUMsSUFBSSxNQUFNLEVBQUUsQ0FBQztnQkFDWixNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtnQkFDdEIsT0FBTTtZQUNQLENBQUM7WUFFRCxNQUFNLFNBQVMsR0FBRyxVQUFVLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQTtZQUNwRSxNQUFNLEdBQUc7Z0JBQ1IsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDO2dCQUNaLFNBQVMsRUFBRSxTQUFTO2dCQUNwQixPQUFPLEVBQUUsR0FBRyxFQUFFO29CQUNiLFlBQVksQ0FBQyxTQUFTLENBQUMsQ0FBQTtvQkFDdkIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsQ0FBQTtvQkFDcEIsVUFBVSxDQUFDLE9BQU8sRUFBRSxDQUFBO2dCQUNyQixDQUFDO2FBQ0QsQ0FBQTtZQUNELElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQ3hDLENBQUMsQ0FBQyxDQUFBO1FBQ0YsT0FBTyxVQUFVLENBQUE7SUFDbEIsQ0FBQztJQUVELGFBQWEsQ0FBQyxFQUFVO1FBQ3ZCLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDOUMsTUFBTSxFQUFFLE9BQU8sRUFBRSxDQUFBO0lBQ2xCLENBQUM7SUFFRCxXQUFXLENBQUMsRUFBVTtRQUNyQixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQzlDLElBQUksTUFBTSxFQUFFLENBQUM7WUFDWixJQUFJLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1lBQ2xDLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDekMsQ0FBQztJQUNGLENBQUM7Q0FDRCJ9