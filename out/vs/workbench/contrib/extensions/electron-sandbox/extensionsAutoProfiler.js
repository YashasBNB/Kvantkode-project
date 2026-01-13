/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { timeout } from '../../../../base/common/async.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { Schemas } from '../../../../base/common/network.js';
import { joinPath } from '../../../../base/common/resources.js';
import { TernarySearchTree } from '../../../../base/common/ternarySearchTree.js';
import { URI } from '../../../../base/common/uri.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { localize } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ExtensionIdentifier, ExtensionIdentifierSet, } from '../../../../platform/extensions/common/extensions.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { INotificationService, NotificationPriority, Severity, } from '../../../../platform/notification/common/notification.js';
import { IProfileAnalysisWorkerService } from '../../../../platform/profiling/electron-sandbox/profileAnalysisWorkerService.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { RuntimeExtensionsInput } from '../common/runtimeExtensionsInput.js';
import { createSlowExtensionAction } from './extensionsSlowActions.js';
import { IExtensionHostProfileService } from './runtimeExtensionsEditor.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { INativeWorkbenchEnvironmentService } from '../../../services/environment/electron-sandbox/environmentService.js';
import { IExtensionService, } from '../../../services/extensions/common/extensions.js';
import { ExtensionHostProfiler } from '../../../services/extensions/electron-sandbox/extensionHostProfiler.js';
import { ITimerService } from '../../../services/timer/browser/timerService.js';
let ExtensionsAutoProfiler = class ExtensionsAutoProfiler {
    constructor(_extensionService, _extensionProfileService, _telemetryService, _logService, _notificationService, _editorService, _instantiationService, _environmentServie, _profileAnalysisService, _configService, _fileService, timerService) {
        this._extensionService = _extensionService;
        this._extensionProfileService = _extensionProfileService;
        this._telemetryService = _telemetryService;
        this._logService = _logService;
        this._notificationService = _notificationService;
        this._editorService = _editorService;
        this._instantiationService = _instantiationService;
        this._environmentServie = _environmentServie;
        this._profileAnalysisService = _profileAnalysisService;
        this._configService = _configService;
        this._fileService = _fileService;
        this._blame = new ExtensionIdentifierSet();
        this._perfBaseline = -1;
        timerService.perfBaseline.then((value) => {
            if (value < 0) {
                return; // too slow for profiling
            }
            this._perfBaseline = value;
            this._unresponsiveListener = _extensionService.onDidChangeResponsiveChange(this._onDidChangeResponsiveChange, this);
        });
    }
    dispose() {
        this._unresponsiveListener?.dispose();
        this._session?.dispose(true);
    }
    async _onDidChangeResponsiveChange(event) {
        if (event.extensionHostKind !== 1 /* ExtensionHostKind.LocalProcess */) {
            return;
        }
        const listener = await event.getInspectListener(true);
        if (!listener) {
            return;
        }
        if (event.isResponsive && this._session) {
            // stop profiling when responsive again
            this._session.cancel();
            this._logService.info('UNRESPONSIVE extension host: received responsive event and cancelling profiling session');
        }
        else if (!event.isResponsive && !this._session) {
            // start profiling if not yet profiling
            const cts = new CancellationTokenSource();
            this._session = cts;
            let session;
            try {
                session = await this._instantiationService
                    .createInstance(ExtensionHostProfiler, listener.host, listener.port)
                    .start();
            }
            catch (err) {
                this._session = undefined;
                // fail silent as this is often
                // caused by another party being
                // connected already
                return;
            }
            this._logService.info('UNRESPONSIVE extension host: starting to profile NOW');
            // wait 5 seconds or until responsive again
            try {
                await timeout(5e3, cts.token);
            }
            catch {
                // can throw cancellation error. that is
                // OK, we stop profiling and analyse the
                // profile anyways
            }
            try {
                // stop profiling and analyse results
                this._processCpuProfile(await session.stop());
            }
            catch (err) {
                onUnexpectedError(err);
            }
            finally {
                this._session = undefined;
            }
        }
    }
    async _processCpuProfile(profile) {
        // get all extensions
        await this._extensionService.whenInstalledExtensionsRegistered();
        // send heavy samples iff enabled
        if (this._configService.getValue('application.experimental.rendererProfiling')) {
            const searchTree = TernarySearchTree.forUris();
            searchTree.fill(this._extensionService.extensions.map((e) => [e.extensionLocation, e]));
            await this._profileAnalysisService.analyseBottomUp(profile.data, (url) => searchTree.findSubstr(URI.parse(url))?.identifier.value ?? '<<not-found>>', this._perfBaseline, false);
        }
        // analyse profile by extension-category
        const categories = this._extensionService.extensions
            .filter((e) => e.extensionLocation.scheme === Schemas.file)
            .map((e) => [e.extensionLocation, ExtensionIdentifier.toKey(e.identifier)]);
        const data = await this._profileAnalysisService.analyseByLocation(profile.data, categories);
        //
        let overall = 0;
        let top = '';
        let topAggregated = -1;
        for (const [category, aggregated] of data) {
            overall += aggregated;
            if (aggregated > topAggregated) {
                topAggregated = aggregated;
                top = category;
            }
        }
        const topPercentage = topAggregated / (overall / 100);
        // associate extensions to profile node
        const extension = await this._extensionService.getExtension(top);
        if (!extension) {
            // not an extension => idle, gc, self?
            return;
        }
        const profilingSessionId = generateUuid();
        // print message to log
        const path = joinPath(this._environmentServie.tmpDir, `exthost-${Math.random().toString(16).slice(2, 8)}.cpuprofile`);
        await this._fileService.writeFile(path, VSBuffer.fromString(JSON.stringify(profile.data)));
        this._logService.warn(`UNRESPONSIVE extension host: '${top}' took ${topPercentage}% of ${topAggregated / 1e3}ms, saved PROFILE here: '${path}'`);
        this._telemetryService.publicLog2('exthostunresponsive', {
            profilingSessionId,
            duration: overall,
            data: data.map((tuple) => tuple[0]).flat(),
            id: ExtensionIdentifier.toKey(extension.identifier),
        });
        // add to running extensions view
        this._extensionProfileService.setUnresponsiveProfile(extension.identifier, profile);
        // prompt: when really slow/greedy
        if (!(topPercentage >= 95 && topAggregated >= 5e6)) {
            return;
        }
        const action = await this._instantiationService.invokeFunction(createSlowExtensionAction, extension, profile);
        if (!action) {
            // cannot report issues against this extension...
            return;
        }
        // only blame once per extension, don't blame too often
        if (this._blame.has(extension.identifier) || this._blame.size >= 3) {
            return;
        }
        this._blame.add(extension.identifier);
        // user-facing message when very bad...
        this._notificationService.prompt(Severity.Warning, localize('unresponsive-exthost', "The extension '{0}' took a very long time to complete its last operation and it has prevented other extensions from running.", extension.displayName || extension.name), [
            {
                label: localize('show', 'Show Extensions'),
                run: () => this._editorService.openEditor(RuntimeExtensionsInput.instance, { pinned: true }),
            },
            action,
        ], { priority: NotificationPriority.SILENT });
    }
};
ExtensionsAutoProfiler = __decorate([
    __param(0, IExtensionService),
    __param(1, IExtensionHostProfileService),
    __param(2, ITelemetryService),
    __param(3, ILogService),
    __param(4, INotificationService),
    __param(5, IEditorService),
    __param(6, IInstantiationService),
    __param(7, INativeWorkbenchEnvironmentService),
    __param(8, IProfileAnalysisWorkerService),
    __param(9, IConfigurationService),
    __param(10, IFileService),
    __param(11, ITimerService)
], ExtensionsAutoProfiler);
export { ExtensionsAutoProfiler };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc0F1dG9Qcm9maWxlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZXh0ZW5zaW9ucy9lbGVjdHJvbi1zYW5kYm94L2V4dGVuc2lvbnNBdXRvUHJvZmlsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNqRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUVyRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDNUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQ2hGLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDOUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFDTixtQkFBbUIsRUFDbkIsc0JBQXNCLEdBRXRCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xH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