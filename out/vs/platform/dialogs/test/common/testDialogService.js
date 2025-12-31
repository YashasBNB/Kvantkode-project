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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdERpYWxvZ1NlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9kaWFsb2dzL3Rlc3QvY29tbW9uL3Rlc3REaWFsb2dTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN4RCxPQUFPLFFBQVEsTUFBTSxxQ0FBcUMsQ0FBQTtBQWMxRCxNQUFNLE9BQU8saUJBQWlCO0lBTTdCLFlBQ1MsdUJBQXdELFNBQVMsRUFDakUsc0JBQXNELFNBQVM7UUFEL0QseUJBQW9CLEdBQXBCLG9CQUFvQixDQUE2QztRQUNqRSx3QkFBbUIsR0FBbkIsbUJBQW1CLENBQTRDO1FBTC9ELHFCQUFnQixHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUE7UUFDN0Isb0JBQWUsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFBO1FBTzdCLGtCQUFhLEdBQW9DLFNBQVMsQ0FBQTtJQUYvRCxDQUFDO0lBR0osZ0JBQWdCLENBQUMsTUFBMkI7UUFDM0MsSUFBSSxDQUFDLGFBQWEsR0FBRyxNQUFNLENBQUE7SUFDNUIsQ0FBQztJQUVELEtBQUssQ0FBQyxPQUFPLENBQUMsWUFBMkI7UUFDeEMsSUFBSSxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDeEIsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQTtZQUN4QyxJQUFJLENBQUMsYUFBYSxHQUFHLFNBQVMsQ0FBQTtZQUU5QixPQUFPLGFBQWEsQ0FBQTtRQUNyQixDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUMsb0JBQW9CLElBQUksRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLENBQUE7SUFDekQsQ0FBQztJQUtELEtBQUssQ0FBQyxNQUFNLENBQ1gsTUFBK0M7UUFFL0MsSUFBSSxJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztZQUM5QixPQUFPLElBQUksQ0FBQyxtQkFBbUIsQ0FBQTtRQUNoQyxDQUFDO1FBQ0QsTUFBTSxhQUFhLEdBQTJCLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxPQUFPLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN6RSxJQUNDLE1BQU0sQ0FBQyxZQUFZO1lBQ25CLE9BQU8sTUFBTSxDQUFDLFlBQVksS0FBSyxRQUFRO1lBQ3ZDLE9BQU8sTUFBTSxDQUFDLFlBQVksS0FBSyxTQUFTLEVBQ3ZDLENBQUM7WUFDRixhQUFhLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUN4QyxDQUFDO1FBRUQsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGFBQWEsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsRUFBRSxlQUFlLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxDQUFBO0lBQzNFLENBQUM7SUFDRCxLQUFLLENBQUMsSUFBSSxDQUFDLE9BQWUsRUFBRSxNQUFlO1FBQzFDLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksRUFBRSxRQUFRLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFBO0lBQzVELENBQUM7SUFFRCxLQUFLLENBQUMsSUFBSSxDQUFDLE9BQWUsRUFBRSxNQUFlO1FBQzFDLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksRUFBRSxRQUFRLENBQUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFBO0lBQy9ELENBQUM7SUFFRCxLQUFLLENBQUMsS0FBSyxDQUFDLE9BQWUsRUFBRSxNQUFlO1FBQzNDLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksRUFBRSxRQUFRLENBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFBO0lBQzdELENBQUM7SUFDRCxLQUFLLENBQUMsS0FBSztRQUNWLENBQUM7WUFDQSxPQUFPLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFLENBQUE7UUFDdkMsQ0FBQztJQUNGLENBQUM7SUFDRCxLQUFLLENBQUMsS0FBSyxLQUFtQixDQUFDO0NBQy9CIn0=