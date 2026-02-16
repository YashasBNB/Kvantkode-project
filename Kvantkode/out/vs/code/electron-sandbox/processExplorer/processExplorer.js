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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvY2Vzc0V4cGxvcmVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9jb2RlL2VsZWN0cm9uLXNhbmRib3gvcHJvY2Vzc0V4cGxvcmVyL3Byb2Nlc3NFeHBsb3Jlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7OztnR0FHZ0c7QUFFaEcsMENBQTBDO0FBRTFDLENBQUM7QUFBQSxDQUFDLEtBQUs7SUFPTixNQUFNLGVBQWUsR0FBc0IsTUFBYyxDQUFDLHFCQUFxQixDQUFBLENBQUMsaUNBQWlDO0lBRWpILE1BQU0sRUFBRSxNQUFNLEVBQUUsYUFBYSxFQUFFLEdBQUcsTUFBTSxlQUFlLENBQUMsSUFBSSxDQUcxRCw4REFBOEQsRUFBRTtRQUNqRSwwQkFBMEIsRUFBRTtZQUMzQixPQUFPO2dCQUNOLCtCQUErQixFQUFFLElBQUk7YUFDckMsQ0FBQTtRQUNGLENBQUM7S0FDRCxDQUFDLENBQUE7SUFFRixNQUFNLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFBO0FBQzlCLENBQUMsQ0FBQyxFQUFFLENBQUEifQ==