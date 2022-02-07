# action-publish-test-metrics
Publish test results to internal wix BI server

## Install dependencies
```
npm install
```

## Build
```
npm run build && npm run package
```
## Use
```
- uses: wixplosives/action-publish-test-metrics@main
  with:
    testReportFile: 'result1.json,result2.json'
    actionLink: 'lnink/to/your/job/execution' 
    os: ${{ matrix.os }}
    node: ${{ matrix.node-version }}
```

