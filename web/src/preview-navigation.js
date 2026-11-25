export function locateSourceTarget(source, zeroBasedLine, selectedText = "") {
  const lines = source.split("\n");
  const mappedLine = Math.max(0, Math.min(lines.length - 1, Number(zeroBasedLine) || 0));
  const selection = selectedText.trim();
  let lineIndex = mappedLine;
  let matchAt = selection ? (lines[lineIndex] ?? "").indexOf(selection) : -1;

  if (selection && matchAt < 0) {
    let closestDistance = Infinity;
    for (let index = 0; index < lines.length; index += 1) {
      const candidateAt = lines[index].indexOf(selection);
      const distance = Math.abs(index - mappedLine);
      if (candidateAt >= 0 && distance < closestDistance) {
        lineIndex = index;
        matchAt = candidateAt;
        closestDistance = distance;
      }
    }
  }

  return {
    lineNumber: lineIndex + 1,
    from: matchAt >= 0 ? matchAt : 0,
    to: matchAt >= 0 ? matchAt + selection.length : 0,
  };
}
