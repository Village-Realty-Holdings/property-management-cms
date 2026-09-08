import React from 'react'

import { brandFor } from '@/lib/adminBranding'
import { findTenantByHost } from '@/server/getTenant'

/** Copy above the login form, naming the site the user is signing in to. */
const BeforeLogin: React.FC = async () => {
  const brand = brandFor(await findTenantByHost())

  return (
    <div className="before-login">
      <h2 className="before-login__title">
        {brand.isTenant ? `Sign in to manage ${brand.name}` : 'Sign in to Awayday'}
      </h2>
      <p className="before-login__body">
        {brand.isTenant
          ? 'Pages, posts and settings you change here go live on your site.'
          : 'Manage every site on the platform from one place.'}
      </p>
    </div>
  )
}

export default BeforeLogin
