/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { IInstantiationService, } from '../../platform/instantiation/common/instantiation.js';
import { ILifecycleService } from '../services/lifecycle/common/lifecycle.js';
import { Registry } from '../../platform/registry/common/platform.js';
import { DeferredPromise, runWhenGlobalIdle } from '../../base/common/async.js';
import { mark } from '../../base/common/performance.js';
import { ILogService } from '../../platform/log/common/log.js';
import { IEnvironmentService } from '../../platform/environment/common/environment.js';
import { getOrSet } from '../../base/common/map.js';
import { Disposable, DisposableStore, isDisposable } from '../../base/common/lifecycle.js';
import { IEditorPaneService } from '../services/editor/common/editorPaneService.js';
export var Extensions;
(function (Extensions) {
    /**
     * @deprecated use `registerWorkbenchContribution2` instead.
     */
    Extensions.Workbench = 'workbench.contributions.kind';
})(Extensions || (Extensions = {}));
export var WorkbenchPhase;
(function (WorkbenchPhase) {
    /**
     * The first phase signals that we are about to startup getting ready.
     *
     * Note: doing work in this phase blocks an editor from showing to
     * the user, so please rather consider to use the other types, preferable
     * `Lazy` to only instantiate the contribution when really needed.
     */
    WorkbenchPhase[WorkbenchPhase["BlockStartup"] = 1] = "BlockStartup";
    /**
     * Services are ready and the window is about to restore its UI state.
     *
     * Note: doing work in this phase blocks an editor from showing to
     * the user, so please rather consider to use the other types, preferable
     * `Lazy` to only instantiate the contribution when really needed.
     */
    WorkbenchPhase[WorkbenchPhase["BlockRestore"] = 2] = "BlockRestore";
    /**
     * Views, panels and editors have restored. Editors are given a bit of
     * time to restore their contents.
     */
    WorkbenchPhase[WorkbenchPhase["AfterRestored"] = 3] = "AfterRestored";
    /**
     * The last phase after views, panels and editors have restored and
     * some time has passed (2-5 seconds).
     */
    WorkbenchPhase[WorkbenchPhase["Eventually"] = 4] = "Eventually";
})(WorkbenchPhase || (WorkbenchPhase = {}));
function isOnEditorWorkbenchContributionInstantiation(obj) {
    const candidate = obj;
    return !!candidate && typeof candidate.editorTypeId === 'string';
}
function toWorkbenchPhase(phase) {
    switch (phase) {
        case 3 /* LifecyclePhase.Restored */:
            return 3 /* WorkbenchPhase.AfterRestored */;
        case 4 /* LifecyclePhase.Eventually */:
            return 4 /* WorkbenchPhase.Eventually */;
    }
}
function toLifecyclePhase(instantiation) {
    switch (instantiation) {
        case 1 /* WorkbenchPhase.BlockStartup */:
            return 1 /* LifecyclePhase.Starting */;
        case 2 /* WorkbenchPhase.BlockRestore */:
            return 2 /* LifecyclePhase.Ready */;
        case 3 /* WorkbenchPhase.AfterRestored */:
            return 3 /* LifecyclePhase.Restored */;
        case 4 /* WorkbenchPhase.Eventually */:
            return 4 /* LifecyclePhase.Eventually */;
    }
}
export class WorkbenchContributionsRegistry extends Disposable {
    constructor() {
        super(...arguments);
        this.contributionsByPhase = new Map();
        this.contributionsByEditor = new Map();
        this.contributionsById = new Map();
        this.instancesById = new Map();
        this.instanceDisposables = this._register(new DisposableStore());
        this.timingsByPhase = new Map();
        this.pendingRestoredContributions = new DeferredPromise();
        this.whenRestored = this.pendingRestoredContributions.p;
    }
    static { this.INSTANCE = new WorkbenchContributionsRegistry(); }
    static { this.BLOCK_BEFORE_RESTORE_WARN_THRESHOLD = 20; }
    static { this.BLOCK_AFTER_RESTORE_WARN_THRESHOLD = 100; }
    get timings() {
        return this.timingsByPhase;
    }
    registerWorkbenchContribution2(id, ctor, instantiation) {
        const contribution = { id, ctor };
        // Instantiate directly if we already have a matching instantiation condition
        if (this.instantiationService &&
            this.lifecycleService &&
            this.logService &&
            this.environmentService &&
            this.editorPaneService &&
            ((typeof instantiation === 'number' && this.lifecycleService.phase >= instantiation) ||
                (typeof id === 'string' &&
                    isOnEditorWorkbenchContributionInstantiation(instantiation) &&
                    this.editorPaneService.didInstantiateEditorPane(instantiation.editorTypeId)))) {
            this.safeCreateContribution(this.instantiationService, this.logService, this.environmentService, contribution, typeof instantiation === 'number'
                ? toLifecyclePhase(instantiation)
                : this.lifecycleService.phase);
        }
        // Otherwise keep contributions by instantiation kind for later instantiation
        else {
            // by phase
            if (typeof instantiation === 'number') {
                getOrSet(this.contributionsByPhase, toLifecyclePhase(instantiation), []).push(contribution);
            }
            if (typeof id === 'string') {
                // by id
                if (!this.contributionsById.has(id)) {
                    this.contributionsById.set(id, contribution);
                }
                else {
                    console.error(`IWorkbenchContributionsRegistry#registerWorkbenchContribution(): Can't register multiple contributions with same id '${id}'`);
                }
                // by editor
                if (isOnEditorWorkbenchContributionInstantiation(instantiation)) {
                    getOrSet(this.contributionsByEditor, instantiation.editorTypeId, []).push(contribution);
                }
            }
        }
    }
    registerWorkbenchContribution(ctor, phase) {
        this.registerWorkbenchContribution2(undefined, ctor, toWorkbenchPhase(phase));
    }
    getWorkbenchContribution(id) {
        if (this.instancesById.has(id)) {
            return this.instancesById.get(id);
        }
        const instantiationService = this.instantiationService;
        const lifecycleService = this.lifecycleService;
        const logService = this.logService;
        const environmentService = this.environmentService;
        if (!instantiationService || !lifecycleService || !logService || !environmentService) {
            throw new Error(`IWorkbenchContributionsRegistry#getContribution('${id}'): cannot be called before registry started`);
        }
        const contribution = this.contributionsById.get(id);
        if (!contribution) {
            throw new Error(`IWorkbenchContributionsRegistry#getContribution('${id}'): contribution with that identifier is unknown.`);
        }
        if (lifecycleService.phase < 3 /* LifecyclePhase.Restored */) {
            logService.warn(`IWorkbenchContributionsRegistry#getContribution('${id}'): contribution instantiated before LifecyclePhase.Restored!`);
        }
        this.safeCreateContribution(instantiationService, logService, environmentService, contribution, lifecycleService.phase);
        const instance = this.instancesById.get(id);
        if (!instance) {
            throw new Error(`IWorkbenchContributionsRegistry#getContribution('${id}'): failed to create contribution.`);
        }
        return instance;
    }
    start(accessor) {
        const instantiationService = (this.instantiationService = accessor.get(IInstantiationService));
        const lifecycleService = (this.lifecycleService = accessor.get(ILifecycleService));
        const logService = (this.logService = accessor.get(ILogService));
        const environmentService = (this.environmentService = accessor.get(IEnvironmentService));
        const editorPaneService = (this.editorPaneService = accessor.get(IEditorPaneService));
        // Dispose contributions on shutdown
        this._register(lifecycleService.onDidShutdown(() => {
            this.instanceDisposables.clear();
        }));
        // Instantiate contributions by phase when they are ready
        for (const phase of [
            1 /* LifecyclePhase.Starting */,
            2 /* LifecyclePhase.Ready */,
            3 /* LifecyclePhase.Restored */,
            4 /* LifecyclePhase.Eventually */,
        ]) {
            this.instantiateByPhase(instantiationService, lifecycleService, logService, environmentService, phase);
        }
        // Instantiate contributions by editor when they are created or have been
        for (const editorTypeId of this.contributionsByEditor.keys()) {
            if (editorPaneService.didInstantiateEditorPane(editorTypeId)) {
                this.onEditor(editorTypeId, instantiationService, lifecycleService, logService, environmentService);
            }
        }
        this._register(editorPaneService.onWillInstantiateEditorPane((e) => this.onEditor(e.typeId, instantiationService, lifecycleService, logService, environmentService)));
    }
    onEditor(editorTypeId, instantiationService, lifecycleService, logService, environmentService) {
        const contributions = this.contributionsByEditor.get(editorTypeId);
        if (contributions) {
            this.contributionsByEditor.delete(editorTypeId);
            for (const contribution of contributions) {
                this.safeCreateContribution(instantiationService, logService, environmentService, contribution, lifecycleService.phase);
            }
        }
    }
    instantiateByPhase(instantiationService, lifecycleService, logService, environmentService, phase) {
        // Instantiate contributions directly when phase is already reached
        if (lifecycleService.phase >= phase) {
            this.doInstantiateByPhase(instantiationService, logService, environmentService, phase);
        }
        // Otherwise wait for phase to be reached
        else {
            lifecycleService
                .when(phase)
                .then(() => this.doInstantiateByPhase(instantiationService, logService, environmentService, phase));
        }
    }
    async doInstantiateByPhase(instantiationService, logService, environmentService, phase) {
        const contributions = this.contributionsByPhase.get(phase);
        if (contributions) {
            this.contributionsByPhase.delete(phase);
            switch (phase) {
                case 1 /* LifecyclePhase.Starting */:
                case 2 /* LifecyclePhase.Ready */: {
                    // instantiate everything synchronously and blocking
                    // measure the time it takes as perf marks for diagnosis
                    mark(`code/willCreateWorkbenchContributions/${phase}`);
                    for (const contribution of contributions) {
                        this.safeCreateContribution(instantiationService, logService, environmentService, contribution, phase);
                    }
                    mark(`code/didCreateWorkbenchContributions/${phase}`);
                    break;
                }
                case 3 /* LifecyclePhase.Restored */:
                case 4 /* LifecyclePhase.Eventually */: {
                    // for the Restored/Eventually-phase we instantiate contributions
                    // only when idle. this might take a few idle-busy-cycles but will
                    // finish within the timeouts
                    // given that, we must ensure to await the contributions from the
                    // Restored-phase before we instantiate the Eventually-phase
                    if (phase === 4 /* LifecyclePhase.Eventually */) {
                        await this.pendingRestoredContributions.p;
                    }
                    this.doInstantiateWhenIdle(contributions, instantiationService, logService, environmentService, phase);
                    break;
                }
            }
        }
    }
    doInstantiateWhenIdle(contributions, instantiationService, logService, environmentService, phase) {
        mark(`code/willCreateWorkbenchContributions/${phase}`);
        let i = 0;
        const forcedTimeout = phase === 4 /* LifecyclePhase.Eventually */ ? 3000 : 500;
        const instantiateSome = (idle) => {
            while (i < contributions.length) {
                const contribution = contributions[i++];
                this.safeCreateContribution(instantiationService, logService, environmentService, contribution, phase);
                if (idle.timeRemaining() < 1) {
                    // time is up -> reschedule
                    runWhenGlobalIdle(instantiateSome, forcedTimeout);
                    break;
                }
            }
            if (i === contributions.length) {
                mark(`code/didCreateWorkbenchContributions/${phase}`);
                if (phase === 3 /* LifecyclePhase.Restored */) {
                    this.pendingRestoredContributions.complete();
                }
            }
        };
        runWhenGlobalIdle(instantiateSome, forcedTimeout);
    }
    safeCreateContribution(instantiationService, logService, environmentService, contribution, phase) {
        if (typeof contribution.id === 'string' && this.instancesById.has(contribution.id)) {
            return;
        }
        const now = Date.now();
        try {
            if (typeof contribution.id === 'string') {
                mark(`code/willCreateWorkbenchContribution/${phase}/${contribution.id}`);
            }
            const instance = instantiationService.createInstance(contribution.ctor);
            if (typeof contribution.id === 'string') {
                this.instancesById.set(contribution.id, instance);
                this.contributionsById.delete(contribution.id);
            }
            if (isDisposable(instance)) {
                this.instanceDisposables.add(instance);
            }
        }
        catch (error) {
            logService.error(`Unable to create workbench contribution '${contribution.id ?? contribution.ctor.name}'.`, error);
        }
        finally {
            if (typeof contribution.id === 'string') {
                mark(`code/didCreateWorkbenchContribution/${phase}/${contribution.id}`);
            }
        }
        if (typeof contribution.id === 'string' ||
            !environmentService.isBuilt /* only log out of sources where we have good ctor names */) {
            const time = Date.now() - now;
            if (time >
                (phase < 3 /* LifecyclePhase.Restored */
                    ? WorkbenchContributionsRegistry.BLOCK_BEFORE_RESTORE_WARN_THRESHOLD
                    : WorkbenchContributionsRegistry.BLOCK_AFTER_RESTORE_WARN_THRESHOLD)) {
                logService.warn(`Creation of workbench contribution '${contribution.id ?? contribution.ctor.name}' took ${time}ms.`);
            }
            if (typeof contribution.id === 'string') {
                let timingsForPhase = this.timingsByPhase.get(phase);
                if (!timingsForPhase) {
                    timingsForPhase = [];
                    this.timingsByPhase.set(phase, timingsForPhase);
                }
                timingsForPhase.push([contribution.id, time]);
            }
        }
    }
}
/**
 * Register a workbench contribution that will be instantiated
 * based on the `instantiation` property.
 */
export const registerWorkbenchContribution2 = WorkbenchContributionsRegistry.INSTANCE.registerWorkbenchContribution2.bind(WorkbenchContributionsRegistry.INSTANCE);
/**
 * Provides access to a workbench contribution with a specific identifier.
 * The contribution is created if not yet done.
 *
 * Note: will throw an error if
 * - called too early before the registry has started
 * - no contribution is known for the given identifier
 */
export const getWorkbenchContribution = WorkbenchContributionsRegistry.INSTANCE.getWorkbenchContribution.bind(WorkbenchContributionsRegistry.INSTANCE);
Registry.add(Extensions.Workbench, WorkbenchContributionsRegistry.INSTANCE);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udHJpYnV0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbW1vbi9jb250cmlidXRpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFDTixxQkFBcUIsR0FJckIsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsaUJBQWlCLEVBQWtCLE1BQU0sMkNBQTJDLENBQUE7QUFDN0YsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3JFLE9BQU8sRUFBZ0IsZUFBZSxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDN0YsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUN0RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDbkQsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsWUFBWSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDMUYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFTbkYsTUFBTSxLQUFXLFVBQVUsQ0FLMUI7QUFMRCxXQUFpQixVQUFVO0lBQzFCOztPQUVHO0lBQ1Usb0JBQVMsR0FBRyw4QkFBOEIsQ0FBQTtBQUN4RCxDQUFDLEVBTGdCLFVBQVUsS0FBVixVQUFVLFFBSzFCO0FBRUQsTUFBTSxDQUFOLElBQWtCLGNBOEJqQjtBQTlCRCxXQUFrQixjQUFjO0lBQy9COzs7Ozs7T0FNRztJQUNILG1FQUFzQyxDQUFBO0lBRXRDOzs7Ozs7T0FNRztJ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