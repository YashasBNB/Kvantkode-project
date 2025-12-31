/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { randomPath } from '../../common/extpath.js';
import { join } from '../../common/path.js';
import * as testUtils from '../common/testUtils.js';
export function getRandomTestPath(tmpdir, ...segments) {
    return randomPath(join(tmpdir, ...segments));
}
export var flakySuite = testUtils.flakySuite;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdFV0aWxzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS90ZXN0L25vZGUvdGVzdFV0aWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sc0JBQXNCLENBQUE7QUFDM0MsT0FBTyxLQUFLLFNBQVMsTUFBTSx3QkFBd0IsQ0FBQTtBQUVuRCxNQUFNLFVBQVUsaUJBQWlCLENBQUMsTUFBYyxFQUFFLEdBQUcsUUFBa0I7SUFDdEUsT0FBTyxVQUFVLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUE7QUFDN0MsQ0FBQztBQUVELE1BQU0sS0FBUSxVQUFVLEdBQUcsU0FBUyxDQUFDLFVBQVUsQ0FBQSJ9