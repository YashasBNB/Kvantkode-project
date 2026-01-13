/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Event } from '../../../../base/common/event.js';
import Severity from '../../../../base/common/severity.js';
export class TestDialogService {
    constructor(defaultConfirmResult = undefined, defaultPromptResult = undefined) {
        this.defaultConfirmResult = defaultConfirmResult;
        this.defaultPromptResult = defaultPromptResult;
        this.onWillShowDialog = Event.None;
        this.onDidShowDialog = Event.None;
        this.confirmResult = undefined;
    }
    setConfirmResult(result) {
        this.confirmResult = result;
    }
    async confirm(confirmation) {
        if (this.confirmResult) {
            const confirmResult = this.confirmResult;
            this.confirmResult = undefined;
            return confirmResult;
        }
        return this.defaultConfirmResult ?? { confirmed: false };
    }
    async prompt(prompt) {
        if (this.defaultPromptResult) {
            return this.defaultPromptResult;
        }
        const promptButtons = [...(prompt.buttons ?? [])];
        if (prompt.cancelButton &&
            typeof prompt.cancelButton !== 'string' &&
            typeof prompt.cancelButton !== 'boolean') {
            promptButtons.push(prompt.cancelButton);
        }
        return { result: await promptButtons[0]?.run({ checkboxChecked: false }) };
    }
    async info(message, detail) {
        await this.prompt({ type: Severity.Info, message, detail });
    }
    async warn(message, detail) {
        await this.prompt({ type: Severity.Warning, message, detail });
    }
    async error(message, detail) {
        await this.prompt({ type: Severity.Error, message, detail });
    }
    async input() {
        {
            return { confirmed: true, values: [] };
        }
    }
    async about() { }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdERpYWxvZ1NlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2RpYWxvZ3MvdGVzdC9jb21tb24vdGVzdERpYWxvZ1NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3hELE9BQU8sUUFBUSxNQUFNLHFDQUFxQyxDQUFBO0FBYzFELE1BQU0sT0FBTyxpQkFBaUI7SUFNN0IsWUFDUyx1QkFBd0QsU0FBUyxFQUNqRSxzQkFBc0QsU0FBUztRQUQvRCx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQTZDO1FBQ2pFLHdCQUFtQixHQUFuQixtQkFBbUIsQ0FBNEM7UUFML0QscUJBQWdCLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQTtRQUM3QixvQkFBZSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUE7UUFPN0Isa0JBQWEsR0FBb0MsU0FBUyxDQUFBO0lBRi9ELENBQUM7SUFHSixnQkFBZ0IsQ0FBQyxNQUEyQjtRQUMzQyxJQUFJLENBQUMsYUFBYSxHQUFHLE1BQU0sQ0FBQTtJQUM1QixDQUFDO0lBRUQsS0FBSyxDQUFDLE9BQU8sQ0FBQyxZQUEyQjtRQUN4QyxJQUFJLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUN4QixNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFBO1lBQ3hDLElBQUksQ0FBQyxhQUFhLEdBQUcsU0FBUyxDQUFBO1lBRTlCLE9BQU8sYUFBYSxDQUFBO1FBQ3JCLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyxvQkFBb0IsSUFBSSxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsQ0FBQTtJQUN6RCxDQUFDO0lBS0QsS0FBSyxDQUFDLE1BQU0sQ0FDWCxNQUErQztRQUUvQyxJQUFJLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO1lBQzlCLE9BQU8sSUFBSSxDQUFDLG1CQUFtQixDQUFBO1FBQ2hDLENBQUM7UUFDRCxNQUFNLGFBQWEsR0FBMkIsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLE9BQU8sSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3pFLElBQ0MsTUFBTSxDQUFDLFlBQVk7WUFDbkIsT0FBTyxNQUFNLENBQUMsWUFBWSxLQUFLLFFBQVE7WUFDdkMsT0FBTyxNQUFNLENBQUMsWUFBWSxLQUFLLFNBQVMsRUFDdkMsQ0FBQztZQUNGLGFBQWEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFBO1FBQ3hDLENBQUM7UUFFRCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sYUFBYSxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxFQUFFLGVBQWUsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUE7SUFDM0UsQ0FBQztJQUNELEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBZSxFQUFFLE1BQWU7UUFDMUMsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUE7SUFDNUQsQ0FBQztJQUVELEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBZSxFQUFFLE1BQWU7UUFDMUMsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUE7SUFDL0QsQ0FBQztJQUVELEtBQUssQ0FBQyxLQUFLLENBQUMsT0FBZSxFQUFFLE1BQWU7UUFDM0MsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxLQUFLLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUE7SUFDN0QsQ0FBQztJQUNELEtBQUssQ0FBQyxLQUFLO1FBQ1YsQ0FBQztZQUNBLE9BQU8sRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUUsQ0FBQTtRQUN2QyxDQUFDO0lBQ0YsQ0FBQztJQUNELEtBQUssQ0FBQyxLQUFLLEtBQW1CLENBQUM7Q0FDL0IifQ==