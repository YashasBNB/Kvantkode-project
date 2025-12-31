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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc0F1dG9Qcm9maWxlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2V4dGVuc2lvbnMvZWxlY3Ryb24tc2FuZGJveC9leHRlbnNpb25zQXV0b1Byb2ZpbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDNUQsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDakYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFckUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUNoRixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQ04sbUJBQW1CLEVBQ25CLHNCQUFzQixHQUV0QixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1B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