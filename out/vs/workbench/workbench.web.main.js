"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// ####################################
// ###                              ###
// ### !!! PLEASE DO NOT MODIFY !!! ###
// ###                              ###
// ####################################
// TODO@esm remove me once we stop supporting our web-esm-bridge
;
(function () {
    //#endregion
    const define = globalThis.define;
    const require = globalThis.require;
    if (!define || !require || typeof require.getConfig !== 'function') {
        throw new Error('Expected global define() and require() functions. Please only load this module in an AMD context!');
    }
    let baseUrl = require?.getConfig().baseUrl;
    if (!baseUrl) {
        throw new Error('Failed to determine baseUrl for loading AMD modules (tried require.getConfig().baseUrl)');
    }
    if (!baseUrl.endsWith('/')) {
        baseUrl = baseUrl + '/';
    }
    globalThis._VSCODE_FILE_ROOT = baseUrl;
    const trustedTypesPolicy = require.getConfig().trustedTypesPolicy;
    if (trustedTypesPolicy) {
        globalThis._VSCODE_WEB_PACKAGE_TTP = trustedTypesPolicy;
    }
    const promise = new Promise((resolve) => {
        ;
        globalThis.__VSCODE_WEB_ESM_PROMISE = resolve;
    });
    define('vs/web-api', [], () => {
        return {
            load: (_name, _req, _load, _config) => {
                const script = document.createElement('script');
                script.type = 'module';
                script.src = trustedTypesPolicy
                    ? trustedTypesPolicy.createScriptURL(`${baseUrl}vs/workbench/workbench.web.main.internal.js`)
                    : `${baseUrl}vs/workbench/workbench.web.main.internal.js`;
                document.head.appendChild(script);
                return promise.then((mod) => _load(mod));
            },
        };
    });
    define('vs/workbench/workbench.web.main', ['require', 'exports', 'vs/web-api!'], function (_require, exports, webApi) {
        Object.assign(exports, webApi);
    });
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2JlbmNoLndlYi5tYWluLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3dvcmtiZW5jaC53ZWIubWFpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7OztnR0FHZ0c7QUFFaEcsdUNBQXVDO0FBQ3ZDLHVDQUF1QztBQUN2Qyx1Q0FBdUM7QUFDdkMsdUNBQXVDO0FBQ3ZDLHVDQUF1QztBQUV2QyxnRUFBZ0U7QUFFaEUsQ0FBQztBQUFBLENBQUM7SUFtREQsWUFBWTtJQUVaLE1BQU0sTUFBTSxHQUFtQixVQUFrQixDQUFDLE1BQU0sQ0FBQTtJQUN4RCxNQUFNLE9BQU8sR0FBdUMsVUFBa0IsQ0FBQyxPQUFPLENBQUE7SUFFOUUsSUFBSSxDQUFDLE1BQU0sSUFBSSxDQUFDLE9BQU8sSUFBSSxPQUFPLE9BQU8sQ0FBQyxTQUFTLEtBQUssVUFBVSxFQUFFLENBQUM7UUFDcEUsTUFBTSxJQUFJLEtBQUssQ0FDZCxtR0FBbUcsQ0FDbkcsQ0FBQTtJQUNGLENBQUM7SUFFRCxJQUFJLE9BQU8sR0FBRyxPQUFPLEVBQUUsU0FBUyxFQUFFLENBQUMsT0FBTyxDQUFBO0lBQzFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNkLE1BQU0sSUFBSSxLQUFLLENBQ2QseUZBQXlGLENBQ3pGLENBQUE7SUFDRixDQUFDO0lBQ0QsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztRQUM1QixPQUFPLEdBQUcsT0FBTyxHQUFHLEdBQUcsQ0FBQTtJQUN4QixDQUFDO0lBQ0QsVUFBVSxDQUFDLGlCQUFpQixHQUFHLE9BQU8sQ0FBQTtJQUV0QyxNQUFNLGtCQUFrQixHQUtULE9BQU8sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQTtJQUNyRCxJQUFJLGtCQUFrQixFQUFFLENBQUM7UUFDeEIsVUFBVSxDQUFDLHVCQUF1QixHQUFHLGtCQUFrQixDQUFBO0lBQ3hELENBQUM7SUFFRCxNQUFNLE9BQU8sR0FBRyxJQUFJLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFO1FBQ3ZDLENBQUM7UUFBQyxVQUFrQixDQUFDLHdCQUF3QixHQUFHLE9BQU8sQ0FBQTtJQUN4RCxDQUFDLENBQUMsQ0FBQTtJQUVGLE1BQU0sQ0FBQyxZQUFZLEVBQUUsRUFBRSxFQUFFLEdBQWtCLEVBQUU7UUFDNUMsT0FBTztZQUNOLElBQUksRUFBRSxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxFQUFFO2dCQUNyQyxNQUFNLE1BQU0sR0FBUSxRQUFRLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFBO2dCQUNwRCxNQUFNLENBQUMsSUFBSSxHQUFHLFFBQVEsQ0FBQTtnQkFDdEIsTUFBTSxDQUFDLEdBQUcsR0FBRyxrQkFBa0I7b0JBQzlCLENBQUMsQ0FBRSxrQkFBa0IsQ0FBQyxlQUFlLENBQ25DLEdBQUcsT0FBTyw2Q0FBNkMsQ0FDckM7b0JBQ3BCLENBQUMsQ0FBQyxHQUFHLE9BQU8sNkNBQTZDLENBQUE7Z0JBQzFELFFBQVEsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFBO2dCQUVqQyxPQUFPLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO1lBQ3pDLENBQUM7U0FDRCxDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUE7SUFFRixNQUFNLENBQUMsaUNBQWlDLEVBQUUsQ0FBQyxTQUFTLEVBQUUsU0FBUyxFQUFFLGFBQWEsQ0FBQyxFQUFFLFVBQ2hGLFFBQVEsRUFDUixPQUFPLEVBQ1AsTUFBTTtRQUVOLE1BQU0sQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFBO0lBQy9CLENBQUMsQ0FBQyxDQUFBO0FBQ0gsQ0FBQyxDQUFDLEVBQUUsQ0FBQSJ9