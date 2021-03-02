import * as core from '@actions/core'
import fs from 'fs'
import {fetchText} from './http'
import * as github from '@actions/github'

class TestResultMetric {
  name: string
  failed: boolean
  currentRetry: number
  errStack: string
  errMessage: string
  errName: string
  duration: number
  repo: string
  commit: string
  os: string
  actionLink: string
  branch: string

  constructor(
    name: string,
    failed: boolean,
    currentRetry: number,
    errStack: string,
    errMessage: string,
    errName: string,
    duration: number,
    repo: string,
    commit: string,
    os: string,
    actionLink: string,
    branch: string
  ) {
    this.name = name
    this.failed = failed
    this.currentRetry = currentRetry
    this.errStack = errStack
    this.errMessage = errMessage
    this.errName = errName
    this.duration = duration
    this.repo = repo
    this.commit = commit
    this.os = os
    this.actionLink = actionLink
    this.branch = branch
  }
}

async function fileExists(filePath: fs.PathLike): Promise<boolean> {
  try {
    return (await fs.promises.stat(filePath)).isFile()
  } catch {
    return false
  }
}
async function sendToFrog(testMetric: TestResultMetric): Promise<void> {
  const url = `http://frog.wix.com/c3ci?src=129&evid=1&actionLink=${testMetric.actionLink}&commit=${testMetric.commit}&currentRetry=${testMetric.currentRetry}&duration=${testMetric.duration}&errMessage=${testMetric.errMessage}&errName=${testMetric.errName}&errStack=${testMetric.errStack}&failed=${testMetric.failed}&os==${testMetric.os}&repo=${testMetric.repo}&testName=${testMetric.name}&branch=${testMetric.branch}`
  const encodedUrl = encodeURI(url)
  await fetchText(encodedUrl, {
    method: 'GET'
  })
}

async function sendTestResults(
  filePath: string,
  repo: string,
  commitSha: string,
  actionLink: string,
  environment: string,
  branch: string
): Promise<number> {
  const fileContent = (await fileExists(filePath))
    ? await fs.promises.readFile(filePath, 'utf8')
    : undefined
  let numOfMetrics = 0
  if (fileContent) {
    const rawEventData = JSON.parse(fileContent)
    if (rawEventData && rawEventData.tests) {
      for (const k in rawEventData.tests) {
        const entry = rawEventData.tests[k]
        let errStack = ''
        let errName = ''
        let errMessage = ''
        let failed = false
        if (entry && entry.err && entry.err.name) {
          errStack = entry.err.stack
          errName = entry.err.name
          errMessage = entry.err.message
          failed = true
        }
        if (entry && entry.err && entry.err.multiple) {
          errStack = entry.err.stack
          errName = entry.err.multiple[0].name
          errMessage = entry.err.message
          failed = true
        }
        const newMetric = new TestResultMetric(
          entry.fullTitle,
          failed,
          entry.currentRetry,
          errStack,
          errMessage,
          errName,
          entry.duration,
          repo,
          commitSha,
          environment,
          actionLink,
          branch
        )
        await sendToFrog(newMetric)
        numOfMetrics++
      }
    }
  }
  return numOfMetrics
}

async function run(): Promise<void> {
  try {
    const testReportFile: string = core.getInput('testReportFile')
    const actionLink: string = core.getInput('actionLink')
    const os: string = core.getInput('os')
    const node: string = core.getInput('node')
    const branch: string = github.context.ref
    const commitSha: string = github.context.sha
    const repo = `${github.context.repo.owner}/${github.context.repo.repo}`
    const environment = `${os}/${node}`
    const numberOfMetrics = await sendTestResults(
      testReportFile,
      repo,
      commitSha,
      actionLink,
      environment,
      branch
    )
    core.info(`Send ${numberOfMetrics} metrics`)
  } catch (error) {
    core.info(`Failed sending metrics.Error: ${error}`)
  }
}

run()
