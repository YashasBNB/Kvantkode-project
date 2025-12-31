/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class LanguageDetectionWorkerHost {
    static { this.CHANNEL_NAME = 'languageDetectionWorkerHost'; }
    static getChannel(workerServer) {
        return workerServer.getChannel(LanguageDetectionWorkerHost.CHANNEL_NAME);
    }
    static setChannel(workerClient, obj) {
        workerClient.setChannel(LanguageDetectionWorkerHost.CHANNEL_NAME, obj);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VEZXRlY3Rpb25Xb3JrZXIucHJvdG9jb2wuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvbGFuZ3VhZ2VEZXRlY3Rpb24vYnJvd3Nlci9sYW5ndWFnZURldGVjdGlvbldvcmtlci5wcm90b2NvbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUloRyxNQUFNLE9BQWdCLDJCQUEyQjthQUNsQyxpQkFBWSxHQUFHLDZCQUE2QixDQUFBO0lBQ25ELE1BQU0sQ0FBQyxVQUFVLENBQUMsWUFBOEI7UUFDdEQsT0FBTyxZQUFZLENBQUMsVUFBVSxDQUM3QiwyQkFBMkIsQ0FBQyxZQUFZLENBQ3hDLENBQUE7SUFDRixDQUFDO0lBQ00sTUFBTSxDQUFDLFVBQVUsQ0FDdkIsWUFBbUMsRUFDbkMsR0FBZ0M7UUFFaEMsWUFBWSxDQUFDLFVBQVUsQ0FDdEIsMkJBQTJCLENBQUMsWUFBWSxFQUN4QyxHQUFHLENBQ0gsQ0FBQTtJQUNGLENBQUMifQ==