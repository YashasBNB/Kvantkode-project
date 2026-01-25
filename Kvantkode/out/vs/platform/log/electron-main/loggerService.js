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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9nZ2VyU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vbG9nL2VsZWN0cm9uLW1haW4vbG9nZ2VyU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFFekQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3JELE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQ3BGLE9BQU8sRUFLTixjQUFjLEVBRWQsVUFBVSxHQUNWLE1BQU0sa0JBQWtCLENBQUE7QUFDekIsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBRXhELE1BQU0sQ0FBQyxNQUFNLGtCQUFrQixHQUFHLHNCQUFzQixDQUN2RCxjQUFjLENBQ2QsQ0FBQTtBQW9CRCxNQUFNLE9BQU8saUJBQWtCLFNBQVEsYUFBYTtJQUFwRDs7UUFDa0IsNEJBQXVCLEdBQUcsSUFBSSxXQUFXLEVBQVUsQ0FBQTtJQXVGckUsQ0FBQztJQXJGUyxZQUFZLENBQ3BCLFlBQTBCLEVBQzFCLE9BQXdCLEVBQ3hCLFFBQWlCO1FBRWpCLElBQUksUUFBUSxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQzVCLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUMxRSxDQUFDO1FBQ0QsSUFBSSxDQUFDO1lBQ0osT0FBTyxLQUFLLENBQUMsWUFBWSxDQUFDLFlBQVksRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUNqRCxDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNoQixJQUFJLENBQUMsdUJBQXVCLENBQUMsTUFB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