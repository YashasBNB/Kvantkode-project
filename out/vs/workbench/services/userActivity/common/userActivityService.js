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
import { disposableTimeout, RunOnceScheduler, runWhenGlobalIdle, } from '../../../../base/common/async.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable, DisposableStore, toDisposable, } from '../../../../base/common/lifecycle.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { IInstantiationService, createDecorator, } from '../../../../platform/instantiation/common/instantiation.js';
import { userActivityRegistry } from './userActivityRegistry.js';
const MARK_INACTIVE_DEBOUNCE = 10_000;
export const IUserActivityService = createDecorator('IUserActivityService');
let UserActivityService = class UserActivityService extends Disposable {
    constructor(instantiationService) {
        super();
        this.markInactive = this._register(new RunOnceScheduler(() => {
            this.isActive = false;
            this.changeEmitter.fire(false);
        }, MARK_INACTIVE_DEBOUNCE));
        this.changeEmitter = this._register(new Emitter());
        this.active = 0;
        /**
         * @inheritdoc
         *
         * Note: initialized to true, since the user just did something to open the
         * window. The bundled DomActivityTracker will initially assume activity
         * as well in order to unset this if the window gets abandoned.
         */
        this.isActive = true;
        /** @inheritdoc */
        this.onDidChangeIsActive = this.changeEmitter.event;
        this._register(runWhenGlobalIdle(() => userActivityRegistry.take(this, instantiationService)));
    }
    /** @inheritdoc */
    markActive(opts) {
        if (opts?.whenHeldFor) {
            const store = new DisposableStore();
            store.add(disposableTimeout(() => store.add(this.markActive()), opts.whenHeldFor));
            return store;
        }
        if (++this.active === 1) {
            this.isActive = true;
            this.changeEmitter.fire(true);
            this.markInactive.cancel();
        }
        return toDisposable(() => {
            if (--this.active === 0) {
                this.markInactive.schedule();
            }
        });
    }
};
UserActivityService = __decorate([
    __param(0, IInstantiationService)
], UserActivityService);
export { UserActivityService };
registerSingleton(IUserActivityService, UserActivityService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckFjdGl2aXR5U2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3VzZXJBY3Rpdml0eS9jb21tb24vdXNlckFjdGl2aXR5U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQ04saUJBQWlCLEVBQ2pCLGdCQUFnQixFQUNoQixpQkFBaUIsR0FDakIsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUNOLFVBQVUsRUFDVixlQUFlLEVBRWYsWUFBWSxHQUNaLE1BQU0sc0NBQXNDLENBQUE7QUFDN0MsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFDTixxQkFBcUIsRUFDckIsZUFBZSxHQUNmLE1BQU0sNERBQTRELENBQUE7QUFDbkUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUE4QmhFLE1BQU0sc0JBQXNCLEdBQUcsTUFBTSxDQUFBO0FBRXJDLE1BQU0sQ0FBQyxNQUFNLG9CQUFvQixHQUFHLGVBQWUsQ0FBdUIsc0JBQXNCLENBQUMsQ0FBQTtBQUUxRixJQUFNLG1CQUFtQixHQUF6QixNQUFNLG1CQUFvQixTQUFRLFVBQVU7SUF3QmxELFlBQW1DLG9CQUEyQztRQUM3RSxLQUFLLEVBQUUsQ0FBQTtRQXZCUyxpQkFBWSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQzdDLElBQUksZ0JBQWdCLENBQUMsR0FBRyxFQUFFO1lBQ3pCLElBQUksQ0FBQyxRQUFRLEdBQUcsS0FBSyxDQUFBO1lBQ3JCLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQy9CLENBQUMsRUFBRSxzQkFBc0IsQ0FBQyxDQUMxQixDQUFBO1FBRWdCLGtCQUFhLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBVyxDQUFDLENBQUE7UUFDL0QsV0FBTSxHQUFHLENBQUMsQ0FBQTtRQUVsQjs7Ozs7O1dBTUc7UUFDSSxhQUFRLEdBQUcsSUFBSSxDQUFBO1FBRXRCLGtCQUFrQjtRQUNsQix3QkFBbUIsR0FBbUIsSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUE7UUFJN0QsSUFBSSxDQUFDLFNBQVMsQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQy9GLENBQUM7SUFFRCxrQkFBa0I7SUFDbEIsVUFBVSxDQUFDLElBQXlCO1FBQ25DLElBQUksSUFBSSxFQUFFLFdBQVcsRUFBRSxDQUFDO1lBQ3ZCLE1BQU0sS0FBSyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7WUFDbkMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFBO1lBQ2xGLE9BQU8sS0FBSyxDQUFBO1FBQ2IsQ0FBQztRQUVELElBQUksRUFBRSxJQUFJLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ3pCLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFBO1lBQ3BCLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQzdCLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLENBQUE7UUFDM0IsQ0FBQztRQUVELE9BQU8sWUFBWSxDQUFDLEdBQUcsRUFBRTtZQUN4QixJQUFJLEVBQUUsSUFBSSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDekIsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsQ0FBQTtZQUM3QixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDO0NBQ0QsQ0FBQTtBQWpEWSxtQkFBbUI7SUF3QmxCLFdBQUEscUJBQXFCLENBQUE7R0F4QnRCLG1CQUFtQixDQWlEL0I7O0FBRUQsaUJBQWlCLENBQUMsb0JBQW9CLEVBQUUsbUJBQW1CLG9DQUE0QixDQUFBIn0=