/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class CursorContext {
    constructor(model, viewModel, coordinatesConverter, cursorConfig) {
        this._cursorContextBrand = undefined;
        this.model = model;
        this.viewModel = viewModel;
        this.coordinatesConverter = coordinatesConverter;
        this.cursorConfig = cursorConfig;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Vyc29yQ29udGV4dC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vY3Vyc29yL2N1cnNvckNvbnRleHQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFNaEcsTUFBTSxPQUFPLGFBQWE7SUFRekIsWUFDQyxLQUFpQixFQUNqQixTQUE2QixFQUM3QixvQkFBMkMsRUFDM0MsWUFBaUM7UUFYbEMsd0JBQW1CLEdBQVMsU0FBUyxDQUFBO1FBYXBDLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFBO1FBQ2xCLElBQUksQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFBO1FBQzFCLElBQUksQ0FBQyxvQkFBb0IsR0FBRyxvQkFBb0IsQ0FBQTtRQUNoRCxJQUFJLENBQUMsWUFBWSxHQUFHLFlBQVksQ0FBQTtJQUNqQyxDQUFDO0NBQ0QifQ==