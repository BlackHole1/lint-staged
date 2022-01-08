import { jest } from '@jest/globals'
import makeConsoleMock from 'consolemock'

import { addConfigFileSerializer } from './utils/configFilepathSerializer.mjs'
import { testWithGitIntegration } from './utils/gitIntegration.mjs'
import * as fileFixtures from './fixtures/files.mjs'
import * as configFixtures from './fixtures/configs.mjs'

jest.setTimeout(20000)

addConfigFileSerializer()

describe('integration', () => {
  const globalConsoleTemp = console

  beforeAll(() => {
    console = makeConsoleMock()
  })

  afterEach(async () => {
    console.clearHistory()
  })

  afterAll(() => {
    console = globalConsoleTemp
  })

  const getQuotePathTest =
    (state) =>
    async ({ appendFile, execGit, gitCommit, readFile }) => {
      await execGit(['config', 'core.quotepath', state])

      // Stage multiple ugly files
      await appendFile('привет.js', fileFixtures.uglyJS)
      await execGit(['add', 'привет.js'])

      await appendFile('你好.js', fileFixtures.uglyJS)
      await execGit(['add', '你好.js'])

      await appendFile('👋.js', fileFixtures.uglyJS)
      await execGit(['add', '👋.js'])

      // Run lint-staged with `prettier --write` and commit pretty files
      await gitCommit(configFixtures.prettierWrite)

      // Nothing is wrong, so a new commit is created and files are pretty
      expect(await execGit(['rev-list', '--count', 'HEAD'])).toEqual('2')
      expect(await execGit(['log', '-1', '--pretty=%B'])).toMatch('test')
      expect(await readFile('привет.js')).toEqual(fileFixtures.prettyJS)
      expect(await readFile('你好.js')).toEqual(fileFixtures.prettyJS)
      expect(await readFile('👋.js')).toEqual(fileFixtures.prettyJS)
    }

  testWithGitIntegration(
    'handles files with non-ascii characters when core.quotepath is on',
    getQuotePathTest('on')
  )

  testWithGitIntegration(
    'handles files with non-ascii characters when core.quotepath is off',
    getQuotePathTest('off')
  )
})
