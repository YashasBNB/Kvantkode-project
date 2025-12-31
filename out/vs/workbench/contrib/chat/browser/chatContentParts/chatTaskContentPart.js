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
import * as dom from '../../../../../base/browser/dom.js';
import { Event } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ChatProgressContentPart } from './chatProgressContentPart.js';
import { ChatCollapsibleListContentPart } from './chatReferencesContentPart.js';
let ChatTaskContentPart = class ChatTaskContentPart extends Disposable {
    constructor(task, contentReferencesListPool, renderer, context, instantiationService) {
        super();
        this.task = task;
        if (task.progress.length) {
            const refsPart = this._register(instantiationService.createInstance(ChatCollapsibleListContentPart, task.progress, task.content.value, context, contentReferencesListPool));
            this.domNode = dom.$('.chat-progress-task');
            this.domNode.appendChild(refsPart.domNode);
            this.onDidChangeHeight = refsPart.onDidChangeHeight;
        }
        else {
            // #217645
            const isSettled = task.isSettled?.() ?? true;
            const showSpinner = !isSettled && !context.element.isComplete;
            const progressPart = this._register(instantiationService.createInstance(ChatProgressContentPart, task, renderer, context, showSpinner, true, undefined));
            this.domNode = progressPart.domNode;
            this.onDidChangeHeight = Event.None;
        }
    }
    hasSameContent(other) {
        return (other.kind === 'progressTask' &&
            other.progress.length === this.task.progress.length &&
            other.isSettled() === this.task.isSettled());
    }
    addDisposable(disposable) {
        this._register(disposable);
    }
};
ChatTaskContentPart = __decorate([
    __param(4, IInstantiationService)
], ChatTaskContentPart);
export { ChatTaskContentPart };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFRhc2tDb250ZW50UGFydC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0Q29udGVudFBhcnRzL2NoYXRUYXNrQ29udGVudFBhcnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQ0FBb0MsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDM0QsT0FBTyxFQUFFLFVBQVUsRUFBZSxNQUFNLHlDQUF5QyxDQUFBO0FBRWpGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBSXJHLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ3RFLE9BQU8sRUFBRSw4QkFBOEIsRUFBdUIsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUU3RixJQUFNLG1CQUFtQixHQUF6QixNQUFNLG1CQUFvQixTQUFRLFVBQVU7SUFJbEQsWUFDa0IsSUFBZSxFQUNoQyx5QkFBOEMsRUFDOUMsUUFBMEIsRUFDMUIsT0FBc0MsRUFDZixvQkFBMkM7UUFFbEUsS0FBSyxFQUFFLENBQUE7UUFOVSxTQUFJLEdBQUosSUFBSSxDQUFXO1FBUWhDLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUMxQixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUM5QixvQkFBb0IsQ0FBQyxjQUFjLENBQ2xDLDhCQUE4QixFQUM5QixJQUFJLENBQUMsUUFBUSxFQUNiLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUNsQixPQUFPLEVBQ1AseUJBQXlCLENBQ3pCLENBQ0QsQ0FBQTtZQUNELElBQUksQ0FBQyxPQUFPLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFBO1lBQzNDLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQTtZQUMxQyxJQUFJLENBQUMsaUJBQWlCLEdBQUcsUUFBUSxDQUFDLGlCQUFpQixDQUFBO1FBQ3BELENBQUM7YUFBTSxDQUFDO1lBQ1AsVUFBVTtZQUNWLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxTQUFTLEVBQUUsRUFBRSxJQUFJLElBQUksQ0FBQTtZQUM1QyxNQUFNLFdBQVcsR0FBRyxDQUFDLFNBQVMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFBO1lBQzdELE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQ2xDLG9CQUFvQixDQUFDLGNBQWMsQ0FDbEMsdUJBQXVCLEVBQ3ZCLElBQUksRUFDSixRQUFRLEVBQ1IsT0FBTyxFQUNQLFdBQVcsRUFDWCxJQUFJLEVBQ0osU0FBUyxDQUNULENBQ0QsQ0FBQTtZQUNELElBQUksQ0FBQyxPQUFPLEdBQUcsWUFBWSxDQUFDLE9BQU8sQ0FBQTtZQUNuQyxJQUFJLENBQUMsaUJBQWlCLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQTtRQUNwQyxDQUFDO0lBQ0YsQ0FBQztJQUVELGNBQWMsQ0FBQyxLQUE2QztRQUMzRCxPQUFPLENBQ04sS0FBSyxDQUFDLElBQUksS0FBSyxjQUFjO1lBQzdCLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxLQUFLLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU07WUFDbkQsS0FBSyxDQUFDLFNBQVMsRUFBRSxLQUFLLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQzNDLENBQUE7SUFDRixDQUFDO0lBRUQsYUFBYSxDQUFDLFVBQXVCO1FBQ3BDLElBQUksQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLENBQUE7SUFDM0IsQ0FBQztDQUNELENBQUE7QUF6RFksbUJBQW1CO0lBUzdCLFdBQUEscUJBQXFCLENBQUE7R0FUWCxtQkFBbUIsQ0F5RC9CIn0=