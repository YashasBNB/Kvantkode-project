/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class ViewLineOptions {
    constructor(config, themeType) {
        this.themeType = themeType;
        const options = config.options;
        const fontInfo = options.get(52 /* EditorOption.fontInfo */);
        const experimentalWhitespaceRendering = options.get(40 /* EditorOption.experimentalWhitespaceRendering */);
        if (experimentalWhitespaceRendering === 'off') {
            this.renderWhitespace = options.get(104 /* EditorOption.renderWhitespace */);
        }
        else {
            // whitespace is rendered in a different layer
            this.renderWhitespace = 'none';
        }
        this.renderControlCharacters = options.get(99 /* EditorOption.renderControlCharacters */);
        this.spaceWidth = fontInfo.spaceWidth;
        this.middotWidth = fontInfo.middotWidth;
        this.wsmiddotWidth = fontInfo.wsmiddotWidth;
        this.useMonospaceOptimizations =
            fontInfo.isMonospace && !options.get(33 /* EditorOption.disableMonospaceOptimizations */);
        this.canUseHalfwidthRightwardsArrow = fontInfo.canUseHalfwidthRightwardsArrow;
        this.lineHeight = options.get(68 /* EditorOption.lineHeight */);
        this.stopRenderingLineAfter = options.get(122 /* EditorOption.stopRenderingLineAfter */);
        this.fontLigatures = options.get(53 /* EditorOption.fontLigatures */);
        this.useGpu = options.get(39 /* EditorOption.experimentalGpuAcceleration */) === 'on';
    }
    equals(other) {
        return (this.themeType === other.themeType &&
            this.renderWhitespace === other.renderWhitespace &&
            this.renderControlCharacters === other.renderControlCharacters &&
            this.spaceWidth === other.spaceWidth &&
            this.middotWidth === other.middotWidth &&
            this.wsmiddotWidth === other.wsmiddotWidth &&
            this.useMonospaceOptimizations === other.useMonospaceOptimizations &&
            this.canUseHalfwidthRightwardsArrow === other.canUseHalfwidthRightwardsArrow &&
            this.lineHeight === other.lineHeight &&
            this.stopRenderingLineAfter === other.stopRenderingLineAfter &&
            this.fontLigatures === other.fontLigatures &&
            this.useGpu === other.useGpu);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld0xpbmVPcHRpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvdmlld1BhcnRzL3ZpZXdMaW5lcy92aWV3TGluZU9wdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFNaEcsTUFBTSxPQUFPLGVBQWU7SUFjM0IsWUFBWSxNQUE0QixFQUFFLFNBQXNCO1FBQy9ELElBQUksQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFBO1FBQzFCLE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUE7UUFDOUIsTUFBTSxRQUFRLEdBQUcsT0FBTyxDQUFDLEdBQUcsZ0NBQXVCLENBQUE7UUFDbkQsTUFBTSwrQkFBK0IsR0FBRyxPQUFPLENBQUMsR0FBRyx1REFFbEQsQ0FBQTtRQUNELElBQUksK0JBQStCLEtBQUssS0FBSyxFQUFFLENBQUM7WUFDL0MsSUFBSSxDQUFDLGdCQUFnQixHQUFHLE9BQU8sQ0FBQyxHQUFHLHlDQUErQixDQUFBO1FBQ25FLENBQUM7YUFBTSxDQUFDO1lBQ1AsOENBQThDO1lBQzlDLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxNQUFNLENBQUE7UUFDL0IsQ0FBQztRQUNELElBQUksQ0FBQyx1QkFBdUIsR0FBRyxPQUFPLENBQUMsR0FBRywrQ0FBc0MsQ0FBQTtRQUNoRixJQUFJLENBQUMsVUFBVSxHQUFHLFFBQVEsQ0FBQyxVQUFVLENBQUE7UUFDckMsSUFBSSxDQUFDLFdBQVcsR0FBRyxRQUFRLENBQUMsV0FBVyxDQUFBO1FBQ3ZDLElBQUksQ0FBQyxhQUFhLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQTtRQUMzQyxJQUFJLENBQUMseUJBQXlCO1lBQzdCLFFBQVEsQ0FBQyxXQUFXLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxxREFBNEMsQ0FBQTtRQUNqRixJQUFJLENBQUMsOEJBQThCLEdBQUcsUUFBUSxDQUFDLDhCQUE4QixDQUFBO1FBQzdFLElBQUksQ0FBQyxVQUFVLEdBQUcsT0FBTyxDQUFDLEdBQUcsa0NBQXlCLENBQUE7UUFDdEQsSUFBSSxDQUFDLHNCQUFzQixHQUFHLE9BQU8sQ0FBQyxHQUFHLCtDQUFxQyxDQUFBO1FBQzlFLElBQUksQ0FBQyxhQUFhLEdBQUcsT0FBTyxDQUFDLEdBQUcscUNBQTRCLENBQUE7UUFDNUQsSUFBSSxDQUFDLE1BQU0sR0FBRyxPQUFPLENBQUMsR0FBRyxtREFBMEMsS0FBSyxJQUFJLENBQUE7SUFDN0UsQ0FBQztJQUVNLE1BQU0sQ0FBQyxLQUFzQjtRQUNuQyxPQUFPLENBQ04sSUFBSSxDQUFDLFNBQVMsS0FBSyxLQUFLLENBQUMsU0FBUztZQUNsQyxJQUFJLENBQUMsZ0JBQWdCLEtBQUssS0FBSyxDQUFDLGdCQUFnQjtZQUNoRCxJQUFJLENBQUMsdUJBQXVCLEtBQUssS0FBSyxDQUFDLHVCQUF1QjtZQUM5RCxJQUFJLENBQUMsVUFBVSxLQUFLLEtBQUssQ0FBQyxVQUFVO1lBQ3BDLElBQUksQ0FBQyxXQUFXLEtBQUssS0FBSyxDQUFDLFdBQVc7WUFDdEMsSUFBSSxDQUFDLGFBQWEsS0FBSyxLQUFLLENBQUMsYUFBYTtZQUMxQyxJQUFJLENBQUMseUJBQXlCLEtBQUssS0FBSyxDQUFDLHlCQUF5QjtZQUNsRSxJQUFJLENBQUMsOEJBQThCLEtBQUssS0FBSyxDQUFDLDhCQUE4QjtZQUM1RSxJQUFJLENBQUMsVUFBVSxLQUFLLEtBQUssQ0FBQyxVQUFVO1lBQ3BDLElBQUksQ0FBQyxzQkFBc0IsS0FBSyxLQUFLLENBQUMsc0JBQXNCO1lBQzVELElBQUksQ0FBQyxhQUFhLEtBQUssS0FBSyxDQUFDLGFBQWE7WUFDMUMsSUFBSSxDQUFDLE1BQU0sS0FBSyxLQUFLLENBQUMsTUFBTSxDQUM1QixDQUFBO0lBQ0YsQ0FBQztDQUNEIn0=