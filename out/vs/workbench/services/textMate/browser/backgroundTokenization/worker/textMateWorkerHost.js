/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class TextMateWorkerHost {
    static { this.CHANNEL_NAME = 'textMateWorkerHost'; }
    static getChannel(workerServer) {
        return workerServer.getChannel(TextMateWorkerHost.CHANNEL_NAME);
    }
    static setChannel(workerClient, obj) {
        workerClient.setChannel(TextMateWorkerHost.CHANNEL_NAME, obj);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dE1hdGVXb3JrZXJIb3N0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3RleHRNYXRlL2Jyb3dzZXIvYmFja2dyb3VuZFRva2VuaXphdGlvbi93b3JrZXIvdGV4dE1hdGVXb3JrZXJIb3N0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBU2hHLE1BQU0sT0FBZ0Isa0JBQWtCO2FBQ3pCLGlCQUFZLEdBQUcsb0JBQW9CLENBQUE7SUFDMUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxZQUE4QjtRQUN0RCxPQUFPLFlBQVksQ0FBQyxVQUFVLENBQXFCLGtCQUFrQixDQUFDLFlBQVksQ0FBQyxDQUFBO0lBQ3BGLENBQUM7SUFDTSxNQUFNLENBQUMsVUFBVSxDQUFDLFlBQW1DLEVBQUUsR0FBdUI7UUFDcEYsWUFBWSxDQUFDLFVBQVUsQ0FBcUIsa0JBQWtCLENBQUMsWUFBWSxFQUFFLEdBQUcsQ0FBQyxDQUFBO0lBQ2xGLENBQUMifQ==