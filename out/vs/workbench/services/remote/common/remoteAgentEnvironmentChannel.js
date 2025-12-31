/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { URI } from '../../../../base/common/uri.js';
import { revive } from '../../../../base/common/marshalling.js';
export class RemoteExtensionEnvironmentChannelClient {
    static async getEnvironmentData(channel, remoteAuthority, profile) {
        const args = {
            remoteAuthority,
            profile,
        };
        const data = await channel.call('getEnvironmentData', args);
        return {
            pid: data.pid,
            connectionToken: data.connectionToken,
            appRoot: URI.revive(data.appRoot),
            settingsPath: URI.revive(data.settingsPath),
            logsPath: URI.revive(data.logsPath),
            extensionHostLogsPath: URI.revive(data.extensionHostLogsPath),
            globalStorageHome: URI.revive(data.globalStorageHome),
            workspaceStorageHome: URI.revive(data.workspaceStorageHome),
            localHistoryHome: URI.revive(data.localHistoryHome),
            userHome: URI.revive(data.userHome),
            os: data.os,
            arch: data.arch,
            marks: data.marks,
            useHostProxy: data.useHostProxy,
            profiles: revive(data.profiles),
            isUnsupportedGlibc: data.isUnsupportedGlibc,
        };
    }
    static async getExtensionHostExitInfo(channel, remoteAuthority, reconnectionToken) {
        const args = {
            remoteAuthority,
            reconnectionToken,
        };
        return channel.call('getExtensionHostExitInfo', args);
    }
    static getDiagnosticInfo(channel, options) {
        return channel.call('getDiagnosticInfo', options);
    }
    static updateTelemetryLevel(channel, telemetryLevel) {
        return channel.call('updateTelemetryLevel', { telemetryLevel });
    }
    static logTelemetry(channel, eventName, data) {
        return channel.call('logTelemetry', { eventName, data });
    }
    static flushTelemetry(channel) {
        return channel.call('flushTelemetry');
    }
    static async ping(channel) {
        await channel.call('ping');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlQWdlbnRFbnZpcm9ubWVudENoYW5uZWwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvcmVtb3RlL2NvbW1vbi9yZW1vdGVBZ2VudEVudmlyb25tZW50Q2hhbm5lbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUloRyxPQUFPLEVBQUUsR0FBRyxFQUF5QixNQUFNLGdDQUFnQyxDQUFBO0FBUzNFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQW1DL0QsTUFBTSxPQUFPLHVDQUF1QztJQUNuRCxNQUFNLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUM5QixPQUFpQixFQUNqQixlQUF1QixFQUN2QixPQUEyQjtRQUUzQixNQUFNLElBQUksR0FBaUM7WUFDMUMsZUFBZTtZQUNmLE9BQU87U0FDUCxDQUFBO1FBRUQsTUFBTSxJQUFJLEdBQUcsTUFBTSxPQUFPLENBQUMsSUFBSSxDQUE2QixvQkFBb0IsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUV2RixPQUFPO1lBQ04sR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHO1lBQ2IsZUFBZSxFQUFFLElBQUksQ0FBQyxlQUFlO1lBQ3JDLE9BQU8sRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUM7WUFDakMsWUFBWSxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQztZQUMzQyxRQUFRLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDO1lBQ25DLHFCQUFxQixFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDO1lBQzdELGlCQUFpQixFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDO1lBQ3JELG9CQUFvQixFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDO1lBQzNELGdCQUFnQixFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDO1lBQ25ELFFBQVEsRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUM7WUFDbkMsRUFBRSxFQUFFLElBQUksQ0FBQyxFQUFFO1lBQ1gsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO1lBQ2YsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLO1lBQ2pCLFlBQVksRUFBRSxJQUFJLENBQUMsWUFBWTtZQUMvQixRQUFRLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUM7WUFDL0Isa0JBQWtCLEVBQUUsSUFBSSxDQUFDLGtCQUFrQjtTQUMzQyxDQUFBO0lBQ0YsQ0FBQztJQUVELE1BQU0sQ0FBQyxLQUFLLENBQUMsd0JBQXdCLENBQ3BDLE9BQWlCLEVBQ2pCLGVBQXVCLEVBQ3ZCLGlCQUF5QjtRQUV6QixNQUFNLElBQUksR0FBdUM7WUFDaEQsZUFBZTtZQUNmLGlCQUFpQjtTQUNqQixDQUFBO1FBQ0QsT0FBTyxPQUFPLENBQUMsSUFBSSxDQUFnQywwQkFBMEIsRUFBRSxJQUFJLENBQUMsQ0FBQTtJQUNyRixDQUFDO0lBRUQsTUFBTSxDQUFDLGlCQUFpQixDQUN2QixPQUFpQixFQUNqQixPQUErQjtRQUUvQixPQUFPLE9BQU8sQ0FBQyxJQUFJLENBQWtCLG1CQUFtQixFQUFFLE9BQU8sQ0FBQyxDQUFBO0lBQ25FLENBQUM7SUFFRCxNQUFNLENBQUMsb0JBQW9CLENBQUMsT0FBaUIsRUFBRSxjQUE4QjtRQUM1RSxPQUFPLE9BQU8sQ0FBQyxJQUFJLENBQU8sc0JBQXNCLEVBQUUsRUFBRSxjQUFjLEVBQUUsQ0FBQyxDQUFBO0lBQ3RFLENBQUM7SUFFRCxNQUFNLENBQUMsWUFBWSxDQUFDLE9BQWlCLEVBQUUsU0FBaUIsRUFBRSxJQUFvQjtRQUM3RSxPQUFPLE9BQU8sQ0FBQyxJQUFJLENBQU8sY0FBYyxFQUFFLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7SUFDL0QsQ0FBQztJQUVELE1BQU0sQ0FBQyxjQUFjLENBQUMsT0FBaUI7UUFDdEMsT0FBTyxPQUFPLENBQUMsSUFBSSxDQUFPLGdCQUFnQixDQUFDLENBQUE7SUFDNUMsQ0FBQztJQUVELE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE9BQWlCO1FBQ2xDLE1BQU0sT0FBTyxDQUFDLElBQUksQ0FBTyxNQUFNLENBQUMsQ0FBQTtJQUNqQyxDQUFDO0NBQ0QifQ==