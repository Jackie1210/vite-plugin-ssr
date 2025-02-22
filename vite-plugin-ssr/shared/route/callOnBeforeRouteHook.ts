import { assertPageContextProvidedByUser } from '../assertPageContextProvidedByUser'
import { assertUsage, hasProp, isObjectWithKeys } from '../utils'
import { PageRoutes } from './loadPageRoutes'
import { assertRouteParams } from './resolveRouteFunction'

export { callOnBeforeRouteHook }
export type { OnBeforeRouteHook }

type OnBeforeRouteHook = {
  filePath: string
  onBeforeRoute: (pageContext: { url: string } & Record<string, unknown>) => unknown
}

async function callOnBeforeRouteHook(pageContext: {
  url: string
  _allPageIds: string[]
  _pageRoutes: PageRoutes
  _onBeforeRouteHook: null | OnBeforeRouteHook
}): Promise<
  | {}
  | { hookError: unknown; hookFilePath: string; hookName: string }
  | {
      pageContextProvidedByUser: Record<string, unknown> & {
        _pageId?: string | null
        routeParams?: Record<string, string>
      }
    }
> {
  if (!pageContext._onBeforeRouteHook) {
    return {}
  }

  const hookFilePath = pageContext._onBeforeRouteHook.filePath
  const hookName = 'onBeforeRoute'

  let result: unknown
  try {
    result = await pageContext._onBeforeRouteHook.onBeforeRoute(pageContext)
  } catch (hookError) {
    return { hookError, hookName, hookFilePath }
  }

  const errPrefix = `The \`onBeforeRoute()\` hook exported by ${pageContext._onBeforeRouteHook.filePath}`

  assertUsage(
    result === null ||
      result === undefined ||
      (isObjectWithKeys(result, ['pageContext'] as const) && hasProp(result, 'pageContext')),
    `${errPrefix} should return \`null\`, \`undefined\`, or a plain JavaScript object \`{ pageContext: { /* ... */ } }\`.`
  )

  if (result === null || result === undefined) {
    return {}
  }

  assertUsage(
    hasProp(result, 'pageContext', 'object'),
    `${errPrefix} returned \`{ pageContext }\` but \`pageContext\` should be a plain JavaScript object.`
  )

  if (hasProp(result.pageContext, '_pageId') && !hasProp(result.pageContext, '_pageId', 'null')) {
    const errPrefix2 = `${errPrefix} returned \`{ pageContext: { _pageId } }\` but \`_pageId\` should be`
    assertUsage(hasProp(result.pageContext, '_pageId', 'string'), `${errPrefix2} a string or \`null\``)
    assertUsage(
      pageContext._allPageIds.includes(result.pageContext._pageId),
      `${errPrefix2} one of following values: \`[${pageContext._allPageIds.map((s) => `'${s}'`).join(', ')}]\`.`
    )
  }
  if (hasProp(result.pageContext, 'routeParams')) {
    assertRouteParams(
      result.pageContext,
      `${errPrefix} returned \`{ pageContext: { routeParams } }\` but \`routeParams\` should`
    )
  }

  const pageContextProvidedByUser = result.pageContext
  assertPageContextProvidedByUser(pageContextProvidedByUser, { hookFilePath, hookName })
  return { pageContextProvidedByUser }
}
