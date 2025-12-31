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
import { localize2 } from '../../../../nls.js';
import { registerAction2, Action2 } from '../../../../platform/actions/common/actions.js';
import { IInstantiationService, } from '../../../../platform/instantiation/common/instantiation.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { Extensions, registerWorkbenchContribution2, } from '../../../common/contributions.js';
import { EditorExtensions, } from '../../../common/editor.js';
import { PerfviewContrib, PerfviewInput } from './perfviewEditor.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { InstantiationService, Trace, } from '../../../../platform/instantiation/common/instantiationService.js';
import { EventProfiling } from '../../../../base/common/event.js';
import { InputLatencyContrib } from './inputLatencyContrib.js';
import { IEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { GCBasedDisposableTracker, setDisposableTracker, } from '../../../../base/common/lifecycle.js';
// -- startup performance view
registerWorkbenchContribution2(PerfviewContrib.ID, PerfviewContrib, { lazy: true });
Registry.as(EditorExtensions.EditorFactory).registerEditorSerializer(PerfviewInput.Id, class {
    canSerialize() {
        return true;
    }
    serialize() {
        return '';
    }
    deserialize(instantiationService) {
        return instantiationService.createInstance(PerfviewInput);
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'perfview.show',
            title: localize2('show.label', 'Startup Performance'),
            category: Categories.Developer,
            f1: true,
        });
    }
    run(accessor) {
        const editorService = accessor.get(IEditorService);
        const contrib = PerfviewContrib.get();
        return editorService.openEditor(contrib.getEditorInput(), { pinned: true });
    }
});
registerAction2(class PrintServiceCycles extends Action2 {
    constructor() {
        super({
            id: 'perf.insta.printAsyncCycles',
            title: localize2('cycles', 'Print Service Cycles'),
            category: Categories.Developer,
            f1: true,
        });
    }
    run(accessor) {
        const instaService = accessor.get(IInstantiationService);
        if (instaService instanceof InstantiationService) {
            const cycle = instaService._globalGraph?.findCycleSlow();
            if (cycle) {
                console.warn(`CYCLE`, cycle);
            }
            else {
                console.warn(`YEAH, no more cycles`);
            }
        }
    }
});
registerAction2(class PrintServiceTraces extends Action2 {
    constructor() {
        super({
            id: 'perf.insta.printTraces',
            title: localize2('insta.trace', 'Print Service Traces'),
            category: Categories.Developer,
            f1: true,
        });
    }
    run() {
        if (Trace.all.size === 0) {
            console.log('Enable via `instantiationService.ts#_enableAllTracing`');
            return;
        }
        for (const item of Trace.all) {
            console.log(item);
        }
    }
});
registerAction2(class PrintEventProfiling extends Action2 {
    constructor() {
        super({
            id: 'perf.event.profiling',
            title: localize2('emitter', 'Print Emitter Profiles'),
            category: Categories.Developer,
            f1: true,
        });
    }
    run() {
        if (EventProfiling.all.size === 0) {
            console.log('USE `EmitterOptions._profName` to enable profiling');
            return;
        }
        for (const item of EventProfiling.all) {
            console.log(`${item.name}: ${item.invocationCount} invocations COST ${item.elapsedOverall}ms, ${item.listenerCount} listeners, avg cost is ${item.durations.reduce((a, b) => a + b, 0) / item.durations.length}ms`);
        }
    }
});
// -- input latency
Registry.as(Extensions.Workbench).registerWorkbenchContribution(InputLatencyContrib, 4 /* LifecyclePhase.Eventually */);
// -- track leaking disposables, those that get GC'ed before having been disposed
let DisposableTracking = class DisposableTracking {
    static { this.Id = 'perf.disposableTracking'; }
    constructor(envService) {
        if (!envService.isBuilt && !envService.extensionTestsLocationURI) {
            setDisposableTracker(new GCBasedDisposableTracker());
        }
    }
};
DisposableTracking = __decorate([
    __param(0, IEnvironmentService)
], DisposableTracking);
registerWorkbenchContribution2(DisposableTracking.Id, DisposableTracking, 4 /* WorkbenchPhase.Eventually */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGVyZm9ybWFuY2UuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvcGVyZm9ybWFuY2UvYnJvd3Nlci9wZXJmb3JtYW5jZS5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzlDLE9BQU8sRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDekYsT0FBTyxFQUNOLHFCQUFxQixHQUVyQixNQUFNLDREQUE0RCxDQUFBO0FBRW5FLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sOERBQThELENBQUE7QUFDekYsT0FBTyxFQUNOLFVBQVUsRUFFViw4QkFBOEIsR0FFOUIsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN6QyxPQUFPLEVBQ04sZ0JBQWdCLEdBR2hCLE1BQU0sMkJBQTJCLENBQUE7QUFDbEMsT0FBTyxFQUFFLGVBQWUsRUFBRSxhQUFhLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDakYsT0FBTyxFQUNOLG9CQUFvQixFQUNwQixLQUFLLEdBQ0wsTUFBTSxtRUFBbUUsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDOUQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDNUYsT0FBTyxFQUNOLHdCQUF3QixFQUN4QixvQkFBb0IsR0FDcEIsTUFBTSxzQ0FBc0MsQ0FBQTtBQUU3Qyw4QkFBOEI7QUFFOUIsOEJBQThCLENBQUMsZUFBZSxDQUFDLEVBQUUsRUFBRSxlQUFlLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtBQUVuRixRQUFRLENBQUMsRUFBRSxDQUF5QixnQkFBZ0IsQ0FBQyxhQUFhLENBQUMsQ0FBQyx3QkFBd0IsQ0FDM0YsYUFBYSxDQUFDLEVBQUUsRUFDaEI7SUFDQyxZQUFZO1FBQ1gsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBQ0QsU0FBUztRQUNSLE9BQU8sRUFBRSxDQUFBO0lBQ1YsQ0FBQztJQUNELFdBQVcsQ0FBQyxvQkFBMkM7UUFDdEQsT0FBTyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsYUFBYSxDQUFDLENBQUE7SUFDMUQsQ0FBQztDQUNELENBQ0QsQ0FBQTtBQUVELGVBQWUsQ0FDZCxLQUFNLFNBQVEsT0FBTztJQUNwQjtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSxlQUFlO1lBQ25CLEtBQUssRUFBRSxTQUFTLENBQUMsWUFBWSxFQUFFLHFCQUFxQixDQUFDO1lBQ3JELFFBQVEsRUFBRSxVQUFVLENBQUMsU0FBUztZQUM5QixFQUFFLEVBQUUsSUFBSTtTQUNSLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCxHQUFHLENBQUMsUUFBMEI7UUFDN0IsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQTtRQUNsRCxNQUFNLE9BQU8sR0FBRyxlQUFlLENBQUMsR0FBRyxFQUFFLENBQUE7UUFDckMsT0FBTyxhQUFhLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxjQUFjLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO0lBQzVFLENBQUM7Q0FDRCxDQUNELENBQUE7QUFFRCxlQUFlLENBQ2QsTUFBTSxrQkFBbUIsU0FBUSxPQUFPO0lBQ3ZDO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLDZCQUE2QjtZQUNqQyxLQUFLLEVBQUUsU0FBUyxDQUFDLFFBQVEsRUFBRSxzQkFBc0IsQ0FBQztZQUNsRCxRQUFRLEVBQUUsVUFBVSxDQUFDLFNBQVM7WUFDOUIsRUFBRSxFQUFFLElBQUk7U0FDUixDQUFDLENBQUE7SUFDSCxDQUFDO0lBRUQsR0FBRyxDQUFDLFFBQTBCO1FBQzdCLE1BQU0sWUFBWSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsQ0FBQTtRQUN4RCxJQUFJLFlBQVksWUFBWSxvQkFBb0IsRUFBRSxDQUFDO1lBQ2xELE1BQU0sS0FBSyxHQUFHLFlBQVksQ0FBQyxZQUFZLEVBQUUsYUFBYSxFQUFFLENBQUE7WUFDeEQsSUFBSSxLQUFLLEVBQUUsQ0FBQztnQkFDWCxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUM3QixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsT0FBTyxDQUFDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxDQUFBO1lBQ3JDLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztDQUNELENBQ0QsQ0FBQTtBQUVELGVBQWUsQ0FDZCxNQUFNLGtCQUFtQixTQUFRLE9BQU87SUFDdkM7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsd0JBQXdCO1lBQzVCLEtBQUssRUFBRSxTQUFTLENBQUMsYUFBYSxFQUFFLHNCQUFzQixDQUFDO1lBQ3ZELFFBQVEsRUFBRSxVQUFVLENBQUMsU0FBUztZQUM5QixFQUFFLEVBQUUsSUFBSTtTQUNSLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCxHQUFHO1FBQ0YsSUFBSSxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUMxQixPQUFPLENBQUMsR0FBRyxDQUFDLHdEQUF3RCxDQUFDLENBQUE7WUFDckUsT0FBTTtRQUNQLENBQUM7UUFFRCxLQUFLLE1BQU0sSUFBSSxJQUFJLEtBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQztZQUM5QixPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ2xCLENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FDRCxDQUFBO0FBRUQsZUFBZSxDQUNkLE1BQU0sbUJBQW9CLFNBQVEsT0FBTztJQUN4QztRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSxzQkFBc0I7WUFDMUIsS0FBSyxFQUFFLFNBQVMsQ0FBQyxTQUFTLEVBQUUsd0JBQXdCLENBQUM7WUFDckQsUUFBUSxFQUFFLFVBQVUsQ0FBQyxTQUFTO1lBQzlCLEVBQUUsRUFBRSxJQUFJO1NBQ1IsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVELEdBQUc7UUFDRixJQUFJLGNBQWMsQ0FBQyxHQUFHLENBQUMsSUFBSSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ25DLE9BQU8sQ0FBQyxHQUFHLENBQUMsb0RBQW9ELENBQUMsQ0FBQTtZQUNqRSxPQUFNO1FBQ1AsQ0FBQztRQUNELEtBQUssTUFBTSxJQUFJLElBQUksY0FBYyxDQUFDLEdBQUcsRUFBRSxDQUFDO1lBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQ1YsR0FBRyxJQUFJLENBQUMsSUFBSSxLQUFLLElBQUksQ0FBQyxlQUFlLHFCQUFxQixJQUFJLENBQUMsY0FBYyxPQUFPLElBQUksQ0FBQyxhQUFhLDJCQUEyQixJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLElBQUksQ0FDdE0sQ0FBQTtRQUNGLENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FDRCxDQUFBO0FBRUQsbUJBQW1CO0FBRW5CLFFBQVEsQ0FBQyxFQUFFLENBQWtDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQyw2QkFBNkIsQ0FDL0YsbUJBQW1CLG9DQUVuQixDQUFBO0FBRUQsaUZBQWlGO0FBRWpGLElBQU0sa0JBQWtCLEdBQXhCLE1BQU0sa0JBQWtCO2FBQ1AsT0FBRSxHQUFHLHlCQUF5QixBQUE1QixDQUE0QjtJQUM5QyxZQUFpQyxVQUErQjtRQUMvRCxJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyx5QkFBeUIsRUFBRSxDQUFDO1lBQ2xFLG9CQUFvQixDQUFDLElBQUksd0JBQXdCLEVBQUUsQ0FBQyxDQUFBO1FBQ3JELENBQUM7SUFDRixDQUFDOztBQU5JLGtCQUFrQjtJQUVWLFdBQUEsbUJBQW1CLENBQUE7R0FGM0Isa0JBQWtCLENBT3ZCO0FBRUQsOEJBQThCLENBQUMsa0JBQWtCLENBQUMsRUFBRSxFQUFFLGtCQUFrQixvQ0FBNEIsQ0FBQSJ9