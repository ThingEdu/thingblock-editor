// sort-imports-ignore: each Prism grammar extends the one before it, so they load in this order
import Prism from 'prismjs'
import 'prismjs/components/prism-c'
import 'prismjs/components/prism-cpp'
import 'prismjs/components/prism-arduino'
import 'prismjs/components/prism-javascript'
import { useMemo } from 'react'
import log from '../../lib/log'
import styles from './code-view.module.css'

interface CodeViewProps {
  code: string
  /** The Prism grammar to highlight the code with, `javascript` by default. */
  language?: string
}

/**
 * Read-only source code, highlighted, with line numbers.
 * @param props - The code and its language.
 * @returns The code beside its line numbers.
 */
const CodeView = (props: CodeViewProps) => {
  const { code, language = 'javascript' } = props
  const highlighted = useMemo(() => {
    // Prism's grammars are keyed by language name, and a name it lacks has no grammar
    const grammar = Prism.languages[language] as Prism.Grammar | undefined
    if (grammar) return Prism.highlight(code, grammar, language)
    log.warn(`CodeView: Prism has no grammar for ${language}; showing the code unhighlighted`)
    return Prism.highlight(code, Prism.languages.plain, 'plain')
  }, [code, language])
  const lineCount = code.split('\n').length

  return (
    <div className={styles.codeView}>
      <div className={styles.content}>
        <div className={styles.gutter}>
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i} className={styles.lineNumber}>
              {i + 1}
            </div>
          ))}
        </div>
        <pre className={styles.pre}>
          {/* eslint-disable-next-line react/no-danger -- Prism escapes the code it highlights */}
          <code className={`language-${language}`} dangerouslySetInnerHTML={{ __html: highlighted }} />
        </pre>
      </div>
    </div>
  )
}

export default CodeView
