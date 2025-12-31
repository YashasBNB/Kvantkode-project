/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Disposable } from '../../../../base/common/lifecycle.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { localize2 } from '../../../../nls.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { registerWorkbenchContribution2, } from '../../../common/contributions.js';
export const IDummyService = createDecorator('DummyService');
// An example of an action (delete if you're not using an action):
registerAction2(class extends Action2 {
    constructor() {
        super({
            f1: true,
            id: 'void.dummy',
            title: localize2('dummy', 'dummy: Init'),
            keybinding: {
                primary: 2048 /* KeyMod.CtrlCmd */ | 21 /* KeyCode.Digit0 */,
                weight: 605 /* KeybindingWeight.VoidExtension */,
            },
        });
    }
    async run(accessor) {
        const n = accessor.get(IDummyService);
        console.log('Hi', n._serviceBrand);
    }
});
let DummyService = class DummyService extends Disposable {
    static { this.ID = 'workbench.contrib.void.dummy'; } // workbenchContributions need this, services do not
    constructor(codeEditorService) {
        super();
    }
};
DummyService = __decorate([
    __param(0, ICodeEditorService)
], DummyService);
// pick one and delete the other:
registerSingleton(IDummyService, DummyService, 0 /* InstantiationType.Eager */); // lazily loaded, even if Eager
registerWorkbenchContribution2(DummyService.ID, DummyService, 2 /* WorkbenchPhase.BlockRestore */); // mounts on start
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiX2R1bW15Q29udHJpYi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ZvaWQvYnJvd3Nlci9fZHVtbXlDb250cmliLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7MEZBRzBGOzs7Ozs7Ozs7O0FBRzFGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUVqRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUM3RixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDOUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUN6RixPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBRTVGLE9BQU8sRUFFTiw4QkFBOEIsR0FFOUIsTUFBTSxrQ0FBa0MsQ0FBQTtBQU96QyxNQUFNLENBQUMsTUFBTSxhQUFhLEdBQUcsZUFBZSxDQUFnQixjQUFjLENBQUMsQ0FBQTtBQUUzRSxrRUFBa0U7QUFDbEUsZUFBZSxDQUNkLEtBQU0sU0FBUSxPQUFPO0lBQ3BCO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLElBQUk7WUFDUixFQUFFLEVBQUUsWUFBWTtZQUNoQixLQUFLLEVBQUUsU0FBUyxDQUFDLE9BQU8sRUFBRSxhQUFhLENBQUM7WUFDeEMsVUFBVSxFQUFFO2dCQUNYLE9BQU8sRUFBRSxtREFBK0I7Z0JBQ3hDLE1BQU0sMENBQWdDO2FBQ3RDO1NBQ0QsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUNELEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBMEI7UUFDbkMsTUFBTSxDQUFDLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQTtRQUNyQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUE7SUFDbkMsQ0FBQztDQUNELENBQ0QsQ0FBQTtBQUVELElBQU0sWUFBWSxHQUFsQixNQUFNLFlBQWEsU0FBUSxVQUFVO2FBQ3BCLE9BQUUsR0FBRyw4QkFBOEIsQUFBakMsQ0FBaUMsR0FBQyxvREFBb0Q7SUFHeEcsWUFBZ0MsaUJBQXFDO1FBQ3BFLEtBQUssRUFBRSxDQUFBO0lBQ1IsQ0FBQzs7QUFOSSxZQUFZO0lBSUosV0FBQSxrQkFBa0IsQ0FBQTtHQUoxQixZQUFZLENBT2pCO0FBRUQsaUNBQWlDO0FBQ2pDLGlCQUFpQixDQUFDLGFBQWEsRUFBRSxZQUFZLGtDQUEwQixDQUFBLENBQUMsK0JBQStCO0FBRXZHLDhCQUE4QixDQUFDLFlBQVksQ0FBQyxFQUFFLEVBQUUsWUFBWSxzQ0FBOEIsQ0FBQSxDQUFDLGtCQUFrQiJ9