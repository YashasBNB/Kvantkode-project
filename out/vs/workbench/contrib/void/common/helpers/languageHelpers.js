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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VIZWxwZXJzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdm9pZC9jb21tb24vaGVscGVycy9sYW5ndWFnZUhlbHBlcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsMkZBQTJGO0FBQzNGLCtEQUErRDtBQUMvRCw0RkFBNEY7QUFDNUYsNkZBQTZGO0FBSTdGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLFdBQVcsQ0FBQTtBQUVoRCwrQ0FBK0M7QUFDL0MsTUFBTSxVQUFVLGNBQWMsQ0FDN0IsZUFBaUMsRUFDakMsSUFBMkQ7SUFFM0QsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQTtJQUM5RixNQUFNLFFBQVEsR0FBRyxlQUFlLENBQUMsMkJBQTJCLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxTQUFTLENBQUMsQ0FBQTtJQUNqRixPQUFPLFFBQVEsQ0FBQyxVQUFVLElBQUksV0FBVyxDQUFBO0FBQzFDLENBQUM7QUFFRCxrQkFBa0I7QUFDbEIsTUFBTSxDQUFDLE1BQU0sbUJBQW1CLEdBQUcsQ0FBQyxlQUFpQyxFQUFFLFlBQW9CLEVBQUUsRUFBRTtJQUM5RixJQUFJLFlBQVksSUFBSSx3QkFBd0I7UUFBRSxPQUFPLHdCQUF3QixDQUFDLFlBQVksQ0FBQyxDQUFBO0lBRTNGLE1BQU0sRUFBRSxVQUFVLEVBQUUsR0FBRyxlQUFlLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQyxDQUFBO0lBQy9ELE9BQU8sVUFBVSxDQUFBO0FBQ2xCLENBQUMsQ0FBQTtBQUVELDBCQUEwQjtBQUMxQixNQUFNLHdCQUF3QixHQUE4QjtJQUMzRCxtQkFB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