/**
 * raw path format: "/path/to/file.extension#region {meta} [title]"
 *    where #region, {meta} and [title] are optional
 *    meta can be like '1,2,4-6 lang', 'lang' or '1,2,4-6'
 *    lang can contain special characters like C++, C#, F#, etc.
 *    path can be relative to the current file or absolute
 *    file extension is optional
 *    path can contain spaces and dots
 *
 * captures: ['/path/to/file.extension', 'extension', '#region', '{meta}', '[title]']
 */
export const rawPathRegexp =
  /^(.+?(?:(?:\.([a-z0-9]+))?))(?:(#[\w-]+))?(?: ?(?:{(\d+(?:[,-]\d+)*)? ?(\S+)? ?(\S+)?}))? ?(?:\[(.+)\])?$/

export function rawPathToToken(rawPath: string) {
  const [
    filepath = '',
    extension = '',
    region = '',
    lines = '',
    lang = '',
    attrs = '',
    rawTitle = ''
  ] = (rawPathRegexp.exec(rawPath) || []).slice(1)

  const title = rawTitle || filepath.split('/').pop() || ''

  return { filepath, extension, region, lines, lang, attrs, title }
}

export function dedent(text: string): string {
  const lines = text.split('\n')

  const minIndentLength = lines.reduce((acc, line) => {
    for (let i = 0; i < line.length; i++) {
      if (line[i] !== ' ' && line[i] !== '\t') return Math.min(i, acc)
    }
    return acc
  }, Infinity)

  if (minIndentLength < Infinity) {
    return lines.map((x) => x.slice(minIndentLength)).join('\n')
  }

  return text
}

export function findRegion(lines: Array<string>, regionName: string) {
  const regionRegexps: [RegExp, RegExp][] = [
    [/^[ \t]*\/\/ ?#?(region) ([\w*-]+)$/, /^[ \t]*\/\/ ?#?(endregion) ?([\w*-]*)$/], // javascript, typescript, java
    [/^\/\* ?#(region) ([\w*-]+) ?\*\/$/, /^\/\* ?#(endregion) ?([\w*-]*) ?\*\/$/], // css, less, scss
    [/^#pragma (region) ([\w*-]+)$/, /^#pragma (endregion) ?([\w*-]*)$/], // C, C++
    [/^<!-- #?(region) ([\w*-]+) -->$/, /^<!-- #?(endregion) ?([\w*-]*) -->$/], // HTML, markdown
    [/^[ \t]*#(Region) ([\w*-]+)$/, /^[ \t]*#(End Region) ?([\w*-]*)$/], // Visual Basic
    [/^::#(region) ([\w*-]+)$/, /^::#(endregion) ?([\w*-]*)$/], // Bat
    [/^[ \t]*# ?(region) ([\w*-]+)$/, /^[ \t]*# ?(endregion) ?([\w*-]*)$/] // C#, PHP, Powershell, Python, perl & misc
  ]

  let chosenRegex: [RegExp, RegExp] | null = null
  let startLine = -1
  // find the regex pair for a start marker that matches the given region name
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    for (const [startRegex, endRegex] of regionRegexps) {
      const startMatch = startRegex.exec(line)
      if (startMatch && startMatch[2] === regionName && /^[rR]egion$/.test(startMatch[1])) {
        chosenRegex = [startRegex, endRegex]
        startLine = i + 1
        break
      }
    }
    if (chosenRegex) break
  }
  if (!chosenRegex) return null

  const [startRegex, endRegex] = chosenRegex
  let counter = 1
  // scan the rest of the lines to find the matching end marker, handling nested markers
  for (let i = startLine; i < lines.length; i++) {
    const trimmed = lines[i].trim()
    // check for an inner start marker for the same region
    const startMatch = startRegex.exec(trimmed)
    if (startMatch && startMatch[2] === regionName && /^[rR]egion$/.test(startMatch[1])) {
      counter++
      continue
    }
    // check for an end marker for the same region
    const endMatch = endRegex.exec(trimmed)
    if (
      endMatch &&
      // allow empty region name on the end marker as a fallback
      (endMatch[2] === regionName || endMatch[2] === '') &&
      /^[Ee]nd ?[rR]egion$/.test(endMatch[1])
    ) {
      counter--
      if (counter === 0) {
        return { start: startLine, end: i, regexp: chosenRegex }
      }
    }
  }

  return null
}
