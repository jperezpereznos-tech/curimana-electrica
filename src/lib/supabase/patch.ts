/* eslint-disable @typescript-eslint/no-explicit-any */
export function patchGetClaims<T extends { auth: any }>(client: T): T {
  if (!client || !client.auth || typeof client.auth.getClaims !== 'function') {
    return client
  }

  const originalGetClaims = client.auth.getClaims.bind(client.auth)

  client.auth.getClaims = async function (jwt?: string, options?: any) {
    try {
      const res = await originalGetClaims(jwt, options)
      if (res && res.error) {
        // Fallback to getUser if it returned an error (e.g. invalid signature)
        try {
          const { data: { user }, error: userError } = await client.auth.getUser(jwt)
          if (!userError && user) {
            return {
              data: {
                claims: {
                  sub: user.id,
                  email: user.email,
                  ...user.user_metadata,
                },
                header: {},
                signature: new Uint8Array(),
              },
              error: null,
            }
          }
        } catch {
          // If fallback fails, return original result
        }
      }
      return res
    } catch (e) {
      console.warn('[SUPABASE PATCH] getClaims threw an exception, falling back to getUser:', e)
      try {
        const { data: { user }, error: userError } = await client.auth.getUser(jwt)
        if (userError || !user) {
          return { data: null, error: userError || new Error('No user found') }
        }
        return {
          data: {
            claims: {
              sub: user.id,
              email: user.email,
              ...user.user_metadata,
            },
            header: {},
            signature: new Uint8Array(),
          },
          error: null,
        }
      } catch (innerError) {
        console.error('[SUPABASE PATCH] Both getClaims and getUser failed:', innerError)
        return { data: null, error: innerError }
      }
    }
  }

  return client
}
