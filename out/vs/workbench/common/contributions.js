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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udHJpYnV0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb21tb24vY29udHJpYnV0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQ04scUJBQXFCLEdBSXJCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLGlCQUFpQixFQUFrQixNQUFNLDJDQUEyQyxDQUFBO0FBQzdGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNyRSxPQUFPLEVBQWdCLGVBQWUsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQzdGLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDOUQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDdEYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQ25ELE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLFlBQVksRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQzFGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBU25GLE1BQU0sS0FBVyxVQUFVLENBSzFCO0FBTEQsV0FBaUIsVUFBVTtJQUMxQjs7T0FFRztJQUNVLG9CQUFTLEdBQUcsOEJBQThCLENBQUE7QUFDeEQsQ0FBQyxFQUxnQixVQUFVLEtBQVYsVUFBVSxRQUsxQjtBQUVELE1BQU0sQ0FBTixJQUFrQixjQThCakI7QUE5QkQsV0FBa0IsY0FBYztJQUMvQjs7Ozs7O09BTUc7SUFDSCxtRUFBc0MsQ0FBQTtJQUV0Qzs7Ozs7O09BTUc7SUFDSCxtRUFBbUMsQ0FBQTtJQUVuQzs7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