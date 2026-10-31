/** Shared deterministic layout rendering; callers admit identity/resources and related links. */
export function layoutMarkdown(text,expectedPages,sourceUrl,links){
 const pages=text.replace(/\r\n?/g,'\n').split('\f');
 if(pages.length&&!pages.at(-1).trim())pages.pop();
 if(pages.length!==expectedPages||pages.some(p=>p.replace(/\s/g,'').length<40||/[\u0000\ufffd]/.test(p)))throw Error('CIVIC_TEXT_REVIEW_REQUIRED');
 const markdown=['# Complete supplied extracted text\n',
  'Local/private research. Original wording and source errors retained. This is caller-associated extracted text, not independently verified PDF transcription.\n',
  `[Original PDF](<${sourceUrl}>)\n`,...links.map(link=>link+'\n'),
  ...pages.map((page,index)=>{const length=[...page.matchAll(/`+/g)].reduce((max,x)=>Math.max(max,x[0].length+1),3),fence='`'.repeat(length);return `## Page ${index+1}\n\n[Official source page](<${sourceUrl}#page=${index+1}>)\n\n${fence}text\n${page}${page.endsWith('\n')?'':'\n'}${fence}\n`;})
 ].join('\n');
 return {markdown,pageCount:pages.length};
}
