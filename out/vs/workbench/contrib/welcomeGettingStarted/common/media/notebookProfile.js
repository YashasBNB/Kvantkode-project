/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { escape } from '../../../../../base/common/strings.js';
import { localize } from '../../../../../nls.js';
const profileArg = (profile) => encodeURIComponent(JSON.stringify({ profile }));
const imageSize = 400;
export default () => `
<vertically-centered>
<checklist>
	<checkbox on-checked="command:notebook.setProfile?${profileArg('default')}" checked-on="config.notebook.cellFocusIndicator == 'border' && config.notebook.insertToolbarLocation == 'both' && config.notebook.globalToolbar == false && config.notebook.compactView == true && config.notebook.showCellStatusBar == 'visible'">
		<img width="${imageSize}" src="./notebookThemes/default.png"/>
		${escape(localize('default', 'Default'))}
	</checkbox>
	<checkbox on-checked="command:notebook.setProfile?${profileArg('jupyter')}" checked-on="config.notebook.cellFocusIndicator == 'gutter' && config.notebook.insertToolbarLocation == 'notebookToolbar' && config.notebook.globalToolbar == true && config.notebook.compactView == true  && config.notebook.showCellStatusBar == 'visible'">
		<img width="${imageSize}" src="./notebookThemes/jupyter.png"/>
		${escape(localize('jupyter', 'Jupyter'))}
	</checkbox>
	<checkbox on-checked="command:notebook.setProfile?${profileArg('colab')}" checked-on="config.notebook.cellFocusIndicator == 'border' && config.notebook.insertToolbarLocation == 'betweenCells' && config.notebook.globalToolbar == false && config.notebook.compactView == false && config.notebook.showCellStatusBar == 'hidden'">
		<img width="${imageSize}" src="./notebookThemes/colab.png"/>
		${escape(localize('colab', 'Colab'))}
	</checkbox>
</checklist>
</vertically-centered>
`;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tQcm9maWxlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi93ZWxjb21lR2V0dGluZ1N0YXJ0ZWQvY29tbW9uL21lZGlhL25vdGVib29rUHJvZmlsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDOUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBRWhELE1BQU0sVUFBVSxHQUFHLENBQUMsT0FBZSxFQUFFLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFBO0FBQ3ZGLE1BQU0sU0FBUyxHQUFHLEdBQUcsQ0FBQTtBQUVyQixlQUFlLEdBQUcsRUFBRSxDQUFDOzs7cURBR2dDLFVBQVUsQ0FBQyxTQUFTLENBQUM7Z0JBQzFELFNBQVM7SUFDckIsTUFBTSxDQUFDLFFBQVEsQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUM7O3FEQUVXLFVBQVUsQ0FBQyxTQUFTLENBQUM7Z0JBQzFELFNBQVM7SUFDckIsTUFBTSxDQUFDLFFBQVEsQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUM7O3FEQUVXLFVBQVUsQ0FBQyxPQUFPLENBQUM7Z0JBQ3hELFNBQVM7SUFDckIsTUFBTSxDQUFDLFFBQVEsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUM7Ozs7Q0FJckMsQ0FBQSJ9