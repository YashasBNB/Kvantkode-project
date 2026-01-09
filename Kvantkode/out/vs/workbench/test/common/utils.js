/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { LanguagesRegistry } from '../../../editor/common/services/languagesRegistry.js';
/**
 * This function is called before test running and also again at the end of test running
 * and can be used to add assertions. e.g. that registries are empty, etc.
 *
 * !! This is called directly by the testing framework.
 *
 * @skipMangle
 */
export function assertCleanState() {
    // If this test fails, it is a clear indication that
    // your test or suite is leaking services (e.g. via leaking text models)
    // assert.strictEqual(LanguageService.instanceCount, 0, 'No leaking ILanguageService');
    assert.strictEqual(LanguagesRegistry.instanceCount, 0, 'Error: Test run should not leak in LanguagesRegistry.');
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC90ZXN0L2NvbW1vbi91dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFFeEY7Ozs7Ozs7R0FPRztBQUNILE1BQU0sVUFBVSxnQkFBZ0I7SUFDL0Isb0RBQW9EO0lBQ3BELHdFQUF3RTtJQUN4RSx1RkFBdUY7SUFDdkYsTUFBTSxDQUFDLFdBQVcsQ0FDakIsaUJBQWlCLENBQUMsYUFBYSxFQUMvQixDQUFDLEVBQ0QsdURBQXVELENBQ3ZELENBQUE7QUFDRixDQUFDIn0=