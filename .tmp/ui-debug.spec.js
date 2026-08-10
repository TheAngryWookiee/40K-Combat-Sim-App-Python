const { test } = require('playwright/test')

test('capture ui render error', async ({ page }) => {
  const consoleMessages = []
  const pageErrors = []
  const failedRequests = []

  page.on('console', (message) => {
    consoleMessages.push(`[console:${message.type()}] ${message.text()}`)
  })

  page.on('pageerror', (error) => {
    pageErrors.push(error?.stack || error?.message || String(error))
  })

  page.on('requestfailed', (request) => {
    failedRequests.push(`${request.url()} :: ${request.failure()?.errorText || 'failed'}`)
  })

  await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle' })

  console.log('BODY_TEXT_START')
  console.log((await page.locator('body').innerText()).slice(0, 4000))
  console.log('BODY_TEXT_END')

  console.log('PAGE_ERRORS_START')
  for (const error of pageErrors) {
    console.log(error)
  }
  console.log('PAGE_ERRORS_END')

  console.log('CONSOLE_MESSAGES_START')
  for (const message of consoleMessages) {
    console.log(message)
  }
  console.log('CONSOLE_MESSAGES_END')

  console.log('FAILED_REQUESTS_START')
  for (const request of failedRequests) {
    console.log(request)
  }
  console.log('FAILED_REQUESTS_END')
})
