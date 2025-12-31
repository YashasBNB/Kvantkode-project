/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Memento } from './memento.js';
import { Themable } from '../../platform/theme/common/themeService.js';
export class Component extends Themable {
    constructor(id, themeService, storageService) {
        super(themeService);
        this.id = id;
        this.memento = new Memento(this.id, storageService);
        this._register(storageService.onWillSaveState(() => {
            // Ask the component to persist state into the memento
            this.saveState();
            // Then save the memento into storage
            this.memento.saveMemento();
        }));
    }
    getId() {
        return this.id;
    }
    getMemento(scope, target) {
        return this.memento.getMemento(scope, target);
    }
    reloadMemento(scope) {
        return this.memento.reloadMemento(scope);
    }
    onDidChangeMementoValue(scope, disposables) {
        return this.memento.onDidChangeValue(scope, disposables);
    }
    saveState() {
        // Subclasses to implement for storing state
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcG9uZW50LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbW1vbi9jb21wb25lbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBaUIsTUFBTSxjQUFjLENBQUE7QUFDckQsT0FBTyxFQUFpQixRQUFRLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQVVyRixNQUFNLE9BQU8sU0FBVSxTQUFRLFFBQVE7SUFHdEMsWUFDa0IsRUFBVSxFQUMzQixZQUEyQixFQUMzQixjQUErQjtRQUUvQixLQUFLLENBQUMsWUFBWSxDQUFDLENBQUE7UUFKRixPQUFFLEdBQUYsRUFBRSxDQUFRO1FBTTNCLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxjQUFjLENBQUMsQ0FBQTtRQUVuRCxJQUFJLENBQUMsU0FBUyxDQUNiLGNBQWMsQ0FBQyxlQUFlLENBQUMsR0FBRyxFQUFFO1lBQ25DLHNEQUFzRDtZQUN0RCxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUE7WUFFaEIscUNBQXFDO1lBQ3JDLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLENBQUE7UUFDM0IsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtJQUNGLENBQUM7SUFFRCxLQUFLO1FBQ0osT0FBTyxJQUFJLENBQUMsRUFBRSxDQUFBO0lBQ2YsQ0FBQztJQUVTLFVBQVUsQ0FBQyxLQUFtQixFQUFFLE1BQXFCO1FBQzlELE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFBO0lBQzlDLENBQUM7SUFFUyxhQUFhLENBQUMsS0FBbUI7UUFDMUMsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUN6QyxDQUFDO0lBRVMsdUJBQXVCLENBQ2hDLEtBQW1CLEVBQ25CLFdBQTRCO1FBRTVCLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLEVBQUUsV0FBVyxDQUFDLENBQUE7SUFDekQsQ0FBQztJQUVTLFNBQVM7UUFDbEIsNENBQTRDO0lBQzdDLENBQUM7Q0FDRCJ9