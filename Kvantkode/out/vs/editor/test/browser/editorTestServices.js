/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../base/common/event.js';
import { AbstractCodeEditorService, GlobalStyleSheet, } from '../../browser/services/abstractCodeEditorService.js';
import { CommandsRegistry, } from '../../../platform/commands/common/commands.js';
export class TestCodeEditorService extends AbstractCodeEditorService {
    constructor() {
        super(...arguments);
        this.globalStyleSheet = new TestGlobalStyleSheet();
    }
    _createGlobalStyleSheet() {
        return this.globalStyleSheet;
    }
    getActiveCodeEditor() {
        return null;
    }
    openCodeEditor(input, source, sideBySide) {
        this.lastInput = input;
        return Promise.resolve(null);
    }
}
export class TestGlobalStyleSheet extends GlobalStyleSheet {
    constructor() {
        super(null);
        this.rules = [];
    }
    insertRule(selector, rule) {
        this.rules.unshift(`${selector} {${rule}}`);
    }
    removeRulesContainingSelector(ruleName) {
        for (let i = 0; i < this.rules.length; i++) {
            if (this.rules[i].indexOf(ruleName) >= 0) {
                this.rules.splice(i, 1);
                i--;
            }
        }
    }
    read() {
        return this.rules.join('\n');
    }
}
export class TestCommandService {
    constructor(instantiationService) {
        this._onWillExecuteCommand = new Emitter();
        this.onWillExecuteCommand = this._onWillExecuteCommand.event;
        this._onDidExecuteCommand = new Emitter();
        this.onDidExecuteCommand = this._onDidExecuteCommand.event;
        this._instantiationService = instantiationService;
    }
    executeCommand(id, ...args) {
        const command = CommandsRegistry.getCommand(id);
        if (!command) {
            return Promise.reject(new Error(`command '${id}' not found`));
        }
        try {
            this._onWillExecuteCommand.fire({ commandId: id, args });
            const result = this._instantiationService.invokeFunction.apply(this._instantiationService, [
                command.handler,
                ...args,
            ]);
            this._onDidExecuteCommand.fire({ commandId: id, args });
            return Promise.resolve(result);
        }
        catch (err) {
            return Promise.reject(err);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yVGVzdFNlcnZpY2VzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9icm93c2VyL2VkaXRvclRlc3RTZXJ2aWNlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sK0JBQStCLENBQUE7QUFFOUQsT0FBTyxFQUNOLHlCQUF5QixFQUN6QixnQkFBZ0IsR0FDaEIsTUFBTSxxREFBcUQsQ0FBQTtBQUM1RCxPQUFPLEVBQ04sZ0JBQWdCLEdBR2hCLE1BQU0sK0NBQStDLENBQUE7QUFJdEQsTUFBTSxPQUFPLHFCQUFzQixTQUFRLHlCQUF5QjtJQUFwRTs7UUFDaUIscUJBQWdCLEdBQUcsSUFBSSxvQkFBb0IsRUFBRSxDQUFBO0lBa0I5RCxDQUFDO0lBaEJtQix1QkFBdUI7UUFDekMsT0FBTyxJQUFJLENBQUMsZ0JBQWdCLENBQUE7SUFDN0IsQ0FBQztJQUVELG1CQUFtQjtRQUNsQixPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFFUSxjQUFjLENBQ3RCLEtBQTJCLEVBQzNCLE1BQTBCLEVBQzFCLFVBQW9CO1FBRXBCLElBQUksQ0FBQyxTQUFTLEdBQUcsS0FBSyxDQUFBO1FBQ3RCLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUM3QixDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sb0JBQXFCLFNBQVEsZ0JBQWdCO0lBR3pEO1FBQ0MsS0FBSyxDQUFDLElBQUssQ0FBQyxDQUFBO1FBSE4sVUFBSyxHQUFhLEVBQUUsQ0FBQTtJQUkzQixDQUFDO0lBRWUsVUFBVSxDQUFDLFFBQWdCLEVBQUUsSUFBWTtRQUN4RCxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLFFBQVEsS0FBSyxJQUFJLEdBQUcsQ0FBQyxDQUFBO0lBQzVDLENBQUM7SUFFZSw2QkFBNkIsQ0FBQyxRQUFnQjtRQUM3RCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUM1QyxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO2dCQUMxQyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBQ3ZCLENBQUMsRUFBRSxDQUFBO1lBQ0osQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRU0sSUFBSTtRQUNWLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDN0IsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLGtCQUFrQjtJQVc5QixZQUFZLG9CQUEyQztRQU50QywwQkFBcUIsR0FBRyxJQUFJLE9BQU8sRUFBaUIsQ0FBQTtRQUNyRCx5QkFBb0IsR0FBeUIsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEtBQUssQ0FBQTtRQUU1RSx5QkFBb0IsR0FBRyxJQUFJLE9BQU8sRUFBaUIsQ0FBQTtRQUNwRCx3QkFBbUIsR0FBeUIsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEtBQUssQ0FBQTtRQUcxRixJQUFJLENBQUMscUJBQXFCLEdBQUcsb0JBQW9CLENBQUE7SUFDbEQsQ0FBQztJQUVNLGNBQWMsQ0FBSSxFQUFVLEVBQUUsR0FBRyxJQUFXO1FBQ2xELE1BQU0sT0FBTyxHQUFHLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUMvQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDZCxPQUFPLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxLQUFLLENBQUMsWUFBWSxFQUFFLGFBQWEsQ0FBQyxDQUFDLENBQUE7UUFDOUQsQ0FBQztRQUVELElBQUksQ0FBQztZQUNKLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsRUFBRSxTQUFTLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7WUFDeEQsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLHFCQUFxQixFQUFFO2dCQUMxRixPQUFPLENBQUMsT0FBTztnQkFDZixHQUFHLElBQUk7YUFDUCxDQUFNLENBQUE7WUFDUCxJQUFJLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLEVBQUUsU0FBUyxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1lBQ3ZELE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUMvQixDQUFDO1FBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQztZQUNkLE9BQU8sT0FBTyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUMzQixDQUFDO0lBQ0YsQ0FBQztDQUNEIn0=