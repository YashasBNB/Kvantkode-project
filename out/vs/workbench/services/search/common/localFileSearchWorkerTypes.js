/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class LocalFileSearchWorkerHost {
    static { this.CHANNEL_NAME = 'localFileSearchWorkerHost'; }
    static getChannel(workerServer) {
        return workerServer.getChannel(LocalFileSearchWorkerHost.CHANNEL_NAME);
    }
    static setChannel(workerClient, obj) {
        workerClient.setChannel(LocalFileSearchWorkerHost.CHANNEL_NAME, obj);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYWxGaWxlU2VhcmNoV29ya2VyVHlwZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvc2VhcmNoL2NvbW1vbi9sb2NhbEZpbGVTZWFyY2hXb3JrZXJUeXBlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQTZEaEcsTUFBTSxPQUFnQix5QkFBeUI7YUFDaEMsaUJBQVksR0FBRywyQkFBMkIsQ0FBQTtJQUNqRCxNQUFNLENBQUMsVUFBVSxDQUFDLFlBQThCO1FBQ3RELE9BQU8sWUFBWSxDQUFDLFVBQVUsQ0FDN0IseUJBQXlCLENBQUMsWUFBWSxDQUN0QyxDQUFBO0lBQ0YsQ0FBQztJQUNNLE1BQU0sQ0FBQyxVQUFVLENBQ3ZCLFlBQW1DLEVBQ25DLEdBQThCO1FBRTlCLFlBQVksQ0FBQyxVQUFVLENBQTRCLHlCQUF5QixDQUFDLFlBQVksRUFBRSxHQUFHLENBQUMsQ0FBQTtJQUNoRyxDQUFDIn0=