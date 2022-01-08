import { jest } from '@jest/globals'
import makeConsoleMock from 'consolemock'

import { addConfigFileSerializer } from './utils/configFilepathSerializer.js'
import { testWithGitIntegration } from './utils/gitIntegration.js'
import { prettierListDifferent } from './fixtures/configs.js'
import { prettyJS } from './fixtures/files.js'

jest.setTimeout(20000)

addConfigFileSerializer()

describe('integration', () => {
  testWithGitIntegration(
    'skips backup when run on an empty git repo without an initial commit',
    async ({ appendFile, execGit, gitCommit, readFile, cwd }) => {
      const globalConsoleTemp = console
      console = makeConsoleMock()

      await appendFile('test.js', prettyJS, cwd)
      await execGit(['add', 'test.js'], { cwd })

      await expect(execGit(['log', '-1'], { cwd })).rejects.toThrowErrorMatchingInlineSnapshot(
        `"fatal: your current branch 'master' does not have any commits yet"`
      )

      await gitCommit({
        ...prettierListDifferent,
        cwd,
        debut: true,
      })

      expect(console.printHistory()).toMatchInlineSnapshot(`
        "
        WARN ⚠ Skipping backup because there’s no initial commit yet.

        LOG [STARTED] Preparing lint-staged...
        LOG [SUCCESS] Preparing lint-staged...
        LOG [STARTED] Running tasks for staged files...
        LOG [STARTED] <path>/<lint-staged.config.ext> — 1 file
        LOG [STARTED] *.js — 1 file
        LOG [STARTED] prettier --list-different
        LOG [SUCCESS] prettier --list-different
        LOG [SUCCESS] *.js — 1 file
        LOG [SUCCESS] <path>/<lint-staged.config.ext> — 1 file
        LOG [SUCCESS] Running tasks for staged files...
        LOG [STARTED] Applying modifications from tasks...
        LOG [SUCCESS] Applying modifications from tasks..."
      `)

      // Nothing is wrong, so the initial commit is created
      expect(await execGit(['rev-list', '--count', 'HEAD'], { cwd })).toEqual('1')
      expect(await execGit(['log', '-1', '--pretty=%B'], { cwd })).toMatch('test')
      expect(await readFile('test.js', cwd)).toEqual(prettyJS)
      console = globalConsoleTemp
    },
    false
  )
})