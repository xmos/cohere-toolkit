import { Citation } from '@/cohere-client';

/**
 * @description Helper function to temporarily ensure markdown image syntax provided by the model is correct.
 * This is a temporary fix as the current model is consistently returning incorrect markdown image syntax.
 * @param text - message text or citation text
 */
export const fixMarkdownImagesInText = (text: string) => {
  return text.replace('! [', '![');
};

// find all occurances of substrings and return their indexes
// return array of startIdx (inclusive), endIdx (exclusive)
const findSubstrIdxs = (text: string, substring: string) => {
  const idxs: [number, number][] = []
  
  let start = 0;
  while(true) {
    const startIdx = text.substring(start).indexOf(substring);

    // string doesn't occur
    if(startIdx < 0) {
      return idxs;
    }
    
    const endIdx = startIdx +  substring.length;
    idxs.push([startIdx + start, endIdx + start]);
    start += endIdx;
  }
}


const fixCitationIdxs = (text: string, citations: Citation[]) => {
  return citations.map(citation => {
    const searchResults = findSubstrIdxs(text, citation.text);

    // find the intersections between each search result and the indexes in citation
    const intersections = searchResults.map(([start, end]) => {
      const overlapStart = Math.max(start, citation.start);
      const overlapEnd = Math.min(end, citation.end);
      const totalOverlap = overlapEnd - overlapStart;

      const idxs = {start, end};
      return {
        overlap: totalOverlap,
        idxs
      };
    });

    const corrected = intersections.reduce((acc, curr) => {
      const accOverlap = acc.overlap;
      const currOverlap = curr.overlap;

      return (accOverlap > currOverlap) ? acc : curr;
    }, intersections[0]);

    return {
      ...citation,
      start: corrected.idxs.start,
      end: corrected.idxs.end
    }
  });
}

/**
 * Replace text string with citations following the format:
 *  :cite[<text>]{generationId="<generationId>" start="<startIndex>" end"<endIndex>"}
 * @param text
 * @param citations
 * @param generationId
 * @returns text with citations
 */
export const replaceTextWithCitations = (
  text: string,
  citations: Citation[],
  generationId: string
) => {  
  if (!citations.length || !generationId) return text;

  citations = fixCitationIdxs(text, citations);

  let replacedText = text;

  let lengthDifference = 0; // Track the cumulative length difference
  citations.forEach(({ start = 0, end = 0, text: citationText }) => {
    const citeStart = start + lengthDifference;
    const citeEnd = end + lengthDifference;

    const fixedText = fixMarkdownImagesInText(citationText);

    // Encode the citationText in case there are any weird characters or unclosed brackets that will
    // interfere with parsing the markdown. However, let markdown images through so they may be properly
    // rendered.
    const isMarkdownImage = fixedText.match(/!\[.*\]\(.*\)/);
    const encodedCitationText = isMarkdownImage ? fixedText : encodeURIComponent(fixedText);
    const citationId = `:cite[${encodedCitationText}]{generationId="${generationId}" start="${start}" end="${end}"}`;

    replacedText = replacedText.slice(0, citeStart) + citationId + replacedText.slice(citeEnd);
    lengthDifference += citationId.length - (citeEnd - citeStart);
  });
  console.log(replacedText)

  return replacedText;
};


export const createStartEndKey = (start: number | string, end: number | string) =>
  `${start}-${end}`;
