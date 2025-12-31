/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { URI } from '../../../../base/common/uri.js';
import { randomInt } from '../../../../base/common/numbers.js';
import { getCleanPromptName, isPromptFile } from '../../common/constants.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
suite('Prompt Constants', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    suite('• getCleanPromptName', () => {
        test('• returns a clean prompt name', () => {
            assert.strictEqual(getCleanPromptName(URI.file('/path/to/my-prompt.prompt.md')), 'my-prompt');
            assert.strictEqual(getCleanPromptName(URI.file('../common.prompt.md')), 'common');
            const expectedPromptName = `some-${randomInt(1000)}`;
            assert.strictEqual(getCleanPromptName(URI.file(`./${expectedPromptName}.prompt.md`)), expectedPromptName);
            assert.strictEqual(getCleanPromptName(URI.file('.github/copilot-instructions.md')), 'copilot-instructions');
        });
        test('• throws if not a prompt file URI provided', () => {
            assert.throws(() => {
                getCleanPromptName(URI.file('/path/to/default.prompt.md1'));
            });
            assert.throws(() => {
                getCleanPromptName(URI.file('./some.md'));
            });
            assert.throws(() => {
                getCleanPromptName(URI.file('../some-folder/frequent.txt'));
            });
            assert.throws(() => {
                getCleanPromptName(URI.file('/etc/prompts/my-prompt'));
            });
        });
    });
    suite('• isPromptFile', () => {
        test('• returns `true` for prompt files', () => {
            assert(isPromptFile(URI.file('/path/to/my-prompt.prompt.md')));
            assert(isPromptFile(URI.file('../common.prompt.md')));
            assert(isPromptFile(URI.file(`./some-${randomInt(1000)}.prompt.md`)));
            assert(isPromptFile(URI.file('.github/copilot-instructions.md')));
        });
        test('• returns `false` for non-prompt files', () => {
            assert(!isPromptFile(URI.file('/path/to/my-prompt.prompt.md1')));
            assert(!isPromptFile(URI.file('../common.md')));
            assert(!isPromptFile(URI.file(`./some-${randomInt(1000)}.txt`)));
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uc3RhbnRzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9wcm9tcHRzL3Rlc3QvY29tbW9uL2NvbnN0YW50cy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxZQUFZLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUM1RSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUUvRixLQUFLLENBQUMsa0JBQWtCLEVBQUUsR0FBRyxFQUFFO0lBQzlCLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsS0FBSyxDQUFDLHNCQUFzQixFQUFFLEdBQUcsRUFBRTtRQUNsQyxJQUFJLENBQUMsK0JBQStCLEVBQUUsR0FBRyxFQUFFO1lBQzFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLEVBQUUsV0FBVyxDQUFDLENBQUE7WUFFN0YsTUFBTSxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQTtZQUVqRixNQUFNLGtCQUFrQixHQUFHLFFBQVEsU0FBUyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUE7WUFDcEQsTUFBTSxDQUFDLFdBQVcsQ0FDakIsa0JBQWtCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLGtCQUFrQixZQUFZLENBQUMsQ0FBQyxFQUNqRSxrQkFBa0IsQ0FDbEIsQ0FBQTtZQUVELE1BQU0sQ0FBQyxXQUFXLENBQ2pCLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsaUNBQWlDLENBQUMsQ0FBQyxFQUMvRCxzQkFBc0IsQ0FDdEIsQ0FBQTtRQUNGLENBQUMsQ0FBQyxDQUFBO1FBRUYsSUFBSSxDQUFDLDRDQUE0QyxFQUFFLEdBQUcsRUFBRTtZQUN2RCxNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRTtnQkFDbEIsa0JBQWtCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDLENBQUE7WUFDNUQsQ0FBQyxDQUFDLENBQUE7WUFFRixNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRTtnQkFDbEIsa0JBQWtCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFBO1lBQzFDLENBQUMsQ0FBQyxDQUFBO1lBRUYsTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUU7Z0JBQ2xCLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsNkJBQTZCLENBQUMsQ0FBQyxDQUFBO1lBQzVELENBQUMsQ0FBQyxDQUFBO1lBRUYsTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUU7Z0JBQ2xCLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFBO1lBQ3ZELENBQUMsQ0FBQyxDQUFBO1FBQ0gsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQTtJQUVGLEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLEVBQUU7UUFDNUIsSUFBSSxDQUFDLG1DQUFtQyxFQUFFLEdBQUcsRUFBRTtZQUM5QyxNQUFNLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsOEJBQThCLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFFOUQsTUFBTSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxDQUFBO1lBRXJELE1BQU0sQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxVQUFVLFNBQVMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBRXJFLE1BQU0sQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNsRSxDQUFDLENBQUMsQ0FBQTtRQUVGLElBQUksQ0FBQyx3Q0FBd0MsRUFBRSxHQUFHLEVBQUU7WUFDbkQsTUFBTSxDQUFDLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsK0JBQStCLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFFaEUsTUFBTSxDQUFDLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBRS9DLE1BQU0sQ0FBQyxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFVBQVUsU0FBUyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDakUsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQTtBQUNILENBQUMsQ0FBQyxDQUFBIn0=