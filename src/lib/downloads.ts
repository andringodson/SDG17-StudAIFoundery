const PDF_WIDTH = 842;
const PDF_HEIGHT = 595;

function safePdfText(value: string): string {
  return value.replace(/[^\x20-\x7e]/g, '-').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function estimatePdfTextWidth(value: string, size: number, bold = false): number {
  const factor = bold ? 0.57 : 0.5;
  return Array.from(value).reduce((width, character) => {
    if (character === ' ') return width + size * 0.28;
    if ('MW@'.includes(character)) return width + size * 0.82;
    if ('ilI.,:;!'.includes(character)) return width + size * 0.25;
    if (/[A-Z]/.test(character)) return width + size * 0.67;
    return width + size * factor;
  }, 0);
}

function centeredPdfText(text: string, y: number, size: number, color: string, bold = false): string {
  const x = Math.max(60, (PDF_WIDTH - estimatePdfTextWidth(text, size, bold)) / 2).toFixed(1);
  return `${color} rg\nBT\n/${bold ? 'F2' : 'F1'} ${size} Tf\n${x} ${y} Td\n(${safePdfText(text)}) Tj\nET`;
}

/** Builds a self-contained, printable landscape certificate using only PDF's
 * standard fonts. This keeps browser downloads reliable without a canvas or
 * a third-party renderer. */
export function createCertificatePdf(roleName: string, completedOn: Date = new Date()): Uint8Array {
  const date = completedOn.toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
  const certificateId = `SDG17-${roleName.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12)}-${completedOn.toISOString().slice(0, 10).replaceAll('-', '')}`;
  const stream = [
    'q',
    '0.035 0.075 0.12 rg', `0 0 ${PDF_WIDTH} ${PDF_HEIGHT} re f`,
    '0.94 0.97 0.98 rg', `28 28 ${PDF_WIDTH - 56} ${PDF_HEIGHT - 56} re f`,
    '0.035 0.075 0.12 RG', '2 w', `36 36 ${PDF_WIDTH - 72} ${PDF_HEIGHT - 72} re S`,
    '0.02 0.63 0.76 RG', '1.5 w', `48 48 ${PDF_WIDTH - 96} ${PDF_HEIGHT - 96} re S`,
    '0.02 0.63 0.76 RG', '4 w', '48 500 m 180 500 l S', '662 500 m 794 500 l S',
    centeredPdfText('SDG 17  |  GLOBAL PARTNERSHIP PLATFORM', 467, 13, '0.02 0.38 0.49', true),
    centeredPdfText('Certificate of Completion', 374, 39, '0.035 0.075 0.12', true),
    centeredPdfText('This certifies that the holder has completed the', 324, 16, '0.20 0.27 0.31'),
    centeredPdfText(`${roleName} Learning Pathway`, 274, 26, '0.01 0.48 0.62', true),
    '0.78 0.85 0.87 RG', '0.75 w', '244 244 m 598 244 l S',
    centeredPdfText(`Completed on ${date}`, 218, 14, '0.20 0.27 0.31'),
    '0.035 0.075 0.12 RG', '0.75 w', '112 142 m 292 142 l S', '550 142 m 730 142 l S',
    centeredPdfText('Verified learning record', 120, 10, '0.31 0.39 0.43'),
    centeredPdfText(certificateId, 76, 9, '0.31 0.39 0.43'),
    'Q'
  ].join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PDF_WIDTH} ${PDF_HEIGHT}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`
  ];
  let pdf = '%PDF-1.4\n%----\n';
  const offsets = [0];
  objects.forEach((object, index) => { offsets.push(pdf.length); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => { pdf += `${String(offset).padStart(10, '0')} 00000 n \n`; });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}

function escapeRtf(value: string): string {
  return Array.from(value).map((character) => {
    if (character === '\\') return '\\\\';
    if (character === '{') return '\\{';
    if (character === '}') return '\\}';
    if (character === '\n') return '\\line ';
    const code = character.codePointAt(0)!;
    return code > 127 ? `\\u${code > 32767 ? code - 65536 : code}?` : character;
  }).join('');
}

export function createStrategyReportRtf(input: {
  stakeholderNames: string[];
  budget: string;
  score: number;
  warnings: string[];
  generatedOn?: Date;
}): string {
  const date = (input.generatedOn ?? new Date()).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
  const stakeholders = input.stakeholderNames.length ? input.stakeholderNames : ['No stakeholders selected'];
  const diagnostics = input.warnings.length ? input.warnings : ['No structural gaps were detected in this partnership mix.'];
  const bulletList = (items: string[]) => items.map((item) => `\\pard\\fi-240\\li540\\sa120\\cf3\\fs22\\bullet\\tab ${escapeRtf(item)}\\par`).join('\n');
  return `{\\rtf1\\ansi\\deff0
{\\fonttbl{\\f0 Arial;}{\\f1 Arial;}}
{\\colortbl ;\\red5\\green36\\blue57;\\red0\\green130\\blue155;\\red45\\green62\\blue72;\\red104\\green124\\blue134;}
\\paperw11907\\paperh16840\\margl1080\\margr1080\\margt900\\margb900
\\pard\\qc\\cf2\\b\\fs20 SDG 17  |  GLOBAL PARTNERSHIP PLATFORM\\par
\\pard\\qc\\cf1\\b\\fs42 Partnership Strategy Report\\par
\\pard\\qc\\cf4\\fs20 Generated ${escapeRtf(date)}\\par
\\pard\\sa260\\brdrb\\brdrs\\brdrw20\\brdrcf2\\par
\\pard\\sa180\\cf1\\b\\fs28 Partnership strength\\par
\\pard\\sa240\\cf2\\b\\fs54 ${input.score}%\\par
\\pard\\sa180\\cf1\\b\\fs28 Selected stakeholders\\par
${bulletList(stakeholders)}
\\pard\\sa180\\cf1\\b\\fs28 Budget allocation\\par
\\pard\\sa240\\cf3\\fs24 ${escapeRtf(input.budget)}\\par
\\pard\\sa180\\cf1\\b\\fs28 Diagnostics\\par
${bulletList(diagnostics)}
\\pard\\sa180\\cf1\\b\\fs28 Recommended next step\\par
\\pard\\sa200\\cf3\\fs24 Use these diagnostics to refine the partnership mix, then generate a fresh report to compare the result.\\par
\\pard\\qc\\sa120\\brdrt\\brdrs\\brdrw10\\brdrcf4\\cf4\\fs18 SDG 17 Global Partnership Platform  |  Partnerships for the Goals\\par
}`;
}

export function downloadFile(contents: string | Uint8Array, type: string, filename: string): void {
  // Copy typed-array contents into an ArrayBuffer. TypeScript's newer generic
  // ArrayBufferLike type includes SharedArrayBuffer, which Blob does not accept.
  const payload: BlobPart = typeof contents === 'string'
    ? contents
    : (() => {
        const copy = new Uint8Array(contents.byteLength);
        copy.set(contents);
        return copy.buffer;
      })();
  const href = URL.createObjectURL(new Blob([payload], { type }));
  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(href), 0);
}
