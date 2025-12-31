/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export function showHistoryKeybindingHint(keybindingService) {
    return (keybindingService.lookupKeybinding('history.showPrevious')?.getElectronAccelerator() === 'Up' &&
        keybindingService.lookupKeybinding('history.showNext')?.getElectronAccelerator() === 'Down');
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGlzdG9yeVdpZGdldEtleWJpbmRpbmdIaW50LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vaGlzdG9yeS9icm93c2VyL2hpc3RvcnlXaWRnZXRLZXliaW5kaW5nSGludC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUloRyxNQUFNLFVBQVUseUJBQXlCLENBQUMsaUJBQXFDO0lBQzlFLE9BQU8sQ0FDTixpQkFBaUIsQ0FBQyxnQkFBZ0IsQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFLHNCQUFzQixFQUFFLEtBQUssSUFBSTtRQUM3RixpQkFBaUIsQ0FBQyxnQkFBZ0IsQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFLHNCQUFzQixFQUFFLEtBQUssTUFBTSxDQUMzRixDQUFBO0FBQ0YsQ0FBQyJ9