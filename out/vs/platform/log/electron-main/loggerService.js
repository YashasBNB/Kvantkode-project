/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ResourceMap } from '../../../base/common/map.js';
import { Event } from '../../../base/common/event.js';
import { refineServiceDecorator } from '../../instantiation/common/instantiation.js';
import { ILoggerService, isLogLevel, } from '../common/log.js';
import { LoggerService } from '../node/loggerService.js';
export const ILoggerMainService = refineServiceDecorator(ILoggerService);
export class LoggerMainService extends LoggerService {
    constructor() {
        super(...arguments);
        this.loggerResourcesByWindow = new ResourceMap();
    }
    createLogger(idOrResource, options, windowId) {
        if (windowId !== undefined) {
            this.loggerResourcesByWindow.set(this.toResource(idOrResource), windowId);
        }
        try {
            return super.createLogger(idOrResource, options);
        }
        catch (error) {
            this.loggerResourcesByWindow.delete(this.toResource(idOrResource));
            throw error;
        }
    }
    registerLogger(resource, windowId) {
        if (windowId !== undefined) {
            this.loggerResourcesByWindow.set(resource.resource, windowId);
        }
        super.registerLogger(resource);
    }
    deregisterLogger(resource) {
        this.loggerResourcesByWindow.delete(resource);
        super.deregisterLogger(resource);
    }
    getGlobalLoggers() {
        const resources = [];
        for (const resource of super.getRegisteredLoggers()) {
            if (!this.loggerResourcesByWindow.has(resource.resource)) {
                resources.push(resource);
            }
        }
        return resources;
    }
    getOnDidChangeLogLevelEvent(windowId) {
        return Event.filter(this.onDidChangeLogLevel, (arg) => isLogLevel(arg) || this.isInterestedLoggerResource(arg[0], windowId));
    }
    getOnDidChangeVisibilityEvent(windowId) {
        return Event.filter(this.onDidChangeVisibility, ([resource]) => this.isInterestedLoggerResource(resource, windowId));
    }
    getOnDidChangeLoggersEvent(windowId) {
        return Event.filter(Event.map(this.onDidChangeLoggers, (e) => {
            const r = {
                added: [...e.added].filter((loggerResource) => this.isInterestedLoggerResource(loggerResource.resource, windowId)),
                removed: [...e.removed].filter((loggerResource) => this.isInterestedLoggerResource(loggerResource.resource, windowId)),
            };
            return r;
        }), (e) => e.added.length > 0 || e.removed.length > 0);
    }
    deregisterLoggers(windowId) {
        for (const [resource, resourceWindow] of this.loggerResourcesByWindow) {
            if (resourceWindow === windowId) {
                this.deregisterLogger(resource);
            }
        }
    }
    isInterestedLoggerResource(resource, windowId) {
        const loggerWindowId = this.loggerResourcesByWindow.get(resource);
        return loggerWindowId === undefined || loggerWindowId === windowId;
    }
    dispose() {
        super.dispose();
        this.loggerResourcesByWindow.clear();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9nZ2VyU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2xvZy9lbGVjdHJvbi1tYWluL2xvZ2dlclNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBRXpELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUNwRixPQUFPLEVBS04sY0FBYyxFQUVkLFVBQVUsR0FDVixNQUFNLGtCQUFrQixDQUFBO0FBQ3pCLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUV4RCxNQUFNLENBQUMsTUFBTSxrQkFBa0IsR0FBRyxzQkFBc0IsQ0FDdkQsY0FBYyxDQUNkLENBQUE7QUFvQkQsTUFBTSxPQUFPLGlCQUFrQixTQUFRLGFBQWE7SUFBcEQ7O1FBQ2tCLDRCQUF1QixHQUFHLElBQUksV0FBVyxFQUFVLENBQUE7SUF1RnJFLENBQUM7SUFyRlMsWUFBWSxDQUNwQixZQUEwQixFQUMxQixPQUF3QixFQUN4QixRQUFpQjtRQUVqQixJQUFJLFFBQVEsS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUM1QixJQUFJLENBQUMsdUJBQXVCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFDMUUsQ0FBQztRQUNELElBQUksQ0FBQztZQUNKLE9BQU8sS0FBSyxDQUFDLFlBQVksQ0FBQyxZQUFZLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDakQsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDaEIsSUFBSSxDQUFDLHVCQUF1QixDQUFDLE1BQU0sQ0FB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