/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as platform from '../../base/common/platform.js';
import * as performance from '../../base/common/performance.js';
import { URI } from '../../base/common/uri.js';
import { createURITransformer } from '../../workbench/api/node/uriTransformer.js';
import { transformOutgoingURIs } from '../../base/common/uriIpc.js';
import { listProcesses } from '../../base/node/ps.js';
import { getMachineInfo, collectWorkspaceStats, } from '../../platform/diagnostics/node/diagnosticsService.js';
import { basename } from '../../base/common/path.js';
import { joinPath } from '../../base/common/resources.js';
export class RemoteAgentEnvironmentChannel {
    static { this._namePool = 1; }
    constructor(_connectionToken, _environmentService, _userDataProfilesService, _extensionHostStatusService) {
        this._connectionToken = _connectionToken;
        this._environmentService = _environmentService;
        this._userDataProfilesService = _userDataProfilesService;
        this._extensionHostStatusService = _extensionHostStatusService;
    }
    async call(_, command, arg) {
        switch (command) {
            case 'getEnvironmentData': {
                const args = arg;
                const uriTransformer = createURITransformer(args.remoteAuthority);
                let environmentData = await this._getEnvironmentData(args.profile);
                environmentData = transformOutgoingURIs(environmentData, uriTransformer);
                return environmentData;
            }
            case 'getExtensionHostExitInfo': {
                const args = arg;
                return this._extensionHostStatusService.getExitInfo(args.reconnectionToken);
            }
            case 'getDiagnosticInfo': {
                const options = arg;
                const diagnosticInfo = {
                    machineInfo: getMachineInfo(),
                };
                const processesPromise = options.includeProcesses
                    ? listProcesses(process.pid)
                    : Promise.resolve();
                let workspaceMetadataPromises = [];
                const workspaceMetadata = {};
                if (options.folders) {
                    // only incoming paths are transformed, so remote authority is unneeded.
                    const uriTransformer = createURITransformer('');
                    const folderPaths = options.folders
                        .map((folder) => URI.revive(uriTransformer.transformIncoming(folder)))
                        .filter((uri) => uri.scheme === 'file');
                    workspaceMetadataPromises = folderPaths.map((folder) => {
                        return collectWorkspaceStats(folder.fsPath, ['node_modules', '.git']).then((stats) => {
                            workspaceMetadata[basename(folder.fsPath)] = stats;
                        });
                    });
                }
                return Promise.all([processesPromise, ...workspaceMetadataPromises]).then(([processes, _]) => {
                    diagnosticInfo.processes = processes || undefined;
                    diagnosticInfo.workspaceMetadata = options.folders ? workspaceMetadata : undefined;
                    return diagnosticInfo;
                });
            }
        }
        throw new Error(`IPC Command ${command} not found`);
    }
    listen(_, event, arg) {
        throw new Error('Not supported');
    }
    async _getEnvironmentData(profile) {
        if (profile && !this._userDataProfilesService.profiles.some((p) => p.id === profile)) {
            await this._userDataProfilesService.createProfile(profile, profile);
        }
        let isUnsupportedGlibc = false;
        if (process.platform === 'linux') {
            const glibcVersion = process.glibcVersion;
            const minorVersion = glibcVersion ? parseInt(glibcVersion.split('.')[1]) : 28;
            isUnsupportedGlibc = minorVersion <= 27 || !!process.env['VSCODE_SERVER_CUSTOM_GLIBC_LINKER'];
        }
        return {
            pid: process.pid,
            connectionToken: this._connectionToken.type !== 0 /* ServerConnectionTokenType.None */
                ? this._connectionToken.value
                : '',
            appRoot: URI.file(this._environmentService.appRoot),
            settingsPath: this._environmentService.machineSettingsResource,
            logsPath: this._environmentService.logsHome,
            extensionHostLogsPath: joinPath(this._environmentService.logsHome, `exthost${RemoteAgentEnvironmentChannel._namePool++}`),
            globalStorageHome: this._userDataProfilesService.defaultProfile.globalStorageHome,
            workspaceStorageHome: this._environmentService.workspaceStorageHome,
            localHistoryHome: this._environmentService.localHistoryHome,
            userHome: this._environmentService.userHome,
            os: platform.OS,
            arch: process.arch,
            marks: performance.getMarks(),
            useHostProxy: !!this._environmentService.args['use-host-proxy'],
            profiles: {
                home: this._userDataProfilesService.profilesHome,
                all: [...this._userDataProfilesService.profiles].map((profile) => ({ ...profile })),
            },
            isUnsupportedGlibc,
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlQWdlbnRFbnZpcm9ubWVudEltcGwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9zZXJ2ZXIvbm9kZS9yZW1vdGVBZ2VudEVudmlyb25tZW50SW1wbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEtBQUssUUFBUSxNQUFNLCtCQUErQixDQUFBO0FBQ3pELE9BQU8sS0FBSyxXQUFXLE1BQU0sa0NBQWtDLENBQUE7QUFDL0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQzlDLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBUWpGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ25FLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUNyRCxPQUFPLEVBQ04sY0FBYyxFQUNkLHFCQUFxQixHQUNyQixNQUFNLHVEQUF1RCxDQUFBO0FBSzlELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUtwRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFFekQsTUFBTSxPQUFPLDZCQUE2QjthQUMxQixjQUFTLEdBQUcsQ0FBQyxDQUFBO0lBRTVCLFlBQ2tCLGdCQUF1QyxFQUN2QyxtQkFBOEMsRUFDOUMsd0JBQWtELEVBQ2xELDJCQUF3RDtRQUh4RCxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQXVCO1FBQ3ZDLHdCQUFtQixHQUFuQixtQkFBbUIsQ0FBMkI7UUFDOUMsNkJBQXdCLEdBQXhCLHdCQUF3QixDQUEwQjtRQUNsRCxnQ0FBMkIsR0FBM0IsMkJBQTJCLENBQTZCO0lBQ3ZFLENBQUM7SUFFSixLQUFLLENBQUMsSUFBSSxDQUFDLENBQU0sRUFBRSxPQUFlLEVBQUUsR0FBUztR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