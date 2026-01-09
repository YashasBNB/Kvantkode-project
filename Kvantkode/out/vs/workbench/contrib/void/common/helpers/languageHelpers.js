// /*--------------------------------------------------------------------------------------
//  *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
//  *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
//  *--------------------------------------------------------------------------------------*/
import { separateOutFirstLine } from './util.js';
// this works better than model.getLanguageId()
export function detectLanguage(languageService, opts) {
    const firstLine = opts.fileContents ? separateOutFirstLine(opts.fileContents)?.[0] : undefined;
    const fullLang = languageService.createByFilepathOrFirstLine(opts.uri, firstLine);
    return fullLang.languageId || 'plaintext';
}
// --- conversions
export const convertToVscodeLang = (languageService, markdownLang) => {
    if (markdownLang in markdownLangToVscodeLang)
        return markdownLangToVscodeLang[markdownLang];
    const { languageId } = languageService.createById(markdownLang);
    return languageId;
};
// // eg "bash" -> "shell"
const markdownLangToVscodeLang = {
    // Web Technologies
    html: 'html',
    css: 'css',
    scss: 'scss',
    sass: 'scss',
    less: 'less',
    javascript: 'typescript',
    js: 'typescript', // use more general renderer
    jsx: 'typescriptreact',
    typescript: 'typescript',
    ts: 'typescript',
    tsx: 'typescriptreact',
    json: 'json',
    jsonc: 'json',
    // Programming Languages
    python: 'python',
    py: 'python',
    java: 'java',
    cpp: 'cpp',
    'c++': 'cpp',
    c: 'c',
    csharp: 'csharp',
    cs: 'csharp',
    'c#': 'csharp',
    go: 'go',
    golang: 'go',
    rust: 'rust',
    rs: 'rust',
    ruby: 'ruby',
    rb: 'ruby',
    php: 'php',
    shell: 'shellscript', // this is important
    bash: 'shellscript',
    sh: 'shellscript',
    zsh: 'shellscript',
    // Markup and Config
    markdown: 'markdown',
    md: 'markdown',
    xml: 'xml',
    svg: 'xml',
    yaml: 'yaml',
    yml: 'yaml',
    ini: 'ini',
    toml: 'ini',
    // Database and Query Languages
    sql: 'sql',
    mysql: 'sql',
    postgresql: 'sql',
    graphql: 'graphql',
    gql: 'graphql',
    // Others
    dockerfile: 'dockerfile',
    docker: 'dockerfile',
    makefile: 'makefile',
    plaintext: 'plaintext',
    text: 'plaintext',
};
// // eg ".ts" -> "typescript"
// const fileExtensionToVscodeLanguage: { [key: string]: string } = {
// 	// Web
// 	'html': 'html',
// 	'htm': 'html',
// 	'css': 'css',
// 	'scss': 'scss',
// 	'less': 'less',
// 	'js': 'javascript',
// 	'jsx': 'javascript',
// 	'ts': 'typescript',
// 	'tsx': 'typescript',
// 	'json': 'json',
// 	'jsonc': 'json',
// 	// Programming Languages
// 	'py': 'python',
// 	'java': 'java',
// 	'cpp': 'cpp',
// 	'cc': 'cpp',
// 	'c': 'c',
// 	'h': 'cpp',
// 	'hpp': 'cpp',
// 	'cs': 'csharp',
// 	'go': 'go',
// 	'rs': 'rust',
// 	'rb': 'ruby',
// 	'php': 'php',
// 	'sh': 'shell',
// 	'bash': 'shell',
// 	'zsh': 'shell',
// 	// Markup/Config
// 	'md': 'markdown',
// 	'markdown': 'markdown',
// 	'xml': 'xml',
// 	'svg': 'xml',
// 	'yaml': 'yaml',
// 	'yml': 'yaml',
// 	'ini': 'ini',
// 	'toml': 'ini',
// 	// Other
// 	'sql': 'sql',
// 	'graphql': 'graphql',
// 	'gql': 'graphql',
// 	'dockerfile': 'dockerfile',
// 	'docker': 'dockerfile',
// 	'mk': 'makefile',
// 	// Config Files and Dot Files
// 	'npmrc': 'ini',
// 	'env': 'ini',
// 	'gitignore': 'ignore',
// 	'dockerignore': 'ignore',
// 	'eslintrc': 'json',
// 	'babelrc': 'json',
// 	'prettierrc': 'json',
// 	'stylelintrc': 'json',
// 	'editorconfig': 'ini',
// 	'htaccess': 'apacheconf',
// 	'conf': 'ini',
// 	'config': 'ini',
// 	// Package Files
// 	'package': 'json',
// 	'package-lock': 'json',
// 	'gemfile': 'ruby',
// 	'podfile': 'ruby',
// 	'rakefile': 'ruby',
// 	// Build Systems
// 	'cmake': 'cmake',
// 	'makefile': 'makefile',
// 	'gradle': 'groovy',
// 	// Shell Scripts
// 	'bashrc': 'shell',
// 	'zshrc': 'shell',
// 	'fish': 'shell',
// 	// Version Control
// 	'gitconfig': 'ini',
// 	'hgrc': 'ini',
// 	'svnconfig': 'ini',
// 	// Web Server
// 	'nginx': 'nginx',
// 	// Misc Config
// 	'properties': 'properties',
// 	'cfg': 'ini',
// 	'reg': 'ini'
// };
// export function filenameToVscodeLanguage(filename: string): string | undefined {
// 	const ext = filename.toLowerCase().split('.').pop();
// 	if (!ext) return undefined;
// 	return fileExtensionToVscodeLanguage[ext];
// }
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VIZWxwZXJzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi92b2lkL2NvbW1vbi9oZWxwZXJzL2xhbmd1YWdlSGVscGVycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSwyRkFBMkY7QUFDM0YsK0RBQStEO0FBQy9ELDRGQUE0RjtBQUM1Riw2RkFBNkY7QUFJN0YsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sV0FBVyxDQUFBO0FBRWhELCtDQUErQztBQUMvQyxNQUFNLFVBQVUsY0FBYyxDQUM3QixlQUFpQyxFQUNqQyxJQUEyRDtJQUUzRCxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFBO0lBQzlGLE1BQU0sUUFBUSxHQUFHLGVBQWUsQ0FBQywyQkFBMkIsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLFNBQVMsQ0FBQyxDQUFBO0lBQ2pGLE9BQU8sUUFBUSxDQUFDLFVBQVUsSUFBSSxXQUFXLENBQUE7QUFDMUMsQ0FBQztBQUVELGtCQUFrQjtBQUNsQixNQUFNLENBQUMsTUFBTSxtQkFBbUIsR0FBRyxDQUFDLGVBQWlDLEVBQUUsWUFBb0IsRUFBRSxFQUFFO0lBQzlGLElBQUksWUFBWSxJQUFJLHdCQUF3QjtRQUFFLE9BQU8sd0JBQXdCLENBQUMsWUFBWSxDQUFDLENBQUE7SUFFM0YsTUFBTSxFQUFFLFVBQVUsRUFBRSxHQUFHLGVBQWUsQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDLENBQUE7SUFDL0QsT0FBTyxVQUFVLENBQUE7QUFDbEIsQ0FBQyxDQUFBO0FBRUQsMEJBQTBCO0FBQzFCLE1BQU0s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