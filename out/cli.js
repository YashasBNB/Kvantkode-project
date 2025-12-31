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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsiY2xpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sb0JBQW9CLENBQUEsQ0FBQyxpRUFBaUU7QUFDN0YsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLE1BQU0sQ0FBQTtBQUM5QixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sS0FBSyxDQUFBO0FBQ25DLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBQ3ZELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUNqRCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFFN0MsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7QUFFekQsTUFBTTtBQUNOLE1BQU0sZ0JBQWdCLEdBQUcsTUFBTSx1QkFBdUIsQ0FBQztJQUN0RCxVQUFVLEVBQUUsSUFBSTtJQUNoQixRQUFRLEVBQUUsSUFBSTtJQUNkLE1BQU0sRUFBRSxPQUFPLENBQUMsTUFBTTtJQUN0QixZQUFZLEVBQUUsRUFBRTtJQUNoQixlQUFlLEVBQUUsU0FBUztDQUMxQixDQUFDLENBQUE7QUFDRixPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFtQixDQUFDLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBLENBQUMsdURBQXVEO0FBRTNILDBCQUEwQjtBQUMxQixpQkFBaUIsQ0FBQyxPQUFPLENBQUMsQ0FBQTtBQUUxQiwrQ0FBK0M7QUFDL0MsT0FBTyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsR0FBRyxHQUFHLENBQUE7QUFFL0IsZ0JBQWdCO0FBQ2hCLE1BQU0sWUFBWSxFQUFFLENBQUE7QUFFcEIsY0FBYztBQUNkLE1BQU0sTUFBTSxDQUFDLHVCQUF1QixDQUFDLENBQUEifQ==