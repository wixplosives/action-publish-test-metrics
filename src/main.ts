import * as core from '@actions/core'
import fs from 'fs';
import { fetchText } from "./http";
const github = require('@actions/github');

class TestResultMetric {
    name: string;
    failed: boolean;
    currentRetry: number;
    errStack: string;
    errMessage: string;
    errName: string;
    duration: number;
    repo: string;
    commit: string;
    os: string;
    actionLink: string;
    
    constructor(name: string,
                failed: boolean,
                currentRetry: number,
                errStack: string,
                errMessage: string,
                errName: string,
                duration: number,
                repo: string,
                commit: string,
                os: string,
                actionLink: string
                ) {
      const adjustedName = name.replace(' ', '-');
      this.name = `${adjustedName}`

      this.failed = failed;
      this.currentRetry = currentRetry;
      this.errStack = errStack;
      this.errMessage = errMessage;
      this.errName = errName;
      this.duration = duration;
      this.repo = repo;
      this.commit = commit;
      this.os = os;
      this.actionLink = actionLink;
    }
  }


async function fileExists(filePath: fs.PathLike): Promise<boolean> {
  try {
    return (await fs.promises.stat(filePath)).isFile();
  } catch {
    return false;
  }
}
async function sendToFrog(testMetric: TestResultMetric){
    const url = `http://frog.wix.com/c3ci?src=129&evid=1&actionLink=${testMetric.actionLink}&commit=${testMetric.commit}&currentRetry=${testMetric.currentRetry}&duration=${testMetric.duration}&errMessage=${testMetric.errMessage}&errName=${testMetric.errName}&errStack=${testMetric.errStack}&failed=${testMetric.failed}&os==${testMetric.os}&repo=${testMetric.repo}&testName=${testMetric.name}`
    const encodedUrl = encodeURI(url);
    const result = await fetchText(encodedUrl, {
        method: 'GET'
      });      
}

async function sendTestResults(filePath: string, repo :string, commitSha: string, actionLink: string) : Promise<number>{
    const fileContent = (await fileExists(filePath)) ? await fs.promises.readFile(filePath, 'utf8') : undefined;
    const testMetricList: TestResultMetric[] = [];
    let numOfMetrics = 0;
    if (fileContent) {
        const rawEventData = JSON.parse(fileContent);
        if (rawEventData && rawEventData.tests ) {
            for (const k in rawEventData.tests) {
                const entry = rawEventData.tests[k]
                let errStack = ''
                let errName = ''
                let errMessage = ''
                let failed = false
                if ( entry && entry.err && entry.err.name != undefined ){
                    errStack = entry.err.stack;
                    errName = entry.err.name;
                    errMessage = entry.err.message;
                    failed = true;                   
                } 
                const newMetric = new TestResultMetric(entry.title, failed,  entry.currentRetry,errStack,errMessage,errName,entry.duration,repo,commitSha,'macos', 'somelink') 
                await sendToFrog(newMetric)
                numOfMetrics++
            }
        }

    }
    return numOfMetrics;
}


async function run(): Promise<void> {
  try {
    const testReportFile: string = core.getInput('testReportFile')
    const actionLink: string = core.getInput('actionLink')
    const commitSha: string = github.context.ref
    const repo: string = github.context.repo
    const numberOfMetrics = await sendTestResults(testReportFile, repo, commitSha, actionLink)
    core.info(`Send ${numberOfMetrics} metrics`)
  }catch (error) {
    core.setFailed(error.message)
  }
}

run()
