/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { PLAINTEXT_LANGUAGE_ID } from '../../../common/languages/modesRegistry.js';
import { LanguageService } from '../../../common/services/languageService.js';
suite('LanguageService', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('LanguageSelection does not leak a disposable', () => {
        const languageService = new LanguageService();
        const languageSelection1 = languageService.createById(PLAINTEXT_LANGUAGE_ID);
        assert.strictEqual(languageSelection1.languageId, PLAINTEXT_LANGUAGE_ID);
        const languageSelection2 = languageService.createById(PLAINTEXT_LANGUAGE_ID);
        const listener = languageSelection2.onDidChange(() => { });
        assert.strictEqual(languageSelection2.languageId, PLAINTEXT_LANGUAGE_ID);
        listener.dispose();
        languageService.dispose();
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VTZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9jb21tb24vc2VydmljZXMvbGFuZ3VhZ2VTZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9GLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUU3RSxLQUFLLENBQUMsaUJBQWlCLEVBQUUsR0FBRyxFQUFFO0lBQzdCLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsSUFBSSxDQUFDLDhDQUE4QyxFQUFFLEdBQUcsRUFBRTtRQUN6RCxNQUFNLGVBQWUsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO1FBQzdDLE1BQU0sa0JBQWtCLEdBQUcsZUFBZSxDQUFDLFVBQVUsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFBO1FBQzVFLE1BQU0sQ0FBQyxXQUFXLENBQUMsa0JBQWtCLENBQUMsVUFBVSxFQUFFLHFCQUFxQixDQUFDLENBQUE7UUFDeEUsTUFBTSxrQkFBa0IsR0FBRyxlQUFlLENBQUMsVUFBVSxDQUFDLHFCQUFxQixDQUFDLENBQUE7UUFDNUUsTUFBTSxRQUFRLEdBQUcsa0JBQWtCLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBRSxHQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3pELE1BQU0sQ0FBQyxXQUFXLENBQUMsa0JBQWtCLENBQUMsVUFBVSxFQUFFLHFCQUFxQixDQUFDLENBQUE7UUFDeEUsUUFBUSxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQ2xCLGVBQWUsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUMxQixDQUFDLENBQUMsQ0FBQTtBQUNILENBQUMsQ0FBQyxDQUFBIn0=