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
import { IMarkerDecorationsService } from '../../common/services/markerDecorations.js';
import { registerEditorContribution } from '../editorExtensions.js';
let MarkerDecorationsContribution = class MarkerDecorationsContribution {
    static { this.ID = 'editor.contrib.markerDecorations'; }
    constructor(_editor, _markerDecorationsService) {
        // Doesn't do anything, just requires `IMarkerDecorationsService` to make sure it gets instantiated
    }
    dispose() { }
};
MarkerDecorationsContribution = __decorate([
    __param(1, IMarkerDecorationsService)
], MarkerDecorationsContribution);
export { MarkerDecorationsContribution };
registerEditorContribution(MarkerDecorationsContribution.ID, MarkerDecorationsContribution, 0 /* EditorContributionInstantiation.Eager */); // eager because it instantiates IMarkerDecorationsService which is responsible for rendering squiggles
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2VyRGVjb3JhdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci9zZXJ2aWNlcy9tYXJrZXJEZWNvcmF0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUN0RixPQUFPLEVBQW1DLDBCQUEwQixFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFJN0YsSUFBTSw2QkFBNkIsR0FBbkMsTUFBTSw2QkFBNkI7YUFDbEIsT0FBRSxHQUFXLGtDQUFrQyxBQUE3QyxDQUE2QztJQUV0RSxZQUNDLE9BQW9CLEVBQ08seUJBQW9EO1FBRS9FLG1HQUFtRztJQUNwRyxDQUFDO0lBRUQsT0FBTyxLQUFVLENBQUM7O0FBVk4sNkJBQTZCO0lBS3ZDLFdBQUEseUJBQXlCLENBQUE7R0FMZiw2QkFBNkIsQ0FXekM7O0FBRUQsMEJBQTBCLENBQ3pCLDZCQUE2QixDQUFDLEVBQUUsRUFDaEMsNkJBQTZCLGdEQUU3QixDQUFBLENBQUMsdUdBQXVHIn0=