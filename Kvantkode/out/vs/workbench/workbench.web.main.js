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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2JlbmNoLndlYi5tYWluLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvd29ya2JlbmNoLndlYi5tYWluLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7O2dHQUdnRztBQUVoRyx1Q0FBdUM7QUFDdkMsdUNBQXVDO0FBQ3ZDLHVDQUF1QztBQUN2Qyx1Q0FBdUM7QUFDdkMsdUNBQXVDO0FBRXZDLGdFQUFnRTtBQUVoRSxDQUFDO0FBQUEsQ0FBQztJQW1ERCxZQUFZO0lBRVosTUFBTSxNQUFNLEdBQW1CLFVBQWtCLENBQUMsTUFBTSxDQUFBO0lBQ3hELE1BQU0sT0FBTyxHQUF1QyxVQUFrQixDQUFDLE9BQU8sQ0FBQTtJQUU5RSxJQUFJLENBQUMsTUFBTSxJQUFJLENBQUMsT0FBTyxJQUFJLE9BQU8sT0FBTyxDQUFDLFNBQVMsS0FBSyxVQUFVLEVBQUUsQ0FBQztRQUNwRSxNQUFNLElBQUksS0FBSyxDQUNkLG1HQUFtRyxDQUNuRyxDQUFBO0lBQ0YsQ0FBQztJQUVELElBQUksT0FBTyxHQUFHLE9BQU8sRUFBRSxTQUFTLEVBQUUsQ0FBQyxPQUFPLENBQUE7SUFDMUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2QsTUFBTSxJQUFJLEtBQUssQ0FDZCx5RkFBeUYsQ0FDekYsQ0FBQTtJQUNGLENBQUM7SUFDRCxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO1FBQzVCLE9BQU8sR0FBRyxPQUFPLEdBQUcsR0FBRyxDQUFBO0lBQ3hCLENBQUM7SUFDRCxVQUFVLENBQUMsaUJBQWlCLEdBQUcsT0FBTyxDQUFBO0lBRXRDLE1BQU0sa0JBQWtCLEdBS1QsT0FBTyxDQUFDLFNBQVMsRUFBRSxDQUFDLGtCQUFrQixDQUFBO0lBQ3JELElBQUksa0JBQWtCLEVBQUUsQ0FBQztRQUN4QixVQUFVLENBQUMsdUJBQXVCLEdBQUcsa0JBQWtCLENBQUE7SUFDeEQsQ0FBQztJQUVELE1BQU0sT0FBTyxHQUFHLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUU7UUFDdkMsQ0FBQztRQUFDLFVBQWtCLENBQUMsd0JBQXdCLEdBQUcsT0FBTyxDQUFBO0lBQ3hELENBQUMsQ0FBQyxDQUFBO0lBRUYsTUFBTSxDQUFDLFlBQVksRUFBRSxFQUFFLEVBQUUsR0FBa0IsRUFBRTtRQUM1QyxPQUFPO1lBQ04sSUFBSSxFQUFFLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLEVBQUU7Z0JBQ3JDLE1BQU0sTUFBTSxHQUFRLFFBQVEsQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUE7Z0JBQ3BELE1BQU0sQ0FBQyxJQUFJLEdBQUcsUUFBUSxDQUFBO2dCQUN0QixNQUFNLENBQUMsR0FBRyxHQUFHLGtCQUFrQjtvQkFDOUIsQ0FBQyxDQUFFLGtCQUFrQixDQUFDLGVBQWUsQ0FDbkMsR0FBRyxPQUFPLDZDQUE2QyxDQUNyQztvQkFDcEIsQ0FBQyxDQUFDLEdBQUcsT0FBTyw2Q0FBNkMsQ0FBQTtnQkFDMUQsUUFBUSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUE7Z0JBRWpDLE9BQU8sT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7WUFDekMsQ0FBQztTQUNELENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUVGLE1BQU0sQ0FBQyxpQ0FBaUMsRUFBRSxDQUFDLFNBQVMsRUFBRSxTQUFTLEVBQUUsYUFBYSxDQUFDLEVBQUUsVUFDaEYsUUFBUSxFQUNSLE9BQU8sRUFDUCxNQUFNO1FBRU4sTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUE7SUFDL0IsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDLENBQUMsRUFBRSxDQUFBIn0=