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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dE1hdGVXb3JrZXJIb3N0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdGV4dE1hdGUvYnJvd3Nlci9iYWNrZ3JvdW5kVG9rZW5pemF0aW9uL3dvcmtlci90ZXh0TWF0ZVdvcmtlckhvc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFTaEcsTUFBTSxPQUFnQixrQkFBa0I7YUFDekIsaUJBQVksR0FBRyxvQkFBb0IsQ0FBQTtJQUMxQyxNQUFNLENBQUMsVUFBVSxDQUFDLFlBQThCO1FBQ3RELE9BQU8sWUFBWSxDQUFDLFVBQVUsQ0FBcUIsa0JBQWtCLENBQUMsWUFBWSxDQUFDLENBQUE7SUFDcEYsQ0FBQztJQUNNLE1BQU0sQ0FBQyxVQUFVLENBQUMsWUFBbUMsRUFBRSxHQUF1QjtRQUNwRixZQUFZLENBQUMsVUFBVSxDQUFxQixrQkFBa0IsQ0FBQyxZQUFZLEVBQUUsR0FBRyxDQUFDLENBQUE7SUFDbEYsQ0FBQyJ9