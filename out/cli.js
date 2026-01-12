/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './bootstrap-cli.js'; // this MUST come before other imports as it changes global state
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { configurePortable } from './bootstrap-node.js';
import { bootstrapESM } from './bootstrap-esm.js';
import { resolveNLSConfiguration } from './vs/base/node/nls.js';
import { product } from './bootstrap-meta.js';
const __dirname = dirname(fileURLToPath(import.meta.url));
// NLS
const nlsConfiguration = await resolveNLSConfiguration({
    userLocale: 'en',
    osLocale: 'en',
    commit: product.commit,
    userDataPath: '',
    nlsMetadataPath: __dirname,
});
process.env['VSCODE_NLS_CONFIG'] = JSON.stringify(nlsConfiguration); // required for `bootstrap-esm` to pick up NLS messages
// Enable portable support
configurePortable(product);
// Signal processes that we got launched as CLI
process.env['VSCODE_CLI'] = '1';
// Bootstrap ESM
await bootstrapESM();
// Load Server
await import('./vs/code/node/cli.js');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJjbGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxvQkFBb0IsQ0FBQSxDQUFDLGlFQUFpRTtBQUM3RixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sTUFBTSxDQUFBO0FBQzlCLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxLQUFLLENBQUE7QUFDbkMsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFDdkQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQ2pELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQy9ELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUU3QyxNQUFNLFNBQVMsR0FBRyxPQUFPLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtBQUV6RCxNQUFNO0FBQ04sTUFBTSxnQkFBZ0IsR0FBRyxNQUFNLHVCQUF1QixDQUFDO0lBQ3RELFVBQVUsRUFBRSxJQUFJO0lBQ2hCLFFBQVEsRUFBRSxJQUFJO0lBQ2QsTUFBTSxFQUFFLE9BQU8sQ0FBQyxNQUFNO0lBQ3RCLFlBQVksRUFBRSxFQUFFO0lBQ2hCLGVBQWUsRUFBRSxTQUFTO0NBQzFCLENBQUMsQ0FBQTtBQUNGLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUJBQW1CLENBQUMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLGdCQUFnQixDQUFDLENBQUEsQ0FBQyx1REFBdUQ7QUFFM0gsMEJBQTBCO0FBQzFCLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxDQUFBO0FBRTFCLCtDQUErQztBQUMvQyxPQUFPLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxHQUFHLEdBQUcsQ0FBQTtBQUUvQixnQkFBZ0I7QUFDaEIsTUFBTSxZQUFZLEVBQUUsQ0FBQTtBQUVwQixjQUFjO0FBQ2QsTUFBTSxNQUFNLENBQUMsdUJBQXVCLENBQUMsQ0FBQSJ9