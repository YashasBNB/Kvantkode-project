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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlQWdlbnRFbnZpcm9ubWVudEltcGwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3NlcnZlci9ub2RlL3JlbW90ZUFnZW50RW52aXJvbm1lbnRJbXBsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sS0FBSyxRQUFRLE1BQU0sK0JBQStCLENBQUE7QUFDekQsT0FBTyxLQUFLLFdBQVcsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDOUMsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFRakYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDbkUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQ3JELE9BQU8sRUFDTixjQUFjLEVBQ2QscUJBQXFCLEdBQ3JCLE1BQU0sdURBQXVELENBQUE7QUFLOUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBS3BELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUV6RCxNQUFNLE9BQU8sNkJBQTZCO2FBQzFCLGNBQVMsR0FBRyxDQUFDLENBQUE7SUFFNUIsWUFDa0IsZ0JBQXVDLEVBQ3ZDLG1CQUE4QyxFQUM5Qyx3QkFBa0QsRUFDbEQsMkJBQXdEO1FBSHhELHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBdUI7UUFDdkMsd0JBQW1CLEdBQW5CLG1CQUFtQixDQUEyQjtRQUM5Qyw2QkFBd0IsR0FBeEIsd0JBQXdCLENBQTBCO1FBQ2xELGdDQUEyQixHQUEzQiwyQkFBMkIsQ0FBNkI7SUFDdkUsQ0FBQztJQUVKLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBTSxFQUFFLE9BQWUsRUFBRSxH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