"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/* eslint-disable no-restricted-globals */
;
(async function () {
    const bootstrapWindow = window.MonacoBootstrapWindow; // defined by bootstrap-window.ts
    const { result, configuration } = await bootstrapWindow.load('vs/code/electron-sandbox/processExplorer/processExplorerMain', {
        configureDeveloperSettings: function () {
            return {
                forceEnableDeveloperKeybindings: true,
            };
        },
    });
    result.startup(configuration);
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvY2Vzc0V4cGxvcmVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvY29kZS9lbGVjdHJvbi1zYW5kYm94L3Byb2Nlc3NFeHBsb3Jlci9wcm9jZXNzRXhwbG9yZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Z0dBR2dHO0FBRWhHLDBDQUEwQztBQUUxQyxDQUFDO0FBQUEsQ0FBQyxLQUFLO0lBT04sTUFBTSxlQUFlLEdBQXNCLE1BQWMsQ0FBQyxxQkFBcUIsQ0FBQSxDQUFDLGlDQUFpQztJQUVqSCxNQUFNLEVBQUUsTUFBTSxFQUFFLGFBQWEsRUFBRSxHQUFHLE1BQU0sZUFBZSxDQUFDLElBQUksQ0FHMUQsOERBQThELEVBQUU7UUFDakUsMEJBQTBCLEVBQUU7WUFDM0IsT0FBTztnQkFDTiwrQkFBK0IsRUFBRSxJQUFJO2FBQ3JDLENBQUE7UUFDRixDQUFDO0tBQ0QsQ0FBQyxDQUFBO0lBRUYsTUFBTSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsQ0FBQTtBQUM5QixDQUFDLENBQUMsRUFBRSxDQUFBIn0=